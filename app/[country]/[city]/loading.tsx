export default function LocationLoading() {
  return (
    <div className="fixed inset-0 bg-background">
      {/* Top bar skeleton — desktop only */}
      <div className="hidden lg:block fixed top-0 left-0 right-0 z-50 bg-background border-b border-border-default">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="h-5 w-14 rounded bg-border-default animate-pulse" />
            <div className="h-4 w-px bg-border-default" />
            <div className="h-4 w-24 rounded bg-border-default/50 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-border-default animate-pulse" />
            <div className="h-8 w-8 rounded-full bg-border-default animate-pulse" />
          </div>
        </div>
      </div>

      {/* Body: sidebar + map */}
      <div className="lg:grid lg:grid-cols-[480px_1fr] h-full lg:mt-14">
        {/* Left panel skeleton */}
        <div className="bg-background border-r border-border-default p-6 overflow-hidden">
          {/* Location header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="h-8 w-8 rounded-full bg-surface animate-pulse" />
            <div className="h-6 w-40 rounded bg-surface animate-pulse" />
          </div>

          {/* Filter chips */}
          <div className="flex gap-2 mb-6">
            <div className="h-8 w-20 rounded-full bg-surface animate-pulse" />
            <div className="h-8 w-24 rounded-full bg-surface animate-pulse" />
            <div className="h-8 w-16 rounded-full bg-surface animate-pulse" />
          </div>

          {/* Shop card skeletons */}
          <div className="space-y-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4 p-3 rounded-xl">
                <div className="w-16 h-16 rounded-xl bg-surface animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div
                    className="h-4 rounded bg-surface animate-pulse"
                    style={{ width: `${65 + (i * 7) % 30}%` }}
                  />
                  <div
                    className="h-3 rounded bg-surface animate-pulse"
                    style={{ width: `${40 + (i * 11) % 25}%`, opacity: 0.6 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Map area skeleton */}
        <div className="hidden lg:block bg-surface animate-pulse" />
      </div>
    </div>
  );
}
