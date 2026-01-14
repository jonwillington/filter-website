interface PropertyRowProps {
  label: string;
  value: string;
  showDivider?: boolean;
}

export function PropertyRow({ label, value, showDivider = false }: PropertyRowProps) {
  return (
    <>
      {showDivider && (
        <div className="border-t border-border-default" />
      )}
      <div className="flex justify-between items-baseline py-2">
        <span className="text-sm text-text-secondary">{label}</span>
        <span className="text-sm text-primary font-medium text-right">{value}</span>
      </div>
    </>
  );
}
