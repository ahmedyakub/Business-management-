import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Modal from '../components/Modal.jsx';
import { Empty, Loading, PageHeader, StatCard, Status } from '../components/ui.jsx';
import { capitalize, fmtDate, toInputDate, useMoney } from '../utils/format.js';

// Detail page for a customer or supplier: contact info, balance, transaction and payment history.
export default function PartyDetail({ type }) {
  const { id } = useParams();
  const { can } = useAuth();
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
      toast('Payment recorded');
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
        <Link to={`/${type}s`} className="btn btn-light">← Back</Link>
        {canPay && party.balance > 0 && (
          <button className="btn btn-primary" onClick={() => setPaying({ amount: party.balance, method: 'cash', note: '', date: toInputDate() })}>
            {isCustomer ? 'Receive payment' : 'Pay supplier'}
          </button>
        )}
      </PageHeader>

      <div className="stats">
        <StatCard label={isCustomer ? 'Outstanding balance (owes us)' : 'Outstanding balance (we owe)'} value={money(party.balance)} tone={party.balance > 0 ? 'warn' : 'good'} />
        <StatCard label={isCustomer ? 'Total purchases' : 'Total supplied'} value={money(totalDocs)} hint={`${docs.length} ${isCustomer ? 'invoices' : 'purchase orders'}`} />
        <StatCard label="Total payments recorded" value={money(payments.reduce((s, p) => s + p.amount, 0))} hint={`${payments.length} payments`} />
      </div>

      {party.notes && <div className="card"><strong>Notes:</strong> {party.notes}</div>}

      <div className="grid-2">
        {canSeeDocs && (
          <div className="card">
            <h3>{isCustomer ? 'Invoices' : 'Purchases'}</h3>
            {docs.length === 0 ? <Empty /> : (
              <table>
                <thead><tr><th>{isCustomer ? 'Invoice' : 'Ref'}</th><th>Date</th><th>Status</th><th className="right">Total</th><th className="right">Paid</th></tr></thead>
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
            <h3>Payment history</h3>
            {payments.length === 0 ? <Empty>No balance payments recorded.</Empty> : (
              <table>
                <thead><tr><th>Date</th><th>Method</th><th>Note</th><th className="right">Amount</th></tr></thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p._id}>
                      <td>{fmtDate(p.date)}</td>
                      <td>{capitalize(p.method)}</td>
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
        <Modal title={isCustomer ? 'Receive payment' : 'Pay supplier'} onClose={() => setPaying(null)}>
          <form className="form-grid" onSubmit={pay}>
            <label>Amount *<input type="number" min="0.01" max={party.balance} step="any" value={paying.amount} onChange={(e) => setPaying((p) => ({ ...p, amount: e.target.value }))} required /></label>
            <label>Method
              <select value={paying.method} onChange={(e) => setPaying((p) => ({ ...p, method: e.target.value }))}>
                {['cash', 'card', 'bank', 'mobile'].map((m) => <option key={m} value={m}>{capitalize(m)}</option>)}
              </select>
            </label>
            <label>Date<input type="date" value={paying.date} onChange={(e) => setPaying((p) => ({ ...p, date: e.target.value }))} /></label>
            <label>Note<input value={paying.note} onChange={(e) => setPaying((p) => ({ ...p, note: e.target.value }))} /></label>
            <p className="muted full">Payments are applied to the oldest unpaid {isCustomer ? 'invoices' : 'purchases'} first.</p>
            <div className="form-actions full">
              <button type="button" className="btn btn-light" onClick={() => setPaying(null)}>Cancel</button>
              <button className="btn btn-primary">Record payment</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
