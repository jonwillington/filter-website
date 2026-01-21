export default function Loading() {
  return (
    <div className="fixed inset-0 bg-background">
      {/* Sidebar skeleton */}
      <div className="hidden lg:flex w-80 h-full bg-surface border-r border-border-default flex-col">
        {/* Header skeleton */}
        <div className="p-4 border-b border-border-default">
          <div className="h-8 w-32 bg-border-default rounded animate-pulse" />
        </div>

        {/* Search bar skeleton */}
        <div className="p-4">
          <div className="h-10 bg-border-default rounded-lg animate-pulse" />
        </div>

        {/* List items skeleton */}
        <div className="flex-1 overflow-hidden p-4 space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg bg-border-default/50">
              <div className="w-12 h-12 rounded-lg bg-border-default animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-border-default rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-border-default rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map skeleton */}
      <div className="absolute inset-0 lg:left-80 bg-surface">
        <div className="w-full h-full bg-gradient-to-br from-surface to-border-default animate-pulse" />

        {/* Loading spinner overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-text-secondary">Loading map...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
