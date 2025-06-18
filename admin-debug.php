<?php
/**
 * Página de Debug da API Viator no Admin do WordPress
 * Adicione este código ao functions.php ou como plugin separado
 */

// Adicionar página de menu no admin
add_action('admin_menu', 'viator_debug_menu');

function viator_debug_menu() {
    add_submenu_page(
        'viator-settings',  // Parent slug do menu principal do plugin
        'Debug API Viator',
        'Debug API',
        'manage_options',
        'viator-debug',
        'viator_debug_page'
    );
}

function viator_debug_page() {
    if (!current_user_can('manage_options')) {
        wp_die('Você não tem permissão para acessar esta página.');
    }

    // Obter a aba ativa
    $active_tab = isset($_GET['tab']) ? $_GET['tab'] : 'cache_management';

    echo '<div class="wrap">';
    echo '<h1>🔧 Debug da API Viator</h1>';

    // Verificar se temos API key (sempre visível)
    $api_key = get_option('viator_api_key');
    if (empty($api_key)) {
        echo '<div class="notice notice-error"><p>❌ <strong>API Key não configurada!</strong> Configure em Configurações → Viator Integration</p></div>';
        echo '</div>'; // Fecha .wrap
        return;
    }
    echo '<div class="notice notice-info"><p>✅ API Key configurada</p></div>';

    // Processar ações POST da aba de cache antes de renderizar qualquer coisa
    if ($active_tab === 'cache_data' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        if (isset($_POST['check_stored_data']) && !empty($_POST['product_code'])) {
            $product_code = sanitize_text_field($_POST['product_code']);
            viator_debug_stored_data($product_code);
        }
        if (isset($_POST['force_price_update']) && !empty($_POST['product_code'])) {
            $product_code = sanitize_text_field($_POST['product_code']);
            viator_force_price_update($product_code);
        }
    }

    // Navegação por abas
    echo '<h2 class="nav-tab-wrapper">';
    echo '<a href="?page=viator-debug&tab=cache_management" class="nav-tab ' . ($active_tab == 'cache_management' ? 'nav-tab-active' : '') . '">Gerenciamento de Cache</a>';
    echo '<a href="?page=viator-debug&tab=cache_data" class="nav-tab ' . ($active_tab == 'cache_data' ? 'nav-tab-active' : '') . '">Cache e Dados Locais</a>';
    echo '<a href="?page=viator-debug&tab=api_tests" class="nav-tab ' . ($active_tab == 'api_tests' ? 'nav-tab-active' : '') . '">Testes de API ao Vivo</a>';
    echo '</h2>';

    // Conteúdo da aba de Gerenciamento de Cache
    if ($active_tab == 'cache_management') {
        ?>
        <div style="margin-top: 20px;">
            <h3>🗂️ Gerenciamento de Cache</h3>
            <p>Gerencie manualmente todos os tipos de cache do plugin para solucionar problemas ou forçar atualizações.</p>
            
            <table class="form-table">
                <tr>
                    <th scope="row">🏷️ Cache de Tags</th>
                    <td>
                        <button type="button" id="refresh-tags-cache" class="button button-secondary">Atualizar Cache de Tags</button>
                        <p class="description">Atualiza o cache das tags dos produtos. O cache é renovado automaticamente a cada 7 dias.</p>
                        <div id="tags-cache-result" style="margin-top: 10px;"></div>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">📦 Cache de Produtos</th>
                    <td>
                        <button type="button" id="refresh-products-cache" class="button button-secondary">Limpar Cache de Produtos</button>
                        <p class="description">Remove o cache de títulos e durações de produtos. Útil quando dados de produtos estão desatualizados.</p>
                        <div id="products-cache-result" style="margin-top: 10px;"></div>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">🌍 Cache de Destinos</th>
                    <td>
                        <button type="button" id="refresh-destinations-cache" class="button button-secondary">Limpar Cache de Destinos</button>
                        <p class="description">Remove o cache de destinos da API (timezone, moeda, idiomas). Cache renovado semanalmente.</p>
                        <div id="destinations-cache-result" style="margin-top: 10px;"></div>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">⭐ Cache de Reviews</th>
                    <td>
                        <button type="button" id="refresh-reviews-cache" class="button button-secondary">Limpar Cache de Reviews</button>
                        <p class="description">Remove o cache de avaliações dos produtos. O cache é renovado automaticamente a cada semana.</p>
                        <div id="reviews-cache-result" style="margin-top: 10px;"></div>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">📅 Cache de Disponibilidade</th>
                    <td>
                        <button type="button" id="refresh-availability-cache" class="button button-secondary">Limpar Cache de Disponibilidade</button>
                        <p class="description">Remove o cache de disponibilidade de produtos para reservas. Útil para forçar consulta em tempo real.</p>
                        <div id="availability-cache-result" style="margin-top: 10px;"></div>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">🌐 Cache do Navegador</th>
                    <td>
                        <button type="button" id="refresh-browser-cache" class="button button-secondary">Limpar Cache do Navegador</button>
                        <p class="description">Remove dados em localStorage (localização, fuso horário). Útil para testar diferentes localizações.</p>
                        <div id="browser-cache-result" style="margin-top: 10px;"></div>
                    </td>
                </tr>
                
                <tr style="border-top: 2px solid #dc3545;">
                    <th scope="row">🔥 Limpeza Completa</th>
                    <td>
                        <button type="button" id="clear-all-cache" class="button button-primary" style="background-color: #dc3545; border-color: #dc3545;">Limpar Todos os Caches</button>
                        <p class="description"><strong>⚠️ Atenção:</strong> Remove todos os caches do plugin. Use apenas em caso de problemas graves.</p>
                        <div id="all-cache-result" style="margin-top: 10px;"></div>
                    </td>
                </tr>
            </table>
            
            <script>
            jQuery(document).ready(function($) {
                // Cache de Tags
                $('#refresh-tags-cache').on('click', function() {
                    var button = $(this);
                    var resultDiv = $('#tags-cache-result');
                    
                    button.prop('disabled', true).text('Atualizando...');
                    resultDiv.html('<span style="color: #0073aa;">Atualizando cache das tags...</span>');
                    
                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: {
                            action: 'viator_refresh_tags_cache',
                            nonce: '<?php echo wp_create_nonce('viator_admin_nonce'); ?>'
                        },
                        success: function(response) {
                            if (response.success) {
                                resultDiv.html('<span style="color: #46b450;">✓ ' + response.data.message + ' (' + response.data.tags_count + ' tags carregadas)</span>');
                            } else {
                                resultDiv.html('<span style="color: #dc3232;">✗ Erro: ' + response.data + '</span>');
                            }
                        },
                        error: function() {
                            resultDiv.html('<span style="color: #dc3232;">✗ Erro de conexão</span>');
                        },
                        complete: function() {
                            button.prop('disabled', false).text('Atualizar Cache de Tags');
                        }
                    });
                });
                
                // Cache de Produtos
                $('#refresh-products-cache').on('click', function() {
                    var button = $(this);
                    var resultDiv = $('#products-cache-result');
                    
                    button.prop('disabled', true).text('Limpando...');
                    resultDiv.html('<span style="color: #0073aa;">Limpando cache de produtos...</span>');
                    
                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: {
                            action: 'viator_clear_products_cache',
                            nonce: '<?php echo wp_create_nonce('viator_admin_nonce'); ?>'
                        },
                        success: function(response) {
                            if (response.success) {
                                resultDiv.html('<span style="color: #46b450;">✓ ' + response.data.message + '</span>');
                            } else {
                                resultDiv.html('<span style="color: #dc3232;">✗ Erro: ' + response.data + '</span>');
                            }
                        },
                        error: function() {
                            resultDiv.html('<span style="color: #dc3232;">✗ Erro de conexão</span>');
                        },
                        complete: function() {
                            button.prop('disabled', false).text('Limpar Cache de Produtos');
                        }
                    });
                });
                
                // Cache de Destinos
                $('#refresh-destinations-cache').on('click', function() {
                    var button = $(this);
                    var resultDiv = $('#destinations-cache-result');
                    
                    button.prop('disabled', true).text('Limpando...');
                    resultDiv.html('<span style="color: #0073aa;">Limpando cache de destinos...</span>');
                    
                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: {
                            action: 'viator_clear_destinations_cache',
                            nonce: '<?php echo wp_create_nonce('viator_admin_nonce'); ?>'
                        },
                        success: function(response) {
                            if (response.success) {
                                resultDiv.html('<span style="color: #46b450;">✓ ' + response.data.message + '</span>');
                            } else {
                                resultDiv.html('<span style="color: #dc3232;">✗ Erro: ' + response.data + '</span>');
                            }
                        },
                        error: function() {
                            resultDiv.html('<span style="color: #dc3232;">✗ Erro de conexão</span>');
                        },
                        complete: function() {
                            button.prop('disabled', false).text('Limpar Cache de Destinos');
                        }
                    });
                });
                
                // Cache de Reviews
                $('#refresh-reviews-cache').on('click', function() {
                    var button = $(this);
                    var resultDiv = $('#reviews-cache-result');
                    
                    button.prop('disabled', true).text('Limpando...');
                    resultDiv.html('<span style="color: #0073aa;">Limpando cache de reviews...</span>');
                    
                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: {
                            action: 'viator_clear_reviews_cache',
                            nonce: '<?php echo wp_create_nonce('viator_admin_nonce'); ?>'
                        },
                        success: function(response) {
                            if (response.success) {
                                resultDiv.html('<span style="color: #46b450;">✓ ' + response.data.message + '</span>');
                            } else {
                                resultDiv.html('<span style="color: #dc3232;">✗ Erro: ' + response.data + '</span>');
                            }
                        },
                        error: function() {
                            resultDiv.html('<span style="color: #dc3232;">✗ Erro de conexão</span>');
                        },
                        complete: function() {
                            button.prop('disabled', false).text('Limpar Cache de Reviews');
                        }
                    });
                });
                
                // Cache de Disponibilidade
                $('#refresh-availability-cache').on('click', function() {
                    var button = $(this);
                    var resultDiv = $('#availability-cache-result');
                    
                    button.prop('disabled', true).text('Limpando...');
                    resultDiv.html('<span style="color: #0073aa;">Limpando cache de disponibilidade...</span>');
                    
                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: {
                            action: 'viator_clear_availability_cache',
                            nonce: '<?php echo wp_create_nonce('viator_admin_nonce'); ?>'
                        },
                        success: function(response) {
                            if (response.success) {
                                resultDiv.html('<span style="color: #46b450;">✓ ' + response.data.message + '</span>');
                            } else {
                                resultDiv.html('<span style="color: #dc3232;">✗ Erro: ' + response.data + '</span>');
                            }
                        },
                        error: function() {
                            resultDiv.html('<span style="color: #dc3232;">✗ Erro de conexão</span>');
                        },
                        complete: function() {
                            button.prop('disabled', false).text('Limpar Cache de Disponibilidade');
                        }
                    });
                });
                
                // Cache do Navegador
                $('#refresh-browser-cache').on('click', function() {
                    var button = $(this);
                    var resultDiv = $('#browser-cache-result');
                    
                    button.prop('disabled', true).text('Limpando...');
                    resultDiv.html('<span style="color: #0073aa;">Limpando cache do navegador...</span>');
                    
                    // Limpar localStorage
                    try {
                        localStorage.removeItem('viatorLocationCache');
                        localStorage.removeItem('timezoneCache_' + new Date().getTimezoneOffset());
                        // Limpar todos os caches de timezone
                        Object.keys(localStorage).forEach(function(key) {
                            if (key.startsWith('timezoneCache_')) {
                                localStorage.removeItem(key);
                            }
                        });
                        resultDiv.html('<span style="color: #46b450;">✓ Cache do navegador limpo com sucesso</span>');
                    } catch (e) {
                        resultDiv.html('<span style="color: #dc3232;">✗ Erro ao limpar cache do navegador: ' + e.message + '</span>');
                    }
                    
                    button.prop('disabled', false).text('Limpar Cache do Navegador');
                });
                
                // Limpar Todos os Caches
                $('#clear-all-cache').on('click', function() {
                    if (!confirm('Tem certeza que deseja limpar TODOS os caches? Esta ação não pode ser desfeita.')) {
                        return;
                    }
                    
                    var button = $(this);
                    var resultDiv = $('#all-cache-result');
                    
                    button.prop('disabled', true).text('Limpando Tudo...');
                    resultDiv.html('<span style="color: #0073aa;">Limpando todos os caches...</span>');
                    
                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: {
                            action: 'viator_clear_all_cache',
                            nonce: '<?php echo wp_create_nonce('viator_admin_nonce'); ?>'
                        },
                        success: function(response) {
                            if (response.success) {
                                // Também limpar cache do navegador
                                try {
                                    localStorage.clear();
                                } catch (e) {
                                    console.log('Erro ao limpar localStorage:', e);
                                }
                                resultDiv.html('<span style="color: #46b450;">✓ ' + response.data.message + '</span>');
                            } else {
                                resultDiv.html('<span style="color: #dc3232;">✗ Erro: ' + response.data + '</span>');
                            }
                        },
                        error: function() {
                            resultDiv.html('<span style="color: #dc3232;">✗ Erro de conexão</span>');
                        },
                        complete: function() {
                            button.prop('disabled', false).text('Limpar Todos os Caches');
                        }
                    });
                });
            });
            </script>
        </div>
        <?php
        
    // Conteúdo da aba de Cache e Dados Locais  
    } elseif ($active_tab == 'cache_data') {
        $product_code_cache = isset($_POST['product_code']) ? sanitize_text_field($_POST['product_code']) : '61268P24';
        ?>
        <div style="margin-top: 20px;">
            <h3>🔍 Ferramentas de Cache e Dados Locais</h3>
            <p>Verifique ou force a atualização dos dados que seu plugin armazena localmente para um produto específico.</p>
            <form method="post" action="?page=viator-debug&tab=cache_data">
                <label for="product_code_stored"><strong>Código do Produto:</strong></label><br>
                <input type="text" name="product_code" id="product_code_stored" value="<?php echo esc_attr($product_code_cache); ?>" style="width: 250px; margin-top: 5px;">
                <br><br>
                <input type="submit" name="check_stored_data" value="Verificar Dados Armazenados" class="button button-secondary">
                <input type="submit" name="force_price_update" value="🔄 Forçar Atualização de Preços" class="button button-primary" style="margin-left: 10px;">
            </form>
            <hr>
        </div>
        <?php
        // As funções de resultado são chamadas no topo da página
        
    // Conteúdo da aba de Testes de API
    } elseif ($active_tab == 'api_tests') {
        $product_code = isset($_GET['product']) ? sanitize_text_field($_GET['product']) : '26601P19';
        $test_date = isset($_GET['test_date']) ? sanitize_text_field($_GET['test_date']) : date('Y-m-d', strtotime('+7 days'));
        ?>
        <div style="margin-top: 20px;">
            <form method="get">
                <input type="hidden" name="page" value="viator-debug" />
                <input type="hidden" name="tab" value="api_tests" />
                <h3>Parâmetros para os Testes</h3>
                <table class="form-table">
                    <tr>
                        <th scope="row"><label for="product">Código do Produto:</label></th>
                        <td><input type="text" name="product" id="product" value="<?php echo esc_attr($product_code); ?>" class="regular-text" /></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="test_date">Data para Teste de Disponibilidade:</label></th>
                        <td>
                            <input type="date" name="test_date" id="test_date" value="<?php echo esc_attr($test_date); ?>" class="regular-text" />
                            <p class="description">Data futura que será usada para verificar a disponibilidade do produto.</p>
                        </td>
                    </tr>
                </table>
                <button type="submit" class="button button-primary">🔍 Executar Testes de API</button>
            </form>
        </div>
        
        <?php
        // Executar testes apenas se um produto foi enviado via GET (após o formulário ser submetido)
        if (isset($_GET['product'])) {
            echo '<hr><h2>Resultados dos Testes para o Produto: ' . esc_html($product_code) . '</h2>';
            
            // Teste 1: Informações do Produto
            echo '<h3>📦 1. Informações do Produto</h3>';
            test_product_info($api_key, $product_code);
            
            echo '<hr>';
            
            // Teste 2: Disponibilidade
            echo '<h3>📅 2. Teste de Disponibilidade</h3>';
            viator_test_availability($api_key, $product_code, $test_date);
        }
        
    // Conteúdo da aba de Cache
    } elseif ($active_tab == 'cache_data') {
        $product_code_cache = isset($_POST['product_code']) ? sanitize_text_field($_POST['product_code']) : '61268P24';
        ?>
        <div style="margin-top: 20px;">
            <h3>🔍 Ferramentas de Cache e Dados Locais</h3>
            <p>Verifique ou force a atualização dos dados que seu plugin armazena localmente para um produto específico.</p>
            <form method="post" action="?page=viator-debug&tab=cache_data">
                <label for="product_code_stored"><strong>Código do Produto:</strong></label><br>
                <input type="text" name="product_code" id="product_code_stored" value="<?php echo esc_attr($product_code_cache); ?>" style="width: 250px; margin-top: 5px;">
                <br><br>
                <input type="submit" name="check_stored_data" value="Verificar Dados Armazenados" class="button button-secondary">
                <input type="submit" name="force_price_update" value="🔄 Forçar Atualização de Preços" class="button button-primary" style="margin-left: 10px;">
            </form>
            <hr>
        </div>
        <?php
        // As funções de resultado são chamadas no topo da página
    }
    
    echo '</div>'; // Fecha .wrap
}

