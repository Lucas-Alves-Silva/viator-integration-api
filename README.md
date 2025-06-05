# Viator API Integration – WordPress Plugin

O **Viator API Integration** é um plugin avançado para WordPress que conecta seu site à API oficial da Viator, permitindo a busca, exibição e filtragem de passeios, atrações e experiências de viagem diretamente na sua plataforma. Ele oferece uma experiência rica e responsiva para seus usuários, com integração completa de avaliações, preços, duração, idiomas e muito mais.

---

## ✨ Funcionalidades Principais

### 🔍 **Sistema de Busca Inteligente**
- **Busca Dinâmica:** Pesquisa em tempo real por destino com auto-sugestão
- **Detecção de Localização:** Sugestão automática de passeios próximos ao usuário
- **Interface Responsiva:** Funciona perfeitamente em dispositivos móveis e desktop

### 🎯 **Filtros Avançados**
- **Filtro por Data:** Seleção de período de viagem com calendário interativo
- **Filtro por Duração:** Desde 1 hora até mais de 3 dias
- **Filtro por Preço:** Controle deslizante para definir faixa de preço
- **Filtro por Avaliação:** Filtrar por produtos 3⭐, 4⭐ ou 4.5⭐+
- **Filtros Especiais:**
  - Cancelamento Gratuito
  - Produtos Prestes a Esgotar
  - Evitar Fila (Skip the Line)
  - Tours Privados
  - Novidades na Viator

### 📱 **Exibição em Cards Responsivos**
- Cards detalhados com informações completas
- Imagens de alta qualidade
- Preços com suporte a ofertas especiais
- Sistema de avaliações com estrelas
- Badges informativos (cancelamento gratuito, prestes a esgotar, etc.)
- Duração formatada inteligentemente

### 🧠 **Curiosidades Inteligentes com IA**
- **Integração com Groq AI:** Gera curiosidades personalizadas sobre destinos
- **Fallback Inteligente:** Sistema de backup com curiosidades pré-definidas
- **Suporte Multilíngue:** Curiosidades em português e inglês

### 🌍 **Sistema Multilíngue Completo**
- **Idiomas Suportados:** Português (Brasil), Inglês (EUA)
- **Traduções Automáticas:** Interface completamente traduzida
- **Moedas Suportadas:** Real (BRL), Dólar (USD), Euro (EUR)
- **Formatação Localizada:** Datas, números e moedas formatados por região

### 📄 **Páginas de Detalhes Avançadas**
- URLs amigáveis (`/passeio/codigo-do-produto/`)
- Galeria de imagens com zoom
- Informações detalhadas (inclusões, exclusões, políticas)
- Sistema de avaliações com filtros e paginação
- Informações de acessibilidade
- Tags e categorias
- Mapas de localização

### ⚡ **Otimização e Performance**
- **Sistema de Cache:** Reduz chamadas à API e melhora velocidade
- **Paginação Avançada:** Navegação eficiente pelos resultados
- **Carregamento Assíncrono:** Interface responsiva sem travamentos
- **Otimização SEO:** URLs amigáveis e meta tags apropriadas

### 🔧 **Recursos Técnicos**
- **Shortcode Simples:** `[viator_search]` para inserir em qualquer lugar
- **API Sandbox/Produção:** Suporte para ambos os ambientes
- **Debug Integrado:** Sistema de logs para troubleshooting
- **Proteção de Conteúdo:** Compliance com políticas da Viator
- **Sanitização Completa:** Segurança contra XSS e injection

---

## 🛠 Requisitos

- **WordPress:** 5.0 ou superior
- **PHP:** 7.4 ou superior
- **Extensões PHP:** cURL habilitado
- **APIs:** Chave da Viator API (apenas para parceiros)
- **Opcional:** Chave da Groq API (para curiosidades com IA)

---

## 📦 Instalação

### 1. **Download e Upload**
```bash
1. Baixe o arquivo .zip do plugin
2. Acesse WordPress Admin > Plugins > Adicionar Novo
3. Clique em "Enviar Plugin" e selecione o arquivo .zip
4. Clique em "Instalar Agora"
```

### 2. **Ativação**
```bash
Após a instalação, clique em "Ativar Plugin"
```

### 3. **Configuração**
```bash
1. Vá para Viator Integration no menu do WordPress
2. Configure sua chave API da Viator
3. (Opcional) Configure sua chave API do Groq
4. Selecione idioma e moeda preferidos
5. Salve as configurações
```

---

## ⚙️ Configuração

### **Chaves de API**

#### **Viator API (Obrigatória)**
```
1. Solicite acesso de parceiro à Viator
2. Obtenha sua chave API
3. Insira no campo "API Key" nas configurações
```

#### **Groq API (Opcional)**
```
1. Crie conta gratuita em https://groq.com
2. Gere uma API key
3. Insira no campo "Groq API Key" nas configurações
4. Ativa curiosidades inteligentes sobre destinos
```

