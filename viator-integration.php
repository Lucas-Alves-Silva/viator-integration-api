<?php
/**
 * Plugin Name: Viator API Integration
 * Description: Permite pesquisar passeios na API Viator. Utilize o shortcode [viator_search]
 * Version: 1.0
 * Author: Lucas Alves
 */

if (!defined('ABSPATH')) {
    exit; // Segurança
}

// Include debug functions
require_once plugin_dir_path(__FILE__) . 'debug.php';

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

    // Enqueue scripts
    wp_enqueue_script('ipgeolocation-api', 'https://api.ipgeolocation.io/javascript/ipgeolocation.js', array(), '1.0.0', true);
    wp_enqueue_script('viator-interactions', $plugin_dir . 'interactions.js', array('jquery', 'ipgeolocation-api'), '1.0.0', true);

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
        $date_from = $date_start;
        $date_to = date('Y-m-d', strtotime($date_end . ' +1 day')); // Adiciona um dia para incluir o último dia
    } else {
        $date_from = date('Y-m-d');
        $date_to = date('Y-m-d', strtotime('+1 year'));
    }

    // Verificar se há um intervalo de duração selecionado
    $duration_filters = isset($_GET['duration_filter']) ? [$_GET['duration_filter']] : [];
    $duration_conditions = [];
    
    if (!empty($duration_filters)) {
        foreach ($duration_filters as $filter) {
            list($min, $max) = explode('-', $filter);
            
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
                "from" => 0,
                "to" => 5000
            ],
            "rating" => [
                "from" => 0,
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

    $body = json_encode($body_data);
    viator_debug_log('Request Body:', $body);

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

    $output .= '</div>
    </div>'; // Fechar div.viator-filters

    // Header com total e ordenação
    $output .= '<div class="viator-results-container">';
    $output .= '<div class="viator-header">';
    $output .= '<div class="viator-header-info">';
    $output .= '<span class="viator-header-cancel"><img src="https://img.icons8.com/?size=100&id=82742&format=png&color=000000" alt="Ícone" width="15" height="15"> Cancelamento grátis até 24 horas antes do início da experiência (horário local)</span>';
    $output .= '<p class="viator-total">' . $formatted_total . ' resultados</p>';
    $output .= '</div>';
    
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
                <a href="' . $url . '" target="_blank">Ver detalhes</a>
            </div>
        </div>';
    }

    // Fechar grid
    $output .= '</div>';

// Paginação
if ($total_pages > 1) {
    $output .= '<div class="viator-pagination">';
    
    // Link para a página anterior
    if ($page > 1) {
        $prev_url = add_query_arg([
            'viator_page' => $page - 1,
            'viator_query' => $searchTerm,
            'viator_sort' => $current_sort,
            'viator_date_start' => isset($_GET['viator_date_start']) ? $_GET['viator_date_start'] : '',
            'viator_date_end' => isset($_GET['viator_date_end']) ? $_GET['viator_date_end'] : ''
        ]);
        $prev_arrow = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/></svg>';
        $output .= '<a class="viator-pagination-arrow" href="' . esc_url($prev_url) . '">' . $prev_arrow . '</a>';
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
            $url = add_query_arg([
                'viator_page' => $page_num,
                'viator_query' => $searchTerm,
                'viator_sort' => $current_sort,
                'viator_date_start' => isset($_GET['viator_date_start']) ? $_GET['viator_date_start'] : '',
                'viator_date_end' => isset($_GET['viator_date_end']) ? $_GET['viator_date_end'] : ''
            ]);
            $active_class = ($page_num == $page) ? ' active' : '';
            $output .= '<a class="viator-pagination-btn' . $active_class . '" href="' . esc_url($url) . '">' . $page_num . '</a>';
        }
    }

    // Link para a próxima página
    if ($page < $total_pages) {
        $next_url = add_query_arg([
            'viator_page' => $page + 1,
            'viator_query' => $searchTerm,
            'viator_sort' => $current_sort,
            'viator_date_start' => isset($_GET['viator_date_start']) ? $_GET['viator_date_start'] : '',
            'viator_date_end' => isset($_GET['viator_date_end']) ? $_GET['viator_date_end'] : ''
        ]);
        $next_arrow = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/></svg>';
        $output .= '<a class="viator-pagination-arrow" href="' . esc_url($next_url) . '">' . $next_arrow . '</a>';
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
    
    $search_term = isset($_POST['viator_query']) ? sanitize_text_field($_POST['viator_query']) : '';
    $_GET['viator_query'] = $search_term;
    $_GET['viator_sort'] = isset($_POST['viator_sort']) ? sanitize_text_field($_POST['viator_sort']) : 'DEFAULT';
    $_GET['viator_page'] = isset($_POST['viator_page']) ? intval($_POST['viator_page']) : 1;
    $_GET['viator_date_start'] = isset($_POST['viator_date_start']) ? sanitize_text_field($_POST['viator_date_start']) : '';
    $_GET['viator_date_end'] = isset($_POST['viator_date_end']) ? sanitize_text_field($_POST['viator_date_end']) : '';
    
    // Adicionando o filtro de duração
    if (isset($_POST['duration_filter']) && !empty($_POST['duration_filter'])) {
        $_GET['duration_filter'] = sanitize_text_field($_POST['duration_filter']);
    } else {
        unset($_GET['duration_filter']);
    }

    // Debug: Verifique os parâmetros recebidos
    // error_log('Parâmetros recebidos: ' . print_r($_GET, true));

    // Obter os resultados
    $results = viator_get_search_results($search_term);
    
    // Debug: Verifique os resultados
    // error_log('Resultados: ' . print_r($results, true));

    // Verificar se os resultados são válidos
    if (empty($results)) {
        wp_send_json_error(['message' => 'Nenhum resultado encontrado']);
        wp_die();
    }
    // Retornar os resultados como HTML
    echo $results;
    wp_die();
}