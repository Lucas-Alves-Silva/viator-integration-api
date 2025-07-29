<?php
/**
 * Viator Product Detail Page
 * 
 * Displays detailed information about a specific Viator product
 * using the /products/{product-code} endpoint
 */

if (!defined('ABSPATH')) {
    exit; // Security check
}

/**
 * Modifica o título da página para mostrar o título do produto Viator
 */
function viator_modify_page_title($title, $sep = '|') {
    global $post;
    
    // Verifica se estamos em uma página ou post com o shortcode viator_product
    if (is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'viator_product')) {
        // Obtém o código do produto da URL (suporta tanto o formato antigo quanto o novo)
        $product_code = get_query_var('product_code', '');
        if (empty($product_code)) {
            $product_code = isset($_GET['product_code']) ? sanitize_text_field($_GET['product_code']) : '';
        }
        
        // Se tiver um código de produto, busca o título do produto
        if (!empty($product_code)) {
            // Tenta obter o título do produto do cache
            $cached_title = get_transient('viator_product_' . $product_code . '_title');
            
            if ($cached_title) {
                // Retorna o título do produto + separador + nome do site
                return esc_html($cached_title) . ' ' . $sep . ' ' . get_bloginfo('name');
            } else {
                // Se não tiver no cache, busca diretamente da API
                $api_key = get_option('viator_api_key');
                if (!empty($api_key)) {
                    $url = "https://api.sandbox.viator.com/partner/products/{$product_code}";
                    // Obter configurações de idioma
                    $locale_settings = viator_get_locale_settings();
                    
                    $response = wp_remote_get($url, [
                        'headers' => [
                            'Accept'           => 'application/json;version=2.0',
                            'Content-Type'     => 'application/json;version=2.0',
                            'exp-api-key'      => $api_key,
                            'Accept-Language'  => $locale_settings['language'],
                        ],
                        'timeout' => 10, // Timeout reduzido para não atrasar muito o carregamento da página
                    ]);
                    
                    if (!is_wp_error($response)) {
                        $body = wp_remote_retrieve_body($response);
                        $product = json_decode($body, true);
                        
                        if (!empty($product) && isset($product['title'])) {
                            // Armazena o título no cache para futuras requisições
                            set_transient('viator_product_' . $product_code . '_title', $product['title'], DAY_IN_SECONDS);
                            return esc_html($product['title']) . ' ' . $sep . ' ' . get_bloginfo('name');
                        }
                    }
                }
            }
        }
    }
    
    // Se não for uma página de produto ou não conseguir obter o título, retorna o título padrão
    return $title;
}
// Aumenta a prioridade dos filtros para garantir que eles sejam executados antes das configurações de links permanentes
add_filter('wp_title', 'viator_modify_page_title', 1, 2);
add_filter('pre_get_document_title', 'viator_modify_page_title', 1, 2);
add_filter('document_title_parts', function($title_parts) {
    $custom_title = viator_modify_page_title(implode(' | ', $title_parts), '|');
    if ($custom_title !== implode(' | ', $title_parts)) {
        return ['title' => $custom_title];
    }
    return $title_parts;
}, 1);

/**
 * Register the shortcode for product details
 */
function viator_product_detail_shortcode($atts) {
    // Extract attributes
    $atts = shortcode_atts(array(
        'product_code' => '', // Default empty
    ), $atts, 'viator_product');
    
    // If no product code is provided in the shortcode, check URL parameter
    if (empty($atts['product_code'])) {
        // Primeiro verifica se está usando o novo formato de URL
        $product_code = get_query_var('product_code', '');
        
        // Se não encontrar, verifica o formato antigo com parâmetro de consulta
        if (empty($product_code)) {
            $product_code = isset($_GET['product_code']) ? sanitize_text_field($_GET['product_code']) : '';
        }
        
        $atts['product_code'] = $product_code;
    }
    
    // If still no product code, show error message
    if (empty($atts['product_code'])) {
        return '<div class="viator-error">' . esc_html(viator_t('product_code_not_provided')) . '</div>';
    }
    
    // Get product details
    return viator_get_product_details($atts['product_code']);
}
add_shortcode('viator_product', 'viator_product_detail_shortcode');

/**
 * Fetch and display product details from Viator API
 */
function get_product_recommendations($product_code) {
    // Certifique-se de que o arquivo debug.php está incluído
    if (!function_exists('viator_debug_log')) {
        require_once plugin_dir_path(__FILE__) . 'debug.php';
    }
    
    $api_key = get_option('viator_api_key');
    if (empty($api_key)) {
        return [];
    }
    
    // Obter configurações de idioma
    $locale_settings = viator_get_locale_settings();

    $url = "https://api.sandbox.viator.com/partner/products/recommendations";
    $body = [
        'productCodes' => [$product_code],
        'recommendationTypes' => ['IS_SIMILAR_TO']
    ];

    // Log de debug
    viator_debug_log('Solicitação de recomendações para o produto:', $product_code);
    viator_debug_log('Corpo da solicitação:', $body);

    $response = wp_remote_post($url, [
        'headers' => [
            'Accept'           => 'application/json;version=2.0',
            'Content-Type'     => 'application/json;version=2.0',
            'exp-api-key'      => $api_key,
            'Accept-Language'  => $locale_settings['language'],
        ],
        'body'    => json_encode($body),
        'timeout' => 120,
    ]);

    if (is_wp_error($response)) {
        viator_debug_log('Erro ao buscar recomendações:', $response->get_error_message());
        return [];
    }

    $body = wp_remote_retrieve_body($response);
    $recommendations = json_decode($body, true);

    // Log da resposta completa da API para debug
    viator_debug_log('Resposta da API de recomendações para o produto ' . $product_code . ':', $recommendations);

    if (empty($recommendations) || !is_array($recommendations)) {
        viator_debug_log('Nenhuma recomendação encontrada ou formato inválido para o produto:', $product_code);
        return [];
    }

    // Extrair os códigos dos produtos recomendados
    $recommended_products = [];
    foreach ($recommendations as $recommendation) {
        if (isset($recommendation['recommendations']['IS_SIMILAR_TO'])) {
            $recommended_products = array_merge($recommended_products, $recommendation['recommendations']['IS_SIMILAR_TO']);
        }
    }

    viator_debug_log('Produtos recomendados encontrados:', $recommended_products);

    // Buscar detalhes dos produtos recomendados para obter informações de duração
    $product_details = [];
    $formatted_recommendations = [];
    
    foreach (array_slice(array_unique($recommended_products), 0, 5) as $rec_product_code) {
        $product_url = add_query_arg('currencyCode', $locale_settings['currency'], "https://api.sandbox.viator.com/partner/products/{$rec_product_code}");
        
        viator_debug_log('Buscando detalhes do produto recomendado (URL com moeda):', $product_url);
        
        $product_response = wp_remote_get($product_url, [
            'headers' => [
                'Accept'           => 'application/json;version=2.0',
                'Content-Type'     => 'application/json;version=2.0',
                'exp-api-key'      => $api_key,
                'Accept-Language'  => $locale_settings['language'],
            ],
            'timeout' => 30
        ]);
        
        if (!is_wp_error($product_response)) {
            $product_body = wp_remote_retrieve_body($product_response);
            $product_data = json_decode($product_body, true);
            
            if (!empty($product_data)) {
                // Inicializa a duração formatada como não disponível
                $formatted_duration = 'Duração não disponível';
                
                // Verifica se há informações de duração no produto
                if (isset($product_data['duration'])) {
                    viator_debug_log('Dados de duração do produto recomendado ' . $rec_product_code . ':', $product_data['duration']);
                    
                    // Captura e formata a duração do passeio usando a mesma lógica do viator-integration.php
                    $duration_fixed = isset($product_data['duration']['fixedDurationInMinutes']) ? $product_data['duration']['fixedDurationInMinutes'] : null;
                    $duration_from = isset($product_data['duration']['variableDurationFromMinutes']) ? $product_data['duration']['variableDurationFromMinutes'] : null;
                    $duration_to = isset($product_data['duration']['variableDurationToMinutes']) ? $product_data['duration']['variableDurationToMinutes'] : null;
                    $unstructured_duration = isset($product_data['duration']['unstructuredDuration']) ? $product_data['duration']['unstructuredDuration'] : null;

                    if ($duration_fixed === 0) {
                        // Caso específico para duração flexível
                        $formatted_duration = 'Flexível';
                    } elseif ($unstructured_duration !== null) {
                        // Se tiver unstructuredDuration, usa o valor fornecido ou define como 1 hora
                        $formatted_duration = !empty($unstructured_duration) ? $unstructured_duration : '1 hora';
                    } elseif ($duration_fixed !== null) {
                        if ($duration_fixed >= 1440) { // 24 horas = 1440 minutos
                            $days = floor($duration_fixed / 1440); // Calcula os dias
                            $remaining_minutes = $duration_fixed % 1440; // Minutos restantes
                            $hours = floor($remaining_minutes / 60); // Horas restantes
                            
                            $formatted_duration = $days . ' dia' . ($days != 1 ? 's' : '');
                            if ($hours > 0) {
                                $formatted_duration .= ' e ' . $hours . ' hora' . ($hours != 1 ? 's' : '');
                            }
                        } elseif ($duration_fixed < 60) {
                            $formatted_duration = $duration_fixed . ' minutos';
                        } else {
                            $hours = floor($duration_fixed / 60);
                            $minutes = $duration_fixed % 60;
                            $formatted_duration = $hours . ' hora' . ($hours != 1 ? 's' : '') . ($minutes > 0 ? ' e ' . $minutes . ' minuto' . ($minutes != 1 ? 's' : '') : '');
                        }
                    } elseif ($duration_from !== null && $duration_to !== null) {
                        // Duração variável
                        if ($duration_to >= 1440) {
                            $days_from = floor($duration_from / 1440);
                            $days_to = floor($duration_to / 1440);
                            
                            if ($days_from == $days_to) {
                                $formatted_duration = $days_from . ' dia' . ($days_from != 1 ? 's' : '');
                            } else {
                                $formatted_duration = 'De ' . $days_from . ' a ' . $days_to . ' dia' . ($days_to != 1 ? 's' : '');
                            }
                        } elseif ($duration_to < 60) {
                            // Ambos os valores em minutos - Formato simplificado
                            if ($duration_from < 60 && $duration_to < 60) {
                                $formatted_duration = 'De ' . $duration_from . ' a ' . $duration_to . ' minuto' . ($duration_to != 1 ? 's' : '');
                            } else {
                                $formatted_duration = 'De ' . $duration_from . ' minuto' . ($duration_from != 1 ? 's' : '') . 
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
                                $formatted_duration = 'De ' . $hours_from . ' a ' . $hours_to . ' hora' . ($hours_to != 1 ? 's' : '');
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
                                $formatted_duration = 'De ' . $duration_from_formatted . ' a ' . $duration_to_formatted;
                            }
                        }
                    } else {
                        // Duração não disponível
                        $formatted_duration = 'Duração não disponível';
                    }
                    
                    // Detalhes adicionais sobre os campos específicos de duração para debug
                    $duration_fields = [
                        'fixedDurationInMinutes' => isset($product_data['duration']['fixedDurationInMinutes']) ? $product_data['duration']['fixedDurationInMinutes'] : 'não definido',
                        'variableDurationFromMinutes' => isset($product_data['duration']['variableDurationFromMinutes']) ? $product_data['duration']['variableDurationFromMinutes'] : 'não definido',
                        'variableDurationToMinutes' => isset($product_data['duration']['variableDurationToMinutes']) ? $product_data['duration']['variableDurationToMinutes'] : 'não definido',
                        'unstructuredDuration' => isset($product_data['duration']['unstructuredDuration']) ? $product_data['duration']['unstructuredDuration'] : 'não definido'
                    ];
                    
                    viator_debug_log('Campos de duração detalhados para o produto ' . $rec_product_code . ':', $duration_fields);
                    viator_debug_log('Duração formatada para o produto ' . $rec_product_code . ':', $formatted_duration);
                } else {
                    // Verifica se há informações de duração no itinerário
                    if (isset($product_data['itinerary']) && isset($product_data['itinerary']['duration'])) {
                        // Captura e formata a duração do passeio usando a mesma lógica do viator-integration.php
                        $duration_fixed = isset($product_data['itinerary']['duration']['fixedDurationInMinutes']) ? $product_data['itinerary']['duration']['fixedDurationInMinutes'] : null;
                        $duration_from = isset($product_data['itinerary']['duration']['variableDurationFromMinutes']) ? $product_data['itinerary']['duration']['variableDurationFromMinutes'] : null;
                        $duration_to = isset($product_data['itinerary']['duration']['variableDurationToMinutes']) ? $product_data['itinerary']['duration']['variableDurationToMinutes'] : null;
                        $unstructured_duration = isset($product_data['itinerary']['duration']['unstructuredDuration']) ? $product_data['itinerary']['duration']['unstructuredDuration'] : null;

                        if ($duration_fixed === 0) {
                            // Caso específico para duração flexível
                            $formatted_duration = 'Flexível';
                        } elseif ($unstructured_duration !== null) {
                            // Se tiver unstructuredDuration, usa o valor fornecido ou define como 1 hora
                            $formatted_duration = !empty($unstructured_duration) ? $unstructured_duration : '1 hora';
                        } elseif ($duration_fixed !== null) {
                            if ($duration_fixed >= 1440) { // 24 horas = 1440 minutos
                                $days = floor($duration_fixed / 1440); // Calcula os dias
                                $remaining_minutes = $duration_fixed % 1440; // Minutos restantes
                                $hours = floor($remaining_minutes / 60); // Horas restantes
                                
                                $formatted_duration = $days . ' dia' . ($days != 1 ? 's' : '');
                                if ($hours > 0) {
                                    $formatted_duration .= ' e ' . $hours . ' hora' . ($hours != 1 ? 's' : '');
                                }
                            } elseif ($duration_fixed < 60) {
                                $formatted_duration = $duration_fixed . ' minutos';
                            } else {
                                $hours = floor($duration_fixed / 60);
                                $minutes = $duration_fixed % 60;
                                $formatted_duration = $hours . ' hora' . ($hours != 1 ? 's' : '') . ($minutes > 0 ? ' e ' . $minutes . ' minuto' . ($minutes != 1 ? 's' : '') : '');
                            }
                        } elseif ($duration_from !== null && $duration_to !== null) {
                            // Duração variável
                            if ($duration_to >= 1440) {
                                $days_from = floor($duration_from / 1440);
                                $days_to = floor($duration_to / 1440);
                                
                                if ($days_from == $days_to) {
                                    $formatted_duration = $days_from . ' dia' . ($days_from != 1 ? 's' : '');
                                } else {
                                    $formatted_duration = 'De ' . $days_from . ' a ' . $days_to . ' dia' . ($days_to != 1 ? 's' : '');
                                }
                            } elseif ($duration_to < 60) {
                                // Ambos os valores em minutos - Formato simplificado
                                if ($duration_from < 60 && $duration_to < 60) {
                                    $formatted_duration = 'De ' . $duration_from . ' a ' . $duration_to . ' minuto' . ($duration_to != 1 ? 's' : '');
                                } else {
                                    $formatted_duration = 'De ' . $duration_from . ' minuto' . ($duration_from != 1 ? 's' : '') . 
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
                                    $formatted_duration = 'De ' . $hours_from . ' a ' . $hours_to . ' hora' . ($hours_to != 1 ? 's' : '');
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
                                    $formatted_duration = 'De ' . $duration_from_formatted . ' a ' . $duration_to_formatted;
                                }
                            }
                        } else {
                            // Duração não disponível
                            $formatted_duration = 'Duração não disponível';
                        }
                        
                        viator_debug_log('Duração encontrada no itinerário para o produto ' . $rec_product_code . ':', $formatted_duration);
                    } else {
                        viator_debug_log('Produto ' . $rec_product_code . ' não possui dados de duração');
                    }
                }
                
                // Armazena os detalhes do produto e a duração formatada
                // Armazenar as flags do produto para uso posterior
                $flags = isset($product_data['flags']) ? $product_data['flags'] : [];
                
                $product_details[$rec_product_code] = $product_data;
                $formatted_recommendations[$rec_product_code] = [
                    'product_code' => $rec_product_code,
                    'duration' => $formatted_duration,
                    'title' => isset($product_data['title']) ? $product_data['title'] : '',
                    'flags' => $flags // Adicionar as flags aos dados do produto recomendado
                ];
            } else {
                viator_debug_log('Resposta vazia ou inválida para o produto:', $rec_product_code);
            }
        } else {
            viator_debug_log('Erro ao buscar detalhes do produto ' . $rec_product_code . ':', $product_response->get_error_message());
        }
    }

    return $formatted_recommendations;
}

/**
 * Atualiza os preços de um produto usando a API de availability/check
 * Esta API fornece preços mais precisos e atuais
 * 
 * NOTA: Função mantida para uso na ferramenta de debug e possível uso futuro
 * Não é usada automaticamente na exibição de produtos
 */
function viator_update_product_pricing($product_code) {
    $api_key = get_option('viator_api_key');
    if (empty($api_key)) {
        return false;
    }
    
    $locale_settings = viator_get_locale_settings();
    
    // Usar uma data próxima para verificar disponibilidade e preços
    $test_date = date('Y-m-d', strtotime('+7 days'));
    
    $url = "https://api.sandbox.viator.com/partner/availability/check";
    
    $request_data = [
        'productCode' => $product_code,
        'travelDate' => $test_date,
        'currency' => $locale_settings['currency'],
        'paxMix' => [
            [
                'ageBand' => 'ADULT',
                'numberOfTravelers' => 1  // Usando 1 pessoa para obter preço por pessoa
            ]
        ]
    ];
    
    $response = wp_remote_post($url, [
        'headers' => [
            'Accept' => 'application/json;version=2.0',
            'Content-Type' => 'application/json;version=2.0',
            'exp-api-key' => $api_key,
            'Accept-Language' => $locale_settings['language'],
        ],
        'body' => json_encode($request_data),
        'timeout' => 30
    ]);
    
    if (is_wp_error($response)) {
        viator_debug_log('Erro ao atualizar preços via availability/check:', $response->get_error_message());
        return false;
    }
    
    $code = wp_remote_retrieve_response_code($response);
    if ($code !== 200) {
        viator_debug_log('Erro HTTP ao atualizar preços:', $code);
        return false;
    }
    
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);
    
    if (empty($data['bookableItems'])) {
        viator_debug_log('Nenhum item disponível retornado para atualização de preços');
        return false;
    }
    
         // Procurar pelo melhor preço disponível (menor preço entre as opções disponíveis)
     $best_price = null;
     $best_original_price = null;
     $available_options = [];
     
     foreach ($data['bookableItems'] as $item) {
         if (isset($item['available']) && $item['available'] && isset($item['totalPrice']['price']['recommendedRetailPrice'])) {
             $price = $item['totalPrice']['price']['recommendedRetailPrice'];
             
             // Se há desconto, pegar o preço original
             $original_price = null;
             if (isset($item['totalPrice']['priceBeforeDiscount']['recommendedRetailPrice'])) {
                 $original_price = $item['totalPrice']['priceBeforeDiscount']['recommendedRetailPrice'];
             }
             
             $available_options[] = [
                 'productOptionCode' => $item['productOptionCode'] ?? 'N/A',
                 'price' => $price,
                 'original_price' => $original_price
             ];
             
             // Usar o menor preço disponível (melhor oferta para o cliente)
             if ($best_price === null || $price < $best_price) {
                 $best_price = $price;
                 $best_original_price = $original_price;
             }
         }
     }
     
     viator_debug_log('Opções de preço encontradas para produto ' . $product_code, $available_options);
    
    if ($best_price === null) {
        viator_debug_log('Nenhum preço válido encontrado na resposta da API');
        return false;
    }
    
    // Atualizar os dados armazenados com timestamp
    $existing_data = get_option('viator_product_' . $product_code . '_price', []);
    
    $updated_data = array_merge($existing_data, [
        'fromPrice' => $best_price,
        'fromPriceBeforeDiscount' => $best_original_price,
        'last_updated' => current_time('timestamp'),
        'updated_via' => 'availability_check',
        'currency' => $locale_settings['currency']
    ]);
    
    update_option('viator_product_' . $product_code . '_price', $updated_data);
    
         viator_debug_log('Preços atualizados para produto ' . $product_code, [
         'old_price' => isset($existing_data['fromPrice']) ? $existing_data['fromPrice'] : null,
         'new_price' => $best_price,
         'price_change' => isset($existing_data['fromPrice']) ? ($best_price - $existing_data['fromPrice']) : null,
         'original_price' => $best_original_price,
         'currency' => $locale_settings['currency'],
         'available_options_count' => count($available_options),
         'test_date_used' => $test_date
     ]);
    
    return $updated_data;
}

