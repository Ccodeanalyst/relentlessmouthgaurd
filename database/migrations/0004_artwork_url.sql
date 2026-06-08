-- Adds artwork_file_url to order_items for R2-stored artwork references.

ALTER TABLE order_items ADD COLUMN artwork_file_url TEXT;
