ALTER TABLE "city" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "city" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "city" RENAME COLUMN "deletedAt" TO "deleted_at";--> statement-breakpoint
ALTER TABLE "clients" RENAME COLUMN "cityId" TO "city_id";--> statement-breakpoint
ALTER TABLE "clients" RENAME COLUMN "socialReason" TO "social_reason";--> statement-breakpoint
ALTER TABLE "clients" RENAME COLUMN "stateInscription" TO "state_inscription";--> statement-breakpoint
ALTER TABLE "clients" RENAME COLUMN "needFiscalNote" TO "need_fiscal_note";--> statement-breakpoint
ALTER TABLE "clients" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "clients" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "clients" RENAME COLUMN "deletedAt" TO "deleted_at";--> statement-breakpoint
ALTER TABLE "expenses" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "expenses" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "expenses" RENAME COLUMN "deletedAt" TO "deleted_at";--> statement-breakpoint
ALTER TABLE "products" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "products" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "products" RENAME COLUMN "deletedAt" TO "deleted_at";--> statement-breakpoint
ALTER TABLE "orders" RENAME COLUMN "clientId" TO "client_id";--> statement-breakpoint
ALTER TABLE "orders" RENAME COLUMN "paymentMethod" TO "payment_method";--> statement-breakpoint
ALTER TABLE "orders" RENAME COLUMN "isPaid" TO "is_paid";--> statement-breakpoint
ALTER TABLE "orders" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "orders" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "orders" RENAME COLUMN "deletedAt" TO "deleted_at";--> statement-breakpoint
ALTER TABLE "orders" RENAME COLUMN "disabledUntil" TO "disabled_until";--> statement-breakpoint
ALTER TABLE "order_products" RENAME COLUMN "orderId" TO "order_id";--> statement-breakpoint
ALTER TABLE "order_products" RENAME COLUMN "productId" TO "product_id";--> statement-breakpoint
ALTER TABLE "order_products" RENAME COLUMN "unitPrice" TO "unit_price";--> statement-breakpoint
ALTER TABLE "order_products" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "order_products" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "clients" DROP CONSTRAINT "clients_cityId_city_id_fk";
--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_clientId_clients_id_fk";
--> statement-breakpoint
ALTER TABLE "order_products" DROP CONSTRAINT "order_products_orderId_orders_id_fk";
--> statement-breakpoint
ALTER TABLE "order_products" DROP CONSTRAINT "order_products_productId_products_id_fk";
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_products" ADD CONSTRAINT "order_products_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_products" ADD CONSTRAINT "order_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;