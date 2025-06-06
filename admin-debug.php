<?php
/**
 * Página de Debug da API Viator no Admin do WordPress
 * Adicione este código ao functions.php ou como plugin separado
 */

// Adicionar página de menu no admin
add_action('admin_menu', 'viator_debug_menu');

function viator_debug_menu() {
    add_submenu_page(
        'tools.php',
        'Debug API Viator',
        'Debug API Viator',
        'manage_options',
        'viator-debug',
        'viator_debug_page'
    );
}

function viator_debug_page() {
    if (!current_user_can('manage_options')) {
        wp_die('Você não tem permissão para acessar esta página.');
    }
    
    echo '<div class="wrap">';
    echo '<h1>🔧 Debug da API Viator</h1>';
    
    // Verificar se temos API key
    $api_key = get_option('viator_api_key');
    if (empty($api_key)) {
        echo '<div class="notice notice-error"><p>❌ <strong>API Key não configurada!</strong> Configure em Configurações → Viator Integration</p></div>';
        echo '</div>';
        return;
    }
    
    echo '<div class="notice notice-info"><p>✅ API Key configurada</p></div>';
    
    // Verificar dados armazenados para produto específico
    if (isset($_POST['check_stored_data'])) {
        $product_code = sanitize_text_field($_POST['product_code']);
        viator_debug_stored_data($product_code);
    }
    
    // Forçar atualização de preços
    if (isset($_POST['force_price_update'])) {
        $product_code = sanitize_text_field($_POST['product_code']);
        viator_force_price_update($product_code);
    }
    
    // Verificar qual produto usar
    $product_code = isset($_GET['product']) ? sanitize_text_field($_GET['product']) : '26601P19';
    
    ?>
    <form method="post" style="margin: 20px 0;">
        <h3>🔍 Verificar Dados Armazenados</h3>
        <p>Verificar dados de preço e cache armazenados para um produto:</p>
        <label for="product_code_stored">Código do Produto:</label>
        <input type="text" name="product_code" id="product_code_stored" value="61268P24" style="width: 200px;">
        <input type="submit" name="check_stored_data" value="Verificar Dados" class="button button-secondary">
        <input type="submit" name="force_price_update" value="🔄 Forçar Atualização de Preços" class="button button-primary" style="margin-left: 10px;">
    </form>

    <form method="get">
        <input type="hidden" name="page" value="viator-debug" />
        <p><label>Código do Produto: <input type="text" name="product" value="<?php echo esc_attr($product_code); ?>" /></label> 
        <button type="submit" class="button">Testar</button></p>
    </form>
    
    <hr>
    
    <?php
    
    // Teste 1: Verificar produto
    echo '<h2>📦 1. Informações do Produto</h2>';
    test_product_info($api_key, $product_code);
    
    echo '<hr>';
    
    // Teste 2: Verificar disponibilidade mensal
    echo '<h2>📅 2. Teste de Disponibilidade Mensal</h2>';
    test_monthly_availability($api_key, $product_code);
    
    echo '<hr>';
    
    // Teste 3: Verificar disponibilidade específica
    echo '<h2>🎯 3. Teste de Disponibilidade Específica</h2>';
    test_specific_availability($api_key, $product_code);
    
    echo '</div>';
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
                $min_travelers = isset($band['minTravelers']) ? intval($band['minTravelers']) : 'N/A';
                $max_travelers = isset($band['maxTravelers']) ? intval($band['maxTravelers']) : 'N/A';
                echo '<li><strong>' . esc_html($band['ageBand'] ?? 'N/A') . '</strong> - Min: ' . 
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

function test_monthly_availability($api_key, $product_code) {
    $current_date = new DateTime();
    $test_date = $current_date->modify('+7 days')->format('Y-m-d');
    
    $url = "https://api.sandbox.viator.com/partner/availability/check";
    
    // A API não suporta consulta apenas por mês, precisa de data específica
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
    
    echo '<p><strong>Testando data:</strong> ' . $test_date . ' (Teste de disponibilidade com data específica)</p>';
    echo '<p><strong>Request:</strong></p>';
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
            echo '<div class="notice notice-error"><p>❌ Erro ao decodificar JSON da resposta</p></div>';
            echo '<pre>' . esc_html($body) . '</pre>';
            return;
        }
        
        echo '<div class="notice notice-success"><p>✅ Resposta recebida</p></div>';
        
        if (isset($data['bookableItems']) && is_array($data['bookableItems'])) {
            echo '<p><strong>Opções disponíveis encontradas:</strong> ' . count($data['bookableItems']) . '</p>';
            if (!empty($data['bookableItems'])) {
                echo '<ul>';
                foreach ($data['bookableItems'] as $item) {
                    $option_code = esc_html($item['productOptionCode'] ?? 'N/A');
                    $start_time = esc_html($item['startTime'] ?? 'N/A');
                    $available = isset($item['available']) ? ($item['available'] ? 'SIM' : 'NÃO') : 'N/A';
                    $price = 'N/A';
                    
                    if (isset($item['totalPrice']['price']['recommendedRetailPrice'])) {
                        $price = 'R$ ' . number_format($item['totalPrice']['price']['recommendedRetailPrice'], 2, ',', '.');
                    }
                    
                    echo '<li><strong>' . $option_code . '</strong> às ' . $start_time . ' - Disponível: ' . $available . ' - Preço: ' . $price . '</li>';
                }
                echo '</ul>';
            }
        } else {
            echo '<p>⚠️ Campo "bookableItems" não encontrado na resposta ou não é um array</p>';
            if (isset($data['errorCode'])) {
                echo '<p><strong>Erro da API:</strong> ' . esc_html($data['errorCode']) . '</p>';
                if (isset($data['errorMessage'])) {
                    echo '<p><strong>Mensagem:</strong> ' . esc_html($data['errorMessage']) . '</p>';
                }
            }
        }
        
        echo '<details><summary>Ver resposta completa</summary>';
        echo '<pre>' . esc_html(json_encode($data, JSON_PRETTY_PRINT)) . '</pre>';
        echo '</details>';
        
    } else {
        echo '<div class="notice notice-error"><p>❌ Erro HTTP ' . $code . '</p></div>';
        echo '<pre>' . esc_html($body) . '</pre>';
    }
}

