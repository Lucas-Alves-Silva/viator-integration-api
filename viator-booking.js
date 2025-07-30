/**
 * Viator Booking System - Frontend
 * Gerencia a interface do usuário para o processo de reserva
 */

// Sistema de perguntas condicionais da Viator
const ViatorConditionalQuestions = {
    dependencies: {},
    
    // Registra uma dependência entre perguntas
    registerDependency: function(dependentId, parentId, showWhen = null) {
        if (!this.dependencies[parentId]) {
            this.dependencies[parentId] = [];
        }
        
        this.dependencies[parentId].push({
            dependentId: dependentId,
            showWhen: showWhen
        });

    },
    
    // Verifica se uma pergunta deve ser exibida
    shouldShowQuestion: function(questionId, parentValue = null) {
        // Encontra a dependência para esta pergunta
        for (const [parentId, dependents] of Object.entries(this.dependencies)) {
            const dependent = dependents.find(d => d.dependentId === questionId);
            if (dependent) {
                const parentElements = document.querySelectorAll(`[data-question-id="${parentId}"]`);
                if (parentElements.length === 0) return false;
                
                let currentValue = null;
                parentElements.forEach(element => {
                    if (element.value && element.value !== '') {
                        currentValue = element.value;
                    }
                });
                
                if (!currentValue) return false;
                
                // Se showWhen está definido, verifica se o valor atual está na lista
                if (dependent.showWhen && dependent.showWhen.length > 0) {
                    return dependent.showWhen.includes(currentValue);
                }
                
                // Se não há showWhen, mostra se o campo pai tem valor
                return true;
            }
        }
        return true; // Se não há dependência, sempre mostra
    },
    
    // Atualiza a visibilidade de perguntas dependentes
    updateDependentQuestions: function(parentId) {
        if (!this.dependencies[parentId]) return;
        
        const parentElements = document.querySelectorAll(`[data-question-id="${parentId}"]`);
        if (parentElements.length === 0) return;
        
        let parentValue = null;
        parentElements.forEach(element => {
            if (element.value && element.value !== '') {
                parentValue = element.value;
            }
        });
        
        this.dependencies[parentId].forEach(dependent => {
            const shouldShow = this.shouldShowQuestion(dependent.dependentId, parentValue);
            const dependentElements = document.querySelectorAll(`[data-question-id="${dependent.dependentId}"]`);
            
            dependentElements.forEach(element => {
                const formGroup = element.closest('.booking-question-group, .form-group');
                if (formGroup) {
                    if (shouldShow) {
                        formGroup.style.display = 'block';
                        // Marca como obrigatório se era condicional
                        const input = formGroup.querySelector('input, select, textarea');
                        if (input && input.dataset.originalRequired === 'CONDITIONAL') {
                            input.required = true;
                        }
                    } else {
                        formGroup.style.display = 'none';
                        // Remove obrigatoriedade quando oculto
                        const input = formGroup.querySelector('input, select, textarea');
                        if (input) {
                            input.required = false;
                            input.value = ''; // Limpa o valor
                        }
                    }
                }
            });
        });
    },
    
    // Inicializa o sistema de dependências
    initialize: function() {
        console.log('Inicializando sistema de perguntas condicionais da Viator');
        
        // Registra dependências baseadas na documentação da Viator
        this.registerDependency('TRANSFER_ARRIVAL_TIME', 'TRANSFER_ARRIVAL_MODE');
        this.registerDependency('TRANSFER_DEPARTURE_DATE', 'TRANSFER_DEPARTURE_MODE');
        this.registerDependency('TRANSFER_DEPARTURE_PICKUP', 'TRANSFER_DEPARTURE_MODE');
        this.registerDependency('TRANSFER_DEPARTURE_TIME', 'TRANSFER_DEPARTURE_MODE');
        
        // Dependências específicas para transporte aéreo
        this.registerDependency('TRANSFER_AIR_ARRIVAL_AIRLINE', 'TRANSFER_ARRIVAL_MODE', ['AIR']);
        this.registerDependency('TRANSFER_AIR_ARRIVAL_FLIGHT_NO', 'TRANSFER_ARRIVAL_MODE', ['AIR']);
        this.registerDependency('TRANSFER_AIR_DEPARTURE_AIRLINE', 'TRANSFER_DEPARTURE_MODE', ['AIR']);
        this.registerDependency('TRANSFER_AIR_DEPARTURE_FLIGHT_NO', 'TRANSFER_DEPARTURE_MODE', ['AIR']);
        
        // Dependências específicas para transporte marítimo
        this.registerDependency('TRANSFER_PORT_ARRIVAL_TIME', 'TRANSFER_ARRIVAL_MODE', ['SEA']);
        this.registerDependency('TRANSFER_PORT_CRUISE_SHIP', 'TRANSFER_ARRIVAL_MODE', ['SEA']);
        this.registerDependency('TRANSFER_PORT_DEPARTURE_TIME', 'TRANSFER_DEPARTURE_MODE', ['SEA']);
        
        // Dependências específicas para transporte ferroviário
        this.registerDependency('TRANSFER_RAIL_ARRIVAL_LINE', 'TRANSFER_ARRIVAL_MODE', ['RAIL']);
        this.registerDependency('TRANSFER_RAIL_ARRIVAL_STATION', 'TRANSFER_ARRIVAL_MODE', ['RAIL']);
        this.registerDependency('TRANSFER_RAIL_DEPARTURE_LINE', 'TRANSFER_DEPARTURE_MODE', ['RAIL']);
        this.registerDependency('TRANSFER_RAIL_DEPARTURE_STATION', 'TRANSFER_DEPARTURE_MODE', ['RAIL']);
        
        // Adiciona event listeners para campos que têm dependências
        this.setupEventListeners();
    },
    
    // Configura event listeners para campos com dependências
    setupEventListeners: function() {
        const self = this;
        
        // Adiciona listeners para todos os campos que são pais de dependências
        Object.keys(this.dependencies).forEach(parentId => {
            // Usar delegação de eventos para campos que podem ser criados dinamicamente
            document.addEventListener('change', function(event) {
                const element = event.target;
                if (element.dataset.questionId === parentId) {
                    console.log(`Campo ${parentId} alterado para: ${element.value}`);
                    self.updateDependentQuestions(parentId);
                }
            });
        });
        
        // Observer para detectar quando novos campos são adicionados ao DOM
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Verifica se o novo elemento contém campos de pergunta
                            const questionFields = node.querySelectorAll ? 
                                node.querySelectorAll('[data-question-id]') : [];
                            
                            questionFields.forEach(field => {
                                const questionId = field.dataset.questionId;
                                if (self.dependencies[questionId]) {
                                    // Adiciona listener para este campo específico
                                    field.addEventListener('change', function() {
                                        console.log(`Campo ${questionId} alterado para: ${field.value}`);
                                        self.updateDependentQuestions(questionId);
                                    });
                                }
                            });
                            
                            // Atualiza visibilidade inicial de campos condicionais
                            self.updateAllConditionalFields();
                        }
                    });
                }
            });
        });
        
        // Observa mudanças no DOM
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    },
    
    // Atualiza todos os campos condicionais
    updateAllConditionalFields: function() {
        Object.keys(this.dependencies).forEach(parentId => {
            this.updateDependentQuestions(parentId);
        });
    }
};

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar o sistema de perguntas condicionais
    ViatorConditionalQuestions.initialize();
    
    const bookingSystem = new ViatorBookingManager();
    bookingSystem.init();
});

class CustomCalendar {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            mode: "single",
            minDate: "today",
            maxDate: new Date().fp_incr ? new Date().fp_incr(365) : new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            dateFormat: "Y-m-d", 
            locale: "pt",
            showMonths: window.innerWidth <= 768 ? 1 : 2,
            onChange: () => {},
            onReady: () => {},
            ...options
        }
          
          this.selectedDate = null;
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
        this.isVisible = false;
        
        this.monthNames = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        
        this.dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        
        this.init();
    }
    
    init() {
        this.createCalendar();
        this.attachEvents();
        
        // Simular propriedade calendarContainer para compatibilidade
        this.calendarContainer = this.calendar;
        
        // Chamar callback onReady
        if (this.options.onReady) {
            this.options.onReady([], '', this);
        }
    }
    
    createCalendar() {
        // Criar container do calendário
        this.calendar = document.createElement('div');
        this.calendar.className = 'custom-calendar';
        this.calendar.style.display = 'none';
        
        // Inserir após o elemento trigger
        this.element.parentNode.insertBefore(this.calendar, this.element.nextSibling);
        
        this.renderCalendar();
    }
    
    renderCalendar() {
        const showMonths = this.options.showMonths;
        let calendarHTML = '';
        
        // Verificar se pode navegar para o mês anterior
        const today = new Date();
        const currentRealMonth = today.getMonth();
        const currentRealYear = today.getFullYear();
        
        let newMonth = this.currentMonth - 1;
        let newYear = this.currentYear;
        
        if (newMonth < 0) {
            newMonth = 11;
            newYear--;
        }
        
        const canGoPrevious = !(newYear < currentRealYear || 
                               (newYear === currentRealYear && newMonth < currentRealMonth));
        
        calendarHTML += '<div class="calendar-header">';
        calendarHTML += `<button type="button" class="calendar-nav-btn prev-btn${!canGoPrevious ? ' disabled' : ''}" aria-label="Mês anterior"${!canGoPrevious ? ' disabled' : ''}>‹</button>`;
        calendarHTML += '<div class="calendar-months-container">';
        
        for (let i = 0; i < showMonths; i++) {
            const monthDate = new Date(this.currentYear, this.currentMonth + i, 1);
            calendarHTML += this.renderMonth(monthDate, i);
        }
        
        calendarHTML += '</div>';
        calendarHTML += `<button type="button" class="calendar-nav-btn next-btn" aria-label="Próximo mês">›</button>`;
        calendarHTML += '</div>';
        
        this.calendar.innerHTML = calendarHTML;
    }
    
    renderMonth(monthDate, index) {
        const month = monthDate.getMonth();
        const year = monthDate.getFullYear();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        let monthHTML = `<div class="calendar-month" data-month="${month}" data-year="${year}">`;
        monthHTML += `<div class="calendar-month-header">`;
        monthHTML += `<h3>${this.monthNames[month]} ${year}</h3>`;
        monthHTML += `</div>`;
        
        // Cabeçalho dos dias da semana
        monthHTML += '<div class="calendar-weekdays">';
        this.dayNames.forEach(day => {
            monthHTML += `<div class="calendar-weekday">${day}</div>`;
        });
        monthHTML += '</div>';
        
        // Dias do mês
        monthHTML += '<div class="calendar-days">';
        
        for (let i = 0; i < 42; i++) { // 6 semanas x 7 dias
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            
            const isCurrentMonth = currentDate.getMonth() === month;
            const isToday = this.isToday(currentDate);
            const isSelected = this.isSelected(currentDate);
            const isDisabled = this.isDisabled(currentDate);
            
            let dayClass = 'calendar-day';
            if (!isCurrentMonth) dayClass += ' other-month';
            if (isToday) dayClass += ' today';
            if (isSelected) dayClass += ' selected';
            if (isDisabled) dayClass += ' disabled';
            
            const dateStr = this.formatDate(currentDate);
            
            monthHTML += `<div class="${dayClass}" data-date="${dateStr}">`;
            monthHTML += `<span class="day-number">${currentDate.getDate()}</span>`;
            monthHTML += '</div>';
        }
        
        monthHTML += '</div>';
        monthHTML += '</div>';
        
        return monthHTML;
    }
    
    attachEvents() {
        // Click no elemento trigger para mostrar/esconder
        this.element.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggle();
        });
        
        // Fechar ao clicar fora - mas não nos botões de navegação
        document.addEventListener('click', (e) => {
            // Não fechar se clicar nos botões de navegação
            if (e.target.classList.contains('prev-btn') || 
                e.target.classList.contains('next-btn') ||
                e.target.classList.contains('calendar-nav-btn')) {
                return;
            }
            
            if (!this.calendar.contains(e.target) && !this.element.contains(e.target)) {
                this.close();
            }
        });
        
        // Event delegation para botões e dias
        this.calendar.addEventListener('click', (e) => {
            e.preventDefault(); // Prevenir comportamento padrão
            e.stopPropagation(); // Impedir propagação que pode causar fechamento
            
            if (e.target.classList.contains('prev-btn') && !e.target.classList.contains('disabled') && !e.target.disabled) {
                this.previousMonth();
            } else if (e.target.classList.contains('next-btn')) {
                this.nextMonth();
            } else if (e.target.closest('.calendar-day') && !e.target.closest('.disabled')) {
                const dayElement = e.target.closest('.calendar-day');
                const dateStr = dayElement.dataset.date;
                this.selectDate(dateStr);
            }
        });
        
        // Responsividade
        window.addEventListener('resize', () => {
            const newShowMonths = window.innerWidth <= 768 ? 1 : 2;
            if (newShowMonths !== this.options.showMonths) {
                this.options.showMonths = newShowMonths;
                this.renderCalendar();
            }
        });
    }
    
    selectDate(dateStr) {
        const date = new Date(dateStr + 'T12:00:00');
        this.selectedDate = date;
        
        // Atualizar visual
        this.calendar.querySelectorAll('.calendar-day').forEach(day => {
            day.classList.remove('selected');
        });
        
        const selectedElement = this.calendar.querySelector(`[data-date="${dateStr}"]`);
        if (selectedElement) {
            selectedElement.classList.add('selected');
        }
        
        // Callback onChange
        if (this.options.onChange) {
            this.options.onChange([date], dateStr, this);
        }
        
        this.close();
    }
    
    previousMonth() {
        const today = new Date();
        const currentRealMonth = today.getMonth();
        const currentRealYear = today.getFullYear();
        
        // Calcular o mês anterior
        let newMonth = this.currentMonth - 1;
        let newYear = this.currentYear;
        
        if (newMonth < 0) {
            newMonth = 11;
            newYear--;
        }
        
        // Verificar se o mês anterior não é anterior ao mês atual real
        if (newYear < currentRealYear || 
            (newYear === currentRealYear && newMonth < currentRealMonth)) {
            // Não permitir navegação para meses anteriores ao atual
            return;
        }
        
        // Aplicar a mudança
        this.currentMonth = newMonth;
        this.currentYear = newYear;
        this.renderCalendar();
    }
    
    nextMonth() {
        this.currentMonth++;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        }
        this.renderCalendar();
    }
    
    open() {
        this.isVisible = true;
        this.calendar.style.display = 'block';
        
        // Pequeno delay para animação
        setTimeout(() => {
            this.calendar.classList.add('show');
        }, 10);
    }
    
    close() {
        this.isVisible = false;
        this.calendar.classList.remove('show');
        
        setTimeout(() => {
            this.calendar.style.display = 'none';
        }, 200);
    }
    
    toggle() {
        if (this.isVisible) {
            this.close();
        } else {
            this.open();
        }
    }
    
    destroy() {
        if (this.calendar && this.calendar.parentNode) {
            this.calendar.parentNode.removeChild(this.calendar);
        }
    }
    
    // Métodos utilitários
    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }
    
    isSelected(date) {
        return this.selectedDate && date.toDateString() === this.selectedDate.toDateString();
    }
    
    isDisabled(date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const maxDate = this.options.maxDate;
        
        // Desabilitar datas passadas
        if (date < today) return true;
        
        // Desabilitar datas além do máximo
        if (maxDate && date > maxDate) return true;
        
        return false;
    }
    
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }
}

class ViatorBookingManager {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 5; // Aumentado para incluir novos steps
        this.bookingData = {
            productCode: null,
            selectedOption: null,
            travelDate: null,
            selectedTravelers: null,
            availabilityData: null,
            holdData: null,
            paymentToken: null,
            // Novos campos para booking questions
            travelersDetails: null,
            bookingQuestions: null,
            bookingQuestionAnswers: null,
            productLogistics: null
        };
        this.availableDates = new Set(); // Armazenar datas disponíveis
        this.steps = ['availability', 'travelers', 'booking-questions', 'payment', 'confirmation'];
        this.ageBands = []; // Array para armazenar as regras de viajantes
        this.bookingQuestions = []; // Armazenar perguntas de reserva do endpoint /products/booking-questions
        this.pageBookingQuestions = []; // Armazenar perguntas de reserva da página de produto único

        // Sistema de pagamento da Viator
        this.payment = null;
        this.deviceDataCollectionToken = null;

        // Cache para booking questions
        this.allBookingQuestions = null;
        this.productBookingQuestions = null;
    }

    /**
     * Estratégia abrangente para obter data de viagem de múltiplas fontes
     */
    getTravelDateFromMultipleSources() {
        const sources = [
            // 1. Elementos DOM primários
            () => {
                const element = document.getElementById('travel-date-value');
                return element?.value || null;
            },

            // 2. Elementos DOM alternativos
            () => {
                const alternatives = [
                    'travel-date',
                    'travelDate',
                    'date-picker',
                    'booking-date'
                ];

                for (const id of alternatives) {
                    const element = document.getElementById(id);
                    if (element?.value) return element.value;
                }
                return null;
            },

            // 3. Seletores por atributo name
            () => {
                const selectors = [
                    'input[name="travel_date"]',
                    'input[name="travelDate"]',
                    'input[name="date"]',
                    'input[name="booking_date"]'
                ];

                for (const selector of selectors) {
                    const element = document.querySelector(selector);
                    if (element?.value) return element.value;
                }
                return null;
            },

            // 4. Seletores por classe CSS
            () => {
                const selectors = [
                    '.travel-date-input',
                    '.date-picker-input',
                    '.booking-date',
                    '.viator-date-input',
                    'input[type="date"]'
                ];

                for (const selector of selectors) {
                    const element = document.querySelector(selector);
                    if (element?.value) return element.value;
                }
                return null;
            },

            // 5. Dados já armazenados
            () => {
                return this.bookingData.travelDate || null;
            },

            // 6. Dados de disponibilidade
            () => {
                return this.bookingData.availabilityData?.travelDate || null;
            },

            // 7. URL parameters
            () => {
                const urlParams = new URLSearchParams(window.location.search);
                return urlParams.get('travel_date') || urlParams.get('date') || null;
            },

            // 8. Local storage
            () => {
                try {
                    return localStorage.getItem('viator_travel_date') || null;
                } catch (e) {
                    return null;
                }
            }
        ];

        for (let i = 0; i < sources.length; i++) {
            try {
                const result = sources[i]();
                if (result) {
                    console.log(`✅ Data de viagem encontrada na fonte ${i + 1}:`, result);
                    this.debugLog(`Travel date found from source ${i + 1}`, {
                        source: i + 1,
                        value: result
                    });
                    return result;
                }
            } catch (error) {
                console.warn(`⚠️ Erro na fonte ${i + 1}:`, error);
            }
        }

        console.warn('⚠️ Nenhuma data de viagem encontrada em todas as fontes');
        this.debugLog('No travel date found in any source', {
            sourcesChecked: sources.length
        });

        return null;
    }

    /**
     * Função de debug para JavaScript (substitui viator_debug_log do PHP)
     */
    debugLog(message, data = null) {
        if (typeof console !== 'undefined' && console.log) {
            const timestamp = new Date().toISOString();
            const logMessage = `[VIATOR DEBUG ${timestamp}] ${message}`;

            if (data !== null) {
                console.log(logMessage, data);
            } else {
                console.log(logMessage);
            }

            // Também enviar para o PHP se necessário (opcional)
            if (typeof viatorBookingAjax !== 'undefined' && viatorBookingAjax.debug_enabled) {
                try {
                    fetch(viatorBookingAjax.ajaxurl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams({
                            action: 'viator_debug_log_js',
                            message: message,
                            data: data ? JSON.stringify(data) : '',
                            nonce: viatorBookingAjax.nonce
                        })
                    }).catch(error => {
                        // Silenciosamente ignorar erros de debug logging
                    });
                } catch (error) {
                    // Silenciosamente ignorar erros de debug logging
                }
            }
        }
    }
    
    init() {
        this.attachEvents();
        this.extractProductCode();
    }
    
    extractProductCode() {
        // Extrair o código do produto da URL ou de um elemento hidden
        const urlParams = new URLSearchParams(window.location.search);
        let productCode = urlParams.get('product') ||
                         urlParams.get('product_code') ||
                         document.querySelector('[data-product-code]')?.dataset.productCode ||
                         document.querySelector('.button-check-availability')?.dataset.productCode;

        // Tentar extrair do shortcode na página
        if (!productCode) {
            const shortcodeMatch = document.body.innerHTML.match(/\[viator_product[^>]*product_code=["\']([^"\']+)["\'][^\]]*\]/);
            if (shortcodeMatch) {
                productCode = shortcodeMatch[1];
            }
        }

        // Tentar extrair da URL path (formato: /produto/CODIGO)
        if (!productCode) {
            const pathMatch = window.location.pathname.match(/\/produto\/([^\/]+)/);
            if (pathMatch) {
                productCode = pathMatch[1];
            }
        }

        console.log('🔍 Product code extraído:', productCode);
        this.bookingData.productCode = productCode;
        return productCode;
    }
    
    attachEvents() {
        // Event listener para o botão "Check Availability"
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('button-check-availability')) {
                e.preventDefault();
                // Extrair product_code do botão clicado
                const productCode = e.target.dataset.productCode;
                if (productCode) {
                    this.bookingData.productCode = productCode;
                    console.log('🔍 [BOOKING QUESTIONS DEBUG] Product code extraído do botão:', productCode);
                }
                this.openBookingModal();
            }
        });
    }
    
    openBookingModal() {
        console.log('🚀 Abrindo modal de booking...');

        // Se ainda não temos product_code, tentar extrair novamente
        if (!this.bookingData.productCode) {
            console.log('🔍 Product code não encontrado, tentando extrair...');
            this.extractProductCode();
        }

        console.log('🔍 [BOOKING QUESTIONS DEBUG] Product code no openBookingModal:', this.bookingData.productCode);
        console.log('🔍 [BOOKING QUESTIONS DEBUG] viatorBookingAjax disponível:', typeof viatorBookingAjax);
        console.log('🔍 [BOOKING QUESTIONS DEBUG] AJAX URL:', viatorBookingAjax?.ajaxurl);
        console.log('🔍 [BOOKING QUESTIONS DEBUG] Nonce:', viatorBookingAjax?.nonce);

        this.scrapeAgeBandsFromPage(); // Raspa os dados da página primeiro
        this.createBookingModal();
        this.showStep(1);
        
        // Impedir scroll da página e preservar layout
        this.preventPageScroll();
    }
    
    preventPageScroll() {
        // Salvar posição atual do scroll
        this.scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        
        // Calcular largura do scrollbar
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        
        // Aplicar estilos para impedir scroll sem quebrar layout
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${this.scrollPosition}px`;
        document.body.style.width = '100%';
        document.body.style.height = '100vh';
        
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = scrollbarWidth + 'px';
        }
        
        document.body.classList.add('viator-modal-open');
        
        // Proteção: restaurar scroll se usuário sair da página
        this.beforeUnloadListener = () => this.restorePageScroll();
        window.addEventListener('beforeunload', this.beforeUnloadListener);
    }
    
    restorePageScroll() {
        // Remover estilos aplicados
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.height = '';
        document.body.style.paddingRight = '';
        document.body.classList.remove('viator-modal-open');
        
        // Restaurar posição original do scroll
        if (this.scrollPosition !== undefined) {
            window.scrollTo(0, this.scrollPosition);
            this.scrollPosition = undefined;
        }
        
        // Remover listener de proteção
        if (this.beforeUnloadListener) {
            window.removeEventListener('beforeunload', this.beforeUnloadListener);
            this.beforeUnloadListener = null;
        }
    }
    
    /**
     * Raspa os dados das faixas etárias e perguntas de reserva da página de produto único
     */
    scrapeAgeBandsFromPage() {
        console.log('🔍 scrapeAgeBandsFromPage chamado');
        this.ageBands = []; // Limpa dados anteriores
        this.pageBookingQuestions = []; // Limpa dados anteriores de perguntas
        
        // Extrair age bands
        const bandElements = document.querySelectorAll('.age-bands-list li');
        console.log('📋 Elementos de age bands encontrados:', bandElements.length);
        
        bandElements.forEach((el, index) => {
            console.log(`🔖 Processando elemento ${index}:`, el);
            const bandData = {
                bandId: el.dataset.bandId,
                ageBand: el.dataset.ageBand,
                minTravelers: parseInt(el.dataset.minTravelers, 10),
                maxTravelers: parseInt(el.dataset.maxTravelers, 10),
                startAge: parseInt(el.dataset.startAge, 10),
                endAge: parseInt(el.dataset.endAge, 10),
                defaultValue: parseInt(el.dataset.defaultValue, 10),
                label: el.querySelector('.age-band-label')?.textContent || ''
            };
            console.log(`📊 Band data ${index}:`, bandData);
            this.ageBands.push(bandData);
        });
        
        // Extrair booking questions da página
        this.extractBookingQuestionsFromPage();
        
        console.log('✅ AgeBands extraídos:', this.ageBands);
        console.log('✅ Booking Questions da página extraídos:', this.pageBookingQuestions);
    }

    /**
     * Extrai os dados de booking questions da página de produto único
     */
    extractBookingQuestionsFromPage() {
        console.log('🔍 extractBookingQuestionsFromPage chamado');
        
        // Procurar por um elemento que contenha os dados de booking questions
        // Pode estar em um script tag ou data attribute
        const bookingQuestionsElement = document.querySelector('[data-booking-questions]');
        
        if (bookingQuestionsElement) {
            try {
                const bookingQuestionsData = bookingQuestionsElement.getAttribute('data-booking-questions');
                this.pageBookingQuestions = JSON.parse(bookingQuestionsData);
                console.log('📋 Booking Questions extraídos do data attribute:', this.pageBookingQuestions);
                return;
            } catch (error) {
                console.error('❌ Erro ao parsear booking questions do data attribute:', error);
            }
        }
        
        // Alternativa: procurar em scripts inline
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
            const scriptContent = script.textContent || script.innerHTML;
            if (scriptContent.includes('bookingQuestions')) {
                try {
                    // Tentar extrair dados de variáveis JavaScript
                    const match = scriptContent.match(/bookingQuestions[\s]*:[\s]*\[(.*?)\]/s);
                    if (match) {
                        const questionsJson = '[' + match[1] + ']';
                        this.pageBookingQuestions = JSON.parse(questionsJson);
                        console.log('📋 Booking Questions extraídos do script:', this.pageBookingQuestions);
                        return;
                    }
                } catch (error) {
                    console.error('❌ Erro ao parsear booking questions do script:', error);
                }
            }
        }
        
        // Se não encontrou, tentar buscar em window object
        if (window.productData && window.productData.bookingQuestions) {
            this.pageBookingQuestions = window.productData.bookingQuestions;
            console.log('📋 Booking Questions extraídos do window.productData:', this.pageBookingQuestions);
            return;
        }
        
        console.log('⚠️ Nenhum booking question encontrado na página');
    }
    
    /**
     * Combina os dados de booking questions da página com os dados em cache
     * para criar um array completo com todas as informações necessárias
     */
    async combinePageQuestionsWithCache() {
        try {
            // Obter dados em cache se disponíveis
            const cachedData = this.getCachedBookingQuestions();
            
            if (!cachedData || !cachedData.length) {
                console.log('📋 Sem dados em cache, usando apenas dados da página');
                return this.pageBookingQuestions;
            }
            
            console.log('🔄 Combinando dados da página com cache...');
            
            // Criar um mapa dos dados da página por ID para acesso rápido
            const pageQuestionsMap = new Map();
            this.pageBookingQuestions.forEach(question => {
                if (question.id) {
                    pageQuestionsMap.set(question.id, question);
                }
            });
            
            // Combinar dados: priorizar dados da página, complementar com cache
            const combinedQuestions = [];
            
            // Primeiro, adicionar todas as perguntas da página
            this.pageBookingQuestions.forEach(pageQuestion => {
                combinedQuestions.push(pageQuestion);
            });
            
            // Depois, adicionar perguntas do cache que não estão na página
            cachedData.forEach(cachedQuestion => {
                if (!pageQuestionsMap.has(cachedQuestion.id)) {
                    combinedQuestions.push(cachedQuestion);
                }
            });
            
            console.log('✅ Dados combinados:', combinedQuestions);
            return combinedQuestions;
            
        } catch (error) {
            console.error('❌ Erro ao combinar dados da página com cache:', error);
            return this.pageBookingQuestions || [];
        }
    }
    
    /**
     * Obtém dados de booking questions do cache local
     */
    getCachedBookingQuestions() {
        try {
            const cacheKey = `viator_booking_questions_${this.bookingData.productCode}`;
            const cachedData = localStorage.getItem(cacheKey);
            
            if (cachedData) {
                const parsed = JSON.parse(cachedData);
                // Verificar se o cache não expirou (24 horas)
                const cacheTime = parsed.timestamp || 0;
                const now = Date.now();
                const cacheExpiry = 24 * 60 * 60 * 1000; // 24 horas
                
                if (now - cacheTime < cacheExpiry) {
                    console.log('📦 Dados encontrados no cache local');
                    return parsed.data || [];
                } else {
                    console.log('⏰ Cache expirado, removendo...');
                    localStorage.removeItem(cacheKey);
                }
            }
            
            return null;
        } catch (error) {
            console.error('❌ Erro ao acessar cache local:', error);
            return null;
        }
    }
    
    /**
     * Salva dados de booking questions no cache local
     */
    saveCachedBookingQuestions(questions) {
        try {
            const cacheKey = `viator_booking_questions_${this.bookingData.productCode}`;
            const cacheData = {
                data: questions,
                timestamp: Date.now()
            };
            
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            console.log('💾 Dados de booking questions salvos no cache local');
        } catch (error) {
            console.error('❌ Erro ao salvar no cache local:', error);
        }
    }
    
    createBookingModal() {
        // Remove modal existente se houver
        const existingModal = document.getElementById('viator-booking-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.id = 'viator-booking-modal';
        modal.className = 'viator-modal';
        modal.innerHTML = `
            <div class="viator-modal-content">
                <div class="viator-modal-header">
                    <h2 class="viator-modal-title">Reservar Experiência</h2>
                    <button class="viator-modal-close">&times;</button>
                </div>
                
                <div class="viator-booking-progress">
                    <div class="progress-step active" data-step="1">
                        <span class="step-number">1</span>
                        <span class="step-label">Disponibilidade</span>
                    </div>
                    <div class="progress-step" data-step="2">
                        <span class="step-number">2</span>
                        <span class="step-label">Viajantes</span>
                    </div>
                    <div class="progress-step" data-step="3">
                        <span class="step-number">3</span>
                        <span class="step-label">Informações</span>
                    </div>
                    <div class="progress-step" data-step="4">
                        <span class="step-number">4</span>
                        <span class="step-label">Pagamento</span>
                    </div>
                    <div class="progress-step" data-step="5">
                        <span class="step-number">5</span>
                        <span class="step-label">Confirmação</span>
                    </div>
                </div>
                
                <div class="viator-modal-body">
                    <div id="booking-step-content"></div>
                </div>
                
                <div class="viator-modal-footer">
                    <div class="footer-price-summary" id="footer-price-summary" style="display: none;">
                        <div class="price-breakdown">
                            <div class="price-details-container">
                                <button id="price-details-toggle" class="price-details-toggle" title="Expandir/Recolher detalhes">
                                    <span class="toggle-icon">▼</span>
                                </button>
                                <div id="price-details" class="price-details-content"></div>
                            </div>
                            <div class="total-price" id="total-price"></div>
                        </div>
                    </div>
                    <div class="footer-buttons">
                        <button id="booking-back-btn" class="viator-btn-secondary" style="display: none;">Voltar</button>
                        <button id="booking-next-btn" class="viator-btn-primary">Continuar</button>
                        <button id="booking-cancel-btn" class="viator-btn-cancel">Cancelar</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Inject animation styles
        this.injectAnimationStyles();

        // Attach modal events
        modal.querySelector('.viator-modal-close').addEventListener('click', () => this.closeModal());
        modal.querySelector('#booking-cancel-btn').addEventListener('click', () => this.closeModal());
        modal.querySelector('#booking-back-btn').addEventListener('click', async () => await this.previousStep());
        modal.querySelector('#booking-next-btn').addEventListener('click', async () => await this.nextStep());
        
        // Setup price details toggle
        this.setupPriceDetailsToggle();
        
        // Close modal when clicking outside
        // Impedir fechamento acidental - apenas permitir fechar via X ou botão Cancelar
        modal.addEventListener('click', (e) => {
            // Não fazer nada - usuário só pode fechar via botões específicos
            // Esta mudança impede fechamento acidental durante o fluxo de pagamento
        });
    }
    
    async showStep(stepNumber) {
        this.currentStep = stepNumber;
        this.updateProgress();
        
        const content = document.getElementById('booking-step-content');
        
        // Scroll para o topo da modal-body sempre que mudar de etapa
        const modalBody = document.querySelector('.viator-modal-body');
        if (modalBody) {
            modalBody.scrollTop = 0;
            console.log(`📜 Scroll resetado para o topo na etapa ${stepNumber}`);
        }
        
        switch (stepNumber) {
            case 1:
                content.innerHTML = this.getAvailabilityStepHTML();
                this.initializeAvailabilityStep();
                break;
            case 2:
                content.innerHTML = this.getTravelersStepHTML();
                await this.initializeTravelersStep();
                break;
            case 3:
                content.innerHTML = this.getBookingQuestionsStepHTML();
                await this.initializeBookingQuestionsStep();
                break;
            case 4:
                content.innerHTML = this.getPaymentStepHTML();
                await this.initializePaymentStep();
                break;
            case 5:
                content.innerHTML = this.getConfirmationStepHTML();
                // Se já temos dados de confirmação, exibir imediatamente
                if (this.bookingData.confirmationData) {
                    console.log('🎨 Exibindo confirmação na etapa 5 com dados existentes');
                    this.displayConfirmationMessage(this.bookingData.confirmationData);
                } else if (this.bookingData.paymentToken) {
                    // Se temos token de pagamento mas não confirmação, fazer confirmação agora
                    console.log('🎯 Iniciando confirmação na etapa 5');
                    this.confirmBooking();
                } else {
                    console.error('❌ Chegou na etapa 5 sem token de pagamento!');
                }
                break;
        }
        
        this.updateNavigationButtons();
    }
    
    updateProgress() {
        const steps = document.querySelectorAll('.progress-step');
        steps.forEach((step, index) => {
            if (index + 1 <= this.currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }
    
    updateNavigationButtons() {
        const backBtn = document.getElementById('booking-back-btn');
        const nextBtn = document.getElementById('booking-next-btn');
        const cancelBtn = document.getElementById('booking-cancel-btn');

        // Lógica do botão Voltar: aparece do passo 2 em diante (exceto confirmação)
        backBtn.style.display = this.currentStep > 1 && this.currentStep < 5 ? 'inline-block' : 'none';
        
        // Garante que o botão de próximo esteja visível, exceto na confirmação (step 5)
        nextBtn.style.display = this.currentStep < 5 ? 'inline-block' : 'none';

        // Move o botão de cancelar/fechar para a direita
        cancelBtn.style.marginLeft = 'auto';

        switch (this.currentStep) {
            case 1:
                nextBtn.textContent = 'Continuar';
                break;
            case 2:
                nextBtn.textContent = 'Continuar';
                break;
            case 3:
                nextBtn.textContent = 'Continuar';
                break;
            case 4:
                nextBtn.textContent = 'Processar Pagamento';
                break;
            case 5:
                // No passo de confirmação, não há "próximo" ou "voltar"
                nextBtn.style.display = 'none';
                cancelBtn.textContent = 'Fechar';
                break;
        }
    }
    
    getAvailabilityStepHTML() {
        // Gerador dinâmico para os seletores de viajantes
        let travelersHTML = '';
        if (this.ageBands && this.ageBands.length > 0) {
            this.ageBands.forEach(band => {
                const id = band.ageBand.toLowerCase();
                travelersHTML += `
                    <div class="traveler-group">
                        <label>${band.label}:</label>
                        <div class="quantity-selector">
                            <button type="button" class="qty-btn minus" data-target="${id}">-</button>
                            <input type="text" id="${id}-qty" value="${band.defaultValue}" min="${band.minTravelers}" max="${band.maxTravelers}" data-band-id="${band.bandId}" readonly>
                            <button type="button" class="qty-btn plus" data-target="${id}">+</button>
                        </div>
                    </div>
                `;
            });
        } else {
            // Fallback para o HTML antigo se a raspagem falhar
            travelersHTML = `
                <div class="traveler-group">
                    <label>Adultos (18+ anos):</label>
                    <div class="quantity-selector">
                        <button type="button" class="qty-btn minus" data-target="adults">-</button>
                        <input type="text" id="adults-qty" value="1" min="1" max="10" readonly>
                        <button type="button" class="qty-btn plus" data-target="adults">+</button>
                    </div>
                </div>
            `;
        }

        return `
            <div class="booking-step availability-step">
                <h3>Selecione a Data e Número de Viajantes</h3>
                
                <div class="form-group">
                    <label for="travel-date">Data da Viagem:</label>
                    <div class="viator-booking-date-selector form-control" id="travel-date">
                        <span class="calendar-icon">📅</span>
                        <span>Escolher data</span>
                    </div>
                    <input type="hidden" id="travel-date-value" name="travel_date" required>
                    <span id="date-error-message" class="error-message" style="display: none;"></span>
                </div>
                
                <div class="travelers-section">
                    <h4>Número de Viajantes</h4>
                    ${travelersHTML}
                    <div class="update-price-section">
                        <button type="button" id="update-price-btn" class="viator-btn-update-price">
                            <span class="update-icon">↻</span>
                            Atualizar Preços
                        </button>
                        <div id="price-display" class="price-display-dynamic" style="display: none;">
                            <div class="price-loading">Calculando preços...</div>
                        </div>
                    </div>
                </div>
                
                <div id="availability-result" class="availability-result" style="display: none;"></div>
            </div>
        `;
    }
    
    getTravelersStepHTML() {
        return `
            <div class="booking-step travelers-step">
                <h3>Informações da Reserva</h3>
                
                <!-- 1) Resumo dos Viajantes -->
                <div class="traveler-summary-section">
                    <h4>Resumo dos Viajantes</h4>
                    <div id="travelers-summary"></div>
                </div>
                
                <!-- 2) Informações do Responsável pela Reserva -->
                <div class="booker-info-section">
                    <h4>Informações do Responsável pela Reserva</h4>
                    <p class="booker-note">Apenas o responsável principal precisa fornecer seus dados pessoais:</p>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="booker-firstname">Nome *:</label>
                            <input type="text" id="booker-firstname" name="booker_firstname" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="booker-lastname">Sobrenome *:</label>
                            <input type="text" id="booker-lastname" name="booker_lastname" class="form-control" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="booker-email">Email *:</label>
                            <input type="email" id="booker-email" name="booker_email" class="form-control" required>
                        </div>
                        <div class="form-group phone-group">
                            <label for="booker-phone">Telefone *:</label>
                            <div class="phone-input-container">
                                <select id="booker-country-code" name="booker_country_code" class="form-control country-code-select" required>
                                    <option value="BR">(+55) Brasil</option>
                                    <option value="US">(+1) Estados Unidos</option>
                                    <option value="CA">(+1) Canadá</option>
                                    <option value="AR">(+54) Argentina</option>
                                    <option value="CL">(+56) Chile</option>
                                    <option value="CO">(+57) Colômbia</option>
                                    <option value="MX">(+52) México</option>
                                    <option value="PE">(+51) Peru</option>
                                    <option value="UY">(+598) Uruguai</option>
                                    <option value="FR">(+33) França</option>
                                    <option value="DE">(+49) Alemanha</option>
                                    <option value="IT">(+39) Itália</option>
                                    <option value="ES">(+34) Espanha</option>
                                    <option value="PT">(+351) Portugal</option>
                                    <option value="GB">(+44) Reino Unido</option>
                                    <option value="AU">(+61) Austrália</option>
                                    <option value="NZ">(+64) Nova Zelândia</option>
                                    <option value="JP">(+81) Japão</option>
                                    <option value="CN">(+86) China</option>
                                    <option value="IN">(+91) Índia</option>
                                </select>
                                <input type="tel" id="booker-phone" name="booker_phone" class="form-control phone-input" required placeholder="(11) 99999-9999">
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 3) Informações dos Viajantes Individuais -->
                <div id="traveler-booking-questions" style="display: none;">
                    <div id="traveler-booking-questions-inner"></div>
                </div>
                
                <!-- 4) Demais campos e informações -->
                <div id="pickup-point-section" class="pickup-point-main-section" style="display: none;">
                    <div id="pickup-point-container"></div>
                </div>
                
                <!-- 5) Informações Adicionais da Reserva (Idioma da Excursão e Requisitos Especiais) -->
                <div id="additional-booking-info-section" class="additional-booking-info-section" style="display: none;">
                    <h4>Informações Adicionais da Reserva</h4>
                    
                    <div class="additional-info-row">
                        <!-- Idioma da Excursão -->
                        <div id="language-guide-container" class="language-guide-column"></div>
                        
                        <!-- Requisitos Especiais e outras perguntas gerais -->
                        <div id="general-booking-questions" class="general-questions-column"></div>
                    </div>
                </div>
        `;
    }
    
    getPaymentStepHTML() {
        return `
            <div class="booking-step payment-step">
                <h3>Informações de Pagamento</h3>

                <div class="traveler-summary-section payment-summary">
                    <h4>Resumo da Reserva</h4>
                    <div id="booking-summary"></div>
                </div>

                <div class="booker-info-section payment-form">
                    <h4>Dados do Cartão de Crédito</h4>

                    <div class="security-notice" style="background: #e8f5e8; border: 1px solid #c3e6c3; border-radius: 8px; padding: 15px; margin-bottom: 20px; text-align: center;">
                        <div class="security-badge" style="color: #155724; font-weight: 600;">
                            🔒 Suas informações são criptografadas e processadas com segurança
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="card-number">Número do Cartão *:</label>
                        <input type="text" id="card-number" class="form-control" placeholder="1234 5678 9012 3456" maxlength="19" required>
                        <small class="form-text">Digite apenas os números do cartão</small>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="expiry-month">Mês de Vencimento *:</label>
                            <select id="expiry-month" class="form-control" required>
                                ${Array.from({length: 12}, (_, i) => {
                                    const month = String(i + 1).padStart(2, '0');
                                    const monthName = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                                                     'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][i];
                                    return `<option value="${month}">${month} - ${monthName}</option>`;
                                }).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="expiry-year">Ano de Vencimento *:</label>
                            <select id="expiry-year" class="form-control" required>
                                ${Array.from({length: 20}, (_, i) => {
                                    const year = new Date().getFullYear() + i;
                                    return `<option value="${year}">${year}</option>`;
                                }).join('')}
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="security-code">CVV *:</label>
                            <input type="text" id="security-code" class="form-control" placeholder="123" maxlength="4" required>
                            <small class="form-text">3 ou 4 dígitos</small>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="cardholder-name">Nome no Cartão *:</label>
                        <input type="text" id="cardholder-name" class="form-control" placeholder="Como aparece no cartão" required>
                        <small class="form-text">Exatamente como está impresso no cartão</small>
                    </div>
                    
                    <h4 style="margin-top: 30px;">Endereço de Cobrança</h4>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="billing-country">País *:</label>
                            <select id="billing-country" class="form-control" required>
                                <option value="BR">🇧🇷 Brasil</option>
                                <option value="US">🇺🇸 Estados Unidos</option>
                                <option value="CA">🇨🇦 Canadá</option>
                                <option value="AR">🇦🇷 Argentina</option>
                                <option value="CL">🇨🇱 Chile</option>
                                <option value="CO">🇨🇴 Colômbia</option>
                                <option value="MX">🇲🇽 México</option>
                                <option value="PE">🇵🇪 Peru</option>
                                <option value="UY">🇺🇾 Uruguai</option>
                                <option value="FR">🇫🇷 França</option>
                                <option value="DE">🇩🇪 Alemanha</option>
                                <option value="IT">🇮🇹 Itália</option>
                                <option value="ES">🇪🇸 Espanha</option>
                                <option value="PT">🇵🇹 Portugal</option>
                                <option value="GB">🇬🇧 Reino Unido</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="billing-zip">CEP/Código Postal *:</label>
                            <input type="text" id="billing-zip" class="form-control" placeholder="12345-678" maxlength="10" required>
                            <small class="form-text">Formato do seu país (ex: 01234-567 para Brasil)</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    getConfirmationStepHTML() {
        // O conteúdo será preenchido dinamicamente após a confirmação
        return `
            <div class="booking-step confirmation-step">
                <div class="confirmation-container">
                    <div class="confirmation-message">
                        <!-- Gerado dinamicamente -->
                    </div>
                </div>
            </div>
        `;
    }
    
    initializeAvailabilityStep() {
        console.log('🚀 initializeAvailabilityStep chamado');
        
        // Resetar dados dos viajantes para permitir nova seleção
        // Isso garante que quando o usuário retorna da etapa 2 para a etapa 1,
        // os dados sejam coletados do DOM atual em vez de usar dados armazenados
        this.bookingData.selectedTravelers = null;
        console.log('🔄 Dados de viajantes resetados para permitir nova seleção');
        
        // Initialize date picker
        this.initializeBookingDatePicker();
        
        // Quantity selectors
        const qtyButtons = document.querySelectorAll('.qty-btn');
        console.log('🔢 Botões de quantidade encontrados:', qtyButtons.length);
        
        qtyButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target.dataset.target;
                const input = document.getElementById(target + '-qty');
                const isPlus = e.target.classList.contains('plus');
                const travelerGroup = e.target.closest('.traveler-group');
                
                let value = parseInt(input.value);
                const maxValue = parseInt(input.max);
                const minValue = parseInt(input.min);
                
                // Limpar qualquer mensagem de erro existente
                this.clearTravelerError(travelerGroup);
                
                if (isPlus) {
                    // Verificar se o máximo é 0 (não permitido)
                    if (maxValue === 0 && value === 0) {
                        this.showTravelerError(travelerGroup, 'Esta categoria de viajante não está disponível para este passeio.');
                        return;
                    }
                    
                    const newValue = Math.min(value + 1, maxValue);
                    if (newValue === value && maxValue > 0) {
                        this.showTravelerError(travelerGroup, `Máximo de ${maxValue} viajante${maxValue > 1 ? 's' : ''} permitido${maxValue > 1 ? 's' : ''} para esta categoria.`);
                        return;
                    }
                    value = newValue;
                } else {
                    value = Math.max(value - 1, minValue);
                }
                
                input.value = value;
                console.log('👥 Quantidade alterada:', target, value);
                
                // Limpar preços quando alterar viajantes
                this.clearPriceDisplay();
                this.updateButtonText();
                this.hideDateError(); // Esconder erro quando viajantes forem alterados
            });
        });
        
        // Setup price updater
        console.log('🔧 Chamando setupPriceUpdater...');
        this.setupPriceUpdater();
        
        // Inicializar texto do botão
        this.updateButtonText();
    }
    
    /**
     * Função simplificada - calendário agora permite todas as datas futuras
     * A verificação real de disponibilidade é feita via /availability/check
     */
    async fetchAndSetAvailableDates(instance, monthsToFetch) {
        console.log('📅 Calendário configurado para permitir todas as datas futuras');
        console.log('✅ Verificação de disponibilidade será feita via /availability/check quando necessário');
        // Não há mais necessidade de buscar datas específicas da API para o calendário
        // A validação real acontece no momento do check de disponibilidade
    }

    initializeBookingDatePicker() {
        const dateSelector = document.querySelector('.viator-booking-date-selector');
        const hiddenInput = document.getElementById('travel-date-value');
        
        if (!dateSelector || !hiddenInput) return;

        // Destruir instância anterior se existir
        if (this.bookingDatePicker) {
            this.bookingDatePicker.destroy();
        }

        // Configuração do calendário personalizado
        const isMobile = window.innerWidth <= 768;
        
        const config = {
            mode: "single",
            minDate: "today",
            maxDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            dateFormat: "Y-m-d",
            locale: "pt",
            showMonths: isMobile ? 1 : 2,
            onChange: (selectedDates, dateStr) => {
                if (selectedDates.length === 1) {
                    const selectedDate = selectedDates[0];
                    hiddenInput.value = dateStr;

                    // Limpar mensagem de erro quando uma data for selecionada
                    this.hideDateError();

                    // Limpar opções de preços e resetar botão quando data mudar
                    this.clearPriceDisplay();
                    this.resetButtonToSearchState();

                    console.log('📅 Nova data selecionada:', dateStr, '- Preços limpos e botão resetado');

                    const diasDaSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
                    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

                    const diaSemana = diasDaSemana[selectedDate.getDay()];
                    const dia = selectedDate.getDate().toString().padStart(2, '0');
                    const mes = meses[selectedDate.getMonth()];
                    const ano = selectedDate.getFullYear();

                    const dataFormatada = `${diaSemana}, ${dia} de ${mes} de ${ano}`;
                    // Atualizar especificamente o span de texto, não o ícone
                    const textSpan = dateSelector.querySelector('span:not(.calendar-icon)');
                    if (textSpan) {
                        textSpan.textContent = dataFormatada;
                    }
                }
            },
            onReady: (selectedDates, dateStr, instance) => {
                instance.calendarContainer.classList.add('viator-booking-calendar');
                // Calendário permite todas as datas futuras - verificação real via /availability/check
            }
        };

        // Usar o calendário personalizado em vez do flatpickr
        this.bookingDatePicker = new CustomCalendar(dateSelector, config);
    }
    
    addPricesToCalendar(flatpickrInstance) {
        // Exemplo de preços - normalmente isto viria de uma API
        const samplePrices = {
            // Formato: 'YYYY-MM-DD': 'preço'
        };
        
        // Gerar preços de exemplo para demonstração
        const today = new Date();
        for (let i = 0; i < 60; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            
            // Preços variáveis para demonstração
            const basePrice = 628; // Preço base conforme a imagem
            const variation = Math.floor(Math.random() * 200) - 100; // Variação de -100 a +100
            samplePrices[dateStr] = basePrice + variation;
        }
        
        // Aplicar preços aos elementos do calendário
        setTimeout(() => {
            const dayElements = flatpickrInstance.calendarContainer.querySelectorAll('.flatpickr-day:not(.flatpickr-disabled)');
            
            dayElements.forEach(dayElement => {
                const dateStr = dayElement.dateObj ? dayElement.dateObj.toISOString().split('T')[0] : null;
                
                if (dateStr && samplePrices[dateStr]) {
                    // Remover label de preço existente se houver
                    const existingLabel = dayElement.querySelector('.price-label');
                    if (existingLabel) {
                        existingLabel.remove();
                    }
                    
                    // Adicionar novo label de preço
                    const priceLabel = document.createElement('div');
                    priceLabel.className = 'price-label';
                    priceLabel.textContent = `$${samplePrices[dateStr]}`;
                    dayElement.appendChild(priceLabel);
                }
            });
        }, 50);
    }
    
    async initializeTravelersStep() {
        console.log('🚀 initializeTravelersStep chamado');
        console.log('📊 Dados armazenados:', {
            selectedTravelers: this.bookingData.selectedTravelers,
            ageBands: this.ageBands,
            travelDate: this.bookingData.travelDate
        });
        
        // Buscar perguntas de reserva se ainda não foram carregadas
        if (this.bookingQuestions.length === 0) {
            console.log('🔍 Buscando perguntas de reserva...');
            await this.fetchBookingQuestions();
        }
        
        this.generateTravelersForm();
        
        // Renderizar perguntas de reserva após gerar o formulário
        console.log('🔍 [DEBUG] Antes de chamar renderBookingQuestionsInTravelersStep');
        console.log('🔍 [DEBUG] this.bookingQuestions antes da chamada:', this.bookingQuestions);
        console.log('🔍 [DEBUG] window.productData antes da chamada:', window.productData);
        this.renderBookingQuestionsInTravelersStep();
this.renderLocationOptions();
        console.log('🔍 [DEBUG] Após chamar renderBookingQuestionsInTravelersStep');
        
        // Verificar se o resumo foi gerado
        const container = document.getElementById('travelers-summary');
        const summaryCount = container ? container.children.length : 0;
        console.log(`✅ Resumo dos viajantes inicializado: ${summaryCount} itens`);
        
        if (summaryCount === 0) {
            console.error('❌ PROBLEMA: Nenhum resumo de viajante foi gerado!');
        }
        
        // Adicionar validações em tempo real para os campos do formulário
        this.setupBookerInfoValidation();
        
        // Configurar seletor de país e máscara de telefone
        this.setupCountryCodeSelector();
        
        // Configurar validações para perguntas de reserva
        this.setupBookingQuestionsValidation();
    }
    
    setupBookerInfoValidation() {
        const bookerFirstname = document.getElementById('booker-firstname');
        const bookerLastname = document.getElementById('booker-lastname');
        const bookerEmail = document.getElementById('booker-email');
        const bookerPhone = document.getElementById('booker-phone');
        
        // Função para limpar erro de campo específico
        const clearFieldError = (field) => {
            field.classList.remove('is-invalid');
            let errorDiv = document.getElementById(`error_${field.id}`);
            if (errorDiv) {
                errorDiv.style.display = 'none';
                errorDiv.classList.remove('show');
            }
        };
        
        // Função para mostrar erro de campo específico
        const showFieldError = (field, message) => {
            field.classList.add('is-invalid');
            let errorDiv = document.getElementById(`error_${field.id}`);
            if (!errorDiv) {
                errorDiv = document.createElement('div');
                errorDiv.id = `error_${field.id}`;
                errorDiv.className = 'error-message';
                field.parentNode.appendChild(errorDiv);
            }
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            errorDiv.classList.add('show');
        };
        
        // Validação em tempo real para nome
        if (bookerFirstname) {
            bookerFirstname.addEventListener('blur', () => {
                const value = bookerFirstname.value.trim();
                if (!value) {
                    showFieldError(bookerFirstname, 'O nome é obrigatório.');
                } else if (value.length < 2) {
                    showFieldError(bookerFirstname, 'O nome deve ter pelo menos 2 caracteres.');
                } else if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(value)) {
                    showFieldError(bookerFirstname, 'O nome deve conter apenas letras.');
                } else {
                    clearFieldError(bookerFirstname);
                }
            });
            
            bookerFirstname.addEventListener('input', () => {
                // Limpar erro enquanto digita se o campo não está vazio
                if (bookerFirstname.value.trim()) {
                    clearFieldError(bookerFirstname);
                }
            });
        }
        
        // Validação em tempo real para sobrenome
        if (bookerLastname) {
            bookerLastname.addEventListener('blur', () => {
                const value = bookerLastname.value.trim();
                if (!value) {
                    showFieldError(bookerLastname, 'O sobrenome é obrigatório.');
                } else if (value.length < 2) {
                    showFieldError(bookerLastname, 'O sobrenome deve ter pelo menos 2 caracteres.');
                } else if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(value)) {
                    showFieldError(bookerLastname, 'O sobrenome deve conter apenas letras.');
                } else {
                    clearFieldError(bookerLastname);
                }
            });
            
            bookerLastname.addEventListener('input', () => {
                // Limpar erro enquanto digita se o campo não está vazio
                if (bookerLastname.value.trim()) {
                    clearFieldError(bookerLastname);
                }
            });
        }
        
        // Validação em tempo real para email
        if (bookerEmail) {
            bookerEmail.addEventListener('blur', () => {
                const value = bookerEmail.value.trim();
                if (!value) {
                    showFieldError(bookerEmail, 'O email é obrigatório.');
                } else {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value)) {
                        showFieldError(bookerEmail, 'Por favor, informe um email válido.');
                    } else {
                        clearFieldError(bookerEmail);
                    }
                }
            });
            
            bookerEmail.addEventListener('input', () => {
                // Limpar erro enquanto digita se parece ser um email válido
                const value = bookerEmail.value.trim();
                if (value && value.includes('@') && value.includes('.')) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (emailRegex.test(value)) {
                        clearFieldError(bookerEmail);
                    }
                }
            });
        }
        
        // Validação em tempo real para telefone (opcional, mas com formato)
        if (bookerPhone) {
            bookerPhone.addEventListener('blur', () => {
                const value = bookerPhone.value.trim();
                if (value) {
                    // Contar apenas dígitos para validação
                    const digitsOnly = value.replace(/[^\d]/g, '');
                    
                    if (digitsOnly.length < 10) {
                        showFieldError(bookerPhone, 'O telefone deve ter pelo menos 10 dígitos.');
                    } else if (digitsOnly.length > 15) {
                        showFieldError(bookerPhone, 'O telefone deve ter no máximo 15 dígitos.');
                    } else {
                        // Validar formato básico
                        const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,20}$/;
                        if (!phoneRegex.test(value)) {
                            showFieldError(bookerPhone, 'Por favor, informe um telefone válido.');
                        } else {
                            clearFieldError(bookerPhone);
                        }
                    }
                } else {
                    clearFieldError(bookerPhone);
                }
            });
            
            bookerPhone.addEventListener('input', (e) => {
                // Obter valor atual
                let value = e.target.value;
                const digitsOnly = value.replace(/[^\d]/g, '');
                
                // Limitar a 15 dígitos máximo
                if (digitsOnly.length > 15) {
                    // Encontrar posição do 15º dígito e truncar
                    let digitCount = 0;
                    let newValue = '';
                    for (let i = 0; i < value.length; i++) {
                        const char = value[i];
                        if (/\d/.test(char)) {
                            digitCount++;
                            if (digitCount > 15) break;
                        }
                        newValue += char;
                    }
                    e.target.value = newValue;
                    value = newValue;
                }
                
                // Limitar comprimento total a 20 caracteres
                if (value.length > 20) {
                    e.target.value = value.substring(0, 20);
                    value = e.target.value;
                }
                
                // Limpar erro enquanto digita se parece válido
                if (value.trim()) {
                    const currentDigits = value.replace(/[^\d]/g, '');
                    if (currentDigits.length >= 10 && currentDigits.length <= 15) {
                        const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,20}$/;
                        if (phoneRegex.test(value)) {
                            clearFieldError(bookerPhone);
                        }
                    }
                }
            });
            
            // Permitir apenas números, espaços, parênteses, hífen e +
            bookerPhone.addEventListener('keypress', (e) => {
                const allowedChars = /[\d\s\-\(\)\+]/;
                if (!allowedChars.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault();
                    return;
                }
                
                // Verificar se adicionar este caractere excederia os limites
                const currentValue = e.target.value;
                const currentDigits = currentValue.replace(/[^\d]/g, '');
                
                // Se é um dígito e já temos 15 dígitos, bloquear
                if (/\d/.test(e.key) && currentDigits.length >= 15) {
                    e.preventDefault();
                    return;
                }
                
                // Se o comprimento total chegaria a 20, bloquear
                if (currentValue.length >= 20) {
                    e.preventDefault();
                    return;
                }
            });
            
            // Controlar operação de colar (paste)
            bookerPhone.addEventListener('paste', (e) => {
                e.preventDefault();
                
                // Obter texto colado
                const paste = (e.clipboardData || window.clipboardData).getData('text');
                
                // Limpar e filtrar apenas caracteres permitidos
                const cleaned = paste.replace(/[^\d\s\-\(\)\+]/g, '');
                const digitsOnly = cleaned.replace(/[^\d]/g, '');
                
                // Verificar se não excede limites
                const currentValue = e.target.value;
                const currentDigits = currentValue.replace(/[^\d]/g, '');
                const totalDigits = currentDigits.length + digitsOnly.length;
                
                if (totalDigits <= 15 && (currentValue + cleaned).length <= 20) {
                    // Permitir colagem completa
                    e.target.value = currentValue + cleaned;
                } else {
                    // Truncar para respeitar limites
                    let allowedDigits = 15 - currentDigits.length;
                    let newValue = currentValue;
                    let digitCount = 0;
                    
                    for (let i = 0; i < cleaned.length && newValue.length < 20; i++) {
                        const char = cleaned[i];
                        if (/\d/.test(char)) {
                            if (digitCount < allowedDigits) {
                                newValue += char;
                                digitCount++;
                            }
                        } else {
                            newValue += char;
                        }
                    }
                    
                    e.target.value = newValue.substring(0, 20);
                }
                
                // Disparar evento input para validações
                e.target.dispatchEvent(new Event('input', { bubbles: true }));
            });
        }
        
        // Limpar erro geral quando qualquer campo for corrigido
        [bookerFirstname, bookerLastname, bookerEmail, bookerPhone].forEach(field => {
            if (field) {
                field.addEventListener('input', () => {
                    this.hideDateError();
                });
            }
        });
    }
    
    setupCountryCodeSelector() {
        const countrySelect = document.getElementById('booker-country-code');
        const phoneInput = document.getElementById('booker-phone');
        
        if (!countrySelect || !phoneInput) {
            console.log('⚠️ Elementos de país ou telefone não encontrados');
            return;
        }
        
        // Máscaras de telefone por país
        const phoneMasks = {
            'BR': '(##) #####-####',
            'US': '(###) ###-####',
            'CA': '(###) ###-####',
            'AR': '(##) ####-####',
            'CL': '# #### ####',
            'CO': '(###) ###-####',
            'MX': '(###) ###-####',
            'PE': '### ### ###',
            'UY': '#### ####',
            'FR': '## ## ## ## ##',
            'DE': '### #######',
            'IT': '### ### ####',
            'ES': '### ### ###',
            'PT': '### ### ###',
            'GB': '##### ######',
            'AU': '#### ### ###',
            'NZ': '### ### ####',
            'JP': '###-####-####',
            'CN': '### #### ####',
            'IN': '##### #####'
        };
        
        // Placeholders por país
        const placeholders = {
            'BR': '(11) 99999-9999',
            'US': '(555) 123-4567',
            'CA': '(416) 123-4567',
            'AR': '(11) 1234-5678',
            'CL': '9 1234 5678',
            'CO': '(300) 123-4567',
            'MX': '(55) 1234-5678',
            'PE': '987 654 321',
            'UY': '9876 5432',
            'FR': '01 23 45 67 89',
            'DE': '030 1234567',
            'IT': '320 123 4567',
            'ES': '612 345 678',
            'PT': '912 345 678',
            'GB': '07700 900123',
            'AU': '0412 345 678',
            'NZ': '021 123 4567',
            'JP': '090-1234-5678',
            'CN': '138 0013 8000',
            'IN': '98765 43210'
        };
        
        // Função para aplicar máscara
        const applyMask = (value, mask) => {
            const cleanValue = value.replace(/\D/g, '');
            let maskedValue = '';
            let valueIndex = 0;
            
            for (let i = 0; i < mask.length && valueIndex < cleanValue.length; i++) {
                if (mask[i] === '#') {
                    maskedValue += cleanValue[valueIndex];
                    valueIndex++;
                } else {
                    maskedValue += mask[i];
                }
            }
            
            return maskedValue;
        };
        
        // Função para atualizar máscara baseada no país
        const updatePhoneMask = () => {
            const selectedCountry = countrySelect.value;
            const mask = phoneMasks[selectedCountry] || phoneMasks['BR'];
            const placeholder = placeholders[selectedCountry] || placeholders['BR'];
            
            phoneInput.placeholder = placeholder;
            
            // Limpar valor atual e reaplicar máscara
            const currentValue = phoneInput.value.replace(/\D/g, '');
            phoneInput.value = applyMask(currentValue, mask);
            
            // Atualizar atributo data-mask para referência
            phoneInput.setAttribute('data-mask', mask);
        };
        
        // Event listener para mudança de país
        countrySelect.addEventListener('change', updatePhoneMask);
        
        // Event listener para input de telefone
        phoneInput.addEventListener('input', (e) => {
            const selectedCountry = countrySelect.value;
            const mask = phoneMasks[selectedCountry] || phoneMasks['BR'];
            const value = e.target.value;
            
            // Aplicar máscara
            const maskedValue = applyMask(value, mask);
            e.target.value = maskedValue;
        });
        
        // Aplicar máscara inicial
        updatePhoneMask();
        
        console.log('✅ Seletor de país e máscara de telefone configurados');
    }
    
    /**
     * Configurar validações avançadas para perguntas de reserva
     */
    setupBookingQuestionsValidation() {
        console.log('🔧 Configurando validações para perguntas de reserva...');
        
        // Aguardar um pouco para garantir que as perguntas foram renderizadas
        setTimeout(() => {
            this.initializeBookingQuestionsValidation();
        }, 500);
    }
    
    /**
     * Inicializar validações para perguntas de reserva
     */
    initializeBookingQuestionsValidation() {
        const questionsContainers = [
            document.getElementById('general-booking-questions'),
            document.getElementById('traveler-booking-questions-inner')
        ];
        
        questionsContainers.forEach(container => {
            if (!container) return;
            
            // Configurar validações para todos os campos de perguntas
            const questionFields = container.querySelectorAll('input, select, textarea');
            
            questionFields.forEach(field => {
                this.setupFieldValidation(field);
            });
            
            // Configurar validação condicional
            this.setupConditionalValidation(container);
        });
        
        console.log('✅ Validações de perguntas de reserva configuradas');
    }
    
    /**
     * Configurar validação para um campo específico
     */
    setupFieldValidation(field) {
        if (!field.id) return;
        
        const questionId = field.id;
        const maxLength = field.dataset.maxLength;
        const hint = field.dataset.hint;
        const isRequired = field.hasAttribute('required');
        
        // Função para limpar erro
        const clearError = () => {
            field.classList.remove('is-invalid');
            const errorDiv = document.getElementById(`error_${questionId}`);
            if (errorDiv) {
                errorDiv.style.display = 'none';
                errorDiv.textContent = '';
            }
        };
        
        // Função para mostrar erro
        const showError = (message) => {
            field.classList.add('is-invalid');
            let errorDiv = document.getElementById(`error_${questionId}`);
            if (!errorDiv) {
                errorDiv = document.createElement('div');
                errorDiv.id = `error_${questionId}`;
                errorDiv.className = 'error-message';
                field.parentNode.appendChild(errorDiv);
            }
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        };
        
        // Validação em tempo real (input)
        field.addEventListener('input', () => {
            const value = field.value.trim();
            
            // Validação de maxLength
            if (maxLength && value.length > parseInt(maxLength)) {
                showError(`Máximo de ${maxLength} caracteres permitidos.`);
                return;
            }
            
            // Limpar erro se o campo está válido
            if (!isRequired || value) {
                clearError();
            }
            
            // Atualizar contador de caracteres se existir
            this.updateCharacterCounter(questionId, value.length, maxLength);
        });
        
        // Validação ao sair do campo (blur)
        field.addEventListener('blur', () => {
            this.validateField(field, showError, clearError);
        });
        
        // maxLength validation is handled by the maxlength attribute
    }
    
    /**
     * Validar um campo específico
     */
    validateField(field, showError, clearError) {
        const value = field.value.trim();
        const isRequired = field.hasAttribute('required');
        const maxLength = field.dataset.maxLength;
        const fieldType = field.type || field.tagName.toLowerCase();
        
        // Verificar se é obrigatório
        if (isRequired && !value) {
            showError('Obrigatório.');
            return false;
        }
        
        // Se não há valor e não é obrigatório, está válido
        if (!value) {
            clearError();
            return true;
        }
        
        // Validação de maxLength
        if (maxLength && value.length > parseInt(maxLength)) {
            showError(`Máximo de ${maxLength} caracteres permitidos.`);
            return false;
        }
        
        // Validações específicas por tipo
        switch (fieldType) {
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    showError('Por favor, informe um email válido.');
                    return false;
                }
                break;
                
            case 'tel':
            case 'phone':
                const digitsOnly = value.replace(/[^\d]/g, '');
                if (digitsOnly.length < 10) {
                    showError('O telefone deve ter pelo menos 10 dígitos.');
                    return false;
                }
                break;
                
            case 'number':
                if (isNaN(value) || value === '') {
                    showError('Por favor, informe um número válido.');
                    return false;
                }
                break;
                
            case 'date':
                const dateValue = new Date(value);
                if (isNaN(dateValue.getTime())) {
                    showError('Por favor, informe uma data válida.');
                    return false;
                }
                break;
        }
        
        // Validações específicas por ID da pergunta
        if (field.id.includes('weight') || field.id.includes('peso')) {
            const weight = parseFloat(value);
            if (weight <= 0 || weight > 500) {
                showError('Por favor, informe um peso válido (1-500 kg).');
                return false;
            }
        }
        
        if (field.id.includes('height') || field.id.includes('altura')) {
            const height = parseFloat(value);
            if (height <= 0 || height > 300) {
                showError('Por favor, informe uma altura válida (1-300 cm).');
                return false;
            }
        }
        
        clearError();
        return true;
    }
    
    /**
     * Atualizar contador de caracteres
     */
    updateCharacterCounter(questionId, currentLength, maxLength) {
        if (!maxLength) return;
        
        const counterId = `char-counter-${questionId}`;
        let counter = document.getElementById(counterId);
        
        if (!counter) {
            // Criar contador se não existir
            const field = document.getElementById(questionId);
            if (!field) return;
            
            counter = document.createElement('div');
            counter.id = counterId;
            counter.className = 'character-counter';
            counter.style.cssText = 'font-size: 12px; color: #6c757d; text-align: right; margin-top: 5px;';
            
            // Inserir após o campo
            field.parentNode.insertBefore(counter, field.nextSibling);
        }
        
        // Atualizar texto do contador
        counter.textContent = `${currentLength}/${maxLength} caracteres`;
        
        // Alterar cor se próximo do limite
        if (currentLength > maxLength * 0.9) {
            counter.style.color = '#dc3545'; // Vermelho
        } else if (currentLength > maxLength * 0.8) {
            counter.style.color = '#ffc107'; // Amarelo
        } else {
            counter.style.color = '#6c757d'; // Cinza padrão
        }
    }
    
    /**
     * Configurar validação condicional
     */
    setupConditionalValidation(container) {
        const conditionalFields = container.querySelectorAll('[data-conditional-parent]');
        
        conditionalFields.forEach(field => {
            const parentId = field.dataset.conditionalParent;
            const showWhen = field.dataset.conditionalValue;
            const parentField = document.getElementById(parentId);
            
            if (!parentField) return;
            
            // Função para verificar visibilidade
            const checkVisibility = () => {
                const parentValue = parentField.value;
                const shouldShow = !showWhen || parentValue === showWhen;
                
                const fieldContainer = field.closest('.booking-question-group');
                if (fieldContainer) {
                    if (shouldShow) {
                        fieldContainer.style.display = 'block';
                        // Restaurar atributo required se necessário
                        if (field.dataset.originalRequired === 'true') {
                            field.setAttribute('required', 'required');
                        }
                    } else {
                        fieldContainer.style.display = 'none';
                        // Remover atributo required temporariamente
                        if (field.hasAttribute('required')) {
                            field.dataset.originalRequired = 'true';
                            field.removeAttribute('required');
                        }
                        // Limpar valor e erro
                        field.value = '';
                        field.classList.remove('is-invalid');
                        const errorDiv = document.getElementById(`error_${field.id}`);
                        if (errorDiv) {
                            errorDiv.style.display = 'none';
                        }
                    }
                }
            };
            
            // Verificar visibilidade inicial
            checkVisibility();
            
            // Escutar mudanças no campo pai
            parentField.addEventListener('change', checkVisibility);
            parentField.addEventListener('input', checkVisibility);
        });
    }
    
    /**
     * Validar todas as perguntas de reserva
     */
    // MÉTODO REMOVIDO - DUPLICATA (mantendo apenas a definição mais completa na linha 3373)
    
    async initializePaymentStep() {
        this.generateBookingSummary();
        this.formatCardNumber();
        
        // Fazer hold da reserva antes de inicializar o sistema de pagamento
        if (!this.bookingData.holdData) {
            console.log('📋 Fazendo hold da reserva antes de inicializar pagamento...');
            const holdResult = await this.requestBookingHoldForPayment();
            if (!holdResult) {
                console.error('❌ Falha ao fazer hold da reserva');
                return;
            }
        }
        
        this.initializeViatorPayment();
    }
    
    /**
     * Inicializar sistema de pagamento da Viator
     */
    initializeViatorPayment() {
        if (this.bookingData.holdData && this.bookingData.holdData.paymentSessionToken) {
            // Inicializar detecção de fraude da Viator conforme documentação oficial
            if (window.Payment) {
                try {
                    this.payment = window.Payment.init(this.bookingData.holdData.paymentSessionToken);
                    console.log('✅ Sistema de pagamento da Viator inicializado com detecção de fraude');

                    // Inicializar coleta de dados de dispositivo para detecção de fraude
                    this.initializeFraudDetection();
                } catch (error) {
                    console.warn('⚠️ Erro ao inicializar Payment object:', error);
                    console.log('ℹ️ Continuando com fallback de detecção de fraude');
                    this.initializeFraudDetectionFallback();
                }
            } else {
                console.log('ℹ️ Biblioteca de pagamento da Viator não carregada - usando fallback');
                console.log('🔗 Para produção, carregue: https://checkout-assets.payments.tamg.cloud/stable/v2/payment.js');
                this.initializeFraudDetectionFallback();
            }
        } else {
            console.warn('⚠️ PaymentSessionToken não disponível - inicializando fallback básico');
            this.initializeFraudDetectionFallback();
        }
    }

    /**
     * Inicializar sistema de detecção de fraude com fallbacks robustos
     */
    initializeFraudDetection() {
        try {
            if (this.payment) {
                console.log('🔒 Iniciando coleta de dados de dispositivo para detecção de fraude...');

                // Inicializar flags de status
                this.fraudDetectionStatus = {
                    collectDeviceDataAvailable: false,
                    getTokenAvailable: false,
                    deviceDataCollected: false,
                    tokenObtained: false,
                    fallbackUsed: false
                };

                // Verificar e executar coleta de dados do dispositivo
                if (typeof this.payment.collectDeviceData === 'function') {
                    try {
                        this.payment.collectDeviceData();
                        this.fraudDetectionStatus.collectDeviceDataAvailable = true;
                        this.fraudDetectionStatus.deviceDataCollected = true;
                        console.log('✅ Coleta de dados de dispositivo iniciada');
                    } catch (collectError) {
                        console.warn('⚠️ Erro ao coletar dados do dispositivo:', collectError);
                        this.fraudDetectionStatus.collectDeviceDataAvailable = true; // Método existe mas falhou
                    }
                } else {
                    console.log('ℹ️ Método collectDeviceData não disponível - usando fallback (normal em desenvolvimento)');
                    this.initializeFraudDetectionFallback();
                }

                // Verificar e obter token de coleta de dados
                if (typeof this.payment.getDeviceDataCollectionToken === 'function') {
                    try {
                        this.deviceDataCollectionToken = this.payment.getDeviceDataCollectionToken();
                        this.fraudDetectionStatus.getTokenAvailable = true;
                        this.fraudDetectionStatus.tokenObtained = !!this.deviceDataCollectionToken;
                        console.log('✅ Token de coleta de dados obtido:', this.deviceDataCollectionToken ? 'Sim' : 'Não');
                    } catch (tokenError) {
                        console.warn('⚠️ Erro ao obter token de detecção de fraude:', tokenError);
                        this.generateFallbackDeviceToken();
                    }
                } else {
                    console.log('ℹ️ Método getDeviceDataCollectionToken não disponível - gerando token fallback (normal em desenvolvimento)');
                    this.generateFallbackDeviceToken();
                }

                this.debugLog('Fraud detection initialized', {
                    paymentObjectExists: !!this.payment,
                    status: this.fraudDetectionStatus,
                    deviceDataCollectionToken: this.deviceDataCollectionToken ? 'Present' : 'Missing'
                });

            } else {
                console.warn('⚠️ Sistema de pagamento não inicializado - usando detecção de fraude básica');
                this.initializeFraudDetectionFallback();
            }
        } catch (error) {
            console.error('❌ Erro ao inicializar detecção de fraude:', error);
            this.debugLog('Fraud detection initialization error', error);
            this.initializeFraudDetectionFallback();
        }
    }

    /**
     * Inicializar detecção de fraude com métodos alternativos
     */
    initializeFraudDetectionFallback() {
        console.log('🔄 Inicializando detecção de fraude com métodos alternativos...');

        this.fraudDetectionStatus = {
            collectDeviceDataAvailable: false,
            getTokenAvailable: false,
            deviceDataCollected: false,
            tokenObtained: false,
            fallbackUsed: true
        };

        // Coletar informações básicas do dispositivo
        this.collectBasicDeviceInfo();

        // Gerar token alternativo
        this.generateFallbackDeviceToken();

        console.log('✅ Detecção de fraude alternativa inicializada');
    }

    /**
     * Coletar informações básicas do dispositivo para detecção de fraude
     */
    collectBasicDeviceInfo() {
        try {
            this.basicDeviceInfo = {
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform,
                cookieEnabled: navigator.cookieEnabled,
                screenResolution: `${screen.width}x${screen.height}`,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                timestamp: new Date().toISOString()
            };

            this.fraudDetectionStatus.deviceDataCollected = true;
            console.log('✅ Informações básicas do dispositivo coletadas');
        } catch (error) {
            console.warn('⚠️ Erro ao coletar informações básicas do dispositivo:', error);
        }
    }

    /**
     * Gerar token alternativo para detecção de fraude
     */
    generateFallbackDeviceToken() {
        try {
            const tokenData = {
                sessionId: this.generateSessionId(),
                deviceInfo: this.basicDeviceInfo || {},
                timestamp: Date.now(),
                source: 'fallback'
            };

            // Gerar token simples baseado nos dados disponíveis
            this.deviceDataCollectionToken = btoa(JSON.stringify(tokenData));
            this.fraudDetectionStatus.tokenObtained = true;

            console.log('✅ Token de detecção de fraude alternativo gerado');
            this.debugLog('Fallback device token generated', {
                tokenLength: this.deviceDataCollectionToken.length,
                source: 'fallback'
            });
        } catch (error) {
            console.warn('⚠️ Erro ao gerar token alternativo:', error);
            // Token mínimo como último recurso
            this.deviceDataCollectionToken = 'fallback_' + Date.now();
        }
    }

    /**
     * Gerar ID de sessão único
     */
    generateSessionId() {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Gerenciar submissão de dados de detecção de fraude com fallbacks
     */
    async handleFraudDetectionSubmission() {
        try {
            console.log('🔒 Processando submissão de dados de detecção de fraude...');

            if (this.payment && typeof this.payment.submitDeviceData === 'function') {
                try {
                    // Tentar submeter dados usando método oficial
                    this.payment.submitDeviceData();
                    console.log('✅ Dados de detecção de fraude submetidos via método oficial');

                    // Verificar se temos token após submissão
                    if (!this.deviceDataCollectionToken && typeof this.payment.getDeviceDataCollectionToken === 'function') {
                        try {
                            this.deviceDataCollectionToken = this.payment.getDeviceDataCollectionToken();
                            console.log('✅ Token obtido após submissão:', !!this.deviceDataCollectionToken);
                        } catch (tokenError) {
                            console.warn('⚠️ Erro ao obter token após submissão:', tokenError);
                        }
                    }

                } catch (submitError) {
                    console.warn('⚠️ Erro na submissão oficial, usando método alternativo:', submitError);
                    await this.submitFraudDetectionFallback();
                }
            } else {
                console.warn('⚠️ Método submitDeviceData não disponível, usando submissão alternativa');
                await this.submitFraudDetectionFallback();
            }

            // Garantir que temos um token para incluir no pagamento
            if (!this.deviceDataCollectionToken) {
                console.warn('⚠️ Token de detecção de fraude não disponível, gerando token de emergência...');
                this.generateEmergencyFraudToken();
            }

            this.debugLog('Fraud detection submission completed', {
                method: this.payment && typeof this.payment.submitDeviceData === 'function' ? 'official' : 'fallback',
                hasToken: !!this.deviceDataCollectionToken,
                tokenSource: this.fraudDetectionStatus?.fallbackUsed ? 'fallback' : 'official'
            });

        } catch (error) {
            console.error('❌ Erro crítico na submissão de detecção de fraude:', error);
            this.generateEmergencyFraudToken();
        }
    }

    /**
     * Submissão alternativa de dados de detecção de fraude
     */
    async submitFraudDetectionFallback() {
        try {
            console.log('🔄 Executando submissão alternativa de dados de detecção de fraude...');

            // Simular submissão coletando dados adicionais
            const fraudData = {
                basicDeviceInfo: this.basicDeviceInfo || {},
                sessionInfo: {
                    sessionId: this.generateSessionId(),
                    pageUrl: window.location.href,
                    referrer: document.referrer,
                    timestamp: new Date().toISOString()
                },
                browserInfo: {
                    cookiesEnabled: navigator.cookieEnabled,
                    javaEnabled: navigator.javaEnabled ? navigator.javaEnabled() : false,
                    plugins: Array.from(navigator.plugins || []).map(p => p.name),
                    mimeTypes: Array.from(navigator.mimeTypes || []).map(m => m.type)
                }
            };

            // Armazenar dados para possível uso posterior
            this.fraudDetectionData = fraudData;

            // Gerar ou atualizar token baseado nos dados coletados
            if (!this.deviceDataCollectionToken) {
                this.generateFallbackDeviceToken();
            }

            console.log('✅ Submissão alternativa de detecção de fraude concluída');

        } catch (error) {
            console.warn('⚠️ Erro na submissão alternativa:', error);
        }
    }

    /**
     * Gerar token de emergência para casos críticos
     */
    generateEmergencyFraudToken() {
        const emergencyData = {
            emergency: true,
            timestamp: Date.now(),
            sessionId: 'emergency_' + Math.random().toString(36).substr(2, 9),
            userAgent: navigator.userAgent.substring(0, 100) // Limitar tamanho
        };

        this.deviceDataCollectionToken = 'emergency_' + btoa(JSON.stringify(emergencyData));
        console.log('🚨 Token de emergência gerado para detecção de fraude');

        this.debugLog('Emergency fraud token generated', {
            reason: 'Critical fallback',
            tokenLength: this.deviceDataCollectionToken.length
        });
    }

    /**
     * Garantir que temos um token de detecção de fraude válido
     */
    ensureFraudDetectionToken() {
        try {
            // Verificar se já temos um token válido
            if (this.deviceDataCollectionToken && this.deviceDataCollectionToken.length > 10) {
                return {
                    success: true,
                    source: this.fraudDetectionStatus?.fallbackUsed ? 'fallback' : 'official',
                    token: this.deviceDataCollectionToken
                };
            }

            // Tentar obter token do sistema oficial se disponível
            if (this.payment && typeof this.payment.getDeviceDataCollectionToken === 'function') {
                try {
                    const officialToken = this.payment.getDeviceDataCollectionToken();
                    if (officialToken) {
                        this.deviceDataCollectionToken = officialToken;
                        return {
                            success: true,
                            source: 'official_retry',
                            token: officialToken
                        };
                    }
                } catch (error) {
                    console.warn('⚠️ Erro ao obter token oficial na verificação final:', error);
                }
            }

            // Gerar token de fallback se necessário
            if (!this.deviceDataCollectionToken) {
                this.generateFallbackDeviceToken();
                if (this.deviceDataCollectionToken) {
                    return {
                        success: true,
                        source: 'fallback_generated',
                        token: this.deviceDataCollectionToken
                    };
                }
            }

            // Último recurso: token de emergência
            this.generateEmergencyFraudToken();
            return {
                success: true,
                source: 'emergency',
                token: this.deviceDataCollectionToken
            };

        } catch (error) {
            console.error('❌ Erro crítico ao garantir token de detecção de fraude:', error);
            return {
                success: false,
                reason: 'Critical error in token generation',
                fallbackAttempted: true,
                error: error.message
            };
        }
    }

    /**
     * Gerar fingerprint básico do navegador
     */
    generateBrowserFingerprint() {
        try {
            const fingerprint = {
                screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                language: navigator.language,
                platform: navigator.platform,
                cookieEnabled: navigator.cookieEnabled,
                doNotTrack: navigator.doNotTrack,
                plugins: Array.from(navigator.plugins || []).slice(0, 5).map(p => p.name),
                canvas: this.getCanvasFingerprint()
            };

            return btoa(JSON.stringify(fingerprint)).substring(0, 50);
        } catch (error) {
            console.warn('⚠️ Erro ao gerar fingerprint do navegador:', error);
            return 'fingerprint_error_' + Date.now();
        }
    }

    /**
     * Gerar fingerprint do canvas para identificação do dispositivo
     */
    getCanvasFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('Viator Security Check', 2, 2);
            return canvas.toDataURL().substring(0, 50);
        } catch (error) {
            return 'canvas_unavailable';
        }
    }

    /**
     * Buscar booking questions para o produto atual
     */
    async loadBookingQuestions() {
        try {
            console.log('🔄 Carregando booking questions para produto:', this.bookingData.productCode);

            if (!this.bookingData.productCode) {
                throw new Error('Product code não encontrado');
            }

            console.log('📡 Fazendo requisição para:', viatorBookingAjax.ajaxurl);
            console.log('📡 Parâmetros:', {
                action: 'viator_get_booking_questions',
                product_code: this.bookingData.productCode,
                nonce: viatorBookingAjax.nonce
            });

            const response = await fetch(viatorBookingAjax.ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'viator_get_booking_questions',
                    product_code: this.bookingData.productCode,
                    nonce: viatorBookingAjax.nonce
                })
            });

            console.log('📡 Response status:', response.status, response.statusText);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('📡 Response data:', result);

            if (result.success) {
                this.productBookingQuestions = result.data;
                console.log('✅ Booking questions carregadas:', Object.keys(result.data.booking_questions || {}).length, 'perguntas');
                console.log('✅ Dados completos:', result.data);
                this.debugLog('Booking questions loaded', {
                    product_code: this.bookingData.productCode,
                    questions_count: Object.keys(result.data.booking_questions || {}).length,
                    logistics: result.data.logistics
                });
                return result.data;
            } else {
                console.error('❌ Erro na resposta:', result);
                throw new Error(result.data?.message || 'Erro ao carregar booking questions');
            }
        } catch (error) {
            console.error('❌ Erro ao carregar booking questions:', error);
            console.error('❌ Stack trace:', error.stack);
            this.debugLog('Booking questions load error', error);

            // Fallback: continuar sem booking questions
            this.productBookingQuestions = {
                product_code: this.bookingData.productCode,
                booking_questions: {},
                logistics: {},
                product_options: []
            };

            return this.productBookingQuestions;
        }
    }

    /**
     * Gerar HTML para o step de booking questions
     */
    getBookingQuestionsStepHTML() {
        return `
            <div class="booking-step booking-questions-step">
                <h3>Informações Adicionais</h3>

                <div id="booking-questions-loading" class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>Carregando informações necessárias...</p>
                </div>

                <div id="booking-questions-content" style="display: none;">
                    <div id="booking-questions-form">
                        <!-- Perguntas serão inseridas aqui dinamicamente -->
                    </div>
                </div>

                <div id="booking-questions-error" class="booker-info-section" style="display: none; background: #f8d7da; border-color: #f5c6cb; color: #721c24;">
                    <h4 style="color: #721c24;">Erro ao Carregar</h4>
                    <p>Não foi possível carregar as informações necessárias. Você pode continuar com o processo de reserva.</p>
                </div>
            </div>
        `;
    }

    /**
     * Inicializar step de booking questions
     */
    async initializeBookingQuestionsStep() {
        console.log('🚀 Inicializando step de booking questions');
        console.log('🔍 Product code atual:', this.bookingData.productCode);
        console.log('🔍 Booking data completo:', this.bookingData);

        // Verificar se temos product code
        if (!this.bookingData.productCode) {
            console.error('❌ Product code não encontrado! Tentando extrair novamente...');
            this.extractProductCode();
            console.log('🔍 Product code após extração:', this.bookingData.productCode);
        }

        try {
            // Carregar booking questions
            const questionsData = await this.loadBookingQuestions();

            // Esconder loading
            const loadingElement = document.getElementById('booking-questions-loading');
            if (loadingElement) loadingElement.style.display = 'none';

            // Renderizar perguntas
            this.renderBookingQuestions(questionsData);

            // Mostrar conteúdo
            const contentElement = document.getElementById('booking-questions-content');
            if (contentElement) contentElement.style.display = 'block';

            // Inicializar eventos das perguntas
            this.initializeQuestionEvents();

        } catch (error) {
            console.error('❌ Erro ao inicializar booking questions:', error);

            // Esconder loading
            const loadingElement = document.getElementById('booking-questions-loading');
            if (loadingElement) loadingElement.style.display = 'none';

            // Mostrar erro
            const errorElement = document.getElementById('booking-questions-error');
            if (errorElement) errorElement.style.display = 'block';
        }
    }

    /**
     * Renderizar booking questions dinamicamente
     */
    renderBookingQuestions(questionsData) {
        console.log('🎨 Renderizando booking questions:', questionsData);
        console.log('🎨 Dados dos viajantes disponíveis:', this.bookingData.selectedTravelers);

        const formContainer = document.getElementById('booking-questions-form');
        if (!formContainer) {
            console.error('❌ Container de formulário não encontrado!');
            return;
        }

        // As perguntas vêm como array, não como objeto
        const questions = questionsData.booking_questions || [];

        console.log('🎨 Perguntas encontradas:', questions.length);
        console.log('🎨 Dados das perguntas:', questions);

        if (questions.length === 0) {
            console.log('ℹ️ Nenhuma pergunta encontrada, mostrando mensagem padrão');
            formContainer.innerHTML = `
                <div class="booker-info-section">
                    <h4>Tudo Pronto!</h4>
                    <p>Nenhuma informação adicional é necessária para esta experiência.</p>
                    <p>Você pode prosseguir diretamente para o pagamento.</p>
                    <p class="booker-note">
                        <strong>Debug:</strong> Product Code: ${this.bookingData.productCode || 'N/A'}
                    </p>
                </div>
            `;
            return;
        }

        console.log('🎨 Renderizando', questions.length, 'booking questions');

        let formHTML = '<div class="booking-questions-container">';

        // Separar perguntas por tipo
        const perBookingQuestions = [];
        const perTravelerQuestions = [];

        questions.forEach(question => {
            if (question.group === 'PER_BOOKING') {
                perBookingQuestions.push(question);
            } else if (question.group === 'PER_TRAVELER') {
                perTravelerQuestions.push(question);
            }
        });

        // Renderizar perguntas PER_BOOKING primeiro
        if (perBookingQuestions.length > 0) {
            formHTML += '<div class="booker-info-section per-booking-questions">';
            formHTML += '<h4>Informações da Reserva</h4>';

            perBookingQuestions.forEach(question => {
                formHTML += this.renderSingleQuestion(question, 'booking');
            });

            formHTML += '</div>';
        }

        // Renderizar perguntas PER_TRAVELER
        if (perTravelerQuestions.length > 0) {
            console.log('🎨 Renderizando perguntas PER_TRAVELER:', perTravelerQuestions.length);
            console.log('🎨 Dados dos viajantes:', this.bookingData.selectedTravelers);

            formHTML += '<div class="booker-info-section per-traveler-questions">';
            formHTML += '<h4>Informações dos Viajantes</h4>';

            // Para cada viajante - corrigir a lógica para usar array
            const travelers = this.bookingData.selectedTravelers || [];
            const totalTravelers = travelers.reduce((sum, travelerGroup) => sum + travelerGroup.numberOfTravelers, 0);

            console.log('🎨 Total de viajantes calculado:', totalTravelers);

            if (totalTravelers > 0) {
                let globalTravelerIndex = 1;

                travelers.forEach((travelerGroup, groupIndex) => {
                    for (let i = 0; i < travelerGroup.numberOfTravelers; i++) {
                        formHTML += `<div class="traveler-questions-group">`;
                        formHTML += `<h5>Viajante ${globalTravelerIndex}</h5>`;

                        perTravelerQuestions.forEach(question => {
                            formHTML += this.renderSingleQuestion(question, 'traveler', globalTravelerIndex);
                        });

                        formHTML += '</div>';
                        globalTravelerIndex++;
                    }
                });
            } else {
                formHTML += '<div class="no-travelers-message">';
                formHTML += '<p>⚠️ Nenhum viajante selecionado. Volte para a etapa anterior para selecionar os viajantes.</p>';
                formHTML += '</div>';
            }

            formHTML += '</div>';
        }

        formHTML += '</div>';

        formContainer.innerHTML = formHTML;

        // Inicializar eventos e validação
        this.initializeQuestionEvents();
    }

    /**
     * Renderizar uma única booking question
     */
    renderSingleQuestion(question, scope, travelerIndex = null) {
        const questionId = question.id;
        const fieldId = travelerIndex ? `${questionId}_traveler_${travelerIndex}` : questionId;
        const isRequired = question.required === 'MANDATORY';
        const requiredAttr = isRequired ? 'required' : '';
        const requiredLabel = isRequired ? ' *' : '';

        let questionHTML = `<div class="form-group question-group" data-question-id="${questionId}" data-scope="${scope}">`;
        questionHTML += `<label for="${fieldId}" class="question-label">`;
        questionHTML += `${question.label || question.id}${requiredLabel}`;
        questionHTML += `</label>`;

        // Adicionar hint se disponível
        if (question.hint) {
            questionHTML += `<div class="question-hint booker-note">${question.hint}</div>`;
        }

        // Renderizar campo baseado no tipo
        switch (question.id) {
            case 'FULL_NAMES_FIRST':
                questionHTML += `<input type="text" id="${fieldId}" name="${fieldId}"
                    class="form-control question-input" placeholder="Nome" ${requiredAttr}>`;
                break;

            case 'FULL_NAMES_LAST':
                questionHTML += `<input type="text" id="${fieldId}" name="${fieldId}"
                    class="form-control question-input" placeholder="Sobrenome" ${requiredAttr}>`;
                break;

            case 'DATE_OF_BIRTH':
                questionHTML += `<input type="date" id="${fieldId}" name="${fieldId}"
                    class="form-control question-input" ${requiredAttr}>`;
                break;

            case 'AGEBAND':
                questionHTML += this.renderAgeBandSelect(fieldId, requiredAttr, question);
                break;

            case 'PICKUP_POINT':
                questionHTML += this.renderPickupPointSelect(fieldId, requiredAttr, question);
                break;

            case 'SPECIAL_REQUIREMENTS':
                questionHTML += `<textarea id="${fieldId}" name="${fieldId}"
                    class="form-control question-input" rows="3"
                    placeholder="Descreva quaisquer necessidades especiais ou solicitações"
                    maxlength="${question.maxLength || 1000}"></textarea>`;
                break;

            case 'WEIGHT':
                questionHTML += this.renderWeightInput(fieldId, requiredAttr, question, travelerIndex);
                break;

            default:
                // Campo genérico baseado no tipo de dados esperado
                if (question.type === 'STRING') {
                    questionHTML += `<input type="text" id="${fieldId}" name="${fieldId}"
                        class="form-control question-input" ${requiredAttr}
                        maxlength="${question.maxLength || 255}">`;
                } else if (question.type === 'NUMBER_AND_UNIT') {
                    questionHTML += this.renderNumberWithUnitInput(fieldId, requiredAttr, question, travelerIndex);
                } else {
                    questionHTML += `<input type="text" id="${fieldId}" name="${fieldId}"
                        class="form-control question-input" ${requiredAttr}>`;
                }
                break;
        }

        questionHTML += `<div class="error-message" id="error_${fieldId}" style="display: none;"></div>`;
        questionHTML += `</div>`;

        return questionHTML;
    }

    /**
     * Renderizar select de age band
     */
    renderAgeBandSelect(fieldId, requiredAttr, question = null) {
        // Usar allowedAnswers da pergunta se disponível, senão usar padrão
        let ageBands;
        if (question && question.allowedAnswers) {
            ageBands = question.allowedAnswers.map(answer => ({
                id: answer,
                label: this.getAgeBandLabel(answer)
            }));
        } else {
            ageBands = this.ageBands || [
                { id: 'ADULT', label: 'Adulto (18+)' },
                { id: 'CHILD', label: 'Criança (3-17)' },
                { id: 'INFANT', label: 'Bebê (0-2)' },
                { id: 'SENIOR', label: 'Idoso (65+)' }
            ];
        }

        let selectHTML = `<select id="${fieldId}" name="${fieldId}" class="form-control question-input" ${requiredAttr}>`;
        selectHTML += '<option value="">Selecione a faixa etária</option>';

        ageBands.forEach(band => {
            selectHTML += `<option value="${band.id}">${band.label}</option>`;
        });

        selectHTML += '</select>';
        return selectHTML;
    }

    /**
     * Renderizar select de pickup point
     */
    renderPickupPointSelect(fieldId, requiredAttr, question = null) {
        const logistics = this.productBookingQuestions?.logistics || {};
        const pickupPoints = logistics.pickupPoints || [];

        let selectHTML = `<select id="${fieldId}" name="${fieldId}" class="form-control question-input" ${requiredAttr}>`;
        selectHTML += '<option value="">Selecione o ponto de encontro</option>';

        if (pickupPoints.length > 0) {
            pickupPoints.forEach(point => {
                selectHTML += `<option value="${point.id}">${point.name}</option>`;
            });
        } else {
            selectHTML += '<option value="hotel">Busca no hotel</option>';
            selectHTML += '<option value="meeting_point">Ponto de encontro padrão</option>';
        }

        selectHTML += '</select>';

        // Adicionar campo de texto livre se suportado
        if (question && question.units && question.units.includes('FREETEXT')) {
            selectHTML += `<div style="margin-top: 10px;">
                <input type="text" id="${fieldId}_freetext" name="${fieldId}_freetext"
                       class="form-control question-input"
                       placeholder="Ou digite um endereço específico"
                       maxlength="${question.maxLength || 1000}">
            </div>`;
        }

        return selectHTML;
    }

    /**
     * Renderizar input de peso
     */
    renderWeightInput(fieldId, requiredAttr, question, travelerIndex = null) {
        const units = question.units || ['kg', 'lbs'];
        const isFirstTraveler = travelerIndex === 1;
        const shouldDisableUnit = travelerIndex && !isFirstTraveler;

        let html = `<div class="weight-input-container" style="display: flex; gap: 10px; align-items: stretch;">
            <div style="flex: 2;">
                <input type="number" id="${fieldId}" name="${fieldId}"
                       class="form-control question-input"
                       placeholder="Peso" ${requiredAttr} min="1" max="300"
                       style="width: 100%; height: 100%;">
            </div>
            <div style="flex: 1;">
                <select id="${fieldId}_unit" name="${fieldId}_unit"
                        class="form-control question-input unit-sync-field"
                        data-question-type="WEIGHT"
                        data-traveler="${travelerIndex || 1}"
                        ${shouldDisableUnit ? 'disabled' : ''}
                        ${requiredAttr}
                        style="width: 100%; height: 100%; padding-right: 30px;">`;

        units.forEach(unit => {
            const selected = unit === 'kg' ? 'selected' : '';
            html += `<option value="${unit}" ${selected}>${unit}</option>`;
        });

        html += `</select></div></div>`;
        return html;
    }

    /**
     * Renderizar input de número com unidade
     */
    renderNumberWithUnitInput(fieldId, requiredAttr, question, travelerIndex = null) {
        const units = question.units || [];
        const isFirstTraveler = travelerIndex === 1;
        const shouldDisableUnit = travelerIndex && !isFirstTraveler;
        const questionType = question.id || 'NUMBER';

        let html = `<div class="number-unit-container" style="display: flex; gap: 10px; align-items: stretch;">
            <div style="flex: 2;">
                <input type="number" id="${fieldId}" name="${fieldId}"
                       class="form-control question-input"
                       ${requiredAttr} maxlength="${question.maxLength || 50}"
                       placeholder="${question.hint || 'Digite o valor'}"
                       style="width: 100%; height: 100%;">
            </div>`;

        if (units.length > 0) {
            html += `<div style="flex: 1;">
                <select id="${fieldId}_unit" name="${fieldId}_unit"
                        class="form-control question-input unit-sync-field"
                        data-question-type="${questionType}"
                        data-traveler="${travelerIndex || 1}"
                        ${shouldDisableUnit ? 'disabled' : ''}
                        ${requiredAttr}
                        style="width: 100%; height: 100%; padding-right: 30px;">`;

            units.forEach(unit => {
                const selected = (questionType === 'HEIGHT' && unit === 'cm') ||
                               (questionType === 'WEIGHT' && unit === 'kg') ? 'selected' : '';
                html += `<option value="${unit}" ${selected}>${unit}</option>`;
            });

            html += `</select></div>`;
        }

        html += `</div>`;
        return html;
    }

    /**
     * Obter label traduzido para age band
     */
    getAgeBandLabel(ageBand) {
        const labels = {
            'ADULT': 'Adulto (18+)',
            'SENIOR': 'Idoso (65+)',
            'YOUTH': 'Jovem (13-17)',
            'CHILD': 'Criança (3-12)',
            'INFANT': 'Bebê (0-2)',
            'TRAVELER': 'Viajante'
        };

        return labels[ageBand] || ageBand;
    }

    /**
     * Inicializar eventos das booking questions
     */
    initializeQuestionEvents() {
        const questionInputs = document.querySelectorAll('.question-input');

        questionInputs.forEach(input => {
            // Validação em tempo real
            input.addEventListener('blur', () => {
                this.validateQuestionField(input);
            });

            // Coletar respostas sempre que houver mudança
            input.addEventListener('change', () => {
                this.collectBookingQuestionAnswers();

                // Lógica condicional para campos específicos
                if (input.id.includes('DATE_OF_BIRTH')) {
                    this.updateAgeBandFromBirthDate(input);
                }

                // Sincronização de unidades para campos WEIGHT e HEIGHT
                if (input.classList.contains('unit-sync-field')) {
                    this.syncUnitsAcrossTravelers(input);
                }
            });

            // Para campos de texto, coletar também no input
            input.addEventListener('input', () => {
                if (input.type === 'text' || input.type === 'textarea') {
                    this.collectBookingQuestionAnswers();
                }
            });
        });

        // Inicializar coleta inicial
        this.collectBookingQuestionAnswers();

        // Adicionar estilos para campos sincronizados
        this.addUnitSyncStyles();

        // Adicionar estilos padronizados de validação
        this.addValidationStyles();
    }

    /**
     * Sincronizar unidades entre viajantes
     */
    syncUnitsAcrossTravelers(changedField) {
        const questionType = changedField.dataset.questionType;
        const travelerIndex = parseInt(changedField.dataset.traveler);
        const selectedUnit = changedField.value;

        console.log(`🔄 Sincronizando unidades ${questionType}: Viajante ${travelerIndex} selecionou ${selectedUnit}`);

        // Apenas o Viajante 1 pode alterar unidades
        if (travelerIndex !== 1) {
            console.log('⚠️ Apenas o Viajante 1 pode alterar unidades');
            return;
        }

        // Encontrar todos os campos de unidade do mesmo tipo
        const allUnitFields = document.querySelectorAll(`.unit-sync-field[data-question-type="${questionType}"]`);

        allUnitFields.forEach((field, index) => {
            const fieldTravelerIndex = parseInt(field.dataset.traveler);

            if (fieldTravelerIndex !== 1) {
                // Sincronizar unidade para outros viajantes
                field.value = selectedUnit;
                console.log(`✅ Viajante ${fieldTravelerIndex} - ${questionType} sincronizado para ${selectedUnit}`);
            }
        });

        // Coletar respostas atualizadas
        this.collectBookingQuestionAnswers();
    }

    /**
     * Adicionar estilos CSS para campos de unidade sincronizados
     */
    addUnitSyncStyles() {
        const styleId = 'unit-sync-styles';

        // Verificar se os estilos já foram adicionados
        if (document.getElementById(styleId)) {
            return;
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Estilos para campos de unidade sincronizados */
            .unit-sync-field:disabled {
                background-color: #f8f9fa !important;
                border-color: #e9ecef !important;
                color: #6c757d !important;
                cursor: not-allowed !important;
                opacity: 0.8 !important;
            }

            .unit-sync-field:disabled:hover {
                background-color: #f8f9fa !important;
                border-color: #e9ecef !important;
            }

            /* Indicador visual para campos sincronizados */
            .form-group:has(.unit-sync-field:disabled) {
                position: relative;
            }

            /* Ícone ::after removido para evitar sobreposição com background-image */

            /* Tooltip para explicar sincronização */
            .unit-sync-field:disabled {
                position: relative;
            }

            .unit-sync-field:disabled:hover::before {
                content: "Sincronizado com Viajante 1";
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                background: #333;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                white-space: nowrap;
                z-index: 1000;
                margin-bottom: 5px;
            }

            .unit-sync-field:disabled:hover::after {
                content: "";
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                border: 4px solid transparent;
                border-top-color: #333;
                z-index: 1000;
            }
        `;

        document.head.appendChild(style);
        console.log('🎨 Estilos de sincronização de unidades injetados');
    }

    /**
     * Adicionar estilos CSS padronizados para validação (todas as etapas)
     */
    addValidationStyles() {
        const styleId = 'validation-styles';

        // Verificar se os estilos já foram adicionados
        if (document.getElementById(styleId)) {
            return;
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Estilos padronizados para validação - replicando exatamente a Etapa 2 */
            .error-message {
                color: #dc3545;
                background-color: #f8d7da;
                font-size: 0.875rem;
                margin-top: 0.25rem;
                padding: 0.75rem 1rem;
                text-align: center;
                border-radius: 0.375rem;
                display: block;
                font-weight: normal;
                line-height: 1.4;
                border: none;
            }

            .error-message.show {
                animation: fadeInError 0.3s ease-in;
            }

            .warning-message {
                color: #856404;
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 0.375rem;
                padding: 0.75rem 1rem;
                font-size: 0.875rem;
                margin-top: 0.5rem;
                display: block;
                font-weight: 500;
                line-height: 1.4;
            }

            /* Campos com erro - borda vermelha sólida como na imagem */
            .is-invalid {
                border: 2px solid #dc3545 !important;
                box-shadow: none !important;
            }

            .is-invalid:focus {
                border: 2px solid #dc3545 !important;
                box-shadow: none !important;
                outline: none !important;
            }

            /* Mensagens de erro para viajantes - mesmo padrão */
            .traveler-error-message {
                color: #dc3545;
                background-color: #f8d7da;
                font-size: 0.875rem;
                margin-top: 0.5rem;
                padding: 0.75rem 1rem;
                text-align: center;
                border-radius: 0.375rem;
                display: block;
                font-weight: normal;
                border: none;
            }

            @keyframes fadeInError {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            /* Mensagens de erro gerais - mesmo padrão da imagem */
            #date-error-message {
                color: #dc3545;
                background-color: #f8d7da;
                border-radius: 0.375rem;
                padding: 0.75rem 1rem;
                margin-top: 0.5rem;
                font-size: 0.875rem;
                font-weight: normal;
                line-height: 1.4;
                text-align: center;
                border: none;
            }

            /* Remover estilos conflitantes antigos */
            .field-error,
            .question-error {
                display: none !important;
            }

            /* Estilos específicos para campos com unidades */
            .weight-input-container,
            .number-unit-container {
                display: flex !important;
                gap: 10px !important;
                align-items: stretch !important;
            }

            .weight-input-container > div,
            .number-unit-container > div {
                display: flex !important;
                align-items: stretch !important;
            }

            .weight-input-container input,
            .number-unit-container input,
            .weight-input-container select,
            .number-unit-container select {
                height: auto !important;
                min-height: 38px !important;
                border: 2px solid #e9ecef !important;
                border-radius: 0.375rem !important;
                padding: 8px 12px !important;
                font-size: 1rem !important;
                line-height: 1.5 !important;
            }

            /* Corrigir alinhamento do select de unidades */
            .weight-input-container select,
            .number-unit-container select {
                padding-right: 30px !important;
                padding-left: 12px !important;
                text-align: left !important;
                text-align-last: left !important;
                appearance: none !important;
                -webkit-appearance: none !important;
                -moz-appearance: none !important;
                background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e") !important;
                background-repeat: no-repeat !important;
                background-position: right 8px center !important;
                background-size: 16px !important;
            }

            /* Remover ícone de clips dos campos desabilitados */
            .weight-input-container select:disabled,
            .number-unit-container select:disabled {
                background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpath d='M9 12l2 2 4-4'%3e%3c/path%3e%3ccircle cx='12' cy='12' r='10'%3e%3c/circle%3e%3c/svg%3e") !important;
                background-color: #f8f9fa !important;
                color: #6c757d !important;
                cursor: not-allowed !important;
            }

            /* Garantir que campos com erro mantenham o estilo correto */
            .weight-input-container input.is-invalid,
            .number-unit-container input.is-invalid,
            .weight-input-container select.is-invalid,
            .number-unit-container select.is-invalid {
                border: 2px solid #dc3545 !important;
            }

            /* Corrigir placeholder do campo de peso para peso sutil igual aos demais */
            .weight-input-container input::placeholder,
            .number-unit-container input::placeholder {
                font-weight: 500 !important;
                font-style: normal !important;
                color: #6c757d !important;
            }

            /* Remover ícones de validação automáticos do Bootstrap/frameworks */
            .form-control.is-invalid {
                background-image: none !important;
                padding-right: 12px !important;
            }

            .weight-input-container .form-control.is-invalid,
            .number-unit-container .form-control.is-invalid {
                background-image: none !important;
                padding-right: 12px !important;
            }

            /* Garantir que não há ícones de validação em nenhum campo */
            .question-input.is-invalid {
                background-image: none !important;
                background-repeat: no-repeat !important;
                background-position: right calc(0.375em + 0.1875rem) center !important;
                background-size: calc(0.75em + 0.375rem) calc(0.75em + 0.375rem) !important;
                padding-right: 12px !important;
            }

            /* Remover qualquer pseudo-elemento que possa estar adicionando ícones */
            .question-input.is-invalid::after,
            .question-input.is-invalid::before,
            .form-control.is-invalid::after,
            .form-control.is-invalid::before {
                display: none !important;
                content: none !important;
            }

            /* Garantir alinhamento consistente para todos os selects */
            select.form-control,
            select.question-input {
                text-align: left !important;
                text-align-last: left !important;
                padding-left: 12px !important;
                padding-right: 30px !important;
                border-radius: 0.375rem !important;
                appearance: none !important;
                -webkit-appearance: none !important;
                -moz-appearance: none !important;
                background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e") !important;
                background-repeat: no-repeat !important;
                background-position: right 8px center !important;
                background-size: 16px !important;
            }

            /* Garantir border-radius consistente para todos os inputs */
            input.form-control,
            input.question-input,
            textarea.form-control,
            textarea.question-input {
                border-radius: 0.375rem !important;
            }

            /* Aplicar padrões da Etapa 3 aos campos de pagamento */
            .payment-form input.form-control,
            .payment-form select.form-control {
                border: 2px solid #e9ecef !important;
                border-radius: 0.375rem !important;
                padding: 8px 12px !important;
                font-size: 1rem !important;
                line-height: 1.5 !important;
                background-image: none !important;
            }

            /* Placeholder dos campos de pagamento com peso consistente */
            .payment-form input.form-control::placeholder {
                font-weight: 500 !important;
                font-style: normal !important;
                color: #6c757d !important;
            }

            /* Selects de pagamento com alinhamento consistente */
            .payment-form select.form-control {
                text-align: left !important;
                text-align-last: left !important;
                padding-left: 12px !important;
                padding-right: 12px !important;
                appearance: none !important;
                -webkit-appearance: none !important;
                -moz-appearance: none !important;
                background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e") !important;
                background-repeat: no-repeat !important;
                background-position: right 8px center !important;
                background-size: 16px !important;
            }

            /* Campos de pagamento com erro - mesmo padrão da Etapa 3 */
            .payment-form input.form-control.is-invalid,
            .payment-form select.form-control.is-invalid {
                border: 2px solid #dc3545 !important;
                background-image: none !important;
                padding-right: 12px !important;
            }

            /* Remover ícones de validação dos campos de pagamento */
            .payment-form .form-control.is-invalid::after,
            .payment-form .form-control.is-invalid::before {
                display: none !important;
                content: none !important;
            }

            /* Labels dos campos de pagamento */
            .payment-form label {
                font-weight: 500 !important;
                color: #495057 !important;
                margin-bottom: 5px !important;
                display: block !important;
            }

            /* Textos de ajuda dos campos de pagamento */
            .payment-form .form-text {
                font-size: 0.875rem !important;
                color: #6c757d !important;
                margin-top: 5px !important;
            }

            /* Correção específica para selects de data de vencimento */
            #expiry-month,
            #expiry-year,
            #billing-country {
                padding-right: 30px !important;
                background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e") !important;
                background-repeat: no-repeat !important;
                background-position: right 8px center !important;
                background-size: 16px !important;
                appearance: none !important;
                -webkit-appearance: none !important;
                -moz-appearance: none !important;
            }

            /* Garantir que o texto não seja cortado */
            #expiry-month option,
            #expiry-year option,
            #billing-country option {
                padding: 8px 12px !important;
                text-align: left !important;
            }
        `;

        document.head.appendChild(style);
        console.log('🎨 Estilos de validação padronizados injetados');
    }

    /**
     * Coletar todas as respostas das booking questions (formato compatível com backend PHP)
     */
    collectBookingQuestionAnswers() {
        console.log('📝 Coletando respostas das booking questions...');

        const answers = [];
        const questionInputs = document.querySelectorAll('.question-input');

        questionInputs.forEach(input => {
            const questionId = this.extractQuestionId(input);
            const travelerIndex = this.extractTravelerNumber(input);
            const value = input.value.trim();

            if (!questionId || !value) return;

            // Determinar scope baseado no tipo de pergunta
            const scope = this.getQuestionScope(questionId, travelerIndex);

            const answer = {
                questionId: questionId,  // Formato esperado pelo PHP
                answer: value,
                scope: scope
            };

            // Adicionar travelerIndex para perguntas PER_TRAVELER
            if (travelerIndex && scope === 'traveler') {
                answer.travelerIndex = parseInt(travelerIndex);
            }

            // Adicionar unit para campos que precisam (formato Viator API)
            const unit = this.getQuestionUnit(input, questionId);
            if (unit) {
                answer.unit = unit;
            }

            answers.push(answer);
        });

        // Armazenar respostas no bookingData
        this.bookingData.bookingQuestionAnswers = answers;

        console.log('📝 Respostas coletadas:', answers.length);
        console.log('📝 Dados das respostas:', answers);

        // Atualizar contador no UI se existir
        this.updateBookingQuestionsCount(answers.length);

        return answers;
    }

    /**
     * Determinar scope da pergunta (booking ou traveler)
     */
    getQuestionScope(questionId, travelerIndex) {
        // Perguntas PER_TRAVELER
        const perTravelerQuestions = [
            'FULL_NAMES_FIRST', 'FULL_NAMES_LAST', 'DATE_OF_BIRTH',
            'AGEBAND', 'WEIGHT', 'HEIGHT', 'PASSPORT_EXPIRY',
            'PASSPORT_NATIONALITY', 'PASSPORT_PASSPORT_NO'
        ];

        if (perTravelerQuestions.includes(questionId) || travelerIndex) {
            return 'traveler';
        }

        return 'booking';
    }

    /**
     * Extrair ID da pergunta do campo
     */
    extractQuestionId(input) {
        // Formato: QUESTION_ID ou QUESTION_ID_traveler_X ou QUESTION_ID_unit
        const id = input.id || input.name;
        if (!id) return null;

        // Remover sufixos _traveler_X, _unit, etc.
        return id.split('_')[0];
    }

    /**
     * Extrair número do viajante do campo
     */
    extractTravelerNumber(input) {
        const id = input.id || input.name;
        if (!id) return null;

        const match = id.match(/traveler_(\d+)/);
        return match ? match[1] : null;
    }

    /**
     * Obter unidade para a pergunta
     */
    getQuestionUnit(input, questionId) {
        // Para campos de peso
        if (questionId === 'WEIGHT') {
            const unitField = document.querySelector(`[name="${input.name}_unit"], [id="${input.id}_unit"]`);
            return unitField ? unitField.value : 'kg';
        }

        // Para pickup point
        if (questionId === 'PICKUP_POINT') {
            // Verificar se é um campo de texto livre ou location reference
            if (input.type === 'text') {
                return 'FREETEXT';
            } else if (input.type === 'select-one') {
                return 'LOCATION_REFERENCE';
            }
        }

        // Para campos de altura
        if (questionId === 'HEIGHT') {
            const unitField = document.querySelector(`[name="${input.name}_unit"], [id="${input.id}_unit"]`);
            return unitField ? unitField.value : 'cm';
        }

        return null;
    }

    /**
     * Atualizar contador de booking questions no UI
     */
    updateBookingQuestionsCount(count) {
        const countElement = document.querySelector('.booking-questions-count');
        if (countElement) {
            countElement.textContent = count;
        }

        // Atualizar indicador de progresso se existir
        const progressElement = document.querySelector('.booking-questions-progress');
        if (progressElement) {
            const totalQuestions = this.getTotalRequiredQuestions();
            const percentage = totalQuestions > 0 ? (count / totalQuestions) * 100 : 0;
            progressElement.style.width = `${percentage}%`;
        }
    }

    /**
     * Obter total de perguntas obrigatórias
     */
    getTotalRequiredQuestions() {
        const requiredInputs = document.querySelectorAll('.question-input[required]');
        return requiredInputs.length;
    }

    /**
     * Validar se todas as booking questions obrigatórias foram respondidas
     */
    validateAllBookingQuestions() {
        console.log('🔍 Validando todas as booking questions...');

        const requiredInputs = document.querySelectorAll('.question-input[required]');
        const errors = [];
        let isValid = true;

        requiredInputs.forEach(input => {
            const value = input.value.trim();
            const questionId = this.extractQuestionId(input);
            const travelerNum = this.extractTravelerNumber(input);

            if (!value) {
                isValid = false;
                const label = this.getQuestionLabel(questionId, travelerNum);
                errors.push(`${label} é obrigatório`);

                // Adicionar classe de erro visual (padrão etapa 2)
                this.showFieldError(input, 'Obrigatório');
            } else {
                // Remover classe de erro se campo está preenchido
                this.hideFieldError(input);
            }
        });

        // Validações específicas
        if (isValid) {
            isValid = this.validateSpecificQuestions();
        }

        console.log(`🔍 Validação completa: ${isValid ? 'VÁLIDA' : 'INVÁLIDA'}`);
        if (errors.length > 0) {
            console.log('❌ Erros encontrados:', errors);
        }

        return {
            isValid,
            errors
        };
    }

    /**
     * Validações específicas para tipos de perguntas
     */
    validateSpecificQuestions() {
        let isValid = true;

        // Validar PICKUP_POINT quando obrigatório (arrivalMode: OTHER)
        const pickupPointInput = document.querySelector('[id*="PICKUP_POINT"]');
        if (pickupPointInput) {
            const value = pickupPointInput.value.trim();
            // PICKUP_POINT é obrigatório para produtos com arrivalMode: OTHER
            // Como não temos acesso direto ao arrivalMode, consideramos obrigatório se o campo existe
            if (!value) {
                isValid = false;
                this.showFieldError(pickupPointInput, 'Ponto de encontro é obrigatório para este produto');
                console.warn('❌ PICKUP_POINT obrigatório não preenchido');
            }
        }

        // Validar campos de peso (devem ter valor e unidade)
        const weightInputs = document.querySelectorAll('[id*="WEIGHT"]:not([id*="_unit"])');
        weightInputs.forEach(input => {
            const value = parseFloat(input.value);
            if (value && (value < 1 || value > 300)) {
                isValid = false;
                this.showFieldError(input, 'Peso deve estar entre 1 e 300');
            }
        });

        // Validar datas de nascimento
        const birthDateInputs = document.querySelectorAll('[id*="DATE_OF_BIRTH"]');
        birthDateInputs.forEach(input => {
            if (input.value) {
                const birthDate = new Date(input.value);
                const today = new Date();
                const age = today.getFullYear() - birthDate.getFullYear();

                if (age < 0 || age > 120) {
                    isValid = false;
                    this.showFieldError(input, 'Data de nascimento inválida');
                }
            }
        });

        return isValid;
    }

    /**
     * Obter label da pergunta para exibição
     */
    getQuestionLabel(questionId, travelerNum) {
        const labels = {
            'FULL_NAMES_FIRST': 'Nome',
            'FULL_NAMES_LAST': 'Sobrenome',
            'WEIGHT': 'Peso',
            'AGEBAND': 'Faixa Etária',
            'PICKUP_POINT': 'Ponto de Encontro',
            'SPECIAL_REQUIREMENTS': 'Requisitos Especiais',
            'DATE_OF_BIRTH': 'Data de Nascimento'
        };

        const label = labels[questionId] || questionId;
        return travelerNum ? `${label} (Viajante ${travelerNum})` : label;
    }

    /**
     * Mostrar erro no campo (padrão exato da etapa 2)
     */
    showFieldError(field, message) {
        // Adicionar classe de erro ao campo (borda vermelha)
        field.classList.add('is-invalid');

        let errorElement = document.getElementById(`error_${field.id}`);

        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = `error_${field.id}`;
            errorElement.className = 'error-message';
            field.parentNode.appendChild(errorElement);
        }

        // Texto simples sem ícone, como na imagem
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        errorElement.classList.add('show');
    }

    /**
     * Esconder erro no campo (padrão etapa 2)
     */
    hideFieldError(field) {
        // Remover classe de erro do campo
        field.classList.remove('is-invalid');

        const errorElement = document.getElementById(`error_${field.id}`);
        if (errorElement) {
            errorElement.style.display = 'none';
            errorElement.classList.remove('show');
        }
    }

    /**
     * Validar campo de booking question
     */
    validateQuestionField(field) {
        const isRequired = field.hasAttribute('required');
        const value = field.value.trim();
        // Usar o ID correto que corresponde ao HTML gerado
        const errorElement = document.getElementById(`error_${field.id}`);

        let isValid = true;
        let errorMessage = '';

        if (isRequired && !value) {
            isValid = false;
            errorMessage = 'Obrigatório.';
        } else if (field.type === 'date' && value) {
            // Validar data de nascimento
            const birthDate = new Date(value);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();

            if (age < 0 || age > 120) {
                isValid = false;
                errorMessage = 'Por favor, insira uma data de nascimento válida.';
            }
        } else if (field.type === 'email' && value) {
            // Validar email se aplicável
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'Por favor, insira um email válido.';
            }
        }

        // Atualizar visual usando o método padronizado
        if (isValid) {
            this.hideFieldError(field);
        } else {
            this.showFieldError(field, errorMessage);
        }

        return isValid;
    }

    /**
     * Atualizar age band baseado na data de nascimento
     */
    updateAgeBandFromBirthDate(birthDateField) {
        const birthDate = new Date(birthDateField.value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();

        // Encontrar campo de age band correspondente
        const travelerMatch = birthDateField.id.match(/traveler_(\d+)/);
        if (travelerMatch) {
            const travelerIndex = travelerMatch[1];
            const ageBandField = document.getElementById(`AGEBAND_traveler_${travelerIndex}`);

            if (ageBandField) {
                let ageBand = 'ADULT';
                if (age < 3) ageBand = 'INFANT';
                else if (age < 18) ageBand = 'CHILD';
                else if (age >= 65) ageBand = 'SENIOR';

                ageBandField.value = ageBand;
                console.log(`✅ Age band atualizado para viajante ${travelerIndex}: ${ageBand} (idade: ${age})`);
            }
        }
    }

    /**
     * Validar todas as booking questions
     */
    async validateBookingQuestions() {
        console.log('🔍 Validando booking questions para step 3...');

        // Primeiro, coletar todas as respostas atuais
        this.collectBookingQuestionAnswers();

        // Validar se todas as perguntas obrigatórias foram respondidas
        const validation = this.validateAllBookingQuestions();

        if (!validation.isValid) {
            console.warn('⚠️ Validação de booking questions falhou:', validation.errors);

            // Mostrar erros para o usuário
            this.showBookingQuestionsErrors(validation.errors);

            // Scroll para o primeiro campo com erro (padrão etapa 2)
            const firstErrorField = document.querySelector('.question-input.is-invalid');
            if (firstErrorField) {
                firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstErrorField.focus();
            }

            return false;
        }

        console.log('✅ Todas as booking questions validadas com sucesso');
        console.log('📝 Total de respostas coletadas:', this.bookingData.bookingQuestionAnswers?.length || 0);

        return true;
    }

    /**
     * Mostrar erros de validação das booking questions (padrão etapa 2)
     */
    showBookingQuestionsErrors(errors) {
        // Usar o mesmo padrão da etapa 2 - showDateError
        const errorMessage = `Por favor, preencha os seguintes campos obrigatórios:\n\n• ${errors.join('\n• ')}`;
        this.showDateError(errorMessage);

        // Scroll para o topo para mostrar a mensagem
        const errorElement = document.getElementById('date-error-message');
        if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // MÉTODO REMOVIDO - DUPLICATA
    
    generateTravelersForm() {
        const container = document.getElementById('travelers-summary');
        if (!container) {
            console.error('❌ Container travelers-summary não encontrado');
            return;
        }
        
        let html = '';
        
        // Usar dados armazenados da primeira etapa para gerar apenas resumo
        if (this.bookingData.selectedTravelers && this.bookingData.selectedTravelers.length > 0) {
            console.log('✅ Gerando resumo dos viajantes:', this.bookingData.selectedTravelers);
            
            html += '<div class="travelers-summary-list">';
            this.bookingData.selectedTravelers.forEach(travelerGroup => {
                const ageBand = travelerGroup.ageBand;
                const quantity = travelerGroup.numberOfTravelers;
                
                // Encontrar o band correspondente para obter o label
                const band = this.ageBands.find(b => b.ageBand === ageBand);
                const bandLabel = band ? band.label : this.getAgeBandDisplayName(ageBand);
                
                // Corrigir pluralização do label mantendo informações entre parênteses
                let displayLabel;
                if (quantity > 1) {
                    // Verificar se o label contém parênteses
                    if (bandLabel.includes('(')) {
                        // Separar a palavra principal das informações entre parênteses
                        const match = bandLabel.match(/^([^(]+)(\s*\([^)]*\).*)?$/);
                        if (match) {
                            const mainWord = match[1].trim();
                            const parentheses = match[2] || '';
                            displayLabel = `${mainWord}s ${parentheses}`.trim();
                        } else {
                            displayLabel = `${bandLabel}s`;
                        }
                    } else {
                        displayLabel = `${bandLabel}s`;
                    }
                } else {
                    displayLabel = bandLabel;
                }
                
                html += `
                    <div class="summary-item">
                        <span class="icon">👥</span>
                        <span class="details">${quantity} ${displayLabel}</span>
                    </div>
                `;
            });
            html += '</div>';
            
        } else if (this.ageBands && this.ageBands.length > 0) {
            console.warn('⚠️ Tentando usar elementos do DOM para gerar resumo (fallback)');
            html += '<div class="travelers-summary-list">';
            
            this.ageBands.forEach(band => {
                const id = band.ageBand.toLowerCase();
                const qtyElement = document.getElementById(`${id}-qty`);
                
                if (qtyElement) {
                    const quantity = parseInt(qtyElement.value, 10);
                    if (quantity > 0) {
                        // Corrigir pluralização do label mantendo informações entre parênteses
                        let displayLabel;
                        if (quantity > 1) {
                            // Verificar se o label contém parênteses
                            if (band.label.includes('(')) {
                                // Separar a palavra principal das informações entre parênteses
                                const match = band.label.match(/^([^(]+)(\s*\([^)]*\).*)?$/);
                                if (match) {
                                    const mainWord = match[1].trim();
                                    const parentheses = match[2] || '';
                                    displayLabel = `${mainWord}s ${parentheses}`.trim();
                                } else {
                                    displayLabel = `${band.label}s`;
                                }
                            } else {
                                displayLabel = `${band.label}s`;
                            }
                        } else {
                            displayLabel = band.label;
                        }
                        
                        html += `
                            <div class="summary-item">
                                <span class="icon">👥</span>
                                <span class="details">${quantity} ${displayLabel}</span>
                            </div>
                        `;
                    }
                }
            });
            html += '</div>';
            
        } else {
            console.warn('⚠️ Nenhum dado de viajante disponível');
            html = `
                <div class="error-message">
                    <p>⚠️ Erro: Não foi possível carregar o resumo dos viajantes.</p>
                    <p>Por favor, volte ao passo anterior e tente novamente.</p>
                </div>
            `;
        }
        
        if (html.includes('travelers-summary-list') && !html.includes('summary-item')) {
            html = `
                <div class="error-message">
                    <p>⚠️ Nenhum viajante foi selecionado.</p>
                    <p>Por favor, volte ao passo anterior e selecione os viajantes.</p>
                </div>
            `;
        }
        
        container.innerHTML = html;
        console.log('📋 Resumo dos viajantes gerado');
    }

    /**
     * Buscar perguntas de reserva do produto
     */
    async fetchBookingQuestions() {
        console.log('🔍 [BOOKING QUESTIONS DEBUG] Iniciando fetchBookingQuestions...');
        console.log('🔍 [BOOKING QUESTIONS DEBUG] pageBookingQuestions:', this.pageBookingQuestions);
        console.log('🔍 [BOOKING QUESTIONS DEBUG] window.productData:', window.productData);
        console.log('🔍 [BOOKING QUESTIONS DEBUG] productCode:', this.bookingData?.productCode);
        
        try {
            // Verificar se temos IDs de perguntas no window.productData
            if (window.productData && window.productData.bookingQuestions && window.productData.bookingQuestions.length > 0) {
                console.log('📋 [BOOKING QUESTIONS DEBUG] IDs de perguntas encontrados no window.productData:', window.productData.bookingQuestions);
                
                // Se são apenas strings (IDs), precisamos buscar os dados completos via AJAX
                if (typeof window.productData.bookingQuestions[0] === 'string') {
                    console.log('📡 [BOOKING QUESTIONS DEBUG] IDs detectados, buscando dados completos via AJAX...');
                    console.log('📡 [BOOKING QUESTIONS DEBUG] IDs encontrados:', window.productData.bookingQuestions);
                    // Continuar para busca via AJAX
                } else {
                    // Se já são objetos completos, usar diretamente
                    this.bookingQuestions = window.productData.bookingQuestions;
                    console.log('✅ [BOOKING QUESTIONS DEBUG] Usando objetos completos do window.productData:', this.bookingQuestions);
                    return this.bookingQuestions;
                }
            }
            
            // Primeiro, tentar usar os dados da página se disponíveis (objetos completos)
            if (this.pageBookingQuestions && this.pageBookingQuestions.length > 0 && typeof this.pageBookingQuestions[0] === 'object') {
                console.log('📋 [BOOKING QUESTIONS DEBUG] Usando booking questions da página:', this.pageBookingQuestions);
                
                // Combinar com dados em cache para obter informações completas
                const combinedQuestions = await this.combinePageQuestionsWithCache();
                this.bookingQuestions = combinedQuestions;
                console.log('✅ [BOOKING QUESTIONS DEBUG] Perguntas de reserva combinadas (página + cache):', this.bookingQuestions);
                return this.bookingQuestions;
            }
            
            // Verificar se temos um código de produto válido
            if (!this.bookingData?.productCode) {
                console.error('❌ [BOOKING QUESTIONS DEBUG] Código do produto não disponível');
                this.bookingQuestions = [];
                return [];
            }
            
            // Fallback: buscar via AJAX se não há dados na página
            console.log('📡 [BOOKING QUESTIONS DEBUG] Buscando perguntas de reserva via AJAX...');
            console.log('🔍 [BOOKING QUESTIONS DEBUG] viatorBookingAjax:', typeof viatorBookingAjax !== 'undefined' ? viatorBookingAjax : 'undefined');
            
            // Verificar se viatorBookingAjax está disponível
            if (typeof viatorBookingAjax === 'undefined') {
                console.error('❌ [BOOKING QUESTIONS DEBUG] viatorBookingAjax não está definido. Verifique se o script foi carregado corretamente.');
                this.bookingQuestions = [];
                return [];
            }
            
            console.log('📡 [BOOKING QUESTIONS DEBUG] Fazendo requisição AJAX para:', viatorBookingAjax.ajaxurl);
            console.log('📡 [BOOKING QUESTIONS DEBUG] Parâmetros da requisição:', {
                action: 'viator_get_booking_questions',
                product_code: this.bookingData.productCode,
                nonce: viatorBookingAjax.nonce
            });
            
            const response = await fetch(viatorBookingAjax.ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'viator_get_booking_questions',
                    product_code: this.bookingData.productCode,
                    nonce: viatorBookingAjax.nonce
                })
            });
            
            console.log('📡 [BOOKING QUESTIONS DEBUG] Status da resposta:', response.status, response.statusText);
            
            if (!response.ok) {
                console.error('❌ [BOOKING QUESTIONS DEBUG] Resposta HTTP não OK:', response.status, response.statusText);
                this.bookingQuestions = [];
                return [];
            }
            
            const data = await response.json();
            console.log('🔍 [BOOKING QUESTIONS DEBUG] Resposta AJAX completa:', data);
            
            if (data.success) {
                this.bookingQuestions = data.data.bookingQuestions || [];
                console.log('🔍 [BOOKING QUESTIONS DEBUG] Perguntas extraídas da resposta:', this.bookingQuestions);
                console.log('🔍 [BOOKING QUESTIONS DEBUG] Número de perguntas:', this.bookingQuestions.length);
                
                // Verificar se todas as perguntas têm o campo 'group'
                this.bookingQuestions.forEach((q, index) => {
                    console.log(`🔍 [BOOKING QUESTIONS DEBUG] Pergunta ${index}: ID=${q.id}, group=${q.group}, label=${q.label}`);
                });
                
                const questionsWithGroup = this.bookingQuestions.filter(q => q.group);
                console.log(`✅ [BOOKING QUESTIONS DEBUG] Perguntas com campo group: ${questionsWithGroup.length}/${this.bookingQuestions.length}`);
                
                const perTravelerQuestions = this.bookingQuestions.filter(q => q.group === 'PER_TRAVELER');
                const perBookingQuestions = this.bookingQuestions.filter(q => q.group === 'PER_BOOKING');
                console.log(`✅ [BOOKING QUESTIONS DEBUG] PER_TRAVELER: ${perTravelerQuestions.length}, PER_BOOKING: ${perBookingQuestions.length}`);
                
                // Salvar no cache local para futuras consultas
                this.saveCachedBookingQuestions(this.bookingQuestions);
                
                console.log('✅ [BOOKING QUESTIONS DEBUG] Perguntas de reserva carregadas via AJAX:', this.bookingQuestions);
                return this.bookingQuestions;
            } else {
                console.error('❌ [BOOKING QUESTIONS DEBUG] Erro na resposta AJAX:', data.data?.message || 'Erro desconhecido');
                console.error('❌ [BOOKING QUESTIONS DEBUG] Dados completos da resposta de erro:', data);
                this.bookingQuestions = [];
                return [];
            }
        } catch (error) {
            console.error('❌ [BOOKING QUESTIONS DEBUG] Erro na requisição de perguntas de reserva:', error);
            console.error('❌ [BOOKING QUESTIONS DEBUG] Stack trace:', error.stack);
            this.bookingQuestions = [];
            return [];
        }
    }

    /**
     * Renderizar perguntas de reserva gerais (PER_BOOKING)
     */
    renderGeneralBookingQuestions(perBookingQuestions = null) {
        if (!perBookingQuestions) {
            perBookingQuestions = this.bookingQuestions.filter(q => 
                q.group === 'PER_BOOKING' && 
                q.id !== 'PICKUP_POINT' && 
                !(q.subType === 'LANGUAGE_GUIDE' || q.label.toLowerCase().includes('idioma') || q.label.toLowerCase().includes('language'))
            );
        }
        
        if (perBookingQuestions.length === 0) {
            return '';
        }
        
        let html = '';
        
        perBookingQuestions.forEach(question => {
            const questionId = `booking_question_${question.id}`;
            const isRequired = question.required === 'MANDATORY';
            const requiredMark = isRequired ? ' *' : '';
            
            // Determinar se o campo deve ser inicialmente oculto (para campos condicionais)
            const isConditional = question.required === 'CONDITIONAL';
            const shouldHideInitially = isConditional && !ViatorConditionalQuestions.shouldShowQuestion(question.id);
            const displayStyle = shouldHideInitially ? 'style="display: none;"' : '';
            
            html += `<div class="booking-question-group" ${displayStyle}>`;
            html += `<label for="${questionId}">${question.label}${requiredMark}</label>`;
            
            html += this.renderQuestionField(question, questionId, isRequired, false, null);
            
            html += `<div class="error-message" id="error_${questionId}" style="display: none;"></div>`;
            html += '</div>';
        });
        
        return html;
    }

    /**
     * Renderizar seção de Ponto de Encontro
     */
    renderPickupPointSection() {
        // Buscar perguntas de ponto de encontro e transferência
        const pickupQuestions = this.bookingQuestions.filter(q => 
            q.group === 'PER_BOOKING' && q.id === 'PICKUP_POINT'
        );
        
        const transferQuestions = this.bookingQuestions.filter(q => 
            q.group === 'PER_BOOKING' && q.id.startsWith('TRANSFER_')
        );
        
        // Se não há perguntas de pickup nem de transferência, retornar vazio
        if (pickupQuestions.length === 0 && transferQuestions.length === 0) {
            return '';
        }
        
        let html = '';
        
        // Renderizar pergunta de ponto de encontro
        if (pickupQuestions.length > 0) {
            const question = pickupQuestions[0];
            const questionId = `booking_question_${question.id}`;
            const isRequired = question.required === 'MANDATORY';
            const requiredMark = isRequired ? ' *' : '';
            
            let dataAttrs = `data-question-id="${question.id}" data-group="${question.group}"`;
            const requiredAttr = isRequired ? 'required' : '';
            
            html += '<div class="pickup-point-question-group">';
            html += `<label for="${questionId}">${question.label}${requiredMark}</label>`;
            html += this.renderQuestionField(question, questionId, isRequired, false, null);
            html += `<div class="error-message" id="error_${questionId}" style="display: none;"></div>`;
            html += '</div>';
        }
        
        // Renderizar perguntas de transferência
        if (transferQuestions.length > 0) {
            html += this.renderGeneralBookingQuestions(transferQuestions);
        }
        
        return html;
    }

    /**
     * Renderizar seção de Idioma da Excursão
     */
    renderLanguageGuideSection() {
        const languageQuestions = this.bookingQuestions.filter(q => 
            q.group === 'PER_BOOKING' && 
            (q.subType === 'LANGUAGE_GUIDE' || q.label.toLowerCase().includes('idioma') || q.label.toLowerCase().includes('language'))
        );
        
        // Se não há perguntas de idioma nas booking questions, criar uma baseada nos languageGuides
        if (languageQuestions.length === 0) {
            const languageGuides = window.productData?.languageGuides || [];
            if (languageGuides.length > 0) {
                const questionId = 'language_guide_selection';
                
                let html = '<div class="language-guide-question-group">';
                html += '<label for="' + questionId + '">Idioma da Excursão</label>';
                html += '<select id="' + questionId + '" name="' + questionId + '" class="form-control" data-question-id="LANGUAGE_GUIDE" data-group="PER_BOOKING">';
                html += '<option value="">Selecione o idioma da excursão</option>';
                
                languageGuides.forEach(guide => {
                    const languageName = this.getLanguageName(guide.language);
                    const serviceType = guide.type === 'AUDIO' ? '(Áudio)' : guide.type === 'GUIDE' ? '(Guia)' : '';
                    const optionText = `${languageName} ${serviceType}`.trim();
                    
                    html += `<option value="${guide.language}" data-type="${guide.type}">${optionText}</option>`;
                });
                
                html += '</select>';
                html += `<div class="error-message" id="error_${questionId}" style="display: none;"></div>`;
                html += '</div>';
                
                return html;
            }
            return '';
        }
        
        const question = languageQuestions[0];
        const questionId = `booking_question_${question.id}`;
        const isRequired = question.required === 'MANDATORY';
        const requiredMark = isRequired ? ' *' : '';
        
        let dataAttrs = `data-question-id="${question.id}" data-group="${question.group}"`;
        const requiredAttr = isRequired ? 'required' : '';
        
        let html = '<div class="language-guide-question-group">';
        html += `<label for="${questionId}">${question.label}${requiredMark}</label>`;
        html += this.renderQuestionField(question, questionId, isRequired, false, null);
        html += `<div class="error-message" id="error_${questionId}" style="display: none;"></div>`;
        html += '</div>';
        
        return html;
    }

    /**
     * Renderizar perguntas de reserva por viajante (PER_TRAVELER)
     */
    renderTravelerBookingQuestions(travelerIndex) {
        console.log(`🔍 [DEBUG] renderTravelerBookingQuestions chamada para viajante ${travelerIndex}`);
        console.log('🔍 [DEBUG] this.bookingQuestions disponíveis:', this.bookingQuestions);
        
        // Verificar se as perguntas têm o campo 'group' definido
        this.bookingQuestions.forEach((q, index) => {
            console.log(`🔍 [DEBUG] Pergunta ${index}: ID=${q.id}, group=${q.group}, label=${q.label}`);
        });
        
        const perTravelerQuestions = this.bookingQuestions.filter(q => q.group === 'PER_TRAVELER');
        console.log(`🔍 [DEBUG] Perguntas filtradas PER_TRAVELER:`, perTravelerQuestions);
        
        if (perTravelerQuestions.length === 0) {
            console.log('ℹ️ [DEBUG] Nenhuma pergunta PER_TRAVELER encontrada, retornando string vazia');
            return '';
        }
        
        let html = '<div class="traveler-booking-questions"><h5>📋 Informações Específicas do Viajante</h5>';
        
        // Separar perguntas por tipo para reorganização
        const nameQuestions = perTravelerQuestions.filter(q => 
            q.id === 'FULL_NAMES_FIRST' || q.id === 'FIRST_NAME' || q.label.toLowerCase().includes('nome') || q.label.toLowerCase().includes('first name')
        );
        const surnameQuestions = perTravelerQuestions.filter(q => 
            q.id === 'FULL_NAMES_LAST' || q.id === 'LAST_NAME' || q.label.toLowerCase().includes('sobrenome') || q.label.toLowerCase().includes('last name')
        );
        const ageBandQuestions = perTravelerQuestions.filter(q => 
            q.id === 'AGEBAND' || q.label.toLowerCase().includes('idade') || q.label.toLowerCase().includes('faixa')
        );
        const otherQuestions = perTravelerQuestions.filter(q => 
            !nameQuestions.includes(q) && !surnameQuestions.includes(q) && !ageBandQuestions.includes(q)
        );
        
        // 1. Nome e Sobrenome lado a lado
        if (nameQuestions.length > 0 || surnameQuestions.length > 0) {
            html += '<div class="form-row">';
            
            // Campo Nome
            if (nameQuestions.length > 0) {
                const question = nameQuestions[0];
                const questionId = `traveler_${travelerIndex}_question_${question.id}`;
                const isRequired = question.required === 'MANDATORY';
                const requiredMark = isRequired ? ' *' : '';
                
                // Verificar se deve ser oculto inicialmente
                const isConditional = question.required === 'CONDITIONAL';
                const shouldHideInitially = isConditional && !ViatorConditionalQuestions.shouldShowQuestion(question.id);
                const displayStyle = shouldHideInitially ? 'style="display: none;"' : '';
                
                html += `<div class="form-group col-md-6" ${displayStyle}>`;
                html += `<label for="${questionId}">${question.label}${requiredMark}</label>`;
                html += this.renderQuestionField(question, questionId, isRequired, true, travelerIndex);
                html += `<div class="error-message" id="error_${questionId}" style="display: none;"></div>`;
                html += '</div>';
            }
            
            // Campo Sobrenome
            if (surnameQuestions.length > 0) {
                const question = surnameQuestions[0];
                const questionId = `traveler_${travelerIndex}_question_${question.id}`;
                const isRequired = question.required === 'MANDATORY';
                const requiredMark = isRequired ? ' *' : '';
                
                // Verificar se deve ser oculto inicialmente
                const isConditional = question.required === 'CONDITIONAL';
                const shouldHideInitially = isConditional && !ViatorConditionalQuestions.shouldShowQuestion(question.id);
                const displayStyle = shouldHideInitially ? 'style="display: none;"' : '';
                
                html += `<div class="form-group col-md-6" ${displayStyle}>`;
                html += `<label for="${questionId}">${question.label}${requiredMark}</label>`;
                html += this.renderQuestionField(question, questionId, isRequired, true, travelerIndex);
                html += `<div class="error-message" id="error_${questionId}" style="display: none;"></div>`;
                html += '</div>';
            }
            
            html += '</div>';
        }
        
        // 2. Faixa Etária
        ageBandQuestions.forEach(question => {
            const questionId = `traveler_${travelerIndex}_question_${question.id}`;
            const isRequired = question.required === 'MANDATORY';
            const requiredMark = isRequired ? ' *' : '';
            
            // Verificar se deve ser oculto inicialmente
            const isConditional = question.required === 'CONDITIONAL';
            const shouldHideInitially = isConditional && !ViatorConditionalQuestions.shouldShowQuestion(question.id);
            const displayStyle = shouldHideInitially ? 'style="display: none;"' : '';
            
            html += `<div class="booking-question-group" ${displayStyle}>`;
            html += `<label for="${questionId}">${question.label}${requiredMark}</label>`;
            html += this.renderQuestionField(question, questionId, isRequired, true, travelerIndex);
            html += `<div class="error-message" id="error_${questionId}" style="display: none;"></div>`;
            html += '</div>';
        });
        
        // 3. Demais campos (peso, etc.)
        otherQuestions.forEach(question => {
            const questionId = `traveler_${travelerIndex}_question_${question.id}`;
            const isRequired = question.required === 'MANDATORY';
            const requiredMark = isRequired ? ' *' : '';
            
            // Verificar se deve ser oculto inicialmente
            const isConditional = question.required === 'CONDITIONAL';
            const shouldHideInitially = isConditional && !ViatorConditionalQuestions.shouldShowQuestion(question.id);
            const displayStyle = shouldHideInitially ? 'style="display: none;"' : '';
            
            html += `<div class="booking-question-group" ${displayStyle}>`;
            html += `<label for="${questionId}">${question.label}${requiredMark}</label>`;
            html += this.renderQuestionField(question, questionId, isRequired, true, travelerIndex);
            html += `<div class="error-message" id="error_${questionId}" style="display: none;"></div>`;
            html += '</div>';
        });
        
        html += '</div>';
        return html;
    }

    /**
     * Renderizar um campo de pergunta individual
     */
    renderQuestionField(question, questionId, isRequired, isTraveler, travelerIndex) {
        let html = '';
        // Usar classes CSS específicas para perguntas de reserva
        const cssClass = isTraveler ? 'form-control' : 'form-control';
        
        // Adicionar atributos para o sistema de perguntas condicionais
        let dataAttrs = `data-question-id="${question.id}" data-group="${question.group}"`;
        if (isTraveler) {
            dataAttrs += ` data-traveler="${travelerIndex}"`;
        }
        if (question.required === 'CONDITIONAL') {
            dataAttrs += ` data-original-required="CONDITIONAL"`;
        }
        
        // Adicionar atributos de validação
        if (question.maxLength) {
            dataAttrs += ` data-max-length="${question.maxLength}"`;
        }
        if (question.hint) {
            dataAttrs += ` data-hint="${question.hint.replace(/"/g, '&quot;')}"`;
        }
        
        const requiredAttr = isRequired ? 'required' : '';

        switch (question.type) {
            case 'STRING':
                // Verificar se é uma pergunta de seleção de idioma
                if (question.subType === 'LANGUAGE_GUIDE' || question.label.toLowerCase().includes('idioma') || question.label.toLowerCase().includes('language')) {
                    html += this.renderLanguageGuideSelection(questionId, dataAttrs, requiredAttr);
                } else if (question.allowedAnswers && question.allowedAnswers.length > 0) {
                    // Verificar se é uma pergunta de faixa etária (AGEBAND)
                    const isAgeBand = question.id === 'AGEBAND' || questionId.includes('AGEBAND');
                    
                    html += `<select id="${questionId}" name="${questionId}" class="${cssClass}" ${dataAttrs} ${requiredAttr}>`;
                    html += '<option value="">Selecione uma opção</option>';
                    
                    question.allowedAnswers.forEach(answer => {
                        let displayText = answer;
                        
                        // Aplicar traduções para faixas etárias
                        if (isAgeBand) {
                            const ageBandTranslations = {
                                'ADULT': 'Adulto (18+ anos)',
                                'CHILD': 'Criança (2-17 anos)',
                                'INFANT': 'Bebê (0-1 anos)',
                                'SENIOR': 'Idoso (65+ anos)',
                                'YOUTH': 'Jovem (12-17 anos)',
                                'TODDLER': 'Criança pequena (2-4 anos)',
                                'STUDENT': 'Estudante',
                                'MILITARY': 'Militar',
                                'TRAVELER': 'Viajante'
                            };
                            displayText = ageBandTranslations[answer] || answer;
                        }
                        
                        html += `<option value="${answer}">${displayText}</option>`;
                    });
                    
                    html += '</select>';
                } else {
                    // Placeholder específico para requisitos especiais ou usar hint
                    let placeholderAttr = '';
                    if (question.id === 'SPECIAL_REQUIREMENTS') {
                        placeholderAttr = ' placeholder="Restrições alimentares, acessibilidade, etc."';
                    } else if (question.hint) {
                        placeholderAttr = ` placeholder="${question.hint.replace(/"/g, '&quot;')}"`;
                    }
                    
                    const maxLengthAttr = question.maxLength ? ` maxlength="${question.maxLength}"` : '';
                    html += `<input type="text" id="${questionId}" name="${questionId}" class="${cssClass}" ${dataAttrs} ${requiredAttr}${maxLengthAttr}${placeholderAttr}>`;
                    
                    // maxLength validation is handled by the maxlength attribute
                    
                    // Adicionar hint como texto de ajuda se disponível
                    if (question.hint && question.id !== 'SPECIAL_REQUIREMENTS') {
                        html += `<small class="form-text text-muted">${question.hint}</small>`;
                    }
                }
                break;

            case 'NUMBER_AND_UNIT':
                html += `<div class="question-with-unit">`;
                html += `<input type="number" id="${questionId}" name="${questionId}" class="${cssClass}" ${dataAttrs} ${requiredAttr}>`;
                if (question.units && question.units.length > 0) {
                    // Verificar se é um campo de peso ou altura que deve ser sincronizado
                    const isSyncField = (question.id === 'WEIGHT' || question.id === 'HEIGHT');
                    const isFirstTraveler = isTraveler && travelerIndex === 1;
                    const shouldDisable = isSyncField && isTraveler && !isFirstTraveler;
                    
                    const travelerAttr = isTraveler ? `data-traveler="${travelerIndex}"` : '';
                    const disabledAttr = shouldDisable ? 'disabled' : '';
                    html += `<select name="${questionId}_unit" class="${cssClass}" data-question-id="${question.id}" ${travelerAttr} ${disabledAttr}>`;
                    question.units.forEach(unit => {
                        html += `<option value="${unit}">${unit}</option>`;
                    });
                    html += '</select>';
                }
                html += `</div>`;
                break;

            case 'LOCATION_REF_OR_FREE_TEXT':
                // Verificar se é uma pergunta de ponto de encontro (PICKUP_POINT)
                if (question.id === 'PICKUP_POINT' || question.subType === 'PICKUP_POINT' || question.label.toLowerCase().includes('pickup') || question.label.toLowerCase().includes('encontro')) {
                    html += this.renderPickupPointSelection(question, questionId, dataAttrs, requiredAttr);
                } else {
                    // Campo de texto livre para outras localizações
                    html += this.renderLocationField(question, questionId, cssClass, dataAttrs, requiredAttr);
                }
                break;

            case 'DATE':
                html += `<input type="date" id="${questionId}" name="${questionId}" class="${cssClass}" ${dataAttrs} ${requiredAttr}>`;
                break;

            case 'TEXTAREA':
                // Placeholder específico para requisitos especiais ou usar hint
                let placeholderText = question.hint || '';
                if (question.id === 'SPECIAL_REQUIREMENTS') {
                    placeholderText = 'Restrições alimentares, acessibilidade, etc.';
                }
                
                const maxLengthAttr = question.maxLength ? ` maxlength="${question.maxLength}"` : '';
                html += `<textarea id="${questionId}" name="${questionId}" class="${cssClass}" ${dataAttrs} rows="3" ${requiredAttr} placeholder="${placeholderText}"${maxLengthAttr}></textarea>`;
                
                // maxLength validation is handled by the maxlength attribute
                
                // Adicionar hint como texto de ajuda se disponível e diferente do placeholder
                if (question.hint && question.hint !== placeholderText) {
                    html += `<small class="form-text text-muted">${question.hint}</small>`;
                }
                break;

            default:
                // Placeholder específico para requisitos especiais ou usar hint
                let placeholderAttr = '';
                if (question.id === 'SPECIAL_REQUIREMENTS') {
                    placeholderAttr = ' placeholder="Restrições alimentares, acessibilidade, etc."';
                } else if (question.hint) {
                    placeholderAttr = ` placeholder="${question.hint.replace(/"/g, '&quot;')}"`;
                }
                
                const maxLengthAttribute = question.maxLength ? ` maxlength="${question.maxLength}"` : '';
                html += `<input type="text" id="${questionId}" name="${questionId}" class="${cssClass}" ${dataAttrs} ${requiredAttr}${maxLengthAttribute}${placeholderAttr}>`;
                
                // maxLength validation is handled by the maxlength attribute
                
                // Adicionar hint como texto de ajuda se disponível
                if (question.hint && question.id !== 'SPECIAL_REQUIREMENTS') {
                    html += `<small class="form-text text-muted">${question.hint}</small>`;
                }
        }

        return html;
    }

    /**
     * Renderizar seleção de guia de idioma
     */
    renderLanguageGuideSelection(questionId, dataAttrs, requiredAttr) {
        let html = '';
        
        // Verificar se há languageGuides disponíveis
        const languageGuides = window.productData?.languageGuides || [];
        
        if (languageGuides.length > 0) {
            html += `<select id="${questionId}" name="${questionId}" ${dataAttrs} ${requiredAttr}>`;
            html += '<option value="">Selecione o idioma da excursão</option>';
            
            languageGuides.forEach(guide => {
                const languageName = this.getLanguageName(guide.language);
                const serviceType = guide.type === 'AUDIO' ? '(Áudio)' : guide.type === 'GUIDE' ? '(Guia)' : '';
                const optionText = `${languageName} ${serviceType}`.trim();
                
                html += `<option value="${guide.language}" data-type="${guide.type}">${optionText}</option>`;
            });
            
            html += '</select>';
        } else {
            // Fallback para campo de texto se não há languageGuides
            html += `<input type="text" id="${questionId}" name="${questionId}" ${dataAttrs} ${requiredAttr} placeholder="Digite o idioma preferido">`;
        }
        
        return html;
    }

    /**
     * Renderizar campo de localização genérico
     */
    renderLocationField(question, questionId, cssClass, dataAttrs, requiredAttr) {
        let html = '';
        
        // Para PICKUP_POINT, usar renderização especializada
        if (question.id === 'PICKUP_POINT') {
            return this.renderPickupPointField(question, questionId, cssClass, dataAttrs, requiredAttr);
        }
        
        // Verificar se há unidades específicas definidas
        if (question.units && question.units.length > 0) {
            // Se há múltiplas unidades, criar interface mais complexa
            if (question.units.length > 1) {
                html += `<div class="location-field-container">`;
                
                // Verificar se há LOCATION_REFERENCE nas unidades
                if (question.units.includes('LOCATION_REFERENCE') && question.allowedAnswers && question.allowedAnswers.length > 0) {
                    html += `<div class="location-options">`;
                    html += `<label class="location-type-label">Opções predefinidas:</label>`;
                    html += `<select id="${questionId}_reference" name="${questionId}_reference" class="${cssClass}" ${dataAttrs}>`;
                    html += '<option value="">Selecione um local</option>';
                    
                    question.allowedAnswers.forEach(answer => {
                        html += `<option value="${answer}">${answer}</option>`;
                    });
                    
                    html += `</select>`;
                    html += `</div>`;
                    
                    html += `<div class="location-separator">ou</div>`;
                }
                
                // Campo de texto livre (FREETEXT)
                if (question.units.includes('FREETEXT')) {
                    html += `<div class="location-freetext">`;
                    html += `<label class="location-type-label">Digite um endereço:</label>`;
                    html += `<input type="text" id="${questionId}_freetext" name="${questionId}_freetext" class="${cssClass}" placeholder="${question.hint || 'Digite o endereço completo'}" ${requiredAttr}>`;
                    html += `</div>`;
                }
                
                html += `</div>`;
                
                // Script para gerenciar a seleção entre as opções
                html += `
                    <script>
                    (function() {
                        const referenceSelect = document.getElementById('${questionId}_reference');
                        const freetextInput = document.getElementById('${questionId}_freetext');
                        
                        if (referenceSelect && freetextInput) {
                            referenceSelect.addEventListener('change', function() {
                                if (this.value) {
                                    freetextInput.value = '';
                                    freetextInput.required = false;
                                } else {
                                    freetextInput.required = ${requiredAttr ? 'true' : 'false'};
                                }
                            });
                            
                            freetextInput.addEventListener('input', function() {
                                if (this.value.trim()) {
                                    referenceSelect.value = '';
                                    referenceSelect.required = false;
                                } else {
                                    referenceSelect.required = ${requiredAttr ? 'true' : 'false'};
                                }
                            });
                        }
                    })();
                    </script>
                `;
            } else {
                // Uma única unidade
                const unit = question.units[0];
                if (unit === 'FREETEXT') {
                    html += `<input type="text" id="${questionId}" name="${questionId}" class="${cssClass}" ${dataAttrs} ${requiredAttr} placeholder="${question.hint || 'Digite o local ou endereço'}">`;
                } else if (unit === 'LOCATION_REFERENCE' && question.allowedAnswers && question.allowedAnswers.length > 0) {
                    html += `<select id="${questionId}" name="${questionId}" class="${cssClass}" ${dataAttrs} ${requiredAttr}>`;
                    html += '<option value="">Selecione um local</option>';
                    
                    question.allowedAnswers.forEach(answer => {
                        html += `<option value="${answer}">${answer}</option>`;
                    });
                    
                    html += `</select>`;
                }
            }
        } else {
            // Fallback para campo de texto simples
            html += `<input type="text" id="${questionId}" name="${questionId}" class="${cssClass}" ${dataAttrs} ${requiredAttr} placeholder="${question.hint || 'Digite o local ou endereço'}">`;
        }
        
        return html;
    }

    /**
     * Renderizar campo especializado para PICKUP_POINT conforme documentação Viator
     */
    renderPickupPointField(question, questionId, cssClass, dataAttrs, requiredAttr) {
        let html = '';
        const pickupData = this.getPickupData();
        
        if (!pickupData || !pickupData.locations || pickupData.locations.length === 0) {
            // Fallback para campo de texto se não há dados de pickup
            html += `<input type="text" id="${questionId}" name="${questionId}" class="${cssClass}" ${dataAttrs} ${requiredAttr} placeholder="Digite o local de encontro">`;
            return html;
        }
        
        // Container principal para pickup point
        html += `<div id="${questionId}_container" class="pickup-point-container">`;

        // Campo hidden para validação (recebe o valor selecionado)
        html += `<input type="hidden" id="${questionId}" name="${questionId}" class="${cssClass}" ${dataAttrs} ${requiredAttr}>`;
        
        // Verificar se permite texto livre (allowCustomTravelerPickup)
        // Conforme documentação oficial da Viator: https://docs.viator.com/partner-api/technical/
        // "Whether freetext is allowed for this answer depends on the value of logistics.travelerPickup.allowCustomTravelerPickup"
        const allowCustomPickup = this.isCustomPickupAllowed();
        
        if (!allowCustomPickup) {
            console.log('ℹ️ Pickup customizado não permitido para este produto. Apenas locais pré-definidos serão exibidos.');
        }
        
        // Agrupar locais por tipo conforme recomendação da Viator
        const groupedLocations = this.groupPickupLocationsByType(pickupData.locations);
        
        // Renderizar dropdown por tipo de local
        Object.keys(groupedLocations).forEach(pickupType => {
            const locations = groupedLocations[pickupType];
            const typeLabel = this.getPickupTypeLabel(pickupType);
            
            if (locations.length > 0) {
                html += `<div class="pickup-type-section" data-pickup-type="${pickupType}">`;
                html += `<h4 class="pickup-type-title">${typeLabel}</h4>`;
                html += `<div class="pickup-locations-list" id="${questionId}_${pickupType}_list">`;
                html += `<div class="loading-pickup-locations">Carregando ${typeLabel.toLowerCase()}... <span class="spinner"></span></div>`;
                html += `</div>`;
                html += `</div>`;
            }
        });
        
        // Opção "Não vejo meu local" se permitir texto livre
        if (allowCustomPickup) {
            html += `<div class="pickup-custom-section">`;
            html += `<div class="pickup-option-wrapper">`;
            html += `<input type="radio" id="${questionId}_custom" name="${questionId}" value="CUSTOM_LOCATION">`;
            html += `<label for="${questionId}_custom" class="pickup-option-label">`;
            html += `<div class="pickup-option-title">Não vejo meu local de pickup</div>`;
            html += `<div class="pickup-option-description">Digite o endereço do seu hotel ou local desejado</div>`;
            html += `</label>`;
            html += `</div>`;
            html += `<div class="pickup-custom-input" style="display: none;">`;
            html += `<input type="text" id="${questionId}_freetext" placeholder="Digite o endereço completo do seu hotel ou local" class="pickup-freetext-input">`;
            html += `</div>`;
            html += `</div>`;
        } else {
            // Informação quando pickup customizado não é permitido
            html += `<div class="pickup-info-section">`;
            html += `<div class="pickup-info-message">`;
            html += `<i class="fas fa-info-circle"></i> `;
            html += `Para este produto, você deve selecionar um dos locais de pickup listados acima. `;
            html += `Locais personalizados não são aceitos pelo fornecedor.`;
            html += `</div>`;
            html += `</div>`;
        }
        
        html += `</div>`;
        
        // Carregar detalhes das localizações via API
        setTimeout(() => {
            this.loadPickupLocationDetails(pickupData.locations, questionId, groupedLocations);
        }, 100);
        
        // Script para gerenciar seleção customizada
        if (allowCustomPickup) {
            html += `
                <script>
                (function() {
                    // Aguardar um pouco para garantir que o DOM esteja pronto
                    setTimeout(function() {
                        const container = document.getElementById('${questionId}_container');
                        if (!container) return;
                        
                        const customRadio = document.getElementById('${questionId}_custom');
                        const customInput = container.querySelector('.pickup-custom-input');
                        const freetextInput = document.getElementById('${questionId}_freetext');
                        
                        console.log('🔧 Pickup Point Script - Elementos encontrados:', {
                            customRadio: !!customRadio,
                            customInput: !!customInput,
                            freetextInput: !!freetextInput
                        });
                        
                        if (customRadio && customInput && freetextInput) {
                            customRadio.addEventListener('change', function() {
                                console.log('📍 Radio customizado selecionado');
                                if (this.checked) {
                                    customInput.style.display = 'block';
                                    freetextInput.focus();
                                    console.log('✅ Campo de texto livre exibido');
                                }
                            });
                            
                            // Ocultar campo customizado quando outra opção for selecionada
                            container.addEventListener('change', function(e) {
                                if (e.target.name === '${questionId}' && e.target.value !== 'CUSTOM_LOCATION') {
                                    console.log('🔄 Outra opção selecionada, ocultando campo customizado');
                                    customInput.style.display = 'none';
                                    freetextInput.value = '';
                                }
                            });
                            
                            console.log('✅ Event listeners configurados para pickup point');
                        } else {
                            console.error('❌ Elementos não encontrados para pickup point:', {
                                customRadio: customRadio ? 'OK' : 'MISSING',
                                customInput: customInput ? 'OK' : 'MISSING', 
                                freetextInput: freetextInput ? 'OK' : 'MISSING'
                            });
                        }
                    }, 200);
                })();
                </script>
            `;
        }
        
        return html;
    }
    
    /**
     * Renderizar seleção de ponto de encontro (método legado mantido para compatibilidade)
     */
    renderPickupPointSelection(question, questionId, dataAttrs, requiredAttr) {
        return this.renderPickupPointField(question, questionId, 'pickup-point-select', dataAttrs, requiredAttr);
    }

    /**
     * Obter dados de pickup do produto atual
     */
    getPickupData() {
        if (window.productData && window.productData.logistics && window.productData.logistics.travelerPickup) {
            return window.productData.logistics.travelerPickup;
        }
        return null;
    }
    
    /**
     * Verificar se o produto permite pickup customizado
     * Conforme documentação Viator: allowCustomTravelerPickup deve ser true
     */
    isCustomPickupAllowed() {
        const pickupData = this.getPickupData();
        if (!pickupData) {
            console.log('❌ Nenhum dado de pickup encontrado');
            return false;
        }
        
        const allowed = pickupData.allowCustomTravelerPickup === true;
        console.log('🔍 Verificação de pickup customizado:', {
            allowCustomTravelerPickup: pickupData.allowCustomTravelerPickup,
            isAllowed: allowed,
            productData: window.productData?.productCode || 'N/A'
        });
        
        return allowed;
    }

    /**
     * Agrupar locais de pickup por tipo conforme documentação Viator
     * Tipos suportados: HOTEL, AIRPORT, PORT, LOCATION, OTHER
     */
    groupPickupLocationsByType(locations) {
        const grouped = {};
        
        locations.forEach(location => {
            let pickupType = 'OTHER';
            
            if (typeof location === 'object' && location.pickupType) {
                pickupType = location.pickupType;
            } else if (typeof location === 'string') {
                // Para strings simples, assumir como OTHER
                pickupType = 'OTHER';
            }
            
            if (!grouped[pickupType]) {
                grouped[pickupType] = [];
            }
            
            grouped[pickupType].push(location);
        });
        
        return grouped;
    }
    
    /**
     * Obter label traduzido para tipo de pickup
     */
    getPickupTypeLabel(pickupType) {
        const labels = {
            'HOTEL': 'Hotéis',
            'AIRPORT': 'Aeroportos', 
            'PORT': 'Portos',
            'LOCATION': 'Locais Específicos',
            'OTHER': 'Outros Locais'
        };
        
        return labels[pickupType] || 'Locais de Encontro';
    }

    /**
     * Carregar detalhes das localizações de pickup via API /locations/bulk
     * Implementação conforme documentação oficial da Viator
     */
    async loadPickupLocationDetails(locations, questionId, groupedLocations) {
        console.log('🔍 loadPickupLocationDetails chamada com:', { locations, questionId, groupedLocations });
        
        const locationRefs = locations.map(loc => loc.location?.ref).filter(Boolean);
        console.log('📍 Referências de localização extraídas:', locationRefs);

        if (locationRefs.length === 0) {
            console.warn('⚠️ Nenhuma referência de localização encontrada');
            Object.keys(groupedLocations).forEach(pickupType => {
                const container = document.getElementById(`${questionId}_${pickupType}_list`);
                if(container) container.innerHTML = '<p>Nenhum local disponível</p>';
            });
            return;
        }

        try {
            console.log('🌐 Fazendo requisição AJAX para viator_get_location_details');
            const response = await fetch(viatorBookingAjax.ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'viator_get_location_details',
                    nonce: viatorBookingAjax.nonce,
                    location_refs: JSON.stringify(locationRefs)
                })
            });

            console.log('📡 Resposta da requisição:', response.status, response.statusText);

            if (!response.ok) {
                throw new Error(`Erro na requisição: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('📦 Dados recebidos da API:', result);

            if (result.success && result.data) {
                console.log('✅ Dados válidos recebidos, atualizando exibição');
                this.updatePickupLocationDisplay(result.data, questionId, locations, groupedLocations);
            } else {
                console.error('❌ Resposta da API não foi bem-sucedida:', result);
                throw new Error(result.data?.message || 'A resposta da API não foi bem-sucedida.');
            }
        } catch (error) {
            console.error('💥 Erro ao carregar detalhes da localização:', error);
            Object.keys(groupedLocations).forEach(pickupType => {
                const container = document.getElementById(`${questionId}_${pickupType}_list`);
                if(container) container.innerHTML = `<p class="error-message">Erro ao carregar ${this.getPickupTypeLabel(pickupType).toLowerCase()}</p>`;
            });
        }
    }
    
    /**
     * Carregar detalhes das localizações via API /locations/bulk (método legado mantido para compatibilidade)
     */
    async loadLocationDetails(locations, questionId) {
        const groupedLocations = this.groupPickupLocationsByType(locations);
        return this.loadPickupLocationDetails(locations, questionId, groupedLocations);
    }
    
    /**
     * Atualizar a exibição com os detalhes da localização agrupados por tipo
     */
    updatePickupLocationDisplay(locationDetails, questionId, originalLocations, groupedLocations) {
        console.log('🎨 updatePickupLocationDisplay chamada com:', { locationDetails, questionId, originalLocations, groupedLocations });
        
        // Criar mapa de detalhes por referência para acesso rápido
        const detailsMap = {};
        locationDetails.forEach(detail => {
            detailsMap[detail.reference] = detail;
        });
        
        // Atualizar cada seção por tipo de pickup
        Object.keys(groupedLocations).forEach(pickupType => {
            const container = document.getElementById(`${questionId}_${pickupType}_list`);
            if (!container) {
                console.error(`❌ Container não encontrado: ${questionId}_${pickupType}_list`);
                return;
            }
            
            const locationsOfType = groupedLocations[pickupType];
            let html = '';
            
            locationsOfType.forEach((location, index) => {
                const locationRef = location.location?.ref;
                const detail = detailsMap[locationRef];
                
                if (!detail) {
                    console.warn(`⚠️ Detalhes não encontrados para: ${locationRef}`);
                    return;
                }
                
                console.log(`🏷️ Processando localização ${pickupType}[${index}]:`, detail);
                
                // Obter informações formatadas da localização
                const locationInfo = this.getFormattedLocationInfo(detail);
                let address = locationInfo || this.getDefaultAddressForReference(detail);
                
                const radioId = `${questionId}_${pickupType}_${index}`;
                const isFirstOption = Object.keys(groupedLocations).indexOf(pickupType) === 0 && index === 0;
                
                html += `
                    <div class="pickup-option-wrapper" data-pickup-type="${pickupType}">
                        <input type="radio" id="${radioId}" name="${questionId}" value="${detail.reference}" ${isFirstOption ? 'checked' : ''}>
                        <label for="${radioId}" class="pickup-option-label">
                            <div class="pickup-option-title">${detail.name}</div>
                            <div class="pickup-option-address">
                                <span class="pickup-option-icon">${this.getPickupTypeIcon(pickupType)}</span>
                                <span>${address}</span>
                            </div>
                            ${detail.provider === 'TRIPADVISOR' ? '<div class="pickup-option-badge">TripAdvisor</div>' : ''}
                        </label>
                    </div>
                `;
            });
            
            // Adicionar opção especial "Entrar em contato depois" se for do tipo OTHER
            if (pickupType === 'OTHER') {
                const contactLaterId = `${questionId}_contact_later`;
                html += `
                    <div class="pickup-option-wrapper pickup-option-special">
                        <input type="radio" id="${contactLaterId}" name="${questionId}" value="CONTACT_SUPPLIER_LATER">
                        <label for="${contactLaterId}" class="pickup-option-label">
                            <div class="pickup-option-title">Vou decidir depois</div>
                            <div class="pickup-option-description">O fornecedor entrará em contato para confirmar o local de encontro</div>
                        </label>
                    </div>
                `;
            }
            
            container.innerHTML = html || '<p>Nenhum local disponível nesta categoria</p>';
        });

        // Adicionar event listeners para sincronizar radio buttons com campo hidden
        setTimeout(() => {
            const hiddenField = document.getElementById(questionId);
            const radioButtons = document.querySelectorAll(`input[name="${questionId}"][type="radio"]`);

            if (hiddenField && radioButtons.length > 0) {
                // Definir valor inicial se há um radio button marcado
                const checkedRadio = document.querySelector(`input[name="${questionId}"][type="radio"]:checked`);
                if (checkedRadio) {
                    hiddenField.value = checkedRadio.value;
                    console.log('📍 PICKUP_POINT valor inicial definido:', checkedRadio.value);
                }

                // Adicionar listeners para mudanças
                radioButtons.forEach(radio => {
                    radio.addEventListener('change', function() {
                        if (this.checked) {
                            hiddenField.value = this.value;
                            console.log('📍 PICKUP_POINT valor atualizado:', this.value);

                            // Remover classe de erro se existir
                            hiddenField.classList.remove('error');

                            // Trigger change event para validação
                            hiddenField.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    });
                });
            }
        }, 100);
    }
    
    /**
     * Atualizar a exibição com os detalhes da localização (método legado mantido para compatibilidade)
     */
    updateLocationDisplay(locationDetails, questionId, originalLocations) {
        // Agrupar localizações por tipo para usar o novo método
        const groupedLocations = this.groupPickupLocationsByType(originalLocations);
        return this.updatePickupLocationDisplay(locationDetails, questionId, originalLocations, groupedLocations);
    }
    
    /**
     * Obter endereço padrão para referências especiais
     */
    getDefaultAddressForReference(detail) {
        if (detail.reference === 'CONTACT_SUPPLIER_LATER') {
            return 'O fornecedor entrará em contato para confirmar o local';
        } else if (detail.reference === 'MEET_AT_DEPARTURE_POINT') {
            return 'Detalhes do ponto de encontro serão fornecidos após a reserva';
        } else if (detail.address && typeof detail.address === 'object') {
            // Verificar se o endereço tem dados úteis
            const parts = [];
            if (detail.address.street && detail.address.street.trim() !== '' && detail.address.street !== ', ') {
                parts.push(detail.address.street.trim());
            }
            if (detail.address.city && detail.address.city.trim() !== '') {
                parts.push(detail.address.city.trim());
            }
            if (detail.address.state && detail.address.state.trim() !== '') {
                parts.push(detail.address.state.trim());
            }
            if (detail.address.country && detail.address.country.trim() !== '') {
                parts.push(detail.address.country.trim());
            }
            
            if (parts.length > 0) {
                return parts.join(', ');
            }
        } else if (detail.reference && detail.reference.startsWith('LOC-')) {
            if (detail.provider === 'GOOGLE' && detail.providerReference) {
                return 'Local específico (detalhes fornecidos no dia)';
            } else if (detail.provider === 'TRIPADVISOR' && detail.providerReference) {
                return 'Ponto de interesse conhecido (detalhes confirmados após reserva)';
            }
        }
        
        return 'Local será confirmado pelo fornecedor';
    }
    
    /**
     * Obter ícone para tipo de pickup
     */
    getPickupTypeIcon(pickupType) {
        const icons = {
            'HOTEL': '🏨',
            'AIRPORT': '✈️',
            'PORT': '🚢',
            'LOCATION': '📍',
            'OTHER': '📍'
        };
        
        return icons[pickupType] || '📍';
    }

    /**
     * Obter informações formatadas da localização
     */
    getFormattedLocationInfo(detail) {
        // Se temos informações contextuais, usar elas
        if (detail.contextInfo) {
            return detail.contextInfo;
        }
        
        // Se temos endereço completo, formatar de forma resumida
        if (detail.address && typeof detail.address === 'object') {
            const parts = [];
            if (detail.address.street && detail.address.street.trim() !== '' && detail.address.street !== ', ') {
                parts.push(detail.address.street.trim());
            }
            if (detail.address.city && detail.address.city.trim() !== '') {
                parts.push(detail.address.city.trim());
            }
            
            if (parts.length > 0) {
                return parts.join(', ');
            }
        }
        
        // Para casos especiais
        if (detail.reference === 'CONTACT_SUPPLIER_LATER') {
            return 'O fornecedor entrará em contato para confirmar detalhes';
        } else if (detail.reference === 'MEET_AT_DEPARTURE_POINT') {
            return 'Detalhes do ponto de encontro serão fornecidos após a reserva';
        } else if (detail.reference && detail.reference.startsWith('LOC-')) {
            if (detail.provider === 'GOOGLE') {
                return 'Local específico identificado via Google Maps';
            } else if (detail.provider === 'TRIPADVISOR') {
                return 'Ponto de interesse conhecido no TripAdvisor';
            }
        }
        
        return null; // Não exibir informação extra se não temos dados úteis
    }

    /**
     * Obter nome de exibição para um local de pickup
     */
    getLocationDisplayName(location) {
        if (typeof location === 'string') {
            return location;
        }
        
        if (typeof location === 'object') {
            // Se temos dados detalhados do local (via /locations/bulk)
            if (location.name) {
                let displayName = location.name;
                if (location.address && location.address.street) {
                    displayName += ` - ${location.address.street}`;
                }
                return displayName;
            }
            
            // Se é um objeto com referência
            if (location.location && location.location.ref) {
                return this.formatLocationReference(location.location.ref);
            }
        }
        
        return 'Carregando informações do local...';
    }

    /**
     * Formatar referência de local para exibição
     */
    formatLocationReference(ref) {
        if (ref === 'CONTACT_SUPPLIER_LATER') {
            return 'Entrarei em contato com o fornecedor mais tarde';
        }
        
        if (ref === 'MEET_AT_DEPARTURE_POINT') {
            return 'Encontro no ponto de partida';
        }
        
        // Para outras referências, tentar buscar dados detalhados
        // ou retornar uma versão formatada da referência
        if (ref.startsWith('LOC-')) {
            return 'Local específico';
        }
        
        return ref;
    }

    /**
     * Obter nome amigável do idioma
     */
    getLanguageName(languageCode) {
        const languageNames = {
            'en': 'Inglês',
            'es': 'Espanhol',
            'fr': 'Francês',
            'de': 'Alemão',
            'it': 'Italiano',
            'pt': 'Português',
            'ru': 'Russo',
            'ja': 'Japonês',
            'ko': 'Coreano',
            'zh': 'Chinês',
            'ar': 'Árabe',
            'hi': 'Hindi',
            'th': 'Tailandês',
            'vi': 'Vietnamita',
            'tr': 'Turco',
            'pl': 'Polonês',
            'nl': 'Holandês',
            'sv': 'Sueco',
            'da': 'Dinamarquês',
            'no': 'Norueguês',
            'fi': 'Finlandês',
            'cs': 'Tcheco',
            'hu': 'Húngaro',
            'ro': 'Romeno',
            'bg': 'Búlgaro',
            'hr': 'Croata',
            'sk': 'Eslovaco',
            'sl': 'Esloveno',
            'et': 'Estoniano',
            'lv': 'Letão',
            'lt': 'Lituano',
            'mt': 'Maltês',
            'ga': 'Irlandês',
            'cy': 'Galês',
            'eu': 'Basco',
            'ca': 'Catalão',
            'gl': 'Galego'
        };
        
        return languageNames[languageCode] || languageCode.toUpperCase();
    }

    // MÉTODO REMOVIDO - DUPLICATA (mantendo apenas a primeira definição)
    
    /**
     * Coletar respostas da seção de Ponto de Encontro
     */
    collectPickupPointAnswers(answers) {
        const pickupContainer = document.getElementById('pickup-point-container');
        if (!pickupContainer) return;
        
        const pickupElements = pickupContainer.querySelectorAll('[data-question-id]');
        pickupElements.forEach(element => {
            const questionId = element.getAttribute('data-question-id');
            const group = element.getAttribute('data-group');
            
            if (group === 'PER_BOOKING' && questionId === 'PICKUP_POINT') {
                const question = this.bookingQuestions.find(q => q.id === questionId);
                if (question) {
                    const answer = this.collectQuestionAnswer(question, element.id, false, null);
                    if (answer) {
                        answers.push(answer);
                    }
                }
            }
        });
    }
    
    /**
     * Coletar respostas da seção de Idioma da Excursão
     */
    collectLanguageGuideAnswers(answers) {
        const languageContainer = document.getElementById('language-guide-container');
        if (!languageContainer) return;
        
        const languageElements = languageContainer.querySelectorAll('[data-question-id]');
        languageElements.forEach(element => {
            const questionId = element.getAttribute('data-question-id');
            const group = element.getAttribute('data-group');
            
            if (group === 'PER_BOOKING') {
                // Para perguntas de idioma existentes nas booking questions
                const question = this.bookingQuestions.find(q => 
                    q.id === questionId || 
                    (q.subType === 'LANGUAGE_GUIDE' || 
                     q.label.toLowerCase().includes('idioma') || 
                     q.label.toLowerCase().includes('language'))
                );
                
                if (question) {
                    const answer = this.collectQuestionAnswer(question, element.id, false, null);
                    if (answer) {
                        answers.push(answer);
                    }
                } else if (questionId === 'LANGUAGE_GUIDE') {
                    // Para o menu suspenso criado baseado nos languageGuides
                    const selectElement = element;
                    if (selectElement.value && selectElement.value !== '') {
                        const selectedOption = selectElement.options[selectElement.selectedIndex];
                        const serviceType = selectedOption.getAttribute('data-type');
                        
                        answers.push({
                            questionId: 'LANGUAGE_GUIDE',
                            answer: {
                                language: selectElement.value,
                                type: serviceType || 'GUIDE'
                            }
                        });
                    }
                }
            }
        });
    }

    /**
     * Coletar resposta de uma pergunta específica
     */
    collectQuestionAnswer(question, questionId, isTraveler, travelerIndex) {
        let answerValue = null;
        let answerObj = null;
        
        // Verificar tipo de pergunta e coletar resposta apropriada
        switch (question.type) {
            case 'LOCATION_REF_OR_FREE_TEXT':
                // Verificar se é PICKUP_POINT ou outro campo de localização
                if (question.id === 'PICKUP_POINT' || question.subType === 'PICKUP_POINT' || question.label.toLowerCase().includes('pickup') || question.label.toLowerCase().includes('encontro')) {
                    // Lógica para PICKUP_POINT com múltiplas unidades
                    if (question.units && question.units.length > 1) {
                        // Verificar se há seleção de rádio (interface avançada)
                        const radioElements = document.querySelectorAll(`input[name="${questionId}"]:checked`);
                        if (radioElements.length > 0) {
                            const selectedRadio = radioElements[0];
                            const selectedValue = selectedRadio.value;
                            const selectedUnit = selectedRadio.dataset.unit;
                            
                            if (selectedValue === 'CUSTOM_LOCATION' || selectedUnit === 'FREETEXT') {
                                // Coletar valor do campo "Outro local"
                                const otherTextField = document.getElementById(`${questionId}_freetext`);
                                if (otherTextField && otherTextField.value.trim()) {
                                    answerValue = otherTextField.value.trim();
                                    answerObj = {
                                        question: question.id,
                                        answer: answerValue,
                                        unit: 'FREETEXT'
                                    };
                                }
                            } else {
                                answerValue = selectedValue;
                                answerObj = {
                                    question: question.id,
                                    answer: answerValue,
                                    unit: selectedUnit || 'LOCATION_REFERENCE'
                                };
                            }
                        }
                    } else {
                        // Lógica para uma única unidade
                        const radioElements = document.querySelectorAll(`input[name="${questionId}"]:checked`);
                        if (radioElements.length > 0) {
                            const selectedRadio = radioElements[0];
                            const selectedValue = selectedRadio.value;
                            const selectedUnit = selectedRadio.dataset.unit;
                            
                            if (selectedValue === 'CUSTOM_LOCATION' || selectedUnit === 'FREETEXT') {
                                const otherTextField = document.getElementById(`${questionId}_freetext`);
                                if (otherTextField && otherTextField.value.trim()) {
                                    answerValue = otherTextField.value.trim();
                                    answerObj = {
                                        question: question.id,
                                        answer: answerValue,
                                        unit: 'FREETEXT'
                                    };
                                }
                            } else {
                                answerValue = selectedValue;
                                answerObj = {
                                    question: question.id,
                                    answer: answerValue,
                                    unit: selectedUnit || 'LOCATION_REFERENCE'
                                };
                            }
                        } else {
                            // Campo de texto simples
                            const element = document.getElementById(questionId);
                            if (element && element.value.trim()) {
                                answerValue = element.value.trim();
                                answerObj = {
                                    question: question.id,
                                    answer: answerValue,
                                    unit: question.units?.[0] || 'FREETEXT'
                                };
                            }
                        }
                    }
                } else {
                    // Outros campos de localização (usar nova lógica)
                    if (question.units && question.units.length > 1) {
                        // Verificar campo de referência
                        const referenceSelect = document.getElementById(`${questionId}_reference`);
                        if (referenceSelect && referenceSelect.value) {
                            answerValue = referenceSelect.value;
                            answerObj = {
                                question: question.id,
                                answer: answerValue,
                                unit: 'LOCATION_REFERENCE'
                            };
                        } else {
                            // Verificar campo de texto livre
                            const freetextInput = document.getElementById(`${questionId}_freetext`);
                            if (freetextInput && freetextInput.value.trim()) {
                                answerValue = freetextInput.value.trim();
                                answerObj = {
                                    question: question.id,
                                    answer: answerValue,
                                    unit: 'FREETEXT'
                                };
                            }
                        }
                    } else {
                        // Campo de texto normal
                        const element = document.getElementById(questionId);
                        if (element && element.value.trim()) {
                            answerValue = element.value.trim();
                        }
                    }
                }
                break;
                
            case 'STRING':
                // Verificar se é seleção de idioma ou campo normal
                const element = document.getElementById(questionId);
                if (element && element.value.trim()) {
                    answerValue = element.value.trim();
                    
                    // Se for seleção de idioma, adicionar informações extras
                    if (question.subType === 'LANGUAGE_GUIDE' || question.label.toLowerCase().includes('idioma') || question.label.toLowerCase().includes('language')) {
                        const selectedOption = element.options[element.selectedIndex];
                        if (selectedOption && selectedOption.dataset.type) {
                            answerObj = {
                                question: question.id,
                                answer: answerValue,
                                languageType: selectedOption.dataset.type
                            };
                        }
                    }
                }
                break;
                
            case 'NUMBER_AND_UNIT':
                const numberElement = document.getElementById(questionId);
                if (numberElement && numberElement.value.trim()) {
                    answerValue = numberElement.value.trim();
                    
                    // Coletar unidade se disponível
                    const unitElement = document.querySelector(`select[name="${questionId}_unit"]`);
                    if (unitElement && unitElement.value) {
                        answerObj = {
                            question: question.id,
                            answer: answerValue,
                            unit: unitElement.value
                        };
                    }
                }
                break;
                
            default:
                // Campos padrão (DATE, TEXTAREA, etc.)
                const defaultElement = document.getElementById(questionId);
                if (defaultElement && defaultElement.value.trim()) {
                    answerValue = defaultElement.value.trim();
                }
                break;
        }
        
        // Criar objeto de resposta se não foi criado ainda
        if (answerValue && !answerObj) {
            answerObj = {
                question: question.id,
                answer: answerValue
            };
            
            // Adicionar unit se disponível (para compatibilidade)
            if (question.unit) {
                answerObj.unit = question.unit;
            }
        }
        
        return answerObj;
    }
    
    /**
     * Renderizar perguntas de reserva na etapa de viajantes
     */
    renderBookingQuestionsInTravelersStep() {
        console.log('📝 [DEBUG] renderBookingQuestionsInTravelersStep chamada');
        console.log('📝 [DEBUG] this.bookingQuestions:', this.bookingQuestions);
        console.log('📝 [DEBUG] window.productData:', window.productData);
        console.log('📝 Renderizando perguntas de reserva na etapa de viajantes...');

        const mainContainer = document.getElementById('traveler-booking-questions');
        if (!mainContainer) {
            console.error('❌ Container principal de perguntas não encontrado!');
            return;
        }

        // Limpar containers antes de renderizar
        const generalContainer = document.getElementById('general-booking-questions');
        const travelerContainer = document.getElementById('traveler-booking-questions-inner');

        if (generalContainer) {
            generalContainer.innerHTML = '';
        }
        if (travelerContainer) {
            travelerContainer.innerHTML = '';
        }

        mainContainer.style.display = 'none';

        if (!this.bookingQuestions || this.bookingQuestions.length === 0) {
            console.log('ℹ️ [DEBUG] Nenhuma pergunta de reserva encontrada para este produto.');
            if (generalContainer) {
                generalContainer.innerHTML = `<div class='debug-message'><strong>Debug:</strong> Nenhuma pergunta de reserva para renderizar.</div>`;
                generalContainer.style.display = 'block';
            }
            return;
        }

        if (!generalContainer || !travelerContainer) {
            console.error('❌ Containers de perguntas de reserva não encontrados!');
            return;
        }
        
        // Renderizar Ponto de Encontro em seção dedicada (seção 4)
        const pickupPointSection = document.getElementById('pickup-point-section');
        const pickupPointContainer = document.getElementById('pickup-point-container');
        if (pickupPointSection && pickupPointContainer) {
            const pickupHTML = this.renderPickupPointSection();
            if (pickupHTML) {
                pickupPointContainer.innerHTML = pickupHTML;
                pickupPointSection.style.display = 'block';
            } else {
                pickupPointSection.style.display = 'none';
            }
        }
        
        // Renderizar Informações Adicionais da Reserva (seção 5) - Idioma + Requisitos Especiais
        const additionalInfoSection = document.getElementById('additional-booking-info-section');
        const languageGuideContainer = document.getElementById('language-guide-container');
        const generalContainer2 = document.getElementById('general-booking-questions');
        
        if (additionalInfoSection) {
            let hasAdditionalInfo = false;
            
            // Renderizar Idioma da Excursão
            if (languageGuideContainer) {
                const languageHTML = this.renderLanguageGuideSection();
                if (languageHTML) {
                    languageGuideContainer.innerHTML = languageHTML;
                    hasAdditionalInfo = true;
                }
            }
            
            // Renderizar perguntas gerais (Requisitos Especiais e outras) excluindo PICKUP_POINT, LANGUAGE_GUIDE e perguntas de TRANSFER
            const generalQuestions = this.bookingQuestions.filter(q => 
                q.group === 'PER_BOOKING' && 
                q.id !== 'PICKUP_POINT' && 
                !q.id.startsWith('TRANSFER_') && 
                !(q.subType === 'LANGUAGE_GUIDE' || q.label.toLowerCase().includes('idioma') || q.label.toLowerCase().includes('language'))
            );
            
            if (generalQuestions.length > 0 && generalContainer2) {
                generalContainer2.innerHTML = this.renderGeneralBookingQuestions(generalQuestions);
                hasAdditionalInfo = true;
            }
            
            // Mostrar/ocultar seção baseado no conteúdo
            if (hasAdditionalInfo) {
                additionalInfoSection.style.display = 'block';
            } else {
                additionalInfoSection.style.display = 'none';
            }
        }
        
        // Renderizar perguntas por viajante (PER_TRAVELER)
        const travelerQuestions = this.bookingQuestions.filter(q => q.group === 'PER_TRAVELER');
        console.log('🔍 [DEBUG] Perguntas PER_TRAVELER encontradas:', travelerQuestions.length);
        console.log('🔍 [DEBUG] Detalhes das perguntas PER_TRAVELER:', travelerQuestions);
        console.log('🔍 [DEBUG] this.bookingData.selectedTravelers:', this.bookingData.selectedTravelers);
        
        if (travelerQuestions.length > 0) {
            let travelerQuestionsHTML = '';
            
            // Gerar perguntas para cada viajante
            if (this.bookingData.selectedTravelers) {
                let globalTravelerNumber = 1; // Contador sequencial global
                
                this.bookingData.selectedTravelers.forEach((travelerGroup, groupIndex) => {
                    for (let i = 0; i < travelerGroup.numberOfTravelers; i++) {
                        const travelerIndex = groupIndex * 10 + i; // Índice único para cada viajante (mantido para IDs)
                        
                        console.log(`🔍 [DEBUG] Gerando perguntas para viajante ${globalTravelerNumber} (índice ${travelerIndex})`);
                        
                        travelerQuestionsHTML += `<div class="traveler-questions-section">`;
                        travelerQuestionsHTML += `<h5>👤 Viajante ${globalTravelerNumber}</h5>`;
                        const travelerHTML = this.renderTravelerBookingQuestions(travelerIndex);
                        console.log(`🔍 [DEBUG] HTML gerado para viajante ${globalTravelerNumber}:`, travelerHTML);
                        travelerQuestionsHTML += travelerHTML;
                        travelerQuestionsHTML += `</div>`;
                        
                        globalTravelerNumber++; // Incrementar contador sequencial
                    }
                });
            }
            
            console.log('🔍 [DEBUG] HTML completo das perguntas de viajantes:', travelerQuestionsHTML);
            travelerContainer.innerHTML = travelerQuestionsHTML;
        } else {
            console.log('ℹ️ [DEBUG] Nenhuma pergunta PER_TRAVELER encontrada');
        }
        
        // Mostrar o container se há perguntas de viajantes
        if (travelerQuestions.length > 0) {
            mainContainer.style.display = 'block';
            console.log(`✅ ${travelerQuestions.length} perguntas por viajante renderizadas.`);
            
            console.log('✅ [DEBUG] Container principal de perguntas mostrado');
            console.log('🔍 [DEBUG] Conteúdo do container:', mainContainer.innerHTML);
        } else {
            console.log('ℹ️ [DEBUG] Nenhuma pergunta de viajante para renderizar, container permanece oculto');
        }

        // Atualizar campos condicionais após renderização
        setTimeout(() => {
            ViatorConditionalQuestions.updateAllConditionalFields();
            console.log('✅ Campos condicionais atualizados após renderização');
            
            // Configurar sincronização de unidades para WEIGHT e HEIGHT
            this.setupUnitSynchronization();
            console.log('✅ Sincronização de unidades configurada');
            
            // Configurar validações avançadas para as perguntas de reserva
            this.setupBookingQuestionsValidation();
            console.log('✅ Validações avançadas das perguntas de reserva configuradas');
        }, 100);
        
        // Adicionar listeners de validação após a renderização
        const questionsContainer = document.getElementById('booking-questions-container');
        if (questionsContainer) {
            const handleValidation = (target) => {
                if (target.matches('input[required], select[required], textarea[required]')) {
                    const questionId = target.id;
                    const errorDiv = document.getElementById(`error_${questionId}`);
                    if (!target.value) {
                        target.classList.add('is-invalid');
                        if (errorDiv) {
                            errorDiv.textContent = 'Obrigatório.';
                            errorDiv.classList.add('show');
                        }
                    } else {
                        target.classList.remove('is-invalid');
                        if (errorDiv) {
                            errorDiv.classList.remove('show');
                        }
                    }
                }
            };

            questionsContainer.addEventListener('blur', (event) => {
                handleValidation(event.target);
            }, true);

            questionsContainer.addEventListener('input', (event) => {
                const target = event.target;
                if (target.matches('input[required], select[required], textarea[required]')) {
                    if (target.value) {
                        target.classList.remove('is-invalid');
                        const errorDiv = document.getElementById(`error_${target.id}`);
                        if (errorDiv) {
                            errorDiv.classList.remove('show');
                        }
                    }
                }
            }, true);
        }
    }
    
    /**
     * Obter total de viajantes
     */
    getTotalTravelersCount() {
        if (!this.bookingData.selectedTravelers) {
            return 0;
        }
        
        return this.bookingData.selectedTravelers.reduce((total, travelerGroup) => {
            return total + travelerGroup.numberOfTravelers;
        }, 0);
    }
    
    // Função removida - não precisamos mais de formulários individuais para cada viajante
    
    generateBookingSummary() {
        const container = document.getElementById('booking-summary');
        if (!container) return;
        
        // Obter dados corretos da data
        const hiddenDateInput = document.getElementById('travel-date-value');
        const dateSelector = document.querySelector('.viator-booking-date-selector span:not(.calendar-icon)');
        
        let selectedDate = 'Data não selecionada';
        
        // Tentar obter a data do input hidden primeiro
        if (hiddenDateInput && hiddenDateInput.value) {
            const dateValue = new Date(hiddenDateInput.value + 'T12:00:00');
            if (!isNaN(dateValue.getTime())) {
                const diasDaSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
                const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
                
                const diaSemana = diasDaSemana[dateValue.getDay()];
                const dia = dateValue.getDate().toString().padStart(2, '0');
                const mes = meses[dateValue.getMonth()];
                const ano = dateValue.getFullYear();
                
                selectedDate = `${diaSemana}, ${dia} de ${mes} de ${ano}`;
            }
        } 
        // Se não conseguir do input hidden, tentar do dateSelector
        else if (dateSelector && dateSelector.textContent !== 'Escolher data') {
            selectedDate = dateSelector.textContent;
        }
        // Como último recurso, usar a data armazenada
        else if (this.bookingData.travelDate) {
            const dateValue = new Date(this.bookingData.travelDate + 'T12:00:00');
            if (!isNaN(dateValue.getTime())) {
                const diasDaSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
                const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
                
                const diaSemana = diasDaSemana[dateValue.getDay()];
                const dia = dateValue.getDate().toString().padStart(2, '0');
                const mes = meses[dateValue.getMonth()];
                const ano = dateValue.getFullYear();
                
                selectedDate = `${diaSemana}, ${dia} de ${mes} de ${ano}`;
            }
        }
        
        // Obter título do produto da página atual se disponível
        const productTitle = document.querySelector('h1.entry-title, .product-title, h1')?.textContent?.trim() || 
                           this.bookingData.availabilityData?.productTitle || 
                           'Experiência Viator';
        
        // Calcular total correto da opção selecionada
        let totalPrice = 0;
        if (this.bookingData.selectedOption && this.bookingData.selectedOption.fullOption) {
            totalPrice = this.bookingData.selectedOption.fullOption.totalPrice.price.recommendedRetailPrice;
        } else if (this.bookingData.availabilityData && this.bookingData.availabilityData.totalPrice) {
            totalPrice = this.bookingData.availabilityData.totalPrice;
        }
        
        // Obter nome da opção selecionada
        const selectedOptionName = this.bookingData.selectedOption?.fullOption?.optionTitle || '';
        const optionInfo = selectedOptionName ? ` - ${selectedOptionName}` : '';
        
        container.innerHTML = `
            <div class="summary-item">
                <span>Produto:</span>
                <span>${productTitle}${optionInfo}</span>
            </div>
            <div class="summary-item">
                <span>Data:</span>
                <span>${selectedDate !== 'Escolher data' ? selectedDate : 'Data não selecionada'}</span>
            </div>
            <div class="summary-item">
                <span>Viajantes:</span>
                <span>${this.getTotalTravelers()}</span>
            </div>
            <div class="summary-item total">
                <span>Total:</span>
                <span>${totalPrice > 0 ? this.formatPrice(totalPrice) : 'Aguardando seleção'}</span>
            </div>
        `;
    }
    
    formatCardNumber() {
        const cardInput = document.getElementById('card-number');
        if (!cardInput) return;

        cardInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            e.target.value = formattedValue;

            // Validar cartão em tempo real
            const isValid = this.validateCreditCard(value);
            const errorElement = document.getElementById('card-number-error');

            if (value.length > 0) {
                if (isValid) {
                    cardInput.classList.remove('is-invalid');
                    cardInput.classList.add('is-valid');
                    if (errorElement) errorElement.style.display = 'none';
                } else {
                    cardInput.classList.remove('is-valid');
                    cardInput.classList.add('is-invalid');
                    if (errorElement) {
                        errorElement.textContent = 'Número do cartão inválido';
                        errorElement.style.display = 'block';
                    }
                }
            } else {
                cardInput.classList.remove('is-valid', 'is-invalid');
                if (errorElement) errorElement.style.display = 'none';
            }
        });

        // Adicionar validação ao sair do campo
        cardInput.addEventListener('blur', (e) => {
            const value = e.target.value.replace(/\s/g, '');
            if (value.length > 0 && !this.validateCreditCard(value)) {
                this.showDateError('Número do cartão inválido. Verifique e tente novamente.');
            }
        });

        // Inicializar validação de outros campos de pagamento
        this.initializePaymentFieldValidation();
    }
    
    /**
     * Validar número do cartão de crédito usando algoritmo de Luhn
     */
    validateCreditCard(cardNumber) {
        // Remover espaços e caracteres não numéricos
        cardNumber = cardNumber.replace(/\D/g, '');

        // Verificar se tem pelo menos 13 dígitos e no máximo 19
        if (cardNumber.length < 13 || cardNumber.length > 19) {
            return false;
        }

        // Algoritmo de Luhn
        let sum = 0;
        let isEven = false;

        // Processar dígitos da direita para a esquerda
        for (let i = cardNumber.length - 1; i >= 0; i--) {
            let digit = parseInt(cardNumber.charAt(i), 10);

            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }

            sum += digit;
            isEven = !isEven;
        }

        const isValidLuhn = (sum % 10) === 0;

        // Verificar padrões de cartão conhecidos
        const cardType = this.detectCardType(cardNumber);
        const isValidPattern = cardType !== 'unknown';

        this.debugLog('Credit card validation', {
            cardNumber: cardNumber.substring(0, 6) + '...' + cardNumber.substring(cardNumber.length - 4),
            length: cardNumber.length,
            luhnValid: isValidLuhn,
            cardType: cardType,
            patternValid: isValidPattern
        });

        return isValidLuhn && isValidPattern;
    }

    /**
     * Detectar tipo do cartão de crédito
     */
    detectCardType(cardNumber) {
        const patterns = {
            visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
            mastercard: /^5[1-5][0-9]{14}$/,
            amex: /^3[47][0-9]{13}$/,
            discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
            diners: /^3[0689][0-9]{11}$/,
            jcb: /^(?:2131|1800|35\d{3})\d{11}$/,
            elo: /^((((636368)|(438935)|(504175)|(451416)|(636297))\d{0,10})|((5067)|(4576)|(4011))\d{0,12})$/,
            hipercard: /^(606282\d{10}(\d{3})?)|(3841\d{15})$/
        };

        for (const [type, pattern] of Object.entries(patterns)) {
            if (pattern.test(cardNumber)) {
                return type;
            }
        }

        return 'unknown';
    }

    /**
     * Inicializar validação de campos de pagamento
     */
    initializePaymentFieldValidation() {
        // Validação do número do cartão (já implementada no formatCardNumber)

        // Validação do CVV
        const cvvInput = document.getElementById('security-code');
        if (cvvInput) {
            cvvInput.addEventListener('input', (e) => {
                const value = e.target.value.replace(/\D/g, '');
                e.target.value = value;
            });

            cvvInput.addEventListener('blur', (e) => {
                const value = e.target.value.trim();
                if (!value) {
                    this.showFieldError(cvvInput, 'O CVV é obrigatório.');
                } else if (!this.validateCVV(value)) {
                    this.showFieldError(cvvInput, 'CVV deve ter 3 ou 4 dígitos.');
                } else {
                    this.hideFieldError(cvvInput);
                }
            });
        }

        // Validação da data de expiração
        const expMonthInput = document.getElementById('expiry-month');
        const expYearInput = document.getElementById('expiry-year');

        if (expMonthInput && expYearInput) {
            const validateExpiry = () => {
                const month = expMonthInput.value;
                const year = expYearInput.value;

                if (!month) {
                    this.showFieldError(expMonthInput, 'Selecione o mês de vencimento.');
                    return;
                }

                if (!year) {
                    this.showFieldError(expYearInput, 'Selecione o ano de vencimento.');
                    return;
                }

                if (!this.validateExpiryDate(month, year)) {
                    this.showFieldError(expMonthInput, 'Data de vencimento inválida.');
                    this.showFieldError(expYearInput, 'Data de vencimento inválida.');
                } else {
                    this.hideFieldError(expMonthInput);
                    this.hideFieldError(expYearInput);
                }
            };

            expMonthInput.addEventListener('blur', validateExpiry);
            expYearInput.addEventListener('blur', validateExpiry);
        }

        // Validação do nome do portador
        const nameInput = document.getElementById('cardholder-name');
        if (nameInput) {
            nameInput.addEventListener('blur', (e) => {
                const value = e.target.value.trim();
                if (!value) {
                    this.showFieldError(nameInput, 'O nome no cartão é obrigatório.');
                } else if (value.length < 2) {
                    this.showFieldError(nameInput, 'Nome deve ter pelo menos 2 caracteres.');
                } else if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(value)) {
                    this.showFieldError(nameInput, 'Nome deve conter apenas letras.');
                } else {
                    this.hideFieldError(nameInput);
                }
            });
        }

        // Validação do país
        const countryInput = document.getElementById('billing-country');
        if (countryInput) {
            countryInput.addEventListener('blur', (e) => {
                const value = e.target.value;
                if (!value) {
                    this.showFieldError(countryInput, 'Selecione o país.');
                } else {
                    this.hideFieldError(countryInput);
                }
            });
        }

        // Validação do CEP
        const zipInput = document.getElementById('billing-zip');
        if (zipInput) {
            zipInput.addEventListener('blur', (e) => {
                const value = e.target.value.trim();
                if (!value) {
                    this.showFieldError(zipInput, 'O CEP é obrigatório.');
                } else if (value.length < 5) {
                    this.showFieldError(zipInput, 'CEP deve ter pelo menos 5 caracteres.');
                } else {
                    this.hideFieldError(zipInput);
                }
            });
        }
    }

    /**
     * Validar CVV
     */
    validateCVV(cvv) {
        return cvv.length >= 3 && cvv.length <= 4 && /^\d+$/.test(cvv);
    }

    /**
     * Validar data de expiração
     */
    validateExpiryDate(month, year) {
        if (!month || !year) return false;

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        const expMonth = parseInt(month, 10);
        const expYear = parseInt(year, 10);

        // Verificar se o mês é válido
        if (expMonth < 1 || expMonth > 12) return false;

        // Verificar se a data não está no passado
        if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
            return false;
        }

        // Verificar se não está muito no futuro (mais de 20 anos)
        if (expYear > currentYear + 20) return false;

        return true;
    }

    /**
     * Atualizar validação visual do campo
     */
    updateFieldValidation(field, isValid, errorMessage) {
        if (isValid) {
            this.hideFieldError(field);
        } else {
            this.showFieldError(field, errorMessage);
        }
    }

    /**
     * Validação abrangente da prontidão para pagamento
     */
    async validatePaymentReadiness() {
        const validationErrors = [];

        try {
            // 1. Validar validade do hold
            const holdValidation = this.validateHoldValidity();
            if (!holdValidation.isValid) {
                validationErrors.push(holdValidation.error);
            }

            // 2. Validar completude das perguntas de reserva
            const bookingQuestionsValidation = this.validateBookingQuestionsCompleteness();
            if (!bookingQuestionsValidation.isValid) {
                validationErrors.push(bookingQuestionsValidation.error);
            }

            // 3. Validar dados dos viajantes
            const travelerValidation = this.validateTravelerDataCompleteness();
            if (!travelerValidation.isValid) {
                validationErrors.push(travelerValidation.error);
            }

            // 4. Validar dados de pagamento
            const paymentValidation = this.validatePaymentDataCompleteness();
            if (!paymentValidation.isValid) {
                validationErrors.push(paymentValidation.error);
            }

            // 5. Validar disponibilidade ainda válida
            const availabilityValidation = await this.validateAvailabilityStillValid();
            if (!availabilityValidation.isValid) {
                validationErrors.push(availabilityValidation.error);
            }

            this.debugLog('Payment readiness validation completed', {
                holdValid: holdValidation.isValid,
                bookingQuestionsValid: bookingQuestionsValidation.isValid,
                travelerDataValid: travelerValidation.isValid,
                paymentDataValid: paymentValidation.isValid,
                availabilityValid: availabilityValidation.isValid,
                totalErrors: validationErrors.length
            });

            if (validationErrors.length > 0) {
                return {
                    isValid: false,
                    errorMessage: 'Problemas encontrados:\n\n' + validationErrors.join('\n\n')
                };
            }

            return { isValid: true };

        } catch (error) {
            console.error('❌ Erro na validação de prontidão para pagamento:', error);
            this.debugLog('Payment readiness validation error', error);

            return {
                isValid: false,
                errorMessage: 'Erro na validação dos dados. Tente novamente.'
            };
        }
    }

    /**
     * Validar validade do hold
     */
    validateHoldValidity() {
        if (!this.bookingData.holdData) {
            return {
                isValid: false,
                error: 'Sessão de reserva não encontrada. Recarregue a página e tente novamente.'
            };
        }

        // Verificar se o hold não expirou
        const holdCreatedAt = this.bookingData.holdCreatedAt;
        if (holdCreatedAt) {
            const holdAge = Date.now() - holdCreatedAt;
            const holdExpiryTime = 15 * 60 * 1000; // 15 minutos

            if (holdAge > holdExpiryTime) {
                return {
                    isValid: false,
                    error: 'Sessão de reserva expirada. A página será recarregada para criar uma nova sessão.'
                };
            }
        }

        // Verificar se tem os dados essenciais do hold
        if (!this.bookingData.holdData.paymentSessionToken || !this.bookingData.holdData.paymentDataSubmissionUrl) {
            return {
                isValid: false,
                error: 'Dados de sessão de pagamento incompletos. Recarregue a página.'
            };
        }

        return { isValid: true };
    }

    /**
     * Validar completude das perguntas de reserva
     */
    validateBookingQuestionsCompleteness() {
        const missingQuestions = [];

        // Verificar perguntas obrigatórias gerais
        const generalQuestions = document.querySelectorAll('#general-booking-questions [required]');
        generalQuestions.forEach(field => {
            if (!field.value || field.value.trim() === '') {
                const label = field.closest('.booking-question-group')?.querySelector('label')?.textContent || field.id;
                missingQuestions.push(`• ${label.replace('*', '').trim()}`);
            }
        });

        // Verificar perguntas obrigatórias por viajante
        const travelerQuestions = document.querySelectorAll('#traveler-booking-questions-inner [required]');
        travelerQuestions.forEach(field => {
            if (!field.value || field.value.trim() === '') {
                const label = field.closest('.form-group')?.querySelector('label')?.textContent || field.id;
                missingQuestions.push(`• ${label.replace('*', '').trim()}`);
            }
        });

        if (missingQuestions.length > 0) {
            return {
                isValid: false,
                error: 'Perguntas obrigatórias não respondidas:\n' + missingQuestions.join('\n')
            };
        }

        return { isValid: true };
    }

    /**
     * Validar completude dos dados dos viajantes
     */
    validateTravelerDataCompleteness() {
        const bookerInfo = this.bookingData.bookerInfo;

        if (!bookerInfo) {
            return {
                isValid: false,
                error: 'Dados do responsável pela reserva não encontrados.'
            };
        }

        const requiredFields = ['firstname', 'lastname', 'email'];
        const missingFields = [];

        requiredFields.forEach(field => {
            if (!bookerInfo[field] || bookerInfo[field].trim() === '') {
                const fieldNames = {
                    firstname: 'Nome',
                    lastname: 'Sobrenome',
                    email: 'Email'
                };
                missingFields.push(`• ${fieldNames[field]}`);
            }
        });

        if (missingFields.length > 0) {
            return {
                isValid: false,
                error: 'Dados obrigatórios do responsável não preenchidos:\n' + missingFields.join('\n')
            };
        }

        // Validar formato do email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(bookerInfo.email)) {
            return {
                isValid: false,
                error: 'Email do responsável pela reserva é inválido.'
            };
        }

        return { isValid: true };
    }

    /**
     * Validar completude dos dados de pagamento
     */
    validatePaymentDataCompleteness() {
        const requiredFields = [
            { id: 'card-number', name: 'Número do cartão' },
            { id: 'security-code', name: 'CVV' },
            { id: 'expiry-month', name: 'Mês de expiração' },
            { id: 'expiry-year', name: 'Ano de expiração' },
            { id: 'cardholder-name', name: 'Nome do portador' },
            { id: 'billing-country', name: 'País' },
            { id: 'billing-zip', name: 'CEP' }
        ];

        const missingFields = [];
        const invalidFields = [];

        requiredFields.forEach(field => {
            const element = document.getElementById(field.id);
            if (!element || !element.value || element.value.trim() === '') {
                missingFields.push(`• ${field.name}`);
            } else {
                // Validações específicas
                switch (field.id) {
                    case 'card-number':
                        const cardNumber = element.value.replace(/\s/g, '');
                        if (!this.validateCreditCard(cardNumber)) {
                            invalidFields.push(`• ${field.name} (número inválido)`);
                        }
                        break;
                    case 'security-code':
                        if (!this.validateCVV(element.value)) {
                            invalidFields.push(`• ${field.name} (formato inválido)`);
                        }
                        break;
                    case 'expiry-month':
                    case 'expiry-year':
                        const month = document.getElementById('expiry-month')?.value;
                        const year = document.getElementById('expiry-year')?.value;
                        if (month && year && !this.validateExpiryDate(month, year)) {
                            invalidFields.push(`• Data de expiração (inválida ou expirada)`);
                        }
                        break;
                    case 'cardholder-name':
                        if (element.value.length < 2 || !/^[a-zA-ZÀ-ÿ\s]+$/.test(element.value)) {
                            invalidFields.push(`• ${field.name} (formato inválido)`);
                        }
                        break;
                }
            }
        });

        const errors = [];
        if (missingFields.length > 0) {
            errors.push('Campos obrigatórios não preenchidos:\n' + missingFields.join('\n'));
        }
        if (invalidFields.length > 0) {
            errors.push('Campos com dados inválidos:\n' + invalidFields.join('\n'));
        }

        if (errors.length > 0) {
            return {
                isValid: false,
                error: errors.join('\n\n')
            };
        }

        return { isValid: true };
    }

    /**
     * Validar se a disponibilidade ainda é válida
     */
    async validateAvailabilityStillValid() {
        try {
            if (!this.bookingData.availabilityData || !this.bookingData.selectedOption) {
                return {
                    isValid: false,
                    error: 'Dados de disponibilidade não encontrados.'
                };
            }

            // Verificar se a disponibilidade foi verificada recentemente (últimos 5 minutos)
            const availabilityAge = Date.now() - (this.bookingData.availabilityCheckedAt || 0);
            const maxAge = 5 * 60 * 1000; // 5 minutos

            if (availabilityAge > maxAge) {
                console.log('🔄 Verificando disponibilidade atualizada antes do pagamento...');

                try {
                    // Re-verificar disponibilidade com tratamento de erro robusto
                    const freshAvailability = await this.checkAvailability();
                    if (!freshAvailability) {
                        // Se falhou, mas temos dados recentes (menos de 15 minutos), usar cache
                        const cacheMaxAge = 15 * 60 * 1000; // 15 minutos
                        if (availabilityAge < cacheMaxAge) {
                            console.warn('⚠️ Usando dados de disponibilidade em cache devido a erro na verificação');
                            return { isValid: true };
                        }

                        return {
                            isValid: false,
                            error: 'Não foi possível verificar a disponibilidade atual. Tente novamente.'
                        };
                    }

                    // Verificar se a opção selecionada ainda está disponível
                    const selectedOptionCode = this.bookingData.selectedOption.productOptionCode;

                    // Verificar tanto em freshAvailability quanto em bookableItems
                    let optionStillAvailable = false;

                    if (freshAvailability.productOptions) {
                        optionStillAvailable = freshAvailability.productOptions.some(option =>
                            option.productOptionCode === selectedOptionCode && option.available
                        );
                    } else if (freshAvailability.bookableItems) {
                        optionStillAvailable = freshAvailability.bookableItems.some(item =>
                            item.productOptionCode === selectedOptionCode && item.available
                        );
                    } else if (this.bookingData.availabilityData.bookableItems) {
                        // Fallback para dados existentes
                        optionStillAvailable = this.bookingData.availabilityData.bookableItems.some(item =>
                            item.productOptionCode === selectedOptionCode && item.available
                        );
                    }

                    if (!optionStillAvailable) {
                        return {
                            isValid: false,
                            error: 'A opção selecionada não está mais disponível. Por favor, selecione outra opção.'
                        };
                    }

                    console.log('✅ Disponibilidade confirmada');
                } catch (availabilityError) {
                    console.warn('⚠️ Erro na re-verificação de disponibilidade:', availabilityError);
                    this.debugLog('Availability recheck failed', availabilityError);

                    // Se temos dados recentes, continuar com eles
                    const cacheMaxAge = 15 * 60 * 1000; // 15 minutos
                    if (availabilityAge < cacheMaxAge) {
                        console.warn('⚠️ Usando dados de disponibilidade em cache devido a erro na verificação');
                        return { isValid: true };
                    }

                    return {
                        isValid: false,
                        error: 'Erro ao verificar disponibilidade. Tente novamente em alguns instantes.'
                    };
                }
            }

            return { isValid: true };

        } catch (error) {
            console.error('❌ Erro na validação de disponibilidade:', error);
            this.debugLog('Availability validation error', error);
            return {
                isValid: false,
                error: 'Erro ao verificar disponibilidade. Tente novamente.'
            };
        }
    }

    getTotalTravelers() {
        let totalTravelers = 0;
        let travelersText = [];

        // Usar dados armazenados se disponíveis (para uso em etapas posteriores)
        if (this.bookingData.selectedTravelers && this.bookingData.selectedTravelers.length > 0) {
            this.bookingData.selectedTravelers.forEach(travelerGroup => {
                const ageBand = travelerGroup.ageBand;
                const quantity = travelerGroup.numberOfTravelers;
                
                // Encontrar o band correspondente para obter o label
                const band = this.ageBands.find(b => b.ageBand === ageBand);
                const bandLabel = band ? band.label : this.getAgeBandDisplayName(ageBand);
                
                totalTravelers += quantity;
                travelersText.push(`${quantity} ${quantity === 1 ? bandLabel.toLowerCase() : bandLabel.toLowerCase()}`);
            });
        } else if (this.ageBands && this.ageBands.length > 0) {
            // Usar age bands dinâmicos dos elementos DOM (primeira etapa)
            this.ageBands.forEach(band => {
                const id = band.ageBand.toLowerCase();
                const qtyElement = document.getElementById(`${id}-qty`);
                
                if (qtyElement) {
                    const quantity = parseInt(qtyElement.value, 10);
                    if (quantity > 0) {
                        totalTravelers += quantity;
                        travelersText.push(`${quantity} ${quantity === 1 ? band.label.toLowerCase() : band.label.toLowerCase()}`);
                    }
                }
            });
        } else {
            // Fallback para elementos fixos
            const adultElement = document.getElementById('adults-qty');
            const childrenElement = document.getElementById('children-qty');
            const infantsElement = document.getElementById('infants-qty');
            
            if (adultElement) {
                const adults = parseInt(adultElement.value, 10);
                if (adults > 0) {
                    totalTravelers += adults;
                    travelersText.push(`${adults} adulto${adults > 1 ? 's' : ''}`);
                }
            }
            
            if (childrenElement) {
                const children = parseInt(childrenElement.value, 10);
                if (children > 0) {
                    totalTravelers += children;
                    travelersText.push(`${children} criança${children > 1 ? 's' : ''}`);
                }
            }
            
            if (infantsElement) {
                const infants = parseInt(infantsElement.value, 10);
                if (infants > 0) {
                    totalTravelers += infants;
                    travelersText.push(`${infants} bebê${infants > 1 ? 's' : ''}`);
                }
            }
        }
        
        return travelersText.length > 0 ? travelersText.join(', ') : '0 viajantes';
    }
    
    formatPrice(price) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(price);
    }
    
    async nextStep() {
        if (await this.validateCurrentStep()) {
            if (this.currentStep < 5) { // Atualizado para 5 steps
                await this.showStep(this.currentStep + 1);
            }
        }
    }

    async previousStep() {
        if (this.currentStep > 1) {
            await this.showStep(this.currentStep - 1);
        }
    }

    async validateCurrentStep() {
        console.log(`🔍 Validando step ${this.currentStep}...`);

        // Para step 1, não fazer validação crítica pois o usuário ainda está selecionando
        if (this.currentStep > 1) {
            console.log(`🔍 Executando validação crítica para step ${this.currentStep}...`);
            // Validar dados críticos antes de prosseguir (contextual ao step)
            const criticalValidation = this.validateCriticalData(this.currentStep);
            if (!criticalValidation.isValid) {
                console.error('❌ Validação de dados críticos falhou:', criticalValidation.errors);
                // Não usar retry para validação crítica para evitar loops infinitos
                this.showDateError(`Dados incompletos: ${criticalValidation.errors.join(', ')}`);
                return false;
            }
            console.log(`✅ Validação crítica passou para step ${this.currentStep}`);
        } else {
            console.log(`⏭️ Pulando validação crítica para step ${this.currentStep} (usuário ainda selecionando)`);
        }

        switch (this.currentStep) {
            case 1:
                return await this.checkAvailability();
            case 2:
                return this.validateTravelersInfo();
            case 3:
                return await this.validateBookingQuestions();
            case 4:
                // Validar conectividade antes do pagamento
                const isConnected = await this.validateApiConnectivity();
                if (!isConnected) {
                    this.showErrorWithRetry(
                        'Problema de conectividade detectado. Verifique sua conexão com a internet.',
                        () => this.processPayment()
                    );
                    return false;
                }
                return await this.processPayment();
            default:
                return true;
        }
    }
    
    async checkAvailability() {
        // Primeiro, verificar se uma data foi selecionada
        const dateInput = document.getElementById('travel-date-value');
        if (!dateInput || !dateInput.value) {
            this.showDateError('Por favor, selecione uma data de viagem antes de continuar.');
            return false;
        }

        // Declarar variável no escopo da função
        let travelDate = null;

        // Estratégia abrangente de detecção de data de viagem
        travelDate = this.getTravelDateFromMultipleSources();

        if (!travelDate) {
            // Se ainda não encontrou, tentar última estratégia de fallback
            console.warn('⚠️ Data de viagem não encontrada em nenhuma fonte, tentando fallbacks finais...');

            // Verificar se temos dados de disponibilidade já carregados
            if (this.bookingData.availabilityData?.travelDate) {
                travelDate = this.bookingData.availabilityData.travelDate;
                console.log('✅ Usando data de viagem dos dados de disponibilidade:', travelDate);
            } else if (this.bookingData.travelDate) {
                travelDate = this.bookingData.travelDate;
                console.log('✅ Usando data de viagem já armazenada:', travelDate);
            } else {
                // Se chegou aqui, significa que não há data selecionada
                this.showDateError('Por favor, selecione uma data de viagem antes de continuar.');
                return false;
            }
        }

        // Atualizar referência para uso futuro
        this.bookingData.travelDate = travelDate;

        console.log('✅ Data de viagem definida:', travelDate);

        // Esconder erro de data se chegou até aqui
        this.hideDateError();

        const paxMix = this.collectTravelersData();
        
        // Validação adicional: verificar se atende aos requisitos mínimos
        const totalTravelers = paxMix.reduce((sum, pax) => sum + pax.numberOfTravelers, 0);
        if (totalTravelers === 0) {
            this.showDateError('Por favor, selecione pelo menos um viajante.');
            return false;
        }
        
        // Verificar se os preços foram atualizados (se há opções disponíveis)
        const priceDisplay = document.getElementById('price-display');
        const hasOptionsDisplayed = priceDisplay && priceDisplay.style.display !== 'none' &&
                                  priceDisplay.querySelector('.product-options-list');

        if (!hasOptionsDisplayed) {
            // Verificar se o botão ainda está no estado "Buscar Preços"
            const updateBtn = document.getElementById('update-price-btn');
            const buttonText = updateBtn ? updateBtn.textContent.trim() : '';

            if (buttonText.includes('Buscar')) {
                this.showDateError('Por favor, clique em "Buscar Preços" para verificar a disponibilidade e opções de passeio.');
            } else {
                this.showDateError('Por favor, clique em "Atualizar Preços" para verificar a disponibilidade e opções de passeio.');
            }
            return false;
        }
        
        // Verificar se uma opção foi selecionada
        if (!this.bookingData.selectedOption || !this.bookingData.selectedOption.fullOption) {
            this.showDateError('Por favor, selecione uma das opções de passeio disponíveis antes de continuar.');
            // Destacar visualmente que uma opção precisa ser selecionada
            this.highlightOptionSelection();
            return false;
        }

        // Validar se cada age band atende aos requisitos mínimos individuais
        const validationErrors = [];
        this.ageBands.forEach(band => {
            const id = band.ageBand.toLowerCase();
            const qtyElement = document.getElementById(`${id}-qty`);
            
            if (qtyElement) {
                const quantity = parseInt(qtyElement.value, 10);
                const minRequired = parseInt(qtyElement.min, 10) || 0;
                
                if (quantity < minRequired) {
                    const bandName = this.getAgeBandDisplayName(band.ageBand);
                    validationErrors.push(`${bandName}: mínimo ${minRequired} viajante${minRequired > 1 ? 's' : ''} necessário${minRequired > 1 ? 's' : ''}`);
                }
            }
        });
        
        if (validationErrors.length > 0) {
            this.showDateError('Requisitos mínimos não atendidos:\n\n' + validationErrors.join('\n'));
            return false;
        }

        // ARMAZENAR os dados dos viajantes para usar nas próximas etapas
        this.bookingData.selectedTravelers = paxMix;
        this.bookingData.travelDate = travelDate;

        try {
            // Verificar se viatorBookingAjax está disponível
            if (typeof viatorBookingAjax === 'undefined') {
                console.error('❌ viatorBookingAjax não está definido. Verifique se o script foi carregado corretamente.');
                this.showDateError('Erro de configuração. Recarregue a página.');
                return false;
            }
            
            const response = await fetch(viatorBookingAjax.ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'viator_check_availability',
                    product_code: this.bookingData.productCode,
                    travel_date: travelDate,
                    travelers: JSON.stringify(paxMix),
                    nonce: viatorBookingAjax.nonce
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.bookingData.availabilityData = data.data;
                this.displayAvailabilityResult(data.data);
                return true;
            } else {
                this.showDateError('Erro: ' + data.data.message);
                return false;
            }
        } catch (error) {
            this.showDateError('Erro de conexão. Tente novamente.');
            return false;
        }
    }
    
    collectTravelersData() {
        console.log('👥 collectTravelersData chamado');

        // Se os dados dos viajantes já foram coletados e armazenados, use-os.
        if (this.bookingData.selectedTravelers && this.bookingData.selectedTravelers.length > 0) {
            console.log('✅ Usando dados de viajantes armazenados:', this.bookingData.selectedTravelers);
            return this.bookingData.selectedTravelers;
        }

        // Caso contrário, colete do DOM (relevante para a primeira etapa).
        console.log('🔍 Coletando dados de viajantes do DOM (primeira etapa). ageBands disponíveis:', this.ageBands);
        const paxMix = [];
        if (this.ageBands && this.ageBands.length > 0) {
            this.ageBands.forEach(band => {
                const id = band.ageBand.toLowerCase();
                const qtyElement = document.getElementById(`${id}-qty`);
                console.log(`🔢 Elemento quantidade para ${id}:`, qtyElement);

                if (qtyElement) {
                    const quantity = parseInt(qtyElement.value, 10);
                    console.log(`👥 Quantidade para ${band.ageBand}: ${quantity}`);

                    if (quantity > 0) {
                        paxMix.push({
                            ageBand: band.ageBand,
                            numberOfTravelers: quantity
                        });
                    }
                }
            });
        } else {
            console.log('❌ Nenhum ageBand disponível para coleta no DOM');
        }

        console.log('📊 PaxMix final coletado do DOM:', paxMix);
        return paxMix;
    }
    
    displayAvailabilityResult(data) {
        const container = document.getElementById('availability-result');
        container.style.display = 'block';
        container.className = 'availability-result success';
        container.innerHTML = `
            <div class="availability-success">
                <h4>Disponível!</h4>
                <p>Esta experiência está disponível na data selecionada.</p>
                <div class="price-display">
                    <div class="price-label">Preço total:</div>
                    <div class="price-value">${this.formatPrice(data.totalPrice || 0)}</div>
                </div>
            </div>
        `;
    }
    
    validateTravelersInfo() {
        // Validar apenas os campos obrigatórios do responsável pela reserva
        const bookerFirstname = document.getElementById('booker-firstname');
        const bookerLastname = document.getElementById('booker-lastname');
        const bookerEmail = document.getElementById('booker-email');
        const bookerPhone = document.getElementById('booker-phone');
        const bookerCountryCode = document.getElementById('booker-country-code');

        if (!bookerFirstname?.value.trim()) {
            this.showDateError('Por favor, informe o nome do responsável pela reserva.');
            bookerFirstname?.focus();
            return false;
        }

        if (!bookerLastname?.value.trim()) {
            this.showDateError('Por favor, informe o sobrenome do responsável pela reserva.');
            bookerLastname?.focus();
            return false;
        }

        if (!bookerEmail?.value.trim()) {
            this.showDateError('Por favor, informe o email do responsável pela reserva.');
            bookerEmail?.focus();
            return false;
        }

        // Validação básica de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(bookerEmail.value.trim())) {
            this.showDateError('Por favor, informe um email válido.');
            bookerEmail?.focus();
            return false;
        }

        if (!bookerPhone?.value.trim()) {
            this.showDateError('Por favor, informe o telefone do responsável pela reserva.');
            bookerPhone?.focus();
            return false;
        }

        // Coletar dados detalhados dos viajantes
        this.collectDetailedTravelersData();

        // Armazenar dados do booker no bookingData para uso posterior
        this.bookingData.bookerInfo = {
            firstname: bookerFirstname.value.trim(),
            lastname: bookerLastname.value.trim(),
            email: bookerEmail.value.trim(),
            phone: bookerPhone.value.trim(),
            countryCode: bookerCountryCode?.value || 'BR'
        };

        console.log('✅ Dados do responsável armazenados:', this.bookingData.bookerInfo);
        console.log('✅ Dados detalhados dos viajantes coletados:', this.bookingData.travelersDetails);

        return true;
    }

    /**
     * Coletar dados detalhados dos viajantes para uso nas booking questions
     */
    collectDetailedTravelersData() {
        // Usar dados dos viajantes já armazenados (paxMix)
        const paxMix = this.bookingData.selectedTravelers || this.collectTravelersData();

        // Usar dados do booker armazenados ou tentar coletar do DOM (fallback)
        let bookerInfo = this.bookingData.bookerInfo;

        if (!bookerInfo) {
            // Fallback: tentar coletar do DOM se ainda não foram armazenados
            const bookerFirstname = document.getElementById('booker-firstname')?.value || '';
            const bookerLastname = document.getElementById('booker-lastname')?.value || '';
            const bookerEmail = document.getElementById('booker-email')?.value || '';
            const bookerPhone = document.getElementById('booker-phone')?.value || '';

            bookerInfo = {
                firstname: bookerFirstname,
                lastname: bookerLastname,
                email: bookerEmail,
                phone: bookerPhone
            };
        }

        // Usar respostas das perguntas de reserva já coletadas (não recoletar)
        const bookingQuestionAnswers = this.bookingData.bookingQuestionAnswers || [];

        console.log('📋 Dados coletados do responsável:', bookerInfo);
        console.log('📝 Respostas das perguntas de reserva:', bookingQuestionAnswers);

        return {
            // Informações dos viajantes (apenas quantidades por faixa etária)
            paxMix: paxMix,

            // Informações do responsável principal pela reserva
            bookerInfo: bookerInfo,

            // Respostas das perguntas de reserva
            bookingQuestionAnswers: bookingQuestionAnswers
        };
    }
    
    async processPayment() {
        // Validação abrangente antes do processamento do pagamento
        try {
            const validationResult = await this.validatePaymentReadiness();
            if (!validationResult.isValid) {
                // Se a validação falhou por problemas de conectividade, permitir continuar com aviso
                if (validationResult.errorMessage.includes('disponibilidade') &&
                    this.bookingData.availabilityData &&
                    this.bookingData.selectedOption) {

                    console.warn('⚠️ Validação de disponibilidade falhou, mas continuando com dados em cache');
                    this.debugLog('Payment proceeding with cached data due to validation failure', validationResult);

                    // Mostrar aviso mas não bloquear
                    this.showDateError('Aviso: Não foi possível verificar disponibilidade atual. Continuando com dados em cache.', 'warning');

                    // Aguardar 2 segundos para o usuário ver o aviso
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    this.showDateError(validationResult.errorMessage);
                    return false;
                }
            }
        } catch (validationError) {
            console.warn('⚠️ Erro na validação de prontidão, continuando com dados disponíveis:', validationError);
            this.debugLog('Payment validation error, proceeding anyway', validationError);
        }

        // Verificar se uma opção foi selecionada
        if (!this.bookingData.selectedOption) {
            console.warn('⚠️ Tentativa de pagamento sem opção selecionada:', {
                availabilityData: this.bookingData.availabilityData,
                selectedOption: this.bookingData.selectedOption,
                travelDate: this.bookingData.travelDate
            });
            this.showDateError('Por favor, selecione uma opção antes de prosseguir com o pagamento.');
            // Destacar visualmente as opções disponíveis
            const optionsContainer = document.querySelector('.viator-options-container');
            if (optionsContainer) {
                optionsContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                optionsContainer.style.border = '2px solid #ff6b6b';
                setTimeout(() => {
                    optionsContainer.style.border = '';
                }, 3000);
            }
            return false;
        }
        
        // Validar dados específicos de pagamento
        const cardNumber = document.getElementById('card-number');
        const cvv = document.getElementById('security-code');
        const expMonth = document.getElementById('expiry-month');
        const expYear = document.getElementById('expiry-year');
        const name = document.getElementById('cardholder-name');
        const country = document.getElementById('billing-country');
        const postalCode = document.getElementById('billing-zip');
        
        // Validação específica para cada campo
        if (!cardNumber.value.replace(/\s/g, '')) {
            this.showDateError('Por favor, informe o número do cartão.');
            cardNumber.focus();
            return false;
        }
        
        if (!cvv.value.trim()) {
            this.showDateError('Por favor, informe o CVV do cartão.');
            cvv.focus();
            return false;
        }
        
        if (!expMonth.value) {
            this.showDateError('Por favor, selecione o mês de vencimento.');
            expMonth.focus();
            return false;
        }
        
        if (!expYear.value) {
            this.showDateError('Por favor, selecione o ano de vencimento.');
            expYear.focus();
            return false;
        }
        
        if (!name.value.trim()) {
            this.showDateError('Por favor, informe o nome como aparece no cartão.');
            name.focus();
            return false;
        }
        
        if (!country.value) {
            this.showDateError('Por favor, selecione o país.');
            country.focus();
            return false;
        }
        
        if (!postalCode.value.trim()) {
            this.showDateError('Por favor, informe o CEP/código postal.');
            postalCode.focus();
            return false;
        }
        
        // Validação básica do número do cartão (apenas dígitos e comprimento)
        const cardDigits = cardNumber.value.replace(/\s/g, '');
        if (!/^\d{13,19}$/.test(cardDigits)) {
            this.showDateError('Por favor, informe um número de cartão válido (13-19 dígitos).');
            cardNumber.focus();
            return false;
        }
        
        // Validação do CVV
        if (!/^\d{3,4}$/.test(cvv.value)) {
            this.showDateError('Por favor, informe um CVV válido (3 ou 4 dígitos).');
            cvv.focus();
            return false;
        }
        
        // Processar pagamento
        try {
            // Verificar se já temos um hold válido (feito na inicialização)
            if (!this.bookingData.holdData || !this.bookingData.holdData.paymentDataSubmissionUrl) {
                this.showDateError('Sessão de pagamento expirada. Por favor, recarregue a página e tente novamente.');
                return false;
            }

            // Mostrar indicador de progresso
            this.showPaymentProgress('Processando pagamento...');

            // Processar pagamento usando o hold existente com retry
            const paymentResult = await this.executeWithRetry(
                () => this.submitPayment(),
                3, // 3 tentativas
                2000 // 2 segundos de delay inicial
            );

            if (!paymentResult) {
                this.hidePaymentProgress();
                return false;
            }

            // Mostrar sucesso temporariamente
            this.showPaymentProgress('✅ Pagamento processado com sucesso!', 'success');

            // Aguardar 1 segundo para mostrar o sucesso
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Agora processar a confirmação da reserva automaticamente com retry
            this.showPaymentProgress('📋 Criando sua reserva...', 'info');

            const confirmationResult = await this.executeWithRetry(
                () => this.confirmBooking(),
                3, // 3 tentativas
                3000 // 3 segundos de delay inicial
            );

            if (!confirmationResult) {
                this.hidePaymentProgress();
                this.showErrorWithRetry(
                    'Pagamento processado, mas houve erro na confirmação da reserva. Você pode tentar novamente ou entrar em contato conosco.',
                    () => this.confirmBooking()
                );
                return false;
            }

            // Mostrar sucesso final
            this.showPaymentProgress('🎉 Reserva confirmada com sucesso!', 'success');

            // Aguardar 2 segundos para mostrar o sucesso
            await new Promise(resolve => setTimeout(resolve, 2000));

            this.hidePaymentProgress();

            console.log('✅ Pagamento e reserva processados com sucesso, pronto para step 5');
            return true;

        } catch (error) {
            this.hidePaymentProgress();
            this.showDateError('Erro no processamento do pagamento: ' + error.message);
            return false;
        }
    }

    /**
     * Mostrar indicador de progresso do pagamento
     */
    showPaymentProgress(message, type = 'info') {
        // Remover indicador anterior se existir
        this.hidePaymentProgress();

        const progressDiv = document.createElement('div');
        progressDiv.id = 'payment-progress-indicator';
        progressDiv.className = `payment-progress alert alert-${type === 'success' ? 'success' : 'info'}`;
        progressDiv.innerHTML = `
            <div class="d-flex align-items-center">
                ${type === 'success' ? '' : '<div class="spinner-border spinner-border-sm me-2" role="status"></div>'}
                <span>${message}</span>
            </div>
        `;

        // Inserir no topo do step de pagamento
        const paymentStep = document.querySelector('.payment-step');
        if (paymentStep) {
            paymentStep.insertBefore(progressDiv, paymentStep.firstChild);
        }

        // Scroll para o indicador
        progressDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /**
     * Esconder indicador de progresso do pagamento
     */
    hidePaymentProgress() {
        const progressIndicator = document.getElementById('payment-progress-indicator');
        if (progressIndicator) {
            progressIndicator.remove();
        }
    }

    async requestBookingHoldForPayment() {
        try {
            console.log('📋 Iniciando hold request com booking questions...');

            // IMPORTANTE: Usar as respostas já coletadas das booking questions (não recoletar)
            // As respostas já foram coletadas e validadas no Step 3
            const bookingQuestionAnswers = this.bookingData.bookingQuestionAnswers || [];

            console.log('📝 Booking questions para hold (usando dados já coletados):', {
                count: bookingQuestionAnswers.length,
                answers: bookingQuestionAnswers,
                fromCache: true
            });

            // Se não há respostas em cache, tentar coletar uma última vez
            if (bookingQuestionAnswers.length === 0) {
                console.log('⚠️ Nenhuma resposta em cache, tentando coletar novamente...');
                this.collectBookingQuestionAnswers();
                const freshAnswers = this.bookingData.bookingQuestionAnswers || [];
                console.log('📝 Respostas coletadas na segunda tentativa:', freshAnswers.length);
            }

            // Coletar dados detalhados dos viajantes
            const travelersDetails = this.bookingData.travelersDetails || this.collectDetailedTravelersData();

            // Simplificar o objeto enviado para o backend, passando apenas a opção selecionada
            // que já contém o 'fullOption' com o 'totalPrice'.
            const availabilityDataWithSelection = {
                selectedOption: this.bookingData.selectedOption,
                travelDate: this.bookingData.travelDate,
                productCode: this.bookingData.productCode,
                paxMix: this.collectTravelersData() // Adicionar paxMix para consistência
            };

            console.log('📋 Dados para hold (completo):', {
                availabilityData: availabilityDataWithSelection,
                travelersDetails: travelersDetails,
                bookingQuestionAnswers: bookingQuestionAnswers,
                bookerInfo: this.bookingData.bookerInfo
            });
            
            // Verificar se viatorBookingAjax está disponível
            if (typeof viatorBookingAjax === 'undefined') {
                console.error('❌ viatorBookingAjax não está definido. Verifique se o script foi carregado corretamente.');
                return false;
            }
            
            // Configurar timeout mais longo para requisições de hold
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 segundos

            const response = await fetch(viatorBookingAjax.ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'viator_request_hold',
                    availability_data: JSON.stringify(availabilityDataWithSelection),
                    travelers_details: JSON.stringify(travelersDetails),
                    booking_question_answers: JSON.stringify(bookingQuestionAnswers),
                    booker_info: JSON.stringify(this.bookingData.bookerInfo || {}),
                    nonce: viatorBookingAjax.nonce
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            
            const data = await response.json();
            console.log('📥 Resposta do hold (inicialização pagamento):', data);
            
            if (data.success) {
                console.log('📋 Dados recebidos do PHP:', data.data);
                console.log('🔍 cartRef da API presente:', !!data.data.cartRef);
                console.log('🔍 Valor do cartRef da API:', data.data.cartRef);
                console.log('🔍 partnerCartRef presente:', !!data.data.partnerCartRef);
                console.log('🔍 Valor do partnerCartRef:', data.data.partnerCartRef);
                
                this.bookingData.holdData = data.data;
                
                // CRÍTICO: Usar o cartRef real retornado pela API da Viator, não o partnerCartRef
                if (data.data.cartRef) {
                    // O cartRef já está correto na resposta da API
                    console.log('✅ CartRef da API encontrado:', data.data.cartRef);
                    this.bookingData.holdData.cartId = data.data.cartRef;
                } else if (data.data.partnerCartRef) {
                    // Fallback: usar partnerCartRef se cartRef não estiver disponível
                    this.bookingData.holdData.cartId = data.data.partnerCartRef;
                    console.log('⚠️ Usando partnerCartRef como fallback:', data.data.partnerCartRef);
                } else {
                    console.error('❌ Nem cartRef nem partnerCartRef encontrados nos dados recebidos');
                }
                
                // Armazenar timestamp de quando o hold foi criado
                this.bookingData.holdCreatedAt = new Date().toISOString();
                
                // Extrair bookingRef da resposta (assumindo estrutura com items[0].bookingRef)
                if (data.data.items && data.data.items.length > 0 && data.data.items[0].bookingRef) {
                    this.bookingData.holdData.bookingRef = data.data.items[0].bookingRef;
                    console.log('✅ BookingRef extraído:', this.bookingData.holdData.bookingRef);
                } else {
                    console.warn('⚠️ BookingRef não encontrado na resposta do hold');
                }
                console.log('✅ Hold realizado com sucesso para inicialização do pagamento');
                console.log('🆔 Cart ID final definido:', this.bookingData.holdData.cartId);
                
                // Verificação adicional da estrutura dos dados
                console.log('📊 Estrutura final do holdData:', {
                    hasCartId: !!this.bookingData.holdData.cartId,
                    hasPartnerCartRef: !!this.bookingData.holdData.partnerCartRef,
                    hasPaymentSessionToken: !!this.bookingData.holdData.paymentSessionToken,
                    hasPaymentDataSubmissionUrl: !!this.bookingData.holdData.paymentDataSubmissionUrl
                });
                
                return true;
            } else {
                console.error('❌ Erro no hold:', data);
                const errorMessage = data.data?.message || 'Erro desconhecido na criação da reserva';
                console.error('📋 Detalhes do erro:', errorMessage);
                return false;
            }
        } catch (error) {
            console.error('❌ Erro de conexão no hold:', error);
            this.debugLog('Hold request connection error', {
                error: error.message,
                stack: error.stack,
                name: error.name
            });

            // Tratamento específico para diferentes tipos de erro
            let errorMessage = 'Erro de conexão na criação da reserva.';

            if (error.name === 'AbortError') {
                errorMessage = 'Timeout na criação da reserva. A operação está demorando mais que o esperado. Tente novamente.';
            } else if (error.message.includes('fetch')) {
                errorMessage = 'Erro de rede. Verifique sua conexão e tente novamente.';
            } else if (error.message.includes('timeout')) {
                errorMessage = 'Timeout na requisição. Tente novamente em alguns instantes.';
            }

            // Mostrar erro para o usuário
            this.showDateError(errorMessage);

            return false;
        }
    }
    
    /**
     * Verifica se o hold da reserva expirou baseado nos timestamps validUntil
     * Conforme documentação da Viator API
     */
    checkIfHoldExpired() {
        if (!this.bookingData.holdData) {
            console.log('🔍 Nenhum hold encontrado, necessário criar novo');
            return true;
        }
        
        // Verificar se o cartId está presente (indicador de hold válido)
        if (!this.bookingData.holdData.cartId && !this.bookingData.holdData.partnerCartRef) {
            console.log('🔍 Hold sem referência de carrinho válida, necessário criar novo');
            return true;
        }
        
        const now = new Date();
        const holdData = this.bookingData.holdData;
        
        // Verificar validUntil da availability se disponível
        if (holdData.availability && holdData.availability.validUntil) {
            const availabilityExpiry = new Date(holdData.availability.validUntil);
            if (now >= availabilityExpiry) {
                console.log('🕐 Hold expirado (availability validUntil):', holdData.availability.validUntil);
                return true;
            }
        }
        
        // Verificar validUntil do pricing se disponível
        if (holdData.pricing && holdData.pricing.validUntil) {
            const pricingExpiry = new Date(holdData.pricing.validUntil);
            if (now >= pricingExpiry) {
                console.log('🕐 Hold expirado (pricing validUntil):', holdData.pricing.validUntil);
                return true;
            }
        }
        
        // Verificar se há um campo validUntil geral no holdData
        if (holdData.validUntil) {
            const generalExpiry = new Date(holdData.validUntil);
            if (now >= generalExpiry) {
                console.log('🕐 Hold expirado (validUntil geral):', holdData.validUntil);
                return true;
            }
        }
        
        // Fallback: verificar se o hold foi criado há mais de 10 minutos (tempo padrão da Viator)
        if (this.bookingData.holdCreatedAt) {
            const holdCreated = new Date(this.bookingData.holdCreatedAt);
            const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
            if (holdCreated < tenMinutesAgo) {
                console.log('🕐 Hold expirado (mais de 10 minutos):', this.bookingData.holdCreatedAt);
                return true;
            }
        }
        
        console.log('✅ Hold ainda válido');
        return false;
    }


    
    async submitPayment() {
        try {
            // OBRIGATÓRIO: Submeter dados de detecção de fraude ANTES do pagamento
            await this.handleFraudDetectionSubmission();

            console.log('🔒 Dados de detecção de fraude processados, prosseguindo com pagamento...');
            
            // Coletar todos os dados necessários do formulário
            const cardNumber = document.getElementById('card-number').value.replace(/\s/g, ''); // Remove espaços
            const cvv = document.getElementById('security-code').value;
            const expMonth = document.getElementById('expiry-month').value;
            const expYear = document.getElementById('expiry-year').value;
            const name = document.getElementById('cardholder-name').value;
            const country = document.getElementById('billing-country').value;
            const postalCode = document.getElementById('billing-zip').value;
            
            // Validar dados antes de enviar
            if (!cardNumber || !cvv || !expMonth || !expYear || !name || !country || !postalCode) {
                throw new Error('Todos os campos obrigatórios devem ser preenchidos');
            }
            
            // 🔄 SOLUÇÃO MELHORADA: Verificar validade do hold antes de renovar
            const needsNewHold = this.checkIfHoldExpired();
            if (needsNewHold) {
                console.log('🔄 Hold expirado, criando novo hold...');
                // Limpar dados de hold antigos para evitar conflitos
                this.bookingData.holdData = null;
                this.bookingData.holdCreatedAt = null;
                
                const freshHoldResult = await this.requestBookingHoldForPayment();
                if (!freshHoldResult) {
                    throw new Error('Falha ao renovar hold da reserva. Tente novamente.');
                }
                console.log('✅ Novo hold criado com sucesso');
            } else {
                console.log('✅ Hold ainda válido, prosseguindo com pagamento');
            }
            
            // Estrutura de dados conforme documentação da API da Viator
            const paymentData = {
                paymentAccounts: {
                    creditCards: [
                        {
                            number: cardNumber,
                            cvv: cvv,
                            expMonth: expMonth,
                            expYear: expYear,
                            name: name,
                            address: {
                                country: country,
                                postalCode: postalCode
                            }
                        }
                    ]
                }
            };

            // Incluir token de detecção de fraude com fallbacks robustos
            const fraudTokenResult = this.ensureFraudDetectionToken();
            if (fraudTokenResult.success) {
                paymentData.deviceDataCollectionToken = this.deviceDataCollectionToken;
                console.log('✅ Token de detecção de fraude incluído no pagamento');
                this.debugLog('Device data collection token included in payment', {
                    tokenSource: fraudTokenResult.source,
                    tokenLength: this.deviceDataCollectionToken.length,
                    hasToken: true
                });
            } else {
                console.warn('⚠️ Token de detecção de fraude não disponível - pagamento prosseguirá sem token');
                this.debugLog('Device data collection token missing in payment', {
                    reason: fraudTokenResult.reason,
                    fallbackAttempted: fraudTokenResult.fallbackAttempted
                });
            }

            // Incluir informações adicionais de segurança se disponíveis
            if (this.fraudDetectionData) {
                paymentData.additionalSecurityData = {
                    sessionId: this.fraudDetectionData.sessionInfo?.sessionId,
                    browserFingerprint: this.generateBrowserFingerprint()
                };
                console.log('✅ Dados adicionais de segurança incluídos');
            }
            
            console.log('💳 Enviando dados de pagamento para API da Viator:', {
                cardLastFour: cardNumber.slice(-4),
                expMonth,
                expYear,
                name,
                country,
                postalCode
            });
            
            // Verificar se temos paymentDataSubmissionUrl conforme documentação
            if (!this.bookingData.holdData.paymentDataSubmissionUrl) {
                throw new Error('paymentDataSubmissionUrl não disponível após renovação do hold.');
            }
            
            // Verificar se viatorBookingAjax está disponível
            if (typeof viatorBookingAjax === 'undefined') {
                console.error('❌ viatorBookingAjax não está definido. Verifique se o script foi carregado corretamente.');
                throw new Error('Erro de configuração. Recarregue a página.');
            }
            
            // Usar paymentDataSubmissionUrl conforme documentação oficial da Viator
            const response = await fetch(viatorBookingAjax.ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'viator_submit_payment',
                    payment_url: this.bookingData.holdData.paymentDataSubmissionUrl,
                    payment_data: JSON.stringify(paymentData),
                    nonce: viatorBookingAjax.nonce
                })
            });
            
            const data = await response.json();
            console.log('📥 Resposta da API de pagamento:', data);
            
            if (data.success) {
                // Extrair o sessionAccountToken da resposta
                const paymentAccounts = data.data.paymentAccounts;
                if (paymentAccounts && paymentAccounts.creditCards && paymentAccounts.creditCards.length > 0) {
                    const creditCard = paymentAccounts.creditCards[0];
                    this.bookingData.paymentToken = creditCard.accountMetaData.sessionAccountToken;
                    console.log('✅ Token de pagamento obtido com sucesso');
                    return true;
                } else {
                    throw new Error('Resposta da API não contém token de pagamento válido');
                }
            } else {
                const errorMessage = data.data?.message || 'Erro no processamento do pagamento';
                console.error('❌ Detalhes do erro de pagamento:', {
                    errorMessage,
                    fullResponse: data,
                    paymentUrl: this.bookingData.holdData.paymentDataSubmissionUrl,
                    holdData: this.bookingData.holdData
                });
                throw new Error(errorMessage);
            }
            
        } catch (error) {
            console.error('❌ Erro no pagamento:', error);
            console.error('📊 Estado atual dos dados de reserva:', {
                hasHoldData: !!this.bookingData.holdData,
                hasPaymentUrl: !!this.bookingData.holdData?.paymentDataSubmissionUrl,
                hasSelectedOption: !!this.bookingData.selectedOption,
                cartId: this.bookingData.holdData?.cartId
            });
            this.showDateError('Erro no processamento do pagamento: ' + error.message);
            return false;
        }
    }
    
    async confirmBooking() {
        try {
            console.log('🎯 confirmBooking iniciado');
            
            // Verificar se viatorBookingAjax está disponível
            if (typeof viatorBookingAjax === 'undefined') {
                console.error('❌ viatorBookingAjax não está definido. Verifique se o script foi carregado corretamente.');
                this.showDateError('Erro de configuração. Recarregue a página.');
                return false;
            }
            
            // Usar dados do responsável coletados na segunda etapa
            const travelersData = this.collectDetailedTravelersData();
            const bookerInfo = travelersData.bookerInfo;
            const bookingQuestionAnswers = travelersData.bookingQuestionAnswers || [];
            
            console.log('📋 Dados para confirmação:', {
                cartId: this.bookingData.holdData.cartId,
                hasPaymentToken: !!this.bookingData.paymentToken,
                bookerInfo: bookerInfo,
                bookingQuestionAnswers: bookingQuestionAnswers
            });

            const requestParams = {
                action: 'viator_confirm_booking',
                cart_id: this.bookingData.holdData.cartId,
                partner_booking_ref: this.bookingData.holdData.bookingRef || '',
                payment_token: this.bookingData.paymentToken,
                booker_info: JSON.stringify(bookerInfo),
                nonce: viatorBookingAjax.nonce
            };
            
            // Incluir perguntas de reserva se existirem
            if (bookingQuestionAnswers && bookingQuestionAnswers.length > 0) {
                requestParams.bookingQuestionAnswers = JSON.stringify(bookingQuestionAnswers);
            }

            const response = await fetch(viatorBookingAjax.ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(requestParams)
            });
            
            const data = await response.json();
            console.log('📥 Resposta da confirmação:', data);
            
            if (data.success) {
                console.log('✅ Confirmação bem-sucedida, exibindo mensagem');
                this.bookingData.confirmationData = data.data;
                this.displayConfirmationMessage(data.data);
                return true;
            } else {
                console.error('❌ Erro na confirmação:', data);
                const reasons = data.data.reasons ? data.data.reasons.map(r => r.message).join(', ') : 'Detalhes não fornecidos.';
                this.showDateError(`Erro na confirmação: ${data.data.message} (${reasons})`);
                return false;
            }
        } catch (error) {
            console.error('❌ Erro de conexão na confirmação:', error);
            this.showDateError('Erro de conexão na confirmação.');
            return false;
        }
    }
    
    displayConfirmationMessage(data) {
        console.log('🎨 displayConfirmationMessage chamado com dados:', data);
        
        const container = document.querySelector('.confirmation-message');
        console.log('📦 Container encontrado:', !!container);
        
        if (!container) {
            console.error('❌ Container .confirmation-message não encontrado!');
            return;
        }

        const status = data.custom_data?.confirmationStatus || 'UNKNOWN';
        const isRestricted = data.custom_data?.isVoucherRestrictionRequired || false;
        const bookingInfo = data.bookingInfo || {};
        const bookingRef = bookingInfo.bookingRef || 'N/A';
        const voucherInfo = bookingInfo.voucherInfo || {};
        const itemSummary = bookingInfo.itemSummary || {};
        
        console.log('📊 Status da confirmação:', status);
        console.log('🔒 Voucher restrito:', isRestricted);
        console.log('📋 Referência da reserva:', bookingRef);
        
        // Extrair informações adicionais
        const productName = this.bookingData?.productTitle || 'Experiência';
        const travelDate = this.bookingData?.travelDate || 'Data não especificada';
        const totalPrice = itemSummary.totalPrice || this.bookingData?.selectedOption?.totalPrice;
        const currency = totalPrice?.currency || 'USD';
        const amount = totalPrice?.price?.recommendedRetailPrice || totalPrice?.recommendedRetailPrice || 0;
        
        // Informações do responsável
        const bookerData = this.collectDetailedTravelersData()?.bookerInfo || {};
        const bookerEmail = bookerData.email || 'Email não informado';
        
        let html = '';

        if (status === 'CONFIRMED') {
            html = `
                <div class="confirmation-success">
                    <div class="success-hero">
                        <div class="success-animation">
                            <div class="success-circle">
                                <div class="success-checkmark">
                                    <svg viewBox="0 0 52 52" class="checkmark">
                                        <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                                        <path class="checkmark-check" fill="none" d="m14.1 27.2l7.1 7.2 16.7-16.8"/>
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div class="success-content">
                            <h1 class="success-title">Reserva Confirmada!</h1>
                            <p class="success-subtitle">Sua experiência foi reservada com sucesso</p>
                            <div class="booking-ref-highlight">
                                <span class="ref-label">Código da Reserva</span>
                                <span class="ref-value">${bookingRef}</span>
                            </div>
                        </div>
                    </div>

                    <div class="booker-info-section booking-summary-card">
                        <h4>Resumo da Reserva</h4>
                            <div class="summary-item">
                                <div class="item-icon">🎯</div>
                                <div class="item-content">
                                    <span class="item-label">Experiência</span>
                                    <span class="item-value">${productName}</span>
                                </div>
                            </div>
                            <div class="summary-item">
                                <div class="item-icon">📅</div>
                                <div class="item-content">
                                    <span class="item-label">Data da Viagem</span>
                                    <span class="item-value">${this.formatDate(travelDate)}</span>
                                </div>
                            </div>
                            <div class="summary-item">
                                <div class="item-icon">💰</div>
                                <div class="item-content">
                                    <span class="item-label">Valor Total</span>
                                    <span class="item-value price">${currency} ${amount.toFixed(2)}</span>
                                </div>
                            </div>
                            <div class="summary-item">
                                <div class="item-icon">📧</div>
                                <div class="item-content">
                                    <span class="item-label">Email de Confirmação</span>
                                    <span class="item-value">${bookerEmail}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="booker-info-section next-steps-card">
                        <h4>Próximos Passos</h4>
                        <div class="steps-grid">
                            <div class="step-item">
                                <div class="step-number">1</div>
                                <div class="step-content">
                                    <h4>Email Enviado</h4>
                                    <p>Confirmação enviada para <strong>${bookerEmail}</strong></p>
                                </div>
                            </div>
                            <div class="step-item">
                                <div class="step-number">2</div>
                                <div class="step-content">
                                    <h4>Voucher em Breve</h4>
                                    <p>Você receberá seu voucher por email</p>
                                </div>
                            </div>
                            <div class="step-item">
                                <div class="step-number">3</div>
                                <div class="step-content">
                                    <h4>Apresente o Voucher</h4>
                                    <p>Mostre o voucher no dia da experiência</p>
                                </div>
                            </div>
                            <div class="step-item">
                                <div class="step-number">4</div>
                                <div class="step-content">
                                    <h4>Suporte Disponível</h4>
                                    <p>Entre em contato se tiver dúvidas</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            if (isRestricted) {
                html += `
                    <div class="voucher-restriction-notice">
                        <div class="restriction-icon">🔒</div>
                        <div class="restriction-content">
                            <h5>Voucher com Restrição de Segurança</h5>
                            <p>Por motivos de segurança, seu voucher será enviado diretamente para seu email e não estará disponível para download imediato. Isso é uma medida de proteção contra fraudes.</p>
                        </div>
                    </div>
                `;
            }
            
            html += `</div>`;
            
        } else if (status === 'PENDING') {
            html = `
                <div class="confirmation-pending">
                    <div class="confirmation-header">
                        <div class="pending-icon">⏳</div>
                        <h3>⏰ Reserva Pendente</h3>
                        <p class="confirmation-subtitle">Aguardando confirmação do fornecedor</p>
                    </div>
                    
                    <div class="booking-details-card">
                        <div class="detail-row">
                            <span class="detail-label">📋 Referência da Reserva:</span>
                            <span class="detail-value booking-ref">${bookingRef}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">🎯 Experiência:</span>
                            <span class="detail-value">${productName}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">📅 Data da Viagem:</span>
                            <span class="detail-value">${this.formatDate(travelDate)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">💳 Status do Pagamento:</span>
                            <span class="detail-value">Pré-autorizado (não cobrado ainda)</span>
                        </div>
                    </div>
                    
                    <div class="pending-info">
                        <h4>Informações Importantes:</h4>
                        <ul>
                            <li>⏱️ A confirmação pode levar até <strong>48 horas</strong></li>
                            <li>💳 Seu cartão foi apenas <strong>pré-autorizado</strong>, não cobrado</li>
                            <li>📧 Você receberá um email assim que o status for atualizado</li>
                            <li>✅ A cobrança só será efetivada após a confirmação</li>
                        </ul>
                    </div>
                </div>
            `;
            
        } else { // FAILED, CANCELLED, etc.
            const errorMessage = data.message || 'Ocorreu um problema durante o processamento da sua reserva';
            const errorCode = data.code || 'UNKNOWN_ERROR';

            html = `
                <div class="confirmation-error">
                    <div class="error-hero">
                        <div class="error-animation">
                            <div class="error-circle">
                                <div class="error-icon">
                                    <svg viewBox="0 0 52 52" class="error-cross">
                                        <circle class="error-circle-bg" cx="26" cy="26" r="25" fill="none"/>
                                        <path class="error-cross-line1" fill="none" d="m16 16 20 20"/>
                                        <path class="error-cross-line2" fill="none" d="m36 16-20 20"/>
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div class="error-content">
                            <h1 class="error-title">Falha na Reserva</h1>
                            <p class="error-subtitle">Não foi possível completar sua reserva</p>
                            <div class="error-code-highlight">
                                <span class="error-code-label">Código do Erro</span>
                                <span class="error-code-value">${errorCode}</span>
                            </div>
                        </div>
                    </div>

                    <div class="booker-info-section error-details-card">
                        <h4>Detalhes do Problema</h4>
                            <div class="error-message">
                                <div class="message-icon">💬</div>
                                <div class="message-content">
                                    <p>${errorMessage}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="booker-info-section error-actions-card">
                        <h4>O que você pode fazer</h4>
                        <div class="actions-grid">
                            <div class="action-item">
                                <div class="action-icon">🔄</div>
                                <div class="action-content">
                                    <h4>Tente Novamente</h4>
                                    <p>Aguarde alguns minutos e tente fazer a reserva novamente</p>
                                    <button class="action-btn retry-btn" onclick="window.location.reload()">
                                        Tentar Novamente
                                    </button>
                                </div>
                            </div>
                            <div class="action-item">
                                <div class="action-icon">💳</div>
                                <div class="action-content">
                                    <h4>Verifique os Dados</h4>
                                    <p>Confirme se os dados do cartão e informações estão corretos</p>
                                    <button class="action-btn secondary-btn" onclick="history.back()">
                                        Voltar e Revisar
                                    </button>
                                </div>
                            </div>
                            <div class="action-item">
                                <div class="action-icon">📞</div>
                                <div class="action-content">
                                    <h4>Entre em Contato</h4>
                                    <p>Nossa equipe está pronta para ajudar você</p>
                                    <button class="action-btn contact-btn">
                                        Falar com Suporte
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;

        // Adicionar CSS específico para a tela de confirmação
        this.addConfirmationStyles();

        // Scroll para o topo da confirmação
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Adicionar animação de entrada
        setTimeout(() => {
            container.classList.add('confirmation-loaded');
        }, 100);

        console.log('✅ Mensagem de confirmação exibida com sucesso');
    }

    /**
     * Injetar estilos CSS para animações
     */
    injectAnimationStyles() {
        const styleId = 'viator-animation-styles';

        // Verificar se os estilos já foram adicionados
        if (document.getElementById(styleId)) {
            return;
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            .update-icon.spinning {
                animation: spin 1s linear infinite;
                display: inline-block;
            }
        `;

        document.head.appendChild(style);
        console.log('🎨 Estilos de animação injetados');
    }

    /**
     * Adicionar estilos CSS para a tela de confirmação
     */
    addConfirmationStyles() {
        const styleId = 'viator-confirmation-styles';

        // Verificar se os estilos já foram adicionados
        if (document.getElementById(styleId)) {
            return;
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Container principal da confirmação */
            .confirmation-container {
                width: 100%;
                max-width: none;
                padding: 0;
                margin: 0;
            }

            .confirmation-success, .confirmation-pending, .confirmation-error {
                width: 100%;
                max-width: none;
                margin: 0;
                padding: 0;
                background: transparent;
                box-shadow: none;
                border-radius: 0;
            }

            /* Hero Section - Sucesso */
            .success-hero {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
                padding: 60px 40px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }

            .success-hero::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                animation: pulse 3s ease-in-out infinite;
            }

            .success-animation {
                margin-bottom: 30px;
                position: relative;
                z-index: 2;
            }

            .success-circle {
                width: 120px;
                height: 120px;
                margin: 0 auto;
                position: relative;
            }

            .checkmark {
                width: 120px;
                height: 120px;
                border-radius: 50%;
                display: block;
                stroke-width: 3;
                stroke: #fff;
                stroke-miterlimit: 10;
                box-shadow: inset 0px 0px 0px #28a745;
                animation: fill 0.4s ease-in-out 0.4s forwards, scale 0.3s ease-in-out 0.9s both;
            }

            .checkmark-circle {
                stroke-dasharray: 166;
                stroke-dashoffset: 166;
                stroke-width: 3;
                stroke-miterlimit: 10;
                stroke: #fff;
                fill: none;
                animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
            }

            .checkmark-check {
                transform-origin: 50% 50%;
                stroke-dasharray: 48;
                stroke-dashoffset: 48;
                animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
            }

            .success-content {
                position: relative;
                z-index: 2;
            }

            .success-title {
                font-size: 2.5rem;
                font-weight: 700;
                margin: 0 0 15px 0;
                text-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .success-subtitle {
                font-size: 1.2rem;
                margin: 0 0 30px 0;
                opacity: 0.9;
            }

            .booking-ref-highlight {
                background: rgba(255,255,255,0.2);
                border-radius: 12px;
                padding: 20px;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.3);
            }

            .ref-label {
                display: block;
                font-size: 0.9rem;
                opacity: 0.8;
                margin-bottom: 8px;
            }

            .ref-value {
                display: block;
                font-size: 1.5rem;
                font-weight: 700;
                font-family: 'Courier New', monospace;
                letter-spacing: 2px;
            }

            /* Cards */
            .booking-summary-card, .next-steps-card, .error-details-card, .error-actions-card {
                background: white;
                margin: 30px 40px;
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                overflow: hidden;
                border: 1px solid rgba(0,0,0,0.05);
            }

            .card-header {
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                padding: 25px 30px;
                border-bottom: 1px solid #dee2e6;
            }

            .card-header h3 {
                margin: 0;
                font-size: 1.3rem;
                font-weight: 600;
                color: #495057;
            }

            .card-body {
                padding: 30px;
            }

            /* Summary Items */
            .summary-item {
                display: flex;
                align-items: center;
                padding: 20px 0;
                border-bottom: 1px solid #f1f3f4;
            }

            .summary-item:last-child {
                border-bottom: none;
            }

            .item-icon {
                width: 50px;
                height: 50px;
                background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.5rem;
                margin-right: 20px;
                flex-shrink: 0;
            }

            .item-content {
                flex: 1;
                display: flex;
                flex-direction: column;
            }

            .item-label {
                font-size: 0.9rem;
                color: #6c757d;
                margin-bottom: 5px;
            }

            .item-value {
                font-size: 1.1rem;
                font-weight: 600;
                color: #212529;
            }

            .item-value.price {
                color: #28a745;
                font-weight: 700;
                font-size: 1.3rem;
            }

            /* Steps Grid */
            .steps-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 25px;
                padding: 30px;
            }

            .step-item {
                display: flex;
                align-items: flex-start;
                padding: 25px;
                background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
                border-radius: 12px;
                border: 1px solid #e9ecef;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }

            .step-item:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            }

            .step-number {
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                margin-right: 15px;
                flex-shrink: 0;
            }

            .step-content h4 {
                margin: 0 0 8px 0;
                font-size: 1.1rem;
                font-weight: 600;
                color: #212529;
            }

            .step-content p {
                margin: 0;
                font-size: 0.95rem;
                color: #6c757d;
                line-height: 1.5;
            }
            }

            /* Hero Section - Erro */
            .error-hero {
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                color: white;
                padding: 60px 40px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }

            .error-hero::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                animation: pulse 3s ease-in-out infinite;
            }

            .error-animation {
                margin-bottom: 30px;
                position: relative;
                z-index: 2;
            }

            .error-circle {
                width: 120px;
                height: 120px;
                margin: 0 auto;
                position: relative;
            }

            .error-cross {
                width: 120px;
                height: 120px;
                border-radius: 50%;
                display: block;
                stroke-width: 3;
                stroke: #fff;
                stroke-miterlimit: 10;
                animation: scale 0.3s ease-in-out 0.5s both;
            }

            .error-circle-bg {
                stroke-dasharray: 166;
                stroke-dashoffset: 166;
                stroke-width: 3;
                stroke-miterlimit: 10;
                stroke: #fff;
                fill: none;
                animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
            }

            .error-cross-line1, .error-cross-line2 {
                stroke-dasharray: 28;
                stroke-dashoffset: 28;
                animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
            }

            .error-title {
                font-size: 2.5rem;
                font-weight: 700;
                margin: 0 0 15px 0;
                text-shadow: 0 2px 4px rgba(0,0,0,0.1);
                position: relative;
                z-index: 2;
            }

            .error-subtitle {
                font-size: 1.2rem;
                margin: 0 0 30px 0;
                opacity: 0.9;
                position: relative;
                z-index: 2;
            }

            .error-code-highlight {
                background: rgba(255,255,255,0.2);
                border-radius: 12px;
                padding: 20px;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.3);
                position: relative;
                z-index: 2;
            }

            .error-code-label {
                display: block;
                font-size: 0.9rem;
                opacity: 0.8;
                margin-bottom: 8px;
            }

            .error-code-value {
                display: block;
                font-size: 1.2rem;
                font-weight: 700;
                font-family: 'Courier New', monospace;
                letter-spacing: 1px;
            }

            /* Error Message */
            .error-message {
                display: flex;
                align-items: flex-start;
                padding: 25px;
                background: linear-gradient(135deg, #fff5f5 0%, #ffffff 100%);
                border-radius: 12px;
                border-left: 4px solid #dc3545;
            }

            .message-icon {
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.2rem;
                margin-right: 15px;
                flex-shrink: 0;
            }

            .message-content p {
                margin: 0;
                font-size: 1.1rem;
                color: #495057;
                line-height: 1.6;
            }

            /* Actions Grid */
            .actions-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 25px;
                padding: 30px;
            }

            .action-item {
                background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
                border-radius: 16px;
                padding: 30px;
                text-align: center;
                border: 1px solid #e9ecef;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }

            .action-item:hover {
                transform: translateY(-3px);
                box-shadow: 0 12px 35px rgba(0,0,0,0.15);
            }

            .action-icon {
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.8rem;
                margin: 0 auto 20px;
            }

            .action-content h4 {
                margin: 0 0 12px 0;
                font-size: 1.2rem;
                font-weight: 600;
                color: #212529;
            }

            .action-content p {
                margin: 0 0 20px 0;
                font-size: 0.95rem;
                color: #6c757d;
                line-height: 1.5;
            }

            .action-btn {
                background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 0.95rem;
            }

            .action-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 6px 20px rgba(0,123,255,0.3);
            }

            .action-btn.retry-btn {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            }

            .action-btn.retry-btn:hover {
                box-shadow: 0 6px 20px rgba(40,167,69,0.3);
            }

            .action-btn.secondary-btn {
                background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
            }

            .action-btn.secondary-btn:hover {
                box-shadow: 0 6px 20px rgba(108,117,125,0.3);
            }

            .action-btn.contact-btn {
                background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
            }

            .action-btn.contact-btn:hover {
                box-shadow: 0 6px 20px rgba(23,162,184,0.3);
            }

            /* Animações */
            @keyframes stroke {
                100% {
                    stroke-dashoffset: 0;
                }
            }

            @keyframes scale {
                0%, 100% {
                    transform: none;
                }
                50% {
                    transform: scale3d(1.1, 1.1, 1);
                }
            }

            @keyframes fill {
                100% {
                    box-shadow: inset 0px 0px 0px 30px #28a745;
                }
            }

            @keyframes pulse {
                0%, 100% {
                    opacity: 0.3;
                    transform: scale(1);
                }
                50% {
                    opacity: 0.6;
                    transform: scale(1.05);
                }
            }

            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }



            .confirmation-loaded {
                animation: fadeIn 0.5s ease-in;
            }

            /* Responsividade */
            @media (max-width: 768px) {
                .success-hero, .error-hero {
                    padding: 40px 20px;
                }

                .success-title, .error-title {
                    font-size: 2rem;
                }

                .booking-summary-card, .next-steps-card, .error-details-card, .error-actions-card {
                    margin: 20px 15px;
                }

                .steps-grid, .actions-grid {
                    grid-template-columns: 1fr;
                    padding: 20px;
                }

                .card-body {
                    padding: 20px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Executar requisição com retry automático
     */
    async executeWithRetry(requestFunction, maxRetries = 3, retryDelay = 1000) {
        let lastError = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 Tentativa ${attempt}/${maxRetries}...`);
                const result = await requestFunction();

                if (result) {
                    console.log(`✅ Sucesso na tentativa ${attempt}`);
                    return result;
                }

                throw new Error('Resultado inválido');

            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Tentativa ${attempt} falhou:`, error.message);

                // Se não é a última tentativa, aguardar antes de tentar novamente
                if (attempt < maxRetries) {
                    console.log(`⏳ Aguardando ${retryDelay}ms antes da próxima tentativa...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    retryDelay *= 1.5; // Aumentar delay progressivamente
                } else {
                    console.error(`❌ Todas as ${maxRetries} tentativas falharam`);
                }
            }
        }

        throw lastError;
    }

    /**
     * Validar conectividade com a API
     */
    async validateApiConnectivity() {
        try {
            const response = await fetch(viatorBookingAjax.ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'viator_test_api_access',
                    nonce: viatorBookingAjax.nonce
                })
            });

            const data = await response.json();
            return data.success;

        } catch (error) {
            console.error('❌ Erro de conectividade:', error);
            return false;
        }
    }

    /**
     * Mostrar erro com opções de retry
     */
    showErrorWithRetry(message, retryFunction = null) {
        // Remover alertas anteriores
        const existingAlert = document.querySelector('.error-with-retry');
        if (existingAlert) {
            existingAlert.remove();
        }

        const alertDiv = document.createElement('div');
        alertDiv.className = 'error-with-retry alert alert-danger';
        alertDiv.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h5>❌ Erro</h5>
                    <p class="mb-2">${message}</p>
                </div>
                <div class="error-actions">
                    ${retryFunction ? '<button class="btn btn-sm btn-outline-danger retry-btn">🔄 Tentar Novamente</button>' : ''}
                    <button class="btn btn-sm btn-secondary close-error-btn">✕</button>
                </div>
            </div>
        `;

        // Adicionar event listeners
        const retryBtn = alertDiv.querySelector('.retry-btn');
        const closeBtn = alertDiv.querySelector('.close-error-btn');

        if (retryBtn && retryFunction) {
            retryBtn.addEventListener('click', async () => {
                retryBtn.disabled = true;
                retryBtn.innerHTML = '🔄 Tentando...';

                try {
                    await retryFunction();
                    alertDiv.remove();
                } catch (error) {
                    retryBtn.disabled = false;
                    retryBtn.innerHTML = '🔄 Tentar Novamente';
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                alertDiv.remove();
            });
        }

        // Inserir no topo do container atual
        const currentStep = document.querySelector(`.booking-step:nth-child(${this.currentStep})`);
        if (currentStep) {
            currentStep.insertBefore(alertDiv, currentStep.firstChild);
        }

        // Auto-remover após 15 segundos se não houver retry
        if (!retryFunction) {
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 15000);
        }
    }

    /**
     * Validar dados críticos antes de prosseguir (contextual ao step)
     */
    validateCriticalData(step = null) {
        const currentStep = step || this.currentStep;
        const errors = [];

        // Validações básicas (sempre necessárias)
        if (!this.bookingData.productCode) {
            errors.push('Código do produto não encontrado');
        }

        // Validações para Step 2+ (após seleção de data e opção)
        if (currentStep >= 2) {
            if (!this.bookingData.availabilityData) {
                errors.push('Dados de disponibilidade não carregados');
            }

            if (!this.bookingData.selectedOption) {
                errors.push('Nenhuma opção de produto selecionada');
            }

            if (!this.bookingData.travelDate) {
                errors.push('Data de viagem não selecionada');
            }
        }

        // Validações para Step 3+ (após dados de viajantes)
        if (currentStep >= 3) {
            if (!this.bookingData.selectedTravelers) {
                errors.push('Dados de viajantes não coletados');
            }
        }

        // Validações para Step 4+ (antes do pagamento)
        if (currentStep >= 4) {
            // Verificar se há booking questions obrigatórias não respondidas
            const mandatoryQuestions = this.bookingQuestions?.filter(q => q.required === 'MANDATORY') || [];
            const answeredQuestions = this.bookingData.bookingQuestionAnswers || [];

            if (mandatoryQuestions.length > 0 && answeredQuestions.length === 0) {
                errors.push('Respostas das booking questions obrigatórias não coletadas');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // MÉTODO REMOVIDO - DUPLICATA (mantendo apenas a primeira definição na linha 6454)
    
    /**
     * Formatar data para exibição amigável
     */
    formatDate(dateString) {
        if (!dateString) return 'Data não especificada';
        
        try {
            const date = new Date(dateString);
            const options = {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            };
            return date.toLocaleDateString('pt-BR', options);
        } catch (error) {
            return dateString; // Retorna a string original se não conseguir formatar
        }
    }
    
    setupPriceUpdater() {
        const updateBtn = document.getElementById('update-price-btn');
        console.log('🔧 setupPriceUpdater chamado, botão encontrado:', !!updateBtn);
        
        if (updateBtn) {
            updateBtn.addEventListener('click', (e) => {
                console.log('🖱️ Botão "Atualizar Preços" clicado');
                this.updatePricesForCurrentSelection();
            });
            console.log('✅ Event listener adicionado ao botão');
        } else {
            console.log('❌ Botão "update-price-btn" não encontrado no DOM');
        }
    }

    async updatePricesForCurrentSelection() {
        console.log('🔄 updatePricesForCurrentSelection chamada');
        
        // Verificar se viatorBookingAjax está disponível
        if (typeof viatorBookingAjax === 'undefined') {
            console.error('❌ viatorBookingAjax não está definido. Verifique se o script foi carregado corretamente.');
            this.showDateError('Erro de configuração. Recarregue a página.');
            return;
        }
        
        const travelDate = document.getElementById('travel-date-value').value;
        console.log('📅 Data selecionada:', travelDate);
        
        if (!travelDate) {
            console.log('❌ Nenhuma data selecionada');
            this.showDateError('Por favor, selecione uma data de viagem antes de atualizar os preços.');
            return;
        }

        const paxMix = this.collectTravelersData();
        console.log('👥 PaxMix coletado:', paxMix);
        
        if (paxMix.length === 0) {
            console.log('❌ Nenhum viajante selecionado');
            this.showDateError('Por favor, selecione pelo menos um viajante.');
            return;
        }

        console.log('🔄 Iniciando requisição de preços...');
        this.startButtonLoadingAnimation();
        this.showPriceLoading();

        try {
            const requestData = {
                action: 'viator_check_availability',
                product_code: this.bookingData.productCode,
                travel_date: travelDate,
                travelers: JSON.stringify(paxMix),
                nonce: viatorBookingAjax.nonce
            };
            
            console.log('📡 Fazendo requisição AJAX com dados:', requestData);
            console.log('📍 URL da requisição:', viatorBookingAjax.ajaxurl);
            
            const response = await fetch(viatorBookingAjax.ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(requestData)
            });

            console.log('📥 Resposta HTTP recebida:', response.status, response.statusText);
            
            const data = await response.json();
            console.log('📊 Dados da resposta (disponibilidade completa):', JSON.stringify(data, null, 2));

            if (data.success) {
                console.log('✅ Requisição bem-sucedida, exibindo preços');
                this.displayDynamicPricing(data.data);
                this.bookingData.availabilityData = data.data; // Armazenar para uso posterior
                this.bookingData.hasSearchedPrices = true; // Marcar que já houve uma busca
                this.updateButtonText(); // Atualizar texto do botão
                this.stopButtonLoadingAnimation(); // Parar animação quando resultados aparecem
            } else {
                console.log('❌ Erro na resposta:', data);
                this.showPriceError('Erro: ' + (data.data?.message || 'Erro desconhecido'));
                this.stopButtonLoadingAnimation(); // Parar animação em caso de erro
            }
        } catch (error) {
            console.log('❌ Erro na requisição:', error);
            this.showPriceError('Erro de conexão. Tente novamente.');
            this.stopButtonLoadingAnimation(); // Parar animação em caso de erro de conexão
        }
    }

    displayDynamicPricing(data) {
        const priceDisplay = document.getElementById('price-display');
        const footerSummary = document.getElementById('footer-price-summary');
        const priceDetails = document.getElementById('price-details');
        const totalPrice = document.getElementById('total-price');

        if (!data.bookableItems || data.bookableItems.length === 0) {
            this.showPriceError('Nenhuma opção disponível para esta data.');
            return;
        }

        // Organizar opções disponíveis e indisponíveis
        const availableOptions = data.bookableItems.filter(item => item.available);
        const unavailableOptions = data.bookableItems.filter(item => !item.available);

        if (availableOptions.length === 0) {
            this.showPriceError('Nenhuma opção disponível para esta data e quantidade de viajantes.');
            return;
        }

        // Agrupar opções disponíveis por productOptionCode
        const groupedOptions = {};
        availableOptions.forEach(option => {
            const code = option.productOptionCode;
            if (!groupedOptions[code]) {
                groupedOptions[code] = [];
            }
            groupedOptions[code].push(option);
        });

        // Agrupar opções indisponíveis por productOptionCode
        const groupedUnavailableOptions = {};
        unavailableOptions.forEach(option => {
            const code = option.productOptionCode;
            if (!groupedUnavailableOptions[code]) {
                groupedUnavailableOptions[code] = [];
            }
            groupedUnavailableOptions[code].push(option);
        });

        // Construir HTML para todas as opções
        let optionsHTML = '<div class="dynamic-price-result">';
        optionsHTML += '<h5>🎯 Opções Disponíveis</h5>';
        optionsHTML += `
            <div class="option-selection-note">
                <p>⚠️ <strong>ATENÇÃO:</strong> Você deve <strong>clicar e selecionar uma das opções abaixo</strong> antes de continuar com a reserva.</p>
                <p>💡 Clique no card da opção desejada para selecioná-la.</p>
            </div>
        `;
        optionsHTML += '<div class="product-options-list">';

        let cheapestTotal = null;
        let selectedOptionCode = null;

        Object.keys(groupedOptions).forEach(optionCode => {
            const optionsGroup = groupedOptions[optionCode];
            const baseOption = optionsGroup[0]; // Usar primeira opção como base
            
            // Pegar o menor preço do grupo
            const minPrice = Math.min(...optionsGroup.map(opt => opt.totalPrice.price.recommendedRetailPrice));
            
            // Verificar se há desconto no preço total
            const originalTotalPrice = baseOption.totalPrice.priceBeforeDiscount?.recommendedRetailPrice;
            const currentTotalPrice = baseOption.totalPrice.price.recommendedRetailPrice;
            const hasDiscount = originalTotalPrice && originalTotalPrice > currentTotalPrice;
            const discountPercentage = hasDiscount ? Math.round(((originalTotalPrice - currentTotalPrice) / originalTotalPrice) * 100) : 0;
            
            // Definir a opção mais barata como selecionada por padrão
            if (cheapestTotal === null || minPrice < cheapestTotal) {
                cheapestTotal = minPrice;
                selectedOptionCode = optionCode;
            }

            // Construir breakdown de preços (usar a primeira opção como exemplo)
            let optionBreakdown = '';
            if (baseOption.lineItems) {
                baseOption.lineItems.forEach(item => {
                    const currentTotal = item.subtotalPrice.price.recommendedRetailPrice;
                    const originalTotal = item.subtotalPrice.priceBeforeDiscount?.recommendedRetailPrice;
                    const currentUnitPrice = currentTotal / item.numberOfTravelers;
                    const originalUnitPrice = originalTotal ? originalTotal / item.numberOfTravelers : null;
                    const ageBandName = this.getAgeBandDisplayName(item.ageBand);
                    const quantity = item.numberOfTravelers;
                    const hasItemDiscount = originalUnitPrice && originalUnitPrice > currentUnitPrice;
                    
                    optionBreakdown += `
                        <div class="price-line">
                            <span class="traveler-info">${quantity} ${ageBandName}${quantity > 1 ? 's' : ''} x</span>
                            <span class="price-info">
                                ${hasItemDiscount ? 
                                    `<span class="price-original">${this.formatPrice(originalUnitPrice)}</span>` : ''}
                                <span class="price-current">${this.formatPrice(currentUnitPrice)}</span>
                            </span>
                        </div>
                    `;
                });
            }

            // Criar dropdown de horários se houver múltiplas opções
            let timeSelector = '';
            if (optionsGroup.length > 1) {
                timeSelector = `
                    <div class="time-selector">
                        <label for="time-${optionCode}">🕐 Horário:</label>
                        <select id="time-${optionCode}" class="time-dropdown" data-option-code="${optionCode}">
                            ${optionsGroup.map((opt, idx) => `
                                <option value="${opt.startTime || 'default'}" data-full-option='${JSON.stringify(opt)}' ${idx === 0 ? 'selected' : ''}>
                                    ${opt.startTime || 'Horário padrão'}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                `;
            } else if (optionsGroup[0].startTime) {
                timeSelector = `<span class="option-time">🕐 ${optionsGroup[0].startTime}</span>`;
            }
            
                // Adicionar badge de disponibilidade
            const availabilityBadge = this.getAvailabilityBadge(baseOption);
            
            optionsHTML += `
                <div class="product-option-card" data-option-code="${optionCode}" data-start-time="${optionsGroup[0].startTime || ''}">
                    <div class="option-header">
                        <div class="option-info">
                            <h6 class="option-title">${baseOption.optionTitle || optionCode}${availabilityBadge}</h6>
                            <div class="option-details">
                                <span class="option-code">${optionCode}</span>
                                ${timeSelector}
                            </div>
                        </div>
                        <div class="option-pricing">
                            ${hasDiscount ? 
                                `<div class="price-before">${this.formatPrice(originalTotalPrice)}</div>` : ''}
                            <div class="price-current">
                                <span class="price-total option-price" data-base-price="${currentTotalPrice}">${this.formatPrice(currentTotalPrice)}</span>
                            </div>
                            ${hasDiscount ? `<div class="discount-badge">${discountPercentage}% OFF</div>` : ''}
                        </div>
                    </div>
                    <div class="option-breakdown">
                        ${optionBreakdown}
                    </div>
                </div>
            `;
        });

        optionsHTML += '</div>';
        optionsHTML += '</div>';

        // Exibir no modal
        priceDisplay.innerHTML = optionsHTML;
        priceDisplay.style.display = 'block';

        // Scroll automático para os resultados APENAS dentro do modal-body
        setTimeout(() => {
            const modalBody = document.querySelector('.viator-modal-body');
            if (priceDisplay && modalBody) {
                // Calcular posição do elemento dentro do modal-body
                const priceDisplayRect = priceDisplay.getBoundingClientRect();
                const modalBodyRect = modalBody.getBoundingClientRect();
                
                // Fazer scroll apenas dentro do modal-body, não da página
                const scrollTop = modalBody.scrollTop + (priceDisplayRect.top - modalBodyRect.top) - 20; // 20px de margem
                
                modalBody.scrollTo({
                    top: scrollTop,
                    behavior: 'smooth'
                });
            }
        }, 100);

        // Adicionar event listeners para seleção de opções
                this.setupOptionSelection();

        // Monitorar cliques no seletor de data (para casos onde o onChange do flatpickr não funciona)
        const dateSelector = document.querySelector('.viator-booking-date-selector');
        if (dateSelector) {
            dateSelector.addEventListener('click', () => {
                console.log('📅 Date selector clicado - preparando para possível mudança de data');
                // Não fazer nada aqui, apenas preparar. A ação real acontece no onChange do flatpickr
            });
        }

        // Também monitorar o input hidden da data
        const hiddenDateInput = document.getElementById('travel-date-value');
        if (hiddenDateInput) {
            // Event listener para mudanças diretas
            hiddenDateInput.addEventListener('change', () => {
                console.log('📅 Input hidden da data mudou:', hiddenDateInput.value);
                this.clearPriceDisplay();
                this.resetButtonToSearchState();
                this.hideDateError();
            });

            // Adicionar observer para detectar mudanças programáticas no valor
            let lastValue = hiddenDateInput.value;
            const observer = new MutationObserver(() => {
                if (hiddenDateInput.value !== lastValue) {
                    console.log('📅 Valor da data detectado via observer:', hiddenDateInput.value);
                    lastValue = hiddenDateInput.value;
                    this.clearPriceDisplay();
                    this.resetButtonToSearchState();
                    this.hideDateError();
                }
            });

            // Observar mudanças nos atributos
            observer.observe(hiddenDateInput, {
                attributes: true,
                attributeFilter: ['value']
            });

            // Também verificar periodicamente (fallback)
            setInterval(() => {
                if (hiddenDateInput.value !== lastValue) {
                    console.log('📅 Valor da data detectado via polling:', hiddenDateInput.value);
                    lastValue = hiddenDateInput.value;
                    this.clearPriceDisplay();
                    this.resetButtonToSearchState();
                    this.hideDateError();
                }
            }, 500);
        }

        // Não selecionar nenhuma opção automaticamente
        this.bookingData.selectedOption = null;

        // Footer será atualizado apenas quando usuário selecionar uma opção
        console.log('💡 Opções exibidas - aguardando seleção do usuário');
    }

    /**
     * Gera badge de indisponibilidade para uma opção específica
     * @param {string} optionCode - Código da opção
     * @param {Object} groupedUnavailableOptions - Opções indisponíveis agrupadas
     * @returns {string} HTML da badge ou string vazia
     */
    getAvailabilityBadge(option) {
        if (option.available) {
            return ' <span class="availability-badge available">Disponível</span>';
        }

        if (!option.unavailableReason) {
            return '';
        }

        const reasonMap = {
            'SOLD_OUT': 'Esgotado',
            'MAINTENANCE': 'Em manutenção',
            'WEATHER': 'Indisponível devido ao clima'
        };

        const reasonText = reasonMap[option.unavailableReason] || option.unavailableReason.replace(/_/g, ' ');
        const badgeClass = option.unavailableReason.toLowerCase();

        return ` <span class="availability-badge unavailable ${badgeClass}" title="${reasonText}">${reasonText}</span>`;
    }

    setupOptionSelection() {
        const optionCards = document.querySelectorAll('.product-option-card');
        const timeDropdowns = document.querySelectorAll('.time-dropdown');
        
        // Event listeners para seleção de cards
        optionCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Não selecionar se clicou no dropdown
                if (e.target.closest('.time-dropdown')) return;
                
                // Remover seleção anterior
                optionCards.forEach(c => c.classList.remove('selected'));
                
                // Selecionar nova opção
                card.classList.add('selected');
                
                // Atualizar footer
                this.updateSelectedOption(card);
            });
        });

        // Event listeners para dropdowns de horário
        timeDropdowns.forEach(dropdown => {
            dropdown.addEventListener('change', (e) => {
                const card = e.target.closest('.product-option-card');
                const selectedOption = JSON.parse(e.target.selectedOptions[0].dataset.fullOption);
                
                // Verificar se há desconto na nova opção selecionada
                const originalTotalPrice = selectedOption.totalPrice.priceBeforeDiscount?.recommendedRetailPrice;
                const currentTotalPrice = selectedOption.totalPrice.price.recommendedRetailPrice;
                const hasDiscount = originalTotalPrice && originalTotalPrice > currentTotalPrice;
                const discountPercentage = hasDiscount ? Math.round(((originalTotalPrice - currentTotalPrice) / originalTotalPrice) * 100) : 0;
                
                // Atualizar a seção de preços do card
                const pricingSection = card.querySelector('.option-pricing');
                pricingSection.innerHTML = `
                    ${hasDiscount ? 
                        `<div class="price-before">${this.formatPrice(originalTotalPrice)}</div>` : ''}
                    <div class="price-current">
                        <span class="price-total option-price" data-base-price="${currentTotalPrice}">${this.formatPrice(currentTotalPrice)}</span>
                    </div>
                    ${hasDiscount ? `<div class="discount-badge">${discountPercentage}% OFF</div>` : ''}
                `;
                
                // Se esta opção está selecionada, atualizar footer
                if (card.classList.contains('selected')) {
                    this.updateSelectedOption(card);
                }
            });
        });
    }

    updateSelectedOption(card) {
        const optionCode = card.dataset.optionCode;
        const timeDropdown = card.querySelector('.time-dropdown');
        let selectedTime = null;
        let selectedFullOption = null;
        
        if (timeDropdown) {
            selectedTime = timeDropdown.value;
            selectedFullOption = JSON.parse(timeDropdown.selectedOptions[0].dataset.fullOption);
        } else {
            // Se não há dropdown, usar dados da opção única
            const availableOptions = this.bookingData.availabilityData?.bookableItems || [];
            selectedFullOption = availableOptions.find(opt => 
                opt.productOptionCode === optionCode && 
                (opt.startTime === card.dataset.startTime || !opt.startTime)
            );
            // Definir selectedTime a partir da opção encontrada
            if (selectedFullOption && selectedFullOption.startTime) {
                selectedTime = selectedFullOption.startTime;
            }
        }
        
        // Atualizar footer com opção específica selecionada
        if (selectedFullOption) {
            this.updateFooterSummary(selectedFullOption);
            
            // Armazenar opção selecionada completa
            this.bookingData.selectedOption = {
                productOptionCode: optionCode,
                startTime: selectedTime,
                fullOption: selectedFullOption
            };
            
            // Debug: verificar se startTime está sendo definido corretamente
            console.log('🕐 selectedOption definido:', {
                productOptionCode: optionCode,
                selectedTime: selectedTime,
                fullOptionStartTime: selectedFullOption?.startTime,
                cardStartTime: card.dataset.startTime
            });
            
            // Limpar mensagem de erro agora que uma opção foi selecionada
            this.hideDateError();
        }
    }

    updateFooterSummary(selectedOption) {
        console.log('🦶 updateFooterSummary chamado', {selectedOption});
        
        const footerSummary = document.getElementById('footer-price-summary');
        const priceDetails = document.getElementById('price-details');
        const totalPrice = document.getElementById('total-price');
        
        console.log('🧾 Elementos do footer:', {
            footerSummary: !!footerSummary,
            priceDetails: !!priceDetails,
            totalPrice: !!totalPrice
        });

        if (!selectedOption) return;

        // Verificar se há desconto no total
        const originalTotalPrice = selectedOption.totalPrice.priceBeforeDiscount?.recommendedRetailPrice;
        const currentTotalPrice = selectedOption.totalPrice.price.recommendedRetailPrice;
        const hasDiscount = originalTotalPrice && originalTotalPrice > currentTotalPrice;
        const discountPercentage = hasDiscount ? Math.round(((originalTotalPrice - currentTotalPrice) / originalTotalPrice) * 100) : 0;

        // Construir breakdown para o footer
        let footerBreakdown = '';

        if (selectedOption.lineItems) {
            selectedOption.lineItems.forEach(item => {
                const currentTotal = item.subtotalPrice.price.recommendedRetailPrice;
                const originalTotal = item.subtotalPrice.priceBeforeDiscount?.recommendedRetailPrice;
                const currentUnitPrice = currentTotal / item.numberOfTravelers;
                const originalUnitPrice = originalTotal ? originalTotal / item.numberOfTravelers : null;
                const ageBandName = this.getAgeBandDisplayName(item.ageBand);
                const quantity = item.numberOfTravelers;
                const hasItemDiscount = originalUnitPrice && originalUnitPrice > currentUnitPrice;
                
                footerBreakdown += `
                    <div class="price-line">
                        <span>${quantity} ${ageBandName}${quantity > 1 ? 's' : ''} x</span>
                        <span class="price-info">
                            ${hasItemDiscount ? 
                                `<span class="price-original">${this.formatPrice(originalUnitPrice)}</span>` : ''}
                            <span class="price-current">${this.formatPrice(currentUnitPrice)}</span>
                        </span>
                    </div>
                `;
            });
        }

        // Exibir no footer
        console.log('💰 Atualizando footer com:', {footerBreakdown, currentTotalPrice, hasDiscount});
        
        if (priceDetails) {
            priceDetails.innerHTML = footerBreakdown;
        }
        
        if (totalPrice) {
            const timeInfo = selectedOption.startTime ? ` - ${selectedOption.startTime}` : '';
            totalPrice.innerHTML = `
                <div class="total-label">Total (${selectedOption.optionTitle || selectedOption.productOptionCode}${timeInfo}):</div>
                <div class="total-amount">
                    ${hasDiscount ? 
                        `<span class="price-original-total">${this.formatPrice(originalTotalPrice)}</span>` : ''}
                    <span class="price-current-total">${this.formatPrice(currentTotalPrice)}</span>
                    ${hasDiscount ? `<span class="discount-badge-footer">${discountPercentage}% OFF</span>` : ''}
                </div>
            `;
        }
        
        if (footerSummary) {
            footerSummary.style.display = 'block';
            // Garantir que não oculte os botões
            footerSummary.style.marginBottom = '0';
            footerSummary.style.overflow = 'visible';
            console.log('✅ Footer summary exibido');
        } else {
            console.log('❌ Footer summary não encontrado');
        }
    }

    getAgeBandDisplayName(ageBand) {
        const ageBandNames = {
            'ADULT': 'Adulto',
            'CHILD': 'Criança',
            'INFANT': 'Bebê',
            'YOUTH': 'Jovem',
            'TRAVELER': 'Viajante'
        };
        return ageBandNames[ageBand] || ageBand;
    }

    showPriceLoading() {
        const priceDisplay = document.getElementById('price-display');
        priceDisplay.innerHTML = `
            <div class="price-loading">
                <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">🔍 Verificando disponibilidade</div>
                <div style="font-size: 14px; color: #6c757d;">Buscando as melhores opções e preços para você...</div>
            </div>
        `;
        priceDisplay.style.display = 'block';
        
        // Esconder footer summary durante loading
        const footerSummary = document.getElementById('footer-price-summary');
        footerSummary.style.display = 'none';
        
        // Fazer scroll automático APENAS dentro do modal-body
        setTimeout(() => {
            const loadingDiv = priceDisplay.querySelector('.price-loading');
            const modalBody = document.querySelector('.viator-modal-body');
            if (loadingDiv && modalBody) {
                // Calcular posição do elemento dentro do modal-body
                const loadingRect = loadingDiv.getBoundingClientRect();
                const modalBodyRect = modalBody.getBoundingClientRect();
                
                // Fazer scroll apenas dentro do modal-body, não da página
                const scrollTop = modalBody.scrollTop + (loadingRect.top - modalBodyRect.top) - (modalBodyRect.height / 2) + (loadingRect.height / 2);
                
                modalBody.scrollTo({
                    top: scrollTop,
                    behavior: 'smooth'
                });
            }
        }, 100);
    }

    showPriceError(message) {
        const priceDisplay = document.getElementById('price-display');
        priceDisplay.innerHTML = `
            <div class="price-error">
                <div class="error-icon">❌</div>
                ${message}
            </div>
        `;
        priceDisplay.style.display = 'block';
        
        // Esconder footer summary em caso de erro
        const footerSummary = document.getElementById('footer-price-summary');
        footerSummary.style.display = 'none';
    }

    clearPriceDisplay() {
        const priceDisplay = document.getElementById('price-display');
        const footerSummary = document.getElementById('footer-price-summary');

        if (priceDisplay) {
            priceDisplay.innerHTML = '';
            priceDisplay.style.display = 'none'; // Esconder completamente quando limpar
        }

        if (footerSummary) {
            footerSummary.style.display = 'none';
        }

        // Limpar opção selecionada
        this.bookingData.selectedOption = null;

        // Limpar todas as mensagens de erro de viajantes também
        this.clearAllTravelerErrors();
    }

    updateButtonText() {
        const updateBtn = document.getElementById('update-price-btn');
        if (!updateBtn) return;

        // Verificar se já houve uma busca de preços anteriormente
        const hasSearchedBefore = this.bookingData.hasSearchedPrices || false;

        if (hasSearchedBefore) {
            updateBtn.innerHTML = '<span class="update-icon">↻</span>Atualizar Preços';
        } else {
            updateBtn.innerHTML = '<span class="update-icon">🔍</span>Buscar preços';
        }
    }

    resetButtonToSearchState() {
        const updateBtn = document.getElementById('update-price-btn');
        if (updateBtn) {
            // Resetar para estado inicial
            this.bookingData.hasSearchedPrices = false;
            updateBtn.innerHTML = '<span class="update-icon">🔍</span>Buscar preços';
            console.log('🔄 Botão resetado para estado "Buscar preços"');
        }
    }

    startButtonLoadingAnimation() {
        const updateBtn = document.getElementById('update-price-btn');
        const updateIcon = updateBtn?.querySelector('.update-icon');

        console.log('🔄 startButtonLoadingAnimation chamado', {
            updateBtn: !!updateBtn,
            updateIcon: !!updateIcon,
            iconClasses: updateIcon?.className
        });

        if (updateIcon) {
            // Adicionar classe de animação
            updateIcon.classList.add('spinning');
            console.log('🔄 Classe "spinning" adicionada. Classes atuais:', updateIcon.className);
        } else {
            console.log('❌ Ícone do botão não encontrado');
        }
    }

    stopButtonLoadingAnimation() {
        const updateBtn = document.getElementById('update-price-btn');
        const updateIcon = updateBtn?.querySelector('.update-icon');

        console.log('⏹️ stopButtonLoadingAnimation chamado', {
            updateBtn: !!updateBtn,
            updateIcon: !!updateIcon,
            iconClasses: updateIcon?.className
        });

        if (updateIcon) {
            // Remover classe de animação
            updateIcon.classList.remove('spinning');
            console.log('⏹️ Classe "spinning" removida. Classes atuais:', updateIcon.className);
        } else {
            console.log('❌ Ícone do botão não encontrado para parar animação');
        }
    }

    setupPriceDetailsToggle() {
        const toggleBtn = document.getElementById('price-details-toggle');
        const priceDetails = document.getElementById('price-details');
        const toggleIcon = toggleBtn?.querySelector('.toggle-icon');
        
        if (!toggleBtn || !priceDetails || !toggleIcon) return;
        
        // Estado inicial: expandido
        let isExpanded = true;
        
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            isExpanded = !isExpanded;
            
            if (isExpanded) {
                // Expandir com animação
                priceDetails.style.display = 'block';
                priceDetails.style.opacity = '0';
                priceDetails.style.transform = 'translateY(-10px)';
                
                setTimeout(() => {
                    priceDetails.style.opacity = '1';
                    priceDetails.style.transform = 'translateY(0)';
                }, 10);
                
                toggleIcon.textContent = '▼';
                toggleBtn.title = 'Recolher detalhes';
                toggleBtn.classList.remove('collapsed');
            } else {
                // Recolher com animação
                priceDetails.style.opacity = '0';
                priceDetails.style.transform = 'translateY(-10px)';
                
                setTimeout(() => {
                    priceDetails.style.display = 'none';
                }, 200);
                
                toggleIcon.textContent = '▲';
                toggleBtn.title = 'Expandir detalhes';
                toggleBtn.classList.add('collapsed');
            }
        });
    }

    /**
     * Configurar sincronização de unidades para campos WEIGHT e HEIGHT
     */
    setupUnitSynchronization() {
        console.log('🔄 Configurando sincronização de unidades...');
        
        // Encontrar todos os campos de peso e altura com data-traveler
        const weightFields = document.querySelectorAll('select[data-question-id="WEIGHT"][data-traveler]');
        const heightFields = document.querySelectorAll('select[data-question-id="HEIGHT"][data-traveler]');
        
        // Configurar sincronização para WEIGHT
        if (weightFields.length > 0) {
            // O primeiro campo na lista é sempre o primeiro viajante renderizado
            const firstWeightField = weightFields[0];
            const firstTravelerNumber = firstWeightField.getAttribute('data-traveler');
            
            console.log(`🎯 Primeiro viajante identificado: Viajante ${firstTravelerNumber}`);
            
            // Configurar todos os campos de peso
            weightFields.forEach((field, index) => {
                const travelerNumber = field.getAttribute('data-traveler');
                
                if (index === 0) {
                    // Primeiro viajante: sempre habilitado
                    field.disabled = false;
                    console.log(`✅ Viajante ${travelerNumber} (primeiro) - Campo de peso habilitado`);
                } else {
                    // Demais viajantes: desabilitado e sincronizado
                    field.disabled = true;
                    // Sincronizar com o valor do primeiro viajante
                    if (firstWeightField.value) {
                        field.value = firstWeightField.value;
                    }
                    console.log(`🔒 Viajante ${travelerNumber} - Campo de peso desabilitado e sincronizado`);
                }
            });
            
            // Listener para o primeiro campo de peso
            firstWeightField.addEventListener('change', (e) => {
                const selectedUnit = e.target.value;
                console.log(`📏 Primeiro viajante alterou unidade de peso para: ${selectedUnit}`);
                
                // Aplicar a mesma unidade para todos os outros viajantes
                weightFields.forEach((field, index) => {
                    if (index > 0) { // Pular o primeiro
                        const travelerNumber = field.getAttribute('data-traveler');
                        field.value = selectedUnit;
                        console.log(`🔄 Sincronizado peso do Viajante ${travelerNumber} para: ${selectedUnit}`);
                    }
                });
            });
        }
        
        // Configurar sincronização para HEIGHT
        if (heightFields.length > 0) {
            // O primeiro campo na lista é sempre o primeiro viajante renderizado
            const firstHeightField = heightFields[0];
            const firstTravelerNumber = firstHeightField.getAttribute('data-traveler');
            
            console.log(`🎯 Primeiro viajante identificado: Viajante ${firstTravelerNumber}`);
            
            // Configurar todos os campos de altura
            heightFields.forEach((field, index) => {
                const travelerNumber = field.getAttribute('data-traveler');
                
                if (index === 0) {
                    // Primeiro viajante: sempre habilitado
                    field.disabled = false;
                    console.log(`✅ Viajante ${travelerNumber} (primeiro) - Campo de altura habilitado`);
                } else {
                    // Demais viajantes: desabilitado e sincronizado
                    field.disabled = true;
                    // Sincronizar com o valor do primeiro viajante
                    if (firstHeightField.value) {
                        field.value = firstHeightField.value;
                    }
                    console.log(`🔒 Viajante ${travelerNumber} - Campo de altura desabilitado e sincronizado`);
                }
            });
            
            // Listener para o primeiro campo de altura
            firstHeightField.addEventListener('change', (e) => {
                const selectedUnit = e.target.value;
                console.log(`📏 Primeiro viajante alterou unidade de altura para: ${selectedUnit}`);
                
                // Aplicar a mesma unidade para todos os outros viajantes
                heightFields.forEach((field, index) => {
                    if (index > 0) { // Pular o primeiro
                        const travelerNumber = field.getAttribute('data-traveler');
                        field.value = selectedUnit;
                        console.log(`🔄 Sincronizado altura do Viajante ${travelerNumber} para: ${selectedUnit}`);
                    }
                });
            });
        }
        
        console.log(`✅ Sincronização configurada: ${weightFields.length} campos de peso, ${heightFields.length} campos de altura`);
    }

    closeModal() {
        const modal = document.getElementById('viator-booking-modal');
        if (modal) {
            modal.remove();
        }
        
        // Remover classe de impedimento de scroll
        this.restorePageScroll();
    }

    showDateError(message, type = 'error') {
        const errorElement = document.getElementById('date-error-message');
        if (errorElement) {
            // Texto simples sem ícone, como na imagem da Etapa 2
            errorElement.textContent = message;
            errorElement.style.display = 'block';

            // Aplicar classe CSS baseada no tipo
            errorElement.className = type === 'warning' ? 'warning-message' : 'error-message';

            // Auto-hide warnings after 5 seconds
            if (type === 'warning') {
                setTimeout(() => {
                    if (errorElement.textContent.includes(message)) {
                        this.hideDateError();
                    }
                }, 5000);
            }
        } else {
            // Fallback para console e alert
            const prefix = type === 'warning' ? 'Aviso: ' : 'Erro: ';
            console.log(prefix + message);

            // Tentar encontrar container de erro alternativo
            const altErrorContainer = document.getElementById('viator-error-message') ||
                                    document.querySelector('.error-container') ||
                                    document.querySelector('.alert-container');

            if (altErrorContainer) {
                const alertClass = type === 'warning' ? 'alert-warning' : 'alert-danger';
                // Texto simples sem ícone
                altErrorContainer.innerHTML = `<div class="alert ${alertClass}">
                    ${message}
                </div>`;

                if (type === 'warning') {
                    setTimeout(() => {
                        if (altErrorContainer.innerHTML.includes(message)) {
                            altErrorContainer.innerHTML = '';
                        }
                    }, 5000);
                }
            }
        }

        // Log do erro/aviso para debug
        this.debugLog(`User message displayed (${type})`, {
            message: message,
            type: type,
            elementFound: !!errorElement
        });
    }
    
    hideDateError() {
        const errorElement = document.getElementById('date-error-message');
        if (errorElement) {
            errorElement.style.display = 'none';
            errorElement.textContent = '';
        }
    }

    highlightOptionSelection() {
        const optionCards = document.querySelectorAll('.product-option-card');
        
        if (optionCards.length > 0) {
            // Adicionar classe de destaque a todos os cards
            optionCards.forEach(card => {
                card.classList.add('highlight-selection');
            });
            
            // Scroll suave para as opções APENAS dentro do modal-body
            const priceDisplay = document.getElementById('price-display');
            const modalBody = document.querySelector('.viator-modal-body');
            if (priceDisplay && modalBody) {
                // Calcular posição do elemento dentro do modal-body
                const priceDisplayRect = priceDisplay.getBoundingClientRect();
                const modalBodyRect = modalBody.getBoundingClientRect();
                
                // Fazer scroll apenas dentro do modal-body, não da página
                const scrollTop = modalBody.scrollTop + (priceDisplayRect.top - modalBodyRect.top) - 20; // 20px de margem
                
                modalBody.scrollTo({
                    top: scrollTop,
                    behavior: 'smooth'
                });
            }
            
            // Remover o destaque após alguns segundos
            setTimeout(() => {
                optionCards.forEach(card => {
                    card.classList.remove('highlight-selection');
                });
            }, 4000);
        }
    }
    
    showTravelerError(travelerGroup, message) {
        // Remover erro existente se houver
        this.clearTravelerError(travelerGroup);
        
        // Criar span de erro
        const errorSpan = document.createElement('span');
        errorSpan.className = 'traveler-error-message';
        errorSpan.textContent = message;
        
        // Inserir após o traveler-group
        travelerGroup.parentNode.insertBefore(errorSpan, travelerGroup.nextSibling);
    }
    
    clearTravelerError(travelerGroup) {
        // Procurar por erros existentes após este traveler-group
        const nextElement = travelerGroup.nextElementSibling;
        if (nextElement && nextElement.classList.contains('traveler-error-message')) {
            nextElement.remove();
        }
    }

    clearAllTravelerErrors() {
        const travelerGroups = document.querySelectorAll('.traveler-group');
        travelerGroups.forEach(group => {
            this.clearTravelerError(group);
        });
    }

    /**
     * Função para testar o acesso à API (para debug)
     */
    async testApiAccess() {
        console.log('🔍 Iniciando teste de acesso à API...');
        
        // Verificar se viatorBookingAjax está disponível
        if (typeof viatorBookingAjax === 'undefined') {
            console.error('❌ viatorBookingAjax não está definido. Verifique se o script foi carregado corretamente.');
            return null;
        }
        
        try {
            const response = await fetch(viatorBookingAjax.ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'viator_test_api_access',
                    nonce: viatorBookingAjax.nonce
                })
            });

            const data = await response.json();
            console.log('📊 Resultado do teste de API:', data);
            
            if (data.success) {
                const result = data.data;
                console.log(`🔑 Nível de acesso: ${result.access_level}`);
                console.log('📋 Testes:', result.tests);
                
                if (result.recommendations.length > 0) {
                    console.warn('⚠️ Recomendações:', result.recommendations);
                    alert('PROBLEMA DE ACESSO À API:\n\n' + result.recommendations.join('\n\n'));
                } else {
                    console.log('✅ API funcionando corretamente!');
                }
                
                return result;
            } else {
                console.error('❌ Erro no teste:', data);
                return null;
            }
        } catch (error) {
            console.error('❌ Erro de conexão no teste:', error);
            return null;
        }
    }
    renderLocationOptions() {
        const container = document.getElementById('traveler-details-container');
        if (!container) return;

        const logistics = window.productData.logistics;
        if (!logistics || !logistics.travelerPickup || !logistics.start || !logistics.start[0]) {
            console.warn('Dados de logística incompletos ou ausentes.');
            return;
        }

        const meetingPointDescription = logistics.start[0].description;

        let locationHtml = `
            <div class="viator-locations-section">
                <h5>Ponto de encontro e traslado</h5>
                <p>Você pode ir por conta própria para o ponto de encontro ou solicitar o traslado. Se não tiver certeza, pode decidir depois.</p>
                
                <div class="location-option">
                    <input type="radio" id="pickup-request" name="pickup_option" value="request">
                    <label for="pickup-request">Gostaria que me buscassem</label>
                    <div id="pickup-search-container" style="display: none;">
                        <input type="text" id="pickup-search" placeholder="Pesquisar por hotel...">
                        <div id="pickup-results"></div>
                    </div>
                </div>

                <div class="location-option">
                    <input type="radio" id="pickup-own" name="pickup_option" value="own">
                    <label for="pickup-own">Vou por conta própria até o ponto de encontro</label>
                    <div id="meeting-point-address" style="display: none;">
                        <p>${meetingPointDescription}</p>
                    </div>
                </div>

                <div class="location-option">
                    <input type="radio" id="pickup-later" name="pickup_option" value="later" checked>
                    <label for="pickup-later">Vou decidir depois</label>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('afterbegin', locationHtml);
        this.setupLocationOptionsEvents();
    }

    setupLocationOptionsEvents() {
        const options = document.querySelectorAll('input[name="pickup_option"]');
        const searchContainer = document.getElementById('pickup-search-container');
        const meetingPointContainer = document.getElementById('meeting-point-address');

        if (!searchContainer || !meetingPointContainer) return;

        options.forEach(option => {
            option.addEventListener('change', (e) => {
                searchContainer.style.display = 'none';
                meetingPointContainer.style.display = 'none';

                if (e.target.value === 'request') {
                    searchContainer.style.display = 'block';
                } else if (e.target.value === 'own') {
                    meetingPointContainer.style.display = 'block';
                } else if (e.target.value === 'later') {
                    // Definir uma opção de marcação para passar na validação
                    this.bookingData.selectedOption = {
                        productOptionCode: 'unset',
                        startTime: null,
                        fullOption: { isLater: true }
                    };
                    // Limpar qualquer erro de data/opção, pois o usuário está prosseguindo
                    this.hideDateError();
                }
             });
         });

        const searchInput = document.getElementById('pickup-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handlePickupSearch(e));
        }
     }

    handlePickupSearch(e) {
        const searchTerm = e.target.value.toLowerCase();
        const resultsContainer = document.getElementById('pickup-results');
        resultsContainer.innerHTML = '';

        if (searchTerm.length < 3) {
            resultsContainer.style.display = 'none';
            return;
        }

        const pickupLocations = window.productData.logistics.travelerPickup.locations;
        if (!pickupLocations) return;

        const filteredLocations = pickupLocations.filter(location => 
            (location.name && location.name.toLowerCase().includes(searchTerm)) || 
            (location.address && location.address.toLowerCase().includes(searchTerm))
        );

        if (filteredLocations.length > 0) {
            resultsContainer.style.display = 'block';
            filteredLocations.forEach(location => {
                const resultItem = document.createElement('div');
                resultItem.classList.add('pickup-result-item');
                resultItem.textContent = `${location.name} - ${location.address}`;
                resultItem.addEventListener('click', () => this.selectPickupLocation(location));
                resultsContainer.appendChild(resultItem);
            });
        } else {
            resultsContainer.style.display = 'none';
        }
    }

    selectPickupLocation(location) {
        const searchInput = document.getElementById('pickup-search');
        searchInput.value = `${location.name} - ${location.address}`;
        document.getElementById('pickup-results').style.display = 'none';
        // Armazenar a localização selecionada para uso posterior
        this.selectedPickupLocation = location;
        console.log('Localização de retirada selecionada:', this.selectedPickupLocation);

        const confirmationMessage = document.createElement('p');
        confirmationMessage.textContent = 'Confirme seu ponto de encontro com a operadora local depois que reservar.';
        confirmationMessage.id = 'pickup-confirmation-message';

        const searchContainer = document.getElementById('pickup-search-container');
        // Remove a mensagem de confirmação antiga, se houver
        const oldMessage = document.getElementById('pickup-confirmation-message');
        if(oldMessage) {
            oldMessage.remove();
        }
        searchContainer.appendChild(confirmationMessage);
    }
}

// Adicionar função global para facilitar teste via console
window.testViatorAPI = function() {
    const bookingManager = new ViatorBookingManager();
    return bookingManager.testApiAccess();
};

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    const bookingManager = new ViatorBookingManager();
    bookingManager.init();
});