import { Injectable, Inject } from "@nestjs/common";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { DRIZZLE_DB } from "@/database/database.module";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/database/schema";
import { eq, isNull, and } from "drizzle-orm";

@Injectable()
export class ProductsService {
	constructor(@Inject(DRIZZLE_DB) private db: NodePgDatabase<typeof schema>) {}

	async create(createProductDto: CreateProductDto) {
		const { name, description, price, investment } = createProductDto;
		const [product] = await this.db
			.insert(schema.products)
			.values({
				name,
				description,
				price: String(price),
				investment: String(investment),
			})
			.returning();
		return product;
	}

	async findAll() {
		return this.db
			.select()
			.from(schema.products)
			.where(isNull(schema.products.deletedAt))
			.orderBy(schema.products.name);
	}

	async findOne(id: string) {
		return this.db
			.select()
			.from(schema.products)
			.where(
				and(eq(schema.products.id, id), isNull(schema.products.deletedAt)),
			);
	}

	async update(id: string, updateProductDto: UpdateProductDto) {
		const { name, description, price, investment } = updateProductDto;
		const [product] = await this.db
			.update(schema.products)
			.set({
				name,
				description,
				price: String(price),
				investment: String(investment),
			})
			.where(eq(schema.products.id, id))
			.returning();
		return product;
	}

	async remove(id: string) {
		// Soft-delete: manter a linha do produto preserva o histórico dos pedidos.
		// (A FK order_products.product_id é ON DELETE CASCADE — um hard-delete aqui
		// apagaria os itens congelados de todos os pedidos antigos.)
		const [product] = await this.db
			.update(schema.products)
			.set({ deletedAt: new Date(), updatedAt: new Date() })
			.where(
				and(eq(schema.products.id, id), isNull(schema.products.deletedAt)),
			)
			.returning();
		return product;
	}
}
