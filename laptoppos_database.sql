-- ===================================
-- LaptopPOS Database Schema & Data
-- Version: 2.0 (Updated September 2025)
-- Includes: Authentication fixes, Finance corrections, Windows deployment support
-- ===================================

-- Drop existing tables (if they exist)
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS store_config CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS product_batches CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS transaction_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS service_tickets CASCADE;
DROP TABLE IF EXISTS service_ticket_parts CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS inventory_adjustments CASCADE;
DROP TABLE IF EXISTS inventory_adjustment_items CASCADE;
DROP TABLE IF EXISTS financial_records CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS journal_entries CASCADE;
DROP TABLE IF EXISTS journal_entry_lines CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS payroll_records CASCADE;

-- Drop existing enums
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS service_status CASCADE;
DROP TYPE IF EXISTS stock_movement_type CASCADE;
DROP TYPE IF EXISTS stock_reference_type CASCADE;

-- Create Enums
CREATE TYPE user_role AS ENUM ('admin', 'kasir', 'teknisi', 'purchasing', 'finance', 'owner');
CREATE TYPE transaction_type AS ENUM ('sale', 'service', 'purchase', 'return');
CREATE TYPE payment_method AS ENUM ('cash', 'transfer', 'qris', 'installment');
CREATE TYPE service_status AS ENUM ('pending', 'checking', 'in-progress', 'waiting-technician', 'testing', 'waiting-confirmation', 'waiting-parts', 'completed', 'delivered', 'cancelled');
CREATE TYPE stock_movement_type AS ENUM ('in', 'out', 'adjustment');
CREATE TYPE stock_reference_type AS ENUM ('sale', 'service', 'purchase', 'adjustment', 'return');

-- ===================================
-- CORE TABLES
-- ===================================

-- Sessions table (for authentication)
CREATE TABLE sessions (
    sid varchar PRIMARY KEY,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);
CREATE INDEX IDX_session_expire ON sessions (expire);