function test_specific_availability($api_key, $product_code) {
    $test_date = date('Y-m-d', strtotime('+7 days'));
    
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
    
    echo '<p><strong>Data teste:</strong> ' . $test_date . '</p>';
    echo '<p><strong>Request:</strong></p>';
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
            echo '<div class="notice notice-error"><p>❌ Erro ao decodificar JSON da resposta</p></div>';
            echo '<pre>' . esc_html($body) . '</pre>';
            return;
        }
        
        echo '<div class="notice notice-success"><p>✅ Resposta recebida</p></div>';
        
        // Verificar disponibilidade geral (se há pelo menos um item disponível)
        $has_availability = false;
        $available_count = 0;
        
        if (isset($data['bookableItems']) && is_array($data['bookableItems'])) {
            foreach ($data['bookableItems'] as $item) {
                if (isset($item['available']) && $item['available'] === true) {
                    $has_availability = true;
                    $available_count++;
                }
            }
            
            echo '<p><strong>Disponibilidade Geral:</strong> ' . ($has_availability ? 'SIM' : 'NÃO') . '</p>';
            echo '<p><strong>Opções disponíveis:</strong> ' . $available_count . ' de ' . count($data['bookableItems']) . '</p>';
        } else {
            echo '<p>⚠️ Campo "bookableItems" não encontrado na resposta</p>';
            if (isset($data['errorCode'])) {
                echo '<p><strong>Erro da API:</strong> ' . esc_html($data['errorCode']) . '</p>';
                if (isset($data['errorMessage'])) {
                    echo '<p><strong>Mensagem:</strong> ' . esc_html($data['errorMessage']) . '</p>';
                }
            }
        }
        
        if (isset($data['productOptions']) && !empty($data['productOptions'])) {
            echo '<h4>Opções de Produto Disponíveis:</h4>';
            foreach ($data['productOptions'] as $option) {
                $option_code = isset($option['productOptionCode']) ? esc_html($option['productOptionCode']) : 'N/A';
                echo '<h5>' . $option_code . '</h5>';
                
                if (isset($option['available'])) {
                    echo '<p>Disponível: ' . ($option['available'] ? 'SIM' : 'NÃO') . '</p>';
                }
                
                if (isset($option['totalPrice']['price']['recommendedRetailPrice'])) {
                    $price = floatval($option['totalPrice']['price']['recommendedRetailPrice']);
                    echo '<p>Preço: R$ ' . number_format($price, 2, ',', '.') . '</p>';
                }
                
                // Adicionar informações sobre line items se disponível
                if (isset($option['lineItems']) && !empty($option['lineItems'])) {
                    echo '<h6>Detalhes por Viajante:</h6>';
                    echo '<ul>';
                    foreach ($option['lineItems'] as $item) {
                        $age_band = isset($item['ageBand']) ? esc_html($item['ageBand']) : 'N/A';
                        $travelers = isset($item['numberOfTravelers']) ? intval($item['numberOfTravelers']) : 0;
                        echo '<li>' . $age_band . ': ' . $travelers . ' viajante(s)</li>';
                    }
                    echo '</ul>';
                }
            }
        }
        
        echo '<details><summary>Ver resposta completa</summary>';
        echo '<pre>' . esc_html(json_encode($data, JSON_PRETTY_PRINT)) . '</pre>';
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