import type { OnboardingProgressEvent } from "../../api/onboarding-service";
import type { AuthUser } from "../../types/auth";
import type { OnboardingProfile } from "../../types/onboarding";
import { Button } from "../common/Button";
import ChoiceGrid from "../common/ChoiceGrid";
import Field from "../common/Field";
import MultiSelectDropdown from "../common/MultiSelectDropdown";
import type { Option } from "../common/Select";
import Select from "../common/Select";
import TextArea from "../common/TextArea";
import TextInput from "../common/TextInput";

export const MIN_REASONABLE_AGE = 13;
export const MAX_REASONABLE_AGE = 100;
export const MIN_REASONABLE_HEIGHT_CM = 100;
export const MAX_REASONABLE_HEIGHT_CM = 250;
export const MIN_REASONABLE_WEIGHT_KG = 45;
export const MAX_REASONABLE_WEIGHT_KG = 91;

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

type SubmissionState = {
	status: "idle" | "success" | "error";
	message: string | null;
	user: AuthUser | null;
};

type SummarySection = {
	title: string;
	items: { label: string; value: string }[];
};

type UpdateProfile = (
	key: keyof OnboardingProfile,
	value: string | string[],
) => void;

type StepContentProps = {
	stepIndex: number;
	profile: OnboardingProfile;
	errorMessage: string | null;
	isConfirmationStep: boolean;
	isResultStep: boolean;
	isSubmitting: boolean;
	submissionState: SubmissionState;
	submissionProgress: OnboardingProgressEvent[];
	summarySections: SummarySection[];
	updateProfile: UpdateProfile;
	updateEquipment: (equipmentAvailable: string[]) => void;
};

type StepFormProps = {
	profile: OnboardingProfile;
	updateProfile: UpdateProfile;
};

type TrainingStepProps = StepFormProps & {
	hasMachines: boolean;
	updateEquipment: (equipmentAvailable: string[]) => void;
};

type ResultStepProps = {
	isSubmitting: boolean;
	submissionState: SubmissionState;
	submissionProgress: OnboardingProgressEvent[];
};

function getGoalTargetPlaceholder(goal: string) {
	if (goal === "lose_weight") return "Example: 75 kg by September";
	if (goal === "build_muscle") return "Example: gain 4 kg over 6 months";
	if (goal === "improve_endurance") return "Example: run 5K in 8 weeks";
	if (goal === "general_fitness")
		return "Example: train 4 days/week consistently";
	if (goal === "build_strength")
		return "Example: squat 100 kg or improve push-ups";
	if (goal === "improve_flexibility")
		return "Example: touch toes or reduce back tightness";
	return "";
}

type FooterActionsProps = {
	stepIndex: number;
	stepsLength: number;
	isConfirmationStep: boolean;
	isResultStep: boolean;
	isSubmitting: boolean;
	submissionState: SubmissionState;
	onBack: () => void;
	onEditSubmission: () => void;
	onContinue: () => void;
};

export function OnboardingStepContent({
	stepIndex,
	profile,
	errorMessage,
	isConfirmationStep,
	isResultStep,
	isSubmitting,
	submissionState,
	submissionProgress,
	summarySections,
	updateProfile,
	updateEquipment,
}: StepContentProps) {
	const hasMachines = profile.equipmentAvailable.includes("machines");

	if (isConfirmationStep) {
		return <ReviewStep summarySections={summarySections} />;
	}

	if (isResultStep) {
		return (
			<ResultStep
				isSubmitting={isSubmitting}
				submissionState={submissionState}
				submissionProgress={submissionProgress}
			/>
		);
	}

	return (
		<>
			{stepIndex === 0 ? (
				<BasicsStep profile={profile} updateProfile={updateProfile} />
			) : null}
			{stepIndex === 1 ? (
				<GoalsStep profile={profile} updateProfile={updateProfile} />
			) : null}
			{stepIndex === 2 ? (
				<ExperienceStep profile={profile} updateProfile={updateProfile} />
			) : null}
			{stepIndex === 3 ? (
				<TrainingStep
					profile={profile}
					hasMachines={hasMachines}
					updateProfile={updateProfile}
					updateEquipment={updateEquipment}
				/>
			) : null}
			{stepIndex === 4 ? (
				<NutritionStep profile={profile} updateProfile={updateProfile} />
			) : null}
			{errorMessage ? (
				<p
					className="m-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
					role="alert"
				>
					{errorMessage}
				</p>
			) : null}
		</>
	);
}

export function OnboardingFooterActions({
	stepIndex,
	stepsLength,
	isConfirmationStep,
	isResultStep,
	isSubmitting,
	submissionState,
	onBack,
	onEditSubmission,
	onContinue,
}: FooterActionsProps) {
	if (isConfirmationStep) {
		return (
			<>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-10 min-w-40 px-10 disabled:cursor-not-allowed disabled:opacity-50"
					disabled={isSubmitting}
					onClick={onEditSubmission}
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
		);
	}

	if (isResultStep) {
		return (
			<>
				{submissionState.status === "error" ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-10 min-w-40 px-10 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={isSubmitting}
						onClick={onEditSubmission}
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
						onClick={onContinue}
					>
						Continue to dashboard
					</Button>
				) : null}
			</>
		);
	}

	return (
		<>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="h-10 min-w-40 px-10 disabled:cursor-not-allowed disabled:opacity-50"
				disabled={stepIndex === 0 || isSubmitting}
				onClick={onBack}
			>
				Back
			</Button>
			<Button
				type="submit"
				size="sm"
				className="h-10 min-w-40 px-10 disabled:cursor-not-allowed disabled:opacity-60"
				disabled={isSubmitting}
			>
				{stepIndex === stepsLength - 3 ? "Review answers" : "Next"}
			</Button>
		</>
	);
}

