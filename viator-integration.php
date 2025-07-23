<?php
/**
 * Plugin Name: Viator API Integration
 * Description: Integração com a API da Viator para exibição de produtos e passeios. Utilize o shortcode [viator_search]
 * Version: 1.5
 * Author: Lucas Alves
 * Text Domain: viator-integration
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Include debug functions
require_once plugin_dir_path(__FILE__) . 'debug.php';

// Include product detail page functionality
require_once plugin_dir_path(__FILE__) . 'unique-product.php';

// Add rewrite rules for product URLs
function viator_rewrite_rules() {
    add_rewrite_rule(
        'passeio/([^/]+)/?$',
        'index.php?pagename=passeio&product_code=$matches[1]',
        'top'
    );
    
    // Adicionar regra para páginas de atrações
    add_rewrite_rule(
        'atracoes/([^/]+)/?$',
        'index.php?pagename=atracoes&attraction_id=$matches[1]',
        'top'
    );
}
add_action('init', 'viator_rewrite_rules');

// Add product_code as a query var
function viator_query_vars($query_vars) {
    $query_vars[] = 'product_code';
    $query_vars[] = 'attraction_id'; // Adicionar attraction_id como query var
    return $query_vars;
}
add_filter('query_vars', 'viator_query_vars');

// Add admin menu and settings page
function viator_admin_menu() {
    add_menu_page(
        'IEP Turismo',
        'IEP Turismo',
        'manage_options',
        'viator-settings',
        'viator_settings_page',
        'dashicons-admin-site',
        100
    );
    
    // Adicionar submenu para geração de shortcodes
    add_submenu_page(
        'viator-settings',
        'Gerador de Shortcodes',
        'Shortcodes',
        'manage_options',
        'viator-shortcodes',
        'viator_shortcodes_page'
    );
}
add_action('admin_menu', 'viator_admin_menu');

// Register settings
function viator_register_settings() {
    register_setting('viator_settings', 'viator_api_key');
    register_setting('viator_settings', 'viator_groq_api_key');
    register_setting('viator_settings', 'viator_groq_model');
    register_setting('viator_settings', 'viator_language');
    register_setting('viator_settings', 'viator_currency');
    register_setting('viator_settings', 'viator_enable_geolocation');
}
add_action('admin_init', 'viator_register_settings');

// Settings page content
function viator_settings_page() {
    ?>
    <div class="wrap">
        <h1>IEP Turismo - Configurações</h1>
        <form method="post" action="options.php">
            <?php
            settings_fields('viator_settings');
            do_settings_sections('viator_settings');
            ?>
            <table class="form-table">
                <tr>
                    <th scope="row">API Key</th>
                    <td>
                        <input type="text" 
                               name="viator_api_key" 
                               value="<?php echo esc_attr(get_option('viator_api_key')); ?>" 
                               class="regular-text"
                               required>
                        <p class="description">Insira sua chave API aqui.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Groq API Key</th>
                    <td>
                        <input type="text" 
                               name="viator_groq_api_key" 
                               value="<?php echo esc_attr(get_option('viator_groq_api_key')); ?>" 
                               class="regular-text">
                        <p class="description">Insira sua chave API do Groq para gerar curiosidades inteligentes sobre os destinos pesquisados.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Modelo Groq IA</th>
                    <td>
                        <select name="viator_groq_model" id="viator_groq_model">
                            <option value="llama-3.1-8b-instant" <?php selected(get_option('viator_groq_model', 'llama-3.1-8b-instant'), 'llama-3.1-8b-instant'); ?>>Llama 3.1 8B Instant - Muito Rápido (Recomendado)</option>
                            <option value="llama3-8b-8192" <?php selected(get_option('viator_groq_model', 'llama-3.1-8b-instant'), 'llama3-8b-8192'); ?>>Llama 3 8B - Rápido</option>
                            <option value="llama-3.3-70b-versatile" <?php selected(get_option('viator_groq_model', 'llama-3.1-8b-instant'), 'llama-3.3-70b-versatile'); ?>>Llama 3.3 70B Versatile - Melhor Qualidade</option>
                            <option value="llama3-70b-8192" <?php selected(get_option('viator_groq_model', 'llama-3.1-8b-instant'), 'llama3-70b-8192'); ?>>Llama 3 70B - Alta Qualidade</option>
                            <option value="gemma2-9b-it" <?php selected(get_option('viator_groq_model', 'llama-3.1-8b-instant'), 'gemma2-9b-it'); ?>>Gemma 2 9B - Google AI</option>
                            <option value="deepseek-r1-distill-llama-70b" <?php selected(get_option('viator_groq_model', 'llama-3.1-8b-instant'), 'deepseek-r1-distill-llama-70b'); ?>>DeepSeek R1 70B - Raciocínio Avançado</option>
                            <option value="mistral-saba-24b" <?php selected(get_option('viator_groq_model', 'llama-3.1-8b-instant'), 'mistral-saba-24b'); ?>>Mistral Saba 24B - Equilibrado</option>
                        </select>
                        <p class="description">
                            <strong>Modelos oficiais da Groq para gerar descrições das atrações:</strong><br>
                            • <strong>Llama 3.1 8B Instant</strong>: Mais rápido, 6k tokens/min, ideal para alto volume<br>
                            • <strong>Llama 3 8B</strong>: Rápido e confiável, 6k tokens/min<br>
                            • <strong>Llama 3.3 70B Versatile</strong>: Melhor qualidade, 12k tokens/min<br>
                            • <strong>Llama 3 70B</strong>: Alta qualidade, 6k tokens/min<br>
                            • <strong>Gemma 2 9B</strong>: Google AI, 15k tokens/min, boa criatividade<br>
                            • <strong>DeepSeek R1 70B</strong>: Especializado em raciocínio complexo<br>
                            • <strong>Mistral Saba 24B</strong>: Equilibrio entre velocidade e qualidade
                        </p>
                        
                        <details style="margin-top: 15px;">
                            <summary style="cursor: pointer; font-weight: bold; color: #0056B3;">📊 Ver Limites de Rate da API Groq</summary>
                            <div style="margin-top: 10px; background: #f9f9f9; padding: 15px; border-radius: 5px;">
                                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                                    <thead>
                                        <tr style="background: #e0e0e0;">
                                            <th style="padding: 8px; border: 1px solid #ccc; text-align: left;">Modelo</th>
                                            <th style="padding: 8px; border: 1px solid #ccc; text-align: center;">Req/Min</th>
                                            <th style="padding: 8px; border: 1px solid #ccc; text-align: center;">Req/Dia</th>
                                            <th style="padding: 8px; border: 1px solid #ccc; text-align: center;">Tokens/Min</th>
                                            <th style="padding: 8px; border: 1px solid #ccc; text-align: center;">Tokens/Dia</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td style="padding: 6px; border: 1px solid #ccc;"><strong>llama-3.1-8b-instant</strong></td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">30</td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">14.400</td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">6.000</td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">500.000</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 6px; border: 1px solid #ccc;"><strong>llama3-8b-8192</strong></td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">30</td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">14.400</td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">6.000</td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">500.000</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 6px; border: 1px solid #ccc;"><strong>llama-3.3-70b-versatile</strong></td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">30</td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">1.000</td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">12.000</td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">100.000</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 6px; border: 1px solid #ccc;"><strong>llama3-70b-8192</strong></td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">30</td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">14.400</td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">6.000</td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">500.000</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 6px; border: 1px solid #ccc;"><strong>gemma2-9b-it</strong></td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">30</td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">14.400</td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">15.000</td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">500.000</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 6px; border: 1px solid #ccc;"><strong>deepseek-r1-distill-llama-70b</strong></td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">30</td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">1.000</td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">6.000</td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">Sem limite</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 6px; border: 1px solid #ccc;"><strong>mistral-saba-24b</strong></td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">30</td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">1.000</td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">6.000</td>
                                            <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">500.000</td>
                                        </tr>
                                    </tbody>
                                </table>
                                <p style="margin-top: 10px; font-size: 11px; color: #666;">
                                    <strong>Fonte:</strong> Documentação oficial da Groq API - Consultado em 18/06/2025<br>
                                    <strong>Dica:</strong> Para sites com muito tráfego, prefira modelos com maior limite de requisições por dia.
                                </p>
                            </div>
                        </details>
                    </td>
                </tr>

                <tr>
                    <th scope="row">Idioma</th>
                    <td>
                        <select name="viator_language" id="viator_language">
                            <option value="pt-BR" <?php selected(get_option('viator_language', 'pt-BR'), 'pt-BR'); ?>>Português do Brasil</option>
                            <option value="en-US" <?php selected(get_option('viator_language', 'pt-BR'), 'en-US'); ?>>English (US)</option>
                        </select>
                        <p class="description">Selecione o idioma para exibição dos produtos e traduções automáticas.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Moeda</th>
                    <td>
                        <select name="viator_currency" id="viator_currency">
                            <option value="BRL" <?php selected(get_option('viator_currency', 'BRL'), 'BRL'); ?>>Real Brasileiro (BRL)</option>
                            <option value="USD" <?php selected(get_option('viator_currency', 'BRL'), 'USD'); ?>>Dólar Americano (USD)</option>
                        </select>
                        <p class="description">Selecione a moeda para exibição dos preços dos produtos.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Funcionalidade de Geolocalização</th>
                    <td>
                        <fieldset>
                            <label for="viator_enable_geolocation">
                                <input type="checkbox" 
                                       name="viator_enable_geolocation" 
                                       id="viator_enable_geolocation" 
                                       value="1" 
                                       <?php checked(get_option('viator_enable_geolocation', '1'), '1'); ?>>
                                Ativar detecção automática de localização na busca
                            </label>
                            <p class="description">
                                <strong>Quando ativada:</strong> O sistema tentará detectar automaticamente a localização do usuário (via GPS ou IP) e exibirá uma sugestão "Nos arredores" no campo de busca.<br>
                                <strong>Quando desativada:</strong> O campo de busca funcionará normalmente, mas sem sugestões de localização automática.<br>
                                <em>Nota: Esta funcionalidade utiliza a API do ipgeolocation.io como fallback quando a geolocalização do navegador não está disponível.</em>
                            </p>
                        </fieldset>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
    </div>
    

    <?php
}

// Página de geração de shortcodes
function viator_shortcodes_page() {
    $active_tab = isset($_GET['tab']) ? $_GET['tab'] : 'attractions';
    ?>
    <div class="wrap">
        <h1>🎯 Gerador de Shortcodes</h1>
        <p>Crie carrosséis personalizados de atrações e passeios para inserir em qualquer lugar do seu site!</p>
        
        <!-- Navegação por abas -->
        <h2 class="nav-tab-wrapper" style="margin-bottom: 20px;">
            <a href="?page=viator-shortcodes&tab=attractions" class="nav-tab <?php echo $active_tab === 'attractions' ? 'nav-tab-active' : ''; ?>">
                🏛️ Gerador de Atrações
            </a>
            <a href="?page=viator-shortcodes&tab=tours" class="nav-tab <?php echo $active_tab === 'tours' ? 'nav-tab-active' : ''; ?>">
                🎫 Gerador de Passeios
            </a>
        </h2>
        
        <?php if ($active_tab === 'attractions'): ?>
        <!-- ABA DE ATRAÇÕES -->
        <div class="tab-content">
            <h2 style="margin-top: 0;">Gerador de Shortcodes de Atrações</h2>
            <p style="margin-bottom: 20px;">Crie carrosséis personalizados de atrações para inserir em qualquer lugar do seu site!</p>
            
            <div style="background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin: 20px 0;">
                
                <h2>⚙️ Configurações do Carrossel</h2>
            
            <table class="form-table">
                <tr>
                    <th scope="row">
                        <label for="location_search">🌍 Local / Destino</label>
                    </th>
                    <td>
                        <input type="text" 
                               id="location_search" 
                               class="regular-text" 
                               placeholder="Ex: Paris, Rio de Janeiro, Torre Eiffel ou ID específico"
                               style="width: 400px;">
                        <p class="description">
                            Digite o nome de uma cidade, país, atração específica ou ID. 
                            <strong>Exemplos:</strong> "Paris", "Rio de Janeiro", "Torre Eiffel", "2177"
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="cards_per_view">📱 Cards por Visualização</label>
                    </th>
                    <td>
                        <div style="display: flex; gap: 20px; align-items: center;">
                            <div>
                                <label>Desktop:</label>
                                <input type="number" id="cards_desktop" value="4" min="1" max="8" style="width: 60px;">
                            </div>
                            <div>
                                <label>Tablet:</label>
                                <input type="number" id="cards_tablet" value="3" min="1" max="6" style="width: 60px;">
                            </div>
                            <div>
                                <label>Mobile:</label>
                                <input type="number" id="cards_mobile" value="1" min="1" max="3" style="width: 60px;">
                            </div>
                        </div>
                        <p class="description">Quantos cards serão exibidos simultaneamente em cada dispositivo.</p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="card_size">📏 Tamanho dos Cards</label>
                    </th>
                    <td>
                        <select id="card_size" style="width: 200px;">
                            <option value="small">Pequeno (200px altura)</option>
                            <option value="medium" selected>Médio (250px altura)</option>
                            <option value="large">Grande (300px altura)</option>
                            <option value="extra-large">Extra Grande (350px altura)</option>
                        </select>
                        <p class="description">As imagens se ajustam automaticamente ao tamanho selecionado.</p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="show_navigation">🔄 Botões de Navegação</label>
                    </th>
                    <td>
                        <label>
                            <input type="checkbox" id="show_navigation" checked>
                            Exibir botões de anterior/próximo
                        </label>
                        <p class="description">Marque para mostrar as setas de navegação do carrossel.</p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="carousel_title">📝 Título do Carrossel</label>
                    </th>
                    <td>
                        <input type="text" 
                               id="carousel_title" 
                               class="regular-text" 
                               placeholder="Ex: Atrações em Paris, Melhores Passeios"
                               style="width: 400px;">
                        <p class="description">Título opcional que aparecerá acima do carrossel. Deixe vazio para não exibir.</p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="max_attractions">🔢 Máximo de Atrações</label>
                    </th>
                    <td>
                        <input type="number" 
                               id="max_attractions" 
                               value="12" 
                               min="4" 
                               max="50" 
                               style="width: 80px;">
                        <p class="description">Número máximo de atrações a serem exibidas no carrossel.</p>
                    </td>
                </tr>
            </table>
            
            <div style="margin: 30px 0;">
                <button type="button" 
                        id="generate_shortcode" 
                        class="button button-primary button-large"
                        style="background: #0056B3; border-color: #0056B3; padding: 10px 30px; font-size: 16px;">
                    🚀 Gerar Shortcode
                </button>
            </div>
            
            <div id="shortcode_result" style="display: none; margin-top: 30px;">
                <h3>✅ Seu Shortcode foi Gerado!</h3>
                <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 20px;">
                    <p><strong>Copie o código abaixo e cole onde quiser exibir o carrossel:</strong></p>
                    <textarea id="generated_shortcode" 
                              readonly 
                              style="width: 100%; height: 120px; font-family: monospace; font-size: 14px; padding: 15px; border: 1px solid #ccd1d1; border-radius: 4px;"
                              onclick="this.select(); document.execCommand('copy'); alert('Shortcode copiado para a área de transferência!');">
                    </textarea>
                    
                    <div style="margin-top: 15px; padding: 15px; background: #e8f4fd; border-left: 4px solid #0073aa; border-radius: 4px;">
                        <h4 style="margin: 0 0 10px 0;">💡 Como usar:</h4>
                        <ol style="margin: 0; padding-left: 20px;">
                            <li>Copie o shortcode acima</li>
                            <li>Vá para qualquer página ou post do WordPress</li>
                            <li>Cole o shortcode no editor (pode ser no editor clássico ou Gutenberg)</li>
                            <li>Publique ou atualize a página</li>
                            <li>O carrossel de atrações aparecerá automaticamente!</li>
                        </ol>
                    </div>
                </div>
            </div>
            
            <div id="preview_section" style="display: none; margin-top: 30px;">
                <h3>👀 Prévia do Carrossel</h3>
                <div style="border: 1px solid #ddd; border-radius: 8px; padding: 20px; background: #fafafa;">
                    <div id="carousel_preview">
                        <!-- Prévia será inserida aqui via JavaScript -->
                    </div>
                </div>
            </div>
        </div>
        
        <div style="background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin: 20px 0;">
            <h2>📋 Exemplos de Shortcodes</h2>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px;">
                <div style="padding: 15px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #28a745;">
                    <h4 style="margin: 0 0 10px 0; color: #28a745;">🏛️ Atrações de Paris</h4>
                    <code style="background: #fff; padding: 8px; border-radius: 4px; display: block; font-size: 12px;">
                        [viator_attractions location="Paris" cards_desktop="4" cards_tablet="3" cards_mobile="1" size="medium" navigation="true" title="Descubra Paris" max="10"]
                    </code>
                </div>
                
                <div style="padding: 15px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #007cba;">
                    <h4 style="margin: 0 0 10px 0; color: #007cba;">🏖️ Atrações do Rio</h4>
                    <code style="background: #fff; padding: 8px; border-radius: 4px; display: block; font-size: 12px;">
                        [viator_attractions location="Rio de Janeiro" cards_desktop="3" cards_tablet="2" cards_mobile="1" size="large" navigation="true" title="Explore o Rio" max="8"]
                    </code>
                </div>
                
                <div style="padding: 15px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #dc3545;">
                    <h4 style="margin: 0 0 10px 0; color: #dc3545;">🗽 Por ID Específico</h4>
                    <code style="background: #fff; padding: 8px; border-radius: 4px; display: block; font-size: 12px;">
                        [viator_attractions location="2177" cards_desktop="5" cards_tablet="3" cards_mobile="2" size="small" navigation="false" max="6"]
                    </code>
                </div>
                
                <div style="padding: 15px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #ffc107;">
                    <h4 style="margin: 0 0 10px 0; color: #e68900;">🌍 Carrossel Compacto</h4>
                    <code style="background: #fff; padding: 8px; border-radius: 4px; display: block; font-size: 12px;">
                        [viator_attractions location="Londres" cards_desktop="6" cards_tablet="4" cards_mobile="2" size="small" navigation="true" title="" max="15"]
                    </code>
                </div>
            </div>
        </div>
        
        <script>
        document.addEventListener('DOMContentLoaded', function() {
            const generateBtn = document.getElementById('generate_shortcode');
            
            generateBtn.addEventListener('click', function() {
                const location = document.getElementById('location_search').value.trim();
                
                if (!location) {
                    alert('Por favor, insira um local, cidade ou ID de atração!');
                    return;
                }
                
                const cardsDesktop = document.getElementById('cards_desktop').value;
                const cardsTablet = document.getElementById('cards_tablet').value;
                const cardsMobile = document.getElementById('cards_mobile').value;
                const cardSize = document.getElementById('card_size').value;
                const showNavigation = document.getElementById('show_navigation').checked;
                const title = document.getElementById('carousel_title').value.trim();
                const maxAttractions = document.getElementById('max_attractions').value;
                
                // Gerar shortcode
                let shortcode = `[viator_attractions location="${location}"`;
                shortcode += ` cards_desktop="${cardsDesktop}"`;
                shortcode += ` cards_tablet="${cardsTablet}"`;
                shortcode += ` cards_mobile="${cardsMobile}"`;
                shortcode += ` size="${cardSize}"`;
                shortcode += ` navigation="${showNavigation ? 'true' : 'false'}"`;
                if (title) {
                    shortcode += ` title="${title}"`;
                }
                shortcode += ` max="${maxAttractions}"]`;
                
                // Exibir resultado
                document.getElementById('generated_shortcode').value = shortcode;
                document.getElementById('shortcode_result').style.display = 'block';
                
                // Scroll suave para o resultado
                document.getElementById('shortcode_result').scrollIntoView({ 
                    behavior: 'smooth' 
                });
            });
        });
        </script>
        </div>
        
        <?php elseif ($active_tab === 'tours'): ?>
        <!-- ABA DE PASSEIOS -->
        <div class="tab-content">
            <h2 style="margin-top: 0;">Gerador de Shortcodes de Passeios</h2>
            <p style="margin-bottom: 20px;">Crie carrosséis personalizados de produtos/passeios para inserir em qualquer lugar do seu site!</p>
            
            <div style="background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin: 20px 0;">
                
                <h2>⚙️ Configurações do Carrossel de Passeios</h2>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="tour_search_type">🎯 Tipo de Busca</label>
                        </th>
                        <td>
                            <select id="tour_search_type" onchange="toggleTourSearchFields()">
                                <option value="search">Busca por texto (ex: "Helicóptero Las Vegas")</option>
                                <option value="codes">Códigos específicos (ex: 5516ST5, 5847NIGHT)</option>
                            </select>
                            <p class="description">Escolha como buscar os passeios para o carrossel.</p>
                        </td>
                    </tr>
                    
                    <tr id="search_field_row">
                        <th scope="row">
                            <label for="tour_search_query">🔍 Termo de Busca</label>
                        </th>
                        <td>
                            <input type="text" 
                                   id="tour_search_query" 
                                   class="regular-text" 
                                   placeholder="Ex: Helicóptero Las Vegas, City Tour Paris, Mergulho Maldivas"
                                   style="width: 400px;">
                            <p class="description">
                                Digite os termos para buscar passeios relacionados. 
                                <strong>Exemplos:</strong> "Helicóptero Las Vegas", "Tour gastronômico Roma", "Passeio de barco"
                            </p>
                        </td>
                    </tr>
                    
                    <tr id="codes_field_row" style="display: none;">
                        <th scope="row">
                            <label for="tour_product_codes">📝 Códigos dos Produtos</label>
                        </th>
                        <td>
                            <textarea id="tour_product_codes" 
                                      rows="4" 
                                      class="regular-text" 
                                      placeholder="Ex: 5516ST5, 5847NIGHT, 5847LASWIN"
                                      style="width: 400px; height: 100px;"></textarea>
                            <p class="description">
                                Digite os códigos dos produtos separados por vírgula. 
                                <strong>Exemplo:</strong> 5516ST5, 5847NIGHT, 5847LASWIN
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="tour_cards_desktop">🖥️ Cards no Desktop</label>
                        </th>
                        <td>
                            <select id="tour_cards_desktop">
                                <option value="2">2 cards</option>
                                <option value="3">3 cards</option>
                                <option value="4" selected>4 cards</option>
                                <option value="5">5 cards</option>
                                <option value="6">6 cards</option>
                            </select>
                            <p class="description">Quantos cards exibir em telas de desktop (1200px+).</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="tour_cards_tablet">📱 Cards no Tablet</label>
                        </th>
                        <td>
                            <select id="tour_cards_tablet">
                                <option value="1">1 card</option>
                                <option value="2">2 cards</option>
                                <option value="3" selected>3 cards</option>
                                <option value="4">4 cards</option>
                            </select>
                            <p class="description">Quantos cards exibir em tablets (768px - 1199px).</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="tour_cards_mobile">📱 Cards no Mobile</label>
                        </th>
                        <td>
                            <select id="tour_cards_mobile">
                                <option value="1" selected>1 card</option>
                                <option value="2">2 cards</option>
                            </select>
                            <p class="description">Quantos cards exibir em dispositivos móveis (menos de 768px).</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="tour_card_size">📏 Tamanho dos Cards</label>
                        </th>
                        <td>
                            <select id="tour_card_size">
                                <option value="small">Pequeno (200px altura)</option>
                                <option value="medium" selected>Médio (250px altura)</option>
                                <option value="large">Grande (300px altura)</option>
                                <option value="extra-large">Extra Grande (350px altura)</option>
                            </select>
                            <p class="description">Tamanho dos cards do carrossel.</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="tour_show_navigation">🧭 Navegação</label>
                        </th>
                        <td>
                            <input type="checkbox" id="tour_show_navigation" checked>
                            <label for="tour_show_navigation">Exibir botões de navegação (setas)</label>
                            <p class="description">Mostrar setas para navegar pelo carrossel.</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="tour_carousel_title">🏷️ Título do Carrossel</label>
                        </th>
                        <td>
                            <input type="text" 
                                   id="tour_carousel_title" 
                                   class="regular-text" 
                                   placeholder="Ex: Melhores Passeios, Tours Imperdíveis"
                                   style="width: 400px;">
                            <p class="description">Título opcional que aparecerá acima do carrossel. Deixe vazio para não exibir.</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="tour_max_products">🔢 Máximo de Produtos</label>
                        </th>
                        <td>
                            <input type="number" 
                                   id="tour_max_products" 
                                   value="12" 
                                   min="4" 
                                   max="50" 
                                   style="width: 80px;">
                            <p class="description">Número máximo de produtos a serem exibidos no carrossel (apenas para busca por texto).</p>
                        </td>
                    </tr>
                </table>
                
                <div style="margin: 30px 0;">
                    <button type="button" 
                            id="generate_tour_shortcode" 
                            class="button button-primary button-large"
                            style="background: #dc3545; border-color: #dc3545; padding: 10px 30px; font-size: 16px;">
                        🚀 Gerar Shortcode
                    </button>
                </div>
                
                <div id="tour_shortcode_result" style="display: none; margin-top: 30px;">
                    <h3>✅ Seu Shortcode de Passeios foi Gerado!</h3>
                    <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 20px;">
                        <p><strong>Copie o código abaixo e cole onde quiser exibir o carrossel:</strong></p>
                        <textarea id="generated_tour_shortcode" 
                                  readonly 
                                  style="width: 100%; height: 120px; font-family: monospace; font-size: 14px; padding: 15px; border: 1px solid #ccd1d1; border-radius: 4px;"
                                  onclick="this.select(); document.execCommand('copy'); alert('Shortcode copiado para a área de transferência!');">
                        </textarea>
                        
                        <div style="margin-top: 15px; padding: 15px; background: #e8f4fd; border-left: 4px solid #0073aa; border-radius: 4px;">
                            <h4 style="margin: 0 0 10px 0;">💡 Como usar:</h4>
                            <ol style="margin: 0; padding-left: 20px;">
                                <li>Copie o shortcode acima</li>
                                <li>Vá para qualquer página ou post do WordPress</li>
                                <li>Cole o shortcode no editor (pode ser no editor clássico ou Gutenberg)</li>
                                <li>Publique ou atualize a página</li>
                                <li>O carrossel de passeios aparecerá automaticamente!</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin: 20px 0;">
                <h2>📋 Exemplos de Shortcodes de Passeios</h2>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px;">
                    <div style="padding: 15px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #dc3545;">
                        <h4 style="margin: 0 0 10px 0; color: #dc3545;">🚁 Busca por Helicóptero</h4>
                        <code style="background: #fff; padding: 8px; border-radius: 4px; display: block; font-size: 12px;">
                            [viator_tours search="Helicóptero Las Vegas" cards_desktop="4" cards_tablet="2" cards_mobile="1" size="medium" title="Tours de Helicóptero" max="8"]
                        </code>
                    </div>
                    
                    <div style="padding: 15px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #28a745;">
                        <h4 style="margin: 0 0 10px 0; color: #28a745;">🏛️ City Tours Paris</h4>
                        <code style="background: #fff; padding: 8px; border-radius: 4px; display: block; font-size: 12px;">
                            [viator_tours search="City Tour Paris" cards_desktop="3" cards_tablet="2" cards_mobile="1" size="large" title="Explore Paris" max="12"]
                        </code>
                    </div>
                    
                    <div style="padding: 15px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #007cba;">
                        <h4 style="margin: 0 0 10px 0; color: #007cba;">📝 Produtos Específicos</h4>
                        <code style="background: #fff; padding: 8px; border-radius: 4px; display: block; font-size: 12px;">
                            [viator_tours codes="5516ST5,5847NIGHT,5847LASWIN" cards_desktop="3" size="medium" title="Tours Selecionados"]
                        </code>
                    </div>
                    
                    <div style="padding: 15px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #ffc107;">
                        <h4 style="margin: 0 0 10px 0; color: #e68900;">🌊 Tours Aquáticos</h4>
                        <code style="background: #fff; padding: 8px; border-radius: 4px; display: block; font-size: 12px;">
                            [viator_tours search="Mergulho" cards_desktop="4" navigation="true" size="large" title="Aventuras Aquáticas" max="10"]
                        </code>
                    </div>
                </div>
            </div>
            
            <script>
            function toggleTourSearchFields() {
                const searchType = document.getElementById('tour_search_type').value;
                const searchRow = document.getElementById('search_field_row');
                const codesRow = document.getElementById('codes_field_row');
                const maxProductsRow = document.getElementById('tour_max_products').closest('tr');
                
                if (searchType === 'search') {
                    searchRow.style.display = 'table-row';
                    codesRow.style.display = 'none';
                    maxProductsRow.style.display = 'table-row';
                } else {
                    searchRow.style.display = 'none';
                    codesRow.style.display = 'table-row';
                    maxProductsRow.style.display = 'none';
                }
            }
            
            document.addEventListener('DOMContentLoaded', function() {
                const generateTourBtn = document.getElementById('generate_tour_shortcode');
                
                generateTourBtn.addEventListener('click', function() {
                    const searchType = document.getElementById('tour_search_type').value;
                    
                    let shortcode = '[viator_tours';
                    
                    if (searchType === 'search') {
                        const searchQuery = document.getElementById('tour_search_query').value.trim();
                        if (!searchQuery) {
                            alert('Por favor, insira um termo de busca!');
                            return;
                        }
                        shortcode += ` search="${searchQuery}"`;
                        
                        const maxProducts = document.getElementById('tour_max_products').value;
                        shortcode += ` max="${maxProducts}"`;
                    } else {
                        const productCodes = document.getElementById('tour_product_codes').value.trim();
                        if (!productCodes) {
                            alert('Por favor, insira os códigos dos produtos!');
                            return;
                        }
                        shortcode += ` codes="${productCodes}"`;
                    }
                    
                    const cardsDesktop = document.getElementById('tour_cards_desktop').value;
                    const cardsTablet = document.getElementById('tour_cards_tablet').value;
                    const cardsMobile = document.getElementById('tour_cards_mobile').value;
                    const cardSize = document.getElementById('tour_card_size').value;
                    const showNavigation = document.getElementById('tour_show_navigation').checked;
                    const title = document.getElementById('tour_carousel_title').value.trim();
                    
                    shortcode += ` cards_desktop="${cardsDesktop}"`;
                    shortcode += ` cards_tablet="${cardsTablet}"`;
                    shortcode += ` cards_mobile="${cardsMobile}"`;
                    shortcode += ` size="${cardSize}"`;
                    shortcode += ` navigation="${showNavigation ? 'true' : 'false'}"`;
                    
                    if (title) {
                        shortcode += ` title="${title}"`;
                    }
                    
                    shortcode += ']';
                    
                    // Exibir resultado
                    document.getElementById('generated_tour_shortcode').value = shortcode;
                    document.getElementById('tour_shortcode_result').style.display = 'block';
                    
                    // Scroll suave para o resultado
                    document.getElementById('tour_shortcode_result').scrollIntoView({ 
                        behavior: 'smooth' 
                    });
                });
            });
            </script>
        </div>
        
        <?php endif; ?>
    </div>
    <?php
}

// Enqueue scripts and styles
function viator_enqueue_scripts() {
    $plugin_dir = plugin_dir_url(__FILE__);
    
    // Enqueue styles
    wp_enqueue_style(
        'viator-search-style', 
        $plugin_dir . 'styles.css', 
        array(), 
        '1.0'
    );

    // Enqueue Swiper CSS
    wp_enqueue_style('swiper-css', 'https://cdn.jsdelivr.net/npm/swiper@8/swiper-bundle.min.css');

    // Verificar se a geolocalização está ativada
    $geolocation_enabled = get_option('viator_enable_geolocation', '1');
    $dependencies = array('jquery', 'swiper-js');
    
    // Carregar script de geolocalização apenas se estiver ativado
    if ($geolocation_enabled === '1') {
        wp_enqueue_script('ipgeolocation-api', 'https://api.ipgeolocation.io/javascript/ipgeolocation.js', array(), '1.0.0', true);
        $dependencies[] = 'ipgeolocation-api';
    }
    
    // Enqueue Swiper JS
    wp_enqueue_script('swiper-js', 'https://cdn.jsdelivr.net/npm/swiper@8/swiper-bundle.min.js', array('jquery'), '8.0.0', true);
    
    // Enqueue interactions.js with conditional dependencies
    wp_enqueue_script('viator-interactions', $plugin_dir . 'interactions.js', $dependencies, '1.0.2', true);

    // Add JavaScript variables
    wp_localize_script('viator-interactions', 'viatorAjax', array(
        'ajaxurl' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('viator_sort_nonce')
    ));

    // Add Flatpickr
    wp_enqueue_style('flatpickr', 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css');
    wp_enqueue_script('flatpickr', 'https://cdn.jsdelivr.net/npm/flatpickr', array(), null, true);
    
    // Carregar localização do Flatpickr baseada no idioma configurado
    $locale_settings = viator_get_locale_settings();
    $flatpickr_locale = '';
    
    if ($locale_settings['language'] === 'pt-BR') {
        wp_enqueue_script('flatpickr-pt', 'https://npmcdn.com/flatpickr/dist/l10n/pt.js', array('flatpickr'), null, true);
        $flatpickr_locale = 'pt';
    }
    // Para inglês (en-US), não precisamos carregar localização adicional, pois é o padrão

    // Add currency symbol and translations for JavaScript
    wp_localize_script('viator-interactions', 'viatorConfig', array(
        'currencySymbol' => $locale_settings['currency_symbol'],
        'language' => $locale_settings['language'],
        'flatpickrLocale' => $flatpickr_locale,
        'geolocationEnabled' => $geolocation_enabled === '1',
        'translations' => array(
            'search_button' => viator_t('search_button'),
            'search_placeholder' => viator_t('search_placeholder'),
            'search_nearby' => viator_t('search_nearby'),
            'clear_all' => viator_t('clear_all'),
            'filters' => viator_t('filters'),
            'searching' => viator_t('searching'),
            'reset_button' => viator_t('reset_button'),
            'apply_button' => viator_t('apply_button'),
            'choose_date' => viator_t('choose_date'),
            'duration_approx_short' => viator_t('duration_approx_short'),
            'date_connector' => viator_t('date_connector'),
            'months_short' => [
                viator_t('jan_short'), viator_t('feb_short'), viator_t('mar_short'),
                viator_t('apr_short'), viator_t('may_short'), viator_t('jun_short'),
                viator_t('jul_short'), viator_t('aug_short'), viator_t('sep_short'),
                viator_t('oct_short'), viator_t('nov_short'), viator_t('dec_short')
            ],
            'please_wait' => viator_t('please_wait'),
            'lets_go_searching' => viator_t('lets_go_searching'),
            'consult_availability' => viator_t('consult_availability'),
            'price_per_group' => viator_t('price_per_group'),
            'price_per_unit' => viator_t('price_per_unit'),
            'up_to_travelers' => viator_t('up_to_travelers'),
            'traveler_age_band' => viator_t('traveler_age_band'),
            'min_max_travelers' => viator_t('min_max_travelers'),
            'total_travelers_info' => viator_t('total_travelers_info'),
            'traveler_info_title' => viator_t('traveler_info_title'),
            'infant' => viator_t('infant'),
            'child' => viator_t('child'),
            'youth' => viator_t('youth'),
            'adult' => viator_t('adult'),
            'senior' => viator_t('senior'),
            'traveler' => viator_t('traveler'),
            'boat' => viator_t('boat'),
            'vehicle' => viator_t('vehicle'),
            'unit_type_vehicle_available' => viator_t('unit_type_vehicle_available'),
            'unit_type_boat_available' => viator_t('unit_type_boat_available'),
            'unit_type_generic_available' => viator_t('unit_type_generic_available'),
        )
    ));
    
    // Adicionar script inline para definir o atributo de idioma no body
    wp_add_inline_script('viator-interactions', "
        document.addEventListener('DOMContentLoaded', function() {
            document.body.setAttribute('data-viator-lang', '{$locale_settings['language']}');
        });
    ");

    // Enqueue Ionicons
    wp_enqueue_script('ionicons-module', 'https://unpkg.com/ionicons@5.5.2/dist/ionicons/ionicons.esm.js', array(), null, true);
    wp_enqueue_script('ionicons-nomodule', 'https://unpkg.com/ionicons@5.5.2/dist/ionicons/ionicons.js', array(), null, true);

    // Enqueue DotLottie Player
    wp_enqueue_script('dotlottie-player', 'https://unpkg.com/@dotlottie/player-component@2.7.12/dist/dotlottie-player.mjs', array(), null, true);
}
add_action('wp_enqueue_scripts', 'viator_enqueue_scripts');

// Enqueue styles
function viator_enqueue_styles() {
    wp_enqueue_style('viator-styles', plugins_url('styles.css', __FILE__));
    wp_enqueue_style('viator-product-detail', plugins_url('product-detail.css', __FILE__));
    
    // Enqueue product gallery script only on pages with the product shortcode
    global $post;
    if (is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'viator_product')) {
        wp_enqueue_script('viator-product-gallery', plugins_url('product-gallery.js', __FILE__), array('jquery'), '1.0', true);
    }
}
add_action('wp_enqueue_scripts', 'viator_enqueue_styles');

// Função que gera o formulário de pesquisa
function viator_search_form() {
    ob_start();
    
    // Verifica se há uma busca em andamento
    $hasResults = isset($_GET['viator_query']) && !empty($_GET['viator_query']);
    $searchTerm = isset($_GET['viator_query']) ? sanitize_text_field($_GET['viator_query']) : '';
    
    ?>
    <form method="GET" action="<?php echo esc_url(get_permalink()); ?>" id="viator-search-form" autocomplete="off">
        <div class="viator-search-wrapper">
            <input type="text" name="viator_query" autocomplete="off" placeholder="<?php echo esc_attr(viator_t('search_placeholder')); ?>" value="<?php echo esc_attr($searchTerm); ?>" required>
            <div class="viator-nearby-suggestion" style="display: none;">
                <span class="location-icon"><img src="https://img.icons8.com/?size=100&id=3009BI6rABJa&format=png&color=04846B" alt="Ícone" width="15" height="15"></span>
                <span><?php echo esc_html(viator_t('search_nearby')); ?></span>
            </div>
        </div>
        <button type="submit" id="search-button">
            <span id="search-text"><?php echo esc_html(viator_t('search_button')); ?></span>
            <span id="search-icon">🔍</span>
        </button>
    </form>

    <div id="viator-results" style="display: <?php echo $hasResults ? 'block' : 'none'; ?>;">
        <?php
        if ($hasResults) {
            echo viator_get_search_results($searchTerm);
        }
        ?>
    </div>
    <?php
    return ob_get_clean();
}

// Função para chamar a API e buscar resultados
function viator_get_search_results($searchTerm) {
    $api_key = get_option('viator_api_key');
    if (empty($api_key)) {
        return '<p class="error">' . esc_html(viator_t('error_api_key')) . '</p>';
    }
    
    // Obter configurações de idioma e moeda
    $locale_settings = viator_get_locale_settings();
    
    $url = "https://api.sandbox.viator.com/partner/search/freetext";

    // Paginação
    $per_page = 30; // Número de itens por página
    $page = isset($_GET['viator_page']) ? intval($_GET['viator_page']) : 1; // Página atual
    $start = ($page - 1) * $per_page + 1; // Índice inicial dos resultados

    // Determinar ordenação
    $sort_param = isset($_GET['viator_sort']) ? $_GET['viator_sort'] : 'DEFAULT';
    
    // Configurar parâmetros de ordenação
    $sorting = [];
    switch ($sort_param) {
        case 'REVIEW_AVG_RATING':
            $sorting = ['sort' => 'REVIEW_AVG_RATING'];
            break;
        case 'PRICE_ASC':
            $sorting = ['sort' => 'PRICE', 'order' => 'ASCENDING'];
            break;
        case 'PRICE_DESC':
            $sorting = ['sort' => 'PRICE', 'order' => 'DESCENDING'];
            break;
        case 'DURATION_ASC':
            $sorting = ['sort' => 'ITINERARY_DURATION', 'order' => 'ASCENDING'];
            break;
        case 'DURATION_DESC':
            $sorting = ['sort' => 'ITINERARY_DURATION', 'order' => 'DESCENDING'];
            break;
        case 'DATE_ADDED_DESC':
            $sorting = ['sort' => 'DATE_ADDED', 'order' => 'DESCENDING'];
            break;
        default:
            $sorting = ['sort' => 'DEFAULT'];
    }

    // Verificar se há um intervalo de datas selecionado
    $date_start = isset($_GET['viator_date_start']) ? $_GET['viator_date_start'] : '';
    $date_end = isset($_GET['viator_date_end']) ? $_GET['viator_date_end'] : '';
    
    if (!empty($date_start) && !empty($date_end)) {
        // Validar formato das datas (YYYY-MM-DD)
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date_start) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date_end)) {
            // Usar as datas selecionadas pelo usuário
            $date_from = $date_start;
            
            // Adiciona um dia ao date_end para incluir o último dia nas buscas
            // Isso é necessário porque a API considera exclusivo o último dia
            $date_to = date('Y-m-d', strtotime($date_end . ' +1 day'));
            
            // Verificar se a data final é menor que a inicial (improvável, mas possível)
            if (strtotime($date_to) <= strtotime($date_from)) {
                // Se acontecer, corrigir definindo data final como inicial + 1 dia
                $date_to = date('Y-m-d', strtotime($date_from . ' +1 day'));
            }
            
            viator_debug_log('Datas selecionadas pelo usuário:', "De $date_from até $date_to");
        } else {
            // Formato inválido, usar padrão
            $date_from = date('Y-m-d');
            $date_to = date('Y-m-d', strtotime('+1 year'));
            viator_debug_log('Formato de data inválido, usando padrão:', "De $date_from até $date_to");
        }
    } else {
        // Se não houver datas selecionadas, usar período padrão (hoje até 1 ano)
        $date_from = date('Y-m-d');
        $date_to = date('Y-m-d', strtotime('+1 year'));
        viator_debug_log('Usando período padrão:', "De $date_from até $date_to");
    }

    // Verificar se há um intervalo de duração selecionado
    $duration_filters = isset($_GET['duration_filter']) ? [$_GET['duration_filter']] : [];
    $duration_conditions = [];
    
    if (!empty($duration_filters)) {
        foreach ($duration_filters as $filter) {
            // Verificar se $filter é uma string válida e contém o delimitador '-'
            if (!is_string($filter) || strpos($filter, '-') === false) {
                continue; // Pular este filtro se não estiver no formato correto
            }
            
            $parts = explode('-', $filter);
            // Verificar se temos pelo menos dois elementos após explode
            if (count($parts) < 2) {
                continue; // Pular este filtro se não tiver pelo menos min e max
            }
            
            $min = $parts[0];
            $max = $parts[1]; // Pode ser vazio para "Mais de três dias"
            
            if ($max === '') {
                // Para "Mais de três dias"
                $duration_conditions[] = [
                    'from' => (int)$min
                ];
            } else {
                $duration_conditions[] = [
                    'from' => (int)$min,
                    'to' => (int)$max
                ];
            }
        }
    }
    
    // Usar diretamente as condições sem processamento adicional
    $duration_filter = !empty($duration_conditions) ? $duration_conditions : null;

    // Ler os parâmetros de preço
    $min_price_param = isset($_GET['min_price']) ? intval($_GET['min_price']) : 0;
    $max_price_param = isset($_GET['max_price']) ? intval($_GET['max_price']) : 5000;

    // Ler o parâmetro de avaliação
    $rating_param = isset($_GET['rating_filter']) ? floatval($_GET['rating_filter']) : 0;

    // Corpo da requisição JSON
    $body_data = [ // Primeiro crie o array
        "searchTerm" => $searchTerm,
        "productSorting" => $sorting,
        "productFiltering" => [
            "dateRange" => [
                "from" => $date_from,
                "to" => $date_to
            ],
            "price" => [
                "from" => $min_price_param,
                "to" => $max_price_param
            ],
            "rating" => [
                "from" => $rating_param,
                "to" => 5
            ],
            "durationInMinutes" => !empty($duration_filter) ? $duration_filter[0] : null,
            "includeAutomaticTranslations" => true
        ],
        "searchTypes" => [
            ["searchType" => "PRODUCTS", "pagination" => ["start" => $start, "count" => $per_page]],
            ["searchType" => "ATTRACTIONS", "pagination" => ["start" => 1, "count" => 30]]
        ],
        "currency" => $locale_settings['currency']
    ];

    // Adicionar filtros especiais, se existirem
    if (isset($_GET['special_filter']) && is_array($_GET['special_filter']) && !empty($_GET['special_filter'])) {
        $special_filters = $_GET['special_filter'];
        viator_debug_log('Filtros especiais encontrados:', $special_filters);
        
        // Mapear valores para os parâmetros da API
        foreach ($special_filters as $filter) {
            viator_debug_log('Processando filtro especial:', $filter);
            switch ($filter) {
                case 'free_cancellation':
                    // Adicionar filtro para Cancelamento Gratuito
                    $body_data['productFiltering']['flags'] = isset($body_data['productFiltering']['flags']) ? 
                        array_merge($body_data['productFiltering']['flags'], ['FREE_CANCELLATION']) : 
                        ['FREE_CANCELLATION'];
                    viator_debug_log('Adicionado filtro FREE_CANCELLATION para Cancelamento Gratuito', $filter);
                    break;
                case 'likely_to_sell_out':
                    // Adicionar filtro para Prestes a Esgotar
                    $body_data['productFiltering']['flags'] = isset($body_data['productFiltering']['flags']) ? 
                        array_merge($body_data['productFiltering']['flags'], ['LIKELY_TO_SELL_OUT']) : 
                        ['LIKELY_TO_SELL_OUT'];
                    viator_debug_log('Adicionado filtro LIKELY_TO_SELL_OUT para Prestes a Esgotar', $filter);
                    break;
                case 'skip_the_line':
                    // Adicionar filtro para Fura-Fila
                    $body_data['productFiltering']['flags'] = isset($body_data['productFiltering']['flags']) ? 
                        array_merge($body_data['productFiltering']['flags'], ['SKIP_THE_LINE']) : 
                        ['SKIP_THE_LINE'];
                    viator_debug_log('Adicionado filtro SKIP_THE_LINE para Fura-Fila', $filter);
                    break;
                case 'private_tour':
                    // Adicionar filtro para Tour Privado
                    $body_data['productFiltering']['flags'] = isset($body_data['productFiltering']['flags']) ? 
                        array_merge($body_data['productFiltering']['flags'], ['PRIVATE_TOUR']) : 
                        ['PRIVATE_TOUR'];
                    viator_debug_log('Adicionado filtro PRIVATE_TOUR para Tour Privado', $filter);
                    break;
                case 'new_on_viator':
                    // Adicionar filtro para Novo no Viator
                    $body_data['productFiltering']['flags'] = isset($body_data['productFiltering']['flags']) ? 
                        array_merge($body_data['productFiltering']['flags'], ['NEW_ON_VIATOR']) : 
                        ['NEW_ON_VIATOR'];
                    viator_debug_log('Adicionado filtro NEW_ON_VIATOR', $filter);
                    break;
                case 'special_offer':
                    // Nota: Filtro de Oferta Especial será processado localmente após a resposta da API
                    // pois depende da comparação entre fromPrice e fromPriceBeforeDiscount
                    viator_debug_log('Filtro SPECIAL_OFFER será processado localmente', $filter);
                    break;
            }
        }
    }
    
    // Adicionar filtro de categoria por tags, se existir
    if (isset($_GET['category_tag']) && !empty($_GET['category_tag'])) {
        $category_tag = intval($_GET['category_tag']);
        $body_data['productFiltering']['tags'] = [$category_tag];
        viator_debug_log('Adicionado filtro de categoria por tag:', $category_tag);
    }

    $body = json_encode($body_data);
    viator_debug_log('Request Body:', $body);
    viator_debug_log('Filtros enviados à API:', isset($body_data['productFiltering']['flags']) ? $body_data['productFiltering']['flags'] : 'Nenhum filtro');

    // Enviar a requisição POST para a API
    $response = wp_remote_post($url, [
        'headers' => [
            'Accept'           => 'application/json;version=2.0',
            'Content-Type'     => 'application/json;version=2.0',
            'exp-api-key'      => $api_key,
            'Accept-Language'  => $locale_settings['language'],
        ],
        'body'    => $body,
        'timeout' => 120,
    ]);

    // Verificar se houve erro na requisição
    if (is_wp_error($response)) {
        $output = '<div class="viator-content-wrapper">';
        $output .= '<div class="viator-results-container">';
        $output .= '<p class="viator-error-message">' . esc_html(viator_t('error_try_again')) . '</p>';
        $output .= '</div></div>';
        return $output;
    }

    // Inicializar a variável results
    $results = '';

    // Array com sugestões de destinos populares
    $destinos_sugeridos = array(
        'Paris, França',
        'Roma, Itália',
        'Barcelona, Espanha',
        'Nova York, EUA',
        'Tóquio, Japão',
        'Dubai, Emirados Árabes',
        'Londres, Inglaterra',
        'Amsterdã, Holanda',
        'Lisboa, Portugal',
        'Rio de Janeiro, Brasil',
        'Buenos Aires, Argentina',
        'Cidade do Cabo, África do Sul',
        'Sydney, Austrália',
        'São Paulo, Brasil',
        'Salvador, Brasil',
        'Florianópolis, Brasil',
        'Foz do Iguaçu, Brasil',
        'Gramado, Brasil',
        'Búzios, Brasil',
        'Recife, Brasil',
        'Fortaleza, Brasil',
        'Curitiba, Brasil',
        'Manaus, Brasil',
        'Belém, Brasil',
        'Maceió, Brasil',
        'Porto de Galinhas, Brasil',
        'Natal, Brasil',
        'Belo Horizonte, Brasil',
        'Porto Alegre, Brasil',
        'Vitória, Brasil',
        'Balneário Camboriú, Brasil',
        'Jericoacoara, Brasil',
        'Paraty, Brasil',
        'Ouro Preto, Brasil',
        'Campos do Jordão, Brasil',
        'Bonito, Brasil',
        'Lençóis Maranhenses, Brasil',
        'Chapada Diamantina, Brasil',
        'Ilha Grande, Brasil',
        'Arraial do Cabo, Brasil',
        'Trancoso, Brasil',
        'Istambul, Turquia',
        'Berlim, Alemanha',
        'Praga, República Tcheca',
        'Viena, Áustria',
        'Cancún, México',
        'Bali, Indonésia',
        'Phuket, Tailândia',
        'Seul, Coreia do Sul',
        'Marrakech, Marrocos'
    );

    // Processar resposta da API
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);
    viator_debug_log('Filtros de Duração Enviados:', $duration_filter);
    viator_debug_log('Resposta da API:', $data);
    viator_debug_log('Parâmetros recebidos:', $_GET);

    // Verificar se há filtros especiais selecionados para filtrar os resultados localmente
    $special_filters_to_check = [];
    if (isset($_GET['special_filter']) && is_array($_GET['special_filter']) && !empty($_GET['special_filter'])) {
        foreach ($_GET['special_filter'] as $filter) {
            switch ($filter) {
                case 'free_cancellation':
                    $special_filters_to_check[] = 'FREE_CANCELLATION';
                    break;
                case 'likely_to_sell_out':
                    $special_filters_to_check[] = 'LIKELY_TO_SELL_OUT';
                    break;
                case 'skip_the_line':
                    $special_filters_to_check[] = 'SKIP_THE_LINE';
                    break;
                case 'private_tour':
                    $special_filters_to_check[] = 'PRIVATE_TOUR';
                    break;
                case 'new_on_viator':
                    $special_filters_to_check[] = 'NEW_ON_VIATOR';
                    break;
                case 'special_offer':
                    $special_filters_to_check[] = 'SPECIAL_OFFER_LOCAL';
                    break;
            }
        }
    }

    // Verificar se há produtos na resposta
    if (empty($data['products']) || $data['products']['totalCount'] === 0) {
        // Embaralhar e pegar 6 destinos aleatórios
        shuffle($destinos_sugeridos);
        $destinos_aleatorios = array_slice($destinos_sugeridos, 0, 6);

        $output = '<script>
        window.addEventListener("load", function() {
            setTimeout(function() {
                const errorMessage = document.querySelector(".viator-error-message");
                if (errorMessage) {
                    const startPosition = window.pageYOffset;
                    const targetPosition = errorMessage.getBoundingClientRect().top + window.pageYOffset - 50;
                    const distance = targetPosition - startPosition;
                    const duration = 2500; // Increased duration for smoother animation

                    function easeOutCubic(t) {
                        return 1 - Math.pow(1 - t, 3);
                    }

                    let startTime = null;
                    function animate(currentTime) {
                        if (!startTime) startTime = currentTime;
                        const timeElapsed = currentTime - startTime;
                        const progress = Math.min(timeElapsed / duration, 1);

                        window.scrollTo(0, startPosition + (distance * easeOutCubic(progress)));

                        if (progress < 1) {
                            requestAnimationFrame(animate);
                        }
                    }

                    requestAnimationFrame(animate);
                }
            }, 800); // Increased delay for better timing
        });
        </script>';
        $output .= '<div class="viator-content-wrapper">';
        $output .= '<div class="viator-results-container">';
        $output .= '<p class="viator-error-message">' . esc_html(viator_t('no_tours_found')) . ' "' . esc_html($_GET['viator_query']) . '".</p>';
        
        // Adiciona sugestões de destinos
        $output .= '<div class="viator-suggestions">';
        $output .= '<p>' . esc_html(viator_t('try_popular_destinations')) . '</p>';
        $output .= '<div class="viator-suggestions-grid">';
        
        foreach ($destinos_aleatorios as $destino) {
            $output .= '<button class="viator-suggestion-btn" onclick="setSearchDestination(\'' . esc_attr($destino) . '\')">🌍 ' . esc_html($destino) . '</button>';
        }
        
        $output .= '</div></div>';
        $output .= '</div></div>';
        viator_debug_log('Nenhum resultado encontrado para a busca:', $_GET['viator_query']);
        return $output;
    }
    
    // Filtrar produtos que não têm as flags selecionadas
    if (!empty($special_filters_to_check) && !empty($data['products']['results'])) {
        $filtered_results = [];
        $total_before_filter = count($data['products']['results']);
        $special_offer_count = 0;
        
        viator_debug_log('Iniciando filtragem de ofertas especiais:', [
            'total_produtos_antes' => $total_before_filter,
            'filtros_aplicados' => $special_filters_to_check
        ]);
        
        // Log adicional para contar produtos com flag SPECIAL_OFFER
        $produtos_com_special_offer = 0;
        $produtos_com_desconto = 0;
        foreach ($data['products']['results'] as $tour_temp) {
            $flags_temp = isset($tour_temp['flags']) ? $tour_temp['flags'] : [];
            if (in_array('SPECIAL_OFFER', $flags_temp)) {
                $produtos_com_special_offer++;
            }
            
            $fromPrice_temp = isset($tour_temp['pricing']['summary']['fromPrice']) ? $tour_temp['pricing']['summary']['fromPrice'] : null;
            $fromPriceBeforeDiscount_temp = isset($tour_temp['pricing']['summary']['fromPriceBeforeDiscount']) ? $tour_temp['pricing']['summary']['fromPriceBeforeDiscount'] : null;
            if ($fromPrice_temp !== null && $fromPriceBeforeDiscount_temp !== null && $fromPrice_temp < $fromPriceBeforeDiscount_temp) {
                $produtos_com_desconto++;
            }
        }
        
        viator_debug_log('Análise dos produtos encontrados:', [
            'produtos_com_flag_SPECIAL_OFFER' => $produtos_com_special_offer,
            'produtos_com_desconto_real' => $produtos_com_desconto
        ]);
        
        foreach ($data['products']['results'] as $tour) {
            $flags = isset($tour['flags']) ? $tour['flags'] : [];
            $should_include = true;
            
            // Verificar se o produto tem TODAS as flags selecionadas
            foreach ($special_filters_to_check as $required_flag) {
                if ($required_flag === 'SPECIAL_OFFER_LOCAL') {
                    // Verificação especial para ofertas especiais: fromPrice < fromPriceBeforeDiscount
                    $fromPrice = isset($tour['pricing']['summary']['fromPrice']) ? $tour['pricing']['summary']['fromPrice'] : null;
                    $fromPriceBeforeDiscount = isset($tour['pricing']['summary']['fromPriceBeforeDiscount']) ? $tour['pricing']['summary']['fromPriceBeforeDiscount'] : null;
                    
                    // Verificação mais flexível: aceitar produtos que tenham desconto OU flag SPECIAL_OFFER
                    $hasRealDiscount = ($fromPrice !== null && $fromPriceBeforeDiscount !== null && $fromPrice < $fromPriceBeforeDiscount);
                    $hasSpecialOfferFlag = in_array('SPECIAL_OFFER', $flags);
                    
                    // Para ser mais confiável, vamos aceitar qualquer produto com flag SPECIAL_OFFER
                    // mesmo que não tenha fromPriceBeforeDiscount, pois a Viator marca como oferta especial
                    $qualifiesAsSpecialOffer = $hasSpecialOfferFlag || $hasRealDiscount;
                    
                    if (!$qualifiesAsSpecialOffer) {
                        $should_include = false;
                        break;
                    } else {
                        $special_offer_count++;
                    }
                } else {
                    // Verificação normal para flags
                    if (!in_array($required_flag, $flags)) {
                        $should_include = false;
                        break;
                    }
                }
            }
            
            if ($should_include) {
                $filtered_results[] = $tour;
            }
        }
        
        // Atualizar os resultados com apenas os produtos filtrados
        $data['products']['results'] = $filtered_results;
        
        // Atualizar o total de produtos
        $data['products']['totalCount'] = count($filtered_results);
        
        viator_debug_log('Resultado da filtragem de ofertas especiais:', [
            'total_antes' => $total_before_filter,
            'ofertas_encontradas' => $special_offer_count,
            'total_apos_filtro' => count($filtered_results)
        ]);
        
        // Se não houver resultados após a filtragem, mostrar mensagem de "nenhum produto encontrado"
        if (empty($filtered_results)) {
            // Embaralhar e pegar 6 destinos aleatórios
            shuffle($destinos_sugeridos);
            $destinos_aleatorios = array_slice($destinos_sugeridos, 0, 6);

            $output = '<script>
            window.addEventListener("load", function() {
                setTimeout(function() {
                    const errorMessage = document.querySelector(".viator-error-message");
                    if (errorMessage) {
                        const startPosition = window.pageYOffset;
                        const targetPosition = errorMessage.getBoundingClientRect().top + window.pageYOffset - 50;
                        const distance = targetPosition - startPosition;
                        const duration = 2500; // Increased duration for smoother animation

                        function easeOutCubic(t) {
                            return 1 - Math.pow(1 - t, 3);
                        }

                        let startTime = null;
                        function animate(currentTime) {
                            if (!startTime) startTime = currentTime;
                            const timeElapsed = currentTime - startTime;
                            const progress = Math.min(timeElapsed / duration, 1);

                            window.scrollTo(0, startPosition + (distance * easeOutCubic(progress)));

                            if (progress < 1) {
                                requestAnimationFrame(animate);
                            }
                        }

                        requestAnimationFrame(animate);
                    }
                }, 800); // Increased delay for better timing
            });
            </script>';
            $output .= '<div class="viator-content-wrapper">';
            $output .= '<div class="viator-results-container">';
            $output .= '<p class="viator-error-message">' . esc_html(viator_t('no_tours_found_filters')) . ' "' . esc_html($_GET['viator_query']) . '".</p>';
            
            // Adiciona sugestões de destinos
            $output .= '<div class="viator-suggestions">';
            $output .= '<p>' . esc_html(viator_t('try_popular_destinations')) . '</p>';
            $output .= '<div class="viator-suggestions-grid">';
            
            foreach ($destinos_aleatorios as $destino) {
                $output .= '<button class="viator-suggestion-btn" onclick="setSearchDestination(\'' . esc_attr($destino) . '\')">🌍 ' . esc_html($destino) . '</button>';
            }
            
            $output .= '</div></div>';
            $output .= '</div></div>';
            viator_debug_log('Nenhum resultado encontrado após a filtragem local para a busca:', $_GET['viator_query']);
            return $output;
        }
    }

    viator_debug_log('Resultados:', $results);

    // Array com sugestões de destinos populares
    $destinos_sugeridos = array(
    'Paris, França',
    'Roma, Itália',
    'Barcelona, Espanha',
    'Nova York, EUA',
    'Tóquio, Japão',
    'Dubai, Emirados Árabes',
    'Londres, Inglaterra',
    'Amsterdã, Holanda',
    'Lisboa, Portugal',
    'Rio de Janeiro, Brasil',
    'Buenos Aires, Argentina',
    'Cidade do Cabo, África do Sul',
    'Sydney, Austrália',
    'São Paulo, Brasil',
    'Salvador, Brasil',
    'Florianópolis, Brasil',
    'Foz do Iguaçu, Brasil',
    'Gramado, Brasil',
    'Búzios, Brasil',
    'Recife, Brasil',
    'Fortaleza, Brasil',
    'Curitiba, Brasil',
    'Manaus, Brasil',
    'Belém, Brasil',
    'Maceió, Brasil',
    'Porto de Galinhas, Brasil',
    'Natal, Brasil',
    'Belo Horizonte, Brasil',
    'Porto Alegre, Brasil',
    'Vitória, Brasil',
    'Balneário Camboriú, Brasil',
    'Jericoacoara, Brasil',
    'Paraty, Brasil',
    'Ouro Preto, Brasil',
    'Campos do Jordão, Brasil',
    'Bonito, Brasil',
    'Lençóis Maranhenses, Brasil',
    'Chapada Diamantina, Brasil',
    'Ilha Grande, Brasil',
    'Arraial do Cabo, Brasil',
    'Trancoso, Brasil',
    'Istambul, Turquia',
    'Berlim, Alemanha',
    'Praga, República Tcheca',
    'Viena, Áustria',
    'Cancún, México',
    'Bali, Indonésia',
    'Phuket, Tailândia',
    'Seul, Coreia do Sul',
    'Marrakech, Marrocos'
    );

    // Embaralha o array e pega 5 destinos aleatórios
    shuffle($destinos_sugeridos);
    $destinos_aleatorios = array_slice($destinos_sugeridos, 0, 6);

    // Verificar se há resultados
    if (empty($data) || !isset($data['products']['results']) || empty($data['products']['results'])) {
        // Adicionar o script de scroll primeiro
        $output = '<script>document.addEventListener("DOMContentLoaded", function() {
            const resultsContainer = document.querySelector(".viator-results-container");
            if (resultsContainer) {
                resultsContainer.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        });</script>';
                
        // Adiciona sugestões de destinos
        $output .= '<div class="viator-suggestions">';
        $output .= '<p>Que tal experimentar um destes destinos populares?</p>';
        $output .= '<div class="viator-suggestions-grid">';
        
        foreach ($destinos_aleatorios as $destino) {
                $output .= '<button class="viator-suggestion-btn" onclick="setSearchDestination(\'' . esc_attr($destino) . '\')">';
                $output .= '🌍 ' . esc_html($destino);
                $output .= '</button>';
            }
            
            $output .= '</div></div>';
        $output .= '</div>';
        return $output;
    }

    // Total de produtos e cálculo do número de páginas
    $total_products = isset($data['products']['totalCount']) ? intval($data['products']['totalCount']) : 0;
    $total_pages = ceil($total_products / $per_page);

    // Formatar o número total com ponto de milhar apenas se for maior que 1000
    $formatted_total = $total_products >= 1000 ? number_format($total_products, 0, ',', '.') : $total_products;

    // Modificar o script de scroll no início do output
    $output = '<script>
        window.addEventListener("load", function() {
            setTimeout(function() {
                // Procurar primeiro pela mensagem de erro, se não encontrar, procurar pelo wrapper de conteúdo
                const targetElement = document.querySelector(".viator-error-message") || document.querySelector(".viator-content-wrapper");
                
                if (targetElement) {
                    const startPosition = window.pageYOffset;
                    const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - 20;
                    const distance = targetPosition - startPosition;
                    const duration = 2000; // 2 segundos de duração para uma transição mais suave
                    let start = null;

                    function animation(currentTime) {
                        if (start === null) start = currentTime;
                        const timeElapsed = currentTime - start;
                        const progress = Math.min(timeElapsed / duration, 1);

                        // Função de easing melhorada para um movimento mais natural
                        const easeOutQuint = progress => {
                            return 1 - Math.pow(1 - progress, 5);
                        };

                        window.scrollTo(0, startPosition + (distance * easeOutQuint(progress)));

                        if (timeElapsed < duration) {
                            requestAnimationFrame(animation);
                        }
                    }

                    requestAnimationFrame(animation);
                }
            }, 500);
        });
    </script>';

    // Início do wrapper de conteúdo
    $output .= '<div class="viator-content-wrapper">';

    // Sidebar de filtros
    $output .= '<div class="viator-filters">
        <div class="viator-date-filter">
            <h3>' . esc_html(viator_t('when_travel')) . '</h3>
            <button type="button" class="viator-date-selector">
                <b>📅</b>
                <span>' . esc_html(viator_t('choose_date')) . '</span>
            </button>
        </div>';

    // Adicionando o filtro de duração
    $output .= '<div class="viator-duration-filter">
        <h3>' . esc_html(viator_t('duration')) . '</h3>';

    // Opções de filtro com valores corretos
    $duration_options = [
        '0-60' => viator_t('up_to_one_hour'),
        '60-240' => viator_t('one_to_four_hours'),
        '240-1440' => viator_t('four_hours_to_one_day'),
        '1440-4320' => viator_t('one_to_three_days'),
        '4320-' => viator_t('more_than_three_days')
    ];

    // Verificar filtros ativos
    $active_filters = isset($_GET['duration_filter']) ? (array) $_GET['duration_filter'] : [];

    foreach ($duration_options as $value => $label) {
        $checked = in_array($value, $active_filters) ? 'checked' : '';
        $output .= "<label><input type='radio' name='duration_filter' value='$value' $checked> $label</label><br>";
    }

    $output .= '</div>';

    // Adicionando o filtro de preço
    $current_min_price = isset($_GET['min_price']) ? intval($_GET['min_price']) : 0;
    $current_max_price = isset($_GET['max_price']) ? intval($_GET['max_price']) : 5000; // Definir um máximo padrão alto

    $output .= '<div class="viator-price-filter">
        <h3>' . esc_html(viator_t('price_range')) . '</h3>
        <div class="viator-price-slider-container">
            <div class="viator-price-values">
                <span id="min_price_display">' . $locale_settings['currency_symbol'] . ' ' . $current_min_price . '</span>
                <span id="max_price_display">' . $locale_settings['currency_symbol'] . ' ' . $current_max_price . ($current_max_price >= 5000 ? '+' : '') . '</span>
            </div>
            <div class="viator-price-sliders">
                <input type="range" id="min_price_slider" name="min_price_slider" min="0" max="5000" value="' . $current_min_price . '" step="10">
                <input type="range" id="max_price_slider" name="max_price_slider" min="0" max="5000" value="' . $current_max_price . '" step="10">
            </div>
        </div>
        <input type="hidden" name="min_price" id="min_price_hidden" value="' . $current_min_price . '">
        <input type="hidden" name="max_price" id="max_price_hidden" value="' . $current_max_price . '">
    </div>';
    // Fim do filtro de preço

    // Adicionar o filtro de Avaliação
    $is_ajax_request = wp_doing_ajax(); // Definir a variável, mas não vamos usá-la para condicionar a exibição dos filtros
    
    $output .= '<div class="viator-rating-filter">';
    $output .= '<h3>' . esc_html(viator_t('rating')) . '</h3>';
    $output .= '<div class="viator-rating-options">';
    
    // Rating 4.5+
    $rating_checked_45 = isset($_GET['rating_filter']) && $_GET['rating_filter'] == '4.5' ? 'checked' : '';
    $output .= '<label class="viator-rating-option">';
    $output .= '<input type="radio" name="rating_filter" value="4.5" ' . $rating_checked_45 . '>';
    $output .= '<div class="viator-rating-stars rating-45">';
    $output .= '<span class="star-full">★</span><span class="star-full">★</span><span class="star-full">★</span><span class="star-full">★</span>';
    $output .= '<div class="star-half-container"><span class="star-half-full">★</span><span class="star-half-empty">★</span></div>';
    $output .= '</div>';
    $output .= '<span class="viator-rating-text">4.5+</span>';
    $output .= '</label>';
    
    // Rating 4.0+
    $rating_checked_4 = isset($_GET['rating_filter']) && $_GET['rating_filter'] == '4.0' ? 'checked' : '';
    $output .= '<label class="viator-rating-option">';
    $output .= '<input type="radio" name="rating_filter" value="4.0" ' . $rating_checked_4 . '>';
    $output .= '<div class="viator-rating-stars rating-40">';
    $output .= '<span class="star-full">★</span><span class="star-full">★</span><span class="star-full">★</span><span class="star-full">★</span>';
    $output .= '<span class="star-empty">★</span>';
    $output .= '</div>';
    $output .= '<span class="viator-rating-text">4.0+</span>';
    $output .= '</label>';
    
    // Rating 3.0+
    $rating_checked_3 = isset($_GET['rating_filter']) && $_GET['rating_filter'] == '3.0' ? 'checked' : '';
    $output .= '<label class="viator-rating-option">';
    $output .= '<input type="radio" name="rating_filter" value="3.0" ' . $rating_checked_3 . '>';
    $output .= '<div class="viator-rating-stars rating-30">';
    $output .= '<span class="star-full">★</span><span class="star-full">★</span><span class="star-full">★</span>';
    $output .= '<span class="star-empty">★</span><span class="star-empty">★</span>';
    $output .= '</div>';
    $output .= '<span class="viator-rating-text">3.0+</span>';
    $output .= '</label>';
    
    $output .= '</div>'; // Fechando viator-rating-options
    $output .= '</div>'; // Fechando viator-rating-filter
    
    // Adicionar o filtro de Especiais
    $output .= '<div class="viator-specials-filter">';
    $output .= '<h3>' . esc_html(viator_t('specials')) . '</h3>';
    $output .= '<div class="viator-specials-options">';
    
    // Opção: Oferta Especial (primeira posição)
    $special_offer_checked = isset($_GET['special_filter']) && in_array('special_offer', (array)$_GET['special_filter']) ? 'checked' : '';
    $output .= '<label class="viator-special-option">';
    $output .= '<input type="checkbox" name="special_filter[]" value="special_offer" ' . $special_offer_checked . '>';
    $output .= '<span class="viator-special-text">' . esc_html(viator_t('special_offer')) . '</span>';
    $output .= '</label>';
    
    // Opção: Cancelamento Gratuito
    $free_cancel_checked = isset($_GET['special_filter']) && in_array('free_cancellation', (array)$_GET['special_filter']) ? 'checked' : '';
    $output .= '<label class="viator-special-option">';
    $output .= '<input type="checkbox" name="special_filter[]" value="free_cancellation" ' . $free_cancel_checked . '>';
    $output .= '<span class="viator-special-text">' . esc_html(viator_t('free_cancellation')) . '</span>';
    $output .= '</label>';
    
    // Opção: Prestes a Esgotar
    $sell_out_checked = isset($_GET['special_filter']) && in_array('likely_to_sell_out', (array)$_GET['special_filter']) ? 'checked' : '';
    $output .= '<label class="viator-special-option">';
    $output .= '<input type="checkbox" name="special_filter[]" value="likely_to_sell_out" ' . $sell_out_checked . '>';
    $output .= '<span class="viator-special-text">' . esc_html(viator_t('likely_to_sell_out')) . '</span>';
    $output .= '</label>';
    
    // Opção: Fura-Fila
    $skip_line_checked = isset($_GET['special_filter']) && in_array('skip_the_line', (array)$_GET['special_filter']) ? 'checked' : '';
    $output .= '<label class="viator-special-option">';
    $output .= '<input type="checkbox" name="special_filter[]" value="skip_the_line" ' . $skip_line_checked . '>';
    $output .= '<span class="viator-special-text">' . esc_html(viator_t('skip_the_line')) . '</span>';
    $output .= '</label>';
    
    // Opção: Tour Privado
    $private_checked = isset($_GET['special_filter']) && in_array('private_tour', (array)$_GET['special_filter']) ? 'checked' : '';
    $output .= '<label class="viator-special-option">';
    $output .= '<input type="checkbox" name="special_filter[]" value="private_tour" ' . $private_checked . '>';
    $output .= '<span class="viator-special-text">' . esc_html(viator_t('private_tour')) . '</span>';
    $output .= '</label>';
    
    // Opção: Novo no Viator
    $new_checked = isset($_GET['special_filter']) && in_array('new_on_viator', (array)$_GET['special_filter']) ? 'checked' : '';
    $output .= '<label class="viator-special-option">';
    $output .= '<input type="checkbox" name="special_filter[]" value="new_on_viator" ' . $new_checked . '>';
    $output .= '<span class="viator-special-text">' . esc_html(viator_t('new_on_viator')) . '</span>';
    $output .= '</label>';
    
    $output .= '</div>'; // Fechando viator-specials-options
    $output .= '</div>'; // Fechando viator-specials-filter
    
    // Botão de Limpar tudo
    $output .= '<div class="viator-clear-filters">';
    $output .= '<button type="button" id="clear-all-filters" class="viator-clear-all-btn">' . esc_html(viator_t('clear_all')) . '</button>';
    $output .= '</div>';

    // Fechar a sidebar de filtros
    $output .= '</div>'; // Fechando viator-filters

    // Extrair categorias dinâmicas dos produtos retornados
    $dynamic_categories = viator_extract_dynamic_categories($data['products']);
    
    // Header com total e ordenação
    $output .= '<div class="viator-results-container">
                <div class="viator-header">
                <div class="viator-header-info">';
    
    // Gerar carrossel dinâmico de categorias
    $output .= viator_generate_dynamic_category_carousel($dynamic_categories);
    
    $output .= '<div class="viator-header-info-filter">
                <button class="viator-mobile-filter-button" id="mobile-filter-button">
                    <span class="filter-icon"><img width="25" height="25" src="https://img.icons8.com/ios-filled/50/sorting-options.png" alt="sorting-options"/></span>
                    <span class="filter-text">' . esc_html(viator_t('filters')) . '</span>
                </button>
                <p class="viator-total">' . $formatted_total . ' ' . esc_html(viator_t('results')) . '</p>
    </div>';
    
    // Select de ordenação
    $current_sort = isset($_GET['viator_sort']) ? $_GET['viator_sort'] : 'DEFAULT';
    $output .= '<div class="viator-sort">
        <select name="viator_sort" id="viator-sort" onchange="updateSort(this.value)">
            <option value="DEFAULT"' . selected($current_sort, 'DEFAULT', false) . '>' . esc_html(viator_t('featured')) . '</option>
            <option value="REVIEW_AVG_RATING"' . selected($current_sort, 'REVIEW_AVG_RATING', false) . '>' . esc_html(viator_t('best_rated')) . '</option>
            <option value="PRICE_ASC"' . selected($current_sort, 'PRICE_ASC', false) . '>' . esc_html(viator_t('price_low_to_high')) . '</option>
            <option value="PRICE_DESC"' . selected($current_sort, 'PRICE_DESC', false) . '>' . esc_html(viator_t('price_high_to_low')) . '</option>
            <option value="DURATION_ASC"' . selected($current_sort, 'DURATION_ASC', false) . '>' . esc_html(viator_t('duration_ascending')) . '</option>
            <option value="DURATION_DESC"' . selected($current_sort, 'DURATION_DESC', false) . '>' . esc_html(viator_t('duration_descending')) . '</option>
            <option value="DATE_ADDED_DESC"' . selected($current_sort, 'DATE_ADDED_DESC', false) . '>' . esc_html(viator_t('newest_on_viator')) . '</option>
        </select>
    </div>';
    $output .= '</div>';

    // Obter curiosidade usando a API do Groq
    $extract = viator_get_groq_curiosity($searchTerm);

    // Output the curiosities div
    $output .= '<div class="viator-curiosities">
        <span><img src="https://img.icons8.com/?size=100&id=ulD4laUCmfyE&format=png&color=000000" alt="Ícone"> 
        <strong>' . esc_html(viator_t('did_you_know')) . '</strong> ' . esc_html($extract) . '</span>
    </div>';



    // Seção de Atrações
    if (!empty($data['attractions']['results'])) {
        $output .= '<div class="viator-attractions-section">';
        $output .= '<div class="viator-attractions-header">';
        $output .= '<h2>' . esc_html($searchTerm) . ' ' . esc_html(viator_t('attractions_activities_title')) . '</h2>';
        $output .= '</div>';
        
        $output .= '<div class="viator-attractions-carousel-container">';
        $output .= '<div class="viator-swiper-button-prev attractions-prev">';
        $output .= '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>';
        $output .= '</div>';
        
        $output .= '<div class="viator-attractions-swiper swiper">';
        $output .= '<div class="swiper-wrapper">';
        foreach ($data['attractions']['results'] as $index => $attraction) {
            // Debug das imagens
            $attraction_name = isset($attraction['name']) ? $attraction['name'] : 'Attraction'; 
            $attraction_id = isset($attraction['attractionId']) ? $attraction['attractionId'] : '';
            
            // Debug para verificar se o attractionId está sendo capturado
            viator_debug_log('Processando atração:', [
                'index' => $index,
                'name' => $attraction_name,
                'attractionId' => $attraction_id,
                'attraction_keys' => array_keys($attraction),
                'full_attraction_data' => $attraction
            ]);
            
            // Tentar diferentes caminhos para pegar o ID da atração
            if (empty($attraction_id)) {
                // Tentar outros campos possíveis para o ID
                if (isset($attraction['id'])) {
                    $attraction_id = $attraction['id'];
                } elseif (isset($attraction['attractionCode'])) {
                    $attraction_id = $attraction['attractionCode'];
                } elseif (isset($attraction['code'])) {
                    $attraction_id = $attraction['code'];
                }
                viator_debug_log('Tentativa alternativa de ID:', $attraction_id);
            }
            
            // Tentar diferentes caminhos para a imagem
            $image_url = '';
            if (isset($attraction['images']) && !empty($attraction['images'])) {
                if (isset($attraction['images'][0]['url'])) {
                    $image_url = $attraction['images'][0]['url'];
                } elseif (isset($attraction['images'][0]['variants'][0]['url'])) {
                    $image_url = $attraction['images'][0]['variants'][0]['url'];
                }
            }
            
            // Fallback para placeholder se não houver imagem
            if (empty($image_url)) {
                $image_url = 'https://via.placeholder.com/400x200/04846b/ffffff?text=' . urlencode($attraction_name);
            }
            
            $output .= '<div class="swiper-slide">';
            
            // Sempre criar um link, mesmo que seja um link temporário ou placeholder
            $has_valid_id = !empty($attraction_id);
            $attraction_url = $has_valid_id ? home_url('/atracoes/' . $attraction_id . '/') : '#';
            
            viator_debug_log('Gerando link para atração:', [
                'name' => $attraction_name,
                'id' => $attraction_id,
                'has_valid_id' => $has_valid_id,
                'url' => $attraction_url
            ]);
            
            $link_class = 'viator-attraction-link';
            $onclick = '';
            
            if (!$has_valid_id) {
                // Se não temos ID válido, adicionar um onclick que mostra uma mensagem ou faz uma busca
                $onclick = 'onclick="alert(\'Esta atração ainda não possui página de detalhes disponível.\\n\\nVocê pode:\\n• Usar nossa busca para encontrar passeios relacionados\\n• Verificar se há produtos disponíveis na lista abaixo\'); return false;"';
                $link_class .= ' no-valid-id';
            }
            
            $output .= '<a href="' . esc_url($attraction_url) . '" class="' . $link_class . '" target="_blank" rel="noopener noreferrer" ' . $onclick . '>';
            $output .= '<div class="viator-attraction-card" data-attraction-id="' . esc_attr($attraction_id) . '" data-attraction-name="' . esc_attr($attraction_name) . '">';
            $output .= '<img src="' . esc_url($image_url) . '" alt="' . esc_attr($attraction_name) . '" onerror="this.src=\'https://via.placeholder.com/400x200/04846b/ffffff?text=' . urlencode($attraction_name) . '\'">';
            $output .= '<div class="viator-attraction-title">' . esc_html($attraction_name) . '</div>';
            $output .= '</div>';
            $output .= '</a>';
            $output .= '</div>';
        }
        $output .= '</div>';
        $output .= '</div>';
        
        $output .= '<div class="viator-swiper-button-next attractions-next">';
        $output .= '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';
        $output .= '</div>';
        $output .= '</div>';
        $output .= '</div>';
    }

    // Iniciar grid de cards
    $output .= '<div class="viator-grid">';

    if (!empty($data['products']['results'])) {
        foreach ($data['products']['results'] as $tour) {
            // Pegar a imagem de melhor qualidade
            $image_url = isset($tour['images'][0]['variants'][3]['url']) ? $tour['images'][0]['variants'][3]['url'] : 'https://via.placeholder.com/400x200'; 
        
            // Pegar os dados principais
            $title = esc_html($tour['title']);
            $description = esc_html($tour['description']);
            $price = isset($tour['pricing']['summary']['fromPrice']) ? $locale_settings['currency_symbol'] . ' ' . number_format($tour['pricing']['summary']['fromPrice'], 2, ',', '.') : viator_t('price_not_available');
        
            // Captura a média de avaliações
            $rating = isset($tour['reviews']['combinedAverageRating']) ? number_format($tour['reviews']['combinedAverageRating'], 1) . '⭐' : viator_t('no_reviews');
        
            // Captura o total de avaliações e ajusta para singular/plural
            $total_reviews = isset($tour['reviews']['totalReviews']) ? $tour['reviews']['totalReviews'] : 0;
            if ($total_reviews == 0) {
                $rating_count = ''; // Não exibe nada se não houver avaliações
            } elseif ($total_reviews == 1) {
                $rating_count = '(1 ' . viator_t('review') . ')';
            } else {
                $rating_count = '(' . $total_reviews . ' ' . viator_t('reviews') . ')';
            }
            
            // Captura e formata a duração do passeio usando a função de tradução
            $duration_fixed = isset($tour['duration']['fixedDurationInMinutes']) ? $tour['duration']['fixedDurationInMinutes'] : null;
            $duration_from = isset($tour['duration']['variableDurationFromMinutes']) ? $tour['duration']['variableDurationFromMinutes'] : null;
            $duration_to = isset($tour['duration']['variableDurationToMinutes']) ? $tour['duration']['variableDurationToMinutes'] : null;
            $unstructured_duration = isset($tour['duration']['unstructuredDuration']) ? $tour['duration']['unstructuredDuration'] : null;

            $duration = viator_format_duration($duration_fixed, $duration_from, $duration_to, $unstructured_duration);
            
            $flags = isset($tour['flags']) ? $tour['flags'] : []; // Flags
            $url = esc_url($tour['productUrl']);
        
            // Processar flags
            $flag_output = '';
            if (in_array('LIKELY_TO_SELL_OUT', $flags)) {
                $flag_output .= '<span class="viator-badge" data-type="sell-out">' . esc_html(viator_t('likely_to_sell_out_badge')) . '</span>';
            }
            if (in_array('SPECIAL_OFFER', $flags)) {
                $flag_output .= '<span class="viator-badge" data-type="special-offer">' . esc_html(viator_t('special_offer_badge')) . '</span>';
            }
        
            // Processar preços
            $price_html = '';
            if (in_array('SPECIAL_OFFER', $flags) && isset($tour['pricing']['summary']['fromPriceBeforeDiscount'])) {
                // Se for oferta especial e tiver preço com desconto
                $original_price = number_format($tour['pricing']['summary']['fromPriceBeforeDiscount'], 2, ',', '.');
                $discounted_price = number_format($tour['pricing']['summary']['fromPrice'], 2, ',', '.');
                $price_html = '<span class="viator-original-price">' . $locale_settings['currency_symbol'] . ' ' . $original_price . '</span> <span class="viator-discount-price">' . $locale_settings['currency_symbol'] . ' ' . $discounted_price . '</span>';
            } else {
                // Preço normal sem desconto
                $price = isset($tour['pricing']['summary']['fromPrice']) ? number_format($tour['pricing']['summary']['fromPrice'], 2, ',', '.') : '0,00';
                $price_html = '<strong>' . $locale_settings['currency_symbol'] . ' ' . $price . '</strong>';
            }
        
            // Criar o card
            $output .= '<div class="viator-card">
                <div class="viator-card-img">
                    <img src="' . $image_url . '" alt="' . $title . '">';
                    
                    // Adicionar as badges no container da imagem
                    if (!empty($flag_output)) {
                        $output .= '<div class="viator-badge-container">' . $flag_output . '</div>';
                    }
        
            $output .= '</div>
                <div class="viator-card-content">
                    <p class="viator-card-rating">' . $rating . ' ' . $rating_count . '</p>
                    <h3>' . $title . '</h3>
                    <p>' . substr($description, 0, 120) . '...</p>';

            if (in_array('FREE_CANCELLATION', $flags)) {
                $output .= '<p class="viator-card-duration"><img src="https://img.icons8.com/?size=100&id=85097&format=png&color=04846b" alt="Cancelamento gratuito" title="Política de cancelamento" width="15" height="15"> ' . esc_html(viator_t('free_cancellation_badge')) . '</p>';
            }

            $output .= '<p class="viator-card-duration"><img src="https://img.icons8.com/?size=100&id=82767&format=png&color=000000" alt="Duração" title="Duração aproximada" width="15" height="15"> ' . esc_html($duration) . '</p>
                    <p class="viator-card-price"><img src="https://img.icons8.com/?size=100&id=ZXJaNFNjWGZF&format=png&color=000000" alt="Preço" width="15" height="15"> ' . esc_html(viator_t('from_price')) . ' ' . $price_html . '</p>                
                    <a href="' . esc_url(home_url('/passeio/' . $tour['productCode'] . '/')) . '" target="_blank" rel="noopener noreferrer">' . esc_html(viator_t('see_details')) . '</a>';
                    
                    // Armazenar informações de preço e duração para uso na página de detalhes do produto
                    $product_data = array(
                        'fromPrice' => isset($tour['pricing']['summary']['fromPrice']) ? $tour['pricing']['summary']['fromPrice'] : null,
                        'fromPriceBeforeDiscount' => isset($tour['pricing']['summary']['fromPriceBeforeDiscount']) ? $tour['pricing']['summary']['fromPriceBeforeDiscount'] : null,
                        'flags' => $flags,
                        'duration' => $duration,
                        'duration_data' => array(
                            'fixedDurationInMinutes' => $duration_fixed,
                            'variableDurationFromMinutes' => $duration_from,
                            'variableDurationToMinutes' => $duration_to,
                            'unstructuredDuration' => $unstructured_duration
                        )
                    );
                    update_option('viator_product_' . $tour['productCode'] . '_price', $product_data, false);
                    
                    $output .= "
                </div>
            </div>";
        }
    }

    // Fechar grid
    $output .= '</div>';

    // Adicionando paginação
    if ($total_pages > 1) {
        $output .= '<div class="viator-pagination">';
        
        // Link para a página anterior
        if ($page > 1) {
            $prev_url = add_query_arg([
                'viator_page' => $page - 1,
                'viator_query' => $searchTerm,
                'viator_sort' => $current_sort,
                'viator_date_start' => isset($_GET['viator_date_start']) ? $_GET['viator_date_start'] : '',
                'viator_date_end' => isset($_GET['viator_date_end']) ? $_GET['viator_date_end'] : '',
                'duration_filter' => isset($_GET['duration_filter']) ? $_GET['duration_filter'] : '',
                'min_price' => isset($_GET['min_price']) ? $_GET['min_price'] : '',
                'max_price' => isset($_GET['max_price']) ? $_GET['max_price'] : '',
                'rating_filter' => isset($_GET['rating_filter']) ? $_GET['rating_filter'] : '',
                'special_filter' => isset($_GET['special_filter']) ? $_GET['special_filter'] : [],
                'category_tag' => isset($_GET['category_tag']) ? $_GET['category_tag'] : ''
            ]);
            $prev_arrow = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/></svg>';
            $output .= '<a class="viator-pagination-arrow" href="' . esc_url($prev_url) . '" data-page="' . ($page - 1) . '">' . $prev_arrow . '</a>';
        }

        // Gerar links das páginas com ellipsis
        $adjacent = 2;
        $pages = array();

        // Sempre mostra a primeira página
        $pages[] = 1;

        // Calcula páginas adjacentes
        $start = max(2, $page - $adjacent);
        $end = min($total_pages - 1, $page + $adjacent);

        // Adiciona ellipsis se necessário antes das páginas intermediárias
        if ($start > 2) {
            $pages[] = '...';
        }

        // Páginas intermediárias
        for ($i = $start; $i <= $end; $i++) {
            $pages[] = $i;
        }

        // Adiciona ellipsis se necessário após as páginas intermediárias
        if ($end < $total_pages - 1) {
            $pages[] = '...';
        }

        // Sempre mostra a última página se houver mais de uma
        if ($total_pages > 1) {
            $pages[] = $total_pages;
        }

        // Loop para gerar os links ou ellipsis
        foreach ($pages as $page_num) {
            if ($page_num === '...') {
                $output .= '<span class="viator-pagination-ellipsis">...</span>';
            } else {
                // Coletar todos os parâmetros de filtro para cada link de paginação
                $pagination_params = [
                    'viator_page' => $page_num,
                    'viator_query' => $searchTerm,
                    'viator_sort' => $current_sort
                ];
                
                // Adicionar parâmetros de data se existirem
                if (isset($_GET['viator_date_start']) && !empty($_GET['viator_date_start'])) {
                    $pagination_params['viator_date_start'] = $_GET['viator_date_start'];
                }
                if (isset($_GET['viator_date_end']) && !empty($_GET['viator_date_end'])) {
                    $pagination_params['viator_date_end'] = $_GET['viator_date_end'];
                }
                
                // Adicionar filtro de duração se existir
                if (isset($_GET['duration_filter']) && !empty($_GET['duration_filter'])) {
                    $pagination_params['duration_filter'] = $_GET['duration_filter'];
                }
                
                // Adicionar filtros de preço se existirem
                if (isset($_GET['min_price']) && $_GET['min_price'] !== '') {
                    $pagination_params['min_price'] = $_GET['min_price'];
                }
                if (isset($_GET['max_price']) && $_GET['max_price'] !== '') {
                    $pagination_params['max_price'] = $_GET['max_price'];
                }
                
                // Adicionar filtro de avaliação se existir
                if (isset($_GET['rating_filter']) && !empty($_GET['rating_filter'])) {
                    $pagination_params['rating_filter'] = $_GET['rating_filter'];
                }
                
                // Adicionar filtros especiais se existirem
                if (isset($_GET['special_filter']) && is_array($_GET['special_filter']) && !empty($_GET['special_filter'])) {
                    $pagination_params['special_filter'] = $_GET['special_filter'];
                }
                
                // Adicionar filtro de categoria se existir
                if (isset($_GET['category_tag']) && !empty($_GET['category_tag'])) {
                    $pagination_params['category_tag'] = $_GET['category_tag'];
                }
                
                $url = add_query_arg($pagination_params);
                $active_class = ($page_num == $page) ? ' active' : '';
                $output .= '<a class="viator-pagination-btn' . $active_class . '" href="' . esc_url($url) . '" data-page="' . $page_num . '">' . $page_num . '</a>';
            }
        }

        // Link para a próxima página
        if ($page < $total_pages) {
            $next_url = add_query_arg([
                'viator_page' => $page + 1,
                'viator_query' => $searchTerm,
                'viator_sort' => $current_sort,
                'viator_date_start' => isset($_GET['viator_date_start']) ? $_GET['viator_date_start'] : '',
                'viator_date_end' => isset($_GET['viator_date_end']) ? $_GET['viator_date_end'] : '',
                'duration_filter' => isset($_GET['duration_filter']) ? $_GET['duration_filter'] : '',
                'min_price' => isset($_GET['min_price']) ? $_GET['min_price'] : '',
                'max_price' => isset($_GET['max_price']) ? $_GET['max_price'] : '',
                'rating_filter' => isset($_GET['rating_filter']) ? $_GET['rating_filter'] : '',
                'special_filter' => isset($_GET['special_filter']) ? $_GET['special_filter'] : [],
                'category_tag' => isset($_GET['category_tag']) ? $_GET['category_tag'] : ''
            ]);
            $next_arrow = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/></svg>';
            $output .= '<a class="viator-pagination-arrow" href="' . esc_url($next_url) . '" data-page="' . ($page + 1) . '">' . $next_arrow . '</a>';
        }

        $output .= '</div>';
    }

    $output .= '</div>'; // Fecha viator-results-container
    $output .= '</div>'; // Fecha viator-content-wrapper

    // Adicionar JavaScript para inicializar o Swiper
    $output .= '<script>
    document.addEventListener("DOMContentLoaded", function() {
        // Inicializar Swiper para Atrações
        if (document.querySelector(".viator-attractions-swiper")) {
            window.attractionsSwiper = new Swiper(".viator-attractions-swiper", {
                slidesPerView: 4,
                spaceBetween: 20,
                navigation: {
                    nextEl: ".attractions-next",
                    prevEl: ".attractions-prev",
                },
                breakpoints: {
                    320: {
                        slidesPerView: 1,
                        spaceBetween: 15
                    },
                    480: {
                        slidesPerView: 2,
                        spaceBetween: 15
                    },
                    768: {
                        slidesPerView: 3,
                        spaceBetween: 20
                    },
                    1024: {
                        slidesPerView: 4,
                        spaceBetween: 20
                    }
                }
            });
        }
    });
    </script>';

    return $output;
}

// Criar o shortcode para exibir o formulário e os resultados
add_shortcode('viator_search', 'viator_search_form');

// Modificar o handler AJAX de ordenação
function viator_ajax_update_sort() {
    check_ajax_referer('viator_sort_nonce', 'nonce');
    
    // Verificar e sanitizar todos os parâmetros necessários
    $search_term = isset($_POST['viator_query']) ? sanitize_text_field($_POST['viator_query']) : '';
    if (empty($search_term)) {
        wp_send_json_error(['message' => 'Termo de busca não fornecido']);
        wp_die();
    }

    // Configurar os parâmetros GET para a função de busca
    $_GET['viator_query'] = $search_term;
    $_GET['viator_sort'] = isset($_POST['viator_sort']) ? sanitize_text_field($_POST['viator_sort']) : 'DEFAULT';
    $_GET['viator_page'] = isset($_POST['viator_page']) ? intval($_POST['viator_page']) : 1;
    $_GET['viator_date_start'] = isset($_POST['viator_date_start']) ? sanitize_text_field($_POST['viator_date_start']) : '';
    $_GET['viator_date_end'] = isset($_POST['viator_date_end']) ? sanitize_text_field($_POST['viator_date_end']) : '';
    
    // Processar filtro de duração
    if (isset($_POST['duration_filter']) && !empty($_POST['duration_filter'])) {
        $_GET['duration_filter'] = sanitize_text_field($_POST['duration_filter']);
    } else {
        unset($_GET['duration_filter']);
    }

    // Processar filtros de preço
    // Limpar para garantir que valores vazios não interferem
    unset($_GET['min_price']);
    unset($_GET['max_price']);
    
    // Processar min_price
    if (isset($_POST['min_price']) && $_POST['min_price'] !== '') {
        $_GET['min_price'] = sanitize_text_field($_POST['min_price']);
    }
    
    // Processar max_price
    if (isset($_POST['max_price']) && $_POST['max_price'] !== '') {
        $_GET['max_price'] = sanitize_text_field($_POST['max_price']);
    }
    
    // Processar filtro de avaliação
    if (isset($_POST['rating_filter']) && !empty($_POST['rating_filter'])) {
        $_GET['rating_filter'] = sanitize_text_field($_POST['rating_filter']);
    } else {
        unset($_GET['rating_filter']);
    }
    
    // Processar filtros especiais
    unset($_GET['special_filter']);
    
    // Verificar se existem filtros especiais no POST
    if (isset($_POST['special_filter']) && is_array($_POST['special_filter'])) {
        $_GET['special_filter'] = array_map('sanitize_text_field', $_POST['special_filter']);
    } else {
        // Verificar se existem filtros especiais indexados
        $special_filters = array();
        for ($i = 0; isset($_POST["special_filter[$i]"]); $i++) {
            $special_filters[] = sanitize_text_field($_POST["special_filter[$i]"]);
        }
        
        if (!empty($special_filters)) {
            $_GET['special_filter'] = $special_filters;
        }
    }
    
    // Processar filtro de categoria por tags
    if (isset($_POST['category_tag']) && !empty($_POST['category_tag'])) {
        $_GET['category_tag'] = sanitize_text_field($_POST['category_tag']);
        viator_debug_log('Sort: Filtro de categoria recebido via POST:', $_GET['category_tag']);
    } else {
        unset($_GET['category_tag']);
    }
    
    // Debug dos parâmetros para solução de problemas
    viator_debug_log('Sort AJAX Parâmetros recebidos:', $_POST);
    viator_debug_log('Sort AJAX Parâmetros processados:', $_GET);
    
    // Obter os resultados
    $results = viator_get_search_results($search_term);
    
    // Verificar se os resultados são válidos
    if (empty($results)) {
        wp_send_json_error(['message' => 'Nenhum resultado encontrado']);
        wp_die();
    }
    // Retornar os resultados como HTML
    echo $results;
    wp_die();
}
add_action('wp_ajax_viator_update_sort', 'viator_ajax_update_sort');
add_action('wp_ajax_nopriv_viator_update_sort', 'viator_ajax_update_sort');

// Adicionar nova action para o filtro
add_action('wp_ajax_viator_update_filter', 'viator_ajax_update_filter');
add_action('wp_ajax_nopriv_viator_update_filter', 'viator_ajax_update_filter');

function viator_ajax_update_filter() {
    check_ajax_referer('viator_sort_nonce', 'nonce');
    
    // Verificar e sanitizar o termo de busca
    $search_term = isset($_POST['viator_query']) ? sanitize_text_field($_POST['viator_query']) : '';
    if (empty($search_term)) {
        wp_send_json_error(['message' => 'Termo de busca não fornecido']);
        wp_die();
    }
    
    // Configurar os parâmetros GET para a função de busca
    $_GET['viator_query'] = $search_term;
    
    // Processar parâmetro de ordenação
    $_GET['viator_sort'] = isset($_POST['viator_sort']) ? sanitize_text_field($_POST['viator_sort']) : 'DEFAULT';
    
    // Processar paginação
    $_GET['viator_page'] = isset($_POST['viator_page']) ? intval($_POST['viator_page']) : 1;
    
    // Processar datas
    $_GET['viator_date_start'] = isset($_POST['viator_date_start']) ? sanitize_text_field($_POST['viator_date_start']) : '';
    $_GET['viator_date_end'] = isset($_POST['viator_date_end']) ? sanitize_text_field($_POST['viator_date_end']) : '';
    
    // Validar formato das datas
    if (!empty($_GET['viator_date_start']) && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['viator_date_start'])) {
        $_GET['viator_date_start'] = '';
    }
    if (!empty($_GET['viator_date_end']) && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['viator_date_end'])) {
        $_GET['viator_date_end'] = '';
    }
    
    // Processar filtro de duração
    if (isset($_POST['duration_filter']) && !empty($_POST['duration_filter'])) {
        $_GET['duration_filter'] = sanitize_text_field($_POST['duration_filter']);
    } else {
        unset($_GET['duration_filter']);
    }

    // Processar filtros de preço
    // Limpamos para garantir que valores vazios não interferem
    unset($_GET['min_price']);
    unset($_GET['max_price']);
    
    // Processar min_price
    if (isset($_POST['min_price']) && $_POST['min_price'] !== '') {
        $_GET['min_price'] = intval($_POST['min_price']);
    }
    
    // Processar max_price
    if (isset($_POST['max_price']) && $_POST['max_price'] !== '') {
        $_GET['max_price'] = intval($_POST['max_price']);
    }
    
    // Processar filtro de avaliação
    if (isset($_POST['rating_filter']) && !empty($_POST['rating_filter'])) {
        $_GET['rating_filter'] = sanitize_text_field($_POST['rating_filter']);
    } else {
        unset($_GET['rating_filter']);
    }
    
    // Processar filtros especiais
    unset($_GET['special_filter']);
    
    // Se existirem filtros especiais no POST, processá-los
    if (isset($_POST['special_filter']) && is_array($_POST['special_filter'])) {
        $_GET['special_filter'] = [];
        foreach ($_POST['special_filter'] as $value) {
            $_GET['special_filter'][] = sanitize_text_field($value);
            viator_debug_log('Filtro especial recebido via POST array:', $value);
        }
    } elseif (isset($_POST['special_filter']) && !is_array($_POST['special_filter'])) {
        // Se for um único valor (não array)
        $_GET['special_filter'] = [sanitize_text_field($_POST['special_filter'])];
        viator_debug_log('Filtro especial recebido via POST único valor:', $_POST['special_filter']);
    }
    
    // Verificar se existem os parâmetros indexed special_filter (para compatibilidade com jQuery serialize)
    for ($i = 0; isset($_POST["special_filter[$i]"]); $i++) {
        if (!isset($_GET['special_filter'])) {
            $_GET['special_filter'] = [];
        }
        $_GET['special_filter'][] = sanitize_text_field($_POST["special_filter[$i]"]);
        viator_debug_log('Filtro especial recebido via POST indexed:', $_POST["special_filter[$i]"]);
    }
    
    // Processar filtro de categoria por tags
    if (isset($_POST['category_tag']) && !empty($_POST['category_tag'])) {
        $_GET['category_tag'] = sanitize_text_field($_POST['category_tag']);
        viator_debug_log('Filtro de categoria recebido via POST:', $_GET['category_tag']);
    } else {
        unset($_GET['category_tag']);
    }
    
    // Debug dos parâmetros para solução de problemas
    viator_debug_log('AJAX Parâmetros recebidos:', $_POST);
    viator_debug_log('AJAX Parâmetros processados:', $_GET);

    // Obter os resultados
    $results = viator_get_search_results($search_term);
    
    // Verificar se os resultados são válidos
    if (empty($results)) {
        wp_send_json_error(['message' => 'Nenhum resultado encontrado']);
        wp_die();
    }
    // Retornar os resultados como HTML
    echo $results;
    wp_die();
}

// Adicionar atributos type="module" e nomodule para scripts específicos
function add_ionicons_script_attributes($tag, $handle, $src) {
    if ('ionicons-module' === $handle) {
        $tag = '<script type="module" src="' . esc_url($src) . '"></script>';
    }
    if ('ionicons-nomodule' === $handle) {
        $tag = '<script nomodule src="' . esc_url($src) . '"></script>';
    }
    // Adicionar type="module" para o dotlottie-player
    if ('dotlottie-player' === $handle) {
        $tag = '<script type="module" src="' . esc_url($src) . '"></script>';
    }
    return $tag;
}
add_filter('script_loader_tag', 'add_ionicons_script_attributes', 10, 3);

// Função para obter o símbolo da moeda
function viator_get_currency_symbol($currency_code = null) {
    if (!$currency_code) {
        $currency_code = get_option('viator_currency', 'BRL');
    }
    
    $currency_symbols = [
        'BRL' => 'R$',
        'USD' => '$'
    ];
    
    return isset($currency_symbols[$currency_code]) ? $currency_symbols[$currency_code] : $currency_code;
}

// Função para obter configurações de idioma e moeda
function viator_get_locale_settings() {
    $language = get_option('viator_language', 'pt-BR');
    
    // Mapear para formato aceito pela API Viator
    $accept_language_map = [
        'pt-BR' => 'pt-BR',
        'en-US' => 'en-US'
    ];
    
    return [
        'language' => $language,
        'accept_language' => isset($accept_language_map[$language]) ? $accept_language_map[$language] : 'en-US',
        'currency' => get_option('viator_currency', 'BRL'),
        'currency_symbol' => viator_get_currency_symbol()
    ];
}

// Sistema de tradução completo
function viator_get_translation($key, $language = null) {
    if (!$language) {
        $language = get_option('viator_language', 'pt-BR');
    }
    
    $translations = [
        'pt-BR' => [
            // Formulário de busca
            'search_placeholder' => '🌍 Digite o nome ou o código do passeio desejado',
            'search_button' => 'Pesquisar',
            'search_nearby' => 'Nos arredores',
            
            // Filtros
            'when_travel' => 'Quando você pretende viajar?',
            'choose_date' => 'Escolher data',
            'duration' => 'Duração',
            'up_to_one_hour' => 'Até uma hora',
            'one_to_four_hours' => '1 a 4 horas',
            'four_hours_to_one_day' => '4 horas a 1 dia',
            'one_to_three_days' => '1 a 3 dias',
            'more_than_three_days' => 'Mais de três dias',
            'price_range' => 'Faixa de Preço',
            'rating' => 'Avaliação',
            'specials' => 'Especiais',
            'free_cancellation' => 'Cancelamento Gratuito',
            'likely_to_sell_out' => 'Esgota rápido',
            'skip_the_line' => 'Evitar fila',
            'private_tour' => 'Tour Privado',
            'new_on_viator' => 'Novidades',
            'clear_all' => 'Limpar tudo',
            'filters' => 'Filtros',
            
            // Ordenação
            'featured' => 'Em destaque',
            'best_rated' => 'Melhor avaliados',
            'price_low_to_high' => 'Preço (menor para maior)',
            'price_high_to_low' => 'Preço (maior para menor)',
            'duration_ascending' => 'Duração (crescente)',
            'duration_descending' => 'Duração (decrescente)',
            'newest_on_viator' => 'Novidades',
            
            // Resultados
            'results' => 'resultados',
            'no_tours_found' => 'Nenhum passeio encontrado para',
            'no_tours_found_filters' => 'Nenhum passeio encontrado com os filtros selecionados para',
            'try_popular_destinations' => 'Que tal experimentar um destes destinos populares?',
            'did_you_know' => 'Você sabia?',
            'free_cancellation_note' => 'Cancelamento grátis até 24 horas antes do início da experiência (horário local)',
            
            // Cards de produto
            'duration_approx' => 'Duração aproximada',
            'from_price' => 'a partir de',
            'see_details' => 'Ver detalhes',
            'price_not_available' => 'Preço não disponível',
            'no_reviews' => 'Sem avaliações',
            'review' => 'avaliação',
            'reviews' => 'avaliações',
            'special_offer' => 'Oferta especial',
            
            // Badges
            'free_cancellation_badge' => 'Cancelamento gratuito',
            'likely_to_sell_out_badge' => 'Esgota rápido',
            'special_offer_badge' => 'Oferta especial',
            
            // Duração
            'duration_not_available' => 'Duração não disponível',
            'flexible' => 'Flexível',
            'minute' => 'minuto',
            'minutes' => 'minutos',
            'hour' => 'hora',
            'hours' => 'horas',
            'day' => 'dia',
            'days' => 'dias',
            'and' => 'e',
            'from' => 'De',
            'to' => 'a',
            
            // Página de produto
            'home' => 'Home',
            'product_code' => 'Código do passeio/serviço',
            'description' => 'Descrição',
            'included' => 'O que está incluído',
            'not_included' => 'O que não está incluído',
            'additional_info' => 'Informações Adicionais',
            'cancellation_policy' => 'Política de Cancelamento',
            'available_languages' => 'Idiomas Disponíveis',
            'check_availability' => 'Verificar Disponibilidade',
            'price_per_person' => '*Preço por pessoa',
            'location' => 'Localização',
            'timezone' => 'Fuso Horário',
            'logistics_info' => 'Informações Logísticas',
            'special_instructions' => 'Instruções Especiais',
            'you_might_like' => 'Você pode gostar',
            'tags' => 'Tags',
            'consult_availability' => 'Consulte disponibilidade',
            'price_per_group' => 'Preço por grupo',
            'price_per_unit' => 'Preço por grupo (%s)',
            'up_to_travelers' => '(até %d)',
            'traveler_age_band' => '%s (Idade: %d-%d)',
            'min_max_travelers' => 'Mín: %d, Máx: %d',
            'total_travelers_info' => 'Você pode selecionar até %d viajantes no total.',
            'traveler_info_title' => 'Informações do Viajante',
            'infant' => 'Infantil',
            'child' => 'Criança',
            'youth' => 'Jovem',
            'adult' => 'Adulto',
            'senior' => 'Idoso',
            'traveler' => 'Viajante',
            'boat' => 'barco',
            'vehicle' => 'veículo',
            'unit_type_vehicle_available' => 'Traslado disponível',
            'unit_type_boat_available' => 'Passeio de barco disponível',
            'unit_type_generic_available' => 'Serviço de %s disponível',
            
            // Avaliações
            'reviews_title' => 'Avaliações',
            'all_reviews' => 'Todas',
            'all_providers' => 'Todos os provedores',
            'viator_only' => 'Apenas Viator',
            'tripadvisor_only' => 'Apenas TripAdvisor',
            'review_from' => 'Avaliação do',
            'stars' => 'estrelas',
            'star' => 'estrela',
            'most_recent' => 'Mais recentes',
            'highest_rating' => 'Melhor avaliação',
            'most_helpful' => 'Mais úteis',
            'all_languages' => '(todos idiomas)',
            'loading_reviews' => 'Carregando avaliações...',
            
            // Elementos adicionais da interface
            'additional_info' => 'Informações Adicionais',
            'tooltip_support' => 'Cite este código ao falar com o suporte ao cliente.',
            'searching' => 'Pesquisando',
            
            // Filtros de categoria (Tags da Viator)
            'all_tours' => 'Todos os passeios',
            'bus_tours' => 'Passeios de ônibus',
            'day_trips' => 'Excursões de um dia',
            'nature_wildlife' => 'Excursões pela natureza e vida selvagem',
            'sightseeing_tours' => 'Passeios turísticos',
            'helicopter_tours' => 'Passeios de helicóptero',
            'adventure_tours' => 'Excursões de aventura',
            'halfday_tours' => 'Excursões de meio dia',
            'private_luxury' => 'Particular e de luxo',
            'cultural_tours' => 'Excursões culturais',
            'evening_tours' => 'Excursões noturnas',
            'dinner_cruises' => 'Cruzeiros com jantar',
            'private_tours' => 'Excursões turísticas privadas',
            'holidays' => 'Feriados',
            'weddings' => 'Casamentos e celebrações',
            'seasonal' => 'Sazonal',
            'christmas' => 'Natal',
            'easter' => 'Páscoa',
            'winter' => 'Inverno',
            'summer' => 'Verão',
            'concerts' => 'Concertos',
            '4x4_tours' => 'Passeios de 4x4',
            'extreme_sports' => 'Esportes radicais',
            'afternoon_tours' => 'Tours da tarde',
            'evening_entertainment' => 'Entretenimento noturno',
            'walking_tours' => 'Caminhadas',
            'hot_air_balloon' => 'Passeios de balão',
            'boat_tours' => 'Passeios de barco',
            'shore_excursions' => 'Excursões costeiras',
            'please_wait' => 'Por favor, aguarde!',
            'lets_go_searching' => 'Vamos lá! Pesquisando',
            'reset_button' => 'Redefinir',
            'apply_button' => 'Aplicar',
            'duration_approx_short' => '(aprox.)',
            'date_connector' => 'de',
            
            // Meses abreviados
            'jan_short' => 'Jan', 'feb_short' => 'Fev', 'mar_short' => 'Mar',
            'apr_short' => 'Abr', 'may_short' => 'Mai', 'jun_short' => 'Jun',
            'jul_short' => 'Jul', 'aug_short' => 'Ago', 'sep_short' => 'Set',
            'oct_short' => 'Out', 'nov_short' => 'Nov', 'dec_short' => 'Dez',
            
            // Erros
            'error_api_key' => 'Por favor, configure sua chave API da Viator nas configurações do WordPress.',
            'error_try_again' => 'OPS! Aguarde um instante e tente novamente.',
            'error_product_not_found' => 'Produto não encontrado ou indisponível.',
            'error_fetch_details' => 'Erro ao buscar detalhes do produto. Por favor, tente novamente mais tarde.',
            'product_code_not_provided' => 'Código do passeio/serviço não fornecido.',
            
            // Tipos de informações adicionais
            'stroller_accessible' => 'Acessível para Carrinhos de Bebê',
            'pets_welcome' => 'Animais de Serviço Permitidos',
            'public_transportation_nearby' => 'Transporte Público Próximo',
            'physical_easy' => 'Adequado para Todos os Níveis de Condicionamento Físico',
            'physical_medium' => 'Nível Médio de Atividade Física',
            'physical_moderate' => 'Nível Moderado de Atividade Física',
            'physical_strenuous' => 'Nível Intenso de Atividade Física',
            'wheelchair_accessible' => 'Acessível para Cadeirantes',
            'surfaces_wheelchair_accessible' => 'Superfícies acessíveis para cadeira de rodas',
            'transportation_wheelchair_accessible' => 'Transporte acessível para cadeira de rodas',
            'infant_friendly' => 'Adequado para Bebês',
            'infant_seats_available' => 'Assentos para Bebês Disponíveis',
            'kid_friendly' => 'Adequado para Crianças',
            'senior_friendly' => 'Adequado para Idosos',
            'infants_must_sit_on_laps' => 'Crianças pequenas devem ir no colo',
            'no_pregnant' => 'Não recomendado para grávidas',
            'no_heart_problems' => 'Não recomendado para pessoas com problemas cardíacos ou outras condições médicas graves',
            'no_back_problems' => 'Não recomendado para pessoas com problemas de coluna',
            'health_other' => 'Saúde e outras considerações',
            'pickup_available' => 'Serviço de Transporte Disponível',
            'shopping_opportunity' => 'Oportunidade de Compras',
            'vegetarian_option' => 'Opção Vegetariana Disponível',
            'skip_the_line_info' => 'Acesso Sem Fila',
            'private_tour_info' => 'Tour Privado',
            'group_tour' => 'Tour em Grupo',
            'other_info' => 'Outras informações',
            
            // Tipos de serviços de idioma
            'guide_service' => 'Guia Presencial',
            'written_service' => 'Guia Escrito',
            'audio_service' => 'Áudio Guia',
            
            // Avaliações - traduções para o JavaScript
            'reviews_load_error' => 'Não foi possível carregar as avaliações.',
            'reviews_load_error_generic' => 'Erro ao carregar avaliações.',
            'try_again_later' => 'Tente novamente mais tarde.',
            'no_reviews_found_rating' => 'Nenhuma avaliação encontrada para esta classificação.',
            'no_more_reviews_page' => 'Não há mais avaliações para exibir nesta página.',
            'anonymous_traveler' => 'Viajante anônimo',
            'product_code_copied' => 'Código copiado para a área de transferência!',
            'copy_product_code' => 'Copiar código do produto',
            'code_copied_short' => 'Código copiado!',
            // Traduções em português (Brasil)
            'book_experience' => 'Reservar Experiência',
            'availability' => 'Disponibilidade',
            'travelers' => 'Viajantes',
            'payment' => 'Pagamento',
            'confirmation' => 'Confirmação',
            'select_date_travelers' => 'Selecione a Data e Número de Viajantes',
            'travel_date' => 'Data da Viagem',
            'number_travelers' => 'Número de Viajantes',
            'adults_18_plus' => 'Adultos (18+ anos)',
            'children_3_17' => 'Crianças (3-17 anos)',
            'infants_0_2' => 'Bebês (0-2 anos)',
            'check_availability_btn' => 'Verificar Disponibilidade',
            'continue_payment' => 'Continuar para Pagamento',
            
            // Títulos dinâmicos
            'attractions_activities_title' => 'Excursões, ingressos, atividades e coisas para fazer',
            'attraction_not_found' => 'Atração não encontrada',
            'introduction' => 'Introdução',
            'overview' => 'Visão Geral',
            'opening_hours' => 'Horários de Funcionamento',
            'address' => 'Endereço',
            'free_attraction' => 'Atração Gratuita',
            'free_access' => 'Acesso gratuito disponível',
            'available_tours' => 'Passeios e Ingressos Disponíveis',
            'product_count' => 'Produtos disponíveis',
            'search_products_note' => 'Para ver os passeios e ingressos disponíveis para esta atração, use nossa busca.',
            'process_payment' => 'Processar Pagamento',
            'traveler_information' => 'Informações dos Viajantes',
            'payment_information' => 'Informações de Pagamento',
            'booking_summary' => 'Resumo da Reserva',
            'credit_card' => 'Cartão de Crédito',
            'card_number' => 'Número do Cartão',
            'expiry_month' => 'Mês',
            'expiry_year' => 'Ano',
            'security_code' => 'CVV',
            'cardholder_name' => 'Nome no Cartão',
            'billing_address' => 'Endereço de Cobrança',
            'address' => 'Endereço',
            'city' => 'Cidade',
            'state' => 'Estado',
            'zip_code' => 'CEP',
            'country' => 'País',
            'booking_confirmed' => 'Reserva Confirmada!',
            'booking_success_message' => 'Sua reserva foi processada com sucesso.',
            'back' => 'Voltar',
            'cancel' => 'Cancelar',
            'next' => 'Próximo',
            'first_name' => 'Nome',
            'last_name' => 'Sobrenome',
            'birth_date' => 'Data de Nascimento',
            'gender' => 'Gênero',
            'male' => 'Masculino',
            'female' => 'Feminino',
            'select_option' => 'Selecione',
            'adult' => 'Adulto',
            'child' => 'Criança',
            'infant' => 'Bebê',
            'product' => 'Produto',
            'date' => 'Data',
            'total' => 'Total',
            'available' => 'Disponível!',
            'experience_available' => 'Esta experiência está disponível na data selecionada.',
            'total_price' => 'Preço total',
            'month' => 'Mês',
            'year' => 'Ano',
            'select_date_message' => 'Por favor, selecione uma data de viagem.',
            'fill_traveler_info' => 'Por favor, preencha todas as informações dos viajantes.',
            'fill_payment_info' => 'Por favor, preencha todas as informações de pagamento.',
            'connection_error' => 'Erro de conexão. Tente novamente.',
            'payment_error' => 'Erro no processamento do pagamento',
            'incomplete_data' => 'Dados incompletos',
            'incomplete_payment_data' => 'Dados de pagamento incompletos',
            'incomplete_confirmation_data' => 'Dados incompletos para confirmação',
            'invalid_nonce' => 'Nonce inválido',
            
            // Locations section
            'locations_info' => 'Localizações',
            'location_start' => 'Ponto de Partida',
            'location_end' => 'Ponto Final',
            'location_unspecified' => 'Outros Locais',
            'location_description' => 'Descrição',
            'contact_supplier_later' => 'Entrar em contato com o fornecedor mais tarde',
            'meet_at_departure_point' => 'Encontro no ponto de partida',
            'pickup_point' => 'Ponto de embarque',
            'pickup_hotel' => 'Busca no hotel',
            'meet_at_start_point' => 'Encontro no ponto de partida',
            'attraction_start_point' => 'Ponto de partida da atração',
            'coordinates' => 'Coordenadas',
                    'location_provided_by_supplier' => 'Local informado pelo fornecedor',
        'view_on_maps' => 'Ver no Maps',
        'clear_exchange_rates_cache' => 'Limpar Cache de Taxas de Câmbio',
        'price_unavailable' => 'Preço indisponível',
        'original_currency' => 'moeda original',
    ],
        'en-US' => [
            // Search form
            'search_placeholder' => '🌍 Enter the desired tour name or code',
            'search_button' => 'Search',
            'search_nearby' => 'Nearby',
            
            // Filters
            'when_travel' => 'When do you plan to travel?',
            'choose_date' => 'Choose date',
            'duration' => 'Duration',
            'up_to_one_hour' => 'Up to 1 hour',
            'one_to_four_hours' => '1 to 4 hours',
            'four_hours_to_one_day' => '4 hours to 1 day',
            'one_to_three_days' => '1 to 3 days',
            'more_than_three_days' => 'More than 3 days',
            'price_range' => 'Price Range',
            'rating' => 'Rating',
            'specials' => 'Specials',
            'free_cancellation' => 'Free Cancellation',
            'likely_to_sell_out' => 'Likely to Sell Out',
            'skip_the_line' => 'Skip the Line',
            'private_tour' => 'Private Tour',
            'new_on_viator' => 'New',
            'clear_all' => 'Clear all',
            'filters' => 'Filters',
            
            // Sorting
            'featured' => 'Featured',
            'best_rated' => 'Best Rated',
            'price_low_to_high' => 'Price (Low to High)',
            'price_high_to_low' => 'Price (High to Low)',
            'duration_ascending' => 'Duration (Ascending)',
            'duration_descending' => 'Duration (Descending)',
            'newest_on_viator' => 'New on Viator',
            
            // Results
            'results' => 'results',
            'no_tours_found' => 'No tours found for',
            'no_tours_found_filters' => 'No tours found with selected filters for',
            'try_popular_destinations' => 'How about trying one of these popular destinations?',
            'did_you_know' => 'Did you know?',
            'free_cancellation_note' => 'Free cancellation up to 24 hours before the experience starts (local time)',
            
            // Product cards
            'duration_approx' => '(approx.)',
            'from_price' => 'from',
            'see_details' => 'See details',
            'price_not_available' => 'Price not available',
            'no_reviews' => 'No reviews',
            'review' => 'review',
            'reviews' => 'reviews',
            'special_offer' => 'Special offer',
            
            // Badges
            'free_cancellation_badge' => 'Free cancellation',
            'likely_to_sell_out_badge' => 'Likely to sell out',
            'special_offer_badge' => 'Special offer',
            
            // Duration
            'duration_not_available' => 'Duration not available',
            'flexible' => 'Flexible',
            'minute' => 'minute',
            'minutes' => 'minutes',
            'hour' => 'hour',
            'hours' => 'hours',
            'day' => 'day',
            'days' => 'days',
            'and' => 'and',
            'from' => 'From',
            'to' => 'to',
            'duration_approx' => 'Approximate duration',
            
            // Avaliações - traduções para o JavaScript
            'reviews_load_error' => 'Failed to load reviews.',
            'reviews_load_error_generic' => 'Error loading reviews.',
            'try_again_later' => 'Please try again later.',
            'no_reviews_found_rating' => 'No reviews found for this rating.',
            'no_more_reviews_page' => 'No more reviews to display on this page.',
            'anonymous_traveler' => 'Anonymous Traveler',
            
            // Product page
            'home' => 'Home',
            'product_code' => 'Tour/Service Code',
            'description' => 'Description',
            'included' => 'What\'s Included',
            'not_included' => 'What\'s Not Included',
            'additional_info' => 'Additional Information',
            'cancellation_policy' => 'Cancellation Policy',
            'available_languages' => 'Available Languages',
            'check_availability' => 'Check Availability',
            'price_per_person' => '*Price per person',
            'location' => 'Location',
            'timezone' => 'Timezone',
            'logistics_info' => 'Logistics Information',
            'special_instructions' => 'Special Instructions',
            'you_might_like' => 'You might like',
            'tags' => 'Tags',
            'consult_availability' => 'Check availability',
            'price_per_group' => 'Price per group',
            'price_per_unit' => 'Price per unit (%s)',
            'up_to_travelers' => '(up to %d travelers)',
            'traveler_age_band' => '%s (Age: %d-%d)',
            'min_max_travelers' => 'Min: %d, Max: %d',
            'total_travelers_info' => 'You can select up to %d travelers in total.',
            'traveler_info_title' => 'Traveler Information',
            'infant' => 'Infant',
            'child' => 'Child',
            'youth' => 'Youth',
            'adult' => 'Adult',
            'senior' => 'Senior',
            'traveler' => 'Traveler',
            'boat' => 'Boat',
            
            // Filtros de categoria (Tags da Viator)
            'all_tours' => 'All tours',
            'bus_tours' => 'Bus tours',
            'day_trips' => 'Day trips',
            'nature_wildlife' => 'Nature & wildlife tours',
            'sightseeing_tours' => 'Sightseeing tours',
            'helicopter_tours' => 'Helicopter tours',
            'adventure_tours' => 'Adventure tours',
            'halfday_tours' => 'Half-day tours',
            'private_luxury' => 'Private & luxury',
            'cultural_tours' => 'Cultural tours',
            'evening_tours' => 'Evening tours',
            'dinner_cruises' => 'Dinner cruises',
            'private_tours' => 'Private tours',
            'holidays' => 'Holidays',
            'weddings' => 'Weddings & celebrations',
            'seasonal' => 'Seasonal',
            'christmas' => 'Christmas',
            'easter' => 'Easter',
            'winter' => 'Winter',
            'summer' => 'Summer',
            'concerts' => 'Concerts',
            '4x4_tours' => '4x4 tours',
            'extreme_sports' => 'Extreme sports',
            'afternoon_tours' => 'Afternoon tours',
            'evening_entertainment' => 'Evening entertainment',
            'walking_tours' => 'Walking tours',
            'hot_air_balloon' => 'Hot air balloon rides',
            'boat_tours' => 'Boat tours',
            'shore_excursions' => 'Shore excursions',
            'vehicle' => 'Vehicle',
            'unit_type_vehicle_available' => 'Unit Type Vehicle Available',
            'unit_type_boat_available' => 'Unit Type Boat Available',
            'unit_type_generic_available' => 'Unit Type %s Available',
            
            // Reviews
            'reviews_title' => 'Reviews',
            'all_reviews' => 'All',
            'all_providers' => 'All providers',
            'viator_only' => 'Viator only',
            'tripadvisor_only' => 'TripAdvisor only',
            'review_from' => 'Review from',
            'stars' => 'stars',
            'star' => 'star',
            'most_recent' => 'Most Recent',
            'highest_rating' => 'Highest Rating',
            'most_helpful' => 'Most Helpful',
            'all_languages' => '(all languages)',
            'loading_reviews' => 'Loading reviews...',
            
            // Additional interface elements
            'additional_info' => 'Additional Information',
            'tooltip_support' => 'Quote this code when contacting customer support.',
            'searching' => 'Searching...',
            'please_wait' => 'Please wait...',
            'lets_go_searching' => 'Let\'s go searching!',
            'reset_button' => 'Reset',
            'apply_button' => 'Apply',
            'duration_approx_short' => '(approx.)',
            'date_connector' => '', // Em inglês não usa conector
            
            // Meses abreviados
            'jan_short' => 'Jan', 'feb_short' => 'Feb', 'mar_short' => 'Mar',
            'apr_short' => 'Apr', 'may_short' => 'May', 'jun_short' => 'Jun',
            'jul_short' => 'Jul', 'aug_short' => 'Aug', 'sep_short' => 'Sep',
            'oct_short' => 'Oct', 'nov_short' => 'Nov', 'dec_short' => 'Dec',
            
            // Errors
            'error_api_key' => 'Please configure your Viator API key in WordPress settings.',
            'error_try_again' => 'OOPS! Please wait a moment and try again.',
            'error_product_not_found' => 'Product not found or unavailable.',
            'error_fetch_details' => 'Error fetching product details. Please try again later.',
            'product_code_not_provided' => 'Tour/Service code not provided.',
            
            // Tipos de informações adicionais
            'stroller_accessible' => 'Stroller Accessible',
            'pets_welcome' => 'Pets Welcome',
            'public_transportation_nearby' => 'Public Transportation Nearby',
            'physical_easy' => 'Physically Easy',
            'physical_medium' => 'Medium Physical Activity',
            'physical_moderate' => 'Moderate Physical Activity',
            'physical_strenuous' => 'Intense Physical Activity',
            'wheelchair_accessible' => 'Wheelchair Accessible',
            'surfaces_wheelchair_accessible' => 'Surfaces Wheelchair Accessible',
            'transportation_wheelchair_accessible' => 'Transportation Wheelchair Accessible',
            'infant_friendly' => 'Infant Friendly',
            'infant_seats_available' => 'Infant Seats Available',
            'kid_friendly' => 'Kid Friendly',
            'senior_friendly' => 'Senior Friendly',
            'infants_must_sit_on_laps' => 'Infants Must Sit on Laps',
            'no_pregnant' => 'Not Recommended for Pregnant Women',
            'no_heart_problems' => 'Not Recommended for Heart Patients',
            'no_back_problems' => 'Not Recommended for Back Problems',
            'health_other' => 'Health and Other',
            'pickup_available' => 'Pickup Available',
            'shopping_opportunity' => 'Shopping Opportunity',
            'vegetarian_option' => 'Vegetarian Option',
            'skip_the_line_info' => 'Skip the Line',
            'private_tour_info' => 'Private Tour',
            'group_tour' => 'Group Tour',
            'other_info' => 'Other',
            
            // Tipos de serviços de idioma
            'guide_service' => 'Guided Service',
            'written_service' => 'Written Guide',
            'audio_service' => 'Audio Guide',
            
            // Avaliações - traduções para o JavaScript
            'reviews_load_error' => 'Failed to load reviews.',
            'reviews_load_error_generic' => 'Error loading reviews.',
            'try_again_later' => 'Please try again later.',
            'no_reviews_found_rating' => 'No reviews found for this rating.',
            'no_more_reviews_page' => 'No more reviews to display on this page.',
            'anonymous_traveler' => 'Anonymous Traveler',
            'product_code_copied' => 'Code copied to clipboard!',
            'copy_product_code' => 'Copy product code',
            'code_copied_short' => 'Code copied!',
            // Traduções em inglês
            'book_experience' => 'Book Experience',
            'availability' => 'Availability',
            'travelers' => 'Travelers',
            'payment' => 'Payment',
            'confirmation' => 'Confirmation',
            'select_date_travelers' => 'Select Date and Number of Travelers',
            'travel_date' => 'Travel Date',
            'number_travelers' => 'Number of Travelers',
            'adults_18_plus' => 'Adults (18+ years)',
            'children_3_17' => 'Children (3-17 years)',
            'infants_0_2' => 'Infants (0-2 years)',
            'check_availability_btn' => 'Check Availability',
            'continue_payment' => 'Continue to Payment',
            
            // Títulos dinâmicos
            'attractions_activities_title' => 'Tours, tickets, activities and things to do',
        'attraction_not_found' => 'Attraction not found',
        'introduction' => 'Introduction',
        'overview' => 'Overview',
        'opening_hours' => 'Opening Hours',
        'address' => 'Address',
        'free_attraction' => 'Free Attraction',
        'free_access' => 'Free access available',
        'available_tours' => 'Available Tours and Tickets',
        'product_count' => 'Available products',
        'search_products_note' => 'To see the tours and tickets available for this attraction, use our search.',
            
            'process_payment' => 'Process Payment',
            'traveler_information' => 'Traveler Information',
            'payment_information' => 'Payment Information',
            'booking_summary' => 'Booking Summary',
            'credit_card' => 'Credit Card',
            'card_number' => 'Card Number',
            'expiry_month' => 'Month',
            'expiry_year' => 'Year',
            'security_code' => 'CVV',
            'cardholder_name' => 'Cardholder Name',
            'billing_address' => 'Billing Address',
            'address' => 'Address',
            'city' => 'City',
            'state' => 'State',
            'zip_code' => 'ZIP Code',
            'country' => 'Country',
            'booking_confirmed' => 'Booking Confirmed!',
            'booking_success_message' => 'Your booking has been processed successfully.',
            'back' => 'Back',
            'cancel' => 'Cancel',
            'next' => 'Next',
            'first_name' => 'First Name',
            'last_name' => 'Last Name',
            'birth_date' => 'Birth Date',
            'gender' => 'Gender',
            'male' => 'Male',
            'female' => 'Female',
            'select_option' => 'Select',
            'adult' => 'Adult',
            'child' => 'Child',
            'infant' => 'Infant',
            'product' => 'Product',
            'date' => 'Date',
            'total' => 'Total',
            'available' => 'Available!',
            'experience_available' => 'This experience is available on the selected date.',
            'total_price' => 'Total price',
            'month' => 'Month',
            'year' => 'Year',
            'select_date_message' => 'Please select a travel date.',
            'fill_traveler_info' => 'Please fill in all traveler information.',
            'fill_payment_info' => 'Please fill in all payment information.',
            'connection_error' => 'Connection error. Please try again.',
            'payment_error' => 'Payment processing error',
            'incomplete_data' => 'Incomplete data',
            'incomplete_payment_data' => 'Incomplete payment data',
            'incomplete_confirmation_data' => 'Incomplete data for confirmation',
            'invalid_nonce' => 'Invalid nonce',
            
            // Locations section
            'locations_info' => 'Locations',
            'location_start' => 'Departure Point',
            'location_end' => 'End Point',
            'location_unspecified' => 'Other Locations',
            'location_description' => 'Description',
            'contact_supplier_later' => 'Contact supplier later',
            'meet_at_departure_point' => 'Meet at departure point',
            'pickup_point' => 'Pickup point',
            'pickup_hotel' => 'Hotel pickup',
            'meet_at_start_point' => 'Meet at start point',
            'attraction_start_point' => 'Attraction start point',
            'coordinates' => 'Coordinates',
                    'location_provided_by_supplier' => 'Location provided by supplier',
        'view_on_maps' => 'View on Maps',
        'clear_exchange_rates_cache' => 'Clear Exchange Rates Cache',
        'price_unavailable' => 'Price unavailable',
        'original_currency' => 'original currency',
    ]
];

// Fallback para idiomas não suportados - usar inglês
if (!isset($translations[$language])) {
    $language = 'en-US';
}

return isset($translations[$language][$key]) ? $translations[$language][$key] : $key;
}

// Função auxiliar para obter traduções
function viator_t($key, $language = null) {
    return viator_get_translation($key, $language);
}

// Função para extrair categorias dinâmicas dos produtos retornados
function viator_extract_dynamic_categories($products, $language = null) {
    if (empty($products) || !isset($products['results'])) {
        return [];
    }
    
    $category_counts = [];
    $excluded_tags = [
        // Tags de qualidade que não são categorias
        21972, 22143, 21074, 6226, 21971, 11940,
        // Tags de recursos específicos
        11283, 19089, 9176, 21949, 21956, 21955,
        // Tags de público-alvo específico
        18884, 11919, 20222,
        // Tags de medidas de segurança
        21953, 21958, 21956, 21951, 21955, 21949, 21959, 21954, 21948, 21950
    ];
    
         // Mapear tags para nomes de categoria (baseado na documentação da Viator)
     $tag_category_map = [
         // Categorias principais baseadas na documentação
         11930 => ['key' => 'bus_tours', 'name_pt' => 'Passeios de ônibus', 'name_en' => 'Bus tours'],
         13018 => ['key' => 'bike_tours', 'name_pt' => 'Passeios de bicicleta', 'name_en' => 'Bike tours'],
         21725 => ['key' => 'sightseeing_tours', 'name_pt' => 'Passeios turísticos', 'name_en' => 'Sightseeing tours'],
         11922 => ['key' => 'day_trips', 'name_pt' => 'Excursões de um dia', 'name_en' => 'Day trips'],
         21909 => ['key' => 'nature_wildlife', 'name_pt' => 'Excursões pela natureza e vida selvagem', 'name_en' => 'Nature & wildlife tours'],
         12026 => ['key' => 'helicopter_tours', 'name_pt' => 'Passeios de helicóptero', 'name_en' => 'Helicopter tours'],
         22046 => ['key' => 'adventure_tours', 'name_pt' => 'Excursões de aventura', 'name_en' => 'Adventure tours'],
         18953 => ['key' => 'halfday_tours', 'name_pt' => 'Excursões de meio dia', 'name_en' => 'Half-day tours'],
         21913 => ['key' => 'cultural_tours', 'name_pt' => 'Excursões culturais', 'name_en' => 'Cultural tours'],
         21765 => ['key' => 'shows', 'name_pt' => 'Shows', 'name_en' => 'Shows'],
         21701 => ['key' => 'cruises_sailing', 'name_pt' => 'Cruzeiros e navegação', 'name_en' => 'Cruises & sailing'],
                  21911 => ['key' => 'food_drink', 'name_pt' => 'Gastronomia', 'name_en' => 'Food & drink'],
          
          // Categorias específicas observadas em diferentes destinos
          11965 => ['key' => 'dinner_cruises', 'name_pt' => 'Cruzeiros com jantar', 'name_en' => 'Dinner cruises'],
          12053 => ['key' => 'concerts', 'name_pt' => 'Concertos', 'name_en' => 'Concerts'],
          13040 => ['key' => '4x4_tours', 'name_pt' => 'Passeios de 4x4', 'name_en' => '4x4 tours'],
          21074 => ['key' => 'private_luxury', 'name_pt' => 'Particular e de luxo', 'name_en' => 'Private & luxury'],
          11938 => ['key' => 'extreme_sports', 'name_pt' => 'Esportes radicais', 'name_en' => 'Extreme sports'],
          
          // Categorias de tempo (observadas na documentação)
          13121 => ['key' => 'evening_tours', 'name_pt' => 'Excursões noturnas', 'name_en' => 'Evening tours'],
          18953 => ['key' => 'halfday_tours', 'name_pt' => 'Excursões de meio dia', 'name_en' => 'Half-day tours'],
         
         // Tags da hierarquia mostrada na imagem
         21584 => ['key' => 'holidays', 'name_pt' => 'Feriados', 'name_en' => 'Holidays'],
         21593 => ['key' => 'weddings', 'name_pt' => 'Casamentos e celebrações', 'name_en' => 'Weddings & celebrations'],
         21592 => ['key' => 'seasonal', 'name_pt' => 'Sazonal', 'name_en' => 'Seasonal'],
         11892 => ['key' => 'christmas', 'name_pt' => 'Natal', 'name_en' => 'Christmas'],
         11957 => ['key' => 'easter', 'name_pt' => 'Páscoa', 'name_en' => 'Easter'],
         21590 => ['key' => 'winter', 'name_pt' => 'Inverno', 'name_en' => 'Winter'],
         21588 => ['key' => 'summer', 'name_pt' => 'Verão', 'name_en' => 'Summer'],
         
         // Categorias de transporte e modalidades
         13015 => ['key' => 'walking_tours', 'name_pt' => 'Caminhadas', 'name_en' => 'Walking tours'],
         12027 => ['key' => 'hot_air_balloon', 'name_pt' => 'Passeios de balão', 'name_en' => 'Hot air balloon rides'],
         11933 => ['key' => 'boat_tours', 'name_pt' => 'Passeios de barco', 'name_en' => 'Boat tours'],
         11960 => ['key' => 'shore_excursions', 'name_pt' => 'Excursões costeiras', 'name_en' => 'Shore excursions'],
     ];
    
    // Coleta todos os tags dos produtos
    foreach ($products['results'] as $product) {
        if (isset($product['tags']) && is_array($product['tags'])) {
            foreach ($product['tags'] as $tag) {
                if (!in_array($tag, $excluded_tags) && isset($tag_category_map[$tag])) {
                    $category_info = $tag_category_map[$tag];
                    $category_key = $category_info['key'];
                    
                    if (!isset($category_counts[$category_key])) {
                        $category_counts[$category_key] = [
                            'tag_id' => $tag,
                            'key' => $category_key,
                            'name_pt' => $category_info['name_pt'],
                            'name_en' => $category_info['name_en'],
                            'count' => 0
                        ];
                    }
                    $category_counts[$category_key]['count']++;
                }
            }
        }
    }
    
    // Filtrar categorias com pelo menos 1 produto e ordenar por relevância
    $filtered_categories = array_filter($category_counts, function($category) {
        return $category['count'] >= 1;
    });
    
    // Ordenar por contagem (categorias com mais produtos primeiro)
    uasort($filtered_categories, function($a, $b) {
        return $b['count'] - $a['count'];
    });
    
    // Limitar a 12 categorias para mostrar mais opções sem sobrecarregar o UI
    $final_categories = array_slice($filtered_categories, 0, 12, true);
    
    viator_debug_log('Categorias dinâmicas extraídas:', [
        'total_produtos' => count($products['results']),
        'categorias_encontradas' => count($category_counts),
        'categorias_filtradas' => count($filtered_categories),
        'categorias_finais' => count($final_categories),
        'categorias_detalhes' => $final_categories
    ]);
    
    return $final_categories;
}

// Função para gerar HTML do carrossel de categorias dinâmico
function viator_generate_dynamic_category_carousel($categories, $language = null) {
    if (empty($categories)) {
        return viator_generate_fallback_category_carousel($language);
    }
    
    $current_category = isset($_GET['category_tag']) ? $_GET['category_tag'] : '';
    $locale_settings = viator_get_locale_settings();
    $current_language = $locale_settings['language'];
    
    $html = '<div class="viator-category-filters-container">
                <div class="viator-category-filters-swiper swiper">
                    <div class="swiper-wrapper">
                        <!-- Todos os produtos -->
                        <div class="swiper-slide">
                            <button class="viator-category-btn' . (empty($current_category) ? ' active' : '') . '" data-tag="" data-label="' . esc_attr(viator_t('all_tours')) . '">
                                ' . esc_html(viator_t('all_tours')) . '
                            </button>
                        </div>';
    
    foreach ($categories as $category) {
        $tag_id = $category['tag_id'];
        $name = ($current_language === 'pt-BR') ? $category['name_pt'] : $category['name_en'];
        $is_active = ($current_category == $tag_id) ? ' active' : '';
        
        $html .= '<div class="swiper-slide">
                    <button class="viator-category-btn' . $is_active . '" data-tag="' . esc_attr($tag_id) . '" data-label="' . esc_attr($name) . '">
                        ' . esc_html($name) . '
                    </button>
                  </div>';
    }
    
    $html .= '    </div>
                </div>
                <div class="viator-category-nav-prev">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
                </div>
                <div class="viator-category-nav-next">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
            </div>';
    
    return $html;
}

// Função para gerar carrossel de fallback quando não há produtos suficientes
function viator_generate_fallback_category_carousel($language = null) {
    $current_category = isset($_GET['category_tag']) ? $_GET['category_tag'] : '';
    
    // Categorias populares como fallback
    $fallback_categories = [
        ['tag' => '11930', 'key' => 'bus_tours'],
        ['tag' => '21725', 'key' => 'sightseeing_tours'],
        ['tag' => '11922', 'key' => 'day_trips'],
        ['tag' => '12026', 'key' => 'helicopter_tours'],
        ['tag' => '22046', 'key' => 'adventure_tours'],
        ['tag' => '21909', 'key' => 'nature_wildlife'],
    ];
    
    $html = '<div class="viator-category-filters-container">
                <div class="viator-category-filters-swiper swiper">
                    <div class="swiper-wrapper">
                        <!-- Todos os produtos -->
                        <div class="swiper-slide">
                            <button class="viator-category-btn' . (empty($current_category) ? ' active' : '') . '" data-tag="" data-label="' . esc_attr(viator_t('all_tours')) . '">
                                ' . esc_html(viator_t('all_tours')) . '
                            </button>
                        </div>';
    
    foreach ($fallback_categories as $category) {
        $tag_id = $category['tag'];
        $category_key = $category['key'];
        $is_active = ($current_category == $tag_id) ? ' active' : '';
        
        $html .= '<div class="swiper-slide">
                    <button class="viator-category-btn' . $is_active . '" data-tag="' . esc_attr($tag_id) . '" data-label="' . esc_attr(viator_t($category_key)) . '">
                        ' . esc_html(viator_t($category_key)) . '
                    </button>
                  </div>';
    }
    
    $html .= '    </div>
                </div>
                <div class="viator-category-nav-prev">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
                </div>
                <div class="viator-category-nav-next">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
            </div>';
    
    return $html;
}

// Função para formatar duração com traduções
function viator_format_duration($duration_fixed, $duration_from = null, $duration_to = null, $unstructured_duration = null) {
    if ($duration_fixed === 0) {
        return viator_t('flexible');
    } elseif ($unstructured_duration !== null) {
        return !empty($unstructured_duration) ? $unstructured_duration : '1 ' . viator_t('hour');
    } elseif ($duration_fixed !== null) {
        if ($duration_fixed >= 1440) { // 24 horas = 1440 minutos
            $days = floor($duration_fixed / 1440);
            $remaining_minutes = $duration_fixed % 1440;
            $hours = floor($remaining_minutes / 60);
            
            $duration = $days . ' ' . ($days != 1 ? viator_t('days') : viator_t('day'));
            if ($hours > 0) {
                $duration .= ' ' . viator_t('and') . ' ' . $hours . ' ' . ($hours != 1 ? viator_t('hours') : viator_t('hour'));
            }
            return $duration;
        } elseif ($duration_fixed < 60) {
            return $duration_fixed . ' ' . viator_t('minutes');
        } else {
            $hours = floor($duration_fixed / 60);
            $minutes = $duration_fixed % 60;
            $duration = $hours . ' ' . ($hours != 1 ? viator_t('hours') : viator_t('hour'));
            if ($minutes > 0) {
                $duration .= ' ' . viator_t('and') . ' ' . $minutes . ' ' . ($minutes != 1 ? viator_t('minutes') : viator_t('minute'));
            }
            return $duration;
        }
    } elseif ($duration_from !== null && $duration_to !== null) {
        // Duração variável
        if ($duration_to >= 1440) {
            $days_from = floor($duration_from / 1440);
            $days_to = floor($duration_to / 1440);
            
            if ($days_from == $days_to) {
                return $days_from . ' ' . ($days_from != 1 ? viator_t('days') : viator_t('day'));
            } else {
                return viator_t('from') . ' ' . $days_from . ' ' . viator_t('to') . ' ' . $days_to . ' ' . ($days_to != 1 ? viator_t('days') : viator_t('day'));
            }
        } elseif ($duration_to < 60) {
            if ($duration_from < 60 && $duration_to < 60) {
                return viator_t('from') . ' ' . $duration_from . ' ' . viator_t('to') . ' ' . $duration_to . ' ' . ($duration_to != 1 ? viator_t('minutes') : viator_t('minute'));
            } else {
                return viator_t('from') . ' ' . $duration_from . ' ' . ($duration_from != 1 ? viator_t('minutes') : viator_t('minute')) . 
                       ' ' . viator_t('to') . ' ' . $duration_to . ' ' . ($duration_to != 1 ? viator_t('minutes') : viator_t('minute'));
            }
        } else {
            $is_from_multiple_of_60 = ($duration_from % 60 === 0);
            $is_to_multiple_of_60 = ($duration_to % 60 === 0);

            if ($is_from_multiple_of_60 && $is_to_multiple_of_60) {
                $hours_from = floor($duration_from / 60);
                $hours_to = floor($duration_to / 60);
                return viator_t('from') . ' ' . $hours_from . ' ' . viator_t('to') . ' ' . $hours_to . ' ' . ($hours_to != 1 ? viator_t('hours') : viator_t('hour'));
            } else {
                // Formatação complexa para horas e minutos
                if ($duration_from < 60) {
                    $duration_from_formatted = $duration_from . ' ' . ($duration_from != 1 ? viator_t('minutes') : viator_t('minute'));
                } else {
                    $hours_from = floor($duration_from / 60);
                    $minutes_from = $duration_from % 60;
                    $duration_from_formatted = $hours_from . ' ' . ($hours_from != 1 ? viator_t('hours') : viator_t('hour'));
                    if ($minutes_from > 0) {
                        $duration_from_formatted .= ' ' . viator_t('and') . ' ' . $minutes_from . ' ' . ($minutes_from != 1 ? viator_t('minutes') : viator_t('minute'));
                    }
                }

                if ($duration_to < 60) {
                    $duration_to_formatted = $duration_to . ' ' . ($duration_to != 1 ? viator_t('minutes') : viator_t('minute'));
                } else {
                    $hours_to = floor($duration_to / 60);
                    $minutes_to = $duration_to % 60;
                    $duration_to_formatted = $hours_to . ' ' . ($hours_to != 1 ? viator_t('hours') : viator_t('hour'));
                    if ($minutes_to > 0) {
                        $duration_to_formatted .= ' ' . viator_t('and') . ' ' . $minutes_to . ' ' . ($minutes_to != 1 ? viator_t('minutes') : viator_t('minute'));
                    }
                }

                return viator_t('from') . ' ' . $duration_from_formatted . ' ' . viator_t('to') . ' ' . $duration_to_formatted;
            }
        }
    } else {
        return viator_t('duration_not_available');
    }
}

// Função para garantir que a descrição está completa
function viator_ensure_complete_description($description, $attraction_name, $location, $language) {
    $last_char = substr($description, -1);
    $last_word = substr($description, strrpos($description, ' ') + 1);
    
    // Verificar se termina com pontuação adequada
    $ending_punctuation = ['.', '!', '?'];
    $has_proper_ending = in_array($last_char, $ending_punctuation);
    
    // Verificar se a última palavra parece incompleta (muito curta ou com caracteres estranhos)
    $seems_incomplete = strlen($last_word) < 3 && !$has_proper_ending;
    
    // Detectar palavras cortadas no meio (sem vogais ou caracteres incompletos)
    $incomplete_patterns = [
        '/\b\w{1,2}$/',  // Palavras muito curtas no final
        '/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]{3,}$/',  // Sequência de consoantes no final
        '/\w+[^a-záàâãéèêíìîóòôõúùûçñüA-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇÑÜ\s\.\!\?]$/'  // Caracteres estranhos no final
    ];
    
    $has_incomplete_word = false;
    foreach ($incomplete_patterns as $pattern) {
        if (preg_match($pattern, $description)) {
            $has_incomplete_word = true;
            break;
        }
    }
    
    if (!$has_proper_ending || $seems_incomplete || $has_incomplete_word) {
        viator_debug_log('Descrição parece incompleta, tentando corrigir:', $description);
        
        // Tentar remover a última palavra incompleta e adicionar ponto final
        $words = explode(' ', trim($description));
        if (count($words) > 1) {
            $last_word = end($words);
            
            // Remove a última palavra se parecer incompleta
            if (!$has_proper_ending && (strlen($last_word) < 4 || $has_incomplete_word)) {
                array_pop($words);
                $description = implode(' ', $words);
            }
            
            // Garantir que termina com ponto
            $last_char = substr($description, -1);
            if (!in_array($last_char, $ending_punctuation)) {
                $description .= '.';
            }
        }
        
        viator_debug_log('Descrição corrigida:', $description);
    }
    
    return $description;
}

// Função para garantir que textos curtos estão completos (para curiosidades)
function viator_ensure_complete_text($text) {
    $last_char = substr($text, -1);
    $ending_punctuation = ['.', '!', '?'];
    $has_proper_ending = in_array($last_char, $ending_punctuation);
    
    // Verificar se a última palavra parece incompleta
    $words = explode(' ', trim($text));
    $last_word = end($words);
    
    // Padrões que indicam texto incompleto
    $incomplete_patterns = [
        '/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]{3,}$/',  // Muitas consoantes seguidas
        '/\w+[^a-záàâãéèêíìîóòôõúùûçñüA-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇÑÜ\s\.\!\?]$/'  // Caracteres estranhos
    ];
    
    $seems_incomplete = false;
    foreach ($incomplete_patterns as $pattern) {
        if (preg_match($pattern, $text)) {
            $seems_incomplete = true;
            break;
        }
    }
    
    // Se parece incompleto ou não tem pontuação final adequada
    if (!$has_proper_ending || $seems_incomplete || (strlen($last_word) < 3 && !$has_proper_ending)) {
        viator_debug_log('Texto parece incompleto:', $text);
        
        // Remover última palavra se parecer incompleta
        if (count($words) > 1 && (strlen($last_word) < 3 || $seems_incomplete)) {
            array_pop($words);
            $text = implode(' ', $words);
        }
        
        // Garantir ponto final
        if (!in_array(substr($text, -1), $ending_punctuation)) {
            $text .= '.';
        }
        
        viator_debug_log('Texto corrigido:', $text);
    }
    
    return $text;
}

// Função para gerar curiosidades usando a API do Groq
function viator_get_groq_curiosity($searchTerm) {
    $groq_api_key = get_option('viator_groq_api_key');
    
    // Se não houver chave da API do Groq, usar curiosidades padrão
    if (empty($groq_api_key)) {
        return viator_get_fallback_curiosity();
    }
    
    // Configurar o idioma para o prompt baseado na configuração
    $locale_settings = viator_get_locale_settings();
    $language = $locale_settings['language'];
    
    $language_prompts = [
        'pt-BR' => "Gere uma curiosidade interessante e envolvente sobre {$searchTerm} em português brasileiro. A curiosidade deve ser educativa, factual e despertar o interesse turístico. Mantenha entre 40-60 palavras. Não use aspas ou formatação especial.",
        'en-US' => "Generate an interesting and engaging curiosity about {$searchTerm} in English. The curiosity should be educational, factual and spark tourist interest. Keep it between 40-60 words. Don't use quotes or special formatting."
    ];
    
    $prompt = isset($language_prompts[$language]) ? $language_prompts[$language] : $language_prompts['pt-BR'];
    
    // Obter modelo selecionado nas configurações
    $selected_model = get_option('viator_groq_model', 'llama-3.1-8b-instant');
    
    // Preparar dados para a API do Groq
    $data = [
        'messages' => [
            [
                'role' => 'user',
                'content' => $prompt
            ]
        ],
        'model' => $selected_model,
        'temperature' => 0.7,
        'max_tokens' => 120,
        'top_p' => 1,
        'stream' => false
    ];
    
    // Fazer requisição para a API do Groq
    $response = wp_remote_post('https://api.groq.com/openai/v1/chat/completions', [
        'headers' => [
            'Authorization' => 'Bearer ' . $groq_api_key,
            'Content-Type' => 'application/json'
        ],
        'body' => json_encode($data),
        'timeout' => 30
    ]);
    
    // Verificar se a requisição foi bem-sucedida
    if (is_wp_error($response)) {
        error_log('Erro na requisição Groq: ' . $response->get_error_message());
        return viator_get_fallback_curiosity();
    }
    
    $response_code = wp_remote_retrieve_response_code($response);
    if ($response_code !== 200) {
        error_log('Erro na API Groq - Código: ' . $response_code);
        return viator_get_fallback_curiosity();
    }
    
    $body = wp_remote_retrieve_body($response);
    $groq_data = json_decode($body, true);
    
    // Extrair a curiosidade da resposta
    if (isset($groq_data['choices'][0]['message']['content'])) {
        $curiosity = trim($groq_data['choices'][0]['message']['content']);
        
        // Limpar a resposta removendo aspas e formatação desnecessária
        $curiosity = str_replace(['"', "'", '**', '*'], '', $curiosity);
        $curiosity = preg_replace('/^(Curiosidade:|Did you know\?)/i', '', $curiosity);
        $curiosity = trim($curiosity);
        
        // Verificar se a curiosidade está completa
        $curiosity = viator_ensure_complete_text($curiosity);
        
        // Limitar o tamanho se necessário
                if (str_word_count($curiosity) > 70) {
            $curiosity = wp_trim_words($curiosity, 60, '.');
        }
        
        // Comentário removido: Log de debug do modelo IA para evitar poluição dos logs
        return $curiosity;
    }
    
    // Se não conseguir extrair a curiosidade, usar fallback
    error_log('Não foi possível extrair curiosidade da resposta Groq');
    return viator_get_fallback_curiosity();
}

// Função para curiosidades padrão (fallback)
function viator_get_fallback_curiosity() {
    $locale_settings = viator_get_locale_settings();
    $language = $locale_settings['language'];
    
    if ($language === 'pt-BR') {
        $facts = [
            "Você sabia que esta é uma das regiões mais visitadas pelos turistas?",
            "Este destino oferece experiências únicas durante todo o ano!",
            "A cultura local é rica em tradições e histórias fascinantes.",
            "Os visitantes costumam se surpreender com a hospitalidade local.",
            "Este lugar possui uma gastronomia única que encanta turistas do mundo todo.",
            "A arquitetura local reflete séculos de história e influências culturais diversas.",
            "Muitos festivais tradicionais acontecem aqui, celebrando a rica herança cultural.",
            "A natureza exuberante desta região oferece paisagens de tirar o fôlego.",
            "Artesãos locais preservam técnicas ancestrais passadas de geração em geração.",
            "Este destino é conhecido por suas tradições musicais e danças folclóricas únicas.",
            "A vida noturna local oferece uma mistura perfeita entre tradição e modernidade.",
            "Mercados locais são verdadeiros tesouros onde se encontram produtos autênticos da região."
        ];
    } elseif ($language === 'en-US') {
        $facts = [
            "Did you know this is one of the most visited regions by tourists?",
            "This destination offers unique experiences throughout the year!",
            "The local culture is rich in fascinating traditions and stories.",
            "Visitors are often surprised by the local hospitality.",
            "This place has a unique cuisine that delights tourists from around the world.",
            "The local architecture reflects centuries of history and diverse cultural influences.",
            "Many traditional festivals take place here, celebrating the rich cultural heritage.",
            "The lush nature of this region offers breathtaking landscapes.",
            "Local artisans preserve ancestral techniques passed down through generations.",
            "This destination is known for its unique musical traditions and folk dances.",
            "The local nightlife offers a perfect blend of tradition and modernity.",
            "Local markets are true treasures where you can find authentic regional products."
        ];
    } else {
        // Fallback para outros idiomas não suportados - usar inglês
        $facts = [
            "Did you know this is one of the most visited regions by tourists?",
            "This destination offers unique experiences throughout the year!",
            "The local culture is rich in fascinating traditions and stories.",
            "Visitors are often surprised by the local hospitality.",
            "This place has a unique cuisine that delights tourists from around the world.",
            "The local architecture reflects centuries of history and diverse cultural influences.",
            "Many traditional festivals take place here, celebrating the rich cultural heritage.",
            "The lush nature of this region offers breathtaking landscapes.",
            "Local artisans preserve ancestral techniques passed down through generations.",
            "This destination is known for its unique musical traditions and folk dances.",
            "The local nightlife offers a perfect blend of tradition and modernity.",
            "Local markets are true treasures where you can find authentic regional products."
        ];
    }
    
    return $facts[array_rand($facts)];
}

// Incluir o sistema de booking
require_once plugin_dir_path(__FILE__) . 'viator-booking.php';

/**
 * Enqueue scripts and styles for booking system
 */
