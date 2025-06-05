# Sistema de Booking Viator - Documentação

## Visão Geral

O Sistema de Booking Viator implementa o fluxo completo de reserva conforme a documentação oficial da Viator, incluindo:

1. **Check Availability** - Verificação de disponibilidade e preços
2. **Booking Hold** - Reserva temporária da experiência
3. **Payment Processing** - Processamento do pagamento via API
4. **Booking Confirmation** - Confirmação final da reserva

## Arquivos Criados

### 1. `viator-booking.php`
- **Função**: Backend do sistema de booking
- **Principais Classes**: `ViatorBookingSystem`
- **Endpoints AJAX**:
  - `viator_check_availability`
  - `viator_request_hold`
  - `viator_process_payment`
  - `viator_confirm_booking`

### 2. `viator-booking.js`
- **Função**: Frontend/Interface do usuário
- **Principais Classes**: `ViatorBookingManager`
- **Funcionalidades**:
  - Modal de reserva responsivo
  - Formulários dinâmicos para viajantes
  - Validação de dados
  - Comunicação AJAX com backend

### 3. `viator-booking.css`
- **Função**: Estilos para o sistema de booking
- **Características**:
  - Design moderno e responsivo
  - Animações suaves
  - Indicadores de progresso
  - Estados de carregamento

## Fluxo de Uso

### Para o Usuário Final

1. **Acesso**: Usuário clica no botão "Check Availability" na página do produto
2. **Disponibilidade**: 
   - Seleciona data da viagem
   - Define número de viajantes (adultos, crianças, bebês)
   - Sistema verifica disponibilidade na API Viator
3. **Dados dos Viajantes**:
   - Preenche informações de cada viajante
   - Nome, sobrenome, data de nascimento, gênero
4. **Pagamento**:
   - Resumo da reserva é exibido
   - Dados do cartão de crédito
   - Endereço de cobrança
5. **Confirmação**:
   - Reserva é processada
   - Confirmação é exibida com detalhes da reserva

### Para o Desenvolvedor

#### Iniciando uma Reserva
O sistema é ativado automaticamente quando o usuário clica no botão com classe `button-check-availability`.

#### Configuração Necessária
1. **API Key da Viator**: Configurada em Settings > Viator Integration
2. **Afiliação**: Necessário acesso "Full + Booking access Affiliates"

## API Endpoints Utilizados

### 1. Verificação de Disponibilidade
```
POST /partner/availability/check
```

### 2. Criação de Hold
```
POST /partner/bookings/cart/hold
```

### 3. Processamento de Pagamento
```
POST /v1/checkoutsessions/{sessionToken}/paymentaccounts
```

### 4. Confirmação da Reserva
```
POST /partner/bookings/cart/book
```

## Estrutura de Dados

### Dados de Viajantes
```javascript
{
  type: 'ADULT' | 'CHILD' | 'INFANT',
  age: number,
  firstName: string,
  lastName: string,
  birthDate: string, // YYYY-MM-DD
  gender: 'MALE' | 'FEMALE'
}
```

### Dados de Pagamento
```javascript
{
  card_number: string,
  expiry_month: string,
  expiry_year: string,
  security_code: string,
  cardholder_name: string,
  billing_address: {
    address: string,
    city: string,
    state: string,
    zip: string,
    country: string
  }
}
```

## Personalização

### Modificando Estilos
Edite o arquivo `viator-booking.css` para personalizar:
- Cores do tema
- Tamanhos de fonte
- Espaçamentos
- Animações

### Adicionando Campos
Para adicionar novos campos nos formulários:
1. Modifique `getTravelerFormHTML()` no arquivo JS
2. Atualize a validação em `validateTravelersInfo()`
3. Ajuste o processamento no backend PHP

### Tradução
O sistema suporta dois idiomas:
- Português (pt-BR)
- Inglês (en-US)

Adicione novas traduções no array `$translations` em `viator-integration.php`.

## Segurança

### Implementações de Segurança
1. **Nonce Verification**: Todas as requisições AJAX são protegidas com nonce
2. **Data Sanitization**: Todos os dados são sanitizados antes do processamento
3. **SSL Required**: Dados de pagamento requerem conexão segura
4. **Input Validation**: Validação tanto no frontend quanto backend

### Dados Sensíveis
- Dados de cartão de crédito são enviados diretamente para a API Viator
- Não são armazenados localmente
- Comunicação criptografada (HTTPS)

## Troubleshooting

### Problemas Comuns

1. **"API Key não configurada"**
   - Verifique se a API key está configurada em Settings
   - Confirme se a API key tem acesso de booking

2. **"Erro de conexão"**
   - Verifique conexão com internet
   - Confirme se o servidor permite requisições HTTPS externas

3. **Modal não abre**
   - Verifique se os scripts estão carregados
   - Confirme se não há conflitos de JavaScript

4. **Erro de pagamento**
   - Verifique dados do cartão
   - Confirme se o endereço de cobrança está correto

### Debug Mode
Ative o debug adicionando no `wp-config.php`:
```php
define('VIATOR_DEBUG', true);
```

## Limitações Atuais

1. **Apenas pagamento com cartão de crédito**: Outros métodos não implementados
2. **Uma reserva por vez**: Não suporta múltiplos produtos simultâneos
3. **Idiomas limitados**: Suporte para 3 idiomas apenas

## Próximas Melhorias

1. **Múltiplos métodos de pagamento**
2. **Carrinho de compras**
3. **Integração com sistemas de CRM**
4. **Relatórios de reservas**
5. **Notificações por email automáticas**

## Suporte

Para suporte técnico, entre em contato com o desenvolvedor do plugin. 