import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { authService } from "../api/auth-service";
import { plansService } from "../api/plans-service";
import { onboardingService } from "../api/onboarding-service";
import type { OnboardingProgressEvent } from "../api/onboarding-service";
import type { AuthUser } from "../types/auth";
import { OnboardingProfile } from "../types/onboarding";
import type { GeneratedPlan } from "../types/plan";
import { ButtonLink } from "../components/common/Button";
import { isRedoCooldownActive } from "../utils/plan-utils";
import {
	MAX_REASONABLE_AGE,
	MAX_REASONABLE_HEIGHT_CM,
	MIN_REASONABLE_AGE,
	MIN_REASONABLE_HEIGHT_CM,
	OnboardingFooterActions,
	OnboardingStepContent,
} from "../components/onboarding/OnboardingStepContent";

type OnboardingProps = {
	authUser: AuthUser | null;
	onComplete: (user: AuthUser) => void;
};

const initialProfile: OnboardingProfile = {
	age: "",
	biologicalSex: "",
	height: "",
	currentWeight: "",
	primaryGoal: "",
	goalTarget: "",
	experienceLevel: "",
	injuriesOrLimitations: "",
	trainingLocation: "",
	equipmentAvailable: [],
	machineTypes: [],
	customMachines: "",
	availableDays: [],
	preferredSessionLength: "",
	dietType: "",
	allergiesOrFoodsToAvoid: "",
	mealFrequencyPreference: "",
};

function buildProfileFromPlan(plan: GeneratedPlan): OnboardingProfile {
	const onboardingProfile = plan.onboardingProfile;

	if (!onboardingProfile) {
		return initialProfile;
	}

	return {
		age: String(onboardingProfile.age ?? ""),
		biologicalSex: onboardingProfile.biologicalSex ?? "",
		height: String(onboardingProfile.height ?? ""),
		currentWeight: String(onboardingProfile.currentWeight ?? ""),
		primaryGoal: onboardingProfile.primaryGoal ?? "",
		goalTarget: onboardingProfile.targetWeightOrTimeline ?? "",
		experienceLevel: onboardingProfile.experienceLevel ?? "",
		injuriesOrLimitations: onboardingProfile.injuriesOrLimitations ?? "",
		trainingLocation: onboardingProfile.trainingLocation ?? "",
		equipmentAvailable: onboardingProfile.equipmentAvailable ?? [],
		machineTypes: onboardingProfile.machineTypes ?? [],
		customMachines: onboardingProfile.customMachines ?? "",
		availableDays: onboardingProfile.availableDays ?? [],
		preferredSessionLength: onboardingProfile.preferredSessionLength ?? "",
		dietType: onboardingProfile.dietType ?? "",
		allergiesOrFoodsToAvoid: onboardingProfile.allergiesOrFoodsToAvoid ?? "",
		mealFrequencyPreference: onboardingProfile.mealFrequencyPreference ?? "",
	};
}

const steps = [
	"Basics",
	"Goals",
	"Experience",
	"Training",
	"Nutrition",
	"Confirmation",
	"Result",
];

const submissionProgressStages = [
	"start",
	"ai_validation",
	"saving",
	"complete",
	"plan_queued",
	"plan_generation",
	"nutrition_generation",
	"workout_generation",
	"plan_saving",
	"plan_complete",
];

function formatList(values: string[]) {
	if (!values.length) {
		return "None";
	}

	return values.join(", ");
}

function formatOptions(values: string[]) {
	if (!values.length) {
		return "None";
	}

	return values
		.map((value) => value.replace(/_/g, " "))
		.map((value) => (value === "bodyweight" ? "body weight" : value))
		.map((value) => value.charAt(0).toUpperCase() + value.slice(1))
		.join(", ");
}

function formatValue(value: string | undefined | null) {
	return value ? value : "Not provided";
}

function formatDays(values: string[]) {
	return values.length ? values.join(", ") : "Not provided";
}