/**
 * Verifica se os preços de um produto precisam ser atualizados
 * @param string $product_code
 * @param int $max_age_hours Idade máxima em horas antes de considerar desatualizado (padrão: 1 hora)
 * @return bool
 */
function viator_should_update_pricing($product_code, $max_age_hours = 1) {
    $stored_data = get_option('viator_product_' . $product_code . '_price');
    
    // Se não há dados armazenados, precisa atualizar
    if (!$stored_data || !isset($stored_data['fromPrice'])) {
        return true;
    }
    
    // Se não há timestamp, considerar desatualizado
    if (!isset($stored_data['last_updated'])) {
        return true;
    }
    
    // Verificar se os dados estão dentro do prazo de validade
    $age_seconds = current_time('timestamp') - $stored_data['last_updated'];
    $max_age_seconds = $max_age_hours * 3600;
    
    return $age_seconds > $max_age_seconds;
}

/**
 * Função auxiliar para extrair informações de quantidade mínima de um age band
 * Verifica múltiplos campos possíveis na resposta da API
 */
function viator_extract_traveler_quantities($band, $pricing_type = null) {
    $min_travelers = null;
    $max_travelers = null;
    
    // Lista de campos possíveis para quantidade mínima (em ordem de prioridade)
    $min_fields = [
        'minTravelersPerBooking',
        'minTravelers', 
        'minimum',
        'requiredMinTravelers',
        'minimumQuantity'
    ];
    
    // Lista de campos possíveis para quantidade máxima
    $max_fields = [
        'maxTravelersPerBooking',
        'maxTravelers',
        'maximum', 
        'maximumQuantity'
    ];
    
    // Buscar quantidade mínima
    foreach ($min_fields as $field) {
        if (isset($band[$field]) && is_numeric($band[$field])) {
            $min_travelers = intval($band[$field]);
            break;
        }
    }
    
    // Buscar quantidade máxima
    foreach ($max_fields as $field) {
        if (isset($band[$field]) && is_numeric($band[$field])) {
            $max_travelers = intval($band[$field]);
            break;
        }
    }
    
    // Se não encontrou quantidade mínima, aplicar lógica padrão baseada no tipo de produto
    if ($min_travelers === null) {
        if ($pricing_type === 'UNIT') {
            // Para produtos do tipo unidade (ex: transfer), algumas faixas podem ser opcionais
            $min_travelers = 0;
        } else {
            // Para produtos per person, geralmente exige pelo menos 1
            $min_travelers = 1;
        }
    }
    
    return [
        'min' => $min_travelers,
        'max' => $max_travelers
    ];
}

