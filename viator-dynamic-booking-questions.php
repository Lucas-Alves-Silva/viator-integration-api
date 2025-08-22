<?php
/**
 * Sistema Dinâmico de Booking Questions - Viator Integration
 * 
 * Implementa endpoints para buscar todas as booking questions disponíveis
 * e dados de localização do endpoint /locations/bulk da Viator
 * 
 * Baseado na documentação oficial:
 * - https://partnerresources.viator.com/travel-commerce/merchant/implementing-booking-questions/
 * - https://docs.viator.com/partner-api/technical/#section/Booking-concepts/Booking-questions
 */

// Prevenir acesso direto
if (!defined('ABSPATH')) {
    exit;
}

class ViatorDynamicBookingQuestions {
    
    private $api_key;
    private $base_url;
    private $cache_duration = 86400; // 24 horas (24 * 60 * 60)
    
    public function __construct() {
        $this->api_key = get_option('viator_api_key');
        // Usar sempre a base do ambiente configurado (sandbox nesta fase)
        if (!function_exists('viator_get_api_base_url')) {
            // Fallback seguro: sandbox
            $api_base = 'https://api.sandbox.viator.com';
        } else {
            $api_base = rtrim(viator_get_api_base_url(), '/');
        }
        $this->base_url = $api_base . '/partner';
        viator_debug_log('🔧 [BKQ BASEURL] Base URL dinâmica definida para módulo de Booking Questions:', $this->base_url);

        // Registrar endpoints AJAX
        add_action('wp_ajax_viator_get_all_booking_questions', array($this, 'get_all_booking_questions'));
        add_action('wp_ajax_nopriv_viator_get_all_booking_questions', array($this, 'get_all_booking_questions'));

        add_action('wp_ajax_viator_get_locations_bulk', array($this, 'get_locations_bulk'));
        add_action('wp_ajax_nopriv_viator_get_locations_bulk', array($this, 'get_locations_bulk'));
    }
    
    /**
     * Endpoint: Buscar todas as booking questions disponíveis
     * 
     * Baseado na documentação oficial da Viator
     */
    public function get_all_booking_questions() {
        try {
            // Verificar nonce
            if (!wp_verify_nonce($_POST['nonce'], 'viator_booking_nonce')) {
                wp_die('Nonce verification failed');
            }
            
            // Verificar cache primeiro
            $cache_key = 'viator_all_booking_questions';
            $cached_data = get_transient($cache_key);
            
            if ($cached_data !== false) {
                wp_send_json_success($cached_data);
                return;
            }
            
            // CORREÇÃO: A API da Viator não tem endpoint específico para todas as booking questions
            // Vamos usar uma abordagem diferente - retornar as booking questions padrão

            // Booking questions padrão baseadas na documentação oficial da Viator
            $booking_questions = $this->get_standard_booking_questions();

            viator_debug_log('✅ [BOOKING QUESTIONS] Usando booking questions padrão: ' . count($booking_questions) . ' perguntas');

            // Simular resposta da API para manter compatibilidade
            $data = array(
                'bookingQuestions' => $booking_questions
            );

            // Normalizar dados
            $booking_questions = $this->normalize_booking_questions($data);
            
            // Salvar no cache
            set_transient($cache_key, $booking_questions, $this->cache_duration);
            
            wp_send_json_success($booking_questions);
            
        } catch (Exception $e) {
            error_log('Erro em get_all_booking_questions: ' . $e->getMessage());
            wp_send_json_error(array('message' => $e->getMessage()));
        }
    }
    
