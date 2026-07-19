import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../../src/database/schema";
import { OrdersService } from "../../src/orders/orders.service";
import { createTestPool, resetDb, type TestDb } from "../helpers/db";
import { seedBase } from "../helpers/seed";

describe("Remoção de pedido x preservação dos itens (bug orders.remove)", () => {
	const pool = createTestPool();
	const db = drizzle(pool, { schema }) as unknown as TestDb;
	const orders = new OrdersService(db);

	beforeEach(async () => {
		await resetDb(db);
	});

	afterAll(async () => {
		await pool.end();
	});

	it("soft-delete do pedido preserva os itens congelados (recuperáveis)", async () => {
		const { client, user, product } = await seedBase(db);

		const created = await orders.create(
			{
				clientId: client.id,
				type: "ENCOMENDA",
				status: "PENDENTE",
				paymentMethod: "dinheiro",
				deliveryFee: 0,
				isPaid: false,
				products: [{ productId: product.id, quantity: 10, discount: 0 }],
			} as never,
			user.id,
		);

		await orders.remove(created.id);

		// O pedido soft-deletado some das listagens/consultas normais.
		await expect(orders.findOne(created.id)).rejects.toThrow();

		// Mas os itens (com o preço congelado) continuam no banco — recuperáveis/auditáveis.
		const items = await db
			.select()
			.from(schema.order_products)
			.where(eq(schema.order_products.orderId, created.id));

		expect(items).toHaveLength(1);
		expect(items[0].unitPrice).toBe("12.50");
		expect(items[0].quantity).toBe("10");
	});
});
