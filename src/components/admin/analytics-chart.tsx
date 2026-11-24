type DailyPoint = { date: string; value: number; visitors: number };

const formatDay = (value: string) => new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", timeZone: "America/Santiago" }).format(new Date(`${value}T12:00:00-03:00`));

export function AnalyticsChart({ points }: { points: DailyPoint[] }) {
  const width = 800;
  const height = 260;
  const padding = { bottom: 24, left: 44, right: 20, top: 20 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const max = Math.max(4, Math.ceil(Math.max(...points.flatMap((point) => [point.value, point.visitors]), 0) / 4) * 4);
  const coords = points.map((point, index) => ({
    ...point,
    x: padding.left + (points.length === 1 ? chartWidth / 2 : (index / (points.length - 1)) * chartWidth),
    y: padding.top + chartHeight - (point.value / max) * chartHeight,
    visitorY: padding.top + chartHeight - (point.visitors / max) * chartHeight,
  }));
  const line = coords.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
  const visitorLine = coords.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(2)},${point.visitorY.toFixed(2)}`).join(" ");
  const area = coords.length ? `${line} L${coords.at(-1)!.x},${height - padding.bottom} L${coords[0].x},${height - padding.bottom} Z` : "";
  const labelIndexes = new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]);

  return (
    <div className="admin-chart">
      <div className="analytics-legend"><span>● Vistas de página</span><span>◆ Navegadores únicos</span></div>
      <svg aria-label={`Vistas y navegadores por día. Escala hasta ${max}. Cifras disponibles en la tabla inferior.`} role="img" viewBox={`0 0 ${width} ${height}`}>
        {[0, .25, .5, .75, 1].map((ratio) => <g key={ratio}><line className="admin-chart-grid-line" x1={padding.left} x2={width - padding.right} y1={padding.top + ratio * chartHeight} y2={padding.top + ratio * chartHeight} /><text className="analytics-chart-axis" textAnchor="end" x={padding.left - 10} y={padding.top + ratio * chartHeight + 4}>{Math.round(max * (1 - ratio))}</text></g>)}
        {area && <path className="admin-chart-area" d={area} />}
        {line && <path className="admin-chart-line" d={line} />}
        {visitorLine && <path className="analytics-visitors-line" d={visitorLine} />}
        {coords.map((point) => <g key={point.date}><circle className="admin-chart-point" cx={point.x} cy={point.y} r="4"><title>{`${formatDay(point.date)}: ${point.value} vistas`}</title></circle><circle className="analytics-visitors-point" cx={point.x} cy={point.visitorY} r="3"><title>{`${formatDay(point.date)}: ${point.visitors} navegadores`}</title></circle></g>)}
      </svg>
      <div className="admin-chart-labels">{points.map((point, index) => labelIndexes.has(index) ? <span key={point.date}>{formatDay(point.date)}</span> : null)}</div>
      <details className="analytics-daily-table"><summary>Ver cifras por día</summary><table><caption>Actividad diaria · America/Santiago</caption><thead><tr><th>Fecha</th><th>Navegadores</th><th>Vistas</th></tr></thead><tbody>{points.map((point) => <tr key={point.date}><td>{formatDay(point.date)}</td><td>{point.visitors}</td><td>{point.value}</td></tr>)}</tbody></table></details>
    </div>
  );
}
