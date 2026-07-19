import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../../src/database/schema";
import { OrdersService } from "../../src/orders/orders.service";
import { createTestPool, resetDb, type TestDb } from "../helpers/db";
import { seedBase } from "../helpers/seed";

describe("Paginação de pedidos é estável com createdAt idêntico", () => {
	const pool = createTestPool();
	const db = drizzle(pool, { schema }) as unknown as TestDb;
	const orders = new OrdersService(db);

	beforeEach(async () => {
		await resetDb(db);
	});
	afterAll(async () => {
		await pool.end();
	});

	it("paginando 1 a 1, os 3 pedidos com mesmo createdAt saem sem repetir nem pular", async () => {
		const { client, user } = await seedBase(db);
		const sameInstant = new Date("2026-07-19T12:00:00.000Z");
		const ids = [
			"00000000-0000-7000-8000-000000000001",
			"00000000-0000-7000-8000-000000000002",
			"00000000-0000-7000-8000-000000000003",
		];

		for (const id of ids) {
			await db.insert(schema.orders).values({
				id,
				clientId: client.id,
				type: "ENCOMENDA",
				status: "PENDENTE",
				deliveryFee: "0",
				paymentMethod: "dinheiro",
				isPaid: false,
				createdBy: user.id,
				createdAt: sameInstant,
				updatedAt: sameInstant,
			});
		}

		const seen: string[] = [];
		for (let page = 1; page <= 3; page++) {
			const res = await orders.findAll({ page, limit: 1 });
			expect(res.data).toHaveLength(1);
			seen.push(res.data[0].id);
		}

		// Ordem determinística por id desc (desempate), sem repetição.
		expect(seen).toEqual([ids[2], ids[1], ids[0]]);
		expect(new Set(seen).size).toBe(3);
	});
});
