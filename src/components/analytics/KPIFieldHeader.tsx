import { KPIInfoPopover } from "./KPIInfoPopover";
export function KPIFieldHeader({
  label,
  topic = label,
  unit,
}: {
  label: string;
  topic?: string;
  unit?: string;
}) {
  return (
    <span className="kpi-field-header">
      <span className="kpi-field-title">
        <span className="kpi-field-text">{label}</span>
        <KPIInfoPopover topic={topic} />
      </span>
      {unit && <small>{unit}</small>}
    </span>
  );
}
