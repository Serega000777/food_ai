CREATE TYPE "public"."analysis_status" AS ENUM('DRAFT', 'UPLOADING', 'UPLOAD_FAILED', 'QUEUED', 'ANALYZING', 'MATCHING', 'NEEDS_CLARIFICATION', 'READY_TO_CONFIRM', 'CONFIRMED', 'ANALYSIS_FAILED', 'MATCH_FAILED', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."confidence_decision" AS ENUM('ACCEPTABLE', 'VERIFY_ITEM', 'ASK_QUESTION', 'MANUAL_REQUIRED');--> statement-breakpoint
CREATE TYPE "public"."correction_type" AS ENUM('FOOD_CHANGED', 'GRAMS_CHANGED', 'ITEM_ADDED', 'ITEM_REMOVED', 'HIDDEN_CALORIE_ADDED', 'TOTAL_SCALE_CHANGED', 'TEXT_REFINEMENT');--> statement-breakpoint
ALTER TYPE "public"."meal_source" ADD VALUE 'PHOTO';--> statement-breakpoint
CREATE TABLE "ai_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"meal_photo_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"schema_version" text,
	"status" "analysis_status" DEFAULT 'QUEUED' NOT NULL,
	"dish_name" text,
	"overall_confidence" numeric(4, 3),
	"latency_ms" numeric(10, 0),
	"error_message" text,
	"meal_entry_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_food_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"label" text NOT NULL,
	"matched_food_id" uuid,
	"estimated_grams" numeric(6, 2) NOT NULL,
	"gram_range_min" numeric(6, 2),
	"gram_range_max" numeric(6, 2),
	"confidence" numeric(4, 3) NOT NULL,
	"hidden_calorie_risk" boolean DEFAULT false NOT NULL,
	"decision" "confidence_decision" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"analysis_id" uuid,
	"type" "correction_type" NOT NULL,
	"before" jsonb NOT NULL,
	"after" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"thumbnail_key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_meal_photo_id_meal_photos_id_fk" FOREIGN KEY ("meal_photo_id") REFERENCES "public"."meal_photos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_meal_entry_id_meal_entries_id_fk" FOREIGN KEY ("meal_entry_id") REFERENCES "public"."meal_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_food_candidates" ADD CONSTRAINT "ai_food_candidates_analysis_id_ai_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."ai_analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_food_candidates" ADD CONSTRAINT "ai_food_candidates_matched_food_id_foods_id_fk" FOREIGN KEY ("matched_food_id") REFERENCES "public"."foods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrections" ADD CONSTRAINT "corrections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrections" ADD CONSTRAINT "corrections_analysis_id_ai_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."ai_analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_photos" ADD CONSTRAINT "meal_photos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_analyses_user_id_idx" ON "ai_analyses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_food_candidates_analysis_id_idx" ON "ai_food_candidates" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX "corrections_analysis_id_idx" ON "corrections" USING btree ("analysis_id");