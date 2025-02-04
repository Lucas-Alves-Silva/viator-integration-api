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