import { Shop } from '@/lib/types';

interface OpeningHoursSectionProps {
  shop: Shop;
}

export function OpeningHoursSection({ shop }: OpeningHoursSectionProps) {
  const hasOpeningHours = Array.isArray(shop.opening_hours) && shop.opening_hours.length > 0;

  if (!hasOpeningHours) return null;

  // Get today's day name to highlight it
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = dayNames[new Date().getDay()];

  return (
    <div>
      <h3 className="text-lg font-medium text-primary mb-3">Opening hours</h3>
      <div className="space-y-1.5">
        {(shop.opening_hours as string[]).map((entry: string, index: number) => {
          if (typeof entry !== 'string') return null;
          const colonIndex = entry.indexOf(':');
          if (colonIndex === -1) return null;
          const day = entry.substring(0, colonIndex).trim();
          const hours = entry.substring(colonIndex + 1).trim();
          const isToday = day === today;

          return (
            <div
              key={index}
              className={`flex justify-between text-sm ${
                isToday ? 'text-primary font-medium' : 'text-text-secondary'
              }`}
            >
              <span>{day}</span>
              <span>{hours}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
