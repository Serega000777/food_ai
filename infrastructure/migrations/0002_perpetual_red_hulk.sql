CREATE TYPE "public"."food_source" AS ENUM('SEED', 'USER');--> statement-breakpoint
CREATE TYPE "public"."food_verification_level" AS ENUM('VERIFIED', 'UNVERIFIED');--> statement-breakpoint
CREATE TYPE "public"."meal_source" AS ENUM('MANUAL', 'TEXT');--> statement-breakpoint
CREATE TYPE "public"."meal_type" AS ENUM('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'OTHER');--> statement-breakpoint
CREATE TABLE "foods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_name" text NOT NULL,
	"source" "food_source" NOT NULL,
	"source_id" text,
	"verification_level" "food_verification_level" NOT NULL,
	"calories_per_100g" numeric(7, 2) NOT NULL,
	"protein_per_100g" numeric(6, 2) NOT NULL,
	"fat_per_100g" numeric(6, 2) NOT NULL,
	"carbs_per_100g" numeric(6, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "foods_source_source_id_unique" UNIQUE("source","source_id")
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"key" text NOT NULL,
	"meal_entry_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_keys_user_id_key_unique" UNIQUE("user_id","key")
);
--> statement-breakpoint
CREATE TABLE "meal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"meal_type" "meal_type" NOT NULL,
	"eaten_at" timestamp with time zone NOT NULL,
	"source" "meal_source" NOT NULL,
	"total_calories" numeric(8, 2) NOT NULL,
	"protein_g" numeric(7, 2) NOT NULL,
	"fat_g" numeric(7, 2) NOT NULL,
	"carbs_g" numeric(7, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meal_entry_id" uuid NOT NULL,
	"food_id" uuid,
	"display_name" text NOT NULL,
	"grams" numeric(7, 2) NOT NULL,
	"calories_snapshot" numeric(8, 2) NOT NULL,
	"protein_g_snapshot" numeric(7, 2) NOT NULL,
	"fat_g_snapshot" numeric(7, 2) NOT NULL,
	"carbs_g_snapshot" numeric(7, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_meal_entry_id_meal_entries_id_fk" FOREIGN KEY ("meal_entry_id") REFERENCES "public"."meal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_entries" ADD CONSTRAINT "meal_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_meal_entry_id_meal_entries_id_fk" FOREIGN KEY ("meal_entry_id") REFERENCES "public"."meal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meal_entries_user_id_eaten_at_idx" ON "meal_entries" USING btree ("user_id","eaten_at");--> statement-breakpoint
CREATE INDEX "meal_items_meal_entry_id_idx" ON "meal_items" USING btree ("meal_entry_id");