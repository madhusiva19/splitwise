-- Existing groups predate multi-currency support and were all implicitly INR.
ALTER TABLE groups ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'INR';