function test_product_info($api_key, $product_code) {
    $url = "https://api.sandbox.viator.com/partner/products/{$product_code}";
    
    $response = wp_remote_get($url, [
        'headers' => [
            'Accept' => 'application/json;version=2.0',
            'exp-api-key' => $api_key,
            'Accept-Language' => 'pt-BR'
        ],
        'timeout' => 30
    ]);
    
    if (is_wp_error($response)) {
        echo '<div class="notice notice-error"><p>❌ Erro de conexão: ' . $response->get_error_message() . '</p></div>';
        return;
    }
    
    $code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);
    
    echo '<p><strong>Status HTTP:</strong> ' . $code . '</p>';
    
    if ($code === 200) {
        $data = json_decode($body, true);
        
        echo '<div class="notice notice-success"><p>✅ Produto encontrado</p></div>';
        echo '<p><strong>Título:</strong> ' . esc_html($data['title'] ?? 'N/A') . '</p>';
        
        if (!empty($data['pricingInfo']['ageBands'])) {
            echo '<h4>Faixas Etárias Disponíveis:</h4>';
            echo '<ul>';
            foreach ($data['pricingInfo']['ageBands'] as $band) {
                // Usar os campos corretos conforme a resposta real da API
                $min_travelers = isset($band['minTravelersPerBooking']) ? intval($band['minTravelersPerBooking']) : 'N/A';
                $max_travelers = isset($band['maxTravelersPerBooking']) ? intval($band['maxTravelersPerBooking']) : 'N/A';
                $start_age = isset($band['startAge']) ? intval($band['startAge']) : 'N/A';
                $end_age = isset($band['endAge']) ? intval($band['endAge']) : 'N/A';
                
                echo '<li><strong>' . esc_html($band['ageBand'] ?? 'N/A') . '</strong> (Idade: ' . 
                     $start_age . '-' . $end_age . ') - Min: ' . 
                     $min_travelers . ', Max: ' . $max_travelers . '</li>';
            }
            echo '</ul>';
        }
        
        if (!empty($data['productOptions'])) {
            echo '<h4>Opções do Produto:</h4>';
            echo '<ul>';
            foreach ($data['productOptions'] as $option) {
                $option_code = isset($option['productOptionCode']) ? esc_html($option['productOptionCode']) : 'N/A';
                $option_title = isset($option['title']) ? esc_html($option['title']) : 'Sem título';
                echo '<li><strong>' . $option_code . '</strong>: ' . $option_title . '</li>';
            }
            echo '</ul>';
        }
        
    } else {
        echo '<div class="notice notice-error"><p>❌ Erro HTTP ' . $code . '</p></div>';
        echo '<details><summary>Ver resposta completa</summary>';
        echo '<pre>' . esc_html($body) . '</pre>';
        echo '</details>';
    }
}

