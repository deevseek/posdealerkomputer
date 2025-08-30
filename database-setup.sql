-- LaptopPOS Database Setup
-- Complete database schema and initial data for local development

-- Create custom types
CREATE TYPE public.payment_method AS ENUM (
    'cash',
    'transfer',
    'qris',
    'installment'
);

CREATE TYPE public.service_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'delivered',
    'cancelled'
);

CREATE TYPE public.stock_movement_type AS ENUM (
    'in',
    'out',
    'adjustment'
);

CREATE TYPE public.stock_reference_type AS ENUM (
    'sale',
    'service',
    'purchase',
    'adjustment',
    'return'
);

CREATE TYPE public.transaction_type AS ENUM (
    'sale',
    'service',
    'purchase',
    'return'
);

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'kasir',
    'teknisi',
    'purchasing',
    'finance',
    'owner'
);

-- Create tables

-- Sessions table (for authentication)
CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);

-- Users table
CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    username character varying,
    password character varying,
    email character varying,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    role public.user_role DEFAULT 'kasir'::public.user_role,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Roles table
CREATE TABLE public.roles (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    display_name character varying NOT NULL,
    description text,
    permissions text[],
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Store configuration
CREATE TABLE public.store_config (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    address text,
    phone character varying,
    email character varying,
    tax_rate numeric(5,2) DEFAULT 11.00,
    default_discount numeric(5,2) DEFAULT 0.00,
    logo character varying,
    whatsapp_enabled boolean DEFAULT false,
    whatsapp_session_data text,
    whatsapp_qr text,
    whatsapp_connected boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Categories table
CREATE TABLE public.categories (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now()
);

-- Products table
CREATE TABLE public.products (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    description text,
    category_id character varying,
    sku character varying,
    barcode character varying,
    purchase_price numeric(12,2),
    selling_price numeric(12,2),
    stock integer DEFAULT 0,
    min_stock integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Customers table
CREATE TABLE public.customers (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    email character varying,
    phone character varying,
    address text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Suppliers table
CREATE TABLE public.suppliers (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    email character varying,
    phone character varying,
    address text,
    contact_person character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Transactions table
CREATE TABLE public.transactions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    transaction_number character varying NOT NULL,
    type public.transaction_type NOT NULL,
    customer_id character varying,
    supplier_id character varying,
    user_id character varying NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    tax_amount numeric(12,2) DEFAULT 0.00,
    discount_amount numeric(12,2) DEFAULT 0.00,
    total numeric(12,2) NOT NULL,
    payment_method public.payment_method,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);

-- Transaction items table
CREATE TABLE public.transaction_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    transaction_id character varying NOT NULL,
    product_id character varying NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    total_price numeric(12,2) NOT NULL
);

-- Service tickets table
CREATE TABLE public.service_tickets (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    ticket_number character varying NOT NULL,
    customer_id character varying NOT NULL,
    device_type character varying NOT NULL,
    device_brand character varying,
    device_model character varying,
    problem text NOT NULL,
    diagnosis text,
    solution text,
    estimated_cost numeric(12,2),
    actual_cost numeric(12,2),
    labor_cost numeric(12,2),
    parts_cost numeric(12,2),
    status public.service_status DEFAULT 'pending'::public.service_status,
    technician_id character varying,
    estimated_completion timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Service ticket parts table
CREATE TABLE public.service_ticket_parts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    service_ticket_id character varying NOT NULL,
    product_id character varying NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    total_price numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);

-- Stock movements table
CREATE TABLE public.stock_movements (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    product_id character varying NOT NULL,
    type public.stock_movement_type NOT NULL,
    quantity integer NOT NULL,
    reference character varying,
    reference_type public.stock_reference_type NOT NULL,
    notes text,
    user_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);

-- Financial records table
CREATE TABLE public.financial_records (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    type character varying(20) NOT NULL,
    category character varying(100) NOT NULL,
    subcategory character varying(100),
    amount numeric(15,2) NOT NULL,
    description text NOT NULL,
    reference character varying,
    reference_type character varying(50),
    account_id character varying,
    payment_method character varying(50),
    status character varying(20) DEFAULT 'confirmed'::character varying,
    tags text[],
    user_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Chart of accounts table
CREATE TABLE public.accounts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(30) NOT NULL,
    subtype character varying(50),
    parent_id character varying,
    balance numeric(15,2) DEFAULT '0'::numeric,
    is_active boolean DEFAULT true,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Employees table
CREATE TABLE public.employees (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    employee_number character varying(50) NOT NULL,
    user_id character varying,
    name character varying(100) NOT NULL,
    position character varying(100) NOT NULL,
    department character varying(100),
    salary numeric(12,2) NOT NULL,
    salary_type character varying(20) DEFAULT 'monthly'::character varying,
    join_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone,
    status character varying(20) DEFAULT 'active'::character varying,
    bank_account character varying(50),
    tax_id character varying(50),
    address text,
    phone character varying(20),
    emergency_contact jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Payroll records table
CREATE TABLE public.payroll_records (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    employee_id character varying NOT NULL,
    payroll_number character varying(50) NOT NULL,
    period_start timestamp without time zone NOT NULL,
    period_end timestamp without time zone NOT NULL,
    base_salary numeric(12,2) NOT NULL,
    overtime numeric(12,2) DEFAULT '0'::numeric,
    bonus numeric(12,2) DEFAULT '0'::numeric,
    allowances numeric(12,2) DEFAULT '0'::numeric,
    gross_pay numeric(12,2) NOT NULL,
    tax_deduction numeric(12,2) DEFAULT '0'::numeric,
    social_security numeric(12,2) DEFAULT '0'::numeric,
    health_insurance numeric(12,2) DEFAULT '0'::numeric,
    other_deductions numeric(12,2) DEFAULT '0'::numeric,
    net_pay numeric(12,2) NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying,
    paid_date timestamp without time zone,
    notes text,
    user_id character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Attendance records table
CREATE TABLE public.attendance_records (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    employee_id character varying NOT NULL,
    date timestamp without time zone NOT NULL,
    clock_in timestamp without time zone,
    clock_out timestamp without time zone,
    break_start timestamp without time zone,
    break_end timestamp without time zone,
    hours_worked numeric(4,2) DEFAULT '0'::numeric,
    overtime_hours numeric(4,2) DEFAULT '0'::numeric,
    status character varying(20) DEFAULT 'present'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Add primary keys
ALTER TABLE ONLY public.sessions ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.roles ADD CONSTRAINT roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.store_config ADD CONSTRAINT store_config_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.categories ADD CONSTRAINT categories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.customers ADD CONSTRAINT customers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.suppliers ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.transactions ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.transaction_items ADD CONSTRAINT transaction_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.service_tickets ADD CONSTRAINT service_tickets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.service_ticket_parts ADD CONSTRAINT service_ticket_parts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.stock_movements ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.financial_records ADD CONSTRAINT financial_records_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.accounts ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.employees ADD CONSTRAINT employees_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.payroll_records ADD CONSTRAINT payroll_records_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.attendance_records ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);

-- Add unique constraints
ALTER TABLE ONLY public.users ADD CONSTRAINT users_email_unique UNIQUE (email);
ALTER TABLE ONLY public.roles ADD CONSTRAINT roles_name_unique UNIQUE (name);
ALTER TABLE ONLY public.products ADD CONSTRAINT products_sku_unique UNIQUE (sku);
ALTER TABLE ONLY public.transactions ADD CONSTRAINT transactions_transaction_number_unique UNIQUE (transaction_number);
ALTER TABLE ONLY public.service_tickets ADD CONSTRAINT service_tickets_ticket_number_unique UNIQUE (ticket_number);
ALTER TABLE ONLY public.accounts ADD CONSTRAINT accounts_code_unique UNIQUE (code);
ALTER TABLE ONLY public.employees ADD CONSTRAINT employees_employee_number_unique UNIQUE (employee_number);
ALTER TABLE ONLY public.payroll_records ADD CONSTRAINT payroll_records_payroll_number_unique UNIQUE (payroll_number);

-- Add foreign key constraints
ALTER TABLE ONLY public.products ADD CONSTRAINT products_category_id_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.categories(id);
ALTER TABLE ONLY public.transactions ADD CONSTRAINT transactions_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id);
ALTER TABLE ONLY public.transactions ADD CONSTRAINT transactions_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);
ALTER TABLE ONLY public.transactions ADD CONSTRAINT transactions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.transaction_items ADD CONSTRAINT transaction_items_transaction_id_transactions_id_fk FOREIGN KEY (transaction_id) REFERENCES public.transactions(id);
ALTER TABLE ONLY public.transaction_items ADD CONSTRAINT transaction_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);
ALTER TABLE ONLY public.service_tickets ADD CONSTRAINT service_tickets_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id);
ALTER TABLE ONLY public.service_tickets ADD CONSTRAINT service_tickets_technician_id_users_id_fk FOREIGN KEY (technician_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.service_ticket_parts ADD CONSTRAINT service_ticket_parts_service_ticket_id_service_tickets_id_fk FOREIGN KEY (service_ticket_id) REFERENCES public.service_tickets(id);
ALTER TABLE ONLY public.service_ticket_parts ADD CONSTRAINT service_ticket_parts_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);
ALTER TABLE ONLY public.stock_movements ADD CONSTRAINT stock_movements_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);
ALTER TABLE ONLY public.stock_movements ADD CONSTRAINT stock_movements_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.financial_records ADD CONSTRAINT financial_records_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id);
ALTER TABLE ONLY public.financial_records ADD CONSTRAINT financial_records_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.accounts ADD CONSTRAINT accounts_parent_id_accounts_id_fk FOREIGN KEY (parent_id) REFERENCES public.accounts(id);
ALTER TABLE ONLY public.employees ADD CONSTRAINT employees_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.payroll_records ADD CONSTRAINT payroll_records_employee_id_employees_id_fk FOREIGN KEY (employee_id) REFERENCES public.employees(id);
ALTER TABLE ONLY public.payroll_records ADD CONSTRAINT payroll_records_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.attendance_records ADD CONSTRAINT attendance_records_employee_id_employees_id_fk FOREIGN KEY (employee_id) REFERENCES public.employees(id);

