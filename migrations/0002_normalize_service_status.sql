DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'service_tickets'
      AND column_name = 'status'
      AND udt_name <> 'service_status'
  ) THEN
    -- Normalize existing textual statuses
    UPDATE service_tickets
    SET status = regexp_replace(lower(trim(status)), '[\\s_]+', '-', 'g')
    WHERE status IS NOT NULL;

    -- Map legacy or alternate values to the new enum values
    UPDATE service_tickets
    SET status = CASE status
      WHEN 'sedang-dicek' THEN 'pending'
      WHEN 'menunggu-konfirmasi' THEN 'waiting-confirmation'
      WHEN 'menunggu-sparepart' THEN 'waiting-parts'
      WHEN 'sedang-dikerjakan' THEN 'in-progress'
      WHEN 'selesai' THEN 'completed'
      WHEN 'sudah-diambil' THEN 'delivered'
      WHEN 'cencel' THEN 'cancelled'
      WHEN 'menunggu-teknisi' THEN 'waiting-technician'
      ELSE status
    END
    WHERE status IN (
      'sedang-dicek',
      'menunggu-konfirmasi',
      'menunggu-sparepart',
      'sedang-dikerjakan',
      'selesai',
      'sudah-diambil',
      'cencel',
      'menunggu-teknisi'
    );

    -- Final safeguard conversion during type change
    ALTER TABLE service_tickets
    ALTER COLUMN status TYPE service_status
    USING CASE
      WHEN status IS NULL THEN NULL
      WHEN status IN (
        'pending',
        'checking',
        'in-progress',
        'waiting-technician',
        'testing',
        'waiting-confirmation',
        'waiting-parts',
        'completed',
        'delivered',
        'cancelled'
      ) THEN status::service_status
      WHEN status = 'menunggu-teknisi' THEN 'waiting-technician'::service_status
      ELSE 'pending'::service_status
    END;
  END IF;
END $$;
