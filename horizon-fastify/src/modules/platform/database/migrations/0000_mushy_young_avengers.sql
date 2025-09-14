CREATE SCHEMA IF NOT EXISTS "auth";
--> statement-breakpoint
CREATE TYPE "public"."auth_attempt_type" AS ENUM('login', 'refresh', 'password_reset', 'email_verification', 'mfa_verification');--> statement-breakpoint
CREATE TYPE "public"."auth_event_type" AS ENUM('login', 'logout', 'token_refresh', 'password_change', 'password_reset_request', 'password_reset_complete', 'email_verification', 'mfa_enabled', 'mfa_disabled', 'device_added', 'device_removed', 'device_trusted', 'oauth_linked', 'oauth_unlinked', 'account_suspended', 'account_reactivated', 'login_failed', 'token_revoked');--> statement-breakpoint
CREATE TYPE "public"."device_type" AS ENUM('mobile', 'desktop', 'tablet', 'tv', 'watch', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."oauth_provider" AS ENUM('google', 'github', 'facebook', 'twitter', 'apple', 'microsoft', 'discord', 'linkedin');--> statement-breakpoint
CREATE TABLE "auth"."access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"jti" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "access_tokens_jti_unique" UNIQUE("jti")
);
--> statement-breakpoint
CREATE TABLE "auth"."auth_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"ip_address" "inet" NOT NULL,
	"success" boolean NOT NULL,
	"attempt_type" "auth_attempt_type" NOT NULL,
	"error_reason" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_name" varchar(255),
	"device_type" "device_type" NOT NULL,
	"device_fingerprint" text NOT NULL,
	"trusted" boolean DEFAULT false NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devices_device_fingerprint_unique" UNIQUE("device_fingerprint")
);
--> statement-breakpoint
CREATE TABLE "auth"."oauth_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "oauth_provider" NOT NULL,
	"provider_user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_accounts_provider_user_unique" UNIQUE("provider","provider_user_id")
);
--> statement-breakpoint
CREATE TABLE "auth"."password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"ip_address" "inet",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "auth"."refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"token_family" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_reason" text,
	"replaced_by" uuid,
	"ip_address" "inet",
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "auth"."security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"device_id" uuid,
	"event_type" "auth_event_type" NOT NULL,
	"ip_address" "inet",
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"username" text,
	"password_hash" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"email_verification_token" text,
	"email_verification_expires" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"mfa_secret" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "auth"."access_tokens" ADD CONSTRAINT "access_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."access_tokens" ADD CONSTRAINT "access_tokens_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "auth"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."devices" ADD CONSTRAINT "devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "auth"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_replaced_by_refresh_tokens_id_fk" FOREIGN KEY ("replaced_by") REFERENCES "auth"."refresh_tokens"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."security_events" ADD CONSTRAINT "security_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."security_events" ADD CONSTRAINT "security_events_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "auth"."devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_tokens_jti_idx" ON "auth"."access_tokens" USING btree ("jti");--> statement-breakpoint
CREATE INDEX "access_tokens_user_device_idx" ON "auth"."access_tokens" USING btree ("user_id","device_id");--> statement-breakpoint
CREATE INDEX "access_tokens_expires_at_idx" ON "auth"."access_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "auth_attempts_email_idx" ON "auth"."auth_attempts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "auth_attempts_ip_address_idx" ON "auth"."auth_attempts" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "auth_attempts_created_at_idx" ON "auth"."auth_attempts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "auth_attempts_type_idx" ON "auth"."auth_attempts" USING btree ("attempt_type");--> statement-breakpoint
CREATE INDEX "devices_user_id_idx" ON "auth"."devices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "devices_fingerprint_idx" ON "auth"."devices" USING btree ("device_fingerprint");--> statement-breakpoint
CREATE INDEX "devices_last_seen_idx" ON "auth"."devices" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "oauth_accounts_user_id_idx" ON "auth"."oauth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_id_idx" ON "auth"."password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_token_hash_idx" ON "auth"."password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "auth"."password_reset_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "auth"."refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_device_id_idx" ON "auth"."refresh_tokens" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_token_hash_idx" ON "auth"."refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "refresh_tokens_family_idx" ON "auth"."refresh_tokens" USING btree ("token_family");--> statement-breakpoint
CREATE INDEX "refresh_tokens_expires_at_idx" ON "auth"."refresh_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_device_idx" ON "auth"."refresh_tokens" USING btree ("user_id","device_id");--> statement-breakpoint
CREATE INDEX "security_events_user_id_idx" ON "auth"."security_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "security_events_device_id_idx" ON "auth"."security_events" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "security_events_event_type_idx" ON "auth"."security_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "security_events_created_at_idx" ON "auth"."security_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "security_events_user_event_idx" ON "auth"."security_events" USING btree ("user_id","event_type");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "auth"."users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_username_idx" ON "auth"."users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "auth"."users" USING btree ("created_at");