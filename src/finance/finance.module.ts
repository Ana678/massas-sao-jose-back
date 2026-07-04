import { Module } from "@nestjs/common";
import { FinanceService } from "./finance.service";
import { FinanceController } from "./finance.controller";
import { AuthModule } from "../auth/auth.module";
@Module({
	imports: [AuthModule],
	controllers: [FinanceController],
	providers: [FinanceService],
})
export class FinanceModule {}
