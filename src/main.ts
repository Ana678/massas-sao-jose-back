import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import { ConfigService } from "@nestjs/config";

async function bootstrap() {
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter({
			logger: {
				level: process.env.NODE_ENV === "production" ? "info" : "debug",
			},
		}),
	);

	const configService = app.get(ConfigService);
	const port = configService.get<number>("PORT") || 3333;

	app.enableCors({
		origin: true,
		methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
		credentials: true,
	});

	const config = new DocumentBuilder()
		.setTitle("Massas São José API")
		.setDescription(
			"Documentação do sistema de gestão de pedidos, rotas e financeiro.",
		)
		.setVersion("1.0")
		.addBearerAuth()
		.build();

	const document = SwaggerModule.createDocument(app, config);

	app.use(
		"/docs",
		apiReference({
			content: document,
			withFastify: true,
			theme: "kepler", // Temas disponíveis: alternate, default, moon, purple, solarized...
			layout: "modern",
			metaData: {
				title: "Massas São José - API Docs",
			},
		}),
	);

	await app.listen({ port, host: "0.0.0.0" }).then(() => {
		console.log("\n🔥 Server is running on http://localhost:" + port);
		console.log("📚 Docs available at http://localhost:" + port + "/docs");
	});
}
bootstrap();
