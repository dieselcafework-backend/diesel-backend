/**
 * ItemDetailSheet.jsx
 *
 * Bottom sheet that slides up when a customer taps a menu card.
 * Shows: full image, veg/non-veg badge, name, full description,
 * half/full selector, quantity stepper, and Add to Cart button.
 *
 * Used by MenuCard.jsx — no other changes needed.
 */

import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';

const FALLBACK = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&auto=format&fit=crop';

const ItemDetailSheet = ({ item, onClose }) => {
  const { items, addItem, increaseQty, decreaseQty } = useCart();
  const [imgErr, setImgErr]   = useState(false);
  const [mounted, setMounted] = useState(false);

  const hasHalf     = item.halfPrice != null && item.halfPrice !== '';
  const hasFull     = item.fullPrice != null && item.fullPrice !== '';
  const hasVariants = hasHalf || hasFull;

  const [selectedSize, setSelectedSize] = useState(hasFull ? 'full' : hasHalf ? 'half' : '');

  const cartKey  = hasVariants ? `${item._id}_${selectedSize}` : String(item._id);
  const price    = hasVariants
    ? (selectedSize === 'half' ? item.halfPrice : item.fullPrice)
    : item.price;
  const desc     = hasVariants
    ? (selectedSize === 'half'
        ? (item.halfDescription || item.description || '')
        : (item.fullDescription  || item.description || ''))
    : (item.description || '');

  const cartItem = items.find((i) => i.cartKey === cartKey);
  const qty      = cartItem?.quantity || 0;

  // Slide-in animation
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setMounted(false);
    setTimeout(onClose, 300);
  };

  const handleAdd = () => {
    addItem({ ...item, cartKey, price, selectedSize: hasVariants ? selectedSize : '' });
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'flex-end',
        fontFamily: 'Poppins, sans-serif',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(2px)',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          margin: '0 auto',
          background: 'var(--card-bg, white)',
          borderRadius: '24px 24px 0 0',
          maxHeight: '90vh',
          overflowY: 'auto',
          transform: mounted ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.32s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
        }}
      >
        {/* Drag handle */}
        <div style={{
          width: 40, height: 4,
          background: 'rgba(0,0,0,0.15)',
          borderRadius: 2,
          margin: '12px auto 0',
        }} />

        {/* Full image */}
        <div style={{ position: 'relative', width: '100%', height: 220, overflow: 'hidden', marginTop: 8 }}>
          <img
            src={imgErr ? FALLBACK : (item.image || FALLBACK)}
            alt={item.name}
            onError={() => setImgErr(true)}
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
          {/* Gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(15,26,30,0.5) 0%, transparent 55%)',
          }} />

          {/* Veg / Non-veg badge */}
          <div style={{
            position: 'absolute', top: 12, left: 12,
            background: 'white',
            borderRadius: 6, padding: '3px 4px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center',
          }}>
            {item.veg ? (
              <div style={{
                width: 14, height: 14,
                border: '2px solid #16a34a',
                borderRadius: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a' }} />
              </div>
            ) : (
              <div style={{
                width: 14, height: 14,
                border: '2px solid #dc2626',
                borderRadius: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#dc2626' }} />
              </div>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            style={{
              position: 'absolute', top: 12, right: 12,
              width: 32, height: 32,
              background: 'rgba(0,0,0,0.45)',
              border: 'none', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: 'white' }}>
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 20px 0' }}>

          {/* Name + price row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
            <h2 style={{
              fontSize: 20, fontWeight: 800,
              color: 'var(--text-body, #0f1a1e)',
              margin: 0, lineHeight: 1.3, flex: 1,
            }}>
              {item.name}
            </h2>
            <span style={{
              fontSize: 20, fontWeight: 900,
              color: 'var(--text-price, #940901)',
              flexShrink: 0,
            }}>
              ₹{price}
            </span>
          </div>

          {/* Category pill */}
          <div style={{ marginBottom: 12 }}>
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: 'var(--admin, #325862)',
              background: 'rgba(50,88,98,0.08)',
              borderRadius: 20, padding: '3px 10px',
              border: '1px solid rgba(50,88,98,0.15)',
            }}>
              {item.subCategory}
            </span>
          </div>

          {/* Description */}
          {desc ? (
            <p style={{
              fontSize: 14, color: 'var(--text-desc, #6b7280)',
              lineHeight: 1.65, margin: '0 0 20px',
            }}>
              {desc}
            </p>
          ) : (
            <div style={{ marginBottom: 20 }} />
          )}

          {/* Half / Full selector */}
          {hasVariants && (
            <div style={{ marginBottom: 20 }}>
              <p style={{
                fontSize: 12, fontWeight: 700,
                color: 'var(--text-body, #0f1a1e)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                margin: '0 0 10px',
              }}>
                Choose Size
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                {hasHalf && (
                  <button
                    onClick={() => setSelectedSize('half')}
                    style={{
                      flex: 1, padding: '12px 8px',
                      borderRadius: 12,
                      border: selectedSize === 'half'
                        ? '2px solid #940901'
                        : '2px solid rgba(148,9,1,0.2)',
                      background: selectedSize === 'half'
                        ? 'rgba(148,9,1,0.06)'
                        : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <p style={{
                      fontSize: 13, fontWeight: 800,
                      color: '#940901', margin: '0 0 2px',
                    }}>
                      Half Plate
                    </p>
                    <p style={{
                      fontSize: 15, fontWeight: 900,
                      color: 'var(--text-price, #940901)', margin: 0,
                    }}>
                      ₹{item.halfPrice}
                    </p>
                    {item.halfDescription && (
                      <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0' }}>
                        {item.halfDescription}
                      </p>
                    )}
                  </button>
                )}
                {hasFull && (
                  <button
                    onClick={() => setSelectedSize('full')}
                    style={{
                      flex: 1, padding: '12px 8px',
                      borderRadius: 12,
                      border: selectedSize === 'full'
                        ? '2px solid #325862'
                        : '2px solid rgba(50,88,98,0.2)',
                      background: selectedSize === 'full'
                        ? 'rgba(50,88,98,0.06)'
                        : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <p style={{
                      fontSize: 13, fontWeight: 800,
                      color: '#325862', margin: '0 0 2px',
                    }}>
                      Full Plate
                    </p>
                    <p style={{
                      fontSize: 15, fontWeight: 900,
                      color: 'var(--text-price, #940901)', margin: 0,
                    }}>
                      ₹{item.fullPrice}
                    </p>
                    {item.fullDescription && (
                      <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0' }}>
                        {item.fullDescription}
                      </p>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sticky bottom — quantity + add to cart */}
        <div style={{
          position: 'sticky', bottom: 0,
          background: 'var(--card-bg, white)',
          borderTop: '1px solid rgba(214,153,60,0.15)',
          padding: '14px 20px 28px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          {/* Quantity stepper */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 0,
            background: 'var(--primary-deep, #325862)',
            borderRadius: 50, padding: '4px',
            flexShrink: 0,
          }}>
            <button
              onClick={() => qty > 0 ? decreaseQty(cartKey) : null}
              style={{
                width: 36, height: 36,
                background: qty > 0 ? 'white' : 'rgba(255,255,255,0.3)',
                border: 'none', borderRadius: '50%',
                fontSize: 20, fontWeight: 900,
                color: 'var(--admin, #325862)',
                cursor: qty > 0 ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              −
            </button>
            <span style={{
              color: 'white', fontWeight: 900, fontSize: 16,
              minWidth: 28, textAlign: 'center',
            }}>
              {qty}
            </span>
            <button
              onClick={() => qty > 0 ? increaseQty(cartKey) : handleAdd()}
              style={{
                width: 36, height: 36,
                background: 'white',
                border: 'none', borderRadius: '50%',
                fontSize: 20, fontWeight: 900,
                color: 'var(--admin, #325862)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              +
            </button>
          </div>

          {/* Add to cart button */}
          <button
            onClick={() => { handleAdd(); handleClose(); }}
            style={{
              flex: 1, padding: '14px',
              background: qty > 0
                ? 'linear-gradient(135deg, #15803d, #166534)'
                : 'linear-gradient(135deg, var(--primary-deep, #325862), #1e4a55)',
              color: 'white', border: 'none', borderRadius: 14,
              fontSize: 15, fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'Poppins, sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.2s',
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'white' }}>
              <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.1 17 7 17h11v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21 5H5.21l-.67-3H1z" />
            </svg>
            {qty > 0 ? `Add 1 More  ·  ₹${price}` : `Add to Cart  ·  ₹${price}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailSheet;
