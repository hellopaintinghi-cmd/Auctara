// src/pages/Home.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Gavel, ShieldCheck, Zap, TrendingUp, ArrowRight } from 'lucide-react';
import api from '../utils/api';
import AuctionCard from '../components/AuctionCard';

export default function Home() {
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    api.get('/auctions?limit=6').then(r => setFeatured(r.data.auctions || []));
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden py-24 px-4">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'linear-gradient(#d4a843 1px, transparent 1px), linear-gradient(90deg, #d4a843 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-obsidian" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/30 rounded-full px-4 py-1.5 mb-6">
            <ShieldCheck className="w-4 h-4 text-gold" />
            <span className="text-gold text-sm font-medium">Fraud Detection</span>
          </div>

          <h1 className="font-display font-bold text-5xl md:text-7xl mb-6 leading-tight">
            Bid with <span className="text-gold">Confidence.</span>
            <br />Win with <span className="text-gold">Integrity.</span>
          </h1>

          <p className="text-muted text-lg md:text-xl max-w-2xl mx-auto mb-10">
            Auctara's real-time fraud engine monitors every bid — detecting shill bidding,
            bot activity, and suspicious patterns so the best offer always wins.
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/auctions" className="btn-primary flex items-center gap-2 text-base px-7 py-3">
              Browse Auctions <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/register" className="btn-outline flex items-center gap-2 text-base px-7 py-3">
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* Feature pills */}
      <section className="max-w-5xl mx-auto px-4 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { Icon: Zap,         title: 'Rapid Bid Detection',   desc: 'Flags >5 bids/minute from a single user.' },
            { Icon: ShieldCheck, title: 'Shill Bid Protection',  desc: 'Shared IP/fingerprint between buyer & seller triggers an instant alert.' },
            { Icon: TrendingUp,  title: 'Reputation System',     desc: 'Every user starts at 100 pts. Fraud deducts 20–50 pts; wins earn +10.' },
          ].map(({ Icon, title, desc }) => (
            <div key={title} className="card hover:border-gold/30 transition-colors">
              <div className="w-9 h-9 bg-gold/10 rounded-lg flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-gold" />
              </div>
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Live auctions */}
      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-bold text-2xl">Live Auctions</h2>
            <Link to="/auctions" className="text-gold text-sm hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map(a => <AuctionCard key={a.id} auction={a} />)}
          </div>
        </section>
      )}

      {featured.length === 0 && (
        <section className="max-w-xl mx-auto px-4 pb-20 text-center">
          <div className="card py-12">
            <Gavel className="w-12 h-12 text-border mx-auto mb-4" />
            <p className="text-muted">No active auctions yet.</p>
            <Link to="/auctions/new" className="btn-primary inline-flex mt-4">List the First Item</Link>
          </div>
        </section>
      )}
    </div>
  );
}
