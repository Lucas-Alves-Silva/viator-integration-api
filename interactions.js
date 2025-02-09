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
    // Pegar a URL atual
    let url = new URL(window.location.href);
    let params = new URLSearchParams(url.search);
    
    // Atualizar ou adicionar o parâmetro de ordenação
    params.set('viator_sort', value);
    
    // Resetar a página para 1 ao mudar a ordenação
    params.set('viator_page', '1');
    
    // Atualizar a URL e recarregar a página
    url.search = params.toString();
    window.location.href = url.toString();
}