-- Enable essential extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS app;

-- Grant permissions to horizon user
GRANT ALL PRIVILEGES ON SCHEMA auth TO horizon;
GRANT ALL PRIVILEGES ON SCHEMA app TO horizon;
GRANT ALL PRIVILEGES ON SCHEMA public TO horizon;

-- Set default search path
ALTER USER horizon SET search_path TO public, auth, app;

-- Create updated_at trigger function (will be used by migrations)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Log initialization completion
DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed successfully';
END
$$;