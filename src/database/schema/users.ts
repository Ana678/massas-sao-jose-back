import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "ENTREGADOR"]);

export const users = pgTable("users", {
	id: text()
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	passwordHash: text("password_hash").notNull(),
	role: userRoleEnum("role").default("ENTREGADOR").notNull(),
	refreshToken: text("refresh_token"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
