import { getNonNegativeIntegerEnv } from "../../utils/general.js";

export const REDO_COOLDOWN_MS = getNonNegativeIntegerEnv(
	"REDO_COOLDOWN_MS",
	24 * 60 * 60 * 1000,
);
