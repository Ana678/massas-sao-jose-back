import {
	IsString,
	IsNumber,
	IsBoolean,
	IsNotEmpty,
	IsUUID,
	IsArray,
	ValidateNested,
	ArrayMinSize,
	IsPositive,
	IsOptional,
	IsEnum,
	Min,
} from "class-validator";
import { Type } from "class-transformer";
import { TrimAndSanitize } from "@/common/sanitizers";

class DeliveryProductDto {
	@IsUUID("7", { message: "ID do produto inválido." })
	@IsNotEmpty({ message: "O ID do produto é obrigatório." })
	productId: string;

	@IsNumber({}, { message: "A quantidade deve ser um número." })
	@IsPositive({ message: "A quantidade deve ser maior que zero." })
	@IsNotEmpty({ message: "A quantidade é obrigatória." })
	quantity: number;

	@IsNumber({}, { message: "O desconto deve ser um número." })
	@Min(0, { message: "O desconto não pode ser negativo." })
	@IsOptional()
	discount?: number;

	@IsEnum(["PERCENT", "VALUE"], {
		message: "O tipo de desconto deve ser PERCENT ou VALUE.",
	})
	@IsOptional()
	discountType?: "PERCENT" | "VALUE" = "PERCENT";
}

export class ConfirmDeliveryDto {
	@IsUUID("7", { message: "O ID do cliente deve ser válido." })
	@IsNotEmpty({ message: "O ID do cliente é obrigatório." })
	clientId: string;

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
	isPaid?: boolean = true;

	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => DeliveryProductDto)
	@IsOptional()
	products?: DeliveryProductDto[];
}
