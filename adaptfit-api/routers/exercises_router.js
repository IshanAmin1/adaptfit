import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.js";
import { exerciseLookupRateLimit } from "../middleware/rate_limit.js";
import { hasActiveSubscription } from "../middleware/subscription.js";
import { getExerciseById } from "../services/exercise-db.js";

export const exercisesRouter = Router();

exercisesRouter.get(
	"/:exerciseDbId",
	isAuthenticated,
	hasActiveSubscription,
	exerciseLookupRateLimit,
	async (req, res) => {
		try {
			const exercise = await getExerciseById(req.params.exerciseDbId);
			return res.json({ exercise });
		} catch (error) {
			console.error(error);
			return res.status(500).json({ error: "Exercise could not be loaded." });
		}
	},
);
