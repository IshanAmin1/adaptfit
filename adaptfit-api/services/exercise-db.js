import {
	EXERCISE_DB_BASE_URL,
	EXERCISE_DB_RAPIDAPI_HOST,
	EXERCISE_DB_RAPIDAPI_KEY,
} from "../config/env/exercisedb.js";

const MIN_EXERCISE_MATCH_SCORE = 80;
const EXERCISE_NAME_MODIFIERS = new Set([
	"alternating",
	"assisted",
	"band",
	"barbell",
	"bodyweight",
	"cable",
	"close",
	"decline",
	"dumbbell",
	"ez",
	"flat",
	"incline",
	"kettlebell",
	"machine",
	"neutral",
	"one",
	"plate",
	"resistance",
	"seated",
	"single",
	"smith",
	"standing",
	"supported",
	"two",
	"wide",
]);

function getHeaders() {
	return {
		"x-rapidapi-key": EXERCISE_DB_RAPIDAPI_KEY,
		"x-rapidapi-host": EXERCISE_DB_RAPIDAPI_HOST,
		"Content-Type": "application/json",
	};
}

async function requestExerciseDb(path) {
	if (!EXERCISE_DB_RAPIDAPI_KEY) {
		throw new Error("Exercise DB RapidAPI key is not configured.");
	}

	const response = await fetch(`${EXERCISE_DB_BASE_URL}${path}`, {
		method: "GET",
		headers: getHeaders(),
	});
	const body = await response.json().catch(() => null);

	if (!response.ok) {
		const error = new Error("Exercise DB request failed.");
		error.status = response.status;
		error.body = body;
		throw error;
	}

	return body;
}

function normalizeName(value) {
	return String(value || "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

function getCoreNameTerms(value) {
	return normalizeName(value)
		.split(" ")
		.filter((term) => term && !EXERCISE_NAME_MODIFIERS.has(term));
}

function scoreExerciseMatch(query, exercise) {
	const normalizedQuery = normalizeName(query);
	const normalizedName = normalizeName(exercise.name);
	const normalizedQueryCore = getCoreNameTerms(query).join(" ");
	const normalizedNameCore = getCoreNameTerms(exercise.name).join(" ");

	if (!normalizedName) {
		return 0;
	}

	const isExactMatch = normalizedName === normalizedQuery;
	const isPartialMatch =
		normalizedName.includes(normalizedQuery) ||
		normalizedQuery.includes(normalizedName);
	const isCoreMovementMatch =
		normalizedQueryCore &&
		normalizedNameCore &&
		normalizedQueryCore === normalizedNameCore;

	if (isExactMatch) {
		return 100;
	}

	if (isPartialMatch || isCoreMovementMatch) {
		return 80;
	}

	return 0;
}

function pickBestSearchResult(query, exercises) {
	let bestExercise = null;
	let bestScore = 0;

	for (const exercise of exercises) {
		if (!exercise.exerciseId || !exercise.name) {
			continue;
		}

		const score = scoreExerciseMatch(query, exercise);

		if (score > bestScore) {
			bestExercise = exercise;
			bestScore = score;
		}
	}

	return bestScore >= MIN_EXERCISE_MATCH_SCORE ? bestExercise : null;
}

export async function searchExercises(search) {
	const body = await requestExerciseDb(
		`/exercises/search?search=${encodeURIComponent(search)}`,
	);

	return Array.isArray(body?.data) ? body.data : [];
}

export async function findExerciseReference(search) {
	const match = pickBestSearchResult(search, await searchExercises(search));

	return match
		? {
				exerciseDbId: match.exerciseId,
				exerciseDbName: match.name,
			}
		: null;
}

export async function getExerciseById(id) {
	const body = await requestExerciseDb(`/exercises/${encodeURIComponent(id)}`);
	const exercise = body?.data || {};

	return {
		id: String(exercise.exerciseId || id),
		name: exercise.name || "",
		videoUrl: exercise.videoUrl || null,
		raw: exercise,
	};
}

export async function planWithExerciseReferencesFromAPI(plan) {
	const exerciseNames = new Set();

	for (const session of plan.weekly_schedule || []) {
		for (const exercise of session.exercises || []) {
			if (exercise.exercise_name) {
				exerciseNames.add(exercise.exercise_name);
			}
		}
	}

	if (!exerciseNames.size || !EXERCISE_DB_RAPIDAPI_KEY) {
		return plan;
	}

	const referencesByName = new Map();

	await Promise.all(
		[...exerciseNames].map(async (exerciseName) => {
			try {
				referencesByName.set(
					exerciseName,
					await findExerciseReference(exerciseName),
				);
			} catch (error) {
				console.warn(
					`Exercise DB lookup failed for "${exerciseName}":`,
					error.message,
				);
				referencesByName.set(exerciseName, null);
			}
		}),
	);

	return {
		...plan,
		weekly_schedule: plan.weekly_schedule.map((session) => ({
			...session,
			exercises: session.exercises.map((exercise) => ({
				...exercise,
				...(referencesByName.get(exercise.exercise_name) || {}),
			})),
		})),
	};
}
