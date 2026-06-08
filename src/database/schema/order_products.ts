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
		.references(() => products.id, { onDelete: "cascade" }),

	quantity: numeric().notNull(),
	unitPrice: numeric("unit_price").notNull(),
	discount: numeric().default("0"),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
