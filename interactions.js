// Importar o Swiper e seus módulos
document.addEventListener('DOMContentLoaded', function () {
    // Inicializar o botão de filtros móveis
    initializeMobileFilterButton();
    
    // Função para inicializar o botão de filtros móveis
    function initializeMobileFilterButton() {
        const mobileFilterButton = document.getElementById('mobile-filter-button');
        if (mobileFilterButton) {
            // Remover event listeners antigos para evitar duplicação
            mobileFilterButton.replaceWith(mobileFilterButton.cloneNode(true));
            
            // Obter a referência atualizada após a clonagem
            const updatedMobileFilterButton = document.getElementById('mobile-filter-button');
            
            updatedMobileFilterButton.addEventListener('click', function() {
                const filters = document.querySelector('.viator-filters');
                if (filters) {
                    filters.classList.toggle('active');
                    
                    // Adicionar botão de fechar dentro dos filtros se não existir
                    if (!document.querySelector('.viator-filters-close')) {
                        const closeButton = document.createElement('button');
                        closeButton.className = 'viator-filters-close';
                        closeButton.innerHTML = '×';
                        closeButton.style.position = 'absolute';
                        closeButton.style.top = '10px';
                        closeButton.style.right = '10px';
                        closeButton.style.background = 'none';
                        closeButton.style.border = 'none';
                        closeButton.style.fontSize = '24px';
                        closeButton.style.cursor = 'pointer';
                        closeButton.style.color = '#333';
                        
                        closeButton.addEventListener('click', function() {
                            filters.classList.remove('active');
                        });
                        
                        filters.appendChild(closeButton);
                    }
                }
            });
        }
    }
    
    // Expor a função globalmente para poder ser chamada após atualizações AJAX
    window.initializeMobileFilterButton = initializeMobileFilterButton;
    
    // Adicionar elementos para o modal de filtros e o efeito de carregamento
    if (document.querySelector('.viator-content-wrapper')) {
        
        // Adicionar efeito de carregamento
        const loadingEffect = document.createElement('div');
        loadingEffect.className = 'viator-loading-effect';
        document.body.appendChild(loadingEffect);
        
        // Adicionar efeito de pulso para o grid
        const gridElement = document.querySelector('.viator-grid');
        if (gridElement) {
            const pulseLoading = document.createElement('div');
            pulseLoading.className = 'viator-pulse-loading';
            
            // Adicionar 3 círculos para o efeito de pulso
            for (let i = 0; i < 3; i++) {
                const circle = document.createElement('span');
                pulseLoading.appendChild(circle);
            }
            
            gridElement.appendChild(pulseLoading);
        }
    }
    
    // Função para mostrar efeito de carregamento
    function showLoadingEffect() {
        const loadingEffect = document.querySelector('.viator-loading-effect');
        const gridElement = document.querySelector('.viator-grid');
        
        if (loadingEffect) {
            loadingEffect.classList.add('active');
        }
        
        if (gridElement) {
            gridElement.classList.add('loading');
        }
        
        setTimeout(() => {
            if (loadingEffect) {
                loadingEffect.classList.remove('active');
            }
            if (gridElement) {
                gridElement.classList.remove('loading');
            }
        }, 1500);
    }
    
    // Expor a função globalmente
    window.showLoadingEffect = showLoadingEffect;
    
    // Inicializar o Swiper para as recomendações
    if (document.querySelector('.viator-recommendations-slider')) {
        new Swiper('.viator-recommendations-slider', {
            slidesPerView: 3,
            spaceBetween: 20,
            loop: false,
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            breakpoints: {
                320: {
                    slidesPerView: 1,
                    spaceBetween: 10,
                },
                640: {
                    slidesPerView: 2,
                    spaceBetween: 15,
                },
                1024: {
                    slidesPerView: 3,
                    spaceBetween: 15,
                }
            }
        });
    }

    // Verificar se os elementos existem antes de tentar acessá-los
    const searchForm = document.getElementById('viator-search-form');
    const searchButton = searchForm ? document.getElementById('search-button') : null;
    const searchText = searchForm ? document.getElementById('search-text') : null;
    const searchIcon = searchForm ? document.getElementById('search-icon') : null;
    const searchInput = document.querySelector('input[name="viator_query"]');

    // Add focus event listener to search input
    if (searchInput) {
        searchInput.addEventListener('focus', updateNearbySuggestion);
    }

    // Check if searchForm exists before adding event listener
    if (searchForm) {
        // Prevent form submission on enter key and validate input
        searchForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const currentErrorMessageElement = document.querySelector('.viator-error-message');

            if (!searchInput || !searchInput.value.trim()) {
                // Add visual feedback for empty input
                searchInput.classList.add('error');
                if (currentErrorMessageElement) {
                    currentErrorMessageElement.textContent = 'Por favor, insira um destino';
                    currentErrorMessageElement.classList.remove('searching');
                }
                return;
            }

            // Remove error state if input is valid
            searchInput.classList.remove('error');

            if (currentErrorMessageElement) {
                // Verifica se a mensagem de timeout específica está presente
                if (currentErrorMessageElement.textContent.includes("OPS! Aguarde um instante e tente novamente.")) {
                    currentErrorMessageElement.textContent = (viatorConfig.translations.searching || 'Buscando...') + " Por favor, aguarde!";
                    currentErrorMessageElement.classList.add('searching'); // Adiciona classe para estilo de "buscando"
                } else {
                    // Limpa qualquer outra mensagem de erro anterior se não for a de timeout
                    currentErrorMessageElement.textContent = '';
                    currentErrorMessageElement.classList.remove('searching');
                }
            }

            // Update interface for search
            if (searchText) {
                searchText.innerHTML = (viatorConfig.translations.searching || 'Pesquisando') + '<div class="bouncy-loader"><span></span><span></span><span></span></div>';
            }
            if (searchIcon) {
                searchIcon.innerHTML = '✈️';
                searchIcon.classList.add('airplane-icon');
            }
            if (searchButton) {
                searchButton.disabled = true;
            }

            // Add parameter for automatic scroll
            const currentUrl = new URL(window.location.href);
            const params = new URLSearchParams(currentUrl.search);
            params.set('scroll_to_results', '1');
            const newUrl = `${currentUrl.pathname}?${params.toString()}`;
            window.history.replaceState({}, '', newUrl);

            // Submit the form
            searchForm.submit();
        });
    }
    // Adicionar evento para links de paginação
    document.addEventListener('click', function(e) {
        if (e.target.closest('.viator-pagination-btn') || e.target.closest('.viator-pagination-arrow')) {
            e.preventDefault();
            const link = e.target.closest('a');
            if (!link) return;

            // --- INÍCIO DA MODIFICAÇÃO: Atualizar estado visual do botão clicado imediatamente ---
            const paginationButtons = document.querySelectorAll('.viator-pagination-btn');
            paginationButtons.forEach(btn => btn.classList.remove('active'));

            // Se o clique foi diretamente em um botão de número
            if (link.classList.contains('viator-pagination-btn')) {
                link.classList.add('active');
            } else if (link.classList.contains('viator-pagination-arrow')) {
                // Se for uma seta, precisamos determinar qual botão numérico se tornará ativo
                // Isso já é tratado pela atualização do HTML, então aqui apenas garantimos que nenhum outro fique ativo erroneamente
                // A lógica principal de marcar o botão correto após o carregamento do HTML ainda é importante
            }
            // --- FIM DA MODIFICAÇÃO ---

            const gridElement = document.querySelector('.viator-grid');
            if (gridElement) {
                addCustomLoader(gridElement);
                gridElement.style.opacity = '0.5';
            }
            
            // Mostrar efeito de carregamento em dispositivos móveis
            const loadingEffect = document.querySelector('.viator-loading-effect');
            if (loadingEffect) {
                loadingEffect.classList.add('active');
            }

            // Pegar parâmetros da URL do link e da URL atual
            const url = new URL(link.href);
            const params = new URLSearchParams(url.search);
            const currentParams = new URLSearchParams(window.location.search);

            // Manter os parâmetros de todos os filtros ativos
            const searchTerm = params.get('viator_query');
            const sortValue = params.get('viator_sort') || currentParams.get('viator_sort') || 'DEFAULT';
            const pageNumber = params.get('viator_page') || '1';
            
            // Parâmetros de data
            const dateStart = params.get('viator_date_start') || currentParams.get('viator_date_start') || '';
            const dateEnd = params.get('viator_date_end') || currentParams.get('viator_date_end') || '';
            
            // Filtro de duração
            const durationFilter = params.get('duration_filter') || currentParams.get('duration_filter') || '';
            
            // Filtros de preço
            const minPrice = params.get('min_price') || currentParams.get('min_price') || '';
            const maxPrice = params.get('max_price') || currentParams.get('max_price') || '';
            
            // Filtro de avaliação
            const ratingFilter = params.get('rating_filter') || currentParams.get('rating_filter') || '';
            
            // Obter os filtros especiais ativos dos checkboxes marcados
            const specialFilters = [];
            document.querySelectorAll('input[name="special_filter[]"]:checked').forEach(checkbox => {
                specialFilters.push(checkbox.value);
            });

            // Preparar os parâmetros para a requisição AJAX
            const requestParams = {
                action: 'viator_update_sort',
                viator_query: searchTerm,
                viator_sort: sortValue,
                viator_page: pageNumber,
                viator_date_start: dateStart,
                viator_date_end: dateEnd,
                duration_filter: durationFilter,
                min_price: minPrice,
                max_price: maxPrice,
                rating_filter: ratingFilter,
                nonce: viatorAjax.nonce
            };
            
            // Adicionar parâmetros de special_filter
            if (specialFilters.length > 0) {
                specialFilters.forEach((value, index) => {
                    requestParams[`special_filter[${index}]`] = value;
                });
            }
            
            // Atualizar a URL no navegador
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('viator_page', pageNumber);
            newUrl.searchParams.set('viator_sort', sortValue);
            
            if (dateStart) newUrl.searchParams.set('viator_date_start', dateStart);
            if (dateEnd) newUrl.searchParams.set('viator_date_end', dateEnd);
            if (durationFilter) newUrl.searchParams.set('duration_filter', durationFilter);
            if (minPrice) newUrl.searchParams.set('min_price', minPrice);
            if (maxPrice) newUrl.searchParams.set('max_price', maxPrice);
            if (ratingFilter) newUrl.searchParams.set('rating_filter', ratingFilter);
            
            // Limpar parâmetros existentes de special_filter para evitar duplicatas na URL
            newUrl.searchParams.delete('special_filter[]');
            
            // Adicionar valores atualizados de special_filter
            specialFilters.forEach(value => {
                newUrl.searchParams.append('special_filter[]', value);
            });
            
            history.replaceState({}, '', newUrl);

            // Fazer requisição AJAX com todos os parâmetros
            fetch(viatorAjax.ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(requestParams)
            })
            .then(response => response.text())
            .then(html => {
                if (html.trim() === '0' || !html.trim()) {
                    throw new Error('Resposta inválida do servidor');
                }
                
                document.getElementById('viator-results').innerHTML = html;
                
                // Rolar suavemente para o topo dos resultados
                document.getElementById('viator-results').scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
                
                // Reinicializar todos os componentes interativos
                if (typeof reinitializeDatePicker === 'function') {
                    reinitializeDatePicker();
                }
                if (typeof reinitializeDurationFilter === 'function') {
                    reinitializeDurationFilter();
                }
                if (typeof reinitializePriceSlider === 'function') {
                    reinitializePriceSlider();
                }
                if (typeof reinitializeRatingFilter === 'function') {
                    reinitializeRatingFilter();
                }
                
                // Garantir que os filtros especiais sejam sincronizados corretamente
                // Importante: chamar isso após o HTML ter sido atualizado
                setTimeout(() => {
                    if (typeof reinitializeSpecialsFilter === 'function') {
                        reinitializeSpecialsFilter();
                    }
                }, 100);
                
                if (typeof reinitializeClearAllButton === 'function') {
                    reinitializeClearAllButton();
                }
                if (typeof window.initializeMobileFilterButton === 'function') {
                    window.initializeMobileFilterButton();
                }
                updateClearAllButtonState(); // Atualizar estado do botão
            })
            .catch(error => {
                console.error('Erro ao processar paginação:', error);
            })
            .finally(() => {
                if (gridElement) {
                    removeCustomLoader(gridElement);
                    gridElement.style.opacity = '1';
                }
                if (loadingEffect) {
                    loadingEffect.classList.remove('active');
                }
            });
        }
    });

    // Inicializar os filtros de duração
    if (typeof reinitializeDurationFilter === 'function') {
        reinitializeDurationFilter();
    }

    function initializeDatePicker() {
        const dateSelector = document.querySelector('.viator-date-selector');
        if (!dateSelector) return;

        // Destruir instância anterior se existir
        if (window.currentFlatpickr) {
            window.currentFlatpickr.destroy();
        }

        let selectedDateRange = null;

        // Verificar se já existe uma data selecionada na URL
        let url = new URL(window.location.href);
        let params = new URLSearchParams(url.search);
        let savedStartDate = params.get('viator_date_start');
        let savedEndDate = params.get('viator_date_end');

        const fp = flatpickr(dateSelector, {
            mode: "range",
            minDate: "today",
            maxDate: new Date().fp_incr(365),
            dateFormat: "Y-m-d",
            closeOnSelect: false,
            defaultDate: savedStartDate && savedEndDate ? [savedStartDate, savedEndDate] : null,
            locale: viatorConfig.flatpickrLocale || 'default',
            onChange: function(selectedDates, dateStr) {
                if (selectedDates.length === 2) {
                    const startDate = selectedDates[0];
                    const endDate = selectedDates[1];
                    
                    // Ajustar para o fuso horário local
                    startDate.setHours(12, 0, 0, 0);
                    endDate.setHours(12, 0, 0, 0);
                    
                    const formatDate = (date) => {
                        const day = date.getDate();
                        const month = viatorConfig.translations.months_short[date.getMonth()];
                        const connector = viatorConfig.translations.date_connector;
                        
                        if (connector) {
                            return `${day} ${connector} ${month}`;
                        } else {
                            return `${month} ${day}`;
                        }
                    };
                    
                    selectedDateRange = {
                        start: startDate.toISOString().split('T')[0],
                        end: endDate.toISOString().split('T')[0],
                        display: `${formatDate(startDate)} - ${formatDate(endDate)}`
                    };

                    dateSelector.querySelector('span').textContent = selectedDateRange.display;
                } else if (selectedDates.length === 1) {
                    const date = selectedDates[0];
                    date.setHours(12, 0, 0, 0);
                    
                    const formatDate = (date) => {
                        const day = date.getDate();
                        const month = viatorConfig.translations.months_short[date.getMonth()];
                        const connector = viatorConfig.translations.date_connector;
                        
                        if (connector) {
                            return `${day} ${connector} ${month}`;
                        } else {
                            return `${month} ${day}`;
                        }
                    };
                    
                    selectedDateRange = {
                        start: date.toISOString().split('T')[0],
                        end: date.toISOString().split('T')[0],
                        display: formatDate(date)
                    };

                    dateSelector.querySelector('span').textContent = selectedDateRange.display;
                }
            },
            onReady: function(selectedDates, dateStr, instance) {
                // Criar botões
                const buttonsContainer = document.createElement('div');
                buttonsContainer.className = 'flatpickr-buttons';
                
                const resetButton = document.createElement('button');
                resetButton.textContent = viatorConfig.translations.reset_button || 'Redefinir';
                resetButton.className = 'flatpickr-button reset';
                resetButton.type = 'button';
                
                const applyButton = document.createElement('button');
                applyButton.textContent = viatorConfig.translations.apply_button || 'Aplicar';
                applyButton.className = 'flatpickr-button apply';
                applyButton.type = 'button';
                
                buttonsContainer.appendChild(resetButton);
                buttonsContainer.appendChild(applyButton);
                
                // Remover botões antigos se existirem
                const oldButtons = instance.calendarContainer.querySelector('.flatpickr-buttons');
                if (oldButtons) {
                    oldButtons.remove();
                }
                
                instance.calendarContainer.appendChild(buttonsContainer);
                
                // Botão de Reset
                resetButton.addEventListener('click', function() {
                    fp.clear();
                    
                    // Atualizar UI para estado inicial
                    dateSelector.querySelector('span').textContent = viatorConfig.translations.choose_date || 'Escolher data';
                    
                    // Pegar os parâmetros atuais da URL
                    const url = new URL(window.location.href);
                    const params = new URLSearchParams(url.search);
                    
                    // Remover parâmetros de data da URL
                    params.delete('viator_date_start');
                    params.delete('viator_date_end');
                    
                    // Resetar para a primeira página
                    params.set('viator_page', '1');
                    
                    // Manter os demais parâmetros de filtro na URL
                    const searchTerm = params.get('viator_query');
                    const sortValue = params.get('viator_sort') || 'DEFAULT';
                    const durationFilter = params.get('duration_filter') || '';
                    const minPrice = params.get('min_price') || '';
                    const maxPrice = params.get('max_price') || '';
                    const ratingFilter = params.get('rating_filter') || '';
                    
                    // Obter os filtros especiais ativos
                    const specialFilters = [];
                    document.querySelectorAll('input[name="special_filter[]"]:checked').forEach(checkbox => {
                        specialFilters.push(checkbox.value);
                    });
                    
                    // Mostrar indicador de carregamento
                    const gridElement = document.querySelector('.viator-grid');
                    if (gridElement) {
                        addCustomLoader(gridElement);
                        gridElement.style.opacity = '0.5';
                    }
                    
                    // Atualizar a URL
                    const newUrl = new URL(window.location);
                    newUrl.searchParams.delete('viator_date_start');
                    newUrl.searchParams.delete('viator_date_end');
                    newUrl.searchParams.set('viator_page', '1');
                    
                    // Limpar parâmetros existentes de special_filter para evitar duplicatas na URL
                    newUrl.searchParams.delete('special_filter[]');
                    
                    // Adicionar valores atualizados de special_filter
                    specialFilters.forEach(value => {
                        newUrl.searchParams.append('special_filter[]', value);
                    });
                    
                    history.replaceState({}, '', newUrl);
                    
                    // Preparar os parâmetros para a requisição AJAX
                    const requestParams = {
                        action: 'viator_update_filter',
                        viator_query: searchTerm,
                        viator_sort: sortValue,
                        viator_page: '1',
                        viator_date_start: '',
                        viator_date_end: '',
                        duration_filter: durationFilter,
                        min_price: minPrice,
                        max_price: maxPrice,
                        rating_filter: ratingFilter,
                        nonce: viatorAjax.nonce
                    };
                    
                    // Adicionar parâmetros de special_filter
                    if (specialFilters.length > 0) {
                        specialFilters.forEach((value, index) => {
                            requestParams[`special_filter[${index}]`] = value;
                        });
                    }
                    
                    // Fazer requisição AJAX
                    fetch(viatorAjax.ajaxurl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams(requestParams)
                    })
                    .then(response => response.text())
                    .then(html => {
                        if (html.trim() === '0' || !html.trim()) {
                            throw new Error('Resposta inválida do servidor');
                        }
                        
                        document.getElementById('viator-results').innerHTML = html;
                        
                        // Rolar suavemente para o topo dos resultados
                        document.getElementById('viator-results').scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'start' 
                        });
                        
                        // Reinicializar componentes interativos
                        if (typeof reinitializeDatePicker === 'function') {
                            reinitializeDatePicker();
                        }
                        if (typeof reinitializeDurationFilter === 'function') {
                            reinitializeDurationFilter();
                        }
                        if (typeof reinitializePriceSlider === 'function') {
                            reinitializePriceSlider();
                        }
                        if (typeof reinitializeRatingFilter === 'function') {
                            reinitializeRatingFilter();
                        }
                        
                        // Garantir que os filtros especiais sejam sincronizados corretamente
                        // Importante: chamar isso após o HTML ter sido atualizado
                        setTimeout(() => {
                            if (typeof reinitializeSpecialsFilter === 'function') {
                                reinitializeSpecialsFilter();
                            }
                        }, 100);
                        
                        if (typeof reinitializeClearAllButton === 'function') {
                            reinitializeClearAllButton();
                        }
                        if (typeof window.initializeMobileFilterButton === 'function') {
                            window.initializeMobileFilterButton();
                        }
                        updateClearAllButtonState(); // Atualizar estado do botão
                    })
                    .catch(error => {
                        console.error('Erro ao reiniciar datas:', error);
                    })
                    .finally(() => {
                        if (gridElement) {
                            removeCustomLoader(gridElement);
                            gridElement.style.opacity = '1';
                        }
                    });
                });
                
                applyButton.addEventListener('click', function() {
                    if (selectedDateRange) {
                        instance.close();
                        dateSelector.querySelector('span').textContent = selectedDateRange.display;
                        
                        const gridElement = document.querySelector('.viator-grid');
                        if (gridElement) {
                            addCustomLoader(gridElement);
                            gridElement.style.opacity = '0.5';
                        }
                        
                        // Mostrar efeito de carregamento
                        const loadingEffect = document.querySelector('.viator-loading-effect');
                        if (loadingEffect) {
                            loadingEffect.classList.add('active');
                        }
                        
                        let url = new URL(window.location.href);
                        let params = new URLSearchParams(url.search);
                        
                        // Obter todos os parâmetros de filtro atuais
                        const searchTerm = params.get('viator_query');
                        const sortValue = params.get('viator_sort') || 'DEFAULT';
                        const durationFilter = params.get('duration_filter') || '';
                        const minPrice = params.get('min_price') || '';
                        const maxPrice = params.get('max_price') || '';
                        const ratingFilter = params.get('rating_filter') || '';
                        
                        // Obter os filtros especiais ativos
                        const specialFilters = [];
                        document.querySelectorAll('input[name="special_filter[]"]:checked').forEach(checkbox => {
                            specialFilters.push(checkbox.value);
                        });
                        
                        // Verificar se as datas são válidas antes de enviar
                        if (!selectedDateRange.start || !selectedDateRange.end) {
                            console.error('Datas inválidas');
                            
                            // Remover os efeitos de carregamento
                            if (gridElement) {
                                gridElement.style.opacity = '1';
                                gridElement.classList.remove('loading');
                            }
                            if (loadingEffect) {
                                loadingEffect.classList.remove('active');
                            }
                            return;
                        }
                        
                        // Log para debug
                        console.log('Enviando datas:', selectedDateRange.start, selectedDateRange.end);
                        
                        // Preparar os parâmetros para a requisição AJAX
                        const requestParams = {
                            action: 'viator_update_filter',
                            viator_query: searchTerm,
                            viator_sort: sortValue,
                            viator_page: '1',
                            viator_date_start: selectedDateRange.start,
                            viator_date_end: selectedDateRange.end,
                            duration_filter: durationFilter,
                            min_price: minPrice,
                            max_price: maxPrice,
                            rating_filter: ratingFilter,
                            nonce: viatorAjax.nonce
                        };
                        
                        // Adicionar parâmetros de special_filter
                        if (specialFilters.length > 0) {
                            specialFilters.forEach((value, index) => {
                                requestParams[`special_filter[${index}]`] = value;
                            });
                        }
                        
                        // Fazer requisição AJAX com todos os parâmetros
                        fetch(viatorAjax.ajaxurl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                            body: new URLSearchParams(requestParams)
                        })
                        .then(response => response.text())
                        .then(html => {
                            if (html.trim() === '0' || !html.trim()) {
                                throw new Error('Resposta inválida do servidor');
                            }
                            
                            // Atualizar a URL com todos os parâmetros
                            params.set('viator_date_start', selectedDateRange.start);
                            params.set('viator_date_end', selectedDateRange.end);
                            params.set('viator_page', '1');
                            
                            if (sortValue !== 'DEFAULT') {
                                params.set('viator_sort', sortValue);
                            }
                            if (durationFilter) {
                                params.set('duration_filter', durationFilter);
                            }
                            if (minPrice) {
                                params.set('min_price', minPrice);
                            }
                            if (maxPrice) {
                                params.set('max_price', maxPrice);
                            }
                            if (ratingFilter) {
                                params.set('rating_filter', ratingFilter);
                            }
                            
                            // Limpar parâmetros existentes de special_filter para evitar duplicatas na URL
                            url.searchParams.delete('special_filter[]');
                            
                            // Adicionar valores atualizados de special_filter à URL
                            specialFilters.forEach(value => {
                                params.append('special_filter[]', value);
                            });
                            
                            window.history.pushState({}, '', `${url.pathname}?${params.toString()}`);
                            
                            document.getElementById('viator-results').innerHTML = html;
                            
                            // Rolar suavemente para o topo dos resultados
                            document.getElementById('viator-results').scrollIntoView({
                                behavior: 'smooth',
                                block: 'start'
                            });
                            
                            // Reinicializar todos os componentes interativos
                            if (typeof reinitializeDatePicker === 'function') {
                                reinitializeDatePicker();
                            }
                            if (typeof reinitializeDurationFilter === 'function') {
                                reinitializeDurationFilter();
                            }
                            if (typeof reinitializePriceSlider === 'function') {
                                reinitializePriceSlider();
                            }
                            if (typeof reinitializeRatingFilter === 'function') {
                                reinitializeRatingFilter();
                            }
                            
                            // Garantir que os filtros especiais sejam sincronizados corretamente
                            // Importante: chamar isso após o HTML ter sido atualizado
                            setTimeout(() => {
                                if (typeof reinitializeSpecialsFilter === 'function') {
                                    reinitializeSpecialsFilter();
                                }
                            }, 100);
                            
                            if (typeof reinitializeClearAllButton === 'function') {
                                reinitializeClearAllButton();
                            }
                            if (typeof window.initializeMobileFilterButton === 'function') {
                                window.initializeMobileFilterButton();
                            }
                            updateClearAllButtonState(); // Atualizar estado do botão
                        })
                        .catch(error => {
                            console.error('Erro ao atualizar datas:', error);
                        })
                        .finally(() => {
                            if (gridElement) {
                                removeCustomLoader(gridElement);
                                gridElement.style.opacity = '1';
                            }
                            
                            // Remover efeito de carregamento
                            const loadingEffect = document.querySelector('.viator-loading-effect');
                            if (loadingEffect) {
                                loadingEffect.classList.remove('active');
                            }
                        });
                    }
                });
            }
        });

        // Salvar a instância atual globalmente
        window.currentFlatpickr = fp;
        return fp;
    }

    // Inicializar o datepicker
    let flatpickrInstance = initializeDatePicker();

    // Inicializar o filtro de preço
    initializePriceSlider();

    // Inicializar o filtro de avaliação
    initializeRatingFilter();

    // Inicializar o filtro de especiais
    initializeSpecialsFilter();
    
    // Inicializar o botão de limpar tudo
    initializeClearAllButton();
    updateClearAllButtonState(); // Adicionado para estado inicial

    // Função para reinicializar o datepicker
    function reinitializeDatePicker() {
        const dateSelector = document.querySelector('.viator-date-selector');
        if (!dateSelector) return;

        // Pegar os parâmetros da URL atual
        const params = new URLSearchParams(window.location.search);
        const savedStartDate = params.get('viator_date_start');
        const savedEndDate = params.get('viator_date_end');

        // Se houver datas salvas, atualizar o texto do seletor
        if (savedStartDate && savedEndDate) {
            try {
                // Adicionar horário para evitar problemas de fuso
                const startDate = new Date(savedStartDate + 'T12:00:00');
                const endDate = new Date(savedEndDate + 'T12:00:00');
                
                // Verificar se as datas são válidas
                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                    throw new Error('Datas inválidas');
                }
                
                const formatDate = (date) => {
                    const day = date.getDate();
                    const month = viatorConfig.translations.months_short[date.getMonth()];
                    const connector = viatorConfig.translations.date_connector;
                    
                    if (connector) {
                        return `${day} ${connector} ${month}`;
                    } else {
                        return `${month} ${day}`;
                    }
                };

                const displayText = savedStartDate === savedEndDate 
                    ? formatDate(startDate)
                    : `${formatDate(startDate)} - ${formatDate(endDate)}`;
                
                dateSelector.querySelector('span').textContent = displayText;
                
                console.log('DatePicker reinicializado com datas:', savedStartDate, savedEndDate);
            } catch (error) {
                console.error('Erro ao processar datas salvas:', error);
                dateSelector.querySelector('span').textContent = viatorConfig.translations.choose_date || 'Escolher data';
            }
        } else {
            // Resetar para o texto padrão se não houver datas salvas
            dateSelector.querySelector('span').textContent = viatorConfig.translations.choose_date || 'Escolher data';
        }

        return initializeDatePicker();
    }

    // Observar mudanças no DOM para reinicializar o datepicker quando necessário
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.target.id === 'viator-results') {
                reinitializeDatePicker();
                reinitializeDurationFilter();
                reinitializePriceSlider();
                reinitializeRatingFilter();
                reinitializeSpecialsFilter();
                reinitializeClearAllButton();
                // Reinicializar o botão de filtros móveis após atualização AJAX
                if (typeof window.initializeMobileFilterButton === 'function') {
                    window.initializeMobileFilterButton();
                }
                updateClearAllButtonState(); // <- Adicionado aqui
            }
        });
    });

    const viatorResults = document.getElementById('viator-results');
    if (viatorResults) {
        observer.observe(viatorResults, {
            childList: true,
            subtree: true
        });
    }
    // Adicionar chamada inicial para o estado do botão
    updateClearAllButtonState();

    const STICKY_TOP_OFFSET = 20; // px, deve corresponder ao CSS .viator-filters top
    const STICKY_BOTTOM_MARGIN = 20; // px, margem inferior desejada quando o final da sidebar está visível
    let lastKnownScrollY = window.scrollY;

    function adjustDynamicStickySidebar() {
        const sidebar = document.querySelector('.viator-filters');

        // Só executa em desktop (ex: largura >= 769px) e se a sidebar existir
        if (!sidebar || window.innerWidth < 769) {
            if (sidebar) {
                sidebar.style.transition = 'top 0.2s ease-out'; // Adiciona transição suave para reset
                sidebar.style.top = `${STICKY_TOP_OFFSET}px`; // Reset para o padrão
            }
            return;
        }

        const sidebarHeight = sidebar.offsetHeight;
        const viewportHeight = window.innerHeight;

        // Aplicar transição para suavizar a mudança de 'top'
        sidebar.style.transition = 'top 0.2s ease-out';

        if (sidebarHeight > viewportHeight) {
            const currentScrollY = window.scrollY;
            const scrollDirection = currentScrollY > lastKnownScrollY ? 'down' : 'up';
            lastKnownScrollY = currentScrollY <= 0 ? 0 : currentScrollY; // Evitar valores negativos no topo da página

            const sidebarRect = sidebar.getBoundingClientRect();

            // Se estamos rolando para baixo e a sidebar está (ou deveria estar) grudada no topo da viewport
            if (scrollDirection === 'down' && sidebarRect.top <= STICKY_TOP_OFFSET + 5 /* tolerância */) {
                const targetTopToShowBottom = viewportHeight - sidebarHeight - STICKY_BOTTOM_MARGIN;
                sidebar.style.top = `${targetTopToShowBottom}px`;
            }
            // Se estamos rolando para cima 
            else if (scrollDirection === 'up') {
                // Verifica se a sidebar está atualmente posicionada como se seu fundo estivesse visível
                const expectedTopWhenBottomIsShown = viewportHeight - sidebarHeight - STICKY_BOTTOM_MARGIN;
                const currentActualTop = parseFloat(sidebar.style.top || STICKY_TOP_OFFSET);

                // Se o topo atual é o de "fundo visível" (com tolerância), OU se o topo real da sidebar está abaixo do STICKY_TOP_OFFSET
                if (Math.abs(currentActualTop - expectedTopWhenBottomIsShown) < 5 || sidebarRect.top < STICKY_TOP_OFFSET - 5) {
                     sidebar.style.top = `${STICKY_TOP_OFFSET}px`;
                }
            }
        } else {
            // Se a sidebar não for mais alta que a viewport, usar o top padrão
            sidebar.style.top = `${STICKY_TOP_OFFSET}px`;
        }
    }

    // Throttled scroll handler usando requestAnimationFrame
    let scrollAFTimeout;
    function throttledAdjustDynamicStickySidebar() {
        if (scrollAFTimeout) {
            window.cancelAnimationFrame(scrollAFTimeout);
        }
        scrollAFTimeout = window.requestAnimationFrame(adjustDynamicStickySidebar);
    }

    // Inicializar e adicionar listeners para a sidebar dinâmica
    if (window.innerWidth >= 769) {
        window.addEventListener('scroll', throttledAdjustDynamicStickySidebar, { passive: true });
        // Chamar uma vez no load com um pequeno atraso para garantir que o offsetHeight da sidebar esteja correto
        setTimeout(adjustDynamicStickySidebar, 250); 
    }

    window.addEventListener('resize', () => {
        lastKnownScrollY = window.scrollY; // Resetar no resize para evitar comportamento estranho inicial
        if (window.innerWidth >= 769) {
            window.removeEventListener('scroll', throttledAdjustDynamicStickySidebar); // Remover antigo para evitar duplicação
            window.addEventListener('scroll', throttledAdjustDynamicStickySidebar, { passive: true });
            setTimeout(adjustDynamicStickySidebar, 250); // Reavaliar no resize
        } else {
            window.removeEventListener('scroll', throttledAdjustDynamicStickySidebar);
            const sidebar = document.querySelector('.viator-filters');
            if (sidebar) {
                sidebar.style.transition = 'top 0.2s ease-out';
                sidebar.style.top = `${STICKY_TOP_OFFSET}px`; // Reset ao sair do modo desktop
            }
        }
    });
});

