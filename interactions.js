document.addEventListener('DOMContentLoaded', function () {
    const searchForm = document.getElementById('viator-search-form');
    const searchButton = document.getElementById('search-button');
    const searchText = document.getElementById('search-text');
    const searchIcon = document.getElementById('search-icon');

    // Verificar se deve fazer scroll (movido para fora do segundo DOMContentLoaded)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('scroll_to_results')) {
        const contentWrapper = document.querySelector('.viator-content-wrapper');
        if (contentWrapper) {
            setTimeout(() => {
                contentWrapper.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                // Remover o parâmetro da URL sem recarregar a página
                urlParams.delete('scroll_to_results');
                const newUrl = window.location.pathname + '?' + urlParams.toString();
                window.history.replaceState({}, '', newUrl);
            }, 500); // Aumentado para 500ms para garantir que o conteúdo esteja carregado
        }
    }

    searchForm.addEventListener('submit', function (event) {
        // Atualiza a interface
        searchText.innerHTML = 'Pesquisando<div class="bouncy-loader"><span></span><span></span><span></span></div>';
        searchIcon.innerHTML = '✈️';
        searchIcon.classList.add('airplane-icon');
        searchButton.disabled = true;
    });

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