function getAgeError(age: string) {
	const parsedAge = Number(age);

	if (!Number.isInteger(parsedAge)) {
		return "Enter your age as a whole number.";
	}

	if (parsedAge < MIN_REASONABLE_AGE || parsedAge > MAX_REASONABLE_AGE) {
		return `Enter an age between ${MIN_REASONABLE_AGE} and ${MAX_REASONABLE_AGE}.`;
	}

	return null;
}

function getHeightError(height: string) {
	const parsedHeight = Number(height);

	if (!Number.isInteger(parsedHeight)) {
		return "Enter your height in centimeters as a whole number.";
	}

	if (
		parsedHeight < MIN_REASONABLE_HEIGHT_CM ||
		parsedHeight > MAX_REASONABLE_HEIGHT_CM
	) {
		return `Enter a height between ${MIN_REASONABLE_HEIGHT_CM} cm and ${MAX_REASONABLE_HEIGHT_CM} cm.`;
	}

	return null;
}

function getStepError(stepIndex: number, profile: OnboardingProfile) {
	if (stepIndex === 0) {
		const ageError = getAgeError(profile.age);

		if (ageError) {
			return ageError;
		}

		const heightError = getHeightError(profile.height);

		if (heightError) {
			return heightError;
		}
	}

	if (stepIndex === 1 && !profile.primaryGoal) {
		return "Choose one primary goal to continue.";
	}

	if (stepIndex === 2 && !profile.experienceLevel) {
		return "Choose your experience level to continue.";
	}

	if (stepIndex === 3) {
		if (!profile.trainingLocation) {
			return "Choose where you will train to continue.";
		}

		if (!profile.equipmentAvailable.length) {
			return "Choose at least one equipment option to continue.";
		}

		if (!profile.availableDays.length) {
			return "Choose at least one available workout day to continue.";
		}

		if (
			profile.equipmentAvailable.includes("machines") &&
			profile.machineTypes.length <= 0 &&
			!profile.customMachines
		) {
			return "Choose at least one machine to continue.";
		}
	}

	if (stepIndex === 4 && !profile.dietType) {
		return "Choose a diet type to generate your plan.";
	}

	return null;
}

