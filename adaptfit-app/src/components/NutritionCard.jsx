// NutritionCard component that renders the nutrition card section on the dashboard.
export default function NutritionCard() {
  return (
    <div className="card nutrition-card" id="nutrition">
      <div className="split-title">
        <div>
          <p className="tiny-label">Nutrition planning</p>
          <h2>Daily targets</h2>
        </div>
        <span className="status-chip">Personalized</span>
      </div>

      <div className="calorie-progress">
        <div className="progress-label">
          <span>Calories</span>
          <strong>1,850 / 2,350 kcal</strong>
        </div>
        <div className="progress-track">
          <span className="fill calories"></span>
        </div>
      </div>

      <div className="macro-grid">
        <div>
          <div className="progress-label">
            <span>Protein</span>
            <strong>120g</strong>
          </div>
          <div className="progress-track small"><span className="fill protein"></span></div>
        </div>
        <div>
          <div className="progress-label">
            <span>Carbs</span>
            <strong>200g</strong>
          </div>
          <div className="progress-track small"><span className="fill carbs"></span></div>
        </div>
        <div>
          <div className="progress-label">
            <span>Fat</span>
            <strong>45g</strong>
          </div>
          <div className="progress-track small"><span className="fill fat"></span></div>
        </div>
      </div>

      <button className="secondary-button">Log next meal</button>
    </div>
  );
}