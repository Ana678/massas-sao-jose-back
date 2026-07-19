import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { businessTodayString } from "../../src/common/timezone";
import * as schema from "../../src/database/schema";
import { FinanceService } from "../../src/finance/finance.service";
import { OrdersService } from "../../src/orders/orders.service";
import { createTestPool, resetDb, type TestDb } from "../helpers/db";
import { seedBase } from "../helpers/seed";

describe("Finance mede receita por ENTREGUE, não por isPaid (bug #4)", () => {
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

	it("conta pedido ENTREGUE não pago e ignora pedido pago não entregue", async () => {
		const { client, user, product } = await seedBase(db);

		// A: ENTREGUE, NÃO pago — DEVE contar. 2 × 12.50 = 25.00
		await orders.create(
			{
				clientId: client.id,
				status: "ENTREGUE",
				isPaid: false,
				paymentMethod: "dinheiro",
				deliveryFee: 0,
				products: [{ productId: product.id, quantity: 2, discount: 0 }],
			} as never,
			user.id,
		);

		// B: PENDENTE, pago — NÃO deve contar. 3 × 12.50 = 37.50
		await orders.create(
			{
				clientId: client.id,
				status: "PENDENTE",
				isPaid: true,
				paymentMethod: "dinheiro",
				deliveryFee: 0,
				products: [{ productId: product.id, quantity: 3, discount: 0 }],
			} as never,
			user.id,
		);

		const month = businessTodayString().slice(0, 7);
		const metrics = await finance.getMetrics({
			startDate: month,
			endDate: month,
		} as never);

		expect(metrics.periodTotals.revenue).toBe(25); // só o ENTREGUE
		expect(metrics.periodTotals.ordersCount).toBe(1);
	});
});
