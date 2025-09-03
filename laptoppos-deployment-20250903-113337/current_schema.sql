--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (84ade85)
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_method AS ENUM (
    'cash',
    'transfer',
    'qris',
    'installment'
);


--
-- Name: service_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.service_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'delivered',
    'cancelled',
    'checking',
    'in-progress',
    'waiting-technician',
    'testing',
    'waiting-confirmation',
    'waiting-parts'
);


--
-- Name: stock_movement_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stock_movement_type AS ENUM (
    'in',
    'out',
    'adjustment'
);


--
-- Name: stock_reference_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stock_reference_type AS ENUM (
    'sale',
    'service',
    'purchase',
    'adjustment',
    'return'
);


--
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transaction_type AS ENUM (
    'sale',
    'service',
    'purchase',
    'return'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'kasir',
    'teknisi',
    'purchasing',
    'finance',
    'owner'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: -
--

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
    updated_at timestamp without time zone DEFAULT now(),
    normal_balance character varying(10) NOT NULL
);


--
-- Name: attendance_records; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    email character varying,
    phone character varying,
    address text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    employee_number character varying(50) NOT NULL,
    user_id character varying,
    name character varying(100) NOT NULL,
    "position" character varying(100) NOT NULL,
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


--
-- Name: financial_records; Type: TABLE; Schema: public; Owner: -
--

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
    updated_at timestamp without time zone DEFAULT now(),
    journal_entry_id character varying
);


