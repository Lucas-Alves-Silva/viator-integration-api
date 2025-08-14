/**
 * Viator Booking System - Frontend
 * Gerencia a interface do usuário para o processo de reserva
 */

// LOG CRÍTICO PARA VERIFICAR SE JAVASCRIPT ESTÁ SENDO CARREGADO
console.log('🚨 [CRITICAL DEBUG] viator-booking.js CARREGADO!');
console.log('🚨 [CRITICAL DEBUG] Timestamp de carregamento:', new Date().toISOString());
console.log('🚨 [CRITICAL DEBUG] URL atual:', window.location.href);

// JavaScript carregado com sucesso

// VERSÃO DO ARQUIVO PARA QUEBRAR CACHE
window.VIATOR_BOOKING_VERSION = '2025-08-01-16:10:00';

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

// Instância global do booking manager
window.viatorBookingManager = null;

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar o sistema de perguntas condicionais
    ViatorConditionalQuestions.initialize();
    
    // Criar instância global
    window.viatorBookingManager = new ViatorBookingManager();
    window.viatorBookingManager.init();
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

        // CORREÇÃO: Flag para evitar mensagens de erro duplicadas
        this.specificErrorAlreadyDisplayed = false;

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

        // Sistema dinâmico de booking questions
        this.dynamicBookingQuestions = {
            allQuestions: null,
            productQuestions: null,
            locationData: null,
            conditionalLogic: null
        };

        // CORREÇÃO: Sistema de cache para valores entre etapas
        this.cachedPickupPoint = null;

        // CORREÇÃO: Throttling para logs globais
        this.lastGlobalLogTime = 0;

        // CORREÇÃO: Configurar sistema de cache para PICKUP_POINT
        this.setupPickupPointCache();
    }

    /**
     * CORREÇÃO: Configurar sistema de cache para PICKUP_POINT
     * Captura e armazena valores do PICKUP_POINT da Etapa 2 para uso na Etapa 3
     */
    setupPickupPointCache() {
        console.log('🔧 [CACHE] Configurando sistema de cache para PICKUP_POINT...');

        // Aguardar um pouco para garantir que o DOM esteja pronto
        setTimeout(() => {
            this.attachPickupPointListeners();
        }, 1000);

        // Também configurar listeners quando mudar de etapa
        document.addEventListener('viator:step-changed', () => {
            setTimeout(() => {
                this.attachPickupPointListeners();
            }, 500);
        });
    }

    /**
     * CORREÇÃO: Anexar listeners para capturar mudanças no PICKUP_POINT
     * VERSÃO ROBUSTA - Investigação detalhada + múltiplas estratégias
     */
    attachPickupPointListeners() {
        console.log('🔍 [CACHE DEBUG] Iniciando investigação detalhada do DOM...');

        // 1. INVESTIGAÇÃO COMPLETA DO DOM
        this.investigatePickupPointStructure();

        // 2. SELETORES ESPECÍFICOS (originais)
        this.attachSpecificListeners();

        // 3. SELETORES GENÉRICOS (novos)
        this.attachGenericListeners();

        // 4. EVENT DELEGATION GLOBAL
        this.setupGlobalEventDelegation();

        // 5. MUTATION OBSERVER
        this.setupMutationObserver();

        // 6. INTERCEPTAÇÃO DE FUNÇÕES
        this.interceptPickupPointFunctions();

        console.log('🔧 [CACHE DEBUG] Todas as estratégias de captura configuradas');
    }

    /**
     * CORREÇÃO: Investigar estrutura real dos campos PICKUP_POINT
     */
    investigatePickupPointStructure() {
        console.log('🔍 [CACHE DEBUG] === INVESTIGAÇÃO DO DOM ===');

        // Buscar todos os elementos que podem conter PICKUP_POINT
        const allInputs = document.querySelectorAll('input, select, textarea, button');
        const pickupRelated = [];

        allInputs.forEach(element => {
            const text = (element.id + ' ' + element.name + ' ' + element.className + ' ' + element.getAttribute('data-question-id') + ' ' + element.value).toLowerCase();
            if (text.includes('pickup') || text.includes('point') || text.includes('encontro') || text.includes('buscar')) {
                pickupRelated.push({
                    tag: element.tagName,
                    id: element.id,
                    name: element.name,
                    className: element.className,
                    type: element.type,
                    value: element.value,
                    dataQuestionId: element.getAttribute('data-question-id'),
                    element: element
                });
            }
        });

        console.log('🔍 [CACHE DEBUG] Elementos relacionados a PICKUP encontrados:', pickupRelated.length);
        pickupRelated.forEach((item, index) => {
            console.log(`🔍 [CACHE DEBUG] Elemento ${index}:`, item);
        });

        // Buscar por texto que contenha as opções mencionadas pelo usuário
        const allElements = document.querySelectorAll('*');
        const textRelated = [];

        allElements.forEach(element => {
            const text = element.textContent?.toLowerCase() || '';
            if (text.includes('gostaria que me buscassem') ||
                text.includes('vou por conta própria') ||
                text.includes('vou decidir depois') ||
                text.includes('ponto de encontro') ||
                text.includes('local de encontro')) {
                textRelated.push({
                    tag: element.tagName,
                    id: element.id,
                    className: element.className,
                    text: element.textContent?.substring(0, 100),
                    element: element
                });
            }
        });

        console.log('🔍 [CACHE DEBUG] Elementos com texto relacionado encontrados:', textRelated.length);
        textRelated.forEach((item, index) => {
            console.log(`🔍 [CACHE DEBUG] Texto ${index}:`, item);
        });
    }

    /**
     * CORREÇÃO: Anexar listeners específicos (versão original)
     */
    attachSpecificListeners() {
        const pickupSelectors = [
            'input[data-question-id="PICKUP_POINT"]',
            'input[name*="booking_question_PICKUP_POINT"]',
            'input[id*="booking_question_PICKUP_POINT"]',
            'input[type="radio"][name*="PICKUP_POINT"]',
            'input[type="radio"][id*="PICKUP_POINT"]',
            'select[data-question-id="PICKUP_POINT"]'
        ];

        let listenersAdded = 0;
        pickupSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.removeEventListener('change', this.handlePickupPointChange.bind(this));
                element.removeEventListener('input', this.handlePickupPointChange.bind(this));
                element.addEventListener('change', this.handlePickupPointChange.bind(this));
                element.addEventListener('input', this.handlePickupPointChange.bind(this));

                console.log('🔧 [CACHE] Listener específico adicionado para:', selector, element.id || element.name);
                listenersAdded++;
            });
        });

        console.log('🔧 [CACHE DEBUG] Total de listeners específicos adicionados:', listenersAdded);
    }

    /**
     * CORREÇÃO: Anexar listeners genéricos (nova estratégia)
     */
    attachGenericListeners() {
        // Seletores mais amplos
        const genericSelectors = [
            'input[type="radio"]',
            'input[type="text"]',
            'select',
            'button[type="button"]'
        ];

        let genericListenersAdded = 0;
        genericSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                // Verificar se elemento pode estar relacionado a PICKUP_POINT
                const elementText = (element.id + ' ' + element.name + ' ' + element.className + ' ' + element.value + ' ' + element.textContent).toLowerCase();

                if (elementText.includes('pickup') ||
                    elementText.includes('point') ||
                    elementText.includes('encontro') ||
                    elementText.includes('buscar') ||
                    elementText.includes('departure') ||
                    elementText.includes('meet') ||
                    elementText.includes('contact') ||
                    elementText.includes('supplier')) {

                    element.removeEventListener('change', this.handlePickupPointChange.bind(this));
                    element.removeEventListener('input', this.handlePickupPointChange.bind(this));
                    element.removeEventListener('click', this.handlePickupPointChange.bind(this));

                    element.addEventListener('change', this.handlePickupPointChange.bind(this));
                    element.addEventListener('input', this.handlePickupPointChange.bind(this));
                    element.addEventListener('click', this.handlePickupPointChange.bind(this));

                    console.log('🔧 [CACHE] Listener genérico adicionado para:', element.tagName, element.id || element.name, 'texto:', elementText.substring(0, 50));
                    genericListenersAdded++;
                }
            });
        });

        console.log('🔧 [CACHE DEBUG] Total de listeners genéricos adicionados:', genericListenersAdded);
    }

    /**
     * CORREÇÃO: Event delegation global para capturar qualquer mudança
     */
    setupGlobalEventDelegation() {
        // Remover listener existente se houver
        document.removeEventListener('change', this.globalChangeHandler);
        document.removeEventListener('input', this.globalInputHandler);
        document.removeEventListener('click', this.globalClickHandler);

        // Criar handlers bound
        this.globalChangeHandler = this.handleGlobalChange.bind(this);
        this.globalInputHandler = this.handleGlobalInput.bind(this);
        this.globalClickHandler = this.handleGlobalClick.bind(this);

        // Adicionar listeners globais
        document.addEventListener('change', this.globalChangeHandler, true);
        document.addEventListener('input', this.globalInputHandler, true);
        document.addEventListener('click', this.globalClickHandler, true);

        console.log('🔧 [CACHE DEBUG] Event delegation global configurado');
    }

    /**
     * CORREÇÃO: Handler global para eventos de mudança (versão otimizada)
     */
    handleGlobalChange(event) {
        const element = event.target;
        const elementInfo = this.getElementInfo(element);

        if (this.isPickupPointRelated(elementInfo)) {
            // CORREÇÃO: Throttling de logs para evitar spam
            if (!this.lastGlobalLogTime || Date.now() - this.lastGlobalLogTime > 2000) {
                console.log('🔧 [CACHE GLOBAL] Change detectado em elemento relacionado:', {
                    tag: elementInfo.tag,
                    id: elementInfo.id,
                    name: elementInfo.name,
                    value: elementInfo.value
                });
                this.lastGlobalLogTime = Date.now();
            }
            this.handlePickupPointChange(event);
        }
    }

    /**
     * CORREÇÃO: Handler global para eventos de input (versão otimizada)
     */
    handleGlobalInput(event) {
        const element = event.target;
        const elementInfo = this.getElementInfo(element);

        if (this.isPickupPointRelated(elementInfo)) {
            // CORREÇÃO: Throttling de logs para evitar spam
            if (!this.lastGlobalLogTime || Date.now() - this.lastGlobalLogTime > 2000) {
                console.log('🔧 [CACHE GLOBAL] Input detectado em elemento relacionado:', {
                    tag: elementInfo.tag,
                    id: elementInfo.id,
                    name: elementInfo.name,
                    value: elementInfo.value
                });
                this.lastGlobalLogTime = Date.now();
            }
            this.handlePickupPointChange(event);
        }
    }

    /**
     * CORREÇÃO: Handler global para eventos de click (versão otimizada)
     */
    handleGlobalClick(event) {
        const element = event.target;
        const elementInfo = this.getElementInfo(element);

        if (this.isPickupPointRelated(elementInfo)) {
            // CORREÇÃO: Throttling de logs para evitar spam
            if (!this.lastGlobalLogTime || Date.now() - this.lastGlobalLogTime > 2000) {
                console.log('🔧 [CACHE GLOBAL] Click detectado em elemento relacionado:', {
                    tag: elementInfo.tag,
                    id: elementInfo.id,
                    name: elementInfo.name,
                    value: elementInfo.value
                });
                this.lastGlobalLogTime = Date.now();
            }
            // Aguardar um pouco para o valor ser atualizado
            setTimeout(() => {
                this.handlePickupPointChange(event);
            }, 100);
        }
    }

    /**
     * CORREÇÃO: Obter informações do elemento
     */
    getElementInfo(element) {
        return {
            tag: element.tagName,
            id: element.id,
            name: element.name,
            className: element.className,
            type: element.type,
            value: element.value,
            textContent: element.textContent?.substring(0, 100),
            dataQuestionId: element.getAttribute('data-question-id'),
            allText: (element.id + ' ' + element.name + ' ' + element.className + ' ' + element.value + ' ' + element.textContent).toLowerCase()
        };
    }

    /**
     * CORREÇÃO: Verificar se elemento está relacionado a PICKUP_POINT (versão otimizada)
     */
    isPickupPointRelated(elementInfo) {
        // CORREÇÃO: Filtrar apenas elementos de formulário para evitar falsos positivos
        const validTags = ['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA'];
        if (!validTags.includes(elementInfo.tag)) {
            return false;
        }

        // CORREÇÃO: Palavras-chave mais específicas para evitar spam
        const keywords = [
            'pickup_point', 'booking_question_pickup', 'ponto_encontro',
            'local_encontro', 'departure_point', 'meet_point'
        ];

        // CORREÇÃO: Verificar apenas ID, name e data-question-id (não textContent)
        const relevantText = (elementInfo.id + ' ' + elementInfo.name + ' ' + elementInfo.dataQuestionId).toLowerCase();

        return keywords.some(keyword => relevantText.includes(keyword));
    }

    /**
     * CORREÇÃO: MutationObserver para detectar mudanças no DOM
     */
    setupMutationObserver() {
        // Desconectar observer existente se houver
        if (this.pickupMutationObserver) {
            this.pickupMutationObserver.disconnect();
        }

        this.pickupMutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // Verificar mudanças de atributos
                if (mutation.type === 'attributes') {
                    const element = mutation.target;
                    const elementInfo = this.getElementInfo(element);

                    if (this.isPickupPointRelated(elementInfo)) {
                        console.log('🔧 [CACHE MUTATION] Atributo mudou em elemento relacionado:', elementInfo);
                        this.handlePickupPointChange({ target: element });
                    }
                }

                // Verificar novos nós adicionados
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node;
                            const elementInfo = this.getElementInfo(element);

                            if (this.isPickupPointRelated(elementInfo)) {
                                console.log('🔧 [CACHE MUTATION] Novo elemento relacionado adicionado:', elementInfo);
                                // Anexar listeners ao novo elemento
                                setTimeout(() => {
                                    this.attachPickupPointListeners();
                                }, 100);
                            }
                        }
                    });
                }
            });
        });

        // Observar mudanças no documento
        this.pickupMutationObserver.observe(document.body, {
            attributes: true,
            childList: true,
            subtree: true,
            attributeFilter: ['value', 'checked', 'selected', 'data-question-id']
        });

        console.log('🔧 [CACHE DEBUG] MutationObserver configurado');
    }

    /**
     * CORREÇÃO: Interceptar funções que definem valores de PICKUP_POINT
     */
    interceptPickupPointFunctions() {
        // Interceptar console.log para capturar logs de PICKUP_POINT
        const originalConsoleLog = console.log;
        console.log = (...args) => {
            const message = args.join(' ');

            // Verificar se é um log de PICKUP_POINT sendo definido
            if (message.includes('PICKUP_POINT valor') && (message.includes('definido') || message.includes('atualizado'))) {
                // CORREÇÃO: Usar originalConsoleLog para evitar loop infinito
                originalConsoleLog('🔧 [CACHE INTERCEPT] Log interceptado:', message);

                // Extrair valor do log
                const match = message.match(/PICKUP_POINT valor.*?:\s*(.+)/);
                if (match) {
                    const value = match[1].trim();
                    // CORREÇÃO: Usar originalConsoleLog para evitar loop infinito
                    originalConsoleLog('🔧 [CACHE INTERCEPT] Valor extraído do log:', value);

                    // Salvar no cache
                    this.cachedPickupPoint = {
                        question: 'PICKUP_POINT',
                        answer: value,
                        unit: value.startsWith('LOC-') ? 'LOCATION_REFERENCE' : 'FREETEXT',
                        source: 'intercepted_log'
                    };

                    // CORREÇÃO: Usar originalConsoleLog para evitar loop infinito
                    originalConsoleLog('✅ [CACHE INTERCEPT] PICKUP_POINT salvo no cache via interceptação:', this.cachedPickupPoint);
                }
            }

            // Chamar console.log original
            originalConsoleLog.apply(console, args);
        };

        console.log('🔧 [CACHE DEBUG] Interceptação de funções configurada');
    }

    /**
     * CORREÇÃO: Manipular mudanças no PICKUP_POINT (versão robusta)
     */
    handlePickupPointChange(event) {
        const element = event.target;
        const elementInfo = this.getElementInfo(element);

        console.log('🔧 [CACHE] PICKUP_POINT mudou (ROBUSTA):', elementInfo);

        let pickupValue = null;
        let pickupUnit = 'LOCATION_REFERENCE';
        let source = 'direct_input';

        // ESTRATÉGIA 1: Radio buttons
        if (element.type === 'radio') {
            if (element.checked) {
                pickupValue = element.value;
                source = 'radio_button';

                console.log('🔧 [CACHE] Radio button selecionado:', pickupValue);

                // Se é SHOW_LOCATION_LIST, ainda não tem valor final (usuário precisa selecionar da lista)
                if (element.value === 'SHOW_LOCATION_LIST') {
                    pickupValue = null; // Ainda sem seleção final
                    console.log('🔧 [CACHE] SHOW_LOCATION_LIST selecionado - aguardando seleção da lista');
                    return; // Não armazenar valor ainda
                }

                // Se é CUSTOM_LOCATION, buscar campo de texto
                if (element.value === 'CUSTOM_LOCATION') {
                    const freetextSelectors = [
                        'input[id*="_freetext"]',
                        'input[id*="freetext"]',
                        'input[name*="freetext"]',
                        'input[type="text"]'
                    ];

                    for (const selector of freetextSelectors) {
                        const freetextInput = document.querySelector(selector);
                        if (freetextInput && freetextInput.value.trim()) {
                            pickupValue = freetextInput.value.trim();
                            pickupUnit = 'FREETEXT';
                            source = 'freetext_input';
                            console.log('🔧 [CACHE] Valor freetext encontrado:', pickupValue);
                            break;
                        }
                    }
                }
            }
        }
        // ESTRATÉGIA 2: Campos de texto
        else if (element.type === 'text' && element.value && element.value.trim() !== '') {
            pickupValue = element.value.trim();
            pickupUnit = 'FREETEXT';
            source = 'text_input';
            console.log('🔧 [CACHE] Campo de texto preenchido:', pickupValue);
        }
        // ESTRATÉGIA 3: Select/dropdown
        else if (element.tagName === 'SELECT' && element.value && element.value.trim() !== '') {
            pickupValue = element.value.trim();
            source = 'select_dropdown';
            console.log('🔧 [CACHE] Select selecionado:', pickupValue);
        }
        // ESTRATÉGIA 4: Button/click
        else if (element.tagName === 'BUTTON' || element.type === 'button') {
            // Para botões, usar o texto ou valor
            pickupValue = element.value || element.textContent?.trim();
            source = 'button_click';
            console.log('🔧 [CACHE] Botão clicado:', pickupValue);
        }

        // ESTRATÉGIA 5: Buscar valores em elementos próximos
        if (!pickupValue) {
            const parent = element.closest('div, fieldset, form');
            if (parent) {
                const relatedInputs = parent.querySelectorAll('input, select, textarea');
                relatedInputs.forEach(input => {
                    if (input.value && input.value.trim() !== '' && input !== element) {
                        const inputInfo = this.getElementInfo(input);
                        if (this.isPickupPointRelated(inputInfo)) {
                            pickupValue = input.value.trim();
                            source = 'related_input';
                            console.log('🔧 [CACHE] Valor encontrado em input relacionado:', pickupValue);
                        }
                    }
                });
            }
        }

        // ESTRATÉGIA 6: Valores conhecidos da Viator
        const knownValues = [
            'MEET_AT_DEPARTURE_POINT',
            'CONTACT_SUPPLIER_LATER',
            'CUSTOM_LOCATION'
        ];

        if (!pickupValue && knownValues.includes(element.value)) {
            pickupValue = element.value;
            source = 'known_value';
            console.log('🔧 [CACHE] Valor conhecido detectado:', pickupValue);
        }

        if (pickupValue && pickupValue.trim() !== '') {
            // Determinar unidade baseada no valor
            if (pickupValue.startsWith('LOC-')) {
                pickupUnit = 'LOCATION_REFERENCE';
            } else if (pickupValue === 'CUSTOM_LOCATION') {
                pickupUnit = 'FREETEXT';
            } else if (pickupValue === 'MEET_AT_DEPARTURE_POINT' || pickupValue === 'CONTACT_SUPPLIER_LATER') {
                pickupUnit = 'LOCATION_REFERENCE';
            } else if (element.id && element.id.includes('freetext')) {
                pickupUnit = 'FREETEXT';
            } else if (source === 'text_input' || source === 'freetext_input') {
                pickupUnit = 'FREETEXT';
            }

            this.cachedPickupPoint = {
                question: 'PICKUP_POINT',
                answer: pickupValue,
                unit: pickupUnit,
                source: source,
                timestamp: new Date().toISOString()
            };

            console.log('✅ [CACHE] PICKUP_POINT salvo no cache (ROBUSTA):', this.cachedPickupPoint);
        } else {
            console.log('⚠️ [CACHE] Nenhum valor válido encontrado para PICKUP_POINT');
        }
    }

    /**
     * CORREÇÃO: Manipular mudanças no campo de texto customizado
     */
    handlePickupPointFreetextChange(event) {
        const element = event.target;

        // Verificar se o radio button CUSTOM_LOCATION está selecionado
        const customRadio = document.querySelector('input[type="radio"][value="CUSTOM_LOCATION"]:checked');

        if (customRadio && element.value.trim()) {
            this.cachedPickupPoint = {
                question: 'PICKUP_POINT',
                answer: element.value.trim(),
                unit: 'FREETEXT'
            };

            console.log('✅ [CACHE] PICKUP_POINT freetext salvo no cache:', this.cachedPickupPoint);
        }
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
                    // Garantir que os dados sejam serializados corretamente
                    let serializedData = '';
                    if (data !== null) {
                        try {
                            serializedData = JSON.stringify(data);
                        } catch (jsonError) {
                            // Se falhar ao serializar, converter para string de forma segura
                            serializedData = String(data);
                        }
                    }

                    fetch(viatorBookingAjax.ajaxurl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams({
                            action: 'viator_debug_log_js',
                            message: message,
                            data: serializedData,
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
    
    /**
     * Atualiza o estado do botão "Próximo" (Processar Pagamento) durante o processamento
     */
    setProcessingButtonState(isProcessing, text = 'Processando...') {
        const nextBtn = document.getElementById('booking-next-btn');
        if (!nextBtn) return;
        if (isProcessing) {
            if (!nextBtn.dataset.prevText) {
                nextBtn.dataset.prevText = nextBtn.textContent || 'Processar Pagamento';
            }
            if (nextBtn.textContent !== text) {
                nextBtn.textContent = text;
            }
            nextBtn.disabled = true;
            nextBtn.setAttribute('aria-busy', 'true');
        } else {
            const prev = nextBtn.dataset.prevText || 'Processar Pagamento';
            nextBtn.textContent = prev;
            nextBtn.disabled = false;
            nextBtn.removeAttribute('aria-busy');
            delete nextBtn.dataset.prevText;
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
                <div id="step-error-message" class="error-message" style="display:none;"></div>

                <div class="traveler-summary-section payment-summary">
                    <h4>Resumo da Reserva</h4>
                    <div id="booking-summary"></div>
                </div>

                <div class="booker-info-section payment-form">
                    <h4>Dados do Cartão de Crédito</h4>

                        <div class="security-badge" style="color: #155724; font-weight: 600;">
                            🔒 Suas informações são criptografadas e processadas com segurança
                        </div>
                    
                    <div class="form-group">
                        <label for="card-number">Número do Cartão *:</label>
                        <div class="card-input-container" style="position: relative;">
                            <input type="text" id="card-number" class="form-control" placeholder="1234 5678 9012 3456" maxlength="23" required autocomplete="cc-number">
                            <div id="card-type-indicator" class="card-type-indicator" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 24px; display: none;"></div>
                        </div>
                        <small class="form-text">Digite apenas os números do cartão</small>
                        <!-- Os erros por campo são gerados dinamicamente via showFieldError -->
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

                // CORREÇÃO: Verificar e executar coleta de dados do dispositivo com tratamento robusto
                if (typeof this.payment.collectDeviceData === 'function') {
                    try {
                        this.payment.collectDeviceData();
                        this.fraudDetectionStatus.collectDeviceDataAvailable = true;
                        this.fraudDetectionStatus.deviceDataCollected = true;
                        console.log('✅ Coleta de dados de dispositivo iniciada');
                    } catch (collectError) {
                        console.warn('⚠️ Erro ao coletar dados do dispositivo (digest/crypto):', collectError);
                        // CORREÇÃO: Não falhar completamente, continuar com fallback
                        this.fraudDetectionStatus.collectDeviceDataAvailable = true;
                        this.fraudDetectionStatus.deviceDataCollected = false;
                        console.log('🔄 Continuando com método alternativo devido ao erro de digest');
                    }
                } else {
                    console.log('ℹ️ Método collectDeviceData não disponível - usando fallback (normal em desenvolvimento)');
                    this.initializeFraudDetectionFallback();
                }

                // CORREÇÃO: Verificar e obter token de coleta de dados com tratamento robusto
                if (typeof this.payment.getDeviceDataCollectionToken === 'function') {
                    try {
                        this.deviceDataCollectionToken = this.payment.getDeviceDataCollectionToken();
                        this.fraudDetectionStatus.getTokenAvailable = true;
                        this.fraudDetectionStatus.tokenObtained = !!this.deviceDataCollectionToken;
                        console.log('✅ Token de coleta de dados obtido:', this.deviceDataCollectionToken ? 'Sim' : 'Não');
                    } catch (tokenError) {
                        console.warn('⚠️ Erro ao obter token de detecção de fraude (digest/crypto):', tokenError);
                        // CORREÇÃO: Não falhar, gerar token alternativo
                        this.fraudDetectionStatus.getTokenAvailable = true;
                        this.fraudDetectionStatus.tokenObtained = false;
                        this.generateFallbackDeviceToken();
                        console.log('🔄 Token alternativo gerado devido ao erro de digest');
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
     * Buscar todas as booking questions disponíveis do endpoint oficial
     */
    async loadAllBookingQuestions() {
        try {
            console.log('🔄 Carregando todas as booking questions do endpoint oficial...');

            // Verificar cache primeiro
            const cacheKey = 'viator_all_booking_questions';
            const cachedData = this.getSmartCachedData(cacheKey, 24); // Cache por 24 horas

            if (cachedData) {
                console.log('✅ Usando booking questions do cache');
                this.dynamicBookingQuestions.allQuestions = cachedData;
                return cachedData;
            }

            const response = await fetch(viatorBookingAjax.ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'viator_get_all_booking_questions',
                    nonce: viatorBookingAjax.nonce
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Tratamento robusto de JSON
            let result;
            try {
                const responseText = await response.text();
                console.log('📡 Raw response text:', responseText.substring(0, 200) + '...');

                if (!responseText || responseText.trim() === '') {
                    throw new Error('Resposta vazia do servidor');
                }

                result = JSON.parse(responseText);
                console.log('📡 All booking questions response:', result);
            } catch (jsonError) {
                console.error('❌ Erro ao fazer parse do JSON:', jsonError);
                console.log('🔄 Tentando fallback para booking questions do produto...');
                return this.fallbackToProductBookingQuestions();
            }

            if (result.success) {
                this.dynamicBookingQuestions.allQuestions = result.data;

                // Salvar no cache
                this.setSmartCache(cacheKey, result.data, 24);

                console.log('✅ Todas as booking questions carregadas:', result.data.length, 'perguntas');
                return result.data;
            } else {
                throw new Error(result.data?.message || 'Erro ao carregar todas as booking questions');
            }
        } catch (error) {
            console.error('❌ Erro ao carregar todas as booking questions:', error);
            console.log('🔄 Usando fallback para booking questions do produto...');
            return this.fallbackToProductBookingQuestions();
        }
    }

    /**
     * Fallback para usar booking questions do produto quando API falha
     */
    fallbackToProductBookingQuestions() {
        try {
            console.log('🔄 Executando fallback para booking questions do produto...');

            // Tentar usar booking questions do window.productData
            if (window.productData?.bookingQuestions) {
                console.log('✅ Usando booking questions do window.productData');
                return window.productData.bookingQuestions;
            }

            // Tentar usar booking questions já carregadas
            if (this.bookingQuestions && this.bookingQuestions.length > 0) {
                console.log('✅ Usando booking questions já carregadas');
                return this.bookingQuestions;
            }

            // Tentar usar booking questions do produto atual
            if (this.productBookingQuestions?.booking_questions) {
                console.log('✅ Usando booking questions do produto atual');
                return this.productBookingQuestions.booking_questions;
            }

            console.log('⚠️ Nenhuma fonte de booking questions disponível para fallback');
            return [];

        } catch (error) {
            console.error('❌ Erro no fallback de booking questions:', error);
            return [];
        }
    }

    /**
     * Buscar dados de localização do endpoint /locations/bulk
     */
    async loadLocationData(locationRefs = []) {
        try {
            console.log('🔄 Carregando dados de localização...', locationRefs);

            if (!locationRefs || locationRefs.length === 0) {
                return [];
            }

            const response = await fetch(viatorBookingAjax.ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'viator_get_locations_bulk',
                    location_refs: JSON.stringify(locationRefs),
                    nonce: viatorBookingAjax.nonce
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('📡 Location data response:', result);

            if (result.success) {
                this.dynamicBookingQuestions.locationData = result.data;
                console.log('✅ Dados de localização carregados:', result.data.length, 'locais');
                return result.data;
            } else {
                throw new Error(result.data?.message || 'Erro ao carregar dados de localização');
            }
        } catch (error) {
            console.error('❌ Erro ao carregar dados de localização:', error);
            return [];
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

            // Primeiro, carregar todas as booking questions se não estiverem em cache
            if (!this.dynamicBookingQuestions.allQuestions) {
                await this.loadAllBookingQuestions();
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

                // CORREÇÃO: Populando this.bookingQuestions para compatibilidade
                if (result.data.booking_questions && Array.isArray(result.data.booking_questions)) {
                    this.bookingQuestions = result.data.booking_questions;
                    console.log('✅ this.bookingQuestions populado com', this.bookingQuestions.length, 'perguntas');
                } else if (result.data.booking_questions && typeof result.data.booking_questions === 'object') {
                    // Se é um objeto, converter para array
                    this.bookingQuestions = Object.values(result.data.booking_questions);
                    console.log('✅ this.bookingQuestions populado com', this.bookingQuestions.length, 'perguntas (convertido de objeto)');
                }

                // Enriquecer com dados completos das booking questions
                await this.enrichProductBookingQuestions();

                // Carregar dados de localização se necessário
                await this.loadPickupLocationData();

                console.log('✅ Booking questions carregadas:', Object.keys(result.data.booking_questions || {}).length, 'perguntas');
                console.log('✅ Dados completos:', result.data);
                console.log('✅ this.bookingQuestions final:', this.bookingQuestions?.length || 0, 'perguntas');
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
     * Enriquecer booking questions do produto com dados completos
     */
    async enrichProductBookingQuestions() {
        try {
            console.log('🔍 [ENRICH DEBUG] Iniciando enriquecimento...');
            console.log('🔍 [ENRICH DEBUG] this.productBookingQuestions?.booking_questions:', this.productBookingQuestions?.booking_questions);
            console.log('🔍 [ENRICH DEBUG] this.dynamicBookingQuestions.allQuestions:', this.dynamicBookingQuestions.allQuestions?.length || 'null/undefined');

            if (!this.productBookingQuestions?.booking_questions) {
                console.log('⚠️ [ENRICH DEBUG] Sem booking_questions no produto, pulando enriquecimento');
                return;
            }

            // CORREÇÃO: Se this.bookingQuestions já tem objetos completos, usar eles
            if (this.bookingQuestions && this.bookingQuestions.length > 0 && typeof this.bookingQuestions[0] === 'object') {
                console.log('✅ [ENRICH DEBUG] this.bookingQuestions já tem objetos completos, mantendo');
                this.productBookingQuestions.booking_questions = this.bookingQuestions;
                return;
            }

            if (!this.dynamicBookingQuestions.allQuestions) {
                console.log('⚠️ [ENRICH DEBUG] Sem allQuestions disponível, pulando enriquecimento');
                return;
            }

            const productQuestionIds = this.productBookingQuestions.booking_questions;
            const enrichedQuestions = [];

            console.log('🔍 [ENRICH DEBUG] IDs para enriquecer:', productQuestionIds);

            // Para cada ID de pergunta do produto, buscar dados completos
            productQuestionIds.forEach(questionId => {
                console.log(`🔍 [ENRICH DEBUG] Buscando dados para: ${questionId}`);
                const fullQuestion = this.dynamicBookingQuestions.allQuestions.find(q => q.id === questionId);
                if (fullQuestion) {
                    console.log(`✅ [ENRICH DEBUG] Pergunta encontrada: ${typeof questionId === 'string' ? questionId : JSON.stringify(questionId)}`);
                    enrichedQuestions.push(fullQuestion);
                } else {
                    console.warn(`⚠️ [ENRICH DEBUG] Pergunta ${typeof questionId === 'string' ? questionId : JSON.stringify(questionId)} não encontrada na lista completa`);
                }
            });

            // Substituir array de IDs por array de objetos completos
            this.productBookingQuestions.booking_questions = enrichedQuestions;
            this.bookingQuestions = enrichedQuestions; // Manter compatibilidade

            console.log('✅ [ENRICH DEBUG] Booking questions enriquecidas:', enrichedQuestions.length);
        } catch (error) {
            console.error('❌ Erro ao enriquecer booking questions:', error);
        }
    }
    /**
     * Carregar dados de localização para pickup points
     */
    async loadPickupLocationData() {
        try {
            const logistics = this.productBookingQuestions?.logistics;
            if (!logistics?.travelerPickup?.locations) {
                return;
            }

            // Extrair referências de localização
            const locationRefs = logistics.travelerPickup.locations
                .map(loc => loc.location?.ref)
                .filter(ref => ref && ref !== 'CONTACT_SUPPLIER_LATER' && ref !== 'MEET_AT_DEPARTURE_POINT');

            if (locationRefs.length > 0) {
                await this.loadLocationData(locationRefs);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar dados de pickup:', error);
        }
    }

    /**
     * Gerar HTML para o step de booking questions
     */
    getBookingQuestionsStepHTML() {
        return `
            <div class="booking-step booking-questions-step">
                <h3 id="booking-questions-title" style="display: none;">Informações Adicionais</h3>

                <div id="booking-questions-loading" class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>Carregando informações necessárias...</p>
                </div>

                <div id="booking-questions-content" style="display: none;">
                    <div id="booking-questions-form">
                        <!-- Perguntas serão inseridas aqui dinamicamente -->
                    </div>

                    <!-- Seção fixa para Idioma da Excursão e Requisitos Especiais (etapa 3) -->
                    <div id="additional-booking-info-section" class="additional-booking-info-section" style="display: none;">
                        <h4 id="additional-info-title" style="display: none;">Informações Adicionais da Reserva</h4>

                        <div class="additional-info-row">
                            <!-- Idioma da Excursão -->
                            <div id="language-guide-container" class="language-guide-column"></div>

                            <!-- Requisitos Especiais e outras perguntas gerais -->
                            <div id="general-booking-questions" class="general-questions-column"></div>
                        </div>
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

        // Limpar container e evitar renderização duplicada
        formContainer.innerHTML = '';
        const existingDyn = document.querySelector('.dynamic-booking-questions');
        if (existingDyn && existingDyn.parentNode === formContainer) {
            existingDyn.remove();
        }

        // Usar sistema dinâmico se disponível
        if (this.dynamicBookingQuestions.allQuestions && this.productBookingQuestions?.booking_questions) {
            console.log('✅ Usando sistema dinâmico para renderização');
            this.renderDynamicBookingQuestions(formContainer);
            return;
        }

        // Fallback para sistema legado
        console.log('⚠️ Usando sistema legado para renderização');

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
            
            // Exibir a seção de informações adicionais mesmo sem perguntas
            const additionalInfoSection = document.getElementById('additional-booking-info-section');
            if (additionalInfoSection) {
                additionalInfoSection.style.display = 'block';
                console.log('✅ [LANGUAGE GUIDE] Seção additional-booking-info-section exibida (sem perguntas - sistema legado)');
            }
            
            // Renderizar seção de idioma da excursão mesmo sem perguntas
            this.renderLanguageGuideSection();
            return;
        }

        console.log('🎨 Renderizando', questions.length, 'booking questions');

        let formHTML = '<div class="booking-questions-container">';

        // Separar perguntas por tipo
        const perBookingQuestions = [];
        const perTravelerQuestions = [];

        questions.forEach(question => {
            if (question.group === 'PER_BOOKING') {
                // CORREÇÃO CRÍTICA: Incluir TODAS as perguntas PER_BOOKING na Etapa 3
                // (incluindo PICKUP_POINT que foi removido da Etapa 2)
                perBookingQuestions.push(question);
                console.log('✅ Pergunta PER_BOOKING adicionada na Etapa 3:', question.id);
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

        // CORREÇÃO: Remover renderização de perguntas PER_TRAVELER da etapa 3
        // As informações dos viajantes já são coletadas na etapa 2
        console.log('ℹ️ Perguntas PER_TRAVELER removidas da etapa 3 - já coletadas na etapa 2');
        console.log('🎨 Perguntas PER_TRAVELER encontradas (não renderizadas):', perTravelerQuestions.length);
        
        // Log para debug
        if (perTravelerQuestions.length > 0) {
            console.log('📝 Perguntas PER_TRAVELER disponíveis:', perTravelerQuestions.map(q => q.id));
        }

        formHTML += '</div>';

        formContainer.innerHTML = formHTML;

        // Exibir a seção de informações adicionais na etapa 3
        const additionalInfoSection = document.getElementById('additional-booking-info-section');
        if (additionalInfoSection) {
            additionalInfoSection.style.display = 'block';
            console.log('✅ [LANGUAGE GUIDE] Seção additional-booking-info-section exibida na etapa 3 (sistema legado)');
        }

        // Renderizar seção de idioma da excursão
        this.renderLanguageGuideSection();

        // Inicializar eventos e validação
        this.initializeQuestionEvents();
    }

    /**
     * Renderizar campo dinâmico baseado na especificação oficial da Viator
     */
    renderDynamicBookingField(question, fieldId, isRequired, isPerTraveler, travelerIndex = null) {
        const requiredAttr = isRequired ? 'required' : '';
        const maxLengthAttr = question.maxLength ? `maxlength="${question.maxLength}"` : '';

        switch (question.type) {
            case 'DATE':
                return this.renderDateField(question, fieldId, requiredAttr);

            case 'NUMBER_AND_UNIT':
                return this.renderNumberWithUnitField(question, fieldId, requiredAttr);

            case 'LOCATION_REF_OR_FREE_TEXT':
                // Para PICKUP_POINT usamos o componente completo de pickup
                if (question.id === 'PICKUP_POINT') {
                    return this.renderLocationField(question, fieldId, requiredAttr);
                }
                // Para outros campos (ex.: TRANSFER_ARRIVAL_DROP_OFF) usar input simples de endereço
                return this.renderDropOffField(question, fieldId, requiredAttr);

            case 'STRING':
                if (question.allowedAnswers && question.allowedAnswers.length > 0) {
                    return this.renderSelectField(question, fieldId, requiredAttr);
                } else {
                    return this.renderStringField(question, fieldId, requiredAttr, maxLengthAttr);
                }

            case 'TIME':
                return this.renderTimeField(question, fieldId, requiredAttr);

            default:
                return this.renderStringField(question, fieldId, requiredAttr, maxLengthAttr);
        }
    }

    /**
     * Renderizar campo de data (DATE_OF_BIRTH, PASSPORT_EXPIRY, etc.)
     */
    renderDateField(question, fieldId, requiredAttr) {
        const placeholder = question.hint || 'DD/MM/AAAA';

        return `
            <input type="date"
                   id="${fieldId}"
                   name="${fieldId}"
                   class="form-control question-input"
                   ${requiredAttr}
                   ${question.required === 'CONDITIONAL' ? 'data-original-required="CONDITIONAL"' : ''}
                   data-question-id="${question.id}"
                   data-question-type="${question.type}"
                   data-group="${question.group}">
            ${question.hint ? `<small class="form-text text-muted">${question.hint}</small>` : ''}
        `;
    }

    /**
     * Renderizar campo de número com unidade (HEIGHT, WEIGHT)
     */
    renderNumberWithUnitField(question, fieldId, requiredAttr) {
        const units = question.units || [];
        const defaultUnit = units[0] || '';

        let html = `<div class="input-group">`;

        // Campo numérico
        html += `
            <input type="number"
                   id="${fieldId}"
                   name="${fieldId}"
                   class="form-control question-input"
                   ${requiredAttr}
                   ${question.required === 'CONDITIONAL' ? 'data-original-required="CONDITIONAL"' : ''}
                   step="0.1"
                   min="0"
                   placeholder="${question.hint || 'Valor'}"
                   data-question-id="${question.id}"
                   data-question-type="${question.type}"
                   data-group="${question.group}">
        `;

        // Seletor de unidade
        if (units.length > 0) {
            html += `
                <div class="input-group-append">
                    <select id="${fieldId}_unit"
                            name="${fieldId}_unit"
                            class="form-control question-unit"
                            ${question.required === 'CONDITIONAL' ? 'data-original-required="CONDITIONAL"' : ''}
                            data-for="${fieldId}">
            `;

            units.forEach(unit => {
                html += `<option value="${unit}">${unit}</option>`;
            });

            html += `
                    </select>
                </div>
            `;
        }

        html += `</div>`;

        if (question.hint) {
            html += `<small class="form-text text-muted">${question.hint}</small>`;
        }

        return html;
    }

    /**
     * Renderizar campo de localização (PICKUP_POINT)
     */
    renderLocationField(question, fieldId, requiredAttr) {
        const logistics = this.productBookingQuestions?.logistics;
        const allowCustomPickup = logistics?.travelerPickup?.allowCustomTravelerPickup || false;
        const locations = logistics?.travelerPickup?.locations || [];

        let html = `<div class="location-field-container">`;

        // Se há localizações pré-definidas
        if (locations.length > 0) {
            html += `
                <select id="${fieldId}"
                        name="${fieldId}"
                        class="form-control question-input"
                        ${requiredAttr}
                        data-question-id="${question.id}"
                        data-question-type="${question.type}"
                        data-group="${question.group}">
                    <option value="">Selecione um local</option>
            `;

            // Agrupar por tipo de pickup
            const groupedLocations = this.groupLocationsByType(locations);

            Object.keys(groupedLocations).forEach(pickupType => {
                if (groupedLocations[pickupType].length > 0) {
                    html += `<optgroup class="pickup-type-section" data-pickup-type="${pickupType}" label="${this.getPickupTypeLabel(pickupType)}">`;

                    groupedLocations[pickupType].forEach(location => {
                        const locationData = this.getLocationData(location.location.ref);
                        const displayName = locationData?.name || location.location.ref;
                        html += `<option value="${location.location.ref}" data-pickup-type="${pickupType}">${displayName}</option>`;
                    });

                    html += `</optgroup>`;
                }
            });

            // Opção para texto livre se permitido
            if (allowCustomPickup) {
                html += `<option value="CUSTOM_LOCATION">Outro local (especificar)</option>`;
            }

            html += `</select>`;
        }

        // Campo de texto livre (mostrado condicionalmente)
        if (allowCustomPickup) {
            html += `
                <input type="text"
                       id="${fieldId}_custom"
                       name="${fieldId}_custom"
                       class="form-control question-input-custom"
                       placeholder="Especifique o local de encontro"
                       style="display: none; margin-top: 10px;"
                       data-question-id="${question.id}"
                       data-question-type="${question.type}"
                       data-group="${question.group}">
            `;
        }

        html += `</div>`;

        if (question.hint) {
            html += `<small class="form-text text-muted">${question.hint}</small>`;
        }

        return html;
    }

    /**
     * Renderizar campo de seleção com opções pré-definidas
     */
    renderSelectField(question, fieldId, requiredAttr) {
        let html = `
            <select id="${fieldId}"
                    name="${fieldId}"
                    class="form-control question-input"
                    ${requiredAttr}
                    ${question.required === 'CONDITIONAL' ? 'data-original-required="CONDITIONAL"' : ''}
                    data-question-id="${question.id}"
                    data-question-type="${question.type}"
                    data-group="${question.group}">
                <option value="">Selecione uma opção</option>
        `;

        question.allowedAnswers.forEach(answer => {
            const displayText = this.getAnswerDisplayText(question.id, answer);
            html += `<option value="${answer}">${displayText}</option>`;
        });

        html += `</select>`;

        if (question.hint) {
            html += `<small class="form-text text-muted">${question.hint}</small>`;
        }

        return html;
    }

    /**
     * Renderizar campo de string simples
     */
    renderStringField(question, fieldId, requiredAttr, maxLengthAttr) {
        const placeholder = question.hint || '';

        if (question.id === 'SPECIAL_REQUIREMENTS') {
            return `
                <textarea id="${fieldId}"
                          name="${fieldId}"
                          class="form-control question-input"
                          rows="3"
                          ${requiredAttr}
                          ${maxLengthAttr}
                          placeholder="Restrições alimentares, acessibilidade, etc."
                          data-question-id="${question.id}"
                          data-question-type="${question.type}"
                          data-group="${question.group}"></textarea>
            `;
        }

        return `
            <input type="text"
                   id="${fieldId}"
                   name="${fieldId}"
                   class="form-control question-input"
                   ${requiredAttr}
                   ${question.required === 'CONDITIONAL' ? 'data-original-required="CONDITIONAL"' : ''}
                   ${maxLengthAttr}
                   placeholder="${placeholder}"
                   data-question-id="${question.id}"
                   data-question-type="${question.type}"
                   data-group="${question.group}">
            ${question.hint ? `<small class="form-text text-muted">${question.hint}</small>` : ''}
        `;
    }

    /**
     * Renderizar campo de tempo
     */
    renderTimeField(question, fieldId, requiredAttr) {
        return `
            <input type="time"
                   id="${fieldId}"
                   name="${fieldId}"
                   class="form-control question-input time-input"
                   ${requiredAttr}
                   step="60"
                   placeholder="HH:MM"
                   inputmode="numeric"
                   data-question-id="${question.id}"
                   data-question-type="${question.type}"
                   data-group="${question.group}">
            ${question.hint ? `<small class="form-text text-muted">${question.hint}</small>` : ''}
        `;
    }

    // Campo simples de endereço para DROP_OFF com hidden sincronizado para unidade
    renderDropOffField(question, fieldId, requiredAttr) {
        const placeholder = question.hint || 'Digite um endereço';
        // Usar um input de texto e um hidden para manter unit conforme a Viator
        return `
            <input type="text"
                   id="${fieldId}_text"
                   class="form-control question-input"
                   ${requiredAttr}
                   placeholder="${placeholder}"
                   data-question-id="${question.id}"
                   data-question-type="${question.type}"
                   data-group="${question.group}">
            <input type="hidden" id="${fieldId}" name="${fieldId}"
                   data-question-id="${question.id}" data-group="${question.group}">
        `;
    }

    /**
     * Agrupar localizações por tipo de pickup
     */
    groupLocationsByType(locations) {
        const grouped = {
            HOTEL: [],
            AIRPORT: [],
            PORT: [],
            LOCATION: [],
            OTHER: []
        };

        locations.forEach(location => {
            const pickupType = location.pickupType || 'OTHER';
            if (grouped[pickupType]) {
                grouped[pickupType].push(location);
            } else {
                grouped.OTHER.push(location);
            }
        });

        return grouped;
    }

    /**
     * Obter label amigável para tipo de pickup
     */
    getPickupTypeLabel(pickupType) {
        const labels = {
            HOTEL: 'Hotéis',
            AIRPORT: 'Aeroportos',
            PORT: 'Portos',
            LOCATION: 'Locais Específicos',
            OTHER: 'Outros'
        };

        return labels[pickupType] || pickupType;
    }

    /**
     * Obter dados de localização por referência
     */
    getLocationData(locationRef) {
        if (!this.dynamicBookingQuestions.locationData) {
            return null;
        }

        return this.dynamicBookingQuestions.locationData.find(loc => loc.reference === locationRef);
    }

    /**
     * Obter texto de exibição para respostas pré-definidas
     */
    getAnswerDisplayText(questionId, answer) {
        const displayTexts = {
            AGEBAND: {
                ADULT: 'Adulto',
                SENIOR: 'Idoso',
                YOUTH: 'Jovem',
                CHILD: 'Criança',
                INFANT: 'Bebê',
                TRAVELER: 'Viajante'
            },
            TRANSFER_ARRIVAL_MODE: { AIR: 'Avião', RAIL: 'Trem', SEA: 'Navio', OTHER: 'Outros' },
            TRANSFER_DEPARTURE_MODE: { AIR: 'Avião', RAIL: 'Trem', SEA: 'Navio', OTHER: 'Outros' }
        };

        // Se for modo de chegada/partida, retornar label traduzido quando houver
        if ((questionId === 'TRANSFER_ARRIVAL_MODE' || questionId === 'TRANSFER_DEPARTURE_MODE') && displayTexts[questionId][answer]) {
            return displayTexts[questionId][answer];
        }

        return displayTexts[questionId]?.[answer] || answer;
    }

    /**
     * Verificar se pergunta é condicional
     */
    isConditionalQuestion(questionId) {
        const conditionalQuestions = [
            'TRANSFER_AIR_ARRIVAL_AIRLINE',
            'TRANSFER_AIR_ARRIVAL_FLIGHT_NO',
            'TRANSFER_AIR_DEPARTURE_AIRLINE',
            'TRANSFER_AIR_DEPARTURE_FLIGHT_NO',
            'TRANSFER_PORT_CRUISE_SHIP',
            'TRANSFER_PORT_ARRIVAL_TIME',
            'TRANSFER_PORT_DEPARTURE_TIME',
            'TRANSFER_RAIL_ARRIVAL_STATION',
            'TRANSFER_RAIL_ARRIVAL_LINE',
            'TRANSFER_RAIL_DEPARTURE_STATION',
            'TRANSFER_RAIL_DEPARTURE_LINE',
            'TRANSFER_ARRIVAL_DROP_OFF',
            'TRANSFER_DEPARTURE_PICKUP',
            'TRANSFER_ARRIVAL_TIME',
            'TRANSFER_DEPARTURE_TIME',
            'TRANSFER_DEPARTURE_DATE'
        ];

        return conditionalQuestions.includes(questionId);
    }

    /**
     * Renderizar uma única booking question
     */
    renderSingleQuestion(question, scope, travelerIndex = null) {
        const questionId = question.id;
        const fieldId = travelerIndex ? `${questionId}_traveler_${travelerIndex}` : questionId;
        const isRequired = question.required === 'MANDATORY';
        const isPerTraveler = question.group === 'PER_TRAVELER';
        const requiredLabel = isRequired ? ' *' : '';

        // Verificar se é pergunta condicional e se deve ser mostrada
        // Não forçar exibição de campos de transferência quando o produto não tem pickup
        const pickupDataForVisibility = this.getPickupData ? this.getPickupData() : undefined;
        const noPickupMode = pickupDataForVisibility && pickupDataForVisibility.pickupOptionType === 'MEET_EVERYONE_AT_START_POINT';

        // Normalizar valor atual do arrival mode
        const normalizeMode = (val) => {
            if (!val) return val;
            const map = { 'Avião': 'AIR', 'Trem': 'RAIL', 'Navio': 'SEA', 'Outros': 'OTHER' };
            return map[val] || val;
        };
        const arrivalModeEl2 = document.querySelector('[id*="TRANSFER_ARRIVAL_MODE"]');
        const arrivalModeNow = normalizeMode(arrivalModeEl2 ? arrivalModeEl2.value : '');
        const arrivalOther = arrivalModeNow === 'OTHER';

        const alwaysVisible = new Set(
            (noPickupMode || arrivalOther)
                ? []
                : ['TRANSFER_AIR_ARRIVAL_AIRLINE','TRANSFER_AIR_ARRIVAL_FLIGHT_NO','TRANSFER_ARRIVAL_TIME','TRANSFER_ARRIVAL_DROP_OFF']
        );
        if (this.isConditionalQuestion(questionId) && !this.shouldShowConditionalQuestion(questionId) && !alwaysVisible.has(questionId)) {
            return '';
        }

        let questionHTML = `<div class="form-group question-group" data-question-id="${questionId}" data-scope="${scope}">`;

        // CORREÇÃO CRÍTICA: Label da pergunta com verificação dupla
        const questionLabel = this.getQuestionLabel(question);

        // CORREÇÃO: Garantir que questionLabel seja string válida
        const safeQuestionLabel = this.ensureStringForHTML(questionLabel, 'Pergunta');

        // Debug para identificar problemas
        if (questionLabel !== safeQuestionLabel) {
            console.warn('⚠️ Label convertido de objeto para string:', {
                original: questionLabel,
                converted: safeQuestionLabel,
                questionId: question.id
            });
        }

        questionHTML += `<label for="${fieldId}" class="question-label">`;
        questionHTML += `${safeQuestionLabel}${requiredLabel}`;
        questionHTML += `</label>`;

        // CORREÇÃO: Adicionar hint se disponível, garantindo que seja string
        if (question.hint) {
            const hintText = this.ensureStringForHTML(question.hint);
            if (hintText.trim() !== '') {
                questionHTML += `<div class="question-hint booker-note">${hintText}</div>`;
            }
        }

        // Renderizar campo usando sistema dinâmico
        questionHTML += this.renderDynamicBookingField(question, fieldId, isRequired, isPerTraveler, travelerIndex);

        // Adicionar validação de erro
        questionHTML += `<div class="error-message" id="error_${fieldId}" style="display: none;"></div>`;
        questionHTML += `</div>`;

        return questionHTML;
    }

    /**
     * CORREÇÃO: Função utilitária para garantir que valores sejam strings válidas para HTML
     */
    ensureStringForHTML(value, fallback = '') {
        if (value === null || value === undefined) {
            return fallback;
        }

        if (typeof value === 'string') {
            return value;
        }

        if (typeof value === 'object') {
            console.warn('⚠️ Objeto detectado onde esperava-se string, convertendo:', value);
            // Tentar extrair propriedades comuns
            if (value.text) return String(value.text);
            if (value.label) return String(value.label);
            if (value.title) return String(value.title);
            if (value.name) return String(value.name);
            // Como último recurso, usar JSON.stringify
            return JSON.stringify(value);
        }

        return String(value);
    }

    /**
     * Obter label amigável para a pergunta
     */
    getQuestionLabel(question) {
        // CORREÇÃO: Verificar se question é um objeto válido
        if (!question || typeof question !== 'object') {
            console.warn('⚠️ getQuestionLabel recebeu parâmetro inválido:', question);
            return 'Pergunta';
        }

        const labels = {
            'FULL_NAMES_FIRST': 'Nome',
            'FULL_NAMES_LAST': 'Sobrenome',
            'DATE_OF_BIRTH': 'Data de Nascimento',
            'AGEBAND': 'Faixa Etária',
            'PICKUP_POINT': 'Local de Encontro',
            'SPECIAL_REQUIREMENTS': 'Necessidades Especiais',
            'WEIGHT': 'Peso',
            'HEIGHT': 'Altura',
            'PASSPORT_EXPIRY': 'Validade do Passaporte',
            'PASSPORT_NATIONALITY': 'Nacionalidade do Passaporte',
            'PASSPORT_PASSPORT_NO': 'Número do Passaporte',
            'TRANSFER_ARRIVAL_MODE': 'Modo de Chegada',
            'TRANSFER_DEPARTURE_MODE': 'Modo de Saída',
            'TRANSFER_AIR_ARRIVAL_AIRLINE': 'Companhia Aérea (Chegada)',
            'TRANSFER_AIR_ARRIVAL_FLIGHT_NO': 'Número do Voo (Chegada)',
            'TRANSFER_AIR_DEPARTURE_AIRLINE': 'Companhia Aérea (Saída)',
            'TRANSFER_AIR_DEPARTURE_FLIGHT_NO': 'Número do Voo (Saída)',
            'TRANSFER_PORT_CRUISE_SHIP': 'Nome do Navio',
            'TRANSFER_PORT_ARRIVAL_TIME': 'Horário de Chegada no Porto',
            'TRANSFER_PORT_DEPARTURE_TIME': 'Horário de Saída do Porto',
            'TRANSFER_RAIL_ARRIVAL_STATION': 'Estação de Chegada',
            'TRANSFER_RAIL_ARRIVAL_LINE': 'Linha do Trem (Chegada)',
            'TRANSFER_RAIL_DEPARTURE_STATION': 'Estação de Saída',
            'TRANSFER_RAIL_DEPARTURE_LINE': 'Linha do Trem (Saída)',
            'TRANSFER_ARRIVAL_DROP_OFF': 'Local de Desembarque',
            'TRANSFER_DEPARTURE_PICKUP': 'Local de Embarque',
            'TRANSFER_ARRIVAL_TIME': 'Horário de Chegada',
            'TRANSFER_DEPARTURE_TIME': 'Horário de Saída',
            'TRANSFER_DEPARTURE_DATE': 'Data de Saída'
        };

        // CORREÇÃO CRÍTICA: Usar função utilitária para garantir string válida
        const labelText = this.ensureStringForHTML(question.label);

        // Se conseguiu extrair um label válido, usar ele
        if (labelText && labelText.trim() !== '') {
            return labelText.trim();
        }

        // Fallback para labels predefinidos
        if (question.id && labels[question.id]) {
            return labels[question.id];
        }

        // Último fallback
        return question.id || 'Pergunta';
    }

    /**
     * Verificar se pergunta condicional deve ser mostrada
     */
    shouldShowConditionalQuestion(questionId) {
        // Lógica para perguntas condicionais baseada na documentação oficial
        const conditionalLogic = {
            'TRANSFER_AIR_ARRIVAL_AIRLINE': () => this.getFieldValue('TRANSFER_ARRIVAL_MODE') === 'AIR',
            'TRANSFER_AIR_ARRIVAL_FLIGHT_NO': () => this.getFieldValue('TRANSFER_ARRIVAL_MODE') === 'AIR',
            'TRANSFER_AIR_DEPARTURE_AIRLINE': () => this.getFieldValue('TRANSFER_DEPARTURE_MODE') === 'AIR',
            'TRANSFER_AIR_DEPARTURE_FLIGHT_NO': () => this.getFieldValue('TRANSFER_DEPARTURE_MODE') === 'AIR',
            'TRANSFER_PORT_CRUISE_SHIP': () => this.getFieldValue('TRANSFER_ARRIVAL_MODE') === 'SEA' || this.getFieldValue('TRANSFER_DEPARTURE_MODE') === 'SEA',
            'TRANSFER_PORT_ARRIVAL_TIME': () => this.getFieldValue('TRANSFER_ARRIVAL_MODE') === 'SEA',
            'TRANSFER_PORT_DEPARTURE_TIME': () => this.getFieldValue('TRANSFER_DEPARTURE_MODE') === 'SEA',
            'TRANSFER_RAIL_ARRIVAL_STATION': () => this.getFieldValue('TRANSFER_ARRIVAL_MODE') === 'RAIL',
            'TRANSFER_RAIL_ARRIVAL_LINE': () => this.getFieldValue('TRANSFER_ARRIVAL_MODE') === 'RAIL',
            'TRANSFER_RAIL_DEPARTURE_STATION': () => this.getFieldValue('TRANSFER_DEPARTURE_MODE') === 'RAIL',
            'TRANSFER_RAIL_DEPARTURE_LINE': () => this.getFieldValue('TRANSFER_DEPARTURE_MODE') === 'RAIL'
        };
        // Garantir que os valores de modo sejam em inglês (AIR/SEA/RAIL/OTHER) mesmo que exibidos traduzidos
        // Se algum select de modo armazenar o label traduzido, normalizamos de volta
        const normalizeMode = (val) => {
            if (!val) return val;
            const map = { 'Avião': 'AIR', 'Trem': 'RAIL', 'Navio': 'SEA', 'Outros': 'OTHER' };
            return map[val] || val;
        };
        const arrivalModeEl = document.querySelector('[id*="TRANSFER_ARRIVAL_MODE"]');
        if (arrivalModeEl) arrivalModeEl.value = normalizeMode(arrivalModeEl.value);
        const departureModeEl = document.querySelector('[id*="TRANSFER_DEPARTURE_MODE"]');
        if (departureModeEl) departureModeEl.value = normalizeMode(departureModeEl.value);

        const condition = conditionalLogic[questionId];
        return condition ? condition() : true;
    }

    /**
     * Obter valor de campo específico
     */
    getFieldValue(fieldId) {
        const field = document.getElementById(fieldId);
        return field ? field.value : null;
    }

    /**
     * Configurar eventos para campos dinâmicos
     */
    setupDynamicFieldEvents() {
		if (this._dynamicFieldEventsBound) { return; }
		this._dynamicFieldEventsBound = true;
        // Event listener para mudanças em campos de transfer mode
        document.addEventListener('change', (e) => {
            if (e.target.matches('[data-question-id="TRANSFER_ARRIVAL_MODE"], [data-question-id="TRANSFER_DEPARTURE_MODE"]')) {
                this.handleTransferModeChange(e.target);
            }

            // Event listener para pickup point custom
            if (e.target.matches('[data-question-id="PICKUP_POINT"]')) {
                this.handlePickupPointChange(e.target);
            }

            // Mudanças no campo de hora (aplicar máscara também em change)
            if (
                e.target.matches('.time-input') ||
                e.target.id === 'booking_question_TRANSFER_ARRIVAL_TIME' ||
                (e.target.dataset && e.target.dataset.questionId === 'TRANSFER_ARRIVAL_TIME')
            ) {
                let v = (e.target.value || '').replace(/[^0-9]/g, '').slice(0, 4);
                if (v.length >= 3) v = v.slice(0, 2) + ':' + v.slice(2);
                e.target.value = v;
            }
        });

        // Event listener para validação em tempo real
        document.addEventListener('blur', (e) => {
            if (e.target.matches('.question-input')) {
                this.validateField(e.target);
            }
        });

        // Máscara simples para inputs de hora (fallback quando type="time" não mascara)
        document.addEventListener('input', (e) => {
            if (
                e.target.matches('.time-input') ||
                e.target.id === 'booking_question_TRANSFER_ARRIVAL_TIME' ||
                (e.target.dataset && e.target.dataset.questionId === 'TRANSFER_ARRIVAL_TIME')
            ) {
                let v = (e.target.value || '').replace(/[^0-9]/g, '').slice(0, 4);
                if (v.length >= 3) v = v.slice(0, 2) + ':' + v.slice(2);
                e.target.value = v;
            }
            // Sincronizar DROP_OFF: copiar valor do _text/_freetext para o hidden e setar unit
            const id = e.target.id || '';
            if ((id.includes('TRANSFER_ARRIVAL_DROP_OFF')) && (/_((text)|(freetext))$/.test(id))) {
                const baseId = id.replace(/_(text|freetext)$/, '');
                const hidden = document.getElementById(baseId);
                if (hidden) {
                    const value = (e.target.value || '').trim();
                    hidden.value = value;
                    hidden.setAttribute('data-question-id', 'TRANSFER_ARRIVAL_DROP_OFF');
                    if (value) hidden.setAttribute('data-unit', 'FREETEXT'); else hidden.removeAttribute('data-unit');
                }
                // Opcional: garantir dataset no input de freetext para coleta genérica
                if (!e.target.dataset || !e.target.dataset.questionId) {
                    try {
                        e.target.setAttribute('data-question-id', 'TRANSFER_ARRIVAL_DROP_OFF');
                        e.target.setAttribute('data-group', 'PER_BOOKING');
                    } catch (err) { /* no-op */ }
                }
            }
        });
    }
    /**
     * Lidar com mudança no modo de transfer
     */
    handleTransferModeChange(field) {
        const mode = field.value;
        const isArrival = field.dataset.questionId === 'TRANSFER_ARRIVAL_MODE';
        const prefix = isArrival ? 'TRANSFER_AIR_ARRIVAL' : 'TRANSFER_AIR_DEPARTURE';

        // Mostrar/esconder campos condicionais
        const conditionalFields = document.querySelectorAll(`[data-question-id^="${prefix}"]`);
        conditionalFields.forEach(conditionalField => {
            const questionGroup = conditionalField.closest('.question-group');
            if (questionGroup) {
                questionGroup.style.display = mode === 'AIR' ? 'block' : 'none';
            }
        });

        // Lógica similar para SEA e RAIL
        if (isArrival) {
            this.toggleConditionalFields('TRANSFER_PORT', mode === 'SEA');
            this.toggleConditionalFields('TRANSFER_RAIL_ARRIVAL', mode === 'RAIL');
        } else {
            this.toggleConditionalFields('TRANSFER_PORT', mode === 'SEA');
            this.toggleConditionalFields('TRANSFER_RAIL_DEPARTURE', mode === 'RAIL');
        }
    }

    /**
     * Alternar visibilidade de campos condicionais
     */
    toggleConditionalFields(prefix, show) {
        const fields = document.querySelectorAll(`[data-question-id^="${prefix}"]`);
        fields.forEach(field => {
            const questionGroup = field.closest('.question-group');
            if (questionGroup) {
                questionGroup.style.display = show ? 'block' : 'none';
            }
        });
    }
    /**
     * Lidar com mudança no pickup point
     */
    handlePickupPointChange(evtOrField) {
        // Aceitar tanto um evento quanto um elemento diretamente
        const field = (evtOrField && evtOrField.target) ? evtOrField.target : evtOrField;
        if (!field) return;

        const value = field.value;

        // Compatibilidade legado: busca por elemento com id _custom
        const legacyCustomField = document.getElementById((field.id || '') + '_custom');
        if (legacyCustomField) {
            if (value === 'CUSTOM_LOCATION') {
                legacyCustomField.style.display = 'block';
                legacyCustomField.required = true;
            } else {
                legacyCustomField.style.display = 'none';
                legacyCustomField.required = false;
                legacyCustomField.value = '';
            }
        }

        // Nova UI dinâmica: toggle do bloco .pickup-custom-input dentro do container
        const questionId = (field.dataset && field.dataset.questionId) || field.name || '';
        const container = field.closest('.pickup-point-container') || (questionId ? document.getElementById(`${questionId}_container`) : null);
        if (container) {
            const customInputBlock = container.querySelector('.pickup-custom-input');
            const freetextInput = container.querySelector('.pickup-freetext-input, input[id$="_freetext"]');
            const suggestionsBox = container.querySelector('.places-suggestions');
            const hiddenField = questionId ? document.getElementById(questionId) : null;

            // Quando seleciona CUSTOM_LOCATION, exibir o campo
            if (field.type === 'radio' && field.name === questionId) {
                if (value === 'CUSTOM_LOCATION' && field.checked) {
                    if (customInputBlock) customInputBlock.style.display = 'block';
                    if (freetextInput) freetextInput.focus();
                    // Não gravar valor no hidden ainda; será preenchido ao digitar
                    if (hiddenField) {
                        hiddenField.value = '';
                        hiddenField.removeAttribute('data-unit');
                    }
                } else if (value !== 'CUSTOM_LOCATION' && field.checked) {
                    // Selecionou outra opção: esconder campo custom e limpar
                    if (customInputBlock) customInputBlock.style.display = 'none';
                    if (freetextInput) freetextInput.value = '';
                    if (suggestionsBox) { suggestionsBox.style.display = 'none'; suggestionsBox.innerHTML = ''; }
                    if (hiddenField) {
                        hiddenField.value = value;
                        hiddenField.setAttribute('data-unit', value && value.indexOf('LOC-') === 0 ? 'LOCATION_REFERENCE' : 'LOCATION_REFERENCE');
                    }
                }
            }

            // Sincronizar digitação no freetext com hidden principal
            if (freetextInput && hiddenField && !freetextInput._viatorSyncBound) {
                freetextInput.addEventListener('input', function() {
                    const v = this.value.trim();
                    hiddenField.value = v;
                    if (v) hiddenField.setAttribute('data-unit', 'FREETEXT'); else hiddenField.removeAttribute('data-unit');
                });
                freetextInput._viatorSyncBound = true;
            }
        }
    }
    /**
     * Validar campo individual
     */
    validateField(field) {
        const questionId = field.dataset.questionId;
        const value = field.value.trim();
        const isRequired = field.hasAttribute('required');
        const errorElement = document.getElementById(`error_${field.id}`);

        let isValid = true;
        let errorMessage = '';

        // Validação básica de campo obrigatório
        if (isRequired && !value) {
            isValid = false;
            errorMessage = 'Obrigatório';
        }

        // Validações específicas por tipo de campo
        if (value && questionId) {
            switch (questionId) {
                case 'DATE_OF_BIRTH':
                    if (!this.isValidDate(value)) {
                        isValid = false;
                        errorMessage = 'Data inválida';
                    }
                    break;

                case 'PASSPORT_EXPIRY':
                    if (!this.isValidDate(value) || new Date(value) <= new Date()) {
                        isValid = false;
                        errorMessage = 'Data de validade deve ser futura';
                    }
                    break;

                case 'WEIGHT':
                case 'HEIGHT':
                    if (isNaN(value) || parseFloat(value) <= 0) {
                        isValid = false;
                        errorMessage = 'Valor deve ser um número positivo';
                    }
                    break;
            }
        }

        // Mostrar/esconder erro
        if (errorElement) {
            if (isValid) {
                errorElement.style.display = 'none';
                field.classList.remove('is-invalid');
            } else {
                errorElement.textContent = errorMessage;
                errorElement.style.display = 'block';
                field.classList.add('is-invalid');
            }
        }

        return isValid;
    }

    /**
     * Validar se data é válida
     */
    isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    /**
     * Sistema de cache inteligente para dados da API
     */
    getSmartCachedData(key, hoursValid = 24) {
        try {
            const cached = localStorage.getItem(key);
            if (!cached) return null;

            const data = JSON.parse(cached);
            const now = new Date().getTime();
            const cacheTime = new Date(data.timestamp).getTime();
            const hoursElapsed = (now - cacheTime) / (1000 * 60 * 60);

            if (hoursElapsed < hoursValid) {
                return data.content;
            } else {
                localStorage.removeItem(key);
                return null;
            }
        } catch (error) {
            console.warn('Erro ao ler cache:', error);
            return null;
        }
    }

    /**
     * Salvar dados no cache inteligente
     */
    setSmartCache(key, data, hoursValid = 24) {
        try {
            const cacheData = {
                content: data,
                timestamp: new Date().toISOString(),
                hoursValid: hoursValid
            };
            localStorage.setItem(key, JSON.stringify(cacheData));
        } catch (error) {
            console.warn('Erro ao salvar cache:', error);
        }
    }

    /**
     * Coletar respostas de booking questions dinamicamente
     */
    collectDynamicBookingAnswers() {
        const answers = [];
        
        // CORREÇÃO: Buscar tanto por classe quanto por seletores específicos de viajantes
        // Coletar somente dentro do container da etapa 3 para evitar duplicidade
        const stepContainer = document.getElementById('booking-questions-content') || document;
        const generalInputs = stepContainer.querySelectorAll('.question-input');
        const travelerInputs = stepContainer.querySelectorAll('[id*="traveler_"][data-question-id]');
        // Filtrar quaisquer inputs aninhados dentro de '.additional-booking-info-section' que não sejam parte do Step 3 principal
        const filteredGeneral = Array.from(generalInputs).filter(el => !el.closest('#additional-booking-info-section .booking-question-group'));
        const filteredTraveler = Array.from(travelerInputs).filter(el => !el.closest('#additional-booking-info-section .booking-question-group'));
        
        // Combinar ambos os seletores e remover duplicatas
        const allInputs = new Set([...filteredGeneral, ...filteredTraveler]);
        const questionInputs = Array.from(allInputs);

        console.log('🔍 [DYNAMIC DEBUG] collectDynamicBookingAnswers() iniciado');
        console.log('🔍 [DYNAMIC DEBUG] Elementos .question-input encontrados:', generalInputs.length);
        console.log('🔍 [DYNAMIC DEBUG] Elementos traveler específicos encontrados:', travelerInputs.length);
        console.log('🔍 [DYNAMIC DEBUG] Total após combinação:', questionInputs.length);

        // Se estamos na etapa 2, garantir que respostas sejam persistidas imediatamente
        try {
            this.bookingData.bookingQuestionAnswers = this.bookingData.bookingQuestionAnswers || [];
        } catch (e) {
            // no-op
        }

        // Debug: listar todos os elementos encontrados
        questionInputs.forEach((input, index) => {
            console.log(`🔍 [DYNAMIC DEBUG] Input ${index}:`, {
                id: input.id,
                name: input.name,
                value: input.value,
                questionId: input.dataset.questionId,
                questionType: input.dataset.questionType,
                group: input.dataset.group
            });
        });

        questionInputs.forEach(input => {
            const questionId = input.dataset.questionId;
            const questionType = input.dataset.questionType;
            const group = input.dataset.group;
            const value = input.value ? input.value.trim() : '';

            console.log(`🔍 [DYNAMIC DEBUG] Processando input:`, {
                questionId,
                questionType,
                group,
                value,
                hasQuestionId: !!questionId,
                hasValue: !!value
            });

            if (!questionId) {
                console.log(`⚠️ [DYNAMIC DEBUG] Input ignorado - sem questionId`);
                return;
            }

            if (!value || value.trim() === '') {
                console.log(`⚠️ [DYNAMIC DEBUG] Input ignorado - campo vazio para ${questionId}`);
                return;
            }

            // Evitar coletar PICKUP_POINT aqui; trataremos em bloco específico mais abaixo
            if (questionId === 'PICKUP_POINT') {
                console.log('ℹ️ [DYNAMIC DEBUG] Ignorando PICKUP_POINT neste passo; coleta especializada ocorrerá adiante');
                return;
            }

            // Construir resposta baseada na especificação oficial
            const answer = {
                question: questionId,
                answer: value
            };

            // Unidade obrigatória para DROP_OFF (sempre FREETEXT quando via texto)
            if (questionId === 'TRANSFER_ARRIVAL_DROP_OFF') {
                answer.unit = 'FREETEXT';
            }

            // Adicionar travelerNum se for PER_TRAVELER
            if (group === 'PER_TRAVELER') {
                // Buscar índice do viajante de várias formas (1-based)
                const travelerMatch = input.id.match(/traveler_(\d+)_/) || input.id.match(/_traveler_(\d+)$/);
                const travelerDataAttr = input.getAttribute('data-traveler');
                let travelerNum = null;

                if (travelerMatch) {
                    travelerNum = parseInt(travelerMatch[1], 10);
                } else if (travelerDataAttr) {
                    travelerNum = parseInt(travelerDataAttr, 10);
                }

                // Fallback seguro: 1 (primeiro viajante)
                if (!travelerNum || Number.isNaN(travelerNum) || travelerNum < 1) {
                    travelerNum = 1;
                }

                answer.travelerNum = travelerNum;
                
                console.log(`✅ [PER_TRAVELER] Resposta coletada para ${questionId} (traveler ${answer.travelerNum}):`, answer);
            }

            // Adicionar unidade se for NUMBER_AND_UNIT
            if (questionType === 'NUMBER_AND_UNIT') {
                // Selecionar o campo de unidade corretamente (id ou name com _unit)
                let unitField = document.getElementById(input.id + '_unit');
                if (!unitField) {
                    unitField = document.querySelector(`select[name="${input.id}_unit"]`);
                }
                if (unitField && unitField.value) {
                    answer.unit = unitField.value;
                }
            }

            // Tratar pickup point custom
            if (questionId === 'PICKUP_POINT' && value === 'CUSTOM_LOCATION') {
                const customField = document.getElementById(input.id + '_custom');
                if (customField && customField.value.trim()) {
                    answer.answer = customField.value.trim();
                    answer.unit = 'FREETEXT';
                } else {
                    return; // Não adicionar se custom está vazio
                }
            } else if (questionId === 'PICKUP_POINT' && value !== 'CUSTOM_LOCATION') {
                answer.unit = 'LOCATION_REFERENCE';
            }

            console.log(`✅ [DYNAMIC DEBUG] Resposta adicionada:`, answer);
            answers.push(answer);
        });

        console.log('🔍 [DYNAMIC DEBUG] Total de respostas coletadas:', answers.length);
        console.log('🔍 [DYNAMIC DEBUG] Respostas dinâmicas coletadas:', answers);

        // CORREÇÃO: Coleta Cross-Step com prioridade (lista > freetext > hidden)
        const hiddenPickupField = document.querySelector('input[type="hidden"][data-question-id="PICKUP_POINT"]');
        const baseId = hiddenPickupField?.id || 'booking_question_PICKUP_POINT';

        const listChoiceSelected = document.querySelector(`input[name="${baseId}_list_choice"]:checked`);
        const customRadioSelected = document.getElementById(`${baseId}_custom`);
        const freetextInputEl = document.getElementById(`${baseId}_freetext`);

        let pickupAnswer = null;

        // Preferência: se houver texto livre preenchido, priorizar FREETEXT (somente quando permitido)
        if (this.isCustomPickupAllowed() && freetextInputEl && freetextInputEl.value && freetextInputEl.value.trim() !== '') {
            pickupAnswer = {
                    question: 'PICKUP_POINT',
                answer: freetextInputEl.value.trim(),
                unit: 'FREETEXT'
            };
            console.log('✅ [DYNAMIC DEBUG] PICKUP_POINT via freetext (prioritário):', pickupAnswer);
        } else if (listChoiceSelected && listChoiceSelected.value) {
            const listVal = listChoiceSelected.value.trim();
            if (listVal === 'CUSTOM_LOCATION' && !this.isCustomPickupAllowed()) {
                console.warn('❌ [DYNAMIC DEBUG] CUSTOM_LOCATION selecionado, mas não permitido para este produto. Ignorando.');
            } else {
            const specialRef = (v) => v === 'CONTACT_SUPPLIER_LATER' || v === 'MEET_AT_DEPARTURE_POINT';
            pickupAnswer = {
                question: 'PICKUP_POINT',
                answer: listVal,
                unit: (listVal.startsWith('LOC-') || specialRef(listVal)) ? 'LOCATION_REFERENCE' : 'FREETEXT'
            };
            console.log('✅ [DYNAMIC DEBUG] PICKUP_POINT via lista:', pickupAnswer);
            }
        } else if (customRadioSelected?.checked && freetextInputEl && freetextInputEl.value.trim()) {
            if (this.isCustomPickupAllowed()) {
            pickupAnswer = {
                question: 'PICKUP_POINT',
                answer: freetextInputEl.value.trim(),
                unit: 'FREETEXT'
            };
            console.log('✅ [DYNAMIC DEBUG] PICKUP_POINT via freetext:', pickupAnswer);
            } else {
                console.warn('❌ [DYNAMIC DEBUG] Fretexto de CUSTOM_LOCATION digitado, mas custom não é permitido. Ignorando.');
            }
        } else if (hiddenPickupField && hiddenPickupField.value && hiddenPickupField.value !== 'CHOOSE_FROM_LIST') {
            const hiddenVal = hiddenPickupField.value.trim();
            const specialRef = (v) => v === 'CONTACT_SUPPLIER_LATER' || v === 'MEET_AT_DEPARTURE_POINT';
            if (hiddenVal === 'CUSTOM_LOCATION' && !this.isCustomPickupAllowed()) {
                console.warn('❌ [DYNAMIC DEBUG] Hidden CUSTOM_LOCATION detectado, mas não permitido. Ignorando.');
            } else {
                const inferredUnit =
                    (hiddenVal.startsWith('LOC-') || specialRef(hiddenVal))
                        ? 'LOCATION_REFERENCE'
                        : (hiddenPickupField.getAttribute('data-unit') || 'FREETEXT');
            pickupAnswer = {
                question: 'PICKUP_POINT',
                answer: hiddenVal,
                    unit: inferredUnit
            };
            console.log('✅ [DYNAMIC DEBUG] PICKUP_POINT via hidden:', pickupAnswer);
            }
        } else {
            console.log('⚠️ [DYNAMIC DEBUG] Nenhum PICKUP_POINT válido selecionado ainda');
        }

        if (pickupAnswer && !answers.find(a => a.question === 'PICKUP_POINT')) {
                answers.push(pickupAnswer);
            }

        // CORREÇÃO: Usar cache do PICKUP_POINT se disponível
        if (this.cachedPickupPoint && this.cachedPickupPoint.answer && !answers.find(a => a.question === 'PICKUP_POINT')) {
            console.log('✅ [CACHE] PICKUP_POINT encontrado no cache:', this.cachedPickupPoint);

            // Verificar se já não foi adicionado pelos seletores DOM
                answers.push(this.cachedPickupPoint);
                console.log('✅ [CACHE] PICKUP_POINT adicionado do cache às respostas');
        } else {
            console.log('⚠️ [CACHE] Nenhum PICKUP_POINT encontrado no cache');
        }

        console.log('🔍 [DYNAMIC DEBUG] Total final de respostas (incluindo cross-step + cache):', answers.length);

        // Fallback explícito: capturar TRANSFER_ARRIVAL_DROP_OFF de _freetext se ainda não coletado
        try {
            if (!answers.find(a => a.question === 'TRANSFER_ARRIVAL_DROP_OFF')) {
            const dropOffFreetext = document.getElementById('booking_question_TRANSFER_ARRIVAL_DROP_OFF_freetext')
                    || document.querySelector('input[id*="TRANSFER_ARRIVAL_DROP_OFF"][id$="_freetext"], input[id*="TRANSFER_ARRIVAL_DROP_OFF"][id$="_text"]');
                if (dropOffFreetext && (dropOffFreetext.value || '').trim() !== '') {
                    const val = dropOffFreetext.value.trim();
                    answers.push({ question: 'TRANSFER_ARRIVAL_DROP_OFF', answer: val, unit: 'FREETEXT' });
                    console.log('✅ [DYNAMIC DEBUG] TRANSFER_ARRIVAL_DROP_OFF via freetext (fallback):', val);
                }
            }
        } catch (e) { /* no-op */ }

        // CORREÇÃO: Coletar respostas de language guide
        this.collectLanguageGuideAnswers(answers);

        // CORREÇÃO REMOVIDA: Language guide NÃO é booking question
        // Language guides devem ser tratados separadamente das booking questions
        // API Viator rejeita LANGUAGE_GUIDE como booking question inválida

        console.log('🔍 [LANGUAGE GUIDE DEBUG] Language guides detectados mas NÃO adicionados às booking questions');
        console.log('🔍 [LANGUAGE GUIDE DEBUG] Language guides devem ser enviados como campo separado na requisição');

        console.log('🔍 [DYNAMIC DEBUG] Total final após language guide:', answers.length);

        // Se arrival mode for OTHER, não coletar campos de tempo/drop-off de chegada
        try {
            const arr = answers.find(a => (a?.question || a?.questionId) === 'TRANSFER_ARRIVAL_MODE');
            const arrIsOther = arr && String(arr.answer || '').trim() === 'OTHER';
            if (arrIsOther) {
                const before = answers.length;
                const filteredArr = answers.filter(a => {
                    const qid = a && (a.question || a.questionId);
                    return qid !== 'TRANSFER_ARRIVAL_TIME' && qid !== 'TRANSFER_ARRIVAL_DROP_OFF';
                });
                if (filteredArr.length !== before) {
                    console.log('🔧 [DYNAMIC DEBUG] Removidos campos de chegada (mode OTHER):', { antes: before, depois: filteredArr.length });
                }
                answers.length = 0;
                Array.prototype.push.apply(answers, filteredArr);
            }
        } catch(e) { /* no-op */ }

		// Regra oficial: para product option SEM pickup, responder modos como OTHER automaticamente
		try {
			const pickupData = this.getPickupData();
			if (pickupData && pickupData.pickupOptionType === 'MEET_EVERYONE_AT_START_POINT') {
				['TRANSFER_ARRIVAL_MODE', 'TRANSFER_DEPARTURE_MODE'].forEach((qid) => {
					if ((this.bookingQuestions || []).some(q => q.id === qid) && !answers.find(a => a.question === qid)) {
						answers.push({ question: qid, answer: 'OTHER' });
						console.log(`✅ [DYNAMIC DEBUG] ${qid} definido automaticamente como OTHER (sem pickup)`);
					}
				});
			}
		} catch (e) { /* no-op */ }

		// FILTRO FINAL DE CONFORMIDADE: manter apenas perguntas suportadas e remover campos de transferência quando não há pickup
		try {
			const extractId = (q) => (typeof q === 'string' ? q : (q?.id || q?.question || null));
			const dyn = Array.isArray(this.dynamicBookingQuestions?.allQuestions) ? this.dynamicBookingQuestions.allQuestions : [];
			const bkq = Array.isArray(this.bookingQuestions) ? this.bookingQuestions : [];
			const win = Array.isArray(window.productData?.bookingQuestions) ? window.productData.bookingQuestions : [];
			const allowedIds = new Set([
				...dyn.map(extractId).filter(Boolean),
				...bkq.map(extractId).filter(Boolean),
				...win.map(extractId).filter(Boolean)
			]);

			const pickupInfo = this.getPickupData ? this.getPickupData() : undefined;
			const noPickup = pickupInfo && pickupInfo.pickupOptionType === 'MEET_EVERYONE_AT_START_POINT';

			const before = answers.length;
			const filtered = answers.filter((ans) => {
				const qid = ans && (ans.question || ans.questionId);
				if (!qid) return false;
				if (noPickup && (qid === 'TRANSFER_ARRIVAL_TIME' || qid === 'TRANSFER_ARRIVAL_DROP_OFF')) return false;
				return allowedIds.size === 0 || allowedIds.has(qid);
			});
			if (filtered.length !== before) {
				console.log('🔧 [DYNAMIC DEBUG] Respostas filtradas por conformidade:', { antes: before, depois: filtered.length });
			}

			// Sanitização de valores para modos (usar allowedAnswers do produto)
			try {
				const getAllowed = (id) => {
					const q = (this.dynamicBookingQuestions?.allQuestions || []).find((qq) => (qq?.id || qq?.question) === id);
					return Array.isArray(q?.allowedAnswers) ? q.allowedAnswers : null;
				};
				['TRANSFER_ARRIVAL_MODE', 'TRANSFER_DEPARTURE_MODE'].forEach((qid) => {
					const allowed = getAllowed(qid);
					if (!allowed || allowed.length === 0) return;
					const idx = filtered.findIndex((a) => (a?.question || a?.questionId) === qid);
					if (idx !== -1) {
						const cur = filtered[idx].answer;
						if (!allowed.includes(cur)) {
							const fallback = allowed.includes('OTHER') ? 'OTHER' : allowed[0];
							console.warn(`⚠️ [DYNAMIC DEBUG] ${qid} valor inválido "${cur}". Ajustando para "${fallback}" (allowed: ${allowed.join(', ')})`);
							filtered[idx].answer = fallback;
						}
					}
				});
			} catch(_e) { /* no-op */ }

			// Garantir preenchimento de modos quando esperados pelo produto e ausentes nas respostas
			try {
				const expectQuestion = (id) => Array.isArray(this.bookingQuestions) && this.bookingQuestions.some(q => (q?.id || q?.question) === id);
				['TRANSFER_ARRIVAL_MODE','TRANSFER_DEPARTURE_MODE'].forEach((qid) => {
					if (expectQuestion(qid) && !filtered.find(a => (a?.question || a?.questionId) === qid)) {
						const allowed = (this.dynamicBookingQuestions?.allQuestions || []).find(qq => (qq?.id || qq?.question) === qid)?.allowedAnswers;
						let fallback = 'OTHER';
						if (Array.isArray(allowed) && allowed.length > 0) {
							fallback = allowed.includes('OTHER') ? 'OTHER' : allowed[0];
						}
						filtered.push({ question: qid, answer: fallback });
						console.log(`✅ [DYNAMIC DEBUG] ${qid} ausente → preenchido automaticamente com ${fallback}`);
					}
				});
			} catch(__e) { /* no-op */ }

			// Regra adicional: quando não há pickup, apenas AIR/OTHER são aceitos para ARRIVAL_MODE
			try {
				if (noPickup) {
					const idx = filtered.findIndex((a) => (a?.question || a?.questionId) === 'TRANSFER_ARRIVAL_MODE');
					if (idx !== -1) {
						const cur = String(filtered[idx].answer || '').trim();
						if (cur !== 'AIR' && cur !== 'OTHER') {
							console.warn(`⚠️ [DYNAMIC DEBUG] TRANSFER_ARRIVAL_MODE inválido no cenário sem pickup: "${cur}" → OTHER`);
							filtered[idx].answer = 'OTHER';
						}
					}
				}
			} catch(__e) { /* no-op */ }

			// Substituir conteúdo mantendo a mesma referência
			answers.length = 0;
			Array.prototype.push.apply(answers, filtered);
		} catch (e) { /* no-op */ }

        // Garantir unit para DROP_OFF caso tenha sido coletado sem fallback
        try {
            const dropOffAns = answers.find(a => a && a.question === 'TRANSFER_ARRIVAL_DROP_OFF');
            if (dropOffAns && !dropOffAns.unit) {
                dropOffAns.unit = 'FREETEXT';
                console.log('✅ [DYNAMIC DEBUG] Unit adicionada a TRANSFER_ARRIVAL_DROP_OFF (FREETEXT)');
            }
        } catch (e) { /* no-op */ }

        // CORREÇÃO CRÍTICA: Buscar especificamente por perguntas PER_TRAVELER obrigatórias que podem estar sendo perdidas
        this.ensureCriticalPerTravelerAnswers(answers);

        console.log('✅ Respostas dinâmicas coletadas:', answers.length);

        // Não persistir aqui para não sobrescrever PER_TRAVELER coletadas na Etapa 2
        return answers;
    }

    /**
     * Coletar respostas PER_TRAVELER diretamente do DOM da Etapa 2
     * (usado como fallback/persistência antes de mudar para a Etapa 3)
     */
    collectPerTravelerAnswersFromDOM() {
        const container = document.getElementById('traveler-booking-questions-inner');
        if (!container) {
            return [];
        }

        const inputs = container.querySelectorAll('.question-input');
        const answers = [];
        // Expandir para incluir todos os PER_TRAVELER obrigatórios conforme docs
        const perTravelerIds = [
            'FULL_NAMES_FIRST', 'FULL_NAMES_LAST', 'AGEBAND',
            'HEIGHT', 'WEIGHT',
            'DATE_OF_BIRTH',
            'PASSPORT_NATIONALITY', 'PASSPORT_PASSPORT_NO', 'PASSPORT_EXPIRY'
        ];

        inputs.forEach((input) => {
            const questionId = input.getAttribute('data-question-id');
            const group = input.getAttribute('data-group');
            if (!questionId || group !== 'PER_TRAVELER' || !perTravelerIds.includes(questionId)) {
                return;
            }

            const rawValue = (input.value || '').trim();
            if (!rawValue) {
                return;
            }

            const answer = {
                question: questionId,
                answer: rawValue
            };

            // travelerNum a partir do atributo ou ID
            const travelerDataAttr = input.getAttribute('data-traveler');
            const travelerMatch = input.id.match(/traveler_(\d+)_/);
            let travelerNum = travelerDataAttr ? parseInt(travelerDataAttr, 10) : (travelerMatch ? parseInt(travelerMatch[1], 10) : 1);
            if (!travelerNum || Number.isNaN(travelerNum) || travelerNum < 1) travelerNum = 1;
            answer.travelerNum = travelerNum;

            // Unidades para HEIGHT e WEIGHT
            if (questionId === 'HEIGHT' || questionId === 'WEIGHT') {
                let unitField = document.getElementById(input.id + '_unit');
                if (!unitField) {
                    unitField = container.querySelector(`select[name="${input.id}_unit"]`);
                }
                if (unitField && unitField.value) {
                    answer.unit = unitField.value;
                }
            }

            answers.push(answer);
        });

        return answers;
    }

    /**
     * Garantir que respostas PER_TRAVELER estejam persistidas em bookingData
     */
    ensurePerTravelerAnswersPersisted() {
        const perTravelerAnswers = this.collectPerTravelerAnswersFromDOM();
        if (!perTravelerAnswers || perTravelerAnswers.length === 0) {
            return;
        }

        const perTravelerIds = [
            'FULL_NAMES_FIRST', 'FULL_NAMES_LAST', 'AGEBAND',
            'HEIGHT', 'WEIGHT',
            'DATE_OF_BIRTH',
            'PASSPORT_NATIONALITY', 'PASSPORT_PASSPORT_NO', 'PASSPORT_EXPIRY'
        ];
        const existing = Array.isArray(this.bookingData.bookingQuestionAnswers) ? this.bookingData.bookingQuestionAnswers : [];

        // Remover respostas existentes dessas perguntas para regravar valores atuais
        const filteredExisting = existing.filter(a => !perTravelerIds.includes(a.question || a.questionId));

        // Mesclar garantindo no máximo 1 por (question, travelerNum)
        const merged = [...filteredExisting];
        perTravelerAnswers.forEach((ans) => {
            const already = merged.find(x => (x.question || x.questionId) === ans.question && x.travelerNum === ans.travelerNum);
            if (!already) merged.push(ans);
        });

        this.bookingData.bookingQuestionAnswers = merged;
    }

    /**
     * CORREÇÃO CRÍTICA: Garantir que perguntas PER_TRAVELER obrigatórias sejam coletadas
     */
    ensureCriticalPerTravelerAnswers(answers) {
        // Incluir todas as perguntas PER_TRAVELER críticas deste produto
        const criticalQuestions = [
            'AGEBAND', 'FULL_NAMES_FIRST', 'FULL_NAMES_LAST',
            'HEIGHT', 'WEIGHT',
            'DATE_OF_BIRTH',
            'PASSPORT_NATIONALITY', 'PASSPORT_PASSPORT_NO', 'PASSPORT_EXPIRY'
        ];
        
        criticalQuestions.forEach(questionId => {
            // Verificar se já temos resposta para esta pergunta
            const existingAnswer = answers.find(a => a.question === questionId);
            if (existingAnswer) {
                console.log(`✅ [CRITICAL CHECK] ${questionId} já coletado:`, existingAnswer);
                return;
            }
            
            // Buscar especificamente por campos desta pergunta no DOM
            const selectors = [
                `[id*="${questionId}"][data-question-id="${questionId}"]`,
                `[id*="traveler_"][id*="${questionId}"]`,
                `input[data-question-id="${questionId}"]`,
                `select[data-question-id="${questionId}"]`
            ];
            
            for (const selector of selectors) {
                const inputs = document.querySelectorAll(selector);
                
                inputs.forEach(input => {
                    const value = input.value?.trim();
                    if (!value) return;
                    
                    // Extrair travelerNum do ID ou data attribute
                    let travelerNum = 1; // 1-based por padrão
                    const travelerMatch = input.id.match(/traveler_(\d+)_/);
                    const travelerDataAttr = input.getAttribute('data-traveler');
                    
                    if (travelerMatch) {
                        travelerNum = parseInt(travelerMatch[1], 10);
                    } else if (travelerDataAttr) {
                        travelerNum = parseInt(travelerDataAttr, 10);
                    }
                    if (!travelerNum || Number.isNaN(travelerNum) || travelerNum < 1) travelerNum = 1;
                    
                    const answer = {
                        question: questionId,
                        answer: value,
                        travelerNum: travelerNum
                    };
                    
                    answers.push(answer);
                    console.log(`🚨 [CRITICAL RECOVERY] ${questionId} recuperado para traveler ${travelerNum}:`, answer);
                });
                
                if (inputs.length > 0) break; // Parar no primeiro seletor que encontrou campos
            }
        });
    }

    /**
     * Renderizar booking questions usando sistema dinâmico
     */
    renderDynamicBookingQuestions(formContainer) {
        console.log('🎨 Renderizando booking questions dinamicamente...');

        // Evitar duplicação: limpar container antes de injetar novo HTML
        if (formContainer) {
            formContainer.innerHTML = '';
        }

        const questions = this.productBookingQuestions.booking_questions;
        const travelers = this.bookingData.selectedTravelers || [];

        if (!questions || questions.length === 0) {
            formContainer.innerHTML = `
                <div class="booker-info-section">
                    <h4>Tudo Pronto!</h4>
                    <p>Nenhuma informação adicional é necessária para esta experiência.</p>
                </div>
            `;
            
            // Exibir a seção de informações adicionais mesmo sem perguntas
            const additionalInfoSection = document.getElementById('additional-booking-info-section');
            if (additionalInfoSection) {
                additionalInfoSection.style.display = 'block';
                console.log('✅ [LANGUAGE GUIDE] Seção additional-booking-info-section exibida (sem perguntas - sistema dinâmico)');
            }
            
            // Renderizar seção de idioma da excursão mesmo sem perguntas
            this.renderLanguageGuideSection();
            return;
        }

        let html = '<div class="dynamic-booking-questions">';

        // Separar perguntas por grupo
        const perBookingQuestions = questions.filter(q => q.group === 'PER_BOOKING');
        const perTravelerQuestions = questions.filter(q => q.group === 'PER_TRAVELER');

        console.log('🔄 [REORGANIZAÇÃO] Perguntas PER_BOOKING na Etapa 3 (incluindo PICKUP_POINT):', perBookingQuestions.length);
        console.log('🔄 Perguntas PER_TRAVELER:', perTravelerQuestions.length);

		// Mover perguntas PER_BOOKING (exceto PICKUP_POINT, TRANSFER_* e LANGUAGE_GUIDE) para a coluna de "Informações Adicionais"
		const generalPerBookingQuestions = perBookingQuestions.filter(q => 
			q.id !== 'PICKUP_POINT' &&
			!String(q.id || '').startsWith('TRANSFER_') &&
			!(q.subType === 'LANGUAGE_GUIDE' || (q.label && typeof q.label === 'string' && (q.label.toLowerCase().includes('idioma') || q.label.toLowerCase().includes('language'))))
		);

        // Manter apenas PICKUP_POINT no bloco principal (se existir)
        const pickupHtml = this.renderPickupPointSection();
        if (pickupHtml) {
            html += '<div class="per-booking-section">';
            // Removido título "Informações Gerais da Reserva" conforme solicitado
            html += pickupHtml;
            html += '</div>';
        }

        // As perguntas TRANSFER_* já são renderizadas dentro de renderPickupPointSection();
        // Evitar duplicação aqui.

        // CORREÇÃO: Remover perguntas PER_TRAVELER da etapa 3
        // A etapa 3 deve conter apenas perguntas PER_BOOKING
        console.log('🔄 [CORREÇÃO] Perguntas PER_TRAVELER removidas da etapa 3 para evitar duplicação');
        if (perTravelerQuestions.length > 0) {
            console.log('📝 Perguntas PER_TRAVELER ignoradas:', perTravelerQuestions.map(q => q.id));
        }

        html += '</div>';

        formContainer.innerHTML = html;

        // Exibir a seção de informações adicionais na etapa 3 (apenas se houver conteúdo)
        const additionalInfoSection = document.getElementById('additional-booking-info-section');
        const pageH3 = document.getElementById('booking-questions-title');
        const addInfoH4 = document.getElementById('additional-info-title');
        const hasGeneral = generalPerBookingQuestions.length > 0;
        const hasLanguageGuides = Array.isArray(window.productData?.languageGuides) && window.productData.languageGuides.length > 0;
        if (additionalInfoSection) {
            if (hasGeneral || hasLanguageGuides) {
            additionalInfoSection.style.display = 'block';
                if (pageH3) pageH3.style.display = 'block';
                if (addInfoH4) addInfoH4.style.display = 'none';
            } else {
                additionalInfoSection.style.display = 'none';
                if (pageH3) pageH3.style.display = 'none';
            }
            console.log('✅ [LANGUAGE GUIDE] Seção additional-booking-info-section visível?', hasGeneral || hasLanguageGuides);
        }

        // Preencher coluna de perguntas gerais (especialmente SPECIAL_REQUIREMENTS)
        const generalContainer = document.getElementById('general-booking-questions');
        if (generalContainer) {
            const generalHtml = this.renderGeneralBookingQuestions(generalPerBookingQuestions);
            generalContainer.innerHTML = generalHtml;
        }

        // Renderizar seção de idioma da excursão
        this.renderLanguageGuideSection();

        // Configurar eventos dinâmicos
        this.setupDynamicFieldEvents();

        console.log('✅ Booking questions dinâmicas renderizadas');
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
        const allowCustomPickup = question?.units?.includes('FREETEXT') || false;

        let selectHTML = `<select id="${fieldId}" name="${fieldId}" class="form-control question-input pickup-point-select" ${requiredAttr}>`;
        selectHTML += '<option value="">Selecione o ponto de encontro</option>';

        // Adicionar opção padrão MEET_AT_DEPARTURE_POINT
        selectHTML += '<option value="MEET_AT_DEPARTURE_POINT">Encontrar no ponto de partida</option>';

        if (pickupPoints.length > 0) {
            pickupPoints.forEach(point => {
                selectHTML += `<option value="${point.id}">${point.name}</option>`;
            });
        } else {
            // Opções padrão quando não há pickup points específicos
            selectHTML += '<option value="HOTEL_PICKUP">Busca no hotel</option>';
            selectHTML += '<option value="CENTRAL_MEETING_POINT">Ponto de encontro central</option>';
        }

        selectHTML += '</select>';

        // Adicionar campo de texto livre se suportado
        if (allowCustomPickup) {
            selectHTML += `<div class="pickup-freetext-container" style="margin-top: 10px; display: none;">
                <label for="${fieldId}_freetext" class="form-label">Endereço específico:</label>
                <input type="text" id="${fieldId}_freetext" name="${fieldId}_freetext"
                       class="form-control question-input"
                       placeholder="Digite o endereço completo para coleta"
                       maxlength="${question?.maxLength || 1000}">
                <small class="form-text text-muted">Deixe em branco para usar a opção selecionada acima</small>
            </div>`;
        }
        
        // Adicionar ajuda textual leve
        selectHTML += `<div class="pickup-point-info" style="margin-top: 5px;">
            <small class="text-info">
                <i class="fas fa-info-circle"></i> Se digitar um endereço específico, ele será usado em vez da lista.
            </small>
        </div>`;

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
                        style="width: 100%; height: 100%; padding-right: 36px; background-position: calc(100% - 12px) center; background-size: 16px;">`;

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
                
                // Detectar mudanças no modo de chegada para PICKUP_POINT
                if (input.id.includes('TRANSFER_ARRIVAL_MODE')) {
                    this.handleArrivalModeChange(input);
                }
                
                // Detectar mudanças no PICKUP_POINT para mostrar/ocultar texto livre
                if (input.id.includes('PICKUP_POINT') && !input.id.includes('_freetext')) {
                    this.handlePickupPointChange(input);
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
        // Debounce para evitar múltiplas coletas em sequência
        clearTimeout(this._collectBQDebounce);
        this._collectBQDebounce = setTimeout(() => {
            this.collectBookingQuestionAnswers();
        }, 120);

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
            // CORREÇÃO: Verificar se dataset e traveler existem antes de acessar
            const fieldTravelerIndex = field.dataset && field.dataset.traveler ? parseInt(field.dataset.traveler) : 0;

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
     * Lidar com mudanças no modo de chegada
     */
    handleArrivalModeChange(arrivalModeField) {
        const selectedMode = arrivalModeField.value;
        const travelerIndex = arrivalModeField.dataset.traveler;
        
        console.log(`🚗 Modo de chegada alterado para: ${selectedMode} (Viajante ${travelerIndex})`);
        
        // Encontrar o campo PICKUP_POINT correspondente
        const pickupPointField = document.querySelector(`[id*="PICKUP_POINT"][data-traveler="${travelerIndex}"]`);
        
        if (pickupPointField) {
            this.updatePickupPointVisibility(pickupPointField, selectedMode);
        }
        
        // Revalidar perguntas condicionais
        this.validatePickupPointConditional();
    }
    
    /**
     * Lidar com mudanças no ponto de coleta
     */
    handlePickupPointChange(evtOrField) {
        // Aceitar evento ou elemento diretamente
        const pickupPointField = evtOrField && evtOrField.target ? evtOrField.target : evtOrField;
        if (!pickupPointField || !pickupPointField.dataset) {
            console.warn('⚠️ handlePickupPointChange: pickupPointField ou dataset inválido', evtOrField);
            return;
        }

        const selectedValue = pickupPointField.value;
        const travelerIndex = pickupPointField.dataset.traveler || '1';
        
        console.log(`📍 Ponto de coleta alterado para: ${selectedValue} (Viajante ${travelerIndex})`);
        
        // Mostrar/ocultar campo de texto livre
        this.togglePickupPointFreetext(pickupPointField, selectedValue);
    }
    
    /**
     * Atualizar visibilidade do campo PICKUP_POINT baseado no modo de chegada
     */
    updatePickupPointVisibility(pickupPointField, arrivalMode) {
        const formGroup = pickupPointField.closest('.form-group');
        const isPickupRequired = ['HOTEL_PICKUP', 'CENTRAL_MEETING_POINT'].includes(arrivalMode);
        
        if (formGroup) {
            if (isPickupRequired) {
                formGroup.style.display = 'block';
                pickupPointField.setAttribute('required', 'required');
                
                // Adicionar indicador visual de obrigatório
                const label = formGroup.querySelector('label');
                if (label && !label.textContent.includes('*')) {
                    label.innerHTML += ' <span class="text-danger">*</span>';
                }
            } else {
                formGroup.style.display = 'none';
                pickupPointField.removeAttribute('required');
                pickupPointField.value = ''; // Limpar valor
                
                // Ocultar também o campo de texto livre se existir
                const freetextField = document.querySelector(`[id*="PICKUP_POINT_freetext"][data-traveler="${pickupPointField.dataset.traveler}"]`);
                if (freetextField) {
                    const freetextGroup = freetextField.closest('.form-group');
                    if (freetextGroup) {
                        freetextGroup.style.display = 'none';
                    }
                }
            }
        }
    }
    
    /**
     * Mostrar/ocultar campo de texto livre para PICKUP_POINT
     */
    togglePickupPointFreetext(pickupPointField, selectedValue) {
        const travelerIndex = pickupPointField.dataset.traveler;
        const freetextField = document.querySelector(`[id*="PICKUP_POINT_freetext"][data-traveler="${travelerIndex}"]`);
        
        if (freetextField) {
            const freetextGroup = freetextField.closest('.form-group');
            
            if (freetextGroup) {
                if (selectedValue === 'OTHER' || selectedValue === 'HOTEL_PICKUP') {
                    freetextGroup.style.display = 'block';
                    freetextField.setAttribute('required', 'required');
                } else {
                    freetextGroup.style.display = 'none';
                    freetextField.removeAttribute('required');
                    freetextField.value = ''; // Limpar valor
                }
            }
        }
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
                font-weight: 400 !important;
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
                font-weight: 400 !important;
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
        try {
            console.log('📝 Coletando respostas das booking questions...');
            console.log('🚨 [CRITICAL DEBUG] Método collectBookingQuestionAnswers() foi chamado!');
            console.log('🚨 [CRITICAL DEBUG] Timestamp:', new Date().toISOString());
            console.error('🚨 [FORCE LOG] collectBookingQuestionAnswers() EXECUTADO!');

        // CORREÇÃO: Verificar múltiplas fontes de dados dinâmicos
        console.log('🔍 [DEBUG] this.dynamicBookingQuestions.allQuestions:', this.dynamicBookingQuestions.allQuestions?.length || 'null/undefined');
        console.log('🔍 [DEBUG] this.bookingQuestions:', this.bookingQuestions?.length || 'null/undefined');
        console.log('🔍 [DEBUG] window.productData?.bookingQuestions:', window.productData?.bookingQuestions?.length || 'null/undefined');

        // Usar sistema dinâmico se disponível
        if (this.dynamicBookingQuestions.allQuestions || this.bookingQuestions?.length > 0) {
            console.log('✅ Usando sistema dinâmico de booking questions');

            // Se não temos allQuestions mas temos bookingQuestions, usar elas
            if (!this.dynamicBookingQuestions.allQuestions && this.bookingQuestions?.length > 0) {
                console.log('🔄 Usando this.bookingQuestions como fonte de dados dinâmicos');
                this.dynamicBookingQuestions.allQuestions = this.bookingQuestions;
            }

            const dynamicAnswers = this.collectDynamicBookingAnswers();

            // BUGFIX: Nunca perder respostas já coletadas (ex.: PICKUP_POINT) quando dynamicAnswers vier vazio
            const perTravelerIds = ['AGEBAND', 'FULL_NAMES_FIRST', 'FULL_NAMES_LAST', 'HEIGHT'];
            const existing = Array.isArray(this.bookingData.bookingQuestionAnswers) ? this.bookingData.bookingQuestionAnswers : [];

            // Mapa por (question, travelerNum|PB)
            const keyOf = (ans) => {
                const q = ans.question || ans.questionId || '';
                const t = (typeof ans.travelerNum === 'undefined' && typeof ans.travelerIndex === 'undefined') ? 'PB' : String(ans.travelerNum ?? ans.travelerIndex);
                return `${q}::${t}`;
            };
            const mergedMap = new Map();

            // 1) Começar com existentes (preserva PER_BOOKING já coletadas)
            existing.forEach((ans) => {
                mergedMap.set(keyOf(ans), ans);
            });

            // 2) Adicionar/atualizar com dynamicAnswers (apenas se houver valor)
            dynamicAnswers.forEach((ans) => {
                if (ans && (ans.answer ?? '') !== '') {
                    mergedMap.set(keyOf(ans), ans);
                }
            });

            // 3) Garantir que PER_TRAVELER persistidas estejam presentes
            const perTravelerExisting = existing.filter((a) => {
                const q = a.question || a.questionId; 
                return perTravelerIds.indexOf(q) !== -1 && (typeof a.travelerNum !== 'undefined' || typeof a.travelerIndex !== 'undefined');
            });
            perTravelerExisting.forEach((ans) => {
                const k = keyOf(ans);
                if (!mergedMap.has(k)) {
                    mergedMap.set(k, ans);
                }
            });

            // 4) Converter mapa em array final estável
            const merged = Array.from(mergedMap.values());

            this.bookingData.bookingQuestionAnswers = merged;

            console.log('✅ Respostas dinâmicas coletadas (PER_BOOKING):', dynamicAnswers.length);
            console.log('✅ Respostas PER_TRAVELER preservadas:', perTravelerExisting.length);
            console.log('✅ Total final após mescla (enviado ao backend):', merged.length);
            console.error('🚨 [FORCE LOG] collectBookingQuestionAnswers() FINALIZADO (DINÂMICO)!');
            console.error('🚨 [FORCE LOG] Respostas coletadas (final):', merged.length);

            return merged;
        }

        // Fallback para sistema antigo
        console.log('⚠️ Usando sistema legado de booking questions');
        const answers = [];
        const questionInputs = document.querySelectorAll('.question-input');

        console.log(`🔍 [DEBUG] Encontrados ${questionInputs.length} elementos .question-input`);
        console.log('🔍 [DEBUG] Booking questions disponíveis:', this.bookingQuestions);

        questionInputs.forEach((input, index) => {
            console.log(`🔍 [DEBUG] Processando input ${index + 1}:`, {
                id: input.id,
                name: input.name,
                value: input.value,
                classList: Array.from(input.classList)
            });

            const questionId = this.extractQuestionId(input);
            const travelerIndex = this.extractTravelerNumber(input);
            const value = input.value.trim();

            console.log(`🔍 [DEBUG] Dados extraídos: questionId=${questionId}, travelerIndex=${travelerIndex}, value="${value}"`);

            if (!questionId) {
                console.warn(`⚠️ [DEBUG] QuestionId não encontrado para input:`, input);
                return;
            }

            // CORREÇÃO: Validação robusta usando múltiplas fontes
            let question = this.bookingQuestions?.find(q => q.id === questionId);

            // FALLBACK 1: Se this.bookingQuestions está vazio, verificar window.productData
            if (!question && (!this.bookingQuestions || this.bookingQuestions.length === 0)) {
                console.warn(`🔍 [FALLBACK] this.bookingQuestions está vazio, verificando window.productData...`);

                if (window.productData && window.productData.bookingQuestions) {
                    const productQuestion = window.productData.bookingQuestions.find(q => q.id === questionId);
                    if (productQuestion) {
                        question = {...productQuestion, source: 'window.productData'};
                        console.log(`✅ [FALLBACK] Pergunta ${questionId} encontrada em window.productData`);
                        console.error(`🚨 [FORCE LOG] FALLBACK 1 ATIVADO! Usando window.productData para ${questionId}`);
                    }
                }
            }

            // FALLBACK 2: Para SPECIAL_REQUIREMENTS, aceitar sempre (é comum em produtos Viator)
            if (!question && questionId === 'SPECIAL_REQUIREMENTS') {
                console.warn(`🔍 [FALLBACK] SPECIAL_REQUIREMENTS não encontrado nas listas, mas é campo comum. Aceitando.`);
                console.error(`🚨 [FORCE LOG] FALLBACK 2 ATIVADO! Aceitando SPECIAL_REQUIREMENTS como válido`);
                question = {
                    id: 'SPECIAL_REQUIREMENTS',
                    type: 'STRING',
                    group: 'PER_BOOKING',
                    required: 'OPTIONAL',
                    source: 'fallback-hardcoded'
                };
            }

            if (!question) {
                console.warn(`⚠️ Pergunta ${questionId} não encontrada em nenhuma fonte válida. Ignorando.`);
                return;
            }

            console.log(`✅ [DEBUG] Pergunta ${questionId} é válida:`, question);
            console.error(`🚨 [FORCE LOG] Pergunta ${questionId} ACEITA! Fonte: ${question.source || 'this.bookingQuestions'}`);

            // CORREÇÃO: Para campos opcionais vazios, permitir envio se usuário preencheu
            if (!value) {
                if (question.required !== 'MANDATORY') {
                    console.log(`📝 Campo opcional ${questionId} vazio, não enviando.`);
                    return;
                } else {
                    console.warn(`⚠️ Campo obrigatório ${questionId} está vazio!`);
                    return;
                }
            }

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

            // FASE 1.1: Usar novo método de formatação conforme documentação
            try {
                const formattedAnswer = this.formatBookingAnswer(question, answer, travelerIndex);
                answers.push(formattedAnswer);
                console.log(`✅ Resposta válida coletada para ${questionId}:`, formattedAnswer);
            } catch (error) {
                this.logBookingEvent('format_answer_error', {
                    questionId: questionId,
                    error: error.message
                }, 'error');
                console.error(`❌ Erro ao formatar resposta para ${questionId}:`, error.message);
                // Não adicionar resposta com erro
            }
        });

        // CORREÇÃO: Debug adicional antes da validação final
        console.log('🔍 [DEBUG] Respostas coletadas antes da validação final:', answers);
        console.log('🔍 [DEBUG] Booking questions válidas:', (this.bookingQuestions || []).map(q => q.id));

        // CORREÇÃO: Preservar respostas já coletadas, especialmente SPECIAL_REQUIREMENTS
        const validQuestionIds = (this.bookingQuestions || []).map(q => q.id);
        const validAnswers = answers.filter(answer => {
            const questionId = answer.question || answer.questionId;

            // Verificar se está na lista de perguntas válidas
            const isInValidList = validQuestionIds.includes(questionId);

            // SPECIAL_REQUIREMENTS é sempre válido (campo comum da Viator)
            const isSpecialRequirements = questionId === 'SPECIAL_REQUIREMENTS';

            // Aceitar se está na lista válida OU é SPECIAL_REQUIREMENTS
            const isValid = isInValidList || isSpecialRequirements;

            if (!isValid) {
                console.warn(`⚠️ Removendo resposta para pergunta inválida: ${questionId}`);
                this.logBookingEvent('invalid_question_filtered', {
                    questionId: questionId,
                    answer: answer.answer
                }, 'warn');
            } else if (isSpecialRequirements && !isInValidList) {
                console.log(`✅ [PRESERVANDO] SPECIAL_REQUIREMENTS aceito mesmo não estando na lista válida`);
                console.error(`🚨 [FORCE LOG] SPECIAL_REQUIREMENTS PRESERVADO! Valor: ${answer.answer}`);
            }

            return isValid;
        });

        // Armazenar apenas respostas válidas no bookingData (mesclando PER_TRAVELER existentes)
        const perTravelerIds = ['AGEBAND', 'FULL_NAMES_FIRST', 'FULL_NAMES_LAST', 'HEIGHT'];
        const existing = Array.isArray(this.bookingData.bookingQuestionAnswers) ? this.bookingData.bookingQuestionAnswers : [];
        const perTravelerExisting = existing.filter(function(a){
            const q = a.question || a.questionId; return perTravelerIds.indexOf(q) !== -1; });
        const mergedValid = validAnswers.slice();
        perTravelerExisting.forEach(function(ans){
            const q = ans.question || ans.questionId;
            const already = mergedValid.find(function(x){
                const xq = x.question || x.questionId;
                return xq === q && x.travelerNum === ans.travelerNum;
            });
            if (!already) mergedValid.push(ans);
        });
        this.bookingData.bookingQuestionAnswers = mergedValid;

        console.log('📝 Respostas coletadas (total):', answers.length);
        console.log('✅ Respostas válidas (filtradas):', validAnswers.length);
        console.log('📝 Dados das respostas válidas:', validAnswers);
        console.log('✅ Respostas PER_TRAVELER preservadas (merge):', perTravelerExisting.length);
        console.log('✅ Total final (salvo em bookingData):', mergedValid.length);

        // CORREÇÃO: Debug adicional para investigar problema
        if (validAnswers.length === 0 && this.bookingQuestions && this.bookingQuestions.length > 0) {
            console.error('🚨 [DEBUG] PROBLEMA: Nenhuma resposta coletada mas há booking questions disponíveis!');
            console.error('🚨 [DEBUG] Verificando se campos estão sendo renderizados...');

            // Verificar se há campos de SPECIAL_REQUIREMENTS no DOM
            const specialReqInputs = document.querySelectorAll('input[data-question-id="SPECIAL_REQUIREMENTS"], textarea[data-question-id="SPECIAL_REQUIREMENTS"], input[name*="SPECIAL_REQUIREMENTS"], textarea[name*="SPECIAL_REQUIREMENTS"]');
            console.error('🚨 [DEBUG] Campos SPECIAL_REQUIREMENTS encontrados:', specialReqInputs.length);
            specialReqInputs.forEach((input, i) => {
                console.error(`🚨 [DEBUG] Campo ${i + 1}:`, {
                    tagName: input.tagName,
                    id: input.id,
                    name: input.name,
                    value: input.value,
                    classList: Array.from(input.classList),
                    dataQuestionId: input.dataset.questionId
                });
            });

            // USAR MÉTODO ALTERNATIVO DE COLETA
            console.error('🚨 [DEBUG] Tentando método alternativo de coleta...');
            const fallbackAnswers = this.collectSpecialRequirementsDirectly();
            if (fallbackAnswers.length > 0) {
                console.log('✅ [FALLBACK] Respostas coletadas pelo método alternativo:', fallbackAnswers);
                validAnswers.push(...fallbackAnswers);
                this.bookingData.bookingQuestionAnswers = mergedValid;
                console.log('✅ [FALLBACK] bookingData atualizado com respostas alternativas');
            }
        }

        if (validAnswers.length !== answers.length) {
            const removedCount = answers.length - validAnswers.length;
            console.warn(`⚠️ ${removedCount} respostas foram removidas por serem para perguntas inválidas`);
            this.logBookingEvent('invalid_questions_removed', {
                totalCollected: answers.length,
                validAnswers: validAnswers.length,
                removedCount: removedCount
            }, 'warn');
        }

        // Atualizar contador no UI se existir
        this.updateBookingQuestionsCount(validAnswers.length);

        console.error('🚨 [FORCE LOG] collectBookingQuestionAnswers() FINALIZADO!');
        console.error('🚨 [FORCE LOG] Respostas coletadas:', validAnswers.length);

        return validAnswers;

        } catch (error) {
            console.error('🚨 [ERROR] Erro em collectBookingQuestionAnswers():', error);
            return [];
        }
    }

    /**
     * MÉTODO ALTERNATIVO: Coletar SPECIAL_REQUIREMENTS diretamente
     */
    collectSpecialRequirementsDirectly() {
        console.log('🚨 [FALLBACK] Coletando SPECIAL_REQUIREMENTS diretamente...');

        const answers = [];

        // Buscar por múltiplos seletores possíveis
        const selectors = [
            'input[data-question-id="SPECIAL_REQUIREMENTS"]',
            'textarea[data-question-id="SPECIAL_REQUIREMENTS"]',
            'input[name*="SPECIAL_REQUIREMENTS"]',
            'textarea[name*="SPECIAL_REQUIREMENTS"]',
            'input[id*="SPECIAL_REQUIREMENTS"]',
            'textarea[id*="SPECIAL_REQUIREMENTS"]',
            '.question-input[data-question-id="SPECIAL_REQUIREMENTS"]',
            '.question-input[name*="SPECIAL_REQUIREMENTS"]'
        ];

        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            console.log(`🚨 [FALLBACK] Seletor "${selector}": ${elements.length} elementos encontrados`);

            elements.forEach((element, index) => {
                const value = element.value ? element.value.trim() : '';
                console.log(`🚨 [FALLBACK] Elemento ${index + 1}: valor="${value}"`);

                if (value) {
                    answers.push({
                        question: 'SPECIAL_REQUIREMENTS',
                        questionId: 'SPECIAL_REQUIREMENTS',
                        answer: value,
                        travelerNum: 1,
                        unit: null
                    });
                    console.log('🚨 [FALLBACK] SPECIAL_REQUIREMENTS coletado com sucesso!');
                }
            });
        }

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
        // CORREÇÃO: Múltiplas formas de detectar o questionId

        // 1. Verificar data-question-id primeiro
        if (input.dataset && input.dataset.questionId) {
            console.log(`🔍 [DEBUG] QuestionId encontrado via data-question-id: ${input.dataset.questionId}`);
            return input.dataset.questionId;
        }

        // 2. Verificar atributo data-question-id
        const dataQuestionId = input.getAttribute('data-question-id');
        if (dataQuestionId) {
            console.log(`🔍 [DEBUG] QuestionId encontrado via getAttribute: ${dataQuestionId}`);
            return dataQuestionId;
        }

        // 3. Formato tradicional: QUESTION_ID ou QUESTION_ID_traveler_X ou QUESTION_ID_unit
        const id = input.id || input.name;
        if (!id) {
            console.warn(`⚠️ [DEBUG] Nenhum ID ou name encontrado para input:`, input);
            return null;
        }

        // 4. Verificar se é SPECIAL_REQUIREMENTS diretamente
        if (id.includes('SPECIAL_REQUIREMENTS')) {
            console.log(`🔍 [DEBUG] QuestionId SPECIAL_REQUIREMENTS encontrado via ID/name: ${id}`);
            return 'SPECIAL_REQUIREMENTS';
        }

        // 5. Remover sufixos _traveler_X, _unit, etc.
        const questionId = id.split('_')[0];
        console.log(`🔍 [DEBUG] QuestionId extraído via split: ${questionId} (de ${id})`);
        return questionId;
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
        // Limitar a validação ao container da etapa 3 para evitar ler campos duplicados fora do escopo
        const stepContainer = document.getElementById('booking-questions-content') || document;
        const requiredInputs = stepContainer.querySelectorAll('.question-input[required]');
        return requiredInputs.length;
    }

    /**
     * Validar se todas as booking questions obrigatórias foram respondidas
     */
    validateAllBookingQuestions() {
        console.log('🔍 Validando todas as booking questions...');

        // Limitar ao container da etapa 3
        const stepContainer = document.getElementById('booking-questions-content') || document;
        const requiredInputs = stepContainer.querySelectorAll('.question-input[required]');
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

        // Validações específicas (sempre coletar mensagens)
        const specific = this.validateSpecificQuestionsWithErrors();
        isValid = specific.isValid && isValid;
        if (specific.errors && specific.errors.length > 0) {
            errors.push(...specific.errors);
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

        // Validar PICKUP_POINT com lógica condicional baseada no arrivalMode
        isValid = this.validatePickupPointConditional() && isValid;
        
        // Validar TRANSFER_ARRIVAL_MODE e TRANSFER_DEPARTURE_MODE
        isValid = this.validateTransferModes() && isValid;

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
        
        // Validar AGEBAND consistency
        isValid = this.validateAgeBandConsistency() && isValid;

        return isValid;
    }

    /**
     * Validações específicas para tipos de perguntas, retornando erros coletados
     */
    validateSpecificQuestionsWithErrors() {
        let isValid = true;
        const errors = [];

        // PICKUP_POINT condicional com mensagem
        const pickupValidation = this.validatePickupPointConditionalWithError();
        isValid = pickupValidation.isValid && isValid;
        if (!pickupValidation.isValid && pickupValidation.error) {
            errors.push(pickupValidation.error);
        }

        // TRANSFER_ARRIVAL_MODE e TRANSFER_DEPARTURE_MODE
        const arrivalModeInput = document.querySelector('[id*="TRANSFER_ARRIVAL_MODE"]');
        const departureModeInput = document.querySelector('[id*="TRANSFER_DEPARTURE_MODE"]');
        if (arrivalModeInput && arrivalModeInput.hasAttribute('required')) {
            const value = arrivalModeInput.value.trim();
            if (!value) {
                this.showFieldError(arrivalModeInput, 'Modo de chegada é obrigatório');
                errors.push('Modo de chegada');
                isValid = false;
            }
        }
        if (departureModeInput && departureModeInput.hasAttribute('required')) {
            const value = departureModeInput.value.trim();
            if (!value) {
                this.showFieldError(departureModeInput, 'Modo de partida é obrigatório');
                errors.push('Modo de partida');
                isValid = false;
            }
        }

        // Peso (WEIGHT)
        const weightInputs = document.querySelectorAll('[id*="WEIGHT"]:not([id*="_unit"])');
        weightInputs.forEach(input => {
            const value = parseFloat(input.value);
            if (value && (value < 1 || value > 300)) {
                isValid = false;
                this.showFieldError(input, 'Peso deve estar entre 1 e 300');
                errors.push('Peso inválido');
            }
        });

        // Datas de nascimento (DATE_OF_BIRTH)
        const birthDateInputs = document.querySelectorAll('[id*="DATE_OF_BIRTH"]');
        birthDateInputs.forEach(input => {
            if (input.value) {
                const birthDate = new Date(input.value);
                const today = new Date();
                const age = today.getFullYear() - birthDate.getFullYear();
                if (age < 0 || age > 120) {
                    isValid = false;
                    this.showFieldError(input, 'Data de nascimento inválida');
                    errors.push('Data de nascimento inválida');
                }
            }
        });

        // AGEBAND consistência
        const ageBandInputs = document.querySelectorAll('[id*="AGEBAND"]');
        ageBandInputs.forEach(input => {
            const value = input.value;
            const travelerNum = this.extractTravelerNumber(input);
            if (value && travelerNum) {
                const expectedAgeBand = this.getExpectedAgeBandForTraveler(travelerNum);
                if (expectedAgeBand && value !== expectedAgeBand) {
                    this.showFieldError(input, `Faixa etária deve ser ${expectedAgeBand} para este viajante`);
                    errors.push('Faixa etária inconsistente');
                    isValid = false;
                }
            }
        });

        return { isValid, errors };
    }
    
    /**
     * Validar PICKUP_POINT baseado no modo de chegada
     */
    validatePickupPointConditional() {
        const arrivalModeInput = document.querySelector('[id*="TRANSFER_ARRIVAL_MODE"]');
        // Usar especificamente o hidden principal do PICKUP_POINT
        const pickupPointInput = document.querySelector('input[type="hidden"][data-question-id="PICKUP_POINT"]') || document.getElementById('booking_question_PICKUP_POINT');

        if (!pickupPointInput) {
            return true; // Não há campo PICKUP_POINT, validação não se aplica
        }

        let arrivalMode = 'OTHER'; // Padrão se não especificado
        if (arrivalModeInput && arrivalModeInput.value) {
            arrivalMode = arrivalModeInput.value;
        }

        console.log('🚗 Validando PICKUP_POINT para arrivalMode:', arrivalMode);

        // REQUISITO: Usuário só pode avançar se uma opção de PICKUP_POINT estiver selecionada na Etapa 3
        // Aceita-se CONTACT_SUPPLIER_LATER quando ofertado pelo produto
        let pickupValue = pickupPointInput.value ? pickupPointInput.value.trim() : '';
        const baseId = pickupPointInput.id || 'booking_question_PICKUP_POINT';
        const freetextInput = document.getElementById(`${baseId}_freetext`) || document.querySelector('[id*="PICKUP_POINT"][id*="_freetext"]');
        const freetextValue = freetextInput && freetextInput.value ? freetextInput.value.trim() : '';

        if (!pickupValue && !freetextValue) {
            this.showFieldError(pickupPointInput, 'Selecione uma opção de ponto de encontro ou informe um endereço.');
            return false;
        }

        return true;
    }

    /**
     * Validar PICKUP_POINT baseado no modo de chegada, retornando mensagem
     */
    validatePickupPointConditionalWithError() {
        const arrivalModeInput = document.querySelector('[id*="TRANSFER_ARRIVAL_MODE"]');
        const pickupPointInput = document.querySelector('input[type="hidden"][data-question-id="PICKUP_POINT"]') || document.getElementById('booking_question_PICKUP_POINT');
        if (!pickupPointInput) {
            return { isValid: true };
        }
        let arrivalMode = 'OTHER';
        if (arrivalModeInput && arrivalModeInput.value) {
            arrivalMode = arrivalModeInput.value;
        }

        let pickupValue = pickupPointInput.value ? pickupPointInput.value.trim() : '';
        const baseId = pickupPointInput.id || 'booking_question_PICKUP_POINT';
        const freetextInput = document.getElementById(`${baseId}_freetext`) || document.querySelector('[id*="PICKUP_POINT"][id*="_freetext"]');
        const freetextValue = freetextInput && freetextInput.value ? freetextInput.value.trim() : '';

        if (!pickupValue && !freetextValue) {
            this.showFieldError(pickupPointInput, 'Selecione uma opção de ponto de encontro ou informe um endereço.');
            return { isValid: false, error: 'Ponto de Encontro' };
        }
        return { isValid: true };
    }
    
    /**
     * Validar modos de transferência
     */
    validateTransferModes() {
        const arrivalModeInput = document.querySelector('[id*="TRANSFER_ARRIVAL_MODE"]');
        const departureModeInput = document.querySelector('[id*="TRANSFER_DEPARTURE_MODE"]');
        
        let isValid = true;
        
        // Validar TRANSFER_ARRIVAL_MODE se presente (considerar obrigatório na etapa 3)
        if (arrivalModeInput) {
            let value = arrivalModeInput.value.trim();
            // Se a pergunta tem allowedAnswers e o valor atual não é permitido, normalizar para OTHER
            try {
                const q = (this.dynamicBookingQuestions?.allQuestions || []).find((qq) => (qq?.id || qq?.question) === 'TRANSFER_ARRIVAL_MODE');
                const allowed = Array.isArray(q?.allowedAnswers) ? q.allowedAnswers : null;
                if (allowed && allowed.length > 0 && !allowed.includes(value)) {
                    const fallback = allowed.includes('OTHER') ? 'OTHER' : allowed[0];
                    console.warn(`⚠️ [VALIDATION] TRANSFER_ARRIVAL_MODE inválido "${value}". Ajustando para "${fallback}" (allowed: ${allowed.join(', ')})`);
                    value = fallback;
                    arrivalModeInput.value = fallback;
                }
                // Cenário sem pickup: só AIR/OTHER são válidos segundo o erro da API – normalizar
                const pickupData = this.getPickupData ? this.getPickupData() : undefined;
                const noPickup = pickupData && pickupData.pickupOptionType === 'MEET_EVERYONE_AT_START_POINT';
                if (noPickup && value !== 'AIR' && value !== 'OTHER') {
                    const fallback = allowed && allowed.includes('OTHER') ? 'OTHER' : 'OTHER';
                    console.warn(`⚠️ [VALIDATION] TRANSFER_ARRIVAL_MODE ajustado (no-pickup) "${value}" → "${fallback}"`);
                    value = fallback;
                    arrivalModeInput.value = fallback;
                }
            } catch(_e) { /* no-op */ }
            if (!value) {
                this.showFieldError(arrivalModeInput, 'Modo de chegada é obrigatório');
                isValid = false;
            }
        }
        // Se arrival mode exige drop-off, exigir TRANSFER_ARRIVAL_DROP_OFF (não exigir quando OTHER)
        if (arrivalModeInput && arrivalModeInput.value && arrivalModeInput.value.trim() !== '' && arrivalModeInput.value.trim() !== 'OTHER') {
            const dropOffField = document.querySelector('[data-question-id="TRANSFER_ARRIVAL_DROP_OFF"]');
            const dropOffFree = document.getElementById('booking_question_TRANSFER_ARRIVAL_DROP_OFF_freetext')
                || document.querySelector('input[id*="TRANSFER_ARRIVAL_DROP_OFF"][id$="_freetext"], input[id*="TRANSFER_ARRIVAL_DROP_OFF"][id$="_text"]');
            const valueFromHidden = dropOffField ? (dropOffField.value || '').trim() : '';
            const valueFromFree = dropOffFree ? (dropOffFree.value || '').trim() : '';
            const effectiveValue = valueFromHidden || valueFromFree;
            if (!effectiveValue) {
                // Preferir exibir erro no freetext se ele existir
                const targetField = dropOffFree || dropOffField;
                if (targetField) this.showFieldError(targetField, 'Endereço final é obrigatório');
                    isValid = false;
                } else {
                if (dropOffField) this.hideFieldError(dropOffField);
                if (dropOffFree) this.hideFieldError(dropOffFree);
            }
        }
        
        // Validar TRANSFER_DEPARTURE_MODE se presente
        if (departureModeInput && departureModeInput.hasAttribute('required')) {
            const value = departureModeInput.value.trim();
            if (!value) {
                this.showFieldError(departureModeInput, 'Modo de partida é obrigatório');
                isValid = false;
            }
        }
        
        return isValid;
    }
    
    /**
     * Validar consistência de AGEBAND entre viajantes
     */
    validateAgeBandConsistency() {
        const ageBandInputs = document.querySelectorAll('[id*="AGEBAND"]');
        let isValid = true;
        
        ageBandInputs.forEach(input => {
            const value = input.value;
            const travelerNum = this.extractTravelerNumber(input);
            
            if (value && travelerNum) {
                // Verificar se a faixa etária corresponde aos dados do paxMix
                const expectedAgeBand = this.getExpectedAgeBandForTraveler(travelerNum);
                if (expectedAgeBand && value !== expectedAgeBand) {
                    this.showFieldError(input, `Faixa etária deve ser ${expectedAgeBand} para este viajante`);
                    console.warn(`❌ AGEBAND inconsistente: esperado ${expectedAgeBand}, recebido ${value}`);
                    isValid = false;
                }
            }
        });
        
        return isValid;
    }
    
    /**
     * Obter faixa etária esperada para um viajante baseado no paxMix
     */
    getExpectedAgeBandForTraveler(travelerNum) {
        if (!this.currentAvailabilityData || !this.currentAvailabilityData.paxMix) {
            return null;
        }
        
        let currentTraveler = 1;
        for (const paxGroup of this.currentAvailabilityData.paxMix) {
            const count = paxGroup.numberOfTravelers || 1;
            if (travelerNum >= currentTraveler && travelerNum < currentTraveler + count) {
                return paxGroup.ageBand;
            }
            currentTraveler += count;
        }
        
        return null;
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
        console.log('🚨 [CRITICAL DEBUG] validateBookingQuestions() foi chamado!');
        console.log('🚨 [CRITICAL DEBUG] Timestamp:', new Date().toISOString());

        // Primeiro, coletar todas as respostas atuais
        console.log('🚨 [CRITICAL DEBUG] Chamando collectBookingQuestionAnswers()...');
        console.error('🚨 [FORCE LOG] Chamando collectBookingQuestionAnswers()...');

        this.collectBookingQuestionAnswers();

        console.log('🚨 [CRITICAL DEBUG] collectBookingQuestionAnswers() finalizado');
        console.error('🚨 [FORCE LOG] collectBookingQuestionAnswers() finalizado');

        // Validar se todas as perguntas obrigatórias foram respondidas
        const validation = this.validateAllBookingQuestions();
        // Regras adicionais críticas do produto para o Step 3
        if (validation.isValid) {
            // PICKUP_POINT obrigatório (conforme regra estabelecida)
            const pickupOk = this.validatePickupPointConditional();
            if (!pickupOk) {
                return false;
            }
            // TRANSFER_ARRIVAL_DROP_OFF quando aplicável
            const transferOk = this.validateTransferModes();
            if (!transferOk) {
                return false;
            }
        }

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

        // Validação do Language Guide quando houver opções disponíveis
        try {
            const guides = window.productData?.languageGuides || [];
            const selectEl = document.getElementById('language_guide_selection');
            if (guides.length > 0) {
                const selected = (this.bookingData?.selectedLanguageGuideCode || (selectEl && selectEl.value) || '').trim();
                if (!selected) {
                    this.showDateError('Selecione o idioma da excursão.');
                    const container = document.getElementById('language-guide-container');
                    if (container) container.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return false;
                }
            }
        } catch (e) {
            // noop
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
        let errorMessage;
        if (errors && errors.length > 0) {
            errorMessage = `Por favor, preencha os seguintes campos obrigatórios:\n\n• ${errors.join('\n• ')}`;
        } else {
            errorMessage = 'Por favor, corrija os campos obrigatórios destacados no formulário.';
        }
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
                    console.log('✅ [BOOKING QUESTIONS DEBUG] Sistema dinâmico ATIVADO com dados do window.productData');
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
            
            // FASE 3.1: Verificar cache inteligente primeiro
            const cacheKey = `booking_questions_${this.bookingData?.productCode}`;
            const cachedQuestions = this.getSmartCachedData(cacheKey, 2); // Cache por 2 horas

            if (cachedQuestions && cachedQuestions.length > 0) {
                console.log('✅ [CACHE] Usando perguntas do cache inteligente');
                this.bookingQuestions = cachedQuestions;
                return cachedQuestions;
            }

            // Fallback: buscar via AJAX se não há dados na página
            console.log('📡 [BOOKING QUESTIONS DEBUG] Buscando perguntas de reserva via AJAX...');
            console.log('🔍 [BOOKING QUESTIONS DEBUG] viatorBookingAjax:', typeof viatorBookingAjax !== 'undefined' ? viatorBookingAjax : 'undefined');

            // FASE 2.1: Aplicar rate limiting
            try {
                this.enforceRateLimit('booking');
            } catch (rateLimitError) {
                console.warn('⚠️ Rate limit:', rateLimitError.message);
                throw rateLimitError;
            }

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
                // CORREÇÃO: A resposta PHP usa 'booking_questions', não 'bookingQuestions'
                this.bookingQuestions = data.data.booking_questions || [];
                console.log('🔍 [BOOKING QUESTIONS DEBUG] Perguntas extraídas da resposta:', this.bookingQuestions);
                console.log('🔍 [BOOKING QUESTIONS DEBUG] Número de perguntas:', this.bookingQuestions.length);
                console.log('🔍 [BOOKING QUESTIONS DEBUG] Estrutura da resposta completa:', data.data);
                
                // Verificar se todas as perguntas têm o campo 'group'
                this.bookingQuestions.forEach((q, index) => {
                    console.log(`🔍 [BOOKING QUESTIONS DEBUG] Pergunta ${index}: ID=${q.id}, group=${q.group}, label=${q.label}`);
                });
                
                const questionsWithGroup = this.bookingQuestions.filter(q => q.group);
                console.log(`✅ [BOOKING QUESTIONS DEBUG] Perguntas com campo group: ${questionsWithGroup.length}/${this.bookingQuestions.length}`);
                
                const perTravelerQuestions = this.bookingQuestions.filter(q => q.group === 'PER_TRAVELER');
                const perBookingQuestions = this.bookingQuestions.filter(q => q.group === 'PER_BOOKING');
                console.log(`✅ [BOOKING QUESTIONS DEBUG] PER_TRAVELER: ${perTravelerQuestions.length}, PER_BOOKING: ${perBookingQuestions.length}`);
                
                // FASE 3.1: Salvar no cache inteligente
                this.setSmartCache(cacheKey, this.bookingQuestions, 2);

                // Salvar no cache local para futuras consultas (compatibilidade)
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
            // CORREÇÃO: Garantir que label seja string válida
            const safeLabel = this.ensureStringForHTML(question.label, 'Pergunta');
            html += `<label for="${questionId}">${safeLabel}${requiredMark}</label>`;
            
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
        
        // Renderizar Modo de chegada primeiro, seguido dos dependentes e, em seguida, o Endereço final
        const arrivalModeQ = transferQuestions.find(q => q.id === 'TRANSFER_ARRIVAL_MODE');
        const arrivalTimeQ = transferQuestions.find(q => q.id === 'TRANSFER_ARRIVAL_TIME');
        const dropOffQ = transferQuestions.find(q => q.id === 'TRANSFER_ARRIVAL_DROP_OFF');
        const airAirlineQ = transferQuestions.find(q => q.id === 'TRANSFER_AIR_ARRIVAL_AIRLINE');
        const airFlightQ = transferQuestions.find(q => q.id === 'TRANSFER_AIR_ARRIVAL_FLIGHT_NO');

        const renderQ = (question) => {
            if (!question) return;
            const questionId = `booking_question_${question.id}`;
            const isRequired = question.required === 'MANDATORY';
            const requiredMark = isRequired ? ' *' : '';
            html += '<div class="booking-question-group">';
            const safeLabel = this.ensureStringForHTML(question.label, 'Pergunta');
            html += `<label for="${questionId}">${safeLabel}${requiredMark}</label>`;
            html += this.renderQuestionField(question, questionId, isRequired, false, null);
            html += `<div class="error-message" id="error_${questionId}" style="display: none;"></div>`;
            html += '</div>';
        };

        // Modo de chegada (sempre visível)
        renderQ(arrivalModeQ);
        // Dependentes mais compreensíveis logo abaixo
        renderQ(airAirlineQ);
        renderQ(airFlightQ);
        renderQ(arrivalTimeQ);
        // Endereço final
        renderQ(dropOffQ);
        
        // Renderizar pergunta de ponto de encontro ao final desse bloco
        if (pickupQuestions.length > 0) {
            const question = pickupQuestions[0];
            const questionId = `booking_question_${question.id}`;
            const isRequired = question.required === 'MANDATORY';
            const requiredMark = isRequired ? ' *' : '';
            html += '<div class="pickup-point-question-group">';
            const safeLabel = this.ensureStringForHTML(question.label, 'Local de Encontro');
            html += `<label for="${questionId}">${safeLabel}${requiredMark}</label>`;
            html += this.renderQuestionField(question, questionId, isRequired, false, null);
            html += `<div class="error-message" id="error_${questionId}" style="display: none;"></div>`;
            html += '</div>';
        }
        
        return html;
    }

    /**
     * Renderizar seção de Idioma da Excursão
     */
    renderLanguageGuideSection() {
        console.log('🌐 [LANGUAGE GUIDE] Iniciando renderização da seção de idioma...');
        
        // Buscar o container de language guide
        const languageContainer = document.getElementById('language-guide-container');
        if (!languageContainer) {
            console.warn('⚠️ [LANGUAGE GUIDE] Container language-guide-container não encontrado');
            return;
        }
        // Evitar duplicação: sempre limpar antes de escrever
        languageContainer.innerHTML = '';
        
        const languageQuestions = this.bookingQuestions.filter(q => 
            q.group === 'PER_BOOKING' && 
            (q.subType === 'LANGUAGE_GUIDE' || q.label.toLowerCase().includes('idioma') || q.label.toLowerCase().includes('language'))
        );
        
        console.log('🌐 [LANGUAGE GUIDE] Perguntas de idioma encontradas nas booking questions:', languageQuestions.length);
        
        let html = '';
        
        // Se não há perguntas de idioma nas booking questions, criar uma baseada nos languageGuides
        if (languageQuestions.length === 0) {
            const languageGuides = window.productData?.languageGuides || [];
            console.log('🌐 [LANGUAGE GUIDE] Language guides disponíveis no productData:', languageGuides);
            
            if (languageGuides.length > 0) {
                const questionId = 'language_guide_selection';
                
                html = '';
                html += '<div class="booking-question-group">';
                html += '<label for="' + questionId + '">Selecione o idioma preferido para a excursão</label>';
                html += '<select id="' + questionId + '" name="' + questionId + '" class="form-control question-input" data-question-id="LANGUAGE_GUIDE" data-group="PER_BOOKING">';
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
                
                console.log('🌐 [LANGUAGE GUIDE] HTML gerado baseado nos languageGuides:', html.length, 'caracteres');
            } else {
                console.log('🌐 [LANGUAGE GUIDE] Nenhum language guide disponível no produto');
            }
        } else {
            // Renderizar pergunta de idioma existente nas booking questions
            const question = languageQuestions[0];
            const questionId = `booking_question_${question.id}`;
            const isRequired = question.required === 'MANDATORY';
            const requiredMark = isRequired ? ' *' : '';
            
            html = '';
            html += '<div class="booking-question-group">';
            // CORREÇÃO: Garantir que label seja string válida
            const safeLabel = this.ensureStringForHTML(question.label, 'Idioma');
            html += `<label for="${questionId}">${safeLabel}${requiredMark}</label>`;
            html += this.renderQuestionField(question, questionId, isRequired, false, null);
            html += `<div class="error-message" id="error_${questionId}" style="display: none;"></div>`;
            html += '</div>';
            
            console.log('🌐 [LANGUAGE GUIDE] HTML gerado baseado na booking question:', html.length, 'caracteres');
        }
        
        // Inserir o HTML no container
        if (html) {
            languageContainer.innerHTML = html;
            console.log('✅ [LANGUAGE GUIDE] Seção de idioma renderizada com sucesso no container');

            // Pós-render: aplicar valor previamente selecionado, se existir
            try {
                const selectEl = document.getElementById('language_guide_selection');
                if (selectEl) {
                    // Preselecionar se houver apenas uma opção disponível
                    const guides = (window.productData?.languageGuides || []);
                    if (guides.length === 1 && !this.bookingData.selectedLanguageGuideCode) {
                        const autoCode = guides[0]?.language || '';
                        const autoType = guides[0]?.type || 'GUIDE';
                        if (autoCode) {
                            selectEl.value = autoCode;
                            this.bookingData.selectedLanguageGuideCode = autoCode;
                            this.bookingData.selectedLanguageGuideType = autoType;
                            console.log('🌐 [LANGUAGE GUIDE] Seleção automática aplicada:', autoCode);
                        }
                    }

                    // Reaplicar seleção do bookingData, se existir
                    if (this.bookingData.selectedLanguageGuideCode) {
                        selectEl.value = this.bookingData.selectedLanguageGuideCode;
                        // Ajustar type a partir da opção atual, se faltar
                        if (!this.bookingData.selectedLanguageGuideType) {
                            const opt = selectEl.options[selectEl.selectedIndex];
                            this.bookingData.selectedLanguageGuideType = (opt && opt.dataset.type) ? opt.dataset.type : 'GUIDE';
                        }
                    }

                    // Bind de mudança para persistir seleção
                    if (!selectEl._viatorLangBound) {
                        selectEl.addEventListener('change', () => {
                            const v = selectEl.value?.trim() || '';
                            const opt = selectEl.options[selectEl.selectedIndex];
                            const t = (opt && opt.dataset.type) ? opt.dataset.type : 'GUIDE';
                            this.bookingData.selectedLanguageGuideCode = v || null;
                            this.bookingData.selectedLanguageGuideType = v ? t : null;
                            console.log('🌐 [LANGUAGE GUIDE] Selecionado pelo usuário:', {
                                language: this.bookingData.selectedLanguageGuideCode,
                                type: this.bookingData.selectedLanguageGuideType
                            });
                        });
                        selectEl._viatorLangBound = true;
                    }
                }
            } catch (e) {
                console.warn('⚠️ [LANGUAGE GUIDE] Falha ao aplicar seleção automática/reativar eventos:', e);
            }
        } else {
            languageContainer.innerHTML = '';
            console.log('ℹ️ [LANGUAGE GUIDE] Nenhum conteúdo de idioma para renderizar');
        }
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
                // CORREÇÃO: Garantir que label seja string válida
                const safeLabel = this.ensureStringForHTML(question.label, 'Pergunta');
                html += `<label for="${questionId}">${safeLabel}${requiredMark}</label>`;
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
        const cssClass = isTraveler ? 'form-control question-input' : 'form-control question-input';
        
        // Adicionar atributos para o sistema de perguntas condicionais
        let dataAttrs = `data-question-id="${question.id}" data-group="${question.group}"`;
        if (isTraveler) {
            // travelerIndex deve ser 1-based conforme envio da Viator (travelerNum)
            const travelerNumber = Number(travelerIndex) >= 1 ? Number(travelerIndex) : 1;
            dataAttrs += ` data-traveler="${travelerNumber}"`;
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
                // CORREÇÃO: Verificar se é uma pergunta de seleção de idioma
                const labelText = this.ensureStringForHTML(question.label, '').toLowerCase();
                if (question.subType === 'LANGUAGE_GUIDE' || labelText.includes('idioma') || labelText.includes('language')) {
                    html += this.renderLanguageGuideSelection(questionId, dataAttrs, requiredAttr);
                } else if (question.allowedAnswers && question.allowedAnswers.length > 0) {
                    // Verificar se é uma pergunta de faixa etária (AGEBAND)
                    const isAgeBand = question.id === 'AGEBAND' || questionId.includes('AGEBAND');
                    
                    // Pré-selecionar automaticamente conforme a distribuição escolhida na Etapa 1
                    let preselectValue = null;
                    if (isAgeBand && isTraveler) {
                        if (!Array.isArray(this.bookingData.travelerAgeBandAllocation) || this.bookingData.travelerAgeBandAllocation.length === 0) {
                            const allocation = [];
                            (this.bookingData.selectedTravelers || []).forEach(group => {
                                const count = Number(group.numberOfTravelers) || 0;
                                for (let i = 0; i < count; i++) allocation.push(group.ageBand);
                            });
                            this.bookingData.travelerAgeBandAllocation = allocation;
                        }
                        preselectValue = this.bookingData.travelerAgeBandAllocation?.[Number(travelerIndex) - 1] || null;
                    }

                    // Filtro base de allowedAnswers
                    let filteredAnswers = question.allowedAnswers;
                    if (isAgeBand) {
                        const availableBands = Array.isArray(this.ageBands) ? new Set(this.ageBands.map(b => b.ageBand)) : new Set();
                        const selectedBands = Array.isArray(this.bookingData.selectedTravelers) ? new Set(this.bookingData.selectedTravelers.map(t => t.ageBand)) : new Set();
                        filteredAnswers = (question.allowedAnswers || []).filter(a => availableBands.has(a) && selectedBands.has(a));
                    } else if (question.id === 'TRANSFER_ARRIVAL_MODE' || question.id === 'TRANSFER_DEPARTURE_MODE') {
                        // Filtro de modos: manter somente os modos suportados pelo produto (derivados das perguntas dependentes)
                        const present = (id) => Array.isArray(this.bookingQuestions) && this.bookingQuestions.some(q => q.id === id);
                        const hasAir = present('TRANSFER_AIR_ARRIVAL_AIRLINE') || present('TRANSFER_AIR_ARRIVAL_FLIGHT_NO') || present('TRANSFER_AIR_DEPARTURE_AIRLINE') || present('TRANSFER_AIR_DEPARTURE_FLIGHT_NO');
                        const hasSea = present('TRANSFER_PORT_CRUISE_SHIP') || present('TRANSFER_PORT_ARRIVAL_TIME') || present('TRANSFER_PORT_DEPARTURE_TIME');
                        const hasRail = present('TRANSFER_RAIL_ARRIVAL_STATION') || present('TRANSFER_RAIL_ARRIVAL_LINE') || present('TRANSFER_RAIL_DEPARTURE_STATION') || present('TRANSFER_RAIL_DEPARTURE_LINE');
                        filteredAnswers = (question.allowedAnswers || []).filter(a => {
                            if (a === 'OTHER') return true;
                            if (a === 'AIR') return hasAir;
                            if (a === 'SEA') return hasSea;
                            if (a === 'RAIL') return hasRail;
                            return false;
                        });
                        // Garantir que exista pelo menos OTHER
                        if (!filteredAnswers.includes('OTHER')) filteredAnswers.push('OTHER');
                    }

                    // Se AGE BAND por viajante já foi alocado, travar o campo
                    const isLockedAgeBand = Boolean(isAgeBand && isTraveler);
                    const disabledAttr = (isLockedAgeBand && preselectValue) ? 'disabled' : '';

                    html += `<select id="${questionId}" name="${questionId}" class="${cssClass}" ${dataAttrs} ${requiredAttr} ${disabledAttr} ${isLockedAgeBand ? 'data-locked-ageband="true"' : ''}>`;
                    html += '<option value="">Selecione uma opção</option>';
                    
                    // Se houver valor de alocação, eliminar as demais opções para este viajante
                    const finalAnswers = (isAgeBand && isTraveler && preselectValue)
                        ? [preselectValue]
                        : filteredAnswers;

                    finalAnswers.forEach(answer => {
                        // Usar label traduzido para modos de chegada/partida e outros allowedAnswers
                        let displayText;
                        if (isAgeBand) {
                            const band = Array.isArray(this.ageBands) ? this.ageBands.find(b => b.ageBand === answer) : null;
                            displayText = band?.label || this.getAgeBandDisplayName?.(answer) || answer;
                        } else {
                            displayText = this.getAnswerDisplayText(question.id, answer) || answer;
                        }
                        const selectedAttr = preselectValue && preselectValue === answer ? ' selected' : '';
                        html += `<option value="${answer}"${selectedAttr}>${displayText}</option>`;
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
                    
                    const travelerAttr = isTraveler ? `data-traveler="${Number(travelerIndex) >= 1 ? Number(travelerIndex) : 1}"` : '';
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
     * Interface SIMPLIFICADA de pickup point - UX equivalente à Viator oficial
     * Baseada na documentação: https://partnerresources.viator.com/travel-commerce/merchant/implementing-booking-questions/
     */
    renderPickupPointField(question, questionId, cssClass, dataAttrs, requiredAttr) {
        let html = '';
        const pickupData = this.getPickupData();
        
        console.log('🎨 [PICKUP RENDER] Dados de pickup:', pickupData);
        
        // Caso não haja pickup (todos se encontram no ponto de partida), ocultar UI e responder automaticamente
        if (pickupData && pickupData.pickupOptionType === 'MEET_EVERYONE_AT_START_POINT') {
            console.log('ℹ️ [PICKUP RENDER] pickupOptionType = MEET_EVERYONE_AT_START_POINT — ocultando UI e definindo MEET_AT_DEPARTURE_POINT');
            html += `<input type="hidden" id="${questionId}" name="${questionId}" class="${cssClass}" ${dataAttrs} ${requiredAttr} value="MEET_AT_DEPARTURE_POINT" data-unit="LOCATION_REFERENCE">`;

            // Exibir card informativo com o ponto de encontro (start location)
            const startInfo = window.productData?.logistics?.start?.[0] || null;
            const meetingDesc = startInfo?.description ? String(startInfo.description).replace(/\n/g,'<br>') : '';
            const meetingRef = startInfo?.location?.ref || '';
            const detailsContainerId = `${questionId}_meeting_details`;

            html += `
                <div class="meeting-point-card" style="margin-top:10px;padding:12px;border:1px solid #e0e0e0;border-radius:8px;background:#fafafa">
                    <div class="meeting-radio" style="margin-bottom:6px">
                        <input type="radio" id="${questionId}_meet_radio" name="${questionId}_meet_radio" checked>
                        <label for="${questionId}_meet_radio" style="margin-left:6px;cursor:pointer">🚶 Vou por conta própria até o ponto de encontro</label>
                    </div>
                    ${meetingDesc ? `<div class="meeting-point-desc" style="margin:6px 0;color:#333">${meetingDesc}</div>` : ''}
                    <div id="${detailsContainerId}" class="meeting-point-details" style="color:#555"></div>
                    <div class="meeting-point-note" style="margin-top:8px;color:#555;font-size:0.92em">ℹ️ O fornecedor pode reconfirmar os detalhes do ponto de encontro após a compra.</div>
                </div>
            `;

            if (meetingRef) {
                setTimeout(() => {
                    try { this.loadMeetingPointDetails(meetingRef, detailsContainerId); } catch (_) {}
                }, 50);
            }

            return html;
        }
        
        // Container principal para pickup point
        html += `<div id="${questionId}_container" class="pickup-point-container">`;

        // Campo hidden para validação (recebe o valor selecionado)
        html += `<input type="hidden" id="${questionId}" name="${questionId}" class="${cssClass}" ${dataAttrs} ${requiredAttr}>`;
        
        // Verificar se permite texto livre (allowCustomTravelerPickup)
        const allowCustomPickup = this.isCustomPickupAllowed();
        
        if (!pickupData || !pickupData.locations || pickupData.locations.length === 0) {
            console.log('⚠️ [PICKUP RENDER] Fallback: sem dados específicos de pickup');
            // Interface simplificada quando não há dados
            html += `
                <div class="pickup-simple-options">
                    <div class="pickup-option-wrapper">
                        <input type="radio" id="${questionId}_contact_later" name="${questionId}" value="CONTACT_SUPPLIER_LATER">
                        <label for="${questionId}_contact_later" class="pickup-option-label">
                            <div class="pickup-option-title">📞 Vou decidir depois</div>
                            <div class="pickup-option-description">O fornecedor entrará em contato para definir o local</div>
                        </label>
                    </div>
            `;
            
            if (allowCustomPickup) {
                html += `
                    <div class="pickup-option-wrapper">
                        <input type="radio" id="${questionId}_custom" name="${questionId}" value="CUSTOM_LOCATION">
                        <label for="${questionId}_custom" class="pickup-option-label">
                            <div class="pickup-option-title">📍 Informar endereço específico</div>
                            <div class="pickup-option-description">Digite o endereço do seu hotel ou local desejado</div>
                        </label>
                    </div>
                    <div id="${questionId}_custom_input" class="pickup-custom-input" style="display: none;">
                        <input type="text" id="${questionId}_freetext" placeholder="Digite o endereço completo do seu hotel ou local" autocomplete="off">
                        <div id="${questionId}_outside_warning" class="pickup-warning pickup-warning-outside" style="display: none;">
                            ⚠️ Este local pode estar fora da área de pickup. Você poderá escolher um ponto mais próximo depois.
                        </div>
                    </div>
                `;
            }
            
                html += `</div>`;
                html += `</div>`;
            return html;
        }
        
        // Interface principal com opções baseadas nos dados do produto (como Viator oficial)
        console.log(`📋 [PICKUP] Renderizando interface principal com ${pickupData.locations.length} locais disponíveis`);
        const hasContactLater = Array.isArray(pickupData.locations) && pickupData.locations.some(l => l && l.location && l.location.ref === 'CONTACT_SUPPLIER_LATER');
        const hasLocationRefs = Array.isArray(pickupData.locations) && pickupData.locations.some(l => (l && l.location && typeof l.location.ref === 'string' && l.location.ref.startsWith('LOC-')));
        
        html += `
            <div class="pickup-main-options">
                ${hasContactLater ? `
                <!-- Opção 1: Vou decidir depois -->
                <div class="pickup-option-wrapper">
                    <input type="radio" id="${questionId}_contact_later" name="${questionId}" value="CONTACT_SUPPLIER_LATER">
                    <label for="${questionId}_contact_later" class="pickup-option-label">
                        <div class="pickup-option-title">📞 Vou decidir depois</div>
                        <div class="pickup-option-description">O fornecedor entrará em contato para confirmar o local de encontro</div>
                    </label>
                </div>` : ''}
                
                ${hasLocationRefs ? `
                <!-- Opção 2: Escolher de uma lista de locais -->
                <div class="pickup-option-wrapper">
                    <input type="radio" id="${questionId}_choose_location" name="${questionId}" value="CHOOSE_FROM_LIST">
                    <label for="${questionId}_choose_location" class="pickup-option-label">
                        <div class="pickup-option-title">🏨 Gostaria que me buscassem</div>
                        <div class="pickup-option-description" id="${questionId}_choose_desc">Selecionar hotel, aeroporto ou ponto turístico</div>
                    </label>
                    <div id="${questionId}_chosen_preview" class="pickup-chosen-preview" style="display:none; margin:8px 0 0 32px; font-size: 0.95em; color:#333;"></div>
                </div>` : ''}
        `;
        
        if (allowCustomPickup) {
            html += `
                <!-- Opção 3: Informar endereço específico -->
                <div class="pickup-option-wrapper">
                    <input type="radio" id="${questionId}_custom" name="${questionId}" value="CUSTOM_LOCATION">
                    <label for="${questionId}_custom" class="pickup-option-label">
                        <div class="pickup-option-title">📍 Informar endereço específico</div>
                        <div class="pickup-option-description">Digite o endereço exato do seu hotel ou local</div>
                    </label>
                </div>
            `;
        }
        
            html += `</div>`;
        
        // Lista de locais: somente se houver LOC- disponíveis
        if (hasLocationRefs) {
            html += `
                <div id="${questionId}_locations_list" class="pickup-locations-list" style="display: none; margin-top: 15px; padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9;">
                    <div class="pickup-search-container">
                        <input type="text" id="${questionId}_search" class="form-control pickup-search-input" 
                               placeholder="🔍 Buscar hotel, aeroporto ou local..." autocomplete="off">
                    </div>
                    <div id="${questionId}_locations_container" class="pickup-locations-container">
                        <div class="loading-pickup-locations">⏳ Carregando locais... <span class="spinner"></span></div>
                    </div>
                </div>
            `;
        }
        
        if (allowCustomPickup) {
            // Campo de endereço customizado (inicialmente oculto)
            html += `
                <div id="${questionId}_custom_input" class="pickup-custom-input" style="display: none;">
                    <input type="text" id="${questionId}_freetext" class="form-control" 
                           placeholder="Digite o endereço completo do seu hotel ou local" autocomplete="off">
                    <div id="${questionId}_outside_warning" class="pickup-warning pickup-warning-outside" style="display: none;">
                        ⚠️ Este local pode estar fora da área de pickup. Você poderá escolher um ponto mais próximo depois.
                    </div>
                </div>
            `;
        }
        
        html += `</div>`;
        
        // Carregar localizações em background, apenas se existirem LOC-
        if (hasLocationRefs) {
            setTimeout(() => {
                const groupedLocations = this.groupPickupLocationsByType(pickupData.locations);
                this.loadPickupLocationDetails(pickupData.locations, questionId, groupedLocations);
            }, 100);
        }
        
        // Anexar scripts simplificados
        setTimeout(() => {
            this.attachSimplifiedPickupScripts(questionId, allowCustomPickup);
        }, 300);
        
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
     * Considera múltiplas fontes conforme documentação Viator
     */
    getPickupData() {
        console.log('🔍 [PICKUP DATA] Verificando dados de pickup...');
        
        // Primeiro tentar logistics.travelerPickup (fonte principal)
        if (window.productData?.logistics?.travelerPickup) {
            console.log('✅ [PICKUP DATA] Dados encontrados em logistics.travelerPickup');
            return window.productData.logistics.travelerPickup;
        }
        
        // Verificar se há pergunta PICKUP_POINT nas booking questions
        const hasPickupQuestion = this.bookingQuestions?.some(q => q.id === 'PICKUP_POINT') || 
                                  window.productData?.bookingQuestions?.some(q => q.id === 'PICKUP_POINT');
        
        if (hasPickupQuestion) {
            console.log('✅ [PICKUP DATA] PICKUP_POINT detectado nas booking questions, criando dados padrão');
            // Criar dados padrão quando há pergunta mas não há logistics
            return {
                pickupOptionType: 'PICKUP_EVERYONE', // Assumir que pickup é disponível
                allowCustomTravelerPickup: true, // Permitir texto livre por padrão
                locations: [
                    { location: { ref: 'MEET_AT_DEPARTURE_POINT' }, pickupType: 'OTHER' },
                    { location: { ref: 'CONTACT_SUPPLIER_LATER' }, pickupType: 'OTHER' }
                ]
            };
        }
        
        console.log('❌ [PICKUP DATA] Nenhum dado de pickup encontrado');
        return null;
    }
    
    /**
     * Anexar scripts de funcionalidade ao pickup point via JavaScript puro
     * Solução para problema de scripts inline não executados em conteúdo dinâmico
     */
    attachPickupPointScripts(questionId, allowCustomPickup) {
        console.log('🔧 [PICKUP SCRIPT] Inicializando script de pickup para', questionId);
        
        const container = document.getElementById(`${questionId}_container`);
        if (!container) {
            console.error('❌ [PICKUP SCRIPT] Container não encontrado:', `${questionId}_container`);
            return;
        }
        
        const hiddenField = document.getElementById(questionId);
        const searchInput = document.getElementById(`${questionId}_search`);
        const showListRadio = document.getElementById(`${questionId}_show_list`);
        const locationsContainer = document.getElementById(`${questionId}_locations_container`);
        
        console.log('🔧 [PICKUP SCRIPT] Elementos base encontrados:', {
            container: !!container,
            hiddenField: !!hiddenField,
            searchInput: !!searchInput,
            showListRadio: !!showListRadio,
            locationsContainer: !!locationsContainer
        });
        
        // Configurar controle de exibição da lista
        if (showListRadio && locationsContainer) {
            showListRadio.addEventListener('change', function() {
                if (this.checked) {
                    console.log('📋 [PICKUP SCRIPT] Exibindo lista de localizações');
                    locationsContainer.style.display = 'block';
                    // Focar no campo de busca se disponível
                    if (searchInput) {
                        setTimeout(() => searchInput.focus(), 100);
                    }
                }
            });
            
            // Listener para ocultar lista quando outras opções são selecionadas
            const otherRadios = container.querySelectorAll(`input[name="${questionId}"][type="radio"]:not(#${questionId}_show_list)`);
            otherRadios.forEach(radio => {
                radio.addEventListener('change', function() {
                    if (this.checked && locationsContainer) {
                        console.log('📋 [PICKUP SCRIPT] Ocultando lista de localizações');
                        locationsContainer.style.display = 'none';
                    }
                });
            });
        }
        
        // Typeahead local sempre disponível
        if (searchInput) {
            console.log('🔍 [PICKUP SCRIPT] Configurando busca typeahead');
            const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'');
            
            searchInput.addEventListener('input', function() {
                const q = norm(this.value);
                const wrappers = container.querySelectorAll('.pickup-option-wrapper');
                let visibleCount = 0;
                
                wrappers.forEach(w => {
                    const text = norm(w.textContent);
                    const shouldShow = !q || text.includes(q);
                    w.style.display = shouldShow ? '' : 'none';
                    if (shouldShow) visibleCount++;
                });
                
                console.log(`🔍 [PICKUP TYPEAHEAD] "${q}" -> ${visibleCount} resultados`);
                
                // Ocultar cabeçalhos de seção vazios
                container.querySelectorAll('.pickup-type-section').forEach(sec => {
                    const anyVisible = Array.from(sec.querySelectorAll('.pickup-option-wrapper'))
                        .some(el => el.style.display !== 'none');
                    sec.style.display = anyVisible ? '' : 'none';
                });
            });
        }
        
        // Filtro por modo de chegada
        const arrivalModeEl = document.querySelector('[data-question-id="TRANSFER_ARRIVAL_MODE"]');
        const applyModeFilter = (mode) => {
            if (!mode) return;
            console.log(`🚗 [PICKUP FILTER] Aplicando filtro para modo: ${mode}`);
            
            const allowedByMode = {
                AIR: ['AIRPORT','HOTEL','OTHER'],
                SEA: ['PORT','HOTEL','OTHER'], 
                RAIL: ['LOCATION','HOTEL','OTHER'],
                OTHER: ['LOCATION','HOTEL','OTHER']
            };
            
            const allowed = allowedByMode[mode] || ['HOTEL','AIRPORT','PORT','LOCATION','OTHER'];
            let visibleSections = 0;
            
            container.querySelectorAll('.pickup-type-section').forEach(sec => {
                const type = sec.getAttribute('data-pickup-type');
                const shouldShow = allowed.includes(type);
                sec.style.display = shouldShow ? '' : 'none';
                if (shouldShow) visibleSections++;
            });
            
            console.log(`🚗 [PICKUP FILTER] ${visibleSections} seções visíveis para modo ${mode}`);
        };
        
        if (arrivalModeEl) {
            console.log('🚗 [PICKUP FILTER] Configurando filtro por modo de chegada');
            applyModeFilter(arrivalModeEl.value);
            arrivalModeEl.addEventListener('change', function(){ applyModeFilter(this.value); });
        }
        
        // Funcionalidades de pickup customizado (se permitido)
        if (allowCustomPickup) {
            this.attachCustomPickupScripts(questionId, container, hiddenField);
        } else {
            console.log('ℹ️ [PICKUP SCRIPT] Pickup customizado não permitido para este produto');
        }
        
        console.log('✅ [PICKUP SCRIPT] Inicialização concluída para', questionId);
    }

    /**
     * Scripts simplificados para nova interface de pickup point
     */
    attachSimplifiedPickupScripts(questionId, allowCustomPickup) {
        console.log('🔧 [PICKUP SIMPLIFIED] Inicializando scripts para', questionId);
        const self = this;
        
        const container = document.getElementById(`${questionId}_container`);
        if (!container) {
            console.error('❌ [PICKUP SIMPLIFIED] Container não encontrado');
            return;
        }
        
        const hiddenField = document.getElementById(questionId);
        const chooseLocationRadio = document.getElementById(`${questionId}_choose_location`);
        const locationsList = document.getElementById(`${questionId}_locations_list`);
        const searchInput = document.getElementById(`${questionId}_search`);
        const customRadio = document.getElementById(`${questionId}_custom`);
        const customInput = document.getElementById(`${questionId}_custom_input`);
        const freetextInput = document.getElementById(`${questionId}_freetext`);
        const locationsContainer = document.getElementById(`${questionId}_locations_container`);
        const chooseDesc = document.getElementById(`${questionId}_choose_desc`);
        const chosenPreview = document.getElementById(`${questionId}_chosen_preview`);
        const contactLaterRadio = document.getElementById(`${questionId}_contact_later`);
        const arrivalModeInput = document.querySelector('[id*="TRANSFER_ARRIVAL_MODE"]');
        
        console.log('🔧 [PICKUP SIMPLIFIED] Elementos encontrados:', {
            hiddenField: !!hiddenField,
            chooseLocationRadio: !!chooseLocationRadio,
            locationsList: !!locationsList,
            searchInput: !!searchInput,
            customRadio: !!customRadio,
            customInput: !!customInput,
            freetextInput: !!freetextInput,
            locationsContainer: !!locationsContainer,
            chooseDesc: !!chooseDesc,
            chosenPreview: !!chosenPreview
        });
        
        // 1. Controlar exibição da lista de locais
        if (chooseLocationRadio && locationsList) {
            const showList = () => {
                console.log('📋 [PICKUP SIMPLIFIED] Exibindo lista de locais');
                locationsList.style.display = 'block';
                if (searchInput) setTimeout(() => searchInput.focus(), 100);
                if (hiddenField) {
                    hiddenField.classList.remove('is-invalid');
                    self.hideFieldError(hiddenField);
                }
                self.hideDateError();
            };
            chooseLocationRadio.addEventListener('change', function() { if (this.checked) showList(); });
            // Mostrar a lista imediatamente ao clicar na caixa da descrição
            const chooseLabel = container.querySelector(`label[for="${questionId}_choose_location"]`);
            if (chooseLabel) chooseLabel.addEventListener('click', showList);
        }

        // Não ocultar "Entrarei em contato depois" por arrival mode.
        // A presença/ausência dessa opção deve seguir os dados do produto (locations).
        
        // 2. Controlar exibição do campo customizado (oculto se não permitido)
        if (!allowCustomPickup && customRadio) {
            // Ocultar totalmente a opção quando não suportado pelo produto
            const wrapper = customRadio.closest('.pickup-option-wrapper');
            if (wrapper) wrapper.style.display = 'none';
        }
        if (allowCustomPickup && customRadio && customInput) {
            customRadio.addEventListener('change', function() {
                if (this.checked) {
                    console.log('📍 [PICKUP SIMPLIFIED] Exibindo campo customizado');
                    customInput.style.display = 'block';
                    if (freetextInput) {
                        setTimeout(() => freetextInput.focus(), 100);
                    }
                    if (hiddenField) {
                        hiddenField.classList.remove('is-invalid');
                        self.hideFieldError(hiddenField);
                    }
                    self.hideDateError();
                }
            });
        }
        
        // 3. Ocultar seções quando outras opções são selecionadas
        const allRadios = container.querySelectorAll(`input[name="${questionId}"][type="radio"], input[name="${questionId}_list_choice"][type="radio"]`);
        allRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (!this.checked) return;

                const isListChoice = this.name === `${questionId}_list_choice`;

                // Ocultar lista se não for a opção "escolher de lista" nem um item da lista
                if (!isListChoice && this.id !== `${questionId}_choose_location` && locationsList) {
                    locationsList.style.display = 'none';
                }

                // Ocultar campo customizado se não for a opção customizada
                if (this.id !== `${questionId}_custom` && customInput) {
                    customInput.style.display = 'none';
                }

                // Atualizar campo hidden somente para rádios principais
                if (hiddenField && this.name === `${questionId}`) {
                    if (this.id === `${questionId}_contact_later`) {
                        hiddenField.value = 'CONTACT_SUPPLIER_LATER';
                        hiddenField.removeAttribute('data-unit');
                        console.log('✅ [PICKUP SIMPLIFIED] Valor atualizado: CONTACT_SUPPLIER_LATER');
                        hiddenField.classList.remove('is-invalid');
                        self.hideFieldError(hiddenField);
                        self.hideDateError();
                    } else if (this.id === `${questionId}_custom`) {
                        // Esperar o usuário digitar o endereço antes de setar o hidden
                        hiddenField.value = '';
                        hiddenField.removeAttribute('data-unit');
                        if (customInput) customInput.style.display = 'block';
                        if (freetextInput) setTimeout(() => freetextInput.focus(), 50);
                        console.log('ℹ️ [PICKUP SIMPLIFIED] Aguardando endereço customizado');
                        hiddenField.classList.remove('is-invalid');
                        self.hideFieldError(hiddenField);
                        self.hideDateError();
                    } else if (this.id === `${questionId}_choose_location`) {
                        // Não sobrescrever o hidden aqui; ele será definido quando um item da lista for escolhido
                        if (locationsList) locationsList.style.display = 'block';
                        if (searchInput) setTimeout(() => searchInput.focus(), 50);
                        console.log('ℹ️ [PICKUP SIMPLIFIED] Aguardando escolha da lista');
                        hiddenField.classList.remove('is-invalid');
                        self.hideFieldError(hiddenField);
                        self.hideDateError();
                    } else if (this.value && this.value.startsWith('LOC-')) {
                        // Caso algum radio principal use um LOC diretamente (raro)
                        hiddenField.value = this.value;
                        hiddenField.setAttribute('data-unit', 'LOCATION_REFERENCE');
                        console.log('✅ [PICKUP SIMPLIFIED] Valor atualizado (LOC direto):', this.value);
                        hiddenField.classList.remove('is-invalid');
                        self.hideFieldError(hiddenField);
                        self.hideDateError();
                    }
                }
            });
        });
        
        // 4. Busca typeahead na lista
        if (searchInput && locationsContainer) {
            searchInput.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase().trim();
                const locationOptions = locationsContainer.querySelectorAll('input[type="radio"][value^="LOC-"]');
                const typeSections = locationsContainer.querySelectorAll('.pickup-type-section');
                let totalVisible = 0;
                
                locationOptions.forEach(radio => {
                    const wrapper = radio.closest('.pickup-option-wrapper');
                    if (wrapper) {
                        const text = wrapper.textContent.toLowerCase();
                        const matches = !searchTerm || text.includes(searchTerm);
                        wrapper.style.display = matches ? 'block' : 'none';
                        if (matches) totalVisible++;
                    }
                });
                
                // Atualizar cabeçalhos de categoria
                if (typeSections.length > 0) {
                    typeSections.forEach(section => {
                        const visibleOptions = section.querySelectorAll('.pickup-option-wrapper:not([style*="display: none"])');
                        section.style.display = visibleOptions.length > 0 ? 'block' : 'none';
                    });
                }
                
                console.log(`🔍 [PICKUP SIMPLIFIED] ${totalVisible} locais encontrados para "${searchTerm}"`);
            });
        }
        
        // 4.1 Atualizar resumo ao selecionar um item da lista e manter 'Escolher de uma lista' marcado
        if (locationsContainer) {
            locationsContainer.addEventListener('change', (ev) => {
                const target = ev.target;
                if (!target || !target.matches(`input[name="${questionId}_list_choice"][type="radio"]`)) return;

                // Manter o rádio principal "Escolher de uma lista" marcado
                if (chooseLocationRadio) {
                    chooseLocationRadio.checked = true;
                    // Não redefinir o hidden aqui para CHOOSE_FROM_LIST; apenas manter o estado visual
                }

                const wrapper = target.closest('.pickup-option-wrapper');
                const titleEl = wrapper ? wrapper.querySelector('.pickup-option-title') : null;
                const addrEl = wrapper ? wrapper.querySelector('.pickup-option-address span:last-child') : null;
                const title = (titleEl?.textContent || '').trim();
                const addr = (addrEl?.textContent || '').trim();
                const summaryText = addr ? `${title} — ${addr}` : title || target.value;

                // Atualizar label principal e ocultar a lista após escolha
                const chooseLabelTitle = document.querySelector(`label[for="${questionId}_choose_location"] .pickup-option-title`);
                if (chooseLabelTitle) chooseLabelTitle.textContent = summaryText;
                if (locationsList) locationsList.style.display = 'none';

                // Persistir seleção
                if (hiddenField) {
                    hiddenField.value = target.value;
                    hiddenField.setAttribute('data-unit', 'LOCATION_REFERENCE');
                    hiddenField.classList.remove('is-invalid');
                    self.hideFieldError(hiddenField);
                    self.hideDateError();
                }
            });
        }
        
        // 5. Input customizado com Google Places Autocomplete (se permitido)
        if (allowCustomPickup && freetextInput) {
            // Verificar se Google Places está disponível
            if (typeof google !== 'undefined' && google.maps && google.maps.places) {
                console.log('🌍 [PICKUP SIMPLIFIED] Configurando Google Places Autocomplete');
                
                const autocomplete = new google.maps.places.Autocomplete(freetextInput, {
                    types: ['address'],
                    componentRestrictions: { country: 'br' }
                });

                autocomplete.addListener('place_changed', () => {
                    const place = autocomplete.getPlace();
                    if (place.geometry && place.formatted_address) {
                        freetextInput.value = place.formatted_address;
                        hiddenField.value = place.formatted_address;
                        hiddenField.setAttribute('data-unit', 'FREETEXT');
                        console.log('🌍 [PICKUP SIMPLIFIED] Endereço selecionado via Google:', place.formatted_address);
                    }
                });
            } else {
                console.log('⚠️ [PICKUP SIMPLIFIED] Google Places não disponível, usando input simples');
            }
            
            // Input manual
            freetextInput.addEventListener('input', function() {
                const value = this.value.trim();
                if (hiddenField && value) {
                    hiddenField.value = value;
                    hiddenField.setAttribute('data-unit', 'FREETEXT');
                    console.log('📝 [PICKUP SIMPLIFIED] Endereço customizado:', value);
                    hiddenField.classList.remove('is-invalid');
                    self.hideFieldError(hiddenField);
                    self.hideDateError();
                }
            });
        }
        
        // 6. Não definir valor inicial por padrão para forçar escolha explícita quando necessário
        if (hiddenField) {
            hiddenField.value = '';
            hiddenField.removeAttribute('data-unit');
        }

        // 6.1 Limpar escolha da lista quando trocar para outras opções
        if (container) {
            container.addEventListener('change', (ev) => {
                const target = ev.target;
                if (!target || !target.matches(`input[name="${questionId}"][type="radio"]`)) return;
                if (target.id === `${questionId}_choose_location`) return; // não limpar ao reabrir a lista

                // Ocultar lista ao trocar para outras opções
                if (locationsList) locationsList.style.display = 'none';
            });
        }
        
        if (locationsContainer) {
            locationsContainer.addEventListener('change', (ev) => {
                const target = ev.target;
                if (target && target.matches(`input[name="${questionId}"][type="radio"]`)) {
                    const wrapper = target.closest('.pickup-option-wrapper');
                    const titleEl = wrapper ? wrapper.querySelector('.pickup-option-title') : null;
                    const addrEl = wrapper ? wrapper.querySelector('.pickup-option-address span:last-child') : null;
                    const title = (titleEl?.textContent || '').trim();
                    const addr = (addrEl?.textContent || '').trim();
                    const summaryText = addr ? `${title} — ${addr}` : title || target.value;

                    if (chooseDesc) chooseDesc.textContent = summaryText;
                    if (chosenPreview) {
                        chosenPreview.textContent = summaryText;
                        chosenPreview.style.display = 'block';
                    }

                    if (locationsList) locationsList.style.display = 'block';

                    if (hiddenField) {
                        hiddenField.value = target.value;
                        hiddenField.setAttribute('data-unit', 'LOCATION_REFERENCE');
                        hiddenField.classList.remove('is-invalid');
                        self.hideFieldError(hiddenField);
                        self.hideDateError();
                    }
                }
            });
        }
        
        console.log('✅ [PICKUP SIMPLIFIED] Scripts configurados com sucesso');
    }
    
    /**
     * Anexar scripts específicos para pickup customizado
     */
    attachCustomPickupScripts(questionId, container, hiddenField) {
        const customRadio = document.getElementById(`${questionId}_custom`);
                        const customInput = container.querySelector('.pickup-custom-input');
        const freetextInput = document.getElementById(`${questionId}_freetext`);
        const suggestionsBox = document.getElementById(`${questionId}_places_suggestions`);
        const outsideWarning = document.getElementById(`${questionId}_outside_warning`);
                        
        console.log('🔧 [PICKUP CUSTOM] Elementos customizados encontrados:', {
                            customRadio: !!customRadio,
                            customInput: !!customInput,
            freetextInput: !!freetextInput,
            suggestionsBox: !!suggestionsBox,
            outsideWarning: !!outsideWarning
        });
        
        if (!customRadio || !customInput || !freetextInput) {
            console.warn('⚠️ [PICKUP CUSTOM] Elementos obrigatórios não encontrados');
            return;
        }
        
        // Mostrar/ocultar campo customizado
                            customRadio.addEventListener('change', function() {
                                if (this.checked) {
                console.log('📍 [PICKUP CUSTOM] Radio customizado selecionado');
                                    customInput.style.display = 'block';
                                    freetextInput.focus();
                console.log('✅ [PICKUP CUSTOM] Campo de texto livre exibido');
                                }
                            });
                            
                            // Ocultar campo customizado quando outra opção for selecionada
                            container.addEventListener('change', function(e) {
            if (e.target.name === questionId && e.target.value !== 'CUSTOM_LOCATION') {
                console.log('🔄 [PICKUP CUSTOM] Outra opção selecionada, ocultando campo customizado');
                                    customInput.style.display = 'none';
                                    freetextInput.value = '';
                if (suggestionsBox) { 
                    suggestionsBox.style.display = 'none'; 
                    suggestionsBox.innerHTML = ''; 
                }
                if (outsideWarning) outsideWarning.style.display = 'none';
                                }
                            });
                            
        // Configurar Google Places ou fallback simples
        if (window.viatorPlacesConfig?.enabled && window.google?.maps?.places) {
            this.setupGooglePlacesAutocomplete(freetextInput, suggestionsBox, outsideWarning, hiddenField, customRadio);
                        } else {
            this.setupSimpleFreetextInput(freetextInput, outsideWarning, hiddenField, customRadio);
        }
    }
    /**
     * Configurar Google Places Autocomplete
     */
    setupGooglePlacesAutocomplete(freetextInput, suggestionsBox, outsideWarning, hiddenField, customRadio) {
        console.log('🌍 [PICKUP GOOGLE] Configurando Google Places Autocomplete');
        
        const autocompleteService = new google.maps.places.AutocompleteService();
        const placesService = new google.maps.places.PlacesService(document.createElement('div'));
        let debounceTimer = null;
        
        freetextInput.addEventListener('input', function() {
            const query = this.value.trim();
            
            if (!query) {
                if (suggestionsBox) { 
                    suggestionsBox.style.display = 'none'; 
                    suggestionsBox.innerHTML = ''; 
                }
                if (outsideWarning) outsideWarning.style.display = 'none';
                if (hiddenField && customRadio?.checked) hiddenField.value = '';
                return;
            }
            
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                autocompleteService.getPlacePredictions({ 
                    input: query, 
                    types: ['establishment','geocode'], 
                    componentRestrictions: { country: ['br'] }, 
                    language: (window.viatorPlacesConfig.language || 'pt-BR') 
                }, (predictions, status) => {
                    if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
                        if (suggestionsBox) { 
                            suggestionsBox.style.display = 'none'; 
                            suggestionsBox.innerHTML = ''; 
                        }
                        if (outsideWarning) outsideWarning.style.display = 'block';
                        return;
                    }
                    
                    if (!suggestionsBox) return;
                    
                    suggestionsBox.innerHTML = predictions.slice(0,5).map(p => 
                        `<div class="suggestion-item" data-place-id="${p.place_id}">${p.description}</div>`
                    ).join('');
                    suggestionsBox.style.display = 'block';
                    
                    suggestionsBox.querySelectorAll('.suggestion-item').forEach(item => {
                        item.addEventListener('click', function() {
                            const placeId = this.getAttribute('data-place-id');
                            placesService.getDetails({ 
                                placeId: placeId, 
                                fields: ['name','formatted_address','geometry'] 
                            }, (place, detailsStatus) => {
                                if (detailsStatus === google.maps.places.PlacesServiceStatus.OK && place) {
                                    const fullAddress = place.formatted_address || this.textContent;
                                    freetextInput.value = fullAddress;
                                    suggestionsBox.style.display = 'none';
                                    suggestionsBox.innerHTML = '';
                                    
                                    if (hiddenField && customRadio?.checked) {
                                        hiddenField.value = fullAddress;
                                        hiddenField.setAttribute('data-unit', 'FREETEXT');
                                    }
                                    if (outsideWarning) outsideWarning.style.display = 'none';
                                    console.log('✅ [PICKUP GOOGLE] Endereço selecionado:', fullAddress);
                                }
                            });
                        });
                    });
                });
            }, 250);
        });
    }
    
    /**
     * Configurar input simples de texto livre (fallback sem Google Places)
     */
    setupSimpleFreetextInput(freetextInput, outsideWarning, hiddenField, customRadio) {
        console.log('⚠️ [PICKUP CUSTOM] Google Places não disponível, usando input simples');
        
        freetextInput.addEventListener('input', function() {
            const val = this.value.trim();
            
            if (!val) {
                if (outsideWarning) outsideWarning.style.display = 'none';
                if (hiddenField && customRadio?.checked) hiddenField.value = '';
                return;
            }
            
            if (hiddenField && customRadio?.checked) {
                hiddenField.value = val;
                hiddenField.setAttribute('data-unit', 'FREETEXT');
            }
            if (outsideWarning) outsideWarning.style.display = 'block';
        });
    }
    
    /**
     * Verificar se o produto permite pickup customizado
     * Verifica múltiplas fontes: logistics e units da pergunta PICKUP_POINT
     */
    isCustomPickupAllowed() {
        // 1. Verificar via logistics (fonte principal). Se logistics existir, ele prevalece.
        const pickupData = this.getPickupData();
        if (pickupData) {
            if (pickupData.allowCustomTravelerPickup === true) {
            console.log('✅ Pickup customizado permitido via logistics.allowCustomTravelerPickup');
            return true;
            }
            console.log('❌ Pickup customizado NÃO permitido (logistics.allowCustomTravelerPickup = false)');
            return false;
        }
        
        // 2. Fallback apenas quando não há logistics: verificar units da pergunta PICKUP_POINT
        const pickupQuestion = this.bookingQuestions?.find(q => q.id === 'PICKUP_POINT');
        if (pickupQuestion && Array.isArray(pickupQuestion.units)) {
            const hasFreetext = pickupQuestion.units.includes('FREETEXT');
            console.log('🔍 Verificação de pickup customizado via booking question units (sem logistics):', {
                units: pickupQuestion.units,
                hasFreetext: hasFreetext,
                productCode: window.productData?.productCode || 'N/A'
            });
            if (hasFreetext) {
                console.log('✅ Pickup customizado permitido via PICKUP_POINT.units (fallback sem logistics)');
                return true;
            }
        }
        console.log('❌ Pickup customizado NÃO permitido (sem logistics e sem FREETEXT em units)');
        return false;
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
     * Carregar detalhes de um único ponto de encontro (para MEET_EVERYONE_AT_START_POINT)
     */
    async loadMeetingPointDetails(locationRef, containerId) {
        try {
            const response = await fetch(viatorBookingAjax.ajaxurl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    action: 'viator_get_location_details',
                    nonce: viatorBookingAjax.nonce,
                    location_refs: JSON.stringify([locationRef])
                })
            });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const result = await response.json();
            const target = document.getElementById(containerId);
            if (!target) return;
            if (result.success && Array.isArray(result.data) && result.data.length > 0) {
                const detail = result.data[0];
                const info = this.getFormattedLocationInfo(detail) || '';
                const name = detail.name || '';
                target.innerHTML = [name, info].filter(Boolean).join(' — ');
            } else {
                target.textContent = '';
            }
        } catch (err) {
            const target = document.getElementById(containerId);
            if (target) target.textContent = '';
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
        
        // Usar o container principal da nova interface simplificada
        const mainContainer = document.getElementById(`${questionId}_locations_container`);
        if (!mainContainer) {
            console.error(`❌ Container principal não encontrado: ${questionId}_locations_container`);
            return;
        }
        
        console.log(`✅ Container principal encontrado, renderizando ${locationDetails.length} locais`);
        
        // Criar mapa de detalhes por referência para acesso rápido
        const detailsMap = {};
        locationDetails.forEach(detail => {
            detailsMap[detail.reference] = detail;
        });
        
        let allHTML = '';
        
        // Renderizar cada seção por tipo de pickup
        Object.keys(groupedLocations).forEach(pickupType => {
            const locations = groupedLocations[pickupType];
            
            // FILTRAR locais especiais que não devem aparecer na lista de seleção
            const filteredLocations = locations.filter(loc => {
                const ref = loc.location.ref;
                return ref !== 'CONTACT_SUPPLIER_LATER' && ref !== 'MEET_AT_DEPARTURE_POINT';
            });

            if (filteredLocations.length === 0) {
                return; // Pular esta seção se não houver locais válidos
            }
            
            let html = `<h5>${this.getPickupTypeLabel(pickupType)}</h5>`;
            
            // Usar os locais filtrados para gerar o HTML
            filteredLocations.forEach((location, index) => {
                const detail = detailsMap[location.location.ref] || {};

                // Garantir referência válida; evitar radios com value undefined
                const reference = detail.reference || (location.location && location.location.ref) || '';
                if (!reference) {
                    return; // pular itens sem referência válida
                }

                // Nome do local (evitar 'Local não especificado')
                const locationNameRaw = detail.name || location.name || '';

                // Endereço/infos formatadas; se vazio, não renderizar a linha de endereço
                const formattedInfo = this.getFormattedLocationInfo(detail);

                // Se não há nome nem info, não renderizar o item (evita entradas confusas)
                if (!locationNameRaw && !formattedInfo) {
                    return;
                }

                const locationName = locationNameRaw || 'Local de pickup';
                
                const radioId = `${questionId}_${pickupType}_${index}`;
                
                html += `
                    <div class="pickup-option-wrapper" data-pickup-type="${pickupType}">
                        <input type="radio" id="${radioId}" name="${questionId}_list_choice" value="${reference}" data-question-id="${questionId}">
                        <label for="${radioId}" class="pickup-option-label">
                            <div class="pickup-option-title">${locationName}</div>
                            ${formattedInfo ? `
                            <div class="pickup-option-address">
                                <span class="pickup-option-icon">${this.getPickupTypeIcon(pickupType)}</span>
                                <span>${formattedInfo}</span>
                            </div>` : ''}
                            ${detail.provider === 'TRIPADVISOR' ? '<div class="pickup-option-badge">TripAdvisor</div>' : ''}
                        </label>
                    </div>
                `;
            });
            
            allHTML += html;
        });
        
        // Atualizar o container principal com todos os locais agrupados
        mainContainer.innerHTML = allHTML || '<p>Nenhum local disponível</p>';
        console.log(`✅ ${locationDetails.length} locais renderizados no container principal`);

        // Adicionar event listeners para sincronizar radio buttons com campo hidden
        setTimeout(() => {
            const hiddenField = document.getElementById(questionId);
            const radioButtons = document.querySelectorAll(`input[name="${questionId}"][type="radio"]`);

            console.log('🔧 [PICKUP SYNC] Configurando sincronização:', {
                hiddenField: !!hiddenField,
                radioButtons: radioButtons.length,
                questionId: questionId
            });

            if (hiddenField && radioButtons.length > 0) {
                // NUNCA definir automaticamente CONTACT_SUPPLIER_LATER quando a pergunta for MANDATORY
                const checkedRadio = document.querySelector(`input[name="${questionId}"][type="radio"]:checked`);
                const isMandatory = !!document.querySelector(`#${questionId}[required]`);
                if (checkedRadio) {
                    if (checkedRadio.id === `${questionId}_choose_location`) {
                        const listSelected = document.querySelector(`input[name="${questionId}_list_choice"]:checked`);
                        if (listSelected && listSelected.value) {
                            hiddenField.value = listSelected.value;
                            hiddenField.setAttribute('data-unit', 'LOCATION_REFERENCE');
                            console.log('📍 [PICKUP SYNC] Valor inicial (lista selecionada):', listSelected.value);
                        } else if (isMandatory) {
                            hiddenField.value = '';
                            hiddenField.removeAttribute('data-unit');
                            console.log('📍 [PICKUP SYNC] Campo obrigatório: aguardando escolha da lista');
                        } else {
                            hiddenField.value = 'CHOOSE_FROM_LIST';
                            hiddenField.removeAttribute('data-unit');
                        }
                    } else if (isMandatory && checkedRadio.value === 'CONTACT_SUPPLIER_LATER') {
                        hiddenField.value = '';
                        hiddenField.removeAttribute('data-unit');
                        console.log('📍 [PICKUP SYNC] Campo obrigatório: ignorando CONTACT_SUPPLIER_LATER');
                    } else {
                    hiddenField.value = checkedRadio.value;
                        hiddenField.setAttribute('data-unit', 'LOCATION_REFERENCE');
                        console.log('📍 [PICKUP SYNC] Valor inicial definido:', checkedRadio.value);
                    }
                }

                // Adicionar listeners para mudanças
                radioButtons.forEach(radio => {
                    radio.addEventListener('change', function() {
                        if (this.checked) {
                            if (this.id === `${questionId}_choose_location`) {
                                const listSelected = document.querySelector(`input[name="${questionId}_list_choice"]:checked`);
                                if (listSelected && listSelected.value) {
                                    hiddenField.value = listSelected.value;
                                    hiddenField.setAttribute('data-unit', 'LOCATION_REFERENCE');
                                    console.log('📍 [PICKUP SYNC] Valor atualizado (lista selecionada):', listSelected.value);
                                } else {
                                    hiddenField.value = 'CHOOSE_FROM_LIST';
                                    hiddenField.removeAttribute('data-unit');
                                    console.log('📍 [PICKUP SYNC] Aguardando escolha da lista');
                                }
                            } else {
                            hiddenField.value = this.value;
                                hiddenField.setAttribute('data-unit', 'LOCATION_REFERENCE');
                                console.log('📍 [PICKUP SYNC] Valor atualizado:', this.value);
                            }

                            // Remover classe de erro se existir
                            hiddenField.classList.remove('error');

                            // Trigger change event para validação
                            hiddenField.dispatchEvent(new Event('change', { bubbles: true }));

                                // Se for CONTACT_SUPPLIER_LATER, limpar qualquer freetext e desmarcar seleção da lista
                                if (this.value === 'CONTACT_SUPPLIER_LATER') {
                                    const baseId = hiddenField.id;
                                    const freetextInput = document.getElementById(`${baseId}_freetext`);
                                    if (freetextInput) freetextInput.value = '';
                                    const listRadios = document.querySelectorAll(`input[name="${baseId}_list_choice"]`);
                                    listRadios.forEach(r => { r.checked = false; });
                                }
                        }
                    });
                });
                
                console.log('✅ [PICKUP SYNC] Listeners configurados para', radioButtons.length, 'radio buttons');
            } else {
                console.warn('⚠️ [PICKUP SYNC] Falha na configuração:', {
                    hiddenFieldExists: !!hiddenField,
                    radioButtonsCount: radioButtons.length
                });
            }
        }, 300);
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
            return '';
        } else if (detail.reference === 'MEET_AT_DEPARTURE_POINT') {
            return '';
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
            // Não exibir mensagens genéricas; manter limpo
            return '';
        }

        return '';
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
        
        // CORREÇÃO CRÍTICA: Etapa 2 deve ter APENAS dados dos viajantes
        // Todas as booking questions (incluindo PICKUP_POINT) devem ir para a Etapa 3
        console.log('🔄 [REORGANIZAÇÃO] Etapa 2 agora contém APENAS dados dos viajantes');
        console.log('🔄 [REORGANIZAÇÃO] Todas as booking questions foram movidas para a Etapa 3');

        // Ocultar todas as seções de booking questions na Etapa 2
        const pickupPointSection = document.getElementById('pickup-point-section');
        const additionalInfoSection = document.getElementById('additional-booking-info-section');

        if (pickupPointSection) {
            pickupPointSection.style.display = 'none';
            console.log('🔄 [REORGANIZAÇÃO] Seção de PICKUP_POINT ocultada na Etapa 2');
        }

        if (additionalInfoSection) {
            additionalInfoSection.style.display = 'none';
            console.log('🔄 [REORGANIZAÇÃO] Seção de informações adicionais ocultada na Etapa 2');
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
                        // Usar número sequencial do viajante para travelerNum correto (1,2,3...)
                        const travelerHTML = this.renderTravelerBookingQuestions(globalTravelerNumber);
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
            
            // Detectar tipo de cartão
            const cardType = this.detectCardType(value);
            this.updateCardTypeIndicator(cardType);
            
            // Definir maxlength baseado no tipo de cartão
            const maxLengths = {
                visa: 19, // 16 dígitos + 3 espaços ou 13 dígitos + 2 espaços
                mastercard: 19, // 16 dígitos + 3 espaços
                amex: 17, // 15 dígitos + 2 espaços
                elo: 19, // 16 dígitos + 3 espaços
                hipercard: 23, // 19 dígitos + 4 espaços (máximo)
                mercadolivre: 19, // 16 dígitos + 3 espaços
                unknown: 23 // Máximo possível
            };
            
            cardInput.maxLength = maxLengths[cardType] || 23;
            
            // Formatação específica por tipo de cartão
            let formattedValue;
            if (cardType === 'amex') {
                // American Express: 4-6-5 format (15 dígitos)
                if (value.length <= 4) {
                    formattedValue = value;
                } else if (value.length <= 10) {
                    formattedValue = value.replace(/(\d{4})(\d{0,6})/, '$1 $2');
                } else {
                    formattedValue = value.replace(/(\d{4})(\d{6})(\d{0,5})/, '$1 $2 $3');
                }
            } else if (cardType === 'hipercard' && value.length > 16) {
                // Hipercard pode ter 19 dígitos: 4-4-4-4-3 format
                if (value.length <= 4) {
                    formattedValue = value;
                } else if (value.length <= 8) {
                    formattedValue = value.replace(/(\d{4})(\d{0,4})/, '$1 $2');
                } else if (value.length <= 12) {
                    formattedValue = value.replace(/(\d{4})(\d{4})(\d{0,4})/, '$1 $2 $3');
                } else if (value.length <= 16) {
                    formattedValue = value.replace(/(\d{4})(\d{4})(\d{4})(\d{0,4})/, '$1 $2 $3 $4');
                } else {
                    formattedValue = value.replace(/(\d{4})(\d{4})(\d{4})(\d{4})(\d{0,3})/, '$1 $2 $3 $4 $5');
                }
            } else {
                // Outros cartões: 4-4-4-4 format (16 dígitos)
                formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            }
            
            e.target.value = formattedValue;

            // Validação em tempo real mais inteligente - usar padrão etapa 2 (showFieldError/hideFieldError)
            
            // Definir comprimentos mínimos por tipo de cartão
            const minLengths = {
                visa: 13, // Visa pode ter 13 ou 16 dígitos
                mastercard: 16,
                amex: 15,
                elo: 16,
                hipercard: 13, // Hipercard pode ter 13, 16 ou 19 dígitos
                mercadolivre: 16,
                unknown: 13
            };
            
            const minLength = minLengths[cardType] || 13;
            
            if (value.length === 0) {
                // Campo vazio - remover classes e esconder erro
                cardInput.classList.remove('is-valid', 'is-invalid');
                this.hideFieldError(cardInput);
            } else if (value.length < minLength) {
                // Ainda digitando - mostrar apenas se tipo desconhecido
                cardInput.classList.remove('is-valid', 'is-invalid');
                if (cardType === 'unknown' && value.length >= 4) {
                    cardInput.classList.add('is-invalid');
                    this.showFieldError(cardInput, 'Tipo de cartão não reconhecido. Bandeiras aceitas: Visa, Mastercard, Amex, Elo, Hipercard, Mercado Livre');
                } else {
                    this.hideFieldError(cardInput);
                }
            } else {
                // Número completo - validação rigorosa
                const isValid = this.validateCreditCard(value);
                if (isValid) {
                    cardInput.classList.remove('is-invalid');
                    cardInput.classList.add('is-valid');
                    this.hideFieldError(cardInput);
                } else {
                    cardInput.classList.remove('is-valid');
                    cardInput.classList.add('is-invalid');
                    this.showFieldError(cardInput, 'Número do cartão inválido para a bandeira ' + cardType.charAt(0).toUpperCase() + cardType.slice(1));
                }
            }
        });

        // Validação mais robusta ao sair do campo (padrão etapa 2)
        cardInput.addEventListener('blur', (e) => {
            const value = e.target.value.replace(/\s/g, '');
            const cardType = this.detectCardType(value);
            
            // Definir comprimentos mínimos por tipo de cartão
            const minLengths = {
                visa: 13,
                mastercard: 16,
                amex: 15,
                elo: 16,
                hipercard: 13,
                mercadolivre: 16,
                unknown: 13
            };
            
            const minLength = minLengths[cardType] || 13;
            
            if (value.length > 0) {
                if (cardType === 'unknown') {
                    cardInput.classList.add('is-invalid');
                    this.showFieldError(cardInput, 'Tipo de cartão não reconhecido. Bandeiras aceitas: Visa, Mastercard, Amex, Elo, Hipercard, Mercado Livre');
                } else if (value.length < minLength) {
                    cardInput.classList.add('is-invalid');
                    this.showFieldError(cardInput, `Número do cartão muito curto para ${cardType.charAt(0).toUpperCase() + cardType.slice(1)} (mínimo ${minLength} dígitos)`);
                } else if (!this.validateCreditCard(value)) {
                    cardInput.classList.add('is-invalid');
                    this.showFieldError(cardInput, 'Número do cartão inválido para a bandeira ' + cardType.charAt(0).toUpperCase() + cardType.slice(1));
                } else {
                    // válido no blur
                    this.hideFieldError(cardInput);
                    cardInput.classList.add('is-valid');
                }
            } else {
                this.hideFieldError(cardInput);
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
     * Detectar tipo do cartão de crédito com padrões mais flexíveis
     */
    detectCardType(cardNumber) {
        // Remover espaços e caracteres não numéricos
        const cleanNumber = cardNumber.replace(/\D/g, '');
        
        // Padrões mais flexíveis para detecção durante a digitação
        const patterns = {
            visa: /^4/,
            mastercard: /^5[1-5]|^2[2-7]/,
            amex: /^3[47]/,
            elo: /^(636368|438935|504175|451416|636297|5067|4576|4011)/,
            hipercard: /^(606282|3841)/,
            mercadolivre: /^(603493|627780|637095|637568|637599|637609|637612)/
        };

        // Para validação final, usar padrões completos com quantidade correta de dígitos
        const fullPatterns = {
            visa: /^4[0-9]{12}(?:[0-9]{3})?$/, // 13 ou 16 dígitos
            mastercard: /^5[1-5][0-9]{14}$|^2[2-7][0-9]{14}$/, // 16 dígitos
            amex: /^3[47][0-9]{13}$/, // 15 dígitos
            elo: /^((636368|438935|504175|451416|636297)[0-9]{10})|((5067|4576|4011)[0-9]{12})$/, // 16 dígitos
            hipercard: /^(606282[0-9]{10}([0-9]{3})?|3841[0-9]{15})$/, // 13, 16 ou 19 dígitos
            mercadolivre: /^(603493|627780|637095|637568|637599|637609|637612)[0-9]{10}$/ // 16 dígitos
        };

        // Se o número está completo, usar validação rigorosa
        if (cleanNumber.length >= 13) {
            for (const [type, pattern] of Object.entries(fullPatterns)) {
                if (pattern.test(cleanNumber)) {
                    return type;
                }
            }
        } else {
            // Durante a digitação, usar padrões flexíveis
            for (const [type, pattern] of Object.entries(patterns)) {
                if (pattern.test(cleanNumber)) {
                    return type;
                }
            }
        }

        return 'unknown';
    }

    /**
     * Obter ícone do tipo de cartão
     */
    getCardTypeIcon(cardType) {
        const icons = {
            visa: '💳', // Ou usar ícones SVG específicos
            mastercard: '💳',
            amex: '💳',
            elo: '💳',
            hipercard: '💳',
            mercadolivre: '💳',
            unknown: ''
        };
        
        return icons[cardType] || '';
    }

    /**
     * Atualizar indicador visual do tipo de cartão
     */
    updateCardTypeIndicator(cardType) {
        const indicator = document.getElementById('card-type-indicator');
        if (!indicator) return;

        const cardNames = {
            visa: 'Visa',
            mastercard: 'Mastercard',
            amex: 'American Express',
            discover: 'Discover',
            diners: 'Diners Club',
            jcb: 'JCB',
            elo: 'Elo',
            hipercard: 'Hipercard'
        };

        if (cardType && cardType !== 'unknown') {
            indicator.textContent = this.getCardTypeIcon(cardType);
            indicator.title = cardNames[cardType] || cardType;
            indicator.style.display = 'block';
            indicator.style.color = '#28a745';
        } else {
            indicator.style.display = 'none';
        }
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
                
                // Limitar o comprimento baseado no tipo de cartão
                const cardNumber = document.getElementById('card-number')?.value.replace(/\s/g, '') || '';
                const cardType = this.detectCardType(cardNumber);
                const maxLength = cardType === 'amex' ? 4 : 3;
                
                e.target.value = value.substring(0, maxLength);
                
                // Atualizar placeholder baseado no tipo de cartão
                if (cardType === 'amex') {
                    e.target.placeholder = '1234';
                    e.target.maxLength = 4;
                } else {
                    e.target.placeholder = '123';
                    e.target.maxLength = 3;
                }
                
                // Validação em tempo real
                if (value.length > 0) {
                    const isValid = this.validateCVV(value, cardType);
                    if (isValid) {
                        cvvInput.classList.remove('is-invalid');
                        cvvInput.classList.add('is-valid');
                        this.hideFieldError(cvvInput);
                    } else {
                        cvvInput.classList.remove('is-valid');
                        if (value.length >= maxLength) {
                            cvvInput.classList.add('is-invalid');
                            this.showFieldError(cvvInput, this.getCVVErrorMessage(cardType));
                        }
                    }
                } else {
                    cvvInput.classList.remove('is-valid', 'is-invalid');
                    this.hideFieldError(cvvInput);
                }
            });

            cvvInput.addEventListener('blur', (e) => {
                const value = e.target.value.trim();
                const cardNumber = document.getElementById('card-number')?.value.replace(/\s/g, '') || '';
                const cardType = this.detectCardType(cardNumber);
                
                if (!value) {
                    this.showFieldError(cvvInput, 'O CVV é obrigatório.');
                    cvvInput.classList.add('is-invalid');
                } else if (!this.validateCVV(value, cardType)) {
                    this.showFieldError(cvvInput, this.getCVVErrorMessage(cardType));
                    cvvInput.classList.add('is-invalid');
                } else {
                    this.hideFieldError(cvvInput);
                    cvvInput.classList.remove('is-invalid');
                    cvvInput.classList.add('is-valid');
                }
            });
        }

        // Validação da data de expiração
        const expMonthInput = document.getElementById('expiry-month');
        const expYearInput = document.getElementById('expiry-year');

        if (expMonthInput && expYearInput) {
            const validateExpiry = (showErrors = true) => {
                const month = expMonthInput.value;
                const year = expYearInput.value;
                
                // Limpar classes de validação anteriores
                expMonthInput.classList.remove('is-valid', 'is-invalid');
                expYearInput.classList.remove('is-valid', 'is-invalid');

                if (!month && showErrors) {
                    this.showFieldError(expMonthInput, 'Selecione o mês de vencimento.');
                    expMonthInput.classList.add('is-invalid');
                    return false;
                }

                if (!year && showErrors) {
                    this.showFieldError(expYearInput, 'Selecione o ano de vencimento.');
                    expYearInput.classList.add('is-invalid');
                    return false;
                }
                
                // Validação individual dos campos
                if (month && !this.validateExpiryMonth(month)) {
                    if (showErrors) {
                        this.showFieldError(expMonthInput, 'Mês inválido');
                        expMonthInput.classList.add('is-invalid');
                    }
                    return false;
                }
                
                if (year && !this.validateExpiryYear(year)) {
                    if (showErrors) {
                        this.showFieldError(expYearInput, 'Ano inválido');
                        expYearInput.classList.add('is-invalid');
                    }
                    return false;
                }
                
                // Validação combinada se ambos estão preenchidos
                if (month && year) {
                    const expiryValidation = this.validateExpiryDate(month, year);
                    if (!expiryValidation.valid) {
                        if (showErrors) {
                            this.showFieldError(expMonthInput, expiryValidation.message);
                            this.showFieldError(expYearInput, expiryValidation.message);
                            expMonthInput.classList.add('is-invalid');
                            expYearInput.classList.add('is-invalid');
                        }
                        return false;
                    } else {
                        this.hideFieldError(expMonthInput);
                        this.hideFieldError(expYearInput);
                        expMonthInput.classList.add('is-valid');
                        expYearInput.classList.add('is-valid');
                        return true;
                    }
                }
                
                // Se apenas um campo está preenchido, marcar como válido individualmente
                if (month && this.validateExpiryMonth(month)) {
                    this.hideFieldError(expMonthInput);
                    expMonthInput.classList.add('is-valid');
                }
                
                if (year && this.validateExpiryYear(year)) {
                    this.hideFieldError(expYearInput);
                    expYearInput.classList.add('is-valid');
                }
                
                return true;
            };
            
            // Validação em tempo real (sem mostrar erros)
            expMonthInput.addEventListener('change', () => validateExpiry(false));
            expYearInput.addEventListener('change', () => validateExpiry(false));
            
            // Validação completa ao sair do campo
            expMonthInput.addEventListener('blur', () => validateExpiry(true));
            expYearInput.addEventListener('blur', () => validateExpiry(true));
        }

        // Validação do nome do portador
        const nameInput = document.getElementById('cardholder-name');
        if (nameInput) {
            nameInput.addEventListener('input', (e) => {
                // Permitir apenas letras, espaços e acentos
                let value = e.target.value;
                value = value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
                
                // Limitar múltiplos espaços consecutivos
                value = value.replace(/\s{2,}/g, ' ');
                
                // Capitalizar primeira letra de cada palavra
                value = value.replace(/\b\w/g, l => l.toUpperCase());
                
                e.target.value = value;
                
                // Validação em tempo real
                if (value.length > 0) {
                    if (value.length >= 2 && /^[a-zA-ZÀ-ÿ\s]+$/.test(value.trim())) {
                        nameInput.classList.remove('is-invalid');
                        nameInput.classList.add('is-valid');
                        this.hideFieldError(nameInput);
                    } else {
                        nameInput.classList.remove('is-valid');
                        if (value.length >= 10) { // Só mostrar erro após digitar bastante
                            nameInput.classList.add('is-invalid');
                        }
                    }
                } else {
                    nameInput.classList.remove('is-valid', 'is-invalid');
                    this.hideFieldError(nameInput);
                }
            });
            
            nameInput.addEventListener('blur', (e) => {
                const value = e.target.value.trim();
                nameInput.classList.remove('is-valid', 'is-invalid');
                
                if (!value) {
                    this.showFieldError(nameInput, 'O nome no cartão é obrigatório.');
                    nameInput.classList.add('is-invalid');
                } else if (value.length < 2) {
                    this.showFieldError(nameInput, 'Nome deve ter pelo menos 2 caracteres.');
                    nameInput.classList.add('is-invalid');
                } else if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(value)) {
                    this.showFieldError(nameInput, 'Nome deve conter apenas letras.');
                    nameInput.classList.add('is-invalid');
                } else if (value.split(' ').length < 2) {
                    this.showFieldError(nameInput, 'Digite o nome completo (nome e sobrenome).');
                    nameInput.classList.add('is-invalid');
                } else {
                    this.hideFieldError(nameInput);
                    nameInput.classList.add('is-valid');
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
        const countrySelect = document.getElementById('billing-country');
        
        if (zipInput) {
            zipInput.addEventListener('input', (e) => {
                const country = countrySelect?.value || 'BR';
                let value = e.target.value.replace(/\D/g, ''); // Apenas números
                
                // Formatação específica por país
                if (country === 'BR') {
                    // Brasil: 12345-678
                    if (value.length > 5) {
                        value = value.substring(0, 5) + '-' + value.substring(5, 8);
                    }
                    e.target.maxLength = 9;
                    e.target.placeholder = '12345-678';
                } else if (country === 'US') {
                    // EUA: 12345 ou 12345-6789
                    if (value.length > 5) {
                        value = value.substring(0, 5) + '-' + value.substring(5, 9);
                    }
                    e.target.maxLength = 10;
                    e.target.placeholder = '12345-6789';
                } else {
                    // Outros países: formato genérico
                    e.target.maxLength = 10;
                    e.target.placeholder = 'Código postal';
                }
                
                e.target.value = value;
                
                // Validação em tempo real
                if (value.length > 0) {
                    const isValid = this.validateZipCode(value, country);
                    if (isValid) {
                        zipInput.classList.remove('is-invalid');
                        zipInput.classList.add('is-valid');
                        this.hideFieldError(zipInput);
                    } else {
                        zipInput.classList.remove('is-valid');
                        // Só mostrar erro se o campo parece completo
                        if ((country === 'BR' && value.length >= 8) || 
                            (country === 'US' && value.length >= 5) || 
                            (country !== 'BR' && country !== 'US' && value.length >= 5)) {
                            zipInput.classList.add('is-invalid');
                        }
                    }
                } else {
                    zipInput.classList.remove('is-valid', 'is-invalid');
                    this.hideFieldError(zipInput);
                }
            });
            
            zipInput.addEventListener('blur', (e) => {
                const value = e.target.value.trim();
                const country = countrySelect?.value || 'BR';
                
                zipInput.classList.remove('is-valid', 'is-invalid');
                
                if (!value) {
                    this.showFieldError(zipInput, 'O CEP/Código Postal é obrigatório.');
                    zipInput.classList.add('is-invalid');
                } else if (!this.validateZipCode(value, country)) {
                    this.showFieldError(zipInput, this.getZipCodeErrorMessage(country));
                    zipInput.classList.add('is-invalid');
                } else {
                    this.hideFieldError(zipInput);
                    zipInput.classList.add('is-valid');
                }
            });
            
            // Atualizar formatação quando o país mudar
            if (countrySelect) {
                countrySelect.addEventListener('change', () => {
                    if (zipInput.value) {
                        // Trigger input event para reformatar
                        zipInput.dispatchEvent(new Event('input'));
                    }
                });
            }
        }
    }

    /**
     * Validar CVV com base no tipo de cartão
     */
    validateCVV(cvv, cardType = null) {
        if (!cvv || !/^\d+$/.test(cvv)) {
            return false;
        }
        
        // Se não temos o tipo do cartão, detectar pelo número
        if (!cardType) {
            const cardNumber = document.getElementById('card-number')?.value.replace(/\s/g, '') || '';
            cardType = this.detectCardType(cardNumber);
        }
        
        // American Express usa CVV de 4 dígitos
        if (cardType === 'amex') {
            return cvv.length === 4;
        }
        
        // Outros cartões usam CVV de 3 dígitos
        return cvv.length === 3;
    }
    
    /**
     * Obter mensagem de erro específica para CVV
     */
    getCVVErrorMessage(cardType = null) {
        if (cardType === 'amex') {
            return 'CVV deve ter 4 dígitos para American Express';
        }
        return 'CVV deve ter 3 dígitos';
    }

    /**
     * Validar data de expiração
     */
    validateExpiryDate(month, year) {
        if (!month || !year) {
            return { valid: false, message: 'Mês e ano são obrigatórios' };
        }

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        const expMonth = parseInt(month, 10);
        const expYear = parseInt(year, 10);

        if (isNaN(expMonth) || isNaN(expYear)) {
            return { valid: false, message: 'Mês e ano devem ser números válidos' };
        }

        // Verificar se o mês é válido
        if (expMonth < 1 || expMonth > 12) {
            return { valid: false, message: 'Mês deve estar entre 01 e 12' };
        }

        // Verificar se a data não está no passado
        if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
            return { valid: false, message: 'Cartão expirado' };
        }

        // Verificar se não está muito no futuro (mais de 20 anos)
        if (expYear > currentYear + 20) {
            return { valid: false, message: 'Data de expiração muito distante' };
        }

        return { valid: true, message: '' };
    }
    
    /**
     * Validar apenas o mês
     */
    validateExpiryMonth(month) {
        const expMonth = parseInt(month, 10);
        return !isNaN(expMonth) && expMonth >= 1 && expMonth <= 12;
    }
    
    /**
     * Validar apenas o ano
     */
    validateExpiryYear(year) {
        const currentYear = new Date().getFullYear();
        const expYear = parseInt(year, 10);
        return !isNaN(expYear) && expYear >= currentYear && expYear <= currentYear + 20;
    }
    
    /**
     * Validar CEP/Código Postal por país
     */
    validateZipCode(zipCode, country = 'BR') {
        if (!zipCode) return false;
        
        const cleanZip = zipCode.replace(/\D/g, '');
        
        switch (country) {
            case 'BR':
                // Brasil: 8 dígitos (12345678 ou 12345-678)
                return cleanZip.length === 8;
            case 'US':
                // EUA: 5 ou 9 dígitos (12345 ou 123456789)
                return cleanZip.length === 5 || cleanZip.length === 9;
            case 'CA':
                // Canadá: formato A1A1A1
                return /^[A-Za-z]\d[A-Za-z]\d[A-Za-z]\d$/.test(zipCode.replace(/\s/g, ''));
            case 'GB':
                // Reino Unido: vários formatos
                return /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/.test(zipCode);
            case 'DE':
                // Alemanha: 5 dígitos
                return cleanZip.length === 5;
            case 'FR':
                // França: 5 dígitos
                return cleanZip.length === 5;
            case 'IT':
                // Itália: 5 dígitos
                return cleanZip.length === 5;
            case 'ES':
                // Espanha: 5 dígitos
                return cleanZip.length === 5;
            case 'AU':
                // Austrália: 4 dígitos
                return cleanZip.length === 4;
            default:
                // Formato genérico: pelo menos 3 caracteres
                return zipCode.trim().length >= 3;
        }
    }
    
    /**
     * Obter mensagem de erro específica para CEP por país
     */
    getZipCodeErrorMessage(country = 'BR') {
        switch (country) {
            case 'BR':
                return 'CEP deve ter 8 dígitos (ex: 12345-678)';
            case 'US':
                return 'ZIP Code deve ter 5 ou 9 dígitos (ex: 12345-6789)';
            case 'CA':
                return 'Código postal deve seguir o formato A1A 1A1';
            case 'GB':
                return 'Código postal deve seguir o formato britânico';
            case 'DE':
            case 'FR':
            case 'IT':
            case 'ES':
                return 'Código postal deve ter 5 dígitos';
            case 'AU':
                return 'Código postal deve ter 4 dígitos';
            default:
                return 'Código postal inválido';
        }
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
                const label = field.closest('.form-group, .booking-question-group')?.querySelector('label')?.textContent || field.id;
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

        const requiredFields = ['firstName', 'lastName', 'email'];
        const missingFields = [];

        requiredFields.forEach(field => {
            if (!bookerInfo[field] || bookerInfo[field].trim() === '') {
                const fieldNames = {
                    firstName: 'Nome',
                    lastName: 'Sobrenome',
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
                        if (month && year) {
                            const expiryValidation = this.validateExpiryDate(month, year);
                            if (!expiryValidation.valid) {
                                invalidFields.push(`• Data de expiração (${expiryValidation.message.toLowerCase()})`);
                            }
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
                // Persistir respostas PER_TRAVELER coletadas na Etapa 2 antes de validar
                this.ensurePerTravelerAnswersPersisted();
                return await this.validateBookingQuestions();
            case 4:
                // Ao iniciar a validação do pagamento, indicar processamento e limpar erros antigos
                this.setProcessingButtonState(true);
                this.hideDateError();
                // Validar conectividade antes do pagamento
                const isConnected = await this.validateApiConnectivity();
                if (!isConnected) {
                    this.showErrorWithRetry(
                        'Problema de conectividade detectado. Verifique sua conexão com a internet.',
                        () => this.processPayment()
                    );
                    this.setProcessingButtonState(false);
                    return false;
                }
                return await this.processPayment();
            default:
                return true;
        }
    }
    
    async checkAvailability() {
        // Estratégia robusta de detecção de data de viagem
        let travelDate = null;

        // 1. Tentar múltiplas fontes de data
        travelDate = this.getTravelDateFromMultipleSources();

        // 2. Se não encontrou, tentar dados já armazenados
        if (!travelDate && this.bookingData.travelDate) {
            travelDate = this.bookingData.travelDate;
            console.log('✅ Usando data de viagem já armazenada:', travelDate);
        }

        // 3. Se não encontrou, tentar dados de disponibilidade
        if (!travelDate && this.bookingData.availabilityData?.travelDate) {
            travelDate = this.bookingData.availabilityData.travelDate;
            console.log('✅ Usando data de viagem dos dados de disponibilidade:', travelDate);
        }

        // 4. Se não encontrou, tentar input do DOM
        if (!travelDate) {
            const dateInput = document.getElementById('travel-date-value');
            if (dateInput && dateInput.value) {
                travelDate = dateInput.value;
                console.log('✅ Usando data de viagem do input DOM:', travelDate);
            }
        }

        // 5. Se ainda não encontrou, verificar se é uma validação durante o pagamento
        if (!travelDate) {
            // Durante o pagamento, se já temos dados de hold válidos, não bloquear
            if (this.bookingData.holdData && this.bookingData.selectedOption) {
                console.warn('⚠️ Data não encontrada, mas usando dados de hold existentes');
                return true; // Permitir continuar com dados de hold
            }

            // Se não há dados de hold, realmente precisamos da data
            this.showDateError('Por favor, selecione uma data de viagem antes de continuar.');
            return false;
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
            // CORREÇÃO: Verificar se temos dados de hold válidos antes de bloquear
            if (this.bookingData.holdData && this.bookingData.selectedOption) {
                console.log('✅ [VALIDATION] Opções não exibidas, mas temos dados de hold válidos - permitindo continuar');
                return true;
            }

            // Verificar se temos dados de disponibilidade em cache
            if (this.bookingData.availabilityData && this.bookingData.selectedOption) {
                console.log('✅ [VALIDATION] Opções não exibidas, mas temos dados de disponibilidade válidos - permitindo continuar');
                return true;
            }

            // Verificar se o botão ainda está no estado "Buscar Preços"
            const updateBtn = document.getElementById('update-price-btn');
            const buttonText = updateBtn ? updateBtn.textContent.trim() : '';

            if (buttonText.includes('Buscar')) {
                this.showDateError('Por favor, clique em "Buscar Preços" para verificar a disponibilidade e opções de passeio.');
            } else {
                this.showDateError('Por favor, atualize os preços para continuar com a reserva.');
            }
            return false;
        }
        
        // Verificar se uma opção foi selecionada
        if (!this.bookingData.selectedOption || !this.bookingData.selectedOption.fullOption) {
            // CORREÇÃO: Verificar se temos dados de hold que indicam opção válida
            if (this.bookingData.holdData && this.bookingData.holdData.items && this.bookingData.holdData.items.length > 0) {
                console.log('✅ [VALIDATION] Opção não selecionada visualmente, mas temos dados de hold válidos - permitindo continuar');
                return true;
            }

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
                // Garantir que a mensagem seja sempre uma string válida
                let errorMessage = 'Erro na busca de disponibilidade';
                if (data.data && data.data.message) {
                    if (typeof data.data.message === 'string') {
                        errorMessage = 'Erro: ' + data.data.message;
                    } else if (typeof data.data.message === 'object') {
                        errorMessage = 'Erro: ' + (data.data.message.message || data.data.message.error || JSON.stringify(data.data.message));
                    } else {
                        errorMessage = 'Erro: ' + String(data.data.message);
                    }
                }
                this.showDateError(errorMessage);
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

        console.log('🔍 [VALIDATE] Elementos encontrados:', {
            firstname: !!bookerFirstname,
            lastname: !!bookerLastname,
            email: !!bookerEmail,
            phone: !!bookerPhone,
            values: {
                firstname: bookerFirstname?.value || 'VAZIO',
                lastname: bookerLastname?.value || 'VAZIO',
                email: bookerEmail?.value || 'VAZIO',
                phone: bookerPhone?.value || 'VAZIO'
            }
        });

        if (!bookerFirstname?.value.trim()) {
            this.showDateError('Por favor, informe o nome do responsável pela reserva.');
            bookerFirstname?.classList.add('is-invalid');
            const e = document.getElementById('error_booker-firstname');
            if (e) { e.textContent = 'Obrigatório.'; e.style.display = 'block'; e.classList.add('show'); }
            bookerFirstname?.focus();
            return false;
        }

        if (!bookerLastname?.value.trim()) {
            this.showDateError('Por favor, informe o sobrenome do responsável pela reserva.');
            bookerLastname?.classList.add('is-invalid');
            const e = document.getElementById('error_booker-lastname');
            if (e) { e.textContent = 'Obrigatório.'; e.style.display = 'block'; e.classList.add('show'); }
            bookerLastname?.focus();
            return false;
        }

        if (!bookerEmail?.value.trim()) {
            this.showDateError('Por favor, informe o email do responsável pela reserva.');
            bookerEmail?.classList.add('is-invalid');
            const e = document.getElementById('error_booker-email');
            if (e) { e.textContent = 'Obrigatório.'; e.style.display = 'block'; e.classList.add('show'); }
            bookerEmail?.focus();
            return false;
        }

        // Validação básica de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(bookerEmail.value.trim())) {
            this.showDateError('Por favor, informe um email válido.');
            bookerEmail?.classList.add('is-invalid');
            const e = document.getElementById('error_booker-email');
            if (e) { e.textContent = 'Email inválido.'; e.style.display = 'block'; e.classList.add('show'); }
            bookerEmail?.focus();
            return false;
        }

        if (!bookerPhone?.value.trim()) {
            this.showDateError('Por favor, informe o telefone do responsável pela reserva.');
            bookerPhone?.classList.add('is-invalid');
            const e = document.getElementById('error_booker-phone');
            if (e) { e.textContent = 'Obrigatório.'; e.style.display = 'block'; e.classList.add('show'); }
            bookerPhone?.focus();
            return false;
        }

        // CORREÇÃO CRÍTICA: Armazenar dados do booker ANTES de coletar dados detalhados
        this.bookingData.bookerInfo = {
            firstName: bookerFirstname.value.trim(),
            lastName: bookerLastname.value.trim(),
            email: bookerEmail.value.trim(),
            phone: bookerPhone.value.trim(),
            countryCode: bookerCountryCode?.value || 'BR'
        };

        console.log('✅ [VALIDATE] Dados do responsável armazenados:', this.bookingData.bookerInfo);

        // Coletar dados detalhados dos viajantes
        this.collectDetailedTravelersData();

        // Validação inteligente: cada viajante deve ter uma Faixa Etária compatível e dados do responsável preenchidos
        try {
            // Checar dados do responsável obrigatórios antes de prosseguir
            const requiredBookerFields = [
                document.getElementById('booker-firstname'),
                document.getElementById('booker-lastname'),
                document.getElementById('booker-email'),
                document.getElementById('booker-phone')
            ];
            const missing = requiredBookerFields.filter(el => !el || !el.value || !el.value.trim());
            if (missing.length > 0) {
                // Marcar campos com erro visual
                missing.forEach((el) => {
                    if (!el) return;
                    el.classList.add('is-invalid');
                    const err = document.getElementById(`error_${el.id}`);
                    if (err) { err.textContent = 'Obrigatório.'; err.style.display = 'block'; err.classList.add('show'); }
                });
                this.showDateError('Por favor, preencha os dados obrigatórios do responsável pela reserva antes de continuar.');
                (missing[0] && missing[0].focus && missing[0].focus());
                return false;
            }

            const totalTravelers = this.getTotalTravelersCount();
            const ageSelectors = document.querySelectorAll('#traveler-booking-questions-inner select[data-question-id="AGEBAND"]');
            if (ageSelectors.length > 0 && ageSelectors.length !== totalTravelers) {
                this.showDateError('Atenção: todos os viajantes precisam ter uma faixa etária definida.');
                return false;
            }
            // Validar se os valores escolhidos pertencem às faixas permitidas (Etapa 1)
            const allowed = new Set((this.bookingData.selectedTravelers || []).map(t => t.ageBand));
            for (const sel of ageSelectors) {
                const val = (sel.value || '').trim();
                if (!val || !allowed.has(val)) {
                    this.showDateError('Selecione faixas etárias apenas entre as disponíveis escolhidas na Etapa 1.');
                    sel.focus();
                    return false;
                }
            }

            // Validar todos os campos obrigatórios por viajante (nome, sobrenome, altura, etc.)
            const travelerContainer = document.getElementById('traveler-booking-questions-inner');
            if (travelerContainer) {
                const requiredFields = travelerContainer.querySelectorAll('[required]');
                const missingTravelerFields = [];
                requiredFields.forEach((field) => {
                    const value = (field.value || '').trim();
                    if (!value) {
                        missingTravelerFields.push(field);
                        field.classList.add('is-invalid');
                        const err = document.getElementById(`error_${field.id}`);
                        if (err) { err.textContent = 'Obrigatório.'; err.style.display = 'block'; err.classList.add('show'); }
                    } else {
                        field.classList.remove('is-invalid');
                        const err = document.getElementById(`error_${field.id}`);
                        if (err) { err.style.display = 'none'; err.classList.remove('show'); }
                    }
                });
                if (missingTravelerFields.length > 0) {
                    const firstMissing = missingTravelerFields[0];
                    const firstLabel = firstMissing.closest('.form-group, .booking-question-group')?.querySelector('label')?.textContent || firstMissing.id;
                    this.showDateError(`Por favor, preencha os campos obrigatórios dos viajantes. Ex.: ${firstLabel.replace('*','').trim()}`);
                    firstMissing.focus();
                    firstMissing.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return false;
                }
            }
        } catch (e) {
            console.warn('⚠️ [VALIDATE] Falha na validação inteligente de age bands:', e);
        }

        console.log('✅ [VALIDATE] Dados detalhados dos viajantes coletados:', this.bookingData.travelersDetails);

        // NOVO: Persistir respostas PER_TRAVELER antes de avançar para a próxima etapa
        try {
            this.ensurePerTravelerAnswersPersisted();
            const count = Array.isArray(this.bookingData.bookingQuestionAnswers) ? this.bookingData.bookingQuestionAnswers.length : 0;
            console.log(`✅ [VALIDATE] PER_TRAVELER persistidos em bookingData (total=${count})`);
        } catch (e) {
            console.warn('⚠️ [VALIDATE] Falha ao persistir PER_TRAVELER antes de avançar', e);
        }

        return true;
    }

    /**
     * Coletar dados detalhados dos viajantes para uso nas booking questions
     */
    collectDetailedTravelersData() {
        // Usar dados dos viajantes já armazenados (paxMix)
        const paxMix = this.bookingData.selectedTravelers || this.collectTravelersData();

        // CORREÇÃO CRÍTICA: Usar dados do booker já validados e armazenados
        let bookerInfo = this.bookingData.bookerInfo;

        // Validação adicional para garantir que os dados estão completos
        if (!bookerInfo || !bookerInfo.firstName || !bookerInfo.lastName || !bookerInfo.email) {
            console.warn('⚠️ [COLLECT] bookerInfo incompleto, tentando coletar do DOM como fallback');
            
            // Fallback: tentar coletar do DOM se ainda não foram armazenados
            const bookerFirstname = document.getElementById('booker-firstname');
            const bookerLastname = document.getElementById('booker-lastname');
            const bookerEmail = document.getElementById('booker-email');
            const bookerPhone = document.getElementById('booker-phone');
            const bookerCountryCode = document.getElementById('booker-country-code');

            bookerInfo = {
                firstName: bookerFirstname?.value?.trim() || '',
                lastName: bookerLastname?.value?.trim() || '',
                email: bookerEmail?.value?.trim() || '',
                phone: bookerPhone?.value?.trim() || '',
                countryCode: bookerCountryCode?.value || 'BR'
            };
            
            // Atualizar o bookingData com os dados coletados
            this.bookingData.bookerInfo = bookerInfo;
        }

        // Usar respostas das perguntas de reserva já coletadas (não recoletar)
        const bookingQuestionAnswers = this.bookingData.bookingQuestionAnswers || [];

        console.log('📋 [COLLECT] Dados coletados do responsável:', bookerInfo);
        console.log('📝 [COLLECT] Respostas das perguntas de reserva:', bookingQuestionAnswers);
        
        // Validação final antes de retornar
        if (!bookerInfo.firstName || !bookerInfo.lastName || !bookerInfo.email) {
            console.error('❌ [COLLECT] Dados do bookerInfo ainda incompletos após fallback:', bookerInfo);
        }

        return {
            // Informações dos viajantes (apenas quantidades por faixa etária)
            paxMix: paxMix,

            // Informações do responsável principal pela reserva
            bookerInfo: bookerInfo,

            // Respostas das perguntas de reserva
            bookingQuestionAnswers: bookingQuestionAnswers
        };
    }

    /**
     * Detectar e selecionar language guide automaticamente
     */
    detectAndSelectLanguageGuide() {
        try {
            console.log('🌐 [LANGUAGE GUIDE] Iniciando detecção...');

            const languageGuides = window.productData?.languageGuides || [];
            console.log('🌐 [LANGUAGE GUIDE] Language guides disponíveis:', languageGuides);

            if (!languageGuides || languageGuides.length === 0) {
                console.log('🌐 [LANGUAGE GUIDE] Nenhum language guide disponível no produto');
                return null;
            }

            const normalize = (candidate) => {
                if (!candidate) return '';
                if (typeof candidate === 'string') return candidate.trim();
                if (typeof candidate === 'object') {
                    // Tentar propriedades comuns
                    const propsInOrder = ['code','languageCode','isoCode','iso','id','value','lang','language','locale'];
                    for (const key of propsInOrder) {
                        if (candidate[key]) {
                            let v = String(candidate[key]).trim();
                            if (key === 'locale' && v.includes('-')) {
                                // pt-BR -> pt
                                v = v.split('-')[0];
                            }
                            return v;
                        }
                    }
                    // Tentar mapear por nome textual
                    const name = String(candidate.name || candidate.title || candidate.label || '').toLowerCase();
                    const nameMap = {
                        'portugu': 'pt',
                        'english': 'en',
                        'inglês': 'en',
                        'espan': 'es',
                        'spanish': 'es',
                        'franc': 'fr',
                        'french': 'fr',
                        'alem': 'de',
                        'german': 'de',
                        'ital': 'it',
                    };
                    for (const k in nameMap) {
                        if (name.includes(k)) return nameMap[k];
                    }
                }
                return '';
            };

            // Preferir escolha do usuário, se existir
            const userSelected = this.bookingData?.selectedLanguageGuideCode;
            let code = (userSelected && String(userSelected).trim()) || normalize(languageGuides[0]);
            
            // CORREÇÃO CRÍTICA: Garantir que sempre temos um código válido se há language guides
            if (!code && languageGuides.length > 0) {
                // Fallback mais agressivo - pegar o primeiro language disponível
                const firstGuide = languageGuides[0];
                code = firstGuide?.language || firstGuide?.code || 'en';
                console.warn('⚠️ [LANGUAGE GUIDE] Fallback aplicado para primeiro guide disponível:', code);
            }
            
            // Se ainda não tem código mas há guides, forçar 'en'
            if (!code && languageGuides.length > 0) {
                code = 'en';
                console.warn('⚠️ [LANGUAGE GUIDE] Fallback final aplicado: "en"');
            }
            
            console.log('🌐 [LANGUAGE GUIDE] Selecionado (normalizado):', code);
            return code || null;

        } catch (error) {
            console.error('❌ [LANGUAGE GUIDE] Erro na detecção:', error);
            return null;
        }
    }

    /**
     * Extrair status de confirmação com múltiplas estratégias
     */
    extractConfirmationStatus(data, firstItem) {
        // CORREÇÃO CRÍTICA: Verificar primeiro se é erro explícito
        if (data?.error === true || data?.success === false) {
            console.log('❌ Erro explícito detectado (error=true ou success=false)');
            return 'FAILED';
        }

        // CORREÇÃO CRÍTICA: Expandir fontes de status para incluir mais possibilidades
        const possibleStatuses = [
            firstItem?.status,
            data?.status,
            data?.data?.status,
            data?.custom_data?.confirmationStatus,
            data?.bookingStatus,
            firstItem?.bookingStatus,
            // NOVO: Se temos success=true, considerar como CONFIRMED
            (data?.success === true || data?.data?.success === true) ? 'CONFIRMED' : null,
            // NOVO: Se não há erro e temos dados, considerar como CONFIRMED
            (!data?.error && !data?.data?.error && (firstItem || data?.data)) ? 'CONFIRMED' : null
        ];

        for (const status of possibleStatuses) {
            if (status && status !== 'UNKNOWN' && status !== null) {
                console.log('✅ Status encontrado:', status);
                return status;
            }
        }

        // CORREÇÃO: Se chegou até aqui mas temos dados válidos, assumir CONFIRMED
        if (data?.success === true || data?.data?.success === true) {
            console.log('✅ Success=true detectado, assumindo CONFIRMED');
            return 'CONFIRMED';
        }

        console.log('⚠️ Nenhum status válido encontrado, usando UNKNOWN');
        return 'UNKNOWN';
    }

    /**
     * Extrair bookingRef com múltiplas estratégias
     */
    extractBookingRef(data, firstItem) {
        // CORREÇÃO CRÍTICA: Expandir fontes de bookingRef
        const possibleRefs = [
            firstItem?.bookingRef,
            data?.bookingRef,
            data?.data?.bookingRef,
            firstItem?.partnerBookingRef,
            data?.partnerBookingRef,
            data?.data?.partnerBookingRef,
            data?.custom_data?.bookingRef,
            // NOVO: Tentar extrair de items array
            data?.data?.items?.[0]?.bookingRef,
            data?.items?.[0]?.bookingRef,
            // NOVO: Tentar extrair de bookingData salvo
            this.bookingData?.bookingRef,
            this.bookingData?.holdData?.bookingRef
        ];

        for (const ref of possibleRefs) {
            if (ref && ref !== 'N/A' && typeof ref === 'string' && ref.trim() !== '') {
                console.log('✅ BookingRef encontrado:', ref);
                return ref;
            }
        }

        console.log('⚠️ Nenhum bookingRef válido encontrado');
        return 'N/A';
    }

    /**
     * Extrair voucherInfo com múltiplas estratégias
     */
    extractVoucherInfo(data, firstItem) {
        // Tentar múltiplas fontes para voucherInfo
        const voucherSources = [
            firstItem.voucherInfo,
            data.voucherInfo,
            firstItem.voucher,
            data.voucher,
            data.custom_data?.voucherInfo
        ];

        for (const voucher of voucherSources) {
            if (voucher && typeof voucher === 'object') {
                console.log('✅ VoucherInfo encontrado:', voucher);
                return voucher;
            }
        }

        console.log('⚠️ Nenhum voucherInfo encontrado');
        return {};
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
                    // Mostrar erros com o padrão visual unificado (Etapa 2)
                    this.showDateError(validationResult.errorMessage);
                    // Ao mostrar erros e bloquear o fluxo, voltar o botão ao estado normal
                    this.setProcessingButtonState(false);
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
            this.setProcessingButtonState(false);
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
            this.showFieldError(cardNumber, 'Por favor, informe o número do cartão.');
            this.showDateError('Problemas encontrados:\n\n• Número do cartão');
            this.setProcessingButtonState(false);
            cardNumber.focus();
            return false;
        }
        
        if (!cvv.value.trim()) {
            this.showFieldError(cvv, 'Por favor, informe o CVV do cartão.');
            this.showDateError('Problemas encontrados:\n\n• CVV');
            this.setProcessingButtonState(false);
            cvv.focus();
            return false;
        }
        
        if (!expMonth.value) {
            this.showFieldError(expMonth, 'Por favor, selecione o mês de vencimento.');
            this.showDateError('Problemas encontrados:\n\n• Mês de vencimento');
            this.setProcessingButtonState(false);
            expMonth.focus();
            return false;
        }
        
        if (!expYear.value) {
            this.showFieldError(expYear, 'Por favor, selecione o ano de vencimento.');
            this.showDateError('Problemas encontrados:\n\n• Ano de vencimento');
            this.setProcessingButtonState(false);
            expYear.focus();
            return false;
        }
        
        if (!name.value.trim()) {
            this.showFieldError(name, 'Por favor, informe o nome como aparece no cartão.');
            this.showDateError('Problemas encontrados:\n\n• Nome no cartão');
            this.setProcessingButtonState(false);
            name.focus();
            return false;
        }
        
        if (!country.value) {
            this.showFieldError(country, 'Por favor, selecione o país.');
            this.showDateError('Problemas encontrados:\n\n• País');
            this.setProcessingButtonState(false);
            country.focus();
            return false;
        }
        
        if (!postalCode.value.trim()) {
            this.showFieldError(postalCode, 'Por favor, informe o CEP/código postal.');
            this.showDateError('Problemas encontrados:\n\n• CEP/Código Postal');
            this.setProcessingButtonState(false);
            postalCode.focus();
            return false;
        }
        
        // Validação básica do número do cartão (apenas dígitos e comprimento)
        const cardDigits = cardNumber.value.replace(/\s/g, '');
        if (!/^\d{13,19}$/.test(cardDigits)) {
            this.showFieldError(cardNumber, 'Por favor, informe um número de cartão válido (13-19 dígitos).');
            this.showDateError('Problemas encontrados:\n\n• Número do cartão (13-19 dígitos)');
            this.setProcessingButtonState(false);
            cardNumber.focus();
            return false;
        }
        
        // Validação do CVV
        if (!/^\d{3,4}$/.test(cvv.value)) {
            this.showFieldError(cvv, 'Por favor, informe um CVV válido (3 ou 4 dígitos).');
            this.showDateError('Problemas encontrados:\n\n• CVV (3 ou 4 dígitos)');
            this.setProcessingButtonState(false);
            cvv.focus();
            return false;
        }
        
        // Processar pagamento
        try {
            // Verificar se já temos um hold válido (feito na inicialização)
            if (!this.bookingData.holdData || !this.bookingData.holdData.paymentDataSubmissionUrl) {
                this.showDateError('Sessão de pagamento expirada. Por favor, recarregue a página e tente novamente.');
                this.setProcessingButtonState(false);
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
                this.setProcessingButtonState(false);
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
            this.setProcessingButtonState(false);

            console.log('✅ Pagamento e reserva processados com sucesso, pronto para step 5');
            return true;

        } catch (error) {
            this.hidePaymentProgress();
            this.setProcessingButtonState(false);

            // CORREÇÃO: Verificar se é erro da API Viator com trackingId
            if (error.isViatorApiError && error.trackingId) {
                console.log('🎯 Erro da API Viator detectado com trackingId:', error.trackingId);
                this.showDateError(error.message, 'error', error.trackingId);
            } else if (!this.specificErrorAlreadyDisplayed) {
                // Erro genérico apenas se não há erro específico
                this.showDateError('Erro no processamento do pagamento: ' + error.message);
            } else {
                console.log('⚠️ Erro genérico não exibido - erro específico da API já foi mostrado');
            }
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

        // Inserir após o h3 "Informações de Pagamento" no step de pagamento
        const paymentStep = document.querySelector('.payment-step');
        const paymentTitle = paymentStep ? paymentStep.querySelector('h3') : null;
        
        if (paymentStep && paymentTitle) {
            // Inserir logo após o h3
            paymentTitle.insertAdjacentElement('afterend', progressDiv);
        } else if (paymentStep) {
            // Fallback: inserir no topo se não encontrar o h3
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
            console.log('🚨 [CRITICAL DEBUG] requestBookingHoldForPayment() foi chamado!');
            console.log('🚨 [CRITICAL DEBUG] Timestamp:', new Date().toISOString());

            // IMPORTANTE: Usar as respostas já coletadas das booking questions (não recoletar)
            // As respostas já foram coletadas e validadas no Step 3
            const bookingQuestionAnswers = this.bookingData.bookingQuestionAnswers || [];

            console.log('🚨 [CRITICAL DEBUG] bookingQuestionAnswers do bookingData:', bookingQuestionAnswers);
            console.log('🚨 [CRITICAL DEBUG] bookingQuestionAnswers.length:', bookingQuestionAnswers.length);

            // VERIFICAÇÃO CRÍTICA: Se não há respostas, tentar coleta alternativa
            if (bookingQuestionAnswers.length === 0) {
                console.error('🚨 [CRITICAL] Nenhuma booking question coletada! Tentando método alternativo...');

                const fallbackAnswers = this.collectSpecialRequirementsDirectly();
                if (fallbackAnswers.length > 0) {
                    console.log('✅ [CRITICAL FALLBACK] Respostas coletadas:', fallbackAnswers);
                    this.bookingData.bookingQuestionAnswers = fallbackAnswers;
                    bookingQuestionAnswers = fallbackAnswers;
                } else {
                    console.error('❌ [CRITICAL FALLBACK] Nenhuma resposta coletada pelo método alternativo');
                }
            }

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

                // Clonar a resposta completa para evitar referências circulares
                this.bookingData.holdData.fullResponse = JSON.parse(JSON.stringify(data.data));
                
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

            // CORREÇÃO: Resetar flag de erro específico no início de nova tentativa
            this.specificErrorAlreadyDisplayed = false;

            // CORREÇÃO: Evitar reconfirmação desnecessária (idempotência)
            try {
                const alreadyRef = this.bookingData?.confirmationData?.bookingInfo?.bookingRef
                    || this.bookingData?.confirmationData?.custom_data?.bookingRef
                    || this.bookingData?.confirmationData?.bookingRef;
                if (alreadyRef) {
                    console.log('ℹ️ [CONFIRM] Reserva já confirmada anteriormente. Pulando nova confirmação.', alreadyRef);
                    this.displayConfirmationMessage(this.bookingData.confirmationData);
                    return true;
                }
            } catch (e) {}
            
            // Verificar se viatorBookingAjax está disponível
            if (typeof viatorBookingAjax === 'undefined') {
                console.error('❌ viatorBookingAjax não está definido. Verifique se o script foi carregado corretamente.');
                this.showDateError('Erro de configuração. Recarregue a página.');
                return false;
            }
            
            // CORREÇÃO CRÍTICA: Usar dados do responsável já validados e armazenados
            // Garantir persistência das respostas PER_TRAVELER vindas da Etapa 2
            this.ensurePerTravelerAnswersPersisted();
            const travelersData = this.collectDetailedTravelersData();
            let bookerInfo = this.bookingData.bookerInfo || travelersData.bookerInfo;
            
            console.log('🔍 [CONFIRM] Verificando bookerInfo:', {
                fromBookingData: this.bookingData.bookerInfo,
                fromTravelersData: travelersData.bookerInfo,
                finalBookerInfo: bookerInfo
            });
            
            // Verificar se os dados do bookerInfo estão completos
            if (!bookerInfo || !bookerInfo.firstName || !bookerInfo.lastName || !bookerInfo.email) {
                console.error('❌ [CONFIRM] Dados do bookerInfo incompletos ou ausentes:', bookerInfo);
                
                // Última tentativa: coletar diretamente do DOM
                const bookerFirstname = document.getElementById('booker-firstname');
                const bookerLastname = document.getElementById('booker-lastname');
                const bookerEmail = document.getElementById('booker-email');
                const bookerPhone = document.getElementById('booker-phone');
                const bookerCountryCode = document.getElementById('booker-country-code');
                
                console.log('🔍 [CONFIRM] Elementos DOM encontrados:', {
                    firstname: !!bookerFirstname,
                    lastname: !!bookerLastname,
                    email: !!bookerEmail,
                    phone: !!bookerPhone,
                    values: {
                        firstname: bookerFirstname?.value || 'VAZIO',
                        lastname: bookerLastname?.value || 'VAZIO',
                        email: bookerEmail?.value || 'VAZIO'
                    }
                });
                
                if (bookerFirstname?.value?.trim() && bookerLastname?.value?.trim() && bookerEmail?.value?.trim()) {
                    bookerInfo = {
                        firstName: bookerFirstname.value.trim(),
                        lastName: bookerLastname.value.trim(),
                        email: bookerEmail.value.trim(),
                        phone: bookerPhone?.value?.trim() || '',
                        countryCode: bookerCountryCode?.value || 'BR'
                    };
                    
                    console.log('✅ [CONFIRM] Dados do bookerInfo coletados do DOM como última tentativa:', bookerInfo);
                    
                    // Atualizar o bookingData
                    this.bookingData.bookerInfo = bookerInfo;
                } else {
                    console.error('❌ [CONFIRM] Não foi possível coletar dados válidos do responsável');
                    this.showDateError('Erro: Dados do responsável não encontrados ou incompletos. Por favor, preencha todos os campos obrigatórios (Nome, Sobrenome e Email).');
                    return;
                }
            }
            
            // Garantir que respostas PER_TRAVELER (Etapa 2) e PER_BOOKING (Etapa 3) estejam mescladas
            // BUGFIX: anteriormente respostas de travelersData podiam sobrescrever e REMOVER PER_BOOKING (ex.: PICKUP_POINT)
            const perTravelerIds = ['AGEBAND', 'FULL_NAMES_FIRST', 'FULL_NAMES_LAST', 'HEIGHT'];

            // 1) Base: usar respostas persistidas do step 3 (contém PER_BOOKING + PER_TRAVELER)
            let bookingQuestionAnswers = Array.isArray(this.bookingData.bookingQuestionAnswers)
                ? this.bookingData.bookingQuestionAnswers.slice()
                : [];

            // 2) Se collectDetailedTravelersData trouxe algo, mesclar sem perder PER_BOOKING
            const travelerBQ = Array.isArray(travelersData.bookingQuestionAnswers)
                ? travelersData.bookingQuestionAnswers
                : [];

            if (travelerBQ.length > 0) {
                const makeKey = (ans) => {
                    const q = ans.question || ans.questionId || '';
                    const t = typeof ans.travelerNum === 'undefined' ? 'PB' : String(ans.travelerNum);
                    return `${q}::${t}`;
                };
                const existingKeys = new Set(bookingQuestionAnswers.map(makeKey));
                travelerBQ.forEach((ans) => {
                    const key = makeKey(ans);
                    if (!existingKeys.has(key)) {
                        bookingQuestionAnswers.push(ans);
                        existingKeys.add(key);
                    }
                });
            }

            // 3) Segurança adicional: se por algum motivo não há PER_TRAVELER, reintroduzir os persistidos
            const persisted = Array.isArray(this.bookingData.bookingQuestionAnswers) ? this.bookingData.bookingQuestionAnswers : [];
            const perTravelerPersisted = persisted.filter(function(a){
                const q = a.question || a.questionId; return perTravelerIds.indexOf(q) !== -1; });
            const hasPerTraveler = bookingQuestionAnswers.some(function(a){
                const q = a.question || a.questionId; return perTravelerIds.indexOf(q) !== -1; });
            if (!hasPerTraveler && perTravelerPersisted.length > 0) {
                const existingKeys = new Set(bookingQuestionAnswers.map(function(ans){
                    const q = ans.question || ans.questionId || ''; const t = typeof ans.travelerNum === 'undefined' ? 'PB' : String(ans.travelerNum); return `${q}::${t}`; }));
                perTravelerPersisted.forEach(function(ans){
                    const q = ans.question || ans.questionId; const t = typeof ans.travelerNum === 'undefined' ? 'PB' : String(ans.travelerNum); const key = `${q}::${t}`;
                    if (!existingKeys.has(key)) {
                        bookingQuestionAnswers.push(ans);
                        existingKeys.add(key);
                    }
                });
            }

            // Detectar e incluir language guide de forma ROBUSTA
            let languageGuide = this.detectAndSelectLanguageGuide();
            
            // CORREÇÃO CRÍTICA: Garantir que language guide seja enviado se o produto exige
            const hasLanguageGuides = Array.isArray(window.productData?.languageGuides) && window.productData.languageGuides.length > 0;
            if (hasLanguageGuides && !languageGuide) {
                console.warn('⚠️ [LANGUAGE GUIDE] ERRO na detecção inicial, aplicando fallback robusto...');
                // Fallback super agressivo
                const guides = window.productData.languageGuides;
                languageGuide = guides[0]?.language || guides[0]?.code || 'en';
                console.warn('🔧 [LANGUAGE GUIDE] Fallback final aplicado:', languageGuide);
            }
            
            if (hasLanguageGuides && !languageGuide) {
                console.error('❌ [LANGUAGE GUIDE] ERRO CRÍTICO: Produto exige language guide mas não foi detectado mesmo com fallbacks!');
                throw new Error('Language guide é obrigatório para este produto. Selecione um idioma.');
            }

            // Log detalhado dos dados antes do envio
            console.log('📋 Dados para confirmação:', {
                cartId: this.bookingData.holdData.cartId,
                hasPaymentToken: !!this.bookingData.paymentToken,
                bookerInfo: bookerInfo,
                bookerInfoStringified: JSON.stringify(bookerInfo),
                bookingQuestionAnswers: bookingQuestionAnswers,
                languageGuide: languageGuide
            });
            
            // VALIDAÇÃO FINAL CRÍTICA antes do envio
            if (!bookerInfo || !bookerInfo.firstName?.trim() || !bookerInfo.lastName?.trim() || !bookerInfo.email?.trim()) {
                console.error('❌ [CONFIRM] Validação final falhou - Dados do bookerInfo inválidos:', {
                    bookerInfo: bookerInfo,
                    hasFirstName: !!(bookerInfo?.firstName?.trim()),
                    hasLastName: !!(bookerInfo?.lastName?.trim()),
                    hasEmail: !!(bookerInfo?.email?.trim()),
                    bookingDataBookerInfo: this.bookingData.bookerInfo
                });
                this.showDateError('Erro: Dados do responsável incompletos. Por favor, verifique se todos os campos obrigatórios estão preenchidos (Nome, Sobrenome e Email).');
                return;
            }

            // Regra de segurança adicional: se modo de chegada foi informado, exigir TRANSFER_ARRIVAL_DROP_OFF
            try {
                const arrivalModeAns = (bookingQuestionAnswers || []).find(a => (a.question || a.questionId) === 'TRANSFER_ARRIVAL_MODE');
                const arrivalModeVal = (arrivalModeAns && String(arrivalModeAns.answer || '').trim()) || '';
                const hasArrivalMode = !!arrivalModeVal;
                const pickupData = this.getPickupData ? this.getPickupData() : undefined;
                const noPickup = pickupData && pickupData.pickupOptionType === 'MEET_EVERYONE_AT_START_POINT';
                const dropOffAnsIndex = (bookingQuestionAnswers || []).findIndex(a => (a.question || a.questionId) === 'TRANSFER_ARRIVAL_DROP_OFF');
                if (hasArrivalMode && !noPickup && arrivalModeVal !== 'OTHER') {
                    if (dropOffAnsIndex === -1) {
                        // Preferir hidden sincronizado
                        const hidden = document.getElementById('TRANSFER_ARRIVAL_DROP_OFF');
                        const textInput = document.getElementById('TRANSFER_ARRIVAL_DROP_OFF_text');
                        const val = hidden?.value?.trim() || textInput?.value?.trim() || '';
                        if (val) {
                            const unit = hidden?.getAttribute('data-unit') || 'FREETEXT';
                            bookingQuestionAnswers.push({ question: 'TRANSFER_ARRIVAL_DROP_OFF', answer: val, unit: unit });
                        } else {
                            this.showDateError('Informe o endereço final da chegada (Endereço final).');
                            const fg = (textInput || hidden)?.closest?.('.booking-question-group');
                            if (fg && fg.scrollIntoView) fg.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            return false;
                        }
                    }
                }
            } catch (_e) {}
            
            console.log('✅ [CONFIRM] Validação final aprovada - bookerInfo completo:', bookerInfo);

            const requestParams = {
                action: 'viator_confirm_booking',
                cart_id: this.bookingData.holdData.cartId,
                partner_booking_ref: this.bookingData.holdData.bookingRef || '',
                payment_token: this.bookingData.paymentToken,
                booker_info: JSON.stringify(bookerInfo),
                hold_data: JSON.stringify(this.bookingData.holdData.fullResponse || {}),
                nonce: viatorBookingAjax.nonce
            };

            // Incluir language guide se detectado
            if (languageGuide) {
                // Enviar também o tipo (GUIDE/AUDIO) quando disponível
                const languageGuideType = this.bookingData?.selectedLanguageGuideType || (function(){
                    const guides = window.productData?.languageGuides || [];
                    const found = guides.find(g => String(g.language).trim() === String(languageGuide).trim());
                    return found?.type || 'GUIDE';
                })();

                requestParams.language_guide = languageGuide;
                requestParams.language_guide_type = languageGuideType;
                
                // CORREÇÃO CRÍTICA: Incluir contagem de language guides para lógica no backend
                const languageGuideCount = Array.isArray(window.productData?.languageGuides) ? window.productData.languageGuides.length : 0;
                requestParams.language_guide_count = languageGuideCount;
                requestParams.language_guide_present = true;
                
                console.log('🌐 Language guide incluído na requisição:', { 
                    languageGuide, 
                    languageGuideType, 
                    languageGuideCount,
                    logica: languageGuideCount > 1 ? 'Múltiplos guides - ENVIAR à API' : 'Guide único - NÃO enviar à API'
                });
                
                // CORREÇÃO CRÍTICA: Language guide NUNCA deve ser uma booking question
                // A API rejeita com "Answer provided for an invalid booking question"
                // Language guide deve ser enviado como parâmetro separado no backend apenas
                
                // CONFORME DOCS: languageGuide deve ser enviado APENAS no root
                // Remover QUALQUER ocorrência de LANGUAGE_GUIDE das booking questions
                const before = bookingQuestionAnswers.length;
                bookingQuestionAnswers = bookingQuestionAnswers.filter(answer => 
                    answer.question !== 'LANGUAGE_GUIDE' && answer.questionId !== 'LANGUAGE_GUIDE'
                );
                const after = bookingQuestionAnswers.length;
                if (before !== after) {
                    console.log('🔧 [LANGUAGE GUIDE] Removidas ocorrências de LANGUAGE_GUIDE das booking questions:', before - after);
                }
            } else {
                // Forçar fallback para 'pt' quando o produto tem languageGuides mas não conseguimos normalizar
                const hasGuides = Array.isArray(window.productData?.languageGuides) && window.productData.languageGuides.length > 0;
                if (hasGuides) {
                    requestParams.language_guide = 'pt';
                    console.warn('⚠️ [LANGUAGE GUIDE] Fallback aplicado: usando "pt"');
                }
            }
            
            // Incluir perguntas de reserva se existirem
            if (bookingQuestionAnswers && bookingQuestionAnswers.length > 0) {
                console.log('📝 Enviando booking questions:', bookingQuestionAnswers);

                // CORREÇÃO: Log detalhado das perguntas sendo enviadas
                bookingQuestionAnswers.forEach((answer, index) => {
                    console.log(`📝 Pergunta ${index + 1}:`, {
                        question: answer.question || answer.questionId,
                        answer: answer.answer,
                        travelerNum: answer.travelerNum,
                        unit: answer.unit
                    });
                });

                // FILTRO FINAL ANTES DO ENVIO: remover campos de transferência quando não há pickup
                try {
                    const pickupData = this.getPickupData ? this.getPickupData() : undefined;
                    const noPickup = pickupData && pickupData.pickupOptionType === 'MEET_EVERYONE_AT_START_POINT';
                    if (noPickup) {
                        const before = bookingQuestionAnswers.length;
                        bookingQuestionAnswers = bookingQuestionAnswers.filter((a) => {
                            const qid = a && (a.question || a.questionId);
                            return qid !== 'TRANSFER_ARRIVAL_TIME' && qid !== 'TRANSFER_ARRIVAL_DROP_OFF';
                        });
                        const after = bookingQuestionAnswers.length;
                        if (after !== before) {
                            console.log('🔧 [CONFIRM] Removidos campos de transferência (no-pickup):', { antes: before, depois: after });
                        }
                        // Normalizar arrival mode para OTHER quando não for aceito
                        const idx = bookingQuestionAnswers.findIndex((a) => (a?.question || a?.questionId) === 'TRANSFER_ARRIVAL_MODE');
                        if (idx !== -1) {
                            const cur = String(bookingQuestionAnswers[idx].answer || '').trim();
                            if (cur !== 'AIR' && cur !== 'OTHER') {
                                console.warn(`⚠️ [CONFIRM] TRANSFER_ARRIVAL_MODE inválido no cenário sem pickup: "${cur}" → OTHER`);
                                bookingQuestionAnswers[idx].answer = 'OTHER';
                            }
                        }
                    }
                } catch (e) { /* no-op */ }

                // Remoção final de quaisquer campos de transferência indevidos para produtos sem pickup ou arrivalMode=OTHER
                try {
                    const pickupData2 = this.getPickupData ? this.getPickupData() : undefined;
                    const noPickup2 = pickupData2 && pickupData2.pickupOptionType === 'MEET_EVERYONE_AT_START_POINT';
                    // Verificar arrival mode atual nas respostas
                    const arrIdx = bookingQuestionAnswers.findIndex((a) => (a?.question || a?.questionId) === 'TRANSFER_ARRIVAL_MODE');
                    const arrivalIsOther = arrIdx !== -1 && String(bookingQuestionAnswers[arrIdx].answer || '').trim() === 'OTHER';
                    if (noPickup2 || arrivalIsOther) {
                        const before2 = bookingQuestionAnswers.length;
                        bookingQuestionAnswers = bookingQuestionAnswers.filter((a) => {
                            const qid = a && (a.question || a.questionId);
                            return qid !== 'TRANSFER_ARRIVAL_TIME' && qid !== 'TRANSFER_ARRIVAL_DROP_OFF';
                        });
                        const after2 = bookingQuestionAnswers.length;
                        if (after2 !== before2) {
                            console.log('🔧 [CONFIRM] Purga final de campos de transferência (no-pickup):', { antes: before2, depois: after2 });
                        }
                    }
                } catch (e) { /* no-op */ }

                requestParams.bookingQuestionAnswers = JSON.stringify(bookingQuestionAnswers);
            } else {
                console.log('📝 Nenhuma booking question para enviar');
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
            
            // CORREÇÃO CRÍTICA: Verificar se há erro interno mesmo com success=true
            if (data.success) {
                console.log('✅ Resposta marcada como sucesso, verificando dados internos...');
                console.log('📊 Dados de confirmação recebidos:', data.data);

                const confirmationData = data.data;

                // CORREÇÃO CRÍTICA: Verificar se há erro interno da API da Viator
                if (confirmationData && (
                    confirmationData.code === 'INTERNAL_SERVER_ERROR' ||
                    confirmationData.message === 'Internal server error' ||
                    confirmationData.code === 500 ||
                    confirmationData.trackingId
                )) {
                    console.error('❌ ERRO 500 DETECTADO na resposta da API da Viator:', confirmationData);

                    // Extrair informações do erro
                    const errorMessage = confirmationData.message || 'Erro interno do servidor da Viator';
                    const trackingId = confirmationData.trackingId || 'N/A';

                    // Exibir erro ao usuário
                    const userErrorMessage = `Erro no processamento da reserva: ${errorMessage}. ` +
                                           `ID de rastreamento: ${trackingId}. ` +
                                           `Por favor, entre em contato com o suporte.`;

                    this.logBookingEvent('booking_confirmation_viator_500_error', {
                        message: errorMessage,
                        trackingId: trackingId,
                        fullResponse: confirmationData
                    }, 'error');

                    // CORREÇÃO: Não exibir erro durante retry - apenas lançar exceção com trackingId
                    // O erro será exibido apenas no final se todas as tentativas falharem
                    const error = new Error(errorMessage);
                    error.trackingId = trackingId;
                    error.isViatorApiError = true;
                    throw error;
                    // return false; // Removido para permitir retry
                }

                // Se não há erro interno, prosseguir normalmente
                console.log('✅ Confirmação bem-sucedida, exibindo mensagem');

                // Verificar se há dados de confirmação válidos
                if (confirmationData && confirmationData.bookingInfo) {
                    // Se há bookingRef, considerar como sucesso mesmo sem status explícito
                    if (confirmationData.bookingInfo.bookingRef && !confirmationData.custom_data?.confirmationStatus) {
                        console.log('📋 Reserva processada com sucesso, definindo status como CONFIRMED');
                        confirmationData.custom_data = confirmationData.custom_data || {};
                        confirmationData.custom_data.confirmationStatus = 'CONFIRMED';
                    }
                } else {
                    console.warn('⚠️ Dados de confirmação incompletos:', confirmationData);
                }

                this.bookingData.confirmationData = confirmationData;
                this.displayConfirmationMessage(confirmationData);
                return true;
            } else {
                console.error('❌ Erro na confirmação:', data);

                // CORREÇÃO: Melhorar extração de mensagens de erro
                let errorMessage = 'Ocorreu um problema durante o processamento da sua reserva';
                let errorDetails = '';

                if (data.data) {
                    if (data.data.message) {
                        // Garantir que a mensagem seja sempre uma string válida
                        if (typeof data.data.message === 'string') {
                            errorMessage = data.data.message;
                        } else if (typeof data.data.message === 'object') {
                            errorMessage = data.data.message.message || 
                                         data.data.message.error || 
                                         data.data.message.description || 
                                         JSON.stringify(data.data.message);
                        } else {
                            errorMessage = String(data.data.message);
                        }
                    }

                    if (data.data.reasons && Array.isArray(data.data.reasons)) {
                        errorDetails = data.data.reasons.map(r => r.message || r).join(', ');
                    } else if (data.data.error) {
                        errorDetails = data.data.error;
                    }
                }

                const fullErrorMessage = errorDetails ?
                    `${errorMessage} (${errorDetails})` :
                    errorMessage;

                this.logBookingEvent('booking_confirmation_error', {
                    message: errorMessage,
                    details: errorDetails,
                    fullResponse: data
                }, 'error');

                // CORREÇÃO: Tratar erro idempotente de cartRef já confirmado como SUCESSO
                const msg = (data?.data?.message || '').toString();
                if (/cartRef already exists/i.test(msg)) {
                    console.warn('⚠️ [CONFIRM] Booking já existente para este cartRef. Tratando como confirmado.');
                    // Construir dados mínimos de confirmação se ainda não tivermos
                    if (!this.bookingData.confirmationData) {
                        const bookingRef = this.bookingData?.holdData?.bookingRef || 'N/A';
                        this.bookingData.confirmationData = {
                            custom_data: { confirmationStatus: 'CONFIRMED' },
                            bookingInfo: { bookingRef },
                            items: [],
                            currency: this.bookingData?.holdData?.currency || 'BRL'
                        };
                    }
                    this.displayConfirmationMessage(this.bookingData.confirmationData);
                    return true;
                }

                // Caso não seja idempotente, lançar para retry
                const error = new Error(fullErrorMessage);
                error.isBookingError = true;
                throw error;
            }
        } catch (error) {
            console.error('❌ Erro de conexão na confirmação:', error);

            // CORREÇÃO: Lançar exceção em vez de return false para permitir retry
            // Preservar erro original se for da API Viator
            if (error.isViatorApiError) {
                throw error; // Preservar erro específico da API
            } else {
                const connectionError = new Error('Erro de conexão na confirmação.');
                connectionError.isConnectionError = true;
                throw connectionError;
            }
        }
    }
    
    displayConfirmationMessage(data) {
        console.log('🎨 displayConfirmationMessage chamado com dados:', data);

        // CORREÇÃO: Busca mais robusta do container
        let container = document.querySelector('.confirmation-message');
        console.log('📦 Container encontrado:', !!container);

        if (!container) {
            console.warn('⚠️ Container .confirmation-message não encontrado, tentando criar...');

            // Tentar encontrar container pai
            const parentContainer = document.querySelector('.confirmation-container, .confirmation-step, #booking-step-content');
            if (parentContainer) {
                console.log('📦 Container pai encontrado, criando .confirmation-message');
                container = document.createElement('div');
                container.className = 'confirmation-message';
                parentContainer.appendChild(container);
            } else {
                console.error('❌ Nenhum container pai encontrado para criar .confirmation-message!');
                return;
            }
        }

        // CORREÇÃO: Extrair dados com múltiplas estratégias
        const firstItem = data.items && data.items.length > 0 ? data.items[0] : {};

        // Estratégia robusta para extrair status
        let status = this.extractConfirmationStatus(data, firstItem);

        // Estratégia robusta para extrair bookingRef
        const bookingRef = this.extractBookingRef(data, firstItem);

        // Estratégia robusta para extrair voucherInfo
        const voucherInfo = this.extractVoucherInfo(data, firstItem);

        const isRestricted = voucherInfo.isVoucherRestrictionRequired || data.custom_data?.isVoucherRestrictionRequired || false;
        const itemSummary = firstItem.itemSummary || {};

        console.log('🚨 [CONFIRMATION DEBUG] Estrutura de dados:', data);
        console.log('🚨 [CONFIRMATION DEBUG] Primeiro item:', firstItem);
        console.log('🚨 [CONFIRMATION DEBUG] Status extraído:', status);
        console.log('🚨 [CONFIRMATION DEBUG] BookingRef extraído:', bookingRef);
        console.log('🚨 [CONFIRMATION DEBUG] VoucherInfo extraído:', voucherInfo);

        // CORREÇÃO: Se ainda está UNKNOWN mas temos bookingRef válido, usar CONFIRMED
        if (status === 'UNKNOWN' && bookingRef && bookingRef !== 'N/A') {
            console.log('📋 Detectado bookingRef válido, considerando como CONFIRMED');
            status = 'CONFIRMED';
        }

        // Se há dados de voucher, também considerar como sucesso
        if (status === 'UNKNOWN' && (voucherInfo.url || voucherInfo.voucherURL || voucherInfo.voucherKey)) {
            console.log('🎫 Detectado dados de voucher, considerando como CONFIRMED');
            status = 'CONFIRMED';
        }

        // Se chegou até aqui com dados válidos, assumir CONFIRMED
        if (status === 'UNKNOWN' && (bookingRef !== 'N/A' || Object.keys(voucherInfo).length > 0)) {
            console.log('✅ Dados de confirmação válidos encontrados, assumindo CONFIRMED');
            status = 'CONFIRMED';
        }

        console.log('📊 Status da confirmação (após correção):', status);
        console.log('🔒 Voucher restrito:', isRestricted);
        console.log('📋 Referência da reserva:', bookingRef);
        
        // Extrair informações adicionais - múltiplas fontes para o nome do produto
        // Função para verificar se um nome é genérico
        const isGenericName = (name) => {
            if (!name || typeof name !== 'string') return true;
            const genericNames = ['experiência', 'passeio', 'tour', 'atividade', 'atração'];
            return genericNames.some(generic => name.toLowerCase().trim() === generic);
        };

        // Buscar nome específico, ignorando nomes genéricos
        let productName = 'Experiência';

        // 1ª fonte: dados salvos
        const savedTitle = this.bookingData?.productTitle || this.bookingData?.availabilityData?.productTitle;
        if (savedTitle && !isGenericName(savedTitle)) {
            productName = savedTitle;
        }
        // 2ª fonte: dados globais
        else if (window.productData?.title && !isGenericName(window.productData.title)) {
            productName = window.productData.title;
        }
        // 3ª fonte: optionTitle dos dados de disponibilidade (NOVA FONTE!)
        else if (this.bookingData?.selectedOption?.optionTitle && !isGenericName(this.bookingData.selectedOption.optionTitle)) {
            productName = this.bookingData.selectedOption.optionTitle;
        }
        // 4ª fonte: extrair do .total-label
        else {
            const totalLabelText = document.querySelector('.total-label')?.textContent;
            if (totalLabelText) {
                const extractedName = totalLabelText.replace(/^Total\s*\(/, '').replace(/\):?$/, '').trim();
                if (extractedName && !isGenericName(extractedName)) {
                    productName = extractedName;
                }
            }
        }

        // 5ª fonte: DOM como último recurso (só se não for genérico)
        if (productName === 'Experiência') {
            const domTitle = document.querySelector('h1.entry-title, .product-title, h1')?.textContent?.trim();
            if (domTitle && !isGenericName(domTitle)) {
                productName = domTitle;
            }
        }
        const travelDate = this.bookingData?.travelDate || 'Data não especificada';

        // CORREÇÃO CRÍTICA: Melhorar extração do preço com múltiplas fontes
        let currency = 'BRL'; // CORREÇÃO: Padrão brasileiro
        let amount = 0;

        // 1ª fonte: dados de confirmação
        if (data?.totalConfirmedPrice?.price) {
            currency = data.currency || data.data?.currency || 'BRL';
            amount = data.totalConfirmedPrice.price.recommendedRetailPrice ||
                    data.totalConfirmedPrice.price.partnerTotalPrice || 0;
        }
        // 2ª fonte: dados do item
        else if (firstItem?.itemTotalPrice?.price) {
            currency = data?.currency || data?.data?.currency || 'BRL';
            amount = firstItem.itemTotalPrice.price.recommendedRetailPrice ||
                    firstItem.itemTotalPrice.price.partnerTotalPrice || 0;
        }
        // 3ª fonte: dados salvos da opção selecionada
        else if (this.bookingData?.selectedOption?.totalPrice?.price) {
            const savedPrice = this.bookingData.selectedOption.totalPrice.price;
            currency = this.bookingData.selectedOption.currency ||
                      this.bookingData.availabilityData?.currency || 'BRL';
            amount = savedPrice.recommendedRetailPrice || savedPrice.partnerTotalPrice || 0;
        }
        // 4ª fonte: dados de disponibilidade salvos
        else if (this.bookingData?.availabilityData?.bookableItems?.[0]?.totalPrice?.price) {
            const availPrice = this.bookingData.availabilityData.bookableItems[0].totalPrice.price;
            currency = this.bookingData.availabilityData.currency || 'BRL';
            amount = availPrice.recommendedRetailPrice || availPrice.partnerTotalPrice || 0;
        }
        // NOVO: usar preço pendente do response quando confirmado é 0
        if ((amount === 0 || !amount) && data?.totalPendingPrice?.price) {
            currency = data.currency || 'BRL';
            amount = data.totalPendingPrice.price.recommendedRetailPrice || data.totalPendingPrice.price.partnerTotalPrice || amount || 0;
        }
        // 5ª fonte: extrair do DOM como último recurso (corrigindo locale pt-BR para número)
        else {
            const totalElement = document.querySelector('.total-price, .price-total, .final-price');
            if (totalElement) {
                const priceText = (totalElement.textContent || '').trim();
                // Remover tudo exceto dígitos, ponto e vírgula; depois remover separador de milhar e normalizar vírgula para ponto
                const numericPart = priceText.replace(/[^0-9.,-]/g, '');
                if (numericPart) {
                    const normalized = numericPart.replace(/\./g, '').replace(',', '.');
                    const parsed = Number(normalized);
                    if (!Number.isNaN(parsed) && parsed > 0) {
                        currency = 'BRL';
                        amount = parsed;
                    }
                }
            }
        }
        
        // Informações do responsável
        const bookerData = this.collectDetailedTravelersData()?.bookerInfo || {};
        const bookerEmail = bookerData.email || 'Email não informado';

        // Debug das variáveis e fontes
        console.log('🔍 [DEBUG] Variáveis do resumo:');
        console.log('📝 productName FINAL:', productName);
        console.log('📝 productName type:', typeof productName);
        console.log('📝 productName HTML?:', productName?.includes?.('<'));

        // Debug das fontes de dados
        console.log('🔍 [DEBUG] Fontes de dados para productName:');
        console.log('📝 1ª fonte - this.bookingData?.productTitle:', this.bookingData?.productTitle);
        console.log('📝 2ª fonte - window.productData?.title:', window.productData?.title);
        console.log('📝 3ª fonte - selectedOption?.optionTitle:', this.bookingData?.selectedOption?.optionTitle);
        console.log('📝 4ª fonte - .total-label:', document.querySelector('.total-label')?.textContent);
        console.log('📝 5ª fonte - h1.entry-title:', document.querySelector('h1.entry-title, .product-title, h1')?.textContent?.trim());
        console.log('📝 this.bookingData completo:', this.bookingData);

        console.log('💰 currency:', currency);
        console.log('💵 amount:', amount);
        console.log('📧 bookerEmail:', bookerEmail);
        console.log('📅 travelDate:', travelDate);

        // Garantir que productName seja texto limpo
        const cleanProductName = typeof productName === 'string' ?
            productName.replace(/<[^>]*>/g, '').trim() :
            String(productName || 'Experiência');
        
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
                                    <span class="item-value">${cleanProductName}</span>
                                </div>
                            </div>
                            <div class="summary-item">
                                <div class="item-icon">📅</div>
                                <div class="item-content">
                                    <span class="item-label">Data da Viagem</span>
                                    <span class="item-value">${this.formatDateDisplayPtBR(travelDate)}</span>
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
            const displayAmount = amount && amount > 0 ? `${currency} ${amount.toFixed(2)}` : 'A confirmar';
            const cleanName = cleanProductName;
            html = `
                <div class="confirmation-pending">
                    <div class="pending-hero">
                        <div class="pending-animation">
                            <div class="pending-circle">
                                <div class="pending-icon">
                                    <svg viewBox="0 0 52 52" class="pending-clock">
                                        <circle class="clock-circle" cx="26" cy="26" r="25" fill="none"/>
                                        <path class="clock-hand hour-hand" d="M26 26 L26 18" stroke-linecap="round"/>
                                        <path class="clock-hand minute-hand" d="M26 26 L30 14" stroke-linecap="round"/>
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div class="pending-content">
                            <h1 class="pending-title">Reserva Pendente</h1>
                            <p class="pending-subtitle">Aguardando confirmação do fornecedor</p>
                            <div class="booking-ref-highlight">
                                <span class="ref-label">Referência da Reserva</span>
                                <div class="ref-value-container">
                                    <span class="ref-value">${bookingRef}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Resumo da Reserva -->
                    <div class="booking-summary-card">
                        <h3>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M8 2v4"></path>
                                <path d="M16 2v4"></path>
                                <rect x="3" y="4" width="18" height="18" rx="2"></rect>
                                <path d="M3 10h18"></path>
                            </svg>
                            Resumo da Reserva
                        </h3>
                        <div class="summary-grid">
                            <div class="summary-item">
                                <span class="summary-label">🎯 Experiência:</span>
                                <span class="summary-value">${cleanName}</span>
                        </div>
                            <div class="summary-item">
                                <span class="summary-label">📅 Data da Viagem:</span>
                                <span class="summary-value">${this.formatDateDisplayPtBR(travelDate)}</span>
                        </div>
                            <div class="summary-item">
                                <span class="summary-label">💰 Valor Total:</span>
                                <span class="summary-value">${displayAmount}</span>
                        </div>
                            <div class="summary-item">
                                <span class="summary-label">💳 Pagamento:</span>
                                <span class="summary-value payment-status">Pré-autorizado (não cobrado ainda)</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Próximos Passos -->
                    <div class="next-steps-card">
                        <h3>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12,6 12,12 16,14"></polyline>
                            </svg>
                            Próximos passos
                        </h3>
                        <div class="steps-grid">
                            <div class="step-item">
                                <div class="step-icon">⏰</div>
                                <div class="step-content">
                                    <h4>A confirmação pode levar até 48 horas</h4>
                                    <p>O fornecedor está analisando sua solicitação</p>
                                </div>
                            </div>
                            <div class="step-item">
                                <div class="step-icon">📧</div>
                                <div class="step-content">
                                    <h4>Você receberá um email assim que o status for atualizado</h4>
                                    <p>Fique atento à sua caixa de entrada</p>
                                </div>
                            </div>
                            <div class="step-item">
                                <div class="step-icon">✅</div>
                                <div class="step-content">
                                    <h4>A cobrança só será efetivada após a confirmação</h4>
                                    <p>Seu cartão foi apenas pré-autorizado</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Ações Rápidas -->
                    <div class="actions-card">
                        <div class="actions-grid">
                            <div class="action-item">
                                <div class="action-icon">📋</div>
                                <div class="action-content">
                                    <h4>Copiar referência</h4>
                                    <p>Use a referência em qualquer contato</p>
                                    <button id="copy-ref-pending-btn" class="action-btn secondary-btn">Copiar código</button>
                                </div>
                            </div>
                            <div class="action-item">
                                <div class="action-icon">🏠</div>
                                <div class="action-content">
                                    <h4>Voltar ao início</h4>
                                    <p>Continuar navegando pelo site</p>
                                    <button class="action-btn contact-btn" onclick="window.location.href='/'">Ir para a página inicial</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
        } else { // FAILED, CANCELLED, etc.
            // Garantir que errorMessage seja sempre uma string válida
            let errorMessage = 'Ocorreu um problema durante o processamento da sua reserva';
            
            if (data.message) {
                if (typeof data.message === 'string') {
                    errorMessage = data.message;
                } else if (typeof data.message === 'object') {
                    // Se for um objeto, tentar extrair uma mensagem útil
                    errorMessage = data.message.message || 
                                 data.message.error || 
                                 data.message.description || 
                                 JSON.stringify(data.message);
                } else {
                    errorMessage = String(data.message);
                }
            }
            
            const errorCode = data.code || data.trackingId || 'UNKNOWN_ERROR';
            
            console.log('🚨 [ERROR MESSAGE DEBUG] Tipo da mensagem:', typeof data.message);
            console.log('🚨 [ERROR MESSAGE DEBUG] Mensagem original:', data.message);
            console.log('🚨 [ERROR MESSAGE DEBUG] Mensagem processada:', errorMessage);

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
                                    <button class="action-btn secondary-btn" onclick="window.viatorBookingManager && window.viatorBookingManager.previousStep()">
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

        // Ações rápidas (PENDING)
        try {
            const copyRef = (ev) => {
                if (!bookingRef) return;
                const btn = ev?.currentTarget || container.querySelector('#copy-ref-pending-btn');
                const setCopiedLabel = () => {
                    if (btn) btn.textContent = 'Copiado!';
                };
                if (navigator.clipboard?.writeText) {
                    navigator.clipboard
                        .writeText(bookingRef)
                        .then(() => {
                            console.log('📋 Referência copiada');
                            setCopiedLabel();
                        })
                        .catch(() => {
                            // Fallback caso a API falhe
                            const tmp = document.createElement('input');
                            tmp.value = bookingRef;
                            document.body.appendChild(tmp);
                            tmp.select();
                            document.execCommand('copy');
                            document.body.removeChild(tmp);
                            setCopiedLabel();
                        });
                } else {
                    const tmp = document.createElement('input');
                    tmp.value = bookingRef;
                    document.body.appendChild(tmp);
                    tmp.select();
                    document.execCommand('copy');
                    document.body.removeChild(tmp);
                    setCopiedLabel();
                }
            };
            container.querySelector('#copy-booking-ref-btn')?.addEventListener('click', copyRef);
            container.querySelector('#copy-booking-ref-btn-2')?.addEventListener('click', copyRef);
            const pendingCopyBtn = container.querySelector('#copy-ref-pending-btn');
            if (pendingCopyBtn) {
                pendingCopyBtn.addEventListener('click', copyRef);
            }
            container.querySelector('#print-confirmation-btn')?.addEventListener('click', () => window.print());
            container.querySelector('#back-home-btn')?.addEventListener('click', () => { window.location.href = window.location.origin || '/'; });
        } catch(_) {}

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
            :root {
              --background: #ffffff;
              --foreground: #0f1419;
              --card: #f7f8f8;
              --card-foreground: #0f1419;
              --popover: #ffffff;
              --popover-foreground: #0f1419;
              --primary: #0b1543;
              --primary-foreground: #ffffff;
              --secondary: #0f1419;
              --secondary-foreground: #ffffff;
              --muted: #e5e5e6;
              --muted-foreground: #0f1419;
              --accent: #e3ecf6;
              --accent-foreground: #1e9df1;
              --destructive: #f4212e;
              --destructive-foreground: #ffffff;
              --border: #e1eaef;
              --input: #f7f9fa;
              --ring: #1da1f2;
              --chart-1: #1e9df1;
              --chart-2: #00b87a;
              --chart-3: #f7b928;
              --chart-4: #17bf63;
              --chart-5: #e0245e;
              --radius: 1.3rem;
            }

            .confirmation-container {
                width: 100%;
                max-width: 100%;
                margin: 0 auto;
                padding: 0;
                font-family: var(--font-sans, 'Open Sans', sans-serif);
            }

            .viator-modal-body .confirmation-container {
                padding: 0;
            }

            .confirmation-success, .confirmation-pending, .confirmation-error {
                background-color: var(--background);
            }

            /* Hero Section - Sucesso */
            .success-hero {
                background: #28a745;
                color: var(--primary-foreground);
                padding: 2.5rem 1.5rem;
                text-align: center;
                position: relative;
                overflow: hidden;
            }

            /* Hero Section - Pendente */
            .pending-hero {
                background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%);
                color: var(--primary-foreground);
                padding: 2.5rem 1.5rem;
                text-align: center;
                position: relative;
                overflow: hidden;
            }

            .viator-modal-body .success-hero {
                padding: 2rem 1rem;
                border-radius: 10px;
            }

            .viator-modal-body .pending-hero {
                padding: 2rem 1rem;
                border-radius: 10px;
            }

            .success-animation, .pending-animation {
                margin-bottom: 1.5rem;
            }

            /* Centralização do bloco de próximos passos */
            .next-steps-card h3 {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                margin-bottom: 0.25rem;
            }

            /* Alinhar ao centro apenas na tela Pendente */
            .confirmation-pending .next-steps-card .steps-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 1rem;
                padding: 1rem 1.25rem;
                justify-items: center;
            }

            .success-circle, .pending-circle {
                width: 80px;
                height: 80px;
                margin: 0 auto;
            }

            .checkmark {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                display: block;
                stroke-width: 3;
                stroke: var(--primary-foreground);
                stroke-miterlimit: 10;
                box-shadow: inset 0px 0px 0px var(--chart-2);
                animation: fill 0.4s ease-in-out 0.4s forwards, scale 0.3s ease-in-out 0.9s both;
            }

            .checkmark-circle {
                stroke-dasharray: 166;
                stroke-dashoffset: 166;
                stroke-width: 3;
                stroke: var(--primary-foreground);
                fill: none;
                animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
            }

            .checkmark-check {
                transform-origin: 50% 50%;
                stroke-dasharray: 48;
                stroke-dashoffset: 48;
                animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
            }

            /* Animação do relógio para reserva pendente */
            .pending-clock {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                display: block;
                stroke-width: 3;
                stroke: var(--primary-foreground);
                stroke-miterlimit: 10;
                animation: pendingPulse 2.4s ease-in-out infinite;
            }

            .clock-circle {
                stroke-dasharray: 166;
                stroke-dashoffset: 166;
                stroke-width: 3;
                stroke: var(--primary-foreground);
                fill: none;
                animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
            }

            .clock-hand {
                stroke: var(--primary-foreground);
                stroke-width: 3;
                stroke-linecap: round;
            }

            .hour-hand {
                transform-origin: 26px 26px;
                animation: rotateHour 6s linear infinite;
            }

            .minute-hand {
                transform-origin: 26px 26px;
                animation: rotateMinute 3s linear infinite;
            }

            @keyframes pendingPulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.7; transform: scale(1.05); }
            }

            @keyframes rotateHour {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            @keyframes rotateMinute {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            .success-title, .pending-title {
                font-size: 1.8rem;
                font-weight: 700;
                margin: 0 0 0.5rem 0;
            }

            .success-subtitle, .pending-subtitle {
                font-size: 1rem;
                margin: 0 0 1.5rem 0;
                opacity: 0.9;
            }

            .booking-ref-highlight {
                background: rgba(255,255,255,0.15);
                border-radius: var(--radius-md, 1rem);
                padding: 1rem;
                backdrop-filter: blur(5px);
                border: 1px solid rgba(255,255,255,0.2);
                display: inline-block;
            }

            .ref-label {
                display: block;
                font-size: 0.8rem;
                opacity: 0.8;
                margin-bottom: 0.25rem;
            }

            .ref-value {
                display: block;
                font-size: 1.2rem;
                font-weight: 700;
                font-family: var(--font-mono, 'Menlo', monospace);
                letter-spacing: 1.5px;
            }

            /* Cards */
            .booking-summary-card, .next-steps-card, .error-details-card, .error-actions-card {
                background: var(--card);
                margin: 1.5rem 0;
                border-radius: var(--radius-lg, 1.3rem);
                box-shadow: var(--shadow-md, 0px 2px 4px -1px rgba(0,0,0,0.1));
                border: 1px solid var(--border);
                overflow: hidden;
                padding: 1.25rem 1.5rem; /* padding melhorado */
            }

            .card-header {
                background: var(--muted);
                padding: 1rem 1.5rem;
                border-bottom: 1px solid var(--border);
            }

            .card-header h3 {
                margin: 0;
                font-size: 1.1rem;
                font-weight: 600;
                color: var(--card-foreground);
            }

            .card-body {
                padding: 1.5rem;
            }

            /* Summary Items */
            .summary-item {
                display: flex;
                align-items: center;
                padding: 1rem 0;
                border-bottom: 1px solid var(--border);
            }

            .summary-item:last-child {
                border-bottom: none;
            }

            .item-icon {
                font-size: 1.5rem;
                margin-right: 1.5rem;
                color: var(--accent-foreground);
            }

            .item-content {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
            }

            /* Espaçamento uniforme para divs internas do booking-step-content */
            #booking-step-content > div,
            #booking-step-content > .step-content,
            #booking-step-content > .form-section,
            #booking-step-content > .booking-section,
            #booking-step-content > .confirmation-message {
                margin-top: 20px;
                margin-bottom: 20px;
            }

            #booking-step-content > div:first-child,
            #booking-step-content > .step-content:first-child,
            #booking-step-content > .form-section:first-child,
            #booking-step-content > .booking-section:first-child,
            #booking-step-content > .confirmation-message:first-child {
                margin-top: 0;
            }

            #booking-step-content > div:last-child,
            #booking-step-content > .step-content:last-child,
            #booking-step-content > .form-section:last-child,
            #booking-step-content > .booking-section:last-child,
            #booking-step-content > .confirmation-message:last-child {
                margin-bottom: 0;
            }

            .item-label {
                font-size: 0.85rem;
                color: var(--muted-foreground);
                margin-bottom: 0.25rem;
            }

            .item-value {
                font-size: 1rem;
                font-weight: 600;
                color: var(--foreground);
            }

            /* Next Steps */
            .step-item {
                display: flex;
                align-items: flex-start;
                margin-bottom: 1.5rem;
            }

            .step-item:last-child {
                margin-bottom: 0;
            }

            .step-number {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: var(--primary);
                color: var(--primary-foreground);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 1rem;
                margin-right: 1rem;
                flex-shrink: 0;
            }

            .step-content h4 {
                margin: 0 0 0.5rem 0;
                font-size: 1rem;
                font-weight: 600;
            }

            .step-content p {
                margin: 0;
                font-size: 0.9rem;
                color: var(--muted-foreground);
                line-height: 1.5;
            }

            /* Error State */
            .error-hero {
                color: var(--destructive);
                padding: 2.5rem 1.5rem;
                text-align: center;
            }

            .error-circle {
                width: 80px;
                height: 80px;
                margin: 0 auto 1.5rem;
            }

            .error-icon {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .error-cross {
                background: var(--destructive);
                border-radius: 50%;
            }

            .error-circle-bg {
                stroke: var(--destructive-foreground);
                stroke-width: 2;
                opacity: 0.3;
            }

            .error-cross-line1,
            .error-cross-line2 {
                stroke: var(--destructive-foreground);
                stroke-width: 3;
                stroke-linecap: round;
            }

            .error-title {
                font-size: 1.8rem;
                font-weight: 700;
                margin: 0 0 0.5rem 0;
            }

            .error-subtitle {
                font-size: 1rem;
                opacity: 0.9;
            }

            .retry-button, .contact-button {
                background: var(--primary);
                color: var(--primary-foreground);
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: var(--radius-md, 1rem);
                cursor: pointer;
                font-size: 0.9rem;
                margin: 0.5rem;
                transition: background 0.2s;
            }

            .retry-button:hover, .contact-button:hover {
                background: var(--secondary);
                color: var(--secondary-foreground);
            }

            /* Error Actions Card */
            .error-actions-card {
                background: var(--card);
                border: 1px solid var(--border);
                border-radius: var(--radius-lg, 1.3rem);
                padding: 0;
                margin: 1.5rem 0;
            }

            .error-actions-card h4 {
                background: var(--muted);
                margin: 0;
                padding: 1rem 1.5rem;
                border-bottom: 1px solid var(--border);
                font-size: 1.1rem;
                font-weight: 600;
                color: var(--card-foreground);
            }

            .actions-grid {
                padding: 1.5rem;
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 1.25rem;
                max-width: 720px;
                margin: 0 auto;
                width: 100%;
            }

            .action-item {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1.25rem 1.5rem;
                background: var(--background);
                border: 1px solid var(--border);
                border-radius: var(--radius-md, 1rem);
                transition: all 0.2s ease;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            }

            .action-item:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                border-color: var(--primary);
            }

            .action-icon {
                font-size: 1.5rem;
                flex-shrink: 0;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--accent);
                border-radius: 50%;
            }

            .action-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
            }

            .action-content h4 {
                margin: 0 0 0.5rem 0;
                font-size: 1.1rem;
                font-weight: 600;
                color: var(--foreground);
                background: none;
                padding: 0;
                border: none;
                line-height: 1.3;
            }

            .action-content p {
                margin: 0 0 1rem 0;
                font-size: 0.95rem;
                color: var(--muted-foreground);
                line-height: 1.5;
                flex-grow: 1;
            }

            .action-btn {
                background: var(--primary);
                color: var(--primary-foreground);
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: var(--radius-md, 1rem);
                cursor: pointer;
                font-size: 0.9rem;
                font-weight: 600;
                transition: all 0.2s;
            }

            .action-btn:hover {
                background: var(--secondary);
                color: var(--secondary-foreground);
                transform: translateY(-1px);
            }

            .retry-btn {
                background: var(--chart-2);
                color: var(--primary-foreground);
            }

            .retry-btn:hover {
                background: var(--chart-4);
            }

            .secondary-btn {
                background: var(--secondary);
                color: var(--secondary-foreground);
            }

            .secondary-btn:hover {
                background: var(--muted);
                color: var(--muted-foreground);
            }

            .contact-btn {
                background: var(--chart-1);
                color: var(--primary-foreground);
            }

            .contact-btn:hover {
                background: var(--chart-3);
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

            /* Responsividade para tablets */
            @media (max-width: 1024px) and (min-width: 769px) {
                .actions-grid {
                    max-width: 500px;
                    padding: 1.25rem;
                }

                .action-item {
                    padding: 1.25rem;
                }
            }

            /* Responsividade para mobile */
            @media (max-width: 768px) {
                .success-hero, .pending-hero, .error-hero {
                    padding: 40px 20px;
                }

                .success-title, .pending-title, .error-title {
                    font-size: 2rem;
                }

                .steps-grid, .actions-grid {
                    grid-template-columns: 1fr;
                    padding: 1rem;
                    max-width: 100%;
                    margin: 0;
                }

                .action-item {
                    flex-direction: column;
                    text-align: center;
                    padding: 1.25rem;
                    gap: 0.75rem;
                }

                .action-icon {
                    margin-bottom: 0.5rem;
                }

                .action-content {
                    width: 100%;
                }

                .action-btn {
                    width: 100%;
                    padding: 1rem 1.5rem;
                    font-size: 1rem;
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

                // CORREÇÃO: Não criar erro genérico que sobrescreve erro específico da API
                // Se chegou aqui, significa que não houve exceção mas resultado é inválido
                // Vamos preservar qualquer erro específico que já foi capturado
                if (lastError && lastError.isViatorApiError) {
                    throw lastError; // Preservar erro específico da API
                } else {
                    throw new Error('Resultado inválido');
                }

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

    // CORREÇÃO: Método utilitário faltante usado na confirmação
    formatDate(date) {
        try {
            if (!date) return '';
            const d = (date instanceof Date) ? date : new Date(date);
            if (isNaN(d.getTime())) return String(date);
            return d.toISOString().split('T')[0];
        } catch (_e) {
            return String(date || '');
        }
    }

	// Novo: formatação apenas para exibição em pt-BR (dd/MM/yyyy)
	formatDateDisplayPtBR(date) {
		try {
			if (!date) return '';
			// Se já vier no padrão ISO (YYYY-MM-DD[...]) formatar sem risco de timezone
			if (typeof date === 'string') {
				const m = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
				if (m) {
					return `${m[3]}/${m[2]}/${m[1]}`;
				}
				// Se já estiver em dd/MM/yyyy, apenas retornar
				const br = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
				if (br) return date;
			}
			// Fallback: tentar construir Date e formatar manualmente
			const d = (date instanceof Date) ? date : new Date(date);
			if (isNaN(d.getTime())) return String(date);
			const yyyy = d.getFullYear();
			const mm = String(d.getMonth() + 1).padStart(2, '0');
			const dd = String(d.getDate()).padStart(2, '0');
			return `${dd}/${mm}/${yyyy}`;
		} catch (_e) {
			return String(date || '');
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
            // Verificar consistência entre seleção da Etapa 1 e faixas etárias atribuídas aos viajantes
            try {
                const allocation = this.bookingData.travelerAgeBandAllocation || [];
                const expected = [];
                (this.bookingData.selectedTravelers || []).forEach(group => {
                    const count = Number(group.numberOfTravelers) || 0;
                    for (let i = 0; i < count; i++) expected.push(group.ageBand);
                });
                if (allocation.length > 0 && expected.length > 0) {
                    const allocSorted = [...allocation].sort();
                    const expSorted = [...expected].sort();
                    if (allocSorted.join(',') !== expSorted.join(',')) {
                        errors.push('Distribuição de faixas etárias inconsistente com a Etapa 1');
                    }
                }
            } catch (_) {}
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

                // Melhorar mensagem de erro para o usuário
                let userMessage = 'Não foi possível verificar a disponibilidade. Tente novamente em alguns instantes.';

                // Se há uma mensagem específica e amigável, usar ela
                if (data.data?.message && typeof data.data.message === 'string' && !data.data.message.toLowerCase().includes('internal server error')) {
                    userMessage = data.data.message;
                } else if (data.data?.message && typeof data.data.message === 'object') {
                    // Se for um objeto, tentar extrair uma mensagem útil
                    const extractedMessage = data.data.message.message || data.data.message.error || data.data.message.description;
                    if (extractedMessage && typeof extractedMessage === 'string' && !extractedMessage.toLowerCase().includes('internal server error')) {
                        userMessage = extractedMessage;
                    }
                }

                this.showPriceError(userMessage);
                this.stopButtonLoadingAnimation(); // Parar animação em caso de erro
            }
        } catch (error) {
            console.log('❌ Erro na requisição:', error);
            this.showPriceError('Erro de conexão. Verifique sua internet e tente novamente.');
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
            <div class="price-error" style="
                text-align: center;
                padding: 20px;
                background: #f8d7da;
                border: 1px solid #f5c6cb;
                border-radius: 8px;
                color: #721c24;
                margin: 20px 0;
            ">
                <div class="error-icon" style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
                <div>${message}</div>
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

    showDateError(message, type = 'error', trackingId = null) {
        // CORREÇÃO: Criar mensagem específica com trackingId se fornecido
        let finalMessage = message;

        // Se trackingId foi fornecido, criar mensagem específica
        if (trackingId) {
            finalMessage = `Erro no processamento da reserva: Internal server error. ID de rastreamento: ${trackingId}. Por favor, entre em contato com o suporte.`;
            this.specificErrorAlreadyDisplayed = true;
            console.log('✅ Erro específico da API com trackingId criado:', trackingId);
        }

        // Verificar se é uma mensagem genérica e já temos erro específico
        const isGenericMessage = message.includes('Erro no processamento do pagamento') ||
                                message.includes('Resultado inválido');

        if (isGenericMessage && this.specificErrorAlreadyDisplayed && !trackingId) {
            console.log('⚠️ Mensagem genérica ignorada - erro específico já foi exibido');
            console.log('📝 Mensagem ignorada:', message);
            console.log('✅ Erro específico já exibido anteriormente');
            return; // Não exibir mensagem genérica se já temos erro específico
        }

        // Marcar se é uma mensagem específica da API (com trackingId)
        const isSpecificApiError = finalMessage.includes('ID de rastreamento:') ||
                                  finalMessage.includes('Internal server error') ||
                                  finalMessage.includes('trackingId') ||
                                  trackingId;

        if (isSpecificApiError) {
            this.specificErrorAlreadyDisplayed = true;
            console.log('✅ Erro específico da API detectado - marcando como exibido');
        }

        // 1. Primeiro, tentar o elemento original (etapa 1)
        const errorElement = document.getElementById('date-error-message');
        if (errorElement) {
            errorElement.textContent = finalMessage;
            errorElement.style.display = 'block';
            errorElement.className = type === 'warning' ? 'warning-message' : 'error-message';

            // Auto-hide warnings after 5 seconds
            if (type === 'warning') {
                setTimeout(() => {
                    this.hideDateError();
                }, 5000);
            }

            this.debugLog(`User message displayed (${type}) - Message: ${finalMessage}`, {
                message: finalMessage,
                type: type,
                elementFound: true,
                location: 'date-error-message',
                isSpecificError: isSpecificApiError,
                trackingId: trackingId
            });

            return;
        }

        // 2. Exibir erro no topo da etapa ATUAL (sem navegar) com o mesmo padrão visual da etapa 2
        const currentStep = this.currentStep || 1;
        const stepContainer = document.querySelector('#booking-step-content .booking-step');

        // Criar/usar um contêiner genérico de erro por etapa
        let stepErrorEl = stepContainer ? stepContainer.querySelector('#step-error-message') : null;
        if (!stepErrorEl && stepContainer) {
            stepErrorEl = document.createElement('div');
            stepErrorEl.id = 'step-error-message';
            stepErrorEl.className = type === 'warning' ? 'warning-message' : 'error-message';
            stepContainer.insertBefore(stepErrorEl, stepContainer.firstChild);
        }

        if (stepErrorEl) {
            stepErrorEl.textContent = finalMessage;
            stepErrorEl.style.display = 'block';
            stepErrorEl.className = type === 'warning' ? 'warning-message' : 'error-message';
            stepErrorEl.classList.add('show');

            // Scroll para o topo da área da modal para garantir visibilidade
            const modalBody = document.querySelector('.viator-modal-body');
            if (modalBody) {
                modalBody.scrollTop = 0;
            } else {
                stepErrorEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            // Focar no primeiro campo inválido se existir
            const firstInvalid = document.querySelector('#booking-step-content .is-invalid, #booking-step-content [required]:invalid, #booking-step-content .question-input.is-invalid');
            if (firstInvalid && typeof firstInvalid.focus === 'function') {
                setTimeout(() => firstInvalid.focus(), 0);
            }

            // Auto-hide para avisos
            if (type === 'warning') {
                setTimeout(() => {
                    if (stepErrorEl) {
                        stepErrorEl.style.display = 'none';
                        stepErrorEl.textContent = '';
                        stepErrorEl.classList.remove('show');
                    }
                }, 5000);
            }
        }

        this.debugLog(`User message displayed (${type}) - Message: ${finalMessage}`, {
            message: finalMessage,
            type: type,
            elementFound: Boolean(stepErrorEl),
            location: 'current-step',
            navigatedToStep5: false,
            isSpecificError: isSpecificApiError
        });
    }

    /**
     * CORREÇÃO: Extrair trackingId da mensagem de erro para exibição
     */
    extractTrackingIdFromMessage(message) {
        const trackingMatch = message.match(/ID de rastreamento:\s*([A-Z0-9:_]+)/);
        return trackingMatch ? trackingMatch[1] : null;
    }
    
    hideDateError() {
        // CORREÇÃO: Ocultar erro do elemento principal (etapa 1)
        const errorElement = document.getElementById('date-error-message');
        if (errorElement) {
            errorElement.style.display = 'none';
            errorElement.textContent = '';
        }

        // Ocultar erro do topo da etapa atual (mensagem padronizada)
        const stepErrorEl = document.querySelector('#booking-step-content #step-error-message');
        if (stepErrorEl) {
            stepErrorEl.style.display = 'none';
            stepErrorEl.textContent = '';
            stepErrorEl.classList.remove('show');
        }

        // CORREÇÃO: Limpar mensagem de erro na etapa 5 (Confirmação)
        // Isso é feito resetando o container de confirmação
        const confirmationContainer = document.querySelector('.confirmation-message');
        if (confirmationContainer) {
            confirmationContainer.innerHTML = '';
        }

        // CORREÇÃO: Resetar flag de erro específico para permitir novos erros
        this.specificErrorAlreadyDisplayed = false;
        console.log('🔄 Flag de erro específico resetada');
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

    /**
     * FASE 1.1: Formatar resposta para conformidade total com documentação Viator
     */
    formatBookingAnswer(question, answerData, travelerNum = null) {
        const baseAnswer = {
            question: question.id,
            answer: answerData.answer
        };

        // Adicionar travelerNum se aplicável (BASE 1, não 0 - conforme documentação)
        if (travelerNum !== null && question.group === 'PER_TRAVELER') {
            baseAnswer.travelerNum = parseInt(travelerNum) + 1; // Converter para base 1
        }

        // Tratar tipos especiais conforme documentação Viator
        switch (question.type) {
            case 'LOCATION_REF_OR_FREE_TEXT':
                const unit = answerData.unit || 'FREETEXT';
                baseAnswer.unit = unit;
                break;

            case 'SELECT':
                // Garantir que a resposta está nas opções permitidas
                const allowedAnswers = question.allowedAnswers || [];
                const allowed = allowedAnswers.map(opt => opt.answer);
                if (allowed.length > 0 && !allowed.includes(baseAnswer.answer)) {
                    throw new Error(`Resposta inválida para pergunta: ${question.label}`);
                }
                break;

            case 'NUMBER':
                // Garantir que é um número válido
                const numValue = parseFloat(baseAnswer.answer);
                if (isNaN(numValue)) {
                    throw new Error(`Valor numérico inválido para: ${question.label}`);
                }
                baseAnswer.answer = numValue.toString();
                break;
        }

        return baseAnswer;
    }

    /**
     * FASE 1.2: Processar perguntas PER_OPTION conforme documentação
     */
    processPerOptionQuestions(allAnswers, selectedOptions) {
        const perOptionAnswers = [];

        allAnswers.forEach(answer => {
            if (answer.optionId && selectedOptions.includes(answer.optionId)) {
                perOptionAnswers.push({
                    question: answer.question || answer.questionId, // CORREÇÃO: Usar formato correto
                    answer: answer.answer,
                    optionId: answer.optionId
                });
            }
        });

        return perOptionAnswers;
    }

    /**
     * FASE 1.3: Validação completa de dependências condicionais
     */
    validateConditionalQuestionsComplete(answers, questions) {
        const errors = [];
        const answerMap = this.buildAnswerMap(answers);

        questions.forEach(question => {
            if ((question.required || '') === 'CONDITIONAL') {
                const conditionalErrors = this.validateSingleConditional(question, answerMap);
                errors.push(...conditionalErrors);
            }
        });

        return errors;
    }

    /**
     * Construir mapa de respostas para validação condicional
     */
    buildAnswerMap(answers) {
        const map = {};
        answers.forEach(answer => {
            let key = answer.questionId;
            if (answer.travelerNum) {
                key += '_t' + answer.travelerNum;
            }
            if (answer.optionId) {
                key += '_o' + answer.optionId;
            }
            map[key] = answer.answer;
        });
        return map;
    }

    /**
     * Validar uma pergunta condicional específica
     */
    validateSingleConditional(question, answerMap) {
        const errors = [];

        // Implementar lógica de validação condicional baseada na documentação
        // Por enquanto, retorna array vazio - será expandido conforme necessário

        return errors;
    }

    /**
     * FASE 2.1: Rate limiting robusto conforme documentação
     */
    enforceRateLimit(endpointType = 'booking') {
        const limits = {
            'booking': { requests: 100, window: 60 },
            'search': { requests: 200, window: 60 },
            'availability': { requests: 150, window: 60 }
        };

        const limitConfig = limits[endpointType] || limits['booking'];
        const storageKey = `viator_rate_limit_${endpointType}`;

        // Obter requests do localStorage
        let requests = [];
        try {
            const stored = localStorage.getItem(storageKey);
            requests = stored ? JSON.parse(stored) : [];
        } catch (e) {
            requests = [];
        }

        const now = Date.now();

        // Limpar janela de tempo
        requests = requests.filter(timestamp => (now - timestamp) < (limitConfig.window * 1000));

        if (requests.length >= limitConfig.requests) {
            throw new Error(`Rate limit excedido para ${endpointType}. Aguarde alguns minutos.`);
        }

        requests.push(now);

        try {
            localStorage.setItem(storageKey, JSON.stringify(requests));
        } catch (e) {
            console.warn('Não foi possível salvar rate limit no localStorage');
        }

        return true;
    }

    /**
     * FASE 2.2: Tratamento de erros conforme padrões oficiais
     */
    handleApiResponse(response, context = 'general') {
        if (!response.ok) {
            let errorMessage = `Erro HTTP ${response.status}`;

            // Mapear códigos de erro específicos da Viator
            switch (response.status) {
                case 400:
                    errorMessage = 'Dados inválidos enviados para a API';
                    break;
                case 401:
                    errorMessage = 'Erro de autenticação. Verifique as credenciais da API';
                    break;
                case 403:
                    errorMessage = 'Acesso negado. Verifique as permissões da API';
                    break;
                case 404:
                    errorMessage = 'Recurso não encontrado';
                    break;
                case 429:
                    errorMessage = 'Muitas requisições. Aguarde alguns minutos';
                    break;
                case 500:
                    errorMessage = 'Erro interno do servidor Viator';
                    break;
                case 503:
                    errorMessage = 'Serviço temporariamente indisponível';
                    break;
            }

            this.logBookingEvent('api_error', {
                context: context,
                status: response.status,
                message: errorMessage
            }, 'error');

            throw new Error(errorMessage);
        }

        return response;
    }

    /**
     * FASE 2.3: Validação de maxLength conforme documentação
     */
    validateAnswerFormat(question, answer) {
        const validators = {
            'EMAIL': (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
            'PHONE': (val) => /^[\+]?[\d\s\-\(\)]{8,}$/.test(val),
            'DATE': (val) => /^\d{4}-\d{2}-\d{2}$/.test(val),
            'NUMBER': (val) => !isNaN(parseFloat(val)) && isFinite(val)
        };

        const validator = validators[question.type];
        if (validator && !validator(answer)) {
            return `Formato inválido para ${question.label}`;
        }

        // Validar maxLength
        if (question.maxLength && answer.length > question.maxLength) {
            return `Máximo ${question.maxLength} caracteres para ${question.label}`;
        }

        return null;
    }

    /**
     * FASE 4.1: Sistema de logs estruturado
     */
    logBookingEvent(eventType, data, level = 'info') {
        if (!window.VIATOR_DEBUG && level !== 'error') return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            event: eventType,
            level: level,
            data: data,
            url: window.location.href
        };

        const logMessage = `[${level.toUpperCase()}] ${eventType}: ${JSON.stringify(data)}`;

        if (level === 'error') {
            console.error(logMessage);
        } else if (level === 'warn') {
            console.warn(logMessage);
        } else {
            console.log(logMessage);
        }

        // Salvar logs críticos no localStorage para análise
        if (['error', 'critical'].includes(level)) {
            try {
                let criticalLogs = JSON.parse(localStorage.getItem('viator_critical_logs') || '[]');
                criticalLogs.push(logEntry);

                // Manter apenas últimos 50 logs críticos
                if (criticalLogs.length > 50) {
                    criticalLogs = criticalLogs.slice(-50);
                }

                localStorage.setItem('viator_critical_logs', JSON.stringify(criticalLogs));
            } catch (e) {
                console.warn('Não foi possível salvar log crítico');
            }
        }
    }
    /**
     * FASE 3.1: Sistema de cache inteligente com validação
     */
    getSmartCachedData(cacheKey, maxAgeHours = 6) {
        try {
            const cached = localStorage.getItem(cacheKey);
            if (!cached) return false;

            const cacheData = JSON.parse(cached);
            if (!cacheData.data || !cacheData.timestamp || !cacheData.version) {
                return false;
            }

            const ageHours = (Date.now() - cacheData.timestamp) / (1000 * 60 * 60);
            const currentVersion = window.VIATOR_CACHE_VERSION || '1.0';

            if (ageHours < maxAgeHours && cacheData.version === currentVersion) {
                this.logBookingEvent('cache_hit', {
                    key: cacheKey,
                    age_hours: ageHours.toFixed(2)
                });
                return cacheData.data;
            }

            // Cache expirado ou versão diferente
            localStorage.removeItem(cacheKey);
            return false;
        } catch (e) {
            this.logBookingEvent('cache_error', {
                key: cacheKey,
                error: e.message
            }, 'warn');
            return false;
        }
    }

    /**
     * Definir cache inteligente
     */
    setSmartCache(cacheKey, data, hours = 6) {
        try {
            const cacheData = {
                data: data,
                timestamp: Date.now(),
                version: window.VIATOR_CACHE_VERSION || '1.0'
            };

            localStorage.setItem(cacheKey, JSON.stringify(cacheData));

            this.logBookingEvent('cache_set', {
                key: cacheKey,
                hours: hours,
                data_size: JSON.stringify(data).length
            });
        } catch (e) {
            this.logBookingEvent('cache_set_error', {
                key: cacheKey,
                error: e.message
            }, 'warn');
        }
    }
    /**
     * FASE 3.2: Validações avançadas com cache
     */
    async validateWithCache(question, answer) {
        // Usar cache para validações que requerem dados externos
        if (question.type === 'SELECT' && question.allowedAnswers) {
            const cacheKey = `validation_${question.id}`;
            let allowedAnswers = this.getSmartCachedData(cacheKey, 24); // Cache por 24h

            if (!allowedAnswers) {
                allowedAnswers = question.allowedAnswers;
                this.setSmartCache(cacheKey, allowedAnswers, 24);
            }

            const allowed = allowedAnswers.map(opt => opt.answer);
            if (!allowed.includes(answer)) {
                return `Resposta inválida para ${question.label}`;
            }
        }

        return this.validateAnswerFormat(question, answer);
    }

    /**
     * FASE 3.3: Otimização de requisições com debounce
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * FASE 3.4: Monitoramento de performance
     */
    measurePerformance(operation, func) {
        const startTime = performance.now();

        const result = func();

        if (result && typeof result.then === 'function') {
            // Função assíncrona
            return result.then(data => {
                const endTime = performance.now();
                this.logBookingEvent('performance', {
                    operation: operation,
                    duration_ms: (endTime - startTime).toFixed(2),
                    type: 'async'
                });
                return data;
            });
        } else {
            // Função síncrona
            const endTime = performance.now();
            this.logBookingEvent('performance', {
                operation: operation,
                duration_ms: (endTime - startTime).toFixed(2),
                type: 'sync'
            });
            return result;
        }
    }
}

// Adicionar função global para facilitar teste via console
window.testViatorAPI = function() {
    const bookingManager = new ViatorBookingManager();
    return bookingManager.testApiAccess();
};

// Garantir que a instância global seja inicializada
if (!window.viatorBookingManager) {
    document.addEventListener('DOMContentLoaded', function() {
        if (!window.viatorBookingManager) {
            window.viatorBookingManager = new ViatorBookingManager();
            window.viatorBookingManager.init();
        }
    });
}