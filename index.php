<?php
session_start();
require_once 'app/includes/config.php';
require_once 'app/database.php';
require_once 'app/includes/profile_functions.php';

// Função para obter iniciais do nome (única que não existe no database.php)
// Função getInitials() já definida em database.php
$words = explode(' ', trim($name));
    $initials = '';
    
    foreach ($words as $word) {
        if (!empty($word)) {
            $initials .= strtoupper(substr($word, 0, 1));
        }
    }
    
    return empty($initials) ? 'U' : substr($initials, 0, 2);
}

// Função para obter valor seguro do array do usuário
function getUserValue($user, $key, $default = '') {
    return isset($user[$key]) && $user[$key] !== null ? $user[$key] : $default;
}

$user = getUser();
$message = '';

// Valores seguros do usuário
$userName = getUserValue($user, 'name', 'Usuário');
$userType = getUserValue($user, 'type', 'membro');
$userInitials = getInitials($userName);

// Processar logout via AJAX
if ($_POST['action'] ?? '' === 'logout') {
    header('Content-Type: application/json');
    logout();
    echo json_encode(['success' => true, 'message' => 'Logout realizado com sucesso']);
    exit;
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <title>Gracie Barra Cidade Nova - Jiu-Jitsu para Todos</title>
    
    <!-- Favicon -->
    <link rel="icon" type="image/png" sizes="32x32" href="assets/images/gb_logo.png">
    <link rel="icon" type="image/png" sizes="16x16" href="assets/images/gb_logo.png">
    <link rel="apple-touch-icon" sizes="180x180" href="assets/images/gb_logo.png">
    <link rel="shortcut icon" href="assets/images/gb_logo.png">
    
    <!-- Meta tags para SEO -->
    <meta name="description" content="Gracie Barra Cidade Nova - Academia de Jiu-Jitsu em Manaus. Aulas para todas as idades e níveis. Venha fazer parte da maior rede de Jiu-Jitsu do mundo.">
    <meta name="keywords" content="Jiu-Jitsu, Gracie Barra, Manaus, Cidade Nova, Artes Marciais, Academia, BJJ">
    <meta name="author" content="Gracie Barra Cidade Nova">
    
    <!-- Open Graph para redes sociais -->
    <meta property="og:title" content="Gracie Barra Cidade Nova - Jiu-Jitsu para Todos">
    <meta property="og:description" content="Academia de Jiu-Jitsu em Manaus. Aulas para todas as idades e níveis. Venha fazer parte da maior rede de Jiu-Jitsu do mundo.">
    <meta property="og:image" content="assets/images/gb_logo.png">
    <meta property="og:type" content="website">
    
    <style>
    /* ======================= CSS VARIABLES ======================= */
:root {
    --primary-red: #dc143c;
    --primary-blue: #2c5aa0;
    --dark-red: #b91c3c;
    --accent-gold: #ffd700;
    
    /* Modern Color Palette */
    --text-primary: #1a202c;
    --text-secondary: #4a5568;
    --text-light: #718096;
    --text-muted: #a0aec0;
    
    --background-primary: #ffffff;
    --background-secondary: #f7fafc;
    --background-tertiary: #edf2f7;
    --card-background: #ffffff;
    --overlay-background: rgba(26, 32, 44, 0.05);
    
    --border-color: #e2e8f0;
    --border-light: #f1f5f9;
    --border-focus: #3182ce;
    
    --shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    
    --radius-sm: 0.375rem;
    --radius-md: 0.5rem;
    --radius-lg: 0.75rem;
    --radius-xl: 1rem;
    --radius-2xl: 1.5rem;
    
    --transition-fast: all 0.15s ease;
    --transition-normal: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    --transition-slow: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
    --spacing-xl: 2rem;
    --spacing-2xl: 3rem;
    --spacing-3xl: 4rem;
    
    --header-height: 80px;
}

/* Dark Mode */
[data-theme="dark"] {
    --text-primary: #f7fafc;
    --text-secondary: #e2e8f0;
    --text-light: #cbd5e0;
    --text-muted: #a0aec0;
    
    --background-primary: #1a202c;
    --background-secondary: #2d3748;
    --background-tertiary: #4a5568;
    --card-background: #2d3748;
    --overlay-background: rgba(247, 250, 252, 0.05);
    
    --border-color: #4a5568;
    --border-light: #2d3748;
    --border-focus: #63b3ed;
}

/* ======================= RESET E BASE ======================= */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

html {
    scroll-behavior: smooth;
    font-size: 16px;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: var(--text-primary);
    background-color: var(--background-primary);
    overflow-x: hidden;
    transition: var(--transition-normal);
    font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
    padding-top: var(--header-height);
}

/* ======================= TYPOGRAPHY ======================= */
h1, h2, h3, h4, h5, h6 {
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.025em;
}

p {
    color: var(--text-secondary);
    margin-bottom: var(--spacing-md);
    line-height: 1.7;
}

/* ======================= HEADER ======================= */
.main-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border-color);
    transition: var(--transition-normal);
    height: var(--header-height);
}

[data-theme="dark"] .main-header {
    background: rgba(26, 32, 44, 0.95);
}

.main-header.scrolled {
    background: rgba(255, 255, 255, 0.98);
    box-shadow: var(--shadow-lg);
    height: 70px;
}

[data-theme="dark"] .main-header.scrolled {
    background: rgba(26, 32, 44, 0.98);
}

.header-container {
    width: 100%;
    max-width: 1600px;
    margin: 0 auto;
    height: 100%;
    display: grid;
    grid-template-columns: minmax(200px, 300px) 1fr minmax(250px, 400px);
    align-items: center;
    gap: clamp(var(--spacing-md), 3vw, var(--spacing-xl));
    padding: 0 clamp(var(--spacing-md), 3vw, var(--spacing-2xl));
}

/* Header Logo */
.header-logo {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    text-decoration: none;
    transition: var(--transition-normal);
    min-width: fit-content;
}

.header-logo:hover {
    transform: scale(1.02);
}

.logo-image {
    width: clamp(50px, 6vw, 65px);
    height: clamp(50px, 6vw, 65px);
    background: url('assets/images/gb_logo.png') center/cover;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    transition: var(--transition-normal);
    flex-shrink: 0;
}

.main-header.scrolled .logo-image {
    width: clamp(45px, 5vw, 55px);
    height: clamp(45px, 5vw, 55px);
}

.logo-text {
    display: flex;
    flex-direction: column;
}

.logo-title {
    font-size: clamp(1.2rem, 2.5vw, 1.6rem);
    font-weight: 800;
    color: var(--primary-red);
    letter-spacing: -0.02em;
    line-height: 1;
}

.logo-subtitle {
    font-size: clamp(0.75rem, 1.5vw, 0.95rem);
    color: var(--text-light);
    font-weight: 500;
    line-height: 1;
    margin-top: 2px;
}

/* Header Navigation */
.header-nav {
    display: flex;
    list-style: none;
    gap: clamp(var(--spacing-sm), 2vw, var(--spacing-lg));
    align-items: center;
    justify-content: center;
    justify-self: center;
    margin: 0;
    padding: 0;
    width: 100%;
    max-width: 800px;
}

.header-nav a {
    color: var(--text-primary);
    text-decoration: none;
    font-weight: 500;
    font-size: clamp(0.8rem, 1.2vw, 0.9rem);
    padding: var(--spacing-sm) clamp(var(--spacing-xs), 1vw, var(--spacing-md));
    border-radius: var(--radius-md);
    position: relative;
    transition: var(--transition-normal);
    white-space: nowrap;
    text-align: center;
}

.header-nav a::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    width: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--primary-red), var(--primary-blue));
    transition: var(--transition-normal);
    transform: translateX(-50%);
}

.header-nav a:hover,
.header-nav a.active {
    color: var(--primary-red);
    background: var(--overlay-background);
}

.header-nav a:hover::before,
.header-nav a.active::before {
    width: 80%;
}

/* Header Actions */
.header-actions {
    display: flex;
    align-items: center;
    gap: clamp(var(--spacing-sm), 1.5vw, var(--spacing-md));
    justify-self: end;
    min-width: fit-content;
    flex-wrap: nowrap;
}

.login-btn {
    background: linear-gradient(135deg, var(--primary-red), var(--dark-red));
    color: white;
    text-decoration: none;
    padding: clamp(var(--spacing-xs), 1vw, var(--spacing-sm)) clamp(var(--spacing-sm), 2vw, var(--spacing-lg));
    border-radius: var(--radius-lg);
    font-weight: 600;
    font-size: clamp(0.75rem, 1.2vw, 0.85rem);
    transition: var(--transition-normal);
    border: none;
    cursor: pointer;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    min-width: fit-content;
}

.login-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

/* User Section */
.user-section {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    min-width: fit-content;
}

.user-info {
    display: flex;
    align-items: center;
    background: var(--card-background);
    padding: var(--spacing-xs);
    border-radius: var(--radius-xl);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-md);
    transition: var(--transition-normal);
    cursor: pointer;
}

.user-info:hover {
    box-shadow: var(--shadow-lg);
    border-color: var(--primary-blue);
    transform: scale(1.02);
}

.user-avatar {
    width: clamp(40px, 4vw, 45px);
    height: clamp(40px, 4vw, 45px);
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary-red), var(--primary-blue));
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: clamp(0.8rem, 1vw, 0.9rem);
    flex-shrink: 0;
}

.user-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

/* Dashboard Button */
.dashboard-btn {
    background: linear-gradient(135deg, var(--primary-blue), #1e3a8a);
    color: white;
    text-decoration: none;
    padding: var(--spacing-sm) var(--spacing-lg);
    border-radius: var(--radius-xl);
    font-weight: 600;
    font-size: 0.85rem;
    transition: var(--transition-normal);
    border: none;
    cursor: pointer;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-sm);
    min-width: fit-content;
    box-shadow: var(--shadow-md);
}

.dashboard-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
    background: linear-gradient(135deg, #1e3a8a, var(--primary-blue));
}

/* User Menu Dropdown */
.user-menu-dropdown {
    position: relative;
}

.user-menu-btn {
    background: var(--card-background);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    padding: var(--spacing-sm);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: var(--transition-normal);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    font-size: 1rem;
}

