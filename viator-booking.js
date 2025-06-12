/**
 * Viator Booking System - Frontend
 * Gerencia a interface do usuário para o processo de reserva
 */

document.addEventListener('DOMContentLoaded', function() {
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
        };
        
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
                this.openBookingModal();
            }
        });
    }
    
    openBookingModal() {
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
     * Raspa os dados das faixas etárias da página de produto único
     */
    scrapeAgeBandsFromPage() {
        console.log('🔍 scrapeAgeBandsFromPage chamado');
        this.ageBands = []; // Limpa dados anteriores
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
        
        console.log('✅ AgeBands extraídos:', this.ageBands);
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
        modal.querySelector('#booking-back-btn').addEventListener('click', () => this.previousStep());
        modal.querySelector('#booking-next-btn').addEventListener('click', () => this.nextStep());
        
        // Setup price details toggle
        this.setupPriceDetailsToggle();
        
        // Close modal when clicking outside
        // Impedir fechamento acidental - apenas permitir fechar via X ou botão Cancelar
        modal.addEventListener('click', (e) => {
            // Não fazer nada - usuário só pode fechar via botões específicos
            // Esta mudança impede fechamento acidental durante o fluxo de pagamento
        });
    }
    
    showStep(stepNumber) {
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
                this.initializeTravelersStep();
                break;
            case 3:
                content.innerHTML = this.getPaymentStepHTML();
                this.initializePaymentStep();
                break;
            case 4:
                content.innerHTML = this.getConfirmationStepHTML();
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
                <div class="traveler-summary-section">
                    <h4>📋 Resumo dos Viajantes</h4>
                    <div id="travelers-summary"></div>
                </div>
                
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
                        <div class="form-group">
                            <label for="booker-phone">Telefone (opcional):</label>
                            <input type="tel" id="booker-phone" name="booker_phone" class="form-control" maxlength="20" placeholder="(11) 99999-9999">
                        </div>
                    </div>
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
                            🔒 Suas informações são criptografadas e processadas com segurança pela Viator
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
    
    initializeTravelersStep() {
        console.log('🚀 initializeTravelersStep chamado');
        console.log('📊 Dados armazenados:', {
            selectedTravelers: this.bookingData.selectedTravelers,
            ageBands: this.ageBands,
            travelDate: this.bookingData.travelDate
        });
        
        this.generateTravelersForm();
        
        // Verificar se o resumo foi gerado
        const container = document.getElementById('travelers-summary');
        const summaryCount = container ? container.children.length : 0;
        console.log(`✅ Resumo dos viajantes inicializado: ${summaryCount} itens`);
        
        if (summaryCount === 0) {
            console.error('❌ PROBLEMA: Nenhum resumo de viajante foi gerado!');
        }
        
        // Adicionar validações em tempo real para os campos do formulário
        this.setupBookerInfoValidation();
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
    
    initializePaymentStep() {
        this.generateBookingSummary();
        this.formatCardNumber();
        this.initializeViatorPayment();
    }
    
    /**
     * Inicializar sistema de pagamento da Viator
     */
    initializeViatorPayment() {
        if (this.bookingData.holdData && this.bookingData.holdData.paymentSessionToken) {
            // Inicializar detecção de fraude da Viator
            if (window.Payment) {
                this.payment = window.Payment.init(this.bookingData.holdData.paymentSessionToken);
            } else {
                console.error('Biblioteca de pagamento da Viator não carregada');
            }
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
                this.showStep(this.currentStep + 1);
            }
        }
    }
    
    previousStep() {
        if (this.currentStep > 1) {
            this.showStep(this.currentStep - 1);
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
        console.log('🔍 ageBands disponíveis:', this.ageBands);
        
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
                            ageBand: band.ageBand, // Usar ageBand diretamente
                            numberOfTravelers: quantity
                        });
                    }
                }
            });
        } else {
            console.log('❌ Nenhum ageBand disponível');
        }
        
        console.log('📊 PaxMix final:', paxMix);
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
        
        return true;
    }
    
    async processPayment() {
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
            // Primeiro, fazer hold da reserva
            const holdResult = await this.requestBookingHold();
            if (!holdResult) return false;
            
            // Depois processar pagamento usando biblioteca Viator
            const paymentResult = await this.submitPayment();
            if (!paymentResult) return false;
            
            // Finalmente, confirmar a reserva
            const confirmResult = await this.confirmBooking();
            return confirmResult;
            
        } catch (error) {
            this.showDateError('Erro no processamento do pagamento: ' + error.message);
            return false;
        }
    }
    
    async requestBookingHold() {
        try {
            const travelersDetails = this.collectDetailedTravelersData();
            
            // Preparar dados de disponibilidade com a opção selecionada
            const availabilityDataWithSelection = {
                ...this.bookingData.availabilityData,
                selectedOption: this.bookingData.selectedOption,
                travelDate: this.bookingData.travelDate,
                productCode: this.bookingData.productCode
            };
            
            console.log('📋 Dados para hold:', {
                availabilityData: availabilityDataWithSelection,
                travelersDetails: travelersDetails
            });
            
            const response = await fetch(viatorBookingAjax.ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'viator_request_hold',
                    availability_data: JSON.stringify(availabilityDataWithSelection),
                    travelers_details: JSON.stringify(travelersDetails),
                    nonce: viatorBookingAjax.nonce
                })
            });
            
            const data = await response.json();
            console.log('📥 Resposta do hold:', data);
            
            if (data.success) {
                this.bookingData.holdData = data.data;
                this.initializeViatorPayment(); // Reinitializar com token de pagamento
                return true;
            } else {
                console.error('❌ Erro no hold:', data);
                console.error('📋 Detalhes do erro:', {
                    message: data.data?.message,
                    isLocalhost: window.location.hostname === 'localhost' || window.location.hostname.includes('.local'),
                    currentURL: window.location.href,
                    recommendedAction: 'Para testes reais, use um domínio público com HTTPS'
                });
                
                const errorMessage = data.data?.message || 'Erro desconhecido na criação da reserva';
                const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname.includes('.local');
                
                if (isLocalhost) {
                    this.showDateError(`⚠️ LOCALHOST DETECTADO: ${errorMessage}\n\n💡 Para testar o fluxo completo, use um domínio público com HTTPS ou configure um tunnel (ngrok).`);
                } else {
                    this.showDateError('Erro ao criar reserva: ' + errorMessage);
                }
                return false;
            }
        } catch (error) {
            console.error('❌ Erro de conexão no hold:', error);
            this.showDateError('Erro de conexão ao criar reserva.');
            return false;
        }
    }
    
    async submitPayment() {
        try {
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
            
            // Usar o endpoint correto da API de pagamentos da Viator
            const response = await fetch(viatorBookingAjax.ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'viator_submit_payment',
                    session_token: this.bookingData.holdData.sessionToken,
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
                throw new Error(errorMessage);
            }
            
        } catch (error) {
            console.error('❌ Erro no pagamento:', error);
            this.showDateError('Erro no processamento do pagamento: ' + error.message);
            return false;
        }
    }
    
    async confirmBooking() {
        try {
            // Usar dados do responsável coletados na segunda etapa
            const travelersData = this.collectDetailedTravelersData();
            const bookerInfo = travelersData.bookerInfo;

            const response = await fetch(viatorBookingAjax.ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'viator_confirm_booking',
                    cart_id: this.bookingData.holdData.cartId,
                    payment_token: this.bookingData.paymentToken,
                    booker_info: JSON.stringify(bookerInfo),
                    nonce: viatorBookingAjax.nonce
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.bookingData.confirmationData = data.data;
                this.displayConfirmationMessage(data.data);
                return true;
            } else {
                const reasons = data.data.reasons ? data.data.reasons.map(r => r.message).join(', ') : 'Detalhes não fornecidos.';
                this.showDateError(`Erro na confirmação: ${data.data.message} (${reasons})`);
                return false;
            }
        } catch (error) {
            this.showDateError('Erro de conexão na confirmação.');
            return false;
        }
    }
    
    displayConfirmationMessage(data) {
        const container = document.querySelector('.confirmation-message');
        if (!container) return;

        const status = data.custom_data?.confirmationStatus || 'UNKNOWN';
        const isRestricted = data.custom_data?.isVoucherRestrictionRequired || false;
        const bookingRef = data.bookingInfo?.bookingRef || 'N/A';

        let html = '';

        if (status === 'CONFIRMED') {
            html = `
                <div class="confirmation-success">
                    <div class="success-icon">✓</div>
                    <h3>Reserva Confirmada!</h3>
                    <p>Sua reserva foi processada com sucesso. Um email de confirmação foi enviado para você.</p>
                    <p><strong>Referência da Reserva:</strong> ${bookingRef}</p>
            `;
            if (isRestricted) {
                html += `<p class="voucher-notice"><strong>Atenção:</strong> Por motivos de segurança, seu voucher será enviado para o seu email e não está disponível para download imediato.</p>`;
            }
            html += `</div>`;
        } else if (status === 'PENDING') {
            html = `
                <div class="confirmation-pending">
                    <div class="pending-icon">…</div>
                    <h3>Reserva Pendente!</h3>
                    <p>Sua reserva foi recebida e está aguardando confirmação do fornecedor. Isso pode levar até 48 horas.</p>
                    <p>Você receberá um email assim que o status for atualizado. Seu cartão <strong>não foi cobrado</strong> ainda, apenas uma pré-autorização foi feita.</p>
                    <p><strong>Referência da Reserva:</strong> ${bookingRef}</p>
                </div>
            `;
        } else { // FAILED, CANCELLED, etc.
             html = `
                <div class="confirmation-error">
                    <div class="error-icon">!</div>
                    <h3>Falha na Reserva</h3>
                    <p>Não foi possível completar sua reserva. Por favor, verifique os detalhes e tente novamente.</p>
                </div>
            `;
        }
        
        container.innerHTML = html;
    }
    
    collectDetailedTravelersData() {
        // Coletar informações do responsável pela reserva
        const bookerFirstname = document.getElementById('booker-firstname')?.value || '';
        const bookerLastname = document.getElementById('booker-lastname')?.value || '';
        const bookerEmail = document.getElementById('booker-email')?.value || '';
        const bookerPhone = document.getElementById('booker-phone')?.value || '';
        
        // Usar dados dos viajantes já armazenados (paxMix)
        const paxMix = this.bookingData.selectedTravelers || this.collectTravelersData();
        
        return {
            // Informações dos viajantes (apenas quantidades por faixa etária)
            paxMix: paxMix,
            
            // Informações do responsável principal pela reserva
            bookerInfo: {
                firstname: bookerFirstname,
                lastname: bookerLastname,
                email: bookerEmail,
                phone: bookerPhone
            }
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
            console.log('📊 Dados da resposta:', data);

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