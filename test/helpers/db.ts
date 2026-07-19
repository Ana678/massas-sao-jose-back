import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { pushSchema } from "drizzle-kit/api";
import { Pool } from "pg";
import * as schema from "../../src/database/schema";

/**
 * Banco de teste isolado (serviço `postgres_test` do docker-compose, porta 5433).
 * Suba com: `docker compose up -d postgres_test`.
 */
export const TEST_DATABASE_URL =
	process.env.TEST_DATABASE_URL ??
	"postgresql://postgres:postgres@localhost:5433/massas_sao_jose_test";

export type TestDb = NodePgDatabase<typeof schema>;

export function createTestPool(): Pool {
	return new Pool({ connectionString: TEST_DATABASE_URL });
}

/**
 * Sincroniza o schema atual (`src/database/schema`) no banco de teste — via `push`,
 * não pelo histórico de migrations (que hoje tem drift: 0004 e 0005 ambos adicionam
 * `created_by`, quebrando um banco limpo). Rodado uma vez no globalSetup.
 */
export async function runMigrations(): Promise<void> {
	const pool = createTestPool();
	const db = drizzle(pool, { schema });
	const { apply } = await pushSchema(schema, db as never);
	await apply();
	await pool.end();
}

/** Limpa todas as tabelas entre testes, preservando o schema. */
export async function resetDb(db: TestDb): Promise<void> {
	await db.execute(
		sql`TRUNCATE TABLE order_products, orders, expenses, clients, products, cities, users RESTART IDENTITY CASCADE`,
	);
}