function viator_enqueue_booking_scripts() {
    // Enqueue booking scripts only on pages with product details
    if (is_page() || is_single()) {
        // Enqueue Viator Payment Library first
        wp_enqueue_script(
            'viator-payment-lib',
            'https://checkout-assets.payments.tamg.cloud/stable/v2/payment.js',
            array(),
            null,
            true
        );
        
        // Adicionar o atributo type="module" ao script da Viator
        add_filter('script_loader_tag', function($tag, $handle, $src) {
            if ($handle === 'viator-payment-lib') {
                return '<script type="module" src="' . esc_url($src) . '"></script>' . "\n";
            }
            return $tag;
        }, 10, 3);
        

    }
}
add_action('wp_enqueue_scripts', 'viator_enqueue_booking_scripts');

// Include debug functionality for admin users
if (is_admin()) {
    include_once(plugin_dir_path(__FILE__) . 'admin-debug.php');
}

// Função para selecionar a melhor imagem disponível
function viator_get_best_attraction_image($images) {
    if (empty($images) || !is_array($images)) {
        return '';
    }
    
    $best_image = '';
    $max_resolution = 0;
    
    foreach ($images as $image) {
        // Verificar se há URL direta da imagem
        if (isset($image['url'])) {
            $url = $image['url'];
            $width = isset($image['width']) ? $image['width'] : 800;
            $height = isset($image['height']) ? $image['height'] : 600;
            $resolution = $width * $height;
            
            if ($resolution > $max_resolution) {
                $max_resolution = $resolution;
                $best_image = $url;
            }
        }
        
        // Verificar variantes da imagem
        if (isset($image['variants']) && is_array($image['variants'])) {
            foreach ($image['variants'] as $variant) {
                if (isset($variant['url'])) {
                    $url = $variant['url'];
                    $width = isset($variant['width']) ? $variant['width'] : 800;
                    $height = isset($variant['height']) ? $variant['height'] : 600;
                    $resolution = $width * $height;
                    
                    if ($resolution > $max_resolution) {
                        $max_resolution = $resolution;
                        $best_image = $url;
                    }
                }
            }
        }
    }
    
    return $best_image;
}

