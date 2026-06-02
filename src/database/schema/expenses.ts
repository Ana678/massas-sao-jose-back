import { pgTable, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

export const expenses = pgTable("expenses", {
	id: text()
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	description: text().notNull(),
	category: text().notNull(),
	value: numeric().notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
	deletedAt: timestamp("deleted_at"),
});