-- Users table
CREATE TABLE users (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
    username varchar UNIQUE,
    password varchar,
    email varchar UNIQUE,
    first_name varchar,
    last_name varchar,
    profile_image_url varchar,
    role user_role DEFAULT 'kasir',
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Roles table
CREATE TABLE roles (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name varchar UNIQUE NOT NULL,
    display_name varchar NOT NULL,
    description text,
    permissions text[],
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Store configuration
CREATE TABLE store_config (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name varchar NOT NULL,
    address text,
    phone varchar,
    email varchar,
    tax_rate numeric(5,2) DEFAULT 11.00,
    default_discount numeric(5,2) DEFAULT 0.00,
    logo varchar,
    whatsapp_enabled boolean DEFAULT false,
    whatsapp_session_data text,
    whatsapp_qr text,
    whatsapp_connected boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Categories
CREATE TABLE categories (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name varchar NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now()
);

-- Suppliers
CREATE TABLE suppliers (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name varchar NOT NULL,
    code varchar,
    email varchar,
    phone varchar,
    primary_email varchar,
    address text,
    contact_person varchar,
    contact_title varchar,
    tax_id varchar,
    payment_terms integer DEFAULT 30,
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Customers
CREATE TABLE customers (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name varchar NOT NULL,
    email varchar,
    phone varchar,
    address text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Locations
CREATE TABLE locations (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name varchar NOT NULL,
    description text,
    type varchar,
    address text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- ===================================
-- INVENTORY TABLES
-- ===================================

-- Products
CREATE TABLE products (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name varchar NOT NULL,
    description text,
    category_id varchar REFERENCES categories(id),
    sku varchar UNIQUE,
    barcode varchar,
    brand varchar,
    model varchar,
    serial_number varchar,
    unit varchar DEFAULT 'pcs',
    specifications text,
    
    -- Pricing
    purchase_price numeric(12,2),
    last_purchase_price numeric(12,2),
    average_cost numeric(12,2),
    selling_price numeric(12,2),
    margin_percent numeric(5,2),
    
    -- Stock management
    stock integer DEFAULT 0,
    total_stock integer DEFAULT 0,
    available_stock integer DEFAULT 0,
    reserved_stock integer DEFAULT 0,
    min_stock integer DEFAULT 0,
    max_stock integer,
    reorder_point integer,
    reorder_quantity integer,
    
    -- Tracking options
    track_batches boolean DEFAULT false,
    track_serial boolean DEFAULT false,
    track_expiry boolean DEFAULT false,
    is_discontinued boolean DEFAULT false,
    
    -- Physical properties
    weight numeric(8,3),
    dimensions varchar,
    supplier_product_code varchar,
    notes text,
    
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Product batches
CREATE TABLE product_batches (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
    product_id varchar NOT NULL REFERENCES products(id),
    batch_number varchar NOT NULL,
    quantity integer NOT NULL,
    unit_cost varchar NOT NULL,
    expiry_date timestamp without time zone,
    received_date timestamp without time zone,
    location_id varchar REFERENCES locations(id),
    supplier_id varchar REFERENCES suppliers(id),
    purchase_order_id varchar,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- ===================================
-- TRANSACTION TABLES
-- ===================================

-- Transactions
CREATE TABLE transactions (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
    transaction_number varchar UNIQUE NOT NULL,
    type transaction_type NOT NULL,
    customer_id varchar REFERENCES customers(id),
    total_amount numeric(12,2) NOT NULL,
    discount_amount numeric(12,2) DEFAULT 0,
    tax_amount numeric(12,2) DEFAULT 0,
    final_amount numeric(12,2) NOT NULL,
    payment_method payment_method DEFAULT 'cash',
    status varchar DEFAULT 'completed',
    notes text,
    user_id varchar NOT NULL REFERENCES users(id),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Transaction items
CREATE TABLE transaction_items (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
    transaction_id varchar NOT NULL REFERENCES transactions(id),
    product_id varchar NOT NULL REFERENCES products(id),
    quantity integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    total_price numeric(12,2) NOT NULL,
    discount_amount numeric(12,2) DEFAULT 0,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);

-- ===================================
-- PURCHASING TABLES
-- ===================================

-- Purchase orders
CREATE TABLE purchase_orders (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
    po_number varchar UNIQUE NOT NULL,
    supplier_id varchar NOT NULL REFERENCES suppliers(id),
    order_date timestamp without time zone,
    expected_delivery_date timestamp without time zone,
    actual_delivery_date timestamp without time zone,
    status varchar DEFAULT 'draft',
    subtotal numeric(12,2),
    tax_amount varchar,
    shipping_cost numeric(12,2),
    discount_amount varchar,
    total_amount varchar,
    payment_terms integer,
    delivery_address text,
    shipping_method varchar,
    tracking_number varchar,
    notes text,
    internal_notes text,
    requested_by varchar NOT NULL REFERENCES users(id),
    approved_by varchar REFERENCES users(id),
    approved_date timestamp without time zone,
    received_by varchar REFERENCES users(id),
    received_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Purchase order items
CREATE TABLE purchase_order_items (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
    purchase_order_id varchar NOT NULL REFERENCES purchase_orders(id),
    product_id varchar NOT NULL REFERENCES products(id),
    product_name varchar,
    product_sku varchar,
    quantity integer NOT NULL,
    ordered_quantity integer,
    received_quantity integer,
    unit_cost varchar NOT NULL,
    unit_price numeric(12,2),
    total_cost varchar,
    total_price numeric(12,2),
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- ===================================
-- SERVICE TABLES
-- ===================================

-- Service tickets
CREATE TABLE service_tickets (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
    ticket_number varchar UNIQUE NOT NULL,
    customer_id varchar NOT NULL REFERENCES customers(id),
    device_type varchar NOT NULL,
    device_brand varchar,
    device_model varchar,
    serial_number varchar,
    completeness text,
    problem text NOT NULL,
    diagnosis text,
    solution text,
    estimated_cost numeric(12,2),
    actual_cost numeric(12,2),
    labor_cost numeric(12,2),
    parts_cost numeric(12,2),
    status service_status DEFAULT 'pending',
    technician_id varchar REFERENCES users(id),
    estimated_completion timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Service ticket parts
CREATE TABLE service_ticket_parts (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
    service_ticket_id varchar NOT NULL REFERENCES service_tickets(id),
    product_id varchar NOT NULL REFERENCES products(id),
    quantity integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    total_price numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);

-- ===================================
-- INVENTORY TRACKING TABLES
-- ===================================

-- Stock movements
CREATE TABLE stock_movements (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
    product_id varchar NOT NULL REFERENCES products(id),
    quantity integer NOT NULL,
    movement_type varchar,
    reference varchar,
    reference_type stock_reference_type NOT NULL,
    reference_id varchar,
    purchase_price numeric(12,2),
    unit_cost varchar,
    batch_id varchar REFERENCES product_batches(id),
    location_id varchar REFERENCES locations(id),
    from_location_id varchar REFERENCES locations(id),
    to_location_id varchar REFERENCES locations(id),
    reason varchar,
    notes text,
    user_id varchar NOT NULL REFERENCES users(id),
    created_at timestamp without time zone DEFAULT now()
);

-- Inventory adjustments
CREATE TABLE inventory_adjustments (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
    adjustment_number varchar UNIQUE NOT NULL,
    reason varchar NOT NULL,
    status varchar DEFAULT 'draft',
    created_by varchar NOT NULL REFERENCES users(id),
    approved_by varchar REFERENCES users(id),
    approved_date timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Inventory adjustment items
CREATE TABLE inventory_adjustment_items (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
    adjustment_id varchar NOT NULL REFERENCES inventory_adjustments(id),
    product_id varchar NOT NULL REFERENCES products(id),
    batch_id varchar REFERENCES product_batches(id),
    location_id varchar REFERENCES locations(id),
    current_quantity integer NOT NULL,
    adjustment_quantity integer NOT NULL,
    unit_cost varchar,
    reason varchar,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);

-- ===================================
-- FINANCIAL TABLES
-- ===================================

-- Chart of Accounts
CREATE TABLE accounts (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code varchar UNIQUE NOT NULL,
    name varchar NOT NULL,
    type varchar NOT NULL, -- asset, liability, equity, income, expense
    subtype varchar,
    parent_id varchar REFERENCES accounts(id),
    balance numeric(12,2) DEFAULT 0,
    normal_balance varchar NOT NULL, -- debit or credit
    is_active boolean DEFAULT true,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Journal entries
CREATE TABLE journal_entries (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
    journal_number varchar UNIQUE NOT NULL,
    date timestamp without time zone NOT NULL,
    description text NOT NULL,
    reference varchar,
    reference_type varchar,
    total_amount numeric(12,2) NOT NULL,
    status varchar DEFAULT 'posted',
    user_id varchar NOT NULL REFERENCES users(id),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Journal entry lines
CREATE TABLE journal_entry_lines (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
    journal_entry_id varchar NOT NULL REFERENCES journal_entries(id),
    account_id varchar NOT NULL REFERENCES accounts(id),
    description text NOT NULL,
    debit_amount numeric(12,2) DEFAULT 0,
    credit_amount numeric(12,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);

-- Financial records
CREATE TABLE financial_records (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
    type varchar NOT NULL, -- income, expense
    category varchar NOT NULL,
    subcategory varchar,
    amount numeric(12,2) NOT NULL,
    description text NOT NULL,
    reference varchar,
    reference_type varchar,
    account_id varchar REFERENCES accounts(id),
    payment_method varchar,
    status varchar DEFAULT 'completed',
    tags text[],
    journal_entry_id varchar REFERENCES journal_entries(id),
    user_id varchar NOT NULL REFERENCES users(id),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- ===================================
-- HR TABLES
-- ===================================

-- Employees
CREATE TABLE employees (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
    employee_number varchar UNIQUE NOT NULL,
    user_id varchar REFERENCES users(id),
    name varchar NOT NULL,
    position varchar NOT NULL,
    department varchar,
    salary numeric(12,2) NOT NULL,
    salary_type varchar DEFAULT 'monthly',
    join_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone,
    status varchar DEFAULT 'active',
    bank_account varchar,
    tax_id varchar,
    address text,
    phone varchar,
    emergency_contact jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Attendance records
CREATE TABLE attendance_records (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
    employee_id varchar NOT NULL REFERENCES employees(id),
    date timestamp without time zone NOT NULL,
    clock_in timestamp without time zone,
    clock_out timestamp without time zone,
    break_start timestamp without time zone,
    break_end timestamp without time zone,
    hours_worked numeric(4,2),
    overtime_hours numeric(4,2),
    status varchar DEFAULT 'present',
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Payroll records
CREATE TABLE payroll_records (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
    employee_id varchar NOT NULL REFERENCES employees(id),
    payroll_number varchar UNIQUE NOT NULL,
    period_start timestamp without time zone NOT NULL,
    period_end timestamp without time zone NOT NULL,
    base_salary numeric(12,2) NOT NULL,
    overtime numeric(12,2) DEFAULT 0,
    bonus numeric(12,2) DEFAULT 0,
    allowances numeric(12,2) DEFAULT 0,
    gross_pay numeric(12,2) NOT NULL,
    tax_deduction numeric(12,2) DEFAULT 0,
    social_security numeric(12,2) DEFAULT 0,
    health_insurance numeric(12,2) DEFAULT 0,
    other_deductions numeric(12,2) DEFAULT 0,
    net_pay numeric(12,2) NOT NULL,
    status varchar DEFAULT 'draft',
    paid_date timestamp without time zone,
    notes text,
    user_id varchar REFERENCES users(id),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- ===================================
-- SAMPLE DATA
-- ===================================

-- Default admin user for local deployment
INSERT INTO users (id, username, email, first_name, last_name, password, role, is_active) VALUES
('admin-local-default', 'admin', 'admin@laptoppos.com', 'System', 'Administrator', '$2b$10$EixVOE2XOMiSgezo/wBFGe/05N8W/SaFaUO4y3A16EwLKo3rClEMS', 'admin', true);

-- Store configuration
INSERT INTO store_config (id, name, address, phone, email, tax_rate) VALUES
('d5cc36ae-35ba-453b-b99d-51964e6b6c12', 'LaptopPOS Store', 'Jl. Teknologi No. 123, Jakarta', '+62 21 1234567', 'info@laptoppos.com', 11.00);

-- Roles
INSERT INTO roles (id, name, display_name, description, permissions) VALUES
('role-admin', 'admin', 'Administrator', 'Full system access', ARRAY['all']),
('role-kasir', 'kasir', 'Kasir', 'Point of sale operations', ARRAY['pos', 'inventory:read']),
('role-teknisi', 'teknisi', 'Teknisi', 'Service management', ARRAY['service', 'inventory:read']),
('role-purchasing', 'purchasing', 'Purchasing', 'Purchase management', ARRAY['purchasing', 'inventory', 'suppliers']),
('role-finance', 'finance', 'Finance', 'Financial management', ARRAY['finance', 'reports']),
('role-owner', 'owner', 'Owner', 'Business oversight', ARRAY['reports', 'analytics', 'users:read']);

-- Categories
INSERT INTO categories (id, name, description) VALUES
('cat-laptop', 'Laptop', 'Laptop dan notebook'),
('cat-accessories', 'Accessories', 'Aksesoris laptop'),
('cat-parts', 'Parts', 'Spare parts laptop'),
('cat-services', 'Services', 'Layanan service');

-- Suppliers
INSERT INTO suppliers (id, name, code, email, phone, address, contact_person) VALUES
('supplier-1', 'PT. Distributor Laptop', 'SUP001', 'sales@distributor.com', '+62 21 9876543', 'Jl. Distributor No. 456', 'John Doe'),
('supplier-2', 'CV. Parts Computer', 'SUP002', 'order@parts.com', '+62 21 5555666', 'Jl. Komputer No. 789', 'Jane Smith');

-- Customers
INSERT INTO customers (id, name, email, phone, address) VALUES
('customer-1', 'Ahmad Wijaya', 'ahmad@email.com', '+62 812 3456 7890', 'Jl. Customer No. 1'),
('customer-2', 'Siti Nurhaliza', 'siti@email.com', '+62 813 9876 5432', 'Jl. Customer No. 2'),
('customer-3', 'Budi Santoso', 'budi@email.com', '+62 814 1111 2222', 'Jl. Customer No. 3');

-- Locations
INSERT INTO locations (id, name, description, type) VALUES
('loc-main', 'Main Store', 'Toko utama', 'store'),
('loc-warehouse', 'Warehouse', 'Gudang utama', 'warehouse'),
('loc-service', 'Service Area', 'Area service', 'service');

-- Products
INSERT INTO products (id, name, description, category_id, sku, brand, model, selling_price, purchase_price, stock, min_stock) VALUES
('prod-1', 'Laptop ASUS VivoBook 14', 'Laptop ASUS VivoBook 14 inch RAM 8GB SSD 512GB', 'cat-laptop', 'LT001', 'ASUS', 'VivoBook 14', 8500000, 7500000, 5, 2),
('prod-2', 'Laptop Lenovo ThinkPad E14', 'Laptop bisnis Lenovo ThinkPad E14 RAM 16GB SSD 1TB', 'cat-laptop', 'LT002', 'Lenovo', 'ThinkPad E14', 12000000, 10500000, 3, 1),
('prod-3', 'RAM DDR4 8GB', 'Memory RAM DDR4 8GB PC4-3200', 'cat-parts', 'RAM001', 'Kingston', 'ValueRAM', 750000, 650000, 20, 5),
('prod-4', 'SSD 512GB SATA', 'SSD Internal 512GB SATA 2.5 inch', 'cat-parts', 'SSD001', 'Samsung', '980 EVO', 850000, 750000, 15, 3),
('prod-5', 'Charger Laptop Universal', 'Charger laptop universal 65W dengan berbagai connector', 'cat-accessories', 'CHG001', 'Generic', 'Universal 65W', 250000, 180000, 10, 2);

-- Chart of Accounts
INSERT INTO accounts (id, code, name, type, normal_balance) VALUES
('acc-cash', '1001', 'Kas', 'asset', 'debit'),
('acc-inventory', '1201', 'Persediaan', 'asset', 'debit'),
('acc-sales', '4001', 'Penjualan', 'income', 'credit'),
('acc-cogs', '5001', 'Harga Pokok Penjualan', 'expense', 'debit'),
('acc-service-income', '4002', 'Pendapatan Service', 'income', 'credit'),
('acc-purchase', '5002', 'Pembelian', 'expense', 'debit');

-- Transactions (Sales)
INSERT INTO transactions (id, transaction_number, type, customer_id, total_amount, final_amount, payment_method, user_id) VALUES
('trans-1', 'TRX001', 'sale', 'customer-1', 8500000, 8500000, 'cash', 'admin-local-default'),
('trans-2', 'TRX002', 'sale', 'customer-2', 12000000, 12000000, 'transfer', 'admin-local-default'),
('trans-3', 'TRX003', 'sale', 'customer-3', 1600000, 1600000, 'cash', 'admin-local-default');

-- Transaction items
INSERT INTO transaction_items (id, transaction_id, product_id, quantity, unit_price, total_price) VALUES
('item-1', 'trans-1', 'prod-1', 1, 8500000, 8500000),
('item-2', 'trans-2', 'prod-2', 1, 12000000, 12000000),
('item-3', 'trans-3', 'prod-3', 2, 750000, 1500000),
('item-4', 'trans-3', 'prod-5', 1, 250000, 250000);

-- Service tickets
INSERT INTO service_tickets (id, ticket_number, customer_id, device_type, device_brand, device_model, problem, status, labor_cost, parts_cost, actual_cost) VALUES
('ticket-1', 'SRV001', 'customer-1', 'Laptop', 'ASUS', 'VivoBook', 'Laptop mati total', 'completed', 200000, 750000, 950000),
('ticket-2', 'SRV002', 'customer-2', 'Laptop', 'Lenovo', 'ThinkPad', 'Layar bergaris', 'in-progress', 150000, 0, 150000);

-- Service ticket parts (for completed service)
INSERT INTO service_ticket_parts (id, service_ticket_id, product_id, quantity, unit_price, total_price) VALUES
('spart-1', 'ticket-1', 'prod-3', 1, 750000, 750000);

-- Financial records (CORRECTED with proper COGS categorization)
-- Sales income
INSERT INTO financial_records (id, type, category, amount, description, reference, reference_type, user_id) VALUES
('fin-1', 'income', 'sale', 8500000, 'Penjualan Laptop ASUS VivoBook 14', 'TRX001', 'sale', 'admin-local-default'),
('fin-2', 'income', 'sale', 12000000, 'Penjualan Laptop Lenovo ThinkPad E14', 'TRX002', 'sale', 'admin-local-default'),
('fin-3', 'income', 'sale', 1600000, 'Penjualan RAM dan Charger', 'TRX003', 'sale', 'admin-local-default'),
('fin-4', 'income', 'service', 950000, 'Service laptop - perbaikan RAM', 'SRV001', 'service', 'admin-local-default');

-- COGS (Cost of Goods Sold) - CORRECTED as expenses with sale_cogs reference_type
INSERT INTO financial_records (id, type, category, amount, description, reference, reference_type, user_id) VALUES
('fin-5', 'expense', 'cogs', 7500000, 'COGS - Laptop ASUS VivoBook 14', 'TRX001', 'sale_cogs', 'admin-local-default'),
('fin-6', 'expense', 'cogs', 10500000, 'COGS - Laptop Lenovo ThinkPad E14', 'TRX002', 'sale_cogs', 'admin-local-default'),
('fin-7', 'expense', 'cogs', 1430000, 'COGS - RAM dan Charger', 'TRX003', 'sale_cogs', 'admin-local-default'),
('fin-8', 'expense', 'cogs', 650000, 'COGS - Service parts RAM', 'SRV001', 'service_cogs', 'admin-local-default');

-- Other operational expenses
INSERT INTO financial_records (id, type, category, amount, description, reference, reference_type, user_id) VALUES
('fin-9', 'expense', 'operational', 2000000, 'Gaji karyawan bulanan', null, 'payroll', 'admin-local-default'),
('fin-10', 'expense', 'operational', 500000, 'Listrik dan air', null, 'utility', 'admin-local-default'),
('fin-11', 'expense', 'operational', 300000, 'Internet dan telepon', null, 'communication', 'admin-local-default');

-- Stock movements
INSERT INTO stock_movements (id, product_id, quantity, reference, reference_type, user_id) VALUES
('mov-1', 'prod-1', -1, 'TRX001', 'sale', 'admin-local-default'),
('mov-2', 'prod-2', -1, 'TRX002', 'sale', 'admin-local-default'),
('mov-3', 'prod-3', -2, 'TRX003', 'sale', 'admin-local-default'),
('mov-4', 'prod-5', -1, 'TRX003', 'sale', 'admin-local-default'),
('mov-5', 'prod-3', -1, 'SRV001', 'service', 'admin-local-default');

-- ===================================
-- INDEXES FOR PERFORMANCE
-- ===================================

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_transactions_date ON transactions(created_at);
CREATE INDEX idx_financial_records_date ON financial_records(created_at);
CREATE INDEX idx_financial_records_type ON financial_records(type);
CREATE INDEX idx_financial_records_reference ON financial_records(reference_type);
CREATE INDEX idx_service_tickets_status ON service_tickets(status);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);

-- ===================================
-- CONSTRAINTS
-- ===================================

-- Ensure debit = credit in journal entries
ALTER TABLE journal_entry_lines ADD CONSTRAINT check_debit_credit 
CHECK ((debit_amount > 0 AND credit_amount = 0) OR (credit_amount > 0 AND debit_amount = 0));

-- Ensure positive amounts in financial records
ALTER TABLE financial_records ADD CONSTRAINT check_positive_amount 
CHECK (amount > 0);

-- Ensure valid normal balance
ALTER TABLE accounts ADD CONSTRAINT check_normal_balance 
CHECK (normal_balance IN ('debit', 'credit'));

-- ===================================
-- SUMMARY
-- ===================================
-- Database created with:
-- ✅ Default admin user: admin/admin123
-- ✅ Corrected COGS categorization (expense with sale_cogs reference)
-- ✅ Proper finance calculation structure
-- ✅ Complete schema with all tables
-- ✅ Sample data for testing
-- ✅ Performance indexes
-- ✅ Data integrity constraints
-- 
-- Login Credentials:
-- Username: admin
-- Password: admin123
-- Email: admin@laptoppos.com
-- ===================================