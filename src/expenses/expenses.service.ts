import { Injectable, Inject } from "@nestjs/common";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { UpdateExpenseDto } from "./dto/update-expense.dto";
import * as schema from "../database/schema";
import { DRIZZLE_DB } from "../database/database.module";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, isNull, and } from "drizzle-orm";

@Injectable()
export class ExpensesService {
	constructor(@Inject(DRIZZLE_DB) private db: NodePgDatabase<typeof schema>) {}

	async create(createExpenseDto: CreateExpenseDto) {
		const { description, value, category } = createExpenseDto;

		const [expense] = await this.db
			.insert(schema.expenses)
			.values({
				description,
				value: String(value),
				category,
			})
			.returning();
		return expense;
	}

	async findAll() {
		return this.db
			.select()
			.from(schema.expenses)
			.where(isNull(schema.expenses.deletedAt));
	}

	async findOne(id: string) {
		const [expense] = await this.db
			.select()
			.from(schema.expenses)
			.where(
				and(eq(schema.expenses.id, id), isNull(schema.expenses.deletedAt)),
			);
		return expense;
	}

	async update(id: string, updateExpenseDto: UpdateExpenseDto) {
		const { description, value, category } = updateExpenseDto;

		const [expense] = await this.db
			.update(schema.expenses)
			.set({
				description,
				value: String(value),
				category,
			})
			.where(and(eq(schema.expenses.id, id), isNull(schema.expenses.deletedAt)))
			.returning();
		return expense;
	}

	async remove(id: string) {
		const [expense] = await this.db
			.update(schema.expenses)
			.set({ deletedAt: new Date() })
			.where(and(eq(schema.expenses.id, id), isNull(schema.expenses.deletedAt)))
			.returning();
		return expense;
	}
}
