-- Ускоряет выборку активных услуг для витрины (WHERE is_active = TRUE ORDER BY id)
CREATE INDEX IF NOT EXISTS idx_services_active_list ON services (id) WHERE is_active = TRUE;