// Função para buscar detalhes de uma atração específica
function viator_get_attraction_details($attraction_id) {
    $api_key = get_option('viator_api_key');
    
    if (empty($api_key)) {
        return false;
    }
    
    // Obter configurações de idioma e moeda
    $locale_settings = viator_get_locale_settings();
    
    $url = "https://api.sandbox.viator.com/partner/attractions/$attraction_id";
    
    // Cabeçalhos da requisição
    $headers = [
        'Accept-Language' => $locale_settings['accept_language'],
        'Accept' => 'application/json;version=2.0',
        'exp-api-key' => $api_key
    ];
    
    // Configurar argumentos da requisição
    $args = [
        'method' => 'GET',
        'headers' => $headers,
        'timeout' => 30
    ];
    
    viator_debug_log('Fazendo requisição para detalhes da atração:', $url);
    viator_debug_log('Headers da requisição:', $headers);
    
    // Fazer a requisição
    $response = wp_remote_request($url, $args);
    
    if (is_wp_error($response)) {
        viator_debug_log('Erro na requisição de detalhes da atração:', $response->get_error_message());
        return false;
    }
    
    $response_code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);
    
    viator_debug_log('Código de resposta para detalhes da atração:', $response_code);
    viator_debug_log('Corpo da resposta para detalhes da atração (primeiros 500 chars):', substr($body, 0, 500));
    
    if ($response_code !== 200) {
        viator_debug_log('Erro HTTP ao buscar detalhes da atração:', [
            'response_code' => $response_code,
            'body' => $body
        ]);
        return false;
    }
    
    $data = json_decode($body, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        viator_debug_log('Erro ao decodificar JSON dos detalhes da atração:', [
            'error' => json_last_error_msg(),
            'body' => $body
        ]);
        return false;
    }
    
    viator_debug_log('Dados da atração decodificados com sucesso:', !empty($data));
    
    return $data;
}

