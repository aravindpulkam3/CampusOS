// Mirrors the real layout so the page doesn't reflow on load.
const Bar = ({ className = "" }) => <div className={`rounded-md bg-soft ${className}`} />;

const List = ({ rows = 3 }) => (
  <div>
    <Bar className="mb-4 h-5 w-40" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex h-16 items-center gap-4 border-t border-line first:border-t-0">
        <Bar className="size-10 flex-none rounded-[11px]" />
        <div className="flex-1 space-y-2">
          <Bar className="h-3.5 w-1/2" />
          <Bar className="h-3 w-1/3" />
        </div>
      </div>
    ))}
  </div>
);

const DashboardSkeleton = () => (
  <div className="animate-pulse pb-10 pt-1 lg:pb-20 lg:pt-6" aria-busy="true">
    <Bar className="h-4 w-36" />
    <Bar className="mt-2.5 h-9 w-72 max-w-full" />

    <div className="mt-8 h-[152px] rounded-panel border border-line-2 bg-white/[0.78]" />

    <div className="mt-11 grid grid-cols-1 gap-y-11 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_352px] lg:gap-x-[72px] lg:gap-y-16">
      <div>
        <Bar className="mb-4 h-5 w-48" />
        <Bar className="aspect-[4/3] w-full rounded-2xl sm:w-[300px]" />
      </div>
      <List />
      <List />
      <List />
    </div>
  </div>
);

export default DashboardSkeleton;
