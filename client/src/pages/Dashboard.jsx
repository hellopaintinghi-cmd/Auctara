// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Gavel, TrendingUp, ShieldAlert, Clock, Award,
  AlertTriangle, Loader, ExternalLink
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import ReputationMeter from '../components/ReputationMeter';

const FRAUD_LABELS = {
  rapid_bidding:     'Rapid Bidding',
  suspicious_amount: 'Suspicious Amount',
  shill_bidding:     'Shill Bidding',
  bid_shielding:     'Bid Shielding',
  bot_detected:      'Bot Activity',
};

export default function Dashboard() {
  const { user }          = useAuth();
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]     = useState('bids'); // bids | auctions | fraud

  useEffect(() => {
    api.get('/auth/profile')
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader className="w-8 h-8 text-gold animate-spin" />
    </div>
  );
  if (!data) return null;

  const stats        = data?.stats        ?? {};
  const repHistory   = data?.repHistory   ?? [];
  const fraudHistory = data?.fraudHistory ?? [];
  const myAuctions   = data?.myAuctions   ?? [];
  const myBids       = data?.myBids       ?? [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="font-display font-bold text-3xl mb-6">My Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column — profile + meter */}
        <div className="flex flex-col gap-4">
          {/* Profile card */}
          <div className="card text-center">
            <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="font-display font-bold text-2xl text-gold">
                {stats?.username?.[0]?.toUpperCase() ?? '?'}
              </span>
            </div>
            <h2 className="font-display font-bold text-xl">{stats?.username}</h2>
            <p className="text-muted text-sm capitalize">{user?.role}</p>
            {stats?.is_locked ? (
              <span className="mt-2 inline-block badge-fraud">Account Locked</span>
            ) : (
              <span className="mt-2 inline-block badge-ok">Active</span>
            )}
          </div>

          {/* Reputation meter */}
          <ReputationMeter reputation={stats?.reputation ?? 100} history={repHistory ?? []} />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Auctions',  value: stats?.auctions_created ?? 0, Icon: Gavel },
              { label: 'Bids',      value: stats?.total_bids       ?? 0, Icon: TrendingUp },
              { label: 'Wins',      value: stats?.auctions_won     ?? 0, Icon: Award },
            ].map(({ label, value, Icon }) => (
              <div key={label} className="card text-center py-4">
                <Icon className="w-4 h-4 text-gold mx-auto mb-1" />
                <p className="font-mono font-bold text-lg">{value}</p>
                <p className="text-xs text-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right column — tabs */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Tab bar */}
          <div className="flex border-b border-border">
            {[
              { id: 'bids',     label: 'My Bids',     Icon: TrendingUp  },
              { id: 'auctions', label: 'My Auctions',  Icon: Gavel       },
              { id: 'fraud',    label: 'Fraud Log',    Icon: ShieldAlert },
            ].map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm border-b-2 transition-colors
                  ${tab === id ? 'border-gold text-gold' : 'border-transparent text-muted hover:text-text'}`}>
                <Icon className="w-3.5 h-3.5" />
                {label}
                {id === 'fraud' && fraudHistory?.length > 0 && (
                  <span className="ml-1 w-4 h-4 bg-crimson rounded-full text-white text-xs flex items-center justify-center">
                    {fraudHistory.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Bids tab */}
          {tab === 'bids' && (
            <div className="flex flex-col gap-2">
              {myBids?.length === 0 && <p className="text-muted py-8 text-center">No bids placed yet.</p>}
              {myBids?.map(b => (
                <div key={b.id} className="card flex items-center gap-3 py-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0
                    ${b.is_winning ? 'bg-jade' : 'bg-muted'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{b.title}</p>
                    <p className="text-xs text-muted">{new Date(b.placed_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono font-semibold text-gold">${Number(b.amount).toFixed(2)}</p>
                    <p className={`text-xs ${b.is_winning ? 'text-jade' : 'text-muted'}`}>
                      {b.is_winning ? 'Winning' : 'Outbid'}
                    </p>
                  </div>
                  <Link to={`/auctions/${b.auction_id}`} className="text-muted hover:text-text">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Auctions tab */}
          {tab === 'auctions' && (
            <div className="flex flex-col gap-2">
              {myAuctions?.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted mb-3">No auctions listed yet.</p>
                  <Link to="/auctions/new" className="btn-primary inline-flex">List an Item</Link>
                </div>
              )}
              {myAuctions?.map(a => (
                <div key={a.id} className="card flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.title}</p>
                    <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {a.status === 'ended' ? 'Ended' : `Ends ${new Date(a.ends_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono font-semibold text-gold">${Number(a.current_bid).toFixed(2)}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${a.status === 'active' ? 'text-jade' : 'text-muted'}`}>
                      {a.status}
                    </span>
                  </div>
                  <Link to={`/auctions/${a.id}`} className="text-muted hover:text-text">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Fraud log tab */}
          {tab === 'fraud' && (
            <div className="flex flex-col gap-2">
              {fraudHistory?.length === 0 && (
                <div className="text-center py-8">
                  <ShieldAlert className="w-10 h-10 text-jade mx-auto mb-2" />
                  <p className="text-jade font-medium">Clean record — no fraud events detected.</p>
                </div>
              )}
              {fraudHistory?.map((f, i) => (
                <div key={i} className="card border-crimson/20 flex items-start gap-3 py-3">
                  <AlertTriangle className="w-4 h-4 text-crimson flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-crimson">
                      {FRAUD_LABELS[f.fraud_type] ?? f.fraud_type}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      Severity: <span className="capitalize">{f.severity}</span>
                      {' '}· Reputation: <span className="text-crimson font-mono">−{f.rep_deducted}</span>
                    </p>
                    <p className="text-xs text-muted">{new Date(f.detected_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reputation history */}
          <div className="card">
            <h3 className="font-semibold text-sm mb-3">Reputation History</h3>
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
              {repHistory?.length === 0 && <p className="text-muted text-sm">No history.</p>}
              {repHistory?.map((r, i) => (
                <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-border last:border-0">
                  <span className="text-muted">{r.reason}</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono ${r.delta >= 0 ? 'text-jade' : 'text-crimson'}`}>
                      {r.delta >= 0 ? '+' : ''}{r.delta}
                    </span>
                    <span className="font-mono text-muted">→ {r.balance}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
