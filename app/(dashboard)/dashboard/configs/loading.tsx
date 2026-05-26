// app/(dashboard)/dashboard/configs/loading.tsx
export default function ConfigsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-32 bg-stone-200 rounded" />
          <div className="h-4 w-48 bg-stone-100 rounded" />
        </div>
        <div className="h-9 w-28 bg-stone-200 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="h-5 w-3/4 bg-stone-200 rounded" />
            <div className="h-4 w-1/2 bg-stone-100 rounded" />
            <div className="flex justify-between">
              <div className="h-4 w-16 bg-stone-100 rounded" />
              <div className="h-4 w-12 bg-stone-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
