import { useState } from "react";

function getLocalDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromValue(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatScenarioDate(date, relativeLabel = "") {
  const formatted = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
  return relativeLabel ? `${relativeLabel}, ${formatted}` : formatted;
}

function daysAgo(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

const initialScenarios = [
  {
    id: 1,
    title: "Material delay",
    order: "ORD-2012",
    detail: "60 min",
    date: formatScenarioDate(daysAgo(1), "Yesterday"),
    result: "Recovered",
    tone: "recovered",
  },
  {
    id: 2,
    title: "Line 03 absenteeism",
    detail: "15 workers · 4 hours",
    date: formatScenarioDate(daysAgo(4)),
    result: "Recovered",
    tone: "recovered",
  },
  {
    id: 3,
    title: "Power outage",
    detail: "Whole factory · 120 min",
    date: formatScenarioDate(daysAgo(7)),
    result: "Partial recovery",
    tone: "partial",
  },
  {
    id: 4,
    title: "Line 01 quality issue",
    detail: "High reject rate · 90 min",
    date: formatScenarioDate(daysAgo(12)),
    result: "Recovered",
    tone: "recovered",
  },
  {
    id: 5,
    title: "Fabric delay",
    detail: "ORD-1890 · 180 min",
    date: formatScenarioDate(daysAgo(15)),
    result: "Partial recovery",
    tone: "partial",
  },
];

const initialLines = [
  { name: "Line 01", status: "Running", value: "85 / 100", progress: 85 },
  { name: "Line 02", status: "At risk", value: "60 / 100", progress: 60 },
  { name: "Line 03", status: "Running", value: "92 / 100", progress: 92 },
  { name: "Line 04", status: "Running", value: "78 / 100", progress: 78 },
  { name: "Line 05", status: "Idle", value: "0 / 100", progress: 0 },
];

const orders = ["ORD-2048", "ORD-2050", "ORD-2041", "ORD-2012"];
const durations = [
  "30 minutes",
  "60 minutes",
  "90 minutes",
  "120 minutes",
  "180 minutes",
  "4 hours",
];

function SimulationModal({ onClose, onRun }) {
  const [scenarioName, setScenarioName] = useState("Line 02 machine breakdown");
  const [disruptionType, setDisruptionType] = useState("Machine breakdown");
  const [productionLine, setProductionLine] = useState("Line 02");
  const [affectedOrder, setAffectedOrder] = useState("ORD-2048");
  const [startTime, setStartTime] = useState("11:00");
  const [simulationDate, setSimulationDate] = useState(getLocalDateValue());
  const [duration, setDuration] = useState("90 minutes");
  const [severity, setSeverity] = useState("High");
  const [unavailableMachines, setUnavailableMachines] = useState("2");
  const [notes, setNotes] = useState(
    "Simulate sewing machine failure during the morning shift.",
  );

  function submit(event) {
    event.preventDefault();
    onRun({
      scenarioName,
      disruptionType,
      productionLine,
      affectedOrder,
      simulationDate,
      startTime,
      duration,
      severity,
      unavailableMachines,
      notes,
    });
  }

  return (
    <div className="simulation-backdrop" role="presentation">
      <section
        className="simulation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="simulation-dialog-title"
      >
        <div className="simulation-dialog-header">
          <div>
            <h2 id="simulation-dialog-title">Simulate a disruption</h2>
            <p>
              Test how the optimizer recovers from a production interruption.
            </p>
          </div>
          <button
            type="button"
            className="simulation-close"
            aria-label="Close simulation dialog"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="simulation-warning">
          <span>!</span>
          <div>
            <strong>SIMULATION MODE — No live changes</strong>
            <small>
              This simulation will run in a sandbox environment. No changes will
              be made to the live production plan.
            </small>
          </div>
        </div>
        <form className="simulation-form" onSubmit={submit}>
          <div className="simulation-field">
            <label htmlFor="scenario-name">
              Scenario name <b>*</b>
            </label>
            <input
              id="scenario-name"
              required
              value={scenarioName}
              onChange={(event) => setScenarioName(event.target.value)}
            />
          </div>
          <div className="simulation-field">
            <label htmlFor="scenario-type">
              Disruption type <b>*</b>
            </label>
            <select
              id="scenario-type"
              value={disruptionType}
              onChange={(event) => setDisruptionType(event.target.value)}
            >
              <option>Machine breakdown</option>
              <option>Material delay</option>
              <option>Operator absenteeism</option>
              <option>Power outage</option>
              <option>Quality issue</option>
            </select>
          </div>
          <div className="simulation-field">
            <label htmlFor="scenario-line">
              Production line <b>*</b>
            </label>
            <select
              id="scenario-line"
              value={productionLine}
              onChange={(event) => setProductionLine(event.target.value)}
            >
              {initialLines.map((line) => (
                <option key={line.name}>{line.name}</option>
              ))}
            </select>
          </div>
          <div className="simulation-field">
            <label htmlFor="affected-order">
              Affected order <b>*</b>
            </label>
            <select
              id="affected-order"
              value={affectedOrder}
              onChange={(event) => setAffectedOrder(event.target.value)}
            >
              {orders.map((order) => (
                <option key={order}>{order}</option>
              ))}
            </select>
          </div>
          <div className="simulation-field">
            <label htmlFor="scenario-start">
              Start time <b>*</b>
            </label>
            <input
              id="scenario-start"
              type="time"
              required
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </div>
          <div className="simulation-field">
            <label htmlFor="scenario-date">
              Simulation date <span>(optional)</span>
            </label>
            <input
              id="scenario-date"
              type="date"
              value={simulationDate}
              onChange={(event) => setSimulationDate(event.target.value)}
            />
          </div>
          <div className="simulation-field">
            <label htmlFor="scenario-duration">
              Duration <b>*</b>
            </label>
            <select
              id="scenario-duration"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            >
              {durations.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="simulation-field">
            <label htmlFor="scenario-severity">
              Severity <b>*</b>
            </label>
            <select
              id="scenario-severity"
              value={severity}
              onChange={(event) => setSeverity(event.target.value)}
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>
          </div>
          <div className="simulation-field">
            <label htmlFor="unavailable-machines">
              Unavailable machines <b>*</b>
            </label>
            <input
              id="unavailable-machines"
              type="number"
              min="0"
              max="50"
              required
              value={unavailableMachines}
              onChange={(event) => setUnavailableMachines(event.target.value)}
            />
          </div>
          <div className="simulation-field simulation-notes">
            <label htmlFor="scenario-notes">Notes</label>
            <textarea
              id="scenario-notes"
              rows="2"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <div className="simulation-info">
            <span>i</span>The current schedule will be copied into a sandbox.
            Results require review before any live plan is applied.
          </div>
          <div className="simulation-dialog-actions">
            <button
              type="button"
              className="simulation-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="simulation-run">
              <span>▷</span> Run simulation
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function SimulationDashboard() {
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [modalOpen, setModalOpen] = useState(true);
  const [lastScenario, setLastScenario] = useState(null);

  function runSimulation(scenario) {
    const selectedDateValue = scenario.simulationDate || getLocalDateValue();
    const selectedDate = dateFromValue(selectedDateValue);
    const todayValue = getLocalDateValue();
    const relativeLabel = selectedDateValue === todayValue ? "Today" : "";
    setScenarios((current) => [
      {
        id: Date.now(),
        title: scenario.disruptionType,
        order: scenario.affectedOrder,
        detail: scenario.duration,
        date: `${formatScenarioDate(selectedDate, relativeLabel)}, ${scenario.startTime}`,
        result: "Sandbox complete",
        tone: "recovered",
      },
      ...current,
    ]);
    setLastScenario(scenario);
    setModalOpen(false);
  }

  return (
    <section className="simulation-page">
      <div className="simulation-page-heading">
        <div>
          <h1>Disruption simulation</h1>
          <p>
            Test different disruption scenarios and see how the optimizer
            recovers the production plan.
          </p>
        </div>
        <button
          type="button"
          className="simulation-new-button"
          onClick={() => setModalOpen(true)}
        >
          ＋ New simulation
        </button>
      </div>
      {lastScenario && (
        <div className="simulation-result-banner" role="status">
          <strong>Sandbox simulation complete:</strong>{" "}
          {lastScenario.scenarioName} · {lastScenario.productionLine} ·{" "}
          {lastScenario.duration}. Live production plan was not changed.
        </div>
      )}
      <div className="simulation-layout">
        <section className="past-scenarios">
          <h2>Past scenarios</h2>
          <div className="past-scenario-list">
            {scenarios.map((scenario) => (
              <article key={scenario.id} className="past-scenario">
                <span className="scenario-file">▤</span>
                <div>
                  <strong>{scenario.title}</strong>
                  <span>
                    {scenario.order && `${scenario.order} · `}
                    {scenario.detail}
                  </span>
                  <small>{scenario.date}</small>
                  <i className={`scenario-result ${scenario.tone}`}>
                    ● &nbsp;{scenario.result}
                  </i>
                </div>
              </article>
            ))}
          </div>
        </section>
        <div className="simulation-side-panels">
          <section className="line-status-panel">
            <div className="simulation-panel-title">
              <h2>Production line status</h2>
              <span>
                <i /> Live status (demo)
              </span>
            </div>
            <div className="simulation-line-list">
              {initialLines.map((line) => (
                <div className="simulation-line" key={line.name}>
                  <strong>{line.name}</strong>
                  <span
                    className={`simulation-line-state ${line.status === "At risk" ? "at-risk" : line.status.toLowerCase()}`}
                  >
                    {line.status}
                  </span>
                  <span className="simulation-line-progress">
                    <b>{line.value}</b>
                    <i>
                      <em style={{ width: `${line.progress}%` }} />
                    </i>
                  </span>
                  <small>{line.progress}%</small>
                </div>
              ))}
            </div>
          </section>
          <section className="simulation-results-panel">
            <div className="simulation-panel-title">
              <h2>Simulation results (example)</h2>
            </div>
            <div className="simulation-result-grid">
              <div>
                <small>Total delay</small>
                <strong>-68%</strong>
                <span>from 36h to 11h</span>
              </div>
              <div>
                <small>Orders on time</small>
                <strong>+22%</strong>
                <span>from 68% to 90%</span>
              </div>
              <div>
                <small>Overtime required</small>
                <strong>-50%</strong>
                <span>from 120h to 60h</span>
              </div>
              <div>
                <small>Additional cost</small>
                <strong>-35%</strong>
                <span>from LKR 480,000 to 312,000</span>
              </div>
            </div>
          </section>
        </div>
      </div>
      {modalOpen && (
        <SimulationModal
          onClose={() => setModalOpen(false)}
          onRun={runSimulation}
        />
      )}
    </section>
  );
}