// Função para buscar dados dos destinos da API
function viator_get_destinations_data() {
    // Verificar cache primeiro
    $cached_destinations = get_transient('viator_destinations_data');
    if ($cached_destinations !== false) {
        return $cached_destinations;
    }
    
    $api_key = get_option('viator_api_key');
    
    if (empty($api_key)) {
        return false;
    }
    
    // Obter configurações de idioma
    $locale_settings = viator_get_locale_settings();
    
    $url = "https://api.sandbox.viator.com/partner/destinations";
    
    // Cabeçalhos da requisição
    $headers = [
        'Accept-Language' => $locale_settings['accept_language'],
        'Accept' => 'application/json;version=2.0',
        'exp-api-key' => $api_key
    ];
    
    // Configurar argumentos da requisição
    $args = [
        'method' => 'GET',
        'headers' => $headers,
        'timeout' => 30
    ];
    
    viator_debug_log('Fazendo requisição para dados de destinos:', $url);
    
    // Fazer a requisição
    $response = wp_remote_request($url, $args);
    
    if (is_wp_error($response)) {
        viator_debug_log('Erro na requisição de destinos:', $response->get_error_message());
        return false;
    }
    
    $response_code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);
    
    if ($response_code !== 200) {
        viator_debug_log('Erro HTTP ao buscar destinos:', [
            'response_code' => $response_code,
            'body' => substr($body, 0, 500)
        ]);
        return false;
    }
    
    $data = json_decode($body, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        viator_debug_log('Erro ao decodificar JSON dos destinos:', json_last_error_msg());
        return false;
    }
    
    // Indexar destinos por ID para acesso rápido
    $destinations_indexed = [];
    if (isset($data['destinations']) && is_array($data['destinations'])) {
        foreach ($data['destinations'] as $destination) {
            if (isset($destination['destinationId'])) {
                $destinations_indexed[$destination['destinationId']] = $destination;
            }
        }
    }
    
    // Cachear por 7 dias (conforme recomendação da API)
    set_transient('viator_destinations_data', $destinations_indexed, 7 * DAY_IN_SECONDS);
    
    viator_debug_log('Destinos obtidos e cacheados:', count($destinations_indexed) . ' destinos');
    
    return $destinations_indexed;
}