function updateSort(value) {
    const gridElement = document.querySelector('.viator-grid');
    if (gridElement) {
        addCustomLoader(gridElement); // Adiciona o novo loader
        gridElement.style.opacity = '0.5';
        // gridElement.classList.add('loading'); // A classe loading agora só controla o overlay e a exibição do loader container
    }
    
    // Remover manipulação do .viator-loading-effect antigo
    /*
    const loadingEffect = document.querySelector('.viator-loading-effect');
    if (loadingEffect) {
        loadingEffect.classList.add('active');
    }
    */
    
    // Pegar a URL atual e parâmetros
    let url = new URL(window.location.href);
    let params = new URLSearchParams(url.search);
    
    // Pegar os parâmetros necessários
    const searchTerm = params.get('viator_query');
    const dateStart = params.get('viator_date_start') || '';
    const dateEnd = params.get('viator_date_end') || '';
    const durationFilter = params.get('duration_filter') || '';
    const minPrice = params.get('min_price') || '';
    const maxPrice = params.get('max_price') || '';
    const ratingFilter = params.get('rating_filter') || '';
    
    // Obter os filtros especiais ativos dos checkboxes marcados
    const specialFilters = [];
    document.querySelectorAll('input[name="special_filter[]"]:checked').forEach(checkbox => {
        specialFilters.push(checkbox.value);
    });
    
    console.log('Filtros especiais ativos antes da ordenação:', specialFilters);
    
    // Atualizar a URL com o novo valor de ordenação
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('viator_sort', value);
    newUrl.searchParams.set('viator_page', '1'); // Resetar para a primeira página
    
    // Garantir que os outros filtros sejam mantidos na URL
    if (dateStart) newUrl.searchParams.set('viator_date_start', dateStart);
    if (dateEnd) newUrl.searchParams.set('viator_date_end', dateEnd);
    if (durationFilter) newUrl.searchParams.set('duration_filter', durationFilter);
    if (minPrice) newUrl.searchParams.set('min_price', minPrice);
    if (maxPrice) newUrl.searchParams.set('max_price', maxPrice);
    if (ratingFilter) newUrl.searchParams.set('rating_filter', ratingFilter);
    
    // Limpar parâmetros existentes de special_filter para evitar duplicatas na URL
    newUrl.searchParams.delete('special_filter[]');
    
    // Adicionar valores atualizados de special_filter
    specialFilters.forEach(value => {
        newUrl.searchParams.append('special_filter[]', value);
    });
    
    history.replaceState({}, '', newUrl);
    
    // Preparar os parâmetros para a requisição AJAX
    const requestParams = {
        action: 'viator_update_sort',
        viator_query: searchTerm,
        viator_sort: value,
        viator_page: '1', // Resetar para a primeira página
        viator_date_start: dateStart,
        viator_date_end: dateEnd,
        duration_filter: durationFilter,
        min_price: minPrice,
        max_price: maxPrice,
        rating_filter: ratingFilter,
        nonce: viatorAjax.nonce
    };
    
    // Adicionar parâmetros de special_filter
    if (specialFilters.length > 0) {
        specialFilters.forEach((value, index) => {
            requestParams[`special_filter[${index}]`] = value;
        });
    }
    
    console.log('Parâmetros da requisição de ordenação:', requestParams);
    
    // Fazer requisição AJAX
    fetch(viatorAjax.ajaxurl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(requestParams)
    })
    .then(response => response.text())
    .then(html => {
        if (html.trim() === '0' || !html.trim()) {
            throw new Error('Resposta inválida do servidor');
        }
        
        document.getElementById('viator-results').innerHTML = html;
        
        // Rolar suavemente para o topo dos resultados
        document.getElementById('viator-results').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
        
        // Reinicializar componentes
        if (typeof reinitializeDatePicker === 'function') {
            reinitializeDatePicker();
        }
        if (typeof reinitializeDurationFilter === 'function') {
            reinitializeDurationFilter();
        }
        if (typeof reinitializePriceSlider === 'function') {
            reinitializePriceSlider();
        }
        if (typeof reinitializeRatingFilter === 'function') {
            reinitializeRatingFilter();
        }
        
        // Garantir que os filtros especiais sejam sincronizados corretamente
        // Importante: chamar isso após o HTML ter sido atualizado e com um pequeno atraso
        setTimeout(() => {
            if (typeof reinitializeSpecialsFilter === 'function') {
                reinitializeSpecialsFilter();
                
                // Verificar se os filtros especiais foram realmente aplicados
                const updatedCheckboxes = document.querySelectorAll('input[name="special_filter[]"]:checked');
                const updatedFilters = Array.from(updatedCheckboxes).map(cb => cb.value);
                console.log('Filtros especiais após atualização:', updatedFilters);
                
                // Se os filtros não foram aplicados corretamente, tentar novamente
                if (specialFilters.length > 0 && updatedFilters.length === 0) {
                    console.log('Tentando reaplicar filtros especiais...');
                    specialFilters.forEach(value => {
                        const checkbox = document.querySelector(`input[name="special_filter[]"][value="${value}"]`);
                        if (checkbox) {
                            checkbox.checked = true;
                        }
                    });
                }
            }
        }, 300);
        
        if (typeof reinitializeClearAllButton === 'function') {
            reinitializeClearAllButton();
        }
        if (typeof window.initializeMobileFilterButton === 'function') {
            window.initializeMobileFilterButton();
        }
        updateClearAllButtonState(); // Atualizar estado do botão
    })
    .catch(error => {
        console.error('Erro ao atualizar ordenação:', error);
    })
    .finally(() => {
        if (gridElement) {
            removeCustomLoader(gridElement); // Remove o novo loader
            gridElement.style.opacity = '1';
            // gridElement.classList.remove('loading');
        }
        // Remover manipulação do .viator-loading-effect antigo
        /*
        if (loadingEffect) {
            loadingEffect.classList.remove('active');
        }
        */
    });
}

