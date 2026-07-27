import { Op } from "sequelize";
import { WorkoutLog } from "../../models/index.js";

export function serializeWorkoutLog(workoutLog) {
	const plainLog = workoutLog.toJSON ? workoutLog.toJSON() : workoutLog;

	return {
		id: plainLog.id,
		userId: plainLog.user_id,
		planId: plainLog.plan_id,
		day: plainLog.day,
		sessionType: plainLog.session_type,
		exercises: plainLog.exercises,
		notes: plainLog.notes,
		loggedFor: plainLog.logged_for,
		createdAt: plainLog.created_at,
		updatedAt: plainLog.updated_at,
	};
}

export async function saveWorkoutLog({
	userId,
	planId,
	day,
	sessionType,
	exercises,
	notes = null,
	loggedFor,
}) {
	const workoutLog = await WorkoutLog.create({
		user_id: userId,
		plan_id: planId,
		day,
		session_type: sessionType,
		exercises,
		notes,
		logged_for: loggedFor,
	});

	return serializeWorkoutLog(workoutLog);
}

export async function findWorkoutLogForDate({ userId, loggedFor }) {
	const workoutLog = await WorkoutLog.findOne({
		where: {
			user_id: userId,
			logged_for: loggedFor,
		},
		order: [["created_at", "DESC"]],
	});

	return workoutLog ? serializeWorkoutLog(workoutLog) : null;
}

export async function findRecentWorkoutLogsForUser(userId, days = 7) {
	const since = new Date();
	since.setDate(since.getDate() - days);

	const logs = await WorkoutLog.findAll({
		where: {
			user_id: userId,
			created_at: {
				[Op.gte]: since,
			},
		},
		order: [["created_at", "ASC"]],
	});

	return logs.map(serializeWorkoutLog);
}
