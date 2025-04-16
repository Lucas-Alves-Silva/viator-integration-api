/**
 * Viator Reviews Script
 * Handles fetching and displaying reviews from Viator API
 */

jQuery(document).ready(function($) {
    // Constants
    const REVIEWS_PER_PAGE = 5;
    const API_ENDPOINT = '/wp-admin/admin-ajax.php';
    
    // Elements
    const $reviewsList = $('.viator-reviews-list');
    const $pagination = $('.viator-reviews-pagination');
    const $filterButtons = $('.viator-reviews-filter button');
    
    // State
    let currentPage = 1;
    let currentFilter = 'all';
    let totalReviews = 0;
    let totalPages = 0;
    let productCode = $reviewsList.data('product-code');
    
    // Initialize
    if ($reviewsList.length && productCode) {
        loadReviews(currentPage, currentFilter);
    }
    
    // Event Listeners
    $filterButtons.on('click', function() {
        const $button = $(this);
        currentFilter = $button.data('rating');
        currentPage = 1;
        
        // Update active button
        $filterButtons.removeClass('active');
        $button.addClass('active');
        
        // Reload reviews with new filter
        loadReviews(currentPage, currentFilter);
    });
    
    // Function to handle pagination clicks
    $(document).on('click', '.viator-reviews-pagination button', function() {
        const page = $(this).data('page');
        if (page) {
            currentPage = page;
            loadReviews(currentPage, currentFilter);
            
            // Scroll to reviews section
            $('html, body').animate({
                scrollTop: $('.viator-reviews').offset().top - 100
            }, 500);
        }
    });
    
    /**
     * Load reviews from the server
     * @param {number} page - The page number to load
     * @param {string|number} rating - The rating filter (all, 5, 4, 3, 2, 1)
     */
    function loadReviews(page, rating) {
        // Show loading state
        $reviewsList.html('<div class="viator-reviews-loading">Carregando avaliações...</div>');
        
        // Prepare ratings array for API
        let ratingsArray = [];
        if (rating !== 'all') {
            ratingsArray = [parseInt(rating)];
        } else {
            ratingsArray = [5, 4, 3, 2, 1];
        }
        
        // Calculate start position for pagination
        const start = (page - 1) * REVIEWS_PER_PAGE + 1;
        
        // Prepare request data
        const requestData = {
            action: 'viator_get_reviews',
            product_code: productCode,
            count: REVIEWS_PER_PAGE,
            start: start,
            ratings: ratingsArray,
            sort_by: 'MOST_RECENT_PER_LOCALE'
        };
        
        // Make AJAX request
        $.ajax({
            url: API_ENDPOINT,
            type: 'POST',
            data: requestData,
            success: function(response) {
                if (response.success) {
                    displayReviews(response.data);
                } else {
                    $reviewsList.html('<div class="viator-no-reviews">Não foi possível carregar as avaliações. ' + 
                                     (response.data.message || 'Tente novamente mais tarde.') + '</div>');
                }
            },
            error: function() {
                $reviewsList.html('<div class="viator-no-reviews">Erro ao carregar avaliações. Tente novamente mais tarde.</div>');
            }
        });
    }
    
    /**
     * Display reviews in the reviews list
     * @param {Object} data - The response data from the server
     */
    function displayReviews(data) {
        // Update state
        totalReviews = data.totalCount || 0;
        totalPages = Math.ceil(totalReviews / REVIEWS_PER_PAGE);
        
        // Clear reviews list
        $reviewsList.empty();
        
        // Check if there are reviews
        if (!data.reviews || data.reviews.length === 0) {
            $reviewsList.html('<div class="viator-no-reviews">Nenhuma avaliação encontrada para este produto.</div>');
            $pagination.empty();
            return;
        }
        
        // Display each review
        data.reviews.forEach(function(review) {
            const reviewHtml = createReviewHtml(review);
            $reviewsList.append(reviewHtml);
        });
        
        // Update pagination
        updatePagination();
    }
    
    /**
     * Create HTML for a single review
     * @param {Object} review - The review object
     * @return {string} The HTML for the review
     */
    function createReviewHtml(review) {
        // Format date
        const reviewDate = new Date(review.submissionDate);
        const formattedDate = reviewDate.toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Create stars HTML
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= review.rating) {
                starsHtml += '<span class="star">★</span>';
            } else {
                starsHtml += '<span class="star" style="color: #ddd;">★</span>';
            }
        }
        
        // Create photos HTML if available
        let photosHtml = '';
        if (review.photos && review.photos.length > 0) {
            photosHtml = '<div class="viator-review-photos">';
            review.photos.forEach(function(photo) {
                photosHtml += `
                    <div class="viator-review-photo">
                        <img src="${photo.url}" alt="Foto da avaliação">
                    </div>
                `;
            });
            photosHtml += '</div>';
        }
        
        // Create review HTML
        return `
            <div class="viator-review-item">
                <div class="viator-review-header">
                    <div class="viator-review-author">${review.authorName || 'Viajante anônimo'}</div>
                    <div class="viator-review-date">${formattedDate}</div>
                </div>
                <div class="viator-review-rating">${starsHtml}</div>
                ${review.title ? `<div class="viator-review-title">${review.title}</div>` : ''}
                <div class="viator-review-content">${review.text}</div>
                ${photosHtml}
            </div>
        `;
    }
    
    /**
     * Update pagination controls
     */
    function updatePagination() {
        $pagination.empty();
        
        if (totalPages <= 1) {
            return;
        }
        
        // Add previous button
        if (currentPage > 1) {
            $pagination.append(`<button data-page="${currentPage - 1}">«</button>`);
        }
        
        // Determine which page numbers to show
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        // Adjust if we're near the end
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        // Add page buttons
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            $pagination.append(`<button class="${activeClass}" data-page="${i}">${i}</button>`);
        }
        
        // Add next button
        if (currentPage < totalPages) {
            $pagination.append(`<button data-page="${currentPage + 1}">»</button>`);
        }
    }
});