    /**
     * Endpoint: Buscar dados de localização em lote
     * 
     * Implementa o endpoint /locations/bulk da Viator
     */
    public function get_locations_bulk() {
        try {
            // Verificar nonce
            if (!wp_verify_nonce($_POST['nonce'], 'viator_booking_nonce')) {
                wp_die('Nonce verification failed');
            }
            
            $location_refs = json_decode(stripslashes($_POST['location_refs']), true);
            
            if (!is_array($location_refs) || empty($location_refs)) {
                wp_send_json_success(array());
                return;
            }
            
            // Verificar cache para cada localização
            $cached_locations = array();
            $uncached_refs = array();
            
            foreach ($location_refs as $ref) {
                $cache_key = 'viator_location_' . md5($ref);
                $cached = get_transient($cache_key);
                
                if ($cached !== false) {
                    $cached_locations[] = $cached;
                } else {
                    $uncached_refs[] = $ref;
                }
            }
            
            // Buscar localizações não cacheadas
            $new_locations = array();
            if (!empty($uncached_refs)) {
                $response = $this->call_viator_api('/locations/bulk', 'POST', array(
                    'locationReferences' => $uncached_refs
                ));
                
                if (!is_wp_error($response)) {
                    $body = wp_remote_retrieve_body($response);
                    $data = json_decode($body, true);
                    
                    if (isset($data['locations']) && is_array($data['locations'])) {
                        foreach ($data['locations'] as $location) {
                            $normalized = $this->normalize_location_data($location);
                            $new_locations[] = $normalized;
                            
                            // Salvar no cache individual
                            $cache_key = 'viator_location_' . md5($normalized['reference']);
                            set_transient($cache_key, $normalized, $this->cache_duration);
                        }
                    }
                }
            }
            
            // Combinar dados cacheados e novos
            $all_locations = array_merge($cached_locations, $new_locations);
            
            wp_send_json_success($all_locations);
            
        } catch (Exception $e) {
            error_log('Erro em get_locations_bulk: ' . $e->getMessage());
            wp_send_json_error(array('message' => $e->getMessage()));
        }
    }
    
    /**
     * Obter booking questions padrão baseadas na documentação oficial da Viator
     */
    private function get_standard_booking_questions() {
        return array(
            array(
                'id' => 'PICKUP_POINT',
                'type' => 'LOCATION_REF_OR_FREE_TEXT',
                'group' => 'PER_BOOKING',
                'required' => 'MANDATORY',
                'label' => 'Ponto de Encontro',
                'hint' => 'Selecione o local de encontro ou digite um endereço',
                'maxLength' => 255,
                'allowedAnswers' => null,
                'units' => null
            ),
            array(
                'id' => 'SPECIAL_REQUIREMENTS',
                'type' => 'STRING',
                'group' => 'PER_BOOKING',
                'required' => 'OPTIONAL',
                'label' => 'Requisitos Especiais',
                'hint' => 'Informe qualquer necessidade especial ou observação',
                'maxLength' => 500,
                'allowedAnswers' => null,
                'units' => null
            ),
            array(
                'id' => 'DATE_OF_BIRTH',
                'type' => 'DATE',
                'group' => 'PER_TRAVELER',
                'required' => 'MANDATORY',
                'label' => 'Data de Nascimento',
                'hint' => 'Formato: DD/MM/AAAA',
                'maxLength' => null,
                'allowedAnswers' => null,
                'units' => null
            ),
            array(
                'id' => 'FULL_NAMES_FIRST',
                'type' => 'STRING',
                'group' => 'PER_TRAVELER',
                'required' => 'MANDATORY',
                'label' => 'Primeiro Nome',
                'hint' => 'Nome conforme documento de identidade',
                'maxLength' => 100,
                'allowedAnswers' => null,
                'units' => null
            ),
            array(
                'id' => 'FULL_NAMES_LAST',
                'type' => 'STRING',
                'group' => 'PER_TRAVELER',
                'required' => 'MANDATORY',
                'label' => 'Sobrenome',
                'hint' => 'Sobrenome conforme documento de identidade',
                'maxLength' => 100,
                'allowedAnswers' => null,
                'units' => null
            ),
            array(
                'id' => 'WEIGHT',
                'type' => 'NUMERIC',
                'group' => 'PER_TRAVELER',
                'required' => 'OPTIONAL',
                'label' => 'Peso',
                'hint' => 'Peso em quilogramas',
                'maxLength' => null,
                'allowedAnswers' => null,
                'units' => 'kg'
            ),
            array(
                'id' => 'HEIGHT',
                'type' => 'NUMERIC',
                'group' => 'PER_TRAVELER',
                'required' => 'OPTIONAL',
                'label' => 'Altura',
                'hint' => 'Altura em centímetros',
                'maxLength' => null,
                'allowedAnswers' => null,
                'units' => 'cm'
            )
        );
    }

