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

// Função que gera o formulário de pesquisa
function viator_search_form() {
    ob_start();
    
    // Verifica se há uma busca em andamento
    $hasResults = isset($_GET['viator_query']) && !empty($_GET['viator_query']);
    $searchTerm = isset($_GET['viator_query']) ? sanitize_text_field($_GET['viator_query']) : '';
    
    ?>
    <form method="GET" action="" id="viator-search-form">
        <input type="text" name="viator_query" placeholder="🌍 Aonde você quer ir?" value="<?php echo esc_attr($searchTerm); ?>" required>
        <button type="submit" id="search-button">
            <span id="search-text">Pesquisar</span>
            <span id="search-icon">🔍</span>
            <span id="loading-icon" class="viator-loading" style="display: none;">⏳</span>
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
    $api_key = '602cf35e-ee1c-4b6e-8977-2b49246c9c5c';
    $url = "https://api.sandbox.viator.com/partner/search/freetext";

    // Paginação
    $per_page = 12; // Número de itens por página
    $page = isset($_GET['viator_page']) ? intval($_GET['viator_page']) : 1; // Página atual
    $start = ($page - 1) * $per_page + 1; // Índice inicial dos resultados

    // Corpo da requisição JSON
    $body = json_encode([
        "searchTerm" => $searchTerm,
        "productFiltering" => [
            "dateRange" => [
                "from" => "2024-01-01",
                "to" => "2025-02-04"
            ],
            "price" => [
                "from" => 0,
                "to" => 5000
            ],
            "rating" => [
                "from" => 0,
                "to" => 5
            ],
            // "flags" => ["NEW_ON_VIATOR", "PRIVATE_TOUR"], Filtrar por flags
        ],
        "searchTypes" => [
            ["searchType" => "PRODUCTS", "pagination" => ["start" => $start, "count" => $per_page]],
        ],
        "currency" => "BRL"
    ]);

    // Enviar a requisição POST para a API
    $response = wp_remote_post($url, [
        'headers' => [
            'Accept'           => 'application/json;version=2.0',
            'Content-Type'     => 'application/json;version=2.0',
            'exp-api-key'      => $api_key,
            'Accept-Language'  => 'pt-BR',
        ],
        'body'    => $body,
        'timeout' => 15,
    ]);

    // Verificar se houve erro na requisição
    if (is_wp_error($response)) {
        return '<p>OPS! Aguarde um instante e tente novamente.</p>';
    }

    // Processar resposta da API
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);

    if (empty($data) || !isset($data['products']['results'])) {
        return '<p>Nenhum passeio encontrado para "' . esc_html($searchTerm) . '".</p>';
    }

    // Total de produtos e cálculo do número de páginas
    $total_products = isset($data['products']['totalCount']) ? intval($data['products']['totalCount']) : 0;
    $total_pages = ceil($total_products / $per_page);

    // Exibir o total encontrado
    $output = '<p class="viator-total">' . $total_products . ' resultados</p>';

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

        if ($unstructured_duration !== null) {
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
            if ($duration_to >= 1440) { // Se a duração máxima for maior que 24 horas
                $days_from = floor($duration_from / 1440);
                $days_to = floor($duration_to / 1440);
                
                if ($days_from == $days_to) {
                    $duration = $days_from . ' dia' . ($days_from != 1 ? 's' : '');
                } else {
                    $duration = 'De ' . $days_from . ' a ' . $days_to . ' dia' . ($days_to != 1 ? 's' : '');
                }
            } elseif ($duration_to < 60) {
                // Ambos os valores em minutos
                $duration = 'De ' . $duration_from . ' a ' . $duration_to . ' minutos';
            } else {
                // Verifica se ambos os valores são múltiplos de 60 (sem minutos extras)
                $is_from_multiple_of_60 = ($duration_from % 60 === 0);
                $is_to_multiple_of_60 = ($duration_to % 60 === 0);

                if ($is_from_multiple_of_60 && $is_to_multiple_of_60) {
                    // Exibe de forma simplificada (ex: "De 1 a 2 horas")
                    $hours_from = floor($duration_from / 60); // Calcula as horas do início
                    $hours_to = floor($duration_to / 60); // Calcula as horas do fim
                    $duration = 'De ' . $hours_from . ' a ' . $hours_to . ' hora' . ($hours_to != 1 ? 's' : '');
                } else {
                    // Formata o valor inicial (duration_from)
                    if ($duration_from < 60) {
                        $duration_from_formatted = $duration_from . ' minutos';
                    } else {
                        $hours_from = floor($duration_from / 60); // Calcula as horas do início
                        $minutes_from = $duration_from % 60; // Calcula os minutos restantes do início
                        $duration_from_formatted = $hours_from . ' hora' . ($hours_from != 1 ? 's' : '') . ($minutes_from > 0 ? ' e ' . $minutes_from . ' minuto' . ($minutes_from != 1 ? 's' : '') : '');
                    }

                    // Formata o valor final (duration_to)
                    $hours_to = floor($duration_to / 60); // Calcula as horas do fim
                    $minutes_to = $duration_to % 60; // Calcula os minutos restantes do fim
                    $duration_to_formatted = $hours_to . ' hora' . ($hours_to != 1 ? 's' : '') . ($minutes_to > 0 ? ' e ' . $minutes_to . ' minuto' . ($minutes_to != 1 ? 's' : '') : '');

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
        if (in_array('FREE_CANCELLATION', $flags)) {
            $flag_output .= '<span class="viator-flag">Cancelamento gratuito</span>';
        }
        if (in_array('LIKELY_TO_SELL_OUT', $flags)) {
            $flag_output .= '<span class="viator-badge">Geralmente se esgota</span>';
        }
    
        // Criar o card
        $output .= '<div class="viator-card">
            <div class="viator-card-img">
                <img src="' . $image_url . '" alt="' . $title . '">';
                
                // Adicionar a badge "Geralmente se esgota" dentro do container da imagem
                if (in_array('LIKELY_TO_SELL_OUT', $flags)) {
                    $output .= '<span class="viator-badge">Geralmente se esgota</span>';
                }
    
        $output .= '</div>
            <div class="viator-card-content">
                <p class="viator-card-rating">' . $rating . ' ' . $rating_count . '</p>
                <h3>' . $title . '</h3>
                <p>' . substr($description, 0, 120) . '...</p>
                <p class="viator-card-flags">';
                
                // Adicionar a flag "Cancelamento gratuito"
                if (in_array('FREE_CANCELLATION', $flags)) {
                    $output .= '<span class="viator-flag-cancelamento">Cancelamento gratuito</span>';
                }
    
        $output .= '</p>
                <p class="viator-card-duration"><img src="https://img.icons8.com/?size=100&id=82767&format=png&color=000000" alt="Duração" title="Duração aproximada" width="15" height="15"> ' . $duration . '</p>
                <p class="viator-card-price"><img src="https://img.icons8.com/?size=100&id=ZXJaNFNjWGZF&format=png&color=000000" alt="Preço" width="15" height="15"> a partir de <strong>' . $price . '</strong></p>                
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
        ]);
        $next_arrow = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/></svg>';
        $output .= '<a class="viator-pagination-arrow" href="' . esc_url($next_url) . '">' . $next_arrow . '</a>';
    }

    $output .= '</div>';
}

    return $output;
}

// Criar o shortcode para exibir o formulário e os resultados
add_shortcode('viator_search', 'viator_search_form');

// Enfileirar o arquivo CSS
function viator_enqueue_scripts() {
    // Carrega o arquivo CSS
    wp_enqueue_style('viator-search-style', plugins_url('viator-search.css', __FILE__));

    // Carrega o arquivo JavaScript
    wp_enqueue_script('viator-interactions', plugins_url('interactions.js', __FILE__), array(), null, true);
}
add_action('wp_enqueue_scripts', 'viator_enqueue_scripts');