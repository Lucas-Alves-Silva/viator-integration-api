<?php

if (!defined('ABSPATH')) {
    exit; // Security check
}

define('CUSTOM_DEBUG_LOG', false); // Mude para true para habilitar o log

function viator_debug_log($message, $data = null) {
    if (!CUSTOM_DEBUG_LOG) {
        return;
    }

    if ($data !== null) {
        $log_message = $message . ' ' . print_r($data, true);
    } else {
        $log_message = $message;
    }

    error_log($log_message);
}