import {
	IsArray,
	IsUUID,
	IsNotEmpty,
	ArrayMinSize,
	IsDateString,
	IsOptional,
	IsString,
} from "class-validator";
import { TrimAndSanitize } from "@/common/sanitizers";

export class FindOrdersByCitiesDto {
	@IsArray({ message: "As cidades devem ser um array." })
	@IsString({ each: true })
	@ArrayMinSize(1, {
		message: "Você precisa fornecer pelo menos uma cidade.",
	})
	@IsNotEmpty({ message: "As cidades são obrigatórias." })
	@TrimAndSanitize()
	cityNames: string[];

	@IsDateString({}, { message: "A data alvo deve ser válida." })
	@IsOptional()
	targetDate?: string;
}
