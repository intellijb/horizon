-- =============================================
-- Journal Feature - Production Database Setup
-- =============================================
-- This script creates the journal_card and journal_card_input tables
-- with all necessary indexes and constraints for production use
--
-- Author: Claude
-- Date: 2025-09-23
-- Version: 1.0
-- =============================================

-- Start transaction for atomic execution
BEGIN;

-- =============================================
-- 1. Create ENUM type for journal card status
-- =============================================
DO $$
BEGIN
    -- Check if the enum type already exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'journal_card_status') THEN
        CREATE TYPE journal_card_status AS ENUM ('active', 'archived', 'deleted');
    END IF;
END $$;

-- =============================================
-- 2. Create journal_card table
-- =============================================
-- This table stores the journal card templates/categories
CREATE TABLE IF NOT EXISTS journal_card (
    id TEXT PRIMARY KEY,                              -- Unique identifier (nanoid)
    category TEXT NOT NULL,                           -- Category (e.g., 'health', 'mood', 'productivity')
    type TEXT NOT NULL,                               -- Type within category (e.g., 'exercise', 'emotion')
    name TEXT NOT NULL,                               -- Display name (e.g., 'Morning Run', 'Daily Mood')
    "order" INTEGER NOT NULL DEFAULT 0,               -- Display order (lower numbers = higher priority)
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,      -- Creation timestamp
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL       -- Last update timestamp
);

-- Add comments for documentation
COMMENT ON TABLE journal_card IS 'Stores journal card templates that users can create inputs for';
COMMENT ON COLUMN journal_card.id IS 'Unique identifier generated using nanoid';
COMMENT ON COLUMN journal_card.category IS 'High-level category for grouping cards';
COMMENT ON COLUMN journal_card.type IS 'Specific type within the category';
COMMENT ON COLUMN journal_card.name IS 'User-friendly display name for the card';
COMMENT ON COLUMN journal_card."order" IS 'Display order, lower values appear first';

-- =============================================
-- 3. Create journal_card_input table
-- =============================================
-- This table stores the actual journal entries/inputs
CREATE TABLE IF NOT EXISTS journal_card_input (
    id TEXT PRIMARY KEY,                              -- Unique identifier (nanoid)
    date TEXT NOT NULL,                               -- Date in YYYY-MM-DD format
    status journal_card_status NOT NULL DEFAULT 'active', -- Status of the input
    card_id TEXT NOT NULL,                            -- Reference to journal_card
    "order" INTEGER NOT NULL DEFAULT 0,               -- Display order for the day
    value TEXT NOT NULL,                              -- The actual input content
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,      -- Creation timestamp
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,      -- Last update timestamp

    -- Foreign key constraint with cascade delete
    CONSTRAINT fk_journal_card_input_card
        FOREIGN KEY (card_id)
        REFERENCES journal_card(id)
        ON DELETE CASCADE
);

-- Add comments for documentation
COMMENT ON TABLE journal_card_input IS 'Stores user journal entries linked to journal cards';
COMMENT ON COLUMN journal_card_input.id IS 'Unique identifier generated using nanoid';
COMMENT ON COLUMN journal_card_input.date IS 'Date of the journal entry in YYYY-MM-DD format';
COMMENT ON COLUMN journal_card_input.status IS 'Status of the input (active, archived, or deleted)';
COMMENT ON COLUMN journal_card_input.card_id IS 'Reference to the journal card this input belongs to';
COMMENT ON COLUMN journal_card_input."order" IS 'Display order for multiple inputs on the same day';
COMMENT ON COLUMN journal_card_input.value IS 'The actual journal entry content';

-- =============================================
-- 4. Create indexes for performance optimization
-- =============================================

-- Index for sorting journal cards by order
CREATE INDEX IF NOT EXISTS idx_journal_card_order
    ON journal_card("order");

-- Index for filtering cards by category
CREATE INDEX IF NOT EXISTS idx_journal_card_category
    ON journal_card(category);

-- Index for filtering cards by type
CREATE INDEX IF NOT EXISTS idx_journal_card_type
    ON journal_card(type);

-- Composite index for category and type filtering
CREATE INDEX IF NOT EXISTS idx_journal_card_category_type
    ON journal_card(category, type);

-- Index for foreign key lookups
CREATE INDEX IF NOT EXISTS idx_journal_card_input_card_id
    ON journal_card_input(card_id);

-- Index for date-based queries (very common operation)
CREATE INDEX IF NOT EXISTS idx_journal_card_input_date
    ON journal_card_input(date);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_journal_card_input_status
    ON journal_card_input(status);

-- Index for sorting inputs by order
CREATE INDEX IF NOT EXISTS idx_journal_card_input_order
    ON journal_card_input("order");

-- Composite index for card + date queries (common operation)
CREATE INDEX IF NOT EXISTS idx_journal_card_input_card_date
    ON journal_card_input(card_id, date);

-- Composite index for date + status queries (for active entries on specific date)
CREATE INDEX IF NOT EXISTS idx_journal_card_input_date_status
    ON journal_card_input(date, status);

-- =============================================
-- 5. Create update trigger for updated_at timestamp
-- =============================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for journal_card table
DROP TRIGGER IF EXISTS update_journal_card_updated_at ON journal_card;
CREATE TRIGGER update_journal_card_updated_at
    BEFORE UPDATE ON journal_card
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for journal_card_input table
DROP TRIGGER IF EXISTS update_journal_card_input_updated_at ON journal_card_input;
CREATE TRIGGER update_journal_card_input_updated_at
    BEFORE UPDATE ON journal_card_input
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 6. Create helper views (optional but useful)
-- =============================================

