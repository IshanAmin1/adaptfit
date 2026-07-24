export type PlanExerciseAlternative = {
	exercise_name: string;
	reason_for_alternative: string;
};

export type PlanExercise = {
	exercise_name: string;
	target_muscle_group: string;
	sets: number;
	reps: string;
	rest_seconds: number;
	equipment_needed: string[];
	alternatives: PlanExerciseAlternative[];
	day?: string;
	session_type?: string;
};

export type PlanScheduleDay = {
	day: string;
	session_type: string;
	duration_minutes: number;
	exercises: PlanExercise[];
};

export type PlanTargets = {
	bmi?: number;
	bmr: number;
	tdee: number;
	target_physique_description: string;
};

export type PlanNutrients = {
	daily_calories: number;
	macros: {
		protein_g: number;
		carbs_g: number;
		fat_g: number;
	};
	meal_frequency: number;
	sample_meals: {
		meal_name: string;
		description: string;
		estimated_calories: number;
	}[];
};

export type GeneratedPlan = {
	id: string;
	status: string;
	onboardingProfile: {
		age: number;
		biologicalSex: string;
		height: number;
		currentWeight: number;
		primaryGoal: string;
		targetWeightOrTimeline?: string;
		experienceLevel: string;
		injuriesOrLimitations?: string;
		trainingLocation: string;
		equipmentAvailable: string[];
		machineTypes: string[];
		customMachines?: string;
		availableDays?: string[];
		preferredSessionLength: string;
		dietType: string;
		allergiesOrFoodsToAvoid?: string;
		mealFrequencyPreference?: string;
	} | null;
	metadata: {
		generated_at: string;
		plan_version: string;
		user_goal: string;
		disclaimer: string;
	};
	targets: PlanTargets;
	nutrients: PlanNutrients;
	schedule: PlanScheduleDay[];
	exercises: PlanExercise[];
	adaptiveNotes: {
		adjustment_triggers: string[];
	};
	generatedAt: string;
};
