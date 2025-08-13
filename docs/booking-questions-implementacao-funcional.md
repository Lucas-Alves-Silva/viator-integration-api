# Documentação de Implementação Funcional - Booking Questions API Viator

## Visão Geral

Este documento serve como referência completa para a implementação e funcionamento das **Booking Questions** da API Viator no sistema de reservas. Aqui documentamos todas as estruturas de Booking Questions identificadas, testadas e implementadas funcionalmente, fornecendo um controle detalhado das implementações e servindo como guia para correções e adequações futuras.

## Objetivo

Manter um registro organizado e atualizado de:
- ✅ **Estruturas funcionais** de Booking Questions implementadas
- 🔧 **Correções aplicadas** para cada tipo de produto
- 📋 **Requisitos específicos** de validação por produto
- 🎯 **Estratégias de implementação** para novos tipos
- 📊 **Logs e evidências** de funcionamento

## Histórico de Correções Críticas

### Problema Inicial: Validação de Dados do Responsável

O sistema apresentava erros de validação indicando que os campos obrigatórios do responsável (email, firstName, lastName) estavam vazios, mesmo com dados preenchidos corretamente.

#### Causas Identificadas

1. **Decodificação JSON inconsistente**: Dados do responsável não decodificados corretamente
2. **Validação de strings vazias**: Tratamento inadequado de strings com espaços
3. **Estrutura de dados**: Perda de dados durante construção dos arrays
4. **Falta de logs detalhados**: Dificuldade para rastrear perdas de dados

## Correções Implementadas

### 1. Melhorias na Decodificação JSON (ajax_confirm_booking)

```php
// Verificação de JSON válido antes de decodificar
if (empty($booker_info_raw)) {
    viator_debug_log('❌ [AJAX] booker_info está vazio ou não foi enviado');
    wp_send_json_error(['message' => 'Dados do responsável não foram enviados']);
}

$booker_info = json_decode(stripslashes($booker_info_raw), true);

// Verificar se a decodificação foi bem-sucedida
if (json_last_error() !== JSON_ERROR_NONE) {
    viator_debug_log('❌ [AJAX] Erro ao decodificar booker_info:', json_last_error_msg());
    wp_send_json_error(['message' => 'Erro ao processar dados do responsável']);
}
```

### 2. Validação Aprimorada de Campos Obrigatórios

```php
// Verificar se os campos obrigatórios do responsável estão preenchidos
$required_fields = ['email', 'firstName', 'lastName'];
$missing_fields = [];

foreach ($required_fields as $field) {
    if (empty($booker_info[$field]) || trim($booker_info[$field]) === '') {
        $missing_fields[] = $field;
    }
}

if (!empty($missing_fields)) {
    wp_send_json_error([
        'message' => 'Informações do responsável incompletas: ' . implode(', ', $missing_fields),
        'missing_fields' => $missing_fields
    ]);
}
```

### 3. Fallback Crítico para Dados do Responsável

```php
// Fallback crítico: se algum item não tem dados do responsável, aplicar do booker_info
foreach ($request_data['items'] as $index => &$item) {
    $email = $item['communication']['email'] ?? '';
    $firstName = $item['travelers'][0]['firstName'] ?? '';
    $lastName = $item['travelers'][0]['lastName'] ?? '';
    
    if (empty($email) || empty($firstName) || empty($lastName)) {
        // Aplicar dados do responsável como fallback
        $item['communication']['email'] = $booker_info['email'] ?? '';
        $item['communication']['phone'] = $booker_info['phone'] ?? '';
        $item['travelers'][0]['firstName'] = $booker_info['firstName'] ?? '';
        $item['travelers'][0]['lastName'] = $booker_info['lastName'] ?? '';
    }
}
```

### 4. Logs Detalhados para Debugging

Foram adicionados logs em todas as etapas do processo:

- **Recebimento de dados**: Log do JSON bruto recebido
- **Decodificação**: Verificação de erros de JSON
- **Validação**: Log detalhado de cada campo validado
- **Construção**: Log da estrutura final antes do envio
- **Fallback**: Log quando dados são corrigidos automaticamente

### 5. Validação de Strings com Trim