-- View for today's journal inputs with card information
CREATE OR REPLACE VIEW v_today_journal_inputs AS
SELECT
    jci.id,
    jci.date,
    jci.status,
    jci.value,
    jci."order" as input_order,
    jc.id as card_id,
    jc.name as card_name,
    jc.category,
    jc.type,
    jc."order" as card_order,
    jci.created_at,
    jci.updated_at
FROM journal_card_input jci
JOIN journal_card jc ON jci.card_id = jc.id
WHERE jci.date = TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')
    AND jci.status = 'active'
ORDER BY jc."order", jci."order";

COMMENT ON VIEW v_today_journal_inputs IS 'View showing today''s active journal inputs with card details';

-- View for journal statistics
CREATE OR REPLACE VIEW v_journal_statistics AS
SELECT
    jc.id as card_id,
    jc.name as card_name,
    jc.category,
    jc.type,
    COUNT(DISTINCT jci.date) as days_with_entries,
    COUNT(jci.id) as total_entries,
    COUNT(CASE WHEN jci.status = 'active' THEN 1 END) as active_entries,
    COUNT(CASE WHEN jci.status = 'archived' THEN 1 END) as archived_entries,
    MAX(jci.date) as last_entry_date,
    MIN(jci.date) as first_entry_date
FROM journal_card jc
LEFT JOIN journal_card_input jci ON jc.id = jci.card_id
GROUP BY jc.id, jc.name, jc.category, jc.type
ORDER BY jc."order";

COMMENT ON VIEW v_journal_statistics IS 'Aggregated statistics for journal cards and their inputs';

-- =============================================
-- 7. Grant permissions (adjust based on your user setup)
-- =============================================
-- Replace 'your_app_user' with your actual application user

-- Example for typical application user permissions:
-- GRANT SELECT, INSERT, UPDATE, DELETE ON journal_card TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON journal_card_input TO your_app_user;
-- GRANT SELECT ON v_today_journal_inputs TO your_app_user;
-- GRANT SELECT ON v_journal_statistics TO your_app_user;
-- GRANT USAGE ON TYPE journal_card_status TO your_app_user;

-- =============================================
-- 8. Insert sample data (optional - remove for production)
-- =============================================
-- Uncomment the following lines if you want to insert sample data

/*
-- Sample journal cards
INSERT INTO journal_card (id, category, type, name, "order") VALUES
    ('sample_1', 'health', 'exercise', 'Morning Exercise', 1),
    ('sample_2', 'health', 'nutrition', 'Water Intake', 2),
    ('sample_3', 'productivity', 'tasks', 'Daily Goals', 3),
    ('sample_4', 'mood', 'emotion', 'Mood Check', 4),
    ('sample_5', 'health', 'sleep', 'Sleep Quality', 5)
ON CONFLICT (id) DO NOTHING;

-- Sample inputs for today
INSERT INTO journal_card_input (id, date, status, card_id, "order", value) VALUES
    ('sample_input_1', TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD'), 'active', 'sample_1', 1, '30 minutes yoga session'),
    ('sample_input_2', TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD'), 'active', 'sample_2', 1, '6 glasses of water'),
    ('sample_input_3', TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD'), 'active', 'sample_3', 1, 'Complete project documentation'),
    ('sample_input_4', TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD'), 'active', 'sample_4', 1, 'Feeling energetic and focused')
ON CONFLICT (id) DO NOTHING;
*/

-- =============================================
-- 9. Verification queries
-- =============================================
-- Run these to verify the tables were created successfully

DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
    view_count INTEGER;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('journal_card', 'journal_card_input');

    -- Count indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename IN ('journal_card', 'journal_card_input');

    -- Count views
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views
    WHERE table_schema = 'public'
    AND table_name IN ('v_today_journal_inputs', 'v_journal_statistics');

    -- Report results
    RAISE NOTICE 'Journal tables created: %', table_count;
    RAISE NOTICE 'Indexes created: %', index_count;
    RAISE NOTICE 'Views created: %', view_count;

    IF table_count = 2 THEN
        RAISE NOTICE 'SUCCESS: All journal tables created successfully!';
    ELSE
        RAISE WARNING 'WARNING: Expected 2 tables but found %', table_count;
    END IF;
END $$;

-- Commit the transaction
COMMIT;

-- =============================================
-- ROLLBACK SCRIPT (in case you need to undo)
-- =============================================
-- Save this separately for emergency rollback:
/*
BEGIN;
DROP VIEW IF EXISTS v_journal_statistics CASCADE;
DROP VIEW IF EXISTS v_today_journal_inputs CASCADE;
DROP TABLE IF EXISTS journal_card_input CASCADE;
DROP TABLE IF EXISTS journal_card CASCADE;
DROP TYPE IF EXISTS journal_card_status CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
COMMIT;
*/

-- =============================================
-- MIGRATION TRACKING (optional)
-- =============================================
-- If you have a migrations table, record this migration:
/*
INSERT INTO migrations (name, executed_at)
VALUES ('create_journal_tables', NOW())
ON CONFLICT (name) DO NOTHING;
*/