// src/pages/AuctionList.jsx
import { useState, useEffect, useCallback } from 'react';
import { Search, SlidersHorizontal, Loader } from 'lucide-react';
import api from '../utils/api';
import AuctionCard from '../components/AuctionCard';

export default function AuctionList() {
  const [auctions, setAuctions]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [filters, setFilters]       = useState({ search: '', category: '', page: 1 });

  const fetchAuctions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 12, ...filters });
      const { data } = await api.get(`/auctions?${params}`);
      setAuctions(data.auctions || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchAuctions(); }, [fetchAuctions]);

  useEffect(() => {
    api.get('/auctions/categories').then(r => setCategories(r.data || []));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters(f => ({ ...f, page: 1 }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl mb-1">Live Auctions</h1>
        <p className="text-muted">{total.toLocaleString()} items active right now</p>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-3 mb-8">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="search"
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
            placeholder="Search auctions…"
            className="input pl-9"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <SlidersHorizontal className="w-4 h-4 text-muted" />
          <select
            value={filters.category}
            onChange={e => setFilters(f => ({ ...f, category: e.target.value, page: 1 }))}
            className="input w-auto"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn-primary shrink-0">Search</button>
      </form>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader className="w-8 h-8 text-gold animate-spin" />
        </div>
      ) : auctions.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <p className="text-lg">No auctions found.</p>
          <p className="text-sm mt-1">Try adjusting your filters.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {auctions.map(a => <AuctionCard key={a.id} auction={a} />)}
          </div>

          {/* Pagination */}
          {total > 12 && (
            <div className="flex justify-center gap-2 mt-10">
              <button
                disabled={filters.page <= 1}
                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                className="btn-outline py-2 px-4 disabled:opacity-30"
              >← Prev</button>
              <span className="flex items-center px-4 text-sm text-muted font-mono">
                {filters.page} / {Math.ceil(total / 12)}
              </span>
              <button
                disabled={filters.page >= Math.ceil(total / 12)}
                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                className="btn-outline py-2 px-4 disabled:opacity-30"
              >Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
