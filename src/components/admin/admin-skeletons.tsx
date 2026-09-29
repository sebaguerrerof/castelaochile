function Skeleton({ className }: { className: string }) {
  return <div aria-hidden="true" className={`admin-skeleton ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando resumen administrativo" className="admin-stack">
      <Skeleton className="admin-skeleton-line-short" />
      <Skeleton className="admin-skeleton-line" />
      <div className="admin-metric-grid">{Array.from({ length: 5 }, (_, index) => <Skeleton className="admin-skeleton-metric" key={index} />)}</div>
      <div className="admin-dashboard-grid"><Skeleton className="admin-skeleton-chart" /><Skeleton className="admin-skeleton-chart" /></div>
    </div>
  );
}

export function TablePageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando listado administrativo" className="admin-stack">
      <Skeleton className="admin-skeleton-line-short" />
      <Skeleton className="admin-skeleton-line" />
      <Skeleton className="admin-skeleton-line" />
      <Skeleton className="admin-skeleton-table" />
    </div>
  );
}

export function FormPageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando formulario administrativo" className="admin-stack">
      <Skeleton className="admin-skeleton-line-short" />
      <Skeleton className="admin-skeleton-line" />
      <div className="admin-profile-grid"><Skeleton className="admin-skeleton-chart" /><Skeleton className="admin-skeleton-chart" /></div>
    </div>
  );
}
