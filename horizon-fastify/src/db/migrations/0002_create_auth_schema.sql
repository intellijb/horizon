-- Create auth schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS auth;

-- Create enums in public schema (they are database-wide)
DO $$ BEGIN
  CREATE TYPE device_type AS ENUM ('mobile', 'desktop', 'tablet', 'tv', 'watch', 'unknown');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE auth_event_type AS ENUM (
    'login', 'logout', 'token_refresh', 'password_change',
    'password_reset_request', 'password_reset_complete',
    'email_verification', 'mfa_enabled', 'mfa_disabled',
    'device_added', 'device_removed', 'device_trusted',
    'oauth_linked', 'oauth_unlinked', 'account_suspended',
    'account_reactivated', 'login_failed', 'token_revoked'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE auth_attempt_type AS ENUM ('login', 'refresh', 'password_reset', 'email_verification', 'mfa_verification');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE oauth_provider AS ENUM ('google', 'github', 'facebook', 'twitter', 'apple', 'microsoft', 'discord', 'linkedin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create users table
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT false NOT NULL,
  email_verification_token TEXT,
  email_verification_expires TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  mfa_enabled BOOLEAN DEFAULT false NOT NULL,
  mfa_secret TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create devices table
CREATE TABLE IF NOT EXISTS auth.devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name VARCHAR(255),
  device_type device_type NOT NULL,
  device_fingerprint TEXT NOT NULL UNIQUE,
  trusted BOOLEAN DEFAULT false NOT NULL,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES auth.devices(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  token_family UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_reason TEXT,
  replaced_by UUID REFERENCES auth.refresh_tokens(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create access_tokens table
CREATE TABLE IF NOT EXISTS auth.access_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES auth.devices(id) ON DELETE CASCADE,
  jti VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS auth.password_reset_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create oauth_accounts table
CREATE TABLE IF NOT EXISTS auth.oauth_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider oauth_provider NOT NULL,
  provider_user_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(provider, provider_user_id)
);

-- Create auth_attempts table
CREATE TABLE IF NOT EXISTS auth.auth_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  ip_address INET NOT NULL,
  success BOOLEAN NOT NULL,
  attempt_type auth_attempt_type NOT NULL,
  error_reason TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create security_events table
CREATE TABLE IF NOT EXISTS auth.security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_id UUID REFERENCES auth.devices(id) ON DELETE SET NULL,
  event_type auth_event_type NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS users_email_idx ON auth.users(email);
CREATE INDEX IF NOT EXISTS users_username_idx ON auth.users(username);
CREATE INDEX IF NOT EXISTS users_created_at_idx ON auth.users(created_at);

CREATE INDEX IF NOT EXISTS devices_user_id_idx ON auth.devices(user_id);
CREATE INDEX IF NOT EXISTS devices_fingerprint_idx ON auth.devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS devices_last_seen_idx ON auth.devices(last_seen_at);

CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON auth.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_device_id_idx ON auth.refresh_tokens(device_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_token_hash_idx ON auth.refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS refresh_tokens_family_idx ON auth.refresh_tokens(token_family);
CREATE INDEX IF NOT EXISTS refresh_tokens_expires_at_idx ON auth.refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS refresh_tokens_user_device_idx ON auth.refresh_tokens(user_id, device_id);

CREATE INDEX IF NOT EXISTS access_tokens_jti_idx ON auth.access_tokens(jti);
CREATE INDEX IF NOT EXISTS access_tokens_user_device_idx ON auth.access_tokens(user_id, device_id);
CREATE INDEX IF NOT EXISTS access_tokens_expires_at_idx ON auth.access_tokens(expires_at);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx ON auth.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS password_reset_tokens_token_hash_idx ON auth.password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at_idx ON auth.password_reset_tokens(expires_at);

CREATE INDEX IF NOT EXISTS oauth_accounts_user_id_idx ON auth.oauth_accounts(user_id);

CREATE INDEX IF NOT EXISTS auth_attempts_email_idx ON auth.auth_attempts(email);
CREATE INDEX IF NOT EXISTS auth_attempts_ip_address_idx ON auth.auth_attempts(ip_address);
CREATE INDEX IF NOT EXISTS auth_attempts_created_at_idx ON auth.auth_attempts(created_at);
CREATE INDEX IF NOT EXISTS auth_attempts_type_idx ON auth.auth_attempts(attempt_type);

CREATE INDEX IF NOT EXISTS security_events_user_id_idx ON auth.security_events(user_id);
CREATE INDEX IF NOT EXISTS security_events_device_id_idx ON auth.security_events(device_id);
CREATE INDEX IF NOT EXISTS security_events_event_type_idx ON auth.security_events(event_type);
CREATE INDEX IF NOT EXISTS security_events_created_at_idx ON auth.security_events(created_at);
CREATE INDEX IF NOT EXISTS security_events_user_event_idx ON auth.security_events(user_id, event_type);