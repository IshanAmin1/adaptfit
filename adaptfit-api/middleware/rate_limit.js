import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { getRedisClient } from "../services/redis.js";

const THIRTY_MINUTES_MS = 30 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;

function rateLimitResponse(_req, res) {
	return res.status(429).json({
		error: "Too many requests. Please wait a moment and try again.",
	});
}

function createRedisRateLimiter({ windowMs, max, keyGenerator, prefix }) {
	return rateLimit({
		windowMs,
		max,
		keyGenerator,
		standardHeaders: true,
		legacyHeaders: false,
		handler: rateLimitResponse,
		store: new RedisStore({
			prefix: `rl:${prefix}:`,
			sendCommand: (...args) => getRedisClient().call(...args),
		}),
	});
}

function userKeyGenerator(req) {
	return req.user?.id ?? req.ip;
}

function ipKeyGenerator(req) {
	return req.ip;
}

// Generous for users retrying onboarding form fixes.
export const onboardingRateLimit = createRedisRateLimiter({
	windowMs: THIRTY_MINUTES_MS,
	max: 50,
	keyGenerator: userKeyGenerator,
	prefix: "onboarding",
});

export const planGenerationRateLimit = createRedisRateLimiter({
	windowMs: THIRTY_MINUTES_MS,
	max: 15,
	keyGenerator: userKeyGenerator,
	prefix: "plan-gen",
});

export const exerciseLookupRateLimit = createRedisRateLimiter({
	windowMs: ONE_MINUTE_MS,
	max: 120,
	keyGenerator: userKeyGenerator,
	prefix: "exercise-lookup",
});

export const authRateLimit = createRedisRateLimiter({
	windowMs: THIRTY_MINUTES_MS,
	max: 60,
	keyGenerator: ipKeyGenerator,
	prefix: "auth",
});

export const billingRateLimit = createRedisRateLimiter({
	windowMs: THIRTY_MINUTES_MS,
	max: 40,
	keyGenerator: userKeyGenerator,
	prefix: "billing",
});
