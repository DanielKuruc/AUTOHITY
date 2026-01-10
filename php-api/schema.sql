-- -----------------------------------------------------
-- Autohity PHP API Schema (current)
-- Compatible with MySQL 5.7+/MariaDB 10.2+ (JSON supported)
-- Run on the target database to create/align structures.
-- -----------------------------------------------------

SET NAMES utf8mb4;
SET time_zone = '+00:00';
-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Clients table (persons and companies)
CREATE TABLE IF NOT EXISTS clients (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    client_type ENUM('person','company') NOT NULL,
    -- person
    first_name VARCHAR(100) NULL,
    last_name VARCHAR(100) NULL,
    -- company
    company_name VARCHAR(255) NULL,
    ico VARCHAR(20) NULL,
    dic VARCHAR(20) NULL,
    -- common
    phone VARCHAR(50) NOT NULL,
    -- address (company only)
    street VARCHAR(255) NULL,
    city VARCHAR(100) NULL,
    postal_code VARCHAR(20) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_client_type (client_type),
    INDEX idx_phone (phone),
    INDEX idx_company_name (company_name),
    INDEX idx_ico (ico)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Purchases table (matches PurchaseAPI::create/::update)
CREATE TABLE IF NOT EXISTS purchases (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    client_id INT UNSIGNED NULL,
    client_name VARCHAR(255) NOT NULL,
    client_type VARCHAR(50) NULL,
    spz VARCHAR(20) NOT NULL,
    purchase_date DATE NULL,
    purchase_state VARCHAR(50) NOT NULL DEFAULT 'NEW',
    employee_id INT NULL,
    total_amount INT NULL,
    customer_price INT NULL,
    offered_price INT NULL,
    expected_sale_price INT NULL,
    is_vat_payer TINYINT(1) NOT NULL DEFAULT 0,
    is_counter_account TINYINT(1) NOT NULL DEFAULT 0,
    vin_verified TINYINT(1) NOT NULL DEFAULT 0,
    source_knowledge VARCHAR(50) NULL,
    phone VARCHAR(50) NULL,
    street VARCHAR(255) NULL,
    city VARCHAR(100) NULL,
    postal_code VARCHAR(10) NULL,
    notes TEXT NULL,
    inspection_date DATE NULL,
    company_info JSON NULL,
    photos JSON NULL,
    defect_photos JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_purchases_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_client_id (client_id),
    INDEX idx_client_name (client_name),
    INDEX idx_spz (spz),
    INDEX idx_purchase_state (purchase_state),
    INDEX idx_employee_id (employee_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- New table: purchase_photos (normalized storage for photos)
CREATE TABLE IF NOT EXISTS purchase_photos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    purchase_id INT UNSIGNED NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    photo_type ENUM('vehicle','defect') NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_photos_purchase FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
    INDEX idx_purchase (purchase_id),
    INDEX idx_purchase_type_order (purchase_id, photo_type, order_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional details for vehicle bound to purchase (not required by API)
CREATE TABLE IF NOT EXISTS vehicles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    purchase_id INT UNSIGNED NOT NULL,
    vin VARCHAR(17) NULL,
    make VARCHAR(100) NULL,
    model VARCHAR(100) NULL,
    year INT NULL,
    color VARCHAR(50) NULL,
    mileage INT NULL,
    fuel_type VARCHAR(50) NULL,
    engine_size VARCHAR(50) NULL,
    transmission VARCHAR(50) NULL,
    body_type VARCHAR(50) NULL,
    drive_type VARCHAR(50) NULL,
    stk VARCHAR(50) NULL,
    first_registration DATE NULL,
    is_import TINYINT(1) NOT NULL DEFAULT 0,
    is_first_owner TINYINT(1) NOT NULL DEFAULT 0,
    has_service_book TINYINT(1) NOT NULL DEFAULT 0,
    has_security_screws TINYINT(1) NOT NULL DEFAULT 0,
    has_ai_wheels TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_vehicle_purchase FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
    INDEX idx_purchase_id (purchase_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Component status table (optional per purchase)
CREATE TABLE IF NOT EXISTS component_statuses (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    purchase_id INT UNSIGNED NOT NULL,
    component VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'good',
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_component_purchase FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
    INDEX idx_purchase_id (purchase_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Helpful ALTER statements if migrating from an older schema
-- (Run manually as needed)
-- ALTER TABLE purchases MODIFY employee_id INT NULL;
-- ALTER TABLE purchases ADD COLUMN photos JSON NULL AFTER inspection_date;
-- ALTER TABLE purchases MODIFY purchase_state VARCHAR(50) NOT NULL DEFAULT 'NEW';
-- ALTER TABLE purchases ADD COLUMN company_info JSON NULL AFTER inspection_date;
-- ALTER TABLE purchases ADD COLUMN is_counter_account TINYINT(1) NOT NULL DEFAULT 0;
-- ALTER TABLE purchases ADD COLUMN vin_verified TINYINT(1) NOT NULL DEFAULT 0;
-- ALTER TABLE purchases ADD COLUMN source_knowledge VARCHAR(50) NULL;
-- ALTER TABLE purchases ADD COLUMN defect_photos JSON NULL AFTER photos;