import { describe, expect, it } from "vitest";
import {
	assertValidDiscount,
	netUnitPrice,
} from "../../src/common/order-total";

describe("order-total", () => {
	it("netUnitPrice PERCENT abate percentual", () => {
		expect(netUnitPrice(12.5, 10, "PERCENT")).toBe(11.25);
	});

	it("netUnitPrice VALUE abate R$ por unidade", () => {
		expect(netUnitPrice(12.5, 2, "VALUE")).toBe(10.5);
	});

	it("netUnitPrice tem piso em 0 (VALUE > preço)", () => {
		expect(netUnitPrice(12.5, 20, "VALUE")).toBe(0);
	});

	it("assertValidDiscount rejeita PERCENT > 100", () => {
		expect(() => assertValidDiscount(12.5, 150, "PERCENT")).toThrow();
	});

	it("assertValidDiscount rejeita VALUE > preço", () => {
		expect(() => assertValidDiscount(12.5, 20, "VALUE")).toThrow();
	});

	it("assertValidDiscount aceita desconto igual ao preço (grátis)", () => {
		expect(() => assertValidDiscount(12.5, 12.5, "VALUE")).not.toThrow();
	});
});
