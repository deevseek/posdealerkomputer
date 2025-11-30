-- Add total_price column and enforce tax defaults for transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS total_price numeric(12, 2) NOT NULL DEFAULT 0;

UPDATE transactions
SET tax_amount = COALESCE(tax_amount, 0);

ALTER TABLE transactions
  ALTER COLUMN tax_amount SET DEFAULT 0,
  ALTER COLUMN tax_amount SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;

UPDATE transactions
SET total_price = COALESCE(total_price, subtotal + tax_amount, total, 0);

-- Ensure transaction item totals are present
ALTER TABLE transaction_items
  ALTER COLUMN total_price SET DEFAULT 0,
  ALTER COLUMN total_price SET NOT NULL;

-- Add client scoping to finance tables when missing
ALTER TABLE financial_records ADD COLUMN IF NOT EXISTS client_id varchar;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS client_id varchar;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS client_id varchar;

-- Backfill finance records from their sources
UPDATE financial_records fr
SET client_id = t.client_id
FROM transactions t
WHERE fr.reference = t.id AND fr.client_id IS NULL;

UPDATE financial_records fr
SET client_id = st.client_id
FROM service_tickets st
WHERE fr.reference = st.id AND fr.client_id IS NULL;

-- Propagate client_id to journal entries via linked financial records
UPDATE journal_entries je
SET client_id = fr.client_id
FROM financial_records fr
WHERE fr.journal_entry_id = je.id AND je.client_id IS NULL AND fr.client_id IS NOT NULL;

-- Backfill stock movement client data
UPDATE stock_movements sm
SET client_id = p.client_id
FROM products p
WHERE sm.product_id = p.id AND sm.client_id IS NULL AND p.client_id IS NOT NULL;

UPDATE stock_movements sm
SET client_id = t.client_id
FROM transactions t
WHERE sm.reference_id = t.id AND sm.client_id IS NULL AND t.client_id IS NOT NULL;

UPDATE stock_movements sm
SET client_id = st.client_id
FROM service_tickets st
WHERE sm.reference_id = st.id AND sm.client_id IS NULL AND st.client_id IS NOT NULL;
