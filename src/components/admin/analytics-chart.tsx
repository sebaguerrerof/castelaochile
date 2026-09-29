type DailyPoint = { date: string; value: number };

const formatDay = (value: string) => new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", timeZone: "America/Santiago" }).format(new Date(`${value}T12:00:00-03:00`));

export function AnalyticsChart({ points }: { points: DailyPoint[] }) {
  const width = 800;
  const height = 260;
  const padding = { bottom: 24, left: 20, right: 20, top: 20 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const max = Math.max(...points.map((point) => point.value), 1);
  const coords = points.map((point, index) => ({
    ...point,
    x: padding.left + (points.length === 1 ? chartWidth / 2 : (index / (points.length - 1)) * chartWidth),
    y: padding.top + chartHeight - (point.value / max) * chartHeight,
  }));
  const line = coords.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
  const area = coords.length ? `${line} L${coords.at(-1)!.x},${height - padding.bottom} L${coords[0].x},${height - padding.bottom} Z` : "";
  const labelIndexes = new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]);

  return (
    <div className="admin-chart">
      <svg aria-label={`Vistas por día. Máximo diario: ${max}`} role="img" viewBox={`0 0 ${width} ${height}`}>
        {[0, .25, .5, .75, 1].map((ratio) => <line className="admin-chart-grid-line" key={ratio} x1={padding.left} x2={width - padding.right} y1={padding.top + ratio * chartHeight} y2={padding.top + ratio * chartHeight} />)}
        {area && <path className="admin-chart-area" d={area} />}
        {line && <path className="admin-chart-line" d={line} />}
        {coords.map((point) => <circle className="admin-chart-point" cx={point.x} cy={point.y} key={point.date} r="4"><title>{formatDay(point.date)}: {point.value} vistas</title></circle>)}
      </svg>
      <div className="admin-chart-labels">{points.map((point, index) => labelIndexes.has(index) ? <span key={point.date}>{formatDay(point.date)}</span> : null)}</div>
      <table className="admin-chart-sr-table"><caption>Vistas de páginas por día</caption><thead><tr><th>Fecha</th><th>Vistas</th></tr></thead><tbody>{points.map((point) => <tr key={point.date}><td>{formatDay(point.date)}</td><td>{point.value}</td></tr>)}</tbody></table>
    </div>
  );
}
