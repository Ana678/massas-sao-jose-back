import { runMigrations } from "./helpers/db";

/** Roda uma vez antes de toda a suíte: garante o schema no banco de teste. */
export default async function setup() {
	await runMigrations();
}
