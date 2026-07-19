CREATE TYPE "public"."discount_type" AS ENUM('PERCENT', 'VALUE');--> statement-breakpoint
ALTER TABLE "order_products" ADD COLUMN "discount_type" "discount_type" DEFAULT 'PERCENT' NOT NULL;