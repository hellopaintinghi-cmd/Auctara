// src/pages/AuctionDetail.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Clock, Gavel, TrendingUp, ShieldCheck, ShieldX,
  AlertTriangle, CheckCircle, Loader, Undo2
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useAuctionSocket } from '../hooks/useSocket';
import { useCountdown } from '../hooks/useCountdown';
import FraudAlert from '../components/FraudAlert';

export default function AuctionDetail() {
  const { id }    = useParams();
  const { user }  = useAuth();

  const [auction, setAuction]     = useState(null);
  const [bids, setBids]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [placing, setPlacing]     = useState(false);
  const [message, setMessage]     = useState(null);   // { type: 'ok'|'err', text }
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const bidListRef = useRef(null);

  // Fetch initial data
  useEffect(() => {
    setLoading(true);
    api.get(`/auctions/${id}`)
      .then(r => { setAuction(r.data.auction); setBids(r.data.bids || []); })
      .finally(() => setLoading(false));
  }, [id]);

  // Real-time updates
  useAuctionSocket(id, {
    onBidUpdate: ({ newBid, bidder, fraudWarnings }) => {
      setAuction(a => a ? { ...a, current_bid: newBid } : a);
      setBids(prev => [{ amount: newBid, bidder, placed_at: new Date().toISOString() }, ...prev]);
      if (fraudWarnings?.length) setFraudAlerts(fw => [...fraudWarnings, ...fw]);
      // Scroll bid list to top
      bidListRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onBidWithdrawn: ({ newBid }) => {
      setAuction(a => a ? { ...a, current_bid: newBid ?? a.starting_price } : a);
    },
    onAuctionEnded: () => {
      setAuction(a => a ? { ...a, status: 'ended' } : a);
    },
  });

  const cd = useCountdown(auction?.ends_at);

  const placeBid = async (e) => {
    e.preventDefault();
    if (!user) return setMessage({ type: 'err', text: 'Please log in to bid.' });
    const amt = parseFloat(bidAmount);
    if (isNaN(amt) || amt < minBid) {
      return setMessage({ type: 'err', text: `Bid must be at least $${minBid.toFixed(2)}.` });
    }
    setPlacing(true); setMessage(null);
    try {
      const { data } = await api.post(`/auctions/${id}/bids`, { amount: amt });
      setBidAmount('');
      setMessage({ type: 'ok', text: `Bid of $${amt.toFixed(2)} placed successfully!` });
      if (data.fraudWarnings?.length) setFraudAlerts(fw => [...data.fraudWarnings, ...fw]);
    } catch (err) {
      setMessage({ type: 'err', text: err.response?.data?.error || 'Bid failed.' });
      if (err.response?.data?.fraud?.length) setFraudAlerts(fw => [...err.response.data.fraud, ...fw]);
    } finally {
      setPlacing(false);
    }
  };

  const withdrawBid = async () => {
    if (!confirm('Withdraw your bid? This may trigger a fraud check in the final 2 minutes.')) return;
    try {
      await api.delete(`/auctions/${id}/bids`);
      setMessage({ type: 'ok', text: 'Bid withdrawn.' });
    } catch (err) {
      setMessage({ type: 'err', text: err.response?.data?.error || 'Withdrawal failed.' });
      if (err.response?.data?.fraud) setFraudAlerts(fw => [err.response.data.fraud, ...fw]);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader className="w-8 h-8 text-gold animate-spin" />
    </div>
  );

  if (!auction) return (
    <div className="text-center py-20 text-muted">Auction not found.</div>
  );

  // Safe to access auction fields from here onwards
  const hasBids  = bids.length > 0;
  const minBid   = hasBids
    ? Number(auction.current_bid) + 0.01
    : Number(auction.starting_price) + 0.01;

  const isEnded   = auction.status === 'ended' || cd.expired;
  const isSeller  = user && Number(user.id) === Number(auction.seller_id);
  const isLocked  = user?.is_locked == 1;   // coerce — DB may return 0/1 or true/false
  const canBid    = !!user && !isSeller && !isEnded && !isLocked;
  const reserveMet = Number(auction.current_bid) >= Number(auction.reserve_price);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* Left — image + details */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          {/* Image */}
          <div className="rounded-xl overflow-hidden bg-panel border border-border h-72 flex items-center justify-center">
            {auction.image_url ? (
              <img src={auction.image_url} alt={auction.title} className="w-full h-full object-cover" />
            ) : (
              <Gavel className="w-16 h-16 text-border" />
            )}
          </div>

          {/* Info */}
          <div className="card">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h1 className="font-display font-bold text-2xl">{auction.title}</h1>
              <span className={`px-2 py-1 rounded-full text-xs font-medium border flex-shrink-0
                ${isEnded ? 'border-border text-muted' : 'border-jade/30 bg-jade/10 text-jade'}`}>
                {isEnded ? 'Ended' : 'Live'}
              </span>
            </div>

            <p className="text-muted text-sm mb-4">
              Listed by <span className="text-text">{auction.seller_name}</span>
              {' '}· {auction.category_name}
            </p>

            {auction.description && (
              <p className="text-muted text-sm leading-relaxed">{auction.description}</p>
            )}
          </div>

          {/* Bid history */}
          <div className="card">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gold" />
              Bid History
            </h3>
            <div ref={bidListRef} className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
              {bids.length === 0 ? (
                <p className="text-muted text-sm">No bids yet. Be the first!</p>
              ) : bids.map((b, i) => (
                <div key={i} className={`flex justify-between items-center py-2 border-b border-border last:border-0
                  ${i === 0 ? 'text-gold' : 'text-muted'}`}>
                  <span className="text-sm font-mono">{b.bidder}</span>
                  <span className="font-mono font-medium">${Number(b.amount).toFixed(2)}</span>
                  <span className="text-xs">{new Date(b.placed_at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — bidding panel */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Current bid */}
          <div className="card text-center">
            <p className="text-muted text-sm mb-1">Current Bid</p>
            <p className="font-display font-bold text-4xl text-gold mb-2">
              ${Number(auction.current_bid).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>

            {/* Reserve status */}
            <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border
              ${reserveMet ? 'border-jade/30 bg-jade/10 text-jade' : 'border-crimson/30 bg-crimson/10 text-crimson'}`}>
              {reserveMet ? <ShieldCheck className="w-3 h-3" /> : <ShieldX className="w-3 h-3" />}
              {reserveMet ? 'Reserve met — item will sell' : 'Reserve not met'}
            </div>
          </div>

          {/* Countdown */}
          <div className={`card text-center ${cd.urgent ? 'border-crimson/50 shadow-glow-red' : ''}`}>
            <p className="text-muted text-xs mb-2 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" /> {isEnded ? 'Auction ended' : 'Time remaining'}
            </p>
            {isEnded ? (
              <p className="font-display font-bold text-xl text-muted">Closed</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {[
                  { v: cd.days,    l: 'Days' },
                  { v: cd.hours,   l: 'Hrs'  },
                  { v: cd.minutes, l: 'Min'  },
                  { v: cd.seconds, l: 'Sec'  },
                ].map(({ v, l }) => (
                  <div key={l} className="bg-surface rounded-lg py-2">
                    <div className={`font-mono font-bold text-2xl ${cd.urgent ? 'text-crimson' : 'text-gold'}`}>
                      {String(v).padStart(2, '0')}
                    </div>
                    <div className="text-xs text-muted">{l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fraud alerts */}
          {fraudAlerts.length > 0 && (
            <FraudAlert fraudResults={fraudAlerts} onDismiss={(i) =>
              setFraudAlerts(a => a.filter((_, idx) => idx !== i))
            } />
          )}

          {/* Messages */}
          {message && (
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm animate-slide-up
              ${message.type === 'ok'
                ? 'bg-jade/10 border border-jade/30 text-jade'
                : 'bg-crimson/10 border border-crimson/30 text-crimson'}`}>
              {message.type === 'ok'
                ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
                : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
              {message.text}
            </div>
          )}

          {/* Bid form */}
          {canBid && (
            <form onSubmit={placeBid} className="card flex flex-col gap-3">
              <label className="text-sm text-muted">Your bid (min ${minBid.toFixed(2)})</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-mono">$</span>
                <input
                  type="number"
                  step="0.01"
                  min={minBid}
                  value={bidAmount}
                  onChange={e => setBidAmount(e.target.value)}
                  className="input pl-7 font-mono"
                  placeholder={minBid.toFixed(2)}
                />
              </div>
              <button type="submit" disabled={placing} className="btn-primary flex items-center justify-center gap-2">
                {placing ? <Loader className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4" />}
                {placing ? 'Placing bid…' : 'Place Bid'}
              </button>
              <button type="button" onClick={withdrawBid}
                className="flex items-center justify-center gap-1.5 text-sm text-muted hover:text-crimson transition-colors">
                <Undo2 className="w-3.5 h-3.5" /> Withdraw my bid
              </button>
            </form>
          )}

          {!user && !isEnded && (
            <div className="card text-center">
              <p className="text-muted text-sm mb-3">Sign in to place a bid</p>
              <Link to="/login" className="btn-primary w-full block">Sign In</Link>
            </div>
          )}

          {isLocked && (
            <div className="card border-crimson/40 text-center">
              <ShieldX className="w-8 h-8 text-crimson mx-auto mb-2" />
              <p className="text-crimson font-semibold text-sm">Account Locked</p>
              <p className="text-muted text-xs mt-1">Bidding disabled due to fraudulent activity.</p>
            </div>
          )}

          {isSeller && !isEnded && (
            <div className="card border-gold/30 bg-gold/5 text-center">
              <p className="text-gold text-sm">You listed this auction — bidding is not allowed on your own items.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
