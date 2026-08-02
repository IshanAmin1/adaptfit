import {
	EXERCISE_DB_BASE_URL,
	EXERCISE_DB_RAPIDAPI_HOST,
	EXERCISE_DB_RAPIDAPI_KEY,
} from "../config/env/exercisedb.js";

async function requestExerciseDb(path) {
	if (!EXERCISE_DB_RAPIDAPI_KEY) {
		throw new Error("Exercise DB RapidAPI key is not configured.");
	}

	const response = await fetch(`${EXERCISE_DB_BASE_URL}${path}`, {
		method: "GET",
		headers: {
			"x-rapidapi-key": EXERCISE_DB_RAPIDAPI_KEY,
			"x-rapidapi-host": EXERCISE_DB_RAPIDAPI_HOST,
			"Content-Type": "application/json",
		},
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

function isExerciseMatch(query, exercise) {
	const normalizedQuery = normalizeName(query);
	const normalizedName = normalizeName(exercise.name);

	return (
		normalizedName === normalizedQuery ||
		normalizedName.includes(normalizedQuery) ||
		normalizedQuery.includes(normalizedName)
	);
}

function findMatchingExercise(query, exercises) {
	for (const exercise of exercises) {
		if (!exercise.exerciseId || !exercise.name) {
			continue;
		}

		if (isExerciseMatch(query, exercise)) {
			return exercise;
		}
	}

	return null;
}

async function searchExercises(search) {
	const body = await requestExerciseDb(
		`/exercises/search?search=${encodeURIComponent(search)}`,
	);

	return Array.isArray(body?.data) ? body.data : [];
}

export async function findExerciseReference(search) {
	const exercises = await searchExercises(search);
	const match = findMatchingExercise(search, exercises);

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

	for (const exerciseName of exerciseNames) {
		try {
			const reference = await findExerciseReference(exerciseName);
			referencesByName.set(exerciseName, reference);
		} catch (error) {
			console.warn(
				`Exercise DB lookup failed for "${exerciseName}":`,
				error.message,
			);
			referencesByName.set(exerciseName, null);
		}
	}

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
