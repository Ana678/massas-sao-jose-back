import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../../src/database/schema";
import { OrdersService } from "../../src/orders/orders.service";
import { createTestPool, resetDb, type TestDb } from "../helpers/db";
import { seedBase } from "../helpers/seed";

describe("Estimativa de produção: último pedido por cliente (não média)", () => {
	const pool = createTestPool();
	const db = drizzle(pool, { schema }) as unknown as TestDb;
	const orders = new OrdersService(db);

	beforeEach(async () => {
		await resetDb(db);
	});
	afterAll(async () => {
		await pool.end();
	});

	function mkOrder(
		clientId: string,
		productId: string,
		quantity: number,
		status: string,
		targetDate?: string,
	) {
		return {
			clientId,
			type: "ENCOMENDA",
			status,
			paymentMethod: "dinheiro",
			deliveryFee: 0,
			isPaid: status === "ENTREGUE",
			products: [{ productId, quantity, discount: 0, discountType: "PERCENT" }],
			...(targetDate ? { targetDate } : {}),
		} as never;
	}

	const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
		.toISOString()
		.slice(0, 10);

	it("firmes + último pedido ENTREGUE de cada cliente SEM pedido firme (sem média ÷4, sem contar 2×)", async () => {
		const { city, user, product } = await seedBase(db);
		const [clientA] = await db
			.select()
			.from(schema.clients)
			.limit(1)
			.execute();
		const [clientB] = await db
			.insert(schema.clients)
			.values({
				name: "Cliente B",
				phone: "84900000000",
				cityId: city.id,
				state: "RN",
				address: "Rua B, 456",
			})
			.returning();

		// A tem pedido FIRME (qty 5) → entra em firmOrders.
		// A também tem um ENTREGUE grande (qty 100), que NÃO deve ser contado no
		// histórico, pois A já está no firme (senão conta 2×).
		await orders.create(mkOrder(clientA.id, product.id, 5, "PENDENTE"), user.id);
		await orders.create(
			mkOrder(clientA.id, product.id, 100, "ENTREGUE"),
			user.id,
		);

		// B não tem pedido firme. Tem dois ENTREGUE: antigo (qty 3) e o mais recente
		// (qty 7). Só o ÚLTIMO (7) deve contar.
		await orders.create(
			mkOrder(clientB.id, product.id, 3, "ENTREGUE", yesterday),
			user.id,
		);
		await orders.create(
			mkOrder(clientB.id, product.id, 7, "ENTREGUE"),
			user.id,
		);

		const result = await orders.getProductionEstimate("2026-07-19", [
			city.name,
		]);
		type EstimateLine = {
			productId: string;
			firmOrders: number;
			lastOrderVolume: number;
			suggestedProduction: number;
		};
		const line = (result.estimate as EstimateLine[]).find(
			(e) => e.productId === product.id,
		);

		expect(line).toBeDefined();
		expect(line?.firmOrders).toBe(5); // só o PENDENTE de A
		expect(line?.lastOrderVolume).toBe(7); // último pedido de B; A excluído (tem firme)
		expect(line?.suggestedProduction).toBe(12); // 5 + 7
	});
});
