import WorkoutPlanCard from './WorkoutPlanCard';
import InsightsCard from './InsightsCard';
import NutritionCard from './NutritionCard';
import ProgressCard from './ProgressCard';

// Dashboard component that renders the main dashboard layout with various cards.
export default function Dashboard() {
  return (
    <div className="app-grid">
      <WorkoutPlanCard />
      <InsightsCard />
      <NutritionCard />
      <ProgressCard />
    </div>
  );
}
