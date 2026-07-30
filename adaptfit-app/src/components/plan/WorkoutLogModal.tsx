import { type FormEvent, useState } from "react";
import { loggingService } from "../../api/logging-service";
import type {
	PlanScheduleDay,
	WorkoutLog,
	WorkoutLogExerciseInput,
} from "../../types/plan";
import { formatPlanLabel } from "../../utils/plan-utils";

function getTodayInputValue() {
	return new Date().toISOString().slice(0, 10);
}

function buildInitialExercises(
	session: PlanScheduleDay,
): WorkoutLogExerciseInput[] {
	return session.exercises.map((exercise) => ({
		exerciseName: exercise.exercise_name,
		targetSets: exercise.sets,
		targetReps: exercise.reps,
		completionStatus: "completed",
		setsCompleted: exercise.sets,
		repsCompleted: "",
		notes: "",
	}));
}

export default function WorkoutLogModal({
	planId,
	session,
	onClose,
	onSaved,
}: {
	planId: string;
	session: PlanScheduleDay;
	onClose: () => void;
	onSaved: (workoutLog: WorkoutLog) => void;
}) {
	const [notes, setNotes] = useState("");
	const [exercises, setExercises] = useState(() =>
		buildInitialExercises(session),
	);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	function replaceExercise(
		index: number,
		updatedExercise: WorkoutLogExerciseInput,
	) {
		setExercises((currentExercises) =>
			currentExercises.map((exercise, exerciseIndex) =>
				exerciseIndex === index ? updatedExercise : exercise,
			),
		);
	}

	function setExerciseStatus(index: number, status: "completed" | "partial") {
		const exercise = exercises[index];
		const setsCompleted = status === "completed" ? exercise.targetSets : 0;

		replaceExercise(index, {
			...exercise,
			completionStatus: status,
			setsCompleted,
			repsCompleted: status === "partial" ? 0 : "",
		});
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setErrorMessage(null);
		setIsSaving(true);

		try {
			const savedLog = await loggingService.logWorkout(planId, {
				day: session.day,
				sessionType: session.session_type,
				loggedFor: getTodayInputValue(),
				notes,
				exercises,
			});
			onSaved(savedLog);
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: "Workout log could not be saved.",
			);
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-secondary/45 px-4 py-8">
			<form
				onSubmit={handleSubmit}
				className="w-full max-w-3xl rounded-xl border border-border bg-white p-6 shadow-[0_18px_60px_rgba(23,33,31,0.22)]"
			>
				<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
					<div>
						<p className="m-0 text-xs font-black uppercase tracking-widest text-primary">
							Log workout
						</p>
						<h2 className="mt-1 text-2xl font-black text-secondary">
							{session.day} - {formatPlanLabel(session.session_type)}
						</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="h-10 rounded-xl border border-control bg-white px-4 text-sm font-black uppercase text-secondary"
					>
						Close
					</button>
				</div>

				<div className="mt-6 grid gap-4">
					<div className="grid gap-3">
						{exercises.map((exercise, index) => (
							<div
								key={`${exercise.exerciseName}-${index}`}
								className="rounded-xl border border-border bg-surface-soft p-4"
							>
								<div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
									<div>
										<p className="m-0 text-base font-black text-secondary">
											{exercise.exerciseName}
										</p>
										<p className="mt-1 text-sm font-semibold text-muted">
											Target: {exercise.targetSets} sets x {exercise.targetReps}
										</p>
									</div>
									<div className="grid grid-cols-2 gap-2">
										<button
											type="button"
											onClick={() => setExerciseStatus(index, "completed")}
											className={`h-9 rounded-xl border px-3 text-xs font-black uppercase ${
												exercise.completionStatus === "completed"
													? "border-primary bg-primary text-white"
													: "border-control bg-white text-secondary hover:border-primary"
											}`}
										>
											Full
										</button>
										<button
											type="button"
											onClick={() => setExerciseStatus(index, "partial")}
											className={`h-9 rounded-xl border px-3 text-xs font-black uppercase ${
												exercise.completionStatus === "partial"
													? "border-primary bg-primary text-white"
													: "border-control bg-white text-secondary hover:border-primary"
											}`}
										>
											Partial
										</button>
									</div>
								</div>

								{exercise.completionStatus !== "completed" ? (
									<div className="mt-4 grid gap-3 sm:grid-cols-2">
										<label className="grid gap-2 text-sm font-black text-secondary">
											Sets completed
											<input
												type="number"
												min={0}
												max={exercise.targetSets - 1}
												value={exercise.setsCompleted}
												onChange={(event) =>
													replaceExercise(index, {
														...exercise,
														setsCompleted: Number(event.target.value),
													})
												}
												className="min-h-11 rounded-xl border border-control bg-white px-3 text-base font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:bg-surface-disabled"
											/>
										</label>
										<label className="grid gap-2 text-sm font-black text-secondary">
											Reps completed
											<input
												type="number"
												min={0}
												step={1}
												value={exercise.repsCompleted ?? ""}
												onChange={(event) =>
													replaceExercise(index, {
														...exercise,
														repsCompleted:
															event.target.value === ""
																? ""
																: Number(event.target.value),
													})
												}
												className="min-h-11 rounded-xl border border-control bg-white px-3 text-base font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:bg-surface-disabled"
											/>
										</label>
										<label className="grid gap-2 text-sm font-black text-secondary sm:col-span-2">
											Exercise notes
											<textarea
												value={exercise.notes || ""}
												rows={2}
												onChange={(event) =>
													replaceExercise(index, {
														...exercise,
														notes: event.target.value,
													})
												}
												className="rounded-xl border border-control bg-white px-3 py-2 text-base font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
											/>
										</label>
									</div>
								) : null}
							</div>
						))}
					</div>

					<label className="grid gap-2 text-sm font-black text-secondary">
						Workout notes
						<textarea
							value={notes}
							rows={3}
							onChange={(event) => setNotes(event.target.value)}
							className="rounded-xl border border-control bg-white px-3 py-2 text-base font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
						/>
					</label>

					{errorMessage ? (
						<p className="rounded-xl border border-danger-border bg-danger-surface p-3 text-sm font-bold text-danger-text">
							{errorMessage}
						</p>
					) : null}
				</div>

				<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
					<button
						type="button"
						onClick={onClose}
						className="h-11 rounded-xl border border-control bg-white px-5 font-black uppercase text-secondary"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSaving}
						className="h-11 rounded-xl bg-primary px-5 font-black uppercase text-white disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isSaving ? "Saving" : "Save log"}
					</button>
				</div>
			</form>
		</div>
	);
}