As validações agora usam `trim()` para garantir que strings com apenas espaços sejam tratadas como vazias:

```php
if (empty($item['communication']['email']) || trim($item['communication']['email']) === '') {
    // Tratar como campo vazio
}
```

### 6. Mesclagem robusta de Booking Questions (frontend)

- Problema: respostas `PER_BOOKING` (ex.: `PICKUP_POINT`) podiam ser sobrescritas/perdidas quando `collectDetailedTravelersData()` retornava apenas `PER_TRAVELER` na confirmação.
- Solução: mesclar sempre as respostas persistidas do Step 3 com as retornadas na confirmação, com deduplicação por `(question, travelerNum)` e preservando `PER_BOOKING`.

Trecho (JS, simplificado):

```javascript
// Em confirmBooking()
const keyOf = (ans) => {
  const q = ans.question || ans.questionId || '';
  const t = (typeof ans.travelerNum === 'undefined' && typeof ans.travelerIndex === 'undefined') ? 'PB' : String(ans.travelerNum ?? ans.travelerIndex);
  return `${q}::${t}`;
};
const mergedMap = new Map();
(existingAnswers || []).forEach((ans) => mergedMap.set(keyOf(ans), ans));
(travelerAnswers || []).forEach((ans) => {
  if ((ans?.answer ?? '') !== '') mergedMap.set(keyOf(ans), ans);
});
bookingQuestionAnswers = Array.from(mergedMap.values());
```

Resultado:
- ✅ `PICKUP_POINT` nunca é perdido na confirmação
- ✅ Respostas `PER_TRAVELER` e `PER_BOOKING` coexistem corretamente

### 7. UX e Validação unificadas (Etapas 3 e 4)

- Etapa 3 (Informações):
  - ✅ Exigência: usuário deve selecionar uma opção de `PICKUP_POINT` ou informar endereço antes de avançar.
  - ✅ Erros desaparecem dinamicamente ao selecionar um rádio ou digitar o endereço (limpeza automática de `is-invalid` + `hideFieldError` + `hideDateError`).
  - ✅ Removido o heading `<h4>Informações Gerais da Reserva</h4>` na seção `per-booking-section`.
  - ✅ Texto padronizado da opção: “📞 Vou decidir depois”.

- Etapa 4 (Pagamento):
  - ✅ Validação visual padronizada com a Etapa 2 (bordas `is-invalid` e `.error-message`).
  - ✅ Botão renomeia para “Processando...” durante validação/processamento e volta ao normal em erro/sucesso.
  - ✅ Mensagem “Problemas encontrados” limpa ao corrigir e tentar novamente; foco no primeiro campo inválido.

## Como Testar as Correções

### 1. Teste Manual via Browser

1. Acesse um produto de teste: `http://ingressos-e-passeioscom.local/passeio/6613GRANDCELE/`
2. Preencha todos os dados do responsável
3. Tente finalizar a reserva
4. Verifique o arquivo de log: `viator-debug.log`

### 1.1 Teste de `PICKUP_POINT` (Etapa 3)

1. Avance à Etapa 3 e tente prosseguir sem selecionar uma opção de `PICKUP_POINT` ou sem digitar endereço
2. Verifique se a navegação é bloqueada e se o erro aparece no padrão da Etapa 2
3. Selecione “Vou decidir depois” OU “Escolher de uma lista” e escolha um item OU digite um endereço
4. Confirme que a mensagem de erro desaparece imediatamente e a navegação é liberada

### 2. Teste Automatizado

Use o arquivo de teste criado:
- Acesse: `http://ingressos-e-passeioscom.local/wp-content/plugins/viator-integration/test-booking-debug.php`
- Este teste verificará a estrutura dos dados e as validações

### 3. Verificação de Logs

Os logs incluirão as seguintes tags para facilitar a busca:

- `[AJAX]` - Processamento de dados no AJAX
- `[VALIDATION]` - Validações de campos
- `[POST-CONSTRUCTION]` - Verificação após construção dos dados
- `[CONFIRM]` - Confirmação final da reserva

## Estrutura de Dados Esperada

### Dados do Responsável (booker_info)

