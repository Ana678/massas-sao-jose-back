import { type AnyColumn, sql, type SQL } from "drizzle-orm";

/**
 * Fuso do negócio: UTC−3 (Rio Grande do Norte / Brasil, sem horário de verão desde 2019).
 * Datas `YYYY-MM-DD` da API representam dias no calendário do negócio, não em UTC.
 */
export const BUSINESS_UTC_OFFSET = "-03:00";
const BUSINESS_OFFSET_HOURS = 3;

/** Início do dia (00:00 no fuso do negócio) de `YYYY-MM-DD`, como instante (Date em UTC). */
export function startOfBusinessDay(dateStr: string): Date {
	return new Date(`${dateStr}T00:00:00.000${BUSINESS_UTC_OFFSET}`);
}

/** Fim do dia (23:59:59.999 no fuso do negócio) de `YYYY-MM-DD`, como instante (Date em UTC). */
export function endOfBusinessDay(dateStr: string): Date {
	return new Date(`${dateStr}T23:59:59.999${BUSINESS_UTC_OFFSET}`);
}

/** Data de hoje (`YYYY-MM-DD`) no fuso do negócio. */
export function businessTodayString(): string {
	return new Date(Date.now() - BUSINESS_OFFSET_HOURS * 60 * 60 * 1000)
		.toISOString()
		.slice(0, 10);
}

/**
 * Instante para uma data-alvo com a hora ATUAL do negócio, de forma que o dia no
 * calendário do negócio seja exatamente `dateStr` (usado no `targetDate` de pedidos).
 */
export function businessDateWithCurrentTime(dateStr: string): Date {
	const time = new Date(Date.now() - BUSINESS_OFFSET_HOURS * 60 * 60 * 1000)
		.toISOString()
		.slice(11, 19); // HH:MM:SS no fuso do negócio
	return new Date(`${dateStr}T${time}.000${BUSINESS_UTC_OFFSET}`);
}

/** `to_char(coluna, 'YYYY-MM')` no fuso do negócio (para agrupar/comparar por mês). */
export function businessMonthSql(column: AnyColumn): SQL<string> {
	return sql<string>`to_char(${column} - interval '${sql.raw(String(BUSINESS_OFFSET_HOURS))} hours', 'YYYY-MM')`;
}
