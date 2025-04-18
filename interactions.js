document.addEventListener('DOMContentLoaded', function () {
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

            // Manter os parâmetros de data
            const dateStart = currentParams.get('viator_date_start');
            const dateEnd = currentParams.get('viator_date_end');
            
            if (dateStart && dateEnd) {
                params.set('viator_date_start', dateStart);
                params.set('viator_date_end', dateEnd);
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
                reinitializeDatePicker();
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
            reinitializeDurationFilter();

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
    
    // Pegar a URL atual e parâmetros
    let url = new URL(window.location.href);
    let params = new URLSearchParams(url.search);
    
    // Pegar os parâmetros necessários
    const searchTerm = params.get('viator_query');
    const page = params.get('viator_page') || '1';
    const dateStart = params.get('viator_date_start');
    const dateEnd = params.get('viator_date_end');
    
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
        
        // Reinicializar o datepicker após atualizar o conteúdo
        reinitializeDatePicker();
    })
    .catch(error => {
        console.error('Erro:', error);
        // Em caso de erro, manter o usuário na página atual
        document.querySelector('.viator-grid').style.opacity = '1';
    })
    .finally(() => {
        document.querySelector('.viator-grid').style.opacity = '1';
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

            // Pegar a URL atual e parâmetros
            let url = new URL(window.location.href);
            let params = new URLSearchParams(url.search);

            // Pegar os parâmetros necessários
            const searchTerm = params.get('viator_query');
            const page = params.get('viator_page') || '1';
            const dateStart = params.get('viator_date_start');
            const dateEnd = params.get('viator_date_end');

            // Fazer requisição AJAX
            fetch(viatorAjax.ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'viator_update_filter',
                    viator_query: searchTerm,
                    viator_sort: params.get('viator_sort') || 'DEFAULT',
                    viator_page: page,
                    viator_date_start: dateStart || '',
                    viator_date_end: dateEnd || '',
                    duration_filter: selectedFilter,
                    nonce: viatorAjax.nonce
                }),
            })
            .then(response => response.text())
            .then(html => {
                // Atualizar o conteúdo
                document.getElementById('viator-results').innerHTML = html;
                
                // Atualizar a URL corretamente
                const newUrl = new URL(window.location);
                if (selectedFilter) {
                    newUrl.searchParams.set('duration_filter', selectedFilter);
                } else {
                    newUrl.searchParams.delete('duration_filter');
                }
                
                history.replaceState({}, '', newUrl);
                
                // Sincronizar radio buttons
                document.querySelectorAll('input[name="duration_filter"]').forEach(radio => {
                    radio.checked = (radio.value === selectedFilter);
                });
                
                reinitializeDatePicker();
                reinitializeDurationFilter(); // Re-attach event listeners
            })
            .catch(error => {
                console.error('Erro:', error);
                if (gridElement) gridElement.style.opacity = '1';
            })
            .finally(() => {
                if (gridElement) gridElement.style.opacity = '1';
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