```json
{
    "email": "cliente@email.com",
    "firstName": "João",
    "lastName": "Silva",
    "phone": "+5511999999999",
    "countryCode": "BR"
}
```

### Estrutura do Item na Requisição

```json
{
    "productCode": "PROD123",
    "communication": {
        "email": "cliente@email.com",
        "phone": "+5511999999999"
    },
    "travelers": [
        {
            "firstName": "João",
            "lastName": "Silva",
            "leadTraveller": true
        }
    ]
}
```

## Mensagens de Erro Melhoradas

As mensagens de erro agora são mais específicas:

- "Informações do responsável incompletas: email, firstName"
- "Item 0: email do responsável vazio"
- "Erro ao processar dados do responsável"

## 📋 Histórico de Implementações

### ✅ Implementação 3: Sistema Dinâmico de Booking Questions
**Data:** Dezembro 2024  
**Status:** ✅ Funcional e Compatível com API Viator

**Descrição:**
Implementação completa do sistema dinâmico de booking questions seguindo a especificação oficial da Viator API.

**Funcionalidades Implementadas:**
- ✅ Carregamento dinâmico via endpoint `/wp-json/viator/v1/booking-questions/{productCode}`
- ✅ Renderização automática baseada no tipo de pergunta (STRING, DATE, NUMBER_AND_UNIT, etc.)
- ✅ Separação correta entre perguntas PER_BOOKING e PER_TRAVELER
- ✅ Validação de campos obrigatórios
- ✅ Coleta e formatação de respostas para envio à API
- ✅ Fallback para sistema legado quando necessário
- ✅ Cache inteligente para otimização de performance
- ✅ Logs detalhados para debugging

**Arquivos Principais:**
- `viator-booking.js` - Lógica principal de renderização e coleta
- `viator-dynamic-booking-questions.php` - Endpoint WordPress
- `viator-dynamic-booking-questions.css` - Estilos específicos

**Compatibilidade API:**
- ✅ Formato de resposta compatível com POST `/bookings/cart/book`
- ✅ Validação de tipos de dados conforme especificação
- ✅ Tratamento correto de perguntas obrigatórias vs opcionais

### ✅ Correção 1: Renderização da Seção de Idioma
**Data:** Dezembro 2024  
**Status:** ✅ Corrigido e Funcional

**Problema Identificado:**
A função `renderLanguageGuideSection()` estava implementada mas nunca era chamada, resultando na seção de idioma da excursão não sendo renderizada na Etapa 3. Além disso, a seção `additional-booking-info-section` estava sendo ocultada na etapa 2 mas nunca era exibida novamente na etapa 3.

**Solução Implementada:**
- ✅ Modificada a função `renderLanguageGuideSection()` para inserir o HTML diretamente no container `language-guide-container`
- ✅ Adicionada lógica para exibir a seção `additional-booking-info-section` na etapa 3 em `renderDynamicBookingQuestions()`
- ✅ Adicionada lógica para exibir a seção `additional-booking-info-section` na etapa 3 em `renderBookingQuestions()` (sistema legado)
- ✅ Adicionada lógica para exibir a seção `additional-booking-info-section` em cenários sem perguntas (ambos os sistemas)
- ✅ Adicionados logs de debug para rastreamento da renderização
- ✅ Verificado que `collectLanguageGuideAnswers()` já estava sendo chamada corretamente

**Arquivos Modificados:**
- `viator-booking.js` - Função `renderLanguageGuideSection` (linhas 6668-6720) - Modificada para inserir HTML no DOM
- `viator-booking.js` - Função `renderDynamicBookingQuestions` (linha 4770) - Exibição da seção
- `viator-booking.js` - Função `renderBookingQuestions` (linha 3780) - Exibição da seção (sistema legado)
- `viator-booking.js` - Cenário sem perguntas - sistema dinâmico (linha 4730)
- `viator-booking.js` - Cenário sem perguntas - sistema legado (linha 3720)

**Resultado:**
✅ A seção de idioma da excursão agora é renderizada corretamente em todos os cenários (com/sem perguntas, sistema dinâmico/legado).
✅ A seção `additional-booking-info-section` é exibida corretamente na etapa 3 das perguntas de reserva.

