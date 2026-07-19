import { fileURLToPath } from "node:url";
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		root: "./",
		environment: "node",
		include: ["**/*.spec.ts"],
		globalSetup: ["./test/global-setup.ts"],
		// Testes de integração compartilham o mesmo banco de teste; evita corrida entre arquivos.
		fileParallelism: false,
	},
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	plugins: [
		swc.vite({
			module: { type: "es6" }, // Use ES6 module system for compatibility with NodeNext
		}),
	],
});
