import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../../src/database/schema";
import { OrdersService } from "../../src/orders/orders.service";
import { createTestPool, resetDb, type TestDb } from "../helpers/db";
import { seedBase } from "../helpers/seed";

describe("Total do Order agregado com desconto VALUE/PERCENT", () => {
	const pool = createTestPool();
	const db = drizzle(pool, { schema }) as unknown as TestDb;
	const orders = new OrdersService(db);

	beforeEach(async () => {
		await resetDb(db);
	});
	afterAll(async () => {
		await pool.end();
	});

	function order(clientId: string, item: Record<string, unknown>) {
		return {
			clientId,
			type: "ENCOMENDA",
			status: "PENDENTE",
			paymentMethod: "dinheiro",
			deliveryFee: 0,
			isPaid: false,
			products: [{ quantity: 10, discount: 0, ...item }],
		} as never;
	}

	it("VALUE por unidade: 10 × (12.50 − 2) = 105.00", async () => {
		const { client, user, product } = await seedBase(db);
		const created = await orders.create(
			order(client.id, {
				productId: product.id,
				discount: 2,
				discountType: "VALUE",
			}),
			user.id,
		);
		const found = await orders.findOne(created.id);
		expect(found.total).toBe("105.00");
		expect(found.products[0].discountType).toBe("VALUE");
	});

	it("retrocompat PERCENT: 10 × (12.50 × 0.9) = 112.50", async () => {
		const { client, user, product } = await seedBase(db);
		const created = await orders.create(
			order(client.id, { productId: product.id, discount: 10 }),
			user.id,
		);
		const found = await orders.findOne(created.id);
		expect(found.total).toBe("112.50");
		expect(found.products[0].discountType).toBe("PERCENT");
	});
});
