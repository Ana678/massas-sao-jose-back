import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../../src/database/schema";
import { OrdersService } from "../../src/orders/orders.service";
import { createTestPool, resetDb, type TestDb } from "../helpers/db";
import { seedBase } from "../helpers/seed";

describe("confirmDelivery valida produtos (bug #3)", () => {
	const pool = createTestPool();
	const db = drizzle(pool, { schema }) as unknown as TestDb;
	const orders = new OrdersService(db);

	beforeEach(async () => {
		await resetDb(db);
	});
	afterAll(async () => {
		await pool.end();
	});

	it("produto inexistente retorna 'não foram encontrados' (404), não crash", async () => {
		const { client, user } = await seedBase(db);

		await expect(
			orders.confirmDelivery(
				{
					clientId: client.id,
					paymentMethod: "dinheiro",
					deliveryFee: 0,
					isPaid: true,
					products: [{ productId: "id-que-nao-existe", quantity: 1, discount: 0 }],
				} as never,
				user.id,
			),
		).rejects.toThrow("Um ou mais produtos não foram encontrados.");
	});

	it("produto válido confirma a entrega normalmente", async () => {
		const { client, user, product } = await seedBase(db);

		const result = await orders.confirmDelivery(
			{
				clientId: client.id,
				paymentMethod: "dinheiro",
				deliveryFee: 0,
				isPaid: true,
				products: [{ productId: product.id, quantity: 2, discount: 0 }],
			} as never,
			user.id,
		);

		expect(result.status).toBe("ENTREGUE");
		expect(result.products).toHaveLength(1);
		expect(result.total).toBe("25.00"); // 2 × 12.50
	});
});
