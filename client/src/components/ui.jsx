import { useLang } from '../context/LanguageContext.jsx';

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      <div className="actions">{children}</div>
    </div>
  );
}

export function StatCard({ label, value, tone, hint }) {
  return (
    <div className={`stat-card ${tone ? `tone-${tone}` : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

export function Status({ value }) {
  const { t } = useLang();
  return <span className={`status status-${value}`}>{t(`status.${value}`)}</span>;
}

export function Empty({ children }) {
  const { t } = useLang();
  return <div className="empty">{children ?? t('common.empty')}</div>;
}

export function Loading() {
  const { t } = useLang();
  return <div className="empty">{t('common.loading')}</div>;
}

// Simple horizontal-axis bar chart drawn with CSS.
export function BarChart({ data, valueKey = 'total', labelKey = 'date', format = (v) => v }) {
  const { t } = useLang();
  if (!data?.length) return <Empty>{t('common.noData')}</Empty>;
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div className="bar-chart">
      {data.map((d) => (
        <div className="bar-col" key={d[labelKey]} title={`${d[labelKey]}: ${format(d[valueKey])}`}>
          <div className="bar-value">{format(d[valueKey])}</div>
          <div className="bar" style={{ height: `${(d[valueKey] / max) * 100}%` }} />
          <div className="bar-label">{String(d[labelKey]).slice(5)}</div>
        </div>
      ))}
    </div>
  );
}

export function DateRange({ from, to, onChange }) {
  const { t } = useLang();
  return (
    <div className="date-range">
      <label>{t('common.from')} <input type="date" value={from} onChange={(e) => onChange({ from: e.target.value, to })} /></label>
      <label>{t('common.to')} <input type="date" value={to} onChange={(e) => onChange({ from, to: e.target.value })} /></label>
    </div>
  );
}