### ✅ Implementação 3: PICKUP_POINT (validação condicional)
**Data:** Agosto 2025  
**Produto Testado:** `100143P7`  
**Status:** ✅ Implementado e validado

**Contexto:**
- Booking Question `PICKUP_POINT` (type `LOCATION_REF_OR_FREE_TEXT`, `required: CONDITIONAL`).
- Para robustez do fluxo e evitar erros de confirmação, a UI agora exige a seleção de uma opção (ou endereço) na Etapa 3 antes de avançar. `CONTACT_SUPPLIER_LATER` é válido quando ofertado pelo produto.

**Ajustes aplicados (viator-booking.js):**
- Etapa 3 bloqueia avanço sem seleção de `PICKUP_POINT` (ou endereço)
- Preferência por texto livre quando ambos (`LOCATION_REFERENCE` e `FREETEXT`) forem preenchidos
- Limpeza dinâmica de erros ao selecionar rádios/digitar endereço

**Resultado:**
- Erros de confirmação por falta de `PICKUP_POINT` eliminados
- UX consistente e sem mensagens persistentes indevidas

### ✅ Implementação 4: Correção Crítica PER_TRAVELER
**Data:** Agosto 2025  
**Produto Testado:** `100143P7`  
**Status:** ✅ Implementado e validado

**Contexto:**
- Erro "Missing answers for: AGEBAND, FULL_NAMES_FIRST, FULL_NAMES_LAST, HEIGHT" na API da Viator.
- Perguntas PER_TRAVELER não estavam sendo coletadas corretamente na confirmação.

**Ajustes aplicados (viator-booking.js):**
- **Coleta robusta de PER_TRAVELER:** Seletores combinados (`.question-input` + `[id*="traveler_"][data-question-id]`).
- **Formato correto das respostas:** Seguindo documentação oficial da Viator:
  ```json
  {
    "question": "AGEBAND",
    "answer": "ADULT", 
    "travelerNum": 1
  }
  ```
- **Função de recuperação crítica:** `ensureCriticalPerTravelerAnswers()` para buscar especificamente AGEBAND, FULL_NAMES_FIRST, FULL_NAMES_LAST, HEIGHT.
- **Extração robusta do travelerNum:** Múltiplos padrões (`traveler_(\d+)_`, `data-traveler`).
- **Redução de logs spam:** Limitados a 5 objetos PICKUP_POINT.

**Resultado:** ✅ Perguntas PER_TRAVELER coletadas corretamente com `travelerNum` apropriado

### ✅ Implementação 5: Conjunto PER_TRAVELER + PER_BOOKING (Produto 100427P4)
**Data:** Agosto 2025  
**Produto Testado:** `100427P4`  
**Status:** ✅ Funcional e Reserva concluída com sucesso

**Resumo do caso:**
- bookingQuestions presentes (conforme logs):
```json
["AGEBAND","DATE_OF_BIRTH","FULL_NAMES_FIRST","FULL_NAMES_LAST","PASSPORT_EXPIRY","PASSPORT_NATIONALITY","PASSPORT_PASSPORT_NO","PICKUP_POINT","SPECIAL_REQUIREMENTS","WEIGHT"]
```
- Disponibilidade confirmada: BRL; total recomendado 8889.92; travelDate 2025-08-14/15 (formato API: YYYY-MM-DD)
- Todas as etapas do fluxo preenchidas; confirmação exibida como CONFIRMED

**Detalhamento por grupo:**
- PER_TRAVELER obrigatórios: `DATE_OF_BIRTH`, `PASSPORT_EXPIRY`, `PASSPORT_NATIONALITY`, `PASSPORT_PASSPORT_NO`, `WEIGHT`, além de `FULL_NAMES_FIRST`, `FULL_NAMES_LAST`, `AGEBAND`.
- PER_BOOKING: `PICKUP_POINT` (CONDICIONAL) e `SPECIAL_REQUIREMENTS` (OPCIONAL).

