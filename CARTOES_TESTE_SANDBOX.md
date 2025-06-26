# 💳 Cartões de Teste - Ambiente Sandbox

## 📋 **Documentação Oficial**
- **Viator Payments**: [partnerresources.viator.com/travel-commerce/api-payments](https://partnerresources.viator.com/travel-commerce/api-payments/)
- **Braintree Test Cards**: [developer.paypal.com/braintree/docs/guides/credit-cards/testing-go-live](https://developer.paypal.com/braintree/docs/guides/credit-cards/testing-go-live/java)

## 🃏 **Cartões de Teste para Sandbox**

### ✅ **VISA - Aprovado**
```
Número: 4111 1111 1111 1111
CVV: 123
Data: 12/2025
Nome: João Silva
```

### ✅ **MasterCard - Aprovado**
```
Número: 5555 5555 5555 4444
CVV: 123
Data: 12/2025
Nome: Maria Santos
```

### ✅ **American Express - Aprovado**
```
Número: 3782 8224 6310 005
CVV: 1234
Data: 12/2025
Nome: Pedro Costa
```

### ❌ **VISA - Recusado (Insufficient Funds)**
```
Número: 4000 0000 0000 0002
CVV: 123
Data: 12/2025
Nome: Teste Recusado
```

### ❌ **VISA - Recusado (Generic Decline)**
```
Número: 4000 0000 0000 0010
CVV: 123
Data: 12/2025
Nome: Teste Erro
```

## 🌐 **Dados de Endereço para Teste**
```
País: Brazil (BR)
CEP: 01310-100
Estado: São Paulo
Cidade: São Paulo
Endereço: Av. Paulista, 1000
```

## 🔒 **3DS (3D Secure) - Para EUR/GBP**
Quando testando com moedas EUR ou GBP, o sistema pode solicitar autenticação 3DS.
No ambiente sandbox, você pode simular:
- **Sucesso**: Use qualquer senha
- **Falha**: Cancele o processo

## ⚠️ **Observações Importantes**

1. **Ambiente**: Estes cartões funcionam APENAS no ambiente **SANDBOX**
2. **Detecção de Fraude**: O sistema detecta automaticamente dispositivos suspeitos
3. **Logs**: Monitore o arquivo `/wp-content/debug.log` para troubleshooting
4. **Timeout**: Tokens de pagamento expiram em 1 hora
5. **API Key**: Certifique-se de ter nível **"Full Access + Booking"**

## 🚀 **Como Testar**

1. Use qualquer cartão de **aprovado** da lista acima
2. Preencha dados de endereço válidos (Brasil)
3. Use CVV e data corretos
4. Monitore logs para verificar fluxo completo

## 🏗️ **Para Produção**

Quando migrar para produção:
1. Altere `base_url` para `https://api.viator.com`
2. Altere payment URL para `https://checkout-api.payments.tamg.cloud`
3. Use API key de produção
4. Teste com cartões reais (pequenos valores primeiro) 