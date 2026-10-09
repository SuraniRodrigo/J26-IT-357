export default function DetectionLogHeader({ filters, activeFilter, onFilter, query, onQuery }) {
  return (
    <div className="log-controls">
      <div className="filter-pills" role="group" aria-label="Filter detection log">
        {filters.map((filter) => <button key={filter} type="button" className={`filter-pill ${activeFilter === filter ? 'active' : ''}`} onClick={() => onFilter(filter)}>{filter}</button>)}
      </div>
      <label className="search-input"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg><input type="search" placeholder="Search events..." value={query} onChange={(event) => onQuery(event.target.value)} aria-label="Search detection events" /></label>
    </div>
  );
}
