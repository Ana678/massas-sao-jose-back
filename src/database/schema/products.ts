import { pgTable, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

export const products = pgTable("products", {
	id: text()
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	name: text().notNull(),
	description: text().notNull(),
	price: numeric().notNull(),
	investment: numeric().notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
	deletedAt: timestamp("deleted_at"),
});