// Função para definir o destino no campo de busca
function reinitializeDurationFilter() {
    const durationRadios = document.querySelectorAll('input[name="duration_filter"]');
    durationRadios.forEach(radio => {
        radio.addEventListener('change', function () {
            // Obter o valor selecionado
            const selectedFilter = document.querySelector('input[name="duration_filter"]:checked')?.value || '';
            
            // Mostrar indicador de carregamento
            const gridElement = document.querySelector('.viator-grid');
            if (gridElement) {
                addCustomLoader(gridElement);
                gridElement.style.opacity = '0.5';
            }

            // Mostrar efeito de carregamento em dispositivos móveis
            const loadingEffect = document.querySelector('.viator-loading-effect');
            if (loadingEffect) {
                loadingEffect.classList.add('active');
            }
            
            // Pegar a URL atual e parâmetros
            let url = new URL(window.location.href);
            let params = new URLSearchParams(url.search);

            // Pegar os parâmetros necessários
            const searchTerm = params.get('viator_query');
            const sortValue = params.get('viator_sort') || 'DEFAULT';
            const dateStart = params.get('viator_date_start') || '';
            const dateEnd = params.get('viator_date_end') || '';
            const minPrice = params.get('min_price') || '';
            const maxPrice = params.get('max_price') || '';
            const ratingFilter = params.get('rating_filter') || '';
            
            // Obter os filtros especiais ativos
            const specialFilters = [];
            document.querySelectorAll('input[name="special_filter[]"]:checked').forEach(checkbox => {
                specialFilters.push(checkbox.value);
            });
            
            // Atualizar a URL
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('duration_filter', selectedFilter);
            newUrl.searchParams.set('viator_page', '1'); // Resetar para a primeira página
            
            // Garantir que os outros filtros sejam mantidos na URL
            if (dateStart) newUrl.searchParams.set('viator_date_start', dateStart);
            if (dateEnd) newUrl.searchParams.set('viator_date_end', dateEnd);
            if (minPrice) newUrl.searchParams.set('min_price', minPrice);
            if (maxPrice) newUrl.searchParams.set('max_price', maxPrice);
            if (ratingFilter) newUrl.searchParams.set('rating_filter', ratingFilter);
            
            // Limpar parâmetros existentes de special_filter para evitar duplicatas na URL
            newUrl.searchParams.delete('special_filter[]');
            
            // Adicionar valores atualizados de special_filter
            specialFilters.forEach(value => {
                newUrl.searchParams.append('special_filter[]', value);
            });
            
            history.replaceState({}, '', newUrl);
            
            // Preparar os parâmetros para a requisição AJAX
            const requestParams = {
                action: 'viator_update_filter',
                viator_query: searchTerm,
                viator_sort: sortValue,
                viator_page: '1', // Sempre ir para a página 1 ao mudar o filtro
                viator_date_start: dateStart,
                viator_date_end: dateEnd,
                duration_filter: selectedFilter,
                min_price: minPrice,
                max_price: maxPrice,
                rating_filter: ratingFilter,
                nonce: viatorAjax.nonce
            };
            
            // Adicionar parâmetros de special_filter
            if (specialFilters.length > 0) {
                specialFilters.forEach((value, index) => {
                    requestParams[`special_filter[${index}]`] = value;
                });
            }
            
            // Fazer requisição AJAX
            fetch(viatorAjax.ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(requestParams)
            })
            .then(response => response.text())
            .then(html => {
                if (html.trim() === '0' || !html.trim()) {
                    throw new Error('Resposta inválida do servidor');
                }
                
                document.getElementById('viator-results').innerHTML = html;
                
                // Rolar suavemente para o topo dos resultados
                document.getElementById('viator-results').scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Reinicializar componentes
                if (typeof reinitializeDatePicker === 'function') {
                    reinitializeDatePicker();
                }
                if (typeof reinitializePriceSlider === 'function') {
                    reinitializePriceSlider();
                }
                if (typeof reinitializeRatingFilter === 'function') {
                    reinitializeRatingFilter();
                }
                
                // Garantir que os filtros especiais sejam sincronizados corretamente
                // Importante: chamar isso após o HTML ter sido atualizado
                setTimeout(() => {
                    if (typeof reinitializeSpecialsFilter === 'function') {
                        reinitializeSpecialsFilter();
                    }
                }, 100);
                
                if (typeof reinitializeClearAllButton === 'function') {
                    reinitializeClearAllButton();
                }
                if (typeof window.initializeMobileFilterButton === 'function') {
                    window.initializeMobileFilterButton();
                }
                updateClearAllButtonState(); // Atualizar estado do botão
            })
            .catch(error => {
                console.error('Erro ao atualizar filtro de duração:', error);
            })
            .finally(() => {
                if (gridElement) {
                    removeCustomLoader(gridElement);
                    gridElement.style.opacity = '1';
                }
                if (loadingEffect) loadingEffect.classList.remove('active');
            });
        });
    });
    // Adicionar chamada para o estado do botão quando o filtro é reinicializado
    updateClearAllButtonState();
}