**Validações aplicadas:**
- Etapa 2: coleta e persistência de todos os PER_TRAVELER acima, com máscara/unidade (WEIGHT) e validação de formato.
- Etapa 3: bloqueio de avanço sem `PICKUP_POINT`; limpeza dinâmica de erro ao selecionar/digitar.
- Etapa 4: validação padronizada; botão “Processando...” durante verificação/pagamento.
- Etapa 5: exibição da data no padrão pt-BR (dd/MM/yyyy) apenas na UI; sem impacto no payload (continua ISO YYYY-MM-DD). Correção de formatação do preço (pt-BR) e seta de selects.

**Resultado:**
- ✅ Reserva concluída com sucesso para `100427P4` com todas as booking questions atendidas.
- ✅ Tipos `DATE_OF_BIRTH`, `PASSPORT_EXPIRY`, `PASSPORT_NATIONALITY`, `PASSPORT_PASSPORT_NO` e `WEIGHT` marcados como funcionais.

---

### ✅ Implementação 6: Conjunto PER_TRAVELER (Produto 101291P1)
**Data:** Agosto 2025  
**Produto Testado:** `101291P1`  
**Status:** ✅ Fluxo completo bem-sucedido (hold, pagamento e confirmação)

**bookingQuestions detectadas (log):**
```json
["AGEBAND","DATE_OF_BIRTH","FULL_NAMES_FIRST","FULL_NAMES_LAST","HEIGHT","SPECIAL_REQUIREMENTS","WEIGHT"]
```

**Evidências do log (resumo):**
- Availability OK: currency BRL; travelDate 2025-08-15; startTime 16:30; total recomendado 694.53
- Hold criado: `cartRef` presente; `paymentSessionToken` recebido; totalHeldPrice 694.53
- Pagamento: cartão Visa test processado via TA Payments; `sessionAccountToken` retornado
- Confirmação enviada: `bookingRef` BR-597854503; status PENDING; `totalPendingPrice` 694.53
- `languageGuide` aplicado corretamente nos itens e na raiz (type GUIDE, language "es")
- `bookingQuestionAnswers` enviados (7): FULL_NAMES_FIRST/LAST, AGEBAND, DATE_OF_BIRTH, HEIGHT (cm), WEIGHT (kg), SPECIAL_REQUIREMENTS

**Validações por etapa:**
- Etapa 2: coleta de `DATE_OF_BIRTH`, `HEIGHT` (com unidade), `WEIGHT` (com unidade), nomes e `AGEBAND` por viajante
- Etapa 3: sem `PICKUP_POINT` neste produto; `SPECIAL_REQUIREMENTS` opcional
- Etapa 4: validação padronizada; botão “Processando...”
- Etapa 5: data exibida dd/MM/yyyy na UI; preço em pt-BR; payload preserva ISO/numéricos

**Resultado:**
- ✅ Reserva concluída com sucesso (status PENDING, voucher pendente do operador)
- ✅ Tipos `HEIGHT` e `WEIGHT` confirmados como funcionais neste produto

---

### ✅ Implementação 2: Correção de Duplicação de Formulário de Viajantes
**Data:** Janeiro 2025  
**Produto Testado:** `100143P7` (Excursão de Ciclismo às Ruínas dos Templos de Beng Mealea)  
**Booking Questions:** `FULL_NAMES_FIRST`, `FULL_NAMES_LAST`, `HEIGHT`, `PICKUP_POINT`, `SPECIAL_REQUIREMENTS`, `AGEBAND`  
**Status:** ✅ **RESOLVIDO**

**Problema Identificado:**
O formulário de viajantes estava sendo duplicado nas etapas 2 (Viajantes) e 3 (Informações), exibindo "undefined undefined" na etapa 3, causando erros na finalização do pagamento.

**Causa Raiz:**
A função `renderDynamicBookingQuestions` tentava acessar propriedades `firstName` e `lastName` dos viajantes que não existiam na estrutura de dados `selectedTravelers`, que contém apenas `ageBand` e `numberOfTravelers`.

**Solução Implementada:**
1. **Correção da Renderização de Viajantes** no arquivo `viator-booking.js`:
   - Função `renderDynamicBookingQuestions()` corrigida para expandir grupos de viajantes em viajantes individuais
   - Substituído acesso a `traveler.firstName` e `traveler.lastName` por identificação baseada em `ageBand`
   - Implementado loop correto para processar `numberOfTravelers` por grupo

