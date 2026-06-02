import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import type { Env } from "@/env";

export const DRIZZLE_DB = "DRIZZLE_DB";

@Global()
@Module({
	providers: [
		{
			provide: DRIZZLE_DB,
			inject: [ConfigService],
			useFactory: (configService: ConfigService<Env, true>) => {
				const connectionString = configService.get("DATABASE_URL");

				const pool = new Pool({ connectionString });
				return drizzle(pool, { schema });
			},
		},
	],
	exports: [DRIZZLE_DB],
})
export class DatabaseModule {}
