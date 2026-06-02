import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		root: "./",
		environment: "node",
		include: ["**/*.spec.ts"],
	},
	plugins: [
		swc.vite({
			module: { type: "es6" }, // Use ES6 module system for compatibility with NodeNext
		}),
	],
});