2. **Estrutura de Dados Corrigida:**
   - Reconhecimento da estrutura real: `[{ageBand: 'ADULT', numberOfTravelers: 1}]`
   - Expansão correta para viajantes individuais: "Viajante 1 (ADULT)", "Viajante 2 (CHILD)", etc.

**Arquivos Modificados:**
- `viator-booking.js` (função `renderDynamicBookingQuestions`, linhas 4780-4790)

**Resultado:**
- ✅ Eliminação da duplicação do formulário de viajantes
- ✅ Exibição correta de "Viajante X (AGEBAND)" ao invés de "undefined undefined"
- ✅ Etapa 3 exibe apenas as Booking Questions apropriadas
- ✅ Processo de reserva funcionando sem erros de renderização

### ✅ Implementação 1: Correção de Validação de Campos Obrigatórios
**Data:** Janeiro 2025  
**Produto Testado:** `100143P7` (Excursão de Ciclismo às Ruínas dos Templos de Beng Mealea)  
**Booking Questions:** `FULL_NAMES_FIRST`, `FULL_NAMES_LAST`  
**Status:** ✅ **RESOLVIDO**

**Problema Identificado:**
O sistema apresentava erros de validação indicando que os campos obrigatórios do responsável (email, firstName, lastName) estavam vazios, mesmo com dados preenchidos corretamente.

**Causa Raiz:**
Discrepância entre os nomes dos campos no frontend (`booker-firstname`, `booker-lastname`, `booker-email`) e os esperados no backend (`firstName`, `lastName`, `email`).

**Solução Implementada:**
1. **Correção do Mapeamento de Campos** no arquivo `viator-booking.js`:
   - Função `collectBookerInfo()` corrigida para mapear corretamente os campos do DOM
   - Adicionado mapeamento: `booker-firstname` → `firstName`, `booker-lastname` → `lastName`, `booker-email` → `email`

2. **Melhorias na Validação:**
   - Adicionados logs de debug para rastreamento
   - Validação de campos obrigatórios aprimorada
   - Tratamento de erros mais robusto

**Arquivos Modificados:**
- `viator-booking.js` (função `collectBookerInfo`)
- Logs de debug adicionados para monitoramento

**Resultado:**
- ✅ Validação de campos obrigatórios funcionando corretamente
- ✅ Dados do responsável sendo coletados e enviados adequadamente
- ✅ Processo de reserva fluindo sem erros de validação
- ✅ Booking Questions `FULL_NAMES_FIRST` e `FULL_NAMES_LAST` funcionais

## 📋 Implementações Funcionais Documentadas

### 🎯 Implementação #1: SPECIAL_REQUIREMENTS

**Status**: ✅ **FUNCIONAL** | **Data**: 2025-01-08 | **Produto Teste**: 47668MADAME

#### Detalhes da Implementação

| Campo | Valor |
|-------|-------|
| **Produto de Teste** | `47668MADAME` |
| **URL de Teste** | `http://ingressos-e-passeioscom.local/passeio/47668MADAME/` |
| **Booking Question ID** | `SPECIAL_REQUIREMENTS` |
| **Tipo** | `STRING` |
| **Grupo** | `PER_BOOKING` |
| **Obrigatório** | `OPTIONAL` |
| **Resultado** | ✅ **SUCESSO** - Reserva processada |

#### Estrutura JSON Identificada

```json
{
  "legacyBookingQuestionId": 27,
  "id": "SPECIAL_REQUIREMENTS",
  "type": "STRING",
  "group": "PER_BOOKING",
  "label": "Requisitos Especiais",
  "required": "OPTIONAL",
  "maxLength": 1000,
  "hint": "Restrições alimentares, acessibilidade, etc."
}
```

#### Validações Implementadas

- ✅ **Campo opcional**: Não bloqueia reserva se vazio
- ✅ **Limite de caracteres**: Máximo 1000 caracteres
- ✅ **Integração com bookerInfo**: Dados incluídos corretamente
- ✅ **Logs de debug**: Rastreamento completo implementado

#### Evidências de Funcionamento

