ALTER TABLE "order_products" DROP CONSTRAINT "order_products_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "order_products" ADD CONSTRAINT "order_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;