import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import type { CreateOrderDto } from "./dto/create-order.dto";
import type { UpdateOrderDto } from "./dto/update-order.dto";
import * as schema from "../database/schema";
import { DRIZZLE_DB } from "../database/database.module";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
	eq,
	isNull,
	and,
	inArray,
	desc,
	gte,
	sql,
	ilike,
	ne,
	or,
	lte,
	gt,
	SQL,
} from "drizzle-orm";
import { DELIVERY_SCHEDULE } from "@/common/constants/delivery-schedule";
import {
	assertValidDiscount,
	netUnitPrice,
	orderRevenueSql,
	type DiscountType,
} from "@/common/order-total";
import { ConfirmDeliveryDto } from "./dto/confirm-delivery.dto";
import { FindOrdersByCitiesDto } from "./dto/find-orders-by-cities.dto";
import { GetOrdersFilterDto } from "./dto/get-orders-filter.dto";

@Injectable()
export class OrdersService {
	constructor(@Inject(DRIZZLE_DB) private db: NodePgDatabase<typeof schema>) {}

	async create(createOrderDto: CreateOrderDto, userId: string) {
		const {
			clientId,
			deliveryFee,
			isPaid,
			paymentMethod,
			products,
			type,
			status,
			targetDate,
		} = createOrderDto;

		return this.db.transaction(async (tx) => {
			const productIds = products.map((product) => product.productId);

			const [clientList, selectedProducts] = await Promise.all([
				tx
					.select({ id: schema.clients.id })
					.from(schema.clients)
					.where(
						and(
							eq(schema.clients.id, clientId),
							isNull(schema.clients.deletedAt),
						),
					),

				tx
					.select({ id: schema.products.id, price: schema.products.price })
					.from(schema.products)
					.where(
						and(
							isNull(schema.products.deletedAt),
							inArray(schema.products.id, productIds),
						),
					),
			]);

			if (!clientList.length) {
				throw new NotFoundException("Cliente não encontrado.");
			}

			if (selectedProducts.length !== productIds.length) {
				throw new NotFoundException(
					"Um ou mais produtos não foram encontrados.",
				);
			}

			const [order] = await tx
				.insert(schema.orders)
				.values({
					clientId,
					type,
					paymentMethod,
					isPaid,
					status,
					deliveryFee: String(deliveryFee),
					createdAt: targetDate
						? new Date(
								`${targetDate}T${new Date().toISOString().split("T")[1]}`,
							)
						: undefined,
					createdBy: userId,
				})
				.returning();

			const orderProducts = await tx
				.insert(schema.order_products)
				.values(
					products.map((product) => {
						const selectedProduct = selectedProducts.find(
							(item) => item.id === product.productId,
						);

						if (!selectedProduct) {
							throw new NotFoundException(
								"Um ou mais produtos não foram encontrados.",
							);
						}

						const discountType = product.discountType ?? "PERCENT";
						assertValidDiscount(
							Number(selectedProduct.price),
							Number(product.discount || 0),
							discountType,
						);

						return {
							orderId: order.id,
							productId: product.productId,
							quantity: String(product.quantity),
							unitPrice: String(selectedProduct.price),
							discount: String(product.discount || 0),
							discountType,
						};
					}),
				)
				.returning();

			return { ...order, products: orderProducts };
		});
	}

