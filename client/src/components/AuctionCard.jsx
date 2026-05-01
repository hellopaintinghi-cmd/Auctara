// src/components/AuctionCard.jsx
import { Link } from 'react-router-dom';
import { Clock, Gavel, TrendingUp } from 'lucide-react';
import { useCountdown } from '../hooks/useCountdown';

export default function AuctionCard({ auction }) {
  const cd = useCountdown(auction?.ends_at);
  const currentBid = Number(auction?.current_bid ?? 0);
  const bidCount   = Number(auction?.bid_count   ?? 0);

  const timeStr = !auction?.ends_at || cd.expired
    ? 'Ended'
    : cd.days > 0
      ? `${cd.days}d ${cd.hours}h`
      : `${String(cd.hours).padStart(2,'0')}:${String(cd.minutes).padStart(2,'0')}:${String(cd.seconds).padStart(2,'0')}`;

  return (
    <Link
      to={`/auctions/${auction.id}`}
      className="group block card hover:border-gold/50 hover:shadow-glow transition-all duration-300 animate-fade-in"
    >
      {/* Image */}
      <div className="relative -mx-5 -mt-5 mb-4 h-44 overflow-hidden rounded-t-xl bg-surface">
        {auction.image_url ? (
          <img
            src={auction.image_url}
            alt={auction.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gavel className="w-12 h-12 text-border" />
          </div>
        )}

        {/* Category badge */}
        <span className="absolute top-3 left-3 text-xs bg-obsidian/80 backdrop-blur-sm border border-border px-2 py-1 rounded-full text-muted">
          {auction.category_name}
        </span>

        {/* Timer badge */}
        <span className={`absolute top-3 right-3 flex items-center gap-1 text-xs px-2 py-1 rounded-full font-mono backdrop-blur-sm
          ${cd.urgent ? 'bg-crimson/90 text-white animate-pulse' : 'bg-obsidian/80 border border-border text-muted'}`}>
          <Clock className="w-3 h-3" />
          {timeStr}
        </span>
      </div>

      {/* Content */}
      <h3 className="font-display font-semibold text-base mb-1 line-clamp-1 group-hover:text-gold transition-colors">
        {auction.title}
      </h3>
      <p className="text-xs text-muted mb-3">by {auction.seller_name}</p>

      {/* Bid info */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-muted">Current bid</p>
          <p className="font-mono font-semibold text-lg text-gold">
            ${currentBid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted flex items-center gap-1 justify-end">
            <TrendingUp className="w-3 h-3" /> {bidCount} bids
          </p>
        </div>
      </div>
    </Link>
  );
}
