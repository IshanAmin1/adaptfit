// ProgressCard component that renders the progress card section on the dashboard.
export default function ProgressCard() {
  return (
    <div className="card progress-card" id="progress">
      <div className="split-title">
        <div>
          <p className="tiny-label">Progress feedback</p>
          <h2>Weekly evolution</h2>
        </div>
        <strong className="trend">+12%</strong>
      </div>

      <div className="line-chart" aria-label="Weekly performance trend">
        <div className="grid-line top"></div>
        <div className="grid-line middle"></div>
        <svg viewBox="0 0 300 120" role="img" aria-label="Performance line rising across the week">
          <polyline className="chart-area" points="0,95 45,86 90,90 135,66 180,54 225,34 270,42 300,20 300,120 0,120"></polyline>
          <polyline className="chart-line" points="0,95 45,86 90,90 135,66 180,54 225,34 270,42 300,20"></polyline>
          <circle cx="300" cy="20" r="5"></circle>
        </svg>
      </div>

      <div className="day-labels">
        <span>Mon</span>
        <span>Wed</span>
        <span>Today</span>
      </div>
    </div>
  );
}