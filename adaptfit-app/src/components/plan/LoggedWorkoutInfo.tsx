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
		<div className="grid gap-3 rounded-lg border border-[#b7cbc2] bg-[#f6faf7] p-5">
			<div>
				<p className="m-0 text-xs font-black uppercase tracking-widest text-[#0f8b6f]">
					Workout logged
				</p>
				<p className="mt-2 text-lg font-black text-[#17211f]">
					Already logged today's workout
				</p>
			</div>
			<div className="grid gap-2">
				{workoutLog.exercises.map((exercise, index) => (
					<div
						key={`${exercise.exerciseName}-${index}`}
						className="grid gap-1 rounded-lg border border-[#d9e5df] bg-white px-3 py-2"
					>
						<div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
							<p className="m-0 text-sm font-black text-[#17211f]">
								{exercise.exerciseName}
							</p>
							<p className="m-0 text-xs font-black uppercase tracking-widest text-[#0f8b6f]">
								{formatLoggedExerciseResult(exercise)}
							</p>
						</div>
						{hasText(exercise.notes) ? (
							<p className="m-0 text-sm font-semibold leading-5 text-[#62706b]">
								{exercise.notes}
							</p>
						) : null}
					</div>
				))}
			</div>
			{hasText(workoutLog.notes) ? (
				<div className="rounded-lg border border-[#d9e5df] bg-white px-3 py-2">
					<p className="m-0 text-xs font-black uppercase tracking-widest text-[#62706b]">
						Comments
					</p>
					<p className="mt-1 text-sm font-semibold leading-5 text-[#17211f]">
						{workoutLog.notes}
					</p>
				</div>
			) : null}
		</div>
	);
}
