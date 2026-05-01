// src/pages/Register.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Gavel, Eye, EyeOff, AlertCircle } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'buyer',  label: 'Buyer',        desc: 'Browse and bid on auctions.' },
  { value: 'seller', label: 'Seller',        desc: 'List items for auction.' },
  { value: 'both',   label: 'Buyer & Seller', desc: 'Full access to everything.' },
];

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm]       = useState({ username: '', email: '', password: '', role: 'buyer' });
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    setError(''); setLoading(true);
    try {
      await register(form);
      nav('/auctions');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gold/10 rounded-xl mb-4">
            <Gavel className="w-6 h-6 text-gold" />
          </div>
          <h1 className="font-display font-bold text-2xl">Create account</h1>
          <p className="text-muted text-sm mt-1">Join Auctara — starts at 100 reputation</p>
        </div>

        <form onSubmit={submit} className="card flex flex-col gap-4">
          {error && (
            <div className="flex items-center gap-2 bg-crimson/10 border border-crimson/30 rounded-lg px-3 py-2.5 text-crimson text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="text-xs text-muted mb-1.5 block">Username</label>
            <input name="username" value={form.username} onChange={handle}
              className="input" placeholder="auction_pro" required maxLength={50} />
          </div>

          <div>
            <label className="text-xs text-muted mb-1.5 block">Email</label>
            <input name="email" type="email" value={form.email} onChange={handle}
              className="input" placeholder="you@example.com" required />
          </div>

          <div>
            <label className="text-xs text-muted mb-1.5 block">Password</label>
            <div className="relative">
              <input name="password" type={showPw ? 'text' : 'password'} value={form.password}
                onChange={handle} className="input pr-10" placeholder="Min 8 characters" required />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Role selector */}
          <div>
            <label className="text-xs text-muted mb-2 block">I want to…</label>
            <div className="flex flex-col gap-2">
              {ROLE_OPTIONS.map(opt => (
                <label key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                    ${form.role === opt.value ? 'border-gold bg-gold/5' : 'border-border hover:border-border/80'}`}>
                  <input type="radio" name="role" value={opt.value} checked={form.role === opt.value}
                    onChange={handle} className="mt-0.5 accent-yellow-400" />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
            {loading ? 'Creating account…' : 'Create Account'}
          </button>

          <p className="text-center text-sm text-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-gold hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