function viator_get_product_details($product_code) {
    // Get API key from settings
    $api_key = get_option('viator_api_key');
    if (empty($api_key)) {
        return '<p class="error">' . esc_html(viator_t('error_api_key')) . '</p>';
    }
    
    // Obter configurações de idioma e moeda
    $locale_settings = viator_get_locale_settings();
    
    // API endpoint
    $url = add_query_arg('currencyCode', $locale_settings['currency'], "https://api.sandbox.viator.com/partner/products/{$product_code}");
    viator_debug_log('Buscando detalhes do produto (URL com moeda):', $url);
    
    // Make API request
    $response = wp_remote_get($url, [
        'headers' => [
            'Accept'           => 'application/json;version=2.0',
            'Content-Type'     => 'application/json;version=2.0',
            'exp-api-key'      => $api_key,
            'Accept-Language'  => $locale_settings['language'],
        ],
        'timeout' => 120,
    ]);
    
    // Check for errors
    if (is_wp_error($response)) {
        return '<div class="viator-error">' . esc_html(viator_t('error_fetch_details')) . '</div>';
    }
    
    // Parse response
    $body = wp_remote_retrieve_body($response);
    $product = json_decode($body, true);
    
    // Check if product exists
    if (empty($product) || isset($product['error'])) {
        return '<div class="viator-error">' . esc_html(viator_t('error_product_not_found')) . '</div>';
    }

    // Extract pricing information
    $pricing_info = isset($product['pricingInfo']) ? $product['pricingInfo'] : null;
    $age_bands = ($pricing_info && isset($pricing_info['ageBands']) && is_array($pricing_info['ageBands'])) ? $pricing_info['ageBands'] : [];
    $pricing_summary = isset($product['pricing']['summary']) ? $product['pricing']['summary'] : [];
    


    // Variável para HTML do serviço de unidade (ex: Traslado disponível)
    $unit_service_html = '';
    if (isset($pricing_info['type']) && $pricing_info['type'] === 'UNIT' && isset($pricing_info['unitType'])) {
        $unit_type = $pricing_info['unitType'];
        $icon_svg = '';
        $text_key = '';
        $service_text_display = '';

        if ($unit_type === 'VEHICLE') {
            // Ícone de Carro (específico)
            $icon_svg = '<img width="22" height="22" src="https://img.icons8.com/ios-glyphs/30/car--v1.png" alt="' . esc_attr(viator_t('unit_type_vehicle_available')) . '"/>';
            $text_key = 'unit_type_vehicle_available';
            $service_text_display = esc_html(viator_t($text_key));
        } elseif ($unit_type === 'BOAT') {
            // Ícone de Barco (específico)
            $icon_svg = '<img width="22" height="22" src="https://img.icons8.com/ios-glyphs/30/water-transportation.png" alt="' . esc_attr(viator_t('unit_type_boat_available')) . '"/>';
            $text_key = 'unit_type_boat_available';
            $service_text_display = esc_html(viator_t($text_key));
        } else {
            // Ícone Genérico SVG (mantido para outros tipos)
            $icon_svg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="#00715D" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.75 9H8.25" stroke="#00715D" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.75 15H8.25" stroke="#00715D" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            $translated_unit_type = viator_t(strtolower($unit_type));
            // Se não houver tradução específica para o unit_type, usar o próprio unitType (capitalizado)
            if ($translated_unit_type === strtolower($unit_type)) {
                $translated_unit_type = esc_html(ucfirst(strtolower($unit_type)));
            }
            $service_text_display = sprintf(esc_html(viator_t('unit_type_generic_available')), $translated_unit_type);
        }

        if (!empty($service_text_display)) {
            $unit_service_html = '<div class="viator-unit-service-info"><span class="service-icon">' . $icon_svg . '</span> <span class="service-text">' . $service_text_display . '</span></div>';
        }
    }

    // Get main product details
    $title = isset($product['title']) ? esc_html($product['title']) : 'Título não disponível';
    
    // Armazena o título do produto em cache para uso na função de título da página
    if (isset($product['title'])) {
        set_transient('viator_product_' . $product_code . '_title', $product['title'], DAY_IN_SECONDS);
    }
    $description = isset($product['description']) ? esc_html($product['description']) : 'Descrição não disponível';
    $rating = isset($product['reviews']['combinedAverageRating']) ? number_format($product['reviews']['combinedAverageRating'], 1) : 0;
    $review_count = isset($product['reviews']['totalReviews']) ? intval($product['reviews']['totalReviews']) : 0;
    
    // Try to get price from product API response first - multiple structures
    $from_price = null;
    $from_price_before_discount = null;
    
         // Tentar múltiplas estruturas de dados possíveis para preços (ordenadas por prioridade)
     if (isset($product['pricingInfo']['summary']['fromPrice'])) {
         $from_price = $product['pricingInfo']['summary']['fromPrice'];
         $from_price_before_discount = isset($product['pricingInfo']['summary']['fromPriceBeforeDiscount']) ? $product['pricingInfo']['summary']['fromPriceBeforeDiscount'] : null;
     } elseif (isset($pricing_summary['fromPrice'])) {
         $from_price = $pricing_summary['fromPrice'];
         $from_price_before_discount = isset($pricing_summary['fromPriceBeforeDiscount']) ? $pricing_summary['fromPriceBeforeDiscount'] : null;
     } elseif (isset($product['pricing']['summary']['fromPrice'])) {
         $from_price = $product['pricing']['summary']['fromPrice'];
         $from_price_before_discount = isset($product['pricing']['summary']['fromPriceBeforeDiscount']) ? $product['pricing']['summary']['fromPriceBeforeDiscount'] : null;
     } elseif (isset($product['price']['fromPrice'])) {
         $from_price = $product['price']['fromPrice'];
         $from_price_before_discount = isset($product['price']['fromPriceBeforeDiscount']) ? $product['price']['fromPriceBeforeDiscount'] : null;
     } elseif (isset($product['fromPrice'])) {
         $from_price = $product['fromPrice'];
         $from_price_before_discount = isset($product['fromPriceBeforeDiscount']) ? $product['fromPriceBeforeDiscount'] : null;
     }
    
         $has_price_data = ($from_price !== null);
     $source_currency = $product['pricing']['summary']['fromPrice']['currency'] ?? ($product['pricingInfo']['summary']['currencyCode'] ?? 'USD');
     $price = $has_price_data ? viator_convert_and_format_price($from_price, $source_currency, $locale_settings) : viator_t('price_unavailable');
     $original_price = ($from_price_before_discount !== null) ? viator_convert_and_format_price($from_price_before_discount, $source_currency, $locale_settings) : '';
     
     // Debug: vamos logar as estruturas de dados que estão vindo da API para preços
     if (!$has_price_data) {
         viator_debug_log('Estruturas de preço não encontradas para produto ' . $product_code, [
             'pricing_summary_exists' => isset($product['pricing']['summary']),
             'pricingInfo_summary_exists' => isset($product['pricingInfo']['summary']),
             'pricing_summary_content' => isset($pricing_summary) ? $pricing_summary : null,
             'price_exists' => isset($product['price']),
             'product_keys' => array_keys($product)
         ]);
     }

    // Determinar a nota de preço
    $price_note_text = ''; 
    $max_travelers_overall = 0;

    if ($pricing_info && isset($pricing_info['type'])) {
        if ($pricing_info['type'] === 'UNIT') {
            $price_note_text = viator_t('price_per_group'); 
            // Calcular o máximo de viajantes se for por unidade/grupo
            if (!empty($age_bands)) {
                foreach ($age_bands as $band) {
                    if (isset($band['maxTravelersPerBooking'])) {
                        // Se houver várias ageBands, pegamos o maior maxTravelersPerBooking como uma aproximação
                        // A lógica exata de combinação de ageBands para total de viajantes pode ser mais complexa
                        $max_travelers_overall = max($max_travelers_overall, $band['maxTravelersPerBooking']);
                    }
                }
                if ($max_travelers_overall > 0) {
                    $price_note_text .= ' ' . sprintf(viator_t('up_to_travelers'), $max_travelers_overall);
                }
            }
        } else {
            $price_note_text = viator_t('price_per_person'); // Padrão para PER_PERSON ou outros tipos
        }
    }

    // Preparar dados das faixas etárias para exibição
    $age_bands_display_data = [];
    $total_max_travelers_possible = 0; // Para a frase "Você pode selecionar até X viajantes"

    if (!empty($age_bands)) {
        foreach ($age_bands as $band) {
            $band_label = isset($band['ageBand']) ? ucfirst(strtolower(str_replace('_', ' ', $band['ageBand']))) : 'Viajante';
            // Tentar traduzir o rótulo da faixa (ADULT, CHILD, INFANT, TRAVELER)
            $translated_band_label = viator_t(strtolower($band['ageBand'] ?? ''));
            if ($translated_band_label === strtolower($band['ageBand'] ?? '')) { // Se não houver tradução específica para ADULT, CHILD etc.
                 $translated_band_label = $band_label; // Usa o formatado em Title Case
            }

            // Usar função auxiliar para extrair quantidades
            $quantities = viator_extract_traveler_quantities($band, $pricing_info['type'] ?? null);
            $min_travelers = $quantities['min'];
            $max_travelers = $quantities['max'];
            
            // Lógica para valor padrão inicial
            $default_value = 0; // Padrão para a maioria
            if (($band['ageBand'] ?? '') === 'ADULT') {
                // Para adultos, definir 1 como padrão apenas se a quantidade mínima permitir
                $default_value = max(1, $min_travelers);
            } elseif ($min_travelers > 0) {
                // Se há uma quantidade mínima obrigatória, usar ela como padrão
                $default_value = $min_travelers;
            }

            $age_bands_display_data[] = [
                'label' => sprintf(viator_t('traveler_age_band'), esc_html($translated_band_label), (isset($band['startAge']) ? intval($band['startAge']) : 0), (isset($band['endAge']) ? intval($band['endAge']) : 99)),
                'min_max' => sprintf(viator_t('min_max_travelers'), $min_travelers, ($max_travelers !== null ? $max_travelers : 'N/A')),
                // Adicionando dados brutos para os data-attributes com verificação de existência
                'bandId' => $band['bandId'] ?? null,
                'ageBand' => $band['ageBand'] ?? null,
                'minTravelers' => $min_travelers,
                'maxTravelers' => $max_travelers,
                'startAge' => $band['startAge'] ?? null,
                'endAge' => $band['endAge'] ?? null,
                'default' => $default_value
            ];
            


            if ($max_travelers !== null) {
                // Esta é uma simplificação. O real total de viajantes pode depender das combinações de faixas.
                // Para uma frase geral, somar os máximos pode não ser preciso.
                // Usaremos o $max_travelers_overall se for tipo UNIT, ou o maior maxTravelersPerBooking de uma única faixa.
                if ($pricing_info && $pricing_info['type'] === 'UNIT') {
                    $total_max_travelers_possible = $max_travelers_overall; // Já calculado
                } else {
                    $total_max_travelers_possible = max($total_max_travelers_possible, $max_travelers);
                }
            }
        }
    }
    
    // Initialize flags variable
    $flags = isset($product['flags']) ? $product['flags'] : [];
    
    // If price is not available in product API response, try to get it from stored search results
    if (!$has_price_data || $price === 'Preço não disponível') {
        $stored_price_data = get_option('viator_product_' . $product_code . '_price');
        if ($stored_price_data && isset($stored_price_data['fromPrice'])) {
            $price = $locale_settings['currency_symbol'] . ' ' . number_format($stored_price_data['fromPrice'], 2, ',', '.');
            
            // If it's a special offer, also get the original price
            if (isset($stored_price_data['fromPriceBeforeDiscount']) && !empty($stored_price_data['fromPriceBeforeDiscount'])) {
                $original_price = $locale_settings['currency_symbol'] . ' ' . number_format($stored_price_data['fromPriceBeforeDiscount'], 2, ',', '.');
            }
        }
    }

    // Always check for stored flags and merge them after checking API/price data
    $stored_price_data = get_option('viator_product_' . $product_code . '_price'); // Re-fetch in case it wasn't fetched above
    if ($stored_price_data && isset($stored_price_data['flags']) && is_array($stored_price_data['flags'])) {
        $flags = array_unique(array_merge($flags, $stored_price_data['flags']));
    }

    // Set boolean flags based on the final $flags array
    $has_free_cancellation = in_array('FREE_CANCELLATION', $flags);
    $is_likely_to_sell_out = in_array('LIKELY_TO_SELL_OUT', $flags);
    $is_special_offer = in_array('SPECIAL_OFFER', $flags);
    
    // Get duration
    $duration = 'Duração não disponível';
    
    // Primeiro verifica se existe uma duração formatada em cache (criada pela função get_product_recommendations)
    $formatted_duration_cache_key = 'viator_product_' . $product_code . '_formatted_duration';
    $cached_formatted_duration = get_transient($formatted_duration_cache_key);
    
    if ($cached_formatted_duration !== false) {
        // Usa a duração formatada que está em cache
        $duration = $cached_formatted_duration;
    }
    // Se não encontrou no cache específico, tenta obter da resposta da API do produto - múltiplas estruturas
    else {
        $duration_fixed = null;
        $duration_from = null;
        $duration_to = null;
        $unstructured_duration = null;
        
                 // Tentar múltiplas estruturas de dados possíveis para duração (ordenadas por prioridade)
         if (isset($product['duration']['fixedDurationInMinutes'])) {
             $duration_fixed = $product['duration']['fixedDurationInMinutes'];
             $duration_from = isset($product['duration']['variableDurationFromMinutes']) ? $product['duration']['variableDurationFromMinutes'] : null;
             $duration_to = isset($product['duration']['variableDurationToMinutes']) ? $product['duration']['variableDurationToMinutes'] : null;
             $unstructured_duration = isset($product['duration']['unstructuredDuration']) ? $product['duration']['unstructuredDuration'] : null;
         } elseif (isset($product['itinerary']['duration']['fixedDurationInMinutes'])) {
             $duration_fixed = $product['itinerary']['duration']['fixedDurationInMinutes'];
             $duration_from = isset($product['itinerary']['duration']['variableDurationFromMinutes']) ? $product['itinerary']['duration']['variableDurationFromMinutes'] : null;
             $duration_to = isset($product['itinerary']['duration']['variableDurationToMinutes']) ? $product['itinerary']['duration']['variableDurationToMinutes'] : null;
             $unstructured_duration = isset($product['itinerary']['duration']['unstructuredDuration']) ? $product['itinerary']['duration']['unstructuredDuration'] : null;
         } elseif (isset($product['durationInMinutes'])) {
             $duration_fixed = $product['durationInMinutes'];
         } elseif (isset($product['fixedDurationInMinutes'])) {
             $duration_fixed = $product['fixedDurationInMinutes'];
         }
        
        if ($duration_fixed !== null) {
            // Usar a função existente de formatação de duração
            $duration = viator_format_duration($duration_fixed, $duration_from, $duration_to, $unstructured_duration);
            
                         // Armazena a duração formatada em cache para uso futuro
             set_transient($formatted_duration_cache_key, $duration, 7 * DAY_IN_SECONDS);
                  } else {
             // Debug: vamos logar as estruturas de dados que estão vindo da API
             viator_debug_log('Estruturas de duração não encontradas para produto ' . $product_code, [
                 'duration_exists' => isset($product['duration']),
                 'itinerary_duration_exists' => isset($product['itinerary']['duration']),
                 'durationInMinutes_exists' => isset($product['durationInMinutes']),
                 'product_keys' => array_keys($product)
             ]);
         }
         
         // Verifica se existe duração bruta em cache
        $duration_cache_key = 'viator_product_' . $product_code . '_duration';
        $cached_duration = get_transient($duration_cache_key);
        
        if ($cached_duration !== false) {
            // Formata a duração a partir dos dados em cache
            $duration_data = $cached_duration;
            
            if (isset($duration_data['fixedDurationInMinutes'])) {
                $duration_fixed = $duration_data['fixedDurationInMinutes'];
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
                
                // Armazena a duração formatada em cache
                set_transient($formatted_duration_cache_key, $duration, 7 * DAY_IN_SECONDS);
            }
        } else {
            // Se não encontrar no cache, tenta obter dos dados armazenados em options
            $stored_data = get_option('viator_product_' . $product_code . '_price');
            
            if ($stored_data && isset($stored_data['duration']) && $stored_data['duration'] !== 'Duração não disponível') {
                // Usa a duração formatada que foi armazenada durante a pesquisa
                $duration = $stored_data['duration'];
                
                // Armazena em cache para uso futuro
                set_transient($formatted_duration_cache_key, $duration, 7 * DAY_IN_SECONDS);
            } elseif ($stored_data && isset($stored_data['duration_data'])) {
                // Se tiver os dados brutos de duração, formata usando a mesma lógica dos cards
                $duration_data = $stored_data['duration_data'];
                $duration_fixed = $duration_data['fixedDurationInMinutes'];
                $duration_from = $duration_data['variableDurationFromMinutes'];
                $duration_to = $duration_data['variableDurationToMinutes'];
                $unstructured_duration = $duration_data['unstructuredDuration'];
                
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
                }
                
                // Armazena em cache para uso futuro
                set_transient($formatted_duration_cache_key, $duration, 7 * DAY_IN_SECONDS);
            }
        }
    }
    
    // Get images
    $images = [];
    if (isset($product['images']) && is_array($product['images'])) {
        foreach ($product['images'] as $image) {
            if (isset($image['variants']) && !empty($image['variants'])) {
                // Get the highest quality image available
                // Sort variants by size to ensure we get the highest resolution
                $variants = $image['variants'];
                usort($variants, function($a, $b) {
                    // If width or height is available, sort by area (width * height)
                    if (isset($a['width']) && isset($a['height']) && isset($b['width']) && isset($b['height'])) {
                        return ($b['width'] * $b['height']) - ($a['width'] * $a['height']);
                    }
                    // Otherwise sort by array position (assuming higher index = higher quality)
                    return count($image['variants']) - array_search($a, $image['variants']) - array_search($b, $image['variants']);
                });
                
                $image_url = $variants[0]['url'];
                $images[] = $image_url;
            }
        }
    }
    
    // Get inclusions and exclusions
    $inclusions = isset($product['inclusions']) ? $product['inclusions'] : [];
    $exclusions = isset($product['exclusions']) ? $product['exclusions'] : [];
    
    // Get booking questions
    $booking_questions = isset($product['bookingQuestions']) ? $product['bookingQuestions'] : [];
    
    // Get itinerary
    $itinerary = isset($product['itinerary']) ? $product['itinerary'] : [];
    
    // Get additional info
    $additional_info = isset($product['additionalInfo']) ? $product['additionalInfo'] : [];
    
    // Get cancellation policy
    $cancellation_policy = isset($product['cancellationPolicy']) ? $product['cancellationPolicy'] : [];
    
    // Get location
    $location = isset($product['location']) ? $product['location'] : [];
    $destination = isset($location['address']['destination']) ? $location['address']['destination'] : '';
    
    // Get traveler pickup info
    $traveler_pickup = isset($product['travelerPickup']) ? $product['travelerPickup'] : [];
    
    // Get available options
    $available_options = isset($product['availableOptions']) ? $product['availableOptions'] : [];
    
    // Get timezone
    $timezone = isset($product['timeZone']) ? $product['timeZone'] : '';
    
    // Get language guides
    $language_guides = isset($product['languageGuides']) ? $product['languageGuides'] : [];
    
    // Get logistics and special instructions
    $logistics = isset($product['logistics']) ? $product['logistics'] : [];
    $special_instructions = isset($product['specialInstructions']) ? $product['specialInstructions'] : [];
    
    // Get tags and process them to get human-readable names
    $raw_tags = isset($product['tags']) ? $product['tags'] : [];
    $tags = viator_process_tags_for_display($raw_tags);

    // Comentado para resolver erro de chave não correspondente
    /*
    error_log('--- Debugging Flags ---');
    error_log('Product Code: ' . $product_code);
    error_log('Flags Array: ' . print_r($flags, true));
    error_log('Has Free Cancellation: ' . ($has_free_cancellation ? 'true' : 'false'));
    error_log('Is Likely to Sell Out: ' . ($is_likely_to_sell_out ? 'true' : 'false'));
    error_log('Is Special Offer: ' . ($is_special_offer ? 'true' : 'false'));
    echo '<pre style="background: #eee; padding: 10px; border: 1px solid #ccc; margin: 10px 0; font-size: 12px; white-space: pre-wrap; word-wrap: break-word;">Debug Flags (Final Check):<br>';
    echo 'Flags Array: '; var_dump($flags);
    echo 'Has Free Cancellation: '; var_dump($has_free_cancellation);
    echo 'Is Likely to Sell Out: '; var_dump($is_likely_to_sell_out);
    echo 'Is Special Offer: '; var_dump($is_special_offer);
    echo '</pre>';
    */
    
    // Start HTML output
    ob_start();
    ?>
    <div class="viator-product-detail">
        <!-- Breadcrumbs -->
        <div class="viator-breadcrumbs" style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <a href="<?php echo esc_url(home_url()); ?>" target="_blank"><?php echo esc_html(viator_t('home')); ?></a> &gt; 
                <?php if (!empty($destination)): ?>
                    <a href="<?php echo esc_url(add_query_arg('viator_query', urlencode($destination), home_url())); ?>" target="_blank">
                        <?php echo esc_html($destination); ?>
                    </a> &gt; 
                <?php endif; ?>
                <span><?php echo esc_html($title); ?></span>
            </div>
        </div>
        
        <!-- Tags Carousel -->
        <?php if (!empty($tags)): ?>
            <div class="viator-tags-carousel">
                <div class="viator-tags-container">
                    <div class="viator-tags-scroll">
                        <?php foreach ($tags as $tag): ?>
                            <span class="viator-tag-chip"><?php echo esc_html($tag); ?></span>
                        <?php endforeach; ?>
                    </div>
                    <button class="viator-tags-scroll-btn viator-tags-scroll-left" aria-label="Scroll left">
                        &lt;
                    </button>
                    <button class="viator-tags-scroll-btn viator-tags-scroll-right" aria-label="Scroll right">
                        &gt;
                    </button>
                </div>
            </div>
        <?php endif; ?>
        
        <!-- Título do produto -->
        <h1><?php echo esc_html($title); ?></h1>
    
        <div class="viator-product-container">
            <!-- Image Gallery -->
            <div class="viator-product-gallery">
                <?php if (!empty($images)): ?>
                    <div class="viator-main-image">
                        <img src="<?php echo esc_url($images[0]); ?>" alt="<?php echo esc_attr($title); ?>">
                        <!-- Flags/Badges fixos sobre a imagem principal -->
                        <div class="viator-badge-container">
                            <?php if ($has_free_cancellation): ?>
                                <span class="viator-badge" data-type="free-cancellation"><?php echo esc_html(viator_t('free_cancellation_badge')); ?></span>
                            <?php endif; ?>
                            <?php if ($is_likely_to_sell_out): ?>
                                <span class="viator-badge" data-type="sell-out"><?php echo esc_html(viator_t('likely_to_sell_out_badge')); ?></span>
                            <?php endif; ?>
                            <?php if ($is_special_offer): ?>
                                <span class="viator-badge" data-type="special-offer"><?php echo esc_html(viator_t('special_offer_badge')); ?></span>
                            <?php endif; ?>
                        </div>
                    </div>
                    <?php if (count($images) > 1): ?>
                        <div class="viator-thumbnails">
                            <?php foreach ($images as $index => $image_url): ?>
                                <div class="viator-thumbnail<?php echo $index === 0 ? ' active' : ''; ?>">
                                    <img src="<?php echo esc_url($image_url); ?>" alt="<?php echo esc_attr($title); ?>">
                                </div>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>
                <?php endif; ?>
                
                <?php echo $unit_service_html; // Nova seção de informação do tipo de unidade AQUI DENTRO DA GALLERY ?>
            </div> <!-- Fim viator-product-gallery -->

            <div class="viator-product-info-container">
                <!-- Product Header -->
                <div class="viator-product-header">
                    <!-- Código do produto -->
                    <span style="margin-bottom: 10px; display: inline-block;">
                        <?php echo esc_html(viator_t('product_code')); ?>: <span class="product-code-tooltip" style="position: relative; cursor: help; display: inline-block;">
                            <strong><?php echo esc_html($product_code); ?></strong>
                            <span class="tooltip-text">
                            <?php echo esc_html(viator_t('tooltip_support')); ?>
                            </span>
                        </span>
                        <button class="copy-product-code-btn" onclick="copyProductCode('<?php echo esc_js($product_code); ?>')" title="<?php echo esc_attr(viator_t('copy_product_code')); ?>" style="background: none; border: none; cursor: pointer; margin-left: 8px; padding: 4px; border-radius: 4px; transition: background-color 0.2s ease;">
                            <svg class="copy-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 9H11C9.89543 9 9 9.89543 9 11V20C9 21.1046 9.89543 22 11 22H20C21.1046 22 22 21.1046 22 20V11C22 9.89543 21.1046 9 20 9Z" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M5 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H13C13.5304 2 14.0391 2.21071 14.4142 2.58579C14.7893 2.96086 15 3.46957 15 4V5" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <svg class="check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: none;">
                                <path d="M20 6L9 17L4 12" stroke="#28a745" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                        <span class="copy-feedback-message" style="margin-left: 8px; opacity: 0; transition: opacity 0.3s ease; font-size: 14px; color: #28a745; font-weight: 500;"></span>
                    </span>
                    
                    <!-- Rating and Reviews -->
                    <div class="viator-product-rating">
                        <span class="viator-stars">
                            <?php 
                            $full_stars = floor($rating);
                            $half_star = ($rating - $full_stars) >= 0.5;
                            
                            for ($i = 1; $i <= 5; $i++) {
                                if ($i <= $full_stars) {
                                    echo '★'; // Full star
                                } elseif ($i == $full_stars + 1 && $half_star) {
                                    echo '★'; // Half star - using the same character for consistency
                                } else {
                                    echo '☆'; // Empty star
                                }
                            }
                            ?>
                        </span>
                        <?php if ($rating > 0): ?>
                            <span class="viator-rating-number"><?php echo number_format($rating, 1); ?></span>
                            <a href="#viator-reviews" class="viator-review-count">(<?php echo $review_count; ?> <?php echo $review_count == 1 ? viator_t('review') : viator_t('reviews'); ?>)</a>
                        <?php else: ?>
                            <span class="viator-review-count"><?php echo esc_html(viator_t('no_reviews')); ?></span>
                        <?php endif; ?>
                    </div>
    

    
                    <!-- Price Section -->
                    <div class="viator-product-price-section">
                        <?php if (!empty($original_price) && $is_special_offer): ?>
                            <div class="viator-product-original-price"><?php echo esc_html($original_price); ?></div>
                        <?php endif; ?>
                        <div class="viator-product-price"><?php echo esc_html($price); ?></div>
                        <div class="viator-product-price-note"><?php echo esc_html($price_note_text); ?></div>
                    </div>
                </div>

                <!-- Quick Info -->
                <div class="viator-quick-info">
                    <div class="viator-info-item">
                        <span class="viator-info-label"><?php echo esc_html(viator_t('duration')); ?>:</span>
                        <span class="viator-info-value"><?php echo esc_html($duration); ?></span>
                    </div>
                    <?php if (!empty($timezone)): ?>
                        <div class="viator-info-item">
                            <span class="viator-info-label"><?php echo esc_html(viator_t('timezone')); ?>:</span>
                            <span class="viator-info-value"><?php echo esc_html($timezone); ?></span>
                        </div>
                    <?php endif; ?>
                    <?php if (!empty($destination)): ?>
                        <div class="viator-info-item">
                            <span class="viator-info-label"><?php echo esc_html(viator_t('location')); ?>:</span>
                            <span class="viator-info-value"><?php echo esc_html($destination); ?></span>
                        </div>
                    <?php endif; ?>
                </div>

                <!-- Traveler Information Section -->
                <?php if (!empty($age_bands_display_data)): ?>
                <div class="viator-traveler-info-section">
                    <h4><?php echo esc_html(viator_t('traveler_info_title')); ?></h4>
                    <?php if ($total_max_travelers_possible > 0): ?>
                        <p class="total-travelers-note"><?php echo sprintf(esc_html(viator_t('total_travelers_info')), $total_max_travelers_possible); ?></p>
                    <?php endif; ?>
                    <ul class="age-bands-list">
                        <?php foreach ($age_bands_display_data as $band_data): ?>
                            <li data-band-id="<?php echo esc_attr($band_data['bandId']); ?>"
                                data-age-band="<?php echo esc_attr($band_data['ageBand']); ?>"
                                data-min-travelers="<?php echo esc_attr($band_data['minTravelers']); ?>"
                                data-max-travelers="<?php echo esc_attr($band_data['maxTravelers']); ?>"
                                data-start-age="<?php echo esc_attr($band_data['startAge']); ?>"
                                data-end-age="<?php echo esc_attr($band_data['endAge']); ?>"
                                data-default-value="<?php echo esc_attr($band_data['default']); ?>">
                                <span class="age-band-label"><?php echo esc_html($band_data['label']); ?></span>
                                <span class="age-band-min-max"><?php echo esc_html($band_data['min_max']); ?></span>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                </div>
                <?php endif; ?>
    
                <!-- Botão de Verificar Disponibilidade -->
                <button class="button-check-availability" data-product-code="<?php echo esc_attr($product_code); ?>"><?php echo esc_html(viator_t('check_availability')); ?></button>
            </div>
        </div>
    
        <!-- Product Description -->
        <div class="viator-product-description">
            <h2><?php echo esc_html(viator_t('description')); ?></h2>
            <?php echo wpautop($description); ?>
        </div>
    
        <!-- Logistics and Special Instructions -->
        <?php if (!empty($logistics) || !empty($special_instructions)): ?>
            <div class="viator-logistics-section">
                <h2><?php echo esc_html(viator_t('logistics_info')); ?></h2>
                <?php if (!empty($logistics)): ?>
                    <div class="viator-logistics">
                        <?php foreach ($logistics as $logistic): ?>
                            <div class="viator-logistic-item">
                                <?php 
                                if (is_array($logistic)) {
                                    $logistic = implode(" ", array_map('strval', array_filter($logistic, function($item) {
                                        return !is_array($item);
                                    })));
                                }
                                
                                // Mapeamento de códigos logísticos para mensagens amigáveis em português
                                $logistics_codes = [
                                    'MEET_EVERYONE_AT_START_POINT' => 'Encontro no ponto de partida',
                                    'PICKUP_EVERYONE' => 'Serviço de transporte para todos os participantes',
                                    'PICKUP_POINT' => 'Ponto de embarque',
                                    'PICKUP_HOTEL' => 'Busca no hotel',
                                    'PICKUP_AND_MEET_AT_START_POINT' => 'Serviço de transporte e encontro no ponto de partida',
                                    'ATTRACTION_START_POINT' => 'Ponto de partida da atração',
                                    'NONE' => ''
                                ];
                                
                                // Substituir códigos conhecidos por mensagens amigáveis
                                foreach ($logistics_codes as $code => $friendly_message) {
                                    if (strpos($logistic, $code) !== false) {
                                        $logistic = str_replace($code, $friendly_message, $logistic);
                                    }
                                }
                                
                                // Remove códigos de identificação como 'NONE', 'PICKUP_EVERYONE', 'PICKUP_AND_MEET_AT_START_POINT' seguidos de números ou sozinhos
                                $logistic = preg_replace('/^\s*(NONE|PICKUP_EVERYONE|PICKUP_POINT|PICKUP_HOTEL|PICKUP_AND_MEET_AT_START_POINT)(\s+\d+(?:\s+\d+)?\s*\*?\s*|\s+|$)/im', '', $logistic);
                                
                                // Garantir que não haja 'NONE' isolado no início de qualquer linha
                                $logistic = preg_replace('/^\s*NONE\s*/m', '', $logistic);
                                
                                // Preserva os marcadores de lista (*) no início das linhas
                                $logistic = preg_replace('/^\*\s*/m', '* ', $logistic);
                                
                                echo wpautop(esc_html($logistic)); 
                                ?>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
                <?php if (!empty($special_instructions)): ?>
                    <div class="viator-special-instructions">
                        <h3><?php echo esc_html(viator_t('special_instructions')); ?></h3>
                        <?php foreach ($special_instructions as $instruction): ?>
                            <div class="viator-instruction-item">
                                <?php 
                                if (is_array($instruction)) {
                                    $instruction = implode(" ", array_map('strval', array_filter($instruction, function($item) {
                                        return !is_array($item);
                                    })));
                                }
                                
                                // Remove códigos de identificação como 'NONE', 'PICKUP_EVERYONE', 'PICKUP_AND_MEET_AT_START_POINT' seguidos de números
                                $instruction = preg_replace('/^(NONE|PICKUP_EVERYONE|PICKUP_POINT|PICKUP_HOTEL|PICKUP_AND_MEET_AT_START_POINT)\s+\d+(?:\s+\d+)?\s*\*?\s*/i', '', $instruction);
                                
                                // Preserva os marcadores de lista (*) no início das linhas
                                $instruction = preg_replace('/^\*\s*/m', '* ', $instruction);
                                
                                echo wpautop(esc_html($instruction)); 
                                ?>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </div>
        <?php endif; ?>
    
        <!-- Locations Section -->
        <?php 
        $structured_locations = viator_get_structured_product_locations($product);
        $all_location_refs = array_merge(
            array_map(function($l) { return $l['ref']; }, $structured_locations['start']),
            array_map(function($l) { return $l['ref']; }, $structured_locations['end']),
            array_map(function($l) { return $l['ref']; }, $structured_locations['unspecified'])
        );
        $all_location_refs = array_unique($all_location_refs);

        if (!empty($all_location_refs)):
            $bulk_details_map = [];
            $bulk_details = viator_get_bulk_locations($all_location_refs);
            foreach ($bulk_details as $detail) {
                $bulk_details_map[$detail['reference']] = $detail;
            }
        ?>
            <div class="viator-locations-section">
                <h2><?php echo esc_html(viator_t('locations_info')); ?></h2>
                
                <?php foreach (['start', 'end', 'unspecified'] as $group_key): ?>
                    <?php if (!empty($structured_locations[$group_key])): ?>
                        <div class="viator-location-group">
                            <h3 class="viator-location-group-title">
                                <?php 
                                if ($group_key === 'start') echo esc_html(viator_t('location_start'));
                                elseif ($group_key === 'end') echo esc_html(viator_t('location_end'));
                                else echo esc_html(viator_t('location_unspecified'));
                                ?>
                            </h3>
                            <div class="viator-locations-grid">
                                <?php foreach ($structured_locations[$group_key] as $location_data): ?>
                                    <?php 
                                    $ref = $location_data['ref'];
                                    $details = $bulk_details_map[$ref] ?? null;
                                    
                                    // If no details were fetched, skip displaying this location
                                    if (!$details) continue;
                                    
                                    // Get user-friendly location name (never show LOC codes to users)
                                    $location_name = '';
                                    if (!empty($details['name'])) {
                                        $location_name = $details['name'];
                                    } else {
                                        // Translate special references to user-friendly text
                                        $location_name = viator_translate_location_reference($ref);
                                        // If translation returns the same LOC code, skip this location entirely
                                        if (strpos($location_name, 'LOC-') === 0) {
                                            continue;
                                        }
                                    }
                                    ?>
                                    <div class="viator-location-item">
                                        <div class="viator-location-icon">
                                            <?php echo viator_get_location_icon($details); ?>
                                        </div>
                                        <div class="viator-location-content">
                                            <div class="viator-location-name">
                                                <?php echo esc_html($location_name); ?>
                                            </div>

                                            <?php if (!empty($location_data['description'])): ?>
                                                <div class="viator-location-product-description">
                                                    <p><?php echo esc_html($location_data['description']); ?></p>
                                                </div>
                                            <?php endif; ?>

                                            <?php if (isset($details['address']) && !empty(viator_format_location_address($details['address']))): ?>
                                                <div class="viator-location-address">
                                                    <?php echo esc_html(viator_format_location_address($details['address'])); ?>
                                                </div>
                                            <?php endif; ?>
                                            
                                            <?php if (isset($details['center']) && !empty($details['center'])): ?>
                                                <div class="viator-location-coordinates">
                                                    <small>
                                                        <?php echo esc_html(viator_t('coordinates')); ?>: 
                                                        <?php echo esc_html($details['center']['latitude']); ?>, 
                                                        <?php echo esc_html($details['center']['longitude']); ?>
                                                    </small>
                                                </div>
                                                <div class="viator-location-actions">
                                                    <a href="https://www.google.com/maps/search/?api=1&query=<?php echo esc_attr($details['center']['latitude']); ?>,<?php echo esc_attr($details['center']['longitude']); ?>" 
                                                       target="_blank" 
                                                       rel="noopener noreferrer" 
                                                       class="viator-maps-link">
                                                        <?php echo esc_html(viator_t('view_on_maps')); ?>
                                                    </a>
                                                </div>
                                            <?php endif; ?>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            </div>
                        </div>
                    <?php endif; ?>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    
        <!-- Inclusions and Exclusions -->
        <div class="viator-inclusions-exclusions">
            <?php if (!empty($inclusions)): ?>
                <div class="viator-inclusions">
                    <h2><?php echo esc_html(viator_t('included')); ?></h2>
                    <ul>
                        <?php foreach ($inclusions as $inclusion): ?>
                            <?php if (is_array($inclusion) && (isset($inclusion['otherDescription']) || isset($inclusion['description']))): ?>
                                <li>
                                <?php 
                                    // Obter a descrição da inclusão
                                    $inclusion_text = '';
                                    if (isset($inclusion['otherDescription'])) {
                                        $inclusion_text = $inclusion['otherDescription'];
                                    } elseif (isset($inclusion['description'])) {
                                        $inclusion_text = $inclusion['description'];
                                    }
                                    
                                    // Dicionário de traduções para inclusões comuns
                                    $inclusion_translations = [
                                        'Local guide' => 'Guia local',
                                        'Professional guide' => 'Guia profissional',
                                        'Hotel pickup and drop-off' => 'Serviço de busca e entrega no hotel',
                                        'Hotel pickup and drop-off (selected hotels only)' => 'Serviço de busca e entrega no hotel (apenas hotéis selecionados)',
                                        'Transport by air-conditioned coach' => 'Transporte em ônibus com ar-condicionado',
                                        'Transport by air-conditioned minivan' => 'Transporte em van com ar-condicionado',
                                        'Entry/Admission' => 'Entrada/Ingresso',
                                        'All taxes, fees and handling charges' => 'Todos os impostos, taxas e encargos',
                                        'Bottled water' => 'Água engarrafada',
                                        'Coffee and/or Tea' => 'Café e/ou chá',
                                        'Alcoholic Beverages' => 'Bebidas alcoólicas',
                                        'Snacks' => 'Lanches',
                                        'Lunch' => 'Almoço',
                                        'Dinner' => 'Jantar',
                                        'Breakfast' => 'Café da manhã',
                                        'WiFi on board' => 'WiFi a bordo',
                                        'Gorjetas' => 'Gorjetas',
                                        'Private tour' => 'Tour privado',
                                        'Small-group tour' => 'Tour em pequeno grupo',
                                        'Use of bicycle' => 'Uso de bicicleta',
                                        'Use of helmet' => 'Uso de capacete'
                                    ];
                                    
                                    // Verificar se a inclusão tem uma tradução disponível
                                    echo esc_html(isset($inclusion_translations[$inclusion_text]) ? 
                                        $inclusion_translations[$inclusion_text] : 
                                        $inclusion_text);
                                ?>
                                </li>
                            <?php endif; ?>
                        <?php endforeach; ?>
                    </ul>
                </div>
            <?php endif; ?>
            <?php if (!empty($exclusions)): ?>
                <div class="viator-exclusions">
                    <h2><?php echo esc_html(viator_t('not_included')); ?></h2>
                    <ul>
                        <?php foreach ($exclusions as $exclusion): ?>
                            <?php if (is_array($exclusion) && (isset($exclusion['otherDescription']) || isset($exclusion['description']))): ?>
                                <li>
                                <?php 
                                    // Obter a descrição da exclusão
                                    $exclusion_text = '';
                                    if (isset($exclusion['otherDescription'])) {
                                        $exclusion_text = $exclusion['otherDescription'];
                                    } elseif (isset($exclusion['description'])) {
                                        $exclusion_text = $exclusion['description'];
                                    }
                                    
                                    // Dicionário de traduções para exclusões comuns
                                    $exclusion_translations = [
                                        'Food and drinks' => 'Comidas e bebidas',
                                        'Drinks' => 'Bebidas',
                                        'Food' => 'Comida',
                                        'Alcoholic drinks' => 'Bebidas alcoólicas',
                                        'Gorjetas' => 'Gorjetas',
                                        'Hotel pickup and drop-off' => 'Serviço de busca e entrega no hotel',
                                        'Transportation to/from attractions' => 'Transporte de/para atrações',
                                        'Souvenir photos' => 'Fotos de lembrança',
                                        'DVD (available to purchase)' => 'DVD (disponível para compra)',
                                        'Entrance fees' => 'Taxas de entrada',
                                        'Lunch' => 'Almoço',
                                        'Dinner' => 'Jantar',
                                        'Breakfast' => 'Café da manhã',
                                        'Guide' => 'Guia',
                                        'Hotel drop-off' => 'Entrega no hotel',
                                        'Hotel pickup' => 'Busca no hotel'
                                    ];
                                    
                                    // Verificar se a exclusão tem uma tradução disponível
                                    echo esc_html(isset($exclusion_translations[$exclusion_text]) ? 
                                        $exclusion_translations[$exclusion_text] : 
                                        $exclusion_text);
                                ?>
                                </li>
                            <?php endif; ?>
                        <?php endforeach; ?>
                    </ul>
                </div>
            <?php endif; ?>
        </div>

        <!-- Additional Info -->
        <?php if (!empty($additional_info)): ?>
            <div class="viator-additional-info-section">
                <h2><?php echo esc_html(viator_t('additional_info')); ?></h2>
                <div class="viator-additional-info">
                    <?php 
                    // Agrupar informações adicionais por tipo
                    $grouped_info = [];
                    $other_info = [];
                    
                    // Separar os tipos 'OTHER' dos demais tipos
                    foreach ($additional_info as $info) {
                        if (isset($info['type']) && isset($info['description'])) {
                            if ($info['type'] === 'OTHER') {
                                $other_info[] = $info;
                            } else {
                                $grouped_info[] = $info;
                            }
                        }
                    }
                    
                    // Adicionar os tipos 'OTHER' ao final
                    $grouped_info = array_merge($grouped_info, $other_info);
                    
                    foreach ($grouped_info as $info): ?>
                        <?php if (isset($info['type']) && isset($info['description'])): ?>
                            <div class="viator-info-section">
                                <div class="viator-info-icon">
                                    <?php 
                                    // Definir ícones para cada tipo de informação adicional
                                    $info_type = $info['type'];
                                    $info_icons = [
                                        'STROLLER_ACCESSIBLE' => '<img width="24" height="24" src="https://img.icons8.com/android/24/stroller.png" alt="stroller"/>',
                                        'PETS_WELCOME' => '🐾',
                                        'PUBLIC_TRANSPORTATION_NEARBY' => '🚌',
                                        'PHYSICAL_EASY' => '💪🏻',
                                        'PHYSICAL_MODERATE' => '🚶',
                                        'PHYSICAL_STRENUOUS' => '🏃',
                                        'WHEELCHAIR_ACCESSIBLE' => '♿',
                                        'TRANSPORTATION_WHEELCHAIR_ACCESSIBLE' => '♿',
                                        'SURFACES_WHEELCHAIR_ACCESSIBLE' => '<img width="30" height="30" src="https://img.icons8.com/plasticine/30/wheelchair-ramp.png" alt="wheelchair-ramp"/>',
                                        'INFANT_FRIENDLY' => '🍼',
                                        'INFANT_SEATS_AVAILABLE' => '👶',
                                        'INFANTS_MUST_SIT_ON_LAPS' => '<img width="48" height="48" src="https://img.icons8.com/color/48/tummy-time.png" alt="tummy-time"/>',
                                        'KID_FRIENDLY' => '👨‍👩‍👧‍👦',
                                        'SENIOR_FRIENDLY' => '🧓',
                                        'PICKUP_AVAILABLE' => '🚐',
                                        'SHOPPING_OPPORTUNITY' => '🛍️',
                                        'VEGETARIAN_OPTION' => '🥗',
                                        'SKIP_THE_LINE' => '⏩',
                                        'PRIVATE_TOUR' => '👤',
                                        'NO_PREGNANT' => '🚫',
                                        'NO_HEART_PROBLEMS' => '🚫',
                                        'NO_BACK_PROBLEMS' => '🚫',
                                        'GROUP_TOUR' => '👥'
                                    ];
                                    echo isset($info_icons[$info_type]) ? $info_icons[$info_type] : '📌';
                                    ?>
                                </div>
                                <div class="viator-info-content">
                                    <div class="viator-info-type">
                                        <?php 
                                        // Mapear os tipos de informações adicionais para as chaves de tradução
                                        $info_type_mapping = [
                                            'STROLLER_ACCESSIBLE' => 'stroller_accessible',
                                            'PETS_WELCOME' => 'pets_welcome', 
                                            'PUBLIC_TRANSPORTATION_NEARBY' => 'public_transportation_nearby',
                                            'PHYSICAL_EASY' => 'physical_easy',
                                            'PHYSICAL_MEDIUM' => 'physical_medium',
                                            'PHYSICAL_MODERATE' => 'physical_moderate',
                                            'PHYSICAL_STRENUOUS' => 'physical_strenuous',
                                            'WHEELCHAIR_ACCESSIBLE' => 'wheelchair_accessible',
                                            'SURFACES_WHEELCHAIR_ACCESSIBLE' => 'surfaces_wheelchair_accessible',
                                            'TRANSPORTATION_WHEELCHAIR_ACCESSIBLE' => 'transportation_wheelchair_accessible',
                                            'INFANT_FRIENDLY' => 'infant_friendly',
                                            'INFANT_SEATS_AVAILABLE' => 'infant_seats_available',
                                            'KID_FRIENDLY' => 'kid_friendly',
                                            'SENIOR_FRIENDLY' => 'senior_friendly',
                                            'INFANTS_MUST_SIT_ON_LAPS' => 'infants_must_sit_on_laps',
                                            'NO_PREGNANT' => 'no_pregnant',
                                            'NO_HEART_PROBLEMS' => 'no_heart_problems',
                                            'NO_BACK_PROBLEMS' => 'no_back_problems',
                                            'HEALTH_OTHER' => 'health_other',
                                            'PICKUP_AVAILABLE' => 'pickup_available',
                                            'SHOPPING_OPPORTUNITY' => 'shopping_opportunity',
                                            'VEGETARIAN_OPTION' => 'vegetarian_option',
                                            'SKIP_THE_LINE' => 'skip_the_line_info',
                                            'PRIVATE_TOUR' => 'private_tour_info',
                                            'GROUP_TOUR' => 'group_tour',
                                            'OTHER' => 'other_info'
                                        ];
                                        
                                        // Usar tradução dinâmica baseada no idioma configurado
                                        $translation_key = isset($info_type_mapping[$info_type]) ? $info_type_mapping[$info_type] : 'other_info';
                                        echo esc_html(viator_t($translation_key));
                                        ?>
                                    </div>
                                    <div class="viator-info-description">
                                        <?php 
                                        // Dicionário de traduções para descrições comuns
                                        $description_translations = [
                                            'Service animals allowed' => 'Animais de serviço permitidos',
                                            'Infants are required to sit on an adult\'s lap' => 'Bebês devem sentar no colo de um adulto',
                                            'Suitable for all physical fitness levels' => 'Adequado para todos os níveis de condicionamento físico',
                                            'Child rate applies only when sharing with 2 paying adults' => 'Tarifa infantil aplicável apenas quando compartilhando com 2 adultos pagantes',
                                            'Children must be accompanied by an adult' => 'Crianças devem estar acompanhadas por um adulto',
                                            // Adicione mais traduções conforme necessário
                                        ];
                                        
                                        // Verificar se a descrição tem uma tradução disponível
                                        $description = isset($description_translations[$info['description']]) ? 
                                            $description_translations[$info['description']] : 
                                            $info['description'];
                                            
                                        echo esc_html($description);
                                        ?>
                                    </div>
                                </div>
                            </div>
                        <?php endif; ?>
                    <?php endforeach; ?>
                </div>
            </div>
        <?php endif; ?>
    
        <!-- Cancellation Policy -->
        <?php if (!empty($cancellation_policy)): ?>
            <div class="viator-cancellation-section">
                <h2><?php echo esc_html(viator_t('cancellation_policy')); ?></h2>
                <?php 
                // Verifica se a política de cancelamento está no formato esperado com type e description
                if (isset($cancellation_policy['description'])) {
                    // Exibe apenas a descrição da política de cancelamento
                    echo wpautop(esc_html($cancellation_policy['description']));
                } elseif (is_array($cancellation_policy)) {
                    // Processo legado para outros formatos de array
                    $processed_policy = [];
                    foreach ($cancellation_policy as $policy) {
                        if (is_string($policy)) {
                            // Remove 'STANDARD' prefix e outros códigos técnicos
                            $clean_policy = preg_replace('/^(STANDARD|ALL_SALES_FINAL|FREE_CANCELLATION|[A-Z_]+)\s*/', '', $policy);
                            // Remove qualquer número ou texto 'Array' no final
                            $clean_policy = preg_replace('/\s+\d+\s+\d+\s+Array$/', '', $clean_policy);
                            if (!empty($clean_policy)) {
                                $processed_policy[] = $clean_policy;
                            }
                        }
                    }
                    $cancellation_policy = implode(" ", $processed_policy);
                    echo wpautop(esc_html($cancellation_policy));
                } elseif (is_string($cancellation_policy)) {
                    // Limpa códigos técnicos se já for uma string
                    $clean_policy = preg_replace('/^(STANDARD|ALL_SALES_FINAL|FREE_CANCELLATION|[A-Z_]+)\s*/', '', $cancellation_policy);
                    $clean_policy = preg_replace('/\s+\d+\s+\d+\s+Array$/', '', $clean_policy);
                    echo wpautop(esc_html($clean_policy));
                }
                ?>
            </div>
        <?php endif; ?>
    
        <!-- Language Guides -->
        <?php if (!empty($language_guides)): ?>
            <div class="viator-language-guides">
                <h2><?php echo esc_html(viator_t('available_languages')); ?></h2>
                <ul>
                    <?php foreach ($language_guides as $language): ?>
                        <li>
                            <?php 
                            // Check if language is an array and convert it to string if needed
                            if (is_array($language)) {
                                $language = implode(" ", array_map('strval', array_filter($language, function($item) {
                                    return !is_array($item);
                                })));
                            }
                            
                            // Convert language code to user-friendly name and determine service type
                            $service_type = '';
                            $language_code = '';
                            
                            // Check for GUIDE format (suporta códigos compostos como zh-tw)
                            if (preg_match('/GUIDE\s+([a-z]{2,3}(?:-[a-z]{2,3})?)\s+[a-z-]{2,6}\/SERVICE_GUIDE/i', $language, $matches)) {
                                $language_code = strtolower($matches[1]);
                                $service_type = viator_t('guide_service');
                            }
                            // Check for WRITTEN format (suporta códigos compostos como zh-tw)
                            elseif (preg_match('/WRITTEN\s+([a-z]{2,3}(?:-[a-z]{2,3})?)\s+[a-z-]{2,6}\/SERVICE_WRITTEN/i', $language, $matches)) {
                                $language_code = strtolower($matches[1]);
                                $service_type = viator_t('written_service');
                            }
                            // Check for AUDIO format (suporta códigos compostos como zh-tw)
                            elseif (preg_match('/AUDIO\s+([a-z]{2,3}(?:-[a-z]{2,3})?)\s+[a-z-]{2,6}\/SERVICE_AUDIO/i', $language, $matches)) {
                                $language_code = strtolower($matches[1]);
                                $service_type = viator_t('audio_service');
                            }
                            // Default fallback for other formats
                            else {
                                // Tentar extrair código de idioma usando regex mais abrangente
                                // Para casos como "AUDIO es es/SERVICE_AUDIO" e "AUDIO zh-tw zh-tw/SERVICE_AUDIO"
                                if (preg_match('/(?:GUIDE|WRITTEN|AUDIO)\s+([a-z]{2,3}(?:-[a-z]{2,3})?)\s+[a-z-]{2,6}?\/SERVICE_(?:GUIDE|WRITTEN|AUDIO)/i', $language, $matches)) {
                                    $language_code = strtolower($matches[1]);
                                } else {
                                    // Remove service type prefix and suffix para extrair o código
                                    $clean_language = preg_replace('/(?:GUIDE|WRITTEN|AUDIO)\s+|\s*\/.*$/i', '', $language);
                                    // Procura por códigos de idioma com possível hífen (ex: zh-tw)
                                    if (preg_match('/^([a-z]{2,3}(?:-[a-z]{2,3})?)/i', trim($clean_language), $matches)) {
                                        $language_code = strtolower($matches[1]);
                                    } else {
                                        $language_code = strtolower($clean_language);
                                    }
                                }
                                
                                // Try to determine service type from the string
                                if (stripos($language, 'SERVICE_GUIDE') !== false || stripos($language, 'GUIDE') !== false) {
                                    $service_type = viator_t('guide_service');
                                } elseif (stripos($language, 'SERVICE_WRITTEN') !== false || stripos($language, 'WRITTEN') !== false) {
                                    $service_type = viator_t('written_service');
                                } elseif (stripos($language, 'SERVICE_AUDIO') !== false || stripos($language, 'AUDIO') !== false) {
                                    $service_type = viator_t('audio_service');
                                } else {
                                    $service_type = viator_t('audio_service'); // padrão
                                }
                            }
                            $language_names = [
                                'pt' => 'Português',
                                'en' => 'Inglês',
                                'es' => 'Espanhol',
                                'fr' => 'Francês',
                                'de' => 'Alemão',
                                'it' => 'Italiano',
                                'ru' => 'Russo',
                                'ja' => 'Japonês',
                                'zh' => 'Chinês',
                                'zh-tw' => 'Chinês Tradicional',
                                'cmn' => 'Mandarim',
                                'ko' => 'Coreano',
                                'nl' => 'Holandês',
                                'sv' => 'Sueco',
                                'da' => 'Dinamarquês',
                                'no' => 'Norueguês',
                                'fi' => 'Finlandês',
                                'pl' => 'Polonês',
                                'tr' => 'Turco',
                                'ar' => 'Árabe',
                                'he' => 'Hebraico',
                                'hi' => 'Hindi',
                                'uk' => 'Ucraniano',
                                'th' => 'Tailandês',
                                'cs' => 'Tcheco',
                                'hu' => 'Húngaro',
                                'el' => 'Grego'
                            ];
                            
                            // Display language name with service type in parentheses if available
                            $display_name = isset($language_names[$language_code]) ? $language_names[$language_code] : ucfirst($language_code);
                            if (!empty($service_type)) {
                                $display_name .= ' (' . $service_type . ')';
                            }
                            echo esc_html($display_name);
                            ?>
                        </li>
                    <?php endforeach; ?>
                </ul>
            </div>
        <?php endif; ?>
    
        <!-- Reviews Section -->
        <div id="viator-reviews" class="viator-reviews">
            <h2><?php echo esc_html(viator_t('reviews_title')); ?> <span class="review-count">(<?php echo esc_html($review_count); ?> <?php echo $review_count == 1 ? viator_t('review') : viator_t('reviews'); ?>)</span></h2>
            
            <div class="viator-reviews-summary">
                <div class="viator-reviews-rating"><?php echo esc_html($rating); ?></div>
                <div class="viator-reviews-stars">
                    <?php 
                    // Display stars based on rating
                    $full_stars = floor($rating);
                    $half_star = ($rating - $full_stars) >= 0.5;
                    $empty_stars = 5 - $full_stars - ($half_star ? 1 : 0);
                    
                    // Output full stars
                    for ($i = 0; $i < $full_stars; $i++) {
                        echo '<span class="star">★</span>';
                    }
                    
                    // Output half star if needed
                    if ($half_star) {
                        echo '<span class="star">★</span>';
                    }
                    
                    // Output empty stars
                    for ($i = 0; $i < $empty_stars; $i++) {
                        echo '<span class="star" style="color: #ddd;">★</span>';
                    }
                    ?>
                </div>
            </div>
            
            <div class="viator-reviews-filter">
                <div class="viator-filter-ratings">
                    <button class="active" data-rating="all"><?php echo esc_html(viator_t('all_reviews')); ?></button>
                    <button data-rating="5">5 <?php echo esc_html(viator_t('stars')); ?></button>
                    <button data-rating="4">4 <?php echo esc_html(viator_t('stars')); ?></button>
                    <button data-rating="3">3 <?php echo esc_html(viator_t('stars')); ?></button>
                    <button data-rating="2">2 <?php echo esc_html(viator_t('stars')); ?></button>
                    <button data-rating="1">1 <?php echo esc_html(viator_t('star')); ?></button>
                </div>
                <div class="viator-filter-provider">
                    <select id="viator-filter-provider">
                        <option value="ALL"><?php echo esc_html(viator_t('all_providers')); ?></option>
                        <option value="VIATOR"><?php echo esc_html(viator_t('viator_only')); ?></option>
                        <option value="TRIPADVISOR"><?php echo esc_html(viator_t('tripadvisor_only')); ?></option>
                    </select>
                </div>
                <div class="viator-filter-sort">
                    <select id="viator-sort-reviews">
                        <option value="MOST_RECENT_PER_LOCALE"><?php echo esc_html(viator_t('most_recent')); ?></option>
                        <option value="HIGHEST_RATING_PER_LOCALE"><?php echo esc_html(viator_t('highest_rating')); ?></option>
                        <option value="MOST_HELPFUL_PER_LOCALE"><?php echo esc_html(viator_t('most_helpful')); ?></option>
                        <option value="MOST_RECENT"><?php echo esc_html(viator_t('most_recent')); ?> <?php echo esc_html(viator_t('all_languages')); ?></option>
                        <option value="HIGHEST_RATING"><?php echo esc_html(viator_t('highest_rating')); ?> <?php echo esc_html(viator_t('all_languages')); ?></option>
                        <option value="MOST_HELPFUL"><?php echo esc_html(viator_t('most_helpful')); ?> <?php echo esc_html(viator_t('all_languages')); ?></option>
                    </select>
                </div>
            </div>
            
            <div class="viator-reviews-list" data-product-code="<?php echo esc_attr($product_code); ?>">
                <div class="viator-reviews-loading"><?php echo esc_html(viator_t('loading_reviews')); ?></div>
            </div>
            
            <div class="viator-reviews-pagination"></div>
        </div>
        
        <!-- Recomendações -->
        <?php
        $recommended_products_data = get_product_recommendations($product_code);
        if (!empty($recommended_products_data)):
            $api_key = get_option('viator_api_key');
            $recommended_items = [];
            
            foreach ($recommended_products_data as $rec_product_code => $rec_product_info) {
                $url = "https://api.sandbox.viator.com/partner/products/{$rec_product_code}";
                $response = wp_remote_get($url, [
                    'headers' => [
                        'Accept'           => 'application/json;version=2.0',
                        'Content-Type'     => 'application/json;version=2.0',
                        'exp-api-key'      => $api_key,
                        'Accept-Language'  => $locale_settings['language'],
                    ],
                    'timeout' => 10,
                ]);

                if (!is_wp_error($response)) {
                    $body = wp_remote_retrieve_body($response);
                    $product = json_decode($body, true);

                    if (!empty($product) && isset($product['title'])) {
                                // Obter a imagem de melhor qualidade disponível
                        $best_image_url = '';
                        if (isset($product['images'][0]['variants']) && !empty($product['images'][0]['variants'])) {
                            // Ordenar variantes por tamanho para garantir a melhor resolução
                            $variants = $product['images'][0]['variants'];
                            usort($variants, function($a, $b) {
                                // Se largura e altura estiverem disponíveis, ordenar por área (largura * altura)
                                if (isset($a['width']) && isset($a['height']) && isset($b['width']) && isset($b['height'])) {
                                    return ($b['width'] * $b['height']) - ($a['width'] * $a['height']);
                                }
                                // Caso contrário, ordenar por posição no array (assumindo que índice maior = qualidade maior)
                                return count($product['images'][0]['variants']) - array_search($a, $product['images'][0]['variants']) - array_search($b, $product['images'][0]['variants']);
                            });
                            
                            $best_image_url = $variants[0]['url'];
                        }
                        
                        // Obter o preço do produto
                        $price = null;
                        $original_price = null;
                        
                        // Primeiro tenta obter o preço da resposta da API
                        if (isset($product['pricing']['summary']['fromPrice'])) {
                            $price = $product['pricing']['summary']['fromPrice'];
                            
                            // Se for uma oferta especial, também obtém o preço original
                            if (isset($product['pricing']['summary']['fromPriceBeforeDiscount'])) {
                                $original_price = $product['pricing']['summary']['fromPriceBeforeDiscount'];
                            }
                            
                            // Armazenar os dados de preço para uso futuro
                            $price_data = [
                                'fromPrice' => $price,
                                'fromPriceBeforeDiscount' => $original_price,
                                'flags' => isset($product['flags']) ? $product['flags'] : []
                            ];
                            update_option('viator_product_' . $rec_product_code . '_price', $price_data);
                        }
                        
                        // Se não encontrar na API, tenta obter dos dados armazenados
                        if ($price === null) {
                            // Buscar preço dos dados armazenados
                            $stored_price_data = get_option('viator_product_' . $rec_product_code . '_price');
                            if ($stored_price_data && isset($stored_price_data['fromPrice'])) {
                                $price = $stored_price_data['fromPrice'];
                                
                                // Se for uma oferta especial, também obtém o preço original
                                if (isset($stored_price_data['fromPriceBeforeDiscount']) && !empty($stored_price_data['fromPriceBeforeDiscount'])) {
                                    $original_price = $stored_price_data['fromPriceBeforeDiscount'];
                                }
                            }
                        }
                        
                        // Se ainda não tiver preço, tenta buscar diretamente da API de disponibilidade
                        if ($price === null) {
                            // Fazer uma requisição para a API de disponibilidade para obter o preço
                            $availability_url = "https://api.sandbox.viator.com/partner/availability/schedules";
                            $today = date('Y-m-d');
                            $next_year = date('Y-m-d', strtotime('+1 year'));
                            
                            $availability_body = [
                                'productCodes' => [$rec_product_code],
                                'fromDate' => $today,
                                'toDate' => $next_year,
                                'currency' => $locale_settings['currency'] // Adicionando parâmetro de moeda
                            ];
                            
                            $availability_response = wp_remote_post($availability_url, [
                                'headers' => [
                                    'Accept'           => 'application/json;version=2.0',
                                    'Content-Type'     => 'application/json;version=2.0',
                                    'exp-api-key'      => $api_key,
                                    'Accept-Language'  => $locale_settings['language'],
                                ],
                                'body'    => json_encode($availability_body),
                                'timeout' => 10,
                            ]);
                            
                            if (!is_wp_error($availability_response)) {
                                $availability_body = wp_remote_retrieve_body($availability_response);
                                $availability_data = json_decode($availability_body, true);
                                
                                if (!empty($availability_data) && isset($availability_data[0]['pricing']['summary']['fromPrice'])) {
                                    $price = $availability_data[0]['pricing']['summary']['fromPrice'];
                                    
                                    // Se for uma oferta especial, também obtém o preço original
                                    if (isset($availability_data[0]['pricing']['summary']['fromPriceBeforeDiscount'])) {
                                        $original_price = $availability_data[0]['pricing']['summary']['fromPriceBeforeDiscount'];
                                    }
                                    
                                    // Armazenar os dados de preço para uso futuro
                                    $price_data = [
                                        'fromPrice' => $price,
                                        'fromPriceBeforeDiscount' => $original_price,
                                        'flags' => isset($availability_data[0]['flags']) ? $availability_data[0]['flags'] : []
                                    ];
                                    update_option('viator_product_' . $rec_product_code . '_price', $price_data);
                                }
                            }
                        }
                        
                        // Se ainda não tiver preço, tenta buscar usando o endpoint search/freetext
                        if ($price === null) {
                            $search_url = "https://api.sandbox.viator.com/partner/search/freetext";
                            $search_body = [
                                "searchTerm" => $rec_product_code,
                                "productSorting" => ["sort" => "DEFAULT"],
                                "productFiltering" => [
                                    "dateRange" => [
                                        "from" => date('Y-m-d'),
                                        "to" => date('Y-m-d', strtotime('+1 year'))
                                    ],
                                    "price" => ["from" => 0, "to" => 5000],
                                    "rating" => ["from" => 0, "to" => 5],
                                    "includeAutomaticTranslations" => true
                                ],
                                "searchTypes" => [
                                    ["searchType" => "PRODUCTS", "pagination" => ["start" => 1, "count" => 1]],
                                ],
                                "currency" => $locale_settings['currency']
                            ];
                            
                            $search_response = wp_remote_post($search_url, [
                                'headers' => [
                                    'Accept'           => 'application/json;version=2.0',
                                    'Content-Type'     => 'application/json;version=2.0',
                                    'exp-api-key'      => $api_key,
                                    'Accept-Language'  => $locale_settings['language'],
                                ],
                                'body'    => json_encode($search_body),
                                'timeout' => 10,
                            ]);
                            
                            if (!is_wp_error($search_response)) {
                                $search_body = wp_remote_retrieve_body($search_response);
                                $search_data = json_decode($search_body, true);
                                
                                if (!empty($search_data) && isset($search_data['products']['results']) && !empty($search_data['products']['results'])) {
                                    foreach ($search_data['products']['results'] as $result) {
                                        if ($result['productCode'] === $rec_product_code && isset($result['pricing']['summary']['fromPrice'])) {
                                            $price = $result['pricing']['summary']['fromPrice'];
                                            
                                            // Se for uma oferta especial, também obtém o preço original
                                            if (isset($result['pricing']['summary']['fromPriceBeforeDiscount'])) {
                                                $original_price = $result['pricing']['summary']['fromPriceBeforeDiscount'];
                                            }
                                            
                                            // Armazenar os dados de preço para uso futuro
                                            $price_data = [
                                                'fromPrice' => $price,
                                                'fromPriceBeforeDiscount' => $original_price,
                                                'flags' => isset($result['flags']) ? $result['flags'] : []
                                            ];
                                            update_option('viator_product_' . $rec_product_code . '_price', $price_data);
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        
                        // Usar a duração formatada que já foi processada na função get_product_recommendations
                        $rec_formatted_duration = isset($rec_product_info['duration']) ? $rec_product_info['duration'] : 'Duração não disponível';
                        
                        // Armazenar a duração formatada em cache para uso futuro
                        $formatted_duration_cache_key = 'viator_product_' . $rec_product_code . '_formatted_duration';
                        set_transient($formatted_duration_cache_key, $rec_formatted_duration, 7 * DAY_IN_SECONDS);
                        
                        // Usar as flags que já foram processadas na função get_product_recommendations
                        $flags = isset($rec_product_info['flags']) ? $rec_product_info['flags'] : [];
                        
                        // Se não encontrou flags nos dados da recomendação, verificar nos dados de preço armazenados
                        if (empty($flags)) {
                            $stored_price_data = get_option('viator_product_' . $rec_product_code . '_price');
                            if ($stored_price_data && isset($stored_price_data['flags']) && is_array($stored_price_data['flags'])) {
                                $flags = $stored_price_data['flags'];
                            }
                        }
                        
                        // Se ainda não encontrou flags, usar as flags da resposta da API
                        if (empty($flags) && isset($product['flags']) && is_array($product['flags'])) {
                            $flags = $product['flags'];
                            
                            // Atualizar os dados armazenados com as flags
                            $stored_price_data = get_option('viator_product_' . $rec_product_code . '_price', []);
                            $stored_price_data['flags'] = $flags;
                            update_option('viator_product_' . $rec_product_code . '_price', $stored_price_data);
                        }
                        
                        $recommended_items[] = [
                            'code' => $rec_product_code,
                            'title' => $product['title'],
                            'image' => $best_image_url,
                            'price' => $price,
                            'original_price' => $original_price,
                            'is_special_offer' => ($original_price !== null && $original_price > $price),
                            'rating' => isset($product['reviews']['combinedAverageRating']) ? $product['reviews']['combinedAverageRating'] : 0,
                            'reviews' => isset($product['reviews']['totalReviews']) ? $product['reviews']['totalReviews'] : 0,
                            'duration' => $duration,
                            'formatted_duration' => $rec_formatted_duration,
                            'flags' => $flags // Adicionar as flags aos dados do item
                        ];

                    }
                }
            }

            if (!empty($recommended_items)):
            ?>
            <div class="viator-recommendations">
                <h2><?php echo esc_html(viator_t('you_might_like')); ?></h2>
                <div class="swiper-container viator-recommendations-slider">
                    <div class="swiper-button-prev"></div>
                    <div class="swiper-button-next"></div>
                    <div class="swiper-wrapper">
                        <?php foreach ($recommended_items as $item): ?>
                            <div class="swiper-slide">
                                <div class="viator-recommendation-card">
                                    <a href="<?php echo esc_url(home_url('/passeio/' . $item['code'] . '/')); ?>" class="viator-recommendation-link" target="_blank">
                                        <?php if (!empty($item['image'])): ?>
                                            <div class="viator-recommendation-image">
                                                <img src="<?php echo esc_url($item['image']); ?>" alt="<?php echo esc_attr($item['title']); ?>">
                                                <div class="viator-badge-container">
                                                    <?php 
                                                    // Processar flags - exibindo apenas LIKELY_TO_SELL_OUT e FREE_CANCELLATION
                                                    // A flag SPECIAL_OFFER já está sendo exibida de outra forma
                                                    if (isset($item['flags']) && is_array($item['flags'])) {
                                                        if (in_array('LIKELY_TO_SELL_OUT', $item['flags'])) {
                                                            echo '<span class="viator-badge" data-type="sell-out">' . esc_html(viator_t('likely_to_sell_out_badge')) . '</span>';
                                                        }
                                                        if (in_array('FREE_CANCELLATION', $item['flags'])) {
                                                            echo '<span class="viator-badge" data-type="free-cancellation">' . esc_html(viator_t('free_cancellation_badge')) . '</span>';
                                                        }
                                                    }
                                                    ?>
                                                </div>
                                            </div>
                                        <?php endif; ?>
                                        <div class="viator-recommendation-content">
                                            <h3 class="viator-recommendation-title"><?php echo esc_html($item['title']); ?></h3>
                                            <?php if (!empty($item['formatted_duration'])): ?>
                                                                        <div class="viator-recommendation-duration">
                            <img loading="lazy" decoding="async" src="https://img.icons8.com/?size=100&amp;id=82767&amp;format=png&amp;color=000000" alt="<?php echo esc_attr(viator_t('duration')); ?>" title="<?php echo esc_attr(viator_t('duration_approx')); ?>" width="15" height="15"> <?php echo esc_html($item['formatted_duration']); ?> <span><?php echo esc_html(viator_t('duration_approx_short')); ?></span>
                            </div>
                                            <?php endif; ?>
                                            <div class="viator-recommendation-rating">
                                                <div class="viator-stars">
                                                    <?php
                                                    $full_stars = floor($item['rating']);
                                                    $half_star = ($item['rating'] - $full_stars) >= 0.5;
                                                    $empty_stars = 5 - ceil($item['rating']);

                                                    for ($i = 0; $i < $full_stars; $i++) {
                                                        echo '<span class="star">★</span>';
                                                    }
                                                    if ($half_star) {
                                                        echo '<span class="star">★</span>';
                                                    }
                                                    for ($i = 0; $i < $empty_stars; $i++) {
                                                        echo '<span class="star" style="color: #ddd;">★</span>';
                                                    }
                                                    ?>
                                                </div>
                                                <span class="viator-recommendation-review-count">
                                                    <?php echo $item['reviews']; ?> <?php echo $item['reviews'] == 1 ? viator_t('review') : viator_t('reviews'); ?>
                                                </span>
                                            </div>
                                            <div class="viator-recommendation-price">
                                                <?php if (isset($item['price']) && $item['price'] !== null): ?>
                                                    <?php if ($item['is_special_offer']): ?>
                                                        <span class="viator-recommendation-original-price"><?php echo $locale_settings['currency_symbol']; ?> <?php echo number_format($item['original_price'], 2, ',', '.'); ?></span>
                                                        <span class="viator-recommendation-special-offer"><?php echo esc_html(viator_t('special_offer')); ?></span><br>
                                                    <?php endif; ?>
                                                    <strong><?php echo esc_html(viator_t('from_price')); ?> <?php echo $locale_settings['currency_symbol']; ?> <?php echo number_format($item['price'], 2, ',', '.'); ?></strong>
                                                <?php else: ?>
                                                    <strong><?php echo esc_html(viator_t('consult_availability')); ?></strong>
                                                <?php endif; ?>
                                            </div>
                                        </div>
                                    </a>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                    <div class="swiper-pagination"></div>
                </div>
            </div>
            <?php
            endif;
        endif;
        ?>


    </div>
    <?php
    // Get the buffered content and clean the buffer
    $output = ob_get_clean();
    return $output;
}

/**
 * Get raw product data for JavaScript
 */
function viator_get_product_data($product_code) {
    // Get API key from settings
    $api_key = get_option('viator_api_key');
    if (empty($api_key)) {
        error_log('🔍 [BOOKING QUESTIONS DEBUG] API key not found');
        return null;
    }
    
    // Obter configurações de idioma e moeda
    $locale_settings = viator_get_locale_settings();
    
    // API endpoint
    $url = add_query_arg('currencyCode', $locale_settings['currency'], "https://api.sandbox.viator.com/partner/products/{$product_code}");
    error_log('🔍 [BOOKING QUESTIONS DEBUG] Fetching product data from: ' . $url);
    
    // Make API request
    $response = wp_remote_get($url, [
        'headers' => [
            'Accept'           => 'application/json;version=2.0',
            'Content-Type'     => 'application/json;version=2.0',
            'exp-api-key'      => $api_key,
            'Accept-Language'  => $locale_settings['language'],
        ],
        'timeout' => 120,
    ]);
    
    // Check for errors
    if (is_wp_error($response)) {
        error_log('🔍 [BOOKING QUESTIONS DEBUG] API request error: ' . $response->get_error_message());
        return null;
    }
    
    // Parse response
    $body = wp_remote_retrieve_body($response);
    $product = json_decode($body, true);
    
    // Check if product exists
    if (empty($product) || isset($product['error'])) {
        error_log('🔍 [BOOKING QUESTIONS DEBUG] Product not found or API error for code: ' . $product_code);
        return null;
    }
    
    error_log('🔍 [BOOKING QUESTIONS DEBUG] Product data retrieved successfully for: ' . $product_code);
    error_log('🔍 [BOOKING QUESTIONS DEBUG] Product data keys: ' . implode(', ', array_keys($product)));
    
    return $product;
}

/**
 * Add timezone formatter script and reviews script
 */
function viator_enqueue_product_scripts() {
    global $post;
    error_log('🔍 [BOOKING QUESTIONS DEBUG] viator_enqueue_product_scripts called');
    error_log('🔍 [BOOKING QUESTIONS DEBUG] Post object: ' . (is_a($post, 'WP_Post') ? 'WP_Post' : 'not WP_Post'));
    if (is_a($post, 'WP_Post')) {
        error_log('🔍 [BOOKING QUESTIONS DEBUG] Post content has viator_product shortcode: ' . (has_shortcode($post->post_content, 'viator_product') ? 'YES' : 'NO'));
        error_log('🔍 [BOOKING QUESTIONS DEBUG] Post content preview: ' . substr($post->post_content, 0, 200));
    }
    if (is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'viator_product')) {
        error_log('🔍 [BOOKING QUESTIONS DEBUG] Inside shortcode detection block - enqueuing scripts');
        wp_enqueue_script(
            'viator-booking-js',
            plugin_dir_url(__FILE__) . 'viator-booking.js',
            array('jquery', 'viator-payment-lib'),
            '1.0.1',
            true
        );

        wp_enqueue_style(
            'viator-booking-css',
            plugin_dir_url(__FILE__) . 'viator-booking.css',
            array(),
            '1.0.1'
        );

        wp_enqueue_style(
            'viator-location-picker-css',
            plugin_dir_url(__FILE__) . 'assets/css/viator-location-picker.css',
            array(),
            '1.0.0'
        );

        wp_localize_script('viator-booking-js', 'viatorBookingAjax', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('viator_booking_nonce'),
            'environment' => 'sandbox' // Change to 'production' when ready
        ));
        error_log('🔍 [BOOKING QUESTIONS DEBUG] Scripts enqueued successfully');
    }
    wp_enqueue_script('timezone-formatter', plugin_dir_url(__FILE__) . 'timezone-formatter.js', array('jquery'), '1.0.0', true);

    // Adicionar dados de booking questions para o JavaScript se estivermos em uma página de produto
    if (is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'viator_product')) {
        error_log('🔍 [BOOKING QUESTIONS DEBUG] ========== STARTING PRODUCT DATA EXTRACTION ==========');
        error_log('🔍 [BOOKING QUESTIONS DEBUG] Post ID: ' . get_the_ID());
        error_log('🔍 [BOOKING QUESTIONS DEBUG] Post title: ' . get_the_title());
        error_log('🔍 [BOOKING QUESTIONS DEBUG] Current URL: ' . $_SERVER['REQUEST_URI']);
        error_log('🔍 [BOOKING QUESTIONS DEBUG] Is main query: ' . (is_main_query() ? 'YES' : 'NO'));
        error_log('🔍 [BOOKING QUESTIONS DEBUG] Post content preview: ' . substr($post->post_content, 0, 100));
        
        $product_code = null;
        
        // Primeiro, tentar extrair o código do produto do shortcode
        $pattern = '/\[viator_product\s+product_code=["\']([^"\'\']+)["\'][^\]]*\]/i';
        error_log('🔍 [BOOKING QUESTIONS DEBUG] Regex pattern: ' . $pattern);
        error_log('🔍 [BOOKING QUESTIONS DEBUG] Post content for regex: ' . $post->post_content);
        if (preg_match($pattern, $post->post_content, $matches)) {
            $product_code = $matches[1];
            error_log('🔍 [BOOKING QUESTIONS DEBUG] Product code extracted from shortcode: ' . $product_code);
        } else {
            error_log('🔍 [BOOKING QUESTIONS DEBUG] Product code NOT extracted from shortcode. Regex failed.');
            error_log('🔍 [BOOKING QUESTIONS DEBUG] Trying URL extraction...');
            
            // Debug: verificar query vars disponíveis
            global $wp_query;
            error_log('🔍 [BOOKING QUESTIONS DEBUG] Available query vars: ' . print_r($wp_query->query_vars, true));
            error_log('🔍 [BOOKING QUESTIONS DEBUG] Current URL: ' . $_SERVER['REQUEST_URI']);
            error_log('🔍 [BOOKING QUESTIONS DEBUG] $_GET parameters: ' . print_r($_GET, true));
            
            // Se não conseguir do shortcode, tentar da URL
            $product_code = get_query_var('product_code');
            error_log('🔍 [BOOKING QUESTIONS DEBUG] get_query_var result: ' . ($product_code ? $product_code : 'EMPTY'));
            
            if (empty($product_code)) {
                $product_code = isset($_GET['product_code']) ? sanitize_text_field($_GET['product_code']) : null;
                error_log('🔍 [BOOKING QUESTIONS DEBUG] $_GET["product_code"] result: ' . ($product_code ? $product_code : 'EMPTY'));
            }
            
            if ($product_code) {
                error_log('🔍 [BOOKING QUESTIONS DEBUG] Product code extracted from URL: ' . $product_code);
            } else {
                error_log('🔍 [BOOKING QUESTIONS DEBUG] Product code NOT found in URL either');
            }
        }
        
        if ($product_code) {
            
            // Obter dados do produto
            $product_data = viator_get_product_data($product_code);
            if ($product_data) {
                // Log de depuração
                error_log('🔍 [BOOKING QUESTIONS DEBUG] Product Code: ' . $product_code);
                error_log('🔍 [BOOKING QUESTIONS DEBUG] Product data keys: ' . implode(', ', array_keys($product_data)));
                error_log('🔍 [BOOKING QUESTIONS DEBUG] Has bookingQuestions: ' . (isset($product_data['bookingQuestions']) ? 'YES' : 'NO'));
                if (isset($product_data['bookingQuestions'])) {
                    error_log('🔍 [BOOKING QUESTIONS DEBUG] BookingQuestions count: ' . count($product_data['bookingQuestions']));
                    error_log('🔍 [BOOKING QUESTIONS DEBUG] BookingQuestions data: ' . json_encode($product_data['bookingQuestions']));
                }
                
                // Preparar dados para JavaScript
                $js_data = [];
                
                // Adicionar booking questions se disponíveis
                if (isset($product_data['bookingQuestions'])) {
                    $js_data['bookingQuestions'] = $product_data['bookingQuestions'];
                    error_log('🔍 [BOOKING QUESTIONS DEBUG] Added to js_data: ' . json_encode($js_data['bookingQuestions']));
                }
                
                // Adicionar language guides se disponíveis
                if (isset($product_data['languageGuides'])) {
                    $js_data['languageGuides'] = $product_data['languageGuides'];
                }

                // Adicionar dados de logística se disponíveis
                if (isset($product_data['logistics'])) {
                    $js_data['logistics'] = $product_data['logistics'];
                }
                
                // Adicionar script inline com os dados do produto
                if (!empty($js_data)) {
                    $script = 'window.productData = ' . json_encode($js_data) . ';';
                    $script .= 'console.log("📋 Dados do produto disponibilizados para JavaScript:", window.productData);';
                    $script .= 'console.log("🔍 [BOOKING QUESTIONS DEBUG] BookingQuestions available:", window.productData.bookingQuestions ? "YES (" + window.productData.bookingQuestions.length + ")" : "NO");';
                    wp_add_inline_script('viator-booking-js', $script, 'before');
                } else {
                    error_log('🔍 [BOOKING QUESTIONS DEBUG] js_data is empty, no script added');
                }
            } else {
                error_log('🔍 [BOOKING QUESTIONS DEBUG] Product data is null for code: ' . $product_code);
            }
        } else {
            error_log('🔍 [BOOKING QUESTIONS DEBUG] No product code found - shortcode without attributes and no URL parameter');
            error_log('🔍 [BOOKING QUESTIONS DEBUG] Post content length: ' . strlen($post->post_content));
        }
    }
    
    // Adicionar script inline para função de cópia
    wp_add_inline_script('timezone-formatter', '
        function copyProductCode(productCode) {
            if (navigator.clipboard && window.isSecureContext) {
                // Método moderno com Clipboard API
                navigator.clipboard.writeText(productCode).then(function() {
                    showCopyFeedback();
                }).catch(function(err) {
                    // Fallback se falhar
                    fallbackCopyTextToClipboard(productCode);
                });
            } else {
                // Fallback para navegadores mais antigos
                fallbackCopyTextToClipboard(productCode);
            }
        }

        function fallbackCopyTextToClipboard(text) {
            var textArea = document.createElement("textarea");
            textArea.value = text;
            
            // Evita scroll para baixo
            textArea.style.top = "0";
            textArea.style.left = "0";
            textArea.style.position = "fixed";

            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                var successful = document.execCommand("copy");
                if (successful) {
                    showCopyFeedback();
                }
            } catch (err) {
                console.error("Erro ao copiar texto: ", err);
            }

            document.body.removeChild(textArea);
        }

        function showCopyFeedback() {
            var copyBtn = document.querySelector(".copy-product-code-btn");
            var feedbackMsg = document.querySelector(".copy-feedback-message");
            var copyIcon = copyBtn.querySelector(".copy-icon");
            var checkIcon = copyBtn.querySelector(".check-icon");
            
            if (copyBtn && feedbackMsg && copyIcon && checkIcon) {
                copyBtn.classList.add("copied");
                
                // Trocar ícones
                copyIcon.style.display = "none";
                checkIcon.style.display = "inline";
                
                // Mostrar mensagem ao lado do botão
                feedbackMsg.textContent = "' . esc_js(viator_t('code_copied_short')) . '";
                feedbackMsg.style.opacity = "1";
                
                // Remover a mensagem e restaurar ícone após 2 segundos
                setTimeout(function() {
                    feedbackMsg.style.opacity = "0";
                    copyBtn.classList.remove("copied");
                    
                    // Restaurar ícone original
                    copyIcon.style.display = "inline";
                    checkIcon.style.display = "none";
                }, 2000);
            }
        }
        
        // Tags Carousel functionality
        document.addEventListener("DOMContentLoaded", function() {
            const tagsCarousel = document.querySelector(".viator-tags-carousel");
            if (!tagsCarousel) return;
            
            const scrollContainer = tagsCarousel.querySelector(".viator-tags-scroll");
            const leftBtn = tagsCarousel.querySelector(".viator-tags-scroll-left");
            const rightBtn = tagsCarousel.querySelector(".viator-tags-scroll-right");
            
            if (!scrollContainer || !leftBtn || !rightBtn) return;
            
            // Update button states
            function updateButtonStates() {
                const scrollLeft = scrollContainer.scrollLeft;
                const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
                
                leftBtn.disabled = scrollLeft <= 0;
                rightBtn.disabled = scrollLeft >= maxScroll - 1;
            }
            
            // Scroll amount (adjust based on container width)
            function getScrollAmount() {
                return scrollContainer.clientWidth * 0.8;
            }
            
            // Scroll left
            leftBtn.addEventListener("click", function() {
                scrollContainer.scrollBy({
                    left: -getScrollAmount(),
                    behavior: "smooth"
                });
            });
            
            // Scroll right
            rightBtn.addEventListener("click", function() {
                scrollContainer.scrollBy({
                    left: getScrollAmount(),
                    behavior: "smooth"
                });
            });
            
            // Update button states on scroll
            scrollContainer.addEventListener("scroll", updateButtonStates);
            
            // Update button states on resize
            window.addEventListener("resize", updateButtonStates);
            
            // Initial button state update
            updateButtonStates();
            
            // Hide buttons if all content is visible
            function checkIfScrollNeeded() {
                const isScrollNeeded = scrollContainer.scrollWidth > scrollContainer.clientWidth;
                leftBtn.style.display = isScrollNeeded ? "flex" : "none";
                rightBtn.style.display = isScrollNeeded ? "flex" : "none";
            }
            
            checkIfScrollNeeded();
            window.addEventListener("resize", checkIfScrollNeeded);
        });
    ');
    
    // Enqueue reviews script only on product pages
    global $post;
    if (is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'viator_product')) {
        wp_enqueue_script('viator-reviews', plugin_dir_url(__FILE__) . 'viator-reviews.js', array('jquery'), '1.0.2', true);
        
        // Get locale settings
        $locale_settings = viator_get_locale_settings();
        
        // Map language codes to JavaScript locale format
        $js_locale_map = [
            'pt-BR' => 'pt-BR',
            'en-US' => 'en-US'
        ];
        $js_locale = isset($js_locale_map[$locale_settings['language']]) ? $js_locale_map[$locale_settings['language']] : 'pt-BR';
        
        // Add JavaScript variables
        wp_localize_script('viator-reviews', 'viatorReviewsData', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('viator_reviews_nonce'),
            'locale' => $js_locale,
            'translations' => array(
                'loading_reviews' => viator_t('loading_reviews'),
                'reviews_load_error' => viator_t('reviews_load_error'),
                'reviews_load_error_generic' => viator_t('reviews_load_error_generic'),
                'try_again_later' => viator_t('try_again_later'),
                'no_reviews_found' => viator_t('no_reviews_found_rating'),
                'no_more_reviews' => viator_t('no_more_reviews_page'),
                'anonymous_traveler' => viator_t('anonymous_traveler'),
                'review_from' => viator_t('review_from', $locale_settings['language'])
            )
        ));
    }
}
add_action('wp_enqueue_scripts', 'viator_enqueue_product_scripts');

