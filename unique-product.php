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
        $product_url = "https://api.sandbox.viator.com/partner/products/{$rec_product_code}";
        
        viator_debug_log('Buscando detalhes do produto recomendado:', $rec_product_code);
        
        $product_response = wp_remote_get($product_url, [
            'headers' => [
                'Accept'           => 'application/json;version=2.0',
                'Content-Type'     => 'application/json;version=2.0',
                'exp-api-key'      => $api_key,
                'Accept-Language'  => $locale_settings['language'],
            ],
            'timeout' => 30,
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

function viator_get_product_details($product_code) {
    // Get API key from settings
    $api_key = get_option('viator_api_key');
    if (empty($api_key)) {
        return '<p class="error">' . esc_html(viator_t('error_api_key')) . '</p>';
    }
    
    // Obter configurações de idioma e moeda
    $locale_settings = viator_get_locale_settings();
    
    // API endpoint
    $url = "https://api.sandbox.viator.com/partner/products/{$product_code}";
    
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
    
    // Get main product details
    $title = isset($product['title']) ? esc_html($product['title']) : 'Título não disponível';
    
    // Armazena o título do produto em cache para uso na função de título da página
    if (isset($product['title'])) {
        set_transient('viator_product_' . $product_code . '_title', $product['title'], DAY_IN_SECONDS);
    }
    $description = isset($product['description']) ? esc_html($product['description']) : 'Descrição não disponível';
    $rating = isset($product['reviews']['combinedAverageRating']) ? number_format($product['reviews']['combinedAverageRating'], 1) : 0;
    $review_count = isset($product['reviews']['totalReviews']) ? intval($product['reviews']['totalReviews']) : 0;
    
    // Try to get price from product API response first
    $has_price_data = isset($product['pricing']['summary']['fromPrice']);
    $price = $has_price_data ? $locale_settings['currency_symbol'] . ' ' . number_format($product['pricing']['summary']['fromPrice'], 2, ',', '.') : 'Preço não disponível';
    $original_price = isset($product['pricing']['summary']['fromPriceBeforeDiscount']) ? $locale_settings['currency_symbol'] . ' ' . number_format($product['pricing']['summary']['fromPriceBeforeDiscount'], 2, ',', '.') : '';
    
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
            // Removida chave extra aqui
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
    // Se não encontrou no cache específico, tenta obter da resposta da API do produto
    else if (isset($product['duration']['fixedDurationInMinutes'])) {
        $minutes = $product['duration']['fixedDurationInMinutes'];
        if ($minutes >= 1440) { // 24 hours or more
            $days = floor($minutes / 1440);
            $remaining_minutes = $minutes % 1440;
            $hours = floor($remaining_minutes / 60);
            
            $duration = $days . ' dia' . ($days != 1 ? 's' : '');
            if ($hours > 0) {
                $duration .= ' e ' . $hours . ' hora' . ($hours != 1 ? 's' : '');
            }
        } elseif ($minutes < 60) {
            $duration = $minutes . ' minutos';
        } else {
            $hours = floor($minutes / 60);
            $remaining_minutes = $minutes % 60;
            $duration = $hours . ' hora' . ($hours != 1 ? 's' : '') . 
                       ($remaining_minutes > 0 ? ' e ' . $remaining_minutes . ' minuto' . ($remaining_minutes != 1 ? 's' : '') : '');
        }
        
        // Armazena a duração formatada em cache para uso futuro
        set_transient($formatted_duration_cache_key, $duration, 7 * DAY_IN_SECONDS);
    } else {
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
    
    // Get tags
    $tags = isset($product['tags']) ? $product['tags'] : [];

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
            </div>
    
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
                        <div class="viator-product-price-note"><?php echo esc_html(viator_t('price_per_person')); ?></div>
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
                
                <!-- Botão de Verificar Disponibilidade -->
                <button class="button-check-availability"><?php echo esc_html(viator_t('check_availability')); ?></button>
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
                                        'Gratuities' => 'Gorjetas',
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
                                        'Gratuities' => 'Gorjetas',
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
                            
                            // Check for GUIDE format
                            if (preg_match('/GUIDE\s+(\w+)\s+\w+\/SERVICE_GUIDE/i', $language, $matches)) {
                                $language_code = strtolower($matches[1]);
                                $service_type = viator_t('guide_service');
                            }
                            // Check for WRITTEN format
                            elseif (preg_match('/WRITTEN\s+(\w+)\s+\w+\/SERVICE_WRITTEN/i', $language, $matches)) {
                                $language_code = strtolower($matches[1]);
                                $service_type = viator_t('written_service');
                            }
                            // Check for AUDIO format
                            elseif (preg_match('/AUDIO\s+(\w+)\s+\w+\/SERVICE_AUDIO/i', $language, $matches)) {
                                $language_code = strtolower($matches[1]);
                                $service_type = viator_t('audio_service');
                            }
                            // Default fallback for other formats
                            else {
                                // Remove service type prefix and suffix
                                $language_code = strtolower(preg_replace('/(?:GUIDE|WRITTEN)\s+|\s*\/.*$/i', '', $language));
                                
                                // Try to determine service type from the string
                                if (stripos($language, 'GUIDE') !== false) {
                                    $service_type = viator_t('guide_service');
                                } elseif (stripos($language, 'WRITTEN') !== false) {
                                    $service_type = viator_t('written_service');
                                } else {
                                    $service_type = viator_t('audio_service');
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
                                'th' => 'Tailandês',
                                'cs' => 'Tcheco',
                                'hu' => 'Húngaro',
                                'el' => 'Grego'
                            ];
                            
                            // Display language name with service type in parentheses if available
                            $display_name = isset($language_names[$language_code]) ? $language_names[$language_code] : $language;
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
                                'toDate' => $next_year
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

        <!-- Tags -->
        <?php if (!empty($tags)): ?>
            <div class="viator-tags">
                <h2><?php echo esc_html(viator_t('tags')); ?></h2>
                <div class="viator-tag-list">
                    <?php foreach ($tags as $tag): ?>
                        <span class="viator-tag"><?php echo esc_html($tag); ?></span>
                    <?php endforeach; ?>
                </div>
            </div>
        <?php endif; ?>
    </div>
    <?php
    // Get the buffered content and clean the buffer
    $output = ob_get_clean();
    return $output;
}

/**
 * Add timezone formatter script and reviews script
 */
function viator_enqueue_product_scripts() {
    wp_enqueue_script('timezone-formatter', plugin_dir_url(__FILE__) . 'timezone-formatter.js', array('jquery'), '1.0.0', true);
    
    // Enqueue reviews script only on product pages
    global $post;
    if (is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'viator_product')) {
        wp_enqueue_script('viator-reviews', plugin_dir_url(__FILE__) . 'viator-reviews.js', array('jquery'), '1.0.1', true);
        
        // Get locale settings
        $locale_settings = viator_get_locale_settings();
        
        // Map language codes to JavaScript locale format
        $js_locale_map = [
            'pt-BR' => 'pt-BR',
            'en-US' => 'en-US', 
            'es-ES' => 'es-ES'
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
                'anonymous_traveler' => viator_t('anonymous_traveler')
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

    // Gerar chave única para o cache com base nos parâmetros da requisição AJAX
    // Usamos os parâmetros POST originais para garantir que diferentes filtros/páginas tenham caches distintos
    $cache_key_params = array(
        'product_code' => $product_code,
        'count' => isset($_POST['count']) ? intval($_POST['count']) : 10, // Usar o count original do POST para a chave
        'start' => isset($_POST['start']) ? intval($_POST['start']) : 1, // Usar o start original do POST para a chave
        'ratings' => isset($_POST['ratings']) && is_array($_POST['ratings']) ? array_map('intval', $_POST['ratings']) : [5, 4, 3, 2, 1],
        'sort_by' => $sort_by
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
        'provider' => 'ALL',
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