// Função para obter informações detalhadas de um destino
function viator_get_destination_info($destination_id) {
    $destinations_data = viator_get_destinations_data();
    
    if (!$destinations_data || !isset($destinations_data[$destination_id])) {
        return null;
    }
    
    return $destinations_data[$destination_id];
}

// Função para processar coordenadas e criar informações de localização
function viator_get_location_info($attraction_data) {
    $location_info = [
        'destinations' => [],
        'coordinates' => null,
        'main_destination' => null
    ];
    
    // Processar destinos
    if (isset($attraction_data['destinations']) && !empty($attraction_data['destinations'])) {
        foreach ($attraction_data['destinations'] as $destination_ref) {
            if (isset($destination_ref['id'])) {
                $destination_details = viator_get_destination_info($destination_ref['id']);
                
                if ($destination_details) {
                    $destination_info = [
                        'id' => $destination_ref['id'],
                        'name' => $destination_details['name'] ?? '',
                        'type' => $destination_details['type'] ?? '',
                        'is_primary' => isset($destination_ref['primary']) ? $destination_ref['primary'] : false,
                        'parent_id' => $destination_details['parentDestinationId'] ?? null,
                        'timezone' => $destination_details['timeZone'] ?? null,
                        'currency' => $destination_details['defaultCurrencyCode'] ?? null,
                        'country_code' => $destination_details['countryCallingCode'] ?? null,
                        'languages' => $destination_details['languages'] ?? [],
                        'center' => $destination_details['center'] ?? null
                    ];
                    
                    $location_info['destinations'][] = $destination_info;
                    
                    // Definir destino principal
                    if ($destination_info['is_primary']) {
                        $location_info['main_destination'] = $destination_info;
                    }
                }
            }
        }
        
        // Se não houver destino primário, usar o primeiro
        if (!$location_info['main_destination'] && !empty($location_info['destinations'])) {
            $location_info['main_destination'] = $location_info['destinations'][0];
        }
    }
    
    // Processar coordenadas da atração
    if (isset($attraction_data['center']) && isset($attraction_data['center']['latitude']) && isset($attraction_data['center']['longitude'])) {
        $location_info['coordinates'] = [
            'latitude' => $attraction_data['center']['latitude'],
            'longitude' => $attraction_data['center']['longitude']
        ];
    }
    
    return $location_info;
}

// Função para traduzir tipos de destinos
function viator_translate_destination_type($type, $language = null) {
    if (!$language) {
        $language = get_option('viator_language', 'pt-BR');
    }
    
    // Mapeamento de traduções para tipos de destinos
    $translations = [
        'pt-BR' => [
            'country' => 'País',
            'city' => 'Cidade',
            'region' => 'Região',
            'state' => 'Estado',
            'province' => 'Província',
            'district' => 'Distrito',
            'area' => 'Área',
            'neighborhood' => 'Bairro',
            'island' => 'Ilha',
            'continent' => 'Continente',
            'territory' => 'Território',
            'municipality' => 'Município',
            'county' => 'Condado',
            'town' => 'Cidade',
            'village' => 'Vila',
            'locality' => 'Localidade',
            'zone' => 'Zona',
            'sector' => 'Setor',
            'capital' => 'Capital',
            'port' => 'Porto',
            'airport' => 'Aeroporto',
            'landmark' => 'Marco',
            'destination' => 'Destino',
            'attraction' => 'Atração'
        ],
        'en-US' => [
            'country' => 'Country',
            'city' => 'City',
            'region' => 'Region',
            'state' => 'State',
            'province' => 'Province',
            'district' => 'District',
            'area' => 'Area',
            'neighborhood' => 'Neighborhood',
            'island' => 'Island',
            'continent' => 'Continent',
            'territory' => 'Territory',
            'municipality' => 'Municipality',
            'county' => 'County',
            'town' => 'Town',
            'village' => 'Village',
            'locality' => 'Locality',
            'zone' => 'Zone',
            'sector' => 'Sector',
            'capital' => 'Capital',
            'port' => 'Port',
            'airport' => 'Airport',
            'landmark' => 'Landmark',
            'destination' => 'Destination',
            'attraction' => 'Attraction'
        ],

    ];
    
    $type_lower = strtolower(trim($type));
    
    // Verificar se existe tradução para o idioma e tipo específicos
    if (isset($translations[$language][$type_lower])) {
        return $translations[$language][$type_lower];
    }
    
    // Fallback para inglês se não houver tradução no idioma atual
    if ($language !== 'en-US' && isset($translations['en-US'][$type_lower])) {
        return $translations['en-US'][$type_lower];
    }
    
    // Se não houver tradução, retornar o tipo original com primeira letra maiúscula
    return ucfirst($type_lower);
}

// Função para traduzir rótulos de localização
function viator_translate_location_label($label, $language = null) {
    if (!$language) {
        $language = get_option('viator_language', 'pt-BR');
    }
    
    $translations = [
        'pt-BR' => [
            'type' => 'Tipo',
            'timezone' => 'Fuso Horário',
            'currency' => 'Moeda',
            'languages' => 'Idiomas',
            'coordinates' => 'Coordenadas',
            'latitude' => 'Latitude',
            'longitude' => 'Longitude',
            'location_information' => 'Informações de Localização',
            'related_destinations' => 'Destinos Relacionados',
            'primary' => 'Principal',
            'view_on_google_maps' => 'Ver no Google Maps'
        ],
        'en-US' => [
            'type' => 'Type',
            'timezone' => 'Timezone',
            'currency' => 'Currency',
            'languages' => 'Languages',
            'coordinates' => 'Coordinates',
            'latitude' => 'Latitude',
            'longitude' => 'Longitude',
            'location_information' => 'Location Information',
            'related_destinations' => 'Related Destinations',
            'primary' => 'Primary',
            'view_on_google_maps' => 'View on Google Maps'
        ],

    ];
    
    $label_lower = strtolower(trim($label));
    
    if (isset($translations[$language][$label_lower])) {
        return $translations[$language][$label_lower];
    }
    
    // Fallback para inglês
    if ($language !== 'en-US' && isset($translations['en-US'][$label_lower])) {
        return $translations['en-US'][$label_lower];
    }
    
    // Se não houver tradução, retornar o rótulo original
    return ucfirst($label);
}

// Função para traduzir códigos de moeda para nomes amigáveis
function viator_translate_currency_code($currency_code, $language = null) {
    if (!$language) {
        $language = get_option('viator_language', 'pt-BR');
    }
    
    $currencies = [
        'pt-BR' => [
            'USD' => 'Dólar Americano',
            'EUR' => 'Euro',
            'GBP' => 'Libra Esterlina',
            'BRL' => 'Real Brasileiro',
            'CAD' => 'Dólar Canadense',
            'AUD' => 'Dólar Australiano',
            'JPY' => 'Iene Japonês',
            'CHF' => 'Franco Suíço',
            'CNY' => 'Yuan Chinês',
            'INR' => 'Rupia Indiana',
            'MXN' => 'Peso Mexicano',
            'ARS' => 'Peso Argentino',
            'CLP' => 'Peso Chileno',
            'COP' => 'Peso Colombiano',
            'PEN' => 'Sol Peruano',
            'UYU' => 'Peso Uruguaio',
            'BOB' => 'Boliviano',
            'VES' => 'Bolívar Venezuelano',
            'NZD' => 'Dólar Neozelandês',
            'SGD' => 'Dólar de Singapura',
            'HKD' => 'Dólar de Hong Kong',
            'KRW' => 'Won Sul-Coreano',
            'THB' => 'Baht Tailandês',
            'MYR' => 'Ringgit Malaio',
            'IDR' => 'Rupia Indonésia',
            'PHP' => 'Peso Filipino',
            'VND' => 'Dong Vietnamita',
            'ZAR' => 'Rand Sul-Africano',
            'EGP' => 'Libra Egípcia',
            'MAD' => 'Dirham Marroquino',
            'TRY' => 'Lira Turca',
            'RUB' => 'Rublo Russo',
            'PLN' => 'Zloty Polonês',
            'CZK' => 'Coroa Tcheca',
            'HUF' => 'Forint Húngaro',
            'RON' => 'Leu Romeno',
            'BGN' => 'Lev Búlgaro',
            'HRK' => 'Kuna Croata',
            'DKK' => 'Coroa Dinamarquesa',
            'SEK' => 'Coroa Sueca',
            'NOK' => 'Coroa Norueguesa',
            'ISK' => 'Coroa Islandesa'
        ],
        'en-US' => [
            'USD' => 'US Dollar',
            'EUR' => 'Euro',
            'GBP' => 'British Pound',
            'BRL' => 'Brazilian Real',
            'CAD' => 'Canadian Dollar',
            'AUD' => 'Australian Dollar',
            'JPY' => 'Japanese Yen',
            'CHF' => 'Swiss Franc',
            'CNY' => 'Chinese Yuan',
            'INR' => 'Indian Rupee',
            'MXN' => 'Mexican Peso',
            'ARS' => 'Argentine Peso',
            'CLP' => 'Chilean Peso',
            'COP' => 'Colombian Peso',
            'PEN' => 'Peruvian Sol',
            'UYU' => 'Uruguayan Peso',
            'BOB' => 'Bolivian Boliviano',
            'VES' => 'Venezuelan Bolívar',
            'NZD' => 'New Zealand Dollar',
            'SGD' => 'Singapore Dollar',
            'HKD' => 'Hong Kong Dollar',
            'KRW' => 'South Korean Won',
            'THB' => 'Thai Baht',
            'MYR' => 'Malaysian Ringgit',
            'IDR' => 'Indonesian Rupiah',
            'PHP' => 'Philippine Peso',
            'VND' => 'Vietnamese Dong',
            'ZAR' => 'South African Rand',
            'EGP' => 'Egyptian Pound',
            'MAD' => 'Moroccan Dirham',
            'TRY' => 'Turkish Lira',
            'RUB' => 'Russian Ruble',
            'PLN' => 'Polish Zloty',
            'CZK' => 'Czech Koruna',
            'HUF' => 'Hungarian Forint',
            'RON' => 'Romanian Leu',
            'BGN' => 'Bulgarian Lev',
            'HRK' => 'Croatian Kuna',
            'DKK' => 'Danish Krone',
            'SEK' => 'Swedish Krona',
            'NOK' => 'Norwegian Krone',
            'ISK' => 'Icelandic Króna'
        ],

    ];
    
    $code_upper = strtoupper(trim($currency_code));
    
    if (isset($currencies[$language][$code_upper])) {
        return $currencies[$language][$code_upper];
    }
    
    // Fallback para inglês
    if ($language !== 'en-US' && isset($currencies['en-US'][$code_upper])) {
        return $currencies['en-US'][$code_upper];
    }
    
    // Se não encontrar, retornar o código original
    return $code_upper;
}

// Função para buscar e exibir produtos da atração como cards
function viator_get_attraction_products_cards($product_codes, $language = null) {
    if (!$language) {
        $language = get_option('viator_language', 'pt-BR');
    }
    
    $api_key = get_option('viator_api_key');
    if (empty($api_key)) {
        return '<p class="viator-error">' . ($language === 'pt-BR' ? 'Chave da API não configurada.' : 'API key not configured.') . '</p>';
    }
    
    // Configurações de paginação
    $products_per_page = 9;
    $current_page = isset($_GET['attraction_products_page']) ? max(1, intval($_GET['attraction_products_page'])) : 1;
    $total_products = count($product_codes);
    $total_pages = ceil($total_products / $products_per_page);
    
    // Calcular produtos para a página atual
    $start_index = ($current_page - 1) * $products_per_page;
    $products_for_page = array_slice($product_codes, $start_index, $products_per_page);
    
    // Obter configurações de idioma e moeda
    $locale_settings = viator_get_locale_settings();
    
    $output = '';
    
    // Container dos cards
    $output .= '<div class="viator-grid">';
    
    // Buscar detalhes de cada produto
    foreach ($products_for_page as $product_code) {
        $product_data = viator_get_product_data_for_card($product_code, $api_key, $locale_settings);
        
        if ($product_data) {
            $output .= viator_generate_product_card($product_data, $locale_settings, $language);
        }
    }
    
    $output .= '</div>'; // Fecha viator-grid
    
    // Adicionar paginação se necessário
    if ($total_pages > 1) {
        $output .= viator_generate_attraction_products_pagination($current_page, $total_pages, $language);
    }
    
    return $output;
}

