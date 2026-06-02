import { Module, ValidationPipe } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { DatabaseModule } from "./database/database.module";
import { ClientsModule } from "./clients/clients.module";
import { ExpensesModule } from "./expenses/expenses.module";
import { envSchema } from "@/env";
import { ProductsModule } from "./products/products.module";
import { OrdersModule } from "./orders/orders.module";
import { AuthModule } from "./auth/auth.module";

@Module({
	imports: [
		ThrottlerModule.forRoot([
			{
				ttl: 60000,
				limit: 100,
			},
		]),
		ConfigModule.forRoot({
			isGlobal: true,
			validate: (env) => envSchema.parse(env),
		}),
		DatabaseModule,
		ClientsModule,
		ExpensesModule,
		ProductsModule,
		OrdersModule,
		AuthModule,
	],
	controllers: [],
	providers: [
		{
			provide: APP_PIPE,
			useValue: new ValidationPipe({
				whitelist: true,
				forbidNonWhitelisted: true,
				transform: true,
				transformOptions: {
					enableImplicitConversion: true,
				},
			}),
		},
	],
})
export class AppModule {}
