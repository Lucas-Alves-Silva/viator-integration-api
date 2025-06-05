/**
 * Viator Booking System - Frontend
 * Gerencia a interface do usuário para o processo de reserva
 */

document.addEventListener('DOMContentLoaded', function() {
    const bookingSystem = new ViatorBookingManager();
    bookingSystem.init();
});

class ViatorBookingManager {
    constructor() {
        this.currentStep = 1;
        this.bookingData = {
            productCode: null,
            availabilityData: null,
            holdData: null,
            paymentToken: null
        };
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
    }
    
    /**
     * Raspa os dados das faixas etárias da página de produto único
     */
    scrapeAgeBandsFromPage() {
        this.ageBands = []; // Limpa dados anteriores
        const bandElements = document.querySelectorAll('.age-bands-list li');
        
        bandElements.forEach(el => {
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
            this.ageBands.push(bandData);
        });
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
                    <button id="booking-back-btn" class="viator-btn-secondary" style="display: none;">Voltar</button>
                    <button id="booking-next-btn" class="viator-btn-primary">Próximo</button>
                    <button id="booking-cancel-btn" class="viator-btn-cancel">Cancelar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Attach modal events
        modal.querySelector('.viator-modal-close').addEventListener('click', () => this.closeModal());
        modal.querySelector('#booking-cancel-btn').addEventListener('click', () => this.closeModal());
        modal.querySelector('#booking-back-btn').addEventListener('click', () => this.previousStep());
        modal.querySelector('#booking-next-btn').addEventListener('click', () => this.nextStep());
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }
    
