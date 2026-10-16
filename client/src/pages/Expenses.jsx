import { useEffect, useMemo, useState } from 'react';
import api from '../api/client.js';
import ResourcePage from '../components/ResourcePage.jsx';
import { DateRange } from '../components/ui.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import { fmtDate, monthStart, toInputDate, useMoney } from '../utils/format.js';

export const PAYMENT_METHODS = ['cash', 'card', 'bank', 'mobile'];

export default function Expenses() {
  const money = useMoney();
  const { t } = useLang();
  const [categories, setCategories] = useState([]);
  const [range, setRange] = useState({ from: monthStart(), to: toInputDate() });
  const params = useMemo(() => ({ from: range.from || undefined, to: range.to || undefined }), [range]);

  useEffect(() => {
    api.get('/expenses/categories').then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  // Categories are stored in English; show a translation when one exists.
  const catLabel = (c) => {
    const key = `expenseCat.${c}`;
    const label = t(key);
    return label === key ? c : label;
  };

  return (
    <ResourcePage
      title={t('nav.expenses')}
      singular={t('expenses.singular')}
      subtitle={t('expenses.subtitle')}
      endpoint="/expenses"
      resource="expenses"
      extraParams={params}
      toolbar={<DateRange {...range} onChange={setRange} />}
      emptyItem={{ date: toInputDate(), category: categories[0] || 'Other', amount: '', description: '', paymentMethod: 'cash' }}
      fields={[
        { name: 'date', label: t('common.date'), type: 'date', required: true },
        { name: 'category', label: t('common.category'), type: 'select', options: categories.map((c) => ({ value: c, label: catLabel(c) })), required: true },
        { name: 'amount', label: t('common.amount'), type: 'number', min: 0, required: true },
        { name: 'paymentMethod', label: t('expenses.paidVia'), type: 'select', required: true, options: PAYMENT_METHODS.map((m) => ({ value: m, label: t(`method.${m}`) })) },
        { name: 'description', label: t('common.description'), type: 'textarea', full: true },
      ]}
      columns={[
        { key: 'date', label: t('common.date'), render: (e) => fmtDate(e.date) },
        { key: 'category', label: t('common.category'), render: (e) => catLabel(e.category) },
        { key: 'description', label: t('common.description') },
        { key: 'paymentMethod', label: t('expenses.paidVia'), render: (e) => t(`method.${e.paymentMethod}`) },
        { key: 'createdBy', label: t('expenses.recordedBy'), render: (e) => e.createdBy?.name || '' },
        { key: 'amount', label: t('common.amount'), align: 'right', render: (e) => money(e.amount) },
      ]}
    />
  );
}
