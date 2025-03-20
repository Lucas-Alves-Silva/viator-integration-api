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
        // Obtém o código do produto da URL
        $product_code = isset($_GET['product_code']) ? sanitize_text_field($_GET['product_code']) : '';
        
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
                    $response = wp_remote_get($url, [
                        'headers' => [
                            'Accept'           => 'application/json;version=2.0',
                            'Content-Type'     => 'application/json;version=2.0',
                            'exp-api-key'      => $api_key,
                            'Accept-Language'  => 'pt-BR',
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
        $atts['product_code'] = isset($_GET['product_code']) ? sanitize_text_field($_GET['product_code']) : '';
    }
    
    // If still no product code, show error message
    if (empty($atts['product_code'])) {
        return '<div class="viator-error">Código do produto não fornecido.</div>';
    }
    
    // Get product details
    return viator_get_product_details($atts['product_code']);
}
add_shortcode('viator_product', 'viator_product_detail_shortcode');

/**
 * Fetch and display product details from Viator API
 */
function viator_get_product_details($product_code) {
    // Get API key from settings
    $api_key = get_option('viator_api_key');
    if (empty($api_key)) {
        return '<p class="error">Por favor, configure sua chave API da Viator nas configurações do WordPress.</p>';
    }
    
    // API endpoint
    $url = "https://api.sandbox.viator.com/partner/products/{$product_code}";
    
    // Make API request
    $response = wp_remote_get($url, [
        'headers' => [
            'Accept'           => 'application/json;version=2.0',
            'Content-Type'     => 'application/json;version=2.0',
            'exp-api-key'      => $api_key,
            'Accept-Language'  => 'pt-BR',
        ],
        'timeout' => 120,
    ]);
    
    // Check for errors
    if (is_wp_error($response)) {
        return '<div class="viator-error">Erro ao buscar detalhes do produto. Por favor, tente novamente mais tarde.</div>';
    }
    
    // Parse response
    $body = wp_remote_retrieve_body($response);
    $product = json_decode($body, true);
    
    // Check if product exists
    if (empty($product) || isset($product['error'])) {
        return '<div class="viator-error">Produto não encontrado ou indisponível.</div>';
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
    $price = $has_price_data ? 'R$ ' . number_format($product['pricing']['summary']['fromPrice'], 2, ',', '.') : 'Preço não disponível';
    $original_price = isset($product['pricing']['summary']['fromPriceBeforeDiscount']) ? 'R$ ' . number_format($product['pricing']['summary']['fromPriceBeforeDiscount'], 2, ',', '.') : '';
    
    // Initialize flags variable
    $flags = isset($product['flags']) ? $product['flags'] : [];
    
    // If price is not available in product API response, try to get it from stored search results
    if (!$has_price_data || $price === 'Preço não disponível') {
        $stored_price_data = get_option('viator_product_' . $product_code . '_price');
        if ($stored_price_data && isset($stored_price_data['fromPrice'])) {
            $price = 'R$ ' . number_format($stored_price_data['fromPrice'], 2, ',', '.');
            
            // If it's a special offer, also get the original price
            if (isset($stored_price_data['fromPriceBeforeDiscount']) && !empty($stored_price_data['fromPriceBeforeDiscount'])) {
                $original_price = 'R$ ' . number_format($stored_price_data['fromPriceBeforeDiscount'], 2, ',', '.');
            }
            
            // Update flags if they're available in stored data
            if (isset($stored_price_data['flags']) && is_array($stored_price_data['flags'])) {
                $flags = array_unique(array_merge($flags, $stored_price_data['flags']));
                $has_free_cancellation = in_array('FREE_CANCELLATION', $flags);
                $is_likely_to_sell_out = in_array('LIKELY_TO_SELL_OUT', $flags);
                $is_special_offer = in_array('SPECIAL_OFFER', $flags);
            }
        }
    }
    
    // Get duration
    $duration = 'Duração não disponível';
    
    // Primeiro tenta obter a duração da resposta da API do produto
    if (isset($product['duration']['fixedDurationInMinutes'])) {
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
    } else {
        // Se não encontrar na resposta da API, tenta obter dos dados armazenados
        $stored_data = get_option('viator_product_' . $product_code . '_price');
        
        if ($stored_data && isset($stored_data['duration']) && $stored_data['duration'] !== 'Duração não disponível') {
            // Usa a duração formatada que foi armazenada durante a pesquisa
            $duration = $stored_data['duration'];
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
    
    // Get flags
    $flags = isset($product['flags']) ? $product['flags'] : [];
    $has_free_cancellation = in_array('FREE_CANCELLATION', $flags);
    $is_likely_to_sell_out = in_array('LIKELY_TO_SELL_OUT', $flags);
    $is_special_offer = in_array('SPECIAL_OFFER', $flags);
    
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
    
    // Start HTML output
    ob_start();
    ?>
    <div class="viator-product-detail">
        <!-- Breadcrumbs -->
        <div class="viator-breadcrumbs">
            <a href="<?php echo esc_url(home_url()); ?>" target="_blank">Home</a> &gt; 
            <?php if (!empty($destination)): ?>
                <a href="<?php echo esc_url(add_query_arg('viator_query', urlencode($destination), home_url())); ?>" target="_blank">
                    <?php echo esc_html($destination); ?>
                </a> &gt; 
            <?php endif; ?>
            <span><?php echo esc_html($title); ?></span>
        </div>
        
        <!-- Título do produto -->
        <h1><?php echo esc_html($title); ?></h1>
    
        <div class="viator-product-container">
            <!-- Image Gallery -->
            <div class="viator-product-gallery">
                <?php if (!empty($images)): ?>
                    <div class="viator-main-image">
                        <img src="<?php echo esc_url($images[0]); ?>" alt="<?php echo esc_attr($title); ?>">
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
                    <!-- Rating and Reviews -->
                    <?php if ($rating > 0): ?>
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
                            <span class="viator-rating-number"><?php echo number_format($rating, 1); ?></span>
                            <span class="viator-review-count">(<?php echo $review_count; ?> <?php echo $review_count == 1 ? 'avaliação' : 'avaliações'; ?>)</span>
                        </div>
                    <?php endif; ?>
    
                    <!-- Flags/Badges -->
                    <div class="viator-product-flags">
                        <?php if ($has_free_cancellation): ?>
                            <span class="viator-flag viator-flag-cancelamento">Cancelamento Gratuito</span>
                        <?php endif; ?>
                        <?php if ($is_likely_to_sell_out): ?>
                            <span class="viator-flag viator-flag-esgotamento">Propenso a Esgotar</span>
                        <?php endif; ?>
                        <?php if ($is_special_offer): ?>
                            <span class="viator-flag viator-flag-oferta">Oferta Especial</span>
                        <?php endif; ?>
                    </div>
    
                    <!-- Price Section -->
                    <div class="viator-product-price-section">
                        <?php if (!empty($original_price) && $is_special_offer): ?>
                            <div class="viator-product-original-price"><?php echo esc_html($original_price); ?></div>
                        <?php endif; ?>
                        <div class="viator-product-price"><?php echo esc_html($price); ?></div>
                        <div class="viator-product-price-note">*Preço por pessoa</div>
                    </div>
                </div>
    
                <!-- Quick Info -->
                <div class="viator-quick-info">
                    <div class="viator-info-item">
                        <span class="viator-info-label">Duração:</span>
                        <span class="viator-info-value"><?php echo esc_html($duration); ?></span>
                    </div>
                    <?php if (!empty($timezone)): ?>
                        <div class="viator-info-item">
                            <span class="viator-info-label">Fuso Horário:</span>
                            <span class="viator-info-value"><?php echo esc_html($timezone); ?></span>
                        </div>
                    <?php endif; ?>
                    <?php if (!empty($destination)): ?>
                        <div class="viator-info-item">
                            <span class="viator-info-label">Localização:</span>
                            <span class="viator-info-value"><?php echo esc_html($destination); ?></span>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    
        <!-- Product Description -->
        <div class="viator-product-description">
            <h2>Descrição</h2>
            <?php echo wpautop($description); ?>
        </div>
    
        <!-- Logistics and Special Instructions -->
        <?php if (!empty($logistics) || !empty($special_instructions)): ?>
            <div class="viator-logistics-section">
                <h2>Informações Logísticas</h2>
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
                        <h3>Instruções Especiais</h3>
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
                    <h2>O que está incluído</h2>
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
                    <h2>O que não está incluído</h2>
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
                <h2>Informações Adicionais</h2>
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
                                        // Traduzir os tipos de informações adicionais para português
                                        $info_types_pt = [
                                            'STROLLER_ACCESSIBLE' => 'Acessível para Carrinhos de Bebê',
                                            'PETS_WELCOME' => 'Animais de Serviço Permitidos',
                                            'PUBLIC_TRANSPORTATION_NEARBY' => 'Transporte Público Próximo',
                                            'PHYSICAL_EASY' => 'Adequado para Todos os Níveis de Condicionamento Físico',
                                            'PHYSICAL_MEDIUM' => 'Nível Médio de Atividade Física',
                                            'PHYSICAL_MODERATE' => 'Nível Moderado de Atividade Física',
                                            'PHYSICAL_STRENUOUS' => 'Nível Intenso de Atividade Física',
                                            'WHEELCHAIR_ACCESSIBLE' => 'Acessível para Cadeirantes',
                                            'SURFACES_WHEELCHAIR_ACCESSIBLE' => 'Superfícies acessíveis para cadeira de rodas',
                                            'TRANSPORTATION_WHEELCHAIR_ACCESSIBLE' => 'Transporte acessível para cadeira de rodas',
                                            'INFANT_FRIENDLY' => 'Adequado para Bebês',
                                            'INFANT_SEATS_AVAILABLE' => 'Assentos para Bebês Disponíveis',
                                            'KID_FRIENDLY' => 'Adequado para Crianças',
                                            'SENIOR_FRIENDLY' => 'Adequado para Idosos',
                                            'INFANTS_MUST_SIT_ON_LAPS' => 'Crianças pequenas no colo',
                                            'NO_PREGNANT' => 'Não grávidas',
                                            'NO_HEART_PROBLEMS' => 'Não Cardíacos',
                                            'NO_BACK_PROBLEMS' => 'Problemas de Coluna',
                                            'HEALTH_OTHER' => 'Saúde e outros',
                                            'PICKUP_AVAILABLE' => 'Serviço de Transporte Disponível',
                                            'SHOPPING_OPPORTUNITY' => 'Oportunidade de Compras',
                                            'VEGETARIAN_OPTION' => 'Opção Vegetariana Disponível',
                                            'SKIP_THE_LINE' => 'Acesso Sem Fila',
                                            'PRIVATE_TOUR' => 'Tour Privado',
                                            'GROUP_TOUR' => 'Tour em Grupo',
                                            'OTHER' => 'Outros'
                                        ];
                                        echo esc_html(isset($info_types_pt[$info_type]) ? $info_types_pt[$info_type] : $info_type);
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
                <h2>Política de Cancelamento</h2>
                <?php 
                if (is_array($cancellation_policy)) {
                    // Process each element of the array to extract only the relevant text
                    $processed_policy = [];
                    foreach ($cancellation_policy as $policy) {
                        if (is_string($policy)) {
                            // Remove 'STANDARD' prefix and any numbers or technical codes
                            $clean_policy = preg_replace('/^STANDARD\s*/', '', $policy);
                            // Remove any trailing numbers or 'Array' text
                            $clean_policy = preg_replace('/\s+\d+\s+\d+\s+Array$/', '', $clean_policy);
                            if (!empty($clean_policy)) {
                                $processed_policy[] = $clean_policy;
                            }
                        }
                    }
                    $cancellation_policy = implode(" ", $processed_policy);
                } elseif (is_string($cancellation_policy)) {
                    // Also clean up if it's already a string
                    $cancellation_policy = preg_replace('/^STANDARD\s*/', '', $cancellation_policy);
                    $cancellation_policy = preg_replace('/\s+\d+\s+\d+\s+Array$/', '', $cancellation_policy);
                }
                echo wpautop(esc_html($cancellation_policy)); 
                ?>
            </div>
        <?php endif; ?>
    
        <!-- Language Guides -->
        <?php if (!empty($language_guides)): ?>
            <div class="viator-language-guides">
                <h2>Idiomas Disponíveis</h2>
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
                                $service_type = 'Guia Presencial';
                            }
                            // Check for WRITTEN format
                            elseif (preg_match('/WRITTEN\s+(\w+)\s+\w+\/SERVICE_WRITTEN/i', $language, $matches)) {
                                $language_code = strtolower($matches[1]);
                                $service_type = 'Guia Escrito';
                            }
                            // Check for AUDIO format
                            elseif (preg_match('/AUDIO\s+(\w+)\s+\w+\/SERVICE_AUDIO/i', $language, $matches)) {
                                $language_code = strtolower($matches[1]);
                                $service_type = 'Áudio Guia';
                            }
                            // Default fallback for other formats
                            else {
                                // Remove service type prefix and suffix
                                $language_code = strtolower(preg_replace('/(?:GUIDE|WRITTEN)\s+|\s*\/.*$/i', '', $language));
                                
                                // Try to determine service type from the string
                                if (stripos($language, 'GUIDE') !== false) {
                                    $service_type = 'Guia Presencial';
                                } elseif (stripos($language, 'WRITTEN') !== false) {
                                    $service_type = 'Guia Escrito';
                                } else {
                                    $service_type = 'Áudio Guia';
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
    
        <!-- Tags -->
        <?php if (!empty($tags)): ?>
            <div class="viator-tags">
                <h2>Tags</h2>
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
 * Add timezone formatter script
 */
function viator_enqueue_timezone_script() {
    wp_enqueue_script('timezone-formatter', plugin_dir_url(__FILE__) . 'timezone-formatter.js', array('jquery'), '1.0.0', true);
}
add_action('wp_enqueue_scripts', 'viator_enqueue_timezone_script');