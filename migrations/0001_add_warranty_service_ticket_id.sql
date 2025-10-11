ALTER TABLE "warranty_claims"
ADD COLUMN IF NOT EXISTS "warranty_service_ticket_id" varchar;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_name = 'warranty_claims_warranty_service_ticket_id_service_tickets_id_fk'
      AND tc.table_name = 'warranty_claims'
  ) THEN
    ALTER TABLE "warranty_claims"
    ADD CONSTRAINT "warranty_claims_warranty_service_ticket_id_service_tickets_id_fk"
    FOREIGN KEY ("warranty_service_ticket_id") REFERENCES "service_tickets"("id");
  END IF;
END $$;