	async findAll(filters: GetOrdersFilterDto) {
		const { page = 1, limit = 50 } = filters;
		const offset = (page - 1) * limit;

		const whereClause = this.buildWhereConditions(filters);

		const requiresClientJoin =
			!!filters.search || (!!filters.city && filters.city !== "todas");

		let countQuery: any = this.db
			.select({ count: sql<number>`count(${schema.orders.id})` })
			.from(schema.orders);

		let idsQuery: any = this.db
			.select({ id: schema.orders.id })
			.from(schema.orders);

		if (requiresClientJoin) {
			countQuery = countQuery
				.leftJoin(schema.clients, eq(schema.orders.clientId, schema.clients.id))
				.leftJoin(schema.cities, eq(schema.clients.cityId, schema.cities.id));

			idsQuery = idsQuery
				.leftJoin(schema.clients, eq(schema.orders.clientId, schema.clients.id))
				.leftJoin(schema.cities, eq(schema.clients.cityId, schema.cities.id));
		}

		const [{ count }] = await countQuery.where(whereClause);

		const paginatedOrders = await idsQuery
			.where(whereClause)
			.orderBy(desc(schema.orders.createdAt))
			.limit(limit)
			.offset(offset);

		if (!paginatedOrders.length) {
			return { data: [], total: Number(count), page, limit };
		}

		const orderIds = paginatedOrders.map((o: any) => o.id);

		const ordersData = await this.getBaseOrderQuery()
			.where(inArray(schema.orders.id, orderIds))
			.orderBy(desc(schema.orders.createdAt));

		return {
			data: this.aggregateOrderRows(ordersData),
			total: Number(count),
			page,
			limit,
		};
	}

	private buildWhereConditions(filters: GetOrdersFilterDto) {
		const conditions: (SQL<unknown> | undefined)[] = [
			isNull(schema.orders.deletedAt),
		];

		if (filters.startDate)
			conditions.push(
				gte(
					schema.orders.createdAt,
					new Date(`${filters.startDate}T00:00:00Z`),
				),
			);
		if (filters.endDate)
			conditions.push(
				lte(schema.orders.createdAt, new Date(`${filters.endDate}T23:59:59Z`)),
			);

		if (filters.paymentMethod && filters.paymentMethod !== "todos") {
			conditions.push(eq(schema.orders.paymentMethod, filters.paymentMethod));
		}

		if (filters.paymentFilter === "pago") {
			conditions.push(eq(schema.orders.isPaid, true));
		} else if (filters.paymentFilter === "pendente") {
			// 2. Remova o '!' daqui. O linter vai ficar feliz!
			conditions.push(
				or(
					ne(schema.orders.status, "ENTREGUE"),
					eq(schema.orders.isPaid, false),
				),
			);
		} else if (filters.paymentFilter === "agendados") {
			const today = new Date();
			today.setUTCHours(0, 0, 0, 0);
			conditions.push(gt(schema.orders.createdAt, today));
		}

		if (filters.city && filters.city !== "todas") {
			conditions.push(eq(schema.cities.name, filters.city));
		}

		if (filters.search) {
			conditions.push(ilike(schema.clients.name, `%${filters.search}%`));
		}

		return and(...conditions);
	}

	async findByClient(clientId: string) {
		const [client] = await this.db
			.select({ id: schema.clients.id })
			.from(schema.clients)
			.where(
				and(eq(schema.clients.id, clientId), isNull(schema.clients.deletedAt)),
			);

		if (!client) {
			throw new NotFoundException("Cliente não encontrado.");
		}

		const ordersData = await this.getBaseOrderQuery()
			.where(
				and(
					eq(schema.orders.clientId, clientId),
					isNull(schema.orders.deletedAt),
				),
			)
			.orderBy(desc(schema.orders.createdAt));

		return this.aggregateOrderRows(ordersData);
	}

	async findOne(id: string) {
		const rows = await this.getBaseOrderQuery().where(
			and(eq(schema.orders.id, id), isNull(schema.orders.deletedAt)),
		);

		if (!rows.length) {
			throw new NotFoundException("Pedido não encontrado.");
		}

		return this.aggregateOrderRows(rows)[0];
	}

