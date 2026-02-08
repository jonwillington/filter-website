export default function Loading() {
  return (
    <div className="fixed inset-0 bg-contrastBlock flex flex-col">
      {/* Header bar skeleton */}
      <div
        className="hidden lg:flex items-center h-14 px-6 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="h-5 w-14 rounded" style={{ background: 'rgba(255,255,255,0.12)' }} />
      </div>

      {/* Hero content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Headline skeleton — two lines */}
        <div className="space-y-3 w-full max-w-3xl">
          <div
            className="h-10 md:h-14 lg:h-[4.5rem] w-[85%] mx-auto rounded-lg animate-pulse"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          />
          <div
            className="h-10 md:h-14 lg:h-[4.5rem] w-[55%] mx-auto rounded-lg animate-pulse"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          />
        </div>

        {/* Subtitle skeleton */}
        <div
          className="mt-8 h-5 w-80 max-w-[80%] mx-auto rounded animate-pulse"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        />

        {/* Button skeletons */}
        <div className="mt-10 flex gap-4">
          <div
            className="h-12 w-28 rounded-full animate-pulse"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          />
          <div
            className="h-12 w-24 rounded-full animate-pulse"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>
      </div>

      {/* Carousel skeleton — rows of ghost circles */}
      <div className="flex-shrink-0 pb-16 space-y-4 overflow-hidden px-6">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex items-center gap-4 justify-center">
            {Array.from({ length: 14 }).map((_, j) => (
              <div
                key={j}
                className="flex-shrink-0 w-14 h-14 rounded-full"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