--
-- Name: inventory_adjustment_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_adjustment_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    adjustment_id character varying NOT NULL,
    product_id character varying NOT NULL,
    batch_id character varying,
    location_id character varying,
    current_quantity integer NOT NULL,
    adjustment_quantity integer NOT NULL,
    unit_cost character varying,
    reason character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: inventory_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_adjustments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    adjustment_number character varying NOT NULL,
    reason character varying NOT NULL,
    status character varying DEFAULT 'pending'::character varying,
    created_by character varying NOT NULL,
    approved_by character varying,
    approved_date timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: journal_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_entries (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    journal_number character varying(50) NOT NULL,
    date timestamp without time zone NOT NULL,
    description text NOT NULL,
    reference character varying,
    reference_type character varying(50),
    total_amount numeric(15,2) NOT NULL,
    status character varying(20) DEFAULT 'posted'::character varying,
    user_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: journal_entry_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_entry_lines (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    journal_entry_id character varying NOT NULL,
    account_id character varying NOT NULL,
    description text NOT NULL,
    debit_amount numeric(15,2) DEFAULT 0,
    credit_amount numeric(15,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locations (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    description text,
    type character varying DEFAULT 'warehouse'::character varying,
    address text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: payroll_records; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: product_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_batches (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    product_id character varying NOT NULL,
    batch_number character varying NOT NULL,
    quantity integer NOT NULL,
    unit_cost character varying NOT NULL,
    expiry_date timestamp without time zone,
    received_date timestamp without time zone DEFAULT now(),
    location_id character varying,
    supplier_id character varying,
    purchase_order_id character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

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
    updated_at timestamp without time zone DEFAULT now(),
    brand character varying,
    model character varying,
    serial_number character varying,
    total_stock integer DEFAULT 0,
    available_stock integer DEFAULT 0,
    reserved_stock integer DEFAULT 0,
    max_stock integer DEFAULT 0,
    reorder_point integer DEFAULT 0,
    track_serial boolean DEFAULT false,
    track_batch boolean DEFAULT false,
    unit character varying DEFAULT 'pcs'::character varying,
    last_purchase_price numeric(12,2),
    average_cost numeric(12,2),
    margin_percent numeric(5,2),
    track_batches boolean DEFAULT false,
    track_expiry boolean DEFAULT false,
    is_discontinued boolean DEFAULT false,
    weight numeric(8,3),
    dimensions character varying,
    supplier_product_code character varying,
    specifications text,
    reorder_quantity integer,
    notes text
);


--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_order_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id character varying NOT NULL,
    product_id character varying NOT NULL,
    quantity integer NOT NULL,
    unit_cost character varying NOT NULL,
    total_cost character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    ordered_quantity integer,
    received_quantity integer DEFAULT 0,
    product_name character varying,
    product_sku character varying,
    unit_price numeric(12,2),
    total_price numeric(12,2)
);


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_orders (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    po_number character varying NOT NULL,
    supplier_id character varying NOT NULL,
    order_date timestamp without time zone DEFAULT now(),
    expected_delivery_date timestamp without time zone,
    status character varying DEFAULT 'draft'::character varying,
    tax_amount character varying DEFAULT '0'::character varying,
    discount_amount character varying DEFAULT '0'::character varying,
    total_amount character varying DEFAULT '0'::character varying,
    notes text,
    requested_by character varying NOT NULL,
    approved_by character varying,
    approved_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    actual_delivery_date timestamp without time zone,
    received_by character varying,
    received_date timestamp without time zone,
    subtotal numeric(12,2) DEFAULT 0,
    shipping_cost numeric(15,2) DEFAULT 0,
    delivery_address text,
    shipping_method character varying,
    tracking_number character varying,
    payment_terms integer DEFAULT 30,
    internal_notes text
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: service_ticket_parts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_ticket_parts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    service_ticket_id character varying NOT NULL,
    product_id character varying NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    total_price numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: service_tickets; Type: TABLE; Schema: public; Owner: -
--

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
    updated_at timestamp without time zone DEFAULT now(),
    serial_number character varying,
    completeness text
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_movements (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    product_id character varying NOT NULL,
    quantity integer NOT NULL,
    reference character varying,
    reference_type public.stock_reference_type NOT NULL,
    notes text,
    user_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    purchase_price numeric(12,2),
    batch_id character varying,
    location_id character varying,
    movement_type character varying,
    unit_cost character varying,
    reference_id character varying,
    from_location_id character varying,
    to_location_id character varying,
    reason character varying
);


--
-- Name: store_config; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    email character varying,
    phone character varying,
    address text,
    contact_person character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    code character varying,
    contact_title character varying,
    primary_email character varying,
    secondary_email character varying,
    primary_phone character varying,
    secondary_phone character varying,
    website character varying,
    tax_id character varying,
    bank_name character varying,
    bank_account character varying,
    payment_terms character varying,
    notes text,
    is_active boolean DEFAULT true,
    company_name character varying,
    alt_phone character varying,
    city character varying,
    province character varying,
    postal_code character varying,
    country character varying DEFAULT 'Indonesia'::character varying,
    contact_email character varying,
    contact_phone character varying,
    tax_number character varying,
    business_license character varying,
    credit_limit numeric(15,2),
    rating integer DEFAULT 5,
    bank_account_name character varying
);


--
-- Name: transaction_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transaction_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    transaction_id character varying NOT NULL,
    product_id character varying NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    total_price numeric(12,2) NOT NULL
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: accounts accounts_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_code_unique UNIQUE (code);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: attendance_records attendance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: employees employees_employee_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_employee_number_unique UNIQUE (employee_number);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: financial_records financial_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_records
    ADD CONSTRAINT financial_records_pkey PRIMARY KEY (id);


--
-- Name: inventory_adjustment_items inventory_adjustment_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_adjustment_items
    ADD CONSTRAINT inventory_adjustment_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_adjustments inventory_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_adjustments
    ADD CONSTRAINT inventory_adjustments_pkey PRIMARY KEY (id);


--
-- Name: journal_entries journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_pkey PRIMARY KEY (id);


--
-- Name: journal_entry_lines journal_entry_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry_lines
    ADD CONSTRAINT journal_entry_lines_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: payroll_records payroll_records_payroll_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_records
    ADD CONSTRAINT payroll_records_payroll_number_unique UNIQUE (payroll_number);


--
-- Name: payroll_records payroll_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_records
    ADD CONSTRAINT payroll_records_pkey PRIMARY KEY (id);


--
-- Name: product_batches product_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_batches
    ADD CONSTRAINT product_batches_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_sku_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_unique UNIQUE (sku);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_unique UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: service_ticket_parts service_ticket_parts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_ticket_parts
    ADD CONSTRAINT service_ticket_parts_pkey PRIMARY KEY (id);


--
-- Name: service_tickets service_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_tickets
    ADD CONSTRAINT service_tickets_pkey PRIMARY KEY (id);


--
-- Name: service_tickets service_tickets_ticket_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_tickets
    ADD CONSTRAINT service_tickets_ticket_number_unique UNIQUE (ticket_number);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: store_config store_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_config
    ADD CONSTRAINT store_config_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: transaction_items transaction_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transaction_items
    ADD CONSTRAINT transaction_items_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_transaction_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_transaction_number_unique UNIQUE (transaction_number);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: accounts accounts_parent_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_parent_id_accounts_id_fk FOREIGN KEY (parent_id) REFERENCES public.accounts(id);


--
-- Name: attendance_records attendance_records_employee_id_employees_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_employee_id_employees_id_fk FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: employees employees_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: financial_records financial_records_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_records
    ADD CONSTRAINT financial_records_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: financial_records financial_records_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_records
    ADD CONSTRAINT financial_records_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: payroll_records payroll_records_employee_id_employees_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_records
    ADD CONSTRAINT payroll_records_employee_id_employees_id_fk FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: payroll_records payroll_records_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_records
    ADD CONSTRAINT payroll_records_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: products products_category_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: service_ticket_parts service_ticket_parts_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_ticket_parts
    ADD CONSTRAINT service_ticket_parts_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: service_ticket_parts service_ticket_parts_service_ticket_id_service_tickets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_ticket_parts
    ADD CONSTRAINT service_ticket_parts_service_ticket_id_service_tickets_id_fk FOREIGN KEY (service_ticket_id) REFERENCES public.service_tickets(id);


--
-- Name: service_tickets service_tickets_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_tickets
    ADD CONSTRAINT service_tickets_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: service_tickets service_tickets_technician_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_tickets
    ADD CONSTRAINT service_tickets_technician_id_users_id_fk FOREIGN KEY (technician_id) REFERENCES public.users(id);


--
-- Name: stock_movements stock_movements_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: stock_movements stock_movements_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: transaction_items transaction_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transaction_items
    ADD CONSTRAINT transaction_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: transaction_items transaction_items_transaction_id_transactions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transaction_items
    ADD CONSTRAINT transaction_items_transaction_id_transactions_id_fk FOREIGN KEY (transaction_id) REFERENCES public.transactions(id);


--
-- Name: transactions transactions_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: transactions transactions_supplier_id_suppliers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: transactions transactions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

