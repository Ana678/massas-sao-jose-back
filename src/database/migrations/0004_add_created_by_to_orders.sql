ALTER TABLE "orders" ADD COLUMN "created_by" text REFERENCES "users"("id") ON DELETE set null;--> statement-breakpoint
