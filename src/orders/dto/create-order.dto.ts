import {
	IsString,
	IsNumber,
	IsBoolean,
	IsNotEmpty,
	IsUUID,
	IsEnum,
	IsArray,
	ValidateNested,
	ArrayMinSize,
	IsPositive,
	IsOptional,
	Min,
	IsDateString,
} from "class-validator";
import { Type } from "class-transformer";
import { TrimAndSanitize } from "@/common/sanitizers";

class OrderProductDto {
	@IsUUID("7", { message: "ID do produto inválido." })
	@IsNotEmpty({ message: "O ID do produto é obrigatório." })
	productId: string;

	@IsNumber({}, { message: "A quantidade deve ser um número." })
	@IsPositive({ message: "A quantidade deve ser maior que zero." })
	@IsNotEmpty({ message: "A quantidade é obrigatória." })
	quantity: number;
}

export class CreateOrderDto {
	@IsUUID("7", { message: "O ID do cliente deve ser válido." })
	@IsNotEmpty({ message: "O ID do cliente é obrigatório." })
	clientId: string;

	@IsEnum(["ENCOMENDA", "PREVISAO_ROTA", "PRONTA_ENTREGA"], {
		message: "O tipo deve ser ENCOMENDA, PREVISAO_ROTA ou PRONTA_ENTREGA.",
	})
	@IsOptional()
	type?: "ENCOMENDA" | "PREVISAO_ROTA" | "PRONTA_ENTREGA" = "ENCOMENDA";

	@IsEnum(
		["PENDENTE", "EM_PRODUCAO", "EM_ROTA", "ENTREGUE", "PULADO", "CANCELADO"],
		{
			message:
				"O status deve ser PENDENTE, EM_PRODUCAO, EM_ROTA, ENTREGUE, PULADO ou CANCELADO.",
		},
	)
	@IsOptional()
	status?:
		| "PENDENTE"
		| "EM_PRODUCAO"
		| "EM_ROTA"
		| "ENTREGUE"
		| "PULADO"
		| "CANCELADO" = "PENDENTE";

	@IsString({ message: "O método de pagamento deve ser uma string." })
	@IsOptional()
	@TrimAndSanitize()
	paymentMethod?: string = "dinheiro";

	@IsNumber({}, { message: "A taxa de entrega deve ser um número." })
	@Min(0, { message: "A taxa de entrega não pode ser negativa." })
	@IsOptional()
	deliveryFee?: number = 0;

	@IsBoolean({ message: "isPaid deve ser um booleano." })
	@IsOptional()
	isPaid?: boolean = false;

	@IsArray({ message: "Os produtos devem ser um array." })
	@ValidateNested({ each: true })
	@Type(() => OrderProductDto)
	@ArrayMinSize(1, {
		message: "Um pedido precisa ter pelo menos um produto na lista.",
	})
	@IsNotEmpty({ message: "Os produtos são obrigatórios." })
	products: OrderProductDto[];

	@IsDateString({}, { message: "Data alvo inválida." })
	@IsOptional()
	targetDate?: string;
}
