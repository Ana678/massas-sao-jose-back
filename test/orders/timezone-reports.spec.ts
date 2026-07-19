import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../../src/database/schema";
import { FinanceService } from "../../src/finance/finance.service";
import { OrdersService } from "../../src/orders/orders.service";
import { createTestPool, resetDb, type TestDb } from "../helpers/db";
import { seedBase } from "../helpers/seed";

describe("Fuso do negócio em finance e targetDate (bug #5)", () => {
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

	async function paidOrderAt(instantUtc: string) {
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

	it("finance agrupa no mês do negócio (01/08 01:00 UTC = 31/07 em Brasília → Julho)", async () => {
		// 2026-08-01T01:00Z == 2026-07-31 22:00 no horário de Brasília → mês 2026-07.
		await paidOrderAt("2026-08-01T01:00:00Z");

		const julho = await finance.getMetrics({
			startDate: "2026-07",
			endDate: "2026-07",
		} as never);
		const agosto = await finance.getMetrics({
			startDate: "2026-08",
			endDate: "2026-08",
		} as never);

		expect(julho.periodTotals.ordersCount).toBe(1);
		expect(agosto.periodTotals.ordersCount).toBe(0);
	});

	it("pedido com targetDate cai no dia do negócio informado", async () => {
		const { client, user, product } = await seedBase(db);
		await orders.create(
			{
				clientId: client.id,
				type: "ENCOMENDA",
				status: "PENDENTE",
				paymentMethod: "dinheiro",
				deliveryFee: 0,
				isPaid: false,
				targetDate: "2026-07-10",
				products: [{ productId: product.id, quantity: 1, discount: 0 }],
			} as never,
			user.id,
		);

		const res = await orders.findAll({
			startDate: "2026-07-10",
			endDate: "2026-07-10",
		} as never);

		expect(res.total).toBe(1);
	});
});
