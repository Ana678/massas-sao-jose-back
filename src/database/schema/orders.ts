import {
	pgTable,
	text,
	timestamp,
	boolean,
	pgEnum,
	numeric,
} from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { clients } from "./clients";
import { users } from "./users";

export const orderTypeEnum = pgEnum("order_type", [
	"ENCOMENDA",
	"PREVISAO_ROTA",
	"PRONTA_ENTREGA",
]);

export const orderStatusEnum = pgEnum("order_status", [
	"PENDENTE",
	"EM_PRODUCAO",
	"EM_ROTA",
	"ENTREGUE",
	"PULADO",
	"CANCELADO",
]);

export const orders = pgTable("orders", {
	id: text()
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	clientId: text("client_id")
		.notNull()
		.references(() => clients.id, { onDelete: "cascade" }),

	type: orderTypeEnum("type").default("ENCOMENDA").notNull(),
	status: orderStatusEnum("status").default("PENDENTE").notNull(),
	deliveryFee: numeric("delivery_fee").notNull().default("0"),

	paymentMethod: text("payment_method").notNull().default("dinheiro"),
	isPaid: boolean("is_paid").notNull().default(false),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
	deletedAt: timestamp("deleted_at"),
	disabledUntil: timestamp("disabled_until"),
	createdBy: text("created_by")
		.notNull()
		.references(() => users.id, {
			onDelete: "set null",
		}),
});