// Função para buscar dados de um produto específico
function viator_get_product_data_for_card($product_code, $api_key, $locale_settings) {
    // Usar o mesmo endpoint que funciona nos resultados de busca
    $url = "https://api.sandbox.viator.com/partner/search/freetext";
    
    // Corpo da requisição para buscar um produto específico
    $body_data = [
        "searchTerm" => $product_code, // Buscar pelo código do produto
        "productSorting" => ['sort' => 'DEFAULT'],
        "productFiltering" => [
            "dateRange" => [
                "from" => date('Y-m-d'),
                "to" => date('Y-m-d', strtotime('+1 year'))
            ],
            "includeAutomaticTranslations" => true
        ],
        "searchTypes" => [
            ["searchType" => "PRODUCTS", "pagination" => ["start" => 1, "count" => 1]]
        ],
        "currency" => $locale_settings['currency']
    ];
    
    $headers = [
        'Accept' => 'application/json;version=2.0',
        'Content-Type' => 'application/json;version=2.0',
        'exp-api-key' => $api_key,
        'Accept-Language' => $locale_settings['accept_language'],
    ];
    
    $args = [
        'method' => 'POST',
        'headers' => $headers,
        'body' => json_encode($body_data),
        'timeout' => 30
    ];
    
    $response = wp_remote_request($url, $args);
    
    if (is_wp_error($response)) {
        viator_debug_log('Erro ao buscar produto para card via search:', [
            'product_code' => $product_code,
            'error' => $response->get_error_message()
        ]);
        return false;
    }
    
    $response_code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);
    
    if ($response_code !== 200) {
        viator_debug_log('Erro HTTP ao buscar produto para card via search:', [
            'product_code' => $product_code,
            'response_code' => $response_code
        ]);
        return false;
    }
    
    $data = json_decode($body, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        viator_debug_log('Erro ao decodificar JSON do produto para card via search:', [
            'product_code' => $product_code,
            'error' => json_last_error_msg()
        ]);
        return false;
    }
    
    // Verificar se encontrou o produto
    if (!isset($data['products']['results']) || empty($data['products']['results'])) {
        viator_debug_log('Nenhum produto encontrado na busca para card:', [
            'product_code' => $product_code,
            'total_found' => isset($data['products']['totalCount']) ? $data['products']['totalCount'] : 0
        ]);
        return false;
    }
    
    // Procurar pelo produto específico nos resultados
    foreach ($data['products']['results'] as $product) {
        if (isset($product['productCode']) && $product['productCode'] === $product_code) {
            viator_debug_log('Produto encontrado via search:', [
                'product_code' => $product_code,
                'has_pricing' => isset($product['pricing']['summary']['fromPrice']),
                'price' => isset($product['pricing']['summary']['fromPrice']) ? $product['pricing']['summary']['fromPrice'] : null
            ]);
            return $product;
        }
    }
    
    // Se não encontrou o produto específico, usar o primeiro resultado (fallback)
    viator_debug_log('Produto específico não encontrado, usando primeiro resultado:', [
        'requested_code' => $product_code,
        'found_code' => isset($data['products']['results'][0]['productCode']) ? $data['products']['results'][0]['productCode'] : null
    ]);
    
    return $data['products']['results'][0];
}

// Função para gerar um card de produto (EXATAMENTE IGUAL aos resultados de busca)
function viator_generate_product_card($product_data, $locale_settings, $language) {
    // Extrair dados básicos usando EXATAMENTE os mesmos campos dos resultados de busca
    $title = esc_html($product_data['title']);
    $description = esc_html($product_data['description']);
    $product_code = isset($product_data['productCode']) ? $product_data['productCode'] : '';
    
    // Pegar a imagem de melhor qualidade (IGUAL aos resultados de busca)
    $image_url = 'https://via.placeholder.com/400x200';
    if (isset($product_data['images'][0]['variants'][3]['url'])) {
        $image_url = $product_data['images'][0]['variants'][3]['url'];
    } elseif (isset($product_data['images'][0]['variants'][0]['url'])) {
        $image_url = $product_data['images'][0]['variants'][0]['url'];
    } elseif (isset($product_data['images'][0]['url'])) {
        $image_url = $product_data['images'][0]['url'];
    }
    
    // Captura a média de avaliações (IGUAL aos resultados de busca)
    $rating = isset($product_data['reviews']['combinedAverageRating']) ? number_format($product_data['reviews']['combinedAverageRating'], 1) . '⭐' : viator_t('no_reviews');

    // Captura o total de avaliações e ajusta para singular/plural (IGUAL aos resultados de busca)
    $total_reviews = isset($product_data['reviews']['totalReviews']) ? $product_data['reviews']['totalReviews'] : 0;
    if ($total_reviews == 0) {
        $rating_count = ''; // Não exibe nada se não houver avaliações
    } elseif ($total_reviews == 1) {
        $rating_count = '(1 ' . viator_t('review') . ')';
    } else {
        $rating_count = '(' . $total_reviews . ' ' . viator_t('reviews') . ')';
    }
    
    // Captura e formata a duração do passeio usando a função de tradução (USANDO ESTRUTURA DO ENDPOINT DE BUSCA)
    $duration_fixed = isset($product_data['duration']['fixedDurationInMinutes']) ? $product_data['duration']['fixedDurationInMinutes'] : null;
    $duration_from = isset($product_data['duration']['variableDurationFromMinutes']) ? $product_data['duration']['variableDurationFromMinutes'] : null;
    $duration_to = isset($product_data['duration']['variableDurationToMinutes']) ? $product_data['duration']['variableDurationToMinutes'] : null;
    $unstructured_duration = isset($product_data['duration']['unstructuredDuration']) ? $product_data['duration']['unstructuredDuration'] : null;

    $duration = viator_format_duration($duration_fixed, $duration_from, $duration_to, $unstructured_duration);
    
    $flags = isset($product_data['flags']) ? $product_data['flags'] : []; // Flags

    // Processar flags (USANDO ESTRUTURA DO ENDPOINT DE BUSCA) - Removido NEW_ON_VIATOR por política da Viator
    $flag_output = '';
    if (in_array('LIKELY_TO_SELL_OUT', $flags)) {
        $flag_output .= '<span class="viator-badge" data-type="sell-out">' . esc_html(viator_t('likely_to_sell_out_badge')) . '</span>';
    }
    if (in_array('SPECIAL_OFFER', $flags)) {
        $flag_output .= '<span class="viator-badge" data-type="special-offer">' . esc_html(viator_t('special_offer_badge')) . '</span>';
    }
    // NEW_ON_VIATOR removido - não permitido nos cards da página de atrações por política da Viator

    // Processar preços (USANDO ESTRUTURA DO ENDPOINT DE BUSCA)
    $price_html = '';
    if (in_array('SPECIAL_OFFER', $flags) && isset($product_data['pricing']['summary']['fromPriceBeforeDiscount'])) {
        // Se for oferta especial e tiver preço com desconto
        $original_price = number_format($product_data['pricing']['summary']['fromPriceBeforeDiscount'], 2, ',', '.');
        $discounted_price = number_format($product_data['pricing']['summary']['fromPrice'], 2, ',', '.');
        $price_html = '<span class="viator-original-price">' . $locale_settings['currency_symbol'] . ' ' . $original_price . '</span> <span class="viator-discount-price">' . $locale_settings['currency_symbol'] . ' ' . $discounted_price . '</span>';
    } else {
        // Preço normal sem desconto
        $price = isset($product_data['pricing']['summary']['fromPrice']) ? number_format($product_data['pricing']['summary']['fromPrice'], 2, ',', '.') : '0,00';
        $price_html = '<strong>' . $locale_settings['currency_symbol'] . ' ' . $price . '</strong>';
    }

    // Criar o card (EXATAMENTE IGUAL aos resultados de busca)
    $output = '<div class="viator-card">
        <div class="viator-card-img">
            <img src="' . $image_url . '" alt="' . $title . '">';
            
            // Adicionar as badges no container da imagem
            if (!empty($flag_output)) {
                $output .= '<div class="viator-badge-container">' . $flag_output . '</div>';
            }

    $output .= '</div>
        <div class="viator-card-content">
            <p class="viator-card-rating">' . $rating . ' ' . $rating_count . '</p>
            <h3>' . $title . '</h3>
            <p>' . substr($description, 0, 120) . '...</p>';

    if (in_array('FREE_CANCELLATION', $flags)) {
        $output .= '<p class="viator-card-duration"><img src="https://img.icons8.com/?size=100&id=85097&format=png&color=04846b" alt="Cancelamento gratuito" title="Política de cancelamento" width="15" height="15"> ' . esc_html(viator_t('free_cancellation_badge')) . '</p>';
    }

    $output .= '<p class="viator-card-duration"><img src="https://img.icons8.com/?size=100&id=82767&format=png&color=000000" alt="Duração" title="Duração aproximada" width="15" height="15"> ' . esc_html($duration) . '</p>
            <p class="viator-card-price"><img src="https://img.icons8.com/?size=100&id=ZXJaNFNjWGZF&format=png&color=000000" alt="Preço" width="15" height="15"> ' . esc_html(viator_t('from_price')) . ' ' . $price_html . '</p>                
            <a href="' . esc_url(home_url('/passeio/' . $product_code . '/')) . '" target="_blank" rel="noopener noreferrer">' . esc_html(viator_t('see_details')) . '</a>';
            
            // Armazenar informações de preço e duração para uso na página de detalhes do produto (USANDO ENDPOINT DE BUSCA)
            // Filtrar NEW_ON_VIATOR das flags por política da Viator
            $filtered_flags = array_filter($flags, function($flag) {
                return $flag !== 'NEW_ON_VIATOR';
            });
            
            $product_storage_data = array(
                'fromPrice' => isset($product_data['pricing']['summary']['fromPrice']) ? $product_data['pricing']['summary']['fromPrice'] : null,
                'fromPriceBeforeDiscount' => isset($product_data['pricing']['summary']['fromPriceBeforeDiscount']) ? $product_data['pricing']['summary']['fromPriceBeforeDiscount'] : null,
                'flags' => $filtered_flags,
                'duration' => $duration,
                'duration_data' => array(
                    'fixedDurationInMinutes' => $duration_fixed,
                    'variableDurationFromMinutes' => $duration_from,
                    'variableDurationToMinutes' => $duration_to,
                    'unstructuredDuration' => $unstructured_duration
                )
            );
            update_option('viator_product_' . $product_code . '_price', $product_storage_data, false);
            
            $output .= "
        </div>
    </div>";
    
    return $output;
}

// Função para gerar paginação dos produtos da atração
function viator_generate_attraction_products_pagination($current_page, $total_pages, $language) {
    // Se só há uma página, não exibir paginação
    if ($total_pages <= 1) {
        return '';
    }
    
    $output = '<div class="viator-pagination viator-attraction-pagination">';
    
    // Link para a página anterior - SEMPRE mostrar se não estamos na primeira página
    if ($current_page > 1) {
        $prev_url = add_query_arg('attraction_products_page', $current_page - 1);
        $prev_arrow = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/></svg>';
        $output .= '<a class="viator-pagination-arrow viator-attraction-pagination-arrow" href="' . esc_url($prev_url) . '" data-page="' . ($current_page - 1) . '">' . $prev_arrow . '</a>';
    }

    // Lógica baseada na imagem: ← 1 ... 3 4 5 6 7 ... 28 →
    $delta = 2; // Quantas páginas mostrar de cada lado da atual
    $range = $delta + 1; // Range total = atual + delta de cada lado
    $range_with_dots = $delta + 3; // Para determinar quando mostrar ...

    // Calcular início e fim do range principal
    $start = max(1, $current_page - $delta);
    $end = min($total_pages, $current_page + $delta);
    
    // Se estivermos próximos do início, estender o range para a direita
    if ($current_page - $delta <= 1) {
        $end = min($total_pages, $range_with_dots);
    }
    
    // Se estivermos próximos do fim, estender o range para a esquerda
    if ($current_page + $delta >= $total_pages) {
        $start = max(1, $total_pages - $range_with_dots + 1);
    }

    // Mostrar primeira página e ... se necessário
    if ($start > 1) {
        $url = add_query_arg('attraction_products_page', 1);
        $output .= '<a class="viator-pagination-btn viator-attraction-pagination-btn" href="' . esc_url($url) . '" data-page="1">1</a>';
        
        if ($start > 2) {
            $output .= '<span class="viator-pagination-ellipsis">...</span>';
        }
    }

    // Mostrar range principal de páginas
    for ($i = $start; $i <= $end; $i++) {
        $url = add_query_arg('attraction_products_page', $i);
        $active_class = ($i == $current_page) ? ' active' : '';
        $output .= '<a class="viator-pagination-btn viator-attraction-pagination-btn' . $active_class . '" href="' . esc_url($url) . '" data-page="' . $i . '">' . $i . '</a>';
    }

    // Mostrar ... e última página se necessário
    if ($end < $total_pages) {
        if ($end < $total_pages - 1) {
            $output .= '<span class="viator-pagination-ellipsis">...</span>';
        }
        
        $url = add_query_arg('attraction_products_page', $total_pages);
        $output .= '<a class="viator-pagination-btn viator-attraction-pagination-btn" href="' . esc_url($url) . '" data-page="' . $total_pages . '">' . $total_pages . '</a>';
    }

    // Link para a próxima página - SEMPRE mostrar se não estamos na última página
    if ($current_page < $total_pages) {
        $next_url = add_query_arg('attraction_products_page', $current_page + 1);
        $next_arrow = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/></svg>';
        $output .= '<a class="viator-pagination-arrow viator-attraction-pagination-arrow" href="' . esc_url($next_url) . '" data-page="' . ($current_page + 1) . '">' . $next_arrow . '</a>';
    }

    $output .= '</div>';
    
    return $output;
}



// Função para traduzir códigos de idioma para nomes amigáveis
function viator_translate_language_code($language_code, $language = null) {
    if (!$language) {
        $language = get_option('viator_language', 'pt-BR');
    }
    
    $languages = [
        'pt-BR' => [
            'en' => 'Inglês',
            'en-US' => 'Inglês Americano',
            'en-GB' => 'Inglês Britânico',
            'en-AU' => 'Inglês Australiano',
            'en-CA' => 'Inglês Canadense',
            'pt' => 'Português',
            'pt-BR' => 'Português Brasileiro',
            'pt-PT' => 'Português Europeu',
            'es' => 'Espanhol',
            'es-ES' => 'Espanhol da Espanha',
            'es-MX' => 'Espanhol Mexicano',
            'es-AR' => 'Espanhol Argentino',
            'es-CO' => 'Espanhol Colombiano',
            'es-CL' => 'Espanhol Chileno',
            'es-PE' => 'Espanhol Peruano',
            'es-VE' => 'Espanhol Venezuelano',
            'es-EC' => 'Espanhol Equatoriano',
            'es-BO' => 'Espanhol Boliviano',
            'es-UY' => 'Espanhol Uruguaio',
            'es-PY' => 'Espanhol Paraguaio',
            'fr' => 'Francês',
            'fr-FR' => 'Francês da França',
            'fr-CA' => 'Francês Canadense',
            'fr-BE' => 'Francês Belga',
            'fr-CH' => 'Francês Suíço',
            'de' => 'Alemão',
            'de-DE' => 'Alemão da Alemanha',
            'de-AT' => 'Alemão Austríaco',
            'de-CH' => 'Alemão Suíço',
            'it' => 'Italiano',
            'it-IT' => 'Italiano da Itália',
            'it-CH' => 'Italiano Suíço',
            'nl' => 'Holandês',
            'nl-NL' => 'Holandês dos Países Baixos',
            'nl-BE' => 'Holandês Belga',
            'ru' => 'Russo',
            'ru-RU' => 'Russo da Rússia',
            'zh' => 'Chinês',
            'zh-CN' => 'Chinês Simplificado',
            'zh-TW' => 'Chinês Tradicional',
            'zh-HK' => 'Chinês de Hong Kong',
            'ja' => 'Japonês',
            'ja-JP' => 'Japonês do Japão',
            'ko' => 'Coreano',
            'ko-KR' => 'Coreano da Coreia do Sul',
            'ar' => 'Árabe',
            'ar-SA' => 'Árabe Saudita',
            'ar-EG' => 'Árabe Egípcio',
            'hi' => 'Hindi',
            'hi-IN' => 'Hindi da Índia',
            'th' => 'Tailandês',
            'th-TH' => 'Tailandês da Tailândia',
            'vi' => 'Vietnamita',
            'vi-VN' => 'Vietnamita do Vietnã',
            'tr' => 'Turco',
            'tr-TR' => 'Turco da Turquia',
            'pl' => 'Polonês',
            'pl-PL' => 'Polonês da Polônia',
            'sv' => 'Sueco',
            'sv-SE' => 'Sueco da Suécia',
            'da' => 'Dinamarquês',
            'da-DK' => 'Dinamarquês da Dinamarca',
            'no' => 'Norueguês',
            'no-NO' => 'Norueguês da Noruega',
            'fi' => 'Finlandês',
            'fi-FI' => 'Finlandês da Finlândia',
            'cs' => 'Tcheco',
            'cs-CZ' => 'Tcheco da República Tcheca',
            'hu' => 'Húngaro',
            'hu-HU' => 'Húngaro da Hungria',
            'ro' => 'Romeno',
            'ro-RO' => 'Romeno da Romênia',
            'bg' => 'Búlgaro',
            'bg-BG' => 'Búlgaro da Bulgária',
            'hr' => 'Croata',
            'hr-HR' => 'Croata da Croácia',
            'sk' => 'Eslovaco',
            'sk-SK' => 'Eslovaco da Eslováquia',
            'sl' => 'Esloveno',
            'sl-SI' => 'Esloveno da Eslovênia',
            'et' => 'Estoniano',
            'et-EE' => 'Estoniano da Estônia',
            'lv' => 'Letão',
            'lv-LV' => 'Letão da Letônia',
            'lt' => 'Lituano',
            'lt-LT' => 'Lituano da Lituânia',
            'el' => 'Grego',
            'el-GR' => 'Grego da Grécia',
            'he' => 'Hebraico',
            'he-IL' => 'Hebraico de Israel',
            'is' => 'Islandês',
            'is-IS' => 'Islandês da Islândia',
            'mt' => 'Maltês',
            'mt-MT' => 'Maltês de Malta'
        ],
        'en-US' => [
            'en' => 'English',
            'en-US' => 'American English',
            'en-GB' => 'British English',
            'en-AU' => 'Australian English',
            'en-CA' => 'Canadian English',
            'pt' => 'Portuguese',
            'pt-BR' => 'Brazilian Portuguese',
            'pt-PT' => 'European Portuguese',
            'es' => 'Spanish',
            'es-ES' => 'Spanish (Spain)',
            'es-MX' => 'Mexican Spanish',
            'es-AR' => 'Argentine Spanish',
            'es-CO' => 'Colombian Spanish',
            'es-CL' => 'Chilean Spanish',
            'es-PE' => 'Peruvian Spanish',
            'es-VE' => 'Venezuelan Spanish',
            'es-EC' => 'Ecuadorian Spanish',
            'es-BO' => 'Bolivian Spanish',
            'es-UY' => 'Uruguayan Spanish',
            'es-PY' => 'Paraguayan Spanish',
            'fr' => 'French',
            'fr-FR' => 'French (France)',
            'fr-CA' => 'Canadian French',
            'fr-BE' => 'Belgian French',
            'fr-CH' => 'Swiss French',
            'de' => 'German',
            'de-DE' => 'German (Germany)',
            'de-AT' => 'Austrian German',
            'de-CH' => 'Swiss German',
            'it' => 'Italian',
            'it-IT' => 'Italian (Italy)',
            'it-CH' => 'Swiss Italian',
            'nl' => 'Dutch',
            'nl-NL' => 'Dutch (Netherlands)',
            'nl-BE' => 'Belgian Dutch',
            'ru' => 'Russian',
            'ru-RU' => 'Russian (Russia)',
            'zh' => 'Chinese',
            'zh-CN' => 'Simplified Chinese',
            'zh-TW' => 'Traditional Chinese',
            'zh-HK' => 'Chinese (Hong Kong)',
            'ja' => 'Japanese',
            'ja-JP' => 'Japanese (Japan)',
            'ko' => 'Korean',
            'ko-KR' => 'Korean (South Korea)',
            'ar' => 'Arabic',
            'ar-SA' => 'Saudi Arabic',
            'ar-EG' => 'Egyptian Arabic',
            'hi' => 'Hindi',
            'hi-IN' => 'Hindi (India)',
            'th' => 'Thai',
            'th-TH' => 'Thai (Thailand)',
            'vi' => 'Vietnamese',
            'vi-VN' => 'Vietnamese (Vietnam)',
            'tr' => 'Turkish',
            'tr-TR' => 'Turkish (Turkey)',
            'pl' => 'Polish',
            'pl-PL' => 'Polish (Poland)',
            'sv' => 'Swedish',
            'sv-SE' => 'Swedish (Sweden)',
            'da' => 'Danish',
            'da-DK' => 'Danish (Denmark)',
            'no' => 'Norwegian',
            'no-NO' => 'Norwegian (Norway)',
            'fi' => 'Finnish',
            'fi-FI' => 'Finnish (Finland)',
            'cs' => 'Czech',
            'cs-CZ' => 'Czech (Czech Republic)',
            'hu' => 'Hungarian',
            'hu-HU' => 'Hungarian (Hungary)',
            'ro' => 'Romanian',
            'ro-RO' => 'Romanian (Romania)',
            'bg' => 'Bulgarian',
            'bg-BG' => 'Bulgarian (Bulgaria)',
            'hr' => 'Croatian',
            'hr-HR' => 'Croatian (Croatia)',
            'sk' => 'Slovak',
            'sk-SK' => 'Slovak (Slovakia)',
            'sl' => 'Slovenian',
            'sl-SI' => 'Slovenian (Slovenia)',
            'et' => 'Estonian',
            'et-EE' => 'Estonian (Estonia)',
            'lv' => 'Latvian',
            'lv-LV' => 'Latvian (Latvia)',
            'lt' => 'Lithuanian',
            'lt-LT' => 'Lithuanian (Lithuania)',
            'el' => 'Greek',
            'el-GR' => 'Greek (Greece)',
            'he' => 'Hebrew',
            'he-IL' => 'Hebrew (Israel)',
            'is' => 'Icelandic',
            'is-IS' => 'Icelandic (Iceland)',
            'mt' => 'Maltese',
            'mt-MT' => 'Maltese (Malta)'
        ],

    ];
    
    $code_lower = strtolower(trim($language_code));
    
    if (isset($languages[$language][$code_lower])) {
        return $languages[$language][$code_lower];
    }
    
    // Fallback para inglês
    if ($language !== 'en-US' && isset($languages['en-US'][$code_lower])) {
        return $languages['en-US'][$code_lower];
    }
    
    // Fallback inteligente: tentar extrair partes do código (ex: es-CO -> es + CO)
    if (strpos($code_lower, '-') !== false) {
        $parts = explode('-', $code_lower);
        $base_language = $parts[0];
        $country_code = strtoupper($parts[1]);
        
        // Mapear códigos de país comuns
        $country_names = [
            'pt-BR' => [
                'CO' => 'Colombiano', 'MX' => 'Mexicano', 'AR' => 'Argentino', 'CL' => 'Chileno',
                'PE' => 'Peruano', 'VE' => 'Venezuelano', 'EC' => 'Equatoriano', 'BO' => 'Boliviano',
                'UY' => 'Uruguaio', 'PY' => 'Paraguaio', 'US' => 'Americano', 'GB' => 'Britânico',
                'CA' => 'Canadense', 'AU' => 'Australiano', 'FR' => 'da França', 'DE' => 'da Alemanha',
                'IT' => 'da Itália', 'ES' => 'da Espanha', 'PT' => 'de Portugal', 'BR' => 'do Brasil'
            ],
            'en-US' => [
                'CO' => 'Colombian', 'MX' => 'Mexican', 'AR' => 'Argentine', 'CL' => 'Chilean',
                'PE' => 'Peruvian', 'VE' => 'Venezuelan', 'EC' => 'Ecuadorian', 'BO' => 'Bolivian',
                'UY' => 'Uruguayan', 'PY' => 'Paraguayan', 'US' => 'American', 'GB' => 'British',
                'CA' => 'Canadian', 'AU' => 'Australian', 'FR' => '(France)', 'DE' => '(Germany)',
                'IT' => '(Italy)', 'ES' => '(Spain)', 'PT' => '(Portugal)', 'BR' => '(Brazil)'
            ]
        ];
        
        // Buscar tradução para o idioma base
        if (isset($languages[$language][$base_language])) {
            $base_lang_name = $languages[$language][$base_language];
            $country_suffix = $country_names[$language][$country_code] ?? $country_code;
            return $base_lang_name . ' ' . $country_suffix;
        }
    }
    
    // Se não encontrar, retornar o código original em maiúscula
    return strtoupper($code_lower);
}

// Função para exibir detalhes da atração
function viator_show_attraction_details($attraction_id) {
    viator_debug_log('Iniciando exibição de detalhes para atração:', $attraction_id);
    
    $attraction_data = viator_get_attraction_details($attraction_id);
    
    if (!$attraction_data) {
        $error_message = viator_t('attraction_not_found', 'Atração não encontrada');
        viator_debug_log('Atração não encontrada, mensagem de erro:', $error_message);
        return '<p class="viator-error">' . esc_html($error_message) . '</p>';
    }
    
    viator_debug_log('Dados da atração encontrados:', $attraction_data);
    
    // Obter configurações de idioma e moeda
    $locale_settings = viator_get_locale_settings();
    $language = get_option('viator_language', 'pt-BR');
    
    // Processar informações de localização
    $location_info = viator_get_location_info($attraction_data);
    
    $output = '<div class="viator-attraction-details">';
    
    // Header profissional com layout horizontal (imagem + informações)
    $output .= '<div class="viator-attraction-header-container">';
    
    // Imagem principal (melhor qualidade)
    $best_image_url = '';
    if (isset($attraction_data['images']) && !empty($attraction_data['images'])) {
        $best_image_url = viator_get_best_attraction_image($attraction_data['images']);
    }
    
    $output .= '<div class="viator-attraction-header-image">';
    if ($best_image_url) {
        $output .= '<img src="' . esc_url($best_image_url) . '" alt="' . esc_attr($attraction_data['name']) . '" class="main-attraction-hero-image">';
    } else {
        $output .= '<div class="attraction-placeholder-image">📍</div>';
    }
    $output .= '</div>';
    
    // Informações principais à direita
    $output .= '<div class="viator-attraction-header-info">';
    
    // Título
    $output .= '<h1 class="viator-attraction-name">' . esc_html($attraction_data['name']) . '</h1>';
    
    // Avaliações
    if (isset($attraction_data['reviews']['combinedAverageRating']) && $attraction_data['reviews']['combinedAverageRating'] > 0) {
        $rating = number_format($attraction_data['reviews']['combinedAverageRating'], 1);
        $total_reviews = isset($attraction_data['reviews']['totalReviews']) ? $attraction_data['reviews']['totalReviews'] : 0;
        
        $output .= '<div class="viator-attraction-rating-header">';
        
        // Estrelas visuais
        $full_stars = floor($rating);
        $has_half_star = ($rating - $full_stars) >= 0.5;
        $output .= '<div class="stars-display">';
        for ($i = 1; $i <= 5; $i++) {
            if ($i <= $full_stars) {
                $output .= '<span class="star full">★</span>';
            } elseif ($i == $full_stars + 1 && $has_half_star) {
                $output .= '<span class="star half">★</span>';
            } else {
                $output .= '<span class="star empty">☆</span>';
            }
        }
        $output .= '</div>';
        
        $output .= '<span class="rating-text">' . $rating . '</span>';
        if ($total_reviews > 0) {
            $output .= '<span class="rating-count">(' . number_format($total_reviews) . ' ' . ($language === 'pt-BR' ? 'avaliações' : 'reviews') . ')</span>';
        }
        $output .= '</div>';
    }
    
    // Descrição gerada por IA
    $location_text = '';
    if ($location_info['main_destination']) {
        $location_text = $location_info['main_destination']['name'];
    }
    
    $ai_description = viator_get_attraction_ai_description($attraction_data['name'], $location_text, $language);
    if ($ai_description) {
        $output .= '<div class="viator-attraction-description">';
        $output .= '<p>' . esc_html($ai_description) . '</p>';
        $output .= '</div>';
    }
    
    // Localização enriquecida
    if ($location_info['main_destination']) {
        $main_dest = $location_info['main_destination'];
        $output .= '<div class="viator-attraction-location-rich">';
        
        // Nome do destino principal
        $output .= '<div class="location-main">';
        $output .= '<span class="location-icon">📍</span>';
        $output .= '<span class="location-text">' . esc_html($main_dest['name']) . '</span>';
        if (!empty($main_dest['type'])) {
            $translated_type = viator_translate_destination_type($main_dest['type'], $language);
            $output .= '<span class="location-type">(' . esc_html($translated_type) . ')</span>';
        }
        $output .= '</div>';
        
        // Informações adicionais do destino
        $dest_details = [];
        if (!empty($main_dest['timezone'])) {
            $dest_details[] = '<span class="dest-timezone">🕐 ' . esc_html($main_dest['timezone']) . '</span>';
        }
        if (!empty($main_dest['currency'])) {
            $currency_name = viator_translate_currency_code($main_dest['currency'], $language);
            $dest_details[] = '<span class="dest-currency">💰 ' . esc_html($currency_name) . '</span>';
        }
        if (!empty($main_dest['languages'])) {
            $language_codes = is_array($main_dest['languages']) ? $main_dest['languages'] : [$main_dest['languages']];
            $translated_languages = [];
            foreach ($language_codes as $lang_code) {
                $translated_languages[] = viator_translate_language_code($lang_code, $language);
            }
            $languages_text = implode(', ', $translated_languages);
            $dest_details[] = '<span class="dest-languages">🗣️ ' . esc_html($languages_text) . '</span>';
        }
        
        if (!empty($dest_details)) {
            $output .= '<div class="location-details">';
            $output .= implode(' ', $dest_details);
            $output .= '</div>';
        }
        
        $output .= '</div>';
    }
    
    // Link "Saiba mais" se houver conteúdo adicional
    if (isset($attraction_data['viatorUniqueContent']['introduction']) || isset($attraction_data['viatorUniqueContent']['overview']['sections'])) {
        $output .= '<div class="viator-attraction-more-info">';
        $output .= '<a href="#more-details" class="saiba-mais-btn">' . ($language === 'pt-BR' ? 'Saiba mais' : 'Learn more') . '</a>';
        $output .= '</div>';
    }
    
    $output .= '</div>'; // fim header-info
    $output .= '</div>'; // fim header-container
    
    // Conteúdo principal
    $output .= '<div class="viator-attraction-content" id="more-details">';
    
    // Introdução
    if (isset($attraction_data['viatorUniqueContent']['introduction'])) {
        $output .= '<div class="viator-attraction-introduction">';
        $output .= '<h2>' . ($language === 'pt-BR' ? 'Sobre a Atração' : 'About the Attraction') . '</h2>';
        $output .= '<p>' . esc_html($attraction_data['viatorUniqueContent']['introduction']) . '</p>';
        $output .= '</div>';
    }
    
    // Visão geral
    if (isset($attraction_data['viatorUniqueContent']['overview']['sections']) && !empty($attraction_data['viatorUniqueContent']['overview']['sections'])) {
        $output .= '<div class="viator-attraction-overview">';
        $output .= '<h2>' . ($language === 'pt-BR' ? 'Informações Detalhadas' : 'Detailed Information') . '</h2>';
        foreach ($attraction_data['viatorUniqueContent']['overview']['sections'] as $section) {
            if (isset($section['title']) && isset($section['text'])) {
                $output .= '<div class="overview-section">';
                $output .= '<h3>' . esc_html($section['title']) . '</h3>';
                $output .= '<p>' . esc_html($section['text']) . '</p>';
                $output .= '</div>';
            }
        }
        $output .= '</div>';
    }
    
    // Seção de Localização e Coordenadas
    if ($location_info['coordinates'] || count($location_info['destinations']) > 1) {
        $output .= '<div class="viator-attraction-location-section">';
        $output .= '<h2>' . viator_translate_location_label('location_information', $language) . '</h2>';
        
        // Coordenadas
        if ($location_info['coordinates']) {
            $coords = $location_info['coordinates'];
            $output .= '<div class="attraction-coordinates">';
            $output .= '<h3>' . viator_translate_location_label('coordinates', $language) . '</h3>';
            $output .= '<div class="coordinates-info">';
            $output .= '<span class="coord-lat">🧭 ' . viator_translate_location_label('latitude', $language) . ': ' . esc_html($coords['latitude']) . '</span>';
            $output .= '<span class="coord-lng">🧭 ' . viator_translate_location_label('longitude', $language) . ': ' . esc_html($coords['longitude']) . '</span>';
            
            // Link para Google Maps
            $maps_url = 'https://www.google.com/maps?q=' . urlencode($coords['latitude'] . ',' . $coords['longitude']);
            $output .= '<a href="' . esc_url($maps_url) . '" target="_blank" class="maps-link">🗺️ ' . viator_translate_location_label('view_on_google_maps', $language) . '</a>';
            $output .= '</div>';
            $output .= '</div>';
        }
        
        // Todos os destinos relacionados
        if (count($location_info['destinations']) > 1) {
            $output .= '<div class="all-destinations">';
            $output .= '<h3>' . viator_translate_location_label('related_destinations', $language) . '</h3>';
            $output .= '<div class="destinations-list">';
            
            foreach ($location_info['destinations'] as $destination) {
                $output .= '<div class="destination-item' . ($destination['is_primary'] ? ' primary' : '') . '">';
                $output .= '<div class="dest-name">';
                $output .= '<strong>' . esc_html($destination['name']) . '</strong>';
                if ($destination['is_primary']) {
                    $output .= ' <span class="primary-badge">' . viator_translate_location_label('primary', $language) . '</span>';
                }
                $output .= '</div>';
                
                if (!empty($destination['type'])) {
                    $translated_type = viator_translate_destination_type($destination['type'], $language);
                    $output .= '<div class="dest-type">' . viator_translate_location_label('type', $language) . ': ' . esc_html($translated_type) . '</div>';
                }
                
                // Informações do destino
                $dest_info = [];
                if (!empty($destination['timezone'])) {
                    $dest_info[] = '🕐 ' . $destination['timezone'];
                }
                if (!empty($destination['currency'])) {
                    $currency_name = viator_translate_currency_code($destination['currency'], $language);
                    $dest_info[] = '💰 ' . $currency_name;
                }
                if (!empty($destination['languages'])) {
                    $language_codes = is_array($destination['languages']) ? $destination['languages'] : [$destination['languages']];
                    $translated_languages = [];
                    foreach ($language_codes as $lang_code) {
                        $translated_languages[] = viator_translate_language_code($lang_code, $language);
                    }
                    $languages_text = implode(', ', $translated_languages);
                    $dest_info[] = '🗣️ ' . $languages_text;
                }
                
                if (!empty($dest_info)) {
                    $output .= '<div class="dest-info">' . implode(' • ', $dest_info) . '</div>';
                }
                
                $output .= '</div>';
            }
            
            $output .= '</div>';
            $output .= '</div>';
        }
        
        $output .= '</div>';
    }
    
    // Informações adicionais
    $output .= '<div class="viator-attraction-info">';
    
    // Horários de funcionamento
    if (isset($attraction_data['openingHours']) && !empty($attraction_data['openingHours'])) {
        $output .= '<div class="info-section">';
        $output .= '<h3>' . ($language === 'pt-BR' ? 'Horários de Funcionamento' : 'Opening Hours') . '</h3>';
        $output .= '<p>' . esc_html($attraction_data['openingHours']) . '</p>';
        $output .= '</div>';
    }
    
    // Endereço
    if (isset($attraction_data['address'])) {
        $address = $attraction_data['address'];
        $address_parts = array_filter([
            isset($address['street']) ? $address['street'] : '',
            isset($address['city']) ? $address['city'] : '',
            isset($address['state']) ? $address['state'] : '',
            isset($address['postcode']) ? $address['postcode'] : ''
        ]);
        
        if (!empty($address_parts)) {
            $output .= '<div class="info-section">';
            $output .= '<h3>' . ($language === 'pt-BR' ? 'Endereço' : 'Address') . '</h3>';
            $output .= '<p>' . esc_html(implode(', ', $address_parts)) . '</p>';
            $output .= '</div>';
        }
    }
    
    // Atração gratuita
    if (isset($attraction_data['freeAttraction']) && $attraction_data['freeAttraction']) {
        $output .= '<div class="info-section free-attraction">';
        $output .= '<h3>' . ($language === 'pt-BR' ? 'Atração Gratuita' : 'Free Attraction') . '</h3>';
        $output .= '<p>✅ ' . ($language === 'pt-BR' ? 'Acesso gratuito disponível' : 'Free access available') . '</p>';
        $output .= '</div>';
    }
    
    $output .= '</div>'; // fim viator-attraction-info
    
    // Produtos relacionados (passeios e ingressos)
    if (isset($attraction_data['productCodes']) && !empty($attraction_data['productCodes'])) {
        $output .= '<div class="viator-attraction-products">';
        $output .= '<h2>' . ($language === 'pt-BR' ? 'Passeios e Ingressos Relacionados' : 'Available Tours and Tickets') . '</h2>';
        $output .= '<p>' . ($language === 'pt-BR' ? 'Total disponível' : 'Total Available') . ': ' . (isset($attraction_data['productCount']) ? $attraction_data['productCount'] : count($attraction_data['productCodes'])) . '</p>';
        
        // Buscar e exibir produtos relacionados em formato de cards
        $products_cards = viator_get_attraction_products_cards($attraction_data['productCodes'], $language);
        $output .= $products_cards;
        
        $output .= '</div>';
    }
    
    $output .= '</div>'; // fim viator-attraction-content
    $output .= '</div>'; // fim viator-attraction-details
    
    // Adicionar script para scroll automático na paginação de produtos
    $output .= '<script>
document.addEventListener("DOMContentLoaded", function() {
    // Verificar se existe parâmetro para scroll automático para produtos
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("scroll_to_products") === "1") {
        const productsContainer = document.querySelector(".viator-attraction-products");
        if (productsContainer) {
            // Scroll suave para o início da seção de produtos
            productsContainer.scrollIntoView({ 
                behavior: "smooth", 
                block: "start" 
            });
        }
    }
});
</script>';
    
    return $output;
}

