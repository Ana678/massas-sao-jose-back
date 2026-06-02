ALTER TABLE "city" RENAME TO "cities";--> statement-breakpoint
ALTER TABLE "clients" DROP CONSTRAINT "clients_city_id_city_id_fk";
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;