-- Add indexes
CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);

-- Insert initial roles
INSERT INTO roles (name, display_name, description, permissions, is_active) VALUES
('admin', 'Administrator', 'Full system access and configuration', ARRAY['all'], true),
('kasir', 'Kasir/Cashier', 'Point of sale operations and customer transactions', ARRAY['pos', 'customers', 'view_inventory'], true),
('teknisi', 'Teknisi/Technician', 'Service ticket management and repairs', ARRAY['service_tickets', 'view_inventory', 'stock_movements'], true),
('purchasing', 'Purchasing', 'Inventory management and supplier relations', ARRAY['inventory', 'suppliers', 'purchasing', 'stock_movements'], true),
('finance', 'Finance', 'Financial records and reporting', ARRAY['financial', 'reports', 'payroll'], true),
('owner', 'Owner', 'Business overview and management', ARRAY['all', 'reports', 'settings'], true);

-- Insert initial users (password: 'password123' for all users)
-- Password hash: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjLQvyDROTJt0wJQMZtjXDPd/C9k6DG
INSERT INTO users (username, password, email, first_name, last_name, role, is_active) VALUES
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjLQvyDROTJt0wJQMZtjXDPd/C9k6DG', 'admin@laptoppos.com', 'Admin', 'System', 'admin', true),
('kasir1', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjLQvyDROTJt0wJQMZtjXDPd/C9k6DG', 'kasir@laptoppos.com', 'Kasir', 'Utama', 'kasir', true),
('teknisi1', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjLQvyDROTJt0wJQMZtjXDPd/C9k6DG', 'teknisi@laptoppos.com', 'Teknisi', 'Service', 'teknisi', true),
('purchasing1', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjLQvyDROTJt0wJQMZtjXDPd/C9k6DG', 'purchasing@laptoppos.com', 'Staff', 'Purchasing', 'purchasing', true),
('finance1', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjLQvyDROTJt0wJQMZtjXDPd/C9k6DG', 'finance@laptoppos.com', 'Staff', 'Finance', 'finance', true),
('owner', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjLQvyDROTJt0wJQMZtjXDPd/C9k6DG', 'owner@laptoppos.com', 'Owner', 'Bisnis', 'owner', true);

-- Insert basic store configuration
INSERT INTO store_config (name, address, phone, email, tax_rate, default_discount, whatsapp_enabled, whatsapp_connected) VALUES
('LaptopPOS Store', 'Jl. Teknologi No. 123, Jakarta', '+62812345678', 'info@laptoppos.com', 11.00, 0.00, false, false);

-- Insert sample categories
INSERT INTO categories (name, description) VALUES
('Laptop', 'Laptop dan notebook'),
('Aksesoris', 'Aksesoris laptop dan komputer'),
('Sparepart', 'Suku cadang dan komponen laptop'),
('Software', 'Software dan lisensi'),
('Service', 'Layanan service dan perbaikan');

-- Sample customers
INSERT INTO customers (name, email, phone, address) VALUES
('John Doe', 'john@example.com', '+6281234567890', 'Jl. Sudirman No. 45, Jakarta'),
('Jane Smith', 'jane@example.com', '+6281234567891', 'Jl. Gatot Subroto No. 123, Jakarta'),
('PT. Teknologi Maju', 'info@tekmaju.com', '+6281234567892', 'Jl. HR Rasuna Said No. 78, Jakarta');

-- Sample suppliers
INSERT INTO suppliers (name, email, phone, address, contact_person) VALUES
('CV. Distributor Laptop', 'sales@distributorlaptop.com', '+6281234567893', 'Jl. Mangga Dua, Jakarta', 'Budi Santoso'),
('PT. Aksesoris Komputer', 'order@akseskomp.com', '+6281234567894', 'Jl. Glodok, Jakarta', 'Sari Dewi'),
('Toko Sparepart Laptop', 'info@sparepartlaptop.com', '+6281234567895', 'Jl. ITC Cempaka Mas, Jakarta', 'Ahmad Rahman');