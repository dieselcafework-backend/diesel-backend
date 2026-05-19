import React, { useState, useEffect, useRef } from 'react';
import { useCart } from '../context/CartContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

// ── UPI config from env vars ──────────────────────────────────────────────────
const CAFE_UPI_ID   = import.meta.env.VITE_CAFE_UPI_ID   || '9696028522@ybl';  // Default UPI ID for testing
const CAFE_UPI_NAME = import.meta.env.VITE_CAFE_UPI_NAME || 'Diesel Cafe';

// Build UPI deep link — opens any installed UPI app on mobile
const buildUpiLink = (amount) =>
  `upi://pay?pa=${CAFE_UPI_ID}&pn=${encodeURIComponent(CAFE_UPI_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Takeaway Order')}`;

// QR code image from free public API (no sign-up needed)
const buildQrUrl = (amount) => {
  const upiLink = buildUpiLink(amount);
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`;
};

// ─────────────────────────────────────────────────────────────────────────────
const OrderModal = ({ isOpen, onClose, tableFromQR }) => {
  const { items, totalAmount, clearCart } = useCart();

  const [step, setStep]               = useState('form');     // 'form' | 'payment' | 'success'
  const [orderType, setOrderType]     = useState('dine-in');
  const [name, setName]               = useState('');
  const [phone, setPhone]             = useState('');
  const [table, setTable]             = useState(tableFromQR || '');
  const [note, setNote]               = useState('');
  const [utr, setUtr]                 = useState('');          // UTR/transaction ID
  const [loading, setLoading]         = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError]             = useState('');
  const [utrError, setUtrError]       = useState('');
  const [orderId, setOrderId]         = useState(null);
  const [orderStatus, setOrderStatus] = useState('pending');
  const [savedTotal, setSavedTotal]   = useState(0);
  const [savedOrderType, setSavedOrderType] = useState('dine-in');
  const [pickupToken, setPickupToken] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('not_required');

  const pollRef       = useRef(null);
  const prevStatusRef = useRef('pending');

  useEffect(() => { if (tableFromQR) setTable(tableFromQR); }, [tableFromQR]);

  useEffect(() => {
    if (orderType === 'takeaway') setTable('Takeaway');
    else setTable(tableFromQR || '');
    setError('');
    setUtrError('');
    setUtr('');
  }, [orderType, tableFromQR]);

  // ── Real-time polling every 3s ─────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'success' || !orderId) return;

    const TOASTS = {
      accepted:  { msg: '✅ Order accepted by the kitchen!', icon: '🍳' },
      preparing: { msg: '👨‍🍳 Chef is preparing your food!',   icon: '🔥' },
      ready:     { msg: savedOrderType === 'takeaway' ? '🛍️ Ready for pickup!' : '🎉 Your food is ready!', icon: '🍽️' },
      completed: { msg: '🙏 Thanks! Visit again.',           icon: '☕' },
    };

    const poll = async () => {
      try {
        const res = await api.get(`/orders/track/${orderId}`);
        const ns  = res.data.status;
        if (ns !== prevStatusRef.current) {
          prevStatusRef.current = ns;
          setOrderStatus(ns);
          if (TOASTS[ns]) toast.success(TOASTS[ns].msg, { duration: 5000, icon: TOASTS[ns].icon });
          if (['ready', 'completed'].includes(ns)) clearInterval(pollRef.current);
        }
        // Also update payment status from server
        if (res.data.paymentStatus) setPaymentStatus(res.data.paymentStatus);
      } catch (_) {}
    };

    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => clearInterval(pollRef.current);
  }, [step, orderId, savedOrderType]);

  const handleClose = () => {
    setStep('form'); setOrderType('dine-in');
    setName(''); setPhone(''); setTable(tableFromQR || '');
    setNote(''); setUtr(''); setError(''); setUtrError('');
    setOrderId(null); setOrderStatus('pending'); setPickupToken('');
    setPaymentStatus('not_required');
    prevStatusRef.current = 'pending';
    clearInterval(pollRef.current);
    onClose();
  };

  // ── Step 1: validate form → dine-in places order, takeaway goes to payment ──
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Please enter your name.');
    if (orderType === 'dine-in' && !table.trim()) return setError('Please enter your table number.');
    if (orderType === 'takeaway') {
      if (!phone.trim()) return setError('Please enter your mobile number.');
      if (!/^[6-9]\d{9}$/.test(phone.trim())) return setError('Enter a valid 10-digit mobile number.');
    }
    if (items.length === 0) return setError('Your cart is empty.');

    // Dine-in: place order immediately
    if (orderType === 'dine-in') {
      setLoading(true);
      try {
        const res = await api.post('/orders', {
          customerName: name.trim(),
          tableNumber:  table.trim(),
          orderType:    'dine-in',
          note:         note.trim(),
          items: items.map((i) => ({ menuItem: i._id, name: i.name, price: i.price, quantity: i.quantity, veg: i.veg })),
        });
        setSavedTotal(totalAmount);
        setSavedOrderType('dine-in');
        setOrderId(res.data._id);
        setStep('success');
        clearCart();
        toast.success('Order placed! Kitchen notified.', { icon: '🛎️', duration: 4000 });
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to place order. Try again.');
      } finally { setLoading(false); }
      return;
    }

    // Takeaway: go to UPI payment screen
    setStep('payment');
  };

  // ── Step 2: customer enters UTR → submit order ────────────────────────────
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setUtrError('');
    if (!utr.trim()) return setUtrError('Please enter the UTR / Transaction ID.');
    if (utr.trim().length < 6) return setUtrError('UTR must be at least 6 characters.');

    setSubmitLoading(true);
    try {
      const res = await api.post('/orders', {
        customerName: name.trim(),
        phoneNumber:  phone.trim(),
        tableNumber:  'Takeaway',
        orderType:    'takeaway',
        note:         note.trim(),
        utrNumber:    utr.trim(),
        items: items.map((i) => ({ menuItem: i._id, name: i.name, price: i.price, quantity: i.quantity, veg: i.veg })),
      });
      setSavedTotal(totalAmount);
      setSavedOrderType('takeaway');
      setPickupToken(res.data.pickupToken);
      setPaymentStatus(res.data.paymentStatus);
      setOrderId(res.data._id);
      setStep('success');
      clearCart();
      toast.success(`Order placed! Pickup: ${res.data.pickupToken}`, { icon: '🛍️', duration: 5000 });
    } catch (err) {
      setUtrError(err.response?.data?.message || 'Failed to place order. Try again.');
    } finally { setSubmitLoading(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  const isTakeaway = orderType === 'takeaway';

  const statusConfig = {
    pending:   { label: 'Order Received',  icon: '⏳', color: '#ffeb5e', bg: '#fef3c7',
                 desc: isTakeaway ? 'Admin will verify your payment shortly.' : 'Waiting for kitchen confirmation…' },
    accepted:  { label: 'Order Accepted!', icon: '✅', color: '#0f742fd0', bg: '#d1fae5', desc: 'Your order is confirmed and being prepared.' },
    preparing: { label: 'Preparing…',      icon: '👨‍🍳', color: '#4a7c59', bg: '#dbeafe', desc: "Chef is cooking your food. Won't be long!" },
    ready:     { label: isTakeaway ? 'Ready for Pickup!' : 'Ready to Serve!',
                 icon: '🎉', color: '#0d571f', bg: '#ecfdf5',
                 desc: isTakeaway ? '🛍️ Show your pickup token at the counter!' : "Your food is ready! We'll bring it to your table." },
    completed: { label: 'Completed', icon: '🍽️', color: '#6b7280', bg: '#f3f4f6', desc: 'Thank you for visiting Diesel Café!' },
  };

  const status      = statusConfig[orderStatus] || statusConfig.pending;
  const statusSteps = ['pending', 'accepted', 'preparing', 'ready'];
  const currentIdx  = statusSteps.indexOf(orderStatus);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-50 fade-in" onClick={handleClose} />

      {/* Sheet */}
      <div className="fixed inset-0 flex items-center justify-center z-50 px-4">
        <div className="rounded-2xl w-full max-w-md slide-up overflow-y-auto max-h-[92vh]"
          style={{ background: '#ae7b45' }}>

          {/* Pull handle */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-white/50" />
          </div>

          {/* ══ STEP 1: FORM ════════════════════════════════════════ */}
          {step === 'form' && (
            <>
              <div className="px-6 pt-5 pb-2">
                <h2 className="font-black text-xl tracking-wide text-white">PLACE ORDER</h2>
                <p className="text-gray-100 text-sm mt-1">{items.length} item(s) · ₹{totalAmount}</p>
              </div>

              {/* Order type selector */}
              <div className="mx-6 mb-3">
                <p className="text-white text-xs font-bold uppercase tracking-widest mb-2 opacity-80">Order Type</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'dine-in',  label: '🍽️ Dine In' },
                    { id: 'takeaway', label: '🛍️ Takeaway' },
                  ].map((t) => (
                    <button key={t.id} type="button" onClick={() => setOrderType(t.id)}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border-2 transition-all duration-200 active:scale-[0.97]"
                      style={{
                        background:  orderType === t.id ? '#940901' : 'rgba(255,255,255,0.15)',
                        borderColor: orderType === t.id ? '#940901' : 'rgba(255,255,255,0.3)',
                        color: 'white',
                        boxShadow: orderType === t.id ? '0 4px 12px rgba(148,9,1,0.45)' : 'none',
                      }}>
                      {t.label}
                    </button>
                  ))}
                </div>
                {isTakeaway && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
                    style={{ background: 'rgba(0,0,0,0.2)', color: '#ffd700', border: '1px solid rgba(255,215,0,0.25)' }}>
                    💳 Takeaway requires UPI payment
                  </div>
                )}
              </div>

              {/* Order summary */}
              <div className="mx-6 my-3 rounded-2xl p-3 space-y-1.5 max-h-28 overflow-y-auto"
                style={{ background: '#f6eee5', border: '1px solid #e0cdb8' }}>
                {items.map((item) => (
                  <div key={item._id} className="flex justify-between text-sm">
                    <span className="text-gray-700 font-medium">{item.name} <span className="font-normal text-gray-500">×{item.quantity}</span></span>
                    <span className="font-bold" style={{ color: '#31603D' }}>₹{item.price * item.quantity}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 flex justify-between">
                  <span className="font-black text-gray-800 text-sm">Total</span>
                  <span className="font-black" style={{ color: '#31603D' }}>₹{totalAmount}</span>
                </div>
              </div>

              <form onSubmit={handleFormSubmit} className="px-6 pb-6 space-y-3">
                {/* Name */}
                <div>
                  <label className="block font-bold text-sm mb-1 text-gray-100">Your Name *</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name" className="input-base" maxLength={50} autoFocus />
                </div>

                {/* Phone — takeaway only */}
                {isTakeaway && (
                  <div>
                    <label className="block font-bold text-sm mb-1 text-gray-100">Mobile Number *</label>
                    <div className="flex gap-2">
                      <div className="flex items-center justify-center px-3 rounded-xl font-bold text-sm bg-white text-gray-600 flex-shrink-0"
                        style={{ border: '1.5px solid #e2d9c0', minWidth: '52px' }}>
                        +91
                      </div>
                      <input type="tel" value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="10-digit number" className="input-base flex-1"
                        inputMode="numeric" maxLength={10} />
                    </div>
                    <p className="text-white/60 text-xs mt-1">We'll call you when your order is ready</p>
                  </div>
                )}

                {/* Table — dine-in only */}
                {!isTakeaway && (
                  <div>
                    <label className="block font-bold text-sm mb-1 text-gray-100">Table Number *</label>
                    <input type="number" value={table} onChange={(e) => setTable(e.target.value)}
                      placeholder="e.g. 5" className="input-base"
                      readOnly={!!tableFromQR}
                      style={tableFromQR ? { background: '#f9fafb', color: '#6b7280' } : {}}
                      maxLength={20} />
                    {tableFromQR && <p className="text-gray-100 text-xs mt-1">📍 Auto-detected from QR code</p>}
                  </div>
                )}

                {/* Note */}
                <div>
                  <label className="block font-bold text-sm mb-1 text-gray-100">
                    Special Note <span className="font-normal text-gray-100">(optional)</span>
                  </label>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)}
                    placeholder="Allergies or special requests?" rows={2}
                    className="input-base resize-none" maxLength={200} />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm font-medium">
                    ⚠️ {error}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={handleClose}
                    className="flex-1 border-2 font-bold py-3 rounded-2xl text-sm active:scale-[0.98] transition-all"
                    style={{ background: '#f6eee5', borderColor: '#940901', color: '#940901' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={loading}
                    className="btn-primary flex-1 py-3 rounded-2xl text-sm font-black tracking-wide uppercase disabled:opacity-30"
                    style={{ background: '#940901' }}>
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spin inline-block" />
                        Placing…
                      </span>
                    ) : isTakeaway ? 'Proceed to Pay →' : 'CONFIRM'}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ══ STEP 2: UPI PAYMENT ═════════════════════════════════ */}
          {step === 'payment' && (
            <div className="px-6 py-5">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => setStep('form')}
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                  ←
                </button>
                <div>
                  <h2 className="font-black text-lg text-white">Pay via UPI</h2>
                  <p className="text-white/70 text-xs">Complete payment to place order</p>
                </div>
              </div>

              {/* Amount badge */}
              <div className="text-center mb-4 py-3 rounded-2xl"
                style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Amount to Pay</p>
                <p className="text-white font-black text-4xl">₹{totalAmount}</p>
              </div>

              {/* QR Code */}
              <div className="bg-white rounded-2xl p-4 text-center mb-4">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">
                  Scan with any UPI app
                </p>
                <img
                  src={buildQrUrl(totalAmount)}
                  alt="UPI QR Code"
                  className="w-44 h-44 mx-auto rounded-xl"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <p className="text-gray-400 text-xs mt-2">GPay · PhonePe · Paytm · BHIM · Any UPI app</p>

                {/* UPI ID */}
                <div className="mt-3 py-2 px-4 rounded-xl flex items-center justify-between gap-2"
                  style={{ background: '#f6f0e8', border: '1px solid #e0cdb8' }}>
                  <div className="text-left">
                    <p className="text-gray-400 text-[10px] uppercase tracking-wider">UPI ID</p>
                    <p className="text-gray-800 font-black text-sm">{CAFE_UPI_ID}</p>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(CAFE_UPI_ID); toast.success('UPI ID copied!'); }}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                    style={{ background: '#940901', color: 'white' }}>
                    Copy
                  </button>
                </div>
              </div>

              {/* Open UPI App button */}
              <a href={buildUpiLink(totalAmount)}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-black text-sm text-white mb-4 transition-all active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg,#4CAF50,#2e7d32)', textDecoration: 'none' }}>
                📱 Open UPI App to Pay
              </a>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.2)' }} />
                <p className="text-white/50 text-xs font-semibold">After paying, enter transaction ID below</p>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.2)' }} />
              </div>

              {/* UTR / Transaction ID form */}
              <form onSubmit={handlePaymentSubmit} className="space-y-3 pb-4">
                <div>
                  <label className="block font-bold text-sm mb-1 text-gray-100">
                    UTR / Transaction ID *
                  </label>
                  <input
                    type="text"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value.replace(/\s/g, ''))}
                    placeholder="e.g. 425012345678"
                    className="input-base"
                    maxLength={30}
                    inputMode="text"
                  />
                  <p className="text-white/55 text-xs mt-1">
                    Find UTR in your UPI app under payment history
                  </p>
                </div>

                {utrError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm font-medium">
                    ⚠️ {utrError}
                  </div>
                )}

                <button type="submit" disabled={submitLoading}
                  className="w-full py-3.5 rounded-2xl font-black text-sm text-white tracking-widest uppercase disabled:opacity-40 transition-all active:scale-[0.98]"
                  style={{ background: '#940901' }}>
                  {submitLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spin inline-block" />
                      Submitting…
                    </span>
                  ) : "I've Paid — Place Order"}
                </button>

                <p className="text-center text-white/40 text-xs">
                  Your order will be confirmed after payment verification
                </p>
              </form>
            </div>
          )}

          {/* ══ STEP 3: SUCCESS ═════════════════════════════════════ */}
          {step === 'success' && (
            <div className="px-6 py-8 text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl pop-in"
                style={{ background: status.bg }}>
                {status.icon}
              </div>

              <h2 className="font-black text-2xl mb-2" style={{ color: status.color }}>{status.label}</h2>
              <p className="text-gray-200 text-sm leading-relaxed mb-4">{status.desc}</p>

              {/* Order type badge */}
              <div className="mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest"
                  style={{
                    background: savedOrderType === 'takeaway' ? 'rgba(148,9,1,0.15)' : 'rgba(49,96,61,0.15)',
                    color:      savedOrderType === 'takeaway' ? '#940901' : '#31603D',
                    border:     `1px solid ${savedOrderType === 'takeaway' ? '#940901' : '#31603D'}`,
                  }}>
                  {savedOrderType === 'takeaway' ? '🛍️ Takeaway' : '🍽️ Dine In'}
                </span>
              </div>

              {/* Pickup token */}
              {savedOrderType === 'takeaway' && pickupToken && (
                <div className="mb-4 py-4 px-6 rounded-2xl"
                  style={{ background: 'linear-gradient(135deg,#940901,#c41a0a)', boxShadow: '0 8px 24px rgba(148,9,1,0.4)' }}>
                  <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">Your Pickup Token</p>
                  <p className="text-white font-black text-4xl tracking-widest">{pickupToken}</p>
                  <p className="text-white/60 text-xs mt-1">Show this at the counter</p>
                </div>
              )}

              {/* Payment verification notice */}
              {savedOrderType === 'takeaway' && (
                <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl text-left"
                  style={{
                    background: paymentStatus === 'paid'
                      ? 'rgba(49,96,61,0.2)' : 'rgba(255,193,7,0.15)',
                    border: `1px solid ${paymentStatus === 'paid' ? '#31603D' : '#ffc107'}`,
                  }}>
                  <span className="text-lg">{paymentStatus === 'paid' ? '✅' : '⏳'}</span>
                  <div>
                    <p className="text-white text-xs font-black">
                      {paymentStatus === 'paid' ? 'Payment Verified!' : 'Payment Verification Pending'}
                    </p>
                    <p className="text-white/60 text-[10px]">
                      {paymentStatus === 'paid'
                        ? 'Your payment has been confirmed by the café.'
                        : 'Admin is verifying your UPI payment. Kitchen will start once confirmed.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Order detail card */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100 text-left mb-4 shadow-sm">
                <p className="text-[10px] font-black text-black uppercase tracking-widest mb-3">Order Summary</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name</span>
                    <span className="font-bold text-black">{name}</span>
                  </div>
                  {savedOrderType === 'dine-in' && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Table</span>
                      <span className="font-bold text-black">{table}</span>
                    </div>
                  )}
                  {savedOrderType === 'takeaway' && phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Phone</span>
                      <span className="font-bold text-black">+91 {phone}</span>
                    </div>
                  )}
                  {savedOrderType === 'takeaway' && utr && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">UTR</span>
                      <span className="font-bold text-black text-xs">{utr}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-100 pt-1.5 mt-1.5 flex justify-between">
                    <span className="text-gray-500">Total</span>
                    <span className="font-black" style={{ color: '#31603D' }}>₹{savedTotal}</span>
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  {statusSteps.map((s, idx) => (
                    <React.Fragment key={s}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500"
                        style={{
                          background: idx <= currentIdx ? '#940901' : '#f3f4f6',
                          color:      idx <= currentIdx ? 'white' : '#9ca3af',
                          transform:  idx === currentIdx ? 'scale(1.15)' : 'scale(1)',
                          boxShadow:  idx === currentIdx ? '0 0 0 4px #94080161' : 'none',
                        }}>
                        {idx < currentIdx ? '✓' : idx + 1}
                      </div>
                      {idx < statusSteps.length - 1 && (
                        <div className="flex-1 h-1 mx-1 rounded-full" style={{ background: idx < currentIdx ? '#940901' : '#f3f4f6' }} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <div className="flex justify-between px-0.5">
                  {['Received', 'Accepted', 'Cooking', savedOrderType === 'takeaway' ? 'Pickup' : 'Ready'].map((l, i) => (
                    <span key={l} className="text-[9px] font-bold"
                      style={{ color: i <= currentIdx ? '#940901' : '#838587' }}>{l}</span>
                  ))}
                </div>
              </div>

              {!['ready', 'completed'].includes(orderStatus) && (
                <p className="text-gray-100 text-xs mb-4 flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block"
                    style={{ animation: 'pulse 1.4s ease-in-out infinite' }} />
                  Updating every 3 seconds
                </p>
              )}

              <button onClick={handleClose}
                className="btn-primary w-full py-3.5 rounded-2xl text-sm tracking-widest uppercase"
                style={{ background: '#940801a8' }}>
                Back to Menu
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default OrderModal;
