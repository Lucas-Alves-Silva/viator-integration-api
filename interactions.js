document.addEventListener('DOMContentLoaded', function () {
    const searchForm = document.getElementById('viator-search-form');
    const searchButton = document.getElementById('search-button');
    const searchText = document.getElementById('search-text');
    const searchIcon = document.getElementById('search-icon');

    searchForm.addEventListener('submit', function (event) {
        // Previne o envio do formulário para testar a animação
        // event.preventDefault();

        // Altera o texto do botão
        searchText.innerHTML = 'Pesquisando<span class="loading-dots"></span>';

        // Altera o ícone para o avião
        searchIcon.innerHTML = '✈️';
        searchIcon.classList.add('airplane-icon');

        // Desabilita o botão para evitar múltiplos cliques
        searchButton.disabled = true;
    });
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
    
    // Fazer requisição AJAX usando o objeto viatorAjax que foi localizado
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
            nonce: viatorAjax.nonce
        })
    })
    .then(response => response.text())
    .then(html => {
        // Atualizar a URL sem recarregar a página
        params.set('viator_sort', value);
        window.history.pushState({}, '', `${url.pathname}?${params.toString()}`);
        
        // Atualizar o conteúdo
        document.getElementById('viator-results').innerHTML = html;
        
        // Remover indicador de carregamento
        document.querySelector('.viator-grid').style.opacity = '1';
    })
    .catch(error => {
        console.error('Erro:', error);
        // Em caso de erro, volta para o método antigo de recarregar a página
        window.location.href = `${url.pathname}?${params.toString()}`;
    });
}