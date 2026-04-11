-- CreateEnum
CREATE TYPE "Role" AS ENUM ('citizen', 'moderator', 'admin');

-- CreateEnum
CREATE TYPE "CheckpointStatus" AS ENUM ('open', 'delayed', 'partially_closed', 'closed', 'unknown');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('reported', 'verified', 'monitoring', 'resolved', 'closed', 'rejected');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('crowd', 'moderator', 'external_api', 'system');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('submitted', 'under_review', 'verified', 'rejected', 'merged', 'spam');

-- CreateEnum
CREATE TYPE "VoteType" AS ENUM ('confirm', 'deny');

-- CreateEnum
CREATE TYPE "AlertChannel" AS ENUM ('in_app', 'email', 'sms_stub');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('pending', 'generated', 'sent', 'failed', 'read');

-- CreateEnum
CREATE TYPE "FactorType" AS ENUM ('incident', 'checkpoint_status', 'weather', 'area_restriction', 'congestion', 'provider_penalty', 'user_constraint');

-- CreateEnum
CREATE TYPE "AreaType" AS ENUM ('city', 'district', 'checkpoint_buffer', 'route_corridor', 'custom');

-- CreateEnum
CREATE TYPE "ValidationCheckType" AS ENUM ('duplicate_proximity', 'duplicate_temporal', 'location_precision', 'text_quality', 'reporter_reputation', 'anomaly_score');

-- CreateEnum
CREATE TYPE "ValidationOutcome" AS ENUM ('pass', 'warn', 'fail');

-- CreateEnum
CREATE TYPE "ModerationActionType" AS ENUM ('review_started', 'verify_report', 'reject_report', 'merge_report', 'flag_duplicate', 'create_incident', 'verify_incident', 'close_incident', 'reopen_incident', 'update_checkpoint_status');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'citizen',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "user_agent" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_categories" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "incident_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geofences" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "area_type" "AreaType" NOT NULL,
    "boundary_json" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geofences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkpoints" (
    "id" TEXT NOT NULL,
    "area_id" TEXT,
    "name" TEXT NOT NULL,
    "external_code" TEXT,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "address_text" TEXT NOT NULL,
    "direction_hint" TEXT,
    "current_status" "CheckpointStatus" NOT NULL DEFAULT 'unknown',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkpoint_status_history" (
    "id" SERIAL NOT NULL,
    "checkpoint_id" TEXT NOT NULL,
    "status" "CheckpointStatus" NOT NULL,
    "notes" TEXT,
    "changed_by_user_id" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkpoint_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "checkpoint_id" TEXT,
    "category_id" INTEGER NOT NULL,
    "created_by_user_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'medium',
    "status" "IncidentStatus" NOT NULL DEFAULT 'reported',
    "source_type" "SourceType" NOT NULL DEFAULT 'crowd',
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "submitted_by_user_id" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "linked_incident_id" TEXT,
    "duplicate_of_report_id" TEXT,
    "description" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'submitted',
    "source_type" "SourceType" NOT NULL DEFAULT 'crowd',
    "trust_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_votes" (
    "id" SERIAL NOT NULL,
    "report_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vote_type" "VoteType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_validation_checks" (
    "id" SERIAL NOT NULL,
    "report_id" TEXT NOT NULL,
    "check_type" "ValidationCheckType" NOT NULL,
    "outcome" "ValidationOutcome" NOT NULL,
    "score" DECIMAL(5,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_validation_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_actions" (
    "id" SERIAL NOT NULL,
    "report_id" TEXT,
    "incident_id" TEXT,
    "checkpoint_id" TEXT,
    "actor_user_id" TEXT NOT NULL,
    "action_type" "ModerationActionType" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "geofence_id" TEXT,
    "category_id" INTEGER,
    "channel" "AlertChannel" NOT NULL DEFAULT 'in_app',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_records" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "incident_id" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'generated',
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_estimations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "origin_name" TEXT,
    "origin_latitude" DECIMAL(10,7) NOT NULL,
    "origin_longitude" DECIMAL(10,7) NOT NULL,
    "destination_name" TEXT,
    "destination_latitude" DECIMAL(10,7) NOT NULL,
    "destination_longitude" DECIMAL(10,7) NOT NULL,
    "base_distance_km" DECIMAL(10,2),
    "adjusted_distance_km" DECIMAL(10,2),
    "base_duration_minutes" INTEGER,
    "adjusted_duration_minutes" INTEGER,
    "risk_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "provider_name" TEXT,
    "route_summary" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_estimations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_factors" (
    "id" SERIAL NOT NULL,
    "route_estimation_id" TEXT NOT NULL,
    "factor_type" "FactorType" NOT NULL,
    "reference_id" TEXT,
    "weight_value" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_factors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "incident_categories_code_key" ON "incident_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "checkpoints_external_code_key" ON "checkpoints"("external_code");

-- CreateIndex
CREATE UNIQUE INDEX "report_votes_report_id_user_id_key" ON "report_votes"("report_id", "user_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "geofences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkpoint_status_history" ADD CONSTRAINT "checkpoint_status_history_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "checkpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkpoint_status_history" ADD CONSTRAINT "checkpoint_status_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "checkpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "incident_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "incident_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_duplicate_of_report_id_fkey" FOREIGN KEY ("duplicate_of_report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_votes" ADD CONSTRAINT "report_votes_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_votes" ADD CONSTRAINT "report_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_validation_checks" ADD CONSTRAINT "report_validation_checks_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "checkpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_subscriptions" ADD CONSTRAINT "alert_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_subscriptions" ADD CONSTRAINT "alert_subscriptions_geofence_id_fkey" FOREIGN KEY ("geofence_id") REFERENCES "geofences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_subscriptions" ADD CONSTRAINT "alert_subscriptions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "incident_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_records" ADD CONSTRAINT "alert_records_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "alert_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_records" ADD CONSTRAINT "alert_records_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_estimations" ADD CONSTRAINT "route_estimations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_factors" ADD CONSTRAINT "route_factors_route_estimation_id_fkey" FOREIGN KEY ("route_estimation_id") REFERENCES "route_estimations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
