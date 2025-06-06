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
        add_action('wp_ajax_viator_confirm_booking', array($this, 'ajax_confirm_booking'));
        add_action('wp_ajax_nopriv_viator_confirm_booking', array($this, 'ajax_confirm_booking'));
        add_action('wp_ajax_viator_get_monthly_availability', array($this, 'ajax_get_monthly_availability'));
        add_action('wp_ajax_nopriv_viator_get_monthly_availability', array($this, 'ajax_get_monthly_availability'));
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
        
        $request_data = array(
            'productCode' => $availability_data['productCode'],
            'travelDate' => $availability_data['travelDate'],
            'selectedOptions' => $availability_data['selectedOptions'],
            'travelers' => $travelers_details,
            'currency' => $locale_settings['currency'],
            // Para solução de pagamento via API
            'paymentDataSubmissionMode' => 'PARTNER_FORM',
            'hostingUrl' => home_url()
        );
        
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
            return array('error' => 'Erro de conexão: ' . $response->get_error_message());
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (isset($data['errorCode']) || isset($data['error'])) {
            return array('error' => isset($data['errorMessage']) ? $data['errorMessage'] : 'Erro ao criar hold de reserva');
        }
        
        return $data;
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