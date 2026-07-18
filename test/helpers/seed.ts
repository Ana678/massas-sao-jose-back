import * as schema from "../../src/database/schema";
import type { TestDb } from "./db";

/** Cria uma cidade, um usuário ADMIN, um cliente e um produto prontos para testes de pedido. */
export async function seedBase(db: TestDb) {
	const [city] = await db
		.insert(schema.cities)
		.values({ name: "Caicó" })
		.returning();

	const [user] = await db
		.insert(schema.users)
		.values({
			name: "Admin",
			email: "admin@teste.com",
			passwordHash: "hash",
			role: "ADMIN",
		})
		.returning();

	const [client] = await db
		.insert(schema.clients)
		.values({
			name: "Padaria X",
			phone: "84999998888",
			cityId: city.id,
			state: "RN",
			address: "Rua A, 123",
		})
		.returning();

	const [product] = await db
		.insert(schema.products)
		.values({
			name: "Massa fresca",
			description: "500g caseira",
			price: "12.50",
			investment: "4.20",
		})
		.returning();

	return { city, user, client, product };
}