function getLocationName(latitude, longitude) {
    return new Promise((resolve, reject) => {
        // Check if we have cached location data
        const cachedData = localStorage.getItem('viatorLocationCache');
        if (cachedData) {
            const { location, timestamp, lat, lon } = JSON.parse(cachedData);
            const now = new Date().getTime();
            const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

            // If cache is less than 1 hour old and coordinates are close enough, use it
            if (now - timestamp < oneHour && 
                Math.abs(lat - latitude) < 0.01 && 
                Math.abs(lon - longitude) < 0.01) {
                return resolve(location);
            }
        }

        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&accept-language=pt-BR`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.address) {
                    const city = data.address.city || data.address.town || data.address.village;
                    const state = data.address.state;
                    if (city && state) {
                        const location = `${city}, ${state}`;
                        // Cache the location data with current timestamp and coordinates
                        localStorage.setItem('viatorLocationCache', JSON.stringify({
                            location: location,
                            timestamp: new Date().getTime(),
                            lat: latitude,
                            lon: longitude
                        }));
                        resolve(location);
                        return;
                    }
                }
                reject(new Error('Location not found'));
            })
            .catch(error => {
                console.error('Error fetching location:', error);
                reject(error);
            });
    });
}

function getLocationByIP() {
    return new Promise((resolve) => {
        // Check if we have cached location data
        const cachedData = localStorage.getItem('viatorLocationCache');
        if (cachedData) {
            const { location, timestamp } = JSON.parse(cachedData);
            const now = new Date().getTime();
            const threeHours = 3 * 60 * 60 * 1000; // 3 horas em millisegundos

            // Se o cache tiver menos de 3 horas, execute isso
            if (now - timestamp < threeHours) {
                return resolve(location);
            }
        }

        const API_KEY = '545988903dc94379913912dc88a2da1a';
        const API_URL = `https://api.ipgeolocation.io/ipgeo?apiKey=${API_KEY}&fields=city,state_prov,country_name`;

        fetch(API_URL)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log('IP Geolocation Resposta:', data);
                
                if (data.message) {
                    throw new Error(data.message);
                }

                if (data.city && data.state_prov) {
                    const location = `${data.city}, ${data.state_prov}${data.country_name ? ', ' + data.country_name : ''}`;
                    console.log('Localização encontrada:', location);
                    // Cache the location data with current timestamp
                    localStorage.setItem('viatorLocationCache', JSON.stringify({
                        location: location,
                        timestamp: new Date().getTime()
                    }));
                    resolve(location);
                    return;
                }
                throw new Error('Localização não encontrada');
            })
            .catch(error => {
                console.error('Erro ao buscar localização por IP:', error);
                resolve(null);
            });
    });
}