// Função de teste de disponibilidade unificada
function viator_test_availability($api_key, $product_code, $test_date) {
    // Validar se a data fornecida é válida e futura
    $provided_date = DateTime::createFromFormat('Y-m-d', $test_date);
    $today = new DateTime();
    
    if (!$provided_date || $provided_date < $today->setTime(0,0,0)) {
        echo '<div class="notice notice-warning"><p>⚠️ Data inválida ou no passado. Usando data padrão (+7 dias).</p></div>';
        $test_date = date('Y-m-d', strtotime('+7 days'));
    }
    
    $url = "https://api.sandbox.viator.com/partner/availability/check";
    
    $request_data = [
        'productCode' => $product_code,
        'travelDate' => $test_date,
        'currency' => 'BRL',
        'paxMix' => [
            [
                'ageBand' => 'ADULT',
                'numberOfTravelers' => 2
            ]
        ]
    ];
    
    echo '<p><strong>Testando com data:</strong> ' . $test_date . '</p>';
    echo '<h4>Request Body:</h4>';
    echo '<pre>' . esc_html(json_encode($request_data, JSON_PRETTY_PRINT)) . '</pre>';
    
    $response = wp_remote_post($url, [
        'headers' => [
            'Accept' => 'application/json;version=2.0',
            'Content-Type' => 'application/json;version=2.0',
            'exp-api-key' => $api_key,
            'Accept-Language' => 'pt-BR'
        ],
        'body' => json_encode($request_data),
        'timeout' => 30
    ]);
    
    if (is_wp_error($response)) {
        echo '<div class="notice notice-error"><p>❌ Erro de conexão: ' . $response->get_error_message() . '</p></div>';
        return;
    }
    
    $code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);
    
    echo '<p><strong>Status HTTP:</strong> ' . $code . '</p>';
    
    if ($code === 200) {
        $data = json_decode($body, true);
        
        if ($data === null) {
            echo '<div class="notice notice-error"><p>❌ Erro ao decodificar JSON da resposta.</p></div>';
            echo '<pre>' . esc_html($body) . '</pre>';
            return;
        }
        
        echo '<div class="notice notice-success"><p>✅ Resposta da API recebida com sucesso.</p></div>';
        
        // Resumo da Disponibilidade
        $has_availability = false;
        $available_count = 0;
        
        if (isset($data['bookableItems']) && is_array($data['bookableItems'])) {
            foreach ($data['bookableItems'] as $item) {
                if (isset($item['available']) && $item['available'] === true) {
                    $has_availability = true;
                    $available_count++;
                }
            }
            echo '<h4>Resumo da Disponibilidade</h4>';
            echo '<p><strong>Disponibilidade geral na data:</strong> ' . ($has_availability ? '<span style="color:green; font-weight:bold;">SIM</span>' : '<span style="color:red; font-weight:bold;">NÃO</span>') . '</p>';
            echo '<p><strong>Opções/horários disponíveis:</strong> ' . $available_count . ' de ' . count($data['bookableItems']) . ' opções no total.</p>';
        
        } else {
             if (isset($data['errorCode'])) {
                echo '<p><strong>Erro da API:</strong> ' . esc_html($data['errorCode']) . ' - ' . esc_html($data['errorMessage'] ?? 'N/A') . '</p>';
            } else {
                 echo '<p>⚠️ Nenhuma opção de reserva (bookableItems) encontrada na resposta para esta data e configuração de passageiros.</p>';
            }
        }
        
        // Itens Reserváveis Detalhados
        if (isset($data['bookableItems']) && !empty($data['bookableItems'])) {
            echo '<hr style="margin: 20px 0;"><h4>Detalhes por Horário (Bookable Items)</h4>';
            echo '<table class="wp-list-table widefat striped"><thead><tr><th>Opção (Cód.)</th><th>Horário</th><th>Disponível?</th><th>Preço Total (2 Adultos)</th></tr></thead><tbody>';
            foreach ($data['bookableItems'] as $item) {
                $option_code = esc_html($item['productOptionCode'] ?? 'N/A');
                $start_time = esc_html($item['startTime'] ?? 'Sem horário definido');
                $available = (isset($item['available']) && $item['available']) ? '<span style="color:green;">SIM</span>' : '<span style="color:red;">NÃO</span>';
                
                $price = 'N/A';
                if (isset($item['totalPrice']['price']['recommendedRetailPrice'])) {
                    $price = 'R$ ' . number_format($item['totalPrice']['price']['recommendedRetailPrice'], 2, ',', '.');
                }
                
                echo '<tr><td>' . $option_code . '</td><td>' . $start_time . '</td><td>' . $available . '</td><td>' . $price . '</td></tr>';
            }
            echo '</tbody></table>';
        }
        
        echo '<br><details><summary>Ver resposta completa da API</summary>';
        echo '<pre>' . esc_html(json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) . '</pre>';
        echo '</details>';
        
    } else {
        echo '<div class="notice notice-error"><p>❌ Erro HTTP ' . $code . '</p></div>';
        echo '<pre>' . esc_html($body) . '</pre>';
    }
}

