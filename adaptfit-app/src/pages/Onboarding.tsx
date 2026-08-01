import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { authService } from "../api/auth-service";
import { onboardingService } from "../api/onboarding-service";
import type { OnboardingProgressEvent } from "../api/onboarding-service";
import type { AuthUser } from "../types/auth";
import type { Option } from "../components/common/Select";
import { Button } from "../components/common/Button";
import ChoiceGrid from "../components/common/ChoiceGrid";
import Field from "../components/common/Field";
import MultiSelectDropdown from "../components/common/MultiSelectDropdown";
import Select from "../components/common/Select";
import TextArea from "../components/common/TextArea";
import TextInput from "../components/common/TextInput";
import { OnboardingProfile } from "../types/onboarding";

type OnboardingProps = {
	authUser: AuthUser | null;
	onComplete: (user: AuthUser) => void;
};

const MIN_REASONABLE_AGE = 13;
const MAX_REASONABLE_AGE = 100;
const MIN_REASONABLE_HEIGHT_CM = 100;
const MAX_REASONABLE_HEIGHT_CM = 250;
const MIN_REASONABLE_WEIGHT_KG = 45;
const MAX_REASONABLE_WEIGHT_KG = 91;

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
	"plan_saving",
	"plan_complete",
];

const sexOptions: Option[] = [
	{ label: "Male", value: "male" },
	{ label: "Female", value: "female" },
	{ label: "Intersex", value: "intersex" },
	{ label: "Prefer not to say", value: "prefer_not_to_say" },
];

const goalOptions: Option[] = [
	{ label: "Lose weight", value: "lose_weight" },
	{ label: "Build muscle", value: "build_muscle" },
	{ label: "Improve endurance", value: "improve_endurance" },
	{ label: "General fitness", value: "general_fitness" },
	{ label: "Build strength", value: "build_strength" },
	{ label: "Improve mobility / flexibility", value: "improve_flexibility" },
];

const goalTargetPlaceholder: Record<string, string> = {
	lose_weight: "Example: 75 kg by September",
	build_muscle: "Example: gain 4 kg over 6 months",
	improve_endurance: "Example: run 5K in 8 weeks",
	general_fitness: "Example: train 4 days/week consistently",
	build_strength: "Example: squat 100 kg or improve push-ups",
	improve_flexibility: "Example: touch toes or reduce back tightness",
};

const experienceOptions: Option[] = [
	{ label: "Beginner", value: "beginner" },
	{ label: "Intermediate", value: "intermediate" },
	{ label: "Advanced", value: "advanced" },
];

const locationOptions: Option[] = [
	{ label: "Home", value: "home" },
	{ label: "Gym", value: "gym" },
	{ label: "Outdoors", value: "outdoors" },
];

const equipmentOptions: Option[] = [
	{ label: "Dumbbells", value: "dumbbells" },
	{ label: "Barbell", value: "barbell" },
	{ label: "Machines", value: "machines" },
	{ label: "Bands", value: "bands" },
	{ label: "Body weight", value: "bodyweight" },
	{ label: "Full gym access", value: "full_gym_access" },
];

const machineOptions: Option[] = [
	{ label: "Cable machine", value: "cable_machine" },
	{ label: "Leg press", value: "leg_press" },
	{ label: "Smith machine", value: "smith_machine" },
	{ label: "Lat pulldown", value: "lat_pulldown" },
	{ label: "Chest press", value: "chest_press" },
	{ label: "Leg curl / extension", value: "leg_curl_extension" },
];

const sessionLengthOptions: Option[] = [
	{ label: "30 min", value: "30" },
	{ label: "45 min", value: "45" },
	{ label: "60 min", value: "60" },
	{ label: "60+ min", value: "60_plus" },
];

const weekdayOptions: Option[] = [
	{ label: "Sunday", value: "Sunday" },
	{ label: "Monday", value: "Monday" },
	{ label: "Tuesday", value: "Tuesday" },
	{ label: "Wednesday", value: "Wednesday" },
	{ label: "Thursday", value: "Thursday" },
	{ label: "Friday", value: "Friday" },
	{ label: "Saturday", value: "Saturday" },
];

