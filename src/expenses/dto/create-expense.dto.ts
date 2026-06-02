import {
	IsString,
	MinLength,
	MaxLength,
	IsNumber,
	IsNotEmpty,
	IsPositive,
} from "class-validator";
import { TrimAndSanitize } from "@/common/sanitizers";

export class CreateExpenseDto {
	@IsString({ message: "A descrição da despesa deve ser uma string." })
	@IsNotEmpty({ message: "A descrição da despesa é obrigatória." })
	@MinLength(3, {
		message: "A descrição da despesa deve ter pelo menos 3 caracteres.",
	})
	@MaxLength(120, {
		message: "A descrição da despesa deve ter no máximo 120 caracteres.",
	})
	@TrimAndSanitize()
	description: string;

	@IsNumber({}, { message: "O valor da despesa deve ser um número." })
	@IsNotEmpty({ message: "O valor da despesa é obrigatório." })
	@IsPositive({ message: "O valor da despesa deve ser um número positivo." })
	value: number;

	@IsString({ message: "A categoria da despesa deve ser uma string." })
	@IsNotEmpty({ message: "O categoria da despesa é obrigatório." })
	@MinLength(3, {
		message: "O categoria da despesa deve ter pelo menos 3 caracteres.",
	})
	@MaxLength(120, {
		message: "O categoria da despesa deve ter no máximo 120 caracteres.",
	})
	@TrimAndSanitize()
	category: string;
}
