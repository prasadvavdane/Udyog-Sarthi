export default function DashboardLoading() {
  return (
    <div className="page-grid">
      <div className="glass-panel h-36 animate-pulse rounded-[32px] border border-white/70" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="glass-panel h-36 animate-pulse rounded-[28px] border border-white/70" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-panel h-96 animate-pulse rounded-[28px] border border-white/70" />
        <div className="glass-panel h-96 animate-pulse rounded-[28px] border border-white/70" />
      </div>
    </div>
  );
}
