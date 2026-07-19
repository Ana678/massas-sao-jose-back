import { BadRequestException } from "@nestjs/common";
import Decimal from "decimal.js";
import { sql, type SQL } from "drizzle-orm";
import * as schema from "@/database/schema";

export type DiscountType = "PERCENT" | "VALUE";

/**
 * Preço líquido por unidade como Decimal (2 casas, piso 0). Usa aritmética decimal
 * exata (não float) e arredonda HALF_UP — igual ao `ROUND(..., 2)` do Postgres, então
 * o total calculado em JS bate com o do SQL (dashboard/finance).
 */
function netUnitDecimal(
	unitPrice: Decimal.Value,
	discount: Decimal.Value,
	type: DiscountType,
): Decimal {
	const price = new Decimal(unitPrice);
	const disc = new Decimal(discount);
	const raw =
		type === "VALUE"
			? price.minus(disc)
			: price.times(new Decimal(1).minus(disc.div(100)));
	return Decimal.max(0, raw).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/** Preço líquido por unidade (2 casas, piso 0). Fonte única do cálculo. */
export function netUnitPrice(
	unitPrice: number,
	discount: number,
	type: DiscountType,
): number {
	return netUnitDecimal(unitPrice, discount, type).toNumber();
}

/** Total do pedido (Σ quantidade × líquido unitário) como string com 2 casas. */
export function orderTotal(
	items: Array<{
		unitPrice: Decimal.Value | null;
		quantity: Decimal.Value | null;
		discount: Decimal.Value | null;
		discountType: DiscountType | string | null;
	}>,
): string {
	const total = items.reduce((sum, item) => {
		const net = netUnitDecimal(
			item.unitPrice ?? 0,
			item.discount ?? 0,
			(item.discountType as DiscountType) ?? "PERCENT",
		);
		return sum.plus(net.times(new Decimal(item.quantity ?? 0)));
	}, new Decimal(0));
	return total.toFixed(2);
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
			END, 2)), 0)`;
}