function BasicsStep({ profile, updateProfile }: StepFormProps) {
	return (
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
	);
}

function GoalsStep({ profile, updateProfile }: StepFormProps) {
	return (
		<div className="grid gap-5">
			<ChoiceGrid
				label="Primary goal"
				options={goalOptions}
				value={profile.primaryGoal}
				onChange={(value) => updateProfile("primaryGoal", value)}
			/>
			{profile.primaryGoal ? (
				<Field label="Goal target">
					<TextInput
						value={profile.goalTarget || ""}
						placeholder={getGoalTargetPlaceholder(profile.primaryGoal)}
						onChange={(value) => updateProfile("goalTarget", value)}
					/>
				</Field>
			) : null}
		</div>
	);
}

function ExperienceStep({ profile, updateProfile }: StepFormProps) {
	return (
		<div className="grid gap-5">
			<ChoiceGrid
				label="Experience level"
				options={experienceOptions}
				value={profile.experienceLevel}
				className="sm:grid-cols-3"
				onChange={(value) => updateProfile("experienceLevel", value)}
			/>
			<Field label="Injuries or physical limitations">
				<TextArea
					value={profile.injuriesOrLimitations}
					placeholder="Knees, back, shoulders, none..."
					onChange={(value) => updateProfile("injuriesOrLimitations", value)}
				/>
			</Field>
		</div>
	);
}

function TrainingStep({
	profile,
	hasMachines,
	updateProfile,
	updateEquipment,
}: TrainingStepProps) {
	return (
		<div className="grid gap-5">
			<ChoiceGrid
				label="Where you'll train"
				options={locationOptions}
				value={profile.trainingLocation}
				className="sm:grid-cols-3"
				onChange={(value) => updateProfile("trainingLocation", value)}
			/>
			<ChoiceGrid
				label="Equipment available"
				multi
				options={equipmentOptions}
				value={profile.equipmentAvailable}
				onChange={(value) => {
					if (Array.isArray(value)) {
						updateEquipment(value);
					}
				}}
			/>
			{hasMachines ? (
				<div className="grid gap-4 rounded-xl border border-border bg-surface-soft p-4">
					<ChoiceGrid
						label="Machines available"
						multi
						options={machineOptions}
						value={profile.machineTypes}
						onChange={(value) => updateProfile("machineTypes", value)}
					/>
					<Field label="Other machines">
						<TextInput
							value={profile.customMachines || ""}
							placeholder="Example: hack squat, pec deck, row machine"
							onChange={(value) => updateProfile("customMachines", value)}
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
						onChange={(value) => updateProfile("preferredSessionLength", value)}
					/>
				</Field>
			</div>
		</div>
	);
}

function NutritionStep({ profile, updateProfile }: StepFormProps) {
	return (
		<div className="grid gap-5">
			<ChoiceGrid
				label="Diet type"
				options={dietOptions}
				value={profile.dietType}
				className="sm:grid-cols-3"
				onChange={(value) => updateProfile("dietType", value)}
			/>
			<Field label="Allergies or Other Diet Restrictions: Specify here">
				<TextArea
					value={profile.allergiesOrFoodsToAvoid}
					placeholder="Example: peanuts, shellfish, dairy, halal, kosher"
					onChange={(value) => updateProfile("allergiesOrFoodsToAvoid", value)}
				/>
			</Field>
			<Field label="Meal frequency preference">
				<TextInput
					value={profile.mealFrequencyPreference || ""}
					placeholder="Optional, e.g. 3 meals or 5 smaller meals"
					onChange={(value) => updateProfile("mealFrequencyPreference", value)}
				/>
			</Field>
		</div>
	);
}

function ReviewStep({
	summarySections,
}: {
	summarySections: SummarySection[];
}) {
	return (
		<div className="grid gap-5">
			<div className="grid gap-4 rounded-xl border border-border bg-surface-soft p-5">
				<div className="grid gap-2">
					<p className="m-0 text-xs font-black uppercase tracking-widest text-primary">
						Review answers
					</p>
					<p className="m-0 text-lg font-bold text-secondary">
						Please confirm the details below before we save your profile.
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
	);
}

function ResultStep({
	isSubmitting,
	submissionState,
	submissionProgress,
}: ResultStepProps) {
	return (
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
						Your onboarding profile and first plan are ready. You can continue
						to your dashboard now.
					</p>
				) : null}
				{submissionState.status === "error" ? (
					<p className="m-0 text-sm leading-6 text-red-700">
						Please review your answers and make any needed changes before
						submitting again.
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
	);
}
