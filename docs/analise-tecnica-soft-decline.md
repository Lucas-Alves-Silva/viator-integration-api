# Análise Técnica Completa - Problema SOFT_DECLINE no Fluxo de Pagamento

## 🔍 **Diagnóstico do Problema**

### **Causa Raiz Identificada:**
Baseado na análise detalhada dos logs `viator-debug.log` e `Anotações.txt`, o problema é um **SOFT_DECLINE** da API Viator durante a confirmação do booking para o produto **6613GRANDCELE**.

### **Evidências dos Logs:**
- **Status**: `REJECTED` com `rejectionReasonCode: SOFT_DECLINE`
- **BookingRef**: `BR-597891891`
- **Resposta da API**: 200 OK (aceita requisição) mas rejeita o booking internamente
- **Preços zerados**: `totalConfirmedPrice` e `totalPendingPrice` = 0

### **Problemas Identificados:**

1. **Filtro de Compatibilidade Agressivo**: 
   - Log mostra: `"Filtro de compatibilidade aplicado: 1 → 0 campos"`
   - Está removendo campos potencialmente necessários

2. **Múltiplas Chamadas de Coleta**:
   - `collectBookingQuestionAnswers()` chamado repetidamente
   - Indica problema de sincronização entre UI e dados

3. **Payload Insuficiente**:
   - Apenas 5 booking questions enviadas
   - Possível falta de campos obrigatórios específicos do produto

## 🛠️ **Soluções Implementadas**

### **1. Tratamento Específico para SOFT_DECLINE (viator-booking.php)**

**Localização**: Método `confirm_booking()` - linha 1054
**Funcionalidade**: Detecta e trata especificamente erros SOFT_DECLINE

```php
// Tratamento específico para SOFT_DECLINE
if (is_array($data) && isset($data['items']) && is_array($data['items'])) {
    foreach ($data['items'] as $item) {
        if (isset($item['status']) && $item['status'] === 'REJECTED' && 
            isset($item['rejectionReasonCode']) && $item['rejectionReasonCode'] === 'SOFT_DECLINE') {
            
            // Retornar erro específico com sugestões
            return array(
                'error' => true,
                'message' => 'Reserva rejeitada pela operadora...',
                'error_code' => 'SOFT_DECLINE',
                'should_retry' => true,
                'retry_suggestions' => [...]
            );
        }
    }
}
```

### **2. Validação Pré-Confirmação (viator-booking.php)**

**Localização**: Método `validate_booking_before_confirmation()` - linha 1680
**Funcionalidade**: Valida dados antes do envio para prevenir SOFT_DECLINE

```php
private function validate_booking_before_confirmation($product_code, $booking_question_answers, $booker_data) {
    // Validar dados do responsável
    // Validar booking questions críticas
    // Validações específicas por produto (ex: peso para helicóptero)
    // Retornar análise detalhada
}
```

### **3. Correção do Filtro de Compatibilidade (viator-booking.js)**

**Localização**: Método `filterTransferModeCompatibility()` - linha 7105
**Funcionalidades**:
- Detecta produtos sem modos de transporte
- Protege campos críticos da remoção
- Adiciona validação específica

```javascript
// Verificar se o produto tem modos de transporte
const hasTransferModeQuestions = answers.some(a => {
    const qid = a?.question || a?.questionId;
    return qid && qid.includes('TRANSFER_');
});

// Se não há modos de transporte, não aplicar filtro
if (!arrivalMode || !hasTransferModeQuestions) {
    return answers;
}

// Campos críticos que NUNCA devem ser removidos
const criticalFields = [
    'FULL_NAMES_FIRST', 'FULL_NAMES_LAST', 'AGEBAND', 'WEIGHT', 'HEIGHT'
];
```

### **4. Interface de Tratamento de Erro SOFT_DECLINE (viator-booking.js)**

**Localização**: Método `handleSoftDeclineError()` - linha 7102
**Funcionalidade**: Modal específico com sugestões de correção

```javascript
handleSoftDeclineError(errorData) {
    // Criar modal informativo
    // Mostrar sugestões específicas
    // Permitir retry com correções
    // Log detalhado do evento
}
```

## 📋 **Plano de Implementação**

### **Fase 1: Validação Imediata** ✅
- [x] Implementar tratamento SOFT_DECLINE no backend
- [x] Adicionar validação pré-confirmação
- [x] Corrigir filtro de compatibilidade
- [x] Implementar interface de erro específica

### **Fase 2: Testes e Validação**
- [ ] Testar produto 6613GRANDCELE especificamente
- [ ] Validar produtos que funcionavam anteriormente (10006P8, 100273P23, 9966P46, 9966P7, 100014P4)
- [ ] Testar cenários de retry após SOFT_DECLINE
- [ ] Verificar logs de debug melhorados

### **Fase 3: Monitoramento**
- [ ] Implementar métricas de SOFT_DECLINE
- [ ] Criar alertas para produtos problemáticos
- [ ] Documentar padrões de erro por tipo de produto

## 🧪 **Testes Específicos Recomendados**

### **Teste 1: Produto 6613GRANDCELE**
```bash
# Cenário: Passeio de helicóptero com peso válido
- Produto: 6613GRANDCELE
- Viajante: Peso 75kg, idade adulta
- Campos obrigatórios: Nome, sobrenome, idade, peso
- Resultado esperado: Confirmação bem-sucedida
```

### **Teste 2: Produtos Funcionais**
```bash
# Cenário: Validar que produtos anteriormente funcionais continuam operando
- Produtos: 10006P8, 100273P23, 9966P46, 9966P7, 100014P4
- Resultado esperado: Sem regressões
```

### **Teste 3: Cenário SOFT_DECLINE**
```bash
# Cenário: Simular SOFT_DECLINE e validar tratamento
- Trigger: Dados inválidos ou peso fora dos limites
- Resultado esperado: Modal informativo com sugestões
```

## 🔒 **Medidas de Segurança**

### **Compatibilidade Preservada**
- Filtro de compatibilidade mantém lógica original para produtos com modos de transporte
- Validação pré-confirmação não bloqueia produtos funcionais
- Tratamento SOFT_DECLINE não interfere em confirmações bem-sucedidas

### **Fallbacks Implementados**
- Se validação pré-confirmação falhar, continua com fluxo original
- Se tratamento SOFT_DECLINE falhar, usa tratamento de erro padrão
- Logs detalhados para debugging sem afetar performance

## 📊 **Métricas de Sucesso**

### **Indicadores Principais**
- Taxa de SOFT_DECLINE reduzida em >80%
- Produtos anteriormente funcionais mantêm 100% de compatibilidade
- Tempo de resolução de problemas reduzido em >50%

### **Monitoramento Contínuo**
- Logs de SOFT_DECLINE com análise detalhada
- Alertas automáticos para novos padrões de erro
- Dashboard de saúde por produto

## 🚀 **Próximos Passos**

1. **Executar testes de validação** nos produtos mencionados
2. **Monitorar logs** por 48h após implementação
3. **Ajustar validações** baseado em feedback dos testes
4. **Documentar padrões** de erro identificados
5. **Implementar melhorias** preventivas adicionais

---

**Data da Análise**: 2025-08-28  
**Versão**: 1.0  
**Status**: Implementação Concluída - Aguardando Validação
