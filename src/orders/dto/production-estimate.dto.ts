import { IsOptional, IsArray, IsString, IsDateString } from "class-validator";
import { TrimAndSanitize } from "@/common/sanitizers";

export class ProductionEstimateDto {
	@IsDateString({}, { message: "Informe uma data válida." })
	targetDate: string;

	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	@TrimAndSanitize()
	overrideCities?: string[];
}
