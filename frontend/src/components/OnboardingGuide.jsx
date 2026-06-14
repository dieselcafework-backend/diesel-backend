/**
 * OnboardingGuide.jsx
 *
 * Interactive step-by-step guide that waits for the user to
 * actually perform each action before moving to the next step.
 *
 * Steps:
 *  1. Welcome screen — tap "Start"
 *  2. Highlights a menu item — waits for user to tap ADD
 *  3. Highlights the View Cart bar — waits for user to tap it
 *  4. Highlights Place Order button — waits for user to tap it
 *  5. Done — auto-dismisses
 *
 * Only shows ONCE per device (localStorage: velvet_onboarding_done).
 *
 * HOW TO USE IN CustomerMenu.jsx:
 *  1. import OnboardingGuide from '../components/OnboardingGuide';
 *  2. Add <OnboardingGuide /> just before the last </div> in your return.
 *  3. No other changes needed.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY = 'velvet_onboarding_done';

// ── Small tooltip/bubble that points to a highlighted element ─────────────────
const Bubble = ({ emoji, title, desc, style }) => (
  <div
    style={{
      position: 'fixed',
      zIndex: 10001,
      background: 'white',
      borderRadius: 20,
      padding: '16px 18px',
      maxWidth: 280,
      boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
      border: '2px solid #940901',
      fontFamily: 'Poppins, sans-serif',
      ...style,
    }}
  >
    <div style={{ fontSize: 32, marginBottom: 8, textAlign: 'center' }}>{emoji}</div>
    <p style={{ fontSize: 15, fontWeight: 800, color: '#0f1a1e', margin: '0 0 6px', textAlign: 'center' }}>{title}</p>
    <p style={{ fontSize: 13, color: '#374151', margin: 0, textAlign: 'center', lineHeight: 1.55 }}>{desc}</p>
    {/* Arrow pointing down */}
    <div style={{
      position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)',
      width: 0, height: 0,
      borderLeft: '10px solid transparent',
      borderRight: '10px solid transparent',
      borderTop: '10px solid #940901',
    }} />
  </div>
);

// ── Pulsing ring drawn around a DOM element ───────────────────────────────────
const Spotlight = ({ rect }) => {
  if (!rect) return null;
  const PAD = 10;
  return (
    <div style={{
      position: 'fixed',
      top:    rect.top    - PAD,
      left:   rect.left   - PAD,
      width:  rect.width  + PAD * 2,
      height: rect.height + PAD * 2,
      borderRadius: 16,
      border: '3px solid #940901',
      boxShadow: '0 0 0 4px rgba(148,9,1,0.25), 0 0 0 9999px rgba(0,0,0,0.60)',
      zIndex: 10000,
      pointerEvents: 'none',
      animation: 'guide-pulse 1.4s ease-in-out infinite',
    }} />
  );
};

// ── Welcome screen (step 0) ───────────────────────────────────────────────────
const WelcomeScreen = ({ onStart, onSkip }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 10002,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'flex-end',
    fontFamily: 'Poppins, sans-serif',
  }}>
    <div style={{
      width: '100%', maxWidth: 480,
      background: 'white',
      borderRadius: '24px 24px 0 0',
      padding: '28px 24px 40px',
    }}>
      {/* Handle */}
      <div style={{ width: 40, height: 4, background: '#e5e7eb', borderRadius: 2, margin: '0 auto 24px' }} />

      <div style={{ fontSize: 72, textAlign: 'center', marginBottom: 16 }}>👋</div>

      <h2 style={{ fontSize: 26, fontWeight: 900, color: '#0f1a1e', textAlign: 'center', margin: '0 0 12px' }}>
        Welcome!
      </h2>
      <p style={{ fontSize: 16, color: '#374151', textAlign: 'center', lineHeight: 1.6, margin: '0 0 8px' }}>
        Let me show you how to order food.<br />
        <strong>I'll guide you one step at a time.</strong>
      </p>
      <p style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', margin: '0 0 28px' }}>
        Takes less than a minute!
      </p>

      <button
        onClick={onStart}
        style={{
          width: '100%', padding: '16px',
          background: 'linear-gradient(135deg, #940901, #7c1d1d)',
          color: 'white', border: 'none', borderRadius: 14,
          fontSize: 18, fontWeight: 800, cursor: 'pointer',
          fontFamily: 'Poppins, sans-serif',
        }}
      >
        Show me how! 👉
      </button>

      <button
        onClick={onSkip}
        style={{
          width: '100%', marginTop: 12, padding: '10px',
          background: 'transparent', border: 'none',
          fontSize: 14, color: '#9ca3af', cursor: 'pointer',
          fontFamily: 'Poppins, sans-serif',
        }}
      >
        I know how, skip
      </button>
    </div>
  </div>
);