// Hook para interceptar páginas de atração
function viator_handle_attraction_page() {
    global $wp_query;
    
    // Verificar se estamos numa página de atração
    if (isset($wp_query->query_vars['pagename']) && $wp_query->query_vars['pagename'] === 'atracoes') {
        $attraction_id = get_query_var('attraction_id');
        
        if (!empty($attraction_id)) {
            // Buscar dados da atração para o título
            $attraction_data = viator_get_attraction_details($attraction_id);
            $attraction_name = $attraction_data ? $attraction_data['name'] : 'Atração';
            
            // Definir título da página com múltiplos hooks para WordPress
            add_filter('wp_title', function($title) use ($attraction_name) {
                return esc_html($attraction_name) . ' | ' . get_bloginfo('name');
            }, 10, 2);
            
            add_filter('document_title_parts', function($title_parts) use ($attraction_name) {
                $title_parts['title'] = esc_html($attraction_name);
                return $title_parts;
            });
            
            add_filter('pre_get_document_title', function($title) use ($attraction_name) {
                return esc_html($attraction_name) . ' | ' . get_bloginfo('name');
            });
            
            // Adicionar meta tags no head e forçar o título com JavaScript
            add_action('wp_head', function() use ($attraction_name) {
                echo '<title>' . esc_html($attraction_name) . ' | ' . get_bloginfo('name') . '</title>' . "\n";
                echo '<script>document.title = "' . esc_js($attraction_name) . ' | ' . esc_js(get_bloginfo('name')) . '";</script>' . "\n";
            }, 1);
            
            // Carregamento do cabeçalho
            get_header();
            
            echo '<div class="container viator-attraction-page">';
            echo viator_show_attraction_details($attraction_id);
            echo '</div>';
            
            // Carregamento do rodapé
            get_footer();
            exit;
        }
    }
}
add_action('template_redirect', 'viator_handle_attraction_page');

// Função para limpar e recriar regras de reescrita
function viator_flush_rewrite_rules() {
    viator_rewrite_rules();
    flush_rewrite_rules();
}

// Ativar na ativação do plugin
register_activation_hook(__FILE__, 'viator_flush_rewrite_rules');

// Função para testar uma atração específica (para debug)
function viator_test_attraction() {
    if (isset($_GET['test_attraction']) && current_user_can('manage_options')) {
        $attraction_id = sanitize_text_field($_GET['test_attraction']);
        echo '<div style="background: #f0f0f0; padding: 20px; margin: 20px; border-left: 4px solid #04846b;">';
        echo '<h3>Teste de Atração: ' . esc_html($attraction_id) . '</h3>';
        echo '<p><strong>URL gerada:</strong> ' . esc_url(home_url('/atracoes/' . $attraction_id . '/')) . '</p>';
        
        $attraction_data = viator_get_attraction_details($attraction_id);
        if ($attraction_data) {
            echo '<p style="color: green;"><strong>✅ Dados da API encontrados!</strong></p>';
            echo '<p><strong>Nome:</strong> ' . esc_html($attraction_data['name'] ?? 'N/A') . '</p>';
            echo '<p><strong>Número de produtos:</strong> ' . esc_html($attraction_data['productCount'] ?? 'N/A') . '</p>';
        } else {
            echo '<p style="color: red;"><strong>❌ Erro ao buscar dados da API</strong></p>';
        }
        
        echo '<p><em>Para testar, adicione ?test_attraction=ID_DA_ATRACAO à URL</em></p>';
        echo '</div>';
    }
}
add_action('wp_head', 'viator_test_attraction');

// Executar flush das regras imediatamente se for admin
if (is_admin()) {
    add_action('init', function() {
        static $flushed = false;
        if (!$flushed && current_user_can('manage_options')) {
            viator_flush_rewrite_rules();
            $flushed = true;
        }
    });
}

// Função para testar atrações conhecidas
function viator_test_attraction_known() {
    if (isset($_GET['test_known_attraction']) && current_user_can('manage_options')) {
        // IDs de teste comuns da API Viator (sandbox)
        $test_attractions = [
            '2177' => 'Torre Eiffel',
            '31' => 'Loch Ness',
            '123' => 'Exemplo genérico'
        ];
        
        echo '<div style="background: #f0f0f0; padding: 20px; margin: 20px; border-left: 4px solid #04846b;">';
        echo '<h3>Teste de Atrações Conhecidas</h3>';
        
        foreach ($test_attractions as $id => $name) {
            echo '<div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 5px;">';
            echo '<h4>Testando: ' . esc_html($name) . ' (ID: ' . esc_html($id) . ')</h4>';
            echo '<p><strong>URL:</strong> <a href="' . esc_url(home_url('/atracoes/' . $id . '/')) . '" target="_blank">' . esc_url(home_url('/atracoes/' . $id . '/')) . '</a></p>';
            
            $attraction_data = viator_get_attraction_details($id);
            if ($attraction_data) {
                echo '<p style="color: green;"><strong>✅ Dados encontrados!</strong></p>';
                echo '<p><strong>Nome real:</strong> ' . esc_html($attraction_data['name'] ?? 'N/A') . '</p>';
            } else {
                echo '<p style="color: red;"><strong>❌ Não encontrado</strong></p>';
            }
            echo '</div>';
        }
        
        echo '<p><em>Para testar, adicione ?test_known_attraction=1 à URL</em></p>';
        echo '</div>';
    }
}
add_action('wp_head', 'viator_test_attraction_known');

// Função para gerar descrição de atração usando IA
function viator_get_attraction_ai_description($attraction_name, $location = '', $language = null) {
    if (!$language) {
        $language = get_option('viator_language', 'pt-BR');
    }
    
    $groq_api_key = get_option('viator_groq_api_key');
    
    if (empty($groq_api_key)) {
        // Fallback para descrição genérica
        return viator_get_fallback_attraction_description($attraction_name, $language);
    }
    
    // Preparar prompt baseado no idioma (reduzido para 1-2 frases)
    if ($language === 'pt-BR') {
        $prompt = "Escreva uma descrição turística envolvente de EXATAMENTE 1-2 frases COMPLETAS sobre a atração '{$attraction_name}'";
        if (!empty($location)) {
            $prompt .= " em {$location}";
        }
        $prompt .= ". Destaque os principais atrativos de forma cativante. SEMPRE termine com ponto final. NÃO corte palavras no meio.";
    } else {
        $prompt = "Write an engaging tourist description of EXACTLY 1-2 COMPLETE sentences about the attraction '{$attraction_name}'";
        if (!empty($location)) {
            $prompt .= " in {$location}";
        }
        $prompt .= ". Highlight the main attractions in a captivating way. ALWAYS end with a period. DO NOT cut words in the middle.";
    }
    
    $url = 'https://api.groq.com/openai/v1/chat/completions';
    
    // Obter modelo selecionado nas configurações
    $selected_model = get_option('viator_groq_model', 'llama-3.1-8b-instant');
    
    $data = [
        'model' => $selected_model,
        'messages' => [
            [
                'role' => 'user',
                'content' => $prompt
            ]
        ],
        'max_tokens' => 150,
        'temperature' => 0.7
    ];
    
    $args = [
        'method' => 'POST',
        'headers' => [
            'Authorization' => 'Bearer ' . $groq_api_key,
            'Content-Type' => 'application/json'
        ],
        'body' => json_encode($data),
        'timeout' => 30
    ];
    
    $response = wp_remote_request($url, $args);
    
    if (is_wp_error($response)) {
        viator_debug_log('Erro na requisição Groq para descrição da atração:', $response->get_error_message());
        return viator_get_fallback_attraction_description($attraction_name, $language);
    }
    
    $response_code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);
    
    if ($response_code !== 200) {
        viator_debug_log('Erro HTTP na requisição Groq para descrição da atração:', $response_code);
        return viator_get_fallback_attraction_description($attraction_name, $language);
    }
    
    $data = json_decode($body, true);
    
    if (isset($data['choices'][0]['message']['content'])) {
        $description = trim($data['choices'][0]['message']['content']);
        
        // Verificar se a descrição está completa (não termina no meio de uma palavra)
        $description = viator_ensure_complete_description($description, $attraction_name, $location, $language);
        
        viator_debug_log('Descrição IA gerada para atração com modelo ' . $selected_model . ':', $description);
        return $description;
    }
    
    return viator_get_fallback_attraction_description($attraction_name, $language);
}

// Função para descrição fallback
function viator_get_fallback_attraction_description($attraction_name, $language = null) {
    if (!$language) {
        $language = get_option('viator_language', 'pt-BR');
    }
    
    if ($language === 'pt-BR') {
        return "Descubra {$attraction_name}, uma das atrações mais fascinantes do destino. Experimente momentos únicos e inesquecíveis.";
    } else {
        return "Discover {$attraction_name}, one of the most fascinating attractions. Experience unique and unforgettable moments.";
    }
}

// Função de teste para verificar modelo Groq (apenas para admins)
function viator_test_groq_model() {
    if (isset($_GET['test_groq_model']) && current_user_can('manage_options')) {
        $selected_model = get_option('viator_groq_model', 'llama-3.1-8b-instant');
        $groq_api_key = get_option('viator_groq_api_key');
        
        echo '<div style="background: #f0f0f0; padding: 20px; margin: 20px; border-left: 4px solid #0056B3;">';
        echo '<h3>Teste do Modelo Groq IA</h3>';
        echo '<p><strong>Modelo selecionado:</strong> ' . esc_html($selected_model) . '</p>';
        
        if (empty($groq_api_key)) {
            echo '<p style="color: red;"><strong>❌ Groq API Key não configurada!</strong></p>';
        } else {
            echo '<p style="color: green;"><strong>✅ Groq API Key configurada</strong></p>';
            
            // Teste de descrição de atração
            $test_description = viator_get_attraction_ai_description('Cristo Redentor', 'Rio de Janeiro');
            if ($test_description) {
                echo '<p><strong>Teste de descrição gerada:</strong></p>';
                echo '<div style="background: white; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">';
                echo '<em>"' . esc_html($test_description) . '"</em>';
                echo '</div>';
            } else {
                echo '<p style="color: red;"><strong>❌ Erro ao gerar descrição com o modelo atual</strong></p>';
            }
        }
        
        echo '<p><em>Para testar, adicione ?test_groq_model=1 à URL (apenas para administradores)</em></p>';
        echo '</div>';
    }
}
add_action('wp_head', 'viator_test_groq_model');

