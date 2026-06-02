import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { cities } from "./cities";

export const clients = pgTable("clients", {
	id: text()
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	name: text().notNull(),
	phone: text().notNull(),
	cityId: text("city_id")
		.notNull()
		.references(() => cities.id),

	state: text().notNull(),
	address: text().notNull(),

	cep: text(),

	cnpj: text(),
	socialReason: text("social_reason"),
	stateInscription: text("state_inscription"),
	needFiscalNote: boolean("need_fiscal_note").notNull().default(false),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
	deletedAt: timestamp("deleted_at"),
});
