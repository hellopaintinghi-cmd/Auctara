// src/components/ReputationMeter.jsx
import { ShieldCheck, ShieldAlert, ShieldX, TrendingUp, TrendingDown } from 'lucide-react';

const TIERS = [
  { min: 80,  label: 'Trusted',    color: '#2ed573', glow: 'rgba(46,213,115,0.3)',  Icon: ShieldCheck },
  { min: 40,  label: 'Caution',    color: '#d4a843', glow: 'rgba(212,168,67,0.3)',  Icon: ShieldAlert },
  { min: 1,   label: 'Risky',      color: '#e03355', glow: 'rgba(224,51,85,0.3)',   Icon: ShieldX     },
  { min: 0,   label: 'Locked',     color: '#6b6b8a', glow: 'rgba(107,107,138,0.2)', Icon: ShieldX     },
];

function getTier(rep) {
  return TIERS.find(t => rep >= t.min) ?? TIERS[TIERS.length - 1];
}

export default function ReputationMeter({ reputation = 100, history = [] }) {
  const pct   = Math.min(100, Math.max(0, reputation));
  const tier  = getTier(reputation);
  const { Icon } = tier;

  // stroke-dasharray / dashoffset for SVG arc
  const R   = 54;
  const arc = Math.PI * R;  // half-circle circumference
  const offset = arc - (pct / 100) * arc;

  const recentDelta = history.length >= 2
    ? history[0].balance - history[1].balance
    : 0;

  return (
    <div className="card flex flex-col items-center gap-4 py-6">
      {/* SVG gauge */}
      <div className="relative w-40 h-20 overflow-hidden">
        <svg viewBox="0 0 120 60" className="w-full">
          {/* Track */}
          <path
            d="M 10 55 A 50 50 0 0 1 110 55"
            fill="none" stroke="#2a2a3d" strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Fill */}
          <path
            d="M 10 55 A 50 50 0 0 1 110 55"
            fill="none"
            stroke={tier.color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={arc}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease',
              filter: `drop-shadow(0 0 6px ${tier.glow})`,
            }}
          />
          {/* Score text */}
          <text x="60" y="52" textAnchor="middle"
            fill={tier.color} fontSize="18" fontWeight="700"
            fontFamily="JetBrains Mono, monospace">
            {reputation}
          </text>
        </svg>
      </div>

      {/* Tier badge */}
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5" style={{ color: tier.color }} />
        <span className="font-display font-semibold text-lg" style={{ color: tier.color }}>
          {tier.label}
        </span>
        {recentDelta !== 0 && (
          <span className={`flex items-center text-xs font-mono ${recentDelta > 0 ? 'text-jade' : 'text-crimson'}`}>
            {recentDelta > 0
              ? <TrendingUp  className="w-3 h-3 mr-0.5" />
              : <TrendingDown className="w-3 h-3 mr-0.5" />}
            {recentDelta > 0 ? '+' : ''}{recentDelta}
          </span>
        )}
      </div>

      {/* Progress bar scale */}
      <div className="w-full">
        <div className="flex justify-between text-xs text-muted mb-1">
          <span>0</span><span>50</span><span>100</span>
        </div>
        <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: tier.color, boxShadow: `0 0 8px ${tier.glow}` }}
          />
        </div>
      </div>

      {/* Tier legend */}
      <div className="flex gap-3 text-xs text-muted flex-wrap justify-center">
        {TIERS.slice(0, 3).map(t => (
          <span key={t.label} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: t.color }} />
            {t.label} ({t.min}+)
          </span>
        ))}
      </div>
    </div>
  );
}
