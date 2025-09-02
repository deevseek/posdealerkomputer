-- =============================================
-- LaptopPOS Service Management System Database
-- Complete PostgreSQL Setup Script
-- For Local Deployment on Windows & Linux
-- =============================================

-- Create database extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- ENUMS
-- =============================================

CREATE TYPE user_role AS ENUM ('admin', 'kasir', 'teknisi', 'purchasing', 'finance', 'owner');
CREATE TYPE transaction_type AS ENUM ('sale', 'service', 'purchase', 'return');
CREATE TYPE payment_method AS ENUM ('cash', 'transfer', 'qris', 'installment');
CREATE TYPE service_status AS ENUM ('pending', 'checking', 'in-progress', 'waiting-technician', 'testing', 'waiting-confirmation', 'waiting-parts', 'completed', 'delivered', 'cancelled');
CREATE TYPE stock_movement_type AS ENUM ('in', 'out', 'adjustment');
CREATE TYPE stock_reference_type AS ENUM ('sale', 'service', 'purchase', 'adjustment', 'return');

-- =============================================
-- CORE TABLES
-- =============================================

-- Session storage table (mandatory for Replit Auth)
CREATE TABLE sessions (
    sid VARCHAR PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP NOT NULL
);

CREATE INDEX IDX_session_expire ON sessions(expire);

-- Users
CREATE TABLE users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR,
    password VARCHAR,
    email VARCHAR UNIQUE,
    first_name VARCHAR,
    last_name VARCHAR,
    profile_image_url VARCHAR,
    role user_role DEFAULT 'kasir',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Roles for role management