function updateNearbySuggestion() {
    const nearbySuggestion = document.querySelector('.viator-nearby-suggestion');
    const suggestionText = nearbySuggestion?.querySelector('span:last-child');
    const errorMessage = document.querySelector('.viator-error-message');
    
    // Hide suggestion by default
    if (nearbySuggestion) {
        nearbySuggestion.style.display = 'none';
    }

    if (nearbySuggestion && suggestionText) {
        nearbySuggestion.addEventListener('click', function() {
            if (suggestionText.textContent !== 'Obtendo localização...') {
                const locationText = suggestionText.textContent;
                if (locationText) {
                    const searchInput = document.querySelector('input[name="viator_query"]');
                    const searchButton = document.getElementById('search-button');
                    const searchText = document.getElementById('search-text');
                    const searchIcon = document.getElementById('search-icon');
                    
                    if (searchInput) {
                        searchInput.value = locationText;
                        nearbySuggestion.style.display = 'none';
                        
                        // Update interface for search
                        searchText.innerHTML = 'Pesquisando<div class="bouncy-loader"><span></span><span></span><span></span></div>';
                        searchIcon.innerHTML = '✈️';
                        searchIcon.classList.add('airplane-icon');
                        searchButton.disabled = true;
                        
                        // Add parameter for automatic scroll
                        const currentUrl = new URL(window.location.href);
                        const params = new URLSearchParams(currentUrl.search);
                        params.set('scroll_to_results', '1');
                        const newUrl = `${currentUrl.pathname}?${params.toString()}`;
                        window.history.replaceState({}, '', newUrl);
                        
                        searchInput.closest('form').submit();
                    }
                }
            }
        });

        if ('geolocation' in navigator) {
            nearbySuggestion.style.display = 'flex';
            suggestionText.textContent = 'Obtendo localização...';
            
            navigator.geolocation.getCurrentPosition(
                position => {
                    getLocationName(position.coords.latitude, position.coords.longitude)
                        .then(locationName => {
                            if (locationName) {
                                suggestionText.textContent = locationName;
                                nearbySuggestion.style.cursor = 'pointer';
                            } else {
                                // Fallback to IP-based geolocation
                                getLocationByIP().then(ipLocation => {
                                    if (ipLocation) {
                                        suggestionText.textContent = ipLocation;
                                        nearbySuggestion.style.cursor = 'pointer';
                                    } else {
                                        nearbySuggestion.style.display = 'none';
                                    }
                                });
                            }
                        })
                        .catch(() => {
                            // Fallback to IP-based geolocation
                            getLocationByIP().then(ipLocation => {
                                if (ipLocation) {
                                    suggestionText.textContent = ipLocation;
                                    nearbySuggestion.style.cursor = 'pointer';
                                } else {
                                    nearbySuggestion.style.display = 'none';
                                }
                            });
                        });
                },
                error => {
                    console.error('Geolocation error:', error);
                    // Fallback to IP-based geolocation
                    getLocationByIP().then(ipLocation => {
                        if (ipLocation) {
                            suggestionText.textContent = ipLocation;
                            nearbySuggestion.style.cursor = 'pointer';
                        } else {
                            nearbySuggestion.style.display = 'none';
                        }
                    });
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        } else {
            nearbySuggestion.style.display = 'none';
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('input[name="viator_query"]');
    const nearbySuggestion = document.querySelector('.viator-nearby-suggestion');

    if (searchInput && nearbySuggestion) {
        searchInput.addEventListener('focus', function() {
            nearbySuggestion.style.display = 'flex';
            updateNearbySuggestion();
        });

        nearbySuggestion.addEventListener('click', function() {
            const locationText = this.querySelector('span:last-child').textContent;
            if (locationText && locationText !== 'Obtendo localização...') {
                searchInput.value = locationText;
                searchInput.closest('form').submit();
            }
        });

        searchInput.addEventListener('blur', function() {
            setTimeout(() => {
                nearbySuggestion.style.display = 'none';
            }, 200);
        });
    }
});

function setSearchDestination(destino) {
    const searchInput = document.querySelector('input[name="viator_query"]');
    const errorMessage = document.querySelector('.viator-error-message');
    
    if (searchInput) {
        if (errorMessage) {
            errorMessage.classList.add('searching');
            errorMessage.innerHTML = 'Vamos lá! Pesquisando<div class="bouncy-loader"><span></span><span></span><span></span></div>';
        }
        
        searchInput.value = destino;
        searchInput.closest('form').submit();
    }
}

// Função para inicializar o slider de preço
function initializePriceSlider() {
    const minPriceSlider = document.getElementById('min_price_slider');
    const maxPriceSlider = document.getElementById('max_price_slider');
    const minPriceDisplay = document.getElementById('min_price_display');
    const maxPriceDisplay = document.getElementById('max_price_display');
    const minPriceHidden = document.getElementById('min_price_hidden');
    const maxPriceHidden = document.getElementById('max_price_hidden');

    if (!minPriceSlider || !maxPriceSlider || !minPriceDisplay || !maxPriceDisplay || !minPriceHidden || !maxPriceHidden) {
        return;
    }

    // Função para atualizar os filtros
    let debounceTimer;
    function triggerPriceFilterUpdate() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const gridElement = document.querySelector('.viator-grid');
            if (gridElement) {
                addCustomLoader(gridElement);
                gridElement.style.opacity = '0.5';
            }

            const loadingEffect = document.querySelector('.viator-loading-effect');
            if (loadingEffect) {
                loadingEffect.classList.add('active');
            }

            let url = new URL(window.location.href);
            let params = new URLSearchParams(url.search);

            const searchTerm = params.get('viator_query');
            const sortValue = params.get('viator_sort') || 'DEFAULT';
            const dateStart = params.get('viator_date_start') || '';
            const dateEnd = params.get('viator_date_end') || '';
            const durationFilter = params.get('duration_filter') || '';
            const ratingFilter = params.get('rating_filter') || '';
            
            // Usar os valores dos campos hidden para min_price e max_price, pois eles são atualizados em tempo real pelos sliders
            const currentMinPrice = document.getElementById('min_price_hidden').value;
            const currentMaxPrice = document.getElementById('max_price_hidden').value;
            
            // Obter os filtros especiais ativos
            const specialFilters = [];
            document.querySelectorAll('input[name="special_filter[]"]:checked').forEach(checkbox => {
                specialFilters.push(checkbox.value);
            });

            // Atualizar a URL
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('min_price', currentMinPrice);
            newUrl.searchParams.set('max_price', currentMaxPrice);
            newUrl.searchParams.set('viator_page', '1'); // Resetar para a primeira página
            
            // Garantir que os outros filtros sejam mantidos na URL
            if (dateStart) newUrl.searchParams.set('viator_date_start', dateStart);
            if (dateEnd) newUrl.searchParams.set('viator_date_end', dateEnd);
            if (durationFilter) newUrl.searchParams.set('duration_filter', durationFilter);
            if (ratingFilter) newUrl.searchParams.set('rating_filter', ratingFilter);
            
            // Limpar parâmetros existentes de special_filter para evitar duplicatas na URL
            newUrl.searchParams.delete('special_filter[]');
            
            // Adicionar valores atualizados de special_filter
            specialFilters.forEach(value => {
                newUrl.searchParams.append('special_filter[]', value);
            });
            
            history.replaceState({}, '', newUrl);

            // Preparar os parâmetros para a requisição AJAX
            const requestParams = {
                action: 'viator_update_filter',
                viator_query: searchTerm,
                viator_sort: sortValue,
                viator_page: '1', // Resetar para a primeira página
                viator_date_start: dateStart,
                viator_date_end: dateEnd,
                duration_filter: durationFilter,
                min_price: currentMinPrice,
                max_price: currentMaxPrice,
                rating_filter: ratingFilter,
                nonce: viatorAjax.nonce
            };
            
            // Adicionar parâmetros de special_filter
            if (specialFilters.length > 0) {
                specialFilters.forEach((value, index) => {
                    requestParams[`special_filter[${index}]`] = value;
                });
            }

            // Fazer requisição AJAX
            fetch(viatorAjax.ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(requestParams)
            })
            .then(response => response.text())
            .then(html => {
                if (html.trim() === '0' || !html.trim()) {
                    throw new Error('Resposta inválida do servidor');
                }
                
                document.getElementById('viator-results').innerHTML = html;
                
                // Rolar suavemente para o topo dos resultados
                document.getElementById('viator-results').scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
                
                // Sincronizar sliders e displays com os valores da URL após a atualização
                const updatedParams = new URLSearchParams(window.location.search);
                const newMinPrice = updatedParams.get('min_price') || '0';
                const newMaxPrice = updatedParams.get('max_price') || '5000';

                minPriceSlider.value = newMinPrice;
                minPriceDisplay.textContent = `${viatorConfig.currencySymbol} ${newMinPrice}`;
                minPriceHidden.value = newMinPrice;

                maxPriceSlider.value = newMaxPrice;
                maxPriceDisplay.textContent = `${viatorConfig.currencySymbol} ${newMaxPrice}`;
                maxPriceHidden.value = newMaxPrice;

                // Reinicializar componentes
                if (typeof reinitializeDatePicker === 'function') {
                    reinitializeDatePicker();
                }
                if (typeof reinitializeDurationFilter === 'function') {
                    reinitializeDurationFilter();
                }
                if (typeof reinitializeRatingFilter === 'function') {
                    reinitializeRatingFilter();
                }
                if (typeof reinitializeSpecialsFilter === 'function') {
                    reinitializeSpecialsFilter();
                }
                if (typeof reinitializeClearAllButton === 'function') {
                    reinitializeClearAllButton();
                }
                if (typeof window.initializeMobileFilterButton === 'function') {
                    window.initializeMobileFilterButton();
                }
                updateClearAllButtonState(); // Atualizar estado do botão
            })
            .catch(error => {
                console.error('Erro ao atualizar filtro de preço:', error);
            })
            .finally(() => {
                if (gridElement) {
                    removeCustomLoader(gridElement);
                    gridElement.style.opacity = '1';
                }
                if (loadingEffect) loadingEffect.classList.remove('active');
            });
        }, 750); // Debounce de 750ms
    }

    minPriceSlider.addEventListener('input', function() {
        let minValue = parseInt(minPriceSlider.value);
        let maxValue = parseInt(maxPriceSlider.value);
        if (minValue > maxValue - 50) { // Garantir um intervalo mínimo
            minValue = maxValue - 50;
            if (minValue < 0) minValue = 0;
            minPriceSlider.value = minValue;
        }
        minPriceDisplay.textContent = `${viatorConfig.currencySymbol} ${minValue}`;
        minPriceHidden.value = minValue;
        triggerPriceFilterUpdate();
    });

    maxPriceSlider.addEventListener('input', function() {
        let minValue = parseInt(minPriceSlider.value);
        let maxValue = parseInt(maxPriceSlider.value);
        if (maxValue < minValue + 50) { // Garantir um intervalo mínimo
            maxValue = minValue + 50;
            if (maxValue > 5000) maxValue = 5000;
            maxPriceSlider.value = maxValue;
        }
        maxPriceDisplay.textContent = `${viatorConfig.currencySymbol} ${maxValue}`;
        maxPriceHidden.value = maxValue;
        triggerPriceFilterUpdate();
    });

    // Ajustar os valores iniciais dos displays e hidden fields com base nos parâmetros da URL, se existirem
    const currentParams = new URLSearchParams(window.location.search);
    const initialMinPrice = currentParams.get('min_price');
    const initialMaxPrice = currentParams.get('max_price');

    if (initialMinPrice !== null) {
        minPriceSlider.value = initialMinPrice;
        minPriceDisplay.textContent = `${viatorConfig.currencySymbol} ${initialMinPrice}`;
        minPriceHidden.value = initialMinPrice;
    }

    if (initialMaxPrice !== null) {
        maxPriceSlider.value = initialMaxPrice;
        maxPriceDisplay.textContent = `${viatorConfig.currencySymbol} ${initialMaxPrice}`;
        maxPriceHidden.value = initialMaxPrice;
    }
}

