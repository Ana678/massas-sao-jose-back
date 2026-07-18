import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../../src/database/schema";
import { FinanceService } from "../../src/finance/finance.service";
import { OrdersService } from "../../src/orders/orders.service";
import { createTestPool, resetDb, type TestDb } from "../helpers/db";
import { seedBase } from "../helpers/seed";

describe("Finance bate com o total do detalhe (desconto VALUE)", () => {
	const pool = createTestPool();
	const db = drizzle(pool, { schema }) as unknown as TestDb;
	const orders = new OrdersService(db);
	const finance = new FinanceService(db);

	beforeEach(async () => {
		await resetDb(db);
	});
	afterAll(async () => {
		await pool.end();
	});

	it("receita do finance = total do pedido pago com desconto VALUE", async () => {
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
		const month = new Date().toISOString().slice(0, 7); // YYYY-MM
		const metrics = await finance.getMetrics({
			startDate: month,
			endDate: month,
		} as never);

		expect(metrics.periodTotals.revenue).toBe(Number(detail.total)); // 105.00
	});
});
