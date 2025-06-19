# 🎯 Shortcodes de Atrações Viator - Guia Completo

> **✨ Versão 1.5**
> - ✅ **Shortcode `[viator_attractions]`**: Crie carrosséis de atrações personalizados.
> - ✅ **Links Corrigidos**: Cards agora levam para a página correta da atração.
> - ✅ **Cache de 7 Dias**: Performance drasticamente melhorada para os carrosséis.
> - ✅ **Gestão de Cache Centralizada**: Agora localizada na página de Debug & Logs.

## 📋 Índice
1. [Shortcode Básico](#shortcode-básico)
2. [Shortcode Avançado](#shortcode-avançado)
3. [Parâmetros Disponíveis](#parâmetros-disponíveis)
4. [Exemplos Práticos](#exemplos-práticos)
5. [Sistema de Cache](#sistema-de-cache)
6. [Links e Navegação](#links-e-navegação)

---

## 🚀 Shortcode Básico

### Sintaxe Simples
```
[viator_attractions location="Paris"]
```

### Resultado
- Carrossel com atrações de Paris
- 4 cards no desktop, 3 no tablet, 1 no mobile
- Tamanho médio (250px de altura)
- Com botões de navegação
- **Links clicáveis** que abrem em nova aba para a página da atração

---

## ⚙️ Shortcode Avançado

### Sintaxe Completa
```
[viator_attractions 
    location="Rio de Janeiro" 
    cards_desktop="5" 
    cards_tablet="3" 
    cards_mobile="2" 
    size="large" 
    navigation="true" 
    title="🏖️ Melhores Atrações do Rio" 
    max="20"]
```

### Resultado Personalizado
- Carrossel com até 20 atrações do Rio
- 5 cards no desktop, 3 no tablet, 2 no mobile
- Tamanho grande (300px de altura)
- Título personalizado acima do carrossel
- Com navegação ativa

---

## 📝 Parâmetros Disponíveis

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `location` | **obrigatório** | - | Local, cidade, país ou ID da atração |
| `cards_desktop` | número | 4 | Cards visíveis no desktop (1-8) |
| `cards_tablet` | número | 3 | Cards visíveis no tablet (1-6) |
| `cards_mobile` | número | 1 | Cards visíveis no mobile (1-3) |
| `size` | texto | medium | Tamanho dos cards: `small`, `medium`, `large`, `extra-large` |
| `navigation` | booleano | true | Exibir botões de navegação: `true` ou `false` |
| `title` | texto | - | Título opcional acima do carrossel |
| `max` | número | 12 | Máximo de atrações a exibir (4-50) |

---

## 🎨 Exemplos Práticos

### 1. Paris - Compacto
```
[viator_attractions location="Paris" size="small" cards_desktop="6" title="🗼 Paris Express"]
```

### 2. Rio de Janeiro - Premium
```
[viator_attractions 
    location="Rio de Janeiro" 
    size="extra-large" 
    cards_desktop="3" 
    cards_tablet="2" 
    cards_mobile="1" 
    title="🇧🇷 Rio de Janeiro Premium" 
    max="15"]
```

### 3. Nova York - Minimalista
```
[viator_attractions location="New York" navigation="false" title="🗽 Big Apple"]
```

### 4. Londres - Máximo
```
[viator_attractions 
    location="London" 
    cards_desktop="8" 
    cards_tablet="4" 
    cards_mobile="2" 
    size="medium" 
    title="🇬🇧 Discover London" 
    max="30"]
```

### 5. Atração Específica por ID
```
[viator_attractions location="2177" title="🎭 Atrações Relacionadas" max="8"]
```

---

## 🏆 Sistema de Cache

### ⚡ Performance Inteligente
- **Cache automático de 7 dias** para todos os carrosséis
- **Chaves únicas** baseadas em localização, idioma e moeda
- **Zero requisições desnecessárias** à API da Viator
- **Carregamento instantâneo** após o primeiro acesso

### 🛠️ Gestão do Cache

#### Via Painel Admin
1. Acesse **IEP Turismo > Debug & Logs**
2. Clique na aba **Gerenciamento de Cache**
3. Encontre a seção **🎯 Cache de Atrações**
4. Clique em **"🗑️ Limpar Cache de Carrosséis (7 dias)"**
5. Aguarde a confirmação de sucesso.

#### Quando Limpar o Cache
- ✅ Atrações não aparecem ou estão desatualizadas.
- ✅ Links dos carrosséis não estão corretos.
- ✅ Problemas de carregamento dos carrosséis.
- ✅ Quer forçar uma atualização dos dados.

---

## 🔗 Links e Navegação

### ✨ Links Clicáveis
- **Todos os cards são clicáveis**
- **Abrem em nova aba** automaticamente
- **URLs otimizadas**: `/atracoes/{id}/`

### 🎯 Comportamento dos Links
```html
<!-- Estrutura gerada automaticamente -->
<a href="/atracoes/12345/" 
   target="_blank" 
   rel="noopener noreferrer"
   title="Ver detalhes de Torre Eiffel (abre em nova aba)">
```

### 🔍 SEO Friendly
- **URLs semânticas** para melhor SEO
- **Títulos descritivos** para acessibilidade
- **Links seguros** com `rel="noopener noreferrer"`

---

## 📱 Responsividade

### 🖥️ Desktop (1024px+)
- Padrão: 4 cards
- Máximo: 8 cards
- Espaçamento: 20px

### 📱 Tablet (768px - 1023px)
- Padrão: 3 cards
- Máximo: 6 cards
- Espaçamento: 20px

### 📱 Mobile (até 767px)
- Padrão: 1 card
- Máximo: 3 cards
- Espaçamento: 15px

---

## 🎨 Tamanhos Disponíveis

| Tamanho | Altura | Uso Recomendado |
|---------|--------|-----------------|
| `small` | 200px | Carrosséis compactos, muitos cards |
| `medium` | 250px | **Padrão** - equilibrio perfeito |
| `large` | 300px | Destaque visual, menos cards |
| `extra-large` | 350px | Máximo impacto, hero sections |

---

## 🔧 Dicas de Performance

### ⚡ Otimização
1. **Use o cache** - Deixe trabalhar por 7 dias
2. **Limite atrações** - Max 12-20 para melhor UX
3. **Tamanho adequado** - Medium para uso geral
4. **Cards balanceados** - 3-4 no desktop é ideal

### 🚀 Melhores Práticas
- ✅ Use títulos descritivos
- ✅ Teste em diferentes dispositivos
- ✅ Monitore tempo de carregamento
- ✅ Limpe cache apenas quando necessário

---

## 📞 Suporte e Troubleshooting

### ❓ Problemas Comuns

**Q: Cards não aparecem?**
```
A: Verifique se a API key está configurada e limpe o cache na página de Debug.
```

**Q: Links não funcionam ou vão para a página errada?**
```
A: Limpe o cache de atrações. Se o problema persistir, verifique as regras de rewrite em Configurações > Links Permanentes (salve novamente para recriá-las).
```

**Q: Carrossel demora para carregar?**
```
A: Normal no primeiro acesso. Próximos carregamentos serão instantâneos.
```

**Q: Como atualizar dados das atrações?**
```
A: Use o botão "Limpar Cache de Carrosséis" no painel de Debug para forçar a atualização.
```

---

## 🏷️ Versão e Changelog

### v1.5 - Carrosséis Personalizados e Cache
- ✅ **Shortcode `[viator_attractions]`**: Crie carrosséis de atrações personalizados.
- ✅ **Links de Atrações Corrigidos**: Cards agora levam para a página correta da atração.
- ✅ **Cache Inteligente de 7 Dias**: Performance drasticamente melhorada para os carrosséis.
- ✅ **Gestão de Cache Centralizada**: Movida para a página de Debug & Logs para melhor organização.
- ✅ **Lógica de ID Robusta**: Captura de IDs de atrações melhorada, resolvendo links quebrados.

### v1.0 - Lançamento Inicial
- ✅ Shortcode `[viator_search]`
- ✅ Carrosséis personalizáveis
- ✅ Responsividade completa
- ✅ Integração com API Viator

---

**🎯 Desenvolvido para WordPress por Lucas Alves**  
**📈 Otimizado para performance e SEO**  
**🔄 Atualizado constantemente com novas funcionalidades** 