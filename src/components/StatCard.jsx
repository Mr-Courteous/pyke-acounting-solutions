export default function StatCard({ label, value, tone = 'neutral', sub }) {
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className={`stat-card-value stat-card-value-${tone} mono`}>{value}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}
