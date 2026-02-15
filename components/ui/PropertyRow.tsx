import { ReactNode } from 'react';

interface PropertyRowProps {
  label: string;
  value?: string | string[];
  caption?: string;
  showDivider?: boolean;
  renderChip?: (value: string, index: number) => ReactNode;
  children?: ReactNode;
}

export function PropertyRow({ label, value, caption, showDivider = false, renderChip, children }: PropertyRowProps) {
  const values = value ? (Array.isArray(value) ? value : [value]) : [];
  const hasChips = !!renderChip || !!children;

  return (
    <>
      {showDivider && (
        <div className="border-t border-black/5 dark:border-white/5" />
      )}
      <div className={`flex justify-between py-2 gap-4 ${hasChips ? 'items-center' : 'items-baseline'}`}>
        <span className="text-sm text-text-secondary flex-shrink-0">{label}</span>
        <div className="text-right">
          {children ? (
            <div className="flex flex-wrap gap-1.5 justify-end">
              {children}
            </div>
          ) : renderChip ? (
            <div className="flex flex-wrap gap-1.5 justify-end">
              {values.map((v, i) => renderChip(v, i))}
            </div>
          ) : (
            <span className="text-sm text-primary font-medium">{values.join(', ')}</span>
          )}
          {caption && (
            <p className="text-xs text-text-secondary mt-0.5">{caption}</p>
          )}
        </div>
      </div>
    </>
  );
}