	async update(id: string, updateOrderDto: UpdateOrderDto) {
		return this.db.transaction(async (tx) => {
			const [order] = await tx
				.select({ id: schema.orders.id, clientId: schema.orders.clientId })
				.from(schema.orders)
				.where(and(eq(schema.orders.id, id), isNull(schema.orders.deletedAt)));

			if (!order) {
				throw new NotFoundException("Pedido não encontrado.");
			}

			const updateData: any = {
				updatedAt: new Date(),
			};

			if (updateOrderDto.status !== undefined)
				updateData.status = updateOrderDto.status;
			if (updateOrderDto.type !== undefined)
				updateData.type = updateOrderDto.type;
			if (updateOrderDto.paymentMethod !== undefined)
				updateData.paymentMethod = updateOrderDto.paymentMethod;
			if (updateOrderDto.isPaid !== undefined)
				updateData.isPaid = updateOrderDto.isPaid;
			if (updateOrderDto.deliveryFee !== undefined)
				updateData.deliveryFee = String(updateOrderDto.deliveryFee);
			if (updateOrderDto.targetDate !== undefined)
				updateData.createdAt = new Date(
					`${updateOrderDto.targetDate}T${new Date().toISOString().split("T")[1]}`,
				);

			await tx
				.update(schema.orders)
				.set(updateData)
				.where(eq(schema.orders.id, id));

			if (updateOrderDto.products && updateOrderDto.products.length > 0) {
				const productIds = updateOrderDto.products.map((p) => p.productId);

				const selectedProducts = await tx
					.select({
						id: schema.products.id,
						price: schema.products.price,
					})
					.from(schema.products)
					.where(
						and(
							isNull(schema.products.deletedAt),
							inArray(schema.products.id, productIds),
						),
					);

				if (selectedProducts.length !== productIds.length) {
					throw new NotFoundException(
						"Um ou mais produtos não foram encontrados.",
					);
				}

				// Preço é do servidor: itens que JÁ existiam no pedido mantêm o preço
				// congelado (snapshot); só itens novos pegam o preço atual do produto.
				const existingItems = await tx
					.select({
						productId: schema.order_products.productId,
						unitPrice: schema.order_products.unitPrice,
					})
					.from(schema.order_products)
					.where(eq(schema.order_products.orderId, id));

				const frozenPriceByProduct = new Map(
					existingItems.map((item) => [item.productId, item.unitPrice]),
				);

				await tx
					.delete(schema.order_products)
					.where(eq(schema.order_products.orderId, id));

				await tx.insert(schema.order_products).values(
					updateOrderDto.products.map((product) => {
						const selectedProduct = selectedProducts.find(
							(p) => p.id === product.productId,
						);

						const resolvedUnitPrice =
							frozenPriceByProduct.get(product.productId) ??
							String(selectedProduct!.price);
						const discountType = product.discountType ?? "PERCENT";
						assertValidDiscount(
							Number(resolvedUnitPrice),
							Number(product.discount || 0),
							discountType,
						);

						return {
							orderId: id,
							productId: product.productId,
							quantity: String(product.quantity),
							unitPrice: resolvedUnitPrice,
							discount: String(product.discount || 0),
							discountType,
						};
					}),
				);
			}

			return this.findOne(id);
		});
	}