CREATE TABLE roles (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR UNIQUE NOT NULL,
    display_name VARCHAR NOT NULL,
    description TEXT,
    permissions TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Store configuration
CREATE TABLE store_config (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    address TEXT,
    phone VARCHAR,
    email VARCHAR,
    tax_rate DECIMAL(5,2) DEFAULT 11.00,
    default_discount DECIMAL(5,2) DEFAULT 0.00,
    logo VARCHAR,
    whatsapp_enabled BOOLEAN DEFAULT false,
    whatsapp_session_data TEXT,
    whatsapp_qr TEXT,
    whatsapp_connected BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Products - Enhanced inventory system
CREATE TABLE products (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    description TEXT,
    category_id VARCHAR REFERENCES categories(id),
    sku VARCHAR UNIQUE NOT NULL,
    barcode VARCHAR,
    brand VARCHAR,
    model VARCHAR,
    unit VARCHAR DEFAULT 'pcs',
    specifications TEXT,
    
    -- Pricing
    last_purchase_price DECIMAL(12,2),
    average_cost DECIMAL(12,2),
    selling_price DECIMAL(12,2),
    margin_percent DECIMAL(5,2),
    
    -- Stock management
    stock INTEGER DEFAULT 0,
    total_stock INTEGER DEFAULT 0,
    available_stock INTEGER DEFAULT 0,
    reserved_stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    max_stock INTEGER,
    reorder_point INTEGER,
    reorder_quantity INTEGER,
    
    -- Tracking
    track_batches BOOLEAN DEFAULT false,
    track_serial BOOLEAN DEFAULT false,
    track_expiry BOOLEAN DEFAULT false,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_discontinued BOOLEAN DEFAULT false,
    
    -- Metadata
    weight DECIMAL(8,3),
    dimensions VARCHAR,
    supplier_product_code VARCHAR,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Customers
CREATE TABLE customers (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    email VARCHAR,
    phone VARCHAR,
    address TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Suppliers - Enhanced supplier management
CREATE TABLE suppliers (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    company_name VARCHAR,
    
    -- Contact information
    email VARCHAR,
    phone VARCHAR,
    alt_phone VARCHAR,
    website VARCHAR,
    
    -- Address
    address TEXT,
    city VARCHAR,
    province VARCHAR,
    postal_code VARCHAR,
    country VARCHAR DEFAULT 'Indonesia',
    
    -- Contact persons
    contact_person VARCHAR,
    contact_title VARCHAR,
    contact_email VARCHAR,
    contact_phone VARCHAR,
    
    -- Business details
    tax_number VARCHAR,
    business_license VARCHAR,
    
    -- Terms
    payment_terms INTEGER DEFAULT 30,
    credit_limit DECIMAL(15,2),
    
    -- Status and ratings
    is_active BOOLEAN DEFAULT true,
    rating INTEGER DEFAULT 5,
    
    -- Banking
    bank_name VARCHAR,
    bank_account VARCHAR,
    bank_account_name VARCHAR,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Transactions
CREATE TABLE transactions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_number VARCHAR NOT NULL UNIQUE,
    type transaction_type NOT NULL,
    customer_id VARCHAR REFERENCES customers(id),
    supplier_id VARCHAR REFERENCES suppliers(id),
    user_id VARCHAR REFERENCES users(id) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) DEFAULT 0.00,
    discount_amount DECIMAL(12,2) DEFAULT 0.00,
    total DECIMAL(12,2) NOT NULL,
    payment_method payment_method,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Transaction Items
CREATE TABLE transaction_items (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR REFERENCES transactions(id) NOT NULL,
    product_id VARCHAR REFERENCES products(id) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL
);

-- Service Tickets
CREATE TABLE service_tickets (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR NOT NULL UNIQUE,
    customer_id VARCHAR REFERENCES customers(id) NOT NULL,
    device_type VARCHAR NOT NULL,
    device_brand VARCHAR,
    device_model VARCHAR,
    serial_number VARCHAR,
    completeness TEXT,
    problem TEXT NOT NULL,
    diagnosis TEXT,
    solution TEXT,
    estimated_cost DECIMAL(12,2),
    actual_cost DECIMAL(12,2),
    labor_cost DECIMAL(12,2),
    parts_cost DECIMAL(12,2),
    status service_status DEFAULT 'pending',
    technician_id VARCHAR REFERENCES users(id),
    estimated_completion TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Service Ticket Parts
CREATE TABLE service_ticket_parts (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    service_ticket_id VARCHAR REFERENCES service_tickets(id) NOT NULL,
    product_id VARCHAR REFERENCES products(id) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Product Locations
CREATE TABLE locations (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    description TEXT,
    location_type VARCHAR DEFAULT 'warehouse',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Product Batches/Lots
CREATE TABLE product_batches (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id VARCHAR REFERENCES products(id) NOT NULL,
    batch_number VARCHAR NOT NULL,
    serial_numbers TEXT[],
    
    -- Pricing for this batch
    unit_cost DECIMAL(12,2) NOT NULL,
    
    -- Quantities
    received_quantity INTEGER NOT NULL,
    current_quantity INTEGER NOT NULL,
    reserved_quantity INTEGER DEFAULT 0,
    
    -- Dates
    manufacture_date DATE,
    expiry_date DATE,
    received_date TIMESTAMP DEFAULT NOW(),
    
    -- References
    purchase_order_id VARCHAR,
    supplier_id VARCHAR REFERENCES suppliers(id),
    location_id VARCHAR REFERENCES locations(id),
    
    -- Status
    status VARCHAR DEFAULT 'active',
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Purchase Orders
CREATE TABLE purchase_orders (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR UNIQUE NOT NULL,
    supplier_id VARCHAR REFERENCES suppliers(id) NOT NULL,
    
    -- Dates
    order_date DATE DEFAULT NOW(),
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    
    -- Status workflow
    status VARCHAR DEFAULT 'draft',
    
    -- Financial
    subtotal DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    shipping_cost DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    
    -- Approval workflow
    requested_by VARCHAR REFERENCES users(id) NOT NULL,
    approved_by VARCHAR REFERENCES users(id),
    approved_date TIMESTAMP,
    
    -- Delivery
    delivery_address TEXT,
    shipping_method VARCHAR,
    tracking_number VARCHAR,
    
    -- Terms
    payment_terms INTEGER DEFAULT 30,
    
    notes TEXT,
    internal_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Purchase Order Items
CREATE TABLE purchase_order_items (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id VARCHAR REFERENCES purchase_orders(id) NOT NULL,
    product_id VARCHAR REFERENCES products(id) NOT NULL,
    
    -- Quantities
    quantity INTEGER NOT NULL,
    ordered_quantity INTEGER,
    received_quantity INTEGER DEFAULT 0,
    
    -- Pricing
    unit_cost VARCHAR NOT NULL,
    total_cost VARCHAR,
    unit_price DECIMAL(12,2),
    total_price DECIMAL(12,2),
    
    -- Product info at time of order
    product_name VARCHAR,
    product_sku VARCHAR,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Stock Movements
CREATE TABLE stock_movements (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Product tracking
    product_id VARCHAR REFERENCES products(id) NOT NULL,
    batch_id VARCHAR REFERENCES product_batches(id),
    location_id VARCHAR REFERENCES locations(id),
    
    -- Movement details
    movement_type VARCHAR NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(12,2),
    
    -- References
    reference_id VARCHAR,
    reference_type VARCHAR NOT NULL,
    
    -- Additional tracking
    from_location_id VARCHAR REFERENCES locations(id),
    to_location_id VARCHAR REFERENCES locations(id),
    
    -- Metadata
    notes TEXT,
    reason VARCHAR,
    user_id VARCHAR REFERENCES users(id) NOT NULL,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Inventory Adjustments
CREATE TABLE inventory_adjustments (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    adjustment_number VARCHAR UNIQUE NOT NULL,
    
    -- Adjustment details
    type VARCHAR NOT NULL,
    reason VARCHAR NOT NULL,
    
    -- Approval
    status VARCHAR DEFAULT 'pending',
    created_by VARCHAR REFERENCES users(id) NOT NULL,
    approved_by VARCHAR REFERENCES users(id),
    approved_date TIMESTAMP,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Inventory Adjustment Items
CREATE TABLE inventory_adjustment_items (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    adjustment_id VARCHAR REFERENCES inventory_adjustments(id) NOT NULL,
    product_id VARCHAR REFERENCES products(id) NOT NULL,
    batch_id VARCHAR REFERENCES product_batches(id),
    location_id VARCHAR REFERENCES locations(id),
    
    -- Quantities
    system_quantity INTEGER NOT NULL,
    actual_quantity INTEGER NOT NULL,
    adjustment_quantity INTEGER NOT NULL,
    
    -- Cost impact
    unit_cost DECIMAL(12,2),
    total_cost_impact DECIMAL(12,2),
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- FINANCIAL SYSTEM TABLES
-- =============================================

-- Chart of Accounts
CREATE TABLE accounts (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL,
    subtype VARCHAR(50),
    parent_id VARCHAR REFERENCES accounts(id),
    normal_balance VARCHAR(10) NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Journal Entries for Double-Entry Bookkeeping
CREATE TABLE journal_entries (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_number VARCHAR(50) UNIQUE NOT NULL,
    date TIMESTAMP NOT NULL,
    description TEXT NOT NULL,
    reference VARCHAR,
    reference_type VARCHAR(50),
    total_amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'posted',
    user_id VARCHAR REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Journal Entry Lines (Debit/Credit entries)
CREATE TABLE journal_entry_lines (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id VARCHAR REFERENCES journal_entries(id) NOT NULL,
    account_id VARCHAR REFERENCES accounts(id) NOT NULL,
    description TEXT NOT NULL,
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Financial Records
CREATE TABLE financial_records (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    amount DECIMAL(15,2) NOT NULL,
    description TEXT NOT NULL,
    reference VARCHAR,
    reference_type VARCHAR(50),
    account_id VARCHAR REFERENCES accounts(id),
    journal_entry_id VARCHAR REFERENCES journal_entries(id),
    payment_method VARCHAR(50),
    status VARCHAR(20) DEFAULT 'confirmed',
    tags TEXT[],
    user_id VARCHAR REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- PAYROLL SYSTEM TABLES
-- =============================================

-- Employees for Payroll
CREATE TABLE employees (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_number VARCHAR(50) UNIQUE NOT NULL,
    user_id VARCHAR REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    salary DECIMAL(12,2) NOT NULL,
    salary_type VARCHAR(20) DEFAULT 'monthly',
    join_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    bank_account VARCHAR(50),
    tax_id VARCHAR(50),
    address TEXT,
    phone VARCHAR(20),
    emergency_contact JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Payroll Records
CREATE TABLE payroll_records (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR REFERENCES employees(id) NOT NULL,
    payroll_number VARCHAR(50) UNIQUE NOT NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    base_salary DECIMAL(12,2) NOT NULL,
    overtime DECIMAL(12,2) DEFAULT 0,
    bonus DECIMAL(12,2) DEFAULT 0,
    allowances DECIMAL(12,2) DEFAULT 0,
    gross_pay DECIMAL(12,2) NOT NULL,
    tax_deduction DECIMAL(12,2) DEFAULT 0,
    social_security DECIMAL(12,2) DEFAULT 0,
    health_insurance DECIMAL(12,2) DEFAULT 0,
    other_deductions DECIMAL(12,2) DEFAULT 0,
    net_pay DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    paid_date TIMESTAMP,
    notes TEXT,
    user_id VARCHAR REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Attendance Records
CREATE TABLE attendance_records (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR REFERENCES employees(id) NOT NULL,
    date TIMESTAMP NOT NULL,
    clock_in TIMESTAMP,
    clock_out TIMESTAMP,
    break_start TIMESTAMP,
    break_end TIMESTAMP,
    hours_worked DECIMAL(4,2) DEFAULT 0,
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'present',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- SAMPLE DATA
-- =============================================

-- Insert store configuration
INSERT INTO store_config (id, name, address, phone, email, tax_rate) VALUES
('d5cc36ae-35ba-453b-b99d-51964e6b6e21', 'LaptopPOS Service Center', 'Jl. Teknologi No. 123, Jakarta', '+62-21-12345678', 'info@laptoppos.com', 11.00);

-- Insert default admin user
INSERT INTO users (id, username, email, first_name, last_name, role, password) VALUES
('a4fb9372-ec01-4825-b035-81de75a18053', 'admin', 'admin@laptoppos.com', 'System', 'Administrator', 'admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Insert sample categories
INSERT INTO categories (id, name, description) VALUES
('cat-1', 'Laptop', 'Laptop dan notebook'),
('cat-2', 'Aksesoris', 'Aksesoris laptop dan komputer'),
('cat-3', 'Spare Part', 'Komponen dan spare part laptop'),
('cat-4', 'Software', 'Software dan lisensi');

-- Insert sample locations
INSERT INTO locations (id, code, name, description) VALUES
('loc-1', 'WH-001', 'Gudang Utama', 'Gudang penyimpanan utama'),
('loc-2', 'SH-001', 'Toko Display', 'Area display produk'),
('loc-3', 'SV-001', 'Service Area', 'Area perbaikan service');

-- Insert sample suppliers
INSERT INTO suppliers (id, code, name, company_name, email, phone, address, payment_terms) VALUES
('sup-1', 'SUP001', 'PT Distributor Laptop', 'PT Distributor Laptop Indonesia', 'sales@distributor.com', '+62-21-87654321', 'Jl. Industri No. 45, Jakarta', 30),
('sup-2', 'SUP002', 'CV Parts Center', 'CV Parts Center Komputer', 'order@partscenter.com', '+62-21-11223344', 'Jl. Spare Part No. 12, Bandung', 14);

-- Insert sample products
INSERT INTO products (id, name, description, category_id, sku, brand, model, selling_price, stock, available_stock, total_stock, min_stock) VALUES
('prod-1', 'Laptop ASUS VivoBook 14', 'Laptop ASUS VivoBook 14 inch Intel Core i5', 'cat-1', 'LAP-ASU-VB14-001', 'ASUS', 'VivoBook 14', 8500000.00, 5, 5, 5, 2),
('prod-2', 'RAM DDR4 8GB', 'Memory RAM DDR4 8GB 2666MHz', 'cat-3', 'MEM-DDR4-8GB-001', 'Kingston', 'ValueRAM', 650000.00, 20, 18, 20, 5),
('prod-3', 'SSD 256GB SATA', 'Solid State Drive 256GB SATA III', 'cat-3', 'SSD-256-SAT-001', 'Samsung', 'EVO 980', 450000.00, 15, 15, 15, 3),
('prod-4', 'Mouse Wireless', 'Mouse wireless optical 2.4GHz', 'cat-2', 'MOU-WIR-OPT-001', 'Logitech', 'M220', 125000.00, 30, 30, 30, 10);

-- Insert sample customers
INSERT INTO customers (id, name, email, phone, address) VALUES
('cust-1', 'Budi Santoso', 'budi.santoso@email.com', '+62-812-3456-7890', 'Jl. Merdeka No. 123, Jakarta'),
('cust-2', 'Sari Indah', 'sari.indah@email.com', '+62-813-9876-5432', 'Jl. Proklamasi No. 45, Bandung'),
('cust-3', 'Ahmad Rahman', 'ahmad.rahman@email.com', '+62-814-1122-3344', 'Jl. Sudirman No. 67, Surabaya');

-- Insert sample chart of accounts
INSERT INTO accounts (id, code, name, type, normal_balance) VALUES
('acc-1000', '1000', 'Kas', 'asset', 'debit'),
('acc-1100', '1100', 'Bank', 'asset', 'debit'),
('acc-1200', '1200', 'Piutang Dagang', 'asset', 'debit'),
('acc-1300', '1300', 'Persediaan', 'asset', 'debit'),
('acc-2000', '2000', 'Hutang Dagang', 'liability', 'credit'),
('acc-3000', '3000', 'Modal', 'equity', 'credit'),
('acc-4000', '4000', 'Pendapatan Penjualan', 'revenue', 'credit'),
('acc-5000', '5000', 'Harga Pokok Penjualan', 'expense', 'debit'),
('acc-6000', '6000', 'Beban Operasional', 'expense', 'debit');

-- Insert sample roles
INSERT INTO roles (id, name, display_name, description, permissions) VALUES
('role-admin', 'admin', 'Administrator', 'Full system access', ARRAY['all']),
('role-kasir', 'kasir', 'Kasir', 'Point of sale operations', ARRAY['pos', 'customers']),
('role-teknisi', 'teknisi', 'Teknisi', 'Service management', ARRAY['service', 'inventory']),
('role-purchasing', 'purchasing', 'Purchasing', 'Purchase management', ARRAY['purchasing', 'suppliers', 'inventory']),
('role-finance', 'finance', 'Finance', 'Financial management', ARRAY['finance', 'reports']),
('role-owner', 'owner', 'Owner', 'Business overview and reports', ARRAY['reports', 'dashboard']);

-- Insert sample employees
INSERT INTO employees (id, employee_number, user_id, name, position, salary, join_date) VALUES
('emp-1', 'EMP001', 'a4fb9372-ec01-4825-b035-81de75a18053', 'System Administrator', 'IT Manager', 8000000.00, '2024-01-01'),
('emp-2', 'EMP002', NULL, 'Kasir Utama', 'Cashier', 4500000.00, '2024-01-15'),
('emp-3', 'EMP003', NULL, 'Teknisi Senior', 'Technician', 6000000.00, '2024-02-01');

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_transactions_number ON transactions(transaction_number);
CREATE INDEX idx_transactions_date ON transactions(created_at);
CREATE INDEX idx_service_tickets_number ON service_tickets(ticket_number);
CREATE INDEX idx_service_tickets_status ON service_tickets(status);
CREATE INDEX idx_purchase_orders_number ON purchase_orders(po_number);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(created_at);
CREATE INDEX idx_financial_records_type ON financial_records(type);
CREATE INDEX idx_financial_records_date ON financial_records(created_at);

-- =============================================
-- VIEWS FOR REPORTING
-- =============================================

-- Product inventory view
CREATE VIEW v_product_inventory AS
SELECT 
    p.id,
    p.name,
    p.sku,
    p.brand,
    p.model,
    c.name as category_name,
    p.stock,
    p.available_stock,
    p.reserved_stock,
    p.min_stock,
    p.selling_price,
    p.last_purchase_price,
    p.is_active,
    CASE 
        WHEN p.stock <= p.min_stock THEN 'low_stock'
        WHEN p.stock = 0 THEN 'out_of_stock'
        ELSE 'normal'
    END as stock_status
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_active = true;

-- Sales summary view
CREATE VIEW v_sales_summary AS
SELECT 
    DATE(t.created_at) as sale_date,
    COUNT(*) as total_transactions,
    SUM(t.total) as total_sales,
    SUM(t.tax_amount) as total_tax,
    SUM(t.discount_amount) as total_discount
FROM transactions t
WHERE t.type = 'sale'
GROUP BY DATE(t.created_at)
ORDER BY sale_date DESC;

-- Service tickets summary view
CREATE VIEW v_service_summary AS
SELECT 
    status,
    COUNT(*) as ticket_count,
    AVG(actual_cost) as avg_cost,
    SUM(actual_cost) as total_revenue
FROM service_tickets
GROUP BY status;

-- =============================================
-- TRIGGERS FOR AUDIT AND AUTOMATION
-- =============================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_tickets_updated_at BEFORE UPDATE ON service_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_store_config_updated_at BEFORE UPDATE ON store_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- CONSTRAINTS AND VALIDATIONS
-- =============================================

-- Ensure stock quantities are non-negative
ALTER TABLE products ADD CONSTRAINT chk_stock_non_negative CHECK (stock >= 0);
ALTER TABLE products ADD CONSTRAINT chk_available_stock_non_negative CHECK (available_stock >= 0);

-- Ensure transaction totals are positive
ALTER TABLE transactions ADD CONSTRAINT chk_transaction_total_positive CHECK (total > 0);

-- Ensure service ticket costs are non-negative
ALTER TABLE service_tickets ADD CONSTRAINT chk_estimated_cost_non_negative CHECK (estimated_cost >= 0);
ALTER TABLE service_tickets ADD CONSTRAINT chk_actual_cost_non_negative CHECK (actual_cost >= 0);

-- Ensure journal entries balance
-- This would typically be enforced by the application, but we can add a check function

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

-- The database setup is complete!
-- To use this database:
-- 1. Create a PostgreSQL database: CREATE DATABASE laptoppos;
-- 2. Connect to the database: \c laptoppos;
-- 3. Run this script: \i laptoppos_database.sql
-- 4. Default admin login: username 'admin', password 'password' (change immediately!)
-- 5. Configure your application DATABASE_URL to connect to this database

SELECT 'LaptopPOS Database Setup Complete!' as status,
       'Default admin user: admin@laptoppos.com' as admin_info,
       'Remember to change the default password!' as security_note;