/**
 * AJAX handler for fetching product reviews
 */
function viator_get_reviews_ajax() {
    // Verify request
    if (!isset($_POST['product_code']) || empty($_POST['product_code'])) {
        wp_send_json_error(array('message' => viator_t('product_code_not_provided')));
    }
    
    // Get API key
    $api_key = get_option('viator_api_key');
    if (empty($api_key)) {
        wp_send_json_error(array('message' => viator_t('error_api_key')));
    }
    
    // Obter configurações de idioma
    $locale_settings = viator_get_locale_settings();
    
    // Get parameters
    $product_code = sanitize_text_field($_POST['product_code']);
    $count = isset($_POST['count']) ? intval($_POST['count']) : 10;
    $start = isset($_POST['start']) ? intval($_POST['start']) : 1;
    $ratings = isset($_POST['ratings']) && is_array($_POST['ratings']) ? array_map('intval', $_POST['ratings']) : [5, 4, 3, 2, 1];
    $sort_by = isset($_POST['sort_by']) ? sanitize_text_field($_POST['sort_by']) : 'MOST_RECENT_PER_LOCALE';
    $provider = isset($_POST['provider']) ? sanitize_text_field($_POST['provider']) : 'ALL';

    // Gerar chave única para o cache com base nos parâmetros da requisição AJAX
    // Usamos os parâmetros POST originais para garantir que diferentes filtros/páginas tenham caches distintos
    $cache_key_params = array(
        'product_code' => $product_code,
        'count' => isset($_POST['count']) ? intval($_POST['count']) : 10, // Usar o count original do POST para a chave
        'start' => isset($_POST['start']) ? intval($_POST['start']) : 1, // Usar o start original do POST para a chave
        'ratings' => isset($_POST['ratings']) && is_array($_POST['ratings']) ? array_map('intval', $_POST['ratings']) : [5, 4, 3, 2, 1],
        'sort_by' => $sort_by,
        'provider' => $provider
    );
    $cache_key = 'viator_reviews_' . md5(serialize($cache_key_params));
    $cached_data = get_transient($cache_key);

    // Se houver dados em cache, retorne-os
    if (false !== $cached_data) {
        wp_send_json_success($cached_data);
    }
    
    // Se o parâmetro limit estiver definido (usado pelo JS para buscar lotes maiores), use-o para a API
    // Mas a chave de cache usa os parâmetros originais 'count' e 'start' do JS
    if (isset($_POST['limit']) && intval($_POST['limit']) > $count) {
        $count = intval($_POST['limit']); // $count para a API pode ser diferente do $count para o cache_key
    }
    
    // Prepare request data
    $request_data = array(
        'productCode' => $product_code,
        'provider' => $provider,
        'count' => $count,
        'start' => $start,
        'showMachineTranslated' => true,
        'reviewsForNonPrimaryLocale' => true,
        'ratings' => $ratings,
        'sortBy' => $sort_by
    );
    
    // Make API request
    $response = wp_remote_post('https://api.sandbox.viator.com/partner/reviews/product', array(
        'headers' => array(
            'Accept' => 'application/json;version=2.0',
            'Content-Type' => 'application/json;version=2.0',
            'exp-api-key' => $api_key,
            'Accept-Language' => $locale_settings['language']
        ),
        'body' => json_encode($request_data),
        'timeout' => 30
    ));
    
    // Check for errors
    if (is_wp_error($response)) {
        wp_send_json_error(array('message' => 'Erro ao conectar com a API: ' . $response->get_error_message()));
    }
    
    // Parse response
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);
    
    // Check for API errors
    if (isset($data['error'])) {
        wp_send_json_error(array('message' => 'Erro da API: ' . $data['error']['message']));
    }
    
    // Cache the successful response for 1 week (7 days)
    set_transient($cache_key, $data, WEEK_IN_SECONDS);

    // Return reviews data
    wp_send_json_success($data);
}
add_action('wp_ajax_viator_get_reviews', 'viator_get_reviews_ajax');
add_action('wp_ajax_nopriv_viator_get_reviews', 'viator_get_reviews_ajax');
add_action('wp_ajax_nopriv_viator_get_reviews', 'viator_get_reviews_ajax');

