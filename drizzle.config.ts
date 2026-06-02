import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./src/database/schema/*",
	out: "./src/database/migrations",
	dialect: "postgresql",
	casing: "snake_case",
	dbCredentials: {
		url: process.env.DATABASE_URL as string,
	},
	verbose: true,
	strict: true,
});
