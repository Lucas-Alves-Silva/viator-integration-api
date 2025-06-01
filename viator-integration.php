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
    register_setting('viator_settings', 'viator_groq_api_key');
    register_setting('viator_settings', 'viator_language');
    register_setting('viator_settings', 'viator_currency');
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
                        <p class="description">Insira sua chave API da Viator aqui.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Groq API Key</th>
                    <td>
                        <input type="text" 
                               name="viator_groq_api_key" 
                               value="<?php echo esc_attr(get_option('viator_groq_api_key')); ?>" 
                               class="regular-text">
                        <p class="description">Insira sua chave API do Groq para gerar curiosidades inteligentes sobre os destinos pesquisados.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Idioma</th>
                    <td>
                        <select name="viator_language" id="viator_language">
                            <option value="pt-BR" <?php selected(get_option('viator_language', 'pt-BR'), 'pt-BR'); ?>>Português do Brasil</option>
                            <option value="en-US" <?php selected(get_option('viator_language', 'pt-BR'), 'en-US'); ?>>English (US)</option>
                            <option value="es-ES" <?php selected(get_option('viator_language', 'pt-BR'), 'es-ES'); ?>>Español</option>
                        </select>
                        <p class="description">Selecione o idioma para exibição dos produtos e traduções automáticas.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Moeda</th>
                    <td>
                        <select name="viator_currency" id="viator_currency">
                            <option value="BRL" <?php selected(get_option('viator_currency', 'BRL'), 'BRL'); ?>>Real Brasileiro (BRL)</option>
                            <option value="USD" <?php selected(get_option('viator_currency', 'BRL'), 'USD'); ?>>Dólar Americano (USD)</option>
                            <option value="EUR" <?php selected(get_option('viator_currency', 'BRL'), 'EUR'); ?>>Euro (EUR)</option>
                        </select>
                        <p class="description">Selecione a moeda para exibição dos preços dos produtos.</p>
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
    wp_enqueue_script('viator-interactions', $plugin_dir . 'interactions.js', array('jquery', 'ipgeolocation-api', 'swiper-js'), '1.0.2', true);

    // Add JavaScript variables
    wp_localize_script('viator-interactions', 'viatorAjax', array(
        'ajaxurl' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('viator_sort_nonce')
    ));

    // Add Flatpickr
    wp_enqueue_style('flatpickr', 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css');
    wp_enqueue_script('flatpickr', 'https://cdn.jsdelivr.net/npm/flatpickr', array(), null, true);
    
    // Carregar localização do Flatpickr baseada no idioma configurado
    $locale_settings = viator_get_locale_settings();
    $flatpickr_locale = '';
    
    if ($locale_settings['language'] === 'pt-BR') {
        wp_enqueue_script('flatpickr-pt', 'https://npmcdn.com/flatpickr/dist/l10n/pt.js', array('flatpickr'), null, true);
        $flatpickr_locale = 'pt';
    } elseif ($locale_settings['language'] === 'es-ES') {
        wp_enqueue_script('flatpickr-es', 'https://npmcdn.com/flatpickr/dist/l10n/es.js', array('flatpickr'), null, true);
        $flatpickr_locale = 'es';
    }
    // Para inglês (en-US), não precisamos carregar localização adicional, pois é o padrão

    // Add currency symbol and translations for JavaScript
    wp_localize_script('viator-interactions', 'viatorConfig', array(
        'currencySymbol' => $locale_settings['currency_symbol'],
        'language' => $locale_settings['language'],
        'flatpickrLocale' => $flatpickr_locale,
        'translations' => array(
            'search_button' => viator_t('search_button'),
            'search_placeholder' => viator_t('search_placeholder'),
            'search_nearby' => viator_t('search_nearby'),
            'clear_all' => viator_t('clear_all'),
            'filters' => viator_t('filters'),
            'searching' => viator_t('searching'),
            'reset_button' => viator_t('reset_button'),
            'apply_button' => viator_t('apply_button'),
            'choose_date' => viator_t('choose_date'),
            'duration_approx_short' => viator_t('duration_approx_short'),
            'date_connector' => viator_t('date_connector'),
            'months_short' => [
                viator_t('jan_short'), viator_t('feb_short'), viator_t('mar_short'),
                viator_t('apr_short'), viator_t('may_short'), viator_t('jun_short'),
                viator_t('jul_short'), viator_t('aug_short'), viator_t('sep_short'),
                viator_t('oct_short'), viator_t('nov_short'), viator_t('dec_short')
            ],
            'please_wait' => viator_t('please_wait'),
            'lets_go_searching' => viator_t('lets_go_searching'),
        )
    ));
    
    // Adicionar script inline para definir o atributo de idioma no body
    wp_add_inline_script('viator-interactions', "
        document.addEventListener('DOMContentLoaded', function() {
            document.body.setAttribute('data-viator-lang', '{$locale_settings['language']}');
        });
    ");

    // Enqueue Ionicons
    wp_enqueue_script('ionicons-module', 'https://unpkg.com/ionicons@5.5.2/dist/ionicons/ionicons.esm.js', array(), null, true);
    wp_enqueue_script('ionicons-nomodule', 'https://unpkg.com/ionicons@5.5.2/dist/ionicons/ionicons.js', array(), null, true);

    // Enqueue DotLottie Player
    wp_enqueue_script('dotlottie-player', 'https://unpkg.com/@dotlottie/player-component@2.7.12/dist/dotlottie-player.mjs', array(), null, true);
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
            <input type="text" name="viator_query" autocomplete="off" placeholder="<?php echo esc_attr(viator_t('search_placeholder')); ?>" value="<?php echo esc_attr($searchTerm); ?>" required>
            <div class="viator-nearby-suggestion" style="display: none;">
                <span class="location-icon"><img src="https://img.icons8.com/?size=100&id=3009BI6rABJa&format=png&color=04846B" alt="Ícone" width="15" height="15"></span>
                <span><?php echo esc_html(viator_t('search_nearby')); ?></span>
            </div>
        </div>
        <button type="submit" id="search-button">
            <span id="search-text"><?php echo esc_html(viator_t('search_button')); ?></span>
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
        return '<p class="error">' . esc_html(viator_t('error_api_key')) . '</p>';
    }
    
    // Obter configurações de idioma e moeda
    $locale_settings = viator_get_locale_settings();
    
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
        "currency" => $locale_settings['currency']
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
            'Accept-Language'  => $locale_settings['language'],
        ],
        'body'    => $body,
        'timeout' => 120,
    ]);

    // Verificar se houve erro na requisição
    if (is_wp_error($response)) {
        $output = '<div class="viator-content-wrapper">';
        $output .= '<div class="viator-results-container">';
        $output .= '<p class="viator-error-message">' . esc_html(viator_t('error_try_again')) . '</p>';
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

    // Verificar se há filtros especiais selecionados para filtrar os resultados localmente
    $special_filters_to_check = [];
    if (isset($_GET['special_filter']) && is_array($_GET['special_filter']) && !empty($_GET['special_filter'])) {
        foreach ($_GET['special_filter'] as $filter) {
            switch ($filter) {
                case 'free_cancellation':
                    $special_filters_to_check[] = 'FREE_CANCELLATION';
                    break;
                case 'likely_to_sell_out':
                    $special_filters_to_check[] = 'LIKELY_TO_SELL_OUT';
                    break;
                case 'skip_the_line':
                    $special_filters_to_check[] = 'SKIP_THE_LINE';
                    break;
                case 'private_tour':
                    $special_filters_to_check[] = 'PRIVATE_TOUR';
                    break;
                case 'new_on_viator':
                    $special_filters_to_check[] = 'NEW_ON_VIATOR';
                    break;
            }
        }
    }

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
        $output .= '<p class="viator-error-message">' . esc_html(viator_t('no_tours_found')) . ' "' . esc_html($_GET['viator_query']) . '".</p>';
        
        // Adiciona sugestões de destinos
        $output .= '<div class="viator-suggestions">';
        $output .= '<p>' . esc_html(viator_t('try_popular_destinations')) . '</p>';
        $output .= '<div class="viator-suggestions-grid">';
        
        foreach ($destinos_aleatorios as $destino) {
            $output .= '<button class="viator-suggestion-btn" onclick="setSearchDestination(\'' . esc_attr($destino) . '\')">🌍 ' . esc_html($destino) . '</button>';
        }
        
        $output .= '</div></div>';
        $output .= '</div></div>';
        viator_debug_log('Nenhum resultado encontrado para a busca:', $_GET['viator_query']);
        return $output;
    }
    
    // Filtrar produtos que não têm as flags selecionadas
    if (!empty($special_filters_to_check) && !empty($data['products']['results'])) {
        $filtered_results = [];
        foreach ($data['products']['results'] as $tour) {
            $flags = isset($tour['flags']) ? $tour['flags'] : [];
            $should_include = true;
            
            // Verificar se o produto tem TODAS as flags selecionadas
            foreach ($special_filters_to_check as $required_flag) {
                if (!in_array($required_flag, $flags)) {
                    $should_include = false;
                    break;
                }
            }
            
            if ($should_include) {
                $filtered_results[] = $tour;
            }
        }
        
        // Atualizar os resultados com apenas os produtos filtrados
        $data['products']['results'] = $filtered_results;
        
        // Atualizar o total de produtos
        $data['products']['totalCount'] = count($filtered_results);
        
        // Se não houver resultados após a filtragem, mostrar mensagem de "nenhum produto encontrado"
        if (empty($filtered_results)) {
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
            $output .= '<p class="viator-error-message">' . esc_html(viator_t('no_tours_found_filters')) . ' "' . esc_html($_GET['viator_query']) . '".</p>';
            
            // Adiciona sugestões de destinos
            $output .= '<div class="viator-suggestions">';
            $output .= '<p>' . esc_html(viator_t('try_popular_destinations')) . '</p>';
            $output .= '<div class="viator-suggestions-grid">';
            
            foreach ($destinos_aleatorios as $destino) {
                $output .= '<button class="viator-suggestion-btn" onclick="setSearchDestination(\'' . esc_attr($destino) . '\')">🌍 ' . esc_html($destino) . '</button>';
            }
            
            $output .= '</div></div>';
            $output .= '</div></div>';
            viator_debug_log('Nenhum resultado encontrado após a filtragem local para a busca:', $_GET['viator_query']);
            return $output;
        }
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
            <h3>' . esc_html(viator_t('when_travel')) . '</h3>
            <button type="button" class="viator-date-selector">
                <b>📅</b>
                <span>' . esc_html(viator_t('choose_date')) . '</span>
            </button>
        </div>';

    // Adicionando o filtro de duração
    $output .= '<div class="viator-duration-filter">
        <h3>' . esc_html(viator_t('duration')) . '</h3>';

    // Opções de filtro com valores corretos
    $duration_options = [
        '0-60' => viator_t('up_to_one_hour'),
        '60-240' => viator_t('one_to_four_hours'),
        '240-1440' => viator_t('four_hours_to_one_day'),
        '1440-4320' => viator_t('one_to_three_days'),
        '4320-' => viator_t('more_than_three_days')
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
        <h3>' . esc_html(viator_t('price_range')) . '</h3>
        <div class="viator-price-slider-container">
            <div class="viator-price-values">
                <span id="min_price_display">' . $locale_settings['currency_symbol'] . ' ' . $current_min_price . '</span>
                <span id="max_price_display">' . $locale_settings['currency_symbol'] . ' ' . $current_max_price . ($current_max_price >= 5000 ? '+' : '') . '</span>
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
    $output .= '<h3>' . esc_html(viator_t('rating')) . '</h3>';
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
    $output .= '<h3>' . esc_html(viator_t('specials')) . '</h3>';
    $output .= '<div class="viator-specials-options">';
    
    // Opção: Cancelamento Gratuito
    $free_cancel_checked = isset($_GET['special_filter']) && in_array('free_cancellation', (array)$_GET['special_filter']) ? 'checked' : '';
    $output .= '<label class="viator-special-option">';
    $output .= '<input type="checkbox" name="special_filter[]" value="free_cancellation" ' . $free_cancel_checked . '>';
    $output .= '<span class="viator-special-text">' . esc_html(viator_t('free_cancellation')) . '</span>';
    $output .= '</label>';
    
    // Opção: Prestes a Esgotar
    $sell_out_checked = isset($_GET['special_filter']) && in_array('likely_to_sell_out', (array)$_GET['special_filter']) ? 'checked' : '';
    $output .= '<label class="viator-special-option">';
    $output .= '<input type="checkbox" name="special_filter[]" value="likely_to_sell_out" ' . $sell_out_checked . '>';
    $output .= '<span class="viator-special-text">' . esc_html(viator_t('likely_to_sell_out')) . '</span>';
    $output .= '</label>';
    
    // Opção: Fura-Fila
    $skip_line_checked = isset($_GET['special_filter']) && in_array('skip_the_line', (array)$_GET['special_filter']) ? 'checked' : '';
    $output .= '<label class="viator-special-option">';
    $output .= '<input type="checkbox" name="special_filter[]" value="skip_the_line" ' . $skip_line_checked . '>';
    $output .= '<span class="viator-special-text">' . esc_html(viator_t('skip_the_line')) . '</span>';
    $output .= '</label>';
    
    // Opção: Tour Privado
    $private_checked = isset($_GET['special_filter']) && in_array('private_tour', (array)$_GET['special_filter']) ? 'checked' : '';
    $output .= '<label class="viator-special-option">';
    $output .= '<input type="checkbox" name="special_filter[]" value="private_tour" ' . $private_checked . '>';
    $output .= '<span class="viator-special-text">' . esc_html(viator_t('private_tour')) . '</span>';
    $output .= '</label>';
    
    // Opção: Novo no Viator
    $new_checked = isset($_GET['special_filter']) && in_array('new_on_viator', (array)$_GET['special_filter']) ? 'checked' : '';
    $output .= '<label class="viator-special-option">';
    $output .= '<input type="checkbox" name="special_filter[]" value="new_on_viator" ' . $new_checked . '>';
    $output .= '<span class="viator-special-text">' . esc_html(viator_t('new_on_viator')) . '</span>';
    $output .= '</label>';
    
    $output .= '</div>'; // Fechando viator-specials-options
    $output .= '</div>'; // Fechando viator-specials-filter
    
    // Botão de Limpar tudo
    $output .= '<div class="viator-clear-filters">';
    $output .= '<button type="button" id="clear-all-filters" class="viator-clear-all-btn">' . esc_html(viator_t('clear_all')) . '</button>';
    $output .= '</div>';

    // Fechar a sidebar de filtros
    $output .= '</div>'; // Fechando viator-filters

    // Header com total e ordenação
    $output .= '<div class="viator-results-container">
                <div class="viator-header">
                <div class="viator-header-info">
                <span class="viator-header-cancel"><img src="https://img.icons8.com/?size=100&id=82742&format=png&color=000000" alt="Ícone" width="15" height="15"> ' . esc_html(viator_t('free_cancellation_note')) . '</span>
                <div class="viator-header-info-filter">
                <button class="viator-mobile-filter-button" id="mobile-filter-button">
                    <span class="filter-icon"><img width="25" height="25" src="https://img.icons8.com/ios-filled/50/sorting-options.png" alt="sorting-options"/></span>
                    <span class="filter-text">' . esc_html(viator_t('filters')) . '</span>
                </button>
                <p class="viator-total">' . $formatted_total . ' ' . esc_html(viator_t('results')) . '</p>
    </div>';
    
    // Select de ordenação
    $current_sort = isset($_GET['viator_sort']) ? $_GET['viator_sort'] : 'DEFAULT';
    $output .= '<div class="viator-sort">
        <select name="viator_sort" id="viator-sort" onchange="updateSort(this.value)">
            <option value="DEFAULT"' . selected($current_sort, 'DEFAULT', false) . '>' . esc_html(viator_t('featured')) . '</option>
            <option value="REVIEW_AVG_RATING"' . selected($current_sort, 'REVIEW_AVG_RATING', false) . '>' . esc_html(viator_t('best_rated')) . '</option>
            <option value="PRICE_ASC"' . selected($current_sort, 'PRICE_ASC', false) . '>' . esc_html(viator_t('price_low_to_high')) . '</option>
            <option value="PRICE_DESC"' . selected($current_sort, 'PRICE_DESC', false) . '>' . esc_html(viator_t('price_high_to_low')) . '</option>
            <option value="DURATION_ASC"' . selected($current_sort, 'DURATION_ASC', false) . '>' . esc_html(viator_t('duration_ascending')) . '</option>
            <option value="DURATION_DESC"' . selected($current_sort, 'DURATION_DESC', false) . '>' . esc_html(viator_t('duration_descending')) . '</option>
            <option value="DATE_ADDED_DESC"' . selected($current_sort, 'DATE_ADDED_DESC', false) . '>' . esc_html(viator_t('newest_on_viator')) . '</option>
        </select>
    </div>';
    $output .= '</div>';

    // Obter curiosidade usando a API do Groq
    $extract = viator_get_groq_curiosity($searchTerm);

    // Output the curiosities div
    $output .= '<div class="viator-curiosities">
        <span><img src="https://img.icons8.com/?size=100&id=ulD4laUCmfyE&format=png&color=000000" alt="Ícone"> 
        <strong>' . esc_html(viator_t('did_you_know')) . '</strong> ' . esc_html($extract) . '</span>
    </div>';

    // Iniciar grid de cards
    $output .= '<div class="viator-grid">';

    foreach ($data['products']['results'] as $tour) {
        // Pegar a imagem de melhor qualidade
        $image_url = isset($tour['images'][0]['variants'][3]['url']) ? $tour['images'][0]['variants'][3]['url'] : 'https://via.placeholder.com/400x200'; 
    
        // Pegar os dados principais
        $title = esc_html($tour['title']);
        $description = esc_html($tour['description']);
        $price = isset($tour['pricing']['summary']['fromPrice']) ? $locale_settings['currency_symbol'] . ' ' . number_format($tour['pricing']['summary']['fromPrice'], 2, ',', '.') : viator_t('price_not_available');
    
        // Captura a média de avaliações
        $rating = isset($tour['reviews']['combinedAverageRating']) ? number_format($tour['reviews']['combinedAverageRating'], 1) . '⭐' : viator_t('no_reviews');
    
        // Captura o total de avaliações e ajusta para singular/plural
        $total_reviews = isset($tour['reviews']['totalReviews']) ? $tour['reviews']['totalReviews'] : 0;
        if ($total_reviews == 0) {
            $rating_count = ''; // Não exibe nada se não houver avaliações
        } elseif ($total_reviews == 1) {
            $rating_count = '(1 ' . viator_t('review') . ')';
        } else {
            $rating_count = '(' . $total_reviews . ' ' . viator_t('reviews') . ')';
        }
        
        // Captura e formata a duração do passeio usando a função de tradução
        $duration_fixed = isset($tour['duration']['fixedDurationInMinutes']) ? $tour['duration']['fixedDurationInMinutes'] : null;
        $duration_from = isset($tour['duration']['variableDurationFromMinutes']) ? $tour['duration']['variableDurationFromMinutes'] : null;
        $duration_to = isset($tour['duration']['variableDurationToMinutes']) ? $tour['duration']['variableDurationToMinutes'] : null;
        $unstructured_duration = isset($tour['duration']['unstructuredDuration']) ? $tour['duration']['unstructuredDuration'] : null;

        $duration = viator_format_duration($duration_fixed, $duration_from, $duration_to, $unstructured_duration);
        
        $flags = isset($tour['flags']) ? $tour['flags'] : []; // Flags
        $url = esc_url($tour['productUrl']);
    
        // Processar flags
        $flag_output = '';
        if (in_array('LIKELY_TO_SELL_OUT', $flags)) {
            $flag_output .= '<span class="viator-badge" data-type="sell-out">' . esc_html(viator_t('likely_to_sell_out_badge')) . '</span>';
        }
        if (in_array('SPECIAL_OFFER', $flags)) {
            $flag_output .= '<span class="viator-badge" data-type="special-offer">' . esc_html(viator_t('special_offer_badge')) . '</span>';
        }
    
        // Processar preços
        $price_html = '';
        if (in_array('SPECIAL_OFFER', $flags) && isset($tour['pricing']['summary']['fromPriceBeforeDiscount'])) {
            // Se for oferta especial e tiver preço com desconto
            $original_price = number_format($tour['pricing']['summary']['fromPriceBeforeDiscount'], 2, ',', '.');
            $discounted_price = number_format($tour['pricing']['summary']['fromPrice'], 2, ',', '.');
            $price_html = '<span class="viator-original-price">' . $locale_settings['currency_symbol'] . ' ' . $original_price . '</span> <span class="viator-discount-price">' . $locale_settings['currency_symbol'] . ' ' . $discounted_price . '</span>';
        } else {
            // Preço normal sem desconto
            $price = isset($tour['pricing']['summary']['fromPrice']) ? number_format($tour['pricing']['summary']['fromPrice'], 2, ',', '.') : '0,00';
            $price_html = '<strong>' . $locale_settings['currency_symbol'] . ' ' . $price . '</strong>';
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
            $output .= '<p class="viator-card-duration"><img src="https://img.icons8.com/?size=100&id=85097&format=png&color=04846b" alt="Cancelamento gratuito" title="Política de cancelamento" width="15" height="15"> ' . esc_html(viator_t('free_cancellation_badge')) . '</p>';
        }

        $output .= '<p class="viator-card-duration"><img src="https://img.icons8.com/?size=100&id=82767&format=png&color=000000" alt="Duração" title="Duração aproximada" width="15" height="15"> ' . esc_html($duration) . '</p>
                <p class="viator-card-price"><img src="https://img.icons8.com/?size=100&id=ZXJaNFNjWGZF&format=png&color=000000" alt="Preço" width="15" height="15"> ' . esc_html(viator_t('from_price')) . ' ' . $price_html . '</p>                
                <a href="' . esc_url(home_url('/passeio/' . $tour['productCode'] . '/')) . '" target="_blank" rel="noopener noreferrer">' . esc_html(viator_t('see_details')) . '</a>';
                
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
    viator_debug_log('Sort AJAX Parâmetros recebidos:', $_POST);
    viator_debug_log('Sort AJAX Parâmetros processados:', $_GET);
    
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

// Adicionar atributos type="module" e nomodule para scripts específicos
function add_ionicons_script_attributes($tag, $handle, $src) {
    if ('ionicons-module' === $handle) {
        $tag = '<script type="module" src="' . esc_url($src) . '"></script>';
    }
    if ('ionicons-nomodule' === $handle) {
        $tag = '<script nomodule src="' . esc_url($src) . '"></script>';
    }
    // Adicionar type="module" para o dotlottie-player
    if ('dotlottie-player' === $handle) {
        $tag = '<script type="module" src="' . esc_url($src) . '"></script>';
    }
    return $tag;
}
add_filter('script_loader_tag', 'add_ionicons_script_attributes', 10, 3);

// Função para obter o símbolo da moeda
function viator_get_currency_symbol($currency_code = null) {
    if (!$currency_code) {
        $currency_code = get_option('viator_currency', 'BRL');
    }
    
    $currency_symbols = [
        'BRL' => 'R$',
        'USD' => '$',
        'EUR' => '€'
    ];
    
    return isset($currency_symbols[$currency_code]) ? $currency_symbols[$currency_code] : $currency_code;
}

// Função para obter configurações de idioma e moeda
function viator_get_locale_settings() {
    return [
        'language' => get_option('viator_language', 'pt-BR'),
        'currency' => get_option('viator_currency', 'BRL'),
        'currency_symbol' => viator_get_currency_symbol()
    ];
}

// Sistema de tradução completo
function viator_get_translation($key, $language = null) {
    if (!$language) {
        $language = get_option('viator_language', 'pt-BR');
    }
    
    $translations = [
        'pt-BR' => [
            // Formulário de busca
            'search_placeholder' => '🌍 Aonde você quer ir?',
            'search_button' => 'Pesquisar',
            'search_nearby' => 'Nos arredores',
            
            // Filtros
            'when_travel' => 'Quando você pretende viajar?',
            'choose_date' => 'Escolher data',
            'duration' => 'Duração',
            'up_to_one_hour' => 'Até uma hora',
            'one_to_four_hours' => '1 a 4 horas',
            'four_hours_to_one_day' => '4 horas a 1 dia',
            'one_to_three_days' => '1 a 3 dias',
            'more_than_three_days' => 'Mais de três dias',
            'price_range' => 'Faixa de Preço',
            'rating' => 'Avaliação',
            'specials' => 'Especiais',
            'free_cancellation' => 'Cancelamento Gratuito',
            'likely_to_sell_out' => 'Geralmente se esgota',
            'skip_the_line' => 'Evitar fila',
            'private_tour' => 'Tour Privado',
            'new_on_viator' => 'Novidade na Viator',
            'clear_all' => 'Limpar tudo',
            'filters' => 'Filtros',
            
            // Ordenação
            'featured' => 'Em destaque',
            'best_rated' => 'Melhor avaliados',
            'price_low_to_high' => 'Preço (menor para maior)',
            'price_high_to_low' => 'Preço (maior para menor)',
            'duration_ascending' => 'Duração (crescente)',
            'duration_descending' => 'Duração (decrescente)',
            'newest_on_viator' => 'Novidade na Viator',
            
            // Resultados
            'results' => 'resultados',
            'no_tours_found' => 'Nenhum passeio encontrado para',
            'no_tours_found_filters' => 'Nenhum passeio encontrado com os filtros selecionados para',
            'try_popular_destinations' => 'Que tal experimentar um destes destinos populares?',
            'did_you_know' => 'Você sabia?',
            'free_cancellation_note' => 'Cancelamento grátis até 24 horas antes do início da experiência (horário local)',
            
            // Cards de produto
            'duration_approx' => 'Duração aproximada',
            'from_price' => 'a partir de',
            'see_details' => 'Ver detalhes',
            'price_not_available' => 'Preço não disponível',
            'no_reviews' => 'Sem avaliações',
            'review' => 'avaliação',
            'reviews' => 'avaliações',
            'special_offer' => 'Oferta especial',
            
            // Badges
            'free_cancellation_badge' => 'Cancelamento gratuito',
            'likely_to_sell_out_badge' => 'Geralmente se esgota',
            'special_offer_badge' => 'Oferta especial',
            
            // Duração
            'duration_not_available' => 'Duração não disponível',
            'flexible' => 'Flexível',
            'minute' => 'minuto',
            'minutes' => 'minutos',
            'hour' => 'hora',
            'hours' => 'horas',
            'day' => 'dia',
            'days' => 'dias',
            'and' => 'e',
            'from' => 'De',
            'to' => 'a',
            
            // Página de produto
            'home' => 'Home',
            'product_code' => 'Código do passeio/serviço',
            'description' => 'Descrição',
            'included' => 'O que está incluído',
            'not_included' => 'O que não está incluído',
            'additional_info' => 'Informações Adicionais',
            'cancellation_policy' => 'Política de Cancelamento',
            'available_languages' => 'Idiomas Disponíveis',
            'check_availability' => 'Verificar Disponibilidade',
            'price_per_person' => '*Preço por pessoa',
            'location' => 'Localização',
            'timezone' => 'Fuso Horário',
            'logistics_info' => 'Informações Logísticas',
            'special_instructions' => 'Instruções Especiais',
            'you_might_like' => 'Você pode gostar',
            'tags' => 'Tags',
            'consult_availability' => 'Consulte disponibilidade',
            
            // Avaliações
            'reviews_title' => 'Avaliações',
            'all_reviews' => 'Todas',
            'stars' => 'estrelas',
            'star' => 'estrela',
            'most_recent' => 'Mais recentes',
            'highest_rating' => 'Melhor avaliação',
            'most_helpful' => 'Mais úteis',
            'all_languages' => '(todos idiomas)',
            'loading_reviews' => 'Carregando avaliações...',
            
            // Elementos adicionais da interface
            'additional_info' => 'Informações Adicionais',
            'tooltip_support' => 'Cite este código ao falar com o suporte ao cliente.',
            'searching' => 'Pesquisando...',
            'please_wait' => 'Por favor, aguarde!',
            'lets_go_searching' => 'Vamos lá! Pesquisando',
            'reset_button' => 'Redefinir',
            'apply_button' => 'Aplicar',
            'duration_approx_short' => '(aprox.)',
            'date_connector' => 'de',
            
            // Meses abreviados
            'jan_short' => 'Jan', 'feb_short' => 'Fev', 'mar_short' => 'Mar',
            'apr_short' => 'Abr', 'may_short' => 'Mai', 'jun_short' => 'Jun',
            'jul_short' => 'Jul', 'aug_short' => 'Ago', 'sep_short' => 'Set',
            'oct_short' => 'Out', 'nov_short' => 'Nov', 'dec_short' => 'Dez',
            
            // Erros
            'error_api_key' => 'Por favor, configure sua chave API da Viator nas configurações do WordPress.',
            'error_try_again' => 'OPS! Aguarde um instante e tente novamente.',
            'error_product_not_found' => 'Produto não encontrado ou indisponível.',
            'error_fetch_details' => 'Erro ao buscar detalhes do produto. Por favor, tente novamente mais tarde.',
            'product_code_not_provided' => 'Código do passeio/serviço não fornecido.',
            
            // Tipos de informações adicionais
            'stroller_accessible' => 'Accesible para cochecitos de bebé',
            'pets_welcome' => 'Se permiten animales de servicio',
            'public_transportation_nearby' => 'Transporte público cercano',
            'physical_easy' => 'Adecuado para todos los niveles de condición física',
            'physical_medium' => 'Nivel medio de actividad física',
            'physical_moderate' => 'Nivel moderado de actividad física',
            'physical_strenuous' => 'Nivel intenso de actividad física',
            'wheelchair_accessible' => 'Accesible para sillas de ruedas',
            'surfaces_wheelchair_accessible' => 'Superficies accesibles para sillas de ruedas',
            'transportation_wheelchair_accessible' => 'Transporte accesible para sillas de ruedas',
            'infant_friendly' => 'Adecuado para bebés',
            'infant_seats_available' => 'Asientos para bebés disponibles',
            'kid_friendly' => 'Adecuado para niños',
            'senior_friendly' => 'Adecuado para personas mayores',
            'infants_must_sit_on_laps' => 'Los niños pequeños en el regazo',
            'no_pregnant' => 'No recomendado para embarazadas',
            'no_heart_problems' => 'No recomendado para personas con problemas cardíacos',
            'no_back_problems' => 'No recomendado para problemas de espalda',
            'health_other' => 'Salud y otros',
            'pickup_available' => 'Servicio de transporte disponible',
            'shopping_opportunity' => 'Oportunidad de compras',
            'vegetarian_option' => 'Opción vegetariana disponible',
            'skip_the_line_info' => 'Acceso sin cola',
            'private_tour_info' => 'Tour privado',
            'group_tour' => 'Tour en grupo',
            'other_info' => 'Otros',
            
            // Tipos de serviços de idioma
            'guide_service' => 'Guía presencial',
            'written_service' => 'Guía escrita',
            'audio_service' => 'Audio guía',
            
            // Avaliações - traduções para o JavaScript
            'reviews_load_error' => 'No se pudieron cargar las reseñas.',
            'reviews_load_error_generic' => 'Error al cargar las reseñas.',
            'try_again_later' => 'Inténtelo de nuevo más tarde.',
            'no_reviews_found_rating' => 'No se encontraron reseñas para esta calificación.',
            'no_more_reviews_page' => 'No hay más reseñas para mostrar en esta página.',
            'anonymous_traveler' => 'Viajero anónimo',
            'product_code_copied' => '¡Código copiado al portapapeles!',
            'copy_product_code' => 'Copiar código del producto',
            'code_copied_short' => '¡Código copiado!',
        ],
        'en-US' => [
            // Search form
            'search_placeholder' => '🌍 Where do you want to go?',
            'search_button' => 'Search',
            'search_nearby' => 'Nearby',
            
            // Filters
            'when_travel' => 'When do you plan to travel?',
            'choose_date' => 'Choose date',
            'duration' => 'Duration',
            'up_to_one_hour' => 'Up to 1 hour',
            'one_to_four_hours' => '1 to 4 hours',
            'four_hours_to_one_day' => '4 hours to 1 day',
            'one_to_three_days' => '1 to 3 days',
            'more_than_three_days' => 'More than 3 days',
            'price_range' => 'Price Range',
            'rating' => 'Rating',
            'specials' => 'Specials',
            'free_cancellation' => 'Free Cancellation',
            'likely_to_sell_out' => 'Likely to Sell Out',
            'skip_the_line' => 'Skip the Line',
            'private_tour' => 'Private Tour',
            'new_on_viator' => 'New on Viator',
            'clear_all' => 'Clear all',
            'filters' => 'Filters',
            
            // Sorting
            'featured' => 'Featured',
            'best_rated' => 'Best Rated',
            'price_low_to_high' => 'Price (Low to High)',
            'price_high_to_low' => 'Price (High to Low)',
            'duration_ascending' => 'Duration (Ascending)',
            'duration_descending' => 'Duration (Descending)',
            'newest_on_viator' => 'New on Viator',
            
            // Results
            'results' => 'results',
            'no_tours_found' => 'No tours found for',
            'no_tours_found_filters' => 'No tours found with selected filters for',
            'try_popular_destinations' => 'How about trying one of these popular destinations?',
            'did_you_know' => 'Did you know?',
            'free_cancellation_note' => 'Free cancellation up to 24 hours before the experience starts (local time)',
            
            // Product cards
            'duration_approx' => '(approx.)',
            'from_price' => 'from',
            'see_details' => 'See details',
            'price_not_available' => 'Price not available',
            'no_reviews' => 'No reviews',
            'review' => 'review',
            'reviews' => 'reviews',
            'special_offer' => 'Special offer',
            
            // Badges
            'free_cancellation_badge' => 'Free cancellation',
            'likely_to_sell_out_badge' => 'Likely to sell out',
            'special_offer_badge' => 'Special offer',
            
            // Duration
            'duration_not_available' => 'Duration not available',
            'flexible' => 'Flexible',
            'minute' => 'minute',
            'minutes' => 'minutes',
            'hour' => 'hour',
            'hours' => 'hours',
            'day' => 'day',
            'days' => 'days',
            'and' => 'and',
            'from' => 'From',
            'to' => 'to',
            'duration_approx' => 'Approximate duration',
            
            // Avaliações - traduções para o JavaScript
            'reviews_load_error' => 'Failed to load reviews.',
            'reviews_load_error_generic' => 'Error loading reviews.',
            'try_again_later' => 'Please try again later.',
            'no_reviews_found_rating' => 'No reviews found for this rating.',
            'no_more_reviews_page' => 'No more reviews to display on this page.',
            'anonymous_traveler' => 'Anonymous Traveler',
            
            // Product page
            'home' => 'Home',
            'product_code' => 'Tour/Service Code',
            'description' => 'Description',
            'included' => 'What\'s Included',
            'not_included' => 'What\'s Not Included',
            'additional_info' => 'Additional Information',
            'cancellation_policy' => 'Cancellation Policy',
            'available_languages' => 'Available Languages',
            'check_availability' => 'Check Availability',
            'price_per_person' => '*Price per person',
            'location' => 'Location',
            'timezone' => 'Timezone',
            'logistics_info' => 'Logistics Information',
            'special_instructions' => 'Special Instructions',
            'you_might_like' => 'You might like',
            'tags' => 'Tags',
            'consult_availability' => 'Check availability',
            
            // Reviews
            'reviews_title' => 'Reviews',
            'all_reviews' => 'All',
            'stars' => 'stars',
            'star' => 'star',
            'most_recent' => 'Most Recent',
            'highest_rating' => 'Highest Rating',
            'most_helpful' => 'Most Helpful',
            'all_languages' => '(all languages)',
            'loading_reviews' => 'Loading reviews...',
            
            // Additional interface elements
            'additional_info' => 'Additional Information',
            'tooltip_support' => 'Quote this code when contacting customer support.',
            'searching' => 'Searching...',
            'please_wait' => 'Please wait...',
            'lets_go_searching' => 'Let\'s go searching!',
            'reset_button' => 'Reset',
            'apply_button' => 'Apply',
            'duration_approx_short' => '(approx.)',
            'date_connector' => '', // Em inglês não usa conector
            
            // Meses abreviados
            'jan_short' => 'Jan', 'feb_short' => 'Feb', 'mar_short' => 'Mar',
            'apr_short' => 'Apr', 'may_short' => 'May', 'jun_short' => 'Jun',
            'jul_short' => 'Jul', 'aug_short' => 'Aug', 'sep_short' => 'Sep',
            'oct_short' => 'Oct', 'nov_short' => 'Nov', 'dec_short' => 'Dec',
            
            // Errors
            'error_api_key' => 'Please configure your Viator API key in WordPress settings.',
            'error_try_again' => 'OOPS! Please wait a moment and try again.',
            'error_product_not_found' => 'Product not found or unavailable.',
            'error_fetch_details' => 'Error fetching product details. Please try again later.',
            'product_code_not_provided' => 'Tour/Service code not provided.',
            
            // Tipos de informações adicionais
            'stroller_accessible' => 'Stroller Accessible',
            'pets_welcome' => 'Pets Welcome',
            'public_transportation_nearby' => 'Public Transportation Nearby',
            'physical_easy' => 'Physically Easy',
            'physical_medium' => 'Medium Physical Activity',
            'physical_moderate' => 'Moderate Physical Activity',
            'physical_strenuous' => 'Intense Physical Activity',
            'wheelchair_accessible' => 'Wheelchair Accessible',
            'surfaces_wheelchair_accessible' => 'Surfaces Wheelchair Accessible',
            'transportation_wheelchair_accessible' => 'Transportation Wheelchair Accessible',
            'infant_friendly' => 'Infant Friendly',
            'infant_seats_available' => 'Infant Seats Available',
            'kid_friendly' => 'Kid Friendly',
            'senior_friendly' => 'Senior Friendly',
            'infants_must_sit_on_laps' => 'Infants Must Sit on Laps',
            'no_pregnant' => 'Not Recommended for Pregnant Women',
            'no_heart_problems' => 'Not Recommended for Heart Patients',
            'no_back_problems' => 'Not Recommended for Back Problems',
            'health_other' => 'Health and Other',
            'pickup_available' => 'Pickup Available',
            'shopping_opportunity' => 'Shopping Opportunity',
            'vegetarian_option' => 'Vegetarian Option',
            'skip_the_line_info' => 'Skip the Line',
            'private_tour_info' => 'Private Tour',
            'group_tour' => 'Group Tour',
            'other_info' => 'Other',
            
            // Tipos de serviços de idioma
            'guide_service' => 'Guided Service',
            'written_service' => 'Written Guide',
            'audio_service' => 'Audio Guide',
            
            // Avaliações - traduções para o JavaScript
            'reviews_load_error' => 'Failed to load reviews.',
            'reviews_load_error_generic' => 'Error loading reviews.',
            'try_again_later' => 'Please try again later.',
            'no_reviews_found_rating' => 'No reviews found for this rating.',
            'no_more_reviews_page' => 'No more reviews to display on this page.',
            'anonymous_traveler' => 'Anonymous Traveler',
            'product_code_copied' => 'Code copied to clipboard!',
            'copy_product_code' => 'Copy product code',
            'code_copied_short' => 'Code copied!',
        ],
        'es-ES' => [
            // Formulario de búsqueda
            'search_placeholder' => '🌍 ¿Dónde quieres ir?',
            'search_button' => 'Buscar',
            'search_nearby' => 'Cerca',
            
            // Filtros
            'when_travel' => '¿Cuándo planeas viajar?',
            'choose_date' => 'Elegir fecha',
            'duration' => 'Duración',
            'up_to_one_hour' => 'Hasta 1 hora',
            'one_to_four_hours' => '1 a 4 horas',
            'four_hours_to_one_day' => '4 horas a 1 día',
            'one_to_three_days' => '1 a 3 días',
            'more_than_three_days' => 'Más de 3 días',
            'price_range' => 'Rango de Precio',
            'rating' => 'Calificación',
            'specials' => 'Especiales',
            'free_cancellation' => 'Cancelación Gratuita',
            'likely_to_sell_out' => 'Probablemente se Agote',
            'skip_the_line' => 'Evitar la Cola',
            'private_tour' => 'Tour Privado',
            'new_on_viator' => 'Nuevo en Viator',
            'clear_all' => 'Limpiar todo',
            'filters' => 'Filtros',
            
            // Ordenación
            'featured' => 'Destacados',
            'best_rated' => 'Mejor Calificados',
            'price_low_to_high' => 'Precio (Menor a Mayor)',
            'price_high_to_low' => 'Precio (Mayor a Menor)',
            'duration_ascending' => 'Duración (Ascendente)',
            'duration_descending' => 'Duración (Descendente)',
            'newest_on_viator' => 'Nuevo en Viator',
            
            // Resultados
            'results' => 'resultados',
            'no_tours_found' => 'No se encontraron tours para',
            'no_tours_found_filters' => 'No se encontraron tours con los filtros seleccionados para',
            'try_popular_destinations' => '¿Qué tal probar uno de estos destinos populares?',
            'did_you_know' => '¿Sabías que?',
            'free_cancellation_note' => 'Cancelación gratuita hasta 24 horas antes del inicio de la experiencia (hora local)',
            
            // Tarjetas de producto
            'duration_approx' => '(aprox.)',
            'from_price' => 'desde',
            'see_details' => 'Ver detalles',
            'price_not_available' => 'Precio no disponible',
            'no_reviews' => 'Sin reseñas',
            'review' => 'reseña',
            'reviews' => 'reseñas',
            'special_offer' => 'Oferta especial',
            
            // Distintivos
            'free_cancellation_badge' => 'Cancelación gratuita',
            'likely_to_sell_out_badge' => 'Probablemente se agote',
            'special_offer_badge' => 'Oferta especial',
            
            // Duración
            'duration_not_available' => 'Duración no disponible',
            'flexible' => 'Flexible',
            'minute' => 'minuto',
            'minutes' => 'minutos',
            'hour' => 'hora',
            'hours' => 'horas',
            'day' => 'día',
            'days' => 'días',
            'and' => 'y',
            'from' => 'De',
            'to' => 'a',
            'duration_approx' => 'Duración aproximada',
            
            // Avaliações - traduções para o JavaScript
            'reviews_load_error' => 'Não foi possível carregar as avaliações.',
            'reviews_load_error_generic' => 'Erro ao carregar avaliações.',
            'try_again_later' => 'Tente novamente mais tarde.',
            'no_reviews_found_rating' => 'Nenhuma avaliação encontrada para esta classificação.',
            'no_more_reviews_page' => 'Não há mais avaliações para exibir nesta página.',
            'anonymous_traveler' => 'Viajante anônimo',
            
            // Product page
            'home' => 'Inicio',
            'product_code' => 'Código del Tour/Servicio',
            'description' => 'Descripción',
            'included' => 'Qué está Incluido',
            'not_included' => 'Qué no está Incluido',
            'additional_info' => 'Información Adicional',
            'cancellation_policy' => 'Política de Cancelación',
            'available_languages' => 'Idiomas Disponibles',
            'check_availability' => 'Verificar Disponibilidad',
            'price_per_person' => '*Precio por persona',
            'location' => 'Ubicación',
            'timezone' => 'Zona Horaria',
            'logistics_info' => 'Información Logística',
            'special_instructions' => 'Instrucciones Especiales',
            'you_might_like' => 'Te puede gustar',
            'tags' => 'Etiquetas',
            'consult_availability' => 'Consultar disponibilidad',
            
            // Reseñas
            'reviews_title' => 'Reseñas',
            'all_reviews' => 'Todas',
            'stars' => 'estrellas',
            'star' => 'estrella',
            'most_recent' => 'Más Recientes',
            'highest_rating' => 'Mejor Calificación',
            'most_helpful' => 'Más Útiles',
            'all_languages' => '(todos los idiomas)',
            'loading_reviews' => 'Cargando reseñas...',
            
            // Elementos adicionales de la interfaz
            'additional_info' => 'Información Adicional',
            'tooltip_support' => 'Cite este código al contactar con el servicio de atención al cliente.',
            'searching' => 'Buscando...',
            'please_wait' => 'Por favor, aguarde!',
            'lets_go_searching' => '¡Vamos a buscar!',
            'reset_button' => 'Restablecer',
            'apply_button' => 'Aplicar',
            'duration_approx_short' => '(aprox.)',
            'date_connector' => 'de',
            
            // Meses abreviados
            'jan_short' => 'Ene', 'feb_short' => 'Feb', 'mar_short' => 'Mar',
            'apr_short' => 'Abr', 'may_short' => 'May', 'jun_short' => 'Jun',
            'jul_short' => 'Jul', 'aug_short' => 'Ago', 'sep_short' => 'Sep',
            'oct_short' => 'Oct', 'nov_short' => 'Nov', 'dec_short' => 'Dic',
            
            // Errores
            'error_api_key' => 'Por favor, configure su clave API de Viator en la configuración de WordPress.',
            'error_try_again' => '¡UPS! Espere un momento e intente nuevamente.',
            'error_product_not_found' => 'Producto no encontrado o no disponible.',
            'error_fetch_details' => 'Error al obtener detalles del producto. Por favor, inténtelo de nuevo más tarde.',
            'product_code_not_provided' => 'Código del tour/servicio no proporcionado.',
            
            // Tipos de informações adicionais
            'stroller_accessible' => 'Acessível para Carrinhos de Bebê',
            'pets_welcome' => 'Animais de Serviço Permitidos',
            'public_transportation_nearby' => 'Transporte Público Próximo',
            'physical_easy' => 'Adequado para Todos os Níveis de Condicionamento Físico',
            'physical_medium' => 'Nível Médio de Atividade Física',
            'physical_moderate' => 'Nível Moderado de Atividade Física',
            'physical_strenuous' => 'Nível Intenso de Atividade Física',
            'wheelchair_accessible' => 'Acessível para Cadeirantes',
            'surfaces_wheelchair_accessible' => 'Superfícies acessíveis para cadeira de rodas',
            'transportation_wheelchair_accessible' => 'Transporte acessível para cadeira de rodas',
            'infant_friendly' => 'Adequado para Bebês',
            'infant_seats_available' => 'Assentos para Bebês Disponíveis',
            'kid_friendly' => 'Adequado para Crianças',
            'senior_friendly' => 'Adequado para Idosos',
            'infants_must_sit_on_laps' => 'Crianças pequenas no colo',
            'no_pregnant' => 'Não recomendado para grávidas',
            'no_heart_problems' => 'Não recomendado para cardíacos',
            'no_back_problems' => 'Não recomendado para problemas de coluna',
            'health_other' => 'Saúde e outros',
            'pickup_available' => 'Serviço de Transporte Disponível',
            'shopping_opportunity' => 'Oportunidade de Compras',
            'vegetarian_option' => 'Opção Vegetariana Disponível',
            'skip_the_line_info' => 'Acesso Sem Fila',
            'private_tour_info' => 'Tour Privado',
            'group_tour' => 'Tour em Grupo',
            'other_info' => 'Outros',
            
            // Tipos de serviços de idioma
            'guide_service' => 'Guia Presencial',
            'written_service' => 'Guia Escrito',
            'audio_service' => 'Áudio Guia',
            
            // Avaliações - traduções para o JavaScript
            'reviews_load_error' => 'Não foi possível carregar as avaliações.',
            'reviews_load_error_generic' => 'Erro ao carregar avaliações.',
            'try_again_later' => 'Tente novamente mais tarde.',
            'no_reviews_found_rating' => 'Nenhuma avaliação encontrada para esta classificação.',
            'no_more_reviews_page' => 'Não há mais avaliações para exibir nesta página.',
            'anonymous_traveler' => 'Viajante anônimo',
            'product_code_copied' => 'Código copiado para a área de transferência!',
            'copy_product_code' => 'Copiar código do produto',
            'code_copied_short' => 'Código copiado!',
        ]
    ];
    
    // Fallback para idiomas não suportados - usar inglês
    if (!isset($translations[$language])) {
        $language = 'en-US';
    }
    
    return isset($translations[$language][$key]) ? $translations[$language][$key] : $key;
}

// Função auxiliar para obter traduções
function viator_t($key, $language = null) {
    return viator_get_translation($key, $language);
}

// Função para formatar duração com traduções
function viator_format_duration($duration_fixed, $duration_from = null, $duration_to = null, $unstructured_duration = null) {
    if ($duration_fixed === 0) {
        return viator_t('flexible');
    } elseif ($unstructured_duration !== null) {
        return !empty($unstructured_duration) ? $unstructured_duration : '1 ' . viator_t('hour');
    } elseif ($duration_fixed !== null) {
        if ($duration_fixed >= 1440) { // 24 horas = 1440 minutos
            $days = floor($duration_fixed / 1440);
            $remaining_minutes = $duration_fixed % 1440;
            $hours = floor($remaining_minutes / 60);
            
            $duration = $days . ' ' . ($days != 1 ? viator_t('days') : viator_t('day'));
            if ($hours > 0) {
                $duration .= ' ' . viator_t('and') . ' ' . $hours . ' ' . ($hours != 1 ? viator_t('hours') : viator_t('hour'));
            }
            return $duration;
        } elseif ($duration_fixed < 60) {
            return $duration_fixed . ' ' . viator_t('minutes');
        } else {
            $hours = floor($duration_fixed / 60);
            $minutes = $duration_fixed % 60;
            $duration = $hours . ' ' . ($hours != 1 ? viator_t('hours') : viator_t('hour'));
            if ($minutes > 0) {
                $duration .= ' ' . viator_t('and') . ' ' . $minutes . ' ' . ($minutes != 1 ? viator_t('minutes') : viator_t('minute'));
            }
            return $duration;
        }
    } elseif ($duration_from !== null && $duration_to !== null) {
        // Duração variável
        if ($duration_to >= 1440) {
            $days_from = floor($duration_from / 1440);
            $days_to = floor($duration_to / 1440);
            
            if ($days_from == $days_to) {
                return $days_from . ' ' . ($days_from != 1 ? viator_t('days') : viator_t('day'));
            } else {
                return viator_t('from') . ' ' . $days_from . ' ' . viator_t('to') . ' ' . $days_to . ' ' . ($days_to != 1 ? viator_t('days') : viator_t('day'));
            }
        } elseif ($duration_to < 60) {
            if ($duration_from < 60 && $duration_to < 60) {
                return viator_t('from') . ' ' . $duration_from . ' ' . viator_t('to') . ' ' . $duration_to . ' ' . ($duration_to != 1 ? viator_t('minutes') : viator_t('minute'));
            } else {
                return viator_t('from') . ' ' . $duration_from . ' ' . ($duration_from != 1 ? viator_t('minutes') : viator_t('minute')) . 
                       ' ' . viator_t('to') . ' ' . $duration_to . ' ' . ($duration_to != 1 ? viator_t('minutes') : viator_t('minute'));
            }
        } else {
            $is_from_multiple_of_60 = ($duration_from % 60 === 0);
            $is_to_multiple_of_60 = ($duration_to % 60 === 0);

            if ($is_from_multiple_of_60 && $is_to_multiple_of_60) {
                $hours_from = floor($duration_from / 60);
                $hours_to = floor($duration_to / 60);
                return viator_t('from') . ' ' . $hours_from . ' ' . viator_t('to') . ' ' . $hours_to . ' ' . ($hours_to != 1 ? viator_t('hours') : viator_t('hour'));
            } else {
                // Formatação complexa para horas e minutos
                if ($duration_from < 60) {
                    $duration_from_formatted = $duration_from . ' ' . ($duration_from != 1 ? viator_t('minutes') : viator_t('minute'));
                } else {
                    $hours_from = floor($duration_from / 60);
                    $minutes_from = $duration_from % 60;
                    $duration_from_formatted = $hours_from . ' ' . ($hours_from != 1 ? viator_t('hours') : viator_t('hour'));
                    if ($minutes_from > 0) {
                        $duration_from_formatted .= ' ' . viator_t('and') . ' ' . $minutes_from . ' ' . ($minutes_from != 1 ? viator_t('minutes') : viator_t('minute'));
                    }
                }

                if ($duration_to < 60) {
                    $duration_to_formatted = $duration_to . ' ' . ($duration_to != 1 ? viator_t('minutes') : viator_t('minute'));
                } else {
                    $hours_to = floor($duration_to / 60);
                    $minutes_to = $duration_to % 60;
                    $duration_to_formatted = $hours_to . ' ' . ($hours_to != 1 ? viator_t('hours') : viator_t('hour'));
                    if ($minutes_to > 0) {
                        $duration_to_formatted .= ' ' . viator_t('and') . ' ' . $minutes_to . ' ' . ($minutes_to != 1 ? viator_t('minutes') : viator_t('minute'));
                    }
                }

                return viator_t('from') . ' ' . $duration_from_formatted . ' ' . viator_t('to') . ' ' . $duration_to_formatted;
            }
        }
    } else {
        return viator_t('duration_not_available');
    }
}

// Função para gerar curiosidades usando a API do Groq
function viator_get_groq_curiosity($searchTerm) {
    $groq_api_key = get_option('viator_groq_api_key');
    
    // Se não houver chave da API do Groq, usar curiosidades padrão
    if (empty($groq_api_key)) {
        return viator_get_fallback_curiosity();
    }
    
    // Configurar o idioma para o prompt baseado na configuração
    $locale_settings = viator_get_locale_settings();
    $language = $locale_settings['language'];
    
    $language_prompts = [
        'pt-BR' => "Gere uma curiosidade interessante e envolvente sobre {$searchTerm} em português brasileiro. A curiosidade deve ser educativa, factual e despertar o interesse turístico. Mantenha entre 40-60 palavras. Não use aspas ou formatação especial.",
        'en-US' => "Generate an interesting and engaging curiosity about {$searchTerm} in English. The curiosity should be educational, factual and spark tourist interest. Keep it between 40-60 words. Don't use quotes or special formatting.",
        'es-ES' => "Genera una curiosidad interesante y atractiva sobre {$searchTerm} en español. La curiosidad debe ser educativa, factual y despertar el interés turístico. Mantén entre 40-60 palabras. No uses comillas o formato especial."
    ];
    
    $prompt = isset($language_prompts[$language]) ? $language_prompts[$language] : $language_prompts['pt-BR'];
    
    // Preparar dados para a API do Groq
    $data = [
        'messages' => [
            [
                'role' => 'user',
                'content' => $prompt
            ]
        ],
        'model' => 'llama3-8b-8192',
        'temperature' => 0.7,
        'max_tokens' => 150,
        'top_p' => 1,
        'stream' => false
    ];
    
    // Fazer requisição para a API do Groq
    $response = wp_remote_post('https://api.groq.com/openai/v1/chat/completions', [
        'headers' => [
            'Authorization' => 'Bearer ' . $groq_api_key,
            'Content-Type' => 'application/json'
        ],
        'body' => json_encode($data),
        'timeout' => 30
    ]);
    
    // Verificar se a requisição foi bem-sucedida
    if (is_wp_error($response)) {
        error_log('Erro na requisição Groq: ' . $response->get_error_message());
        return viator_get_fallback_curiosity();
    }
    
    $response_code = wp_remote_retrieve_response_code($response);
    if ($response_code !== 200) {
        error_log('Erro na API Groq - Código: ' . $response_code);
        return viator_get_fallback_curiosity();
    }
    
    $body = wp_remote_retrieve_body($response);
    $groq_data = json_decode($body, true);
    
    // Extrair a curiosidade da resposta
    if (isset($groq_data['choices'][0]['message']['content'])) {
        $curiosity = trim($groq_data['choices'][0]['message']['content']);
        
        // Limpar a resposta removendo aspas e formatação desnecessária
        $curiosity = str_replace(['"', "'", '**', '*'], '', $curiosity);
        $curiosity = preg_replace('/^(Curiosidade:|Did you know\?|¿Sabías que\?)/i', '', $curiosity);
        $curiosity = trim($curiosity);
        
        // Limitar o tamanho se necessário
        if (str_word_count($curiosity) > 70) {
            $curiosity = wp_trim_words($curiosity, 60, '...');
        }
        
        return $curiosity;
    }
    
    // Se não conseguir extrair a curiosidade, usar fallback
    error_log('Não foi possível extrair curiosidade da resposta Groq');
    return viator_get_fallback_curiosity();
}

// Função para curiosidades padrão (fallback)
function viator_get_fallback_curiosity() {
    $locale_settings = viator_get_locale_settings();
    $language = $locale_settings['language'];
    
    if ($language === 'pt-BR') {
        $facts = [
            "Você sabia que esta é uma das regiões mais visitadas pelos turistas?",
            "Este destino oferece experiências únicas durante todo o ano!",
            "A cultura local é rica em tradições e histórias fascinantes.",
            "Os visitantes costumam se surpreender com a hospitalidade local.",
            "Este lugar possui uma gastronomia única que encanta turistas do mundo todo.",
            "A arquitetura local reflete séculos de história e influências culturais diversas.",
            "Muitos festivais tradicionais acontecem aqui, celebrando a rica herança cultural.",
            "A natureza exuberante desta região oferece paisagens de tirar o fôlego.",
            "Artesãos locais preservam técnicas ancestrais passadas de geração em geração.",
            "Este destino é conhecido por suas tradições musicais e danças folclóricas únicas.",
            "A vida noturna local oferece uma mistura perfeita entre tradição e modernidade.",
            "Mercados locais são verdadeiros tesouros onde se encontram produtos autênticos da região."
        ];
    } elseif ($language === 'en-US') {
        $facts = [
            "Did you know this is one of the most visited regions by tourists?",
            "This destination offers unique experiences throughout the year!",
            "The local culture is rich in fascinating traditions and stories.",
            "Visitors are often surprised by the local hospitality.",
            "This place has a unique cuisine that delights tourists from around the world.",
            "The local architecture reflects centuries of history and diverse cultural influences.",
            "Many traditional festivals take place here, celebrating the rich cultural heritage.",
            "The lush nature of this region offers breathtaking landscapes.",
            "Local artisans preserve ancestral techniques passed down through generations.",
            "This destination is known for its unique musical traditions and folk dances.",
            "The local nightlife offers a perfect blend of tradition and modernity.",
            "Local markets are true treasures where you can find authentic regional products."
        ];
    } else { // es-ES
        $facts = [
            "¿Sabías que esta es una de las regiones más visitadas por los turistas?",
            "¡Este destino ofrece experiencias únicas durante todo el año!",
            "La cultura local es rica en tradiciones e historias fascinantes.",
            "Los visitantes suelen sorprenderse con la hospitalidad local.",
            "Este lugar tiene una gastronomía única que deleita a turistas de todo el mundo.",
            "La arquitectura local refleja siglos de historia e influencias culturales diversas.",
            "Muchos festivales tradicionales tienen lugar aquí, celebrando la rica herencia cultural.",
            "La naturaleza exuberante de esta región ofrece paisajes que quitan el aliento.",
            "Los artesanos locales preservan técnicas ancestrales transmitidas de generación en generación.",
            "Este destino es conocido por sus tradiciones musicales y danzas folclóricas únicas.",
            "La vida nocturna local ofrece una mezcla perfecta entre tradición y modernidad.",
            "Los mercados locales son verdaderos tesoros donde se encuentran productos auténticos de la región."
        ];
    }
    
    return $facts[array_rand($facts)];
}