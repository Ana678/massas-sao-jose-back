import { CreateClientDto } from "./dto/create-client.dto";
import {
	Controller,
	Get,
	Post,
	Body,
	Param,
	Delete,
	Put,
	UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/roles.guard";
import { ClientsService } from "./clients.service";
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiCreatedResponse,
	ApiNotFoundResponse,
} from "@nestjs/swagger";

@ApiTags("clients")
@UseGuards(JwtAuthGuard)
@Controller("clients")
export class ClientsController {
	constructor(private readonly clientsService: ClientsService) {}

	@Post()
	@ApiOperation({
		summary: "Criar um novo cliente",
		description: "Regista um cliente físico ou empresarial.",
	})
	@ApiCreatedResponse({ description: "Cliente criado com sucesso." })
	@ApiNotFoundResponse({ description: "Cidade informada não foi encontrada." })
	create(@Body() createClientDto: CreateClientDto) {
		return this.clientsService.create(createClientDto);
	}

	@Get()
	@ApiOperation({ summary: "Listar todos os clientes ativos" })
	findAll() {
		return this.clientsService.findAll();
	}

	@Get(":id")
	@ApiOperation({ summary: "Obter detalhes de um cliente" })
	findOne(@Param("id") id: string) {
		return this.clientsService.findOne(id);
	}

	@Put(":id")
	@ApiOperation({ summary: "Atualizar um cliente" })
	update(@Param("id") id: string, @Body() updateClientDto: CreateClientDto) {
		return this.clientsService.update(id, updateClientDto);
	}

	@Delete(":id")
	@ApiOperation({ summary: "Remover um cliente" })
	@ApiResponse({ status: 200, description: "Cliente removido com sucesso." })
	remove(@Param("id") id: string) {
		return this.clientsService.remove(id);
	}
}
