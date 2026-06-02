import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, isNull, and } from "drizzle-orm";
import { DRIZZLE_DB } from "../database/database.module";
import * as schema from "../database/schema";
import { CreateClientDto } from "./dto/create-client.dto";

@Injectable()
export class ClientsService {
	constructor(@Inject(DRIZZLE_DB) private db: NodePgDatabase<typeof schema>) {}

	async create(createClientDto: CreateClientDto) {
		const [city] = await this.db
			.select({ id: schema.cities.id })
			.from(schema.cities)
			.where(eq(schema.cities.name, createClientDto.city));

		if (!city) {
			throw new NotFoundException("Cidade não encontrada.");
		}

		const [newClient] = await this.db
			.insert(schema.clients)
			.values({
				...createClientDto,
				cityId: city.id,
			})
			.returning();

		return newClient;
	}

	async findAll() {
		return this.db
			.select({
				id: schema.clients.id,
				name: schema.clients.name,
				cnpj: schema.clients.cnpj,
				phone: schema.clients.phone,
				address: schema.clients.address,
				cityId: schema.clients.cityId,
				createdAt: schema.clients.createdAt,
				updatedAt: schema.clients.updatedAt,
				deletedAt: schema.clients.deletedAt,
				city: schema.cities.name,
			})
			.from(schema.clients)
			.leftJoin(schema.cities, eq(schema.cities.id, schema.clients.cityId))
			.where(isNull(schema.clients.deletedAt));
	}

	async findOne(id: string) {
		const [client] = await this.db
			.select({
				id: schema.clients.id,
				name: schema.clients.name,
				cnpj: schema.clients.cnpj,
				phone: schema.clients.phone,
				address: schema.clients.address,
				cityId: schema.clients.cityId,
				createdAt: schema.clients.createdAt,
				updatedAt: schema.clients.updatedAt,
				deletedAt: schema.clients.deletedAt,
				city: schema.cities.name,
			})
			.from(schema.clients)
			.leftJoin(schema.cities, eq(schema.cities.id, schema.clients.cityId))
			.where(and(isNull(schema.clients.deletedAt), eq(schema.clients.id, id)));
		return client;
	}

	async update(id: string, updateClientDto: CreateClientDto) {
		const [client] = await this.db
			.select()
			.from(schema.clients)
			.where(eq(schema.clients.id, id));

		if (!client || client.deletedAt) {
			throw new NotFoundException("Cliente não encontrado ou já removido.");
		}

		const [city] = await this.db
			.select({ id: schema.cities.id })
			.from(schema.cities)
			.where(eq(schema.cities.name, updateClientDto.city));

		if (!city) {
			throw new NotFoundException("Cidade não encontrada.");
		}

		const [updatedClient] = await this.db
			.update(schema.clients)
			.set({
				...updateClientDto,
				cityId: city.id,
				updatedAt: new Date(),
			})
			.where(eq(schema.clients.id, id))
			.returning();

		return updatedClient;
	}

	async remove(id: string) {
		const [client] = await this.db
			.select()
			.from(schema.clients)
			.where(eq(schema.clients.id, id));

		if (!client || client.deletedAt) {
			throw new NotFoundException("Cliente não encontrado ou já removido.");
		}

		await this.db
			.update(schema.clients)
			.set({
				deletedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(schema.clients.id, id));
	}
}
