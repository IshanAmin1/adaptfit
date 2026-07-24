import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { onboardingService } from "../api/onboarding-service";
import type { OnboardingProgressEvent } from "../api/onboarding-service";
import type { AuthUser } from "../types/auth";
import type { Option } from "../components/common/Select";
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
const MIN_REASONABLE_WEIGHT_KG = 30;
const MAX_REASONABLE_WEIGHT_KG = 300;

const initialProfile: OnboardingProfile = {
	age: "",
	biologicalSex: "",
	height: "",
	currentWeight: "",
	primaryGoal: "",
	targetWeightOrTimeline: "",
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

const goalTargetCopy: Record<string, { label: string; placeholder: string }> = {
	lose_weight: {
		label: "Target weight and timeline",
		placeholder: "Example: 75 kg by September",
	},
	build_muscle: {
		label: "Muscle gain target",
		placeholder: "Example: gain 4 kg over 6 months",
	},
	improve_endurance: {
		label: "Endurance target",
		placeholder: "Example: run 5K in 8 weeks",
	},
	general_fitness: {
		label: "Fitness target",
		placeholder: "Example: train 4 days/week consistently",
	},
	build_strength: {
		label: "Strength target",
		placeholder: "Example: squat 100 kg or improve push-ups",
	},
	improve_flexibility: {
		label: "Mobility or flexibility target",
		placeholder: "Example: touch toes or reduce back tightness",
	},
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
	const goalTarget = goalTargetCopy[profile.primaryGoal] || {
		label: "Target or timeline",
		placeholder: "Optional",
	};
	const hasMachines = profile.equipmentAvailable.includes("machines");

	if (
		authUser?.hasCompletedOnboarding &&
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

			setSubmissionState({
				status: "success",
				message:
					"Your onboarding details were saved and your first plan is ready.",
				user,
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
					value: formatValue(profile.targetWeightOrTimeline),
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
			<section className="mx-auto grid w-full max-w-264 content-start gap-8 rounded-lg border border-[#d9e5df] bg-white p-6 shadow-[0_24px_70px_rgba(23,33,31,0.10)] md:p-10">
				<div className="grid gap-4">
					<div className="flex flex-wrap items-end justify-between gap-4">
						<div>
							<p className="mb-3 text-xs font-black uppercase tracking-widest text-[#0f8b6f]">
								Step {stepIndex + 1} of {steps.length}
							</p>
							<h1 className="m-0 text-[clamp(2rem,5vw,3.25rem)] font-black leading-none text-[#17211f]">
								{steps[stepIndex]}
							</h1>
						</div>
						<p className="m-0 text-sm font-black uppercase tracking-[0.08em] text-[#62706b]">
							{progressPercent}% complete
						</p>
					</div>
					<div className="h-2 overflow-hidden rounded-full bg-[#d9e5df]">
						<div
							className="h-full rounded-full bg-[#0f8b6f] transition-all"
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
							<Field label="Primary goal">
								<ChoiceGrid
									options={goalOptions}
									value={profile.primaryGoal}
									onChange={(value) =>
										updateProfile("primaryGoal", value as string)
									}
								/>
							</Field>
							{profile.primaryGoal ? (
								<Field label={goalTarget.label}>
									<TextInput
										value={profile.targetWeightOrTimeline || ""}
										placeholder={goalTarget.placeholder}
										onChange={(value) =>
											updateProfile("targetWeightOrTimeline", value)
										}
									/>
								</Field>
							) : null}
						</div>
					) : null}

					{stepIndex === 2 ? (
						<div className="grid gap-5">
							<Field label="Experience level">
								<ChoiceGrid
									options={experienceOptions}
									value={profile.experienceLevel}
									className="sm:grid-cols-3"
									onChange={(value) =>
										updateProfile("experienceLevel", value as string)
									}
								/>
							</Field>
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
							<Field label="Where you'll train">
								<ChoiceGrid
									options={locationOptions}
									value={profile.trainingLocation}
									className="sm:grid-cols-3"
									onChange={(value) =>
										updateProfile("trainingLocation", value as string)
									}
								/>
							</Field>
							<Field label="Equipment available">
								<ChoiceGrid
									multi
									options={equipmentOptions}
									value={profile.equipmentAvailable}
									onChange={(value) => updateEquipment(value as string[])}
								/>
							</Field>
							{hasMachines ? (
								<div className="grid gap-4 rounded-lg border border-[#d9e5df] bg-[#f6faf7] p-4">
									<Field label="Machines available">
										<ChoiceGrid
											multi
											options={machineOptions}
											value={profile.machineTypes}
											onChange={(value) =>
												updateProfile("machineTypes", value as string[])
											}
										/>
									</Field>
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
							<Field label="Diet type">
								<ChoiceGrid
									options={dietOptions}
									value={profile.dietType}
									className="sm:grid-cols-3"
									onChange={(value) =>
										updateProfile("dietType", value as string)
									}
								/>
							</Field>
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
							className="m-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
							role="alert"
						>
							{errorMessage}
						</p>
					) : null}

					{isConfirmationStep ? (
						<div className="grid gap-5">
							<div className="grid gap-4 rounded-lg border border-[#d9e5df] bg-[#f6faf7] p-5">
								<div className="grid gap-2">
									<p className="m-0 text-xs font-black uppercase tracking-widest text-[#0f8b6f]">
										Review answers
									</p>
									<p className="m-0 text-lg font-bold text-[#17211f]">
										Please confirm the details below before we save your
										profile.
									</p>
								</div>
								{summarySections.map((section) => (
									<div
										key={section.title}
										className="grid gap-2 rounded-lg border border-[#d9e5df] bg-white p-4"
									>
										<p className="m-0 text-sm font-black uppercase tracking-widest text-[#62706b]">
											{section.title}
										</p>
										<div className="grid gap-2">
											{section.items.map((item) => (
												<div
													key={item.label}
													className="grid gap-1 border-b border-dashed border-[#e2ece7] pb-2 last:border-b-0 last:pb-0"
												>
													<p className="m-0 text-xs font-bold uppercase tracking-widest text-[#8a9a95]">
														{item.label}
													</p>
													<p className="m-0 text-sm font-semibold text-[#17211f]">
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
							<div className="grid gap-4 rounded-lg border border-[#d9e5df] bg-[#f6faf7] p-5">
								<div className="grid gap-2">
									<p
										className={`m-0 text-xs font-black uppercase tracking-widest ${
											submissionState.status === "error"
												? "text-red-600"
												: "text-[#0f8b6f]"
										}`}
									>
										{submissionState.status === "error"
											? "Submission failed"
											: submissionState.status === "success"
												? "Submission complete"
												: "Submission in progress"}
									</p>
									<p className="m-0 text-lg font-bold text-[#17211f]">
										{submissionState.message ??
											"Hang tight while your onboarding details are checked and your first plan is generated."}
									</p>
								</div>
								{submissionState.status === "idle" ? (
									<p className="m-0 text-sm leading-6 text-[#62706b]">
										Realtime updates will appear below as they stream in.
									</p>
								) : null}
								{submissionState.status === "success" ? (
									<p className="m-0 text-sm leading-6 text-[#62706b]">
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
									<div className="grid gap-2 border-t border-[#d9e5df] pt-4">
										<p className="m-0 text-xs font-black uppercase tracking-widest text-[#62706b]">
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
																	? "border-[#f59e0b] bg-[#f59e0b]"
																	: "border-[#0f8b6f] bg-[#0f8b6f]"
														}`}
													/>
													<div className="grid gap-0.5">
														<p
															className={`m-0 text-sm font-black ${
																isError ? "text-red-700" : "text-[#17211f]"
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

					<div className="flex flex-wrap justify-between gap-3 border-t border-[#d9e5df] pt-5">
						{isConfirmationStep ? (
							<>
								<button
									type="button"
									className="h-10 min-w-40 rounded-md border border-[#b7cbc2] bg-white px-10 font-black text-[#17211f] disabled:cursor-not-allowed disabled:opacity-50"
									disabled={isSubmitting}
									onClick={handleEditSubmission}
								>
									Edit answers
								</button>
								<button
									type="submit"
									className="h-10 min-w-40 rounded-md bg-[#0f8b6f] px-10 font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
									disabled={isSubmitting}
								>
									{isSubmitting ? "Working" : "Submit answers"}
								</button>
							</>
						) : isResultStep ? (
							<>
								{submissionState.status === "error" ? (
									<button
										type="button"
										className="h-10 min-w-40 rounded-md border border-[#b7cbc2] bg-white px-10 font-black text-[#17211f] disabled:cursor-not-allowed disabled:opacity-50"
										disabled={isSubmitting}
										onClick={handleEditSubmission}
									>
										Edit answers
									</button>
								) : null}
								{submissionState.status === "success" ? (
									<button
										type="button"
										className="h-10 min-w-40 rounded-md bg-[#0f8b6f] px-10 font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
										disabled={isSubmitting || !submissionState.user}
										onClick={() => {
											if (submissionState.user) {
												onComplete(submissionState.user);
												navigate("/dashboard", { replace: true });
											}
										}}
									>
										Continue to dashboard
									</button>
								) : null}
							</>
						) : (
							<>
								<button
									type="button"
									className="h-10 min-w-40 rounded-md border border-[#b7cbc2] bg-white px-10 font-black text-[#17211f] disabled:cursor-not-allowed disabled:opacity-50"
									disabled={stepIndex === 0 || isSubmitting}
									onClick={goToPreviousStep}
								>
									Back
								</button>
								<button
									type="submit"
									className="h-10 min-w-40 rounded-md bg-[#0f8b6f] px-10 font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
									disabled={isSubmitting}
								>
									{stepIndex === steps.length - 3 ? "Review answers" : "Next"}
								</button>
							</>
						)}
					</div>
				</form>
			</section>
		</div>
	);
}
