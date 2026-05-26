// app/(dashboard)/dashboard/loading.tsx
export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-48 bg-stone-200 rounded" />
        <div className="h-4 w-64 bg-stone-100 rounded" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-4 space-y-2">
            <div className="h-3 w-20 bg-stone-100 rounded" />
            <div className="h-8 w-12 bg-stone-200 rounded" />
          </div>
        ))}
      </div>
      <div className="card p-5">
        <div className="h-4 w-24 bg-stone-100 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-stone-100 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