// Função de teste das informações de destinos
function viator_test_destinations_info() {
    if (isset($_GET['test_destinations']) && current_user_can('manage_options')) {
        echo '<div style="max-width: 1200px; margin: 20px auto; padding: 20px; font-family: Arial, sans-serif; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">';
        echo '<h1 style="color: #0056B3; border-bottom: 2px solid #007BFF; padding-bottom: 10px;">Teste das Informações de Destinos - Viator API</h1>';
        
        // Testar requisição de destinos
        echo '<h2 style="color: #333;">📍 Teste de Requisição dos Destinos</h2>';
        $destinations_data = viator_get_destinations_data();
        
        if ($destinations_data) {
            echo '<div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 10px 0;">';
            echo '<strong>✅ Sucesso!</strong> Encontrados ' . count($destinations_data) . ' destinos.';
            echo '</div>';
            
            // Mostrar alguns exemplos
            echo '<h3 style="color: #333;">Exemplos de Destinos (primeiros 5):</h3>';
            $count = 0;
            foreach ($destinations_data as $id => $destination) {
                if ($count >= 5) break;
                
                echo '<div style="background: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #007BFF;">';
                echo '<div style="display: flex; flex-wrap: wrap; gap: 15px;">';
                echo '<div style="min-width: 200px;"><strong>ID:</strong> ' . esc_html($id) . '</div>';
                echo '<div style="min-width: 200px;"><strong>Nome:</strong> ' . esc_html($destination['name'] ?? 'N/A') . '</div>';
                echo '<div style="min-width: 150px;"><strong>Tipo:</strong> ' . esc_html($destination['type'] ?? 'N/A') . '</div>';
                echo '</div>';
                
                $extra_info = [];
                if (isset($destination['timeZone'])) {
                    $extra_info[] = '🕐 ' . esc_html($destination['timeZone']);
                }
                if (isset($destination['defaultCurrencyCode'])) {
                    $currency_name = viator_translate_currency_code($destination['defaultCurrencyCode'], 'pt-BR');
                    $extra_info[] = '💰 ' . esc_html($currency_name);
                }
                if (isset($destination['center']['latitude']) && isset($destination['center']['longitude'])) {
                    $extra_info[] = '🧭 ' . esc_html($destination['center']['latitude']) . ', ' . esc_html($destination['center']['longitude']);
                }
                
                if (!empty($extra_info)) {
                    echo '<div style="margin-top: 8px; font-size: 14px; color: #666;">' . implode(' | ', $extra_info) . '</div>';
                }
                echo '</div>';
                $count++;
            }
        } else {
            echo '<div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 10px 0;">';
            echo '<strong>❌ Erro!</strong> Não foi possível obter dados dos destinos.';
            echo '</div>';
        }
        
        // Testar com uma atração específica (exemplo)
        echo '<h2 style="color: #333; margin-top: 30px;">🏛️ Teste com Atração Específica</h2>';
        echo '<p>Digite um ID de atração para testar as informações de localização enriquecidas:</p>';
        
        if (isset($_GET['attraction_id']) && !empty($_GET['attraction_id'])) {
            $attraction_id = sanitize_text_field($_GET['attraction_id']);
            echo '<h3 style="color: #007BFF;">Testando atração ID: ' . esc_html($attraction_id) . '</h3>';
            
            $attraction_data = viator_get_attraction_details($attraction_id);
            
            if ($attraction_data) {
                $location_info = viator_get_location_info($attraction_data);
                
                echo '<div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 10px 0;">';
                echo '<strong>✅ Atração encontrada:</strong> ' . esc_html($attraction_data['name'] ?? 'N/A');
                echo '</div>';
                
                // Preview da página como ficaria
                echo '<h4 style="color: #333;">🎨 Preview da Seção de Localização:</h4>';
                echo '<div style="border: 2px dashed #007BFF; padding: 20px; margin: 15px 0; border-radius: 8px; background: #f8f9ff;">';
                
                // Simular a localização enriquecida
                if ($location_info['main_destination']) {
                    $main_dest = $location_info['main_destination'];
                    echo '<div style="background: linear-gradient(135deg, #f8f9ff, #e8f4fd); border: 1px solid #e0e7ff; border-radius: 8px; padding: 15px; margin-bottom: 20px;">';
                    echo '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">';
                    echo '<span style="color: #007BFF; font-size: 16px;">📍</span>';
                                         echo '<span style="font-weight: 600; color: #333; font-size: 16px;">' . esc_html($main_dest['name']) . '</span>';
                     if (!empty($main_dest['type'])) {
                         $translated_type = viator_translate_destination_type($main_dest['type'], 'pt-BR');
                         echo '<span style="color: #666; font-size: 14px; margin-left: 5px;">(' . esc_html($translated_type) . ')</span>';
                     }
                    echo '</div>';
                    
                                         $dest_details = [];
                     if (!empty($main_dest['timezone'])) {
                         $dest_details[] = '<span style="font-size: 13px; color: #555; background: rgba(255, 255, 255, 0.6); padding: 4px 8px; border-radius: 4px;">🕐 ' . esc_html($main_dest['timezone']) . '</span>';
                     }
                     if (!empty($main_dest['currency'])) {
                         $currency_name = viator_translate_currency_code($main_dest['currency'], 'pt-BR');
                         $dest_details[] = '<span style="font-size: 13px; color: #555; background: rgba(255, 255, 255, 0.6); padding: 4px 8px; border-radius: 4px;">💰 ' . esc_html($currency_name) . '</span>';
                     }
                    
                    if (!empty($dest_details)) {
                        echo '<div style="display: flex; flex-wrap: wrap; gap: 15px; margin-top: 8px;">';
                        echo implode(' ', $dest_details);
                        echo '</div>';
                    }
                    echo '</div>';
                }
                
                // Coordenadas se disponíveis
                if ($location_info['coordinates']) {
                    $coords = $location_info['coordinates'];
                    echo '<div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #007BFF; margin: 15px 0;">';
                    echo '<h4 style="margin: 0 0 10px 0;">🧭 Coordenadas</h4>';
                    echo '<div style="display: flex; flex-wrap: wrap; gap: 15px; align-items: center;">';
                    echo '<span style="font-family: monospace; background: white; padding: 5px 10px; border-radius: 4px; border: 1px solid #e0e0e0;">Lat: ' . esc_html($coords['latitude']) . '</span>';
                    echo '<span style="font-family: monospace; background: white; padding: 5px 10px; border-radius: 4px; border: 1px solid #e0e0e0;">Lng: ' . esc_html($coords['longitude']) . '</span>';
                    $maps_url = 'https://www.google.com/maps?q=' . urlencode($coords['latitude'] . ',' . $coords['longitude']);
                    echo '<a href="' . esc_url($maps_url) . '" target="_blank" style="background: #4285f4; color: white; padding: 8px 16px; border-radius: 5px; text-decoration: none; font-weight: 500;">🗺️ Ver no Google Maps</a>';
                    echo '</div>';
                    echo '</div>';
                }
                
                echo '</div>';
                
                // Mostrar informações processadas (formato técnico)
                echo '<h4 style="color: #333;">⚙️ Informações Técnicas Processadas:</h4>';
                echo '<pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; border: 1px solid #dee2e6; font-size: 12px;">';
                echo htmlspecialchars(json_encode($location_info, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                echo '</pre>';
                
                // Mostrar dados brutos relevantes
                echo '<h4 style="color: #333;">📡 Dados Brutos da API:</h4>';
                $relevant_data = [
                    'destinations' => $attraction_data['destinations'] ?? null,
                    'center' => $attraction_data['center'] ?? null
                ];
                echo '<pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; border: 1px solid #dee2e6; font-size: 12px;">';
                echo htmlspecialchars(json_encode($relevant_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                echo '</pre>';
            } else {
                echo '<div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 10px 0;">';
                echo '<strong>❌ Erro!</strong> Atração não encontrada ou erro na API.';
                echo '</div>';
            }
        }
        
        // Formulário para testar
        echo '<form method="GET" style="background: #e9ecef; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #ced4da;">';
        echo '<input type="hidden" name="test_destinations" value="1">';
        echo '<label for="attraction_id" style="font-weight: 600; color: #333;"><strong>ID da Atração:</strong></label><br>';
        echo '<input type="text" name="attraction_id" id="attraction_id" placeholder="Ex: 2177 (Torre Eiffel), 31 (Loch Ness)" style="width: 300px; padding: 8px; margin: 8px 0; border: 1px solid #ced4da; border-radius: 4px;">';
        echo '<button type="submit" style="padding: 8px 16px; background: #0056B3; color: white; border: none; border-radius: 4px; margin-left: 10px; cursor: pointer; font-weight: 500;">Testar Atração</button>';
        echo '</form>';
        
        // Demonstração das traduções amigáveis
        echo '<div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">';
        echo '<h3 style="color: #856404; margin-top: 0;">✨ Demonstração das Traduções Amigáveis</h3>';
        echo '<p style="color: #856404; margin-bottom: 15px;">Veja como as informações são exibidas de forma amigável ao usuário:</p>';
        echo '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">';
        
        // Exemplo de antes e depois para moeda
        echo '<div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #dc3545;">';
        echo '<h4 style="margin: 0 0 8px 0; color: #dc3545;">❌ Antes (siglas):</h4>';
        echo '<span style="font-family: monospace; background: #f8f9fa; padding: 4px 8px; border-radius: 3px;">💰 COP</span><br>';
        echo '<span style="font-family: monospace; background: #f8f9fa; padding: 4px 8px; border-radius: 3px;">🗣️ es-CO</span>';
        echo '</div>';
        
        echo '<div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #28a745;">';
        echo '<h4 style="margin: 0 0 8px 0; color: #28a745;">✅ Depois (amigável):</h4>';
        echo '<span style="background: #d4edda; padding: 4px 8px; border-radius: 3px;">💰 Peso Colombiano</span><br>';
        echo '<span style="background: #d4edda; padding: 4px 8px; border-radius: 3px;">🗣️ Espanhol Colombiano</span>';
        echo '</div>';
        
        echo '</div>';
        
        // Mais exemplos
        echo '<div style="margin-top: 15px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">';
        echo '<div style="background: white; padding: 10px; border-radius: 4px; text-align: center;"><strong>EUR</strong> → <span style="color: #007BFF;">Euro</span></div>';
        echo '<div style="background: white; padding: 10px; border-radius: 4px; text-align: center;"><strong>USD</strong> → <span style="color: #007BFF;">Dólar Americano</span></div>';
        echo '<div style="background: white; padding: 10px; border-radius: 4px; text-align: center;"><strong>es-CO</strong> → <span style="color: #007BFF;">Espanhol Colombiano</span></div>';
        echo '<div style="background: white; padding: 10px; border-radius: 4px; text-align: center;"><strong>fr-FR</strong> → <span style="color: #007BFF;">Francês da França</span></div>';
        echo '</div>';
        echo '</div>';
        
        // Informações adicionais
        echo '<div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 20px; border-radius: 8px; margin: 20px 0;">';
        echo '<h3 style="color: #0c5460; margin-top: 0;">ℹ️ Informações sobre o Sistema</h3>';
        echo '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px;">';
        echo '<div><strong>🏷️ Cache:</strong> Destinos cacheados por 7 dias (recomendação API)</div>';
        echo '<div><strong>🌐 Endpoint:</strong> /partner/destinations (todos os destinos)</div>';
        echo '<div><strong>🎯 Uso:</strong> Enriquecer páginas de atrações com localização</div>';
        echo '<div><strong>✨ Recursos:</strong> Coordenadas, timezone, moeda, idiomas, Google Maps</div>';
        echo '<div><strong>🌍 Traduções:</strong> +100 moedas e +50 idiomas traduzidos</div>';
        echo '<div><strong>🔄 Idiomas:</strong> PT-BR, EN-US com fallbacks automáticos</div>';
        echo '</div>';
        echo '</div>';
        
        // Seção de Produtos da Atração
        echo '<div style="margin-top: 40px; padding: 30px; background: #f8f9fa; border-radius: 10px; border: 2px solid #0056B3;">';
        echo '<h2 style="color: #0056B3; font-size: 24px; margin-bottom: 15px; border-bottom: 3px solid #0056B3; padding-bottom: 10px;">🎫 Sistema de Produtos da Atração</h2>';
        echo '<p style="color: #666; margin-bottom: 20px;">Novidade: Agora os códigos de produtos (productCodes) são automaticamente convertidos em cards visuais com paginação de 9 em 9.</p>';
        
        // Simulação de ProductCodes
        echo '<div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">';
        echo '<h3 style="color: #333; margin-bottom: 15px;">📋 ProductCodes da API</h3>';
        echo '<div style="font-family: monospace; background: #f8f9fa; padding: 15px; border-radius: 4px; border-left: 4px solid #007BFF;">';
        echo '"productCodes": [<br>';
        echo '&nbsp;&nbsp;&nbsp;&nbsp;"59388P114",<br>';
        echo '&nbsp;&nbsp;&nbsp;&nbsp;"160174P3",<br>';
        echo '&nbsp;&nbsp;&nbsp;&nbsp;"5549LEY1DAY",<br>';
        echo '&nbsp;&nbsp;&nbsp;&nbsp;"38676P12"<br>';
        echo ']';
        echo '</div>';
        echo '</div>';
        
        // Como funciona
        echo '<div style="background: #e7f3ff; padding: 20px; border-radius: 8px; border-left: 4px solid #007BFF; margin: 20px 0;">';
        echo '<h3 style="color: #0056B3; margin-bottom: 15px;">⚡ Como Funciona</h3>';
        echo '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">';
        
        echo '<div style="background: white; padding: 15px; border-radius: 6px;">';
        echo '<strong>🔍 1. Detecção</strong><br>';
        echo '<span style="color: #666;">Sistema detecta productCodes na resposta da API</span>';
        echo '</div>';
        
        echo '<div style="background: white; padding: 15px; border-radius: 6px;">';
        echo '<strong>📊 2. Busca Individual</strong><br>';
        echo '<span style="color: #666;">Cada código vira uma chamada à API /partner/products/{code}</span>';
        echo '</div>';
        
        echo '<div style="background: white; padding: 15px; border-radius: 6px;">';
        echo '<strong>🎨 3. Geração de Cards</strong><br>';
        echo '<span style="color: #666;">Mesma estrutura visual dos resultados de busca</span>';
        echo '</div>';
        
        echo '<div style="background: white; padding: 15px; border-radius: 6px;">';
        echo '<strong>📄 4. Paginação</strong><br>';
        echo '<span style="color: #666;">9 cards por página com navegação</span>';
        echo '</div>';
        
        echo '</div>';
        echo '</div>';
        
        // Recursos implementados
        echo '<div style="background: #d4edda; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">';
        echo '<h3 style="color: #155724; margin-bottom: 15px;">✅ Recursos Implementados</h3>';
        echo '<ul style="color: #155724; margin: 0; padding-left: 20px;">';
        echo '<li><strong>Cards visuais</strong> - EXATAMENTE IGUAIS aos resultados de busca</li>';
        echo '<li><strong>Grid responsivo</strong> - 3 cards por linha (desktop), 2 (tablet), 1 (mobile)</li>';
        echo '<li><strong>Paginação automática</strong> - 9 produtos por página</li>';
        echo '<li><strong>Preços formatados</strong> - Com descontos, símbolos de moeda corretos</li>';
        echo '<li><strong>Avaliações com estrelas</strong> - Formato idêntico aos resultados</li>';
        echo '<li><strong>Badges coloridas</strong> - Ofertas especiais, esgota rápido, novidades</li>';
        echo '<li><strong>Imagens de alta qualidade</strong> - Seleção automática da melhor variante</li>';
        echo '<li><strong>Duração formatada</strong> - Usando mesma função de tradução</li>';
        echo '<li><strong>Cancelamento gratuito</strong> - Ícone e texto quando disponível</li>';
        echo '<li><strong>Links diretos</strong> - Para páginas de detalhes dos produtos</li>';
        echo '<li><strong>Armazenamento de dados</strong> - Cache para páginas de detalhes</li>';
        echo '<li><strong>Responsividade total</strong> - Funciona perfeitamente em todos os dispositivos</li>';
        echo '</ul>';
        echo '</div>';
        
        echo '<div style="text-align: center; margin-top: 25px;">';
        echo '<p style="background: #007BFF; color: white; padding: 15px; border-radius: 8px; margin: 0; font-weight: bold;">';
        echo '🚀 Sistema completo de produtos implementado com sucesso!';
        echo '</p>';
        echo '</div>';
        
        echo '</div>';
        
        echo '<p style="text-align: center; color: #666; font-style: italic; margin-top: 30px;">Para testar, adicione ?test_destinations=1 à URL (apenas administradores)</p>';
        
        echo '</div>';
        exit;
    }
}
add_action('wp_head', 'viator_test_destinations_info');

// Registrar shortcode de atrações personalizadas
function viator_attractions_shortcode($atts) {
    $atts = shortcode_atts(array(
        'location' => '',
        'cards_desktop' => '4',
        'cards_tablet' => '3',
        'cards_mobile' => '1',
        'size' => 'medium',
        'navigation' => 'true',
        'title' => '',
        'max' => '12'
    ), $atts, 'viator_attractions');

    if (empty($atts['location'])) {
        return '<p class="viator-error">Erro: Parâmetro "location" é obrigatório no shortcode.</p>';
    }

    // Gerar HTML do carrossel personalizado
    return viator_generate_custom_attractions_carousel($atts);
}
add_shortcode('viator_attractions', 'viator_attractions_shortcode');

// Função para gerar o carrossel personalizado de atrações
function viator_generate_custom_attractions_carousel($params) {
    $location = sanitize_text_field($params['location']);
    $cards_desktop = max(1, min(8, intval($params['cards_desktop'])));
    $cards_tablet = max(1, min(6, intval($params['cards_tablet'])));
    $cards_mobile = max(1, min(3, intval($params['cards_mobile'])));
    $size = sanitize_text_field($params['size']);
    $show_navigation = ($params['navigation'] === 'true' || $params['navigation'] === '1');
    $title = sanitize_text_field($params['title']);
    $max_attractions = max(4, min(50, intval($params['max'])));

    // Validar tamanho
    $valid_sizes = ['small', 'medium', 'large', 'extra-large'];
    if (!in_array($size, $valid_sizes)) {
        $size = 'medium';
    }

    // Buscar atrações baseadas no location
    $attractions = viator_search_attractions_for_carousel($location, $max_attractions);
    
    if (empty($attractions)) {
        return '<div class="viator-error">Nenhuma atração encontrada para: ' . esc_html($location) . '</div>';
    }

    // Gerar ID único para este carrossel
    $carousel_id = 'viator-custom-carousel-' . uniqid();
    $navigation_prev = $carousel_id . '-prev';
    $navigation_next = $carousel_id . '-next';

    ob_start();
    ?>
    <div class="viator-custom-attractions-section <?php echo esc_attr($size); ?>">
        <?php if (!empty($title)): ?>
            <div class="viator-custom-attractions-header">
                <h2><?php echo esc_html($title); ?></h2>
            </div>
        <?php endif; ?>
        
        <div class="viator-custom-attractions-carousel-container">
            <?php if ($show_navigation): ?>
                <div class="viator-custom-swiper-button-prev <?php echo esc_attr($navigation_prev); ?>">
                    <ion-icon name="chevron-back-outline"></ion-icon>
                </div>
                <div class="viator-custom-swiper-button-next <?php echo esc_attr($navigation_next); ?>">
                    <ion-icon name="chevron-forward-outline"></ion-icon>
                </div>
            <?php endif; ?>
            
            <div class="viator-custom-attractions-swiper <?php echo esc_attr($carousel_id); ?>">
                <div class="swiper-wrapper">
                    <?php foreach ($attractions as $attraction): ?>
                        <div class="swiper-slide">
                            <div class="viator-custom-attraction-card">
                                <a href="<?php echo esc_url($attraction['url']); ?>" 
                                   class="viator-custom-attraction-link" 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   title="Ver detalhes de <?php echo esc_attr($attraction['name']); ?> (abre em nova aba)">
                                    <img src="<?php echo esc_url($attraction['image']); ?>" 
                                         alt="<?php echo esc_attr($attraction['name']); ?>"
                                         loading="lazy">
                                    <div class="viator-custom-attraction-overlay">
                                        <div class="viator-custom-attraction-title">
                                            <?php echo esc_html($attraction['name']); ?>
                                        </div>
                                    </div>
                                </a>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>
    </div>

    <script>
    document.addEventListener('DOMContentLoaded', function() {
        // Inicializar carrossel específico
        if (typeof Swiper !== 'undefined') {
            new Swiper('.<?php echo esc_js($carousel_id); ?>', {
                slidesPerView: <?php echo $cards_mobile; ?>,
                spaceBetween: 15,
                <?php if ($show_navigation): ?>
                navigation: {
                    nextEl: '.<?php echo esc_js($navigation_next); ?>',
                    prevEl: '.<?php echo esc_js($navigation_prev); ?>',
                },
                <?php endif; ?>
                breakpoints: {
                    480: {
                        slidesPerView: Math.min(<?php echo $cards_mobile; ?> + 1, <?php echo $cards_tablet; ?>),
                        spaceBetween: 15
                    },
                    768: {
                        slidesPerView: <?php echo $cards_tablet; ?>,
                        spaceBetween: 20
                    },
                    1024: {
                        slidesPerView: <?php echo $cards_desktop; ?>,
                        spaceBetween: 20
                    }
                }
            });
        }
    });
    </script>
    <?php
    return ob_get_clean();
}

// Função para buscar atrações baseadas no parâmetro location
function viator_search_attractions_for_carousel($location, $max_results = 12) {
    $api_key = get_option('viator_api_key');
    if (empty($api_key)) {
        return array();
    }

    // Obter configurações de idioma e moeda
    $locale_settings = viator_get_locale_settings();
    
    // Criar chave de cache única baseada nos parâmetros
    $cache_key = 'viator_attractions_carousel_' . md5($location . $max_results . $locale_settings['currency'] . $locale_settings['accept_language']);
    
    // Tentar obter dados do cache primeiro
    $cached_data = get_transient($cache_key);
    if ($cached_data !== false) {
        return $cached_data;
    }
    
    $url = "https://api.sandbox.viator.com/partner/search/freetext";

    // Primeiro, tentar buscar como atração específica por ID
    if (is_numeric($location)) {
        $attractions_data = viator_search_by_attraction_id($location, $api_key, $locale_settings);
        if (!empty($attractions_data)) {
            return array_slice($attractions_data, 0, $max_results);
        }
    }

    // Se não for ID ou não encontrou, buscar por texto livre
    $body_data = [
        "searchTerm" => $location,
        "productSorting" => ['sort' => 'DEFAULT'],
        "productFiltering" => [
            "dateRange" => [
                "from" => date('Y-m-d'),
                "to" => date('Y-m-d', strtotime('+1 year'))
            ]
        ],
        "searchTypes" => [
            ["searchType" => "ATTRACTIONS", "pagination" => ["start" => 1, "count" => $max_results]]
        ],
        "currency" => $locale_settings['currency']
    ];

    $headers = [
        'Accept' => 'application/json;version=2.0',
        'Content-Type' => 'application/json;version=2.0',
        'exp-api-key' => $api_key,
        'Accept-Language' => $locale_settings['accept_language'],
    ];

    $args = [
        'method' => 'POST',
        'headers' => $headers,
        'body' => json_encode($body_data),
        'timeout' => 30
    ];

    $response = wp_remote_request($url, $args);

    if (is_wp_error($response)) {
        return array();
    }

    $response_code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);

    if ($response_code !== 200) {
        return array();
    }

    $data = json_decode($body, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        return array();
    }

    if (!isset($data['attractions']['results']) || empty($data['attractions']['results'])) {
        return array();
    }

    // Processar resultados
    $processed_attractions = array();
    foreach ($data['attractions']['results'] as $attraction) {
        $processed_attractions[] = viator_process_attraction_for_carousel($attraction);
    }

    // Salvar no cache por 7 dias (7 * 24 * 60 * 60 = 604800 segundos)
    set_transient($cache_key, $processed_attractions, 7 * DAY_IN_SECONDS);

    return $processed_attractions;
}

// Função para limpar cache dos carrosséis de atrações
function viator_clear_attractions_cache() {
    global $wpdb;
    
    // Limpar todos os transients relacionados aos carrosséis
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_viator_attractions_carousel_%'");
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_viator_attractions_carousel_%'");
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_viator_attraction_id_%'");
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_viator_attraction_id_%'");
    
    // Log para confirmar limpeza
    viator_debug_log('Cache de carrosséis limpo manualmente via admin');
    
    return true;
}

// Função para limpar cache dos carrosséis de tours
function viator_clear_tours_cache() {
    global $wpdb;
    
    // Limpar todos os transients relacionados aos carrosséis de tours
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_viator_tours_search_%'");
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_viator_tours_search_%'");
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_viator_tours_codes_%'");
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_viator_tours_codes_%'");
    
    // Log para confirmar limpeza
    viator_debug_log('Cache de carrosséis de tours limpo manualmente via admin');
    
    return true;
}

// Hook para limpar cache de tours via admin
add_action('wp_ajax_viator_clear_tours_cache', 'viator_ajax_clear_tours_cache');
function viator_ajax_clear_tours_cache() {
    // Verificar permissões
    if (!current_user_can('manage_options')) {
        wp_die(json_encode(['success' => false, 'data' => ['message' => 'Sem permissão']]));
    }
    
    try {
        viator_clear_tours_cache();
        wp_send_json_success(['message' => 'Cache de tours limpo com sucesso!']);
    } catch (Exception $e) {
        wp_send_json_error(['message' => 'Erro ao limpar cache: ' . $e->getMessage()]);
    }
}

// Hook para limpar cache via admin
add_action('wp_ajax_viator_clear_cache', 'viator_ajax_clear_cache');
function viator_ajax_clear_cache() {
    // Verificar permissões
    if (!current_user_can('manage_options')) {
        wp_die('Permissão negada');
    }
    
    // Verificar nonce para segurança
    if (!wp_verify_nonce($_POST['nonce'], 'viator_clear_cache')) {
        wp_die('Nonce inválido');
    }
    
    $cleared = viator_clear_attractions_cache();
    
    if ($cleared) {
        wp_send_json_success(array('message' => 'Cache limpo com sucesso!'));
    } else {
        wp_send_json_error(array('message' => 'Erro ao limpar cache.'));
    }
}

// Função para buscar por ID específico de atração
function viator_search_by_attraction_id($attraction_id, $api_key, $locale_settings) {
    // Criar chave de cache para busca por ID específico
    $cache_key = 'viator_attraction_id_' . md5($attraction_id . $locale_settings['currency'] . $locale_settings['accept_language']);
    
    // Tentar obter dados do cache primeiro
    $cached_data = get_transient($cache_key);
    if ($cached_data !== false) {
        return $cached_data;
    }
    
    // Buscar dados da atração específica
    $attraction_data = viator_get_attraction_details($attraction_id);
    
    if (!$attraction_data) {
        return array();
    }

    // Se encontrou a atração, procurar atrações relacionadas na mesma localização
    $location_name = '';
    if (isset($attraction_data['destinations']) && !empty($attraction_data['destinations'])) {
        // Pegar o primeiro destino como referência
        $main_destination = $attraction_data['destinations'][0];
        $location_name = $main_destination['name'] ?? '';
    }

    if (empty($location_name)) {
        // Se não conseguir determinar localização, retornar apenas a atração atual
        $result = [viator_process_attraction_for_carousel($attraction_data)];
        // Salvar no cache por 7 dias
        set_transient($cache_key, $result, 7 * DAY_IN_SECONDS);
        return $result;
    }

    // Buscar outras atrações na mesma localização
    $result = viator_search_attractions_for_carousel($location_name, 12);
    // Salvar no cache por 7 dias
    set_transient($cache_key, $result, 7 * DAY_IN_SECONDS);
    return $result;
}

// Registrar shortcode de passeios/produtos
function viator_tours_shortcode($atts) {
    $atts = shortcode_atts(array(
        'search' => '',
        'codes' => '',
        'cards_desktop' => '4',
        'cards_tablet' => '3',
        'cards_mobile' => '1',
        'size' => 'medium',
        'navigation' => 'true',
        'title' => '',
        'max' => '12'
    ), $atts, 'viator_tours');

    // Validar se pelo menos um parâmetro de busca foi fornecido
    if (empty($atts['search']) && empty($atts['codes'])) {
        return '<p class="viator-error">Erro: É necessário fornecer "search" ou "codes" no shortcode [viator_tours].</p>';
    }

    // Gerar HTML do carrossel de tours
    return viator_generate_tours_carousel($atts);
}
add_shortcode('viator_tours', 'viator_tours_shortcode');

// Função para gerar o carrossel de tours/produtos
function viator_generate_tours_carousel($params) {
    $search_term = sanitize_text_field($params['search']);
    $product_codes = sanitize_text_field($params['codes']);
    $cards_desktop = max(1, min(8, intval($params['cards_desktop'])));
    $cards_tablet = max(1, min(6, intval($params['cards_tablet'])));
    $cards_mobile = max(1, min(3, intval($params['cards_mobile'])));
    $size = sanitize_text_field($params['size']);
    $show_navigation = ($params['navigation'] === 'true' || $params['navigation'] === '1');
    $title = sanitize_text_field($params['title']);
    $max_products = max(4, min(50, intval($params['max'])));

    // Validar tamanho
    $valid_sizes = ['small', 'medium', 'large', 'extra-large'];
    if (!in_array($size, $valid_sizes)) {
        $size = 'medium';
    }

    // Buscar produtos baseados nos parâmetros
    if (!empty($search_term)) {
        $products = viator_search_products_for_carousel($search_term, $max_products);
    } else {
        $products = viator_get_products_by_codes($product_codes);
    }
    
    if (empty($products)) {
        $search_display = !empty($search_term) ? $search_term : 'códigos específicos';
        return '<div class="viator-error">Nenhum produto encontrado para: ' . esc_html($search_display) . '</div>';
    }

    // Gerar ID único para este carrossel
    $carousel_id = 'viator-tours-carousel-' . uniqid();
    $navigation_prev = $carousel_id . '-prev';
    $navigation_next = $carousel_id . '-next';

    ob_start();
    ?>
    <div class="viator-tours-section <?php echo esc_attr($size); ?>">
        <?php if (!empty($title)): ?>
            <div class="viator-tours-header">
                <h3 class="viator-tours-title"><?php echo esc_html($title); ?></h3>
            </div>
        <?php endif; ?>
        
        <div class="viator-tours-carousel-container">
            <?php if ($show_navigation): ?>
                <div class="viator-tours-nav-prev <?php echo esc_attr($navigation_prev); ?>">
                    <ion-icon name="chevron-back-outline"></ion-icon>
                </div>
                <div class="viator-tours-nav-next <?php echo esc_attr($navigation_next); ?>">
                    <ion-icon name="chevron-forward-outline"></ion-icon>
                </div>
            <?php endif; ?>
            
            <div class="viator-tours-swiper swiper <?php echo esc_attr($carousel_id); ?>">
                <div class="swiper-wrapper">
                    <?php foreach ($products as $product): ?>
                        <div class="swiper-slide">
                            <?php echo viator_generate_tour_card($product); ?>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>
    </div>

    <script>
    document.addEventListener('DOMContentLoaded', function() {
        if (typeof Swiper !== 'undefined') {
            new Swiper('.<?php echo esc_js($carousel_id); ?>', {
                slidesPerView: <?php echo $cards_mobile; ?>,
                spaceBetween: 15,
                <?php if ($show_navigation): ?>
                navigation: {
                    nextEl: '.<?php echo esc_js($navigation_next); ?>',
                    prevEl: '.<?php echo esc_js($navigation_prev); ?>',
                },
                <?php endif; ?>
                breakpoints: {
                    768: {
                        slidesPerView: <?php echo $cards_tablet; ?>,
                        spaceBetween: 20
                    },
                    1200: {
                        slidesPerView: <?php echo $cards_desktop; ?>,
                        spaceBetween: 20
                    }
                },
                loop: <?php echo count($products) > $cards_desktop ? 'true' : 'false'; ?>,
                autoplay: false,
                grabCursor: true,
                centeredSlides: false
            });
        }
    });
    </script>
    <?php
    return ob_get_clean();
}

// Função para buscar produtos via API baseado em termo de busca
function viator_search_products_for_carousel($search_term, $max_results = 12) {
    $api_key = get_option('viator_api_key');
    if (empty($api_key)) {
        return array();
    }

    // Obter configurações de idioma e moeda
    $locale_settings = viator_get_locale_settings();
    
    // Criar chave de cache única
    $cache_key = 'viator_tours_search_' . md5($search_term . $max_results . $locale_settings['currency'] . $locale_settings['accept_language']);
    
    // Tentar obter dados do cache primeiro
    $cached_data = get_transient($cache_key);
    if ($cached_data !== false) {
        return $cached_data;
    }
    
    $url = "https://api.sandbox.viator.com/partner/search/freetext";

    $body_data = [
        "searchTerm" => $search_term,
        "productSorting" => ['sort' => 'DEFAULT'],
        "productFiltering" => [
            "dateRange" => [
                "from" => date('Y-m-d'),
                "to" => date('Y-m-d', strtotime('+1 year'))
            ],
            "includeAutomaticTranslations" => true
        ],
        "searchTypes" => [
            ["searchType" => "PRODUCTS", "pagination" => ["start" => 1, "count" => $max_results]]
        ],
        "currency" => $locale_settings['currency']
    ];

    $headers = [
        'Accept' => 'application/json;version=2.0',
        'Content-Type' => 'application/json;version=2.0',
        'exp-api-key' => $api_key,
        'Accept-Language' => $locale_settings['accept_language'],
    ];

    $args = [
        'method' => 'POST',
        'headers' => $headers,
        'body' => json_encode($body_data),
        'timeout' => 30
    ];

    $response = wp_remote_request($url, $args);

    if (is_wp_error($response)) {
        return array();
    }

    $response_code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);

    if ($response_code !== 200) {
        return array();
    }

    $data = json_decode($body, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        return array();
    }

    if (!isset($data['products']['results']) || empty($data['products']['results'])) {
        return array();
    }

    // Processar resultados
    $processed_products = array();
    foreach ($data['products']['results'] as $product) {
        $processed_products[] = viator_process_product_for_carousel($product);
    }

    // Salvar no cache por 7 dias
    set_transient($cache_key, $processed_products, 7 * DAY_IN_SECONDS);

    return $processed_products;
}

// Função para buscar produtos específicos por códigos
function viator_get_products_by_codes($codes_string) {
    $api_key = get_option('viator_api_key');
    if (empty($api_key)) {
        return array();
    }

    // Limpar e separar códigos
    $codes = array_map('trim', explode(',', $codes_string));
    $codes = array_filter($codes); // Remove valores vazios
    
    if (empty($codes)) {
        return array();
    }

    // Obter configurações de idioma e moeda
    $locale_settings = viator_get_locale_settings();
    
    // Criar chave de cache única
    $cache_key = 'viator_tours_codes_' . md5(implode(',', $codes) . $locale_settings['currency'] . $locale_settings['accept_language']);
    
    // Tentar obter dados do cache primeiro
    $cached_data = get_transient($cache_key);
    if ($cached_data !== false) {
        return $cached_data;
    }

    $products = array();
    
    // Buscar cada produto individualmente
    foreach ($codes as $product_code) {
        $product_data = viator_get_product_data_for_carousel($product_code, $api_key, $locale_settings);
        if ($product_data) {
            $products[] = viator_process_product_for_carousel($product_data);
        }
    }

    // Salvar no cache por 7 dias
    set_transient($cache_key, $products, 7 * DAY_IN_SECONDS);

    return $products;
}

// Função para buscar dados de um produto específico para o carrossel
function viator_get_product_data_for_carousel($product_code, $api_key, $locale_settings) {
    $url = "https://api.sandbox.viator.com/partner/search/freetext";
    
    // Buscar pelo código específico do produto
    $body_data = [
        "searchTerm" => $product_code,
        "productSorting" => ['sort' => 'DEFAULT'],
        "productFiltering" => [
            "dateRange" => [
                "from" => date('Y-m-d'),
                "to" => date('Y-m-d', strtotime('+1 year'))
            ],
            "includeAutomaticTranslations" => true
        ],
        "searchTypes" => [
            ["searchType" => "PRODUCTS", "pagination" => ["start" => 1, "count" => 10]]
        ],
        "currency" => $locale_settings['currency']
    ];
    
    $headers = [
        'Accept' => 'application/json;version=2.0',
        'Content-Type' => 'application/json;version=2.0',
        'exp-api-key' => $api_key,
        'Accept-Language' => $locale_settings['accept_language'],
    ];
    
    $args = [
        'method' => 'POST',
        'headers' => $headers,
        'body' => json_encode($body_data),
        'timeout' => 30
    ];
    
    $response = wp_remote_request($url, $args);
    
    if (is_wp_error($response)) {
        return false;
    }
    
    $response_code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);
    
    if ($response_code !== 200) {
        return false;
    }
    
    $data = json_decode($body, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        return false;
    }
    
    if (!isset($data['products']['results']) || empty($data['products']['results'])) {
        return false;
    }
    
    // Procurar pelo produto específico
    foreach ($data['products']['results'] as $product) {
        if (isset($product['productCode']) && $product['productCode'] === $product_code) {
            return $product;
        }
    }
    
    // Se não encontrou o exato, retornar o primeiro (fallback)
    return $data['products']['results'][0];
}

// Função para processar dados de produto para o carrossel
function viator_process_product_for_carousel($product_data) {
    $title = $product_data['title'] ?? 'Produto';
    $description = $product_data['description'] ?? '';
    $product_code = $product_data['productCode'] ?? '';
    
    // Obter melhor imagem
    $image_url = 'https://via.placeholder.com/400x200';
    if (isset($product_data['images'][0]['variants'][3]['url'])) {
        $image_url = $product_data['images'][0]['variants'][3]['url'];
    } elseif (isset($product_data['images'][0]['variants'][0]['url'])) {
        $image_url = $product_data['images'][0]['variants'][0]['url'];
    } elseif (isset($product_data['images'][0]['url'])) {
        $image_url = $product_data['images'][0]['url'];
    }
    
    // Avaliações
    $rating = isset($product_data['reviews']['combinedAverageRating']) ? 
              number_format($product_data['reviews']['combinedAverageRating'], 1) : null;
    $total_reviews = isset($product_data['reviews']['totalReviews']) ? 
                     $product_data['reviews']['totalReviews'] : 0;
    
    // Preço
    $price = null;
    $original_price = null;
    if (isset($product_data['pricing']['summary']['fromPrice'])) {
        $price = $product_data['pricing']['summary']['fromPrice'];
    }
    if (isset($product_data['pricing']['summary']['fromPriceBeforeDiscount'])) {
        $original_price = $product_data['pricing']['summary']['fromPriceBeforeDiscount'];
    }
    
    // Duração
    $duration = null;
    $duration_data = null;
    if (isset($product_data['duration'])) {
        $duration_fixed = $product_data['duration']['fixedDurationInMinutes'] ?? null;
        $duration_from = $product_data['duration']['variableDurationFromMinutes'] ?? null;
        $duration_to = $product_data['duration']['variableDurationToMinutes'] ?? null;
        $duration_unstructured = $product_data['duration']['unstructuredDuration'] ?? null;
        
        $duration = viator_format_duration($duration_fixed, $duration_from, $duration_to, $duration_unstructured);
        
        // Armazenar dados brutos de duração para salvar posteriormente
        $duration_data = array(
            'fixedDurationInMinutes' => $duration_fixed,
            'variableDurationFromMinutes' => $duration_from,
            'variableDurationToMinutes' => $duration_to,
            'unstructuredDuration' => $duration_unstructured
        );
    }
    
    // Flags
    $flags = isset($product_data['flags']) ? $product_data['flags'] : array();
    
    return [
        'title' => $title,
        'description' => $description,
        'product_code' => $product_code,
        'image_url' => $image_url,
        'rating' => $rating,
        'total_reviews' => $total_reviews,
        'price' => $price,
        'original_price' => $original_price,
        'duration' => $duration,
        'duration_data' => $duration_data,
        'flags' => $flags,
        'product_url' => home_url('/passeio/' . $product_code . '/')
    ];
}

// Função para gerar um card de tour/produto usando estrutura padrão .viator-card
function viator_generate_tour_card($product) {
    $locale_settings = viator_get_locale_settings();
    $currency_symbol = $locale_settings['currency_symbol'];
    
    // Processar avaliações
    $rating_text = '';
    $rating_count = '';
    if ($product['rating'] && $product['total_reviews'] > 0) {
        $rating_text = number_format($product['rating'], 1) . '⭐';
        if ($product['total_reviews'] == 1) {
            $rating_count = '(1 ' . viator_t('review') . ')';
        } else {
            $rating_count = '(' . $product['total_reviews'] . ' ' . viator_t('reviews') . ')';
        }
    } else {
        $rating_text = viator_t('no_reviews');
    }
    
    // Processar preços
    $price_html = '';
    if ($product['price']) {
        if ($product['original_price'] && $product['original_price'] > $product['price']) {
            // Com desconto
            $original_price = number_format($product['original_price'], 2, ',', '.');
            $discounted_price = number_format($product['price'], 2, ',', '.');
            $price_html = '<span class="viator-original-price">' . $currency_symbol . ' ' . $original_price . '</span> <span class="viator-discount-price">' . $currency_symbol . ' ' . $discounted_price . '</span>';
        } else {
            // Preço normal
            $price = number_format($product['price'], 2, ',', '.');
            $price_html = '<strong>' . $currency_symbol . ' ' . $price . '</strong>';
        }
    } else {
        $price_html = viator_t('price_not_available');
    }
    
    // Processar flags para badges (igual aos cards de busca)
    $flag_output = '';
    if (isset($product['flags']) && is_array($product['flags'])) {
        if (in_array('LIKELY_TO_SELL_OUT', $product['flags'])) {
            $flag_output .= '<span class="viator-badge" data-type="sell-out">' . esc_html(viator_t('likely_to_sell_out_badge')) . '</span>';
        }
        if (in_array('SPECIAL_OFFER', $product['flags'])) {
            $flag_output .= '<span class="viator-badge" data-type="special-offer">' . esc_html(viator_t('special_offer_badge')) . '</span>';
        }
    }
    
    ob_start();
    ?>
    <div class="viator-card">
        <div class="viator-card-img">
            <img src="<?php echo esc_url($product['image_url']); ?>" 
                 alt="<?php echo esc_attr($product['title']); ?>" 
                 loading="lazy">
            
            <?php if (!empty($flag_output)): ?>
                <div class="viator-badge-container"><?php echo $flag_output; ?></div>
            <?php endif; ?>
        </div>
        
        <div class="viator-card-content">
            <p class="viator-card-rating"><?php echo esc_html($rating_text . ' ' . $rating_count); ?></p>
            <h3><?php echo esc_html($product['title']); ?></h3>
            
            <?php if (!empty($product['description'])): ?>
                <p><?php echo esc_html(wp_trim_words($product['description'], 15, '...')); ?></p>
            <?php endif; ?>
            
            <?php if (isset($product['flags']) && is_array($product['flags']) && in_array('FREE_CANCELLATION', $product['flags'])): ?>
                <p class="viator-card-duration">
                    <img src="https://img.icons8.com/?size=100&id=85097&format=png&color=04846b" 
                         alt="Cancelamento gratuito" title="Política de cancelamento" width="15" height="15"> 
                    <?php echo esc_html(viator_t('free_cancellation_badge')); ?>
                </p>
            <?php endif; ?>
            
            <?php if ($product['duration']): ?>
                <p class="viator-card-duration">
                    <img src="https://img.icons8.com/?size=100&id=82767&format=png&color=000000" 
                         alt="Duração" title="Duração aproximada" width="15" height="15"> 
                    <?php echo esc_html($product['duration']); ?>
                </p>
            <?php endif; ?>
            
            <p class="viator-card-price">
                <img src="https://img.icons8.com/?size=100&id=ZXJaNFNjWGZF&format=png&color=000000" 
                     alt="Preço" width="15" height="15"> 
                <?php echo esc_html(viator_t('from_price')); ?> <?php echo $price_html; ?>
            </p>
            
            <a href="<?php echo esc_url($product['product_url']); ?>" target="_blank" rel="noopener noreferrer">
                <?php echo esc_html(viator_t('see_details')); ?>
            </a>
        </div>
    </div>
    <?php
    
    // CRÍTICO: Salvar dados do produto para uso na página de detalhes
    if (!empty($product['product_code'])) {
        // Filtrar flags NEW_ON_VIATOR (política da Viator)
        $filtered_flags = array();
        if (isset($product['flags']) && is_array($product['flags'])) {
            $filtered_flags = array_filter($product['flags'], function($flag) {
                return $flag !== 'NEW_ON_VIATOR';
            });
        }
        
        $product_storage_data = array(
            'fromPrice' => $product['price'],
            'fromPriceBeforeDiscount' => $product['original_price'],
            'duration' => $product['duration'],
            'duration_data' => $product['duration_data'] ?? array(),
            'flags' => $filtered_flags,
            'last_saved' => current_time('timestamp'),
            'source' => 'tours_carousel'
        );
        update_option('viator_product_' . $product['product_code'] . '_price', $product_storage_data, false);
    }
    
    return ob_get_clean();
}

// Função para processar dados de atração para o carrossel
function viator_process_attraction_for_carousel($attraction_data) {
    $name = $attraction_data['name'] ?? 'Atração';
    
    // Capturar o attractionId usando a mesma lógica do carrossel original
    $attraction_id = isset($attraction_data['attractionId']) ? $attraction_data['attractionId'] : '';
    
    // Tentar diferentes caminhos para pegar o ID da atração
    if (empty($attraction_id)) {
        // Tentar outros campos possíveis para o ID
        if (isset($attraction_data['id'])) {
            $attraction_id = $attraction_data['id'];
        } elseif (isset($attraction_data['attractionCode'])) {
            $attraction_id = $attraction_data['attractionCode'];
        } elseif (isset($attraction_data['code'])) {
            $attraction_id = $attraction_data['code'];
        }
    }
    
    // Log para debug
    viator_debug_log('Processando atração para carrossel personalizado:', [
        'name' => $name,
        'attractionId' => $attraction_id,
        'attraction_keys' => array_keys($attraction_data),
        'full_attraction_data' => $attraction_data
    ]);
    
    // Obter melhor imagem usando a mesma lógica do carrossel original
    $image_url = '';
    if (isset($attraction_data['images']) && !empty($attraction_data['images'])) {
        if (isset($attraction_data['images'][0]['url'])) {
            $image_url = $attraction_data['images'][0]['url'];
        } elseif (isset($attraction_data['images'][0]['variants'][0]['url'])) {
            $image_url = $attraction_data['images'][0]['variants'][0]['url'];
        } else {
            // Usar função existente como fallback
            $best_image = viator_get_best_attraction_image($attraction_data['images']);
            if ($best_image) {
                $image_url = $best_image;
            }
        }
    }
    
    // Fallback para placeholder se não houver imagem
    if (empty($image_url)) {
        $image_url = 'https://via.placeholder.com/400x200/04846b/ffffff?text=' . urlencode($name);
    }
    
    // Gerar URL da atração
    $has_valid_id = !empty($attraction_id);
    $url = $has_valid_id ? home_url('/atracoes/' . $attraction_id . '/') : '#';
    
    viator_debug_log('Link gerado para carrossel personalizado:', [
        'name' => $name,
        'id' => $attraction_id,
        'has_valid_id' => $has_valid_id,
        'url' => $url
    ]);

    return [
        'name' => $name,
        'image' => $image_url,
        'url' => $url,
        'id' => $attraction_id
    ];
}

/**
 * AJAX handler for clearing exchange rates cache.
 */
function viator_clear_exchange_rates_cache_ajax() {
    if (!wp_verify_nonce($_POST['nonce'], 'viator_admin_nonce')) {
        wp_send_json_error('Security error');
        return;
    }
    if (!current_user_can('manage_options')) {
        wp_send_json_error('Insufficient permissions');
        return;
    }
    
    delete_transient('viator_exchange_rates');
    viator_debug_log("Exchange rates cache cleared manually.");
    
    wp_send_json_success([
        'message' => 'Cache de taxas de câmbio limpo com sucesso.',
    ]);
}
add_action('wp_ajax_viator_clear_exchange_rates_cache', 'viator_clear_exchange_rates_cache_ajax');

/**
 * AJAX handler for testing exchange rates API.
 */
function viator_test_exchange_rates_ajax() {
    // Force error logging for debugging
    error_log('[VIATOR TEST] Function viator_test_exchange_rates_ajax called');
    
    if (!wp_verify_nonce($_POST['nonce'], 'viator_admin_nonce')) {
        error_log('[VIATOR TEST] Security error - nonce verification failed');
        wp_send_json_error('Security error');
        return;
    }
    if (!current_user_can('manage_options')) {
        error_log('[VIATOR TEST] Insufficient permissions');
        wp_send_json_error('Insufficient permissions');
        return;
    }
    
    error_log('[VIATOR TEST] Starting exchange rates test');
    viator_debug_log('Exchange rates API test started');
    
    // Clear cache to force fresh fetch
    delete_transient('viator_exchange_rates');
    error_log('[VIATOR TEST] Cache cleared for fresh test');
    
    // Fetch fresh exchange rates
    error_log('[VIATOR TEST] About to call viator_fetch_exchange_rates()');
    $rates_data = viator_fetch_exchange_rates();
    error_log('[VIATOR TEST] viator_fetch_exchange_rates() returned: ' . ($rates_data ? 'SUCCESS' : 'NULL/FALSE'));
    
    if (!$rates_data) {
        error_log('[VIATOR TEST] Exchange rates test failed: No data returned from viator_fetch_exchange_rates()');
        wp_send_json_error('Falha ao buscar taxas de câmbio da API. Verifique os logs para mais detalhes.');
        return;
    }
    
    viator_debug_log('Exchange rates test successful', ['data_keys' => array_keys($rates_data)]);
    
    // Extract info for display
    $source_currencies = [];
    $target_currencies = [];
    $example_rate = 'N/A';
    $earliest_expiry = null;
    
    foreach ($rates_data['rates'] as $rate_info) {
        $source_currencies[] = $rate_info['sourceCurrency'];
        $target_currencies[] = $rate_info['targetCurrency'];
        
        // Get USD to BRL example if available
        if ($rate_info['sourceCurrency'] === 'USD' && $rate_info['targetCurrency'] === 'BRL') {
            $example_rate = number_format($rate_info['rate'], 4);
        }
        
        // Track earliest expiry
        if (isset($rate_info['expiry'])) {
            $rate_expiry = strtotime($rate_info['expiry']);
            if (!$earliest_expiry || $rate_expiry < $earliest_expiry) {
                $earliest_expiry = $rate_expiry;
            }
        }
    }
    
    $response_data = [
        'expiry' => $earliest_expiry ? date('Y-m-d H:i:s', $earliest_expiry) : 'N/A',
        'rates_count' => count($rates_data['rates']),
        'source_currencies' => array_values(array_unique($source_currencies)),
        'target_currencies' => array_values(array_unique($target_currencies)),
        'example_rate' => $example_rate
    ];
    
    error_log('[VIATOR TEST] Sending response: ' . print_r($response_data, true));
    wp_send_json_success($response_data);
}
add_action('wp_ajax_viator_test_exchange_rates', 'viator_test_exchange_rates_ajax');

/**
 * Fetches and caches exchange rates from the Viator API.
 * This is a core function to comply with Viator Partner Program requirements.
 *
 * @return array The raw API response with rates and expiry.
 */
function viator_fetch_exchange_rates() {
    error_log('[VIATOR TEST] viator_fetch_exchange_rates() function called');
    
    $api_key = get_option('viator_api_key');
    error_log('[VIATOR TEST] API key check - Length: ' . strlen($api_key));
    
    if (empty($api_key)) {
        error_log('[VIATOR TEST] Exchange rates fetch failed: API key not configured');
        return null;
    }

    // Currencies supported by Viator for pricing
    $source_currencies = ['AED', 'ARS', 'AUD', 'BRL', 'CAD', 'CHF', 'CLP', 'CNY', 'COP', 'DKK', 'EUR', 'FJD', 'GBP', 'HKD', 'IDR', 'ILS', 'INR', 'ISK', 'JPY', 'KRW', 'MXN', 'MYR', 'NOK', 'NZD', 'PEN', 'PHP', 'PLN', 'RUB', 'SEK', 'SGD', 'THB', 'TRY', 'TWD', 'USD', 'VND', 'ZAR'];
    
    // Currencies supported by Viator for payment/booking + BRL for your site
    $target_currencies = ['GBP', 'EUR', 'USD', 'AUD', 'BRL'];

    error_log('[VIATOR TEST] VIATOR PARTNER REQUIREMENT: Fetching exchange rates from /partner/exchange-rates');
    
    $url = viator_get_api_base_url() . '/partner/exchange-rates';
    error_log('[VIATOR TEST] API URL: ' . $url);
    
    $request_body = [
        'sourceCurrencies' => $source_currencies,
        'targetCurrencies' => $target_currencies
    ];
    
    error_log('[VIATOR TEST] Exchange rates request details - URL: ' . $url . ', Source currencies: ' . count($source_currencies) . ', Target currencies: ' . count($target_currencies) . ', API key length: ' . strlen($api_key));

    error_log('[VIATOR TEST] About to make wp_remote_post call');
    
    $response = wp_remote_post($url, [
        'headers' => [
            'Accept' => 'application/json;version=2.0',
            'Content-Type' => 'application/json;version=2.0',
            'exp-api-key' => $api_key,
        ],
        'body' => json_encode($request_body),
        'timeout' => 30
    ]);

    error_log('[VIATOR TEST] wp_remote_post completed');

    if (is_wp_error($response)) {
        error_log('[VIATOR TEST] Error fetching exchange rates - WP Error: ' . $response->get_error_message());
        return null;
    }

    $response_code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);
    
    error_log('[VIATOR TEST] Exchange rates API response - Code: ' . $response_code . ', Body length: ' . strlen($body));
    error_log('[VIATOR TEST] Response body preview: ' . substr($body, 0, 500));

    $data = json_decode($body, true);
    $json_error = json_last_error();
    
    error_log('[VIATOR TEST] JSON decode result - Error code: ' . $json_error . ', Data type: ' . gettype($data));

    if ($response_code !== 200) {
        error_log('[VIATOR TEST] Exchange rates API returned non-200 status - Code: ' . $response_code . ', Body: ' . $body);
        return null;
    }

    if (!isset($data['rates']) || !is_array($data['rates']) || empty($data['rates'])) {
        $data_keys = is_array($data) ? implode(', ', array_keys($data)) : 'not_array';
        error_log('[VIATOR TEST] Invalid response structure - Data keys: ' . $data_keys);
        return null;
    }

    // Find the earliest expiry from all rates (most conservative approach)
    $earliest_expiry = null;
    foreach ($data['rates'] as $rate) {
        if (isset($rate['expiry'])) {
            $rate_expiry = strtotime($rate['expiry']);
            if (!$earliest_expiry || $rate_expiry < $earliest_expiry) {
                $earliest_expiry = $rate_expiry;
            }
        }
    }

    if (!$earliest_expiry) {
        error_log('[VIATOR TEST] No expiry found in any exchange rate');
        return null;
    }

    // Cache the entire response. Expiration is set from the earliest expiry found.
    $ttl = $earliest_expiry - time(); // Time to live in seconds
    $expiry_date = date('Y-m-d H:i:s', $earliest_expiry);

    // Ensure TTL is positive and reasonable (max 25 hours)
    if ($ttl > 0 && $ttl <= 90000) {
        set_transient('viator_exchange_rates', $data, $ttl);
        error_log('[VIATOR TEST] Exchange rates cached successfully - Expiry: ' . $expiry_date . ', TTL: ' . $ttl . ', Rates count: ' . count($data['rates']));
    } else {
        error_log('[VIATOR TEST] Invalid TTL for exchange rates cache - Expiry: ' . $expiry_date . ', TTL: ' . $ttl);
        // Even with invalid TTL, cache for 1 hour as fallback
        set_transient('viator_exchange_rates', $data, 3600);
        error_log('[VIATOR TEST] Using fallback cache of 1 hour');
    }

    error_log('[VIATOR TEST] viator_fetch_exchange_rates() returning SUCCESS');
    return $data;
}

/**
 * Gets the exchange rate for a specific currency pair.
 * It uses a cached version if available and valid.
 *
 * @param string $source_currency The source currency code (e.g., 'USD').
 * @param string $target_currency The target currency code (e.g., 'BRL').
 * @return float|null The exchange rate, or null if not found.
 */
function viator_get_exchange_rate($source_currency, $target_currency) {
    if (empty($source_currency) || empty($target_currency)) {
        return null;
    }

    if ($source_currency === $target_currency) {
        return 1.0;
    }

    $rates_data = get_transient('viator_exchange_rates');

    if (false === $rates_data) {
        viator_debug_log('Exchange rates cache miss. Fetching new rates from API.');
        $rates_data = viator_fetch_exchange_rates();
    }

    if (!$rates_data || !isset($rates_data['rates'])) {
        viator_debug_log('No exchange rates data available.');
        return null;
    }

    foreach ($rates_data['rates'] as $rate_info) {
        if ($rate_info['sourceCurrency'] === $source_currency && isset($rate_info['rates'][$target_currency])) {
            $rate = (float) $rate_info['rates'][$target_currency];
            viator_debug_log('Exchange rate found.', ['from' => $source_currency, 'to' => $target_currency, 'rate' => $rate]);
            return $rate;
        }
    }
    
    viator_debug_log('Exchange rate not found in cache.', ['from' => $source_currency, 'to' => $target_currency]);
    return null;
}

/**
 * Converts a price from a source currency to a target currency and formats it.
 *
 * @param float $amount The original price amount.
 * @param string $source_currency The source currency code.
 * @param array $locale_settings The user's locale settings.
 * @return string The formatted price string (e.g., "R$ 123,45") or an error message.
 */
function viator_convert_and_format_price($amount, $source_currency, $locale_settings) {
    if ($amount === null || $source_currency === null) {
        return viator_t('price_unavailable');
    }

    $target_currency = $locale_settings['currency'];
    $converted_amount = $amount;

    if ($source_currency !== $target_currency) {
        $rate = viator_get_exchange_rate($source_currency, $target_currency);
        if ($rate !== null && $rate > 0) {
            $converted_amount = $amount * $rate;
            viator_debug_log('Currency conversion applied.', [
                'original_amount' => $amount,
                'source_currency' => $source_currency,
                'target_currency' => $target_currency,
                'rate' => $rate,
                'converted_amount' => $converted_amount
            ]);
        } else {
            // If conversion fails, log it but still show the original price with a note
            viator_debug_log('Currency conversion failed. Rate not available or invalid.', [
                'from' => $source_currency, 
                'to' => $target_currency,
                'rate' => $rate
            ]);
            // Show original price with currency note instead of hiding it
            return $source_currency . ' ' . number_format($amount, 2, ',', '.') . ' (' . viator_t('original_currency') . ')';
        }
    }

    return $locale_settings['currency_symbol'] . ' ' . number_format($converted_amount, 2, ',', '.');
}