// Função para reinicializar o filtro de preço (para ser chamada após AJAX)
function reinitializePriceSlider() {
    initializePriceSlider();
    updateClearAllButtonState(); // Atualizar estado do botão
}

// Função para inicializar o filtro de avaliação
function initializeRatingFilter() {
    const ratingInputs = document.querySelectorAll('input[name="rating_filter"]');
    if (!ratingInputs.length) return;
    
    ratingInputs.forEach(input => {
        input.addEventListener('change', function() {
            // Mostrar indicador de carregamento
            const gridElement = document.querySelector('.viator-grid');
            if (gridElement) {
                addCustomLoader(gridElement);
                gridElement.style.opacity = '0.5';
            }

            // Mostrar efeito de carregamento em dispositivos móveis
            const loadingEffect = document.querySelector('.viator-loading-effect');
            if (loadingEffect) {
                loadingEffect.classList.add('active');
            }
            
            // Pegar a URL atual e parâmetros
            let url = new URL(window.location.href);
            let params = new URLSearchParams(url.search);
            
            // Pegar os parâmetros necessários
            const searchTerm = params.get('viator_query');
            const sortValue = params.get('viator_sort') || 'DEFAULT';
            const dateStart = params.get('viator_date_start') || '';
            const dateEnd = params.get('viator_date_end') || '';
            const durationFilter = params.get('duration_filter') || '';
            const minPrice = params.get('min_price') || '';
            const maxPrice = params.get('max_price') || '';
            const ratingValue = this.value; // O valor selecionado do rating
            
            // Obter os filtros especiais ativos
            const specialFilters = [];
            document.querySelectorAll('input[name="special_filter[]"]:checked').forEach(checkbox => {
                specialFilters.push(checkbox.value);
            });
            
            // Atualizar a URL
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('rating_filter', ratingValue);
            newUrl.searchParams.set('viator_page', '1'); // Resetar para a primeira página
            
            // Garantir que os outros filtros sejam mantidos na URL
            if (dateStart) newUrl.searchParams.set('viator_date_start', dateStart);
            if (dateEnd) newUrl.searchParams.set('viator_date_end', dateEnd);
            if (durationFilter) newUrl.searchParams.set('duration_filter', durationFilter);
            if (minPrice) newUrl.searchParams.set('min_price', minPrice);
            if (maxPrice) newUrl.searchParams.set('max_price', maxPrice);
            
            // Limpar parâmetros existentes de special_filter para evitar duplicatas na URL
            newUrl.searchParams.delete('special_filter[]');
            
            // Adicionar valores atualizados de special_filter
            specialFilters.forEach(value => {
                newUrl.searchParams.append('special_filter[]', value);
            });
            
            history.replaceState({}, '', newUrl);
            
            // Preparar os parâmetros para a requisição AJAX
            const requestParams = {
                action: 'viator_update_filter',
                viator_query: searchTerm,
                viator_sort: sortValue,
                viator_page: '1', // Sempre ir para a página 1 ao mudar o filtro
                viator_date_start: dateStart,
                viator_date_end: dateEnd,
                duration_filter: durationFilter,
                min_price: minPrice,
                max_price: maxPrice,
                rating_filter: ratingValue,
                nonce: viatorAjax.nonce
            };
            
            // Adicionar parâmetros de special_filter
            if (specialFilters.length > 0) {
                specialFilters.forEach((value, index) => {
                    requestParams[`special_filter[${index}]`] = value;
                });
            }
            
            // Fazer requisição AJAX
            fetch(viatorAjax.ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(requestParams)
            })
            .then(response => response.text())
            .then(html => {
                if (html.trim() === '0' || !html.trim()) {
                    throw new Error('Resposta inválida do servidor');
                }
                
                document.getElementById('viator-results').innerHTML = html;
                
                // Rolar suavemente para o topo dos resultados
                document.getElementById('viator-results').scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
                
                // Reinicializar componentes
                if (typeof reinitializeDatePicker === 'function') {
                    reinitializeDatePicker();
                }
                if (typeof reinitializeDurationFilter === 'function') {
                    reinitializeDurationFilter();
                }
                if (typeof reinitializePriceSlider === 'function') {
                    reinitializePriceSlider();
                }
                if (typeof reinitializeRatingFilter === 'function') {
                    reinitializeRatingFilter();
                }
                
                // Garantir que os filtros especiais sejam sincronizados corretamente
                // Importante: chamar isso após o HTML ter sido atualizado
                setTimeout(() => {
                    if (typeof reinitializeSpecialsFilter === 'function') {
                        reinitializeSpecialsFilter();
                    }
                }, 100);
                
                if (typeof reinitializeClearAllButton === 'function') {
                    reinitializeClearAllButton();
                }
                if (typeof window.initializeMobileFilterButton === 'function') {
                    window.initializeMobileFilterButton();
                }
                updateClearAllButtonState(); // Atualizar estado do botão
            })
            .catch(error => {
                console.error('Erro ao atualizar filtro de avaliação:', error);
            })
            .finally(() => {
                if (gridElement) {
                    removeCustomLoader(gridElement);
                    gridElement.style.opacity = '1';
                }
                if (loadingEffect) loadingEffect.classList.remove('active');
            });
        });
    });
    // Adicionar chamada para o estado do botão após inicialização
    updateClearAllButtonState();
}

