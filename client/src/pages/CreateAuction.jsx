// src/pages/CreateAuction.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, AlertCircle, Loader } from 'lucide-react';
import api from '../utils/api';

export default function CreateAuction() {
  const nav = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const [form, setForm] = useState({
    title: '', description: '', image_url: '', category_id: '7',
    starting_price: '', reserve_price: '',
    ends_at: '',
  });

  useEffect(() => {
    api.get('/auctions/categories').then(r => setCategories(r.data || []));

    // Default end time: 24 hours from now
    const d = new Date(Date.now() + 86_400_000);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);
    setForm(f => ({ ...f, ends_at: local }));
  }, []);

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const payload = {
        ...form,
        ends_at: new Date(form.ends_at).toISOString().slice(0, 19).replace('T', ' '),
      };
      const { data } = await api.post('/auctions', payload);
      nav(`/auctions/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create auction.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl mb-1">List an Item</h1>
        <p className="text-muted">Create a new auction with reserve price protection.</p>
      </div>

      <form onSubmit={submit} className="card flex flex-col gap-5">
        {error && (
          <div className="flex items-center gap-2 bg-crimson/10 border border-crimson/30 rounded-lg px-3 py-2.5 text-crimson text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="text-xs text-muted mb-1.5 block">Title *</label>
          <input name="title" value={form.title} onChange={handle}
            className="input" placeholder="1967 Fender Stratocaster…" required maxLength={200} />
        </div>

        {/* Category */}
        <div>
          <label className="text-xs text-muted mb-1.5 block">Category</label>
          <select name="category_id" value={form.category_id} onChange={handle} className="input">
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-muted mb-1.5 block">Description</label>
          <textarea name="description" value={form.description} onChange={handle}
            className="input h-24 resize-none" placeholder="Describe your item in detail…" />
        </div>

        {/* Image URL */}
        <div>
          <label className="text-xs text-muted mb-1.5 block">Image URL</label>
          <input name="image_url" value={form.image_url} onChange={handle}
            className="input" placeholder="https://example.com/image.jpg" />
        </div>

        {/* Prices */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted mb-1.5 block">Starting Price *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-mono">$</span>
              <input name="starting_price" type="number" step="0.01" min="0.01"
                value={form.starting_price} onChange={handle}
                className="input pl-7 font-mono" placeholder="10.00" required />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted mb-1.5 block">Reserve Price *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-mono">$</span>
              <input name="reserve_price" type="number" step="0.01" min="0.01"
                value={form.reserve_price} onChange={handle}
                className="input pl-7 font-mono" placeholder="100.00" required />
            </div>
            <p className="text-xs text-muted mt-1">Item sells only if bid ≥ reserve.</p>
          </div>
        </div>

        {/* End time */}
        <div>
          <label className="text-xs text-muted mb-1.5 block">Auction Ends At *</label>
          <input name="ends_at" type="datetime-local"
            value={form.ends_at} onChange={handle}
            min={new Date().toISOString().slice(0, 16)}
            className="input" required />
        </div>

        <button type="submit" disabled={loading}
          className="btn-primary flex items-center justify-center gap-2">
          {loading ? <Loader className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
          {loading ? 'Creating…' : 'List Auction'}
        </button>
      </form>
    </div>
  );
}
