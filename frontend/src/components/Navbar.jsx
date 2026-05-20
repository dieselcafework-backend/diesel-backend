import React, { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import api from '../api/axios';


const Navbar = ({ onCartClick }) => {
  const { totalItems, totalAmount } = useCart();
  const [logoUrl, setLogoUrl] = useState(localStorage.getItem('diesel_logo_url') || '');

  // Fetch logo from DB on mount (customers see the DB-stored logo, not local upload)
  useEffect(() => {
    api.get('/auth/logo')
      .then((res) => {
        if (res.data.logoUrl) {
          setLogoUrl(res.data.logoUrl);
          localStorage.setItem('diesel_logo_url', res.data.logoUrl);
        }
      })
      .catch(() => { }); // fail silently — use cached logo
  }, []);

  return (
    <nav
      className="sticky top-0 z-40 shadow-brand"
      style={{ background: 'linear-gradient(135deg, #a61106 0%, #91140b 60%, #7e150d 100%)' }}
    >
      <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* ── Brand ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Logo circle — view only for customers */}
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 flex items-center justify-center flex-shrink-0"
            style={{ borderColor: 'rgba(214,153,60,0.5)', background: 'rgba(214,153,60,0.15)' }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Diesel Café" className="w-full h-full object-cover" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5" style={{ fill: '#d6993c' }}>
                <path d="M18.5 3H6c-1.1 0-2 .9-2 2v5.71c0 3.83 2.95 7.18 6.78 7.29 3.96.12 7.22-3.06 7.22-7v-1h.5c1.93 0 3.5-1.57 3.5-3.5S20.43 3 18.5 3zM16 5v3H6V5h10zm2.5 3H18V5h.5c.83 0 1.5.67 1.5 1.5S19.33 8 18.5 8zM4 19h16v2H4z" />
              </svg>
            )}
          </div>

          {/* Brand text */}
          <div className="leading-tight">
            <p
              className="font-black tracking-widest uppercase text-sm"
              style={{ fontFamily: '"Playfair Display", serif', color: '#ede8d0', letterSpacing: '0.18em' }}
            >
              Demo
            </p>
            <p
              className="font-light text-[10px] uppercase tracking-[0.5em] -mt-0.5"
              style={{ color: '#ede8d0' }}
            >
              Café
            </p>
          </div>
        </div>



        {/* ── Center label ───────────────────────────────────── */}
        <span
          className="font-extrabold text-xb tracking-[0.75em] uppercase"
          style={{ fontFamily: 'Poppins, sans-serif', color: '#ede8d0' }}
        >
          MENU
        </span>

        {/* ── Cart button ────────────────────────────────────── */}
        <button
          onClick={onCartClick}
          className="relative flex items-center gap-2 px-3 py-2 rounded-full border transition-all duration-200 active:scale-95 flex-shrink-0"
          style={{
            background: 'rgba(214,153,60,0.15)',
            borderColor: 'rgba(214, 152, 60, 0.84)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(214,153,60,0.28)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(214,153,60,0.15)'; }}
          aria-label="Open cart"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" style={{ fill: '#d6993c' }}>
            <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.1 17 7 17h11v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21 5H5.21l-.67-3H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
          {totalItems > 0 && (
            <>
              <span className="text-white text-xs font-bold hidden sm:inline" style={{ fontFamily: 'Poppins, sans-serif' }}>
                ₹{totalAmount}
              </span>
              <span className="cart-badge">{totalItems > 99 ? '99+' : totalItems}</span>
            </>
          )}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
