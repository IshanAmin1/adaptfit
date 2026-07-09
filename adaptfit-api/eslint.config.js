import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
	js.configs.recommended,
	{
		files: ["**/*.{ts,js}"],
		languageOptions: {
			globals: {
				...globals.node,
			},
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
			},
		},
		rules: {
			// node-specific sanity checks
			"no-console": "off", // backends log a lot — usually fine to allow
			"no-process-exit": "warn",

			// common backend gotchas
			"no-return-await": "off",
		},
	},
]);
