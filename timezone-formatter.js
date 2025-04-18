/**
 * Timezone Formatter
 * 
 * Este script formata o fuso horário para exibição mais amigável ao usuário
 * utilizando a API do ipgeolocation.io
 */

// Função para formatar o fuso horário
function formatTimezone(timezoneCode) {
    return new Promise((resolve) => {
        // Verifica se temos dados em cache
        const cachedData = localStorage.getItem('viatorTimezoneCache_' + timezoneCode);
        if (cachedData) {
            const { formattedTimezone, timestamp } = JSON.parse(cachedData);
            const now = new Date().getTime();
            const oneDay = 24 * 60 * 60 * 1000; // 24 horas em milissegundos

            // Se o cache tiver menos de 24 horas, use-o
            if (now - timestamp < oneDay) {
                return resolve(formattedTimezone);
            }
        }

        // Se não houver código de fuso horário, retorne uma mensagem padrão
        if (!timezoneCode) {
            resolve('Fuso horário não disponível');
            return;
        }

        // Usa a mesma chave API que já está sendo usada para geolocalização
        const API_KEY = '545988903dc94379913912dc88a2da1a';
        const API_URL = `https://api.ipgeolocation.io/timezone?apiKey=${API_KEY}&tz=${timezoneCode}`;

        fetch(API_URL)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro na resposta da API');
                }
                return response.json();
            })
            .then(data => {
                console.log('Timezone API Response:', data);
                
                if (data.message) {
                    throw new Error(data.message);
                }

                // Formata o fuso horário de forma amigável
                let formattedTimezone = timezoneCode; // Valor padrão caso algo dê errado
                
                if (data.timezone) {
                    // Formata como: "Nome do Fuso Horário (UTC+/-XX:XX)"
                    const tzName = data.timezone;
                    const offset = data.timezone_offset;
                    const offsetSign = offset >= 0 ? '+' : '';
                    
                    formattedTimezone = `${tzName} (UTC${offsetSign}${offset})`;
                    
                    // Adiciona o horário atual naquele fuso, se disponível
                    if (data.date_time_txt) {
                        const currentTime = new Date(data.date_time_txt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        formattedTimezone += ` • ${currentTime} (hora local)`;
                    }
                }

                // Armazena em cache
                localStorage.setItem('viatorTimezoneCache_' + timezoneCode, JSON.stringify({
                    formattedTimezone: formattedTimezone,
                    timestamp: new Date().getTime()
                }));

                resolve(formattedTimezone);
            })
            .catch(error => {
                console.error('Erro ao buscar informações de fuso horário:', error);
                resolve(timezoneCode); // Em caso de erro, retorna o código original
            });
    });
}

// Função para inicializar o formatador de fuso horário
function initTimezoneFormatter() {
    // Busca todos os elementos de informação
    const infoItems = document.querySelectorAll('.viator-info-item');
    
    // Procura pelo item específico de fuso horário
    let timezoneElement = null;
    let timezoneCode = null;
    
    infoItems.forEach(item => {
        const label = item.querySelector('.viator-info-label');
        if (label && label.textContent.trim() === 'Fuso Horário:') {
            timezoneElement = item.querySelector('.viator-info-value');
            if (timezoneElement) {
                timezoneCode = timezoneElement.textContent.trim();
            }
        }
    });
    
    // Se encontrou o elemento de fuso horário
    if (timezoneElement && timezoneCode) {
        console.log('Elemento de fuso horário encontrado:', timezoneCode);
        
        // Adiciona um indicador de carregamento
        timezoneElement.innerHTML = `${timezoneCode} <small>(carregando detalhes...)</small>`;
        
        // Formata o fuso horário
        formatTimezone(timezoneCode).then(formattedTimezone => {
            timezoneElement.textContent = formattedTimezone;
        });
    } else {
        console.error('Elemento de fuso horário não encontrado');
    }
}

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Verifica se estamos na página de produto único
    if (document.querySelector('.viator-product-detail')) {
        initTimezoneFormatter();
    }
});