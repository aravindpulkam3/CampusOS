// Mirrors the real layout so the page doesn't reflow on load.
const Card = ({ className = "" }) => (
  <div className={`bg-white border border-gray-200/70 rounded-xl ${className}`} />
);

const DashboardSkeleton = () => (
  <div className="max-w-6xl mx-auto space-y-3 pb-10 animate-pulse" aria-busy="true">
    <div className="py-1">
      <div className="w-56 h-6 bg-gray-200/70 rounded-md mb-2" />
      <div className="w-44 h-3.5 bg-gray-100 rounded-md" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
      <Card className="lg:col-span-3 h-56" />
      <Card className="lg:col-span-2 h-56" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <Card className="h-44" />
      <Card className="h-44" />
    </div>

    <div className="grid grid-cols-2 sm:flex gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="h-9 sm:w-36" />
      ))}
    </div>
  </div>
);

export default DashboardSkeleton;
