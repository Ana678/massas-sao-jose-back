import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import type { CreateOrderDto } from "./dto/create-order.dto";
import type { UpdateOrderDto } from "./dto/update-order.dto";
import * as schema from "../database/schema";
import { DRIZZLE_DB } from "../database/database.module";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, isNull, and, inArray, desc, gte, sql } from "drizzle-orm";
import { DELIVERY_SCHEDULE } from "@/common/constants/delivery-schedule";
import { ConfirmDeliveryDto } from "./dto/confirm-delivery.dto";
import { FindOrdersByCitiesDto } from "./dto/find-orders-by-cities.dto";

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
						? new Date(`${targetDate}T12:00:00Z`)
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

						return {
							orderId: order.id,
							productId: product.productId,
							quantity: String(product.quantity),
							unitPrice: String(selectedProduct.price),
							discount: String(product.discount || 0),
						};
					}),
				)
				.returning();

			return { ...order, products: orderProducts };
		});
	}

	async findAll() {
		const ordersData = await this.getBaseOrderQuery()
			.where(isNull(schema.orders.deletedAt))
			.orderBy(desc(schema.orders.createdAt));

		return this.aggregateOrderRows(ordersData);
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
					`${updateOrderDto.targetDate}T12:00:00Z`,
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

				await tx
					.delete(schema.order_products)
					.where(eq(schema.order_products.orderId, id));

				await tx.insert(schema.order_products).values(
					updateOrderDto.products.map((product) => {
						const selectedProduct = selectedProducts.find(
							(p) => p.id === product.productId,
						);

						return {
							orderId: id,
							productId: product.productId,
							quantity: String(product.quantity),
							unitPrice: String(selectedProduct!.price),
							discount: String(product.discount || 0),
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

			await tx
				.delete(schema.order_products)
				.where(eq(schema.order_products.orderId, id));

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
				});
			}
		}

		return Array.from(ordersMap.values()).map((order) => {
			const total = order.products
				.reduce((sum, product) => {
					return (
						sum +
						Number(product.quantity || 0) *
							Number(product.price || 0) *
							(1 - Number(product.discount || 0) / 100)
					);
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
		const { clientId } = dto;
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
						deliveryFee: String(dto.deliveryFee),
						createdAt: new Date(),
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
						deliveryFee: String(dto.deliveryFee),
						createdBy: userId,
					})
					.returning({ id: schema.orders.id });

				finalOrderId = newOrder.id;
			}

			return finalOrderId;
		});

		return this.findOne(orderId);
	}
}