    /**
     * Normalizar dados de booking questions conforme documentação oficial
     */
    private function normalize_booking_questions($api_data) {
        $normalized = array();
        
        // A estrutura exata depende da resposta da API
        // Baseado na documentação oficial da Viator
        if (isset($api_data['bookingQuestions']) && is_array($api_data['bookingQuestions'])) {
            foreach ($api_data['bookingQuestions'] as $question) {
                $normalized[] = array(
                    'id' => $question['id'],
                    'type' => $question['type'] ?? 'STRING',
                    'group' => $question['group'] ?? 'PER_BOOKING',
                    'required' => $question['required'] ?? 'OPTIONAL',
                    'label' => $question['label'] ?? $question['id'],
                    'hint' => $question['hint'] ?? null,
                    'maxLength' => $question['maxLength'] ?? null,
                    'allowedAnswers' => $question['allowedAnswers'] ?? null,
                    'units' => $question['units'] ?? null
                );
            }
        }
        
        return $normalized;
    }
    
    /**
     * Normalizar dados de localização
     */
    private function normalize_location_data($location_data) {
        return array(
            'reference' => $location_data['reference'] ?? '',
            'name' => $location_data['name'] ?? '',
            'address' => $location_data['address'] ?? '',
            'coordinates' => array(
                'latitude' => $location_data['coordinates']['latitude'] ?? null,
                'longitude' => $location_data['coordinates']['longitude'] ?? null
            ),
            'type' => $location_data['type'] ?? 'LOCATION',
            'description' => $location_data['description'] ?? ''
        );
    }
    
    /**
     * Fazer chamada para API da Viator
     */
    private function call_viator_api($endpoint, $method = 'GET', $data = null) {
        $url = $this->base_url . $endpoint;

        // Flag para headers versionados (rollback via option)
        $use_versioned = get_option('viator_use_versioned_headers', '1') === '1';
        $accept = $use_versioned ? 'application/json;version=2.0' : 'application/json';
        $content_type = $use_versioned ? 'application/json;version=2.0' : 'application/json';

        // Logar estado dos headers
        if (function_exists('viator_debug_log')) {
            viator_debug_log('🔧 [BKQ HEADERS] Versioned headers ativo?', $use_versioned ? 'true' : 'false');
        }

        $args = array(
            'method' => $method,
            'headers' => array(
                'Accept' => $accept,
                'Content-Type' => $content_type,
                'exp-api-key' => $this->api_key
            ),
            'timeout' => 30
        );

        if ($data && in_array($method, array('POST', 'PUT', 'PATCH'))) {
            $args['body'] = json_encode($data);
        }

        return wp_remote_request($url, $args);
    }
}

// Inicializar a classe
new ViatorDynamicBookingQuestions();

/**
 * Função auxiliar para debug
 */
function viator_debug_booking_questions() {
    if (defined('WP_DEBUG') && WP_DEBUG) {
        $all_questions = get_transient('viator_all_booking_questions');
        error_log('Viator Booking Questions Cache: ' . print_r($all_questions, true));
    }
}

/**
 * Limpar cache de booking questions (útil para desenvolvimento)
 */
function viator_clear_booking_questions_cache() {
    delete_transient('viator_all_booking_questions');
    
    // Limpar cache de localizações também
    global $wpdb;
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_viator_location_%'");
    
    return true;
}

// Hook para limpar cache quando necessário
add_action('viator_clear_cache', 'viator_clear_booking_questions_cache');
?>