.user-menu-btn:hover {
    background: var(--overlay-background);
    border-color: var(--primary-blue);
    color: var(--primary-blue);
    transform: scale(1.05);
}

.user-dropdown-content {
    position: absolute;
    top: calc(100% + var(--spacing-sm));
    right: 0;
    background: var(--card-background);
    min-width: 220px;
    box-shadow: var(--shadow-xl);
    border-radius: var(--radius-xl);
    border: 1px solid var(--border-color);
    z-index: 1000;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px);
    transition: var(--transition-normal);
    overflow: hidden;
}

.user-dropdown-content.active {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
}

/* Dropdown User Info */
.dropdown-user-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--overlay-background);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-sm);
}

.dropdown-user-avatar {
    width: 45px;
    height: 45px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary-red), var(--primary-blue));
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 1rem;
    flex-shrink: 0;
    box-shadow: var(--shadow-md);
}

.dropdown-user-details {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
}

.dropdown-user-name {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-primary);
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.dropdown-user-role {
    font-size: 0.75rem;
    color: var(--text-light);
    text-transform: uppercase;
    font-weight: 500;
    letter-spacing: 0.5px;
}

/* Dropdown Items */
.dropdown-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md) var(--spacing-lg);
    color: var(--text-primary);
    text-decoration: none;
    background: none;
    border: none;
    width: 100%;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: var(--transition-fast);
}

.dropdown-item:hover {
    background: var(--overlay-background);
    color: var(--primary-blue);
}

.logout-item:hover {
    background: rgba(220, 20, 60, 0.1);
    color: var(--primary-red);
}

.dropdown-divider {
    margin: var(--spacing-xs) 0;
    border: none;
    border-top: 1px solid var(--border-color);
}

/* Theme Toggle */
.theme-toggle {
    background: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: clamp(var(--spacing-xs), 1vw, var(--spacing-sm)) clamp(var(--spacing-sm), 1.5vw, var(--spacing-md));
    cursor: pointer;
    transition: var(--transition-normal);
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--text-primary);
    font-size: clamp(0.75rem, 1vw, 0.85rem);
    font-weight: 500;
    white-space: nowrap;
    min-width: fit-content;
}

.theme-toggle:hover {
    background: var(--overlay-background);
    border-color: var(--primary-red);
    transform: scale(1.02);
}

.theme-toggle span:last-child {
    display: inline;
}

/* Mobile Menu Button */
.mobile-menu-btn {
    display: none;
    background: none;
    border: 1px solid var(--border-color);
    font-size: 1.2rem;
    color: var(--text-primary);
    cursor: pointer;
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    transition: var(--transition-normal);
    width: clamp(40px, 5vw, 50px);
    height: clamp(40px, 5vw, 50px);
    align-items: center;
    justify-content: center;
}

.mobile-menu-btn:hover {
    background: var(--overlay-background);
    border-color: var(--primary-red);
}

/* ======================= MOBILE NAVIGATION ======================= */
.mobile-nav {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--background-primary);
    z-index: 1100;
    padding: var(--spacing-3xl) var(--spacing-xl);
    flex-direction: column;
    justify-content: flex-start;
    opacity: 0;
    transform: translateY(-100%);
    transition: var(--transition-normal);
}

.mobile-nav.active {
    display: flex;
    opacity: 1;
    transform: translateY(0);
}

.mobile-nav-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-2xl);
}

.mobile-nav-close {
    background: none;
    border: none;
    font-size: 2rem;
    color: var(--text-primary);
    cursor: pointer;
    padding: var(--spacing-sm);
}

.mobile-nav ul {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-2xl);
}

.mobile-nav a {
    color: var(--text-primary);
    text-decoration: none;
    font-size: 1.25rem;
    font-weight: 600;
    padding: var(--spacing-md);
    border-radius: var(--radius-lg);
    transition: var(--transition-normal);
    text-align: center;
}

.mobile-nav a:hover {
    background: var(--overlay-background);
    color: var(--primary-red);
}

/* Mobile User Info */
.mobile-user-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
    background: var(--overlay-background);
    border-radius: var(--radius-xl);
    margin-bottom: var(--spacing-xl);
    border: 1px solid var(--border-color);
}

.mobile-user-avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary-red), var(--primary-blue));
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 1.1rem;
    flex-shrink: 0;
    box-shadow: var(--shadow-md);
}

.mobile-user-details {
    flex: 1;
    text-align: left;
}

.mobile-user-name {
    font-weight: 600;
    font-size: 1.1rem;
    color: var(--text-primary);
    margin-bottom: var(--spacing-xs);
}

.mobile-user-role {
    font-size: 0.85rem;
    color: var(--text-light);
    text-transform: uppercase;
    font-weight: 500;
    letter-spacing: 0.5px;
}

/* ======================= MAIN CONTENT ======================= */
.main-content {
    min-height: calc(100vh - var(--header-height));
}

/* Hero Section */
.hero {
    height: 100vh;
    background: linear-gradient(135deg, 
        rgba(220, 20, 60, 0.9), 
        rgba(44, 90, 160, 0.8)), 
        url('assets/images/gb1.jpg');
    background-size: cover;
    background-position: center;
    background-attachment: fixed;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: white;
    position: relative;
    overflow: hidden;
    margin-top: calc(-1 * var(--header-height));
    padding-top: var(--header-height);
}

.hero::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.3) 100%);
}

.hero-content {
    position: relative;
    z-index: 2;
    max-width: 900px;
    padding: 0 var(--spacing-xl);
    animation: fadeInUp 1s ease-out;
}

.hero-title {
    font-size: clamp(2.5rem, 8vw, 6rem);
    font-weight: 900;
    margin-bottom: var(--spacing-lg);
    text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    letter-spacing: -0.02em;
}

.hero-subtitle {
    font-size: clamp(1.25rem, 4vw, 2rem);
    font-weight: 300;
    margin-bottom: var(--spacing-2xl);
    opacity: 0.95;
}

.hero-cta {
    background: linear-gradient(135deg, var(--primary-red), var(--dark-red));
    color: white;
    text-decoration: none;
    padding: var(--spacing-lg) var(--spacing-2xl);
    border-radius: var(--radius-xl);
    font-size: 1.2rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    transition: var(--transition-normal);
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-md);
    box-shadow: var(--shadow-xl);
    position: relative;
    overflow: hidden;
}

.hero-cta::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    transition: left 0.5s ease;
}

.hero-cta:hover::before {
    left: 100%;
}

.hero-cta:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-2xl);
}

.scroll-indicator {
    position: absolute;
    bottom: var(--spacing-xl);
    left: 50%;
    transform: translateX(-50%);
    animation: bounce 2s infinite;
}

.scroll-indicator i {
    font-size: 2rem;
    color: white;
    opacity: 0.8;
}

/* Sections */
.section {
    padding: clamp(var(--spacing-3xl), 10vw, 8rem) 0;
    max-width: 1400px;
    margin: 0 auto;
    padding-left: clamp(var(--spacing-md), 5vw, var(--spacing-2xl));
    padding-right: clamp(var(--spacing-md), 5vw, var(--spacing-2xl));
}

.section-header {
    text-align: center;
    margin-bottom: clamp(var(--spacing-2xl), 8vw, var(--spacing-3xl));
}

.section-title {
    font-size: clamp(2rem, 6vw, 4rem);
    font-weight: 800;
    margin-bottom: var(--spacing-md);
    background: linear-gradient(135deg, var(--text-primary), var(--text-secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.section-subtitle {
    font-size: clamp(1rem, 3vw, 1.5rem);
    color: var(--text-secondary);
    max-width: 800px;
    margin: 0 auto;
    line-height: 1.6;
}

/* Grid Layout */
.grid {
    display: grid;
    gap: var(--spacing-xl);
}

.grid-2 {
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
}

.grid-3 {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

/* Cards */
.card {
    background: var(--card-background);
    border-radius: var(--radius-xl);
    padding: var(--spacing-xl);
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border-color);
    transition: var(--transition-normal);
    position: relative;
    overflow: hidden;
}

.card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--primary-red), var(--primary-blue));
    opacity: 0;
    transition: var(--transition-normal);
}

.card:hover {
    transform: translateY(-8px);
    box-shadow: var(--shadow-xl);
}

.card:hover::before {
    opacity: 1;
}

.card-icon {
    width: 60px;
    height: 60px;
    border-radius: var(--radius-lg);
    background: linear-gradient(135deg, var(--primary-red), var(--primary-blue));
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.5rem;
    margin-bottom: var(--spacing-md);
}

.card-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: var(--spacing-sm);
}

.card-text {
    color: var(--text-secondary);
    line-height: 1.6;
}

.image-container {
    position: relative;
    border-radius: var(--radius-xl);
    overflow: hidden;
    height: 300px;
    background-size: cover;
    background-position: center;
    transition: var(--transition-normal);
}

.image-container::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(220, 20, 60, 0.1), rgba(44, 90, 160, 0.1));
    opacity: 0;
    transition: var(--transition-normal);
}

.image-container:hover::after {
    opacity: 1;
}

.image-container:hover {
    transform: scale(1.05);
}

/* Schedule Table */
.schedule-container {
    background: var(--card-background);
    border-radius: var(--radius-xl);
    overflow: hidden;
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--border-color);
}

.schedule-table {
    width: 100%;
    border-collapse: collapse;
}