// ── Done screen (last step) ───────────────────────────────────────────────────
const DoneScreen = ({ onDismiss }) => {
  useEffect(() => {
    const t = setTimeout(onDismiss, 2200);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10002,
      background: 'rgba(0,0,0,0.70)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Poppins, sans-serif',
    }}>
      <div style={{
        background: 'white', borderRadius: 24, padding: '36px 28px',
        textAlign: 'center', maxWidth: 300, width: '90%',
        animation: 'guide-pop 0.4s ease',
      }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🎉</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0f1a1e', margin: '0 0 8px' }}>You're all set!</h2>
        <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Enjoy your meal!</p>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const OnboardingGuide = () => {
  const [phase, setPhase]     = useState('idle'); // idle | welcome | step1 | step2 | step3 | done
  const [rect,  setRect]      = useState(null);
  const [bubblePos, setBubblePos] = useState({});
  const observerRef           = useRef(null);
  const rafRef                = useRef(null);

  // Show only for first-time visitors
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setPhase('welcome'), 700);
      return () => clearTimeout(t);
    }
  }, []);

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1');
    setPhase('idle');
    setRect(null);
  }, []);

  const showDone = useCallback(() => {
    setRect(null);
    setPhase('done');
  }, []);

  // ── Helpers to find elements and compute bubble position ─────────────────
  const getRect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  };

  const bubbleAbove = (r) => ({
    top: Math.max(8, r.top - 160),
    left: Math.max(8, Math.min(r.left + r.width / 2 - 140, window.innerWidth - 296)),
  });

  const bubbleBelow = (r) => ({
    top: r.top + r.height + 18,
    left: Math.max(8, Math.min(r.left + r.width / 2 - 140, window.innerWidth - 296)),
  });

  // ── STEP 1: highlight first ADD button, watch for cart change ────────────
  const startStep1 = useCallback(() => {
    setPhase('step1');

    const attach = () => {
      // Find first visible ADD button (text = ADD)
      const btns = [...document.querySelectorAll('button')].filter(
        (b) => b.textContent.trim() === 'ADD' && b.offsetParent !== null
      );
      if (!btns.length) { rafRef.current = requestAnimationFrame(attach); return; }

      const btn = btns[0];
      const r = getRect(btn);
      setRect(r);
      setBubblePos(bubbleAbove(r));

      // Watch for the button to disappear (means item was added → stepper appeared)
      observerRef.current = new MutationObserver(() => {
        const stillThere = document.body.contains(btn) && btn.offsetParent !== null && btn.textContent.trim() === 'ADD';
        if (!stillThere) {
          observerRef.current?.disconnect();
          startStep2();
        }
      });
      observerRef.current.observe(document.body, { childList: true, subtree: true, attributes: true });
    };

    rafRef.current = requestAnimationFrame(attach);
  }, []); // eslint-disable-line

  // ── STEP 2: highlight the View Cart bar at bottom ─────────────────────────
  const startStep2 = useCallback(() => {
    setPhase('step2');

    const attach = () => {
      // The floating cart bar: button containing "View Cart"
      const btn = [...document.querySelectorAll('button')].find(
        (b) => b.textContent.includes('View Cart')
      );
      if (!btn) { rafRef.current = requestAnimationFrame(attach); return; }

      const r = getRect(btn);
      setRect(r);
      setBubblePos(bubbleAbove(r));

      // Wait for cart drawer to open (Cart component renders fixed overlay)
      const onCartOpen = () => {
        const cartHeader = document.querySelector('.slide-in');
        if (cartHeader) {
          document.removeEventListener('click', onCartOpen, true);
          startStep3();
        }
      };
      btn.addEventListener('click', () => {
        setTimeout(() => {
          document.removeEventListener('click', onCartOpen, true);
          startStep3();
        }, 350);
      }, { once: true });
    };

    rafRef.current = requestAnimationFrame(attach);
  }, []); // eslint-disable-line

  // ── STEP 3: highlight Place Order button inside cart ──────────────────────
  const startStep3 = useCallback(() => {
    setPhase('step3');

    const attach = () => {
      // "Place Order →" button in the Cart footer
      const btn = [...document.querySelectorAll('button')].find(
        (b) => b.textContent.includes('Place Order')
      );
      if (!btn) { rafRef.current = requestAnimationFrame(attach); return; }

      const r = getRect(btn);
      setRect(r);
      setBubblePos(bubbleAbove(r));

      btn.addEventListener('click', () => {
        setTimeout(showDone, 400);
      }, { once: true });
    };

    rafRef.current = requestAnimationFrame(attach);
  }, [showDone]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  if (phase === 'idle') return null;

  if (phase === 'welcome') {
    return (
      <>
        <style>{`
          @keyframes guide-pulse {
            0%,100% { box-shadow: 0 0 0 4px rgba(148,9,1,0.3), 0 0 0 9999px rgba(0,0,0,0.60); }
            50%      { box-shadow: 0 0 0 10px rgba(148,9,1,0.08), 0 0 0 9999px rgba(0,0,0,0.60); }
          }
          @keyframes guide-pop {
            0%  { transform: scale(0.8); opacity: 0; }
            70% { transform: scale(1.05); }
            100%{ transform: scale(1); opacity: 1; }
          }
        `}</style>
        <WelcomeScreen onStart={startStep1} onSkip={finish} />
      </>
    );
  }

  if (phase === 'done') {
    return (
      <>
        <style>{`@keyframes guide-pop{0%{transform:scale(0.8);opacity:0}70%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}`}</style>
        <DoneScreen onDismiss={finish} />
      </>
    );
  }

  // Steps 1–3: spotlight + bubble
  const stepContent = {
    step1: {
      emoji: '👆',
      title: 'Tap ADD on any item',
      desc:  'See something you like? Tap the ADD button to put it in your cart.',
    },
    step2: {
      emoji: '🛒',
      title: 'Tap View Cart',
      desc:  'Your items are in the cart! Tap the green bar at the bottom to review them.',
    },
    step3: {
      emoji: '✅',
      title: 'Tap Place Order',
      desc:  'Check your items and tap "Place Order" — your food goes straight to the kitchen!',
    },
  };

  const content = stepContent[phase];

  return (
    <>
      <style>{`
        @keyframes guide-pulse {
          0%,100% { box-shadow: 0 0 0 4px rgba(148,9,1,0.3), 0 0 0 9999px rgba(0,0,0,0.60); }
          50%      { box-shadow: 0 0 0 10px rgba(148,9,1,0.08), 0 0 0 9999px rgba(0,0,0,0.60); }
        }
      `}</style>

      {/* Dark overlay with hole cut out via Spotlight */}
      <Spotlight rect={rect} />

      {/* Bubble */}
      {rect && content && (
        <Bubble
          emoji={content.emoji}
          title={content.title}
          desc={content.desc}
          style={bubblePos}
        />
      )}

      {/* Skip link — always visible */}
      <button
        onClick={finish}
        style={{
          position: 'fixed', top: 14, right: 16, zIndex: 10002,
          background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,0.3)',
          color: 'white', borderRadius: 20,
          padding: '6px 14px', fontSize: 13,
          fontFamily: 'Poppins, sans-serif',
          cursor: 'pointer',
        }}
      >
        Skip ✕
      </button>
    </>
  );
};

export default OnboardingGuide;
