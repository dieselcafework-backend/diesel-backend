import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  LineChart, Line, PieChart, Pie, Cell, Tooltip,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts';

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  'Inventory Purchase', 'Operations', 'Maintenance',
  'Marketing', 'Salary', 'Utilities', 'Miscellaneous',
];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Other'];

const CATEGORY_COLORS = {
  'Inventory Purchase': '#d6993c',
  'Operations':         '#325862',
  'Maintenance':        '#940901',
  'Marketing':          '#31603d',
  'Salary':             '#7c3aed',
  'Utilities':          '#0891b2',
  'Miscellaneous':      '#6b7280',
};

const PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'week',  label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'year',  label: 'This Year' },
  { id: 'custom', label: 'Custom' },
];

const EMPTY_FORM = {
  title: '', amount: '', category: 'Inventory Purchase',
  vendor: '', notes: '', paymentMethod: 'Cash',
  expenseDate: new Date().toISOString().split('T')[0],
  recurring: false, recurrenceType: '',
};

// ── Sub-components ────────────────────────────────────────────────────────────
const Spinner = ({ sm }) => (
  <span className={`${sm ? 'w-3 h-3 border' : 'w-5 h-5 border-2'} border-gray-300 border-t-gray-600 rounded-full inline-block animate-spin`} />
);