/**
 * Get all tags from Viator API with caching
 */
function viator_get_tags_from_api() {
    $cache_key = 'viator_all_tags';
    $cached_tags = get_transient($cache_key);
    
    // Return cached data if available (cached for 7 days as recommended)
    if (false !== $cached_tags) {
        return $cached_tags;
    }
    
    $api_key = get_option('viator_api_key');
    if (empty($api_key)) {
        return array();
    }
    
    $url = viator_get_api_base_url() . '/partner/products/tags';
    
    $response = wp_remote_get($url, array(
        'headers' => array(
            'Accept' => 'application/json;version=2.0',
            'exp-api-key' => $api_key
        ),
        'timeout' => 30
    ));
    
    if (is_wp_error($response)) {
        return array();
    }
    
    $response_code = wp_remote_retrieve_response_code($response);
    if ($response_code !== 200) {
        return array();
    }
    
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);
    
    if (!$data || !isset($data['tags'])) {
        return array();
    }
    
    // Process tags and create indexed array by tagId
    $processed_tags = array();
    foreach ($data['tags'] as $tag) {
        if (isset($tag['tagId']) && isset($tag['allNamesByLocale'])) {
            $processed_tags[$tag['tagId']] = $tag['allNamesByLocale'];
        }
    }
    
    // Cache for 7 days (604800 seconds) as recommended by Viator
    set_transient($cache_key, $processed_tags, 604800);
    
    return $processed_tags;
}

