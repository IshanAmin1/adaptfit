import InsightsCard from "./InsightsCard";
import NutritionCard from "./NutritionCard";
import ProgressCard from "./ProgressCard";
import WorkoutPlanCard from "./WorkoutPlanCard";

export default function Dashboard() {
	return (
		<div className="mx-auto grid w-full max-w-336 grid-cols-1 gap-6 px-4 pb-12 pt-8 md:px-12 lg:grid-cols-12">
			<WorkoutPlanCard />
			<InsightsCard />
			<NutritionCard />
			<ProgressCard />
		</div>
	);
}
