import { type FormEvent, useState } from "react";
import { loggingService } from "../../api/logging-service";
import type {
	PlanScheduleDay,
	WorkoutLog,
	WorkoutCompletionStatus,
	WorkoutLogExerciseInput,
} from "../../types/plan";

type WorkoutLogModalProps = {
	planId: string;
	session: PlanScheduleDay;
	onClose: () => void;
	onSaved: (workoutLog: WorkoutLog) => void;
};

const statusOptions: {
	value: WorkoutCompletionStatus;
	label: string;
}[] = [
	{ value: "completed", label: "Full" },
	{ value: "partial", label: "Partial" },
];

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

function getStatusClasses(isActive: boolean) {
	return isActive
		? "border-[#0f8b6f] bg-[#0f8b6f] text-white"
		: "border-[#b7cbc2] bg-white text-[#17211f] hover:border-[#0f8b6f]";
}

export default function WorkoutLogModal({
	planId,
	session,
	onClose,
	onSaved,
}: WorkoutLogModalProps) {
	const [notes, setNotes] = useState("");
	const [exercises, setExercises] = useState(() =>
		buildInitialExercises(session),
	);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	function updateExercise(
		index: number,
		updates: Partial<WorkoutLogExerciseInput>,
	) {
		setExercises((currentExercises) =>
			currentExercises.map((exercise, exerciseIndex) =>
				exerciseIndex === index ? { ...exercise, ...updates } : exercise,
			),
		);
	}

	function setExerciseStatus(index: number, status: WorkoutCompletionStatus) {
		const exercise = exercises[index];
		const setsCompleted = status === "completed" ? exercise.targetSets : 0;

		updateExercise(index, {
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
		<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#17211f]/45 px-4 py-8">
			<form
				onSubmit={handleSubmit}
				className="w-full max-w-3xl rounded-lg border border-[#d9e5df] bg-white p-6 shadow-[0_18px_60px_rgba(23,33,31,0.22)]"
			>
				<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
					<div>
						<p className="m-0 text-xs font-black uppercase tracking-widest text-[#0f8b6f]">
							Log workout
						</p>
						<h2 className="mt-1 text-2xl font-black text-[#17211f]">
							{session.day} - {session.session_type}
						</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="h-10 rounded-lg border border-[#b7cbc2] bg-white px-4 text-sm font-black uppercase text-[#17211f]"
					>
						Close
					</button>
				</div>

				<div className="mt-6 grid gap-4">
					<div className="grid gap-3">
						{exercises.map((exercise, index) => (
							<div
								key={`${exercise.exerciseName}-${index}`}
								className="rounded-lg border border-[#d9e5df] bg-[#f6faf7] p-4"
							>
								<div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
									<div>
										<p className="m-0 text-base font-black text-[#17211f]">
											{exercise.exerciseName}
										</p>
										<p className="mt-1 text-sm font-semibold text-[#62706b]">
											Target: {exercise.targetSets} sets x {exercise.targetReps}
										</p>
									</div>
									<div className="grid grid-cols-2 gap-2">
										{statusOptions.map((option) => (
											<button
												key={option.value}
												type="button"
												onClick={() => setExerciseStatus(index, option.value)}
												className={`h-9 rounded-lg border px-3 text-xs font-black uppercase ${getStatusClasses(
													exercise.completionStatus === option.value,
												)}`}
											>
												{option.label}
											</button>
										))}
									</div>
								</div>

								{exercise.completionStatus !== "completed" ? (
									<div className="mt-4 grid gap-3 sm:grid-cols-2">
										<label className="grid gap-2 text-sm font-black text-[#17211f]">
											Sets completed
											<input
												type="number"
												min={0}
												max={exercise.targetSets - 1}
												value={exercise.setsCompleted}
												onChange={(event) =>
													updateExercise(index, {
														setsCompleted: Number(event.target.value),
													})
												}
												className="min-h-11 rounded-lg border border-[#b7cbc2] bg-white px-3 text-base font-semibold outline-none focus:border-[#0f8b6f] focus:ring-4 focus:ring-[#0f8b6f]/15 disabled:bg-[#eef5f1]"
											/>
										</label>
										<label className="grid gap-2 text-sm font-black text-[#17211f]">
											Reps completed
											<input
												type="number"
												min={0}
												step={1}
												value={exercise.repsCompleted ?? ""}
												onChange={(event) =>
													updateExercise(index, {
														repsCompleted:
															event.target.value === ""
																? ""
																: Number(event.target.value),
													})
												}
												className="min-h-11 rounded-lg border border-[#b7cbc2] bg-white px-3 text-base font-semibold outline-none focus:border-[#0f8b6f] focus:ring-4 focus:ring-[#0f8b6f]/15 disabled:bg-[#eef5f1]"
											/>
										</label>
										<label className="grid gap-2 text-sm font-black text-[#17211f] sm:col-span-2">
											Exercise notes
											<textarea
												value={exercise.notes || ""}
												rows={2}
												onChange={(event) =>
													updateExercise(index, { notes: event.target.value })
												}
												className="rounded-lg border border-[#b7cbc2] bg-white px-3 py-2 text-base font-semibold outline-none focus:border-[#0f8b6f] focus:ring-4 focus:ring-[#0f8b6f]/15"
											/>
										</label>
									</div>
								) : null}
							</div>
						))}
					</div>

					<label className="grid gap-2 text-sm font-black text-[#17211f]">
						Workout notes
						<textarea
							value={notes}
							rows={3}
							onChange={(event) => setNotes(event.target.value)}
							className="rounded-lg border border-[#b7cbc2] bg-white px-3 py-2 text-base font-semibold outline-none focus:border-[#0f8b6f] focus:ring-4 focus:ring-[#0f8b6f]/15"
						/>
					</label>

					{errorMessage ? (
						<p className="rounded-lg border border-[#f0b8b8] bg-[#fff5f5] p-3 text-sm font-bold text-[#9b1c1c]">
							{errorMessage}
						</p>
					) : null}
				</div>

				<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
					<button
						type="button"
						onClick={onClose}
						className="h-11 rounded-lg border border-[#b7cbc2] bg-white px-5 font-black uppercase text-[#17211f]"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSaving}
						className="h-11 rounded-lg bg-[#0f8b6f] px-5 font-black uppercase text-white disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isSaving ? "Saving" : "Save log"}
					</button>
				</div>
			</form>
		</div>
	);
}
