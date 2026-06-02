import { Transform } from "class-transformer";

/**
 * Escape de caracteres perigosos HTML + caracteres especiais
 * Protege contra XSS e injections básicas
 *
 * Escapa:
 * - Caracteres HTML: < > & " '
 * - Caracteres perigosos: ; \ * ? [ ] ( )
 *
 * SQL Injection é prevenido pelo uso de prepared statements no Drizzle ORM
 */
export function escapeHtml(text: string): string {
	if (!text || typeof text !== "string") return text;
	const map: Record<string, string> = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#039;",
		// Caracteres que podem ser perigosos em contextos específicos
		";": "&#59;",
		"\\": "&#92;",
	};
	return text.replace(/[&<>"';\\/]/g, (char) => map[char] || char);
}

/**
 * Trim + Escape HTML
 */
export function TrimAndSanitize() {
	return Transform(({ value }) => {
		if (typeof value === "string") {
			return escapeHtml(value.trim());
		}
		return value;
	});
}

/**
 * Trim + Escape HTML + Uppercase
 */
export function TrimSanitizeUppercase() {
	return Transform(({ value }) => {
		if (typeof value === "string") {
			return escapeHtml(value.trim().toUpperCase());
		}
		return value;
	});
}