// Função para reinicializar o filtro de avaliação após AJAX
function reinitializeRatingFilter() {
    initializeRatingFilter();
    updateClearAllButtonState(); // Atualizar estado do botão
}

// Função para inicializar o filtro de especiais
function initializeSpecialsFilter() {
    const specialCheckboxes = document.querySelectorAll('input[name="special_filter[]"]');
    if (!specialCheckboxes.length) return;
    
    let debounceTimer; // Variável para o debounce

    specialCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            clearTimeout(debounceTimer); // Limpar o timer anterior
            debounceTimer = setTimeout(() => { // Configurar um novo timer
                // Mostrar indicador de carregamento
                const gridElement = document.querySelector('.viator-grid');
                if (gridElement) {
                    addCustomLoader(gridElement);
                    gridElement.style.opacity = '0.5';
                }

                // Mostrar efeito de carregamento
                const loadingEffect = document.querySelector('.viator-loading-effect');
                if (loadingEffect) {
                    loadingEffect.classList.add('active');
                }
                
                // Pegar a URL atual e parâmetros
                let url = new URL(window.location.href);
                let params = new URLSearchParams(url.search);
                
                // Pegar os parâmetros necessários
                const searchTerm = params.get('viator_query');
                const sortValue = params.get('viator_sort') || 'DEFAULT';
                const dateStart = params.get('viator_date_start') || '';
                const dateEnd = params.get('viator_date_end') || '';
                const durationFilter = params.get('duration_filter') || '';
                const minPrice = params.get('min_price') || '';
                const maxPrice = params.get('max_price') || '';
                const ratingFilter = params.get('rating_filter') || '';
                
                // Obter todos os valores de special_filter selecionados
                const specialFilters = [];
                document.querySelectorAll('input[name="special_filter[]"]:checked').forEach(el => {
                    specialFilters.push(el.value);
                    // console.log('Filtro especial selecionado:', el.value); // Removido ou comentado para produção
                });
                
                // Atualizar a URL com todos os parâmetros
                const newUrl = new URL(window.location);
                
                // Limpar parâmetros existentes de special_filter para evitar duplicatas na URL
                newUrl.searchParams.delete('special_filter[]');
                
                // Adicionar valores atualizados de special_filter
                specialFilters.forEach(value => {
                    newUrl.searchParams.append('special_filter[]', value);
                });
                
                // Garantir que os outros filtros sejam mantidos na URL
                newUrl.searchParams.set('viator_page', '1'); // Resetar para a primeira página
                if (searchTerm) newUrl.searchParams.set('viator_query', searchTerm);
                if (sortValue) newUrl.searchParams.set('viator_sort', sortValue);
                if (dateStart) newUrl.searchParams.set('viator_date_start', dateStart);
                if (dateEnd) newUrl.searchParams.set('viator_date_end', dateEnd);
                if (durationFilter) newUrl.searchParams.set('duration_filter', durationFilter);
                if (minPrice) newUrl.searchParams.set('min_price', minPrice);
                if (maxPrice) newUrl.searchParams.set('max_price', maxPrice);
                if (ratingFilter) newUrl.searchParams.set('rating_filter', ratingFilter);
                
                history.replaceState({}, '', newUrl);
                
                // Preparar os parâmetros para a requisição AJAX
                const requestData = {
                    action: 'viator_update_filter',
                    viator_query: searchTerm,
                    viator_sort: sortValue,
                    viator_page: '1',
                    viator_date_start: dateStart,
                    viator_date_end: dateEnd,
                    duration_filter: durationFilter,
                    min_price: minPrice,
                    max_price: maxPrice,
                    rating_filter: ratingFilter,
                    nonce: viatorAjax.nonce
                };
                
                // Adicionar parâmetros de special_filter
                if (specialFilters.length > 0) {
                    // console.log('Enviando filtros especiais:', specialFilters); // Removido ou comentado para produção
                    specialFilters.forEach((value, index) => {
                        requestData[`special_filter[${index}]`] = value;
                        // console.log(`special_filter[${index}] =`, value); // Removido ou comentado para produção
                    });
                }
                
                // console.log('Dados da requisição AJAX (Specials):', requestData); // Removido ou comentado para produção
                
                // Fazer requisição AJAX
                fetch(viatorAjax.ajaxurl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams(requestData)
                })
                .then(response => response.text())
                .then(html => {
                    if (html.trim() === '0' || !html.trim()) {
                        throw new Error('Resposta inválida do servidor (Specials)');
                    }
                    
                    document.getElementById('viator-results').innerHTML = html;
                    
                    document.getElementById('viator-results').scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                    
                    // Reinicializar componentes
                    if (typeof reinitializeDatePicker === 'function') {
                        reinitializeDatePicker();
                    }
                    if (typeof reinitializeDurationFilter === 'function') {
                        reinitializeDurationFilter();
                    }
                    if (typeof reinitializePriceSlider === 'function') {
                        reinitializePriceSlider();
                    }
                    if (typeof reinitializeRatingFilter === 'function') {
                        reinitializeRatingFilter();
                    }
                    
                    // Garantir que os filtros especiais sejam sincronizados corretamente
                    // Importante: chamar isso após o HTML ter sido atualizado
                    setTimeout(() => {
                        if (typeof reinitializeSpecialsFilter === 'function') {
                            reinitializeSpecialsFilter();
                        }
                    }, 100);
                    
                    if (typeof reinitializeClearAllButton === 'function') {
                        reinitializeClearAllButton();
                    }
                    if (typeof window.initializeMobileFilterButton === 'function') {
                        window.initializeMobileFilterButton();
                    }
                    updateClearAllButtonState(); // Atualizar estado do botão
                })
                .catch(error => {
                    console.error('Erro ao atualizar filtro de especiais:', error);
                })
                .finally(() => {
                    if (gridElement) {
                        removeCustomLoader(gridElement);
                        gridElement.style.opacity = '1';
                    }
                    
                    const loadingEffectFinally = document.querySelector('.viator-loading-effect');
                    if (loadingEffectFinally) {
                        loadingEffectFinally.classList.remove('active');
                    }
                });
            }, 750); // Debounce de 750ms
        });
    });
    // Adicionar chamada para o estado do botão após inicialização
    updateClearAllButtonState();
}

// Função para reinicializar o filtro de especiais após AJAX
function reinitializeSpecialsFilter() {
    // Primeiro, obter os filtros especiais da URL
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    let specialFiltersFromUrl = [];
    
    // Verificar diferentes formatos possíveis de parâmetros na URL
    // 1. Verificar 'special_filter[]'
    if (url.searchParams.has('special_filter[]')) {
        const values = url.searchParams.getAll('special_filter[]');
        specialFiltersFromUrl = specialFiltersFromUrl.concat(values);
    }
    
    // 2. Verificar 'special_filter'
    if (params.has('special_filter')) {
        // Pode ser um array ou um único valor
        const values = params.getAll('special_filter');
        values.forEach(value => {
            // Se for um array serializado como string
            if (value.startsWith('[') && value.endsWith(']')) {
                try {
                    const parsedValues = JSON.parse(value);
                    if (Array.isArray(parsedValues)) {
                        specialFiltersFromUrl = specialFiltersFromUrl.concat(parsedValues);
                    }
                } catch (e) {
                    // Não é um JSON válido, tratar como string normal
                    specialFiltersFromUrl.push(value);
                }
            } else {
                specialFiltersFromUrl.push(value);
            }
        });
    }
    
    // 3. Verificar parâmetros indexados como 'special_filter[0]', 'special_filter[1]', etc.
    for (let i = 0; i < 10; i++) { // Limite arbitrário de 10 para evitar loop infinito
        const indexedParam = `special_filter[${i}]`;
        if (params.has(indexedParam)) {
            specialFiltersFromUrl.push(params.get(indexedParam));
        } else {
            // Se não encontrar um índice, podemos parar de procurar
            break;
        }
    }
    
    // Remover duplicatas
    specialFiltersFromUrl = [...new Set(specialFiltersFromUrl)];
    
    console.log('Filtros especiais encontrados na URL:', specialFiltersFromUrl);
    
    // Marcar os checkboxes correspondentes
    const specialCheckboxes = document.querySelectorAll('input[name="special_filter[]"]');
    specialCheckboxes.forEach(checkbox => {
        // Verificar se o valor do checkbox está nos filtros da URL
        checkbox.checked = specialFiltersFromUrl.includes(checkbox.value);
    });
    
    // Adicionar event listeners para os checkboxes
    initializeSpecialsFilter(); // Esta chamada já inclui updateClearAllButtonState()
}

