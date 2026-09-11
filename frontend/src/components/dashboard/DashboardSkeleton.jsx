// Mirrors the real hierarchy so the page doesn't reflow on load.
const Card = ({ className = "" }) => (
  <div className={`bg-white border border-gray-100 rounded-2xl ${className}`} />
);

const DashboardSkeleton = () => (
  <div className="max-w-6xl mx-auto space-y-4 pb-10 animate-pulse">
    {/* Greeting */}
    <div className="bg-white border border-gray-100 rounded-2xl px-6 py-5">
      <div className="w-52 h-7 bg-gray-100 rounded-lg mb-2" />
      <div className="w-40 h-4 bg-gray-100 rounded-lg" />
    </div>

    {/* Action Required */}
    <Card className="h-28" />

    {/* Schedule + Notices */}
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <Card className="lg:col-span-3 h-64" />
      <Card className="lg:col-span-2 h-64" />
    </div>

    {/* Deadlines + Eligible Drives */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="h-52" />
      <Card className="h-52" />
    </div>

    {/* Quick access */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="h-12" />
      ))}
    </div>
  </div>
);

export default DashboardSkeleton;
