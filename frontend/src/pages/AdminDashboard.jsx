import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import ThemeToggle from '../components/ThemeToggle';
import ChangePassword from '../components/ChangePassword';
import ShopToggle from '../components/ShopToggle';
import SalesAnalytics from '../components/SalesAnalytics';
import AnalyticsPanel from '../components/AnalyticsPanel';
// ── WhatsApp helpers ───────────────────────────────────────────────────────────
const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '919999999999';

const formatSingleOrderWA = (order) => {
  const time = new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const date = new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  let msg = `🧾 *Diesel Café Order Summary*\n`;
  msg += `${'─'.repeat(26)}\n`;
  msg += `👤 Name: ${order.customerName}\n`;
  msg += `🪑 Table: ${order.tableNumber}\n`;
  msg += `🕐 Time: ${time}, ${date}\n`;
  msg += `${'─'.repeat(26)}\n`;
  msg += `*Items:*\n`;
  order.items.forEach((it) => {
    msg += `  • ${it.name} ×${it.quantity}  —  ₹${it.price * it.quantity}\n`;
  });
  msg += `${'─'.repeat(26)}\n`;
  msg += `💰 *Total: ₹${order.totalAmount}*`;
  return msg;
};

const formatAllOrdersWA = (orders) => {
  const totalSales = orders.reduce((s, o) => s + o.totalAmount, 0);
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  let msg = `☕ *Diesel Café — Orders Export*\n📅 ${date}\n${'─'.repeat(28)}\n\n`;
  orders.forEach((o, i) => {
    msg += `*Order ${i + 1}*\n`;
    msg += `👤 ${o.customerName}   🪑 ${o.tableNumber}\n`;
    msg += `🕐 ${new Date(o.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}\n`;
    o.items.forEach((it) => { msg += `  • ${it.name} ×${it.quantity}  —  ₹${it.price * it.quantity}\n`; });
    msg += `💰 *₹${o.totalAmount}*\n\n`;
  });
  msg += `${'─'.repeat(28)}\n💵 *TOTAL: ₹${totalSales}*  |  📦 ${orders.length} Orders`;
  return msg;
};

const openWhatsApp = (msg) => {
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
};

// ── Constants ──────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  pending: 'badge-pending',
  accepted: 'badge-accepted',
  preparing: 'badge-preparing',
  ready: 'badge-ready',
  completed: 'badge-completed',
};

const NEXT_STATUS = { pending: 'accepted', accepted: 'preparing', preparing: 'ready', ready: 'completed' };
const STATUS_LABELS = { pending: 'Pending', accepted: 'Accepted', preparing: 'Preparing', ready: 'Ready', completed: 'Completed' };
const NEXT_LABELS = { pending: '✓ Accept', accepted: '🍳 Start Cooking', preparing: '✅ Mark Ready', ready: '🍽️ Complete' };
const SUPER_CATS = ['Meals', 'Snacks', 'Salad & Soup', 'Beverages'];

// ── Reusable bits ──────────────────────────────────────────────────────────────
const Spinner = () => (
  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spin inline-block" />
);

