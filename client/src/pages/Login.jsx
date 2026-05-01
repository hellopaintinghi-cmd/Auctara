// src/pages/Login.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Gavel, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login }   = useAuth();
  const nav         = useNavigate();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.email, form.password);
      nav('/auctions');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gold/10 rounded-xl mb-4">
            <Gavel className="w-6 h-6 text-gold" />
          </div>
          <h1 className="font-display font-bold text-2xl">Welcome back</h1>
          <p className="text-muted text-sm mt-1">Sign in to Auctara</p>
        </div>

        <form onSubmit={submit} className="card flex flex-col gap-4">
          {error && (
            <div className="flex items-center gap-2 bg-crimson/10 border border-crimson/30 rounded-lg px-3 py-2.5 text-crimson text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="text-xs text-muted mb-1.5 block">Email</label>
            <input name="email" type="email" value={form.email} onChange={handle}
              className="input" placeholder="you@example.com" required />
          </div>

          <div>
            <label className="text-xs text-muted mb-1.5 block">Password</label>
            <div className="relative">
              <input name="password" type={showPw ? 'text' : 'password'} value={form.password}
                onChange={handle} className="input pr-10" placeholder="••••••••" required />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <p className="text-center text-sm text-muted">
            No account?{' '}
            <Link to="/register" className="text-gold hover:underline">Create one</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