/**
 * Get tag name by ID in the appropriate language
 */
function viator_get_tag_name($tag_id, $language = null) {
    if ($language === null) {
        $locale_settings = viator_get_locale_settings();
        $language = $locale_settings['language'];
    }
    
    $all_tags = viator_get_tags_from_api();
    
    if (empty($all_tags) || !isset($all_tags[$tag_id])) {
        return $tag_id; // Return the tag ID if not found
    }
    
    $tag_names = $all_tags[$tag_id];
    
    // For Portuguese (Brazil), try multiple Portuguese variations
    if ($language === 'pt-BR') {
        $portuguese_variations = ['pt-BR', 'pt_BR', 'pt', 'pt-PT', 'pt_PT'];
        
        foreach ($portuguese_variations as $pt_code) {
            if (isset($tag_names[$pt_code]) && !empty($tag_names[$pt_code])) {
                $portuguese_text = $tag_names[$pt_code];
                
                // Check if this "Portuguese" text is actually English
                // (some tags in the API have English text in all language fields)
                $manual_translation = viator_translate_common_tags($portuguese_text, $language);
                
                if ($manual_translation !== $portuguese_text) {
                    // Manual translation was applied, use it
                    return $manual_translation;
                } else {
                    // It's genuine Portuguese text
                    return $tag_names[$pt_code];
                }
            }
        }
    }
    
    // For English, try multiple English variations
    if ($language === 'en-US') {
        $english_variations = ['en-US', 'en_US', 'en', 'en-UK', 'en_UK', 'en-AU', 'en_AU'];
        
        foreach ($english_variations as $en_code) {
            if (isset($tag_names[$en_code]) && !empty($tag_names[$en_code])) {
                return $tag_names[$en_code];
            }
        }
    }
    
    // If primary language not found, try fallback to English variations
    $english_fallback = ['en', 'en-US', 'en_US', 'en-UK', 'en_UK', 'en-AU', 'en_AU'];
    foreach ($english_fallback as $en_code) {
        if (isset($tag_names[$en_code]) && !empty($tag_names[$en_code])) {
            $english_tag = $tag_names[$en_code];
            
            // Apply manual translation for common English tags
            $translated_tag = viator_translate_common_tags($english_tag, $language);
            return $translated_tag;
        }
    }
    
    // If no English fallback, try any Portuguese variation
    $portuguese_fallback = ['pt', 'pt-BR', 'pt_BR', 'pt-PT', 'pt_PT'];
    foreach ($portuguese_fallback as $pt_code) {
        if (isset($tag_names[$pt_code]) && !empty($tag_names[$pt_code])) {
            return $tag_names[$pt_code];
        }
    }
    
    // If still nothing found, return the first available non-empty name
    foreach ($tag_names as $locale => $name) {
        if (!empty($name)) {
            $translated_tag = viator_translate_common_tags($name, $language);
            return $translated_tag;
        }
    }
    
    // Final fallback: return the tag ID
    return $tag_id;
}

