import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../../src/database/schema";
import { OrdersService } from "../../src/orders/orders.service";
import { createTestPool, resetDb, type TestDb } from "../helpers/db";
import { seedBase } from "../helpers/seed";

describe("Fuso horário do negócio (UTC−3) nos cortes de data (bug #5)", () => {
	const pool = createTestPool();
	const db = drizzle(pool, { schema }) as unknown as TestDb;
	const orders = new OrdersService(db);

	beforeEach(async () => {
		await resetDb(db);
	});
	afterAll(async () => {
		await pool.end();
	});

	async function orderCreatedAt(instantUtc: string) {
		const { client, user, product } = await seedBase(db);
		const created = await orders.create(
			{
				clientId: client.id,
				type: "ENCOMENDA",
				status: "ENTREGUE",
				paymentMethod: "dinheiro",
				deliveryFee: 0,
				isPaid: true,
				products: [{ productId: product.id, quantity: 1, discount: 0 }],
			} as never,
			user.id,
		);
		await db
			.update(schema.orders)
			.set({ createdAt: new Date(instantUtc) })
			.where(eq(schema.orders.id, created.id));
		return created.id;
	}

	it("pedido às 01:30 UTC (22:30 de Brasília do dia anterior) conta no dia de Brasília", async () => {
		// 2026-07-10T01:30Z == 2026-07-09 22:30 no horário de Brasília (UTC−3).
		await orderCreatedAt("2026-07-10T01:30:00Z");

		const res = await orders.findAll({
			startDate: "2026-07-09",
			endDate: "2026-07-09",
		} as never);

		expect(res.total).toBe(1);
	});

	it("pedido às 02:00 UTC do dia 10 NÃO conta no dia 10 de Brasília (ainda é dia 9)", async () => {
		await orderCreatedAt("2026-07-10T02:00:00Z");

		const res = await orders.findAll({
			startDate: "2026-07-10",
			endDate: "2026-07-10",
		} as never);

		expect(res.total).toBe(0);
	});
});
