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
    
    ?>
    <form method="GET" action="" id="viator-search-form">
        <input type="text" name="viator_query" placeholder="🌍 Aonde você quer ir?" required>
        <button type="submit" id="search-button">
            <span id="search-text">Pesquisar</span>
            <span id="search-icon">🔍</span>
            <span id="loading-icon" class="viator-loading" style="display: none;">⏳</span>
        </button>
    </form>

    <div id="viator-results" style="display: <?php echo $hasResults ? 'block' : 'none'; ?>;">
        <?php
        if ($hasResults) {
            echo viator_get_search_results($_GET['viator_query']);
        }
        ?>
    </div>
    <?php
    return ob_get_clean();
}

// Função para chamar a API e buscar resultados e exibir como cards
function viator_get_search_results($searchTerm) {
    $api_key = '602cf35e-ee1c-4b6e-8977-2b49246c9c5c';
    $url = "https://api.sandbox.viator.com/partner/search/freetext";

    // Corpo da requisição JSON com os filtros e parâmetros
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
            "flags" => ["NEW_ON_VIATOR", "PRIVATE_TOUR"],
        ],
        "searchTypes" => [
            ["searchType" => "PRODUCTS", "pagination" => ["start" => 1, "count" => 12]],
            ["searchType" => "ATTRACTIONS", "pagination" => ["start" => 1, "count" => 12]],
            ["searchType" => "DESTINATIONS", "pagination" => ["start" => 1, "count" => 12]],
        ],
        "currency" => "BRL"
    ]);

    // Enviar a requisição POST para a API da Viator
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

    // Iniciar grid de cards
    $output = '<div class="viator-grid">';

    foreach ($data['products']['results'] as $tour) {
        // Pegar a imagem de melhor qualidade
        $image_url = isset($tour['images'][0]['variants'][3]['url']) ? $tour['images'][0]['variants'][3]['url'] : 'https://via.placeholder.com/400x200'; 

        // Pegar os dados principais
        $title = esc_html($tour['title']);
        $description = esc_html($tour['description']);
        $price = isset($tour['pricing']['summary']['fromPrice']) ? 'R$ ' . number_format($tour['pricing']['summary']['fromPrice'], 2, ',', '.') : 'Preço não disponível';
        $rating = isset($tour['reviews']['combinedAverageRating']) ? number_format($tour['reviews']['combinedAverageRating'], 1) . '⭐' : 'Sem avaliações';
        $rating_count = isset($tour['reviews']['totalReviews']) ? '(' . $tour['reviews']['totalReviews'] . ' avaliações)' : ''; // Total de avaliações
        $duration = isset($tour['durationInMinutes']) ? $tour['durationInMinutes'] . ' minutos' : 'Duração não disponível'; // Duração do passeio
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
                    $output .= '<span class="viator-flag">Cancelamento gratuito</span>';
                }

        $output .= '</p>
                <p class="viator-card-duration"><img src="https://img.icons8.com/?size=100&id=82767&format=png&color=000000" alt="Ícone de características" width="15" height="15"> ' . $duration . '</p>
                <p class="viator-card-price"><img src="https://img.icons8.com/?size=100&id=ZXJaNFNjWGZF&format=png&color=000000" alt="Ícone de preço" width="15" height="15"> a partir de <strong>' . $price . '</strong></p>                
                <a href="' . $url . '" target="_blank">Ver detalhes</a>
            </div>
        </div>';
    }

    // Fechar grid
    $output .= '</div>';

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