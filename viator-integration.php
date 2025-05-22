<?php
/**
 * Plugin Name: Viator API Integration
 * Description: Integração com a API da Viator para exibição de produtos e passeios. Utilize o shortcode [viator_search]
 * Version: 1.0
 * Author: Lucas Alves
 * Text Domain: viator-integration
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Include debug functions
require_once plugin_dir_path(__FILE__) . 'debug.php';

// Include product detail page functionality
require_once plugin_dir_path(__FILE__) . 'unique-product.php';

// Add rewrite rules for product URLs
function viator_rewrite_rules() {
    add_rewrite_rule(
        'passeio/([^/]+)/?$',
        'index.php?pagename=passeio&product_code=$matches[1]',
        'top'
    );
}
add_action('init', 'viator_rewrite_rules');

// Add product_code as a query var
function viator_query_vars($query_vars) {
    $query_vars[] = 'product_code';
    return $query_vars;
}
add_filter('query_vars', 'viator_query_vars');

// Add admin menu and settings page
function viator_admin_menu() {
    add_menu_page(
        'Viator API Integration',
        'Viator Integration',
        'manage_options',
        'viator-settings',
        'viator_settings_page',
        'dashicons-admin-site',
        100
    );
}
add_action('admin_menu', 'viator_admin_menu');

// Register settings
function viator_register_settings() {
    register_setting('viator_settings', 'viator_api_key');
}
add_action('admin_init', 'viator_register_settings');

// Settings page content
function viator_settings_page() {
    ?>
    <div class="wrap">
        <h1>Viator API Integration Settings</h1>
        <form method="post" action="options.php">
            <?php
            settings_fields('viator_settings');
            do_settings_sections('viator_settings');
            ?>
            <table class="form-table">
                <tr>
                    <th scope="row">API Key</th>
                    <td>
                        <input type="text" 
                               name="viator_api_key" 
                               value="<?php echo esc_attr(get_option('viator_api_key')); ?>" 
                               class="regular-text"
                               required>
                        <p class="description">Insira sua chave API aqui.</p>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}

// Enqueue scripts and styles
function viator_enqueue_scripts() {
    $plugin_dir = plugin_dir_url(__FILE__);
    
    // Enqueue styles
    wp_enqueue_style(
        'viator-search-style', 
        $plugin_dir . 'styles.css', 
        array(), 
        '1.0'
    );

    // Enqueue Swiper CSS
    wp_enqueue_style('swiper-css', 'https://cdn.jsdelivr.net/npm/swiper@8/swiper-bundle.min.css');

    // Enqueue scripts
    wp_enqueue_script('ipgeolocation-api', 'https://api.ipgeolocation.io/javascript/ipgeolocation.js', array(), '1.0.0', true);
    
    // Enqueue Swiper JS
    wp_enqueue_script('swiper-js', 'https://cdn.jsdelivr.net/npm/swiper@8/swiper-bundle.min.js', array('jquery'), '8.0.0', true);
    
    // Enqueue interactions.js with Swiper as dependency
    wp_enqueue_script('viator-interactions', $plugin_dir . 'interactions.js', array('jquery', 'ipgeolocation-api', 'swiper-js'), '1.0.0', true);

    // Add JavaScript variables
    wp_localize_script('viator-interactions', 'viatorAjax', array(
        'ajaxurl' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('viator_sort_nonce')
    ));

    // Add Flatpickr
    wp_enqueue_style('flatpickr', 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css');
    wp_enqueue_script('flatpickr', 'https://cdn.jsdelivr.net/npm/flatpickr', array(), null, true);
    wp_enqueue_script('flatpickr-pt', 'https://npmcdn.com/flatpickr/dist/l10n/pt.js', array('flatpickr'), null, true);
}
add_action('wp_enqueue_scripts', 'viator_enqueue_scripts');

// Enqueue styles
function viator_enqueue_styles() {
    wp_enqueue_style('viator-styles', plugins_url('styles.css', __FILE__));
    wp_enqueue_style('viator-product-detail', plugins_url('product-detail.css', __FILE__));
    
    // Enqueue product gallery script only on pages with the product shortcode
    global $post;
    if (is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'viator_product')) {
        wp_enqueue_script('viator-product-gallery', plugins_url('product-gallery.js', __FILE__), array('jquery'), '1.0', true);
    }
}
add_action('wp_enqueue_scripts', 'viator_enqueue_styles');

// Função que gera o formulário de pesquisa
function viator_search_form() {
    ob_start();
    
    // Verifica se há uma busca em andamento
    $hasResults = isset($_GET['viator_query']) && !empty($_GET['viator_query']);
    $searchTerm = isset($_GET['viator_query']) ? sanitize_text_field($_GET['viator_query']) : '';
    
    ?>
    <form method="GET" action="<?php echo esc_url(get_permalink()); ?>" id="viator-search-form" autocomplete="off">
        <div class="viator-search-wrapper">
            <input type="text" name="viator_query" autocomplete="off" placeholder="🌍 Aonde você quer ir?" value="<?php echo esc_attr($searchTerm); ?>" required>
            <div class="viator-nearby-suggestion" style="display: none;">
                <span class="location-icon"><img src="https://img.icons8.com/?size=100&id=3009BI6rABJa&format=png&color=04846B" alt="Ícone" width="15" height="15"></span>
                <span>Nos arredores</span>
            </div>
        </div>
        <button type="submit" id="search-button">
            <span id="search-text">Pesquisar</span>
            <span id="search-icon">🔍</span>
        </button>
    </form>

    <div id="viator-results" style="display: <?php echo $hasResults ? 'block' : 'none'; ?>;">
        <?php
        if ($hasResults) {
            echo viator_get_search_results($searchTerm);
        }
        ?>
    </div>
    <?php
    return ob_get_clean();
}

// Função para chamar a API e buscar resultados
function viator_get_search_results($searchTerm) {
    $api_key = get_option('viator_api_key');
    if (empty($api_key)) {
        return '<p class="error">Por favor, configure sua chave API da Viator nas configurações do WordPress.</p>';
    }
    
    $url = "https://api.sandbox.viator.com/partner/search/freetext";

    // Paginação
    $per_page = 39; // Número de itens por página
    $page = isset($_GET['viator_page']) ? intval($_GET['viator_page']) : 1; // Página atual
    $start = ($page - 1) * $per_page + 1; // Índice inicial dos resultados

    // Determinar ordenação
    $sort_param = isset($_GET['viator_sort']) ? $_GET['viator_sort'] : 'DEFAULT';
    
    // Configurar parâmetros de ordenação
    $sorting = [];
    switch ($sort_param) {
        case 'REVIEW_AVG_RATING':
            $sorting = ['sort' => 'REVIEW_AVG_RATING'];
            break;
        case 'PRICE_ASC':
            $sorting = ['sort' => 'PRICE', 'order' => 'ASCENDING'];
            break;
        case 'PRICE_DESC':
            $sorting = ['sort' => 'PRICE', 'order' => 'DESCENDING'];
            break;
        case 'DURATION_ASC':
            $sorting = ['sort' => 'ITINERARY_DURATION', 'order' => 'ASCENDING'];
            break;
        case 'DURATION_DESC':
            $sorting = ['sort' => 'ITINERARY_DURATION', 'order' => 'DESCENDING'];
            break;
        case 'DATE_ADDED_DESC':
            $sorting = ['sort' => 'DATE_ADDED', 'order' => 'DESCENDING'];
            break;
        default:
            $sorting = ['sort' => 'DEFAULT'];
    }

    // Verificar se há um intervalo de datas selecionado
    $date_start = isset($_GET['viator_date_start']) ? $_GET['viator_date_start'] : '';
    $date_end = isset($_GET['viator_date_end']) ? $_GET['viator_date_end'] : '';
    
    if (!empty($date_start) && !empty($date_end)) {
        // Validar formato das datas (YYYY-MM-DD)
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date_start) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date_end)) {
            // Usar as datas selecionadas pelo usuário
            $date_from = $date_start;
            
            // Adiciona um dia ao date_end para incluir o último dia nas buscas
            // Isso é necessário porque a API considera exclusivo o último dia
            $date_to = date('Y-m-d', strtotime($date_end . ' +1 day'));
            
            // Verificar se a data final é menor que a inicial (improvável, mas possível)
            if (strtotime($date_to) <= strtotime($date_from)) {
                // Se acontecer, corrigir definindo data final como inicial + 1 dia
                $date_to = date('Y-m-d', strtotime($date_from . ' +1 day'));
            }
            
            viator_debug_log('Datas selecionadas pelo usuário:', "De $date_from até $date_to");
        } else {
            // Formato inválido, usar padrão
            $date_from = date('Y-m-d');
            $date_to = date('Y-m-d', strtotime('+1 year'));
            viator_debug_log('Formato de data inválido, usando padrão:', "De $date_from até $date_to");
        }
    } else {
        // Se não houver datas selecionadas, usar período padrão (hoje até 1 ano)
        $date_from = date('Y-m-d');
        $date_to = date('Y-m-d', strtotime('+1 year'));
        viator_debug_log('Usando período padrão:', "De $date_from até $date_to");
    }

    // Verificar se há um intervalo de duração selecionado
    $duration_filters = isset($_GET['duration_filter']) ? [$_GET['duration_filter']] : [];
    $duration_conditions = [];
    
    if (!empty($duration_filters)) {
        foreach ($duration_filters as $filter) {
            // Verificar se $filter é uma string válida e contém o delimitador '-'
            if (!is_string($filter) || strpos($filter, '-') === false) {
                continue; // Pular este filtro se não estiver no formato correto
            }
            
            $parts = explode('-', $filter);
            // Verificar se temos pelo menos dois elementos após explode
            if (count($parts) < 2) {
                continue; // Pular este filtro se não tiver pelo menos min e max
            }
            
            $min = $parts[0];
            $max = $parts[1]; // Pode ser vazio para "Mais de três dias"
            
            if ($max === '') {
                // Para "Mais de três dias"
                $duration_conditions[] = [
                    'from' => (int)$min
                ];
            } else {
                $duration_conditions[] = [
                    'from' => (int)$min,
                    'to' => (int)$max
                ];
            }
        }
    }
    
    // Usar diretamente as condições sem processamento adicional
    $duration_filter = !empty($duration_conditions) ? $duration_conditions : null;

    // Ler os parâmetros de preço
    $min_price_param = isset($_GET['min_price']) ? intval($_GET['min_price']) : 0;
    $max_price_param = isset($_GET['max_price']) ? intval($_GET['max_price']) : 5000;

    // Ler o parâmetro de avaliação
    $rating_param = isset($_GET['rating_filter']) ? floatval($_GET['rating_filter']) : 0;

    // Corpo da requisição JSON
    $body_data = [ // Primeiro crie o array
        "searchTerm" => $searchTerm,
        "productSorting" => $sorting,
        "productFiltering" => [
            "dateRange" => [
                "from" => $date_from,
                "to" => $date_to
            ],
            "price" => [
                "from" => $min_price_param,
                "to" => $max_price_param
            ],
            "rating" => [
                "from" => $rating_param,
                "to" => 5
            ],
            "durationInMinutes" => !empty($duration_filter) ? $duration_filter[0] : null,
            "includeAutomaticTranslations" => true
        ],
        "searchTypes" => [
            ["searchType" => "PRODUCTS", "pagination" => ["start" => $start, "count" => $per_page]],
        ],
        "currency" => "BRL"
    ];

    // Adicionar filtros especiais, se existirem
    if (isset($_GET['special_filter']) && is_array($_GET['special_filter']) && !empty($_GET['special_filter'])) {
        $special_filters = $_GET['special_filter'];
        viator_debug_log('Filtros especiais encontrados:', $special_filters);
        
        // Mapear valores para os parâmetros da API
        foreach ($special_filters as $filter) {
            viator_debug_log('Processando filtro especial:', $filter);
            switch ($filter) {
                case 'free_cancellation':
                    // Adicionar filtro para Cancelamento Gratuito
                    $body_data['productFiltering']['flags'] = isset($body_data['productFiltering']['flags']) ? 
                        array_merge($body_data['productFiltering']['flags'], ['FREE_CANCELLATION']) : 
                        ['FREE_CANCELLATION'];
                    viator_debug_log('Adicionado filtro FREE_CANCELLATION para Cancelamento Gratuito', $filter);
                    break;
                case 'likely_to_sell_out':
                    // Adicionar filtro para Prestes a Esgotar
                    $body_data['productFiltering']['flags'] = isset($body_data['productFiltering']['flags']) ? 
                        array_merge($body_data['productFiltering']['flags'], ['LIKELY_TO_SELL_OUT']) : 
                        ['LIKELY_TO_SELL_OUT'];
                    viator_debug_log('Adicionado filtro LIKELY_TO_SELL_OUT para Prestes a Esgotar', $filter);
                    break;
                case 'skip_the_line':
                    // Adicionar filtro para Fura-Fila
                    $body_data['productFiltering']['flags'] = isset($body_data['productFiltering']['flags']) ? 
                        array_merge($body_data['productFiltering']['flags'], ['SKIP_THE_LINE']) : 
                        ['SKIP_THE_LINE'];
                    viator_debug_log('Adicionado filtro SKIP_THE_LINE para Fura-Fila', $filter);
                    break;
                case 'private_tour':
                    // Adicionar filtro para Tour Privado
                    $body_data['productFiltering']['flags'] = isset($body_data['productFiltering']['flags']) ? 
                        array_merge($body_data['productFiltering']['flags'], ['PRIVATE_TOUR']) : 
                        ['PRIVATE_TOUR'];
                    viator_debug_log('Adicionado filtro PRIVATE_TOUR para Tour Privado', $filter);
                    break;
                case 'new_on_viator':
                    // Adicionar filtro para Novo no Viator
                    $body_data['productFiltering']['flags'] = isset($body_data['productFiltering']['flags']) ? 
                        array_merge($body_data['productFiltering']['flags'], ['NEW_ON_VIATOR']) : 
                        ['NEW_ON_VIATOR'];
                    viator_debug_log('Adicionado filtro NEW_ON_VIATOR para Novo no Viator', $filter);
                    break;
            }
        }
    }

    $body = json_encode($body_data);
    viator_debug_log('Request Body:', $body);
    viator_debug_log('Filtros enviados à API:', isset($body_data['productFiltering']['flags']) ? $body_data['productFiltering']['flags'] : 'Nenhum filtro');

    // Enviar a requisição POST para a API
    $response = wp_remote_post($url, [
        'headers' => [
            'Accept'           => 'application/json;version=2.0',
            'Content-Type'     => 'application/json;version=2.0',
            'exp-api-key'      => $api_key,
            'Accept-Language'  => 'pt-BR',
        ],
        'body'    => $body,
        'timeout' => 120,
    ]);

    // Verificar se houve erro na requisição
    if (is_wp_error($response)) {
        $output = '<div class="viator-content-wrapper">';
        $output .= '<div class="viator-results-container">';
        $output .= '<p class="viator-error-message">OPS! Aguarde um instante e tente novamente.</p>';
        $output .= '</div></div>';
        return $output;
    }

    // Inicializar a variável results
    $results = '';

    // Array com sugestões de destinos populares
    $destinos_sugeridos = array(
        'Paris, França',
        'Roma, Itália',
        'Barcelona, Espanha',
        'Nova York, EUA',
        'Tóquio, Japão',
        'Dubai, Emirados Árabes',
        'Londres, Inglaterra',
        'Amsterdã, Holanda',
        'Lisboa, Portugal',
        'Rio de Janeiro, Brasil',
        'Buenos Aires, Argentina',
        'Cidade do Cabo, África do Sul',
        'Sydney, Austrália',
        'São Paulo, Brasil',
        'Salvador, Brasil',
        'Florianópolis, Brasil',
        'Foz do Iguaçu, Brasil',
        'Gramado, Brasil',
        'Búzios, Brasil',
        'Recife, Brasil',
        'Fortaleza, Brasil',
        'Curitiba, Brasil',
        'Manaus, Brasil',
        'Belém, Brasil',
        'Maceió, Brasil',
        'Porto de Galinhas, Brasil',
        'Natal, Brasil',
        'Belo Horizonte, Brasil',
        'Porto Alegre, Brasil',
        'Vitória, Brasil',
        'Balneário Camboriú, Brasil',
        'Jericoacoara, Brasil',
        'Paraty, Brasil',
        'Ouro Preto, Brasil',
        'Campos do Jordão, Brasil',
        'Bonito, Brasil',
        'Lençóis Maranhenses, Brasil',
        'Chapada Diamantina, Brasil',
        'Ilha Grande, Brasil',
        'Arraial do Cabo, Brasil',
        'Trancoso, Brasil',
        'Istambul, Turquia',
        'Berlim, Alemanha',
        'Praga, República Tcheca',
        'Viena, Áustria',
        'Cancún, México',
        'Bali, Indonésia',
        'Phuket, Tailândia',
        'Seul, Coreia do Sul',
        'Marrakech, Marrocos'
    );

    // Processar resposta da API
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);
    viator_debug_log('Filtros de Duração Enviados:', $duration_filter);
    viator_debug_log('Resposta da API:', $data);
    viator_debug_log('Parâmetros recebidos:', $_GET);

    // Verificar se há produtos na resposta
    if (empty($data['products']) || $data['products']['totalCount'] === 0) {
        // Embaralhar e pegar 6 destinos aleatórios
        shuffle($destinos_sugeridos);
        $destinos_aleatorios = array_slice($destinos_sugeridos, 0, 6);

        $output = '<script>
        window.addEventListener("load", function() {
            setTimeout(function() {
                const errorMessage = document.querySelector(".viator-error-message");
                if (errorMessage) {
                    const startPosition = window.pageYOffset;
                    const targetPosition = errorMessage.getBoundingClientRect().top + window.pageYOffset - 50;
                    const distance = targetPosition - startPosition;
                    const duration = 2500; // Increased duration for smoother animation

                    function easeOutCubic(t) {
                        return 1 - Math.pow(1 - t, 3);
                    }

                    let startTime = null;
                    function animate(currentTime) {
                        if (!startTime) startTime = currentTime;
                        const timeElapsed = currentTime - startTime;
                        const progress = Math.min(timeElapsed / duration, 1);

                        window.scrollTo(0, startPosition + (distance * easeOutCubic(progress)));

                        if (progress < 1) {
                            requestAnimationFrame(animate);
                        }
                    }

                    requestAnimationFrame(animate);
                }
            }, 800); // Increased delay for better timing
        });
        </script>';
        $output .= '<div class="viator-content-wrapper">';
        $output .= '<div class="viator-results-container">';
        $output .= '<p class="viator-error-message">Nenhum passeio encontrado para "' . esc_html($_GET['viator_query']) . '".</p>';
        
        // Adiciona sugestões de destinos
        $output .= '<div class="viator-suggestions">';
        $output .= '<p>Que tal experimentar um destes destinos populares?</p>';
        $output .= '<div class="viator-suggestions-grid">';
        
        foreach ($destinos_aleatorios as $destino) {
            $output .= '<button class="viator-suggestion-btn" onclick="setSearchDestination(\'' . esc_attr($destino) . '\')">🌍 ' . esc_html($destino) . '</button>';
        }
        
        $output .= '</div></div>';
        $output .= '</div></div>';
        viator_debug_log('Nenhum resultado encontrado para a busca:', $_GET['viator_query']);
        return $output;
    }

    viator_debug_log('Resultados:', $results);

    // Array com sugestões de destinos populares
    $destinos_sugeridos = array(
    'Paris, França',
    'Roma, Itália',
    'Barcelona, Espanha',
    'Nova York, EUA',
    'Tóquio, Japão',
    'Dubai, Emirados Árabes',
    'Londres, Inglaterra',
    'Amsterdã, Holanda',
    'Lisboa, Portugal',
    'Rio de Janeiro, Brasil',
    'Buenos Aires, Argentina',
    'Cidade do Cabo, África do Sul',
    'Sydney, Austrália',
    'São Paulo, Brasil',
    'Salvador, Brasil',
    'Florianópolis, Brasil',
    'Foz do Iguaçu, Brasil',
    'Gramado, Brasil',
    'Búzios, Brasil',
    'Recife, Brasil',
    'Fortaleza, Brasil',
    'Curitiba, Brasil',
    'Manaus, Brasil',
    'Belém, Brasil',
    'Maceió, Brasil',
    'Porto de Galinhas, Brasil',
    'Natal, Brasil',
    'Belo Horizonte, Brasil',
    'Porto Alegre, Brasil',
    'Vitória, Brasil',
    'Balneário Camboriú, Brasil',
    'Jericoacoara, Brasil',
    'Paraty, Brasil',
    'Ouro Preto, Brasil',
    'Campos do Jordão, Brasil',
    'Bonito, Brasil',
    'Lençóis Maranhenses, Brasil',
    'Chapada Diamantina, Brasil',
    'Ilha Grande, Brasil',
    'Arraial do Cabo, Brasil',
    'Trancoso, Brasil',
    'Istambul, Turquia',
    'Berlim, Alemanha',
    'Praga, República Tcheca',
    'Viena, Áustria',
    'Cancún, México',
    'Bali, Indonésia',
    'Phuket, Tailândia',
    'Seul, Coreia do Sul',
    'Marrakech, Marrocos'
    );

    // Embaralha o array e pega 5 destinos aleatórios
    shuffle($destinos_sugeridos);
    $destinos_aleatorios = array_slice($destinos_sugeridos, 0, 6);

    // Verificar se há resultados
    if (empty($data) || !isset($data['products']['results']) || empty($data['products']['results'])) {
        // Adicionar o script de scroll primeiro
        $output = '<script>document.addEventListener("DOMContentLoaded", function() {
            const resultsContainer = document.querySelector(".viator-results-container");
            if (resultsContainer) {
                resultsContainer.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        });</script>';
                
        // Adiciona sugestões de destinos
        $output .= '<div class="viator-suggestions">';
        $output .= '<p>Que tal experimentar um destes destinos populares?</p>';
        $output .= '<div class="viator-suggestions-grid">';
        
        foreach ($destinos_aleatorios as $destino) {
            $output .= '<button class="viator-suggestion-btn" onclick="setSearchDestination(\'' . esc_attr($destino) . '\')">';
            $output .= '🌍 ' . esc_html($destino);
            $output .= '</button>';
        }
        
        $output .= '</div></div>';
        $output .= '</div>';
        return $output;
    }

    // Total de produtos e cálculo do número de páginas
    $total_products = isset($data['products']['totalCount']) ? intval($data['products']['totalCount']) : 0;
    $total_pages = ceil($total_products / $per_page);

    // Formatar o número total com ponto de milhar apenas se for maior que 1000
    $formatted_total = $total_products >= 1000 ? number_format($total_products, 0, ',', '.') : $total_products;

    // Modificar o script de scroll no início do output
    $output = '<script>
        window.addEventListener("load", function() {
            setTimeout(function() {
                // Procurar primeiro pela mensagem de erro, se não encontrar, procurar pelo wrapper de conteúdo
                const targetElement = document.querySelector(".viator-error-message") || document.querySelector(".viator-content-wrapper");
                
                if (targetElement) {
                    const startPosition = window.pageYOffset;
                    const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - 20;
                    const distance = targetPosition - startPosition;
                    const duration = 2000; // 2 segundos de duração para uma transição mais suave
                    let start = null;

                    function animation(currentTime) {
                        if (start === null) start = currentTime;
                        const timeElapsed = currentTime - start;
                        const progress = Math.min(timeElapsed / duration, 1);

                        // Função de easing melhorada para um movimento mais natural
                        const easeOutQuint = progress => {
                            return 1 - Math.pow(1 - progress, 5);
                        };

                        window.scrollTo(0, startPosition + (distance * easeOutQuint(progress)));

                        if (timeElapsed < duration) {
                            requestAnimationFrame(animation);
                        }
                    }

                    requestAnimationFrame(animation);
                }
            }, 500);
        });
    </script>';

    // Início do wrapper de conteúdo
    $output .= '<div class="viator-content-wrapper">';

    // Sidebar de filtros
    $output .= '<div class="viator-filters">
        <div class="viator-date-filter">
            <h3>Quando você pretende viajar?</h3>
            <button type="button" class="viator-date-selector">
                <b>📅</b>
                <span>Escolher data</span>
            </button>
        </div>';

    // Adicionando o filtro de duração
    $output .= '<div class="viator-duration-filter">
        <h3>Duração</h3>';

    // Opções de filtro com valores corretos
    $duration_options = [
        '0-60' => 'Até uma hora',
        '60-240' => '1 a 4 horas',
        '240-1440' => '4 horas a 1 dia',
        '1440-4320' => '1 a 3 dias',
        '4320-' => 'Mais de três dias'
    ];

    // Verificar filtros ativos
    $active_filters = isset($_GET['duration_filter']) ? (array) $_GET['duration_filter'] : [];

    foreach ($duration_options as $value => $label) {
        $checked = in_array($value, $active_filters) ? 'checked' : '';
        $output .= "<label><input type='radio' name='duration_filter' value='$value' $checked> $label</label><br>";
    }

    $output .= '</div>';

    // Adicionando o filtro de preço
    $current_min_price = isset($_GET['min_price']) ? intval($_GET['min_price']) : 0;
    $current_max_price = isset($_GET['max_price']) ? intval($_GET['max_price']) : 5000; // Definir um máximo padrão alto

    $output .= '<div class="viator-price-filter">
        <h3>Faixa de Preço</h3>
        <div class="viator-price-slider-container">
            <div class="viator-price-values">
                <span id="min_price_display">R$ ' . $current_min_price . '</span>
                <span id="max_price_display">R$ ' . $current_max_price . ($current_max_price >= 5000 ? '+' : '') . '</span>
            </div>
            <div class="viator-price-sliders">
                <input type="range" id="min_price_slider" name="min_price_slider" min="0" max="5000" value="' . $current_min_price . '" step="10">
                <input type="range" id="max_price_slider" name="max_price_slider" min="0" max="5000" value="' . $current_max_price . '" step="10">
            </div>
        </div>
        <input type="hidden" name="min_price" id="min_price_hidden" value="' . $current_min_price . '">
        <input type="hidden" name="max_price" id="max_price_hidden" value="' . $current_max_price . '">
    </div>';
    // Fim do filtro de preço

    // Adicionar o filtro de Avaliação
    $is_ajax_request = wp_doing_ajax(); // Definir a variável, mas não vamos usá-la para condicionar a exibição dos filtros
    
    $output .= '<div class="viator-rating-filter">';
    $output .= '<h3>Avaliação</h3>';
    $output .= '<div class="viator-rating-options">';
    
    // Rating 4.5+
    $rating_checked_45 = isset($_GET['rating_filter']) && $_GET['rating_filter'] == '4.5' ? 'checked' : '';
    $output .= '<label class="viator-rating-option">';
    $output .= '<input type="radio" name="rating_filter" value="4.5" ' . $rating_checked_45 . '>';
    $output .= '<div class="viator-rating-stars rating-45">';
    $output .= '<span class="star-full">★</span><span class="star-full">★</span><span class="star-full">★</span><span class="star-full">★</span>';
    $output .= '<div class="star-half-container"><span class="star-half-full">★</span><span class="star-half-empty">★</span></div>';
    $output .= '</div>';
    $output .= '<span class="viator-rating-text">4.5+</span>';
    $output .= '</label>';
    
    // Rating 4.0+
    $rating_checked_4 = isset($_GET['rating_filter']) && $_GET['rating_filter'] == '4.0' ? 'checked' : '';
    $output .= '<label class="viator-rating-option">';
    $output .= '<input type="radio" name="rating_filter" value="4.0" ' . $rating_checked_4 . '>';
    $output .= '<div class="viator-rating-stars rating-40">';
    $output .= '<span class="star-full">★</span><span class="star-full">★</span><span class="star-full">★</span><span class="star-full">★</span>';
    $output .= '<span class="star-empty">★</span>';
    $output .= '</div>';
    $output .= '<span class="viator-rating-text">4.0+</span>';
    $output .= '</label>';
    
    // Rating 3.0+
    $rating_checked_3 = isset($_GET['rating_filter']) && $_GET['rating_filter'] == '3.0' ? 'checked' : '';
    $output .= '<label class="viator-rating-option">';
    $output .= '<input type="radio" name="rating_filter" value="3.0" ' . $rating_checked_3 . '>';
    $output .= '<div class="viator-rating-stars rating-30">';
    $output .= '<span class="star-full">★</span><span class="star-full">★</span><span class="star-full">★</span>';
    $output .= '<span class="star-empty">★</span><span class="star-empty">★</span>';
    $output .= '</div>';
    $output .= '<span class="viator-rating-text">3.0+</span>';
    $output .= '</label>';
    
    $output .= '</div>'; // Fechando viator-rating-options
    $output .= '</div>'; // Fechando viator-rating-filter
    
    // Adicionar o filtro de Especiais
    $output .= '<div class="viator-specials-filter">';
    $output .= '<h3>Especiais</h3>';
    $output .= '<div class="viator-specials-options">';
    
    // Opção: Cancelamento Gratuito
    $free_cancel_checked = isset($_GET['special_filter']) && in_array('free_cancellation', (array)$_GET['special_filter']) ? 'checked' : '';
    $output .= '<label class="viator-special-option">';
    $output .= '<input type="checkbox" name="special_filter[]" value="free_cancellation" ' . $free_cancel_checked . '>';
    $output .= '<span class="viator-special-text">Cancelamento Gratuito</span>';
    $output .= '</label>';
    
    // Opção: Prestes a Esgotar
    $sell_out_checked = isset($_GET['special_filter']) && in_array('likely_to_sell_out', (array)$_GET['special_filter']) ? 'checked' : '';
    $output .= '<label class="viator-special-option">';
    $output .= '<input type="checkbox" name="special_filter[]" value="likely_to_sell_out" ' . $sell_out_checked . '>';
    $output .= '<span class="viator-special-text">Geralmente se esgota</span>';
    $output .= '</label>';
    
    // Opção: Fura-Fila
    $skip_line_checked = isset($_GET['special_filter']) && in_array('skip_the_line', (array)$_GET['special_filter']) ? 'checked' : '';
    $output .= '<label class="viator-special-option">';
    $output .= '<input type="checkbox" name="special_filter[]" value="skip_the_line" ' . $skip_line_checked . '>';
    $output .= '<span class="viator-special-text">Evitar fila</span>';
    $output .= '</label>';
    
    // Opção: Tour Privado
    $private_checked = isset($_GET['special_filter']) && in_array('private_tour', (array)$_GET['special_filter']) ? 'checked' : '';
    $output .= '<label class="viator-special-option">';
    $output .= '<input type="checkbox" name="special_filter[]" value="private_tour" ' . $private_checked . '>';
    $output .= '<span class="viator-special-text">Tour Privado</span>';
    $output .= '</label>';
    
    // Opção: Novo no Viator
    $new_checked = isset($_GET['special_filter']) && in_array('new_on_viator', (array)$_GET['special_filter']) ? 'checked' : '';
    $output .= '<label class="viator-special-option">';
    $output .= '<input type="checkbox" name="special_filter[]" value="new_on_viator" ' . $new_checked . '>';
    $output .= '<span class="viator-special-text">Novo no Viator</span>';
    $output .= '</label>';
    
    $output .= '</div>'; // Fechando viator-specials-options
    $output .= '</div>'; // Fechando viator-specials-filter
    
    // Botão de Limpar tudo
    $output .= '<div class="viator-clear-filters">';
    $output .= '<button type="button" id="clear-all-filters" class="viator-clear-all-btn">Limpar tudo</button>';
    $output .= '</div>';

    // Fechar a sidebar de filtros
    $output .= '</div>'; // Fechando viator-filters

    // Header com total e ordenação
    $output .= '<div class="viator-results-container">
                <div class="viator-header">
                <div class="viator-header-info">
                <span class="viator-header-cancel"><img src="https://img.icons8.com/?size=100&id=82742&format=png&color=000000" alt="Ícone" width="15" height="15"> Cancelamento grátis até 24 horas antes do início da experiência (horário local)</span>
                <div class="viator-header-info-filter">
                <button class="viator-mobile-filter-button" id="mobile-filter-button">
                    <span class="filter-icon"><img width="25" height="25" src="https://img.icons8.com/ios-filled/50/sorting-options.png" alt="sorting-options"/></span>
                    <span class="filter-text">Filtros</span>
                </button>
                <p class="viator-total">' . $formatted_total . ' resultados</p>
    </div>';
    
    // Select de ordenação
    $current_sort = isset($_GET['viator_sort']) ? $_GET['viator_sort'] : 'DEFAULT';
    $output .= '<div class="viator-sort">
        <select name="viator_sort" id="viator-sort" onchange="updateSort(this.value)">
            <option value="DEFAULT"' . selected($current_sort, 'DEFAULT', false) . '>Em destaque</option>
            <option value="REVIEW_AVG_RATING"' . selected($current_sort, 'REVIEW_AVG_RATING', false) . '>Melhor avaliados</option>
            <option value="PRICE_ASC"' . selected($current_sort, 'PRICE_ASC', false) . '>Preço (menor para maior)</option>
            <option value="PRICE_DESC"' . selected($current_sort, 'PRICE_DESC', false) . '>Preço (maior para menor)</option>
            <option value="DURATION_ASC"' . selected($current_sort, 'DURATION_ASC', false) . '>Duração (crescente)</option>
            <option value="DURATION_DESC"' . selected($current_sort, 'DURATION_DESC', false) . '>Duração (decrescente)</option>
            <option value="DATE_ADDED_DESC"' . selected($current_sort, 'DATE_ADDED_DESC', false) . '>Novidade na Viator</option>
        </select>
    </div>';
    $output .= '</div>';

    // Obtenha informações de destino da Wikipedia usando a API MediaWiki
    $wiki_url = "https://pt.wikipedia.org/w/api.php";
    $search_params = [
        'action' => 'query',
        'format' => 'json',
        'prop' => 'extracts',
        'exintro' => true,
        'explaintext' => true,
        'titles' => $searchTerm
    ];

    $wiki_response = wp_remote_get(add_query_arg($search_params, $wiki_url));
    $wiki_data = [];
    
    if (!is_wp_error($wiki_response)) {
        $wiki_body = wp_remote_retrieve_body($wiki_response);
        $wiki_data = json_decode($wiki_body, true);
        
        // Extraia o conteúdo da primeira página
        $pages = isset($wiki_data['query']['pages']) ? $wiki_data['query']['pages'] : [];
        $first_page = reset($pages);
        $extract = isset($first_page['extract']) ? $first_page['extract'] : '';
        
        // Limpe e limite o texto
        $extract = wp_trim_words($extract, 60, '...');
    }

    // Se não houver dados obtidos do Wikipedia, use curiosidades aleatórias
    if (empty($extract)) {
        $facts = [
            "Você sabia que esta é uma das regiões mais visitadas pelos turistas?",
            "Este destino oferece experiências únicas durante todo o ano!",
            "A cultura local é rica em tradições e histórias fascinantes.",
            "Os visitantes costumam se surpreender com a hospitalidade local."
        ];
        $extract = $facts[array_rand($facts)];
    }

    // Output the curiosities div
    $output .= '<div class="viator-curiosities">
        <span><img src="https://img.icons8.com/?size=100&id=ulD4laUCmfyE&format=png&color=000000" alt="Ícone"> 
        <strong>Você sabia?</strong> ' . esc_html($extract) . '</span>
    </div>';

    // Iniciar grid de cards
    $output .= '<div class="viator-grid">';
    
    // Adicionar elemento para efeito de carregamento
    $output .= '<div class="viator-pulse-loading">';
    $output .= '<span></span><span></span><span></span>';
    $output .= '</div>';

    foreach ($data['products']['results'] as $tour) {
        // Pegar a imagem de melhor qualidade
        $image_url = isset($tour['images'][0]['variants'][3]['url']) ? $tour['images'][0]['variants'][3]['url'] : 'https://via.placeholder.com/400x200'; 
    
        // Pegar os dados principais
        $title = esc_html($tour['title']);
        $description = esc_html($tour['description']);
        $price = isset($tour['pricing']['summary']['fromPrice']) ? 'R$ ' . number_format($tour['pricing']['summary']['fromPrice'], 2, ',', '.') : 'Preço não disponível';
    
        // Captura a média de avaliações
        $rating = isset($tour['reviews']['combinedAverageRating']) ? number_format($tour['reviews']['combinedAverageRating'], 1) . '⭐' : 'Sem avaliações';
    
        // Captura o total de avaliações e ajusta para singular/plural
        $total_reviews = isset($tour['reviews']['totalReviews']) ? $tour['reviews']['totalReviews'] : 0;
        if ($total_reviews == 0) {
            $rating_count = ''; // Não exibe nada se não houver avaliações
        } elseif ($total_reviews == 1) {
            $rating_count = '(1 avaliação)';
        } else {
            $rating_count = '(' . $total_reviews . ' avaliações)';
        }
        
        // Captura e formata a duração do passeio
        $duration_fixed = isset($tour['duration']['fixedDurationInMinutes']) ? $tour['duration']['fixedDurationInMinutes'] : null;
        $duration_from = isset($tour['duration']['variableDurationFromMinutes']) ? $tour['duration']['variableDurationFromMinutes'] : null;
        $duration_to = isset($tour['duration']['variableDurationToMinutes']) ? $tour['duration']['variableDurationToMinutes'] : null;
        $unstructured_duration = isset($tour['duration']['unstructuredDuration']) ? $tour['duration']['unstructuredDuration'] : null;

        if ($duration_fixed === 0) {
            // Caso específico para duração flexível
            $duration = 'Flexível';
        } elseif ($unstructured_duration !== null) {
            // Se tiver unstructuredDuration, define como 1 hora
            $duration = '1 hora';
        } elseif ($duration_fixed !== null) {
            if ($duration_fixed >= 1440) { // 24 horas = 1440 minutos
                $days = floor($duration_fixed / 1440); // Calcula os dias
                $remaining_minutes = $duration_fixed % 1440; // Minutos restantes
                $hours = floor($remaining_minutes / 60); // Horas restantes
                
                $duration = $days . ' dia' . ($days != 1 ? 's' : '');
                if ($hours > 0) {
                    $duration .= ' e ' . $hours . ' hora' . ($hours != 1 ? 's' : '');
                }
            } elseif ($duration_fixed < 60) {
                $duration = $duration_fixed . ' minutos';
            } else {
                $hours = floor($duration_fixed / 60);
                $minutes = $duration_fixed % 60;
                $duration = $hours . ' hora' . ($hours != 1 ? 's' : '') . ($minutes > 0 ? ' e ' . $minutes . ' minuto' . ($minutes != 1 ? 's' : '') : '');
            }
        } elseif ($duration_from !== null && $duration_to !== null) {
            // Duração variável
            if ($duration_to >= 1440) {
                $days_from = floor($duration_from / 1440);
                $days_to = floor($duration_to / 1440);
                
                if ($days_from == $days_to) {
                    $duration = $days_from . ' dia' . ($days_from != 1 ? 's' : '');
                } else {
                    $duration = 'De ' . $days_from . ' a ' . $days_to . ' dia' . ($days_to != 1 ? 's' : '');
                }
            } elseif ($duration_to < 60) {
                // Ambos os valores em minutos - Formato simplificado
                if ($duration_from < 60 && $duration_to < 60) {
                    $duration = 'De ' . $duration_from . ' a ' . $duration_to . ' minuto' . ($duration_to != 1 ? 's' : '');
                } else {
                    $duration = 'De ' . $duration_from . ' minuto' . ($duration_from != 1 ? 's' : '') . 
                               ' a ' . $duration_to . ' minuto' . ($duration_to != 1 ? 's' : '');
                }
            } else {
                // Verifica se ambos os valores são múltiplos de 60 (sem minutos extras)
                $is_from_multiple_of_60 = ($duration_from % 60 === 0);
                $is_to_multiple_of_60 = ($duration_to % 60 === 0);

                if ($is_from_multiple_of_60 && $is_to_multiple_of_60) {
                    // Exibe de forma simplificada (ex: "De 1 a 2 horas")
                    $hours_from = floor($duration_from / 60);
                    $hours_to = floor($duration_to / 60);
                    $duration = 'De ' . $hours_from . ' a ' . $hours_to . ' hora' . ($hours_to != 1 ? 's' : '');
                } else {
                    // Formata o valor inicial (duration_from)
                    if ($duration_from < 60) {
                        $duration_from_formatted = $duration_from . ' minuto' . ($duration_from != 1 ? 's' : '');
                    } else {
                        $hours_from = floor($duration_from / 60);
                        $minutes_from = $duration_from % 60;
                        $duration_from_formatted = $hours_from . ' hora' . ($hours_from != 1 ? 's' : '') . 
                            ($minutes_from > 0 ? ' e ' . $minutes_from . ' minuto' . ($minutes_from != 1 ? 's' : '') : '');
                    }

                    // Formata o valor final (duration_to)
                    if ($duration_to < 60) {
                        $duration_to_formatted = $duration_to . ' minuto' . ($duration_to != 1 ? 's' : '');
                    } else {
                        $hours_to = floor($duration_to / 60);
                        $minutes_to = $duration_to % 60;
                        $duration_to_formatted = $hours_to . ' hora' . ($hours_to != 1 ? 's' : '') . 
                            ($minutes_to > 0 ? ' e ' . $minutes_to . ' minuto' . ($minutes_to != 1 ? 's' : '') : '');
                    }

                    // Combina os valores formatados
                    $duration = 'De ' . $duration_from_formatted . ' a ' . $duration_to_formatted;
                }
            }
        } else {
            // Duração não disponível
            $duration = 'Duração não disponível';
        }
        
        $flags = isset($tour['flags']) ? $tour['flags'] : []; // Flags
        $url = esc_url($tour['productUrl']);
    
        // Processar flags
        $flag_output = '';
        if (in_array('LIKELY_TO_SELL_OUT', $flags)) {
            $flag_output .= '<span class="viator-badge" data-type="sell-out">Geralmente se esgota</span>';
        }
        if (in_array('SPECIAL_OFFER', $flags)) {
            $flag_output .= '<span class="viator-badge" data-type="special-offer">Oferta especial</span>';
        }
    
        // Processar preços
        $price_html = '';
        if (in_array('SPECIAL_OFFER', $flags) && isset($tour['pricing']['summary']['fromPriceBeforeDiscount'])) {
            // Se for oferta especial e tiver preço com desconto
            $original_price = number_format($tour['pricing']['summary']['fromPriceBeforeDiscount'], 2, ',', '.');
            $discounted_price = number_format($tour['pricing']['summary']['fromPrice'], 2, ',', '.');
            $price_html = '<span class="viator-original-price">R$ ' . $original_price . '</span> <span class="viator-discount-price">R$ ' . $discounted_price . '</span>';
        } else {
            // Preço normal sem desconto
            $price = isset($tour['pricing']['summary']['fromPrice']) ? number_format($tour['pricing']['summary']['fromPrice'], 2, ',', '.') : '0,00';
            $price_html = '<strong>R$ ' . $price . '</strong>';
        }
    
        // Criar o card
        $output .= '<div class="viator-card">
            <div class="viator-card-img">
                <img src="' . $image_url . '" alt="' . $title . '">';
                
                // Adicionar as badges no container da imagem
                if (!empty($flag_output)) {
                    $output .= '<div class="viator-badge-container">' . $flag_output . '</div>';
                }
    
        $output .= '</div>
            <div class="viator-card-content">
                <p class="viator-card-rating">' . $rating . ' ' . $rating_count . '</p>
                <h3>' . $title . '</h3>
                <p>' . substr($description, 0, 120) . '...</p>';

        if (in_array('FREE_CANCELLATION', $flags)) {
            $output .= '<p class="viator-card-duration"><img src="https://img.icons8.com/?size=100&id=85097&format=png&color=04846b" alt="Cancelamento gratuito" title="Política de cancelamento" width="15" height="15"> Cancelamento gratuito</p>';
        }

        $output .= '<p class="viator-card-duration"><img src="https://img.icons8.com/?size=100&id=82767&format=png&color=000000" alt="Duração" title="Duração aproximada" width="15" height="15"> ' . $duration . '</p>
                <p class="viator-card-price"><img src="https://img.icons8.com/?size=100&id=ZXJaNFNjWGZF&format=png&color=000000" alt="Preço" width="15" height="15"> a partir de ' . $price_html . '</p>                
                <a href="' . esc_url(home_url('/passeio/' . $tour['productCode'] . '/')) . '" target="_blank" rel="noopener noreferrer">Ver detalhes</a>';
                
                // Armazenar informações de preço e duração para uso na página de detalhes do produto
                $product_data = array(
                    'fromPrice' => isset($tour['pricing']['summary']['fromPrice']) ? $tour['pricing']['summary']['fromPrice'] : null,
                    'fromPriceBeforeDiscount' => isset($tour['pricing']['summary']['fromPriceBeforeDiscount']) ? $tour['pricing']['summary']['fromPriceBeforeDiscount'] : null,
                    'flags' => $flags,
                    'duration' => $duration,
                    'duration_data' => array(
                        'fixedDurationInMinutes' => $duration_fixed,
                        'variableDurationFromMinutes' => $duration_from,
                        'variableDurationToMinutes' => $duration_to,
                        'unstructuredDuration' => $unstructured_duration
                    )
                );
                update_option('viator_product_' . $tour['productCode'] . '_price', $product_data, false);
                
                $output .= "
            </div>
        </div>";
    }

    // Fechar grid
    $output .= '</div>';

    // Adicionando paginação
    if ($total_pages > 1) {
        $output .= '<div class="viator-pagination">';
        
        // Link para a página anterior
        if ($page > 1) {
            $prev_url = add_query_arg([
                'viator_page' => $page - 1,
                'viator_query' => $searchTerm,
                'viator_sort' => $current_sort,
                'viator_date_start' => isset($_GET['viator_date_start']) ? $_GET['viator_date_start'] : '',
                'viator_date_end' => isset($_GET['viator_date_end']) ? $_GET['viator_date_end'] : '',
                'duration_filter' => isset($_GET['duration_filter']) ? $_GET['duration_filter'] : '',
                'min_price' => isset($_GET['min_price']) ? $_GET['min_price'] : '',
                'max_price' => isset($_GET['max_price']) ? $_GET['max_price'] : '',
                'rating_filter' => isset($_GET['rating_filter']) ? $_GET['rating_filter'] : '',
                'special_filter' => isset($_GET['special_filter']) ? $_GET['special_filter'] : []
            ]);
            $prev_arrow = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/></svg>';
            $output .= '<a class="viator-pagination-arrow" href="' . esc_url($prev_url) . '" data-page="' . ($page - 1) . '">' . $prev_arrow . '</a>';
        }

        // Gerar links das páginas com ellipsis
        $adjacent = 2;
        $pages = array();

        // Sempre mostra a primeira página
        $pages[] = 1;

        // Calcula páginas adjacentes
        $start = max(2, $page - $adjacent);
        $end = min($total_pages - 1, $page + $adjacent);

        // Adiciona ellipsis se necessário antes das páginas intermediárias
        if ($start > 2) {
            $pages[] = '...';
        }

        // Páginas intermediárias
        for ($i = $start; $i <= $end; $i++) {
            $pages[] = $i;
        }

        // Adiciona ellipsis se necessário após as páginas intermediárias
        if ($end < $total_pages - 1) {
            $pages[] = '...';
        }

        // Sempre mostra a última página se houver mais de uma
        if ($total_pages > 1) {
            $pages[] = $total_pages;
        }

        // Loop para gerar os links ou ellipsis
        foreach ($pages as $page_num) {
            if ($page_num === '...') {
                $output .= '<span class="viator-pagination-ellipsis">...</span>';
            } else {
                // Coletar todos os parâmetros de filtro para cada link de paginação
                $pagination_params = [
                    'viator_page' => $page_num,
                    'viator_query' => $searchTerm,
                    'viator_sort' => $current_sort
                ];
                
                // Adicionar parâmetros de data se existirem
                if (isset($_GET['viator_date_start']) && !empty($_GET['viator_date_start'])) {
                    $pagination_params['viator_date_start'] = $_GET['viator_date_start'];
                }
                if (isset($_GET['viator_date_end']) && !empty($_GET['viator_date_end'])) {
                    $pagination_params['viator_date_end'] = $_GET['viator_date_end'];
                }
                
                // Adicionar filtro de duração se existir
                if (isset($_GET['duration_filter']) && !empty($_GET['duration_filter'])) {
                    $pagination_params['duration_filter'] = $_GET['duration_filter'];
                }
                
                // Adicionar filtros de preço se existirem
                if (isset($_GET['min_price']) && $_GET['min_price'] !== '') {
                    $pagination_params['min_price'] = $_GET['min_price'];
                }
                if (isset($_GET['max_price']) && $_GET['max_price'] !== '') {
                    $pagination_params['max_price'] = $_GET['max_price'];
                }
                
                // Adicionar filtro de avaliação se existir
                if (isset($_GET['rating_filter']) && !empty($_GET['rating_filter'])) {
                    $pagination_params['rating_filter'] = $_GET['rating_filter'];
                }
                
                // Adicionar filtros especiais se existirem
                if (isset($_GET['special_filter']) && is_array($_GET['special_filter']) && !empty($_GET['special_filter'])) {
                    $pagination_params['special_filter'] = $_GET['special_filter'];
                }
                
                $url = add_query_arg($pagination_params);
                $active_class = ($page_num == $page) ? ' active' : '';
                $output .= '<a class="viator-pagination-btn' . $active_class . '" href="' . esc_url($url) . '" data-page="' . $page_num . '">' . $page_num . '</a>';
            }
        }

        // Link para a próxima página
        if ($page < $total_pages) {
            $next_url = add_query_arg([
                'viator_page' => $page + 1,
                'viator_query' => $searchTerm,
                'viator_sort' => $current_sort,
                'viator_date_start' => isset($_GET['viator_date_start']) ? $_GET['viator_date_start'] : '',
                'viator_date_end' => isset($_GET['viator_date_end']) ? $_GET['viator_date_end'] : '',
                'duration_filter' => isset($_GET['duration_filter']) ? $_GET['duration_filter'] : '',
                'min_price' => isset($_GET['min_price']) ? $_GET['min_price'] : '',
                'max_price' => isset($_GET['max_price']) ? $_GET['max_price'] : '',
                'rating_filter' => isset($_GET['rating_filter']) ? $_GET['rating_filter'] : '',
                'special_filter' => isset($_GET['special_filter']) ? $_GET['special_filter'] : []
            ]);
            $next_arrow = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/></svg>';
            $output .= '<a class="viator-pagination-arrow" href="' . esc_url($next_url) . '" data-page="' . ($page + 1) . '">' . $next_arrow . '</a>';
        }

        $output .= '</div>';
    }

    $output .= '</div>'; // Fecha viator-results-container
    $output .= '</div>'; // Fecha viator-content-wrapper

    return $output;
}

// Criar o shortcode para exibir o formulário e os resultados
add_shortcode('viator_search', 'viator_search_form');

// Modificar o handler AJAX de ordenação
function viator_ajax_update_sort() {
    check_ajax_referer('viator_sort_nonce', 'nonce');
    
    // Verificar e sanitizar todos os parâmetros necessários
    $search_term = isset($_POST['viator_query']) ? sanitize_text_field($_POST['viator_query']) : '';
    if (empty($search_term)) {
        wp_send_json_error(['message' => 'Termo de busca não fornecido']);
        wp_die();
    }

    // Configurar os parâmetros GET para a função de busca
    $_GET['viator_query'] = $search_term;
    $_GET['viator_sort'] = isset($_POST['viator_sort']) ? sanitize_text_field($_POST['viator_sort']) : 'DEFAULT';
    $_GET['viator_page'] = isset($_POST['viator_page']) ? intval($_POST['viator_page']) : 1;
    $_GET['viator_date_start'] = isset($_POST['viator_date_start']) ? sanitize_text_field($_POST['viator_date_start']) : '';
    $_GET['viator_date_end'] = isset($_POST['viator_date_end']) ? sanitize_text_field($_POST['viator_date_end']) : '';
    
    // Processar filtro de duração
    if (isset($_POST['duration_filter']) && !empty($_POST['duration_filter'])) {
        $_GET['duration_filter'] = sanitize_text_field($_POST['duration_filter']);
    } else {
        unset($_GET['duration_filter']);
    }

    // Processar filtros de preço
    // Limpar para garantir que valores vazios não interferem
    unset($_GET['min_price']);
    unset($_GET['max_price']);
    
    // Processar min_price
    if (isset($_POST['min_price']) && $_POST['min_price'] !== '') {
        $_GET['min_price'] = sanitize_text_field($_POST['min_price']);
    }
    
    // Processar max_price
    if (isset($_POST['max_price']) && $_POST['max_price'] !== '') {
        $_GET['max_price'] = sanitize_text_field($_POST['max_price']);
    }
    
    // Processar filtro de avaliação
    if (isset($_POST['rating_filter']) && !empty($_POST['rating_filter'])) {
        $_GET['rating_filter'] = sanitize_text_field($_POST['rating_filter']);
    } else {
        unset($_GET['rating_filter']);
    }
    
    // Processar filtros especiais
    unset($_GET['special_filter']);
    
    // Verificar se existem filtros especiais no POST
    if (isset($_POST['special_filter']) && is_array($_POST['special_filter'])) {
        $_GET['special_filter'] = array_map('sanitize_text_field', $_POST['special_filter']);
    } else {
        // Verificar se existem filtros especiais indexados
        $special_filters = array();
        for ($i = 0; isset($_POST["special_filter[$i]"]); $i++) {
            $special_filters[] = sanitize_text_field($_POST["special_filter[$i]"]);
        }
        
        if (!empty($special_filters)) {
            $_GET['special_filter'] = $special_filters;
        }
    }
    
    // Debug dos parâmetros para solução de problemas
    viator_debug_log('Sort AJAX Params Recebidos:', $_POST);
    viator_debug_log('Sort AJAX Params Processados:', $_GET);
    
    // Obter os resultados
    $results = viator_get_search_results($search_term);
    
    // Verificar se os resultados são válidos
    if (empty($results)) {
        wp_send_json_error(['message' => 'Nenhum resultado encontrado']);
        wp_die();
    }
    // Retornar os resultados como HTML
    echo $results;
    wp_die();
}
add_action('wp_ajax_viator_update_sort', 'viator_ajax_update_sort');
add_action('wp_ajax_nopriv_viator_update_sort', 'viator_ajax_update_sort');

// Adicionar nova action para o filtro
add_action('wp_ajax_viator_update_filter', 'viator_ajax_update_filter');
add_action('wp_ajax_nopriv_viator_update_filter', 'viator_ajax_update_filter');

function viator_ajax_update_filter() {
    check_ajax_referer('viator_sort_nonce', 'nonce');
    
    // Verificar e sanitizar o termo de busca
    $search_term = isset($_POST['viator_query']) ? sanitize_text_field($_POST['viator_query']) : '';
    if (empty($search_term)) {
        wp_send_json_error(['message' => 'Termo de busca não fornecido']);
        wp_die();
    }
    
    // Configurar os parâmetros GET para a função de busca
    $_GET['viator_query'] = $search_term;
    
    // Processar parâmetro de ordenação
    $_GET['viator_sort'] = isset($_POST['viator_sort']) ? sanitize_text_field($_POST['viator_sort']) : 'DEFAULT';
    
    // Processar paginação
    $_GET['viator_page'] = isset($_POST['viator_page']) ? intval($_POST['viator_page']) : 1;
    
    // Processar datas
    $_GET['viator_date_start'] = isset($_POST['viator_date_start']) ? sanitize_text_field($_POST['viator_date_start']) : '';
    $_GET['viator_date_end'] = isset($_POST['viator_date_end']) ? sanitize_text_field($_POST['viator_date_end']) : '';
    
    // Validar formato das datas
    if (!empty($_GET['viator_date_start']) && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['viator_date_start'])) {
        $_GET['viator_date_start'] = '';
    }
    if (!empty($_GET['viator_date_end']) && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['viator_date_end'])) {
        $_GET['viator_date_end'] = '';
    }
    
    // Processar filtro de duração
    if (isset($_POST['duration_filter']) && !empty($_POST['duration_filter'])) {
        $_GET['duration_filter'] = sanitize_text_field($_POST['duration_filter']);
    } else {
        unset($_GET['duration_filter']);
    }

    // Processar filtros de preço
    // Limpamos para garantir que valores vazios não interferem
    unset($_GET['min_price']);
    unset($_GET['max_price']);
    
    // Processar min_price
    if (isset($_POST['min_price']) && $_POST['min_price'] !== '') {
        $_GET['min_price'] = intval($_POST['min_price']);
    }
    
    // Processar max_price
    if (isset($_POST['max_price']) && $_POST['max_price'] !== '') {
        $_GET['max_price'] = intval($_POST['max_price']);
    }
    
    // Processar filtro de avaliação
    if (isset($_POST['rating_filter']) && !empty($_POST['rating_filter'])) {
        $_GET['rating_filter'] = sanitize_text_field($_POST['rating_filter']);
    } else {
        unset($_GET['rating_filter']);
    }
    
    // Processar filtros especiais
    unset($_GET['special_filter']);
    
    // Se existirem filtros especiais no POST, processá-los
    if (isset($_POST['special_filter']) && is_array($_POST['special_filter'])) {
        $_GET['special_filter'] = [];
        foreach ($_POST['special_filter'] as $value) {
            $_GET['special_filter'][] = sanitize_text_field($value);
            viator_debug_log('Filtro especial recebido via POST array:', $value);
        }
    } elseif (isset($_POST['special_filter']) && !is_array($_POST['special_filter'])) {
        // Se for um único valor (não array)
        $_GET['special_filter'] = [sanitize_text_field($_POST['special_filter'])];
        viator_debug_log('Filtro especial recebido via POST único valor:', $_POST['special_filter']);
    }
    
    // Verificar se existem os parâmetros indexed special_filter (para compatibilidade com jQuery serialize)
    for ($i = 0; isset($_POST["special_filter[$i]"]); $i++) {
        if (!isset($_GET['special_filter'])) {
            $_GET['special_filter'] = [];
        }
        $_GET['special_filter'][] = sanitize_text_field($_POST["special_filter[$i]"]);
        viator_debug_log('Filtro especial recebido via POST indexed:', $_POST["special_filter[$i]"]);
    }
    
    // Debug dos parâmetros para solução de problemas
    viator_debug_log('AJAX Parâmetros recebidos:', $_POST);
    viator_debug_log('AJAX Parâmetros processados:', $_GET);

    // Obter os resultados
    $results = viator_get_search_results($search_term);
    
    // Verificar se os resultados são válidos
    if (empty($results)) {
        wp_send_json_error(['message' => 'Nenhum resultado encontrado']);
        wp_die();
    }
    // Retornar os resultados como HTML
    echo $results;
    wp_die();
}