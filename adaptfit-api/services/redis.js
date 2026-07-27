import Redis from "ioredis";
import { REDIS_HOST, REDIS_PORT } from "../config/env/storage.js";

let redisClient;

export function getRedisClient() {
	if (!redisClient) {
		redisClient = new Redis({
			host: REDIS_HOST,
			port: REDIS_PORT,
			maxRetriesPerRequest: null,
		});
	}

	return redisClient;
}