// Centered overlay modal wrapper
const Modal = ({ onClose, children }) => (
  <div
    className="fixed inset-0 bg-black/60 z-50 fade-in flex items-center justify-center px-4"
    onClick={onClose}
  >
    <div
      className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl text-center pop-in w-full max-w-sm"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [stats, setStats] = useState({ totalSales: 0, totalOrders: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState('all')
  const [adminName, setAdminName] = useState('Admin');

  // Menu form state
  const [menuForm, setMenuForm] = useState({
    superCategory: 'Meals', subCategory: '', name: '', description: '',
    price: '', veg: true, image: '', available: true,
  });
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Confirm dialogs
  const [deleteMenuConfirm, setDeleteMenuConfirm] = useState(null);   // menu item id
  const [orderDeleteModal, setOrderDeleteModal] = useState(null);     // order object — NEW 2-option modal
  const [clearAllConfirm, setClearAllConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(localStorage.getItem('diesel_logo_url') || '');

  const pollRef = useRef(null);

  // ── Auth check ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('diesel_admin_token');
    if (!token) return navigate('/admin/login');
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setAdminName(payload.name || 'Admin');
      if (payload.exp * 1000 < Date.now()) handleLogout();
    } catch (_) { handleLogout(); }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('diesel_admin_token');
    navigate('/admin/login');
  };

  // ── Logo upload (admin only) ──────────────────────────────────────────────────
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) { toast.error('Image too large. Max 1.5MB.'); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      setLogoPreview(base64);
      setLogoUploading(true);
      try {
        await api.put('/auth/logo', { logoUrl: base64 });
        localStorage.setItem('diesel_logo_url', base64);
        toast.success('Logo updated! Refresh to see it in navbar.', { icon: '🖼️' });
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to upload logo.');
        setLogoPreview(localStorage.getItem('diesel_logo_url') || '');
      } finally {
        setLogoUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogoRemove = async () => {
    setLogoUploading(true);
    try {
      await api.put('/auth/logo', { logoUrl: '' });
      localStorage.removeItem('diesel_logo_url');
      setLogoPreview('');
      toast.success('Logo removed.');
    } catch (_) { toast.error('Failed to remove logo.'); }
    finally { setLogoUploading(false); }
  };

  // ── Data fetching ─────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async (silent = true) => {
    try {
      if (!silent) setRefreshing(true);
      const res = await api.get('/orders');
      setOrders(res.data);
    } catch (_) {
      if (!silent) toast.error('Failed to refresh orders');
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, []);

  const fetchMenu = useCallback(async () => { try { const r = await api.get('/menu'); setMenuItems(r.data); } catch (_) { } }, []);
  const fetchStats = useCallback(async () => { try { const r = await api.get('/orders/daily-stats'); setStats({ totalSales: r.data.totalSales, totalOrders: r.data.totalOrders }); } catch (_) { } }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchOrders(true), fetchMenu(), fetchStats()]);
      setLoading(false);
    };
    init();
    pollRef.current = setInterval(() => fetchOrders(true), 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  // ── Order status update ───────────────────────────────────────────────────────
  const updateOrderStatus = async (id, status) => {
    try {
      await api.put(`/orders/${id}`, { status });
      setOrders((prev) => prev.map((o) => o._id === id ? { ...o, status } : o));
      fetchStats();
      toast.success(`Order marked as ${STATUS_LABELS[status]}`);
    } catch (_) { toast.error('Failed to update status'); }
  };

  // ── Verify takeaway payment ───────────────────────────────────────────────────
  const verifyPayment = async (id) => {
    try {
      await api.put(`/orders/${id}`, { paymentStatus: 'paid' });
      setOrders((prev) => prev.map((o) => o._id === id ? { ...o, paymentStatus: 'paid' } : o));
      toast.success('Payment verified ✅');
    } catch (_) { toast.error('Failed to verify payment'); }
  };

  // ── Delete order — direct (no WhatsApp) ──────────────────────────────────────
  const deleteOrderDirect = async (order) => {
    setActionLoading(true);
    try {
      await api.delete(`/orders/${order._id}`);
      setOrders((prev) => prev.filter((o) => o._id !== order._id));
      fetchStats();
      toast.success('Order deleted');
    } catch (_) { toast.error('Failed to delete order'); }
    finally { setActionLoading(false); setOrderDeleteModal(null); }
  };

  // ── Delete order — send to WhatsApp then delete ───────────────────────────────
  const deleteOrderWithWA = async (order) => {
    setActionLoading(true);
    openWhatsApp(formatSingleOrderWA(order));
    await new Promise((r) => setTimeout(r, 800));
    try {
      await api.delete(`/orders/${order._id}`);
      setOrders((prev) => prev.filter((o) => o._id !== order._id));
      fetchStats();
      toast.success('Sent to WhatsApp & deleted');
    } catch (_) { toast.error('Failed to delete order'); }
    finally { setActionLoading(false); setOrderDeleteModal(null); }
  };

  // ── Clear ALL orders ──────────────────────────────────────────────────────────
  const confirmClearAll = async () => {
    if (!orders.length) { toast('No orders to clear'); setClearAllConfirm(false); return; }
    setActionLoading(true);
    openWhatsApp(formatAllOrdersWA(orders));
    await new Promise((r) => setTimeout(r, 800));
    try {
      await api.delete('/orders');
      setOrders([]);
      fetchStats();
      toast.success('All orders exported & cleared');
    } catch (_) { toast.error('Failed to clear orders'); }
    finally { setActionLoading(false); setClearAllConfirm(false); }
  };

  // ── Menu CRUD ─────────────────────────────────────────────────────────────────
  const openAddForm = () => {
    setEditingId(null);
    setMenuForm({ superCategory: 'Meals', subCategory: '', name: '', description: '', price: '', veg: true, image: '', available: true });
    setFormError(''); setFormOpen(true);
  };

  const openEditForm = (item) => {
    setEditingId(item._id);
    setMenuForm({ superCategory: item.superCategory, subCategory: item.subCategory, name: item.name, description: item.description || '', price: String(item.price), veg: item.veg, image: item.image || '', available: item.available });
    setFormError(''); setFormOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!menuForm.name.trim() || !menuForm.subCategory.trim() || !menuForm.price) return setFormError('Name, subcategory and price are required.');
    setFormLoading(true); setFormError('');
    try {
      const payload = { ...menuForm, price: Number(menuForm.price) };
      if (editingId) { await api.put(`/menu/${editingId}`, payload); toast.success('Item updated'); }
      else { await api.post('/menu', payload); toast.success('Item added'); }
      await fetchMenu(); setFormOpen(false);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save.');
    } finally { setFormLoading(false); }
  };

  const handleDeleteMenuItem = async (id) => {
    try {
      await api.delete(`/menu/${id}`);
      setMenuItems((prev) => prev.filter((i) => i._id !== id));
      setDeleteMenuConfirm(null);
      toast.success('Item deleted');
    } catch (_) { toast.error('Failed to delete item'); }
  };

  const toggleAvailability = async (item) => {
    try {
      await api.put(`/menu/${item._id}`, { available: !item.available });
      setMenuItems((prev) => prev.map((i) => i._id === item._id ? { ...i, available: !i.available } : i));
      toast.success(item.available ? 'Marked unavailable' : 'Marked available');
    } catch (_) { toast.error('Failed to update availability'); }
  };

  // ── Derived values ────────────────────────────────────────────────────────────
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const filteredOrders = orders
    .filter((o) => statusFilter === 'all' || o.status === statusFilter)
    .filter((o) => orderTypeFilter === 'all' || (o.orderType || 'dine-in') === orderTypeFilter);

  // ── Loading screen ────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center font-montserrat bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#007B8B] rounded-full spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Loading dashboard…</p>
      </div>
    </div>
  );

  // ── CSS helpers using inline styles (dark mode via data- or class on root) ────
  const C = {
    bg: 'bg-gray-50 dark:bg-gray-900',
    card: 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700',
    text: 'text-gray-800 dark:text-gray-100',
    muted: 'text-gray-500 dark:text-gray-300',
    border: 'border-gray-100 dark:border-gray-700',
    input: 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100',
  };

  return (
    <div className={`min-h-screen font-montserrat ${C.bg} transition-colors duration-300`}>

      {/* ── Top Bar ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 shadow-lg" style={{ background: 'linear-gradient(135deg,#243f47 0%,#325862 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {localStorage.getItem('diesel_logo_url') ? (
              <img src={localStorage.getItem('diesel_logo_url')} alt="logo" className="w-9 h-9 rounded-full object-cover border-2 border-white/30" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-white/15 border border-white/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M2 21h18v-2H2v2zM20 8H4V5h16v3zm-2 7H6V9h12v6z" /></svg>
              </div>
            )}
            <div>
              <p className="font-black text-white text-sm tracking-widest">DIESEL CAFÉ</p>
              <p className="text-white/40 text-[10px]">Admin · {adminName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <div className="bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-full" style={{ animation: 'pulse 1.5s ease infinite' }}>
                {pendingCount} NEW
              </div>
            )}

            {/* Refresh */}
            <button onClick={() => fetchOrders(false)} disabled={refreshing} title="Refresh"
              className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors disabled:opacity-50">
              <svg viewBox="0 0 24 24" className={`w-4 h-4 fill-white ${refreshing ? 'spin' : ''}`}>
                <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
              </svg>
            </button>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Logout */}
            <button onClick={handleLogout} title="Logout"
              className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" /></svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── Stats Bar ──────────────────────────────────────────────────────── */}
      <div className={`${C.card} border-b shadow-sm`} style={{ borderBottom: undefined }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex gap-3 overflow-x-auto no-scrollbar">
          {[
            { label: "Today's Sales", value: `₹${stats.totalSales.toLocaleString()}`, color: '#d6993c' },
            { label: 'Orders Today', value: stats.totalOrders, color: undefined },
            { label: 'Pending', value: pendingCount, color: '#d97706' },
            { label: 'Available', value: menuItems.filter((i) => i.available).length, color: '#059669' },
          ].map((s) => (
            <div key={s.label} className={`flex-shrink-0 ${C.card} rounded-xl px-4 py-2.5 text-center min-w-[90px] shadow-sm`}>
              <p className="font-black text-lg leading-none" style={{ color: s.color || (document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1F1F1F') }}>
                {s.value}
              </p>
              <p className={`${C.muted} text-[10px] font-bold uppercase tracking-wide mt-1`}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab Navigation ─────────────────────────────────────────────────── */}
      <div className={`${C.card} sticky top-[60px] z-30 shadow-sm`} style={{ border: undefined }}>
        <div className="max-w-4xl mx-auto px-4 flex">
          {[
            { id: 'orders', label: 'Orders', badge: pendingCount },
            { id: 'menu', label: 'Menu' },
            { id: 'stats', label: 'Reports' },
            { id: 'analytics', label: 'Analytics' },
            { id: 'settings', label: 'Settings' },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 sm:flex-none sm:px-6 py-3.5 text-xs font-black uppercase tracking-widest border-b-2 transition-all relative"
              style={{
                borderBottomColor: tab === t.id ? '#007B8B' : 'transparent',
                color: tab === t.id ? '#007B8B' : '#9ca3af',
              }}
            >
              {t.label}
              {t.badge > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{t.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 py-4 pb-24 gap-6">

        {/* ══ ORDERS TAB ═════════════════════════════════════════════════════ */}
        {tab === 'orders' && (
          <div className="space-y-3">
            {/* Filter + Clear All row */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1 pb-0.5">
                {['all', 'pending', 'accepted', 'preparing', 'ready', 'completed'].map((s) => {
                  const count = s === 'all' ? orders.length : orders.filter((o) => o.status === s).length;
                  return (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all capitalize"
                      style={{
                        background: statusFilter === s ? '#325862' : (document.documentElement.classList.contains('dark') ? '#374151' : 'white'),
                        color: statusFilter === s ? 'white' : '#6b7280',
                        borderColor: statusFilter === s ? '#325862' : (document.documentElement.classList.contains('dark') ? '#4b5563' : '#e5e7eb'),
                      }}
                    >
                      {s === 'all' ? 'All' : STATUS_LABELS[s]} ({count})
                    </button>
                  );
                })}
              </div>
              {orders.length > 0 && (
                <button onClick={() => setClearAllConfirm(true)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-200 dark:border-red-700 hover:bg-red-100 transition-all">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                  Clear All
                </button>
              )}
            </div>

            {/* Order type filter row */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {[
                { id: 'all',      label: 'All Types' },
                { id: 'dine-in',  label: '🍽️ Dine In' },
                { id: 'takeaway', label: '🛍️ Takeaway' },
              ].map((t) => (
                <button key={t.id} onClick={() => setOrderTypeFilter(t.id)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
                  style={{
                    background:  orderTypeFilter === t.id ? '#940901' : (document.documentElement.classList.contains('dark') ? '#374151' : 'white'),
                    color:       orderTypeFilter === t.id ? 'white' : '#6b7280',
                    borderColor: orderTypeFilter === t.id ? '#940901' : (document.documentElement.classList.contains('dark') ? '#4b5563' : '#e5e7eb'),
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Orders list */}
            {filteredOrders.length === 0 ? (
              <div className={`py-16 text-center ${C.card} rounded-2xl shadow-sm`}>
                <div className="text-5xl mb-3">📋</div>
                <p className={`font-bold ${C.text}`}>No orders here</p>
                <p className={`${C.muted} text-sm mt-1`}>Orders appear in real-time (every 5s)</p>
              </div>
            ) : filteredOrders.map((order) => (
              <div key={order._id}
                className={`${C.card} rounded-2xl overflow-hidden transition-all duration-300 shadow-sm`}
                style={{ borderLeft: order.status === 'pending' ? '3px solid #f59e0b' : '3px solid transparent' }}
              >
                {/* Header */}
                <div className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-black ${C.text} text-sm`}>{order.customerName}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,123,139,0.1)', color: '#d6993c' }}>{order.tableNumber}</span>
                      <span
                        className="text-xs font-black px-2 py-0.5 rounded-full uppercase tracking-wide"
                        style={{
                          background: (order.orderType || 'dine-in') === 'takeaway'
                            ? 'rgba(148,9,1,0.12)' : 'rgba(49,96,61,0.12)',
                          color: (order.orderType || 'dine-in') === 'takeaway'
                            ? '#940901' : '#31603D',
                          border: `1px solid ${(order.orderType || 'dine-in') === 'takeaway' ? '#940901' : '#31603D'}`,
                        }}
                      >
                        {(order.orderType || 'dine-in') === 'takeaway' ? '🛍️ Takeaway' : '🍽️ Dine In'}
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</span>
                    </div>
                    <p className={`${C.muted} text-xs mt-1`}>
                      {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-base" style={{ color: '#d6993c' }}>₹{order.totalAmount}</p>
                    <p className={`${C.muted} text-xs`}>{order.items.length} item(s)</p>
                  </div>
                </div>

                {/* Items */}
                <div className={`px-4 pb-3 space-y-1 border-t ${C.border} pt-2`}>
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className={`${C.text} font-medium`}>{item.name} <span className={`${C.muted} font-normal`}>×{item.quantity}</span></span>
                      <span className={`${C.muted} text-xs`}>₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                  {order.note && <p className={`${C.muted} text-xs italic mt-1.5 border-t ${C.border} pt-1.5`}>📝 {order.note}</p>}
                </div>

                {/* Takeaway — pickup token, UTR, payment method, verify button */}
                {order.orderType === 'takeaway' && (
                  <div className={`px-4 pb-3 border-t ${C.border} pt-2 flex flex-wrap gap-2 items-center`}>
                    {order.pickupToken && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black"
                        style={{ background: 'rgba(148,9,1,0.1)', color: '#940901', border: '1px solid rgba(148,9,1,0.25)' }}>
                        🎫 {order.pickupToken}
                      </span>
                    )}
                    {order.utrNumber && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
                        style={{ background: 'rgba(0,123,139,0.08)', color: '#007B8B', border: '1px solid rgba(0,123,139,0.2)' }}>
                        🔗 {order.utrNumber}
                      </span>
                    )}
                    {order.paymentMethod && order.paymentMethod !== 'not_required' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
                        style={{ background: 'rgba(214,153,60,0.1)', color: '#b37d2e', border: '1px solid rgba(214,153,60,0.25)' }}>
                        {order.paymentMethod === 'upi' ? '📱 UPI' : order.paymentMethod === 'debit-card' ? '💳 Debit' : '💳 Credit'}
                      </span>
                    )}
                    {order.paymentStatus === 'pending_verification' && (
                      <button onClick={() => verifyPayment(order._id)}
                        className="ml-auto px-3 py-1 rounded-lg text-xs font-black text-white active:scale-95 transition-all"
                        style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}>
                        ✓ Verify Payment
                      </button>
                    )}
                    {order.paymentStatus === 'paid' && (
                      <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
                        style={{ background: 'rgba(5,150,105,0.1)', color: '#059669', border: '1px solid rgba(5,150,105,0.25)' }}>
                        ✅ Verified
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className={`border-t ${C.border} px-4 py-2.5 flex gap-2`}>
                  {order.status !== 'completed' && (
                    <button onClick={() => updateOrderStatus(order._id, NEXT_STATUS[order.status])}
                      className="flex-1 py-2 rounded-xl text-xs font-black tracking-wide uppercase transition-all active:scale-[0.98] text-white"
                      style={{ background: order.status === 'pending' ? 'linear-gradient(135deg,#22c55e,#16a34a)' : order.status === 'accepted' ? 'linear-gradient(135deg,#3b82f6,#1d4ed8)' : order.status === 'preparing' ? 'linear-gradient(135deg,#10b981,#047857)' : 'linear-gradient(135deg,#6b7280,#4b5563)' }}>
                      {NEXT_LABELS[order.status]}
                    </button>
                  )}

                  {/* WA share only */}
                  <button onClick={() => openWhatsApp(formatSingleOrderWA(order))}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-green-50 dark:bg-green-900/20 text-green-600 border border-green-200 dark:border-green-700 hover:bg-green-100 transition-all flex items-center gap-1"
                    title="Share to WhatsApp">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                    </svg>
                    WA
                  </button>

                  {/* Delete — opens 2-option modal */}
                  <button onClick={() => setOrderDeleteModal(order)}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-200 dark:border-red-700 hover:bg-red-100 transition-all"
                    title="Delete order">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══ MENU TAB ═══════════════════════════════════════════════════════ */}
        {tab === 'menu' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`font-black ${C.text} text-base`}>Menu Items <span className={`${C.muted} font-normal`}>({menuItems.length})</span></h2>
              <button onClick={openAddForm} className="text-white text-xs font-black px-4 py-2 rounded-full active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg,#325862,#243f47)' }}>
                + Add Item
              </button>
            </div>

            {SUPER_CATS.map((cat) => {
              const catItems = menuItems.filter((i) => i.superCategory === cat);
              if (!catItems.length) return null;
              return (
                <div key={cat} className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg,#007B8B,transparent)' }} />
                    <h3 className="font-black text-xs uppercase tracking-widest px-2" style={{ color: '#d6993c' }}>{cat}</h3>
                    <div className="h-px flex-1" style={{ background: 'linear-gradient(270deg,#007B8B,transparent)' }} />
                  </div>
                  <div className="space-y-2">
                    {catItems.map((item) => (
                      <div key={item._id} className={`${C.card} rounded-xl p-3 flex gap-3 shadow-sm transition-opacity ${!item.available ? 'opacity-50' : ''}`}>
                        <img src={item.image || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=100'} alt={item.name}
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=100'; }}
                          className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-gray-100 dark:bg-gray-700" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-bold text-gray-800 dark:text-gray-100 text-sm leading-tight truncate">{item.name}</p>
                              <p className="text-gray-500 dark:text-gray-300 text-xs mt-0.5">{item.subCategory} · <span style={{ color: '#d6993c' }} className="font-bold">₹{item.price}</span></p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0 items-center">
                              <button onClick={() => toggleAvailability(item)}
                                className="text-xs px-2 py-1 rounded-lg font-bold border transition-all"
                                style={item.available ? { background: 'rgba(214,153,60,0.15)', color: '#325862', borderColor: '#d6993c' } : { background: document.documentElement.classList.contains('dark') ? '#374151' : '#f3f4f6', color: '#9ca3af', borderColor: document.documentElement.classList.contains('dark') ? '#4b5563' : '#e5e7eb' }}>
                                {item.available ? 'ON' : 'OFF'}
                              </button>
                              <button onClick={() => openEditForm(item)} className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${C.muted} hover:text-gray-600 dark:hover:text-gray-200 transition-colors`}>
                                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                              </button>
                              <button onClick={() => setDeleteMenuConfirm(item._id)} className={`p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 ${C.muted} hover:text-red-500 transition-colors`}>
                                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ STATS TAB ══════════════════════════════════════════════════════ */}
        {tab === 'stats' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Today's Revenue", value: `₹${stats.totalSales.toLocaleString()}`, color: '#d6993c' },
                { label: 'Total Orders', value: stats.totalOrders, color: undefined },
                { label: 'Completed', value: orders.filter((o) => o.status === 'completed').length, color: '#059669' },
                { label: 'Pending', value: pendingCount, color: '#d97706' },
              ].map((s) => (
                <div key={s.label} className={`${C.card} rounded-2xl p-4 text-center shadow-sm`}>
                  <p className="font-black text-2xl" style={{ color: s.color || (document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1F1F1F') }}>{s.value}</p>
                  <p className={`${C.muted} text-xs font-bold uppercase tracking-wide mt-1`}>{s.label}</p>
                </div>
              ))}
            </div>

            <div className={`${C.card} rounded-2xl p-5 shadow-sm`}>
              <h3 className={`font-black ${C.text} text-base mb-4`}>Status Breakdown</h3>
              {['pending', 'accepted', 'preparing', 'ready', 'completed'].map((s) => {
                const count = orders.filter((o) => o.status === s).length;
                const pct = orders.length ? Math.round((count / orders.length) * 100) : 0;
                return (
                  <div key={s} className="flex items-center gap-3 mb-3">
                    <span className={`text-xs font-bold ${C.muted} w-20 capitalize`}>{STATUS_LABELS[s]}</span>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#007B8B,#014F5A)' }} />
                    </div>
                    <span className={`text-xs font-black ${C.text} w-6 text-right`}>{count}</span>
                  </div>
                );
              })}
            </div>

            {orders.length > 0 && (
              <button onClick={() => openWhatsApp(formatAllOrdersWA(orders))}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm tracking-wide text-white transition-all active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}>
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
                Export All Orders to WhatsApp
              </button>
            )}
          </div>
        )}

        {/* ══ SETTINGS TAB ═══════════════════════════════════════════════════ */}
        {tab === 'settings' && (
          <div className="space-y-5">
            <ShopToggle />
            {/* ── Logo Upload (admin only) ── */}
            <div className={`${C.card} rounded-2xl shadow-sm overflow-hidden`}>
              {/* Card header strip */}
              <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#982829,#d6993c,#325862)' }} />
              <div className="p-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#325862,#243f47)' }}>
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className={`font-black text-base ${C.text}`}>Café Logo</h2>
                    <p className={`text-xs ${C.muted}`}>Displayed in navbar for all customers</p>
                  </div>
                </div>

                {/* Preview row */}
                <div className="flex items-center gap-4 mb-4">
                  {/* Logo preview circle */}
                  <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center border-2"
                    style={{ borderColor: 'rgba(214,153,60,0.4)', background: 'rgba(214,153,60,0.08)' }}>
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-9 h-9" style={{ fill: '#d6993c', opacity: 0.45 }}>
                        <path d="M18.5 3H6c-1.1 0-2 .9-2 2v5.71c0 3.83 2.95 7.18 6.78 7.29 3.96.12 7.22-3.06 7.22-7v-1h.5c1.93 0 3.5-1.57 3.5-3.5S20.43 3 18.5 3zM16 5v3H6V5h10zm2.5 3H18V5h.5c.83 0 1.5.67 1.5 1.5S19.33 8 18.5 8zM4 19h16v2H4z" />
                      </svg>
                    )}
                  </div>

                  {/* Upload area */}
                  <div className="flex-1 space-y-2">
                    <p className={`text-xs font-bold uppercase tracking-wider ${C.muted}`}>Upload New Logo</p>
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={handleLogoUpload}
                        disabled={logoUploading}
                      />
                      <span
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all select-none"
                        style={{
                          background: logoUploading
                            ? 'rgba(50,88,98,0.5)'
                            : 'linear-gradient(135deg,#325862,#243f47)',
                          cursor: logoUploading ? 'not-allowed' : 'pointer',
                          fontFamily: 'Poppins,sans-serif',
                          boxShadow: '0 4px 12px rgba(50,88,98,0.3)',
                        }}
                      >
                        {logoUploading ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full spin inline-block" />
                            Uploading…
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
                              <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
                            </svg>
                            Choose Image
                          </>
                        )}
                      </span>
                    </label>
                    <p className={`text-xs ${C.muted}`}>PNG, JPG, WebP · Max 1.5 MB</p>
                  </div>
                </div>

                {/* Remove button — shown only when logo exists */}
                {logoPreview && (
                  <button
                    onClick={handleLogoRemove}
                    disabled={logoUploading}
                    className="w-full py-2.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-50 mt-1"
                    style={{ borderColor: '#ef4444', color: '#ef4444', background: 'rgba(239,68,68,0.06)' }}
                  >
                    🗑️ Remove Logo
                  </button>
                )}
              </div>
            </div>

            {/* ── Change Password ── */}
            <ChangePassword />
          </div>
        )}
      </main>

      {/* ══ ANALYTICS TAB ══ */}
      {tab === 'analytics' && (
        <div className="space-y-4">
          <AnalyticsPanel />
        </div>
      )}

      {/* ══ Menu Item Form Modal ═══════════════════════════════════════════════ */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 fade-in flex items-end sm:items-center justify-center sm:px-4" onClick={() => setFormOpen(false)}>
          <div className={`${C.card} rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto w-full sm:max-w-md`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-600" /></div>
            <div className="px-5 pt-5 pb-2 flex items-center justify-between">
              <h3 className={`font-black ${C.text} text-lg`}>{editingId ? 'Edit Item' : 'Add New Item'}</h3>
              <button onClick={() => setFormOpen(false)} className={`${C.muted} hover:text-gray-600 p-1`}>
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="px-5 pb-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block ${C.muted} font-bold text-xs mb-1`}>Super Category *</label>
                  <select value={menuForm.superCategory} onChange={(e) => setMenuForm({ ...menuForm, superCategory: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#007B8B] ${C.input}`}>
                    {SUPER_CATS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block ${C.muted} font-bold text-xs mb-1`}>Sub Category *</label>
                  <input type="text" value={menuForm.subCategory} onChange={(e) => setMenuForm({ ...menuForm, subCategory: e.target.value })} placeholder="e.g. Momos"
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#007B8B] ${C.input}`} />
                </div>
              </div>
              <div>
                <label className={`block ${C.muted} font-bold text-xs mb-1`}>Item Name *</label>
                <input type="text" value={menuForm.name} onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })} placeholder="e.g. Paneer Burger"
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#007B8B] ${C.input}`} />
              </div>
              <div>
                <label className={`block ${C.muted} font-bold text-xs mb-1`}>Description</label>
                <input type="text" value={menuForm.description} onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })} placeholder="Short description"
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#007B8B] ${C.input}`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block ${C.muted} font-bold text-xs mb-1`}>Price (₹) *</label>
                  <input type="number" value={menuForm.price} onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })} placeholder="0" min="0"
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#007B8B] ${C.input}`} />
                </div>
                <div>
                  <label className={`block ${C.muted} font-bold text-xs mb-1`}>Type</label>
                  <select value={menuForm.veg ? 'veg' : 'nonveg'} onChange={(e) => setMenuForm({ ...menuForm, veg: e.target.value === 'veg' })}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#007B8B] ${C.input}`}>
                    <option value="veg">🟢 Veg</option>
                    <option value="nonveg">🔴 Non-Veg</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={`block ${C.muted} font-bold text-xs mb-1`}>Image URL</label>
                <input type="url" value={menuForm.image} onChange={(e) => setMenuForm({ ...menuForm, image: e.target.value })} placeholder="https://..."
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#007B8B] ${C.input}`} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={menuForm.available} onChange={(e) => setMenuForm({ ...menuForm, available: e.target.checked })} className="w-4 h-4" style={{ accentColor: '#007B8B' }} />
                <span className={`${C.text} font-bold text-sm`}>Available today</span>
              </label>
              {formError && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl px-3 py-2 text-red-600 dark:text-red-400 text-xs font-medium">{formError}</div>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setFormOpen(false)} className={`flex-1 border-2 ${C.border} ${C.muted} font-bold py-3 rounded-2xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all`}>Cancel</button>
                <button type="submit" disabled={formLoading} className="btn-primary flex-1 py-3 rounded-2xl text-sm tracking-widest uppercase disabled:opacity-60">
                  {formLoading ? <Spinner /> : editingId ? 'Update' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Delete Menu Item Confirm ══════════════════════════════════════════ */}
      {deleteMenuConfirm && (
        <Modal onClose={() => setDeleteMenuConfirm(null)}>
          <div className="text-4xl mb-3">🗑️</div>
          <h3 className={`font-black ${C.text} text-base mb-1.5`}>Delete Menu Item?</h3>
          <p className={`${C.muted} text-sm mb-5`}>This cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteMenuConfirm(null)} className={`flex-1 border-2 ${C.border} ${C.muted} font-bold py-2.5 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all`}>Cancel</button>
            <button onClick={() => handleDeleteMenuItem(deleteMenuConfirm)} className="flex-1 bg-red-500 text-white font-black py-2.5 rounded-xl text-sm hover:bg-red-600 transition-all">Delete</button>
          </div>
        </Modal>
      )}

      {/* ══ Delete Order — 2-option modal ═════════════════════════════════════ */}
      {orderDeleteModal && (
        <Modal onClose={() => !actionLoading && setOrderDeleteModal(null)}>
          <div className="text-4xl mb-3">🗑️</div>
          <h3 className={`font-black ${C.text} text-base mb-1`}>Delete Order?</h3>
          <p className={`${C.muted} text-sm mb-1`}>
            <span className={`font-bold ${C.text}`}>{orderDeleteModal.customerName}</span> · {orderDeleteModal.tableNumber}
          </p>
          <p className={`${C.muted} text-xs mb-5`}>Choose how to delete this order:</p>

          <div className="space-y-2.5">
            {/* Option 1 — WhatsApp + Delete */}
            <button
              onClick={() => deleteOrderWithWA(orderDeleteModal)}
              disabled={actionLoading}
              className="w-full py-3 rounded-xl font-black text-sm text-white transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}
            >
              {actionLoading ? <Spinner /> : (
                <>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                  </svg>
                  ✅ Send to WhatsApp &amp; Delete
                </>
              )}
            </button>

            {/* Option 2 — Delete only */}
            <button
              onClick={() => deleteOrderDirect(orderDeleteModal)}
              disabled={actionLoading}
              className="w-full py-3 rounded-xl font-black text-sm text-white bg-red-500 hover:bg-red-600 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {actionLoading ? <Spinner /> : '❌ Delete Without Sending'}
            </button>

            {/* Cancel */}
            <button
              onClick={() => setOrderDeleteModal(null)}
              disabled={actionLoading}
              className={`w-full py-2.5 rounded-xl font-bold text-sm border-2 ${C.border} ${C.muted} hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-60`}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* ══ Clear All Confirm ══════════════════════════════════════════════════ */}
      {clearAllConfirm && (
        <Modal onClose={() => !actionLoading && setClearAllConfirm(false)}>
          <div className="text-4xl mb-3">📤</div>
          <h3 className={`font-black ${C.text} text-base mb-1.5`}>Export All &amp; Clear?</h3>
          <p className={`${C.muted} text-sm mb-5`}>
            This will send <span className="font-bold" style={{ color: '#d6993c' }}>{orders.length} orders</span> to WhatsApp, then permanently delete them all.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setClearAllConfirm(false)} disabled={actionLoading}
              className={`flex-1 border-2 ${C.border} ${C.muted} font-bold py-2.5 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-60`}>
              Cancel
            </button>
            <button onClick={confirmClearAll} disabled={actionLoading}
              className="flex-1 text-white font-black py-2.5 rounded-xl text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
              style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}>
              {actionLoading ? <Spinner /> : '📲 Export & Clear All'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminDashboard;