### **Configurações de Localização**

#### **Idiomas Disponíveis**
- 🇧🇷 **Português do Brasil** (pt-BR)
- 🇺🇸 **Inglês Americano** (en-US)  

#### **Moedas Suportadas**
- **Real Brasileiro (BRL)** - R$
- **Dólar Americano (USD)** - $
- **Euro (EUR)** - €

---

## 🚀 Como Usar

### **Shortcode Básico**
```php
[viator_search]
```

### **Exemplos de Uso**

#### **Em uma Página**
```html
<h2>Encontre Experiências Incríveis</h2>
[viator_search]
<p>Descubra os melhores passeios e atrações do mundo!</p>
```

#### **Em um Post**
```html
Planejando sua próxima viagem? Use nossa ferramenta de busca:

[viator_search]

Encontre milhares de experiências verificadas!
```

#### **Em um Widget**
```html
<!-- Widget de Texto -->
<h3>Buscar Passeios</h3>
[viator_search]
```

---

## 🎨 Personalização

### **CSS Customizado**
```css
/* Personalizar cores do plugin */
.viator-card {
    border-radius: 15px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.viator-search-wrapper input {
    border: 2px solid #04846B;
    border-radius: 25px;
}

/* Personalizar botões */
#search-button {
    background: linear-gradient(45deg, #04846B, #06A085);
    border-radius: 25px;
}
```

### **Hooks para Desenvolvedores**
```php
// Personalizar resultados de busca
add_filter('viator_search_results', 'minha_customizacao');

// Modificar configurações de idioma
add_filter('viator_locale_settings', 'meus_idiomas');

// Customizar curiosidades
add_filter('viator_fallback_curiosities', 'minhas_curiosidades');
```

---

## 🔧 Funcionalidades Técnicas

### **Sistema de Cache**
- Cache automático de produtos por 1 hora
- Cache de avaliações por 30 minutos
- Limpeza automática de cache expirado

### **SEO Otimizado**
- URLs amigáveis para produtos
- Meta tags automáticas
- Schema markup para rich snippets
- Sitemap integration ready

### **Segurança**
- Sanitização completa de inputs
- Validação de nonces
- Proteção contra XSS
- Rate limiting nas APIs

### **Debug e Logs**
```php
// Ativar debug mode
define('VIATOR_DEBUG', true);

// Localização dos logs
wp-content/debug.log
```

---

## 📊 Analytics e Métricas

O plugin registra automaticamente:
- Termos de busca mais populares
- Produtos mais visualizados
- Taxa de cliques por destino
- Performance de filtros

---

## 🆘 Suporte e Troubleshooting

### **Problemas Comuns**

#### **"Nenhum resultado encontrado"**
```
✅ Verificar se a chave API está correta
✅ Confirmar conectividade com a internet
✅ Testar com termos de busca em inglês
✅ Verificar logs de debug
```

#### **"Erro ao carregar"**
```
✅ Verificar se cURL está habilitado
✅ Confirmar versão do PHP (7.4+)
✅ Testar com timeout maior
✅ Verificar firewall/proxy
```

#### **Curiosidades não funcionam**
```
✅ Verificar chave Groq API
✅ Confirmar conexão com api.groq.com
✅ Fallback automático está ativo
```

### **Logs de Debug**
```php
// Ativar logs detalhados
add_action('init', function() {
    if (defined('WP_DEBUG') && WP_DEBUG) {
        viator_debug_log('Debug ativado');
    }
});
```

---

## 🔄 Changelog

### **Versão 1.0 (Atual)**
- ✅ Integração completa com Viator API
- ✅ Sistema de busca e filtros avançados
- ✅ Suporte multilíngue (PT/EN)
- ✅ Integração com Groq AI para curiosidades
- ✅ Sistema de cache e otimização
- ✅ Páginas de produto detalhadas
- ✅ Sistema de avaliações
- ✅ Interface responsiva
- ✅ URLs amigáveis

### **Próximas Versões**
- 🔄 Sistema de favoritos
- 🔄 Comparação de produtos
- 🔄 Integração com WooCommerce
- 🔄 Sistema de reservas
- 🔄 Analytics dashboard

---

## 📝 Licença

Este plugin é distribuído sob a licença GPL v2 ou posterior.

---

## 👥 Créditos

**Desenvolvido por:** Lucas Alves  
**Integração API:** Viator Official API  
**IA Powered by:** Groq Cloud API  
**Icons by:** Icons8  

---

## 🌟 Contribuições

Contribuições são bem-vindas! Para contribuir:

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📞 Contato e Suporte

- **Email:** [seu-email@exemplo.com]
- **GitHub:** [link-do-repositorio]
- **Documentação:** [link-documentacao]
- **Demo:** [link-demo]

---

*Transforme seu site WordPress em uma poderosa plataforma de busca de experiências de viagem com o Viator API Integration!*
