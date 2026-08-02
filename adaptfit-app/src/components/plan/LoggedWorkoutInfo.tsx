import type { WorkoutLog } from "../../types/plan";

export default function LoggedWorkoutInfo({
	workoutLog,
}: {
	workoutLog: WorkoutLog;
}) {
	return (
		<div className="grid gap-3 rounded-xl border border-control bg-surface-soft p-5">
			<div>
				<p className="m-0 text-xs font-black uppercase tracking-widest text-primary">
					Workout logged
				</p>
				<p className="mt-2 text-lg font-black text-secondary">
					Already logged today's workout
				</p>
			</div>
			<div className="grid gap-2">
				{workoutLog.exercises.map((exercise, index) => (
					<div
						key={`${exercise.exerciseName}-${index}`}
						className="grid gap-1 rounded-xl border border-border bg-white px-3 py-2"
					>
						<div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
							<p className="m-0 text-sm font-black text-secondary">
								{exercise.exerciseName}
							</p>
							<p className="m-0 text-xs font-black uppercase tracking-widest text-primary">
								{exercise.completionStatus === "completed"
									? "Full"
									: `${exercise.setsCompleted} sets x ${
											exercise.repsCompleted ?? 0
										} reps`}
							</p>
						</div>
						{exercise.notes?.trim() ? (
							<p className="m-0 text-sm font-semibold leading-5 text-muted">
								{exercise.notes}
							</p>
						) : null}
					</div>
				))}
			</div>
			{workoutLog.notes?.trim() ? (
				<div className="rounded-xl border border-border bg-white px-3 py-2">
					<p className="m-0 text-xs font-black uppercase tracking-widest text-muted">
						Comments
					</p>
					<p className="mt-1 text-sm font-semibold leading-5 text-secondary">
						{workoutLog.notes}
					</p>
				</div>
			) : null}
		</div>
	);
}
