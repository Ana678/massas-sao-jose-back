import { Injectable, Inject } from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../database/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { GetFinanceMetricsDto } from "./dto/finance-metrics.dto";
import { DRIZZLE_DB } from "@/database/database.module";
import { orderRevenueSql } from "@/common/order-total";

export interface TimelineItem {
	name: string;
	key: string;
	receita: number;
	despesa: number;
	lucro: number;
}

@Injectable()
export class FinanceService {
	constructor(@Inject(DRIZZLE_DB) private db: NodePgDatabase<typeof schema>) {}

	async getMetrics(dto: GetFinanceMetricsDto) {
		const { startDate, endDate } = dto;

		const ordersMetrics = await this.db
			.select({
				month: sql<string>`to_char(${schema.orders.createdAt}, 'YYYY-MM')`,
				revenue: sql<number>`${orderRevenueSql()}::float`,
				count: sql<number>`COUNT(DISTINCT ${schema.orders.id})::int`,
			})
			.from(schema.orders)
			.leftJoin(
				schema.order_products,
				eq(schema.orders.id, schema.order_products.orderId),
			)
			.where(
				and(
					eq(schema.orders.isPaid, true),
					gte(sql`to_char(${schema.orders.createdAt}, 'YYYY-MM')`, startDate),
					lte(sql`to_char(${schema.orders.createdAt}, 'YYYY-MM')`, endDate),
				),
			)
			.groupBy(sql`to_char(${schema.orders.createdAt}, 'YYYY-MM')`);

		// 2. Buscar custos por mês
		const expensesMetrics = await this.db
			.select({
				month: sql<string>`to_char(${schema.expenses.createdAt}, 'YYYY-MM')`,
				costs: sql<number>`coalesce(sum(${schema.expenses.value}), 0)::float`,
				count: sql<number>`count(${schema.expenses.id})::int`,
			})
			.from(schema.expenses)
			.where(
				and(
					gte(sql`to_char(${schema.expenses.createdAt}, 'YYYY-MM')`, startDate),
					lte(sql`to_char(${schema.expenses.createdAt}, 'YYYY-MM')`, endDate),
				),
			)
			.groupBy(sql`to_char(${schema.expenses.createdAt}, 'YYYY-MM')`);

		// 3. Buscar despesas agrupadas por categoria
		const categoryMetrics = await this.db
			.select({
				key: schema.expenses.category,
				value: sql<number>`coalesce(sum(${schema.expenses.value}), 0)::float`,
			})
			.from(schema.expenses)
			.where(
				and(
					gte(sql`to_char(${schema.expenses.createdAt}, 'YYYY-MM')`, startDate),
					lte(sql`to_char(${schema.expenses.createdAt}, 'YYYY-MM')`, endDate),
				),
			)
			.groupBy(schema.expenses.category);
		// 4. Montar a lista contínua de meses para o gráfico de linhas/barras
		const monthsData = this.generateMonthsTimeline(
			startDate,
			endDate,
			ordersMetrics,
			expensesMetrics,
		);

		// 5. Calcular os totais consolidados do período
		const totalRevenue = ordersMetrics.reduce(
			(sum, item) => sum + item.revenue,
			0,
		);
		const totalCosts = expensesMetrics.reduce(
			(sum, item) => sum + item.costs,
			0,
		);
		const totalOrdersCount = ordersMetrics.reduce(
			(sum, item) => sum + item.count,
			0,
		);
		const totalExpensesCount = expensesMetrics.reduce(
			(sum, item) => sum + item.count,
			0,
		);

		return {
			periodTotals: {
				revenue: totalRevenue,
				costs: totalCosts,
				profit: totalRevenue - totalCosts,
				ordersCount: totalOrdersCount,
				expensesCount: totalExpensesCount,
			},
			monthsData,
			categoryData: categoryMetrics,
		};
	}

	// Gera todos os meses no intervalo (mesmo os sem vendas/custos) para evitar buracos no gráfico
	private generateMonthsTimeline(
		start: string,
		end: string,
		ordersData: any[],
		expensesData: any[],
	) {
		const timeline: Array<TimelineItem> = [];
		const [startYear, startMonth] = start.split("-").map(Number);
		const [endYear, endMonth] = end.split("-").map(Number);

		const currentDate = new Date(startYear, startMonth - 1, 1);
		const endDate = new Date(endYear, endMonth - 1, 1);

		while (currentDate <= endDate) {
			const key = currentDate.toISOString().slice(0, 7);

			const orderItem = ordersData.find((o) => o.month === key);
			const expenseItem = expensesData.find((e) => e.month === key);

			const r = orderItem ? orderItem.revenue : 0;
			const e = expenseItem ? expenseItem.costs : 0;

			// Nome do mês formatado localmente (ex: "jan" ou "jan/26")
			const name = currentDate
				.toLocaleDateString("pt-BR", { month: "short" })
				.replace(".", "");

			timeline.push({
				name: name.charAt(0).toUpperCase() + name.slice(1),
				key,
				receita: r,
				despesa: e,
				lucro: r - e,
			});

			currentDate.setMonth(currentDate.getMonth() + 1);
		}

		return timeline;
	}
}