// Função para inicializar o botão de limpar tudo
function initializeClearAllButton() {
    const clearAllButton = document.getElementById('clear-all-filters');
    if (!clearAllButton) return;

    clearAllButton.addEventListener('click', function() {
        // Mostrar indicador de carregamento
        const gridElement = document.querySelector('.viator-grid');
        if (gridElement) {
            addCustomLoader(gridElement);
            gridElement.style.opacity = '0.5';
        }

        // Mostrar efeito de carregamento
        const loadingEffect = document.querySelector('.viator-loading-effect');
        if (loadingEffect) {
            loadingEffect.classList.add('active');
        }
        
        // Pegar a URL atual e apenas manter o termo de busca e ordenação
        let url = new URL(window.location.href);
        const searchTerm = url.searchParams.get('viator_query');
        const sortValue = url.searchParams.get('viator_sort') || 'DEFAULT';
        
        // Criar nova URL apenas com os parâmetros básicos
        const newUrl = new URL(window.location.origin + window.location.pathname);
        newUrl.searchParams.set('viator_query', searchTerm);
        newUrl.searchParams.set('viator_sort', sortValue);
        newUrl.searchParams.set('viator_page', '1');
        
        // Atualizar a URL
        history.replaceState({}, '', newUrl);
        
        // Resetar visualmente todos os filtros
        
        // 1. Resetar datepicker
        if (window.currentFlatpickr) {
            window.currentFlatpickr.clear();
        }
        const dateSelector = document.querySelector('.viator-date-selector');
        if (dateSelector) {
            dateSelector.querySelector('span').textContent = viatorConfig.translations.choose_date || 'Escolher data';
        }
        
        // 2. Resetar filtro de duração
        const durationRadios = document.querySelectorAll('input[name="duration_filter"]');
        durationRadios.forEach(radio => {
            radio.checked = false;
        });
        
        // 3. Resetar filtro de preço
        const minPriceSlider = document.getElementById('min_price_slider');
        const maxPriceSlider = document.getElementById('max_price_slider');
        const minPriceDisplay = document.getElementById('min_price_display');
        const maxPriceDisplay = document.getElementById('max_price_display');
        const minPriceHidden = document.getElementById('min_price_hidden');
        const maxPriceHidden = document.getElementById('max_price_hidden');
        
        if (minPriceSlider && maxPriceSlider) {
            minPriceSlider.value = 0;
            maxPriceSlider.value = 5000;
                    if (minPriceDisplay) minPriceDisplay.textContent = `${viatorConfig.currencySymbol} 0`;
        if (maxPriceDisplay) maxPriceDisplay.textContent = `${viatorConfig.currencySymbol} 5000`;
            if (minPriceHidden) minPriceHidden.value = 0;
            if (maxPriceHidden) maxPriceHidden.value = 5000;
        }
        
        // 4. Resetar filtro de avaliação
        const ratingRadios = document.querySelectorAll('input[name="rating_filter"]');
        ratingRadios.forEach(radio => {
            radio.checked = false;
        });
        
        // 5. Resetar filtro de especiais
        const specialCheckboxes = document.querySelectorAll('input[name="special_filter[]"]');
        specialCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Fazer requisição AJAX para atualizar os resultados
        fetch(viatorAjax.ajaxurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'viator_update_filter',
                viator_query: searchTerm,
                viator_sort: sortValue,
                viator_page: '1',
                nonce: viatorAjax.nonce
            })
        })
        .then(response => response.text())
        .then(html => {
            if (html.trim() === '0' || !html.trim()) {
                throw new Error('Resposta inválida do servidor');
            }
            
            document.getElementById('viator-results').innerHTML = html;
            
            // Rolar suavemente para o topo dos resultados
            document.getElementById('viator-results').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
            
            // Reinicializar componentes
            if (typeof reinitializeDatePicker === 'function') {
                reinitializeDatePicker();
            }
            if (typeof reinitializeDurationFilter === 'function') {
                reinitializeDurationFilter();
            }
            if (typeof reinitializePriceSlider === 'function') {
                reinitializePriceSlider();
            }
            if (typeof reinitializeRatingFilter === 'function') {
                reinitializeRatingFilter();
            }
            
            // Garantir que os filtros especiais sejam sincronizados corretamente
            // Importante: chamar isso após o HTML ter sido atualizado
            setTimeout(() => {
                if (typeof reinitializeSpecialsFilter === 'function') {
                    reinitializeSpecialsFilter();
                }
            }, 100);
            
            if (typeof reinitializeClearAllButton === 'function') {
                reinitializeClearAllButton();
            }
            if (typeof window.initializeMobileFilterButton === 'function') {
                window.initializeMobileFilterButton();
            }
            updateClearAllButtonState(); // Atualizar estado do botão
        })
        .catch(error => {
            console.error('Erro ao limpar todos os filtros:', error);
        })
        .finally(() => {
            if (gridElement) {
                removeCustomLoader(gridElement);
                gridElement.style.opacity = '1';
            }
            
            const loadingEffect = document.querySelector('.viator-loading-effect');
            if (loadingEffect) {
                loadingEffect.classList.remove('active');
            }
        });
    });
    // Adicionar chamada para o estado do botão após inicialização
    updateClearAllButtonState();
}

// Função para reinicializar o botão de limpar tudo após AJAX
function reinitializeClearAllButton() {
    initializeClearAllButton();
    updateClearAllButtonState(); // Assegurar que o estado é atualizado
}

let scrollHandler = null; // Variável para guardar a referência do event listener

function adjustLoaderPosition() {
    const gridElement = document.querySelector('.viator-grid.loading');
    const loaderContainer = gridElement ? gridElement.querySelector('.viator-custom-loader-container') : null;

    if (!gridElement || !loaderContainer) {
        if (scrollHandler) {
            window.removeEventListener('scroll', scrollHandler);
            scrollHandler = null;
        }
        return;
    }

    const gridRect = gridElement.getBoundingClientRect();
    const loaderRect = loaderContainer.getBoundingClientRect(); // O loader já tem width/height
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Tenta centralizar na viewport
    let newTop = (viewportHeight - loaderRect.height) / 2;
    let newLeft = (viewportWidth - loaderRect.width) / 2;

    // Limitar ao topo do grid
    // A posição 'fixed' do loader é relativa à viewport.
    // gridRect.top é a posição do topo do grid em relação à viewport.
    if (newTop < gridRect.top) {
        newTop = gridRect.top;
    }
    // Limitar à base do grid
    // gridRect.bottom é a posição da base do grid em relação à viewport.
    // Se a base do loader (newTop + loaderRect.height) for passar da base do grid,
    // ajustamos newTop para que a base do loader alinhe com a base do grid.
    if (newTop + loaderRect.height > gridRect.bottom) {
        newTop = gridRect.bottom - loaderRect.height;
    }

    // Limitar à esquerda do grid
    if (newLeft < gridRect.left) {
        newLeft = gridRect.left;
    }
    // Limitar à direita do grid
    if (newLeft + loaderRect.width > gridRect.right) {
        newLeft = gridRect.right - loaderRect.width;
    }

    // Se o grid estiver completamente fora da tela (acima ou abaixo), 
    // pode ser melhor esconder o loader ou fixá-lo no topo/base visível do grid.
    // Para simplificar, vamos apenas garantir que ele não saia da viewport quando o grid sai.
    if (gridRect.bottom < 0 || gridRect.top > viewportHeight) { 
        // Grid fora da tela, talvez esconder o loader?
        // loaderContainer.style.display = 'none'; // Opção
        // Por ora, vamos deixar como está, mas ele pode ficar "flutuando" no limite.
    } else {
        // loaderContainer.style.display = 'block';
    }

    loaderContainer.style.top = `${newTop}px`;
    loaderContainer.style.left = `${newLeft}px`;
    loaderContainer.style.transform = 'none'; // Remover transform se estivermos usando top/left diretamente
}

function addCustomLoader(parentElement) {
    if (!parentElement) return;
    removeCustomLoader(parentElement); // Remove loader antigo e seu listener de scroll

    const loaderContainer = document.createElement('div');
    loaderContainer.className = 'viator-custom-loader-container';

    const dotLottiePlayer = document.createElement('dotlottie-player');
    dotLottiePlayer.setAttribute('src', 'https://lottie.host/d5c00c3c-219a-4652-8b83-2d1f314a689e/9fZQP05oWC.lottie');
    dotLottiePlayer.setAttribute('background', 'transparent');
    dotLottiePlayer.setAttribute('speed', '1');
    dotLottiePlayer.setAttribute('style', 'width: 300px; height: 300px;');
    dotLottiePlayer.setAttribute('loop', '');
    dotLottiePlayer.setAttribute('autoplay', '');

    loaderContainer.appendChild(dotLottiePlayer);
    parentElement.appendChild(loaderContainer);
    parentElement.classList.add('loading');

    // Pequeno delay para garantir que o DOM esteja atualizado e os estilos aplicados
    setTimeout(() => {
        adjustLoaderPosition(); // Posição inicial
        if (!scrollHandler) {
            scrollHandler = adjustLoaderPosition; // Atribui a função diretamente
            window.addEventListener('scroll', scrollHandler, { passive: true });
        }
    }, 50); 
}

function removeCustomLoader(parentElement) {
    if (!parentElement) return;
    const loaderContainer = parentElement.querySelector('.viator-custom-loader-container');
    if (loaderContainer) {
        parentElement.removeChild(loaderContainer);
    }
    parentElement.classList.remove('loading');

    if (scrollHandler) {
        window.removeEventListener('scroll', scrollHandler);
        scrollHandler = null;
    }
}

// Função para verificar se algum filtro está ativo
function areFiltersActive() {
    const params = new URLSearchParams(window.location.search);
    // Lista de parâmetros que indicam um filtro ativo (exceto busca, ordenação e página)
    const filterParams = [
        'viator_date_start', 'viator_date_end', 'duration_filter',
        'min_price', 'max_price', 'rating_filter', 'special_filter[]'
    ];

    for (const param of filterParams) {
        if (param === 'special_filter[]') {
            if (params.getAll('special_filter[]').length > 0) return true;
        } else if (params.has(param) && params.get(param) !== '' && params.get(param) !== null) {
            // Considerar filtros de preço padrão como não ativos se forem os valores default
            if (param === 'min_price' && params.get(param) === '0') continue;
            if (param === 'max_price' && params.get(param) === '5000') continue; // Ajuste se o máximo padrão for diferente
            return true;
        }
    }
    return false;
}

// Função para atualizar o estado do botão Limpar Tudo
function updateClearAllButtonState() {
    const clearAllButton = document.getElementById('clear-all-filters');
    if (clearAllButton) {
        if (areFiltersActive()) {
            clearAllButton.disabled = false;
        } else {
            clearAllButton.disabled = true;
        }
    }
}