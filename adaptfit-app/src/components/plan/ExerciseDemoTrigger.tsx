import { useState, type ReactNode } from "react";
import { plansService } from "../../api/plans-service";
import type { ExerciseVideo, PlanExercise } from "../../types/plan";

type ExerciseDemoTriggerProps = {
	exercise: PlanExercise;
	className: string;
	children?: ReactNode;
	fallbackClassName?: string;
	fallbackChildren?: ReactNode;
};

function getGoogleSearchUrl(exerciseName: string) {
	return `https://www.google.com/search?q=${encodeURIComponent(
		`How to do ${exerciseName}`,
	)}`;
}

function confirmGoogleRedirect(exerciseName: string) {
	return window.confirm(
		`You are about to be redirected to Google to search "How to do ${exerciseName}". Are you sure?`,
	);
}

export default function ExerciseDemoTrigger({
	exercise,
	className,
	children,
	fallbackClassName,
	fallbackChildren,
}: ExerciseDemoTriggerProps) {
	const [video, setVideo] = useState<ExerciseVideo | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	async function openDemo() {
		if (!exercise.exerciseDbId) {
			return;
		}

		setIsModalOpen(true);
		setErrorMessage(null);

		if (video) {
			return;
		}

		setIsLoading(true);

		try {
			setVideo(await plansService.getExerciseVideo(exercise.exerciseDbId));
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: "Exercise video could not be loaded.",
			);
		} finally {
			setIsLoading(false);
		}
	}

	if (!exercise.exerciseDbId) {
		return (
			<a
				href={getGoogleSearchUrl(exercise.exercise_name)}
				target="_blank"
				rel="noreferrer"
				onClick={(event) => {
					if (!confirmGoogleRedirect(exercise.exercise_name)) {
						event.preventDefault();
					}
				}}
				className={fallbackClassName || className}
				title={`Search how to do ${exercise.exercise_name}`}
			>
				{fallbackChildren || children || "No demo, search"}
			</a>
		);
	}

	return (
		<>
			<button
				type="button"
				onClick={openDemo}
				disabled={isLoading}
				className={className}
				title="Open exercise demo"
			>
				{children || (isLoading ? "Loading" : "View demo")}
			</button>

			{isModalOpen ? (
				<div
					className="fixed inset-0 z-50 grid place-items-center bg-secondary/60 px-4"
					role="dialog"
					aria-modal="true"
					aria-labelledby="exercise-video-title"
				>
					<div className="w-full max-w-180 overflow-hidden rounded-xl bg-white shadow-2xl">
						<div className="flex items-start justify-between gap-4 border-b border-border p-5">
							<div>
								<p className="m-0 text-xs font-black uppercase tracking-widest text-primary">
									Exercise demo
								</p>
								<h2
									id="exercise-video-title"
									className="mt-1 text-xl font-black text-secondary"
								>
									{exercise.exercise_name}
								</h2>
							</div>
							<button
								type="button"
								onClick={() => setIsModalOpen(false)}
								className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-white text-lg font-black text-secondary"
								aria-label="Close video"
							>
								X
							</button>
						</div>
						<div className="bg-secondary">
							{isLoading ? (
								<p className="m-0 p-8 text-center text-sm font-black uppercase tracking-widest text-white">
									Loading demo
								</p>
							) : video?.videoUrl ? (
								<video
									src={video.videoUrl}
									className="block aspect-video w-full"
									autoPlay
									controls
									muted
									playsInline
								/>
							) : (
								<div className="grid gap-4 p-8 text-center">
									<p className="m-0 text-sm font-semibold text-white">
										{errorMessage || "No available video"}
									</p>
									<a
										href={getGoogleSearchUrl(exercise.exercise_name)}
										target="_blank"
										rel="noreferrer"
										onClick={(event) => {
											if (!confirmGoogleRedirect(exercise.exercise_name)) {
												event.preventDefault();
											}
										}}
										className="mx-auto rounded-xl bg-white px-4 py-3 text-xs font-black uppercase text-primary"
									>
										No demo, search
									</a>
								</div>
							)}
						</div>
					</div>
				</div>
			) : null}
		</>
	);
}