**Logs de Confirmação**:
- `bookerInfo` presente na estrutura: **✅ SIM**
- `bookerInfo` no JSON final: **✅ SIM**
- Estrutura final: `cartRef`, `paymentToken`, `bookerInfo`, `communication`, `items`

**Teste Real**: Reserva processada com sucesso em ambiente local

### 📝 Template para Novas Implementações

```markdown
### 🎯 Implementação #X: [BOOKING_QUESTION_ID]

**Status**: 🔄 **EM DESENVOLVIMENTO** | **Data**: YYYY-MM-DD | **Produto Teste**: [PRODUCT_CODE]

#### Detalhes da Implementação

| Campo | Valor |
|-------|-------|
| **Produto de Teste** | `[PRODUCT_CODE]` |
| **URL de Teste** | `http://ingressos-e-passeioscom.local/passeio/[PRODUCT_CODE]/` |
| **Booking Question ID** | `[BOOKING_QUESTION_ID]` |
| **Tipo** | `[TYPE]` |
| **Grupo** | `[GROUP]` |
| **Obrigatório** | `[REQUIRED]` |
| **Resultado** | ⏳ **PENDENTE** |

#### Estrutura JSON Identificada

```json
{
  "legacyBookingQuestionId": 0,
  "id": "[BOOKING_QUESTION_ID]",
  "type": "[TYPE]",
  "group": "[GROUP]",
  "label": "[LABEL]",
  "required": "[REQUIRED]",
  "allowedAnswers": [],
  "hint": "[HINT]"
}
```

#### Validações Implementadas

- ⏳ **[Validação 1]**: Descrição
- ⏳ **[Validação 2]**: Descrição
- ⏳ **[Validação 3]**: Descrição

#### Evidências de Funcionamento

