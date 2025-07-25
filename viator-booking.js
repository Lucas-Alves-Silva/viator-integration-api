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
        this.bookingData = {
            productCode: null,
            availabilityData: null,
            holdData: null,
            paymentToken: null
        };
        this.availableDates = new Set(); // Armazenar datas disponíveis
        this.steps = ['availability', 'travelers', 'payment', 'confirmation'];
        this.ageBands = []; // Array para armazenar as regras de viajantes
        this.bookingQuestions = []; // Armazenar perguntas de reserva do endpoint /products/booking-questions
        this.pageBookingQuestions = []; // Armazenar perguntas de reserva da página de produto único
    }
    
    init() {
        this.attachEvents();
        this.extractProductCode();
    }
    
    extractProductCode() {
        // Extrair o código do produto da URL ou de um elemento hidden
        const urlParams = new URLSearchParams(window.location.search);
        this.bookingData.productCode = urlParams.get('product') || 
                                      document.querySelector('[data-product-code]')?.dataset.productCode;
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
        // Se ainda não temos product_code, tentar extrair novamente
        if (!this.bookingData.productCode) {
            this.extractProductCode();
        }
        
        console.log('🔍 [BOOKING QUESTIONS DEBUG] Product code no openBookingModal:', this.bookingData.productCode);
        
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
                        <span class="step-label">Pagamento</span>
                    </div>
                    <div class="progress-step" data-step="4">
                        <span class="step-number">4</span>
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
                content.innerHTML = this.getPaymentStepHTML();
                await this.initializePaymentStep();
                break;
            case 4:
                content.innerHTML = this.getConfirmationStepHTML();
                // Se já temos dados de confirmação, exibir imediatamente
                if (this.bookingData.confirmationData) {
                    console.log('🎨 Exibindo confirmação na etapa 4 com dados existentes');
                    this.displayConfirmationMessage(this.bookingData.confirmationData);
                } else if (this.bookingData.paymentToken) {
                    // Se temos token de pagamento mas não confirmação, fazer confirmação agora
                    console.log('🎯 Iniciando confirmação na etapa 4');
                    this.confirmBooking();
                } else {
                    console.error('❌ Chegou na etapa 4 sem token de pagamento!');
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
        backBtn.style.display = this.currentStep > 1 && this.currentStep < 4 ? 'inline-block' : 'none';
        
        // Garante que o botão de próximo esteja visível, exceto na confirmação
        nextBtn.style.display = this.currentStep < 4 ? 'inline-block' : 'none';
        
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
                nextBtn.textContent = 'Processar Pagamento';
                break;
            case 4:
                // No passo de confirmação, não há "próximo" ou "voltar"
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
                    <h4>📋 Resumo dos Viajantes</h4>
                    <div id="travelers-summary"></div>
                </div>
                
                <!-- 2) Informações do Responsável pela Reserva -->
                <div class="booker-info-section">
                    <h4>👤 Informações do Responsável pela Reserva</h4>
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
                    <h4>📝 Informações Adicionais da Reserva</h4>
                    
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
                
                <div class="payment-summary">
                    <h4>Resumo da Reserva</h4>
                    <div id="booking-summary"></div>
                </div>
                
                <div class="payment-form">
                    <h4>Dados do Cartão de Crédito</h4>
                    
                    <div class="security-notice">
                        <div class="security-badge">
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
                    
                    <h4>Endereço de Cobrança</h4>
                    
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
                <div class="confirmation-message">
                    <!-- Gerado dinamicamente -->
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
            });
        });
        
        // Setup price updater
        console.log('🔧 Chamando setupPriceUpdater...');
        this.setupPriceUpdater();
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
    }
    
    setupBookerInfoValidation() {
        const bookerFirstname = document.getElementById('booker-firstname');
        const bookerLastname = document.getElementById('booker-lastname');
        const bookerEmail = document.getElementById('booker-email');
        const bookerPhone = document.getElementById('booker-phone');
        
        // Função para limpar erro de campo específico
        const clearFieldError = (field) => {
            field.classList.remove('error');
            const existingError = field.parentNode.querySelector('.error-message');
            if (existingError) {
                existingError.remove();
            }
        };
        
        // Função para mostrar erro de campo específico
        const showFieldError = (field, message) => {
            clearFieldError(field);
            field.classList.add('error');
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = message;
            field.parentNode.appendChild(errorDiv);
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
                this.payment = window.Payment.init(this.bookingData.holdData.paymentSessionToken);
                console.log('✅ Sistema de pagamento da Viator inicializado com detecção de fraude');
            } else {
                console.error('❌ Biblioteca de pagamento da Viator não carregada');
                console.error('🔗 Verifique se https://checkout-assets.payments.tamg.cloud/stable/v2/payment.js está carregado');
            }
        } else {
            console.error('❌ PaymentSessionToken não disponível para inicializar sistema de pagamento');
        }
    }
    
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
        const pickupQuestions = this.bookingQuestions.filter(q => 
            q.group === 'PER_BOOKING' && q.id === 'PICKUP_POINT'
        );
        
        if (pickupQuestions.length === 0) {
            return '';
        }
        
        const question = pickupQuestions[0];
        const questionId = `booking_question_${question.id}`;
        const isRequired = question.required === 'MANDATORY';
        const requiredMark = isRequired ? ' *' : '';
        
        let dataAttrs = `data-question-id="${question.id}" data-group="${question.group}"`;
        const requiredAttr = isRequired ? 'required' : '';
        
        let html = '<div class="pickup-point-question-group">';
        html += `<label for="${questionId}">${question.label}${requiredMark}</label>`;
        html += this.renderQuestionField(question, questionId, isRequired, false, null);
        html += `<div class="error-message" id="error_${questionId}" style="display: none;"></div>`;
        html += '</div>';
        
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
                    // Placeholder específico para requisitos especiais
                    let placeholderAttr = '';
                    if (question.id === 'SPECIAL_REQUIREMENTS') {
                        placeholderAttr = ' placeholder="Restrições alimentares, acessibilidade, etc."';
                    }
                    html += `<input type="text" id="${questionId}" name="${questionId}" class="${cssClass}" ${dataAttrs} ${requiredAttr} maxlength="${question.maxLength || ''}"${placeholderAttr}>`;
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
                    
                    html += `<select name="${questionId}_unit" class="${cssClass}" data-question-id="${question.id}" ${isTraveler ? `data-traveler="${travelerIndex}"` : ''} ${shouldDisable ? 'disabled' : ''}>`;
                    question.units.forEach(unit => {
                        html += `<option value="${unit}">${unit}</option>`;
                    });
                    html += `</select>`;
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
                // Placeholder específico para requisitos especiais
                let placeholderText = question.hint || '';
                if (question.id === 'SPECIAL_REQUIREMENTS') {
                    placeholderText = 'Restrições alimentares, acessibilidade, etc.';
                }
                html += `<textarea id="${questionId}" name="${questionId}" class="${cssClass}" ${dataAttrs} rows="3" ${requiredAttr} placeholder="${placeholderText}"></textarea>`;
                break;

            default:
                // Placeholder específico para requisitos especiais
                let placeholderAttr = '';
                if (question.id === 'SPECIAL_REQUIREMENTS') {
                    placeholderAttr = ' placeholder="Restrições alimentares, acessibilidade, etc."';
                }
                html += `<input type="text" id="${questionId}" name="${questionId}" class="${cssClass}" ${dataAttrs} ${requiredAttr} maxlength="${question.maxLength || ''}"${placeholderAttr}>`;
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
     * Renderizar seleção de ponto de encontro
     */
    renderPickupPointSelection(question, questionId, dataAttrs, requiredAttr) {
        let html = '';
        const startLocations = window.productData?.logistics?.start || [];

        // Container que será preenchido com os detalhes do local
        html += `<div id="${questionId}_options_container" class="pickup-point-selection-container">`;
        html += `<p class="pickup-point-description">Escolha o ponto de encontro para sua experiência. Os detalhes completos do endereço serão exibidos abaixo.</p>`;
        html += `<div class="loading-locations">Carregando locais de encontro... <span class="spinner"></span></div>`;
        html += `</div>`;

        // Buscar detalhes das localizações via /locations/bulk
        if (startLocations.length > 0) {
            this.loadLocationDetails(startLocations, questionId);
        } else {
            const container = document.getElementById(`${questionId}_options_container`);
            if(container) container.innerHTML = '<p>Não há pontos de encontro especificados para este produto.</p>';
        }
        
        return html;
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
     * Agrupar locais de pickup por tipo
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
     * Carregar detalhes das localizações via API /locations/bulk
     */
    async loadLocationDetails(locations, questionId) {
        console.log('🔍 loadLocationDetails chamada com:', { locations, questionId });
        
        const locationRefs = locations.map(loc => loc.location?.ref).filter(Boolean);
        console.log('📍 Referências de localização extraídas:', locationRefs);

        if (locationRefs.length === 0) {
            console.warn('⚠️ Nenhuma referência de localização encontrada');
            const container = document.getElementById(`${questionId}_options_container`);
            if(container) container.innerHTML = '<p>Não foi possível encontrar referências de localização para os pontos de encontro.</p>';
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
                this.updateLocationDisplay(result.data, questionId, locations);
            } else {
                console.error('❌ Resposta da API não foi bem-sucedida:', result);
                throw new Error(result.data?.message || 'A resposta da API não foi bem-sucedida.');
            }
        } catch (error) {
            console.error('💥 Erro ao carregar detalhes da localização:', error);
            const container = document.getElementById(`${questionId}_options_container`);
            if(container) container.innerHTML = `<p class="error-message">Ocorreu um erro ao carregar os detalhes do ponto de encontro. Por favor, tente novamente mais tarde.</p>`;
        }
    }
    
    /**
     * Atualizar a exibição com os detalhes da localização
     */
    updateLocationDisplay(locationDetails, questionId, originalLocations) {
        console.log('🎨 updateLocationDisplay chamada com:', { locationDetails, questionId, originalLocations });
        
        const container = document.getElementById(`${questionId}_options_container`);
        if (!container) {
            console.error('❌ Container não encontrado:', `${questionId}_options_container`);
            return;
        }

        let html = `<p class="pickup-point-description">Escolha o ponto de encontro para sua experiência.</p>`;

        locationDetails.forEach((detail, index) => {
            console.log(`🏷️ Processando localização ${index}:`, detail);
            
            const originalLocation = originalLocations.find(loc => loc.location.ref === detail.reference);
            
            // Obter informações formatadas da localização (evitando redundância)
            const locationInfo = this.getFormattedLocationInfo(detail);
            console.log(`📝 LocationInfo formatada para ${detail.reference}:`, locationInfo);

            // Usar locationInfo como endereço principal se disponível, senão usar fallback
            let address = locationInfo || 'Endereço não disponível';
            
            // Se locationInfo não está disponível, tentar obter endereço de outras formas
            if (!locationInfo) {
                if (detail.reference === 'CONTACT_SUPPLIER_LATER') {
                    address = 'O fornecedor entrará em contato para confirmar o local';
                } else if (detail.reference === 'MEET_AT_DEPARTURE_POINT') {
                    address = 'Detalhes do ponto de encontro serão fornecidos após a reserva';
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
                        address = parts.join(', ');
                    } else {
                        address = 'Local será confirmado pelo fornecedor';
                    }
                } else if (detail.reference && detail.reference.startsWith('LOC-')) {
                    if (detail.provider === 'GOOGLE' && detail.providerReference) {
                        address = 'Local específico (detalhes fornecidos no dia)';
                    } else if (detail.provider === 'TRIPADVISOR' && detail.providerReference) {
                        address = 'Ponto de interesse conhecido (detalhes confirmados após reserva)';
                    } else {
                        address = 'Local será confirmado pelo fornecedor';
                    }
                }
            }

            const radioId = `${questionId}_${index}`;
            html += `
                <div class="pickup-option-wrapper">
                    <input type="radio" id="${radioId}" name="${questionId}" value="${detail.reference}" ${index === 0 ? 'checked' : ''}>
                    <label for="${radioId}" class="pickup-option-label">
                        <div class="pickup-option-title">${detail.name}</div>
                        <div class="pickup-option-address">
                            <span class="pickup-option-icon">📍</span>
                            <span>${address}</span>
                        </div>
                    </label>
                </div>
            `;
        });

        // Adicionar a opção "Decidir depois"
        const decideLaterId = `${questionId}_decide_later`;
        html += `
            <div class="pickup-option-wrapper">
                <input type="radio" id="${decideLaterId}" name="${questionId}" value="CONTACT_SUPPLIER_LATER">
                <label for="${decideLaterId}" class="pickup-option-label">
                    <div class="pickup-option-title">Vou decidir depois</div>
                    <div class="pickup-option-description-extra">Você pode confirmar o ponto de encontro diretamente com o fornecedor após a reserva.</div>
                </label>
            </div>
        `;

        container.innerHTML = html;
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

    /**
     * Coletar respostas das perguntas de reserva
     */
    collectBookingQuestionAnswers() {
        const answers = [];
        
        // Coletar respostas das seções dedicadas primeiro
        this.collectPickupPointAnswers(answers);
        this.collectLanguageGuideAnswers(answers);
        
        this.bookingQuestions.forEach(question => {
            if (question.group === 'PER_BOOKING') {
                // Pular PICKUP_POINT e LANGUAGE_GUIDE pois já foram coletados nas seções dedicadas
                if (question.id === 'PICKUP_POINT' || 
                    question.subType === 'LANGUAGE_GUIDE' || 
                    question.label.toLowerCase().includes('idioma') || 
                    question.label.toLowerCase().includes('language')) {
                    return;
                }
                
                // Perguntas gerais da reserva
                const questionId = `booking_question_${question.id}`;
                const answer = this.collectQuestionAnswer(question, questionId, false, null);
                
                if (answer) {
                    answers.push(answer);
                }
            } else if (question.group === 'PER_TRAVELER') {
                // Perguntas por viajante
                if (this.bookingData.selectedTravelers) {
                    this.bookingData.selectedTravelers.forEach((travelerGroup, groupIndex) => {
                        for (let i = 0; i < travelerGroup.numberOfTravelers; i++) {
                            const travelerIndex = groupIndex * 10 + i; // Índice único para cada viajante
                            const questionId = `traveler_${travelerIndex}_question_${question.id}`;
                            const answer = this.collectQuestionAnswer(question, questionId, true, travelerIndex);
                            
                            if (answer) {
                                answer.travelerNum = travelerIndex + 1;
                                answers.push(answer);
                            }
                        }
                    });
                }
            }
        });
        
        console.log('📝 Respostas das perguntas de reserva coletadas:', answers);
        return answers;
    }
    
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
                            
                            if (selectedValue === 'custom_location' || selectedUnit === 'FREETEXT') {
                                // Coletar valor do campo "Outro local"
                                const otherTextField = document.getElementById(`${questionId}_other_text`);
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
                            
                            if (selectedValue === 'custom_location' || selectedUnit === 'FREETEXT') {
                                const otherTextField = document.getElementById(`${questionId}_other_text`);
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
            
            // Renderizar perguntas gerais (Requisitos Especiais e outras) excluindo PICKUP_POINT e LANGUAGE_GUIDE
            const generalQuestions = this.bookingQuestions.filter(q => 
                q.group === 'PER_BOOKING' && 
                q.id !== 'PICKUP_POINT' && 
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
                            errorDiv.textContent = 'Este campo é obrigatório.';
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
        cardInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            e.target.value = formattedValue;
        });
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
            if (this.currentStep < 4) {
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
        switch (this.currentStep) {
            case 1:
                return await this.checkAvailability();
            case 2:
                return this.validateTravelersInfo();
            case 3:
                return await this.processPayment();
            default:
                return true;
        }
    }
    
    async checkAvailability() {
        const travelDate = document.getElementById('travel-date-value').value;
        if (!travelDate) {
            this.showDateError('Por favor, selecione uma data de viagem antes de continuar.');
            return false;
        }

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
            this.showDateError('Por favor, clique em "Atualizar Preços" para verificar a disponibilidade e opções de passeio.');
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
                <h4>✅ Disponível!</h4>
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
        
        // Armazenar dados do booker no bookingData para uso posterior
        this.bookingData.bookerInfo = {
            firstname: bookerFirstname.value.trim(),
            lastname: bookerLastname.value.trim(),
            email: bookerEmail.value.trim(),
            phone: bookerPhone?.value.trim() || ''
        };
        
        console.log('✅ Dados do responsável armazenados:', this.bookingData.bookerInfo);
        
        return true;
    }
    
    async processPayment() {
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
            
            // Processar pagamento usando o hold existente
            const paymentResult = await this.submitPayment();
            if (!paymentResult) return false;
            
            console.log('✅ Pagamento processado com sucesso, pronto para confirmação na etapa 4');
            return true;
            
        } catch (error) {
            this.showDateError('Erro no processamento do pagamento: ' + error.message);
            return false;
        }
    }
    
    async requestBookingHoldForPayment() {
        try {
            const travelersDetails = this.collectDetailedTravelersData();
            
            // Simplificar o objeto enviado para o backend, passando apenas a opção selecionada
            // que já contém o 'fullOption' com o 'totalPrice'.
            const availabilityDataWithSelection = {
                selectedOption: this.bookingData.selectedOption,
                travelDate: this.bookingData.travelDate,
                productCode: this.bookingData.productCode,
                paxMix: this.collectTravelersData() // Adicionar paxMix para consistência
            };

            console.log('📋 Dados para hold (simplificado):', {
                availabilityData: availabilityDataWithSelection,
                travelersDetails: travelersDetails
            });
            
            // Verificar se viatorBookingAjax está disponível
            if (typeof viatorBookingAjax === 'undefined') {
                console.error('❌ viatorBookingAjax não está definido. Verifique se o script foi carregado corretamente.');
                return false;
            }
            
            const response = await fetch(viatorBookingAjax.ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'viator_request_hold',
                    availability_data: JSON.stringify(availabilityDataWithSelection),
                    travelers_details: JSON.stringify(travelersDetails),
                    booking_question_answers: JSON.stringify(travelersDetails.bookingQuestionAnswers || []),
                    nonce: viatorBookingAjax.nonce
                })
            });
            
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
            if (this.payment) {
                console.log('🔒 Submetendo dados de detecção de fraude...');
                this.payment.submitDeviceData();
                console.log('✅ Dados de detecção de fraude submetidos');
            } else {
                console.warn('⚠️ Sistema de detecção de fraude não inicializado');
            }
            
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
                    <div class="confirmation-header">
                        <div class="success-icon">✓</div>
                        <h3>🎉 Reserva Confirmada!</h3>
                        <p class="confirmation-subtitle">Sua experiência foi reservada com sucesso</p>
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
                            <span class="detail-label">💰 Valor Total:</span>
                            <span class="detail-value price">${currency} ${amount.toFixed(2)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">📧 Email de Confirmação:</span>
                            <span class="detail-value">${bookerEmail}</span>
                        </div>
                    </div>
                    
                    <div class="next-steps">
                        <h4>📋 Próximos Passos:</h4>
                        <ul>
                            <li>✅ Um email de confirmação foi enviado para <strong>${bookerEmail}</strong></li>
                            <li>📱 Você receberá seu voucher por email em breve</li>
                            <li>🎫 Apresente o voucher no dia da experiência</li>
                            <li>📞 Em caso de dúvidas, entre em contato conosco</li>
                        </ul>
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
                        <h4>ℹ️ Informações Importantes:</h4>
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
            html = `
                <div class="confirmation-error">
                    <div class="confirmation-header">
                        <div class="error-icon">❌</div>
                        <h3>❌ Falha na Reserva</h3>
                        <p class="confirmation-subtitle">Não foi possível completar sua reserva</p>
                    </div>
                    
                    <div class="error-details">
                        <p>Ocorreu um problema durante o processamento da sua reserva. Por favor, verifique os detalhes e tente novamente.</p>
                        
                        <div class="error-actions">
                            <h4>💡 O que você pode fazer:</h4>
                            <ul>
                                <li>🔄 Tente novamente em alguns minutos</li>
                                <li>💳 Verifique os dados do seu cartão</li>
                                <li>📞 Entre em contato conosco se o problema persistir</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        // Adicionar animação de entrada
        setTimeout(() => {
            container.classList.add('confirmation-loaded');
        }, 100);
    }
    
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
        
        // Coletar respostas das perguntas de reserva
        const bookingQuestionAnswers = this.collectBookingQuestionAnswers();
        
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
            } else {
                console.log('❌ Erro na resposta:', data);
                this.showPriceError('Erro: ' + (data.data?.message || 'Erro desconhecido'));
            }
        } catch (error) {
            console.log('❌ Erro na requisição:', error);
            this.showPriceError('Erro de conexão. Tente novamente.');
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

        // Organizar opções disponíveis
        const availableOptions = data.bookableItems.filter(item => item.available);

        if (availableOptions.length === 0) {
            this.showPriceError('Nenhuma opção disponível para esta data e quantidade de viajantes.');
            return;
        }

        // Agrupar opções por productOptionCode
        const groupedOptions = {};
        availableOptions.forEach(option => {
            const code = option.productOptionCode;
            if (!groupedOptions[code]) {
                groupedOptions[code] = [];
            }
            groupedOptions[code].push(option);
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
            
            optionsHTML += `
                <div class="product-option-card" data-option-code="${optionCode}" data-start-time="${optionsGroup[0].startTime || ''}">
                    <div class="option-header">
                        <div class="option-info">
                            <h6 class="option-title">${baseOption.optionTitle || optionCode}</h6>
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

        // Não selecionar nenhuma opção automaticamente
        this.bookingData.selectedOption = null;

        // Footer será atualizado apenas quando usuário selecionar uma opção
        console.log('💡 Opções exibidas - aguardando seleção do usuário');
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
                <div class="loading-spinner">↻</div>
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
            priceDisplay.style.display = 'none';
            priceDisplay.innerHTML = '';
        }
        
        if (footerSummary) {
            footerSummary.style.display = 'none';
        }
        
        // Limpar todas as mensagens de erro de viajantes também
        this.clearAllTravelerErrors();
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

    showDateError(message) {
        const errorElement = document.getElementById('date-error-message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
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