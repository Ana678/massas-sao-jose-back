import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../../src/database/schema";
import { OrdersService } from "../../src/orders/orders.service";
import { ProductsService } from "../../src/products/products.service";
import { createTestPool, resetDb, type TestDb } from "../helpers/db";
import { seedBase } from "../helpers/seed";

describe("Edição de pedido x preço congelado (bug #2)", () => {
	const pool = createTestPool();
	const db = drizzle(pool, { schema }) as unknown as TestDb;
	const orders = new OrdersService(db);
	const products = new ProductsService(db);

	beforeEach(async () => {
		await resetDb(db);
	});

	afterAll(async () => {
		await pool.end();
	});

	function makeOrder(clientId: string, items: Array<{ productId: string; quantity: number }>) {
		return {
			clientId,
			type: "ENCOMENDA",
			status: "PENDENTE",
			paymentMethod: "dinheiro",
			deliveryFee: 0,
			isPaid: false,
			products: items.map((i) => ({ ...i, discount: 0 })),
		} as never;
	}

	it("editar um item que já existia preserva o preço congelado (não repreça)", async () => {
		const { client, user, product } = await seedBase(db);

		const created = await orders.create(
			makeOrder(client.id, [{ productId: product.id, quantity: 10 }]),
			user.id,
		);

		// Preço do produto sobe DEPOIS do pedido.
		await products.update(product.id, {
			name: "Massa fresca",
			description: "500g caseira",
			price: "20.00",
			investment: "5.00",
		} as never);

		// Edição só muda a quantidade — NÃO manda preço.
		await orders.update(created.id, {
			products: [{ productId: product.id, quantity: 5 }],
		} as never);

		const order = await orders.findOne(created.id);
		expect(order.products).toHaveLength(1);
		expect(order.products[0].price).toBe("12.50"); // congelado, não 20.00
		expect(order.products[0].quantity).toBe("5");
		expect(order.total).toBe("62.50"); // 5 × 12.50
	});

	it("adicionar um item novo na edição usa o preço atual do produto", async () => {
		const { client, user, product } = await seedBase(db);

		const [product2] = await db
			.insert(schema.products)
			.values({
				name: "Ravioli",
				description: "queijo",
				price: "8.00",
				investment: "3.00",
			})
			.returning();

		const created = await orders.create(
			makeOrder(client.id, [{ productId: product.id, quantity: 10 }]),
			user.id,
		);

		// Edição adiciona o product2 (novo no pedido) e mantém o product1.
		await orders.update(created.id, {
			products: [
				{ productId: product.id, quantity: 10 },
				{ productId: product2.id, quantity: 3 },
			],
		} as never);

		const order = await orders.findOne(created.id);
		const byId = Object.fromEntries(order.products.map((p) => [p.id, p.price]));
		expect(byId[product.id]).toBe("12.50"); // já existia → congelado
		expect(byId[product2.id]).toBe("8.00"); // novo → preço atual
	});
});
