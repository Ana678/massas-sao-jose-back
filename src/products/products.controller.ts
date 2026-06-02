import {
	Controller,
	Get,
	Post,
	Body,
	Param,
	Delete,
	Put,
	UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/roles.guard";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";

@UseGuards(JwtAuthGuard)
@Controller("products")
export class ProductsController {
	constructor(private readonly productsService: ProductsService) {}

	@Post()
	create(@Body() createProductDto: CreateProductDto) {
		return this.productsService.create(createProductDto);
	}

	@Get()
	findAll() {
		return this.productsService.findAll();
	}

	@Get(":id")
	findOne(@Param("id") id: string) {
		return this.productsService.findOne(id);
	}

	@Put(":id")
	update(@Param("id") id: string, @Body() updateProductDto: UpdateProductDto) {
		return this.productsService.update(id, updateProductDto);
	}

	@Delete(":id")
	remove(@Param("id") id: string) {
		return this.productsService.remove(id);
	}
}