**Logs de Confirmação**: ⏳ Pendente
**Teste Real**: ⏳ Pendente
```

## 🔍 Análise de Tipos de Booking Questions

### Documentação de Referência Oficial
- **Implementação**: https://partnerresources.viator.com/travel-commerce/merchant/implementing-booking-questions/
- **API Técnica**: https://docs.viator.com/partner-api/technical/#section/Booking-concepts/Booking-questions
- **Endpoint**: `/partner/products/{productCode}/booking-questions`

### Status de Implementação por Tipo

| Tipo | Status | Produto Teste | Complexidade | Prioridade |
|------|--------|---------------|--------------|------------|
| `SPECIAL_REQUIREMENTS` | ✅ **FUNCIONAL** | 47668MADAME | 🟢 Baixa | Alta |
| `PICKUP_POINT` | ✅ **FUNCIONAL** | 100143P7 | 🟡 Média | Alta |
| `WEIGHT` | ✅ **FUNCIONAL** | 100427P4/101291P1 | 🟢 Baixa | Média |
| `FULL_NAMES_FIRST` | ✅ **FUNCIONAL** | 100143P7 | 🟡 Média | Alta |
| `FULL_NAMES_LAST` | ✅ **FUNCIONAL** | 100143P7 | 🟡 Média | Alta |
| `AGEBAND` | ✅ **FUNCIONAL** | 100143P7/100427P4/101291P1 | 🔴 Alta | Média |
| `DIETARY_REQUIREMENTS` | ⏳ **PENDENTE** | - | 🟢 Baixa | Baixa |
| `MOBILITY_REQUIREMENTS` | ⏳ **PENDENTE** | - | 🟡 Média | Baixa |

### Estratégia de Implementação

#### Fase 1: Tipos Simples (STRING/OPTIONAL)
1. ✅ `SPECIAL_REQUIREMENTS` - Concluído
2. ⏳ `DIETARY_REQUIREMENTS` - Próximo
3. ⏳ `WEIGHT` - Próximo

#### Fase 2: Tipos com Validação (REQUIRED)
1. ✅ `FULL_NAMES_FIRST/LAST` - Implementado
2. ✅ `PICKUP_POINT` - Seleção obrigatória na Etapa 3

#### Fase 3: Tipos Complexos (MULTIPLE_CHOICE/CONDITIONAL)
1. ⏳ `AGEBAND` - Faixas etárias específicas
2. ⏳ `MOBILITY_REQUIREMENTS` - Requisitos especiais

### Diretrizes de Implementação

1. **Análise Dinâmica**: Cada produto deve ter suas booking questions analisadas via API
2. **Validação Específica**: Implementar validações baseadas no tipo e obrigatoriedade
3. **Interface Adaptativa**: Frontend deve se adaptar aos campos obrigatórios de cada produto
4. **Fallback Robusto**: Manter sistema de fallback para dados do responsável
5. **Logs Detalhados**: Implementar rastreamento completo para cada tipo

## 🎯 Roadmap de Implementação

### Fase Atual: Documentação e Estruturação
1. **✅ Concluído**: Implementação SPECIAL_REQUIREMENTS (47668MADAME)
2. **✅ Concluído**: Estruturação da documentação funcional
3. **🔄 Em Andamento**: Template para novas implementações

### Próximas Fases

#### Fase 1: Tipos Simples (Q1 2025)
- **📋 Próximo**: Identificar produtos com `DIETARY_REQUIREMENTS`
- **📋 Próximo**: Implementar validação para `WEIGHT`
- **📋 Próximo**: Testar campos opcionais simples

#### Fase 2: Tipos Obrigatórios (Q1-Q2 2025)
- **🎯 Futuro**: Implementar `DIETARY_REQUIREMENTS`

#### Fase 3: Tipos Complexos (Q2 2025)
- **🎯 Futuro**: Implementar `MOBILITY_REQUIREMENTS`
- **🎯 Futuro**: Sistema de validação condicional

### Monitoramento Contínuo
- **📊 Sempre**: Acompanhar logs de diferentes tipos de produtos
- **📊 Sempre**: Validar integridade dos dados em produção
- **📊 Sempre**: Documentar novos tipos identificados

## 📁 Arquivos do Sistema

### Arquivos Principais
- `viator-booking.php` - Lógica principal de booking e validações
- `viator-dynamic-booking-questions.php` - Sistema dinâmico de perguntas
- `viator-debug.log` - Logs de debug e monitoramento

### Documentação
- `docs/booking-questions-implementacao-funcional.md` - Este documento
- `docs/BOOKING_QUESTIONS_IMPLEMENTATION_REPORT.md` - Relatório técnico
- `docs/DYNAMIC_BOOKING_QUESTIONS_IMPLEMENTATION.md` - Implementação dinâmica

## 🆘 Guia de Resolução de Problemas

### Checklist de Debug
1. **Verificar logs**: `viator-debug.log`
2. **Testar estrutura**: Usar template de implementação
3. **Validar JSON**: Confirmar estrutura da API
4. **Testar produto**: URL de teste específica
5. **Verificar frontend**: Dados enviados corretamente

### Contatos e Suporte
- **Logs de Debug**: `viator-debug.log`
- **Documentação API**: Links oficiais na seção de referência
- **Testes Locais**: `http://ingressos-e-passeioscom.local/`

## 📝 Controle de Versões

| Versão | Data | Alterações | Responsável |
|--------|------|------------|-------------|
| 1.0 | 2025-01-08 | Criação da documentação funcional | Sistema |
| 1.1 | 2025-01-08 | Implementação SPECIAL_REQUIREMENTS | Sistema |
| 1.2 | 2025-01-08 | Template e estrutura para novas implementações | Sistema |
| 1.3 | 2025-08-12 | PICKUP obrigatório na Etapa 3; validação Etapa 4 padronizada; mesclagem robusta PER_BOOKING + PER_TRAVELER; remoção do heading em per-booking | Sistema |
| 1.4 | 2025-08-13 | Caso funcional 100427P4 documentado; PER_TRAVELER (DOB, Passaporte, WEIGHT) funcionais; ajustes de exibição pt-BR (data, moeda) e UI dos selects | Sistema |
| 1.5 | 2025-08-13 | Caso funcional 101291P1 documentado; HEIGHT/WEIGHT confirmados; fluxo hold→pagamento→confirmação bem-sucedido; languageGuide padronizado | Sistema |

---

**📌 Nota**: Este documento é atualizado automaticamente a cada nova implementação funcional de Booking Questions. Mantenha-o sempre como referência principal para o desenvolvimento e manutenção do sistema.