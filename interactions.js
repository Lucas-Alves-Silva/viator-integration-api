document.getElementById("viator-search-form").addEventListener("submit", function(event) {
    event.preventDefault();  // Impede o envio do formulário para que possamos controlar o carregamento

    var button = document.getElementById("search-button");
    var searchText = document.getElementById("search-text");
    var searchIcon = document.getElementById("search-icon");
    var loadingIcon = document.getElementById("loading-icon");

    // Esconder o texto e ícone de pesquisa
    searchText.style.display = "none";
    searchIcon.style.display = "none";

    // Mostrar o ícone de carregamento
    loadingIcon.style.display = "inline-block";

    // Simulação de carregamento (remova depois para usar a API real)
    setTimeout(function() {
        // Aqui você pode fazer a chamada à API Viator, por enquanto só estamos simulando.
        // Após a resposta da API, você pode mostrar os resultados e esconder o carregamento.
        
        // Exemplo de chamada para mostrar os resultados
        document.getElementById("viator-results").style.display = "block";
        
        // Mostrar novamente o texto e o ícone de pesquisa após o carregamento
        loadingIcon.style.display = "none";
        searchText.style.display = "inline-block";
        searchIcon.style.display = "inline-block";
    }, 2000);  // Tempo simulado de 2 segundos, substitua com a chamada da API real
});