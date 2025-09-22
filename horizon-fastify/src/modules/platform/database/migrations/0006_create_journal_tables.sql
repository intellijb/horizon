-- Create journal card status enum
CREATE TYPE journal_card_status AS ENUM ('active', 'archived', 'deleted');

-- Create journal_card table
CREATE TABLE IF NOT EXISTS journal_card (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create journal_card_input table
CREATE TABLE IF NOT EXISTS journal_card_input (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    status journal_card_status NOT NULL DEFAULT 'active',
    card_id TEXT NOT NULL REFERENCES journal_card(id) ON DELETE CASCADE,
    "order" INTEGER NOT NULL DEFAULT 0,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_journal_card_order ON journal_card("order");
CREATE INDEX idx_journal_card_input_card_id ON journal_card_input(card_id);
CREATE INDEX idx_journal_card_input_date ON journal_card_input(date);
CREATE INDEX idx_journal_card_input_status ON journal_card_input(status);
CREATE INDEX idx_journal_card_input_order ON journal_card_input("order");