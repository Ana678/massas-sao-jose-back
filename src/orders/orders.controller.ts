import {
	Controller,
	Get,
	Post,
	Body,
	Param,
	Delete,
	Inject,
	Put,
	UseGuards,
	Request,
	Query,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/roles.guard";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { FindOrdersByCitiesDto } from "./dto/find-orders-by-cities.dto";
import { ProductionEstimateDto } from "./dto/production-estimate.dto";
import { ConfirmDeliveryDto } from "./dto/confirm-delivery.dto";
import { GetOrdersFilterDto } from "./dto/get-orders-filter.dto";

@UseGuards(JwtAuthGuard)
@Controller("orders")
export class OrdersController {
	constructor(
		@Inject(OrdersService) private readonly ordersService: OrdersService,
	) {}

	@Post()
	create(@Body() createOrderDto: CreateOrderDto, @Request() req: any) {
		return this.ordersService.create(createOrderDto, req.user.sub);
	}

	@Get()
	findAll(@Query() filters: GetOrdersFilterDto) {
		return this.ordersService.findAll(filters);
	}

	@Get("by-client/:clientId")
	findByClient(@Param("clientId") clientId: string) {
		return this.ordersService.findByClient(clientId);
	}

	@Post("by-cities")
	findByCities(@Body() getOrdersByCitiesDto: FindOrdersByCitiesDto) {
		return this.ordersService.findByCities(getOrdersByCitiesDto);
	}

	@Get("dashboard/summary")
	getDashboardSummary(
		@Query("monthStart") monthStart: string,
		@Query("monthEnd") monthEnd: string,
		@Query("today") today: string,
	) {
		return this.ordersService.getDashboardSummary(monthStart, monthEnd, today);
	}

	@Get("export")
	exportOrders(
		@Query("startDate") startDate?: string,
		@Query("endDate") endDate?: string,
		@Query("status") status?: string,
	) {
		return this.ordersService.getExportData(startDate, endDate, status);
	}

	@Get(":id")
	findOne(@Param("id") id: string) {
		return this.ordersService.findOne(id);
	}

	@Put(":id")
	update(@Param("id") id: string, @Body() updateOrderDto: UpdateOrderDto) {
		return this.ordersService.update(id, updateOrderDto);
	}

	@Delete(":id")
	remove(@Param("id") id: string) {
		return this.ordersService.remove(id);
	}

	@Post("production-estimate")
	getProductionEstimate(@Body() dto: ProductionEstimateDto) {
		return this.ordersService.getProductionEstimate(
			dto.targetDate,
			dto.overrideCities,
		);
	}

	@Post("confirm-delivery")
	confirmDelivery(@Body() dto: ConfirmDeliveryDto, @Request() req: any) {
		return this.ordersService.confirmDelivery(dto, req.user.sub);
	}
}