/**
 * Translate common English tags to Portuguese manually
 */
function viator_translate_common_tags($english_tag, $target_language = null) {
    if ($target_language === null) {
        $locale_settings = viator_get_locale_settings();
        $target_language = $locale_settings['language'];
    }
    
    // Only translate if target language is Portuguese
    if ($target_language !== 'pt-BR') {
        return $english_tag;
    }
    
    // Manual translation mapping for common tags
    $translations = array(
        'Low Last Minute Supplier Cancellation Rate' => 'Baixa taxa de cancelamento de última hora por parte de fornecedores',
        'Top Product' => 'Produto Top',
        'Low Supplier Cancellation Rate' => 'Baixa taxa de cancelamento de fornecedores',
        'Bestseller' => 'Mais Vendido',
        'Best Value' => 'Melhor Valor',
        'Premium Experience' => 'Experiência Premium',
        'Luxury Experience' => 'Experiência de Luxo',
        'Family Friendly' => 'Adequado para Famílias',
        'Small Group' => 'Grupo Pequeno',
        'Private Tour' => 'Tour Privado',
        'Skip the Line' => 'Evite as Filas',
        'Free Cancellation' => 'Cancelamento Gratuito',
        'Instant Confirmation' => 'Confirmação Instantânea',
        'Mobile Ticket' => 'Ticket Digital',
        'Audio Guide' => 'Áudio Guia',
        'Live Guide' => 'Guia ao Vivo',
        'Hotel Pickup' => 'Busca no Hotel',
        'All-Inclusive' => 'Tudo Incluído',
        'Outdoor Activity' => 'Atividade ao Ar Livre',
        'Cultural Experience' => 'Experiência Cultural',
        'Adventure' => 'Aventura',
        'Food & Drink' => 'Comida e Bebida',
        'Nightlife' => 'Vida Noturna',
        'Historical' => 'Histórico',
        'Photography' => 'Fotografia',
        'Romantic' => 'Romântico',
        'Wheelchair Accessible' => 'Acessível para Cadeirantes',
        'Pet Friendly' => 'Aceita Animais',
        'WiFi Available' => 'WiFi Disponível',
        'Air Conditioning' => 'Ar Condicionado',
        'Recommended' => 'Recomendado',
        'Popular' => 'Popular',
        'New Experience' => 'Nova Experiência',
        'Limited Time' => 'Tempo Limitado',
        'Seasonal' => 'Sazonal',
        'Unique' => 'Único',
        'Must See' => 'Imperdível',
        'Hidden Gem' => 'Joia Escondida',
        'New Product' => 'Novo Produto',
    );
    
    // Check for exact match first
    if (isset($translations[$english_tag])) {
        return $translations[$english_tag];
    }
    
    // Check for partial matches (case insensitive)
    foreach ($translations as $english => $portuguese) {
        if (stripos($english_tag, $english) !== false) {
            return $portuguese;
        }
    }
    
    // No translation found, return original
    return $english_tag;
}

/**
 * Process tags array to get human-readable names
 */
function viator_process_tags_for_display($tags) {
    if (empty($tags) || !is_array($tags)) {
        return array();
    }
    
    $processed_tags = array();
    
    foreach ($tags as $tag) {
        // Tags can be either integers (tag IDs) or strings
        $tag_id = is_numeric($tag) ? intval($tag) : $tag;
        $tag_name = viator_get_tag_name($tag_id);
        $processed_tags[] = $tag_name;
    }
    
    return $processed_tags;
}

/**
 * Clear tags cache (useful for debugging or manual refresh)
 */
function viator_clear_tags_cache() {
    delete_transient('viator_all_tags');
    viator_debug_log('Tags cache cleared');
}

/**
 * AJAX handler to refresh tags cache manually
 */
function viator_refresh_tags_cache_ajax() {
    // Verify nonce for security
    if (!wp_verify_nonce($_POST['nonce'], 'viator_admin_nonce')) {
        wp_send_json_error('Invalid nonce');
    }
    
    // Check if user has permission
    if (!current_user_can('manage_options')) {
        wp_send_json_error('Insufficient permissions');
    }
    
    // Clear cache and fetch fresh data
    viator_clear_tags_cache();
    $tags = viator_get_tags_from_api();
    
    wp_send_json_success(array(
        'message' => 'Cache de tags atualizado com sucesso',
        'tags_count' => count($tags)
    ));
}
add_action('wp_ajax_viator_refresh_tags_cache', 'viator_refresh_tags_cache_ajax');

/**
 * Clear products cache (titles and durations)
 */
