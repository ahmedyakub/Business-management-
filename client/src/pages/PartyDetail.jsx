import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Modal from '../components/Modal.jsx';
import { Empty, Loading, PageHeader, StatCard, Status } from '../components/ui.jsx';
import { PAYMENT_METHODS } from './Expenses.jsx';
import { fmtDate, toInputDate, useMoney } from '../utils/format.js';

// Detail page for a customer or supplier: contact info, balance, transaction and payment history.
export default function PartyDetail({ type }) {
  const { id } = useParams();
  const { can } = useAuth();
  const { t } = useLang();
  const toast = useToast();
  const money = useMoney();
  const [party, setParty] = useState(null);
  const [docs, setDocs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paying, setPaying] = useState(null);
  const isCustomer = type === 'customer';
  const canPay = isCustomer ? can('payments:write') : can('purchases:write');
  const canSeeDocs = isCustomer ? can('sales:read') : can('purchases:read');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/${type}s/${id}`);
      setParty(data);
      const [d, p] = await Promise.all([
        canSeeDocs ? api.get(isCustomer ? '/sales' : '/purchases', { params: { [type]: id } }) : { data: [] },
        can('payments:read') ? api.get('/payments', { params: { [type]: id } }) : { data: [] },
      ]);
      setDocs(d.data);
      setPayments(p.data);
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }, [type, id, isCustomer, canSeeDocs, can, toast]);

  useEffect(() => { load(); }, [load]);

  const pay = async (e) => {
    e.preventDefault();
    try {
      await api.post('/payments', { partyType: type, partyId: id, ...paying });
      toast(t('party.recorded'));
      setPaying(null);
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  if (!party) return <Loading />;
  const totalDocs = docs.filter((d) => d.status !== 'void').reduce((s, d) => s + d.total, 0);

  return (
    <>
      <PageHeader title={party.name} subtitle={[party.contactPerson, party.phone, party.email, party.address].filter(Boolean).join(' · ')}>
        <Link to={`/${type}s`} className="btn btn-light">{t('common.back')}</Link>
        {canPay && party.balance > 0 && (
          <button className="btn btn-primary" onClick={() => setPaying({ amount: party.balance, method: 'cash', note: '', date: toInputDate() })}>
            {isCustomer ? t('party.receive') : t('party.pay')}
          </button>
        )}
      </PageHeader>

      <div className="stats">
        <StatCard label={isCustomer ? t('party.balCustomer') : t('party.balSupplier')} value={money(party.balance)} tone={party.balance > 0 ? 'warn' : 'good'} />
        <StatCard label={isCustomer ? t('party.totalPurchases') : t('party.totalSupplied')} value={money(totalDocs)} hint={t(isCustomer ? 'party.invoicesN' : 'party.posN', { n: docs.length })} />
        <StatCard label={t('party.totalPayments')} value={money(payments.reduce((s, p) => s + p.amount, 0))} hint={t('party.paymentsN', { n: payments.length })} />
      </div>

      {party.notes && <div className="card"><strong>{t('common.notes')}:</strong> {party.notes}</div>}

      <div className="grid-2">
        {canSeeDocs && (
          <div className="card">
            <h3>{isCustomer ? t('party.invoices') : t('party.purchases')}</h3>
            {docs.length === 0 ? <Empty /> : (
              <table>
                <thead><tr><th>{isCustomer ? t('common.invoice') : t('party.ref')}</th><th>{t('common.date')}</th><th>{t('common.status')}</th><th className="right">{t('common.total')}</th><th className="right">{t('common.paid')}</th></tr></thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d._id}>
                      <td>{isCustomer ? <Link to={`/sales/${d._id}`}>{d.invoiceNumber}</Link> : d.reference}</td>
                      <td>{fmtDate(d.date)}</td>
                      <td><Status value={d.status} /></td>
                      <td className="right">{money(d.total)}</td>
                      <td className="right">{money(d.amountPaid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {can('payments:read') && (
          <div className="card">
            <h3>{t('party.paymentHistory')}</h3>
            {payments.length === 0 ? <Empty>{t('party.noPayments')}</Empty> : (
              <table>
                <thead><tr><th>{t('common.date')}</th><th>{t('common.method')}</th><th>{t('common.note')}</th><th className="right">{t('common.amount')}</th></tr></thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p._id}>
                      <td>{fmtDate(p.date)}</td>
                      <td>{t(`method.${p.method}`)}</td>
                      <td>{p.note}</td>
                      <td className="right">{money(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {paying && (
        <Modal title={isCustomer ? t('party.receive') : t('party.pay')} onClose={() => setPaying(null)}>
          <form className="form-grid" onSubmit={pay}>
            <label>{t('common.amount')} *<input type="number" min="0.01" max={party.balance} step="any" value={paying.amount} onChange={(e) => setPaying((p) => ({ ...p, amount: e.target.value }))} required /></label>
            <label>{t('common.method')}
              <select value={paying.method} onChange={(e) => setPaying((p) => ({ ...p, method: e.target.value }))}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{t(`method.${m}`)}</option>)}
              </select>
            </label>
            <label>{t('common.date')}<input type="date" value={paying.date} onChange={(e) => setPaying((p) => ({ ...p, date: e.target.value }))} /></label>
            <label>{t('common.note')}<input value={paying.note} onChange={(e) => setPaying((p) => ({ ...p, note: e.target.value }))} /></label>
            <p className="muted full">{t(isCustomer ? 'party.fifoCustomer' : 'party.fifoSupplier')}</p>
            <div className="form-actions full">
              <button type="button" className="btn btn-light" onClick={() => setPaying(null)}>{t('common.cancel')}</button>
              <button className="btn btn-primary">{t('party.record')}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
