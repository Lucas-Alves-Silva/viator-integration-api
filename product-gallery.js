document.addEventListener('DOMContentLoaded', function() {
    // Initialize the image gallery functionality
    initProductGallery();
});

function initProductGallery() {
    const mainImage = document.querySelector('.viator-main-image img');
    const thumbnails = document.querySelectorAll('.viator-thumbnail');
    
    if (!mainImage || thumbnails.length === 0) return;
    
    // Store original main image for reset
    const originalMainSrc = mainImage.src;
    
    // Add click event to each thumbnail
    thumbnails.forEach(thumbnail => {
        thumbnail.addEventListener('click', function() {
            // Get the clicked thumbnail image source
            const thumbnailImg = this.querySelector('img');
            const newSrc = thumbnailImg.src;
            
            // Update main image with the clicked thumbnail source
            mainImage.src = newSrc;
            
            // Update active class
            thumbnails.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Create lightbox elements
    createLightbox();
    
    // Add click event to main image to open lightbox
    mainImage.addEventListener('click', function() {
        openLightbox(mainImage.src);
    });
}

function createLightbox() {
    // Check if lightbox already exists
    if (document.getElementById('viator-lightbox')) return;
    
    // Create lightbox container
    const lightbox = document.createElement('div');
    lightbox.id = 'viator-lightbox';
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
    closeBtn.addEventListener('click', closeLightbox);
    
    // Close lightbox when clicking outside the image
    lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });
    
    // Add keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (!document.getElementById('viator-lightbox').classList.contains('active')) return;
        
        if (e.key === 'Escape') {
            closeLightbox();
        } else if (e.key === 'ArrowLeft') {
            navigateLightbox(-1);
        } else if (e.key === 'ArrowRight') {
            navigateLightbox(1);
        }
    });
    
    // Add navigation events
    const prevBtn = lightbox.querySelector('.viator-lightbox-prev');
    const nextBtn = lightbox.querySelector('.viator-lightbox-next');
    
    prevBtn.addEventListener('click', function() {
        navigateLightbox(-1);
    });
    
    nextBtn.addEventListener('click', function() {
        navigateLightbox(1);
    });
}

function openLightbox(imageSrc) {
    const lightbox = document.getElementById('viator-lightbox');
    const lightboxImg = lightbox.querySelector('.viator-lightbox-image');
    const lightboxThumbnails = lightbox.querySelector('.viator-lightbox-thumbnails');
    
    // Get all gallery images
    const thumbnails = document.querySelectorAll('.viator-thumbnail img');
    const mainImage = document.querySelector('.viator-main-image img');
    
    // Create array of all image sources
    const allImages = [mainImage.src];
    thumbnails.forEach(thumb => {
        if (!allImages.includes(thumb.src)) {
            allImages.push(thumb.src);
        }
    });
    
    // Set current image
    lightboxImg.src = imageSrc;
    
    // Find current image index
    window.currentLightboxIndex = allImages.indexOf(imageSrc);
    if (window.currentLightboxIndex === -1) window.currentLightboxIndex = 0;
    
    // Create thumbnails in lightbox
    lightboxThumbnails.innerHTML = '';
    allImages.forEach((src, index) => {
        const thumb = document.createElement('div');
        thumb.className = `viator-lightbox-thumbnail ${index === window.currentLightboxIndex ? 'active' : ''}`;
        
        const img = document.createElement('img');
        img.src = src;
        img.alt = 'Miniatura';
        
        thumb.appendChild(img);
        lightboxThumbnails.appendChild(thumb);
        
        thumb.addEventListener('click', function() {
            window.currentLightboxIndex = index;
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
}

function closeLightbox() {
    const lightbox = document.getElementById('viator-lightbox');
    lightbox.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
}

function navigateLightbox(step) {
    const lightbox = document.getElementById('viator-lightbox');
    const lightboxImg = lightbox.querySelector('.viator-lightbox-image');
    const thumbnails = lightbox.querySelectorAll('.viator-lightbox-thumbnail');
    
    if (thumbnails.length === 0) return;
    
    // Calculate new index
    let newIndex = window.currentLightboxIndex + step;
    
    // Handle wrapping
    if (newIndex >= thumbnails.length) {
        newIndex = 0;
    } else if (newIndex < 0) {
        newIndex = thumbnails.length - 1;
    }
    
    // Update current index
    window.currentLightboxIndex = newIndex;
    
    // Update image
    const newSrc = thumbnails[newIndex].querySelector('img').src;
    lightboxImg.src = newSrc;
    
    // Update active thumbnail
    thumbnails.forEach((thumb, index) => {
        thumb.classList.toggle('active', index === newIndex);
    });
}