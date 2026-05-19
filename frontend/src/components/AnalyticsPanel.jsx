/**
 * components/AnalyticsPanel.jsx
 *
 * Full analytics dashboard using Recharts (already installed).
 * Fetches from /api/analytics/* using the existing `api` axios instance.
 * Fully dark-mode compatible via useTheme().
 * Colors match existing CSS variables: --teal (#325862), --gold (#d6993c), --red (#982829).
 *
 * Sections:
 *  1. Period selector tabs (Weekly / Monthly / Yearly)
 *  2. Overview stat cards
 *  3. Revenue chart (AreaChart)
 *  4. Orders chart (BarChart)
 *  5. Top-selling items (horizontal BarChart)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    AreaChart, Area,
    BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell,
} from 'recharts';
import api from '../api/axios';
import { useTheme } from '../context/ThemeContext';

// ── Theme-aware color palettes ────────────────────────────────────────────────
const getColors = (isDark) => ({
    teal: isDark ? '#3d6b78' : '#325862',
    tealLight: isDark ? '#4a8a9b' : '#3d6b78',
    gold: isDark ? '#e8b86d' : '#d6993c',
    goldLight: isDark ? '#f0cc8a' : '#e8b86d',
    red: isDark ? '#c44b4b' : '#982829',
    grid: isDark ? '#2e4250' : '#e2d9c0',
    axis: isDark ? '#6b7a85' : '#8a7a6a',
    cardBg: isDark ? '#1e2d38' : '#ffffff',
    cardBorder: isDark ? '#2e4250' : '#e8d5b7',
    tooltipBg: isDark ? '#1a2d38' : '#fdfaf5',
    tooltipText: isDark ? '#f0ead6' : '#1a1a1a',
    tooltipBorder: isDark ? '#3d6b78' : '#d6993c',
    muted: isDark ? '#8a9aaa' : '#6b6b4a',
    text: isDark ? '#f0ead6' : '#1a1a1a',
    statBg: isDark ? 'rgba(30,45,56,0.9)' : '#fdfaf5',
});

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, isDark, type }) => {
    if (!active || !payload?.length) return null;
    const C = getColors(isDark);
    return (
        <div style={{
            background: C.tooltipBg,
            border: `1.5px solid ${C.tooltipBorder}`,
            borderRadius: 10,
            padding: '10px 14px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            fontFamily: 'Poppins, sans-serif',
        }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5, letterSpacing: '0.04em' }}>
                {label}
            </p>
            {payload.map((entry, i) => (
                <p key={i} style={{ fontSize: 13, fontWeight: 800, color: entry.color }}>
                    {entry.name === 'revenue' ? `₹${entry.value.toLocaleString('en-IN')}` : `${entry.value} orders`}
                </p>
            ))}
        </div>
    );
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color, isDark }) => {
    const C = getColors(isDark);
    return (
        <div style={{
            background: C.cardBg,
            border: `1px solid ${C.cardBorder}`,
            borderRadius: 14,
            padding: '16px 18px',
            boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(50,88,98,0.08)',
        }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                {label}
            </p>
            <p style={{ fontSize: 22, fontWeight: 900, color: color || C.text, lineHeight: 1 }}>
                {value}
            </p>
            {sub && (
                <p style={{ fontSize: 10, fontWeight: 600, color: C.muted, marginTop: 5 }}>{sub}</p>
            )}
        </div>
    );
};

// ── Skeleton loader ────────────────────────────────────────────────────────────
const Skeleton = ({ h = 200, isDark }) => (
    <div style={{
        height: h,
        borderRadius: 14,
        background: isDark ? 'rgba(46,66,80,0.6)' : 'rgba(214,153,60,0.08)',
        animation: 'pulse 1.5s ease infinite',
    }} />
);

// ── Main Component ─────────────────────────────────────────────────────────────
const AnalyticsPanel = () => {
    const { isDark } = useTheme();
    const C = getColors(isDark);

    const [period, setPeriod] = useState('monthly');  // weekly | monthly | yearly
    const [overview, setOverview] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [topItems, setTopItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // ── Fetch all data ──────────────────────────────────────────────────────────
    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [overviewRes, chartRes, topRes] = await Promise.all([
                api.get('/analytics/overview'),
                api.get(`/analytics/${period}`),
                api.get('/analytics/top-items'),
            ]);
            setOverview(overviewRes.data);
            setChartData(chartRes.data);
            setTopItems(topRes.data);
        } catch (err) {
            setError('Failed to load analytics. Please try again.');
            console.error('[AnalyticsPanel]', err.message);
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ── Format helpers ──────────────────────────────────────────────────────────
    const fmtINR = v => `₹${Number(v).toLocaleString('en-IN')}`;

    // ── Period tabs ─────────────────────────────────────────────────────────────
    const PERIODS = [
        { key: 'weekly', label: 'This Week' },
        { key: 'monthly', label: 'This Year' },
        { key: 'yearly', label: 'All Years' },
    ];

    return (
        <div className='p-4' style={{ fontFamily: 'Poppins, sans-serif' }}>

            {/* ── Period tabs ──────────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
                {PERIODS.map(p => (
                    <button
                        key={p.key}
                        onClick={() => setPeriod(p.key)}
                        style={{
                            padding: '7px 16px',
                            borderRadius: 30,
                            fontSize: 12,
                            fontWeight: 700,
                            fontFamily: 'Poppins, sans-serif',
                            cursor: 'pointer',
                            border: 'none',
                            transition: 'all 0.2s',
                            background: period === p.key
                                ? (isDark ? C.teal : '#325862')
                                : (isDark ? 'rgba(46,66,80,0.7)' : 'rgba(214,153,60,0.1)'),
                            color: period === p.key ? '#fff' : C.muted,
                            boxShadow: period === p.key ? '0 3px 12px rgba(50,88,98,0.3)' : 'none',
                        }}
                    >
                        {p.label}
                    </button>
                ))}
                <button
                    onClick={fetchAll}
                    disabled={loading}
                    style={{
                        marginLeft: 'auto', padding: '7px 14px', borderRadius: 30,
                        fontSize: 12, fontWeight: 700, fontFamily: 'Poppins, sans-serif',
                        cursor: 'pointer',
                        background: isDark ? 'rgba(46,66,80,0.7)' : 'rgba(214,153,60,0.1)',
                        border: `1px solid ${C.cardBorder}`,
                        color: C.muted,
                    }}
                >
                    {loading ? '⟳' : '↻ Refresh'}
                </button>
            </div>

            {error && (
                <div style={{
                    padding: '12px 16px', borderRadius: 10, marginBottom: 16,
                    background: isDark ? 'rgba(185,28,28,0.15)' : '#fef2f2',
                    border: '1px solid rgba(185,28,28,0.3)',
                    color: '#dc2626', fontSize: 13, fontWeight: 600,
                }}>
                    {error}
                </div>
            )}

            {/* ── Overview stat cards ───────────────────────────────────────────────── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 160px), 1fr))',
                gap: 10, marginBottom: 22,
            }}>
                {loading || !overview ? (
                    Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h={84} isDark={isDark} />)
                ) : (
                    <>
                        <StatCard isDark={isDark} label="Lifetime Revenue" color={C.gold}
                            value={fmtINR(overview.lifetime.totalRevenue)}
                            sub={`${overview.lifetime.totalOrders} total orders`} />
                        <StatCard isDark={isDark} label="Avg Order Value" color={C.tealLight}
                            value={fmtINR(overview.lifetime.avgOrderValue)} />
                        <StatCard isDark={isDark} label="This Month" color={C.teal}
                            value={fmtINR(overview.thisMonth.revenue)}
                            sub={`${overview.thisMonth.orders} orders`} />
                        <StatCard isDark={isDark} label="Today" color={C.red}
                            value={fmtINR(overview.today.revenue)}
                            sub={`${overview.today.orders} orders`} />
                    </>
                )}
            </div>

            {/* ── Revenue Area Chart ───────────────────────────────────────────────── */}
            <div style={{
                background: C.cardBg, border: `1px solid ${C.cardBorder}`,
                borderRadius: 16, padding: '20px 16px 10px',
                marginBottom: 16,
                boxShadow: isDark ? '0 2px 16px rgba(0,0,0,0.3)' : '0 2px 16px rgba(50,88,98,0.07)',
            }}>
                <p style={{
                    fontSize: 12, fontWeight: 800, color: C.text, marginBottom: 16,
                    letterSpacing: '0.05em', textTransform: 'uppercase'
                }}>
                    Revenue Trend
                </p>
                {loading || !chartData.length ? <Skeleton h={180} isDark={isDark} /> : (
                    <ResponsiveContainer width="100%" height={190}>
                        <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                            <defs>
                                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={C.teal} stopOpacity={0.35} />
                                    <stop offset="95%" stopColor={C.teal} stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.axis, fontFamily: 'Poppins', fontWeight: 600 }}
                                axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: C.axis, fontFamily: 'Poppins', fontWeight: 600 }}
                                axisLine={false} tickLine={false}
                                tickFormatter={v => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
                                width={44} />
                            <Tooltip content={<CustomTooltip isDark={isDark} />} cursor={{ stroke: C.gold, strokeWidth: 1.5, strokeDasharray: '4 3' }} />
                            <Area type="monotone" dataKey="revenue" name="revenue"
                                stroke={C.teal} strokeWidth={2.5}
                                fill="url(#revenueGrad)" dot={{ fill: C.teal, r: 3.5, strokeWidth: 0 }}
                                activeDot={{ r: 5.5, fill: C.gold, strokeWidth: 0 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* ── Orders Bar Chart ─────────────────────────────────────────────────── */}
            <div style={{
                background: C.cardBg, border: `1px solid ${C.cardBorder}`,
                borderRadius: 16, padding: '20px 16px 10px',
                marginBottom: 16,
                boxShadow: isDark ? '0 2px 16px rgba(0,0,0,0.3)' : '0 2px 16px rgba(50,88,98,0.07)',
            }}>
                <p style={{
                    fontSize: 12, fontWeight: 800, color: C.text, marginBottom: 16,
                    letterSpacing: '0.05em', textTransform: 'uppercase'
                }}>
                    Orders Count
                </p>
                {loading || !chartData.length ? <Skeleton h={160} isDark={isDark} /> : (
                    <ResponsiveContainer width="100%" height={170}>
                        <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }} barCategoryGap="35%">
                            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.axis, fontFamily: 'Poppins', fontWeight: 600 }}
                                axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: C.axis, fontFamily: 'Poppins', fontWeight: 600 }}
                                axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip isDark={isDark} />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(50,88,98,0.06)' }} />
                            <Bar dataKey="orders" name="orders" radius={[5, 5, 0, 0]} maxBarSize={40}>
                                {chartData.map((_, i) => (
                                    <Cell key={i} fill={i === chartData.length - 1 ? C.gold : C.tealLight} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* ── Top Items Horizontal Bar Chart ───────────────────────────────────── */}
            <div style={{
                background: C.cardBg, border: `1px solid ${C.cardBorder}`,
                borderRadius: 16, padding: '20px 20px 16px',
                boxShadow: isDark ? '0 2px 16px rgba(0,0,0,0.3)' : '0 2px 16px rgba(50,88,98,0.07)',
            }}>
                <p style={{
                    fontSize: 12, fontWeight: 800, color: C.text, marginBottom: 16,
                    letterSpacing: '0.05em', textTransform: 'uppercase'
                }}>
                    🏆 Best Selling Items
                </p>
                {loading || !topItems.length ? <Skeleton h={220} isDark={isDark} /> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {topItems.map((item, i) => {
                            const maxQty = topItems[0]?.totalQty || 1;
                            const pct = Math.round((item.totalQty / maxQty) * 100);
                            const medals = ['🥇', '🥈', '🥉'];
                            return (
                                <div key={item.name}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontSize: 14 }}>{medals[i] || `#${i + 1}`}</span>
                                            {item.name}
                                        </span>
                                        <span style={{ fontSize: 11, fontWeight: 800, color: C.muted, textAlign: 'right' }}>
                                            {item.totalQty} sold · {fmtINR(item.revenue)}
                                        </span>
                                    </div>
                                    <div style={{ height: 7, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(50,88,98,0.08)', borderRadius: 10, overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${pct}%`,
                                            borderRadius: 10,
                                            background: i === 0
                                                ? `linear-gradient(90deg, ${C.gold}, ${C.goldLight})`
                                                : `linear-gradient(90deg, ${C.teal}, ${C.tealLight})`,
                                            transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)',
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnalyticsPanel;