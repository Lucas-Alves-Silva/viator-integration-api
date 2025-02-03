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
        <button type="submit">Pesquisar Passeios</button>
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
                "to" => "2025-02-03"
            ],
            "price" => [
                "from" => 0,
                "to" => 5000
            ],
            "rating" => [
                "from" => 0,
                "to" => 5
            ],
            "flags" => ["NEW_ON_VIATOR", "PRIVATE_TOUR"], // Exemplo de flags
        ],
        "searchTypes" => [
            ["searchType" => "PRODUCTS", "pagination" => ["start" => 1, "count" => 10]],
            ["searchType" => "ATTRACTIONS", "pagination" => ["start" => 1, "count" => 10]],
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
        $rating_count = isset($tour['reviews']['reviewCount']) ? '(' . $tour['reviews']['reviewCount'] . ' avaliações)' : ''; // Total de avaliações
        $duration = isset($tour['durationInMinutes']) ? $tour['durationInMinutes'] . ' minutos' : 'Duração não disponível'; // Duração do passeio
        $flags = isset($tour['flags']) ? implode(', ', $tour['flags']) : ''; // Flags (como "PRIVATE_TOUR")
        $url = esc_url($tour['productUrl']);

        // Criar o card
        $output .= '<div class="viator-card">
            <div class="viator-card-img">
                <img src="' . $image_url . '" alt="' . $title . '">
            </div>
            <div class="viator-card-content">
                <p class="viator-card-rating">' . $rating . ' ' . $rating_count . '</p>
                <h3>' . $title . '</h3>
                <p>' . substr($description, 0, 120) . '...</p>
                <p class="viator-card-price">a partir de <strong>' . $price . '</strong></p>
                <p class="viator-card-duration">Duração: ' . $duration . '</p>
                <p class="viator-card-flags">Características: ' . $flags . '</p>
                <a href="' . $url . '" target="_blank">Ver detalhes</a>
            </div>
        </div>';
    }

    // Fechar grid
    $output .= '</div>';

    // Adicionar Paginação (caso necessário)
    if (isset($data['products']['pagination'])) {
        $pagination = $data['products']['pagination'];
        if ($pagination['totalResults'] > $pagination['count']) {
            $output .= '<div class="pagination">';
            $output .= '<button class="prev">Anterior</button>';
            $output .= '<button class="next">Próxima</button>';
            $output .= '</div>';
        }
    }

    return $output;
}

// Criar o shortcode para exibir o formulário e os resultados
add_shortcode('viator_search', 'viator_search_form');

// Enfileirar o arquivo CSS
function viator_enqueue_styles() {
    wp_enqueue_style('viator-search-style', plugins_url('viator-search.css', __FILE__));
}
add_action('wp_enqueue_scripts', 'viator_enqueue_styles');