export default function Onboarding({ authUser, onComplete }: OnboardingProps) {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const isRedoMode = searchParams.get("redo") === "1";
	const hasInitializedRedoProfileRef = useRef(false);
	const [stepIndex, setStepIndex] = useState(0);
	const [profile, setProfile] = useState<OnboardingProfile>(initialProfile);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isCheckingPendingJob, setIsCheckingPendingJob] = useState(() =>
		Boolean(authUser),
	);
	const [isLoadingRedoProfile, setIsLoadingRedoProfile] = useState(false);
	const [isRedoBlockedByCooldown, setIsRedoBlockedByCooldown] = useState(false);
	const [hasPendingJob, setHasPendingJob] = useState(false);
	const [submissionState, setSubmissionState] = useState<{
		status: "idle" | "success" | "error";
		message: string | null;
		user: AuthUser | null;
	}>({
		status: "idle",
		message: null,
		user: null,
	});
	const [submissionProgress, setSubmissionProgress] = useState<
		OnboardingProgressEvent[]
	>([]);

	async function refreshCurrentUser(fallbackUser: AuthUser) {
		try {
			return (await authService.getCurrentUser()) ?? fallbackUser;
		} catch {
			return fallbackUser;
		}
	}
	const isConfirmationStep = stepIndex === steps.length - 2;
	const isResultStep = stepIndex === steps.length - 1;
	const confirmationProgressPercent = Math.round(
		((steps.length - 2) / Math.max(steps.length - 1, 1)) * 100,
	);
	const completedSubmissionStages = new Set(
		submissionProgress
			.filter((event) => event.stage !== "error")
			.map((event) => event.stage),
	);
	const completedSubmissionStageCount = submissionProgressStages.filter(
		(stage) => completedSubmissionStages.has(stage),
	).length;
	const submissionProgressPercent =
		submissionState.status === "success"
			? 100
			: confirmationProgressPercent +
				Math.round(
					(completedSubmissionStageCount / submissionProgressStages.length) *
						(100 - confirmationProgressPercent),
				);
	const progressPercent = isResultStep
		? submissionProgressPercent
		: Math.round((stepIndex / Math.max(steps.length - 1, 1)) * 100);

	useEffect(() => {
		let isMounted = true;

		if (!authUser) {
			return () => {
				isMounted = false;
			};
		}
		// Promise.resolve() to chain the async tasks
		Promise.resolve()
			.then(() => {
				if (isMounted) {
					setIsCheckingPendingJob(true);
				}

				return onboardingService.getPendingJob();
			})
			.then((pendingJob) => {
				if (!isMounted) {
					return;
				}

				if (!pendingJob) {
					setHasPendingJob(false);
					return;
				}

				if (isRedoMode) {
					hasInitializedRedoProfileRef.current = true;
				}

				setHasPendingJob(true);
				setIsSubmitting(true);
				setErrorMessage(null);
				setStepIndex(steps.length - 1);
				setSubmissionProgress([
					{
						stage: "reconnected",
						message: "Reconnected to your in-progress request.",
					},
				]);
				setSubmissionState({
					status: "idle",
					message: null,
					user: null,
				});

				onboardingService
					.streamPendingJobWithProgress(
						pendingJob.statusUrl,
						authUser,
						(progressEvent) => {
							if (isMounted) {
								setSubmissionProgress((currentProgress) => [
									...currentProgress,
									progressEvent,
								]);
							}
						},
					)
					.then((user) => {
						if (!isMounted) {
							return;
						}

						onComplete(user);
						setSubmissionState({
							status: "success",
							message:
								"Your onboarding details were saved and your first plan is ready.",
							user,
						});
					})
					.catch((error: unknown) => {
						if (!isMounted) {
							return;
						}

						const message =
							error instanceof Error
								? error.message
								: "Your in-progress request could not be resumed.";

						setSubmissionState({
							status: "error",
							message,
							user: null,
						});
					})
					.finally(() => {
						if (isMounted) {
							setIsSubmitting(false);
							setHasPendingJob(false);
						}
					});
			})
			.catch(() => {
				if (isMounted) {
					setHasPendingJob(false);
				}
			})
			.finally(() => {
				if (isMounted) {
					setIsCheckingPendingJob(false);
				}
			});

		return () => {
			isMounted = false;
		};
	}, [authUser, isRedoMode, onComplete]);

	useEffect(() => {
		let isMounted = true;

		if (!isRedoMode) {
			hasInitializedRedoProfileRef.current = false;
			return () => {
				isMounted = false;
			};
		}

		if (
			!authUser ||
			isCheckingPendingJob ||
			hasPendingJob ||
			hasInitializedRedoProfileRef.current ||
			submissionState.status === "success"
		) {
			return () => {
				isMounted = false;
			};
		}

		hasInitializedRedoProfileRef.current = true;
		setIsLoadingRedoProfile(true);

		plansService
			.getLatestPlan()
			.then((latestPlan) => {
				if (!isMounted || !latestPlan) {
					return;
				}

				if (isRedoCooldownActive(latestPlan.onboardingProfile?.completedAt)) {
					setIsRedoBlockedByCooldown(true);
					return;
				}

				setIsRedoBlockedByCooldown(false);
				setProfile(buildProfileFromPlan(latestPlan));
				setStepIndex(0);
				setErrorMessage(null);
				setSubmissionProgress([]);
				setSubmissionState({ status: "idle", message: null, user: null });
			})
			.catch(() => {
				if (isMounted) {
					hasInitializedRedoProfileRef.current = false;
					setProfile(initialProfile);
				}
			})
			.finally(() => {
				if (isMounted) {
					setIsLoadingRedoProfile(false);
				}
			});

		return () => {
			isMounted = false;
		};
	}, [
		authUser,
		hasPendingJob,
		isCheckingPendingJob,
		isRedoMode,
		submissionState.status,
	]);

	if (isCheckingPendingJob || isLoadingRedoProfile) {
		return (
			<div className="grid min-h-[calc(100vh-78px)] place-items-center px-4 text-sm font-black uppercase tracking-[0.08em] text-muted">
				Loading
			</div>
		);
	}
	if (isRedoMode && isRedoBlockedByCooldown) {
		return <Navigate to="/plan" replace />;
	}
	if (
		authUser?.hasGeneratedPlan &&
		!hasPendingJob &&
		!isConfirmationStep &&
		!isResultStep &&
		!isRedoMode
	) {
		return <Navigate to="/dashboard" replace />;
	}

	const updateProfile = (
		key: keyof OnboardingProfile,
		value: string | string[],
	) => {
		setProfile((currentProfile) => ({
			...currentProfile,
			[key]: value,
		}));
	};

	const updateEquipment = (equipmentAvailable: string[]) => {
		setProfile((currentProfile) => ({
			...currentProfile,
			equipmentAvailable,
			machineTypes: equipmentAvailable.includes("machines")
				? currentProfile.machineTypes
				: [],
			customMachines: equipmentAvailable.includes("machines")
				? currentProfile.customMachines
				: "",
		}));
	};

	const goToNextStep = () => {
		const stepError = getStepError(stepIndex, profile);

		if (stepError) {
			setErrorMessage(stepError);
			return;
		}

		setErrorMessage(null);
		setStepIndex((currentStep) => Math.min(currentStep + 1, steps.length - 1));
	};

	const goToPreviousStep = () => {
		setErrorMessage(null);
		setSubmissionState({
			status: "idle",
			message: null,
			user: null,
		});
		setSubmissionProgress([]);
		setStepIndex((currentStep) => Math.max(currentStep - 1, 0));
	};

	const goToConfirmationStep = () => {
		setStepIndex(steps.length - 2);
	};

	const goToEditableStep = () => {
		setSubmissionState({
			status: "idle",
			message: null,
			user: null,
		});
		setSubmissionProgress([]);
		setErrorMessage(null);
		setStepIndex(steps.length - 3);
	};

	const handleSubmit = async () => {
		if (!isConfirmationStep) {
			return;
		}

		setIsSubmitting(true);
		setErrorMessage(null);
		setSubmissionProgress([]);
		setSubmissionState({
			status: "idle",
			message: null,
			user: null,
		});
		setStepIndex(steps.length - 1);

		try {
			const user = await onboardingService.submitProfileWithProgress(
				profile,
				(progressEvent) => {
					setSubmissionProgress((currentProgress) => [
						...currentProgress,
						progressEvent,
					]);
				},
			);
			const refreshedUser = await refreshCurrentUser(user);

			onComplete(refreshedUser);
			setSubmissionState({
				status: "success",
				message:
					"Your onboarding details were saved and your first plan is ready.",
				user: refreshedUser,
			});
		} catch (error: unknown) {
			const message =
				error instanceof Error
					? error.message
					: "Your onboarding details could not be saved.";

			setSubmissionState({
				status: "error",
				message,
				user: null,
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleEditSubmission = () => {
		goToEditableStep();
	};

	const summarySections = [
		{
			title: "Basics",
			items: [
				{ label: "Age", value: formatValue(profile.age) },
				{ label: "Biological sex", value: formatValue(profile.biologicalSex) },
				{
					label: "Height",
					value: profile.height ? `${profile.height} cm` : "Not provided",
				},
				{
					label: "Current weight",
					value: profile.currentWeight
						? `${profile.currentWeight} kg`
						: "Not provided",
				},
			],
		},
		{
			title: "Goals",
			items: [
				{ label: "Primary goal", value: formatValue(profile.primaryGoal) },
				{
					label: "Goal target",
					value: formatValue(profile.goalTarget),
				},
			],
		},
		{
			title: "Experience",
			items: [
				{
					label: "Experience level",
					value: formatValue(profile.experienceLevel),
				},
				{
					label: "Injuries or limitations",
					value: formatValue(profile.injuriesOrLimitations),
				},
			],
		},
		{
			title: "Training",
			items: [
				{
					label: "Training location",
					value: formatValue(profile.trainingLocation),
				},
				{
					label: "Equipment available",
					value: formatOptions(profile.equipmentAvailable),
				},
				{
					label: "Machines available",
					value: formatList(profile.machineTypes),
				},
				{
					label: "Other machines",
					value: formatValue(profile.customMachines),
				},
				{
					label: "Available days",
					value: formatDays(profile.availableDays),
				},
				{
					label: "Session length",
					value: formatValue(profile.preferredSessionLength),
				},
			],
		},
		{
			title: "Nutrition",
			items: [
				{ label: "Diet type", value: formatValue(profile.dietType) },
				{
					label: "Allergies / foods to avoid",
					value: formatValue(profile.allergiesOrFoodsToAvoid),
				},
				{
					label: "Meal frequency",
					value: formatValue(profile.mealFrequencyPreference),
				},
			],
		},
	];

	return (
		<div className="mx-auto grid min-h-[calc(100vh-78px)] w-full max-w-336 items-start px-4 py-8 md:px-12">
			<section className="mx-auto grid w-full max-w-264 content-start gap-8 rounded-xl border border-border bg-white p-6 shadow-[0_24px_70px_rgba(23,33,31,0.10)] md:p-10">
				<div className="grid gap-4">
					<div className="flex flex-wrap items-end justify-between gap-4">
						<div>
							<p className="mb-3 text-xs font-black uppercase tracking-widest text-primary">
								Step {stepIndex + 1} of {steps.length}
							</p>
							<h1 className="m-0 text-[clamp(2rem,5vw,3.25rem)] font-black leading-none text-secondary">
								{steps[stepIndex]}
							</h1>
						</div>
						<p className="m-0 text-sm font-black uppercase tracking-[0.08em] text-muted">
							{progressPercent}% complete
						</p>
						{isRedoMode &&
						!isSubmitting &&
						submissionState.status !== "success" ? (
							<ButtonLink
								to="/plan"
								replace
								variant="outline"
								size="sm"
								className="h-10 px-4"
							>
								Cancel redo
							</ButtonLink>
						) : null}
					</div>
					<div className="h-2 overflow-hidden rounded-full bg-border">
						<div
							className="h-full rounded-full bg-primary transition-all"
							style={{ width: `${progressPercent}%` }}
						/>
					</div>
				</div>

				<form
					className="mt-2 grid min-h-128 content-between gap-6 md:mt-4"
					onSubmit={(event) => {
						event.preventDefault();

						if (isConfirmationStep) {
							handleSubmit();
							return;
						}

						if (isResultStep) {
							goToConfirmationStep();
							return;
						}

						goToNextStep();
					}}
				>
					<OnboardingStepContent
						stepIndex={stepIndex}
						profile={profile}
						errorMessage={errorMessage}
						isConfirmationStep={isConfirmationStep}
						isResultStep={isResultStep}
						isSubmitting={isSubmitting}
						submissionState={submissionState}
						submissionProgress={submissionProgress}
						summarySections={summarySections}
						updateProfile={updateProfile}
						updateEquipment={updateEquipment}
					/>

					<div className="flex flex-wrap justify-between gap-3 border-t border-border pt-5">
						<OnboardingFooterActions
							stepIndex={stepIndex}
							stepsLength={steps.length}
							isConfirmationStep={isConfirmationStep}
							isResultStep={isResultStep}
							isSubmitting={isSubmitting}
							submissionState={submissionState}
							onBack={goToPreviousStep}
							onEditSubmission={handleEditSubmission}
							onContinue={async () => {
								if (!submissionState.user) {
									return;
								}

								const refreshedUser = await refreshCurrentUser(
									submissionState.user,
								);

								onComplete(refreshedUser);
								navigate("/dashboard", { replace: true });
							}}
						/>
					</div>
				</form>
			</section>
		</div>
	);
}
