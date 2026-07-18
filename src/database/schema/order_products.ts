import { numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { orders } from "./orders";
import { products } from "./products";

export const order_products = pgTable("order_products", {
	id: text()
		.primaryKey()
		.$defaultFn(() => uuidv7()),

	orderId: text("order_id")
		.notNull()
		.references(() => orders.id, { onDelete: "cascade" }),

	productId: text("product_id")
		.notNull()
		// RESTRICT: impede hard-delete de um produto referenciado por pedidos, protegendo
		// o histórico a nível de banco (a coluna é NOT NULL, então "set null" não serve).
		.references(() => products.id, { onDelete: "restrict" }),

	quantity: numeric().notNull(),
	unitPrice: numeric("unit_price").notNull(),
	discount: numeric().default("0"),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
