import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../../src/database/schema";
import { OrdersService } from "../../src/orders/orders.service";
import { ProductsService } from "../../src/products/products.service";
import { createTestPool, resetDb, type TestDb } from "../helpers/db";
import { seedBase } from "../helpers/seed";

describe("Exclusão de produto x histórico de pedidos (bug #1)", () => {
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

	it("preserva o item e o preço congelado do pedido após o produto ser excluído", async () => {
		const { client, user, product } = await seedBase(db);

		// Pedido feito com o preço da época (12.50).
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

		// Depois o preço muda e o produto é excluído do catálogo.
		await products.update(product.id, {
			name: "Massa fresca",
			description: "500g caseira",
			price: "20.00",
			investment: "5.00",
		} as never);
		await products.remove(product.id);

		// O pedido antigo NÃO pode perder o item nem o preço congelado.
		const order = await orders.findOne(created.id);

		expect(order.products).toHaveLength(1);
		expect(order.products[0].price).toBe("12.50");
		expect(order.total).toBe("125.00");
	});
});
