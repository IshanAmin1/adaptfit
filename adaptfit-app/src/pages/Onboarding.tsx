import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { onboardingService } from "../api/onboarding-service";
import type { AuthUser } from "../types/auth";
import type { Option } from "../components/common/Select";
import ChoiceGrid from "../components/common/ChoiceGrid";
import Field from "../components/common/Field";
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
	daysPerWeek: "",
	preferredSessionLength: "",
	dietType: "",
	allergiesOrFoodsToAvoid: "",
	mealFrequencyPreference: "",
};

const steps = ["Basics", "Goals", "Experience", "Training", "Nutrition"];

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
	{ label: "Bodyweight only", value: "bodyweight_only" },
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

const dietOptions: Option[] = [
	{ label: "No restrictions", value: "no_restrictions" },
	{ label: "Vegetarian", value: "vegetarian" },
	{ label: "Vegan", value: "vegan" },
];

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
	const progressPercent = Math.round(
		(stepIndex / Math.max(steps.length - 1, 1)) * 100,
	);
	const isLastStep = stepIndex === steps.length - 1;
	const goalTarget = goalTargetCopy[profile.primaryGoal] || {
		label: "Target or timeline",
		placeholder: "Optional",
	};
	const hasMachines = profile.equipmentAvailable.includes("machines");

	if (authUser?.hasCompletedOnboarding) {
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
		setStepIndex((currentStep) => Math.max(currentStep - 1, 0));
	};

	const handleSubmit = () => {
		const stepError = getStepError(stepIndex, profile);

		if (stepError) {
			setErrorMessage(stepError);
			return;
		}

		setIsSubmitting(true);
		setErrorMessage(null);

		onboardingService
			.submitProfile(profile)
			.then((user) => {
				onComplete(user);
				navigate("/dashboard", { replace: true });
			})
			.catch(() => {
				setErrorMessage("Your onboarding details could not be saved.");
			})
			.finally(() => {
				setIsSubmitting(false);
			});
	};

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

						if (!isLastStep) {
							goToNextStep();
							return;
						}

						handleSubmit();
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
								<Field label="Days per week available">
									<Select
										required
										value={profile.daysPerWeek}
										placeholder="Select days"
										options={[1, 2, 3, 4, 5, 6, 7].map((day) => ({
											label: `${day} ${day === 1 ? "day" : "days"}`,
											value: String(day),
										}))}
										onChange={(value) => updateProfile("daysPerWeek", value)}
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

					{errorMessage ? (
						<p
							className="m-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
							role="alert"
						>
							{errorMessage}
						</p>
					) : null}

					<div className="flex flex-wrap justify-between gap-3 border-t border-[#d9e5df] pt-5">
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
							{isLastStep
								? isSubmitting
									? "Saving"
									: "Generate plan"
								: "Next"}
						</button>
					</div>
				</form>
			</section>
		</div>
	);
}
