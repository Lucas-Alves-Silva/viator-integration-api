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
    
    public function __construct() {
        $this->api_key = get_option('viator_api_key');
        add_action('wp_ajax_viator_check_availability', array($this, 'ajax_check_availability'));
        add_action('wp_ajax_nopriv_viator_check_availability', array($this, 'ajax_check_availability'));
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
            return array('error' => 'Erro de conexão: ' . $response->get_error_message());
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (isset($data['errorCode']) || isset($data['error'])) {
            return array('error' => isset($data['errorMessage']) ? $data['errorMessage'] : 'Erro na verificação de disponibilidade');
        }
        
        return $data;
    }
    
    /**
     * Solicitar hold de reserva
     */
    public function request_booking_hold($availability_data, $travelers_details) {
        if (empty($this->api_key)) {
            return array('error' => viator_t('error_api_key'));
        }
        
        $locale_settings = viator_get_locale_settings();
        
        // Gerar referências únicas para cart e booking
        $partner_cart_ref = 'CART_' . $this->generate_unique_id();
        $partner_booking_ref = 'BOOK_' . $this->generate_unique_id();
        
        // Log dados recebidos para debug
        viator_debug_log('Hold - Travelers Details Received:', $travelers_details);
        
        // Construir dados conforme a documentação da API
        $pax_mix = $this->convert_travelers_to_pax_mix($travelers_details);
        viator_debug_log('Hold - PaxMix Converted:', $pax_mix);
        
        $request_data = array(
            'currency' => $locale_settings['currency'],
            'partnerCartRef' => $partner_cart_ref,
            'items' => array(
                array(
                    'partnerBookingRef' => $partner_booking_ref,
                    'productCode' => $availability_data['productCode'] ?? $availability_data['product']['productCode'],
                    'productOptionCode' => $availability_data['selectedOption']['productOptionCode'],
                    'startTime' => $availability_data['selectedOption']['startTime'] ?? null,
                    'travelDate' => $availability_data['travelDate'],
                    'paxMix' => $pax_mix
                )
            ),
            'paymentDataSubmissionMode' => 'PARTNER_FORM',
            'hostingUrl' => 'https://www.ingressosepasseios.com'
        );
        
        // Log para debug
        viator_debug_log('Hold Request Data:', $request_data);
        
        $response = wp_remote_post($this->base_url . '/partner/bookings/cart/hold', array(
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
            viator_debug_log('Hold WP_Error:', $response->get_error_message());
            return array('error' => 'Erro de conexão: ' . $response->get_error_message());
        }
        
        $response_code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        // Log detalhado da resposta
        viator_debug_log('Hold Response Code:', $response_code);
        viator_debug_log('Hold Response Body:', $body);
        viator_debug_log('Hold Response Data:', $data);
        
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
        
        // Adicionar referências ao retorno
        $data['partnerCartRef'] = $partner_cart_ref;
        $data['partnerBookingRef'] = $partner_booking_ref;
        
        return $data;
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
     */
    private function generate_unique_id() {
        // Usar função nativa do WordPress se disponível
        if (function_exists('wp_generate_uuid4')) {
            return str_replace('-', '', wp_generate_uuid4());
        }
        
        // Fallback para geração manual
        return strtoupper(substr(uniqid() . bin2hex(random_bytes(4)), 0, 8));
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
    public function confirm_booking($cart_id, $payment_token, $booker_info) {
        if (empty($this->api_key)) {
            return array('error' => viator_t('error_api_key'));
        }
        
        $locale_settings = viator_get_locale_settings();
        
        // Dados do corpo da requisição para a API
        $request_data = array(
            'partnerCartRef' => $cart_id,
            'bookerInfo' => $booker_info,
            'paymentDetails' => array(
                'paymentToken' => $payment_token
            )
        );
        
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
        
        if (empty($availability_data) || empty($travelers_details)) {
            wp_send_json_error(array('message' => 'Dados incompletos'));
        }
        
        $result = $this->request_booking_hold($availability_data, $travelers_details);
        
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
        
        $session_token = sanitize_text_field($_POST['session_token']);
        $payment_data = json_decode(stripslashes($_POST['payment_data']), true);
        
        if (empty($session_token) || empty($payment_data)) {
            wp_send_json_error(array('message' => 'Dados de pagamento incompletos'));
        }
        
        $result = $this->submit_payment_to_viator($session_token, $payment_data);
        
        if (isset($result['error'])) {
            wp_send_json_error(array('message' => $result['error']));
        }
        
        wp_send_json_success($result);
    }
    
    /**
     * Submeter dados de pagamento para API da Viator
     */
    public function submit_payment_to_viator($session_token, $payment_data) {
        try {
            // Construir URL usando o sessionToken - conforme documentação
            $payment_url = "https://api.viator.com/v1/checkoutsessions/{$session_token}/paymentaccounts";
            
            $locale_settings = viator_get_locale_settings();
            
            // Headers conforme documentação
            $headers = array(
                'Content-Type' => 'application/json',
                'x-trip-clientid' => $this->api_key,
                'x-trip-requestid' => wp_generate_uuid4(),
                'User-Agent' => 'WordPress-Plugin/1.0'
            );
            
            viator_debug_log('Enviando dados de pagamento para API da Viator', array(
                'url' => $payment_url,
                'session_token' => $session_token,
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

        if (empty($cart_id) || empty($payment_token) || empty($booker_info)) {
            wp_send_json_error(['message' => 'Dados incompletos para confirmação']);
        }

        $result = $this->confirm_booking($cart_id, $payment_token, $booker_info);

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
            'hostingUrl' => 'https://www.ingressosepasseios.com'
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