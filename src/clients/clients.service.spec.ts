import { Test, TestingModule } from "@nestjs/testing";
import { DRIZZLE_DB } from "@/database/database.module";
import { ClientsService } from "./clients.service";

describe("ClientsService", () => {
	let service: ClientsService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [ClientsService, { provide: DRIZZLE_DB, useValue: {} }],
		}).compile();

		service = module.get<ClientsService>(ClientsService);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});
});