const StatCard = ({ label, value, color, icon, C }) => (
  <div className={`${C.card} rounded-2xl p-4 shadow-sm flex items-center gap-3`}>
    <div className="text-2xl flex-shrink-0">{icon}</div>
    <div className="min-w-0">
      <p className="font-black text-lg leading-none" style={{ color }}>{value}</p>
      <p className={`text-[10px] font-bold uppercase tracking-wide mt-1 ${C.muted}`}>{label}</p>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const ExpensePage = ({ C }) => {
  // ── State ──────────────────────────────────────────────────────────────────
  const [expenses,    setExpenses]    = useState([]);
  const [analytics,   setAnalytics]   = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Filters
  const [period,      setPeriod]      = useState('month');
  const [fromDate,    setFromDate]    = useState('');
  const [toDate,      setToDate]      = useState('');
  const [catFilter,   setCatFilter]   = useState('all');
  const [search,      setSearch]      = useState('');

  // Form / modal
  const [formOpen,    setFormOpen]    = useState(false);
  const [editing,     setEditing]     = useState(null); // expense object if editing
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Fetch helpers ──────────────────────────────────────────────────────────
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (period !== 'custom') params.set('period', period);
      else if (fromDate && toDate) { params.set('from', fromDate); params.set('to', toDate); }
      if (catFilter !== 'all') params.set('category', catFilter);
      if (search.trim()) params.set('search', search.trim());
      const res = await api.get(`/expenses?${params}`);
      setExpenses(res.data);
    } catch { toast.error('Failed to load expenses.'); }
    finally { setLoading(false); }
  }, [period, fromDate, toDate, catFilter, search]);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const params = new URLSearchParams();
      if (period !== 'custom') params.set('period', period);
      else if (fromDate && toDate) { params.set('from', fromDate); params.set('to', toDate); }
      const res = await api.get(`/expenses/analytics?${params}`);
      setAnalytics(res.data);
    } catch { /* silent */ }
    finally { setAnalyticsLoading(false); }
  }, [period, fromDate, toDate]);

  useEffect(() => { fetchExpenses(); fetchAnalytics(); }, [fetchExpenses, fetchAnalytics]);

  // ── Form helpers ───────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (exp) => {
    setEditing(exp);
    setForm({
      title:          exp.title,
      amount:         String(exp.amount),
      category:       exp.category,
      vendor:         exp.vendor || '',
      notes:          exp.notes  || '',
      paymentMethod:  exp.paymentMethod || 'Cash',
      expenseDate:    exp.expenseDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      recurring:      exp.recurring      || false,
      recurrenceType: exp.recurrenceType || '',
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required.');
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) return toast.error('Enter a valid amount.');
    setFormLoading(true);
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        recurrenceType: form.recurring ? form.recurrenceType : '',
      };
      if (editing) {
        await api.put(`/expenses/${editing._id}`, payload);
        toast.success('Expense updated.');
      } else {
        await api.post('/expenses', payload);
        toast.success('Expense added! 💸');
      }
      setFormOpen(false);
      fetchExpenses();
      fetchAnalytics();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save expense.');
    } finally { setFormLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/expenses/${deleteConfirm._id}`);
      toast.success('Expense deleted.');
      setDeleteConfirm(null);
      fetchExpenses();
      fetchAnalytics();
    } catch { toast.error('Failed to delete.'); }
    finally { setDeleteLoading(false); }
  };

  // ── Export helpers ─────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!expenses.length) return toast('No expenses to export.');
    const headers = ['Date', 'Title', 'Category', 'Vendor', 'Payment Method', 'Amount', 'Notes'];
    const rows = expenses.map((e) => [
      new Date(e.expenseDate).toLocaleDateString('en-IN'),
      e.title, e.category, e.vendor || '', e.paymentMethod, e.amount, e.notes || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url;
    a.download = `expenses_${period}_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    if (!expenses.length) return toast('No expenses to export.');
    // Simple TSV that Excel opens natively
    const headers = ['Date', 'Title', 'Category', 'Vendor', 'Payment Method', 'Amount (₹)', 'Notes'];
    const rows = expenses.map((e) => [
      new Date(e.expenseDate).toLocaleDateString('en-IN'),
      e.title, e.category, e.vendor || '', e.paymentMethod, e.amount, e.notes || '',
    ]);
    const tsv  = [headers, ...rows].map((r) => r.join('\t')).join('\n');
    const blob = new Blob(['\ufeff' + tsv], { type: 'application/vnd.ms-excel' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url;
    a.download = `expenses_${period}_${Date.now()}.xls`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-8">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className={`font-black text-xl ${C.text}`}>Expense Manager</h2>
          <p className={`text-xs ${C.muted} mt-0.5`}>{expenses.length} expense{expenses.length !== 1 ? 's' : ''} in view</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportCSV}
            className={`px-3 py-2 rounded-xl text-xs font-bold border ${C.border} ${C.muted} hover:bg-gray-50 dark:hover:bg-gray-700 transition-all`}>
            ⬇️ CSV
          </button>
          <button onClick={exportExcel}
            className={`px-3 py-2 rounded-xl text-xs font-bold border ${C.border} ${C.muted} hover:bg-gray-50 dark:hover:bg-gray-700 transition-all`}>
            ⬇️ Excel
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-black text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, var(--admin-dark), var(--admin))' }}>
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
            Add Expense
          </button>
        </div>
      </div>

      {/* ── Dashboard Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard C={C} icon="📅" label="Today"      color="#940901"  value={`₹${(analytics?.cards?.today  || 0).toLocaleString()}`} />
        <StatCard C={C} icon="📆" label="This Week"  color="#d6993c"  value={`₹${(analytics?.cards?.week   || 0).toLocaleString()}`} />
        <StatCard C={C} icon="🗓️" label="This Month" color="#007B8B"  value={`₹${(analytics?.cards?.month  || 0).toLocaleString()}`} />
        <StatCard C={C} icon="📊" label="This Year"  color="#7c3aed"  value={`₹${(analytics?.cards?.year   || 0).toLocaleString()}`} />
      </div>

      {/* ── Period Filter ────────────────────────────────────────────────────── */}
      <div className={`${C.card} rounded-2xl p-4 shadow-sm space-y-3`}>
        <div className="flex gap-2 flex-wrap">
          {PERIODS.map((p) => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className="px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
              style={{
                background:   period === p.id ? 'var(--admin)'   : 'transparent',
                color:        period === p.id ? 'white'          : 'var(--admin-tab-inactive)',
                borderColor:  period === p.id ? 'var(--admin)'   : 'currentColor',
                opacity:      period === p.id ? 1                : 0.7,
              }}>
              {p.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex gap-2 flex-wrap">
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              className={`border rounded-xl px-3 py-2 text-sm font-bold focus:outline-none ${C.input}`} />
            <span className={`self-center text-sm ${C.muted}`}>→</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className={`border rounded-xl px-3 py-2 text-sm font-bold focus:outline-none ${C.input}`} />
          </div>
        )}
      </div>

      {/* ── Profit Summary Card ──────────────────────────────────────────────── */}
      {analytics && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Sales',    value: analytics.totalSales,    color: '#059669', icon: '💰' },
            { label: 'Total Expenses', value: analytics.totalExpenses, color: '#dc2626', icon: '💸' },
            { label: 'Net Profit',     value: analytics.totalProfit,   color: analytics.totalProfit >= 0 ? '#059669' : '#dc2626', icon: analytics.totalProfit >= 0 ? '📈' : '📉' },
          ].map((s) => (
            <div key={s.label} className={`${C.card} rounded-2xl px-4 py-3 text-center shadow-sm`}>
              <p className="text-lg mb-0.5">{s.icon}</p>
              <p className="font-black text-base leading-none" style={{ color: s.color }}>
                {s.value < 0 ? '-' : ''}₹{Math.abs(s.value).toLocaleString()}
              </p>
              <p className={`text-[10px] font-bold uppercase tracking-wide mt-1 ${C.muted}`}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Charts ──────────────────────────────────────────────────────────── */}
      {analytics && (analytics.trend?.length > 0 || analytics.categoryBreakdown?.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Trend Line Chart */}
          {analytics.trend?.length > 0 && (
            <div className={`${C.card} rounded-2xl p-4 shadow-sm`}>
              <h3 className={`font-black text-sm ${C.text} mb-3`}>📈 Expense Trend</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={analytics.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 700 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `₹${v}`} width={55} />
                  <Tooltip formatter={(v) => [`₹${v.toLocaleString()}`, 'Expenses']} labelStyle={{ fontWeight: 700 }} />
                  <Line type="monotone" dataKey="total" stroke="#940901" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Category Pie Chart */}
          {analytics.categoryBreakdown?.length > 0 && (
            <div className={`${C.card} rounded-2xl p-4 shadow-sm`}>
              <h3 className={`font-black text-sm ${C.text} mb-3`}>🥧 Category Breakdown</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={analytics.categoryBreakdown} dataKey="total" nameKey="category"
                    cx="50%" cy="50%" outerRadius={65} label={({ category, percent }) =>
                      percent > 0.08 ? `${category.split(' ')[0]} ${(percent * 100).toFixed(0)}%` : ''
                    } labelLine={false}>
                    {analytics.categoryBreakdown.map((entry) => (
                      <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`₹${v.toLocaleString()}`, '']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── Category Breakdown List ──────────────────────────────────────────── */}
      {analytics?.categoryBreakdown?.length > 0 && (
        <div className={`${C.card} rounded-2xl p-4 shadow-sm`}>
          <h3 className={`font-black text-sm ${C.text} mb-3`}>Category Totals</h3>
          <div className="space-y-2">
            {analytics.categoryBreakdown.map((c) => {
              const max = analytics.categoryBreakdown[0].total;
              return (
                <div key={c.category} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: CATEGORY_COLORS[c.category] || '#6b7280' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-0.5">
                      <span className={`text-xs font-bold truncate ${C.text}`}>{c.category}</span>
                      <span className="text-xs font-black ml-2 flex-shrink-0" style={{ color: CATEGORY_COLORS[c.category] || '#6b7280' }}>
                        ₹{c.total.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.08)' }}>
                      <div className="h-1.5 rounded-full transition-all"
                        style={{ width: `${(c.total / max) * 100}%`, background: CATEGORY_COLORS[c.category] || '#6b7280' }} />
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold flex-shrink-0 ${C.muted}`}>{c.count}×</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Search + Category Filter ─────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, vendor, notes…"
          className={`flex-1 min-w-[180px] border rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none ${C.input}`} />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
          className={`border rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none ${C.input}`}>
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* ── Expense Table ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : expenses.length === 0 ? (
        <div className={`${C.card} rounded-2xl py-16 text-center shadow-sm`}>
          <p className="text-4xl mb-3">💸</p>
          <p className={`font-black ${C.text}`}>No expenses found</p>
          <p className={`text-sm ${C.muted} mt-1`}>Add your first expense above</p>
        </div>
      ) : (
        <div className={`${C.card} rounded-2xl shadow-sm overflow-hidden`}>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.04)' }}>
                  {['Date', 'Title', 'Category', 'Vendor', 'Payment', 'Amount', 'Actions'].map((h) => (
                    <th key={h} className={`px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest ${C.muted}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp, i) => (
                  <tr key={exp._id} className="border-t transition-colors hover:bg-black/[0.02]"
                    style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                    <td className={`px-4 py-3 text-xs font-semibold ${C.muted} whitespace-nowrap`}>
                      {new Date(exp.expenseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td className={`px-4 py-3 font-bold ${C.text} max-w-[140px]`}>
                      <p className="truncate">{exp.title}</p>
                      {exp.recurring && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600">🔁 {exp.recurrenceType}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-black px-2 py-1 rounded-full"
                        style={{ background: `${CATEGORY_COLORS[exp.category]}20`, color: CATEGORY_COLORS[exp.category] || '#6b7280' }}>
                        {exp.category}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-xs ${C.muted} max-w-[100px] truncate`}>{exp.vendor || '—'}</td>
                    <td className={`px-4 py-3 text-xs font-semibold ${C.muted}`}>{exp.paymentMethod}</td>
                    <td className="px-4 py-3 font-black text-sm whitespace-nowrap" style={{ color: '#dc2626' }}>
                      ₹{exp.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => openEdit(exp)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-105"
                          style={{ background: 'rgba(0,123,139,0.1)', border: '1px solid rgba(0,123,139,0.25)' }}>
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" style={{ fill: '#007B8B' }}>
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                          </svg>
                        </button>
                        <button onClick={() => setDeleteConfirm(exp)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-105"
                          style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)' }}>
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" style={{ fill: '#dc2626' }}>
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'rgba(0,0,0,0.04)', borderTop: '2px solid rgba(0,0,0,0.08)' }}>
                  <td colSpan={5} className={`px-4 py-3 text-xs font-black uppercase tracking-widest ${C.muted}`}>Total</td>
                  <td className="px-4 py-3 font-black text-sm" style={{ color: '#dc2626' }}>
                    ₹{expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            {expenses.map((exp) => (
              <div key={exp._id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={`font-black text-sm truncate ${C.text}`}>{exp.title}</p>
                    <p className={`text-xs ${C.muted}`}>
                      {new Date(exp.expenseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                      {exp.vendor ? ` · ${exp.vendor}` : ''}
                    </p>
                  </div>
                  <p className="font-black text-base flex-shrink-0" style={{ color: '#dc2626' }}>₹{exp.amount.toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                      style={{ background: `${CATEGORY_COLORS[exp.category]}20`, color: CATEGORY_COLORS[exp.category] }}>
                      {exp.category}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${C.border} ${C.muted}`}>{exp.paymentMethod}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(exp)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,123,139,0.1)' }}>
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" style={{ fill: '#007B8B' }}><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                    </button>
                    <button onClick={() => setDeleteConfirm(exp)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(220,38,38,0.1)' }}>
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" style={{ fill: '#dc2626' }}><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4 py-6 overflow-y-auto"
          onClick={() => setFormOpen(false)}>
          <div className={`${C.card} rounded-2xl p-5 shadow-2xl w-full max-w-md my-auto`}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-black text-base ${C.text}`}>{editing ? 'Edit Expense' : 'Add Expense'}</h3>
              <button onClick={() => setFormOpen(false)} className={`${C.muted} hover:opacity-70 text-xl leading-none`}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Title */}
              <div>
                <label className={`block text-xs font-bold mb-1 ${C.muted}`}>Title *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Vegetable stock purchase"
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none ${C.input}`} />
              </div>

              {/* Amount + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-bold mb-1 ${C.muted}`}>Amount (₹) *</label>
                  <input type="number" min="0" step="0.01" value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0"
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none ${C.input}`} />
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${C.muted}`}>Date *</label>
                  <input type="date" value={form.expenseDate}
                    onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none ${C.input}`} />
                </div>
              </div>

              {/* Category + Payment */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-bold mb-1 ${C.muted}`}>Category *</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none ${C.input}`}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${C.muted}`}>Payment Method</label>
                  <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none ${C.input}`}>
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* Vendor */}
              <div>
                <label className={`block text-xs font-bold mb-1 ${C.muted}`}>Vendor / Supplier</label>
                <input type="text" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                  placeholder="e.g. Local Market"
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none ${C.input}`} />
              </div>

              {/* Notes */}
              <div>
                <label className={`block text-xs font-bold mb-1 ${C.muted}`}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional details…" rows={2}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none resize-none ${C.input}`} />
              </div>

              {/* Recurring */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.recurring}
                    onChange={(e) => setForm({ ...form, recurring: e.target.checked, recurrenceType: e.target.checked ? 'monthly' : '' })}
                    className="w-4 h-4 rounded accent-[#007B8B]" />
                  <span className={`text-xs font-bold ${C.text}`}>Recurring expense</span>
                </label>
                {form.recurring && (
                  <select value={form.recurrenceType} onChange={(e) => setForm({ ...form, recurrenceType: e.target.value })}
                    className={`border rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none ${C.input}`}>
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setFormOpen(false)}
                  className={`flex-1 border-2 ${C.border} ${C.muted} font-bold py-3 rounded-2xl text-sm transition-all hover:bg-gray-50 dark:hover:bg-gray-700`}>
                  Cancel
                </button>
                <button type="submit" disabled={formLoading}
                  className="flex-1 py-3 rounded-2xl text-sm font-black tracking-wide text-white disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
                  style={{ background: 'linear-gradient(135deg, var(--admin-dark), var(--admin))' }}>
                  {formLoading ? <Spinner sm /> : editing ? '💾 Update' : '💸 Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ─────────────────────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4"
          onClick={() => setDeleteConfirm(null)}>
          <div className={`${C.card} rounded-2xl p-6 shadow-2xl text-center w-full max-w-sm`}
            onClick={(e) => e.stopPropagation()}>
            <p className="text-4xl mb-3">🗑️</p>
            <h3 className={`font-black ${C.text} text-base mb-1`}>Delete Expense?</h3>
            <p className={`${C.muted} text-sm mb-1 font-bold`}>{deleteConfirm.title}</p>
            <p className="font-black text-base mb-4" style={{ color: '#dc2626' }}>₹{deleteConfirm.amount.toLocaleString()}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className={`flex-1 border-2 ${C.border} ${C.muted} font-bold py-2.5 rounded-xl text-sm transition-all`}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleteLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black py-2.5 rounded-xl text-sm transition-all disabled:opacity-60 flex items-center justify-center">
                {deleteLoading ? <Spinner sm /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensePage;
