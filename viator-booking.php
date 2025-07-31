<?php
/**
 * Viator Booking System
 * Gerencia o processo completo de reserva: availability check, booking hold, payment e confirmation
 */

// Evitar acesso direto
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Classe principal para gerenciar o sistema de booking da Viator
 */
class ViatorBookingSystem {
    
    private $api_key;
    private $base_url = 'https://api.sandbox.viator.com';
    private $last_hold_response; // Armazenar resposta do último hold para uso posterior
    
    public function __construct() {
        $this->api_key = get_option('viator_api_key');
        add_action('wp_ajax_viator_check_availability', array($this, 'ajax_check_availability'));
        add_action('wp_ajax_nopriv_viator_check_availability', array($this, 'ajax_check_availability'));
        add_action('wp_ajax_viator_get_booking_questions', array($this, 'ajax_get_booking_questions'));
        add_action('wp_ajax_nopriv_viator_get_booking_questions', array($this, 'ajax_get_booking_questions'));
        add_action('wp_ajax_viator_get_all_booking_questions', array($this, 'ajax_get_all_booking_questions'));
        add_action('wp_ajax_nopriv_viator_get_all_booking_questions', array($this, 'ajax_get_all_booking_questions'));
        add_action('wp_ajax_viator_request_hold', array($this, 'ajax_request_hold'));
        add_action('wp_ajax_nopriv_viator_request_hold', array($this, 'ajax_request_hold'));
        add_action('wp_ajax_viator_process_payment', array($this, 'ajax_process_payment'));
        add_action('wp_ajax_nopriv_viator_process_payment', array($this, 'ajax_process_payment'));
        add_action('wp_ajax_viator_submit_payment', array($this, 'ajax_submit_payment'));
        add_action('wp_ajax_nopriv_viator_submit_payment', array($this, 'ajax_submit_payment'));
        add_action('wp_ajax_viator_confirm_booking', array($this, 'ajax_confirm_booking'));
        add_action('wp_ajax_nopriv_viator_confirm_booking', array($this, 'ajax_confirm_booking'));
        add_action('wp_ajax_viator_get_monthly_availability', array($this, 'ajax_get_monthly_availability'));
        add_action('wp_ajax_nopriv_viator_get_monthly_availability', array($this, 'ajax_get_monthly_availability'));
        add_action('wp_ajax_viator_test_api_access', array($this, 'ajax_test_api_access'));
        add_action('wp_ajax_viator_debug_log_js', array($this, 'ajax_debug_log_js'));
        add_action('wp_ajax_nopriv_viator_debug_log_js', array($this, 'ajax_debug_log_js'));
        add_action('wp_ajax_nopriv_viator_test_api_access', array($this, 'ajax_test_api_access'));
    }
    
    /**
     * Verificar disponibilidade e preços
     */
    public function check_availability($product_code, $travel_date, $travelers) {
        if (empty($this->api_key)) {
            return array('error' => viator_t('error_api_key'));
        }
        
        $locale_settings = viator_get_locale_settings();
        
        $request_data = array(
            'productCode' => $product_code,
            'travelDate' => $travel_date,
            'currency' => $locale_settings['currency'],
            'paxMix' => $travelers
        );
        
        $response = wp_remote_post($this->base_url . '/partner/availability/check', array(
            'headers' => array(
                'Accept' => 'application/json;version=2.0',
                'Content-Type' => 'application/json;version=2.0',
                'exp-api-key' => $this->api_key,
                'Accept-Language' => $locale_settings['language']
            ),
            'body' => json_encode($request_data),
            'timeout' => 30
        ));
        
        if (is_wp_error($response)) {
            viator_debug_log('Connection error in availability check', $response->get_error_message());
            return array('error' => 'Erro de conexão: ' . $response->get_error_message());
        }

        $response_code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        // Tratamento abrangente de erros da API
        $error_result = $this->handle_api_error($response_code, $data, 'availability_check');
        if ($error_result) {
            return $error_result;
        }
        
        return $data;
    }
    
    /**
     * Solicitar hold de reserva
     */
    public function request_booking_hold($availability_data, $travelers_details, $booking_question_answers = [], $booker_info = []) {
        if (empty($this->api_key)) {
            return array('error' => viator_t('error_api_key'));
        }
        
        $locale_settings = viator_get_locale_settings();
        
        // Gerar referências únicas para cart e booking
        $partner_cart_ref = 'CART_' . $this->generate_unique_id();
        $partner_booking_ref = 'BOOK_' . $this->generate_unique_id();
        
        // Log dados recebidos para debug
        viator_debug_log('=== HOLD REQUEST DEBUG START ===');
        viator_debug_log('Hold - Travelers Details Received:', $travelers_details);
        viator_debug_log('Hold - Availability Data Received:', $availability_data);
        viator_debug_log('Hold - Booking Question Answers Received:', $booking_question_answers);
        
        // Validação rigorosa dos dados obrigatórios
        $validation_errors = $this->validate_hold_data($availability_data, $travelers_details);
        if (!empty($validation_errors)) {
            viator_debug_log('Hold - Validation Errors:', $validation_errors);
            return array('error' => 'Dados inválidos para hold: ' . implode(', ', $validation_errors));
        }
        
        // Construir dados conforme a documentação da API
        // O paxMix agora é extraído diretamente de availability_data
        $pax_mix = $availability_data['paxMix'] ?? [];
        viator_debug_log('Hold - PaxMix Converted:', $pax_mix);
        
        // Validar paxMix
        if (empty($pax_mix)) {
            viator_debug_log('Hold - ERROR: PaxMix está vazio ou ausente em availability_data');
            return array('error' => 'Dados de viajantes (paxMix) inválidos ou ausentes.');
        }
        
        // Extrair dados com logs detalhados
        $product_code = $availability_data['productCode'] ?? $availability_data['product']['productCode'];
        $product_option_code = $availability_data['selectedOption']['productOptionCode'];
        $start_time = $availability_data['selectedOption']['startTime'] ?? null;
        $travel_date = $availability_data['travelDate'];
        
        viator_debug_log('Hold - Extracted Data:', [
            'productCode' => $product_code,
            'productOptionCode' => $product_option_code,
            'startTime' => $start_time,
            'travelDate' => $travel_date,
            'currency' => $locale_settings['currency'],
            'paxMixCount' => count($pax_mix)
        ]);
        
        // Estrutura da requisição conforme documentação oficial da Viator
        // A API calcula automaticamente o valor total baseado nos itens e paxMix
        $request_data = array(
            'currency' => $locale_settings['currency'],
            'partnerCartRef' => $partner_cart_ref,
            'items' => array(
                array(
                    'partnerBookingRef' => $partner_booking_ref,
                    'productCode' => $product_code,
                    'productOptionCode' => $product_option_code,
                    'startTime' => $start_time,
                    'travelDate' => $travel_date,
                    'paxMix' => $pax_mix
                )
            ),
            'paymentDataSubmissionMode' => 'PARTNER_FORM',
            'hostingUrl' => home_url()
        );
        
        // Extrair o valor total da opção selecionada para evitar amount: 0.0 no token
        $total_price = null;
        if (isset($availability_data['selectedOption']['fullOption']['totalPrice']['price']['recommendedRetailPrice'])) {
            $total_price = $availability_data['selectedOption']['fullOption']['totalPrice']['price']['recommendedRetailPrice'];
        } elseif (isset($availability_data['selectedOption']['totalPrice']['price']['recommendedRetailPrice'])) {
            $total_price = $availability_data['selectedOption']['totalPrice']['price']['recommendedRetailPrice'];
        }
        
        viator_debug_log('Total Price extraído para hold:', $total_price);
        
        // Log dos dados de precificação disponíveis para debug
        if (isset($availability_data['selectedOption']['totalPrice'])) {
            viator_debug_log('Hold - Pricing Data Available:', $availability_data['selectedOption']['totalPrice']);
        }
        
        if (isset($availability_data['selectedOption']['pricing'])) {
            viator_debug_log('Hold - Detailed Pricing:', $availability_data['selectedOption']['pricing']);
        }
        
        // Processar booking questions se fornecidas
        if (!empty($booking_question_answers)) {
            // Validar perguntas de reserva (MANDATORY + CONDITIONAL) antes de processar
            $validation_result = $this->validate_conditional_booking_questions($booking_question_answers, $product_code);
            if (!$validation_result['valid']) {
                viator_debug_log('Hold - Booking Questions Validation Failed:', $validation_result['errors']);
                return array('error' => 'Validação de perguntas de reserva falhou: ' . implode(', ', $validation_result['errors']));
            }
            
            $processed_questions = $this->process_booking_questions_for_hold($booking_question_answers, $booker_info);
            if (!empty($processed_questions)) {
                // Adicionar booking questions ao primeiro item
                $request_data['items'][0]['bookingQuestionAnswers'] = $processed_questions;
                viator_debug_log('Hold - Booking Questions Added:', $processed_questions);
            }
        } else {
            // Verificar se há perguntas obrigatórias que não foram fornecidas
            $required_questions = $this->get_required_booking_questions($product_code);
            if (!empty($required_questions)) {
                viator_debug_log('Hold - Missing Required Questions:', $required_questions);
                return array('error' => 'Perguntas obrigatórias não respondidas: ' . implode(', ', array_column($required_questions, 'title')));
            }
        }

        // Adicionar informações do responsável se fornecidas
        if (!empty($booker_info)) {
            // Adicionar informações do lead traveler
            $request_data['items'][0]['leadTraveler'] = array(
                'firstname' => $booker_info['firstname'] ?? '',
                'lastname' => $booker_info['lastname'] ?? '',
                'email' => $booker_info['email'] ?? '',
                'phone' => $booker_info['phone'] ?? ''
            );
            viator_debug_log('Hold - Lead Traveler Added:', $request_data['items'][0]['leadTraveler']);
        }

        // Log completo da requisição
        viator_debug_log('Hold - Complete Request Data:', $request_data);
        viator_debug_log('Hold - Request JSON:', json_encode($request_data, JSON_PRETTY_PRINT));
        
        // Usar método com retry automático para requisições críticas como hold
        $response = $this->make_api_request_with_retry(
            $this->base_url . '/partner/bookings/cart/hold',
            array(
                'method' => 'POST',
                'headers' => array(
                    'Accept' => 'application/json;version=2.0',
                    'Content-Type' => 'application/json;version=2.0',
                    'exp-api-key' => $this->api_key,
                    'Accept-Language' => $locale_settings['language']
                ),
                'body' => json_encode($request_data),
                'timeout' => 90, // Aumentar timeout para 90 segundos para holds complexos
                'sslverify' => false, // Evitar problemas de SSL em alguns ambientes
                'user-agent' => 'Viator-WordPress-Plugin/1.0',
                'httpversion' => '1.1', // Forçar HTTP/1.1 para melhor compatibilidade
                'blocking' => true, // Garantir que a requisição seja bloqueante
                'compress' => false, // Desabilitar compressão para evitar problemas
                'decompress' => true, // Permitir descompressão de respostas
                'stream' => false, // Não usar streaming para requisições críticas
                'redirection' => 3 // Permitir até 3 redirecionamentos
            ),
            3, // Máximo 3 tentativas
            'booking_hold'
        );
        
        if (is_wp_error($response)) {
            viator_debug_log('Hold WP_Error:', $response->get_error_message());
            return array('error' => 'Erro de conexão: ' . $response->get_error_message());
        }
        
        $response_code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        // Log detalhado da resposta para debug
        viator_debug_log('Hold - Response Code:', $response_code);
        viator_debug_log('Hold - Response Body (Raw):', $body);
        viator_debug_log('Hold - Response Data (Parsed):', $data);
        
        // Log específico do paymentSessionToken se presente
        if (isset($data['paymentSessionToken'])) {
            viator_debug_log('Hold - PaymentSessionToken Found:', $data['paymentSessionToken']);
            
            // Tentar decodificar o token para verificar o amount
            $token_parts = explode('.', $data['paymentSessionToken']);
            if (count($token_parts) >= 2) {
                try {
                    $payload = json_decode(base64_decode($token_parts[1]), true);
                    viator_debug_log('Hold - PaymentSessionToken Payload:', $payload);
                    
                    if (isset($payload['amount'])) {
                        viator_debug_log('Hold - Token Amount Found:', $payload['amount']);
                    }
                } catch (Exception $e) {
                    viator_debug_log('Hold - Error decoding token:', $e->getMessage());
                }
            }
        } else {
            viator_debug_log('Hold - PaymentSessionToken NOT FOUND in response');
        }
        
        // Log de outros campos importantes da resposta
        if (isset($data['paymentDataSubmissionUrl'])) {
            viator_debug_log('Hold - PaymentDataSubmissionUrl:', $data['paymentDataSubmissionUrl']);
        }
        
        if (isset($data['cartRef'])) {
            viator_debug_log('Hold - CartRef:', $data['cartRef']);
        }
        
        if (isset($data['totalPrice'])) {
            viator_debug_log('Hold - Response TotalPrice:', $data['totalPrice']);
        }
        
        // Verificar código de resposta HTTP
        if ($response_code === 403) {
            return array('error' => 'Acesso negado: Sua API key não tem permissões de booking. Verifique se sua conta tem nível "Full Access + Booking".');
        }
        
        if ($response_code !== 200) {
            $error_message = isset($data['message']) ? $data['message'] : "Erro HTTP {$response_code}";
            return array('error' => $error_message);
        }
        
        if (isset($data['errorCode']) || isset($data['error'])) {
            return array('error' => isset($data['errorMessage']) ? $data['errorMessage'] : 'Erro ao criar hold de reserva');
        }
        
        // Adicionar referências ao retorno e extrair campos essenciais
        $data['partnerCartRef'] = $partner_cart_ref;
        $data['partnerBookingRef'] = $partner_booking_ref;
        
        // Log detalhado das referências geradas
        viator_debug_log('Referências geradas:', [
            'partnerCartRef' => $partner_cart_ref,
            'partnerBookingRef' => $partner_booking_ref
        ]);
        
        // Extrair paymentSessionToken para inicialização do pagamento
        if (isset($data['paymentSessionToken'])) {
            $data['sessionToken'] = $data['paymentSessionToken'];
        }
        
        // Extrair paymentDataSubmissionUrl conforme documentação
        if (isset($data['paymentDataSubmissionUrl'])) {
            viator_debug_log('Payment Data Submission URL recebida:', $data['paymentDataSubmissionUrl']);
        }
        
        // Log da estrutura final dos dados antes do retorno
        viator_debug_log('Dados finais do hold (com referências):', [
            'hasPartnerCartRef' => isset($data['partnerCartRef']),
            'hasPartnerBookingRef' => isset($data['partnerBookingRef']),
            'hasPaymentSessionToken' => isset($data['paymentSessionToken']),
            'hasPaymentDataSubmissionUrl' => isset($data['paymentDataSubmissionUrl'])
        ]);
        
        // Armazenar resposta completa para uso posterior no pagamento
        $this->last_hold_response = $data;
        
        return $data;
    }
    
