interface PropertyRowProps {
  label: string;
  value: string;
  caption?: string;
  showDivider?: boolean;
}

export function PropertyRow({ label, value, caption, showDivider = false }: PropertyRowProps) {
  return (
    <>
      {showDivider && (
        <div className="border-t border-border-default" />
      )}
      <div className="flex justify-between items-baseline py-2">
        <span className="text-sm text-text-secondary">{label}</span>
        <div className="text-right">
          <span className="text-sm text-primary font-medium">{value}</span>
          {caption && (
            <p className="text-xs text-text-secondary mt-0.5">{caption}</p>
          )}
        </div>
      </div>
    </>
  );
}
