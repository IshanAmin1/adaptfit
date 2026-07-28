import type { WorkoutLog } from "../../types/plan";

type LoggedWorkoutInfoProps = {
	workoutLog: WorkoutLog;
};

function formatLoggedExerciseResult(exercise: WorkoutLog["exercises"][number]) {
	if (exercise.completionStatus === "completed") {
		return "Full";
	}

	return `${exercise.setsCompleted} sets x ${exercise.repsCompleted ?? 0} reps`;
}

function hasText(value: string | null | undefined) {
	return Boolean(value?.trim());
}

export default function LoggedWorkoutInfo({
	workoutLog,
}: LoggedWorkoutInfoProps) {
	return (
		<div className="grid gap-3 rounded-xl border border-[#9db4d8] bg-[#f7faff] p-5">
			<div>
				<p className="m-0 text-xs font-black uppercase tracking-widest text-[#2563eb]">
					Workout logged
				</p>
				<p className="mt-2 text-lg font-black text-[#111827]">
					Already logged today's workout
				</p>
			</div>
			<div className="grid gap-2">
				{workoutLog.exercises.map((exercise, index) => (
					<div
						key={`${exercise.exerciseName}-${index}`}
						className="grid gap-1 rounded-xl border border-[#d6e2f5] bg-white px-3 py-2"
					>
						<div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
							<p className="m-0 text-sm font-black text-[#111827]">
								{exercise.exerciseName}
							</p>
							<p className="m-0 text-xs font-black uppercase tracking-widest text-[#2563eb]">
								{formatLoggedExerciseResult(exercise)}
							</p>
						</div>
						{hasText(exercise.notes) ? (
							<p className="m-0 text-sm font-semibold leading-5 text-[#5b6b86]">
								{exercise.notes}
							</p>
						) : null}
					</div>
				))}
			</div>
			{hasText(workoutLog.notes) ? (
				<div className="rounded-xl border border-[#d6e2f5] bg-white px-3 py-2">
					<p className="m-0 text-xs font-black uppercase tracking-widest text-[#5b6b86]">
						Comments
					</p>
					<p className="mt-1 text-sm font-semibold leading-5 text-[#111827]">
						{workoutLog.notes}
					</p>
				</div>
			) : null}
		</div>
	);
}
