import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../../src/database/schema";
import { FinanceService } from "../../src/finance/finance.service";
import { ExpensesService } from "../../src/expenses/expenses.service";
import { createTestPool, resetDb, type TestDb } from "../helpers/db";

describe("Finance: soma de despesas", () => {
	const pool = createTestPool();
	const db = drizzle(pool, { schema }) as unknown as TestDb;
	const finance = new FinanceService(db);
	const expenses = new ExpensesService(db);

	beforeEach(async () => {
		await resetDb(db);
	});
	afterAll(async () => {
		await pool.end();
	});

	// Meio-dia no fuso do negócio (−03:00), como o front envia.
	const at = (day: string) => new Date(`${day}T12:00:00-03:00`).toISOString();

	it("não soma despesas excluídas (soft delete) no total, na contagem nem nas categorias", async () => {
		await expenses.create({ description: "Farinha", value: 100, category: "insumos", date: at("2026-09-10") });
		const removed = await expenses.create({ description: "Gás", value: 50, category: "outros", date: at("2026-09-11") });
		await expenses.remove(removed.id);

		const metrics = await finance.getMetrics({ startDate: "2026-09", endDate: "2026-09" } as never);

		expect(metrics.periodTotals.costs).toBe(100);
		expect(metrics.periodTotals.expensesCount).toBe(1);
		expect(metrics.monthsData).toEqual([expect.objectContaining({ key: "2026-09", despesa: 100 })]);
		expect(metrics.categoryData).toEqual([{ key: "insumos", value: 100 }]);
	});

	it("soma centavos sem erro de ponto flutuante", async () => {
		for (const value of [10.1, 20.2, 0.7, 0.01]) {
			await expenses.create({ description: "Item", value, category: "insumos", date: at("2026-09-10") });
		}

		const metrics = await finance.getMetrics({ startDate: "2026-09", endDate: "2026-09" } as never);

		expect(metrics.periodTotals.costs).toBe(31.01);
		expect(metrics.categoryData).toEqual([{ key: "insumos", value: 31.01 }]);
	});

	it("despesa à noite do último dia do mês conta no mês do negócio, não no mês UTC", async () => {
		// 30/09 22:00 em −03:00 = 01/10 01:00 UTC.
		await expenses.create({
			description: "Noite",
			value: 40,
			category: "outros",
			date: new Date("2026-09-30T22:00:00-03:00").toISOString(),
		});

		const sept = await finance.getMetrics({ startDate: "2026-09", endDate: "2026-09" } as never);
		const oct = await finance.getMetrics({ startDate: "2026-10", endDate: "2026-10" } as never);

		expect(sept.periodTotals.costs).toBe(40);
		expect(oct.periodTotals.costs).toBe(0);
	});

	it("timeline separa as despesas por mês e totaliza o período", async () => {
		await expenses.create({ description: "A", value: 10, category: "insumos", date: at("2026-08-05") });
		await expenses.create({ description: "B", value: 25.5, category: "impostos", date: at("2026-10-20") });

		const metrics = await finance.getMetrics({ startDate: "2026-08", endDate: "2026-10" } as never);

		expect(metrics.monthsData.map((m) => [m.key, m.despesa])).toEqual([
			["2026-08", 10],
			["2026-09", 0],
			["2026-10", 25.5],
		]);
		expect(metrics.periodTotals.costs).toBe(35.5);
	});

	it("editar só a descrição não estraga o valor", async () => {
		const created = await expenses.create({ description: "Farinha", value: 12.5, category: "insumos", date: at("2026-09-10") });
		await expenses.update(created.id, { description: "Farinha de trigo" });

		const metrics = await finance.getMetrics({ startDate: "2026-09", endDate: "2026-09" } as never);
		expect(metrics.periodTotals.costs).toBe(12.5);
	});
});
