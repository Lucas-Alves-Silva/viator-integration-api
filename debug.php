<?php

if (!defined('ABSPATH')) {
    exit; // Security check
}

define('CUSTOM_DEBUG_LOG', false); // True para habilitar e false para desabilitar o log customizado

// Log de inicialização para confirmar que o debug está funcionando
viator_debug_log('🚀 Sistema de debug inicializado - ' . date('Y-m-d H:i:s'));

function viator_debug_log($message, $data = null) {
    if (!CUSTOM_DEBUG_LOG) {
        return;
    }

    $timestamp = date('Y-m-d H:i:s');
    
    if ($data !== null) {
        $log_message = "[{$timestamp}] {$message} " . print_r($data, true);
    } else {
        $log_message = "[{$timestamp}] {$message}";
    }

    // Log para arquivo específico do plugin
    $log_file = plugin_dir_path(__FILE__) . 'viator-debug.log';
    file_put_contents($log_file, $log_message . "\n", FILE_APPEND | LOCK_EX);
    
    // Também enviar para error_log padrão do WordPress
    error_log($log_message);
}