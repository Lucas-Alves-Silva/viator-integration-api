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
    $description = isset($product['description']) ? esc_html($product['description']) : 'Descrição não disponível';
    $rating = isset($product['reviews']['combinedAverageRating']) ? number_format($product['reviews']['combinedAverageRating'], 1) : 0;
    $review_count = isset($product['reviews']['totalReviews']) ? intval($product['reviews']['totalReviews']) : 0;
    
    // Format price
    $price = isset($product['pricing']['summary']['fromPrice']) ? 'R$ ' . number_format($product['pricing']['summary']['fromPrice'], 2, ',', '.') : 'Preço não disponível';
    $original_price = isset($product['pricing']['summary']['fromPriceBeforeDiscount']) ? 'R$ ' . number_format($product['pricing']['summary']['fromPriceBeforeDiscount'], 2, ',', '.') : '';
    
    // Get duration
    $duration = 'Duração não disponível';
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
    }
    
    // Get images
    $images = [];
    if (isset($product['images']) && is_array($product['images'])) {
        foreach ($product['images'] as $image) {
            if (isset($image['variants']) && !empty($image['variants'])) {
                // Get the highest quality image available
                $image_url = $image['variants'][count($image['variants']) - 1]['url'];
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
    
    // Start HTML output
    ob_start();
    ?>
    <div class="viator-product-detail">
        <!-- Breadcrumbs -->
        <div class="viator-breadcrumbs">
            <a href="<?php echo esc_url(home_url()); ?>">Home</a> &gt; 
            <?php if (!empty($destination)): ?>
                <a href="<?php echo esc_url(add_query_arg('viator_query', urlencode($destination), home_url())); ?>">
                    <?php echo esc_html($destination); ?>
                </a> &gt; 
            <?php endif; ?>
            <span><?php echo esc_html($title); ?></span>
        </div>
        
        <!-- Product Header -->
        <div class="viator-product-header">
            <h1><?php echo esc_html($title); ?></h1>
            
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
                            echo '⯨'; // Half star
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
            
            <!-- Product Description -->
            <div class="viator-product-description">
                <?php echo wpautop($description); ?>
            </div>

            <!-- Duration and Location -->
            <div class="viator-product-info">
                <div class="viator-info-item">
                    <span class="viator-info-label">Duração:</span>
                    <span class="viator-info-value"><?php echo esc_html($duration); ?></span>
                </div>
                <?php if (!empty($destination)): ?>
                <div class="viator-info-item">
                    <span class="viator-info-label">Localização:</span>
                    <span class="viator-info-value"><?php echo esc_html($destination); ?></span>
                </div>
                <?php endif; ?>
            </div>

            <!-- Price Section -->
            <div class="viator-product-price-section">
                <?php if (!empty($original_price)): ?>
                <div class="viator-product-original-price"><?php echo esc_html($original_price); ?></div>
                <?php endif; ?>
                <div class="viator-product-price"><?php echo esc_html($price); ?></div>
                <div class="viator-product-price-note">*Preço por pessoa</div>
            </div>

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
        </div>
    </div>
    <?php
    // Get the buffered content and clean the buffer
    $output = ob_get_clean();
    return $output;
}