    /**
     * Validar dados obrigatórios para requisição de hold
     */
    private function validate_hold_data($availability_data, $travelers_details) {
        $errors = array();
        
        // Validar dados de disponibilidade
        if (empty($availability_data)) {
            $errors[] = 'Dados de disponibilidade ausentes';
            return $errors;
        }
        
        // Validar productCode
        $product_code = $availability_data['productCode'] ?? $availability_data['product']['productCode'] ?? null;
        if (empty($product_code)) {
            $errors[] = 'productCode ausente';
        }
        
        // Validar productOptionCode
        $product_option_code = $availability_data['selectedOption']['productOptionCode'] ?? null;
        if (empty($product_option_code)) {
            $errors[] = 'productOptionCode ausente';
        }
        
        // Validar travelDate
        $travel_date = $availability_data['travelDate'] ?? null;
        if (empty($travel_date)) {
            $errors[] = 'travelDate ausente';
        } else {
            // Validar formato da data
            $date_obj = DateTime::createFromFormat('Y-m-d', $travel_date);
            if (!$date_obj || $date_obj->format('Y-m-d') !== $travel_date) {
                $errors[] = 'travelDate em formato inválido (esperado: Y-m-d)';
            }
        }
        
        // Validar dados dos viajantes
        if (empty($travelers_details)) {
            $errors[] = 'Dados de viajantes ausentes';
        }
        
        // Log detalhado dos dados validados
        viator_debug_log('Hold - Validation Details:', [
            'productCode' => $product_code,
            'productOptionCode' => $product_option_code,
            'travelDate' => $travel_date,
            'hasSelectedOption' => isset($availability_data['selectedOption']),
            'selectedOptionKeys' => isset($availability_data['selectedOption']) ? array_keys($availability_data['selectedOption']) : [],
            'travelersDetailsType' => gettype($travelers_details),
            'travelersDetailsKeys' => is_array($travelers_details) ? array_keys($travelers_details) : 'not_array'
        ]);
        
        return $errors;
    }
    
    /**
     * Converter detalhes dos viajantes para formato paxMix
     */
    private function convert_travelers_to_pax_mix($travelers_details) {
        // Se já é um array com paxMix (formato atual do JavaScript)
        if (isset($travelers_details['paxMix'])) {
            return $travelers_details['paxMix'];
        }
        
        // Se é um array de objetos paxMix direto
        if (is_array($travelers_details) && !empty($travelers_details)) {
            $first_item = reset($travelers_details);
            if (isset($first_item['ageBand']) && isset($first_item['numberOfTravelers'])) {
                return $travelers_details;
            }
        }
        
        // Fallback para formato legado (se ainda necessário)
        $pax_mix = array();
        $age_band_counts = array();
        
        // Contar viajantes por age band
        foreach ($travelers_details as $traveler) {
            // Tentar diferentes formatos de chave
            $band_id = $traveler['bandId'] ?? $traveler['ageBand'] ?? null;
            if ($band_id) {
                if (!isset($age_band_counts[$band_id])) {
                    $age_band_counts[$band_id] = 0;
                }
                $age_band_counts[$band_id]++;
            }
        }
        
        // Converter para formato paxMix
        foreach ($age_band_counts as $age_band => $count) {
            $pax_mix[] = array(
                'ageBand' => $age_band,
                'numberOfTravelers' => $count
            );
        }
        
        return $pax_mix;
    }
    
    /**
     * Gerar ID único para referências
     * Inclui timestamp, microsegundos e entropia adicional para evitar duplicação
     */
    private function generate_unique_id() {
        // Usar função nativa do WordPress se disponível
        if (function_exists('wp_generate_uuid4')) {
            return str_replace('-', '', wp_generate_uuid4());
        }
        
        // Fallback melhorado com mais entropia
        $timestamp = time();
        $microseconds = microtime(true) * 1000000;
        $random = bin2hex(random_bytes(8));
        
        // Combinar timestamp, microsegundos e bytes aleatórios
        $unique_string = $timestamp . '_' . $microseconds . '_' . $random;
        
        // Gerar hash MD5 e pegar os primeiros 12 caracteres
        return strtoupper(substr(md5($unique_string), 0, 12));
    }
    
    /**
     * Processar pagamento usando a biblioteca JavaScript da Viator
     * Este método é chamado após o processamento do pagamento via JavaScript
     */
    public function process_payment($payment_token) {
        // Com a solução API, o pagamento é processado via JavaScript
        // Este método apenas valida e retorna o token recebido
        if (empty($payment_token)) {
            return array('error' => 'Token de pagamento não fornecido');
        }
        
        return array('success' => true, 'paymentToken' => $payment_token);
    }
    
