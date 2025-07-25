# Viator API Integration – WordPress Plugin v1.5

O **Viator API Integration** é um plugin avançado para WordPress que conecta seu site à API oficial da Viator, permitindo a busca, exibição e filtragem de passeios, atrações e experiências de viagem.

---

## ✨ Funcionalidades Principais

### 🔍 **Sistema de Busca Inteligente**
- **Busca Dinâmica:** Pesquisa em tempo real por destino.
- **Detecção de Localização:** Sugestão automática de passeios próximos ao usuário.
- **Interface Responsiva:** Funciona perfeitamente em todos os dispositivos.

### 🎠 **Carrosséis de Atrações Personalizados**
- **Shortcode `[viator_attractions]`**: Crie carrosséis com base em localização, cidade, ou ID de atração.
- **Altamente Customizável**: Controle o número de cards, tamanho, navegação e título.
- **Links Automáticos**: Cards levam diretamente para a página de detalhes da atração.
- **Cache de 7 Dias**: Performance otimizada, com cache dedicado para cada carrossel.

### 🎯 **Filtros Avançados**
- Filtros por Data, Duração, Preço, Avaliação e características especiais (Cancelamento Gratuito, Evitar Fila, etc.).

### 📄 **Páginas de Detalhes Avançadas**
- URLs amigáveis (`/passeio/...` e `/atracoes/...`).
- Galeria de imagens, informações detalhadas, avaliações, e mais.

### 🧠 **Curiosidades Inteligentes com IA**
- **Integração com Groq AI:** Gera curiosidades personalizadas sobre destinos.
- **Fallback Inteligente:** Sistema de backup com curiosidades pré-definidas.

### 🌍 **Sistema Multilíngue e Multi-moeda**
- **Idiomas:** Português (pt-BR) e Inglês (en-US).
- **Moedas:** Real (BRL) e Dólar (USD).
- Formatação localizada para datas, números e moedas.

### 💳 **Sistema de Booking (Beta)**
- **Fluxo de Reserva**: Implementa o fluxo de reserva da Viator, desde a checagem de disponibilidade até a confirmação.
- **Formulários Dinâmicos**: Interface para inserir dados dos viajantes.
- **Segurança**: Processamento de pagamento seguro, sem armazenar dados sensíveis localmente.

### ⚡ **Otimização e Performance**
- **Sistema de Cache Avançado:** Cache para resultados de busca e cache de 7 dias para carrosséis de atrações.
- **Gerenciamento Centralizado:** Limpe todos os caches na página **IEP Turismo > Debug & Logs**.
- **Carregamento Assíncrono:** Interface responsiva sem travamentos.
- **Otimização SEO:** URLs amigáveis e meta tags apropriadas.

---

## 🛠 Requisitos

- **WordPress:** 5.0 ou superior
- **PHP:** 7.4 ou superior
- **Extensões PHP:** cURL habilitado
- **APIs:** Chave da Viator API (apenas para parceiros)
- **Opcional:** Chave da Groq API (para curiosidades com IA)

---

## 📦 Instalação

1. Baixe o arquivo `.zip` do plugin.
2. Acesse `WordPress Admin > Plugins > Adicionar Novo`.
3. Clique em "Enviar Plugin", selecione o `.zip` e instale.
4. Ative o plugin.
5. Vá para `IEP Turismo` no menu do WordPress para configurar sua chave API e outras opções.

---

## 🚀 Como Usar

Este plugin oferece dois shortcodes principais para máxima flexibilidade.

### **1. Busca Completa de Passeios**
Use este shortcode para exibir a interface completa de busca e resultados.
```php
[viator_search]
```

### **2. Carrosséis de Atrações Personalizados**
Use este shortcode para inserir carrosséis de atrações em qualquer página.
```php
[viator_attractions location="Paris" title="Atrações em Paris"]
```
> Para uma lista completa de parâmetros e exemplos, veja o arquivo `SHORTCODE_EXAMPLES.md`.

---

## 🔧 Funcionalidades Técnicas

### **Sistema de Cache**
- Cache automático para resultados da busca de produtos.
- **Cache de 7 dias** dedicado para carrosséis de atrações, garantindo carregamento ultrarrápido.
- **Gerenciamento Centralizado**: Limpe todos os tipos de cache na página **IEP Turismo > Debug & Logs**.

### **Segurança**
- Sanitização completa de inputs, validação de nonces e proteção contra XSS.

### **Debug e Logs**
- Ative o modo de debug em `wp-config.php` com `define('VIATOR_DEBUG', true);`.
- A página **IEP Turismo > Debug & Logs** oferece ferramentas para testes de API e gerenciamento de cache.

---

## 🔄 Changelog

### **Versão 1.5 (Atual)**
- ✅ **NOVO**: Shortcode `[viator_attractions]` para carrosséis de atrações personalizados.
- ✅ **NOVO**: Sistema de cache de 7 dias para os carrosséis de atrações.
- ✅ **NOVO**: Gerenciamento centralizado de cache na página de Debug.
- ✅ **MELHORIA**: Lógica de captura de IDs de atrações para corrigir links.
- ✅ **MELHORIA**: Reorganização do painel de administração para maior clareza.
- ✅ **CORREÇÃO**: Links dos cards de atrações agora apontam para as URLs corretas.

### **Versão 1.0**
- ✅ Integração inicial com Viator API.
- ✅ Shortcode `[viator_search]` com sistema de busca e filtros avançados.
- ✅ Suporte multilíngue (PT/EN) e multi-moeda (BRL/USD).
- ✅ Integração com Groq AI para curiosidades.
- ✅ Páginas de produto detalhadas (`/passeio/...`).
- ✅ Sistema de avaliações e interface responsiva.

---

## 👥 Créditos

**Desenvolvido por:** Lucas Alves  
**Integração API:** Viator Official API  
**IA Powered by:** Groq Cloud API  
**Icons by:** Icons8  

---

*Transforme seu site WordPress em uma poderosa plataforma de busca de experiências de viagem com o Viator API Integration!*
