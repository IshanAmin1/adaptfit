import { getNonNegativeIntegerEnv } from "../utils/env";

export const REDO_COOLDOWN_MS = getNonNegativeIntegerEnv(
	import.meta.env.VITE_REDO_COOLDOWN_MS,
	"VITE_REDO_COOLDOWN_MS",
	24 * 60 * 60 * 1000,
);
