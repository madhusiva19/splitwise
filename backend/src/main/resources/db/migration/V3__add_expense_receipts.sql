CREATE TABLE expense_receipts (
    id           VARCHAR(255) NOT NULL PRIMARY KEY,
    expense_id   VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_name    VARCHAR(255) NOT NULL,
    data         BYTEA NOT NULL,
    uploaded_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_expense_receipts_expense FOREIGN KEY (expense_id) REFERENCES expenses (id),
    CONSTRAINT uk_expense_receipts_expense UNIQUE (expense_id)
);
