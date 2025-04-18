
# Viator API Integration – WordPress Plugin

O **Viator API Integration** é um plugin avançado para WordPress que conecta seu site à API oficial da Viator, permitindo a busca, exibição e filtragem de passeios, atrações e experiências de viagem diretamente na sua plataforma. Ele oferece uma experiência rica e responsiva para seus usuários, com integração completa de avaliações, preços, duração, idiomas e muito mais.

---

## Funcionalidades Principais

- **Busca de Passeios e Atrações:** Pesquisa dinâmica por destino, com resultados em tempo real.
- **Exibição em Cards Responsivos:** Cards detalhados com título, descrição, preço, avaliações, duração, bandeiras (ex: "Cancelamento gratuito") e imagens.
- **Filtros Avançados:** Filtragem por preço, duração, avaliação, datas e outros critérios.
- **Avaliações de Clientes:** Exibição de avaliações reais, com paginação, filtro por estrelas e suporte a fotos dos usuários.
- **Detalhamento Completo:** Página de detalhes do produto com informações traduzidas, inclusões, exclusões, políticas, idiomas disponíveis e tags.
- **Curiosidades e Conteúdo Dinâmico:** Integração com a Wikipedia para exibir curiosidades sobre destinos.
- **Shortcode Personalizado:** Use `[viator_search]` para inserir o formulário e resultados em qualquer página ou post.
- **Cache Inteligente:** Dados de produtos e avaliações são armazenados em cache para otimizar performance e reduzir chamadas à API.
- **Proteção de Conteúdo:** Avaliações são protegidas contra indexação por mecanismos de busca, conforme exigido pela Viator.
- **Totalmente Responsivo:** Compatível com dispositivos móveis e desktops.

---

## Requisitos

- WordPress 5.0 ou superior
- PHP 7.4 ou superior
- Chave de API da Viator (disponível apenas para parceiros)
- cURL habilitado no servidor

---

## Instalação

1. **Baixe o Plugin:**  
   Faça o download do arquivo `.zip` deste repositório.

2. **Instale no WordPress:**  
   - Acesse o painel administrativo do WordPress.
   - Vá em *Plugins > Adicionar Novo > Enviar Plugin*.
   - Selecione o arquivo `.zip` e clique em *Instalar Agora*.

3. **Ative o Plugin:**  
   Após a instalação, clique em *Ativar Plugin*.

4. **Configure a Chave da API:**  
   No painel do WordPress, acesse as configurações do plugin e insira sua chave de API da Viator.

---

## Como Usar

### Adicionar o Shortcode

Em qualquer página ou post do WordPress, adicione o shortcode abaixo para exibir o formulário de pesquisa e os resultados:

```plaintext
[viator_search]
```
