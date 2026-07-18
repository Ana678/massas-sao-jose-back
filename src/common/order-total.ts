import { BadRequestException } from "@nestjs/common";
import { sql, type SQL } from "drizzle-orm";
import * as schema from "@/database/schema";

export type DiscountType = "PERCENT" | "VALUE";

/** Preço líquido por unidade (2 casas, piso 0). Fonte única do cálculo. */
export function netUnitPrice(
	unitPrice: number,
	discount: number,
	type: DiscountType,
): number {
	const raw =
		type === "VALUE" ? unitPrice - discount : unitPrice * (1 - discount / 100);
	return Math.max(0, Number(raw.toFixed(2)));
}

/** Valida o desconto conforme o tipo. Lança 400 se inválido. */
export function assertValidDiscount(
	unitPrice: number,
	discount: number,
	type: DiscountType,
): void {
	if (discount < 0) {
		throw new BadRequestException("O desconto não pode ser negativo.");
	}
	if (type === "PERCENT" && discount > 100) {
		throw new BadRequestException(
			"O desconto percentual não pode passar de 100.",
		);
	}
	if (type === "VALUE" && discount > unitPrice) {
		throw new BadRequestException(
			"O desconto em valor não pode ser maior que o preço unitário.",
		);
	}
}

/** Expressão SQL da receita (SUM do total), com CASE no discount_type. */
export function orderRevenueSql(): SQL<number> {
	return sql<number>`COALESCE(SUM(
		CAST(${schema.order_products.quantity} AS numeric) * ROUND(
			CASE WHEN ${schema.order_products.discountType} = 'VALUE'
				THEN GREATEST(CAST(${schema.order_products.unitPrice} AS numeric) - CAST(${schema.order_products.discount} AS numeric), 0)
				ELSE CAST(${schema.order_products.unitPrice} AS numeric) * (1 - CAST(${schema.order_products.discount} AS numeric) / 100.0)
			END, 2), 0)`;
}
