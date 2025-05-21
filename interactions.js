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
    }
    
    // Função para mostrar efeito de carregamento
    function showLoadingEffect() {
        const loadingEffect = document.querySelector('.viator-loading-effect');
        if (loadingEffect) {
            loadingEffect.classList.add('active');
            setTimeout(() => {
                loadingEffect.classList.remove('active');
            }, 1500);
        }
    }
    
    
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
            
            if (!searchInput || !searchInput.value.trim()) {
                // Add visual feedback for empty input
                searchInput.classList.add('error');
                const errorMessage = document.querySelector('.viator-error-message');
                if (errorMessage) {
                    errorMessage.textContent = 'Por favor, insira um destino';
                    errorMessage.classList.remove('searching');
                }
                return;
            }

            // Remove error state if input is valid
            searchInput.classList.remove('error');
            const errorMessage = document.querySelector('.viator-error-message');
            if (errorMessage) {
                errorMessage.textContent = '';
            }

            // Update interface for search
            if (searchText) {
                searchText.innerHTML = 'Pesquisando<div class="bouncy-loader"><span></span><span></span><span></span></div>';
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

            document.querySelector('.viator-grid').style.opacity = '0.5';

            // Pegar parâmetros da URL do link e da URL atual
            const url = new URL(link.href);
            const params = new URLSearchParams(url.search);
            const currentParams = new URLSearchParams(window.location.search);

            // Manter os parâmetros de data, duração e preço
            const dateStart = currentParams.get('viator_date_start');
            const dateEnd = currentParams.get('viator_date_end');
            const durationFilter = currentParams.get('duration_filter');
            const minPrice = currentParams.get('min_price');
            const maxPrice = currentParams.get('max_price');
            
            if (dateStart && dateEnd) {
                params.set('viator_date_start', dateStart);
                params.set('viator_date_end', dateEnd);
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

            // Fazer requisição AJAX com todos os parâmetros necessários
            fetch(viatorAjax.ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'viator_update_sort',
                    viator_query: params.get('viator_query'),
                    viator_sort: params.get('viator_sort') || 'DEFAULT',
                    viator_page: params.get('viator_page'),
                    viator_date_start: dateStart || '',
                    viator_date_end: dateEnd || '',
                    duration_filter: durationFilter || '',
                    min_price: minPrice || '',
                    max_price: maxPrice || '',
                    nonce: viatorAjax.nonce
                })
            })
            .then(response => response.text())
            .then(html => {
                if (html.trim() === '0' || !html.trim()) {
                    throw new Error('Resposta inválida do servidor');
                }
                window.history.pushState({}, '', `${url.pathname}?${params.toString()}`);
                document.getElementById('viator-results').innerHTML = html;
                document.getElementById('viator-results').scrollIntoView({ behavior: 'smooth' });
                if (typeof reinitializeDatePicker === 'function') {
                    reinitializeDatePicker();
                }
                if (typeof reinitializeDurationFilter === 'function') {
                    reinitializeDurationFilter();
                }
                if (typeof window.initializeMobileFilterButton === 'function') {
                    window.initializeMobileFilterButton();
                }
            })
            .catch(error => {
                console.error('Erro:', error);
                // Em caso de erro, recarregar a página mantendo os parâmetros
                window.location.href = `${url.pathname}?${params.toString()}`;
            })
            .finally(() => {
                document.querySelector('.viator-grid').style.opacity = '1';
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
            locale: {
                firstDayOfWeek: 0,
                weekdays: {
                    shorthand: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
                    longhand: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
                },
                months: {
                    shorthand: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                    longhand: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
                }
            },
            onChange: function(selectedDates, dateStr) {
                if (selectedDates.length === 2) {
                    const startDate = selectedDates[0];
                    const endDate = selectedDates[1];
                    
                    // Ajustar para o fuso horário local
                    startDate.setHours(12, 0, 0, 0);
                    endDate.setHours(12, 0, 0, 0);
                    
                    const formatDate = (date) => {
                        const day = date.getDate();
                        const month = fp.l10n.months.shorthand[date.getMonth()];
                        return `${day} de ${month}`;
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
                        const month = fp.l10n.months.shorthand[date.getMonth()];
                        return `${day} de ${month}`;
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
                resetButton.textContent = 'Redefinir';
                resetButton.className = 'flatpickr-button reset';
                resetButton.type = 'button';
                
                const applyButton = document.createElement('button');
                applyButton.textContent = 'Aplicar';
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
                
                resetButton.addEventListener('click', function() {
                    instance.clear();
                    // Resetar o texto para o valor padrão
                    const dateSelector = document.querySelector('.viator-date-selector');
                    if (dateSelector) {
                        const spanElement = dateSelector.querySelector('span');
                        if (spanElement) {
                            spanElement.textContent = 'Escolher data';
                        }
                    }
                    selectedDateRange = null;
                    instance.close();
                    
                    document.querySelector('.viator-grid').style.opacity = '0.5';
                    
                    let url = new URL(window.location.href);
                    let params = new URLSearchParams(url.search);
                    // Remover os parâmetros de data da URL
                    params.delete('viator_date_start');
                    params.delete('viator_date_end');
                    
                    fetch(viatorAjax.ajaxurl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams({
                            action: 'viator_update_filter',
                            viator_query: params.get('viator_query'),
                            viator_sort: params.get('viator_sort') || 'DEFAULT',
                            viator_page: '1',
                            viator_date_start: '',
                            viator_date_end: '',
                            nonce: viatorAjax.nonce
                        })
                    })
                    .then(response => response.text())
                    .then(html => {
                        window.history.pushState({}, '', `${url.pathname}?${params.toString()}`);
                        document.getElementById('viator-results').innerHTML = html;
                        
                        // Reinicializar componentes interativos
                        if (typeof reinitializeDatePicker === 'function') {
                            reinitializeDatePicker();
                        }
                        if (typeof reinitializeDurationFilter === 'function') {
                            reinitializeDurationFilter();
                        }
                        if (typeof window.initializeMobileFilterButton === 'function') {
                            window.initializeMobileFilterButton();
                        }
                    })
                    .catch(error => {
                        console.error('Erro:', error);
                        window.location.reload();
                    })
                    .finally(() => {
                        document.querySelector('.viator-grid').style.opacity = '1';
                    });
                });
                
                applyButton.addEventListener('click', function() {
                    if (selectedDateRange) {
                        instance.close();
                        dateSelector.querySelector('span').textContent = selectedDateRange.display;
                        
                        document.querySelector('.viator-grid').style.opacity = '0.5';
                        
                        // Mostrar efeito de carregamento em dispositivos móveis
                        const loadingEffect = document.querySelector('.viator-loading-effect');
                        if (loadingEffect && window.innerWidth <= 768) {
                            loadingEffect.classList.add('active');
                        }
                        
                        let url = new URL(window.location.href);
                        let params = new URLSearchParams(url.search);
                        
                        fetch(viatorAjax.ajaxurl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                            body: new URLSearchParams({
                                action: 'viator_update_filter',
                                viator_query: params.get('viator_query'),
                                viator_sort: params.get('viator_sort') || 'DEFAULT',
                                viator_page: '1',
                                viator_date_start: selectedDateRange.start,
                                viator_date_end: selectedDateRange.end,
                                nonce: viatorAjax.nonce
                            })
                        })
                        .then(response => response.text())
                        .then(html => {
                            params.set('viator_date_start', selectedDateRange.start);
                            params.set('viator_date_end', selectedDateRange.end);
                            window.history.pushState({}, '', `${url.pathname}?${params.toString()}`);
                            
                            document.getElementById('viator-results').innerHTML = html;
                        })
                        .catch(error => {
                            console.error('Erro:', error);
                            window.location.reload();
                        })
                        .finally(() => {
                            document.querySelector('.viator-grid').style.opacity = '1';
                            
                            // Remover efeito de carregamento em dispositivos móveis
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
            const startDate = new Date(savedStartDate + 'T12:00:00'); // Adicionar horário para evitar problemas de fuso
            const endDate = new Date(savedEndDate + 'T12:00:00');
            
            const formatDate = (date) => {
                const day = date.getDate();
                const month = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][date.getMonth()];
                return `${day} de ${month}`;
            };

            const displayText = savedStartDate === savedEndDate 
                ? formatDate(startDate)
                : `${formatDate(startDate)} - ${formatDate(endDate)}`;
            
            dateSelector.querySelector('span').textContent = displayText;
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
                // Reinicializar o botão de filtros móveis após atualização AJAX
                if (typeof window.initializeMobileFilterButton === 'function') {
                    window.initializeMobileFilterButton();
                }
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
});

function updateSort(value) {
    // Mostrar indicador de carregamento
    document.querySelector('.viator-grid').style.opacity = '0.5';
    
    // Mostrar efeito de carregamento em dispositivos móveis
    const loadingEffect = document.querySelector('.viator-loading-effect');
    if (loadingEffect && window.innerWidth <= 768) {
        loadingEffect.classList.add('active');
    }
    
    // Pegar a URL atual e parâmetros
    let url = new URL(window.location.href);
    let params = new URLSearchParams(url.search);
    
    // Pegar os parâmetros necessários
    const searchTerm = params.get('viator_query');
    const page = params.get('viator_page') || '1';
    const dateStart = params.get('viator_date_start');
    const dateEnd = params.get('viator_date_end');
    const durationFilter = params.get('duration_filter');
    const minPrice = params.get('min_price');
    const maxPrice = params.get('max_price');
    
    // Fazer requisição AJAX
    fetch(viatorAjax.ajaxurl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            action: 'viator_update_sort',
            viator_query: searchTerm,
            viator_sort: value,
            viator_page: page,
            viator_date_start: dateStart || '',
            viator_date_end: dateEnd || '',
            duration_filter: durationFilter || '',
            min_price: minPrice || '',
            max_price: maxPrice || '',
            nonce: viatorAjax.nonce
        })
    })
    .then(response => response.text())
    .then(html => {
        // Verificar se a resposta é válida
        if (html.trim() === '0' || !html.trim() || html.includes('{"success":false}')) {
            throw new Error('Resposta inválida do servidor');
        }

        // Atualizar a URL sem recarregar a página
        params.set('viator_sort', value);
        window.history.pushState({}, '', `${url.pathname}?${params.toString()}`);
        
        // Atualizar o conteúdo
        document.getElementById('viator-results').innerHTML = html;
        
        // Reinicializar componentes interativos após atualizar o conteúdo
        if (typeof reinitializeDatePicker === 'function') {
            reinitializeDatePicker();
        }
        if (typeof reinitializeDurationFilter === 'function') {
            reinitializeDurationFilter();
        }
        if (typeof window.initializeMobileFilterButton === 'function') {
            window.initializeMobileFilterButton();
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        // Em caso de erro, manter o usuário na página atual
        document.querySelector('.viator-grid').style.opacity = '1';
    })
    .finally(() => {
        document.querySelector('.viator-grid').style.opacity = '1';
        
        // Remover efeito de carregamento em dispositivos móveis
        const loadingEffect = document.querySelector('.viator-loading-effect');
        if (loadingEffect) {
            loadingEffect.classList.remove('active');
        }
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
                gridElement.style.opacity = '0.5';
            }

            // Mostrar efeito de carregamento em dispositivos móveis
            const loadingEffect = document.querySelector('.viator-loading-effect');
            if (loadingEffect && window.innerWidth <= 768) {
                loadingEffect.classList.add('active');
                
                // Remover efeito após um tempo
                setTimeout(() => {
                    loadingEffect.classList.remove('active');
                }, 1500);
            }
            
            // Pegar a URL atual e parâmetros
            let url = new URL(window.location.href);
            let params = new URLSearchParams(url.search);

            // Pegar os parâmetros necessários
            const searchTerm = params.get('viator_query');
            const page = params.get('viator_page') || '1';
            const dateStart = params.get('viator_date_start');
            const dateEnd = params.get('viator_date_end');
            const minPrice = params.get('min_price');
            const maxPrice = params.get('max_price');

            // Criar o objeto de parâmetros para a requisição
            const requestParams = {
                action: 'viator_update_filter',
                viator_query: searchTerm,
                viator_sort: params.get('viator_sort') || 'DEFAULT',
                viator_page: page,
                viator_date_start: dateStart || '',
                viator_date_end: dateEnd || '',
                duration_filter: selectedFilter,
                min_price: minPrice || '',
                max_price: maxPrice || '',
                nonce: viatorAjax.nonce
            };

            // Atualizar a URL antes da requisição AJAX
            const newUrl = new URL(window.location);
            if (selectedFilter) {
                newUrl.searchParams.set('duration_filter', selectedFilter);
            } else {
                newUrl.searchParams.delete('duration_filter');
            }
            
            history.replaceState({}, '', newUrl);

            // Criar um controlador de aborto para gerenciar o timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos de timeout

            // Fazer requisição AJAX com sinal de aborto
            fetch(viatorAjax.ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(requestParams),
                signal: controller.signal
            })
            .then(response => {
                clearTimeout(timeoutId); // Limpar o timeout se a resposta chegar
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(html => {
                // Check if HTML is valid before processing
                if (html.trim() === '0' || !html.trim()) {
                    throw new Error('Resposta inválida do servidor (AJAX retornou 0 ou vazio)');
                }
                
                // Atualizar o conteúdo
                const resultsElement = document.getElementById('viator-results');
                if (resultsElement) {
                    resultsElement.innerHTML = html;
                }
                
                // Sincronizar radio buttons
                document.querySelectorAll('input[name="duration_filter"]').forEach(radio => {
                    radio.checked = (radio.value === selectedFilter);
                });
                
                // Reinitialize components after content update
                if (typeof reinitializeDatePicker === 'function') {
                    reinitializeDatePicker();
                }
                if (typeof reinitializeDurationFilter === 'function') {
                    reinitializeDurationFilter();
                }
                if (typeof window.initializeMobileFilterButton === 'function') {
                    window.initializeMobileFilterButton();
                }
            })
            .catch(error => {
                console.error('Erro ao atualizar filtro de duração:', error);
                // Se for um erro de aborto (timeout), não fazer nada especial
                if (error.name === 'AbortError') {
                    console.log('A requisição foi cancelada por timeout ou pelo usuário');
                }
            })
            .finally(() => {
                // Restaurar a opacidade do grid
                if (gridElement) gridElement.style.opacity = '1';
                
                // Garantir que o efeito de carregamento seja removido
                if (loadingEffect) {
                    loadingEffect.classList.remove('active');
                }
            });
        });
    });
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
                    if (searchInput && searchButton) {
                        searchInput.value = locationText;
                        nearbySuggestion.style.display = 'none';
                        // Apply loading animation
                        searchButton.disabled = true;
                        searchText.innerHTML = 'Pesquisando<div class="bouncy-loader"><span></span><span></span><span></span></div>';
                        searchIcon.innerHTML = '✈️';
                        searchIcon.classList.add('airplane-icon');
                        // Submit the form
                        document.querySelector('#viator-search-form').submit();
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
            // Browser doesn't support geolocation, try IP-based geolocation
            getLocationByIP().then(ipLocation => {
                if (ipLocation) {
                    suggestionText.textContent = ipLocation;
                    nearbySuggestion.style.cursor = 'pointer';
                    nearbySuggestion.style.display = 'flex';
                    if (errorMessage) errorMessage.textContent = '';
                } else {
                    nearbySuggestion.style.display = 'none';
                    if (errorMessage) errorMessage.textContent = 'Seu navegador não suporta geolocalização.';
                }
            });
        }
    }
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
                gridElement.style.opacity = '0.5';
            }

            const loadingEffect = document.querySelector('.viator-loading-effect');
            if (loadingEffect && window.innerWidth <= 768) {
                loadingEffect.classList.add('active');
            }

            let url = new URL(window.location.href);
            let params = new URLSearchParams(url.search);

            const searchTerm = params.get('viator_query');
            const page = '1'; // Resetar para a primeira página ao aplicar filtro
            const dateStart = params.get('viator_date_start');
            const dateEnd = params.get('viator_date_end');
            const durationFilter = params.get('duration_filter');
            // Usar os valores dos campos hidden para min_price e max_price, pois eles são atualizados em tempo real pelos sliders
            const currentMinPrice = document.getElementById('min_price_hidden').value;
            const currentMaxPrice = document.getElementById('max_price_hidden').value;

            const requestParams = {
                action: 'viator_update_filter',
                viator_query: searchTerm,
                viator_sort: params.get('viator_sort') || 'DEFAULT',
                viator_page: page,
                viator_date_start: dateStart || '',
                viator_date_end: dateEnd || '',
                duration_filter: durationFilter || '',
                min_price: currentMinPrice,
                max_price: currentMaxPrice,
                nonce: viatorAjax.nonce
            };

            const newUrl = new URL(window.location);
            newUrl.searchParams.set('min_price', currentMinPrice);
            newUrl.searchParams.set('max_price', currentMaxPrice);
            newUrl.searchParams.set('viator_page', page); // Garantir que a página seja 1
            history.replaceState({}, '', newUrl);

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
                    throw new Error('Resposta inválida do servidor (AJAX retornou 0 ou vazio)');
                }
                document.getElementById('viator-results').innerHTML = html;
                // Sincronizar sliders e displays com os valores da URL após a atualização
                const updatedParams = new URLSearchParams(window.location.search);
                const newMinPrice = updatedParams.get('min_price') || '0';
                const newMaxPrice = updatedParams.get('max_price') || '5000';

                minPriceSlider.value = newMinPrice;
                minPriceDisplay.textContent = `R$ ${newMinPrice}`;
                minPriceHidden.value = newMinPrice;

                maxPriceSlider.value = newMaxPrice;
                maxPriceDisplay.textContent = `R$ ${newMaxPrice}`;
                maxPriceHidden.value = newMaxPrice;

                if (typeof reinitializeDatePicker === 'function') reinitializeDatePicker();
                if (typeof reinitializeDurationFilter === 'function') reinitializeDurationFilter();
                if (typeof window.initializeMobileFilterButton === 'function') window.initializeMobileFilterButton();
                // Não chamar reinitializePriceSlider() aqui para evitar loop
            })
            .catch(error => {
                console.error('Erro ao atualizar filtro de preço:', error);
            })
            .finally(() => {
                if (gridElement) gridElement.style.opacity = '1';
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
        minPriceDisplay.textContent = `R$ ${minValue}`;
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
        maxPriceDisplay.textContent = `R$ ${maxValue}`;
        maxPriceHidden.value = maxValue;
        triggerPriceFilterUpdate();
    });

    // Ajustar os valores iniciais dos displays e hidden fields com base nos parâmetros da URL, se existirem
    const currentParams = new URLSearchParams(window.location.search);
    const initialMinPrice = currentParams.get('min_price');
    const initialMaxPrice = currentParams.get('max_price');

    if (initialMinPrice !== null) {
        minPriceSlider.value = initialMinPrice;
        minPriceDisplay.textContent = `R$ ${initialMinPrice}`;
        minPriceHidden.value = initialMinPrice;
    }

    if (initialMaxPrice !== null) {
        maxPriceSlider.value = initialMaxPrice;
        maxPriceDisplay.textContent = `R$ ${initialMaxPrice}`;
        maxPriceHidden.value = initialMaxPrice;
    }
}

// Função para reinicializar o filtro de preço (para ser chamada após AJAX)
function reinitializePriceSlider() {
    initializePriceSlider();
}