	async remove(id: string) {
		return this.db.transaction(async (tx) => {
			const [order] = await tx
				.select({ id: schema.orders.id })
				.from(schema.orders)
				.where(and(eq(schema.orders.id, id), isNull(schema.orders.deletedAt)));

			if (!order) {
				throw new NotFoundException("Pedido não encontrado.");
			}

			// Soft-delete: NÃO apagar os itens. O pedido some das listagens (elas filtram
			// por isNull(deletedAt)), mas os itens congelados ficam preservados/recuperáveis.
			await tx
				.update(schema.orders)
				.set({
					deletedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(schema.orders.id, id));

			return { message: "Pedido removido com sucesso." };
		});
	}

	async findByCities(dto: FindOrdersByCitiesDto) {
		const { cityNames, targetDate } = dto;

		const cities = await this.db
			.select({ id: schema.cities.id, name: schema.cities.name })
			.from(schema.cities)
			.where(
				and(
					inArray(schema.cities.name, cityNames),
					isNull(schema.cities.deletedAt),
				),
			);

		if (cities.length !== cityNames.length) {
			throw new NotFoundException("Uma ou mais cidades não foram encontradas.");
		}

		const cityIds = cities.map((city) => city.id);

		const cutoffDate = targetDate
			? new Date(`${targetDate}T23:59:59Z`)
			: new Date();

		const latestOrders = await this.db
			.selectDistinctOn([schema.orders.clientId], { id: schema.orders.id })
			.from(schema.orders)
			.innerJoin(schema.clients, eq(schema.orders.clientId, schema.clients.id))
			.where(
				and(
					isNull(schema.orders.deletedAt),
					inArray(schema.clients.cityId, cityIds),
					sql`${schema.orders.createdAt} <= ${cutoffDate}`,
				),
			)
			.orderBy(
				schema.orders.clientId,
				desc(schema.orders.createdAt),
				desc(schema.orders.id),
			);

		const latestOrderIds = latestOrders.map((order) => order.id);

		if (!latestOrderIds.length) return [];

		const ordersData = await this.getBaseOrderQuery()
			.where(inArray(schema.orders.id, latestOrderIds))
			.orderBy(desc(schema.orders.createdAt));

		return this.aggregateOrderRows(ordersData);
	}

	private getBaseOrderQuery() {
		return this.db
			.select({
				id: schema.orders.id,
				clientId: schema.orders.clientId,
				clientName: schema.clients.name,
				type: schema.orders.type,
				status: schema.orders.status,
				paymentMethod: schema.orders.paymentMethod,
				deliveryFee: schema.orders.deliveryFee,
				isPaid: schema.orders.isPaid,
				createdAt: schema.orders.createdAt,
				productId: schema.products.id,
				productName: schema.products.name,
				quantity: schema.order_products.quantity,
				unitPrice: schema.order_products.unitPrice,
				discount: schema.order_products.discount,
				discountType: schema.order_products.discountType,
			})
			.from(schema.orders)
			.leftJoin(schema.clients, eq(schema.orders.clientId, schema.clients.id))
			.leftJoin(
				schema.order_products,
				eq(schema.orders.id, schema.order_products.orderId),
			)
			.leftJoin(
				schema.products,
				eq(schema.order_products.productId, schema.products.id),
			);
	}

	private aggregateOrderRows(rows: any[]) {
		const ordersMap = new Map<
			string,
			{
				id: string;
				clientId: string;
				clientName: string | null;
				type: string;
				status: string;
				paymentMethod: string;
				deliveryFee: string;
				isPaid: boolean;
				createdAt: Date;
				products: Array<{
					id: string | null;
					name: string | null;
					price: string | null;
					quantity: string | null;
					discount: string | null;
					discountType: string | null;
				}>;
				total: number;
			}
		>();

		for (const row of rows) {
			if (!ordersMap.has(row.id)) {
				ordersMap.set(row.id, {
					id: row.id,
					clientId: row.clientId,
					clientName: row.clientName,
					type: row.type,
					status: row.status,
					paymentMethod: row.paymentMethod,
					deliveryFee: row.deliveryFee,
					isPaid: row.isPaid,
					createdAt: row.createdAt,
					products: [],
					total: 0,
				});
			}

			const order = ordersMap.get(row.id);
			if (!order) continue;

			if (row.productId) {
				order.products.push({
					id: row.productId,
					name: row.productName,
					price: row.unitPrice,
					quantity: row.quantity,
					discount: row.discount,
					discountType: row.discountType,
				});
			}
		}

		return Array.from(ordersMap.values()).map((order) => {
			const total = order.products
				.reduce((sum, product) => {
					const net = netUnitPrice(
						Number(product.price || 0),
						Number(product.discount || 0),
						(product.discountType as DiscountType) || "PERCENT",
					);

					return sum + Number(product.quantity || 0) * net;
				}, 0)
				.toFixed(2);

			return { ...order, total };
		});
	}

	async getProductionEstimate(targetDate: string, overrideCities?: string[]) {
		const targetCities = overrideCities?.length
			? overrideCities
			: this.getCitiesForDate(targetDate);
		if (!targetCities.length)
			return {
				message: "Não há rotas programadas para este dia.",
				estimate: [],
			};

		const cities = await this.db
			.select({ id: schema.cities.id })
			.from(schema.cities)
			.where(
				and(
					inArray(schema.cities.name, targetCities),
					isNull(schema.cities.deletedAt),
				),
			);

		if (!cities.length)
			return { message: "Cidades não encontradas no banco.", estimate: [] };
		const cityIds = cities.map((c) => c.id);

		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

		const [firmOrders, historicalSales, allProducts] = await Promise.all([
			this.getAggregatedVolume(cityIds, ["PENDENTE", "EM_PRODUCAO"]),
			this.getAggregatedVolume(cityIds, ["ENTREGUE"], thirtyDaysAgo),
			this.db
				.select({ id: schema.products.id, name: schema.products.name })
				.from(schema.products)
				.where(isNull(schema.products.deletedAt)),
		]);

		const estimate = allProducts
			.map((p) => {
				const firm = Number(
					firmOrders.find((f) => f.productId === p.id)?.quantity || 0,
				);
				const hist = Math.ceil(
					Number(
						historicalSales.find((h) => h.productId === p.id)?.quantity || 0,
					) / 4,
				);

				return {
					productId: p.id,
					productName: p.name,
					firmOrders: firm,
					historicalAverage: hist,
					suggestedProduction: firm + hist,
				};
			})
			.filter((item) => item.suggestedProduction > 0)
			.sort((a, b) => b.suggestedProduction - a.suggestedProduction);

		return { targetCities, estimate };
	}

	private getCitiesForDate(dateString: string): string[] {
		const dayOfWeek = new Date(`${dateString}T12:00:00Z`).getUTCDay();
		return DELIVERY_SCHEDULE[dayOfWeek] || [];
	}

	private getAggregatedVolume(
		cityIds: string[],
		statuses: any[],
		sinceDate?: Date,
	) {
		const conditions = [
			inArray(schema.clients.cityId, cityIds),
			inArray(schema.orders.status, statuses),
			isNull(schema.orders.deletedAt),
		];

		if (sinceDate) conditions.push(gte(schema.orders.createdAt, sinceDate));

		return this.db
			.select({
				productId: schema.products.id,
				quantity: sql<number>`sum(CAST(${schema.order_products.quantity} AS numeric))`,
			})
			.from(schema.orders)
			.innerJoin(schema.clients, eq(schema.orders.clientId, schema.clients.id))
			.innerJoin(
				schema.order_products,
				eq(schema.orders.id, schema.order_products.orderId),
			)
			.where(and(...conditions))
			.groupBy(schema.products.id);
	}

	async confirmDelivery(dto: ConfirmDeliveryDto, userId: string) {
		const { clientId, products } = dto;

		const orderId = await this.db.transaction(async (tx) => {
			const [client] = await tx
				.select({ id: schema.clients.id })
				.from(schema.clients)
				.where(
					and(
						eq(schema.clients.id, clientId),
						isNull(schema.clients.deletedAt),
					),
				);

			if (!client) throw new NotFoundException("Cliente não encontrado.");

			const [existingOrder] = await tx
				.select({ id: schema.orders.id })
				.from(schema.orders)
				.where(
					and(
						eq(schema.orders.clientId, dto.clientId),
						inArray(schema.orders.status, [
							"PENDENTE",
							"EM_PRODUCAO",
							"EM_ROTA",
						]),
						isNull(schema.orders.deletedAt),
					),
				)
				.orderBy(desc(schema.orders.createdAt))
				.limit(1);

			let finalOrderId: string;

			if (existingOrder) {
				finalOrderId = existingOrder.id;
				await tx
					.update(schema.orders)
					.set({
						status: "ENTREGUE",
						paymentMethod: dto.paymentMethod,
						isPaid: dto.isPaid,
						deliveryFee: String(dto.deliveryFee || 0),
						updatedAt: new Date(),
					})
					.where(eq(schema.orders.id, finalOrderId));
			} else {
				const [newOrder] = await tx
					.insert(schema.orders)
					.values({
						clientId: dto.clientId,
						type: "PRONTA_ENTREGA",
						status: "ENTREGUE",
						paymentMethod: dto.paymentMethod,
						isPaid: dto.isPaid,
						deliveryFee: String(dto.deliveryFee || 0),
						createdBy: userId,
					})
					.returning({ id: schema.orders.id });

				finalOrderId = newOrder.id;
			}

			if (products && products.length > 0) {
				const productIds = products.map((p) => p.productId);

				const selectedProducts = await tx
					.select({ id: schema.products.id, price: schema.products.price })
					.from(schema.products)
					.where(
						and(
							isNull(schema.products.deletedAt),
							inArray(schema.products.id, productIds),
						),
					);

				await tx
					.delete(schema.order_products)
					.where(eq(schema.order_products.orderId, finalOrderId));

				await tx.insert(schema.order_products).values(
					products.map((product) => {
						const selected = selectedProducts.find(
							(p) => p.id === product.productId,
						);
						const discountType = product.discountType ?? "PERCENT";
						assertValidDiscount(
							Number(selected!.price),
							Number(product.discount || 0),
							discountType,
						);
						return {
							orderId: finalOrderId,
							productId: product.productId,
							quantity: String(product.quantity),
							unitPrice: String(selected!.price),
							discount: String(product.discount || 0),
							discountType,
						};
					}),
				);
			}

			return finalOrderId;
		});

		return this.findOne(orderId);
	}

	async getDashboardSummary(
		monthStart: string,
		monthEnd: string,
		todayStr: string,
	) {
		const getRevenue = async (conditions: any[]) => {
			const [result] = await this.db
				.select({
					total: orderRevenueSql(),
					count: sql<number>`COUNT(DISTINCT ${schema.orders.id})`,
				})
				.from(schema.orders)
				.leftJoin(
					schema.order_products,
					eq(schema.orders.id, schema.order_products.orderId),
				)
				.where(and(...conditions, isNull(schema.orders.deletedAt)));

			return { total: Number(result.total), count: Number(result.count) };
		};

		const [month, today, pending] = await Promise.all([
			getRevenue([
				eq(schema.orders.status, "ENTREGUE"),
				gte(schema.orders.createdAt, new Date(`${monthStart}T00:00:00Z`)),
				lte(schema.orders.createdAt, new Date(`${monthEnd}T23:59:59Z`)),
			]),
			getRevenue([
				eq(schema.orders.status, "ENTREGUE"),
				gte(schema.orders.createdAt, new Date(`${todayStr}T00:00:00Z`)),
				lte(schema.orders.createdAt, new Date(`${todayStr}T23:59:59Z`)),
			]),
			getRevenue([
				eq(schema.orders.status, "ENTREGUE"),
				eq(schema.orders.isPaid, false),
			]),
		]);

		return {
			monthRevenue: month.total,
			monthOrdersCount: month.count,
			todayRevenue: today.total,
			todayOrdersCount: today.count,
			pendingPaymentTotal: pending.total,
			pendingOrdersCount: pending.count,
		};
	}

	async getExportData(startDate?: string, endDate?: string, status?: string) {
		const conditions = [isNull(schema.orders.deletedAt)];

		if (startDate) {
			conditions.push(
				gte(schema.orders.createdAt, new Date(`${startDate}T00:00:00Z`)),
			);
		}
		if (endDate) {
			conditions.push(
				lte(schema.orders.createdAt, new Date(`${endDate}T23:59:59Z`)),
			);
		}
		if (status) {
			type OrderStatus = (typeof schema.orders.status.enumValues)[number];
			conditions.push(eq(schema.orders.status, status as OrderStatus));
		}

		const exportData = await this.getBaseOrderQuery()
			.where(and(...conditions))
			.orderBy(desc(schema.orders.createdAt));

		return this.aggregateOrderRows(exportData);
	}
}