// Nova função para verificar dados armazenados
function viator_debug_stored_data($product_code) {
    echo '<h3>🔍 Dados Armazenados para Produto: ' . esc_html($product_code) . '</h3>';
    
    // Verificar dados de preço armazenados
    $price_data = get_option('viator_product_' . $product_code . '_price');
    
    echo '<h4>💰 Dados de Preço Armazenados:</h4>';
    if ($price_data) {
        echo '<div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #00a0d2; margin: 10px 0;">';
        echo '<pre>' . esc_html(json_encode($price_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) . '</pre>';
        echo '</div>';
        
        // Mostrar preços formatados
        if (isset($price_data['fromPrice'])) {
            $locale_settings = viator_get_locale_settings();
            $price_formatted = $locale_settings['currency_symbol'] . ' ' . number_format($price_data['fromPrice'], 2, ',', '.');
            echo '<p><strong>Preço formatado:</strong> ' . esc_html($price_formatted) . '</p>';
            
            if (isset($price_data['fromPriceBeforeDiscount']) && !empty($price_data['fromPriceBeforeDiscount'])) {
                $original_price_formatted = $locale_settings['currency_symbol'] . ' ' . number_format($price_data['fromPriceBeforeDiscount'], 2, ',', '.');
                echo '<p><strong>Preço original (antes do desconto):</strong> ' . esc_html($original_price_formatted) . '</p>';
                
                // Calcular percentual de desconto
                $discount_percent = (($price_data['fromPriceBeforeDiscount'] - $price_data['fromPrice']) / $price_data['fromPriceBeforeDiscount']) * 100;
                echo '<p><strong>Desconto:</strong> ' . number_format($discount_percent, 1) . '%</p>';
            }
            
            // Mostrar informações de atualização
            if (isset($price_data['last_updated'])) {
                $age_hours = (current_time('timestamp') - $price_data['last_updated']) / 3600;
                $age_display = '';
                
                if ($age_hours < 1) {
                    $age_minutes = round($age_hours * 60);
                    $age_display = $age_minutes . ' minuto(s) atrás';
                } elseif ($age_hours < 24) {
                    $age_display = round($age_hours, 1) . ' hora(s) atrás';
                } else {
                    $age_days = round($age_hours / 24, 1);
                    $age_display = $age_days . ' dia(s) atrás';
                }
                
                echo '<p><strong>⏰ Última atualização:</strong> ' . date('d/m/Y H:i:s', $price_data['last_updated']) . ' (' . $age_display . ')</p>';
                
                // Verificar se precisa atualizar
                if (viator_should_update_pricing($product_code, 1)) {
                    echo '<p style="color: #856404; background: #fff3cd; padding: 10px; border-radius: 4px;"><strong>⚠️ Aviso:</strong> Estes dados têm mais de 1 hora e serão atualizados automaticamente na próxima visualização da página do produto.</p>';
                } else {
                    echo '<p style="color: #155724; background: #d4edda; padding: 10px; border-radius: 4px;"><strong>✅ Status:</strong> Dados atualizados recentemente (menos de 1 hora).</p>';
                }
            }
            
            if (isset($price_data['updated_via'])) {
                echo '<p><strong>🔄 Método de atualização:</strong> ' . esc_html($price_data['updated_via']) . '</p>';
            }
        }
        
        if (isset($price_data['flags']) && !empty($price_data['flags'])) {
            echo '<p><strong>Flags:</strong> ' . implode(', ', $price_data['flags']) . '</p>';
        }
    } else {
        echo '<div class="notice notice-warning"><p>⚠️ Nenhum dado de preço armazenado encontrado</p></div>';
    }
    
    // Verificar transients
    echo '<h4>⚡ Cache/Transients:</h4>';
    $title_transient = get_transient('viator_product_' . $product_code . '_title');
    if ($title_transient) {
        echo '<p><strong>Título em cache:</strong> ' . esc_html($title_transient) . '</p>';
    } else {
        echo '<p><strong>Título em cache:</strong> Não encontrado</p>';
    }
    
    $duration_transient = get_transient('viator_product_' . $product_code . '_formatted_duration');
    if ($duration_transient) {
        echo '<p><strong>Duração em cache:</strong> ' . esc_html($duration_transient) . '</p>';
    } else {
        echo '<p><strong>Duração em cache:</strong> Não encontrada</p>';
    }
    
    // Mostrar configurações de localização
    echo '<h4>🌍 Configurações de Localização:</h4>';
    $locale_settings = viator_get_locale_settings();
    echo '<div style="background: #f0f8ff; padding: 15px; border-left: 4px solid #007cba; margin: 10px 0;">';
    echo '<pre>' . esc_html(json_encode($locale_settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) . '</pre>';
    echo '</div>';
    
    echo '<hr style="margin: 30px 0;">';
}

// Função para forçar atualização de preços
function viator_force_price_update($product_code) {
    echo '<h3>🔄 Forçando Atualização de Preços para: ' . esc_html($product_code) . '</h3>';
    
    // Mostrar dados antes da atualização
    echo '<h4>📊 Dados ANTES da Atualização:</h4>';
    $old_data = get_option('viator_product_' . $product_code . '_price');
    if ($old_data) {
        echo '<div style="background: #fffbf0; padding: 15px; border-left: 4px solid #ffb900; margin: 10px 0;">';
        echo '<pre>' . esc_html(json_encode($old_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) . '</pre>';
        echo '</div>';
    } else {
        echo '<p>❌ Nenhum dado encontrado antes da atualização</p>';
    }
    
    // Executar atualização
    echo '<h4>⚡ Executando Atualização...</h4>';
    $updated_data = viator_update_product_pricing($product_code);
    
    if ($updated_data) {
        echo '<div class="notice notice-success"><p>✅ Preços atualizados com sucesso!</p></div>';
        
        echo '<h4>📈 Dados DEPOIS da Atualização:</h4>';
        echo '<div style="background: #f0fff4; padding: 15px; border-left: 4px solid #00a32a; margin: 10px 0;">';
        echo '<pre>' . esc_html(json_encode($updated_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) . '</pre>';
        echo '</div>';
        
        // Mostrar comparação se havia dados anteriores
        if ($old_data && isset($old_data['fromPrice']) && isset($updated_data['fromPrice'])) {
            $old_price = $old_data['fromPrice'];
            $new_price = $updated_data['fromPrice'];
            $difference = $new_price - $old_price;
            $percent_change = $old_price > 0 ? ($difference / $old_price) * 100 : 0;
            
            echo '<h4>📊 Comparação:</h4>';
            echo '<table style="border-collapse: collapse; margin: 10px 0;">';
            echo '<tr style="background: #f9f9f9;">';
            echo '<th style="border: 1px solid #ddd; padding: 8px;">Métrica</th>';
            echo '<th style="border: 1px solid #ddd; padding: 8px;">Antes</th>';
            echo '<th style="border: 1px solid #ddd; padding: 8px;">Depois</th>';
            echo '<th style="border: 1px solid #ddd; padding: 8px;">Diferença</th>';
            echo '</tr>';
            echo '<tr>';
            echo '<td style="border: 1px solid #ddd; padding: 8px;"><strong>Preço</strong></td>';
            echo '<td style="border: 1px solid #ddd; padding: 8px;">R$ ' . number_format($old_price, 2, ',', '.') . '</td>';
            echo '<td style="border: 1px solid #ddd; padding: 8px;">R$ ' . number_format($new_price, 2, ',', '.') . '</td>';
            echo '<td style="border: 1px solid #ddd; padding: 8px; color: ' . ($difference >= 0 ? 'red' : 'green') . ';">';
            echo ($difference >= 0 ? '+' : '') . 'R$ ' . number_format($difference, 2, ',', '.') . ' (' . number_format($percent_change, 1) . '%)';
            echo '</td>';
            echo '</tr>';
            echo '</table>';
        }
        
        echo '<p><strong>⏰ Última atualização:</strong> ' . date('d/m/Y H:i:s', $updated_data['last_updated']) . '</p>';
        echo '<p><strong>🔄 Método:</strong> ' . esc_html($updated_data['updated_via']) . '</p>';
        echo '<p><strong>💱 Moeda:</strong> ' . esc_html($updated_data['currency']) . '</p>';
        
    } else {
        echo '<div class="notice notice-error"><p>❌ Falha ao atualizar preços. Verifique os logs para mais detalhes.</p></div>';
    }
    
    echo '<hr style="margin: 30px 0;">';
} 