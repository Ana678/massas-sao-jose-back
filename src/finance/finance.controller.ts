import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { FinanceService } from "./finance.service";
import { GetFinanceMetricsDto } from "./dto/finance-metrics.dto";
import { JwtAuthGuard } from "../auth/guards/roles.guard";

@Controller("finance")
@UseGuards(JwtAuthGuard)
export class FinanceController {
	constructor(private readonly financeService: FinanceService) {}

	@Get("metrics")
	async getMetrics(@Query() dto: GetFinanceMetricsDto) {
		return this.financeService.getMetrics(dto);
	}
}
