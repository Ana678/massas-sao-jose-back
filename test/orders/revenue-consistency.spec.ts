import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../../src/database/schema";
import { OrdersService } from "../../src/orders/orders.service";
import { businessTodayString } from "../../src/common/timezone";
import { createTestPool, resetDb, type TestDb } from "../helpers/db";
import { seedBase } from "../helpers/seed";

describe("Dashboard bate com o total do detalhe (desconto VALUE)", () => {
	const pool = createTestPool();
	const db = drizzle(pool, { schema }) as unknown as TestDb;
	const orders = new OrdersService(db);

	beforeEach(async () => {
		await resetDb(db);
	});
	afterAll(async () => {
		await pool.end();
	});

	it("receita do dashboard = total do pedido ENTREGUE com desconto VALUE", async () => {
		const { client, user, product } = await seedBase(db);
		const created = await orders.create(
			{
				clientId: client.id,
				type: "ENCOMENDA",
				status: "ENTREGUE",
				paymentMethod: "dinheiro",
				deliveryFee: 0,
				isPaid: true,
				products: [
					{
						productId: product.id,
						quantity: 10,
						discount: 2,
						discountType: "VALUE",
					},
				],
			} as never,
			user.id,
		);

		const detail = await orders.findOne(created.id);
		const today = businessTodayString();
		const summary = await orders.getDashboardSummary(today, today, today);

		expect(summary.todayRevenue).toBe(Number(detail.total)); // 105.00
	});

	it("total em JS (decimal) bate com o dashboard (SQL) em valor que o float erraria", async () => {
		const { client, user } = await seedBase(db);
		// 1.15 × (1 − 50%) = 0.575 → 0.58 (decimal/SQL). Com float o JS daria 0.57.
		const [product] = await db
			.insert(schema.products)
			.values({
				name: "Item",
				description: "meio centavo",
				price: "1.15",
				investment: "0.50",
			})
			.returning();

		const created = await orders.create(
			{
				clientId: client.id,
				status: "ENTREGUE",
				isPaid: true,
				paymentMethod: "dinheiro",
				deliveryFee: 0,
				products: [
					{
						productId: product.id,
						quantity: 1,
						discount: 50,
						discountType: "PERCENT",
					},
				],
			} as never,
			user.id,
		);

		const detail = await orders.findOne(created.id);
		const today = businessTodayString();
		const summary = await orders.getDashboardSummary(today, today, today);

		expect(detail.total).toBe("0.58");
		expect(summary.todayRevenue).toBe(Number(detail.total));
	});
});
