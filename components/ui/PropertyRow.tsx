interface PropertyRowProps {
  label: string;
  value: string;
}

export function PropertyRow({ label, value }: PropertyRowProps) {
  return (
    <div className="flex justify-between items-baseline py-1.5">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm text-primary font-medium text-right">{value}</span>
    </div>
  );
}
