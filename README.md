
# Viator API Integration - WordPress Plugin

Este plugin para WordPress permite integrar a API da Viator ao seu site, possibilitando a busca e exibição de passeios, atrações e destinos diretamente em sua plataforma. Com ele, os usuários podem pesquisar experiências de viagem, visualizar detalhes como preços, avaliações, duração e muito mais.

## Funcionalidades

- Pesquisa de Passeios: Os usuários podem pesquisar passeios por destino.
- Exibição de Cards: Os resultados são exibidos em cards responsivos, com informações como título, descrição, preço, avaliações, duração e flags (ex: "Cancelamento gratuito").
- Filtros Dinâmicos: Os resultados podem ser filtrados por preço, duração, avaliação e flags.
- Responsivo: O plugin é totalmente responsivo, funcionando bem em dispositivos móveis e desktops.
- Shortcode: Use o shortcode [viator_search] para exibir o formulário de pesquisa e os resultados em qualquer página ou post.

## Requisitos

- WordPress 5.0 ou superior.
- PHP 7.4 ou superior.
- Uma chave de API da Viator (disponível apenas para parceiros da Viator).
- 
## Instalação

```
1) Baixe o Plugin:
2) Faça o download do arquivo .zip do plugin.
3) Instale no WordPress:
4) Acesse o painel administrativo do WordPress.
5) Vá até Plugins > Adicionar Novo > Enviar Plugin.
6) Selecione o arquivo .zip e clique em Instalar Agora.
7) Ative o Plugin:
8) Após a instalação, clique em Ativar Plugin.
9) Configure a Chave da API:
10) No código do plugin, localize a variável $api_key e substitua pelo valor da sua chave de API da Viator.
```
    
## Como usar

#### Adicione o Shortcode:

- Em qualquer página ou post do WordPress, adicione o shortcode [viator_search] para exibir o formulário de pesquisa e os resultados.

#### Pesquise Passeios:

- Os usuários podem digitar um destino no campo de pesquisa e clicar em "Pesquisar" para ver os resultados.

#### Visualize os Resultados:

- Os passeios serão exibidos em cards, com informações como título, descrição, preço, avaliações, duração e flags.
## Personalização

#### CSS
O plugin vem com um arquivo CSS básico para estilização. Você pode personalizar o estilo editando o arquivo viator-search.css.

#### JavaScript
O arquivo interactions.js contém a lógica para interações dinâmicas, como a animação do botão de pesquisa. Você pode adicionar ou modificar comportamentos conforme necessário.

#### PHP
O arquivo principal do plugin (viator-integration.php) contém toda a lógica de integração com a API da Viator. Aqui você pode ajustar os parâmetros de pesquisa, filtros e exibição dos resultados.
## Estrutura do Projeto

viator-api-integration/

├── viator-integration.php      // Arquivo principal do plugin

├── styles.css               // Estilos CSS para o formulário e cards

├── interactions.js                 // Lógica de interações dinâmicas
## Uso/Exemplos

#### Shortcode
Adicione o seguinte shortcode em uma página ou post:

```javascript
[viator_search]
```

## Licença
Este projeto é licenciado sob uma Licença Comercial Exclusiva. Todos os direitos reservados. O código-fonte não pode ser redistribuído, modificado ou sublicenciado sem permissão expressa do desenvolvedor.

## Autor

- [GitHub](https://github.com/Lucas-Alves-Silva)
- [LinkedIn](https://www.linkedin.com/in/lucasalves-da-silva/)

## Links Úteis

- [Documentação da API Viator](https://docs.viator.com/partner-api/technical/)
- [WordPress Plugin Handbook](https://developer.wordpress.org/plugins/)
- [Referência de Shortcodes no WordPress](https://codex.wordpress.org/Shortcode_API)