    /**
     * Confirmar a reserva
     */
    public function confirm_booking($cart_id, $payment_token, $booker_info, $booking_question_answers = [], $hold_data = []) {
        if (empty($this->api_key)) {
            return array('error' => viator_t('error_api_key'));
        }
        
        $locale_settings = viator_get_locale_settings();
        
        // Usar cart_id passado diretamente como cart_ref (é o cartRef da Viator)
        $cart_ref = $cart_id;
        
        // Obter partner_booking_ref se passado, senão gerar novo
        $booking_ref = isset($_POST['partner_booking_ref']) ? sanitize_text_field($_POST['partner_booking_ref']) : ('BOOK_' . $this->generate_unique_id());
        
        if (empty($cart_ref)) {
            viator_debug_log('ERRO CRÍTICO: cart_ref não fornecido na requisição de confirmação');
            return array('error' => 'Referência do carrinho não encontrada. Tente fazer a reserva novamente.');
        }
        
        // Log para depuração das referências
        viator_debug_log('Booking Confirmation References:', [
            'cart_ref' => $cart_ref,
            'booking_ref' => $booking_ref
        ]);
        
        // Usar dados do hold passados como parâmetro ou fallback para last_hold_response
        $hold_response = !empty($hold_data) ? $hold_data : ($this->last_hold_response ?? []);
        $hold_items = $hold_response['items'] ?? [];
        
        viator_debug_log('Hold Data recebido para confirmação:', [
            'hold_data_provided' => !empty($hold_data),
            'hold_items_count' => count($hold_items),
            'hold_response_keys' => array_keys($hold_response)
        ]);
        
        // Construir array items para confirmação
        $confirm_items = [];
        foreach ($hold_items as $item) {
            $confirm_item = [
                'bookingRef' => $item['bookingRef'],
                'partnerBookingRef' => $item['partnerBookingRef'] ?? ('BOOK_' . $this->generate_unique_id())
            ];
            
            // Incluir perguntas de reserva no item se fornecidas
            if (!empty($booking_question_answers)) {
                $confirm_item['bookingQuestionAnswers'] = $booking_question_answers;
            }
            
            $confirm_items[] = $confirm_item;
        }
        
        // Se não houver itens do hold, usar fallback
        if (empty($confirm_items)) {
            viator_debug_log('AVISO: Nenhum item encontrado no hold_response, usando fallback');
            viator_debug_log('Hold Response disponível:', $hold_response);
            
            $booking_ref = isset($_POST['partner_booking_ref']) ? sanitize_text_field($_POST['partner_booking_ref']) : ('BOOK_' . $this->generate_unique_id());
            
            // Tentar extrair bookingRef do hold_response se disponível
            $extracted_booking_ref = null;
            if (isset($hold_response['bookingRef'])) {
                $extracted_booking_ref = $hold_response['bookingRef'];
            } elseif (isset($hold_response['items'][0]['bookingRef'])) {
                $extracted_booking_ref = $hold_response['items'][0]['bookingRef'];
            }
            
            $confirm_item = [
                'partnerBookingRef' => $booking_ref
            ];
            
            // Incluir bookingRef se encontrado
            if ($extracted_booking_ref) {
                $confirm_item['bookingRef'] = $extracted_booking_ref;
                viator_debug_log('BookingRef extraído para fallback:', $extracted_booking_ref);
            } else {
                viator_debug_log('ERRO: BookingRef não encontrado no hold_response');
            }
            
            // Incluir perguntas de reserva no item se fornecidas
            if (!empty($booking_question_answers)) {
                $confirm_item['bookingQuestionAnswers'] = $booking_question_answers;
            }
            
            $confirm_items = [$confirm_item];
        }
        
        // Estruturar dados conforme documentação da API da Viator
        $request_data = array(
            'cartRef' => $cart_ref,
            'bookerInfo' => array(
                'firstName' => $booker_info['firstname'],
                'lastName' => $booker_info['lastname']
            ),
            'communication' => array(
                'email' => $booker_info['email'],
                'phone' => $booker_info['phone']
            ),
            'items' => $confirm_items,
            'paymentToken' => $payment_token
        );
        
        // Log das perguntas de reserva incluídas nos itens
        if (!empty($booking_question_answers)) {
            viator_debug_log('Booking Questions incluídas na confirmação:', $booking_question_answers);
        }
        
        // Log para depuração
        viator_debug_log('Booking Confirmation Request:', $request_data);
        
        $response = wp_remote_post($this->base_url . '/partner/bookings/cart/book', array(
            'headers' => array(
                'Accept' => 'application/json;version=2.0',
                'Content-Type' => 'application/json;version=2.0',
                'exp-api-key' => $this->api_key,
                'Accept-Language' => $locale_settings['language']
            ),
            'body' => json_encode($request_data),
            'timeout' => 60 // Aumentar o timeout para a chamada de book
        ));
        
        if (is_wp_error($response)) {
            viator_debug_log('Booking Confirmation WP_Error:', $response->get_error_message());
            return array('error' => 'Erro de conexão: ' . $response->get_error_message());
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        // Log da resposta completa
        viator_debug_log('Booking Confirmation Response:', $data);
        
        if (isset($data['error'])) {
             return array(
                'error' => true,
                'message' => $data['message'] ?? 'Erro desconhecido na confirmação da reserva.',
                'reasons' => $data['reasons'] ?? []
            );
        }
        
        // Extrair informações importantes da resposta para uso futuro
        $booking_info = $data['bookingInfo'] ?? [];
        $voucher_info = $booking_info['voucherInfo'] ?? [];
        
        $confirmation_status = $booking_info['confirmationStatus'] ?? 'UNKNOWN';
        $voucher_restriction = $voucher_info['isVoucherRestrictionRequired'] ?? false;
        
        // Adicionar informações extras ao retorno para o frontend
        $data['custom_data'] = [
            'confirmationStatus' => $confirmation_status,
            'isVoucherRestrictionRequired' => $voucher_restriction
        ];
        
        return $data;
    }
    
    /**
     * Busca a disponibilidade mensal para um produto.
     */
    public function get_monthly_availability($product_code, $month, $year) {
        if (empty($this->api_key)) {
            return ['error' => viator_t('error_api_key')];
        }

        // Cache para evitar múltiplas consultas
        $cache_key = "viator_availability_{$product_code}_{$year}_{$month}";
        $cached_result = get_transient($cache_key);
        if ($cached_result !== false) {
            return $cached_result;
        }

        $locale_settings = viator_get_locale_settings();
        $available_dates = [];
        
        // Para simplificar, vamos verificar apenas algumas datas de amostra
        // Se alguma estiver disponível, assumimos que o produto tem disponibilidade geral
        $sample_dates = [];
        $first_day = new DateTime("{$year}-{$month}-01");
        $today = new DateTime();
        
        // Garantir que não verificamos datas passadas
        if ($first_day < $today) {
            $first_day = $today;
        }
        
        // Verificar apenas 3 datas de amostra do mês
        for ($i = 0; $i < 3; $i++) {
            $test_date = clone $first_day;
            $test_date->modify("+{$i} week"); // Uma data por semana
            
            if ($test_date->format('Y-m') === "{$year}-" . str_pad($month, 2, '0', STR_PAD_LEFT)) {
                $sample_dates[] = $test_date->format('Y-m-d');
            }
        }
        
        // Se não há datas para testar neste mês, retornar vazio
        if (empty($sample_dates)) {
            $result = ['availableDates' => []];
            set_transient($cache_key, $result, 3600);
            return $result;
        }
        
        // Testar uma data de amostra para ver se o produto tem disponibilidade
        $test_date = $sample_dates[0];
        
        // Usar dados básicos de viajante
        $pax_mix = [['ageBand' => 'ADULT', 'numberOfTravelers' => 1]];
        
        $request_data = [
            'productCode' => $product_code,
            'travelDate' => $test_date,
            'currency' => $locale_settings['currency'],
            'paxMix' => $pax_mix
        ];
        
        $response = wp_remote_post($this->base_url . '/partner/availability/check', [
            'headers' => [
                'Accept' => 'application/json;version=2.0',
                'Content-Type' => 'application/json;version=2.0',
                'exp-api-key' => $this->api_key,
                'Accept-Language' => $locale_settings['language']
            ],
            'body' => json_encode($request_data),
            'timeout' => 15
        ]);
        
        $has_availability = false;
        
        if (!is_wp_error($response)) {
            $response_code = wp_remote_retrieve_response_code($response);
            $body = wp_remote_retrieve_body($response);
            $data = json_decode($body, true);
            
            // Log detalhado para debug
            viator_debug_log("=== AVAILABILITY DEBUG ===");
            viator_debug_log("Request data para {$test_date}:", $request_data);
            viator_debug_log("Response code:", $response_code);
            viator_debug_log("Response body raw:", $body);
            viator_debug_log("Response data parsed:", $data);
            
            // Se a requisição foi bem-sucedida, verificar disponibilidade em bookableItems
            if ($response_code === 200 && !isset($data['errorCode'])) {
                viator_debug_log("✅ Resposta bem-sucedida da API");
                
                // Verificar se há items disponíveis
                if (isset($data['bookableItems']) && is_array($data['bookableItems'])) {
                    $available_items = 0;
                    foreach ($data['bookableItems'] as $item) {
                        if (isset($item['available']) && $item['available'] === true) {
                            $available_items++;
                        }
                    }
                    
                    if ($available_items > 0) {
                        $has_availability = true;
                        $available_dates[] = $test_date;
                        viator_debug_log("✅ Data específica {$test_date} tem {$available_items} opções disponíveis");
                    } else {
                        viator_debug_log("⚠️ Data específica {$test_date} não tem opções disponíveis");
                    }
                } else {
                    viator_debug_log("⚠️ Campo 'bookableItems' não encontrado na resposta");
                    viator_debug_log("Estrutura da resposta:", array_keys($data));
                }
            } else {
                viator_debug_log("❌ Erro na requisição ou código de erro retornado");
                if (isset($data['errorCode'])) {
                    viator_debug_log("Erro da API:", $data);
                }
            }
        } else {
            viator_debug_log("❌ Erro WP na requisição:", $response->get_error_message());
        }
        
        // Se detectamos disponibilidade geral do produto, gerar lista de datas do mês
        if ($has_availability) {
            $current_date = clone $first_day;
            $last_day = new DateTime("{$year}-{$month}-01");
            $last_day->modify('last day of this month');
            
            while ($current_date <= $last_day) {
                $available_dates[] = $current_date->format('Y-m-d');
                $current_date->modify('+1 day');
            }
        }
        
        $result = ['availableDates' => $available_dates];
        
        // Cache o resultado por 30 minutos
        set_transient($cache_key, $result, 1800);
        
        return $result;
    }
    
    /**
     * Buscar as descrições das opções do produto
     */
    private function get_product_options($product_code) {
        $transient_key = 'viator_product_options_' . $product_code;
        $cached_options = get_transient($transient_key);
        
        if ($cached_options !== false) {
            return $cached_options;
        }
        
        $locale_settings = viator_get_locale_settings();
        $url = $this->base_url . "/partner/products/{$product_code}";
        
        $response = wp_remote_get($url, array(
            'headers' => array(
                'Accept' => 'application/json;version=2.0',
                'exp-api-key' => $this->api_key,
                'Accept-Language' => $locale_settings['language']
            ),
            'timeout' => 30
        ));
        
        if (is_wp_error($response)) {
            return array();
        }
        
        $code = wp_remote_retrieve_response_code($response);
        if ($code !== 200) {
            return array();
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (!isset($data['productOptions'])) {
            return array();
        }
        
        $options = array();
        foreach ($data['productOptions'] as $option) {
            $option_code = $option['productOptionCode'] ?? '';
            $option_title = $option['title'] ?? 'Sem título';
            if ($option_code) {
                $options[$option_code] = $option_title;
            }
        }
        
        // Cache por 1 hora
        set_transient($transient_key, $options, HOUR_IN_SECONDS);
        
        return $options;
    }

    /**
     * Buscar perguntas de reserva do produto
     */
    private function get_product_booking_questions($product_code) {
        viator_debug_log('🔍 [GET BOOKING QUESTIONS] Iniciando busca para produto: ' . $product_code);

        $transient_key = 'viator_product_booking_questions_details_' . $product_code;
        $questions_details = get_transient($transient_key);

        if (false !== $questions_details) {
            viator_debug_log('🔍 [GET BOOKING QUESTIONS] Perguntas carregadas do cache: ' . count($questions_details) . ' perguntas');
            return $questions_details;
        }

        $locale_settings = viator_get_locale_settings();
        viator_debug_log('🔍 [GET BOOKING QUESTIONS] Configurações de localização: ' . json_encode($locale_settings));

        // Etapa 1: Obter os IDs das perguntas de reserva do endpoint de detalhes do produto
        $product_api_url = $this->base_url . "/partner/products/{$product_code}";
        viator_debug_log('🔍 [GET BOOKING QUESTIONS] URL da API: ' . $product_api_url);
        viator_debug_log('🔍 [GET BOOKING QUESTIONS] API Key: ' . (empty($this->api_key) ? 'VAZIA' : substr($this->api_key, 0, 10) . '...'));
        
        $headers = [
            'exp-api-key' => $this->api_key,
            'Accept' => 'application/json;version=2.0',
            'Accept-Language' => $locale_settings['language']
        ];
        viator_debug_log('🔍 [GET BOOKING QUESTIONS] Headers enviados: ' . json_encode($headers));
        
        $product_response = wp_remote_get($product_api_url, [
            'headers' => $headers,
            'timeout' => 30
        ]);

        if (is_wp_error($product_response)) {
            viator_debug_log('🔍 [GET BOOKING QUESTIONS] Erro na requisição da API: ' . $product_response->get_error_message());
            return [];
        }

        $response_code = wp_remote_retrieve_response_code($product_response);
        viator_debug_log('🔍 [GET BOOKING QUESTIONS] Código de resposta: ' . $response_code);
        
        if ($response_code !== 200) {
            $error_body = wp_remote_retrieve_body($product_response);
            $error_headers = wp_remote_retrieve_headers($product_response);
            viator_debug_log('❌ [GET BOOKING QUESTIONS] Erro da API - Código: ' . $response_code);
            viator_debug_log('❌ [GET BOOKING QUESTIONS] Resposta de erro: ' . $error_body);
            viator_debug_log('❌ [GET BOOKING QUESTIONS] Headers da resposta: ' . json_encode($error_headers));
            return [];
        }

        $product_body = wp_remote_retrieve_body($product_response);
        $product_data = json_decode($product_body, true);

        if (!$product_data) {
            viator_debug_log('🔍 [GET BOOKING QUESTIONS] Falha ao decodificar JSON da resposta');
            return [];
        }

        viator_debug_log('🔍 [GET BOOKING QUESTIONS] Chaves disponíveis no produto: ' . implode(', ', array_keys($product_data)));
        
        // Debug: Verificar se bookingQuestions existe e seu conteúdo
        if (isset($product_data['bookingQuestions'])) {
            viator_debug_log('🔍 [GET BOOKING QUESTIONS] bookingQuestions existe no produto');
            viator_debug_log('🔍 [GET BOOKING QUESTIONS] Tipo de bookingQuestions: ' . gettype($product_data['bookingQuestions']));
            viator_debug_log('🔍 [GET BOOKING QUESTIONS] Conteúdo completo de bookingQuestions: ' . json_encode($product_data['bookingQuestions']));
        } else {
            viator_debug_log('🔍 [GET BOOKING QUESTIONS] bookingQuestions NÃO existe no produto');
        }

        // ✅ CORREÇÃO: bookingQuestions vem como array simples de strings, não objetos
        $question_ids = $product_data['bookingQuestions'] ?? [];
        viator_debug_log('🔍 [GET BOOKING QUESTIONS] IDs das perguntas encontradas: ' . json_encode($question_ids));
        viator_debug_log('🔍 [GET BOOKING QUESTIONS] Quantidade de IDs encontrados: ' . count($question_ids));

        if (empty($question_ids)) {
            viator_debug_log('🔍 [GET BOOKING QUESTIONS] Nenhuma pergunta de reserva encontrada');
            set_transient($transient_key, [], HOUR_IN_SECONDS);
            return [];
        }



        // Etapa 2: Obter os detalhes completos de todas as perguntas de reserva, com cache mensal
        $all_questions_transient_key = 'viator_all_booking_questions_' . $locale_settings['language'];
        $all_questions_data = get_transient($all_questions_transient_key);

        if (false === $all_questions_data) {
            $questions_api_url = $this->base_url . '/partner/products/booking-questions';
            $questions_response = wp_remote_get($questions_api_url, [
                'headers' => [
                    'exp-api-key' => $this->api_key,
                    'Accept' => 'application/json;version=2.0',
                    'Accept-Language' => $locale_settings['language']
                ],
                'timeout' => 30
            ]);

            if (is_wp_error($questions_response)) {
                viator_debug_log('A requisição da API para detalhes das perguntas de reserva falhou', $questions_response->get_error_message());
                return [];
            }

            $questions_body = wp_remote_retrieve_body($questions_response);
            $all_questions_data = json_decode($questions_body, true);

            if (is_array($all_questions_data) && !empty($all_questions_data['bookingQuestions'])) {
                // Cache por 30 dias
                set_transient($all_questions_transient_key, $all_questions_data, 30 * DAY_IN_SECONDS);
            }
        }

        $all_questions = $all_questions_data['bookingQuestions'] ?? [];

        if (empty($all_questions)) {
            viator_debug_log('Nenhuma pergunta de reserva encontrada na API ou falha na decodificação.');
            return [];
        }

        viator_debug_log('Recuperadas ' . count($all_questions) . ' perguntas de reserva totais da API (com cache).');

        // Filtrar as perguntas de reserva com base nos IDs retornados para o produto
        $booking_questions = array_filter($all_questions, function($question) use ($question_ids) {
            return isset($question['id']) && in_array($question['id'], $question_ids);
        });

        // Reindexar o array para garantir que as chaves sejam numéricas sequenciais
        $booking_questions = array_values($booking_questions);

        // Enriquecer perguntas com dados dinâmicos da API e fallbacks quando necessário
        $enriched_questions = [];
        foreach ($booking_questions as $question) {
            $enriched_question = $this->enrich_booking_question($question);
            $enriched_questions[] = $enriched_question;
        }

        viator_debug_log('Perguntas de reserva enriquecidas para o produto ' . $product_code, $enriched_questions);
        
        // Armazenar no transient por 1 hora
        set_transient($transient_key, $enriched_questions, HOUR_IN_SECONDS);
        
        return $enriched_questions;
    }

    /**
     * Enriquecer pergunta de reserva com dados dinâmicos da API e fallbacks
     * Preserva todos os atributos originais da API e adiciona traduções/melhorias
     */
    private function enrich_booking_question($api_question) {
        // Começar com os dados originais da API
        $enriched_question = $api_question;
        
        // Aplicar traduções e melhorias específicas baseadas no ID
        $question_id = $api_question['id'] ?? '';
        
        // Mapeamento de traduções e melhorias
        $translations_and_improvements = [
            'PICKUP_POINT' => [
                'label' => 'Ponto de Encontro',
                'hint' => 'Selecione o local de encontro ou digite um endereço específico'
            ],
            'SPECIAL_REQUIREMENTS' => [
                'label' => 'Requisitos Especiais',
                'hint' => 'Restrições alimentares, acessibilidade, etc.'
            ],
            'FULL_NAMES_FIRST' => [
                'label' => 'Nome'
            ],
            'FULL_NAMES_LAST' => [
                'label' => 'Sobrenome'
            ],
            'AGEBAND' => [
                'label' => 'Faixa Etária'
            ],
            'WEIGHT' => [
                'label' => 'Peso do viajante (necessário por motivos de segurança)'
            ],
            'HEIGHT' => [
                'label' => 'Altura do viajante (necessário por motivos de segurança)'
            ]
        ];
        
        // Aplicar traduções se disponíveis
        if (isset($translations_and_improvements[$question_id])) {
            $improvements = $translations_and_improvements[$question_id];
            foreach ($improvements as $key => $value) {
                $enriched_question[$key] = $value;
            }
        }
        
        // Garantir que campos essenciais existam
        if (!isset($enriched_question['required'])) {
            $enriched_question['required'] = 'OPTIONAL';
        }
        
        if (!isset($enriched_question['group'])) {
            // Determinar grupo baseado no ID
            $per_traveler_questions = ['FULL_NAMES_FIRST', 'FULL_NAMES_LAST', 'AGEBAND', 'WEIGHT', 'HEIGHT'];
            $enriched_question['group'] = in_array($question_id, $per_traveler_questions) ? 'PER_TRAVELER' : 'PER_BOOKING';
        }
        
        viator_debug_log('Pergunta enriquecida: ' . $question_id, $enriched_question);
        
        return $enriched_question;
    }

    /**
     * Tratamento abrangente de erros da API Viator
     * Baseado na documentação oficial da API
     */
    private function handle_api_error($response_code, $data, $context = '') {
        viator_debug_log("API Error Handler - Response Code: $response_code, Context: $context", $data);

        // Mapear códigos de erro específicos para mensagens localizadas
        $error_messages = array(
            400 => 'Dados da requisição inválidos. Verifique as informações e tente novamente.',
            401 => 'Chave de API inválida ou expirada. Entre em contato com o suporte.',
            403 => 'Acesso negado. Verifique suas permissões de API.',
            404 => 'Recurso não encontrado. O produto pode não estar mais disponível.',
            409 => 'Conflito na requisição. Tente novamente em alguns instantes.',
            422 => 'Dados fornecidos são inválidos ou incompletos.',
            429 => 'Muitas requisições. Aguarde alguns segundos e tente novamente.',
            500 => 'Erro interno do servidor. Tente novamente em alguns minutos.',
            502 => 'Serviço temporariamente indisponível. Tente novamente.',
            503 => 'Serviço em manutenção. Tente novamente mais tarde.',
            504 => 'Timeout na requisição. Tente novamente.'
        );

        // Verificar se há erro baseado no código de resposta
        if ($response_code >= 400) {
            $error_message = isset($error_messages[$response_code])
                ? $error_messages[$response_code]
                : "Erro na API (Código: $response_code). Tente novamente.";

            // Adicionar detalhes específicos se disponíveis na resposta
            if (is_array($data)) {
                if (isset($data['errorMessage'])) {
                    $error_message = $data['errorMessage'];
                } elseif (isset($data['message'])) {
                    $error_message = $data['message'];
                } elseif (isset($data['error'])) {
                    $error_message = is_string($data['error']) ? $data['error'] : $error_message;
                }

                // Log detalhado para debugging
                viator_debug_log("API Error Details", array(
                    'context' => $context,
                    'response_code' => $response_code,
                    'error_data' => $data,
                    'final_message' => $error_message
                ));
            }

            // Determinar se deve tentar novamente
            $should_retry = in_array($response_code, [429, 500, 502, 503, 504]);

            return array(
                'error' => $error_message,
                'error_code' => $response_code,
                'should_retry' => $should_retry,
                'context' => $context
            );
        }

        // Verificar erros específicos da API Viator no corpo da resposta
        if (is_array($data)) {
            if (isset($data['errorCode']) || isset($data['error'])) {
                $error_message = 'Erro na operação';

                if (isset($data['errorMessage'])) {
                    $error_message = $data['errorMessage'];
                } elseif (isset($data['error'])) {
                    $error_message = is_string($data['error']) ? $data['error'] : $error_message;
                }

                viator_debug_log("API Business Logic Error", array(
                    'context' => $context,
                    'error_code' => isset($data['errorCode']) ? $data['errorCode'] : 'unknown',
                    'error_message' => $error_message,
                    'full_data' => $data
                ));

                return array(
                    'error' => $error_message,
                    'error_code' => isset($data['errorCode']) ? $data['errorCode'] : 'api_error',
                    'should_retry' => false,
                    'context' => $context
                );
            }
        }

        // Nenhum erro detectado
        return null;
    }

    /**
     * Executar requisição com retry automático para erros temporários
     */
    private function make_api_request_with_retry($url, $args, $max_retries = 3, $context = '') {
        $attempt = 0;

        while ($attempt < $max_retries) {
            $attempt++;

            viator_debug_log("API Request Attempt $attempt/$max_retries", array(
                'url' => $url,
                'context' => $context
            ));

            $response = wp_remote_request($url, $args);

            if (is_wp_error($response)) {
                viator_debug_log("Connection error on attempt $attempt", $response->get_error_message());

                if ($attempt < $max_retries) {
                    sleep(pow(2, $attempt)); // Exponential backoff
                    continue;
                }

                return $response; // Return error on final attempt
            }

            $response_code = wp_remote_retrieve_response_code($response);
            $body = wp_remote_retrieve_body($response);
            $data = json_decode($body, true);

            // Verificar se deve tentar novamente
            $error_result = $this->handle_api_error($response_code, $data, $context);

            if (!$error_result || !$error_result['should_retry']) {
                // Sucesso ou erro não recuperável
                return $response;
            }

            if ($attempt < $max_retries) {
                viator_debug_log("Retrying request due to temporary error", $error_result);
                sleep(pow(2, $attempt)); // Exponential backoff
            }
        }

        return $response; // Return final response
    }

    /**
     * Criar objeto de pergunta de reserva baseado no ID (FALLBACK)
     * Baseado na documentação: https://partnerresources.viator.com/travel-commerce/merchant/implementing-booking-questions/
     */
    private function create_booking_question_from_id($question_id) {
        // Mapeamento completo de perguntas de reserva conforme documentação da Viator
        // https://partnerresources.viator.com/travel-commerce/merchant/implementing-booking-questions/
        $question_mapping = [
            // Perguntas MANDATORY - Sempre obrigatórias
            'AGEBAND' => [
                'id' => 'AGEBAND',
                'label' => 'Faixa Etária',
                'type' => 'STRING',
                'group' => 'PER_TRAVELER',
                'required' => 'MANDATORY',
                'allowedAnswers' => ['ADULT', 'SENIOR', 'YOUTH', 'CHILD', 'INFANT', 'TRAVELER'],
                'maxLength' => 50
            ],
            'FULL_NAMES_FIRST' => [
                'id' => 'FULL_NAMES_FIRST',
                'label' => 'Nome',
                'type' => 'STRING',
                'group' => 'PER_TRAVELER',
                'required' => 'MANDATORY',
                'maxLength' => 50
            ],
            'FULL_NAMES_LAST' => [
                'id' => 'FULL_NAMES_LAST',
                'label' => 'Sobrenome',
                'type' => 'STRING',
                'group' => 'PER_TRAVELER',
                'required' => 'MANDATORY',
                'maxLength' => 50
            ],
            'WEIGHT' => [
                'id' => 'WEIGHT',
                'label' => 'Peso do viajante (necessário por motivos de segurança)',
                'type' => 'NUMBER_AND_UNIT',
                'group' => 'PER_TRAVELER',
                'required' => 'MANDATORY',
                'units' => ['kg', 'lbs'],
                'maxLength' => 50
            ],
            'HEIGHT' => [
                'id' => 'HEIGHT',
                'label' => 'Altura do viajante (necessário por motivos de segurança)',
                'type' => 'NUMBER_AND_UNIT',
                'group' => 'PER_TRAVELER',
                'required' => 'MANDATORY',
                'units' => ['cm', 'ft'],
                'maxLength' => 50
            ],
            'TRANSFER_ARRIVAL_MODE' => [
                'id' => 'TRANSFER_ARRIVAL_MODE',
                'label' => 'Modo de Chegada',
                'type' => 'STRING',
                'group' => 'PER_BOOKING',
                'required' => 'MANDATORY',
                'allowedAnswers' => ['AIR', 'RAIL', 'SEA', 'OTHER'],
                'maxLength' => 50
            ],
            'TRANSFER_DEPARTURE_MODE' => [
                'id' => 'TRANSFER_DEPARTURE_MODE',
                'label' => 'Modo de Partida',
                'type' => 'STRING',
                'group' => 'PER_BOOKING',
                'required' => 'MANDATORY',
                'allowedAnswers' => ['AIR', 'RAIL', 'SEA', 'OTHER'],
                'maxLength' => 50
            ],
            
            // Perguntas CONDITIONAL - Dependem de outras perguntas
            'TRANSFER_ARRIVAL_TIME' => [
                'id' => 'TRANSFER_ARRIVAL_TIME',
                'label' => 'Horário de Chegada',
                'type' => 'TIME',
                'group' => 'PER_BOOKING',
                'required' => 'CONDITIONAL',
                'dependsOn' => 'TRANSFER_ARRIVAL_MODE',
                'maxLength' => 100
            ],
            'TRANSFER_DEPARTURE_DATE' => [
                'id' => 'TRANSFER_DEPARTURE_DATE',
                'label' => 'Data de Partida',
                'type' => 'DATE',
                'group' => 'PER_BOOKING',
                'required' => 'CONDITIONAL',
                'dependsOn' => 'TRANSFER_DEPARTURE_MODE',
                'maxLength' => 100
            ],
            'TRANSFER_DEPARTURE_PICKUP' => [
                'id' => 'TRANSFER_DEPARTURE_PICKUP',
                'label' => 'Endereço de Embarque',
                'type' => 'LOCATION_REF_OR_FREE_TEXT',
                'group' => 'PER_BOOKING',
                'required' => 'CONDITIONAL',
                'dependsOn' => 'TRANSFER_DEPARTURE_MODE',
                'hint' => 'Ex: Rua das Flores, 123, São Paulo SP 01234-567',
                'units' => ['LOCATION_REFERENCE', 'FREETEXT'],
                'maxLength' => 1000
            ],
            'TRANSFER_DEPARTURE_TIME' => [
                'id' => 'TRANSFER_DEPARTURE_TIME',
                'label' => 'Horário de Partida',
                'type' => 'TIME',
                'group' => 'PER_BOOKING',
                'required' => 'CONDITIONAL',
                'dependsOn' => 'TRANSFER_DEPARTURE_MODE',
                'maxLength' => 100
            ],
            
            // Perguntas condicionais específicas para transporte aéreo (AIR)
            'TRANSFER_AIR_ARRIVAL_AIRLINE' => [
                'id' => 'TRANSFER_AIR_ARRIVAL_AIRLINE',
                'label' => 'Companhia Aérea de Chegada',
                'type' => 'STRING',
                'group' => 'PER_BOOKING',
                'required' => 'CONDITIONAL',
                'dependsOn' => 'TRANSFER_ARRIVAL_MODE',
                'showWhen' => ['AIR'],
                'maxLength' => 255
            ],
            'TRANSFER_AIR_ARRIVAL_FLIGHT_NO' => [
                'id' => 'TRANSFER_AIR_ARRIVAL_FLIGHT_NO',
                'label' => 'Número do Voo de Chegada',
                'type' => 'STRING',
                'group' => 'PER_BOOKING',
                'required' => 'CONDITIONAL',
                'dependsOn' => 'TRANSFER_ARRIVAL_MODE',
                'showWhen' => ['AIR'],
                'maxLength' => 255
            ],
            'TRANSFER_AIR_DEPARTURE_AIRLINE' => [
                'id' => 'TRANSFER_AIR_DEPARTURE_AIRLINE',
                'label' => 'Companhia Aérea de Partida',
                'type' => 'STRING',
                'group' => 'PER_BOOKING',
                'required' => 'CONDITIONAL',
                'dependsOn' => 'TRANSFER_DEPARTURE_MODE',
                'showWhen' => ['AIR'],
                'maxLength' => 255
            ],
            'TRANSFER_AIR_DEPARTURE_FLIGHT_NO' => [
                'id' => 'TRANSFER_AIR_DEPARTURE_FLIGHT_NO',
                'label' => 'Número do Voo de Partida',
                'type' => 'STRING',
                'group' => 'PER_BOOKING',
                'required' => 'CONDITIONAL',
                'dependsOn' => 'TRANSFER_DEPARTURE_MODE',
                'showWhen' => ['AIR'],
                'maxLength' => 255
            ],
            
            // Perguntas condicionais específicas para transporte marítimo (SEA)
            'TRANSFER_PORT_ARRIVAL_TIME' => [
                'id' => 'TRANSFER_PORT_ARRIVAL_TIME',
                'label' => 'Horário de Desembarque',
                'type' => 'TIME',
                'group' => 'PER_BOOKING',
                'required' => 'CONDITIONAL',
                'dependsOn' => 'TRANSFER_ARRIVAL_MODE',
                'showWhen' => ['SEA'],
                'maxLength' => 100
            ],
            'TRANSFER_PORT_CRUISE_SHIP' => [
                'id' => 'TRANSFER_PORT_CRUISE_SHIP',
                'label' => 'Nome do Navio de Cruzeiro',
                'type' => 'STRING',
                'group' => 'PER_BOOKING',
                'required' => 'CONDITIONAL',
                'dependsOn' => 'TRANSFER_ARRIVAL_MODE',
                'showWhen' => ['SEA'],
                'hint' => 'Ex: MSC Seaside',
                'maxLength' => 255
            ],
            'TRANSFER_PORT_DEPARTURE_TIME' => [
                'id' => 'TRANSFER_PORT_DEPARTURE_TIME',
                'label' => 'Horário de Embarque',
                'type' => 'TIME',
                'group' => 'PER_BOOKING',
                'required' => 'CONDITIONAL',
                'dependsOn' => 'TRANSFER_DEPARTURE_MODE',
                'showWhen' => ['SEA'],
                'maxLength' => 100
            ],
            
            // Perguntas condicionais específicas para transporte ferroviário (RAIL)
            'TRANSFER_RAIL_ARRIVAL_LINE' => [
                'id' => 'TRANSFER_RAIL_ARRIVAL_LINE',
                'label' => 'Companhia Ferroviária de Chegada',
                'type' => 'STRING',
                'group' => 'PER_BOOKING',
                'required' => 'CONDITIONAL',
                'dependsOn' => 'TRANSFER_ARRIVAL_MODE',
                'showWhen' => ['RAIL'],
                'hint' => 'Ex: CPTM',
                'maxLength' => 255
            ],
            'TRANSFER_RAIL_ARRIVAL_STATION' => [
                'id' => 'TRANSFER_RAIL_ARRIVAL_STATION',
                'label' => 'Estação de Chegada',
                'type' => 'STRING',
                'group' => 'PER_BOOKING',
                'required' => 'CONDITIONAL',
                'dependsOn' => 'TRANSFER_ARRIVAL_MODE',
                'showWhen' => ['RAIL'],
                'hint' => 'Ex: Estação da Luz',
                'maxLength' => 255
            ],
            'TRANSFER_RAIL_DEPARTURE_LINE' => [
                'id' => 'TRANSFER_RAIL_DEPARTURE_LINE',
                'label' => 'Companhia Ferroviária de Partida',
                'type' => 'STRING',
                'group' => 'PER_BOOKING',
                'required' => 'CONDITIONAL',
                'dependsOn' => 'TRANSFER_DEPARTURE_MODE',
                'showWhen' => ['RAIL'],
                'hint' => 'Ex: CPTM',
                'maxLength' => 255
            ],
            'TRANSFER_RAIL_DEPARTURE_STATION' => [
                'id' => 'TRANSFER_RAIL_DEPARTURE_STATION',
                'label' => 'Estação de Partida',
                'type' => 'STRING',
                'group' => 'PER_BOOKING',
                'required' => 'CONDITIONAL',
                'dependsOn' => 'TRANSFER_DEPARTURE_MODE',
                'showWhen' => ['RAIL'],
                'hint' => 'Ex: Estação da Luz',
                'maxLength' => 255
            ],
            
            // Perguntas gerais
            'PICKUP_POINT' => [
                'id' => 'PICKUP_POINT',
                'label' => 'Ponto de Encontro',
                'type' => 'LOCATION_REF_OR_FREE_TEXT',
                'group' => 'PER_BOOKING',
                'required' => 'MANDATORY',
                'units' => ['LOCATION_REFERENCE', 'FREETEXT'],
                // NOTA: Para implementar busca de locais com TripAdvisor API,
                // utilize a função viator_get_tripadvisor_api_key() para obter a chave
                // configurada em admin.php?page=viator-settings
                'tripadvisor_integration' => true
            ],
            'SPECIAL_REQUIREMENTS' => [
                'id' => 'SPECIAL_REQUIREMENTS',
                'label' => 'Requisitos Especiais',
                'type' => 'STRING',
                'group' => 'PER_BOOKING',
                'required' => 'OPTIONAL',
                'maxLength' => 1000
            ],

            // Perguntas adicionais obrigatórias conforme documentação
            'DATE_OF_BIRTH' => [
                'id' => 'DATE_OF_BIRTH',
                'label' => 'Data de Nascimento',
                'type' => 'DATE',
                'group' => 'PER_TRAVELER',
                'required' => 'MANDATORY',
                'maxLength' => 100
            ],
            'PASSPORT_PASSPORT_NO' => [
                'id' => 'PASSPORT_PASSPORT_NO',
                'label' => 'Número do Passaporte',
                'type' => 'STRING',
                'group' => 'PER_TRAVELER',
                'required' => 'MANDATORY',
                'maxLength' => 50
            ],
            'PASSPORT_NATIONALITY' => [
                'id' => 'PASSPORT_NATIONALITY',
                'label' => 'Nacionalidade do Passaporte',
                'type' => 'STRING',
                'group' => 'PER_TRAVELER',
                'required' => 'MANDATORY',
                'maxLength' => 100
            ],
            'PASSPORT_EXPIRY' => [
                'id' => 'PASSPORT_EXPIRY',
                'label' => 'Data de Expiração do Passaporte',
                'type' => 'DATE',
                'group' => 'PER_TRAVELER',
                'required' => 'MANDATORY',
                'maxLength' => 100
            ],
            'HOTEL_PICKUP' => [
                'id' => 'HOTEL_PICKUP',
                'label' => 'Hotel para Busca',
                'type' => 'LOCATION_REF_OR_FREE_TEXT',
                'group' => 'PER_BOOKING',
                'required' => 'CONDITIONAL',
                'units' => ['LOCATION_REFERENCE', 'FREETEXT'],
                'maxLength' => 255,
                'tripadvisor_integration' => true
            ],
            'DIETARY_REQUIREMENTS' => [
                'id' => 'DIETARY_REQUIREMENTS',
                'label' => 'Restrições Alimentares',
                'type' => 'STRING',
                'group' => 'PER_BOOKING',
                'required' => 'OPTIONAL',
                'maxLength' => 500,
                'hint' => 'Vegetariano, vegano, sem glúten, alergias, etc.'
            ],
            'ACCESSIBILITY_REQUIREMENTS' => [
                'id' => 'ACCESSIBILITY_REQUIREMENTS',
                'label' => 'Necessidades de Acessibilidade',
                'type' => 'STRING',
                'group' => 'PER_BOOKING',
                'required' => 'OPTIONAL',
                'maxLength' => 500,
                'hint' => 'Cadeira de rodas, deficiência visual, etc.'
            ],
            'MEDICAL_CONDITIONS' => [
                'id' => 'MEDICAL_CONDITIONS',
                'label' => 'Condições Médicas',
                'type' => 'STRING',
                'group' => 'PER_BOOKING',
                'required' => 'OPTIONAL',
                'maxLength' => 500,
                'hint' => 'Condições médicas relevantes para a atividade'
            ]
        ];
        
        if (isset($question_mapping[$question_id])) {
            viator_debug_log('Pergunta de reserva mapeada: ' . $question_id, $question_mapping[$question_id]);
            return $question_mapping[$question_id];
        }
        
        // Fallback para perguntas não mapeadas
        viator_debug_log('Pergunta de reserva não mapeada, criando fallback: ' . $question_id);
        return [
            'id' => $question_id,
            'label' => ucwords(str_replace('_', ' ', strtolower($question_id))),
            'type' => 'TEXT',
            'group' => 'PER_BOOKING',
            'required' => 'OPTIONAL'
        ];
    }

    /**
     * AJAX - Buscar perguntas de reserva
     */
    public function ajax_get_booking_questions() {
        // Verificar nonce - aceitar tanto 'nonce' quanto '_ajax_nonce'
        $nonce = isset($_POST['nonce']) ? $_POST['nonce'] : (isset($_POST['_ajax_nonce']) ? $_POST['_ajax_nonce'] : '');
        
        viator_debug_log('🔍 [AJAX BOOKING QUESTIONS] Nonce recebido: ' . $nonce);
        viator_debug_log('🔍 [AJAX BOOKING QUESTIONS] POST data: ', $_POST);
        
        if (empty($nonce) || !wp_verify_nonce($nonce, 'viator_booking_nonce')) {
            viator_debug_log('❌ [AJAX BOOKING QUESTIONS] Nonce inválido ou não fornecido');
            wp_send_json_error(array('message' => 'Nonce inválido'));
        }
        
        $product_code = sanitize_text_field($_POST['product_code']);
        
        if (empty($product_code)) {
            wp_send_json_error(array('message' => 'Código do produto não fornecido'));
        }
        
        viator_debug_log('🔍 [AJAX BOOKING QUESTIONS] Requisição recebida para produto: ' . $product_code);

        $booking_questions = $this->get_product_booking_questions($product_code);

        // O método get_product_booking_questions retorna um array simples de perguntas
        // Vamos estruturar a resposta no formato esperado pelo frontend
        $result = array(
            'product_code' => $product_code,
            'booking_questions' => $booking_questions,
            'logistics' => array(), // Será preenchido se necessário
            'product_options' => array(), // Será preenchido se necessário
            'raw_booking_questions' => array_keys($booking_questions)
        );

        viator_debug_log('🔍 [AJAX BOOKING QUESTIONS] Perguntas encontradas: ' . count($booking_questions));
        viator_debug_log('🔍 [AJAX BOOKING QUESTIONS] Dados das perguntas: ' . json_encode($result));

        wp_send_json_success($result);
    }

    /**
     * AJAX - Verificar disponibilidade
     */
    public function ajax_check_availability() {
        // Verificar nonce
        if (!wp_verify_nonce($_POST['nonce'], 'viator_booking_nonce')) {
            wp_send_json_error(array('message' => 'Nonce inválido'));
        }
        
        $product_code = sanitize_text_field($_POST['product_code']);
        $travel_date = sanitize_text_field($_POST['travel_date']);
        $travelers = json_decode(stripslashes($_POST['travelers']), true);
        
        if (empty($product_code) || empty($travel_date) || empty($travelers)) {
            wp_send_json_error(array('message' => 'Dados incompletos'));
        }
        
        $result = $this->check_availability($product_code, $travel_date, $travelers);
        
        if (isset($result['error'])) {
            wp_send_json_error(array('message' => $result['error']));
        }
        
        // Enriquecer dados com descrições das opções do produto
        $product_options = $this->get_product_options($product_code);
        if (!empty($product_options) && isset($result['bookableItems'])) {
            foreach ($result['bookableItems'] as &$item) {
                $option_code = $item['productOptionCode'] ?? '';
                if (isset($product_options[$option_code])) {
                    $item['optionTitle'] = $product_options[$option_code];
                } else {
                    $item['optionTitle'] = $option_code; // Fallback
                }
            }
        }
        
        // Incluir perguntas de reserva na resposta
        $booking_questions = $this->get_product_booking_questions($product_code);
        $result['bookingQuestions'] = $booking_questions;
        
        wp_send_json_success($result);
    }
    
    /**
     * AJAX - Solicitar hold de reserva
     */
    public function ajax_request_hold() {
        // Verificar nonce
        if (!wp_verify_nonce($_POST['nonce'], 'viator_booking_nonce')) {
            wp_send_json_error(array('message' => 'Nonce inválido'));
        }
        
        $availability_data = json_decode(stripslashes($_POST['availability_data']), true);
        $travelers_details = json_decode(stripslashes($_POST['travelers_details']), true);
        $booking_question_answers = isset($_POST['booking_question_answers']) ? json_decode(stripslashes($_POST['booking_question_answers']), true) : [];
        $booker_info = isset($_POST['booker_info']) ? json_decode(stripslashes($_POST['booker_info']), true) : [];

        if (empty($availability_data) || empty($travelers_details)) {
            wp_send_json_error(array('message' => 'Dados incompletos'));
        }

        // Log das respostas das perguntas de reserva para debug
        viator_debug_log('Hold request data received', array(
            'availability_data' => $availability_data,
            'travelers_count' => count($travelers_details),
            'booking_questions_count' => count($booking_question_answers),
            'has_booker_info' => !empty($booker_info)
        ));

        $result = $this->request_booking_hold($availability_data, $travelers_details, $booking_question_answers, $booker_info);
        
        if (isset($result['error'])) {
            wp_send_json_error(array('message' => $result['error']));
        }
        
        wp_send_json_success($result);
    }
    
    /**
     * AJAX - Processar pagamento
     */
    public function ajax_process_payment() {
        // Verificar nonce
        if (!wp_verify_nonce($_POST['nonce'], 'viator_booking_nonce')) {
            wp_send_json_error(array('message' => 'Nonce inválido'));
        }
        
        $payment_token = sanitize_text_field($_POST['payment_token']);
        
        if (empty($payment_token)) {
            wp_send_json_error(array('message' => 'Token de pagamento não fornecido'));
        }
        
        $result = $this->process_payment($payment_token);
        
        if (isset($result['error'])) {
            wp_send_json_error(array('message' => $result['error']));
        }
        
        wp_send_json_success($result);
    }
    
    /**
     * AJAX - Submeter dados de pagamento para API da Viator
     */
    public function ajax_submit_payment() {
        // Verificar nonce
        if (!wp_verify_nonce($_POST['nonce'], 'viator_booking_nonce')) {
            wp_send_json_error(array('message' => 'Nonce inválido'));
        }

        $payment_data = json_decode(stripslashes($_POST['payment_data']), true);
        $payment_url = sanitize_text_field($_POST['payment_url']); // Receber URL do frontend

        if (empty($payment_data)) {
            wp_send_json_error(array('message' => 'Dados de pagamento incompletos'));
        }

        $result = $this->submit_payment_to_viator($payment_url, $payment_data);

        if (isset($result['error'])) {
            wp_send_json_error(array('message' => $result['error']));
        }

        wp_send_json_success($result);
    }

    /**
     * AJAX - Buscar todas as booking questions disponíveis
     */
    public function ajax_get_all_booking_questions() {
        // Verificar nonce
        if (!wp_verify_nonce($_POST['nonce'], 'viator_booking_nonce')) {
            wp_send_json_error(array('message' => 'Nonce inválido'));
        }

        $result = $this->get_all_booking_questions();

        if (isset($result['error'])) {
            wp_send_json_error(array('message' => $result['error']));
        }

        wp_send_json_success($result);
    }
    
    /**
     * Submeter dados de pagamento para API da Viator
     */
    public function submit_payment_to_viator($payment_url, $payment_data) {
        try {
            // ✅ CONFORME DOCUMENTAÇÃO: Usar paymentDataSubmissionUrl do hold
            // A URL já vem completa do frontend (extraída da resposta do hold)
            if (empty($payment_url)) {
                return array('error' => 'paymentDataSubmissionUrl não disponível. Refaça o booking hold.');
            }
            
            // Headers conforme documentação oficial da API da Viator
            // Incluindo todos os headers obrigatórios para o endpoint /v1/checkoutsessions/{sessionToken}/paymentaccounts
            $headers = array(
                'Content-Type' => 'application/json;version=2.0',
                'x-trip-clientid' => 'P00241467', // Seu partner identifier único
                'x-trip-requestid' => wp_generate_uuid4(), // Identificador único por requisição
                'User-Agent' => 'WordPress-Plugin/1.0'
            );
            
            viator_debug_log('Enviando dados de pagamento para API da Viator', array(
                'url' => $payment_url,
                'payment_structure' => array(
                    'creditCards_count' => count($payment_data['paymentAccounts']['creditCards']),
                    'first_card_last_four' => substr($payment_data['paymentAccounts']['creditCards'][0]['number'], -4),
                    'country' => $payment_data['paymentAccounts']['creditCards'][0]['address']['country']
                )
            ));
            
            $response = wp_remote_post($payment_url, array(
                'headers' => $headers,
                'body' => json_encode($payment_data),
                'timeout' => 30
            ));
            
            if (is_wp_error($response)) {
                viator_debug_log('Erro na requisição de pagamento', $response->get_error_message());
                return array('error' => 'Erro de conexão: ' . $response->get_error_message());
            }
            
            $response_code = wp_remote_retrieve_response_code($response);
            $response_body = wp_remote_retrieve_body($response);
            $response_data = json_decode($response_body, true);
            
            viator_debug_log('Resposta da API de pagamento da Viator', array(
                'status_code' => $response_code,
                'response_data' => $response_data
            ));
            
            if ($response_code === 200) {
                // Sucesso - retornar dados da resposta
                return $response_data;
            } elseif ($response_code === 404) {
                return array('error' => 'Sessão de checkout expirada ou não encontrada.');
            } else {
                $error_message = 'Erro no processamento do pagamento';
                if (isset($response_data['responseHeader']['responseMessage'])) {
                    $error_message = $response_data['responseHeader']['responseMessage'];
                }
                return array('error' => $error_message);
            }
            
        } catch (Exception $e) {
            viator_debug_log('Exceção ao processar pagamento', $e->getMessage());
            return array('error' => 'Erro interno: ' . $e->getMessage());
        }
    }
    
    /**
     * AJAX - Confirmar reserva
     */
    public function ajax_confirm_booking() {
        if (!wp_verify_nonce($_POST['nonce'], 'viator_booking_nonce')) {
            wp_send_json_error(['message' => 'Nonce inválido']);
        }
        
        $cart_id = sanitize_text_field($_POST['cart_id']);
        $payment_token = sanitize_text_field($_POST['payment_token']);
        $booker_info = json_decode(stripslashes($_POST['booker_info']), true);
        $booking_question_answers = isset($_POST['bookingQuestionAnswers']) ? json_decode(stripslashes($_POST['bookingQuestionAnswers']), true) : [];
        $hold_data = isset($_POST['hold_data']) ? json_decode(stripslashes($_POST['hold_data']), true) : [];

        if (empty($cart_id) || empty($payment_token) || empty($booker_info)) {
            wp_send_json_error(['message' => 'Dados incompletos para confirmação']);
        }

        $result = $this->confirm_booking($cart_id, $payment_token, $booker_info, $booking_question_answers, $hold_data);

        if (isset($result['error']) && $result['error']) {
            wp_send_json_error($result);
        }
        
        wp_send_json_success($result);
    }

    /**
     * AJAX - Busca disponibilidade mensal
     */
    public function ajax_get_monthly_availability() {
        if (!wp_verify_nonce($_POST['nonce'], 'viator_booking_nonce')) {
            wp_send_json_error(['message' => 'Nonce inválido']);
        }

        $product_code = sanitize_text_field($_POST['product_code']);
        $month = sanitize_text_field($_POST['month']);
        $year = sanitize_text_field($_POST['year']);

        if (empty($product_code) || empty($month) || empty($year)) {
            wp_send_json_error(['message' => 'Dados incompletos']);
        }

        $result = $this->get_monthly_availability($product_code, $month, $year);

        if (isset($result['error'])) {
            wp_send_json_error(['message' => $result['error']]);
        }

        wp_send_json_success($result);
    }

    /**
     * AJAX - Debug logging do JavaScript
     */
    public function ajax_debug_log_js() {
        // Verificar nonce se fornecido
        if (isset($_POST['nonce']) && !wp_verify_nonce($_POST['nonce'], 'viator_booking_nonce')) {
            wp_send_json_error(array('message' => 'Nonce inválido'));
        }

        $message = sanitize_text_field($_POST['message'] ?? '');
        $data = $_POST['data'] ?? '';

        if (!empty($message)) {
            viator_debug_log('[JS] ' . $message, $data ? json_decode($data, true) : null);
        }

        wp_send_json_success();
    }

    /**
     * AJAX - Testar acesso à API
     */
    public function ajax_test_api_access() {
        if (!wp_verify_nonce($_POST['nonce'], 'viator_booking_nonce')) {
            wp_send_json_error(['message' => 'Nonce inválido']);
        }

        $result = $this->test_api_access_level();
        
        if (isset($result['error'])) {
            wp_send_json_error($result);
        }

        wp_send_json_success($result);
    }

    /**
     * Testar nível de acesso da API
     */
    public function test_api_access_level() {
        if (empty($this->api_key)) {
            return ['error' => 'API Key não configurada'];
        }

        $locale_settings = viator_get_locale_settings();
        $tests = [];

        // Teste 1: Verificar produtos básicos
        $test_product_url = $this->base_url . '/partner/products/2484FAV';
        $response1 = wp_remote_get($test_product_url, [
            'headers' => [
                'Accept' => 'application/json;version=2.0',
                'exp-api-key' => $this->api_key,
                'Accept-Language' => $locale_settings['language']
            ],
            'timeout' => 15
        ]);

        $tests['products_access'] = [
            'endpoint' => '/partner/products/2484FAV',
            'method' => 'GET',
            'status_code' => wp_remote_retrieve_response_code($response1),
            'success' => !is_wp_error($response1) && wp_remote_retrieve_response_code($response1) === 200
        ];

        // Teste 2: Verificar availability check
        $availability_data = [
            'productCode' => '2484FAV',
            'travelDate' => date('Y-m-d', strtotime('+7 days')),
            'currency' => $locale_settings['currency'],
            'paxMix' => [['ageBand' => 'ADULT', 'numberOfTravelers' => 1]]
        ];

        $response2 = wp_remote_post($this->base_url . '/partner/availability/check', [
            'headers' => [
                'Accept' => 'application/json;version=2.0',
                'Content-Type' => 'application/json;version=2.0',
                'exp-api-key' => $this->api_key,
                'Accept-Language' => $locale_settings['language']
            ],
            'body' => json_encode($availability_data),
            'timeout' => 15
        ]);

        $tests['availability_access'] = [
            'endpoint' => '/partner/availability/check',
            'method' => 'POST',
            'status_code' => wp_remote_retrieve_response_code($response2),
            'success' => !is_wp_error($response2) && wp_remote_retrieve_response_code($response2) === 200
        ];

        // Teste 3: Verificar acesso ao booking hold (o que está falhando)
        $hold_data = [
            'currency' => $locale_settings['currency'],
            'partnerCartRef' => 'TEST_CART_' . time(),
            'items' => [[
                'partnerBookingRef' => 'TEST_BOOK_' . time(),
                'productCode' => '2484FAV',
                'productOptionCode' => 'TG3',
                'travelDate' => date('Y-m-d', strtotime('+7 days')),
                'paxMix' => [['ageBand' => 'ADULT', 'numberOfTravelers' => 1]]
            ]],
            'paymentDataSubmissionMode' => 'PARTNER_FORM',
            'hostingUrl' => home_url()
        ];

        $response3 = wp_remote_post($this->base_url . '/partner/bookings/cart/hold', [
            'headers' => [
                'Accept' => 'application/json;version=2.0',
                'Content-Type' => 'application/json;version=2.0',
                'exp-api-key' => $this->api_key,
                'Accept-Language' => $locale_settings['language']
            ],
            'body' => json_encode($hold_data),
            'timeout' => 15
        ]);

        $hold_response_code = wp_remote_retrieve_response_code($response3);
        $hold_body = wp_remote_retrieve_body($response3);
        
        $tests['booking_hold_access'] = [
            'endpoint' => '/partner/bookings/cart/hold',
            'method' => 'POST',
            'status_code' => $hold_response_code,
            'success' => !is_wp_error($response3) && $hold_response_code === 200,
            'response_body' => $hold_body,
            'error_details' => $hold_response_code === 403 ? 'API key não tem permissões de booking' : null
        ];

        // Resumo
        $has_booking_access = $tests['booking_hold_access']['success'];
        $access_level = $has_booking_access ? 'Full Access + Booking' : 'Somente leitura';

        return [
            'api_key_status' => 'Configurada',
            'base_url' => $this->base_url,
            'access_level' => $access_level,
            'tests' => $tests,
            'recommendations' => $has_booking_access ? [] : [
                'Solicite à Viator upgrade para "Full Access + Booking"',
                'Verifique se sua conta está aprovada para bookings',
                'Confirme se está usando a API key correta para o ambiente'
            ]
        ];
    }

    /**
     * Buscar todas as booking questions disponíveis na API da Viator
     */
    private function get_all_booking_questions() {
        viator_debug_log('Buscando todas as booking questions da Viator');

        // Cache das booking questions por 1 hora
        $cache_key = 'viator_all_booking_questions';
        $cached_data = get_transient($cache_key);

        if ($cached_data !== false) {
            viator_debug_log('Usando booking questions do cache');
            return $cached_data;
        }

        $response = $this->make_api_request_with_retry(
            $this->base_url . '/products/booking-questions',
            array(
                'method' => 'GET',
                'headers' => array(
                    'Accept' => 'application/json;version=2.0',
                    'exp-api-key' => $this->api_key,
                    'Accept-Language' => 'pt-BR'
                ),
                'timeout' => 30
            ),
            3,
            'get_all_booking_questions'
        );

        if (is_wp_error($response)) {
            viator_debug_log('Erro ao buscar booking questions:', $response->get_error_message());
            return array('error' => 'Erro ao buscar booking questions: ' . $response->get_error_message());
        }

        $response_code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if ($response_code !== 200) {
            viator_debug_log('Erro na API de booking questions', array(
                'status_code' => $response_code,
                'response' => $body
            ));
            return array('error' => 'Erro na API: ' . ($data['message'] ?? 'Erro desconhecido'));
        }

        // Organizar questions por ID para fácil acesso
        $questions_by_id = array();
        if (isset($data['bookingQuestions']) && is_array($data['bookingQuestions'])) {
            foreach ($data['bookingQuestions'] as $question) {
                $questions_by_id[$question['id']] = $question;
            }
        }

        $result = array(
            'questions' => $questions_by_id,
            'raw_data' => $data
        );

        // Cache por 1 hora
        set_transient($cache_key, $result, HOUR_IN_SECONDS);

        viator_debug_log('Booking questions carregadas com sucesso', array(
            'total_questions' => count($questions_by_id)
        ));

        return $result;
    }

    /**
     * Processar booking questions para o formato da API da Viator
     */
    private function process_booking_questions_for_hold($booking_question_answers, $booker_info = []) {
        $processed_questions = array();

        viator_debug_log('Processing booking questions for hold', array(
            'answers_count' => count($booking_question_answers),
            'has_booker_info' => !empty($booker_info)
        ));

        foreach ($booking_question_answers as $answer) {
            $question_id = $answer['questionId'] ?? '';
            $answer_value = $answer['answer'] ?? '';
            $scope = $answer['scope'] ?? 'booking';
            $traveler_index = $answer['travelerIndex'] ?? null;

            if (empty($question_id) || empty($answer_value)) {
                continue;
            }

            // Formato da API da Viator para booking questions
            $processed_answer = array(
                'question' => $question_id,  // API da Viator usa 'question', não 'questionId'
                'answer' => $answer_value
            );

            // Adicionar travelerNum se for pergunta PER_TRAVELER (formato API Viator)
            if ($scope === 'traveler' && $traveler_index !== null) {
                $processed_answer['travelerNum'] = intval($traveler_index);
            }

            // Adicionar unit se fornecida
            if (isset($answer['unit']) && !empty($answer['unit'])) {
                $processed_answer['unit'] = $answer['unit'];
            }

            $processed_questions[] = $processed_answer;
        }

        viator_debug_log('Processed booking questions', array(
            'original_count' => count($booking_question_answers),
            'processed_count' => count($processed_questions),
            'processed_questions' => $processed_questions
        ));

        return $processed_questions;
    }

    /**
     * Validar booking questions (MANDATORY e CONDITIONAL) conforme documentação da Viator
     * Baseado em: https://docs.viator.com/partner-api/technical/
     * https://partnerresources.viator.com/travel-commerce/merchant/implementing-booking-questions/
     */
    private function validate_conditional_booking_questions($booking_question_answers, $product_code = '') {
        $validation_errors = [];
        $answers_by_question = [];
        
        // Organizar respostas por questionId para facilitar validação
        foreach ($booking_question_answers as $answer) {
            $question_id = $answer['questionId'] ?? '';
            if (!empty($question_id)) {
                $answers_by_question[$question_id] = $answer;
            }
        }

        viator_debug_log('Validating booking questions (MANDATORY + CONDITIONAL)', array(
            'product_code' => $product_code,
            'total_answers' => count($answers_by_question),
            'questions' => array_keys($answers_by_question)
        ));
        
        // 1. Validar perguntas MANDATORY se product_code fornecido
        if (!empty($product_code)) {
            $required_questions = $this->get_required_booking_questions($product_code);
            foreach ($required_questions as $required_question) {
                $question_id = $required_question['id'];
                if (!isset($answers_by_question[$question_id]) || 
                    empty($answers_by_question[$question_id]['answer'])) {
                    $validation_errors[] = array(
                        'field' => $question_id,
                        'message' => sprintf('Pergunta obrigatória não respondida: %s', $required_question['label'] ?? $question_id),
                        'code' => 'MANDATORY_REQUIRED'
                    );
                }
            }
        }

        // Validação específica para PICKUP_POINT conforme documentação Viator
        if (isset($answers_by_question['TRANSFER_ARRIVAL_MODE'])) {
            $arrival_mode = $answers_by_question['TRANSFER_ARRIVAL_MODE']['answer'] ?? '';
            
            // Se TRANSFER_ARRIVAL_MODE é "OTHER", PICKUP_POINT torna-se obrigatório
            if ($arrival_mode === 'OTHER') {
                if (!isset($answers_by_question['PICKUP_POINT']) || 
                    empty($answers_by_question['PICKUP_POINT']['answer'])) {
                    $validation_errors[] = array(
                        'field' => 'PICKUP_POINT',
                        'message' => 'Ponto de encontro é obrigatório quando o modo de chegada é "Outro"',
                        'code' => 'CONDITIONAL_REQUIRED'
                    );
                }
            }
        }

        // Validação para TRANSFER_DEPARTURE_MODE e suas dependências
        if (isset($answers_by_question['TRANSFER_DEPARTURE_MODE'])) {
            $departure_mode = $answers_by_question['TRANSFER_DEPARTURE_MODE']['answer'] ?? '';
            
            // Validações condicionais baseadas no modo de partida
            $conditional_questions = [
                'FLIGHT' => ['TRANSFER_AIR_DEPARTURE_AIRLINE', 'TRANSFER_AIR_DEPARTURE_FLIGHT_NO'],
                'CRUISE' => ['TRANSFER_CRUISE_DEPARTURE_SHIP_NAME'],
                'TRAIN' => ['TRANSFER_RAIL_DEPARTURE_STATION'],
                'OTHER' => ['TRANSFER_DEPARTURE_PICKUP']
            ];

            if (isset($conditional_questions[$departure_mode])) {
                foreach ($conditional_questions[$departure_mode] as $required_question) {
                    if (!isset($answers_by_question[$required_question]) || 
                        empty($answers_by_question[$required_question]['answer'])) {
                        $validation_errors[] = array(
                            'field' => $required_question,
                            'message' => sprintf('Campo obrigatório para modo de partida: %s', $departure_mode),
                            'code' => 'CONDITIONAL_REQUIRED'
                        );
                    }
                }
            }
        }

        // Validação para TRANSFER_ARRIVAL_MODE e suas dependências
        if (isset($answers_by_question['TRANSFER_ARRIVAL_MODE'])) {
            $arrival_mode = $answers_by_question['TRANSFER_ARRIVAL_MODE']['answer'] ?? '';
            
            $conditional_questions = [
                'FLIGHT' => ['TRANSFER_AIR_ARRIVAL_AIRLINE', 'TRANSFER_AIR_ARRIVAL_FLIGHT_NO'],
                'CRUISE' => ['TRANSFER_CRUISE_ARRIVAL_SHIP_NAME'],
                'TRAIN' => ['TRANSFER_RAIL_ARRIVAL_STATION'],
                'OTHER' => ['TRANSFER_ARRIVAL_DROP_OFF']
            ];

            if (isset($conditional_questions[$arrival_mode])) {
                foreach ($conditional_questions[$arrival_mode] as $required_question) {
                    if (!isset($answers_by_question[$required_question]) || 
                        empty($answers_by_question[$required_question]['answer'])) {
                        $validation_errors[] = array(
                            'field' => $required_question,
                            'message' => sprintf('Campo obrigatório para modo de chegada: %s', $arrival_mode),
                            'code' => 'CONDITIONAL_REQUIRED'
                        );
                    }
                }
            }
        }

        // Log dos resultados da validação
        if (!empty($validation_errors)) {
            viator_debug_log('Conditional booking questions validation failed', array(
                'errors' => $validation_errors,
                'answers_provided' => array_keys($answers_by_question)
            ));
        } else {
            viator_debug_log('Conditional booking questions validation passed');
        }

        // Retornar resultado estruturado conforme esperado pelo código
        return array(
            'valid' => empty($validation_errors),
            'errors' => array_map(function($error) {
                return $error['message'];
            }, $validation_errors)
        );
    }

    /**
     * Detectar automaticamente pickup availability conforme documentação Viator
     */
    private function detect_pickup_availability($product_data) {
        $pickup_info = array(
            'available' => false,
            'type' => 'MEET_EVERYONE_AT_START_POINT',
            'custom_pickup_allowed' => false
        );

        // Verificar logistics.travelerPickup.pickupOptionType
        if (isset($product_data['logistics']['travelerPickup']['pickupOptionType'])) {
            $pickup_type = $product_data['logistics']['travelerPickup']['pickupOptionType'];
            
            if ($pickup_type === 'PICKUP_EVERYONE' || $pickup_type === 'PICKUP_AND_MEET_AT_START_POINT') {
                $pickup_info['available'] = true;
                $pickup_info['type'] = $pickup_type;
            }
        }

        // Verificar allowCustomTravelerPickup
        if (isset($product_data['logistics']['travelerPickup']['allowCustomTravelerPickup'])) {
            $pickup_info['custom_pickup_allowed'] = $product_data['logistics']['travelerPickup']['allowCustomTravelerPickup'];
        }

        // Verificar productOptions para "Pickup included"
        if (isset($product_data['productOptions']) && is_array($product_data['productOptions'])) {
            foreach ($product_data['productOptions'] as $option) {
                if (isset($option['description']) && 
                    stripos($option['description'], 'pickup included') !== false) {
                    $pickup_info['available'] = true;
                    break;
                }
            }
        }

        viator_debug_log('Pickup availability detected', $pickup_info);
        
        return $pickup_info;
    }
    
    /**
     * Busca perguntas obrigatórias para um produto específico
     */
    private function get_required_booking_questions($product_code) {
        if (empty($product_code)) {
            return array();
        }
        
        // Buscar todas as perguntas de reserva
        $all_questions_data = $this->get_all_booking_questions();
        if (empty($all_questions_data) || isset($all_questions_data['error'])) {
            viator_debug_log('Erro ao buscar perguntas obrigatórias: ', $all_questions_data);
            return array();
        }
        
        // Usar a estrutura correta dos dados retornados
        $all_questions = $all_questions_data['questions'] ?? array();
        if (empty($all_questions)) {
            viator_debug_log('Nenhuma pergunta encontrada na resposta da API');
            return array();
        }
        
        $required_questions = array();
        
        foreach ($all_questions as $question) {
            // Verificar se a pergunta é obrigatória (MANDATORY)
            if (!isset($question['required']) || $question['required'] !== 'MANDATORY') {
                continue;
            }
            
            // Verificar se a pergunta se aplica a este produto
            if (isset($question['applicableProducts']) && 
                !empty($question['applicableProducts']) && 
                !in_array($product_code, $question['applicableProducts'])) {
                continue;
            }
            
            $required_questions[] = $question;
        }
        
        viator_debug_log("Required questions for product {$product_code}:", array(
            'total_questions_available' => count($all_questions),
            'required_questions_found' => count($required_questions),
            'required_questions' => $required_questions
        ));
        return $required_questions;
    }
}

// Inicializar a classe
new ViatorBookingSystem();

/**
 * Função para obter configurações de idioma/moeda (se não existir)
 */
if (!function_exists('viator_get_locale_settings')) {
    function viator_get_locale_settings() {
        return array(
            'language' => 'pt-BR',
            'currency' => 'BRL',
            'currency_symbol' => 'R$'
        );
    }
}

/**
 * Função de debug para registrar logs (se não existir)
 */
if (!function_exists('viator_debug_log')) {
    function viator_debug_log($message, $data = null) {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            $log_message = '[VIATOR DEBUG] ' . $message;
            if ($data !== null) {
                $log_message .= ' | Data: ' . print_r($data, true);
            }
            error_log($log_message);
        }
    }
}