const dietOptions: Option[] = [
	{ label: "No restrictions", value: "no_restrictions" },
	{ label: "Vegetarian", value: "vegetarian" },
	{ label: "Vegan", value: "vegan" },
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
	}

	if (stepIndex === 4 && !profile.dietType) {
		return "Choose a diet type to generate your plan.";
	}

	return null;
}

export default function Onboarding({ authUser, onComplete }: OnboardingProps) {
	const navigate = useNavigate();
	const [stepIndex, setStepIndex] = useState(0);
	const [profile, setProfile] = useState<OnboardingProfile>(initialProfile);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isCheckingPendingJob, setIsCheckingPendingJob] = useState(() =>
		Boolean(authUser),
	);
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
	const goalTarget = {
		label: "Goal target",
		placeholder: goalTargetPlaceholder[profile.primaryGoal],
	};
	const hasMachines = profile.equipmentAvailable.includes("machines");

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
	}, [authUser?.id, onComplete]);

	if (isCheckingPendingJob) {
		return (
			<div className="grid min-h-[calc(100vh-78px)] place-items-center px-4 text-sm font-black uppercase tracking-[0.08em] text-muted">
				Loading
			</div>
		);
	}

	if (
		authUser?.hasGeneratedPlan &&
		!hasPendingJob &&
		!isConfirmationStep &&
		!isResultStep
	) {
		return <Navigate to="/dashboard" replace />;
	}

	const updateProfile = <Key extends keyof OnboardingProfile>(
		key: Key,
		value: OnboardingProfile[Key],
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
					label: goalTarget.label,
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
					{stepIndex === 0 ? (
						<div className="grid gap-5 md:grid-cols-2">
							<Field label="Age">
								<TextInput
									type="number"
									required
									min={MIN_REASONABLE_AGE}
									max={MAX_REASONABLE_AGE}
									step={1}
									value={profile.age}
									placeholder="28"
									onChange={(value) => updateProfile("age", value)}
								/>
							</Field>
							<Field label="Biological sex">
								<Select
									required
									value={profile.biologicalSex}
									options={sexOptions}
									placeholder="Select one"
									onChange={(value) => updateProfile("biologicalSex", value)}
								/>
							</Field>
							<Field label="Height (cm)">
								<TextInput
									type="number"
									required
									min={MIN_REASONABLE_HEIGHT_CM}
									max={MAX_REASONABLE_HEIGHT_CM}
									step={1}
									value={profile.height}
									placeholder="178"
									onChange={(value) => updateProfile("height", value)}
								/>
							</Field>
							<Field label="Current weight (kg)	">
								<TextInput
									type="number"
									required
									min={MIN_REASONABLE_WEIGHT_KG}
									max={MAX_REASONABLE_WEIGHT_KG}
									step={1}
									value={profile.currentWeight}
									placeholder="82"
									onChange={(value) => updateProfile("currentWeight", value)}
								/>
							</Field>
						</div>
					) : null}

					{stepIndex === 1 ? (
						<div className="grid gap-5">
							<ChoiceGrid
								label="Primary goal"
								options={goalOptions}
								value={profile.primaryGoal}
								onChange={(value) =>
									updateProfile("primaryGoal", value as string)
								}
							/>
							{profile.primaryGoal ? (
								<Field label={goalTarget.label}>
									<TextInput
										value={profile.goalTarget || ""}
										placeholder={goalTarget.placeholder}
										onChange={(value) => updateProfile("goalTarget", value)}
									/>
								</Field>
							) : null}
						</div>
					) : null}

					{stepIndex === 2 ? (
						<div className="grid gap-5">
							<ChoiceGrid
								label="Experience level"
								options={experienceOptions}
								value={profile.experienceLevel}
								className="sm:grid-cols-3"
								onChange={(value) =>
									updateProfile("experienceLevel", value as string)
								}
							/>
							<Field label="Injuries or physical limitations">
								<TextArea
									value={profile.injuriesOrLimitations}
									placeholder="Knees, back, shoulders, none..."
									onChange={(value) =>
										updateProfile("injuriesOrLimitations", value)
									}
								/>
							</Field>
						</div>
					) : null}

					{stepIndex === 3 ? (
						<div className="grid gap-5">
							<ChoiceGrid
								label="Where you'll train"
								options={locationOptions}
								value={profile.trainingLocation}
								className="sm:grid-cols-3"
								onChange={(value) =>
									updateProfile("trainingLocation", value as string)
								}
							/>
							<ChoiceGrid
								label="Equipment available"
								multi
								options={equipmentOptions}
								value={profile.equipmentAvailable}
								onChange={(value) => updateEquipment(value as string[])}
							/>
							{hasMachines ? (
								<div className="grid gap-4 rounded-xl border border-border bg-surface-soft p-4">
									<ChoiceGrid
										label="Machines available"
										multi
										options={machineOptions}
										value={profile.machineTypes}
										onChange={(value) =>
											updateProfile("machineTypes", value as string[])
										}
									/>
									<Field label="Other machines">
										<TextInput
											value={profile.customMachines || ""}
											placeholder="Example: hack squat, pec deck, row machine"
											onChange={(value) =>
												updateProfile("customMachines", value)
											}
										/>
									</Field>
								</div>
							) : null}
							<div className="grid gap-5 md:grid-cols-2">
								<Field label="Available workout days">
									<MultiSelectDropdown
										options={weekdayOptions}
										value={profile.availableDays}
										placeholder="Select days"
										onChange={(value) => updateProfile("availableDays", value)}
									/>
								</Field>
								<Field label="Preferred session length">
									<Select
										required
										value={profile.preferredSessionLength}
										placeholder="Select length"
										options={sessionLengthOptions}
										onChange={(value) =>
											updateProfile("preferredSessionLength", value)
										}
									/>
								</Field>
							</div>
						</div>
					) : null}

					{stepIndex === 4 ? (
						<div className="grid gap-5">
							<ChoiceGrid
								label="Diet type"
								options={dietOptions}
								value={profile.dietType}
								className="sm:grid-cols-3"
								onChange={(value) => updateProfile("dietType", value as string)}
							/>
							<Field label="Allergies or Other Diet Restrictions: Specify here">
								<TextArea
									value={profile.allergiesOrFoodsToAvoid}
									placeholder="Example: peanuts, shellfish, dairy, halal, kosher"
									onChange={(value) =>
										updateProfile("allergiesOrFoodsToAvoid", value)
									}
								/>
							</Field>
							<Field label="Meal frequency preference">
								<TextInput
									value={profile.mealFrequencyPreference || ""}
									placeholder="Optional, e.g. 3 meals or 5 smaller meals"
									onChange={(value) =>
										updateProfile("mealFrequencyPreference", value)
									}
								/>
							</Field>
						</div>
					) : null}

					{!isConfirmationStep && errorMessage ? (
						<p
							className="m-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
							role="alert"
						>
							{errorMessage}
						</p>
					) : null}

					{isConfirmationStep ? (
						<div className="grid gap-5">
							<div className="grid gap-4 rounded-xl border border-border bg-surface-soft p-5">
								<div className="grid gap-2">
									<p className="m-0 text-xs font-black uppercase tracking-widest text-primary">
										Review answers
									</p>
									<p className="m-0 text-lg font-bold text-secondary">
										Please confirm the details below before we save your
										profile.
									</p>
								</div>
								{summarySections.map((section) => (
									<div
										key={section.title}
										className="grid gap-2 rounded-xl border border-border bg-white p-4"
									>
										<p className="m-0 text-sm font-black uppercase tracking-widest text-muted">
											{section.title}
										</p>
										<div className="grid gap-2">
											{section.items.map((item) => (
												<div
													key={item.label}
													className="grid gap-1 border-b border-dashed border-border-dashed pb-2 last:border-b-0 last:pb-0"
												>
													<p className="m-0 text-xs font-bold uppercase tracking-widest text-summary-label">
														{item.label}
													</p>
													<p className="m-0 text-sm font-semibold text-secondary">
														{item.value}
													</p>
												</div>
											))}
										</div>
									</div>
								))}
							</div>
						</div>
					) : null}

					{isResultStep ? (
						<div className="grid gap-5">
							<div className="grid gap-4 rounded-xl border border-border bg-surface-soft p-5">
								<div className="grid gap-2">
									<p
										className={`m-0 text-xs font-black uppercase tracking-widest ${
											submissionState.status === "error"
												? "text-red-600"
												: "text-primary"
										}`}
									>
										{submissionState.status === "error"
											? "Submission failed"
											: submissionState.status === "success"
												? "Submission complete"
												: "Submission in progress"}
									</p>
									<p className="m-0 text-lg font-bold text-secondary">
										{submissionState.message ??
											"Hang tight while your onboarding details are checked and your first plan is generated."}
									</p>
								</div>
								{submissionState.status === "idle" ? (
									<p className="m-0 text-sm leading-6 text-muted">
										Realtime updates will appear below as they stream in.
									</p>
								) : null}
								{submissionState.status === "success" ? (
									<p className="m-0 text-sm leading-6 text-muted">
										Your onboarding profile and first plan are ready. You can
										continue to your dashboard now.
									</p>
								) : null}
								{submissionState.status === "error" ? (
									<p className="m-0 text-sm leading-6 text-red-700">
										Please review your answers and make any needed changes
										before submitting again.
									</p>
								) : null}
								{submissionProgress.length > 0 ? (
									<div className="grid gap-2 border-t border-border pt-4">
										<p className="m-0 text-xs font-black uppercase tracking-widest text-muted">
											Realtime status
										</p>
										{submissionProgress.map((event, index) => {
											const isError = event.stage === "error";
											const isCurrent =
												isSubmitting && index === submissionProgress.length - 1;

											return (
												<div
													key={`${event.stage}-${index}`}
													className="grid grid-cols-[0.75rem_1fr] items-start gap-3"
												>
													<span
														className={`mt-1 h-3 w-3 rounded-full border ${
															isError
																? "border-red-500 bg-red-500"
																: isCurrent
																	? "border-warning bg-warning"
																	: "border-primary bg-primary"
														}`}
													/>
													<div className="grid gap-0.5">
														<p
															className={`m-0 text-sm font-black ${
																isError ? "text-red-700" : "text-secondary"
															}`}
														>
															{isError ? "There is an issue" : event.message}
														</p>
														{isError ? (
															<p className="m-0 text-sm leading-5 text-red-700">
																{event.message}
															</p>
														) : null}
													</div>
												</div>
											);
										})}
									</div>
								) : null}
							</div>
						</div>
					) : null}

					<div className="flex flex-wrap justify-between gap-3 border-t border-border pt-5">
						{isConfirmationStep ? (
							<>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="h-10 min-w-40 px-10 disabled:cursor-not-allowed disabled:opacity-50"
									disabled={isSubmitting}
									onClick={handleEditSubmission}
								>
									Edit answers
								</Button>
								<Button
									type="submit"
									size="sm"
									className="h-10 min-w-40 px-10 disabled:cursor-not-allowed disabled:opacity-60"
									disabled={isSubmitting}
								>
									{isSubmitting ? "Working" : "Submit answers"}
								</Button>
							</>
						) : isResultStep ? (
							<>
								{submissionState.status === "error" ? (
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="h-10 min-w-40 px-10 disabled:cursor-not-allowed disabled:opacity-50"
										disabled={isSubmitting}
										onClick={handleEditSubmission}
									>
										Edit answers
									</Button>
								) : null}
								{submissionState.status === "success" ? (
									<Button
										type="button"
										size="sm"
										className="h-10 min-w-40 px-10 disabled:cursor-not-allowed disabled:opacity-60"
										disabled={isSubmitting || !submissionState.user}
										onClick={async () => {
											if (!submissionState.user) {
												return;
											}

											const refreshedUser = await refreshCurrentUser(
												submissionState.user,
											);
											onComplete(refreshedUser);
											navigate("/dashboard", { replace: true });
										}}
									>
										Continue to dashboard
									</Button>
								) : null}
							</>
						) : (
							<>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="h-10 min-w-40 px-10 disabled:cursor-not-allowed disabled:opacity-50"
									disabled={stepIndex === 0 || isSubmitting}
									onClick={goToPreviousStep}
								>
									Back
								</Button>
								<Button
									type="submit"
									size="sm"
									className="h-10 min-w-40 px-10 disabled:cursor-not-allowed disabled:opacity-60"
									disabled={isSubmitting}
								>
									{stepIndex === steps.length - 3 ? "Review answers" : "Next"}
								</Button>
							</>
						)}
					</div>
				</form>
			</section>
		</div>
	);
}
