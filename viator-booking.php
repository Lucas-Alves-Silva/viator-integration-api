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
            'travelers' => $travelers,
            'currencyCode' => $locale_settings['currency']
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
            'currencyCode' => $locale_settings['currency'],
            // Para solução de pagamento via API
            'paymentDataSubmissionMode' => 'API_FORM',
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
    public function confirm_booking($hold_data, $payment_token) {
        if (empty($this->api_key)) {
            return array('error' => viator_t('error_api_key'));
        }
        
        $locale_settings = viator_get_locale_settings();
        
        $request_data = array(
            'cartItems' => array(array(
                'cartItemId' => $hold_data['cartId'],
                'paymentToken' => $payment_token
            ))
        );
        
        $response = wp_remote_post($this->base_url . '/partner/bookings/cart/book', array(
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
            return array('error' => isset($data['errorMessage']) ? $data['errorMessage'] : 'Erro na confirmação da reserva');
        }
        
        return $data;
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
        // Verificar nonce
        if (!wp_verify_nonce($_POST['nonce'], 'viator_booking_nonce')) {
            wp_send_json_error(array('message' => 'Nonce inválido'));
        }
        
        $hold_data = json_decode(stripslashes($_POST['hold_data']), true);
        $payment_token = sanitize_text_field($_POST['payment_token']);
        
        if (empty($hold_data) || empty($payment_token)) {
            wp_send_json_error(array('message' => 'Dados incompletos para confirmação'));
        }
        
        $result = $this->confirm_booking($hold_data, $payment_token);
        
        if (isset($result['error'])) {
            wp_send_json_error(array('message' => $result['error']));
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