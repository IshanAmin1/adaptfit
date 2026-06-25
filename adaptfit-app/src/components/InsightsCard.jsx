// InsightsCard component that renders the insights card section on the dashboard.
export default function InsightsCard() {
  return (
    <div className="card insights-card" id="insights">
      <div className="card-title">
        <div className="icon-badge">AI</div>
        <div>
          <p className="tiny-label">Adaptive insights</p>
          <h2>Plan calibration</h2>
        </div>
      </div>

      <div className="insight-list">
        <div>
          <strong>Intensity increased by 6%</strong>
          <p>Workout completion stayed high last week, so AdaptFit adds one extra rowing set.</p>
        </div>
        <div>
          <strong>Exercise alternative suggested</strong>
          <p>Skipped lateral raises are replaced with a shoulder press variation.</p>
        </div>
      </div>
    </div>
  );
}