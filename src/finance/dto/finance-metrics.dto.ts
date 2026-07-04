import { IsString, Matches } from "class-validator";

export class GetFinanceMetricsDto {
	@IsString()
	@Matches(/^\d{4}-\d{2}$/, {
		message: "startDate deve estar no formato YYYY-MM",
	})
	startDate: string;

	@IsString()
	@Matches(/^\d{4}-\d{2}$/, {
		message: "endDate deve estar no formato YYYY-MM",
	})
	endDate: string;
}