.schedule-table th {
    background: linear-gradient(135deg, var(--primary-blue), #1e3a8a);
    color: white;
    padding: var(--spacing-md);
    font-weight: 600;
    text-align: center;
}

.schedule-table td {
    padding: var(--spacing-md);
    text-align: center;
    border-bottom: 1px solid var(--border-color);
    transition: var(--transition-normal);
}

.time-cell {
    background: var(--background-secondary);
    font-weight: 600;
    color: var(--text-primary);
}

.class-cell {
    color: white;
    font-weight: 600;
    cursor: pointer;
    position: relative;
}

.class-cell:hover {
    transform: scale(1.05);
    z-index: 10;
}

.gb1 { background: linear-gradient(135deg, var(--primary-red), #c41e3a); }
.gb2 { background: linear-gradient(135deg, #7c2d12, #a16207); }
.gb3 { background: linear-gradient(135deg, #7c2d12, #a16207); }
.gb-kids { background: linear-gradient(135deg, #eab308, #ca8a04); }
.women { background: linear-gradient(135deg, #a855f7, #9333ea); }
.open-mat { background: linear-gradient(135deg, #6b7280, #4b5563); }

/* Contact Section */
.contact-section {
    background: linear-gradient(135deg, 
        rgba(26, 32, 44, 0.95), 
        rgba(44, 90, 160, 0.9)), 
        url('assets/images/gb6.jpg');
    background-size: cover;
    background-position: center;
    background-attachment: fixed;
    color: white;
    position: relative;
}

.contact-card {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: var(--radius-xl);
    padding: var(--spacing-xl);
    transition: var(--transition-normal);
}

.contact-card:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-5px);
}

/* ======================= FOOTER ======================= */
.main-footer {
    background: linear-gradient(135deg, var(--text-primary), #2d3748);
    color: white;
    position: relative;
    overflow: hidden;
}

.main-footer::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="0.5" fill="rgba(255,255,255,0.05)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
    opacity: 0.3;
}

.footer-content {
    position: relative;
    z-index: 1;
    max-width: 1400px;
    margin: 0 auto;
    padding: var(--spacing-3xl) clamp(var(--spacing-md), 5vw, var(--spacing-2xl)) var(--spacing-xl);
}

.footer-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-2xl);
    margin-bottom: var(--spacing-2xl);
}

.footer-section h3 {
    color: var(--accent-gold);
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: var(--spacing-lg);
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.footer-section p,
.footer-section li {
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: var(--spacing-sm);
    line-height: 1.6;
}

.footer-section ul {
    list-style: none;
    padding: 0;
}

.footer-section a {
    color: rgba(255, 255, 255, 0.8);
    text-decoration: none;
    transition: var(--transition-normal);
}

.footer-section a:hover {
    color: var(--accent-gold);
    transform: translateX(5px);
}

.footer-logo {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
}

.footer-logo-img {
    width: 60px;
    height: 60px;
    background: url('assets/images/gb_logo.png') center/cover;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
}

.footer-logo-text h3 {
    color: var(--primary-red);
    font-size: 1.5rem;
    font-weight: 800;
    margin: 0;
}

.footer-logo-text p {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
    margin: 0;
}

.social-links {
    display: flex;
    gap: var(--spacing-md);
    margin-top: var(--spacing-md);
}

.social-links a {
    width: 45px;
    height: 45px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.2rem;
    transition: var(--transition-normal);
    backdrop-filter: blur(10px);
}

.social-links a:hover {
    background: var(--primary-red);
    transform: translateY(-3px) scale(1.1);
    box-shadow: var(--shadow-lg);
}

.footer-bottom {
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    padding-top: var(--spacing-xl);
    text-align: center;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-md);
    align-items: center;
}

.footer-bottom p {
    margin: 0;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
}

.footer-credits {
    text-align: right;
}

.footer-credits a {
    color: var(--accent-gold);
    font-weight: 600;
}

/* ======================= SCROLL TO TOP ======================= */
.scroll-to-top {
    position: fixed;
    bottom: var(--spacing-xl);
    right: var(--spacing-xl);
    background: linear-gradient(135deg, var(--primary-red), var(--dark-red));
    color: white;
    border: none;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: none;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: var(--transition-normal);
    box-shadow: var(--shadow-lg);
    z-index: 999;
}

.scroll-to-top:hover {
    transform: scale(1.1);
    box-shadow: var(--shadow-xl);
}

/* ======================= ANIMATIONS ======================= */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(50px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes bounce {
    0%, 20%, 50%, 80%, 100% {
        transform: translateX(-50%) translateY(0);
    }
    40% {
        transform: translateX(-50%) translateY(-10px);
    }
    60% {
        transform: translateX(-50%) translateY(-5px);
    }
}

.fade-in {
    opacity: 0;
    transform: translateY(30px);
    transition: var(--transition-slow);
}

.fade-in.active {
    opacity: 1;
    transform: translateY(0);
}

/* ======================= RESPONSIVE DESIGN ======================= */
@media (max-width: 1200px) {
    .header-container {
        grid-template-columns: minmax(180px, 250px) 1fr minmax(200px, 300px);
        gap: var(--spacing-md);
    }
    
    .header-nav {
        gap: var(--spacing-sm);
    }
    
    .header-nav a {
        font-size: 0.8rem;
        padding: var(--spacing-xs) var(--spacing-sm);
    }
    
    .user-section {
        gap: var(--spacing-sm);
    }
    
    .dashboard-btn span {
        display: none;
    }
    
    .dashboard-btn {
        min-width: 40px;
        justify-content: center;
        padding: var(--spacing-sm);
    }
    
    .grid-2 {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 1024px) {
    .header-container {
        grid-template-columns: auto 1fr;
        gap: var(--spacing-md);
    }
    
    .header-nav {
        display: none;
    }
    
    .mobile-menu-btn {
        display: flex;
        justify-self: end;
    }
    
    .header-actions {
        gap: var(--spacing-sm);
    }
    
    .user-info {
        padding: var(--spacing-xs) var(--spacing-sm);
    }
    
    .footer-bottom {
        text-align: center;
    }
    
    .footer-credits {
        text-align: center;
    }
}

@media (max-width: 768px) {
    body {
        padding-top: 70px;
    }

    :root {
        --header-height: 70px;
    }

    .header-container {
        padding: 0 var(--spacing-md);
    }
    
    .user-info {
        padding: var(--spacing-xs);
        min-width: 45px;
        justify-content: center;
    }
    
    .user-section {
        gap: var(--spacing-xs);
    }
    
    .dashboard-btn {
        min-width: 36px;
        height: 36px;
        padding: var(--spacing-xs);
    }
    
    .user-menu-btn {
        width: 36px;
        height: 36px;
        padding: var(--spacing-xs);
    }
    
    .user-dropdown-content {
        min-width: 220px;
        right: -20px;
    }
    
    .dropdown-user-info {
        padding: var(--spacing-sm) var(--spacing-md);
    }
    
    .dropdown-user-avatar {
        width: 40px;
        height: 40px;
        font-size: 0.9rem;
    }
    
    .theme-toggle span:last-child {
        display: none;
    }
    
    .theme-toggle {
        padding: var(--spacing-xs);
        min-width: 40px;
        justify-content: center;
    }
    
    .hero {
        background-attachment: scroll;
        margin-top: calc(-1 * 70px);
        padding-top: 70px;
    }
    
    .contact-section {
        background-attachment: scroll;
    }
    
    .grid-3 {
        grid-template-columns: 1fr;
    }

    .footer-grid {
        grid-template-columns: 1fr;
        gap: var(--spacing-xl);
    }
}

@media (max-width: 480px) {
    .header-container {
        padding: 0 var(--spacing-sm);
        grid-template-columns: 1fr auto;
        gap: var(--spacing-sm);
    }
    
    .header-actions {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
    }
    
    .section {
        padding-left: var(--spacing-md);
        padding-right: var(--spacing-md);
    }

    .logo-text {
        display: none;
    }

    .footer-content {
        padding: var(--spacing-2xl) var(--spacing-md) var(--spacing-md);
    }
    
    .login-btn span,
    .dashboard-btn span {
        display: none;
    }
    
    .login-btn,
    .dashboard-btn {
        min-width: 36px;
        height: 36px;
        justify-content: center;
        padding: var(--spacing-xs);
    }
    
    .user-avatar {
        width: 32px;
        height: 32px;
        font-size: 0.75rem;
    }
    
    .theme-toggle {
        min-width: 36px;
        height: 36px;
        padding: var(--spacing-xs);
    }
    
    .mobile-menu-btn {
        width: 36px;
        height: 36px;
        min-width: 36px;
        justify-self: auto;
    }
    
    .user-dropdown-content {
        min-width: 200px;
        right: -10px;
    }
    
    .dropdown-user-info {
        flex-direction: column;
        text-align: center;
        gap: var(--spacing-sm);
    }
    
    .dropdown-user-avatar {
        width: 35px;
        height: 35px;
        font-size: 0.8rem;
    }
}

/* ======================= PERFORMANCE & ACCESSIBILITY ======================= */
.image-container,
.hero,
.contact-section {
    will-change: transform;
}

@media print {
    .main-header,
    .mobile-nav,
    .scroll-to-top,
    .theme-toggle {
        display: none !important;
    }
    
    .section {
        break-inside: avoid;
    }

    body {
        padding-top: 0;
    }
}

@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
    
    .hero {
        background-attachment: scroll;
    }
    
    .contact-section {
        background-attachment: scroll;
    }
}

button:focus,
a:focus,
input:focus {
    outline: 2px solid var(--primary-blue);
    outline-offset: 2px;
}

@media (prefers-contrast: high) {
    :root {
        --border-color: #000000;
        --text-light: #000000;
    }
    
    [data-theme="dark"] {
        --border-color: #ffffff;
        --text-light: #ffffff;
    }
}

/* Botão Ler mais */
.read-more-btn {
    background: linear-gradient(135deg, var(--primary-blue), #1e3a8a);
    color: white;
    border: none;
    padding: var(--spacing-sm) var(--spacing-lg);
    border-radius: var(--radius-lg);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: var(--transition-normal);
    margin-top: var(--spacing-md);
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
}

.read-more-btn:hover {
    background: linear-gradient(135deg, #1e3a8a, var(--primary-blue));
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

/* Modal Styles */
.modal {
    display: none;
    position: fixed;
    z-index: 2000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    animation: fadeIn 0.3s ease;
}

.modal-content {
    background-color: var(--card-background);
    margin: 5% auto;
    padding: var(--spacing-2xl);
    border-radius: var(--radius-xl);
    width: 90%;
    max-width: 700px;
    position: relative;
    box-shadow: var(--shadow-2xl);
    border: 1px solid var(--border-color);
    max-height: 80vh;
    overflow-y: auto;
    animation: slideInUp 0.3s ease;
}

@keyframes slideInUp {
    from {
        transform: translateY(50px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

.close {
    color: var(--text-light);
    float: right;
    font-size: 2rem;
    font-weight: bold;
    position: absolute;
    right: var(--spacing-lg);
    top: var(--spacing-lg);
    cursor: pointer;
    transition: var(--transition-normal);
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--overlay-background);
}

.close:hover {
    color: var(--primary-red);
    background: rgba(220, 20, 60, 0.1);
    transform: scale(1.1);
}

.modal h3 {
    color: var(--primary-red);
    margin-bottom: var(--spacing-sm);
    font-size: clamp(1.3rem, 3vw, 1.8rem);
    font-weight: 700;
}

.modal .rank {
    color: var(--primary-blue);
    font-weight: 600;
    margin-bottom: var(--spacing-lg);
    font-size: clamp(1rem, 2.5vw, 1.2rem);
    padding-bottom: var(--spacing-sm);
    border-bottom: 2px solid var(--border-color);
}

.modal p {
    color: var(--text-secondary);
    line-height: 1.8;
    margin-bottom: var(--spacing-lg);
    text-align: justify;
    font-size: clamp(0.95rem, 2vw, 1.05rem);
}

.modal ul {
    color: var(--text-secondary);
    margin-left: var(--spacing-xl);
    margin-bottom: var(--spacing-lg);
    line-height: 1.7;
}

.modal ul li {
    margin-bottom: var(--spacing-xs);
    font-size: clamp(0.9rem, 2vw, 1rem);
}

.modal strong {
    color: var(--text-primary);
    font-weight: 600;
}

/* Modal responsivo */
@media (max-width: 768px) {
    .modal-content {
        margin: 10% auto;
        padding: var(--spacing-xl);
        width: 95%;
        max-height: 85vh;
    }
    
    .close {
        right: var(--spacing-md);
        top: var(--spacing-md);
        font-size: 1.5rem;
        width: 35px;
        height: 35px;
    }
    
    .modal h3 {
        padding-right: var(--spacing-2xl);
        line-height: 1.2;
    }
}

@media (max-width: 480px) {
    .modal-content {
        margin: 5% auto;
        padding: var(--spacing-lg);
        width: 98%;
        max-height: 90vh;
    }
}

/* ======================= ABOUT SECTION STYLES ======================= */
.about-section-wrapper {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: clamp(2rem, 6vw, 4rem);
    align-items: center;
    margin: clamp(3rem, 8vw, 6rem) 0;
    position: relative;
}

.about-section-wrapper.reverse {
    grid-template-columns: 1fr 1fr;
}

.about-content-block {
    padding: clamp(1rem, 4vw, 2rem);
}

.about-icon-wrapper {
    margin-bottom: var(--spacing-lg);
}

.about-icon {
    width: clamp(60px, 10vw, 80px);
    height: clamp(60px, 10vw, 80px);
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary-red), var(--primary-blue));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: clamp(1.5rem, 4vw, 2.2rem);
    box-shadow: var(--shadow-lg);
    margin-bottom: var(--spacing-md);
    transition: var(--transition-normal);
}

.about-icon:hover {
    transform: scale(1.1) rotate(5deg);
    box-shadow: var(--shadow-xl);
}

.about-title {
    font-size: clamp(1.5rem, 4vw, 2.2rem);
    font-weight: 700;
    color: var(--primary-red);
    margin-bottom: var(--spacing-lg);
    line-height: 1.2;
    position: relative;
}

.about-title::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 0;
    width: 60px;
    height: 3px;
    background: linear-gradient(90deg, var(--primary-red), var(--primary-blue));
    border-radius: 2px;
}

.about-text {
    color: var(--text-secondary);
    line-height: 1.8;
    margin-bottom: var(--spacing-lg);
    font-size: clamp(0.95rem, 2.2vw, 1.1rem);
    text-align: justify;
}

.about-image-container {
    position: relative;
    height: clamp(300px, 40vw, 450px);
    border-radius: var(--radius-xl);
    overflow: hidden;
    box-shadow: var(--shadow-lg);
    transition: var(--transition-normal);
}

.about-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    border-radius: var(--radius-xl);
    transition: var(--transition-normal);
    display: block;
    background-color: var(--background-secondary);
    min-height: 100%;
}

.about-image-container:hover {
    transform: translateY(-5px);
    box-shadow: var(--shadow-xl);
}

.about-image-container:hover .about-image {
    transform: scale(1.02);
}

/* Fallback caso imagem não carregue */
.about-image-container::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--background-secondary);
    z-index: -1;
}

/* About Highlights Section */
.about-highlights {
    margin-top: clamp(4rem, 10vw, 8rem);
    padding: clamp(2rem, 6vw, 4rem);
    background: var(--background-secondary);
    border-radius: var(--radius-xl);
    border: 1px solid var(--border-color);
}

.highlights-title {
    text-align: center;
    font-size: clamp(1.8rem, 5vw, 2.5rem);
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: clamp(2rem, 6vw, 3rem);
    position: relative;
}

.highlights-title::after {
    content: '';
    position: absolute;
    bottom: -12px;
    left: 50%;
    transform: translateX(-50%);
    width: 100px;
    height: 3px;
    background: linear-gradient(90deg, var(--primary-red), var(--primary-blue));
    border-radius: 2px;
}

.highlights-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
    gap: clamp(1.5rem, 4vw, 2.5rem);
}

.highlight-card {
    background: var(--card-background);
    padding: clamp(1.5rem, 4vw, 2.5rem);
    border-radius: var(--radius-lg);
    text-align: center;
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-sm);
    transition: var(--transition-normal);
    position: relative;
    overflow: hidden;
}

.highlight-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--primary-red), var(--primary-blue));
    transform: scaleX(0);
    transition: var(--transition-normal);
}

.highlight-card:hover {
    transform: translateY(-8px);
    box-shadow: var(--shadow-lg);
}

.highlight-card:hover::before {
    transform: scaleX(1);
}

.highlight-icon {
    font-size: clamp(2rem, 5vw, 2.8rem);
    margin-bottom: var(--spacing-md);
    display: block;
}

.highlight-card h4 {
    font-size: clamp(1.1rem, 2.8vw, 1.4rem);
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--spacing-sm);
}

.highlight-card p {
    color: var(--text-secondary);
    line-height: 1.6;
    font-size: clamp(0.9rem, 2.2vw, 1rem);
    text-align: center;
    margin-bottom: 0;
}

/* Responsive Design para About Section */
@media (max-width: 1024px) {
    .about-section-wrapper,
    .about-section-wrapper.reverse {
        grid-template-columns: 1fr;
        gap: clamp(2rem, 5vw, 3rem);
        text-align: center;
    }
    
    .about-section-wrapper.reverse .about-content-block {
        order: 2;
    }
    
    .about-section-wrapper.reverse .about-image-container {
        order: 1;
    }
    
    .about-title::after {
        left: 50%;
        transform: translateX(-50%);
    }
}

@media (max-width: 768px) {
    .about-section-wrapper {
        margin: clamp(2rem, 6vw, 4rem) 0;
    }
    
    .about-content-block {
        padding: clamp(1rem, 3vw, 1.5rem);
    }
    
    .about-image-container {
        height: clamp(250px, 35vw, 350px);
    }
    
    .about-highlights {
        padding: clamp(1.5rem, 4vw, 2.5rem);
    }
    
    .highlights-grid {
        grid-template-columns: 1fr;
        gap: clamp(1rem, 3vw, 1.5rem);
    }
}

@media (max-width: 480px) {
    .about-text {
        text-align: left;
    }
    
    .about-image-container {
        height: clamp(200px, 30vw, 280px);
    }
    
    .highlight-card {
        padding: clamp(1rem, 3vw, 1.5rem);
    }
}

/* Animações específicas para about section */
.about-content-block.fade-in.active {
    animation: slideInLeft 0.8s ease forwards;
}

.about-section-wrapper.reverse .about-content-block.fade-in.active {
    animation: slideInRight 0.8s ease forwards;
}

.about-image-container.fade-in.active {
    animation: slideInRight 0.8s ease forwards;
}

.about-section-wrapper.reverse .about-image-container.fade-in.active {
    animation: slideInLeft 0.8s ease forwards;
}

@keyframes slideInLeft {
    from {
        opacity: 0;
        transform: translateX(-50px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes slideInRight {
    from {
        opacity: 0;
        transform: translateX(50px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

/* Dark mode específico para about section */
[data-theme="dark"] .about-highlights {
    background: var(--background-tertiary);
}

[data-theme="dark"] .highlight-card {
    background: var(--card-background);
    border-color: var(--border-color);
}
    </style>
</head>
<body>
    <!-- Header Independente -->
    <header class="main-header" id="mainHeader">
        <div class="header-container">
            <a href="#inicio" class="header-logo">
                <div class="logo-image"></div>
                <div class="logo-text">
                    <div class="logo-title">Gracie Barra</div>
                    <div class="logo-subtitle">Cidade Nova</div>
                </div>
            </a>
            
            <nav>
                <ul class="header-nav">
                    <li><a href="#inicio" class="nav-link active">Início</a></li>
                    <li><a href="#sobre" class="nav-link">Sobre</a></li>
                    <li><a href="#professores" class="nav-link">Professores</a></li>
                    <li><a href="#horarios" class="nav-link">Horários</a></li>
                    <li><a href="#contato" class="nav-link">Contato</a></li>
                </ul>
            </nav>
            
            <div class="header-actions">
    <?php if (!isLoggedIn()): ?>
        <a href="https://app.gbcidadenovaam.com.br" class="login-btn">
    <i class="bi bi-person"></i>
    <span>Login</span>
</a>
    <?php else: ?>
        <div class="user-section">
    <div class="user-info">
        <div class="user-avatar">
            <?php echo htmlspecialchars($userInitials); ?>
        </div>
    </div>
    <div class="user-actions">
        <a href="dashboard.php" class="dashboard-btn" title="Ir para Dashboard">
            <i class="bi bi-speedometer2"></i>
            <span>Dashboard</span>
        </a>
        <div class="user-menu-dropdown">
            <button class="user-menu-btn" id="userMenuBtn" title="Menu do usuário">
                <i class="bi bi-three-dots-vertical"></i>
            </button>
            <div class="user-dropdown-content" id="userDropdown">
                <div class="dropdown-user-info">
                    <div class="dropdown-user-avatar">
                        <?php echo htmlspecialchars($userInitials); ?>
                    </div>
                    <div class="dropdown-user-details">
                        <div class="dropdown-user-name"><?php echo htmlspecialchars($userName); ?></div>
                        <div class="dropdown-user-role"><?php echo ucfirst(htmlspecialchars($userType)); ?></div>
                    </div>
                </div>
                <hr class="dropdown-divider">
                <a href="profile.php" class="dropdown-item">
                    <i class="bi bi-person"></i>
                    <span>Perfil</span>
                </a>
                <a href="settings.php" class="dropdown-item">
                    <i class="bi bi-gear"></i>
                    <span>Configurações</span>
                </a>
                <hr class="dropdown-divider">
                <button onclick="logout()" class="dropdown-item logout-item">
                    <i class="bi bi-box-arrow-right"></i>
                    <span>Sair</span>
                </button>
            </div>
        </div>
    </div>
</div>
    <?php endif; ?>
    
    <button class="theme-toggle" id="themeToggle">
        <span id="themeIcon">🌙</span>
        <span id="themeText">Tema</span>
    </button>
    
    <button class="mobile-menu-btn" id="mobileMenuBtn">
        <i class="bi bi-list"></i>
    </button>
</div>
        </div>
    </header>

    <!-- Mobile Navigation -->
    <nav class="mobile-nav" id="mobileNav">
        <div class="mobile-nav-header">
            <div class="header-logo">
                <div class="logo-image"></div>
                <div class="logo-text">
                    <div class="logo-title">Gracie Barra</div>
                    <div class="logo-subtitle">Cidade Nova</div>
                </div>
            </div>
            <button class="mobile-nav-close" id="mobileNavClose">
                <i class="bi bi-x"></i>
            </button>
        </div>
        
        <ul>
            <li><a href="#inicio">Início</a></li>
            <li><a href="#sobre">Sobre</a></li>
            <li><a href="#programas">Programas</a></li>
            <li><a href="#beneficios">Benefícios</a></li>
            <li><a href="#filosofia">Filosofia</a></li>
            <li><a href="#professores">Professores</a></li>
            <li><a href="#horarios">Horários</a></li>
            <li><a href="#contato">Contato</a></li>
        </ul>
        
        <div style="display: flex; flex-direction: column; gap: var(--spacing-md); width: 100%;">
            <?php if (!isLoggedIn()): ?>
    <a href="https://app.gbcidadenovaam.com.br" class="login-btn" style="width: 100%; justify-content: center;">
        <i class="bi bi-person"></i>
        Fazer Login
    </a>
            <?php else: ?>
                <div style="text-align: center; margin-bottom: var(--spacing-md);">
                    <div class="user-avatar" style="margin: 0 auto var(--spacing-sm);">
                        <?php echo htmlspecialchars($userInitials); ?>
                    </div>
                    <div class="user-name" style="margin-bottom: var(--spacing-xs);">
                        <?php echo htmlspecialchars($userName); ?>
                    </div>
                    <div class="user-role"><?php echo ucfirst(htmlspecialchars($userType)); ?></div>
                </div>
                <a href="dashboard.php" class="dashboard-btn" style="width: 100%; justify-content: center; margin-bottom: var(--spacing-sm);">
                    <i class="bi bi-speedometer2"></i>
                    Dashboard
                </a>
                <button class="logout-btn" onclick="logout()" style="width: 100%; justify-content: center;">
                    <i class="bi bi-box-arrow-right"></i>
                    Sair
                </button>
            <?php endif; ?>
        </div>
        
        <button class="theme-toggle" id="mobileThemeToggle" style="width: 100%; justify-content: center; margin-top: var(--spacing-md);">
            <span id="mobileThemeIcon">🌙</span>
            <span id="mobileThemeText">Alterar Tema</span>
        </button>
    </nav>

    <!-- Main Content -->
    <main class="main-content">
        <!-- Hero Section -->
        <section id="inicio" class="hero">
            <div class="hero-content">
                <h1 class="hero-title">Gracie Barra Cidade Nova</h1>
                <p class="hero-subtitle">Jiu-Jitsu para Todos</p>
                <a href="https://wa.me/559281136742?text=Olá!%20Gostaria%20de%20agendar%20uma%20aula%20experimental%20na%20Gracie%20Barra%20Cidade%20Nova." target="_blank" class="hero-cta">
                    <i class="bi bi-whatsapp"></i>
                    Começar a Treinar
                </a>
            </div>
            <div class="scroll-indicator">
                <i class="bi bi-chevron-down"></i>
            </div>
        </section>

        <!-- Sobre Section -->
<section id="sobre" class="section">
    <div class="section-header">
        <h2 class="section-title fade-in">Sobre a Gracie Barra</h2>
        <p class="section-subtitle fade-in">Gracie Barra é uma comunidade mundial de instrutores, estudantes e atletas do Jiu-Jitsu. Nossa organização é constituída por mais de 700 escolas em seis continentes, promovendo os valores fundamentais do Jiu-Jitsu brasileiro.</p>
    </div>
    
    <!-- Primeira seção: Nossa Unidade -->
    <div class="about-section-wrapper">
        <div class="about-content-block fade-in">
            <div class="about-icon-wrapper">
                <div class="about-icon">🏛️</div>
            </div>
            <h3 class="about-title">Nossa Unidade</h3>
            <p class="about-text">A Gracie Barra Cidade Nova representa a excelência do ensino de Jiu-Jitsu em Manaus. Seguimos os padrões globais da Gracie Barra, oferecendo um ambiente estruturado e acolhedor para todos os níveis de experiência.</p>
            <p class="about-text">Localizada estrategicamente na região da Cidade Nova, nossa academia conta com infraestrutura moderna, tatames de alta qualidade e professores qualificados, proporcionando a melhor experiência de aprendizado do Jiu-Jitsu brasileiro em toda a região amazônica.</p>
        </div>
        <div class="about-image-container fade-in">
            <img src="assets/images/gb8.jpg" alt="Academia Gracie Barra Cidade Nova" class="about-image">
        </div>
    </div>
    
    <!-- Segunda seção: Nosso Método -->
    <div class="about-section-wrapper reverse">
        <div class="about-image-container fade-in">
            <img src="assets/images/gb9.jpg" alt="Método Gracie Barra" class="about-image">
        </div>
        <div class="about-content-block fade-in">
            <div class="about-icon-wrapper">
                <div class="about-icon">📚</div>
            </div>
            <h3 class="about-title">Nosso Método</h3>
            <p class="about-text">A partir da ideia de que o Jiu-Jitsu deve ser adotado como uma jornada por toda a vida, Mestre Carlos Gracie Jr. criou um plano estruturado que permite aos alunos progredirem sistematicamente da faixa-branca à faixa-preta.</p>
            <p class="about-text">A estrutura das aulas é a marca registrada de todas as escolas Gracie Barra mundialmente. As aulas começam na hora marcada e seguem uma estrutura curricular padronizada, garantindo qualidade e consistência no ensino, independentemente da localização da escola.</p>
        </div>
    </div>
    
    <!-- Terceira seção: Nossa Comunidade -->
    <div class="about-section-wrapper">
        <div class="about-content-block fade-in">
            <div class="about-icon-wrapper">
                <div class="about-icon">🤝</div>
            </div>
            <h3 class="about-title">Nossa Comunidade</h3>
            <p class="about-text">Os membros da GB fazem as escolas ser o que são, e você logo será parte também desta grande família. Você ficará impressionado com o comprometimento de cada membro da equipe com o seu desenvolvimento pessoal e técnico.</p>
            <p class="about-text">Nossa comunidade em Cidade Nova reflete fielmente os valores fundamentais da Gracie Barra: Irmandade, Expansão e Integridade, criando um ambiente único e transformador para seu crescimento como pessoa e atleta, onde todos são bem-vindos independentemente da idade ou nível de experiência.</p>
        </div>
        <div class="about-image-container fade-in">
            <img src="assets/images/gb4.png" alt="Comunidade Gracie Barra" class="about-image">
        </div>
    </div>
    
    <!-- Cards de destaque -->
    <div class="about-highlights fade-in">
        <h3 class="highlights-title">Por que escolher a Gracie Barra Cidade Nova?</h3>
        <div class="highlights-grid">
            <div class="highlight-card">
                <div class="highlight-icon">🌟</div>
                <h4>Padrão Mundial</h4>
                <p>Seguimos os mesmos padrões de excelência das mais de 700 escolas GB no mundo.</p>
            </div>
            <div class="highlight-card">
                <div class="highlight-icon">👨‍🏫</div>
                <h4>Professores Certificados</h4>
                <p>Instrutores faixas-pretas certificados pela Gracie Barra com vasta experiência.</p>
            </div>
            <div class="highlight-card">
                <div class="highlight-icon">🏆</div>
                <h4>Ambiente Familiar</h4>
                <p>Comunidade acolhedora que promove crescimento pessoal e técnico para todos.</p>
            </div>
            <div class="highlight-card">
                <div class="highlight-icon">⚖️</div>
                <h4>Valores Sólidos</h4>
                <p>Baseados nos pilares da Irmandade, Expansão e Integridade.</p>
            </div>
        </div>
    </div>
</section>

        <!-- Programas Section -->
        <section id="programas" class="section" style="background: var(--background-secondary);">
            <div class="section-header">
                <h2 class="section-title fade-in">Programa Gracie Barra</h2>
                <p class="section-subtitle fade-in">Programas estruturados para todas as idades e níveis de experiência, seguindo o método oficial Gracie Barra</p>
            </div>
            
            <div class="grid grid-3">
                <div class="card fade-in">
                    <div class="card-icon">1</div>
                    <h3 class="card-title">GB1 - Fundamentals</h3>
                    <p class="card-text">Programa para iniciantes com foco nos fundamentos básicos do Jiu-Jitsu e defesa pessoal. Ideal para quem está começando sua jornada no mundo das artes marciais.</p>
                </div>
                
                <div class="card fade-in">
                    <div class="card-icon">2</div>
                    <h3 class="card-title">GB2 - Advanced</h3>
                    <p class="card-text">Para alunos com experiência intermediária, desenvolvendo técnicas avançadas e sparring controlado. Aprofundamento das habilidades técnicas.</p>
                </div>
                
                <div class="card fade-in">
                    <div class="card-icon">3</div>
                    <h3 class="card-title">GB3 - Black Belt</h3>
                    <p class="card-text">Programa avançado para faixas marrons e pretas, com foco em competição e refinamento técnico. Desenvolvimento de alta performance.</p>
                </div>
                
                <div class="card fade-in">
                    <div class="card-icon">🧒</div>
                    <h3 class="card-title">Little Champions</h3>
                    <p class="card-text">Jiu-Jitsu para crianças de 4 a 6 anos, desenvolvendo coordenação motora, disciplina e valores sociais fundamentais.</p>
                </div>
                
                <div class="card fade-in">
                    <div class="card-icon">👦</div>
                    <h3 class="card-title">Junior Champions</h3>
                    <p class="card-text">Para jovens de 7 a 15 anos, combinando técnicas de Jiu-Jitsu com desenvolvimento do caráter.</p>
                </div>
                
                <div class="card fade-in">
                    <div class="card-icon">👩</div>
                    <h3 class="card-title">Women's Program</h3>
                    <p class="card-text">Programa especial para mulheres, focando em defesa pessoal e empoderamento feminino.</p>
                </div>
            </div>
        </section>

        <!-- Benefícios Section -->
        <section id="beneficios" class="section">
            <div class="section-header">
                <h2 class="section-title fade-in">Benefícios do Jiu-Jitsu</h2>
                <p class="section-subtitle fade-in">Transforme sua vida através da prática regular do Jiu-Jitsu e descubra todos os benefícios desta arte marcial</p>
            </div>
            
            <div class="grid grid-3">
                <div class="card fade-in">
                    <div class="card-icon">💪</div>
                    <h3 class="card-title">Condicionamento Físico</h3>
                    <p class="card-text">Melhora significativa da força, flexibilidade, resistência cardiovascular e coordenação motora.</p>
                </div>
                
                <div class="card fade-in">
                    <div class="card-icon">🧠</div>
                    <h3 class="card-title">Desenvolvimento Mental</h3>
                    <p class="card-text">Aumenta o foco, disciplina, autocontrole e capacidade de resolução de problemas.</p>
                </div>
                
                <div class="card fade-in">
                    <div class="card-icon">🛡️</div>
                    <h3 class="card-title">Defesa Pessoal</h3>
                    <p class="card-text">Aprenda técnicas eficazes de autodefesa e desenvolva confiança para se proteger.</p>
                </div>
                
                <div class="card fade-in">
                    <div class="card-icon">🤝</div>
                    <h3 class="card-title">Socialização</h3>
                    <p class="card-text">Faça parte de uma comunidade unida e desenvolva amizades duradouras.</p>
                </div>
                
                <div class="card fade-in">
                    <div class="card-icon">⚖️</div>
                    <h3 class="card-title">Equilíbrio Emocional</h3>
                    <p class="card-text">Reduza o estresse, ansiedade e desenvolva maior estabilidade emocional.</p>
                </div>
                
                <div class="card fade-in">
                    <div class="card-icon">🏆</div>
                    <h3 class="card-title">Conquistas Pessoais</h3>
                    <p class="card-text">Estabeleça e alcance metas progressivas, celebrando cada evolução em sua jornada.</p>
                </div>
            </div>
        </section>

        <!-- Quote Section -->
        <section class="section" style="background: linear-gradient(135deg, rgba(44, 90, 160, 0.9), rgba(44, 90, 160, 0.7)), url('assets/images/carlos_gracie.png'); background-size: cover; background-position: center; color: white; text-align: center;">
            <div style="max-width: 800px; margin: 0 auto;">
                <blockquote style="font-size: clamp(1.25rem, 3vw, 2rem); font-style: italic; margin-bottom: var(--spacing-lg); line-height: 1.6;">
                    "Minha vida é dedicada ao Jiu-Jitsu. Meu objetivo sempre foi construir uma irmandade para liderar a expansão do Jiu-Jitsu, respeitando sempre a essência da nossa arte."
                </blockquote>
                <cite style="font-size: 1.25rem; font-weight: 600;">- Carlos Gracie Jr.</cite>
            </div>
        </section>

        <!-- Filosofia Section -->
        <section id="filosofia" class="section" style="background: var(--background-secondary);">
            <div class="section-header">
                <h2 class="section-title fade-in">Nossos Valores</h2>
                <p class="section-subtitle fade-in">Os pilares fundamentais que sustentam a Gracie Barra em todo o mundo</p>
            </div>
            
            <div class="grid grid-3">
                <div class="card fade-in">
                    <div class="card-icon">🤝</div>
                    <h3 class="card-title">Irmandade</h3>
                    <p class="card-text">Construímos uma comunidade forte baseada no respeito mútuo, apoio incondicional e crescimento conjunto.</p>
                </div>
                
                <div class="card fade-in">
                    <div class="card-icon">🌍</div>
                    <h3 class="card-title">Expansão</h3>
                    <p class="card-text">Compartilhamos o Jiu-Jitsu como ferramenta de transformação social e pessoal, levando seus benefícios para toda a comunidade.</p>
                </div>
                
                <div class="card fade-in">
                    <div class="card-icon">⚖️</div>
                    <h3 class="card-title">Integridade</h3>
                    <p class="card-text">Mantemos os mais altos padrões éticos e morais, preservando fielmente a tradição do Jiu-Jitsu Brasileiro.</p>
                </div>
            </div>
        </section>

        <!-- Professores Section -->
        <section id="professores" class="section">
    <div class="section-header">
        <h2 class="section-title fade-in">Nossos Professores</h2>
        <p class="section-subtitle fade-in">Instrutores qualificados e certificados pela Gracie Barra, dedicados ao seu desenvolvimento</p>
    </div>
    
    <div class="grid grid-2">
        <div class="card fade-in">
            <div class="image-container" style="background-image: url('app/assets/images/victor.jpg'); height: 250px; margin-bottom: var(--spacing-md);"></div>
            <h3 class="card-title">Professor Victor César</h3>
            <p style="color: var(--primary-blue); font-weight: 600; margin-bottom: var(--spacing-sm);">Faixa Preta 2º Grau</p>
            <p class="card-text">Faixa preta desde 2018, formado em Educação Física e especialista em ensino infantil. Bicampeão Brasileiro com experiência internacional nos EUA.</p>
            <button class="read-more-btn" onclick="openModal('victor')">Ler mais</button>
        </div>
        
        <div class="card fade-in">
            <div class="image-container" style="background-image: url('app/assets/images/professor_ricardo.png'); height: 250px; margin-bottom: var(--spacing-md);"></div>
            <h3 class="card-title">Professor Ricardo Pires</h3>
            <p style="color: var(--primary-blue); font-weight: 600; margin-bottom: var(--spacing-sm);">Faixa Preta 2º Grau</p>
            <p class="card-text">38 anos, iniciou aos 15 anos e é faixa preta desde 2016 pelo Sensei Henrique Machado. Professor há 12 anos, combina carreira no serviço público com dedicação total ao Jiu-Jitsu.</p>
            <button class="read-more-btn" onclick="openModal('ricardo')">Ler mais</button>
        </div>
    </div>
</section>

<!-- Modal Professor Victor -->
<div id="victorModal" class="modal">
    <div class="modal-content">
        <span class="close">&times;</span>
        <h3>Professor Victor César</h3>
        <div class="rank">Faixa Preta 2º Grau • Gracie Barra Cidade Nova</div>
        
        <p>Victor César é faixa preta de Jiu-Jitsu 2º grau desde 2018, com mais de uma década de experiência dedicada ao ensino da arte suave, especialmente com crianças. Formado em Educação Física desde 2016, alia conhecimento técnico e pedagógico para oferecer aulas seguras, divertidas e eficazes para todas as idades.</p>
        
        <p>Sua trajetória no Jiu-Jitsu é marcada por conquistas expressivas e vivências internacionais. Atuou como professor por dois anos nos Estados Unidos, onde também competiu e obteve excelentes resultados.</p>
        
        <p><strong>Principais Títulos e Conquistas:</strong></p>
        <ul>
            <li>Bicampeão Brasileiro de Jiu-Jitsu</li>
            <li>3º lugar no Campeonato Brasileiro</li>
            <li>3º lugar no American National (EUA)</li>
            <li>4× Campeão Amazonense</li>
            <li>Campeão da Seletiva de Abu Dhabi</li>
            <li>5× Campeão do Manaus Open</li>
            <li>Vice-campeão no Charlotte Open (EUA)</li>
            <li>Vice-campeão no Boise Open (EUA)</li>
            <li>Vice-campeão no Oklahoma Open (EUA)</li>
            <li>3º lugar no Atlanta Open (EUA)</li>
        </ul>
        
        <p><strong>Experiência Internacional:</strong></p>
        <p>Durante seus dois anos nos Estados Unidos, o Professor Victor não apenas ensinou Jiu-Jitsu, mas também competiu ativamente, representando a escola e conquistando resultados expressivos em diversos campeonatos americanos. Esta experiência internacional enriqueceu significativamente sua metodologia de ensino.</p>
        
        <p><strong>Filosofia de Ensino:</strong></p>
        <p>Como Professor especialista em ensino infantil da Gracie Barra Cidade Nova, o Professor Victor César acredita que o Jiu-Jitsu vai muito além das vitórias no tatame: é uma ferramenta poderosa de formação de caráter, disciplina e autoconfiança. Seu compromisso é oferecer um ambiente acolhedor, respeitoso e de alto nível técnico para todos os alunos.</p>
    </div>
</div>

<!-- Modal Professor Ricardo -->
<div id="ricardoModal" class="modal">
    <div class="modal-content">
        <span class="close">&times;</span>
        <h3>Professor Ricardo Pires</h3>
        <div class="rank">Faixa Preta 2º Grau • Gracie Barra Cidade Nova</div>
        
        <p>Professor Ricardo Pires, 38 anos, faixa preta 2° grau, é uma das referências técnicas da Gracie Barra Cidade Nova. Iniciou sua trajetória na arte suave aos 15 anos de idade e, desde então, vem construindo uma carreira marcada por dedicação, disciplina e paixão pelo tatame.</p>
        
        <p><strong>Formação e Graduação:</strong></p>
        <p>Em 2016, após anos de intenso aperfeiçoamento técnico e vivência no esporte, foi graduado faixa preta pelo renomado Sensei Henrique Machado, referência nacional e internacional na modalidade. Sua formação é fruto de uma trajetória sólida, pautada em treinos rigorosos, estudo contínuo e uma profunda compreensão dos valores do Jiu-Jitsu.</p>
        
        <p><strong>Experiência no Ensino:</strong></p>
        <p>Desde 2013, Ricardo Pires atua como professor, acumulando mais de 12 anos de experiência no ensino da arte marcial. Ao longo desse período, tem formado diversos praticantes, promovendo não apenas o desenvolvimento técnico de seus alunos, mas também valores como respeito, resiliência e autoconfiança.</p>
        
        <p><strong>Trajetória Competitiva:</strong></p>
        <p>Com mais de duas décadas de vivência em competições, sua história é também marcada por conquistas dentro dos tatames, levando consigo a experiência de quem conhece profundamente os desafios e aprendizados que o esporte oferece. Participou de diversos campeonatos regionais e nacionais, sempre representando com honra os valores da Gracie Barra.</p>
        
        <p><strong>Perfil Profissional e Pessoal:</strong></p>
        <p>Apesar de ser um servidor de carreira no serviço público, Ricardo Pires mantém sua dedicação integral ao Jiu-Jitsu, conciliando suas funções profissionais com o constante estudo e o ensino da arte marcial. Seu compromisso vai além da prática: é um verdadeiro exemplo de liderança e inspiração para as novas gerações de praticantes.</p>
        
        <p><strong>Metodologia de Ensino:</strong></p>
        <p>Known por sua paciência e didática excepcional, o Professor Ricardo adapta seu ensino às necessidades específicas de cada aluno, sempre respeitando os limites individuais e promovendo um ambiente de aprendizado seguro e eficaz. Sua abordagem equilibra rigor técnico com humanidade, criando uma atmosfera ideal para o desenvolvimento integral dos praticantes.</p>
    </div>
</div>

        <!-- Horários Section -->
        <section id="horarios" class="section" style="background: var(--background-secondary);">
            <div class="section-header">
                <h2 class="section-title fade-in">Cronograma de Aulas</h2>
                <p class="section-subtitle fade-in">Confira os horários das nossas aulas e escolha o melhor programa para você</p>
            </div>
            
            <div class="schedule-container fade-in">
                <div style="overflow-x: auto;">
                    <table class="schedule-table">
                        <thead>
                            <tr>
                                <th style="min-width: 80px;">Horário</th>
                                <th>Segunda</th>
                                <th>Terça</th>
                                <th>Quarta</th>
                                <th>Quinta</th>
                                <th>Sexta</th>
                                <th>Sábado</th>
                            </tr>
                        </thead>
<tbody>
    <tr>
        <td class="time-cell">07:00</td>
        <td class="class-cell gb1">GB1<br><small>Adulto Iniciantes</small></td>
        <td class="class-cell gb1">GB1<br><small>Adulto Iniciantes</small></td>
        <td class="class-cell gb1">GB1<br><small>Adulto Iniciantes</small></td>
        <td class="class-cell gb1">GB1<br><small>Adulto Iniciantes</small></td>
        <td class="class-cell gb1">GB1<br><small>Adulto Iniciantes</small></td>
        <td class="class-cell gb-kids">GB Kids<br><small>3-7 anos</small></td>
    </tr>
    <tr>
        <td class="time-cell">08:00</td>
        <td class="class-cell gb1">GB1<br><small>Adulto Iniciantes</small></td>
        <td class="class-cell gb1">GB1<br><small>Adulto Iniciantes</small></td>
        <td class="class-cell gb1">GB1<br><small>Adulto Iniciantes</small></td>
        <td class="class-cell gb1">GB1<br><small>Adulto Iniciantes</small></td>
        <td class="class-cell gb1">GB1<br><small>Adulto Iniciantes</small></td>
        <td class="class-cell gb1">GB1<br><small>Adulto Iniciantes</small></td>
    </tr>
    <tr>
        <td class="time-cell">09:00</td>
        <td class="class-cell gb-kids">GB Kids<br><small>3-7 anos</small></td>
        <td class="class-cell gb-kids">GB Kids<br><small>3-7 anos</small></td>
        <td class="class-cell gb-kids">GB Kids<br><small>3-7 anos</small></td>
        <td class="class-cell gb-kids">GB Kids<br><small>3-7 anos</small></td>
        <td class="class-cell gb-kids">GB Kids<br><small>3-7 anos</small></td>
        <td class="class-cell gb-kids">GB Kids<br><small>3-7 anos</small></td>
    </tr>                            <tr>
                                <td class="time-cell">17:00</td>
                                <td class="class-cell gb-kids">GB Kids<br><small>3-7 anos</small></td>
                                <td class="class-cell gb-kids">GB Kids<br><small>3-7 anos</small></td>
                                <td class="class-cell gb-kids">GB Kids<br><small>3-7 anos</small></td>
                                <td class="class-cell gb-kids">GB Kids<br><small>3-7 anos</small></td>
                                <td class="class-cell gb-kids">GB Kids NO GI<br><small>3-7 anos</small></td>
                                <td class="class-cell gb-kids">GB Kids<br><small>3-7 anos</small></td>
                            </tr>
                            <tr>
                                <td class="time-cell">18:00</td>
                                <td class="class-cell gb2">GB K2<br><small>8-13 anos</small></td>
                                <td class="class-cell gb2">GB K2<br><small>8-13 anos</small></td>
                                <td class="class-cell gb2">GB K2<br><small>8-13 anos</small></td>
                                <td class="class-cell gb2">GB K2<br><small>8-13 anos</small></td>
                                <td class="class-cell gb2">GB K2<br><small>8-13 anos</small></td>
                                <td class="class-cell gb-kids">GB Kids<br><small>3-7 anos</small></td>
                            </tr>
                            <tr>
                                <td class="time-cell">19:00</td>
                                <td class="class-cell gb3">GB1 + GB2<br><small>Adultos</small></td>
                                <td class="class-cell gb3">GB1 + GB2<br><small>Adultos</small></td>
                                <td class="class-cell gb3">GB1 + GB2<br><small>Adultos</small></td>
                                <td class="class-cell gb3">GB1 + GB2<br><small>Adultos</small></td>
                                <td class="class-cell gb3">GB1 + GB2<br><small>Adultos</small></td>
                                <td class="class-cell open-mat">Open Mat<br><small>Treino Livre</small></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

        <!-- Contato Section -->
        <section id="contato" class="contact-section section">
            <div class="section-header">
                <h2 class="section-title fade-in" style="color: white;">Entre em Contato</h2>
                <p class="section-subtitle fade-in" style="color: rgba(255,255,255,0.9);">Comece sua jornada no Jiu-Jitsu hoje mesmo e transforme sua vida</p>
            </div>
            
            <div class="grid grid-2">
                <div class="contact-card fade-in">
                    <h3 style="color: white; margin-bottom: var(--spacing-md);">📍 Localização</h3>
                    <p style="color: rgba(255,255,255,0.9); margin-bottom: var(--spacing-sm);">
                        Av. Atroaris, quadra 20, n. 129<br>
                        Conj. Renato Souza, R. Cap. Braule Pinto<br>
                        Cidade Nova, Manaus - AM
                    </p>
                </div>
                
                <div class="contact-card fade-in">
                    <h3 style="color: white; margin-bottom: var(--spacing-md);">📞 Contatos</h3>
                    <p style="color: rgba(255,255,255,0.9); margin-bottom: var(--spacing-sm);">
                        <a href="https://wa.me/559281136742" style="color: white;">(92) 98113-6742</a><br>
                        <a href="https://wa.me/559281501174" style="color: white;">(92) 98150-1174</a><br>
                        email@graciebarra.com.br
                    </p>
                    
                    <div style="display: flex; gap: var(--spacing-md); margin-top: var(--spacing-md);">
                        <a href="https://www.instagram.com/gb_cidadenova/" target="_blank" style="color: white; font-size: 1.5rem;">
                            <i class="bi bi-instagram"></i>
                        </a>
                        <a href="#" style="color: white; font-size: 1.5rem;">
                            <i class="bi bi-facebook"></i>
                        </a>
                        <a href="https://wa.me/559281136742" style="color: white; font-size: 1.5rem;">
                            <i class="bi bi-whatsapp"></i>
                        </a>
                    </div>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: var(--spacing-2xl);">
                <a href="https://wa.me/559281136742?text=Olá!%20Gostaria%20de%20agendar%20uma%20aula%20experimental%20na%20Gracie%20Barra%20Cidade%20Nova." target="_blank" class="hero-cta">
                    <i class="bi bi-whatsapp"></i>
                    Agendar Aula Experimental
                </a>
            </div>
        </section>
    </main>

    <!-- Footer Independente -->
    <footer class="main-footer">
        <div class="footer-content">
            <div class="footer-grid">
                <div class="footer-section">
                    <div class="footer-logo">
                        <div class="footer-logo-img"></div>
                        <div class="footer-logo-text">
                            <h3>Gracie Barra Cidade Nova</h3>
                            <p>Jiu-Jitsu para Todos</p>
                        </div>
                    </div>
                    <p>Faça parte da maior rede de Jiu-Jitsu do mundo. Transforme sua vida através da arte suave e descubra uma nova versão de si mesmo.</p>
                    <div class="social-links">
                        <a href="https://www.instagram.com/gb_cidadenova/" target="_blank" title="Instagram">
                            <i class="bi bi-instagram"></i>
                        </a>
                        <a href="#" title="Facebook">
                            <i class="bi bi-facebook"></i>
                        </a>
                        <a href="https://wa.me/559281136742" title="WhatsApp">
                            <i class="bi bi-whatsapp"></i>
                        </a>
                        <a href="#" title="YouTube">
                            <i class="bi bi-youtube"></i>
                        </a>
                    </div>
                </div>
                
                <div class="footer-section">
                    <h3><i class="bi bi-clock"></i> Horários</h3>
                    <ul>
                        <li><strong>Segunda a Sexta:</strong> 06:00 - 22:00</li>
                        <li><strong>Sábado:</strong> 08:00 - 16:00</li>
                        <li><strong>Domingo:</strong> Fechado</li>
                    </ul>
                    <br>
                    <h3><i class="bi bi-geo-alt"></i> Localização</h3>
                    <p>Av. Atroaris, quadra 20, n. 129<br>
                    Conj. Renato Souza, R. Cap. Braule Pinto<br>
                    Cidade Nova, Manaus - AM</p>
                </div>
                
                <div class="footer-section">
                    <h3><i class="bi bi-telephone"></i> Contatos</h3>
                    <ul>
                        <li><a href="https://wa.me/559281136742">(92) 98113-6742</a></li>
                        <li><a href="https://wa.me/559281501174">(92) 98150-1174</a></li>
                        <li><a href="mailto:email@graciebarra.com.br">email@graciebarra.com.br</a></li>
                    </ul>
                    <br>
                    <h3><i class="bi bi-list-ul"></i> Links Úteis</h3>
                    <ul>
                        <li><a href="#sobre">Sobre Nós</a></li>
                        <li><a href="#programas">Programas</a></li>
                        <li><a href="#professores">Professores</a></li>
                        <li><a href="#horarios">Horários</a></li>
                        <li><a href="https://app.gbcidadenovaam.com.br">Área do Aluno</a></li>
                    </ul>
                </div>
                
                <div class="footer-section">
                    <h3><i class="bi bi-award"></i> Programas</h3>
                    <ul>
                        <li><a href="#programas">GB1 - Fundamentals</a></li>
                        <li><a href="#programas">GB2 - Advanced</a></li>
                        <li><a href="#programas">GB3 - Black Belt</a></li>
                        <li><a href="#programas">Little Champions</a></li>
                        <li><a href="#programas">Junior Champions</a></li>
                        <li><a href="#programas">Women's Program</a></li>
                    </ul>
                </div>
            </div>
            
            <div class="footer-bottom">
                <div>
                    <p>&copy; 2024 Gracie Barra Cidade Nova. Todos os direitos reservados.</p>
                    <p>Parte da rede mundial Gracie Barra - Jiu-Jitsu para Todos</p>
                </div>
                <div class="footer-credits">
                    <p>Desenvolvido por <a href="https://i9script.com" target="_blank">i9Script</a></p>
                </div>
            </div>
        </div>
    </footer>

    <!-- Scroll to Top Button -->
    <button class="scroll-to-top" id="scrollToTop">
        <i class="bi bi-arrow-up"></i>
    </button>

    <script>
        // Theme Management
        const themeToggle = document.getElementById('themeToggle');
        const mobileThemeToggle = document.getElementById('mobileThemeToggle');
        const themeIcon = document.getElementById('themeIcon');
        const themeText = document.getElementById('themeText');
        const mobileThemeIcon = document.getElementById('mobileThemeIcon');
        const mobileThemeText = document.getElementById('mobileThemeText');

        function initTheme() {
            const savedTheme = localStorage.getItem('theme') || 
                (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            document.documentElement.setAttribute('data-theme', savedTheme);
            updateThemeIcons(savedTheme);
        }

        function toggleTheme() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcons(newTheme);
        }

        function updateThemeIcons(theme) {
            const icon = theme === 'dark' ? '☀️' : '🌙';
            const text = theme === 'dark' ? 'Claro' : 'Escuro';
            const mobileText = theme === 'dark' ? 'Modo Claro' : 'Modo Escuro';
            
            if (themeIcon) themeIcon.textContent = icon;
            if (themeText) themeText.textContent = text;
            if (mobileThemeIcon) mobileThemeIcon.textContent = icon;
            if (mobileThemeText) mobileThemeText.textContent = mobileText;
        }

        themeToggle?.addEventListener('click', toggleTheme);
        mobileThemeToggle?.addEventListener('click', toggleTheme);

        // Mobile Navigation
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileNav = document.getElementById('mobileNav');
        const mobileNavClose = document.getElementById('mobileNavClose');

        function toggleMobileNav() {
            mobileNav.classList.toggle('active');
            document.body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : '';
        }

        mobileMenuBtn?.addEventListener('click', toggleMobileNav);
        mobileNavClose?.addEventListener('click', toggleMobileNav);

        // Close mobile nav on link click
        mobileNav?.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                toggleMobileNav();
            }
        });

        // Header scroll effect
        const header = document.getElementById('mainHeader');
        let lastScrollY = window.scrollY;

        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });

        // Smooth scroll for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    const headerHeight = header.offsetHeight;
                    const targetPosition = target.offsetTop - headerHeight - 20;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });

        // Active navigation link
        const navLinks = document.querySelectorAll('.nav-link');
        const sections = document.querySelectorAll('section[id]');

        function updateActiveNav() {
            const scrollPos = window.scrollY + header.offsetHeight + 100;
            
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.offsetHeight;
                const sectionId = section.getAttribute('id');
                
                if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${sectionId}`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }

        window.addEventListener('scroll', updateActiveNav);

        // Scroll to top button
        const scrollToTopBtn = document.getElementById('scrollToTop');

        window.addEventListener('scroll', () => {
            if (window.scrollY > 500) {
                scrollToTopBtn.style.display = 'flex';
            } else {
                scrollToTopBtn.style.display = 'none';
            }
        });

        scrollToTopBtn?.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        // Intersection Observer for fade-in animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        document.querySelectorAll('.fade-in').forEach(el => {
            observer.observe(el);
        });

        // Logout function
        function logout() {
            if (confirm('Deseja realmente sair do sistema?')) {
                fetch('index.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: 'action=logout'
                })
                .then(response => response.json())
                .then(() => {
                    location.reload();
                })
                .catch(() => {
                    location.reload();
                });
            }
        }

        // Schedule table interactions
        document.querySelectorAll('.class-cell').forEach(cell => {
            cell.addEventListener('mouseenter', function() {
                this.style.transform = 'scale(1.05)';
                this.style.zIndex = '10';
            });
            
            cell.addEventListener('mouseleave', function() {
                this.style.transform = 'scale(1)';
                this.style.zIndex = '1';
            });
        });

        // Initialize theme and animations
        document.addEventListener('DOMContentLoaded', () => {
            initTheme();
            updateActiveNav();
            
            // Add loading complete class
            document.body.classList.add('loaded');
        });

        // Error handling
        window.addEventListener('error', (e) => {
            console.warn('Erro detectado:', e.message);
        });

        // Accessibility improvements
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
                toggleMobileNav();
            }
        });

        // User dropdown menu functionality
        const userMenuBtn = document.getElementById('userMenuBtn');
        const userDropdown = document.getElementById('userDropdown');

        function toggleUserDropdown() {
            userDropdown?.classList.toggle('active');
        }

        function closeUserDropdown() {
            userDropdown?.classList.remove('active');
        }

        userMenuBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleUserDropdown();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userMenuBtn?.contains(e.target) && !userDropdown?.contains(e.target)) {
                closeUserDropdown();
            }
        });

        // Close dropdown on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeUserDropdown();
            }
        });

        // Preload images
        const imageUrls = [
            'assets/images/gb1.jpg',
            'assets/images/gb8.jpg',
            'assets/images/gb9.jpg',
            'assets/images/gb6.jpg',
            'assets/images/victor.jpg',
            'assets/images/professor_ricardo.png'
        ];

        imageUrls.forEach(url => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = url;
            document.head.appendChild(link);
        });

        // Modal functionality
        function openModal(instructor) {
            const modal = document.getElementById(instructor + 'Modal');
            if (modal) {
                modal.style.display = 'block';
                document.body.style.overflow = 'hidden';
                
                // Add focus to modal for accessibility
                modal.focus();
            }
        }

        function closeModal(instructor) {
            const modal = document.getElementById(instructor + 'Modal');
            if (modal) {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }
        }

        // Initialize modal functionality when DOM is loaded
        document.addEventListener('DOMContentLoaded', function() {
            const modals = document.querySelectorAll('.modal');
            
            modals.forEach(modal => {
                const closeBtn = modal.querySelector('.close');
                
                // Close on X click
                if (closeBtn) {
                    closeBtn.addEventListener('click', function() {
                        modal.style.display = 'none';
                        document.body.style.overflow = '';
                    });
                }
                
                // Close on outside click
                modal.addEventListener('click', function(e) {
                    if (e.target === modal) {
                        modal.style.display = 'none';
                        document.body.style.overflow = '';
                    }
                });
            });
            
            // Close on Escape key
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    modals.forEach(modal => {
                        if (modal.style.display === 'block') {
                            modal.style.display = 'none';
                            document.body.style.overflow = '';
                        }
                    });
                }
            });
        });

        // Enhanced modal opening with animation
        window.openModal = function(instructor) {
            const modal = document.getElementById(instructor + 'Modal');
            if (modal) {
                modal.style.display = 'block';
                document.body.style.overflow = 'hidden';
                
                // Trigger animation
                requestAnimationFrame(() => {
                    modal.style.opacity = '1';
                });
                
                // Focus management for accessibility
                const modalContent = modal.querySelector('.modal-content');
                if (modalContent) {
                    modalContent.setAttribute('tabindex', '-1');
                    modalContent.focus();
                }
            }
        };

        // Enhanced animations for about section
        document.addEventListener('DOMContentLoaded', function() {
            // Specific observer for about section with stagger effect
            const aboutElements = document.querySelectorAll('#sobre .fade-in');
            let aboutDelay = 0;
            
            const aboutObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry, index) => {
                    if (entry.isIntersecting) {
                        setTimeout(() => {
                            entry.target.classList.add('active');
                        }, aboutDelay);
                        aboutDelay += 200; // Stagger animation by 200ms
                        aboutObserver.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.2,
                rootMargin: '0px 0px -100px 0px'
            });
            
            aboutElements.forEach(element => {
                aboutObserver.observe(element);
            });
            
            // Interactive hover effects for highlight cards
            document.querySelectorAll('.highlight-card').forEach(card => {
                card.addEventListener('mouseenter', function() {
                    const icon = this.querySelector('.highlight-icon');
                    if (icon) {
                        icon.style.transform = 'scale(1.2) rotate(10deg)';
                        icon.style.transition = 'transform 0.3s ease';
                    }
                });
                
                card.addEventListener('mouseleave', function() {
                    const icon = this.querySelector('.highlight-icon');
                    if (icon) {
                        icon.style.transform = 'scale(1) rotate(0deg)';
                    }
                });
            });
        });
    </script>

</body>
</html>