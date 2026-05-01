// src/components/FraudAlert.jsx
import { AlertTriangle, ShieldX, Zap, TrendingUp, Clock, Bot } from 'lucide-react';

const FRAUD_META = {
  rapid_bidding:     { label: 'Rapid Bidding Detected',     Icon: Zap,           color: 'text-gold',    bg: 'bg-gold/10 border-gold/30' },
  suspicious_amount: { label: 'Suspicious Bid Amount',      Icon: TrendingUp,    color: 'text-gold',    bg: 'bg-gold/10 border-gold/30' },
  shill_bidding:     { label: 'Shill Bidding — Critical',   Icon: ShieldX,       color: 'text-crimson', bg: 'bg-crimson/10 border-crimson/30' },
  bid_shielding:     { label: 'Bid Shielding Blocked',      Icon: Clock,         color: 'text-crimson', bg: 'bg-crimson/10 border-crimson/30' },
  bot_detected:      { label: 'Bot Activity Detected',      Icon: Bot,           color: 'text-crimson', bg: 'bg-crimson/10 border-crimson/30' },
};

export default function FraudAlert({ fraudResults = [], onDismiss }) {
  if (!fraudResults.length) return null;

  return (
    <div className="flex flex-col gap-2 animate-slide-up">
      {fraudResults.map((f, i) => {
        const meta = FRAUD_META[f.type] ?? { label: f.type, Icon: AlertTriangle, color: 'text-gold', bg: 'bg-gold/10 border-gold/30' };
        const { Icon } = meta;
        return (
          <div key={i} className={`flex items-start gap-3 border rounded-lg p-3 ${meta.bg}`}>
            <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${meta.color}`} />
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${meta.color}`}>{meta.label}</p>
              <p className="text-xs text-muted mt-0.5">
                Reputation: <span className="font-mono text-crimson">−{Math.abs(f.penalty)}</span>
                {' '}→ <span className="font-mono">{f.newReputation}</span>
                {f.locked && <span className="ml-2 text-crimson font-semibold">⚠ Account Locked</span>}
              </p>
            </div>
            {onDismiss && (
              <button onClick={() => onDismiss(i)} className="text-muted hover:text-text text-xs">✕</button>
            )}
          </div>
        );
      })}
    </div>
  );
}
