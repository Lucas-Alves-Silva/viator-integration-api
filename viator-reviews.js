/**
 * Viator Reviews Script
 * Handles fetching and displaying reviews from Viator API
 */

jQuery(document).ready(function($) {
    // Constants
    const REVIEWS_PER_PAGE = 5; // Quantidade de avaliações por página
    const API_ENDPOINT = '/wp-admin/admin-ajax.php';
    
    // Elements
    const $reviewsList = $('.viator-reviews-list');
    const $pagination = $('.viator-reviews-pagination');
    const $filterButtons = $('.viator-reviews-filter button');
    const $body = $('body');
    
    // State
    let currentPage = 1;
    let currentFilter = 'all';
    let totalReviews = 0;
    let totalPages = 0;
    let productCode = $reviewsList.data('product-code');
    let allReviews = []; // Armazena todas as avaliações carregadas
    let isLoading = false; // Flag para evitar requisições múltiplas
    const REVIEWS_BATCH_SIZE = 100; // Quantidade de avaliações a buscar por requisição API

    // We'll use the existing lightbox from product-gallery.js
    // No need to create a new lightbox container here
    
    // Initialize
    if ($reviewsList.length && productCode) {
        loadReviews(currentPage, currentFilter);
    }
    
    // Event Listeners
    $filterButtons.on('click', function() {
        const $button = $(this);
        currentFilter = $button.data('rating');
        currentPage = 1;
        allReviews = []; // Limpa as avaliações ao mudar o filtro

        // Update active button
        $filterButtons.removeClass('active');
        $button.addClass('active');
        
        // Reload reviews with new filter
        loadReviews(currentPage, currentFilter);
    });
    
    // Create a separate lightbox for reviews to avoid conflicts with product gallery
    function createReviewsLightbox() {
        // Check if reviews lightbox already exists
        if (document.getElementById('viator-reviews-lightbox')) return;
        
        // Create lightbox container
        const lightbox = document.createElement('div');
        lightbox.id = 'viator-reviews-lightbox';
        lightbox.className = 'viator-lightbox';
        
        // Create lightbox content
        lightbox.innerHTML = `
            <div class="viator-lightbox-content">
                <span class="viator-lightbox-close">&times;</span>
                <div class="viator-lightbox-image-container">
                    <img class="viator-lightbox-image" src="" alt="Imagem em tamanho grande">
                    <a class="viator-lightbox-prev">&#10094;</a>
                    <a class="viator-lightbox-next">&#10095;</a>
                </div>
                <div class="viator-lightbox-thumbnails"></div>
            </div>
        `;
        
        // Add lightbox to body
        document.body.appendChild(lightbox);
        
        // Add close event
        const closeBtn = lightbox.querySelector('.viator-lightbox-close');
        closeBtn.addEventListener('click', closeReviewsLightbox);
        
        // Close lightbox when clicking outside the image
        lightbox.addEventListener('click', function(e) {
            if (e.target === lightbox) {
                closeReviewsLightbox();
            }
        });
        
        // Add keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (!document.getElementById('viator-reviews-lightbox').classList.contains('active')) return;
            
            if (e.key === 'Escape') {
                closeReviewsLightbox();
            } else if (e.key === 'ArrowLeft') {
                navigateReviewsLightbox(-1);
            } else if (e.key === 'ArrowRight') {
                navigateReviewsLightbox(1);
            }
        });
        
        // Add navigation events
        const prevBtn = lightbox.querySelector('.viator-lightbox-prev');
        const nextBtn = lightbox.querySelector('.viator-lightbox-next');
        
        prevBtn.addEventListener('click', function() {
            navigateReviewsLightbox(-1);
        });
        
        nextBtn.addEventListener('click', function() {
            navigateReviewsLightbox(1);
        });
    }
    
    function closeReviewsLightbox() {
        const lightbox = document.getElementById('viator-reviews-lightbox');
        lightbox.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }
    
    function navigateReviewsLightbox(step) {
        const lightbox = document.getElementById('viator-reviews-lightbox');
        const lightboxImg = lightbox.querySelector('.viator-lightbox-image');
        const thumbnails = lightbox.querySelectorAll('.viator-lightbox-thumbnail');
        
        if (thumbnails.length === 0 || !window.reviewImagesArray) return;
        
        // Calculate new index
        let newIndex = window.reviewsLightboxIndex + step;
        
        // Handle wrapping
        if (newIndex >= window.reviewImagesArray.length) {
            newIndex = 0;
        } else if (newIndex < 0) {
            newIndex = window.reviewImagesArray.length - 1;
        }
        
        // Update current index
        window.reviewsLightboxIndex = newIndex;
        
        // Update image
        lightboxImg.src = window.reviewImagesArray[newIndex];
        
        // Update active thumbnail
        thumbnails.forEach((thumb, index) => {
            thumb.classList.toggle('active', index === newIndex);
        });
    }
    
    // Initialize reviews lightbox
    createReviewsLightbox();
    
    // Lightbox event listeners for review photos
    $(document).on('click', '.viator-review-photo img', function() {
        const imgSrc = $(this).data('full-src') || $(this).attr('src');
        const $reviewItem = $(this).closest('.viator-review-item');
        
        // Get all images from this specific review
        const reviewImages = [];
        $reviewItem.find('.viator-review-photo img').each(function() {
            const fullSrc = $(this).data('full-src') || $(this).attr('src');
            reviewImages.push(fullSrc);
        });
        
        // Store the review images array for the reviews lightbox
        window.reviewImagesArray = reviewImages;
        window.reviewsLightboxIndex = reviewImages.indexOf(imgSrc);
        if (window.reviewsLightboxIndex === -1) window.reviewsLightboxIndex = 0;
        
        // Use the dedicated reviews lightbox
        const lightbox = document.getElementById('viator-reviews-lightbox');
        const lightboxImg = lightbox.querySelector('.viator-lightbox-image');
        const lightboxThumbnails = lightbox.querySelector('.viator-lightbox-thumbnails');
        
        // Set current image
        lightboxImg.src = imgSrc;
        
        // Create thumbnails in lightbox
        lightboxThumbnails.innerHTML = '';
        reviewImages.forEach((src, index) => {
            const thumb = document.createElement('div');
            thumb.className = `viator-lightbox-thumbnail ${index === window.reviewsLightboxIndex ? 'active' : ''}`;
            
            const img = document.createElement('img');
            img.src = src;
            img.alt = 'Miniatura';
            
            thumb.appendChild(img);
            lightboxThumbnails.appendChild(thumb);
            
            thumb.addEventListener('click', function() {
                window.reviewsLightboxIndex = index;
                lightboxImg.src = src;
                
                // Update active thumbnail
                lightboxThumbnails.querySelectorAll('.viator-lightbox-thumbnail').forEach((t, i) => {
                    t.classList.toggle('active', i === index);
                });
            });
        });
        
        // Show lightbox
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
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
        // Se já estiver carregando, não faz nada
        if (isLoading) return;

        // Calcula o índice inicial da avaliação para a página solicitada
        const requestedStartIndex = (page - 1) * REVIEWS_PER_PAGE;

        // Verifica se as avaliações para esta página já foram carregadas
        if (allReviews.length > requestedStartIndex || (totalReviews > 0 && allReviews.length >= totalReviews)) {
            // Avaliações já carregadas, apenas exibe a página correta
            displayReviews(page);
            return;
        }

        // Se chegou aqui, precisa buscar mais avaliações da API
        isLoading = true;
        // Show loading state only if the list is currently empty
        if (allReviews.length === 0) {
            $reviewsList.html('<div class="viator-reviews-loading">Carregando avaliações...</div>');
        }
        $pagination.addClass('loading'); // Adiciona um estado de loading na paginação

        // Prepare ratings array for API
        let ratingsArray = [];
        if (rating !== 'all') {
            ratingsArray = [parseInt(rating)];
        } else {
            ratingsArray = [5, 4, 3, 2, 1];
        }
        
        // Calculate start position for the *next batch* from the API
        const apiStart = allReviews.length + 1;

        // Prepare request data
        const requestData = {
            action: 'viator_get_reviews',
            product_code: productCode,
            count: REVIEWS_BATCH_SIZE, // Busca um lote maior da API
            start: apiStart,
            ratings: ratingsArray,
            sort_by: 'MOST_RECENT_PER_LOCALE'
            // Remove o 'limit' fixo, pois agora controlamos pelo 'count' e 'start'
        };

        // Make AJAX request
        $.ajax({
            url: API_ENDPOINT,
            type: 'POST',
            data: requestData,
            success: function(response) {
                if (response.success) {
                    // Adiciona as novas avaliações ao array existente
                    allReviews = allReviews.concat(response.data.reviews || []);
                    totalReviews = response.data.totalCount || allReviews.length; // Atualiza o total
                    displayReviews(page); // Exibe a página solicitada com os dados atualizados
                } else {
                    // Se for a primeira carga e falhar
                    if (allReviews.length === 0) {
                         $reviewsList.html('<div class="viator-no-reviews">Não foi possível carregar as avaliações. ' +
                                     (response.data.message || 'Tente novamente mais tarde.') + '</div>');
                    }
                    // TODO: Adicionar feedback visual na paginação em caso de erro?
                }
            },
            error: function() {
                 // Se for a primeira carga e falhar
                 if (allReviews.length === 0) {
                    $reviewsList.html('<div class="viator-no-reviews">Erro ao carregar avaliações. Tente novamente mais tarde.</div>');
                 }
                 // TODO: Adicionar feedback visual na paginação em caso de erro?
            },
            complete: function() {
                isLoading = false; // Libera para novas requisições
                $pagination.removeClass('loading'); // Remove estado de loading da paginação
            }
        });
    }

    /**
     * Display reviews in the reviews list for a specific page
     * @param {number} page - The page number to display
     */
    function displayReviews(page) {
        // Update state
        // totalReviews já foi atualizado na função loadReviews ou na inicialização
        totalPages = Math.ceil(totalReviews / REVIEWS_PER_PAGE);

        // Clear reviews list
        $reviewsList.empty();

        // Check if there are reviews
        if (!allReviews || allReviews.length === 0) {
            $reviewsList.html('<div class="viator-no-reviews">Nenhuma avaliação encontrada para esta classificação.</div>');
            $pagination.empty();
            return;
        }

        // Calcular quais avaliações mostrar na página atual
        const startIndex = (page - 1) * REVIEWS_PER_PAGE;
        // Garante que não tentamos acessar um índice fora dos limites
        const endIndex = Math.min(startIndex + REVIEWS_PER_PAGE, allReviews.length);
        const currentPageReviews = allReviews.slice(startIndex, endIndex);

        // Se por algum motivo não houver avaliações para a página atual (pode acontecer se totalReviews for impreciso inicialmente)
        if (currentPageReviews.length === 0 && allReviews.length > 0) {
             $reviewsList.html('<div class="viator-no-reviews">Não há mais avaliações para exibir nesta página.</div>');
        } else {
            // Display each review for current page only
            currentPageReviews.forEach(function(review) {
                const reviewHtml = createReviewHtml(review);
                $reviewsList.append(reviewHtml);
            });
        }

        // Update pagination
        updatePagination();
    }
    
    /**
     * Create HTML for a single review
     * @param {Object} review - The review object
     * @return {string} The HTML for the review
     */
    function createReviewHtml(review) {
        // Format date - use publishedDate instead of submissionDate
        const reviewDate = new Date(review.publishedDate);
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
        
        // Check for photos in the review object
        if (review.photos && review.photos.length > 0) {
            photosHtml = '<div class="viator-review-photos">';
            review.photos.forEach(function(photo) {
                photosHtml += `
                    <div class="viator-review-photo">
                        <img src="${photo.url}" data-full-src="${photo.url}" alt="Foto da avaliação">
                    </div>
                `;
            });
            photosHtml += '</div>';
        }
        // Check for photos in photosInfo (from API)
        else if (review.photosInfo && review.photosInfo.length > 0) {
            photosHtml = '<div class="viator-review-photos">';
            review.photosInfo.forEach(function(photoInfo) {
                if (photoInfo.photoVersions && photoInfo.photoVersions.length > 0) {
                    // Find thumbnail version for display
                    const thumbnail = photoInfo.photoVersions.find(v => v.sizeType === 'THUMBNAIL') || photoInfo.photoVersions[0];
                    
                    // Find the largest image version by comparing width and height
                    let fullSize = photoInfo.photoVersions[0];
                    photoInfo.photoVersions.forEach(version => {
                        // If this version has larger dimensions than our current fullSize
                        if ((version.width > fullSize.width) || 
                            (version.width === fullSize.width && version.height > fullSize.height)) {
                            fullSize = version;
                        }
                    });
                    
                    photosHtml += `
                        <div class="viator-review-photo">
                            <img src="${thumbnail.url}" data-full-src="${fullSize.url}" class="review-photo" alt="Foto da avaliação">
                        </div>
                    `;
                  }
                }
            );
            photosHtml += '</div>';
        }
        
        // Create review HTML
        return `
            <div class="viator-review-item">
                <div class="viator-review-header">
                    <div class="viator-review-author">${review.userName || review.authorName || 'Viajante anônimo'}</div>
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