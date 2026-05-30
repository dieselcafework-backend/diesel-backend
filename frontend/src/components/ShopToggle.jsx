/**
 * components/ShopToggle.jsx
 *
 * Admin-only toggle — opens or closes the café with one tap.
 * Drop this anywhere inside AdminDashboard.jsx (it lives in the header).
 *
 * How it works:
 *  1. On mount → GET /shop-status → shows current state
 *  2. On click → PATCH /shop-status { isOpen: !current }
 *  3. Cache in backend is busted instantly so customers see it within seconds
 *
 * Styling: matches existing AdminDashboard teal/gold palette, Tailwind classes,
 * react-hot-toast for feedback — no new dependencies needed.
 */

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { cafeConfig } from '../config/cafeConfig';

const ShopToggle = () => {
  const [isOpen,   setIsOpen]   = useState(true);
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(true); // hide until we know the real state

  // ── Fetch current status on mount ─────────────────────────────────────────
  useEffect(() => {
    api.get('/shop-status')
      .then(res => setIsOpen(res.data.isOpen))
      .catch(() => { /* non-critical — default stays true (open) */ })
      .finally(() => setFetching(false));
  }, []);

  // ── Toggle ─────────────────────────────────────────────────────────────────
  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.patch('/shop-status', { isOpen: !isOpen });
      setIsOpen(res.data.isOpen);
      toast.success(res.data.message, { icon: res.data.isOpen ? '✅' : '🔒' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update shop status.');
    } finally {
      setLoading(false);
    }
  };

  // Don't flash the wrong state while loading initial status
  if (fetching) return null;

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      title={isOpen ? 'Shop is open — click to close' : 'Shop is closed — click to open'}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all
                 disabled:opacity-60 active:scale-[0.97] focus:outline-none"
      style={{
        background:   isOpen
          ? 'linear-gradient(135deg, rgba(5,150,105,0.15), rgba(5,150,105,0.08))'
          : 'linear-gradient(135deg, rgba(185,28,28,0.18), rgba(185,28,28,0.10))',
        borderColor:  isOpen ? 'rgba(5,150,105,0.4)' : 'rgba(185,28,28,0.4)',
        color:        isOpen ? '#059669'              : '#dc2626',
      }}
    >
      {/* Animated live dot */}
      <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
        {isOpen && !loading && (
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
            style={{ background: '#059669' }}
          />
        )}
        <span
          className="relative inline-flex rounded-full h-2.5 w-2.5 transition-colors duration-300"
          style={{ background: isOpen ? '#059669' : '#dc2626' }}
        />
      </span>

      {/* Label */}
      <span className="text-xs font-black tracking-wide whitespace-nowrap">
        {loading ? 'UPDATING…' : isOpen ? `${cafeConfig.type} OPEN` : `${cafeConfig.type} CLOSED`}
      </span>
    </button>
  );
};

export default ShopToggle;
