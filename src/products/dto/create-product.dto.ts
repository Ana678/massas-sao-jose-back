import {
	IsString,
	MinLength,
	MaxLength,
	IsNumber,
	IsNotEmpty,
} from "class-validator";
import { TrimAndSanitize } from "@/common/sanitizers";

export class CreateProductDto {
	@IsString({ message: "O nome do produto deve ser uma string." })
	@IsNotEmpty({ message: "O nome do produto é obrigatório." })
	@MinLength(3, {
		message: "O nome do produto deve ter pelo menos 3 caracteres.",
	})
	@MaxLength(120, {
		message: "O nome do produto deve ter no máximo 120 caracteres.",
	})
	@TrimAndSanitize()
	name: string;

	@IsString({ message: "A descrição do produto deve ser uma string." })
	@IsNotEmpty({ message: "A descrição do produto é obrigatória." })
	@MinLength(5, {
		message: "A descrição do produto deve ter pelo menos 5 caracteres.",
	})
	@MaxLength(200, {
		message: "A descrição do produto deve ter no máximo 200 caracteres.",
	})
	@TrimAndSanitize()
	description: string;

	@IsNumber(
		{},
		{ message: "O custo do produto é obrigatório e deve ser um número." },
	)
	@IsNotEmpty({ message: "O custo do produto é obrigatório." })
	investment: number;

	@IsNumber(
		{},
		{
			message:
				"O preço de venda do produto é obrigatório e deve ser um número.",
		},
	)
	@IsNotEmpty({ message: "O preço de venda do produto é obrigatório." })
	price: number;
}
