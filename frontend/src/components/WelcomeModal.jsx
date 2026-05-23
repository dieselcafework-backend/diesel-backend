import React, { useEffect, useState } from 'react';

const SESSION_KEY = 'diesel_welcome_shown';

const WelcomeModal = ({ tableNo }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show only once per browser session
    if (!sessionStorage.getItem(SESSION_KEY)) {
      const t = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(t);
    }
  }, []);

  const handleClose = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-5 fade-in"
      style={{ background: '#4f520b53', backdropFilter: 'blur(6px)' }}
      onClick={handleClose}
    >
      {/* Card */}
      <div
        className="pop-in w-full max-w-sm rounded-3xl overflow-hidden shadow-gold-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'linear-gradient(160deg, #fdf8e8 0%, #f4eaa8 60%, #e8d87a 100%)' }}
      >
        {/* Top decorative strip */}
        <div className="h-2 w-full" style={{ background: 'linear-gradient(90deg, #982829, #d6993c, #64690c)' }} />

        {/* Hero area */}
        <div className="relative px-7 pt-8 pb-2 text-center">
          {/* Coffee cup icon */}
          <div
            className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center shadow-gold"
            style={{ background: '#940901' }}
          >
            <svg viewBox="0 0 24 24" className="w-10 h-10" style={{ fill: '#ffeb5e' }}>
              <path d="M18.5 3H6c-1.1 0-2 .9-2 2v5.71c0 3.83 2.95 7.18 6.78 7.29 3.96.12 7.22-3.06 7.22-7v-1h.5c1.93 0 3.5-1.57 3.5-3.5S20.43 3 18.5 3zM16 5v3H6V5h10zm2.5 3H18V5h.5c.83 0 1.5.67 1.5 1.5S19.33 8 18.5 8zM4 19h16v2H4z"/>
            </svg>
          </div>

          {/* Title */}
          <h1
            className="text-2xl font-bold mb-1 leading-tight"
            style={{ fontFamily: '"Poppins", serif', color: '#64690c' }}
          >
            Welcome to<br />
            <span style={{ color: '#982829' }}>Velvet Vault Cafe</span>
          </h1>

          {/* Subtitle */}
          <p
            className="text-sm font-medium mt-2 mb-1"
            style={{ fontFamily: 'Poppins, sans-serif', color: '#3b3e01' }}
          >
            Experience premium taste &amp; comfort
          </p>

          {/* Tagline */}
          <p
            className="text-xs font-light italic mb-5"
            style={{ color: '#6b6b4a' }}
          >
            "Where every sip tells a story"
          </p>

          {/* Table info */}
          {tableNo && (
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 text-xs font-semibold"
              style={{ background: 'rgba(50, 88, 98, 0.12)', color: '#325862', border: '1px solid rgba(50,88,98,0.2)' }}
            >
              <span>📍</span> {tableNo}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="mx-7 mb-5" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(214,153,60,0.4), transparent)' }} />

        {/* CTA */}
        <div className="px-7 pb-7">
          <button
            onClick={handleClose}
            className="btn-gold w-full py-3.5 rounded-2xl text-sm tracking-widest uppercase"
            style={{ fontFamily: 'Poppins, sans-serif', letterSpacing: '0.15em', background: '#940901' }}
          >
            ✨ Start Ordering
          </button>

          <p className="text-center mt-3 text-[10px]" style={{ color: '#8a844a', fontFamily: 'Poppins, sans-serif' }}>
            Tap anywhere outside to close
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
