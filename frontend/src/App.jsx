const metrics = [
  { label: 'Demand Forecast', value: 'TBD', tone: 'blue' },
  { label: 'Supply Risk', value: 'TBD', tone: 'amber' },
  { label: 'Inventory Health', value: 'TBD', tone: 'green' },
  { label: 'Production Status', value: 'TBD', tone: 'purple' },
];

const moduleCards = [
  'Market Prophet',
  'Procurement Guardian',
  'Inventory Guardian',
  'Line Optimizer',
];

export default function App() {
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>AI-Driven supply chain intelligence</p>
          <h1 style={styles.title}>OPTICHAIN</h1>
        </div>
        <div style={styles.badge}>Sri Lankan Garment Factory Decision Support</div>
      </header>

      <section style={styles.metricGrid}>
        {metrics.map((metric) => (
          <div key={metric.label} style={{ ...styles.metricCard, borderLeft: `4px solid ${getColor(metric.tone)}` }}>
            <div style={styles.metricLabel}>{metric.label}</div>
            <div style={styles.metricValue}>{metric.value}</div>
          </div>
        ))}
      </section>

      <section style={styles.grid}>
        <div style={styles.panel}>
          <h2 style={styles.panelTitle}>Module overview</h2>
          <ul style={styles.list}>
            {moduleCards.map((card) => (
              <li key={card} style={styles.listItem}>{card}</li>
            ))}
          </ul>
        </div>

        <div style={styles.panel}>
          <h2 style={styles.panelTitle}>Decision flow</h2>
          <ol style={styles.list}>
            <li style={styles.listItem}>Demand Forecast</li>
            <li style={styles.listItem}>Supply Risk Signal</li>
            <li style={styles.listItem}>Inventory Optimization</li>
            <li style={styles.listItem}>Production Scheduling</li>
            <li style={styles.listItem}>Self-Healing Reschedule</li>
          </ol>
        </div>
      </section>

      <section style={styles.panel}>
        <h2 style={styles.panelTitle}>System status</h2>
        <p style={styles.text}>
          This frontend connects to the FastAPI backend through a single API client and remains strictly separate from model training,
          optimization logic, and database implementation.
        </p>
      </section>
    </div>
  );
}

function getColor(tone) {
  const palette = {
    blue: '#3b82f6',
    amber: '#f59e0b',
    green: '#22c55e',
    purple: '#8b5cf6',
  };

  return palette[tone] || '#64748b';
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)',
    color: '#e2e8f0',
    padding: '32px 24px',
    fontFamily: 'Arial, sans-serif',
  },
  header: {
    maxWidth: '1200px',
    margin: '0 auto 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap',
  },
  eyebrow: {
    margin: 0,
    fontSize: '12px',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: '#93c5fd',
  },
  title: {
    margin: '8px 0 0',
    fontSize: '48px',
    lineHeight: 1,
  },
  badge: {
    background: '#1d4ed8',
    color: '#eff6ff',
    borderRadius: '999px',
    padding: '10px 16px',
    fontSize: '12px',
    fontWeight: 700,
  },
  metricGrid: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
  },
  metricCard: {
    background: '#0f172a',
    borderRadius: '16px',
    padding: '18px 20px',
    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.25)',
    border: '1px solid rgba(148, 163, 184, 0.18)',
  },
  metricLabel: {
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '10px',
  },
  metricValue: {
    fontSize: '28px',
    fontWeight: 700,
  },
  grid: {
    maxWidth: '1200px',
    margin: '24px auto 0',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
  },
  panel: {
    maxWidth: '1200px',
    margin: '24px auto 0',
    background: '#111827',
    borderRadius: '16px',
    padding: '20px 24px',
    border: '1px solid rgba(148, 163, 184, 0.18)',
    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.2)',
  },
  panelTitle: {
    marginTop: 0,
    marginBottom: '16px',
    fontSize: '20px',
  },
  list: {
    margin: 0,
    paddingLeft: '18px',
    color: '#cbd5e1',
    lineHeight: '1.9',
  },
  listItem: {
    marginBottom: '6px',
  },
  text: {
    margin: 0,
    color: '#cbd5e1',
    lineHeight: '1.7',
  },
};