function viator_clear_products_cache() {
    global $wpdb;
    
    $cleared_count = 0;
    
    // Buscar todos os transients relacionados a produtos
    $transients = $wpdb->get_results("
        SELECT option_name 
        FROM {$wpdb->options} 
        WHERE option_name LIKE '_transient_viator_product_%'
    ");
    
    foreach ($transients as $transient) {
        $transient_name = str_replace('_transient_', '', $transient->option_name);
        delete_transient($transient_name);
        $cleared_count++;
    }
    
    viator_debug_log("Products cache cleared: {$cleared_count} items removed");
    return $cleared_count;
}

/**
 * Clear reviews cache
 */
function viator_clear_reviews_cache() {
    global $wpdb;
    
    $cleared_count = 0;
    
    // Buscar todos os transients relacionados a reviews
    $transients = $wpdb->get_results("
        SELECT option_name 
        FROM {$wpdb->options} 
        WHERE option_name LIKE '_transient_viator_reviews_%'
    ");
    
    foreach ($transients as $transient) {
        $transient_name = str_replace('_transient_', '', $transient->option_name);
        delete_transient($transient_name);
        $cleared_count++;
    }
    
    viator_debug_log("Reviews cache cleared: {$cleared_count} items removed");
    return $cleared_count;
}

/**
 * Clear availability cache
 */
function viator_clear_availability_cache() {
    global $wpdb;
    
    $cleared_count = 0;
    
    // Buscar todos os transients relacionados a disponibilidade
    $transients = $wpdb->get_results("
        SELECT option_name 
        FROM {$wpdb->options} 
        WHERE option_name LIKE '_transient_viator_availability_%'
        OR option_name LIKE '_transient_viator_booking_%'
    ");
    
    foreach ($transients as $transient) {
        $transient_name = str_replace('_transient_', '', $transient->option_name);
        delete_transient($transient_name);
        $cleared_count++;
    }
    
    viator_debug_log("Availability cache cleared: {$cleared_count} items removed");
    return $cleared_count;
}

/**
 * Clear locations cache
 */
function viator_clear_locations_cache() {
    global $wpdb;
    
    $cleared_count = 0;
    
    // Buscar todos os transients relacionados a localizações
    $transients = $wpdb->get_results("
        SELECT option_name 
        FROM {$wpdb->options} 
        WHERE option_name LIKE '_transient_viator_locations_%'
    ");
    
    foreach ($transients as $transient) {
        $transient_name = str_replace('_transient_', '', $transient->option_name);
        delete_transient($transient_name);
        $cleared_count++;
    }
    
    viator_debug_log("Locations cache cleared: {$cleared_count} items removed");
    return $cleared_count;
}

/**
 * Clear destinations cache
 */
function viator_clear_destinations_cache() {
    delete_transient('viator_destinations_data');
    viator_debug_log('Destinations cache cleared');
    return 1; // Um item removido
}

/**
 * Clear all Viator-related cache
 */
function viator_clear_all_cache() {
    global $wpdb;
    
    $results = array(
        'tags' => 0,
        'products' => 0,
        'reviews' => 0,
        'availability' => 0,
        'locations' => 0,
        'destinations' => 0,
        'total' => 0
    );
    
    // Buscar todos os transients do Viator
    $transients = $wpdb->get_results("
        SELECT option_name 
        FROM {$wpdb->options} 
        WHERE option_name LIKE '_transient_viator_%'
    ");
    
    foreach ($transients as $transient) {
        $transient_name = str_replace('_transient_', '', $transient->option_name);
        delete_transient($transient_name);
        
        // Categorizar por tipo
        if (strpos($transient_name, 'viator_all_tags') !== false) {
            $results['tags']++;
        } elseif (strpos($transient_name, 'viator_destinations_data') !== false) {
            $results['destinations']++;
        } elseif (strpos($transient_name, 'viator_product_') !== false) {
            $results['products']++;
        } elseif (strpos($transient_name, 'viator_reviews_') !== false) {
            $results['reviews']++;
        } elseif (strpos($transient_name, 'viator_availability_') !== false || strpos($transient_name, 'viator_booking_') !== false) {
            $results['availability']++;
        } elseif (strpos($transient_name, 'viator_locations_') !== false) {
            $results['locations']++;
        }
        
        $results['total']++;
    }
    
    viator_debug_log("All Viator cache cleared", $results);
    return $results;
}

/**
 * AJAX handler para limpar cache de produtos
 */
function viator_clear_products_cache_ajax() {
    // Verificar nonce
    if (!wp_verify_nonce($_POST['nonce'], 'viator_admin_nonce')) {
        wp_send_json_error('Erro de segurança');
        return;
    }
    
    // Verificar permissões
    if (!current_user_can('manage_options')) {
        wp_send_json_error('Permissões insuficientes');
        return;
    }
    
    $cleared_count = viator_clear_products_cache();
    
    wp_send_json_success(array(
        'message' => "Cache de produtos limpo com sucesso ({$cleared_count} itens removidos)",
        'cleared_count' => $cleared_count
    ));
}
add_action('wp_ajax_viator_clear_products_cache', 'viator_clear_products_cache_ajax');

/**
 * AJAX handler para limpar cache de reviews
 */
function viator_clear_reviews_cache_ajax() {
    // Verificar nonce
    if (!wp_verify_nonce($_POST['nonce'], 'viator_admin_nonce')) {
        wp_send_json_error('Erro de segurança');
        return;
    }
    
    // Verificar permissões
    if (!current_user_can('manage_options')) {
        wp_send_json_error('Permissões insuficientes');
        return;
    }
    
    $cleared_count = viator_clear_reviews_cache();
    
    wp_send_json_success(array(
        'message' => "Cache de reviews limpo com sucesso ({$cleared_count} itens removidos)",
        'cleared_count' => $cleared_count
    ));
}
add_action('wp_ajax_viator_clear_reviews_cache', 'viator_clear_reviews_cache_ajax');

/**
 * AJAX handler para limpar cache de disponibilidade
 */
function viator_clear_availability_cache_ajax() {
    // Verificar nonce
    if (!wp_verify_nonce($_POST['nonce'], 'viator_admin_nonce')) {
        wp_send_json_error('Erro de segurança');
        return;
    }
    
    // Verificar permissões
    if (!current_user_can('manage_options')) {
        wp_send_json_error('Permissões insuficientes');
        return;
    }
    
    $cleared_count = viator_clear_availability_cache();
    
    wp_send_json_success(array(
        'message' => "Cache de disponibilidade limpo com sucesso ({$cleared_count} itens removidos)",
        'cleared_count' => $cleared_count
    ));
}
add_action('wp_ajax_viator_clear_availability_cache', 'viator_clear_availability_cache_ajax');

/**
 * AJAX handler para limpar cache de destinos
 */
function viator_clear_destinations_cache_ajax() {
    // Verificar nonce
    if (!wp_verify_nonce($_POST['nonce'], 'viator_admin_nonce')) {
        wp_send_json_error('Erro de segurança');
        return;
    }
    
    // Verificar permissões
    if (!current_user_can('manage_options')) {
        wp_send_json_error('Permissões insuficientes');
        return;
    }
    
    $cleared_count = viator_clear_destinations_cache();
    
    wp_send_json_success(array(
        'message' => "Cache de destinos limpo com sucesso ({$cleared_count} item removido)",
        'cleared_count' => $cleared_count
    ));
}
add_action('wp_ajax_viator_clear_destinations_cache', 'viator_clear_destinations_cache_ajax');

/**
 * AJAX handler para limpar todos os caches
 */
function viator_clear_all_cache_ajax() {
    // Verificar nonce
    if (!wp_verify_nonce($_POST['nonce'], 'viator_admin_nonce')) {
        wp_send_json_error('Erro de segurança');
        return;
    }
    
    // Verificar permissões
    if (!current_user_can('manage_options')) {
        wp_send_json_error('Permissões insuficientes');
        return;
    }
    
    $results = viator_clear_all_cache();
    
    wp_send_json_success(array(
        'message' => "Todos os caches foram limpos com sucesso (Total: {$results['total']} itens removidos)",
        'details' => $results
    ));
}
add_action('wp_ajax_viator_clear_all_cache', 'viator_clear_all_cache_ajax');

/**
 * AJAX handler para limpar cache de localizações
 */
function viator_clear_locations_cache_ajax() {
    // Verificar nonce
    if (!wp_verify_nonce($_POST['nonce'], 'viator_admin_nonce')) {
        wp_send_json_error('Erro de segurança');
        return;
    }
    
    // Verificar permissões
    if (!current_user_can('manage_options')) {
        wp_send_json_error('Permissões insuficientes');
        return;
    }
    
    $cleared_count = viator_clear_locations_cache();
    
    wp_send_json_success(array(
        'message' => "Cache de localizações limpo com sucesso ({$cleared_count} itens removidos)",
        'cleared_count' => $cleared_count
    ));
}
add_action('wp_ajax_viator_clear_locations_cache', 'viator_clear_locations_cache_ajax');

/**
 * AJAX handler para obter detalhes de localização via /locations/bulk
 */
function viator_get_location_details_ajax() {
    // Verificar nonce
    if (!wp_verify_nonce($_POST['nonce'], 'viator_booking_nonce')) {
        wp_send_json_error('Nonce inválido');
        return;
    }
    
    // Obter referências de localização
    $location_refs = isset($_POST['location_refs']) ? json_decode(stripslashes($_POST['location_refs']), true) : [];
    
    if (empty($location_refs) || !is_array($location_refs)) {
        wp_send_json_error('Referências de localização não fornecidas');
        return;
    }
    
    // Buscar detalhes via API /locations/bulk
    $location_details = viator_get_bulk_locations($location_refs);
    
    if (empty($location_details)) {
        wp_send_json_error('Nenhum detalhe de localização encontrado');
        return;
    }
    
    wp_send_json_success($location_details);
}
add_action('wp_ajax_viator_get_location_details', 'viator_get_location_details_ajax');
add_action('wp_ajax_nopriv_viator_get_location_details', 'viator_get_location_details_ajax');

/**
 * Get the base URL for Viator API
 */
function viator_get_api_base_url() {
    // Por enquanto usando sandbox, mas pode ser configurável no futuro
    return 'https://api.sandbox.viator.com';
}

/**
 * Debug function to test location extraction and API calls
 * Usage: add ?debug_locations=1 to any product page URL while logged in as admin
 */
function viator_debug_locations() {
    if (!isset($_GET['debug_locations']) || !current_user_can('manage_options')) {
        return;
    }
    
    // Get product code from URL
    $product_code = get_query_var('product_code', '');
    if (empty($product_code)) {
        $product_code = isset($_GET['product_code']) ? sanitize_text_field($_GET['product_code']) : '';
    }
    
    if (empty($product_code)) {
        echo '<div style="background: #fff; padding: 20px; margin: 20px; border: 1px solid #ccc;">
                <h3>Debug de Localizações - Erro</h3>
                <p>Código do produto não fornecido. Adicione ?product_code=CODIGO_DO_PRODUTO à URL.</p>
              </div>';
        return;
    }
    
    // Get product details
    $api_key = get_option('viator_api_key');
    if (empty($api_key)) {
        echo '<div style="background: #fff; padding: 20px; margin: 20px; border: 1px solid #ccc;">
                <h3>Debug de Localizações - Erro</h3>
                <p>Chave API não configurada.</p>
              </div>';
        return;
    }
    
    $locale_settings = viator_get_locale_settings();
    $url = viator_get_api_base_url() . "/partner/products/{$product_code}";
    
    $response = wp_remote_get($url, [
        'headers' => [
            'Accept' => 'application/json;version=2.0',
            'Content-Type' => 'application/json;version=2.0',
            'exp-api-key' => $api_key,
            'Accept-Language' => $locale_settings['language'],
        ],
        'timeout' => 30,
    ]);
    
    if (is_wp_error($response)) {
        echo '<div style="background: #fff; padding: 20px; margin: 20px; border: 1px solid #ccc;">
                <h3>Debug de Localizações - Erro</h3>
                <p>Erro ao buscar produto: ' . esc_html($response->get_error_message()) . '</p>
              </div>';
        return;
    }
    
    $body = wp_remote_retrieve_body($response);
    $product = json_decode($body, true);
    
    if (empty($product)) {
        echo '<div style="background: #fff; padding: 20px; margin: 20px; border: 1px solid #ccc;">
                <h3>Debug de Localizações - Erro</h3>
                <p>Produto não encontrado ou resposta inválida.</p>
              </div>';
        return;
    }
    
    // Extract location references
    $location_references = viator_get_structured_product_locations($product);
    
    echo '<div style="background: #fff; padding: 20px; margin: 20px; border: 1px solid #ccc; font-family: monospace;">
            <h3>Debug de Localizações - Produto: ' . esc_html($product_code) . '</h3>
            <h4>Referências de Localização Encontradas (Estruturado):</h4>';
    
    if (empty($location_references['start']) && empty($location_references['end']) && empty($location_references['unspecified'])) {
        echo '<p>Nenhuma referência de localização encontrada neste produto.</p>';
    } else {
        echo '<pre>' . esc_html(print_r($location_references, true)) . '</pre>';
        
        // Get bulk location details
        echo '<h4>Detalhes das Localizações (Bulk):</h4>';
        
        $all_refs = array_merge(
            array_map(function($l){ return $l['ref']; }, $location_references['start']),
            array_map(function($l){ return $l['ref']; }, $location_references['end']),
            array_map(function($l){ return $l['ref']; }, $location_references['unspecified'])
        );
        $all_refs = array_unique($all_refs);

        $location_details = viator_get_bulk_locations($all_refs);
        
        if (empty($location_details)) {
            echo '<p>Nenhum detalhe de localização retornado pela API.</p>';
        } else {
            echo '<pre>' . esc_html(print_r($location_details, true)) . '</pre>';
        }
    }
    
    echo '<h4>Estrutura do Produto (campos relacionados a localização):</h4>';
    $location_fields = [
        'travelerPickup' => $product['travelerPickup'] ?? null,
        'departurePoint' => $product['departurePoint'] ?? null,
        'logistics' => $product['logistics'] ?? null,
        'location' => $product['location'] ?? null
    ];
    
    echo '<pre>' . esc_html(print_r($location_fields, true)) . '</pre>';
    echo '</div>';
}
add_action('wp_footer', 'viator_debug_locations');

/**
 * Extract location references from product data
 */
function viator_get_structured_product_locations($product) {
    $structured_locations = [
        'start' => [],
        'end' => [],
        'unspecified' => [],
    ];

    $processed_refs = [];

    // Helper to add a location if the ref hasn't been processed yet
    $add_location = function($group, $location_data) use (&$structured_locations, &$processed_refs) {
        if (isset($location_data['ref']) && !isset($processed_refs[$location_data['ref']])) {
            $structured_locations[$group][] = $location_data;
            $processed_refs[$location_data['ref']] = true; // Mark ref as processed
        }
    };
    
    // Helper to extract data from location nodes (e.g., in logistics, departurePoint)
    $extract_from_node = function($node) {
        if (isset($node['location']['ref'])) {
            return [
                'ref' => $node['location']['ref'],
                'description' => $node['description'] ?? ''
            ];
        }
        return null;
    };

    // 1. Process logistics (start/end points have priority)
    if (!empty($product['logistics']['start']) && is_array($product['logistics']['start'])) {
        foreach ($product['logistics']['start'] as $item) {
            if ($location = $extract_from_node($item)) {
                $add_location('start', $location);
            }
        }
    }
    if (!empty($product['logistics']['end']) && is_array($product['logistics']['end'])) {
        foreach ($product['logistics']['end'] as $item) {
            if ($location = $extract_from_node($item)) {
                $add_location('end', $location);
            }
        }
    }

    // 2. Process other known location fields if not already processed
    if (!empty($product['departurePoint'])) {
        if ($location = $extract_from_node($product['departurePoint'])) {
             $add_location('start', $location); // Departure point is a start point
        } elseif (isset($product['departurePoint']['reference'])) {
            $add_location('start', ['ref' => $product['departurePoint']['reference'], 'description' => '']);
        }
    }
    
    if (!empty($product['travelerPickup']['pickupOptions']) && is_array($product['travelerPickup']['pickupOptions'])) {
        foreach ($product['travelerPickup']['pickupOptions'] as $option) {
            if (!empty($option['pickupLocations']) && is_array($option['pickupLocations'])) {
                foreach ($option['pickupLocations'] as $loc) {
                    if(isset($loc['reference'])) {
                        $add_location('start', [
                            'ref' => $loc['reference'],
                            'description' => $loc['name'] ?? ''
                        ]);
                    }
                }
            }
        }
    }

    if (!empty($product['meetingPoint'])) {
        if ($location = $extract_from_node($product['meetingPoint'])) {
            $add_location('unspecified', $location);
        } elseif (isset($product['meetingPoint']['reference'])) {
             $add_location('unspecified', ['ref' => $product['meetingPoint']['reference'], 'description' => '']);
        }
    }
    
    if (!empty($product['itinerary']['itineraryItems']) && is_array($product['itinerary']['itineraryItems'])) {
        foreach ($product['itinerary']['itineraryItems'] as $item) {
            if (!empty($item['location']) && ($location = $extract_from_node($item['location']))) {
                 $add_location('unspecified', $location);
            }
        }
    }

    return $structured_locations;
}

/**
 * Get bulk location details from Viator API
 * 
 * IMPORTANTE: Este endpoint /locations/bulk é OBRIGATÓRIO para parceiros do programa Viator Partner.
 * A Viator exige que usemos este endpoint para obter detalhes completos das localizações
 * conforme especificado na documentação oficial do Partner Program.
 * 
 * Este endpoint deve ser usado sempre que location references são retornadas em produtos,
 * para cache e refresh mensal conforme recomendações da Viator.
 */
function viator_get_bulk_locations($location_references) {
    if (empty($location_references)) {
        return [];
    }
    
    // Cache key based on location references
    $cache_key = 'viator_locations_' . md5(serialize($location_references));
    $cached_data = get_transient($cache_key);
    
    if (false !== $cached_data) {
        return $cached_data;
    }
    
    $api_key = get_option('viator_api_key');
    if (empty($api_key)) {
        return [];
    }
    
    $locale_settings = viator_get_locale_settings();
    
    // Limit to 500 items as per API specification
    $location_references = array_slice($location_references, 0, 500);
    
    $request_data = [
        'locations' => $location_references
    ];
    
    // Log para confirmar uso obrigatório do endpoint /locations/bulk
    viator_debug_log('VIATOR PARTNER REQUIREMENT: Usando endpoint /locations/bulk obrigatório', [
        'endpoint' => '/partner/locations/bulk',
        'location_count' => count($location_references),
        'locations' => $location_references
    ]);
    
    $response = wp_remote_post(viator_get_api_base_url() . '/partner/locations/bulk', [
        'headers' => [
            'Accept' => 'application/json;version=2.0',
            'Content-Type' => 'application/json;version=2.0',
            'exp-api-key' => $api_key,
            'Accept-Language' => $locale_settings['language']
        ],
        'body' => json_encode($request_data),
        'timeout' => 30
    ]);
    
    if (is_wp_error($response)) {
        viator_debug_log('Error fetching bulk locations:', $response->get_error_message());
        return [];
    }
    
    $response_code = wp_remote_retrieve_response_code($response);
    if ($response_code !== 200) {
        viator_debug_log('HTTP error fetching bulk locations:', $response_code);
        return [];
    }
    
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);
    

    
    if (!isset($data['locations']) || !is_array($data['locations'])) {
        viator_debug_log('Invalid response format for bulk locations:', $data);
        return [];
    }
    
    // Process locations and add user-friendly names
    $processed_locations = [];
    foreach ($data['locations'] as $location) {
        if (isset($location['reference'])) {
            // Add translated name for special references
            if (!isset($location['name']) || empty($location['name'])) {
                $location['name'] = viator_translate_location_reference($location['reference']);
            }
            
            // Para localizações que só têm provider/providerReference (sem endereço)
            // buscar detalhes via Google Places API se disponível
            if (!isset($location['address']) && isset($location['provider']) && isset($location['providerReference'])) {
                if ($location['provider'] === 'GOOGLE') {
                    // Tentar buscar detalhes do local via Google Places API
                    $place_details = viator_get_google_place_details($location['providerReference']);
                    if ($place_details) {
                        $location['address'] = $place_details['address'];
                        $location['name'] = $place_details['name'] ?: $location['name'];
                        $location['contextInfo'] = 'Detalhes obtidos via Google Places';
                    } else {
                        $location['contextInfo'] = 'Local específico identificado via Google Maps';
                    }
                } elseif ($location['provider'] === 'TRIPADVISOR') {
                    $location['contextInfo'] = 'Ponto de interesse conhecido no TripAdvisor';
                } else {
                    $location['contextInfo'] = 'Local identificado pelo fornecedor';
                }
            }
            
            $processed_locations[] = $location;
        }
    }
    
    // Cache for 30 days as recommended in documentation
    set_transient($cache_key, $processed_locations, 30 * DAY_IN_SECONDS);
    
    return $processed_locations;
}

/**
 * Translate special location references to user-friendly names
 * NUNCA retorna códigos LOC para o usuário final
 */
function viator_translate_location_reference($reference) {
    $translations = [
        'CONTACT_SUPPLIER_LATER' => viator_t('contact_supplier_later'),
        'MEET_AT_DEPARTURE_POINT' => viator_t('meet_at_departure_point'),
        'PICKUP_POINT' => viator_t('pickup_point'),
        'PICKUP_HOTEL' => viator_t('pickup_hotel'),
        'MEET_EVERYONE_AT_START_POINT' => viator_t('meet_at_start_point'),
        'ATTRACTION_START_POINT' => viator_t('attraction_start_point')
    ];
    
    // Se encontrar uma tradução conhecida, use ela
    if (isset($translations[$reference])) {
        return $translations[$reference];
    }
    
    // Se for um código LOC (confuso para usuários), retorna texto genérico
    if (strpos($reference, 'LOC-') === 0) {
        return viator_t('location_provided_by_supplier'); // Nova tradução genérica
    }
    
    // Para outros casos, retorna a referência original
    return $reference;
}

/**
 * Get appropriate icon for location type
 */
function viator_get_location_icon($location) {
    $reference = $location['reference'] ?? '';
    
    if (strpos($reference, 'CONTACT_SUPPLIER') !== false) {
        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92V19a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h2.09a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9a16 16 0 006.92 6.92l.35-.35a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>';
    } elseif (strpos($reference, 'MEET') !== false || strpos($reference, 'DEPARTURE') !== false) {
        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16v-6z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>';
    } elseif (strpos($reference, 'PICKUP') !== false || strpos($reference, 'HOTEL') !== false) {
        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16l-4-4v8l4-4H2z"/></svg>';
    } else {
        // Default location pin icon
        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>';
    }
}

/**
 * Buscar detalhes de um local via Google Places API usando place_id
 * 
 * @param string $place_id O place_id do Google Places (providerReference)
 * @return array|null Array com dados do local ou null se não encontrado
 */
function viator_get_google_place_details($place_id) {
    // Verificar se temos a API key do Google configurada
    $google_api_key = get_option('viator_google_places_api_key');
    if (empty($google_api_key)) {
        return null;
    }
    
    // Cache key baseado no place_id
    $cache_key = 'google_place_' . md5($place_id);
    $cached_data = get_transient($cache_key);
    
    if (false !== $cached_data) {
        return $cached_data;
    }
    
    // URL da API Google Places Details
    $url = 'https://maps.googleapis.com/maps/api/place/details/json';
    $params = [
        'place_id' => $place_id,
        'key' => $google_api_key,
        'fields' => 'name,formatted_address,address_components,geometry',
        'language' => 'pt-BR' // Português brasileiro
    ];
    
    $request_url = $url . '?' . http_build_query($params);
    
    $response = wp_remote_get($request_url, [
        'timeout' => 10
    ]);
    
    if (is_wp_error($response)) {
        return null;
    }
    
    $response_code = wp_remote_retrieve_response_code($response);
    if ($response_code !== 200) {
        return null;
    }
    
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);
    
    if (!isset($data['result']) || $data['status'] !== 'OK') {
        return null;
    }
    
    $result = $data['result'];
    
    // Processar os dados do local
    $place_details = [
        'name' => $result['name'] ?? '',
        'formatted_address' => $result['formatted_address'] ?? '',
        'address' => []
    ];
    
    // Processar componentes do endereço para formato compatível com Viator
    if (isset($result['address_components'])) {
        $address_components = [];
        
        foreach ($result['address_components'] as $component) {
            $types = $component['types'];
            $long_name = $component['long_name'];
            
            if (in_array('street_number', $types)) {
                $address_components['street_number'] = $long_name;
            } elseif (in_array('route', $types)) {
                $address_components['route'] = $long_name;
            } elseif (in_array('locality', $types) || in_array('administrative_area_level_2', $types)) {
                $address_components['city'] = $long_name;
            } elseif (in_array('administrative_area_level_1', $types)) {
                $address_components['state'] = $long_name;
            } elseif (in_array('country', $types)) {
                $address_components['country'] = $long_name;
            } elseif (in_array('postal_code', $types)) {
                $address_components['postcode'] = $long_name;
            }
        }
        
        // Montar endereço no formato esperado pelo sistema
        $street_parts = [];
        if (!empty($address_components['street_number'])) {
            $street_parts[] = $address_components['street_number'];
        }
        if (!empty($address_components['route'])) {
            $street_parts[] = $address_components['route'];
        }
        
        $place_details['address'] = [
            'street' => implode(' ', $street_parts),
            'city' => $address_components['city'] ?? '',
            'state' => $address_components['state'] ?? '',
            'country' => $address_components['country'] ?? '',
            'postcode' => $address_components['postcode'] ?? ''
        ];
    }
    
    // Se não conseguimos processar os componentes, usar o endereço formatado
    if (empty($place_details['address']['street']) && empty($place_details['address']['city'])) {
        $place_details['address']['street'] = $place_details['formatted_address'];
    }
    
    // Cache por 7 dias
    set_transient($cache_key, $place_details, 7 * DAY_IN_SECONDS);
    
    return $place_details;
}

/**
 * Format location address for display
 */
function viator_format_location_address($address) {
    $parts = [];
    
    if (!empty($address['street'])) {
        $parts[] = trim($address['street'], ', ');
    }
    
    if (!empty($address['city'])) {
        $parts[] = $address['city'];
    }
    
    if (!empty($address['state'])) {
        $parts[] = $address['state'];
    }
    
    if (!empty($address['country'])) {
        $parts[] = $address['country'];
    }
    
    if (!empty($address['postcode'])) {
        $parts[] = $address['postcode'];
    }
    
    // Remove empty parts and join with commas
    $parts = array_filter($parts, function($part) {
        return !empty(trim($part));
    });
    
    return implode(', ', $parts);
}