    showStep(stepNumber) {
        this.currentStep = stepNumber;
        this.updateProgress();
        
        const content = document.getElementById('booking-step-content');
        
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
        
        backBtn.style.display = this.currentStep > 1 ? 'inline-block' : 'none';
        
        switch (this.currentStep) {
            case 1:
                nextBtn.textContent = 'Verificar Disponibilidade';
                break;
            case 2:
                nextBtn.textContent = 'Continuar para Pagamento';
                break;
            case 3:
                nextBtn.textContent = 'Processar Pagamento';
                break;
            case 4:
                nextBtn.style.display = 'none';
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
                        <i class="calendar-icon">📅</i>
                        <span>Escolher data</span>
                    </div>
                    <input type="hidden" id="travel-date-value" name="travel_date" required>
                </div>
                
                <div class="travelers-section">
                    <h4>Número de Viajantes</h4>
                    ${travelersHTML}
                </div>
                
                <div id="availability-result" class="availability-result" style="display: none;"></div>
            </div>
        `;
    }
    
    getTravelersStepHTML() {
        return `
            <div class="booking-step travelers-step">
                <h3>Informações dos Viajantes</h3>
                <div id="travelers-forms"></div>
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
                    <h4>Cartão de Crédito</h4>
                    
                    <div class="form-group">
                        <label for="card-number">Número do Cartão:</label>
                        <input type="text" id="card-number" class="form-control" placeholder="1234 5678 9012 3456" maxlength="19" required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="expiry-month">Mês:</label>
                            <select id="expiry-month" class="form-control" required>
                                <option value="">Mês</option>
                                ${Array.from({length: 12}, (_, i) => {
                                    const month = String(i + 1).padStart(2, '0');
                                    return `<option value="${month}">${month}</option>`;
                                }).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="expiry-year">Ano:</label>
                            <select id="expiry-year" class="form-control" required>
                                <option value="">Ano</option>
                                ${Array.from({length: 20}, (_, i) => {
                                    const year = new Date().getFullYear() + i;
                                    return `<option value="${year}">${year}</option>`;
                                }).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="security-code">CVV:</label>
                            <input type="text" id="security-code" class="form-control" placeholder="123" maxlength="4" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="cardholder-name">Nome no Cartão:</label>
                        <input type="text" id="cardholder-name" class="form-control" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="cardholder-email">Email:</label>
                        <input type="email" id="cardholder-email" class="form-control" placeholder="seu@email.com" required>
                    </div>
                    
                    <h4>Endereço de Cobrança</h4>
                    
                    <div class="form-group">
                        <label for="billing-address">Endereço:</label>
                        <input type="text" id="billing-address" class="form-control" required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="billing-city">Cidade:</label>
                            <input type="text" id="billing-city" class="form-control" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="billing-state">Estado:</label>
                            <input type="text" id="billing-state" class="form-control" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="billing-zip">CEP:</label>
                            <input type="text" id="billing-zip" class="form-control" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="billing-country">País:</label>
                        <select id="billing-country" class="form-control" required>
                            <option value="BR">Brasil</option>
                            <option value="US">Estados Unidos</option>
                            <option value="CA">Canadá</option>
                            <!-- Adicionar mais países conforme necessário -->
                        </select>
                    </div>
                </div>
            </div>
        `;
    }
    
    getConfirmationStepHTML() {
        return `
            <div class="booking-step confirmation-step">
                <div class="confirmation-success">
                    <div class="success-icon">✓</div>
                    <h3>Reserva Confirmada!</h3>
                    <p>Sua reserva foi processada com sucesso.</p>
                    <div id="booking-details"></div>
                </div>
            </div>
        `;
    }
    
    initializeAvailabilityStep() {
        // Initialize date picker
        this.initializeBookingDatePicker();
        
        // Quantity selectors
        document.querySelectorAll('.qty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target.dataset.target;
                const input = document.getElementById(target + '-qty');
                const isPlus = e.target.classList.contains('plus');
                
                let value = parseInt(input.value);
                if (isPlus) {
                    value = Math.min(value + 1, parseInt(input.max));
                } else {
                    value = Math.max(value - 1, parseInt(input.min));
                }
                input.value = value;
            });
        });
    }
    
    initializeBookingDatePicker() {
        const dateSelector = document.querySelector('.viator-booking-date-selector');
        const hiddenInput = document.getElementById('travel-date-value');
        
        if (!dateSelector || !hiddenInput) return;

        // Destruir instância anterior se existir
        if (this.bookingDatePicker) {
            this.bookingDatePicker.destroy();
        }

        // Configuração do Flatpickr
        const isMobile = window.innerWidth <= 768;
        this.bookingDatePicker = flatpickr(dateSelector, {
            mode: "single",
            minDate: "today",
            maxDate: new Date().fp_incr(365),
            dateFormat: "Y-m-d",
            locale: "pt",
            showMonths: isMobile ? 1 : 2, // 1 mês em mobile, 2 meses em desktop
            onChange: (selectedDates, dateStr) => {
                if (selectedDates.length === 1) {
                    const selectedDate = selectedDates[0];
                    
                    // Definir o valor no input hidden
                    hiddenInput.value = dateStr;
                    
                    // Formatação da data em português completo
                    const diasDaSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
                    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
                    
                    const diaSemana = diasDaSemana[selectedDate.getDay()];
                    const dia = selectedDate.getDate().toString().padStart(2, '0');
                    const mes = meses[selectedDate.getMonth()];
                    const ano = selectedDate.getFullYear();
                    
                    const dataFormatada = `${diaSemana}, ${dia} de ${mes} de ${ano}`;
                    
                    // Atualizar o texto exibido
                    dateSelector.querySelector('span').textContent = dataFormatada;
                }
            },
            onReady: (selectedDates, dateStr, instance) => {
                // Adicionar estilo personalizado ao calendário
                instance.calendarContainer.classList.add('viator-booking-calendar');
                
                // Não adicionar preços aos dias (conforme solicitado)
                // this.addPricesToCalendar(instance);
            },
            onMonthChange: (selectedDates, dateStr, instance) => {
                // Não recarregar preços (conforme solicitado)
                // setTimeout(() => {
                //     this.addPricesToCalendar(instance);
                // }, 100);
            }
        });
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
        this.generateTravelersForm();
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
        const container = document.getElementById('travelers-forms');
        let html = '';
        
        if (this.ageBands && this.ageBands.length > 0) {
            this.ageBands.forEach(band => {
                const id = band.ageBand.toLowerCase();
                const quantity = parseInt(document.getElementById(`${id}-qty`).value, 10);

                if (quantity > 0) {
                    for (let i = 0; i < quantity; i++) {
                        // Passar bandId e label para a função que gera o HTML do formulário
                        html += this.getTravelerFormHTML(id, i + 1, band.bandId, band.label);
                    }
                }
            });
        }
        
        container.innerHTML = html;
    }
    
    getTravelerFormHTML(type, number, bandId, label) {
        return `
            <div class="traveler-form" data-type="${type}" data-number="${number}" data-band-id="${bandId}">
                <h4>${label} ${number}</h4>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Nome:</label>
                        <input type="text" name="${type}_${number}_firstname" class="form-control" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Sobrenome:</label>
                        <input type="text" name="${type}_${number}_lastname" class="form-control" required>
                    </div>
                </div>
            </div>
        `;
    }
    
    generateBookingSummary() {
        const container = document.getElementById('booking-summary');
        const dateSelector = document.querySelector('.viator-booking-date-selector span');
        const selectedDate = dateSelector ? dateSelector.textContent : 'Data não selecionada';
        
        if (this.bookingData.availabilityData) {
            // Gerar resumo baseado nos dados de disponibilidade
            container.innerHTML = `
                <div class="summary-item">
                    <span>Produto:</span>
                    <span>${this.bookingData.availabilityData.productTitle || 'Experiência Viator'}</span>
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
                    <span>${this.formatPrice(this.bookingData.availabilityData.totalPrice)}</span>
                </div>
            `;
        }
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
        const adults = parseInt(document.getElementById('adults-qty').value);
        const children = parseInt(document.getElementById('children-qty').value);
        const infants = parseInt(document.getElementById('infants-qty').value);
        
        let text = `${adults} adulto${adults > 1 ? 's' : ''}`;
        if (children > 0) text += `, ${children} criança${children > 1 ? 's' : ''}`;
        if (infants > 0) text += `, ${infants} bebê${infants > 1 ? 's' : ''}`;
        
        return text;
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
            alert('Por favor, selecione uma data de viagem.');
            return false;
        }
        
        const travelers = this.collectTravelersData();
        
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
                    travelers: JSON.stringify(travelers),
                    nonce: viatorBookingAjax.nonce
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.bookingData.availabilityData = data.data;
                this.displayAvailabilityResult(data.data);
                return true;
            } else {
                alert('Erro: ' + data.data.message);
                return false;
            }
        } catch (error) {
            alert('Erro de conexão. Tente novamente.');
            return false;
        }
    }
    
    collectTravelersData() {
        const travelers = [];
        if (this.ageBands && this.ageBands.length > 0) {
            this.ageBands.forEach(band => {
                const id = band.ageBand.toLowerCase();
                const quantity = parseInt(document.getElementById(`${id}-qty`).value, 10);
                
                if (quantity > 0) {
                    for (let i = 0; i < quantity; i++) {
                        travelers.push({ bandId: band.bandId });
                    }
                }
            });
        }
        return travelers;
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
        const forms = document.querySelectorAll('.traveler-form');
        for (let form of forms) {
            const inputs = form.querySelectorAll('input[required], select[required]');
            for (let input of inputs) {
                if (!input.value.trim()) {
                    alert('Por favor, preencha todas as informações dos viajantes.');
                    input.focus();
                    return false;
                }
            }
        }
        return true;
    }
    
    async processPayment() {
        // Validar dados de pagamento
        const paymentInputs = document.querySelectorAll('.payment-form input[required], .payment-form select[required]');
        for (let input of paymentInputs) {
            if (!input.value.trim()) {
                alert('Por favor, preencha todas as informações de pagamento.');
                input.focus();
                return false;
            }
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
            alert('Erro no processamento do pagamento: ' + error.message);
            return false;
        }
    }
    
    async requestBookingHold() {
        try {
            const travelersDetails = this.collectDetailedTravelersData();
            
            const response = await fetch(viatorBookingAjax.ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'viator_request_hold',
                    availability_data: JSON.stringify(this.bookingData.availabilityData),
                    travelers_details: JSON.stringify(travelersDetails),
                    nonce: viatorBookingAjax.nonce
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.bookingData.holdData = data.data;
                this.initializeViatorPayment(); // Reinitializar com token de pagamento
                return true;
            } else {
                alert('Erro ao criar reserva: ' + data.data.message);
                return false;
            }
        } catch (error) {
            alert('Erro de conexão ao criar reserva.');
            return false;
        }
    }
    
    async submitPayment() {
        try {
            // Coletar dados de endereço necessários
            const country = document.getElementById('billing-country').value;
            const postalCode = document.getElementById('billing-zip').value;
            const email = document.getElementById('cardholder-email').value;
            
            // Dados para o sistema de pagamento da Viator
            const paymentData = {
                address: {
                    country: country,
                    postalCode: postalCode
                },
                email: email
            };
            
            return new Promise((resolve, reject) => {
                if (!this.payment) {
                    reject(new Error('Sistema de pagamento não inicializado'));
                    return;
                }
                
                // Primeiro submeter dados para detecção de fraude
                this.payment.submitDeviceData();
                
                // Depois submeter o formulário de pagamento
                this.payment.submitForm(paymentData)
                    .then((result) => {
                        if (result.result === 'SUCCESS') {
                            this.bookingData.paymentToken = result.paymentToken;
                            resolve(true);
                        } else {
                            reject(new Error('Pagamento não foi processado com sucesso'));
                        }
                    })
                    .catch((error) => {
                        reject(new Error('Erro no processamento do pagamento: ' + error.message));
                    });
            });
        } catch (error) {
            alert('Erro no processamento do pagamento: ' + error.message);
            return false;
        }
    }
    
    async confirmBooking() {
        try {
            const response = await fetch(viatorBookingAjax.ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'viator_confirm_booking',
                    hold_data: JSON.stringify(this.bookingData.holdData),
                    payment_token: this.bookingData.paymentToken,
                    nonce: viatorBookingAjax.nonce
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.bookingData.confirmationData = data.data;
                return true;
            } else {
                alert('Erro na confirmação: ' + data.data.message);
                return false;
            }
        } catch (error) {
            alert('Erro de conexão na confirmação.');
            return false;
        }
    }
    
    collectDetailedTravelersData() {
        const travelers = [];
        const forms = document.querySelectorAll('.traveler-form');
        
        forms.forEach(form => {
            const bandId = form.dataset.bandId; // Corrigido para pegar o bandId
            const firstName = form.querySelector('input[name*="firstname"]').value;
            const lastName = form.querySelector('input[name*="lastname"]').value;
            
            const traveler = {
                bandId: bandId,
                firstname: firstName,
                lastname: lastName
            };
            
            travelers.push(traveler);
        });
        
        return travelers;
    }
    
    closeModal() {
        const modal = document.getElementById('viator-booking-modal');
        if (modal) {
            modal.remove();
        }
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    const bookingManager = new ViatorBookingManager();
    bookingManager.init();
});