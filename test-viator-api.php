<?php
/**
 * Arquivo de teste para diagnosticar problemas com a API da Viator
 * REMOVER EM PRODUÇÃO
 */

// Encontrar o wp-config.php subindo diretórios
$wp_config_path = __DIR__;
while (!file_exists($wp_config_path . '/wp-config.php') && $wp_config_path !== '/') {
    $wp_config_path = dirname($wp_config_path);
}

if (file_exists($wp_config_path . '/wp-config.php')) {
    require_once($wp_config_path . '/wp-config.php');
} else {
    // Fallback - tentar carregar do WordPress
    if (!defined('ABSPATH')) {
        define('ABSPATH', dirname(dirname(dirname(dirname(__FILE__)))) . '/');
    }
    require_once(ABSPATH . 'wp-config.php');
}

// Obter configurações
$api_key = get_option('viator_api_key');
$product_code = '2484FAV'; // Produto do exemplo

if (empty($api_key)) {
    die('API Key não configurada');
}

echo "<h1>Teste da API da Viator</h1>";

// Teste 1: Verificar se o produto existe
echo "<h2>1. Teste - Produto Existe</h2>";
$product_url = "https://api.sandbox.viator.com/partner/products/{$product_code}";

$product_response = wp_remote_get($product_url, [
    'headers' => [
        'Accept' => 'application/json;version=2.0',
        'exp-api-key' => $api_key,
        'Accept-Language' => 'pt-BR'
    ],
    'timeout' => 30
]);

if (!is_wp_error($product_response)) {
    $code = wp_remote_retrieve_response_code($product_response);
    $body = wp_remote_retrieve_body($product_response);
    echo "<p><strong>Status:</strong> {$code}</p>";
    
    if ($code === 200) {
        $data = json_decode($body, true);
        echo "<p>✅ Produto encontrado: " . ($data['title'] ?? 'Sem título') . "</p>";
        
        // Exibir age bands disponíveis
        if (!empty($data['pricingInfo']['ageBands'])) {
            echo "<p><strong>Age Bands disponíveis:</strong></p>";
            echo "<ul>";
            foreach ($data['pricingInfo']['ageBands'] as $band) {
                echo "<li>{$band['ageBand']} (Min: {$band['minTravelers']}, Max: {$band['maxTravelers']})</li>";
            }
            echo "</ul>";
        }
    } else {
        echo "<p>❌ Erro ao buscar produto: {$code}</p>";
        echo "<pre>" . htmlspecialchars($body) . "</pre>";
    }
} else {
    echo "<p>❌ Erro de conexão: " . $product_response->get_error_message() . "</p>";
}

// Teste 2: Verificar disponibilidade
echo "<h2>2. Teste - Verificar Disponibilidade</h2>";

$test_date = date('Y-m-d', strtotime('+7 days')); // 7 dias no futuro
$availability_url = "https://api.sandbox.viator.com/partner/availability/check";

$request_data = [
    'productCode' => $product_code,
    'travelDate' => $test_date,
    'travelers' => [['bandId' => 'ADULT']],
    'currencyCode' => 'BRL'
];

echo "<p><strong>Data teste:</strong> {$test_date}</p>";
echo "<p><strong>Request data:</strong></p>";
echo "<pre>" . json_encode($request_data, JSON_PRETTY_PRINT) . "</pre>";

$availability_response = wp_remote_post($availability_url, [
    'headers' => [
        'Accept' => 'application/json;version=2.0',
        'Content-Type' => 'application/json;version=2.0',
        'exp-api-key' => $api_key,
        'Accept-Language' => 'pt-BR'
    ],
    'body' => json_encode($request_data),
    'timeout' => 30
]);

if (!is_wp_error($availability_response)) {
    $code = wp_remote_retrieve_response_code($availability_response);
    $body = wp_remote_retrieve_body($availability_response);
    
    echo "<p><strong>Status:</strong> {$code}</p>";
    echo "<p><strong>Response:</strong></p>";
    echo "<pre>" . htmlspecialchars($body) . "</pre>";
    
    if ($code === 200) {
        $data = json_decode($body, true);
        
        if (isset($data['available'])) {
            echo "<p>✅ Campo 'available' encontrado: " . ($data['available'] ? 'true' : 'false') . "</p>";
        } else {
            echo "<p>⚠️ Campo 'available' não encontrado na resposta</p>";
            echo "<p><strong>Campos disponíveis:</strong> " . implode(', ', array_keys($data)) . "</p>";
        }
    }
} else {
    echo "<p>❌ Erro de conexão: " . $availability_response->get_error_message() . "</p>";
}

// Teste 3: Tentar diferentes formatos de bandId
echo "<h2>3. Teste - Diferentes formatos de bandId</h2>";

$test_band_ids = ['ADULT', 'adult', 'Adult'];

foreach ($test_band_ids as $band_id) {
    echo "<h3>Testando bandId: '{$band_id}'</h3>";
    
    $request_data['travelers'] = [['bandId' => $band_id]];
    
    $response = wp_remote_post($availability_url, [
        'headers' => [
            'Accept' => 'application/json;version=2.0',
            'Content-Type' => 'application/json;version=2.0',
            'exp-api-key' => $api_key,
            'Accept-Language' => 'pt-BR'
        ],
        'body' => json_encode($request_data),
        'timeout' => 15
    ]);
    
    if (!is_wp_error($response)) {
        $code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        
        echo "<p>Status: {$code}</p>";
        
        if ($code === 200) {
            $data = json_decode($body, true);
            if (isset($data['available'])) {
                echo "<p>✅ Sucesso - Available: " . ($data['available'] ? 'true' : 'false') . "</p>";
            } else {
                echo "<p>⚠️ Campo 'available' não encontrado</p>";
            }
        } else {
            echo "<p>❌ Erro HTTP: {$code}</p>";
            $data = json_decode($body, true);
            if (isset($data['errorMessage'])) {
                echo "<p>Erro: " . $data['errorMessage'] . "</p>";
            }
        }
    } else {
        echo "<p>❌ Erro de conexão: " . $response->get_error_message() . "</p>";
    }
}

echo "<p><em>Para acessar este teste, vá para: " . home_url() . "/wp-content/plugins/viator-integration/test-viator-api.php</em></p>";
?> 