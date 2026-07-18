import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../../src/database/schema";
import { OrdersService } from "../../src/orders/orders.service";
import { createTestPool, resetDb, type TestDb } from "../helpers/db";
import { seedBase } from "../helpers/seed";

describe("Pedido com desconto por valor/percentual (persistência + validação)", () => {
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

	it("grava discountType VALUE no item", async () => {
		const { client, user, product } = await seedBase(db);
		const created = await orders.create(
			order(client.id, {
				productId: product.id,
				discount: 2,
				discountType: "VALUE",
			}),
			user.id,
		);
		const [row] = await db
			.select()
			.from(schema.order_products)
			.where(eq(schema.order_products.orderId, created.id));
		expect(row.discountType).toBe("VALUE");
		expect(row.discount).toBe("2");
	});

	it("default é PERCENT quando não informado", async () => {
		const { client, user, product } = await seedBase(db);
		const created = await orders.create(
			order(client.id, { productId: product.id, discount: 10 }),
			user.id,
		);
		const [row] = await db
			.select()
			.from(schema.order_products)
			.where(eq(schema.order_products.orderId, created.id));
		expect(row.discountType).toBe("PERCENT");
	});

	it("rejeita PERCENT > 100", async () => {
		const { client, user, product } = await seedBase(db);
		await expect(
			orders.create(
				order(client.id, {
					productId: product.id,
					discount: 150,
					discountType: "PERCENT",
				}),
				user.id,
			),
		).rejects.toThrow();
	});

	it("rejeita VALUE maior que o preço unitário", async () => {
		const { client, user, product } = await seedBase(db);
		await expect(
			orders.create(
				order(client.id, {
					productId: product.id,
					discount: 999,
					discountType: "VALUE",
				}),
				user.id,
			),
		).rejects.toThrow();
	});
});
