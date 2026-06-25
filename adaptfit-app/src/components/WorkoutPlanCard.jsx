// WorkoutPlanCard component that renders the workout plan card section on the dashboard.
export default function WorkoutPlanCard() {
  return (
    <div className="card workout-plan-card" id="today">
      <div className="workout-plan-header">
        <div>
          <p className="tiny-label">Today's AI-generated plan</p>
          <h1>Upper Body Strength</h1>
        </div>
        <div className="score-ring" aria-label="Plan completion 25 percent">
          <span>25%</span>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-box">
          <span>Estimated Time</span>
          <strong>48 min</strong>
        </div>
        <div className="stat-box">
          <span>Intensity</span>
          <strong>Moderate</strong>
        </div>
        <div className="stat-box wide">
          <span>Generated From</span>
          <strong>Goals, equipment, experience, diet</strong>
        </div>
      </div>

      <div className="exercise-strip">
        <div>
          <span>1</span>
          <strong>Dumbbell bench press</strong>
          <p>4 sets x 8 reps</p>
        </div>
        <div>
          <span>2</span>
          <strong>One-arm row</strong>
          <p>4 sets x 10 reps</p>
        </div>
        <div>
          <span>3</span>
          <strong>Shoulder press</strong>
          <p>3 sets x 9 reps</p>
        </div>
      </div>

      <button className="primary-button">Start workout</button>
    </div>
  );
}
