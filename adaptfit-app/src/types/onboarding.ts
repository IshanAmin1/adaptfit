export type OnboardingProfile = {
	age: string;
	biologicalSex: string;
	height: string;
	currentWeight: string;
	primaryGoal: string;
	targetWeightOrTimeline?: string;
	experienceLevel: string;
	injuriesOrLimitations: string;
	trainingLocation: string;
	equipmentAvailable: string[];
	machineTypes: string[];
	customMachines?: string;
	availableDays: string[];
	preferredSessionLength: string;
	dietType: string;
	allergiesOrFoodsToAvoid: string;
	mealFrequencyPreference?: string;
};
