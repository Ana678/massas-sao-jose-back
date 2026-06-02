CREATE TYPE "public"."order_status" AS ENUM('PENDENTE', 'EM_PRODUCAO', 'EM_ROTA', 'ENTREGUE', 'PULADO', 'CANCELADO');--> statement-breakpoint
CREATE TYPE "public"."order_type" AS ENUM('ENCOMENDA', 'PREVISAO_ROTA', 'PRONTA_ENTREGA');--> statement-breakpoint
CREATE TABLE "city" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"cityId" text NOT NULL,
	"state" text NOT NULL,
	"address" text NOT NULL,
	"cep" text,
	"cnpj" text,
	"socialReason" text,
	"stateInscription" text,
	"needFiscalNote" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"value" numeric NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price" numeric NOT NULL,
	"investment" numeric NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"clientId" text NOT NULL,
	"type" "order_type" DEFAULT 'ENCOMENDA' NOT NULL,
	"status" "order_status" DEFAULT 'PENDENTE' NOT NULL,
	"delivery_fee" numeric DEFAULT '0' NOT NULL,
	"paymentMethod" text DEFAULT 'dinheiro' NOT NULL,
	"isPaid" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"disabledUntil" timestamp
);
--> statement-breakpoint
CREATE TABLE "order_products" (
	"id" text PRIMARY KEY NOT NULL,
	"orderId" text NOT NULL,
	"productId" text NOT NULL,
	"quantity" numeric NOT NULL,
	"unitPrice" numeric NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_cityId_city_id_fk" FOREIGN KEY ("cityId") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_clientId_clients_id_fk" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_products" ADD CONSTRAINT "order_products_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_products" ADD CONSTRAINT "order_products_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;