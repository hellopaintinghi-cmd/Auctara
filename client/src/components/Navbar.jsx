// src/components/Navbar.jsx
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Gavel, User, LogOut, PlusCircle, LayoutDashboard, ShieldAlert } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const handleLogout = () => { logout(); nav('/'); };

  const repColor =
    !user       ? 'text-muted' :
    user.reputation >= 80 ? 'text-jade' :
    user.reputation >= 40 ? 'text-gold' : 'text-crimson';

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-obsidian/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="p-1.5 bg-gold/10 rounded-lg group-hover:bg-gold/20 transition-colors">
            <Gavel className="w-5 h-5 text-gold" />
          </span>
          <span className="font-display font-bold text-xl tracking-tight">
            Auc<span className="text-gold">tara</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link to="/auctions" className="px-3 py-2 rounded-lg text-muted hover:text-text hover:bg-panel transition-colors text-sm">
            Browse Auctions
          </Link>
          {user && (
            <Link to="/auctions/new" className="px-3 py-2 rounded-lg text-muted hover:text-text hover:bg-panel transition-colors text-sm flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4" /> List Item
            </Link>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* Reputation badge */}
              <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-panel border border-border text-sm font-mono ${repColor}`}>
                <ShieldAlert className="w-3.5 h-3.5" />
                {user.reputation ?? '—'}
              </div>

              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-panel transition-colors text-sm text-muted hover:text-text"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>

              <Link
                to="/profile"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-panel transition-colors text-sm text-muted hover:text-text"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">{user.username}</span>
              </Link>

              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-panel hover:text-crimson text-muted transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link to="/login"    className="btn-outline text-sm py-2 px-4">Log In</Link>
              <Link to="/register" className="btn-primary text-sm py-2 px-4">Sign Up</Link>
            </>
          )}
        </div>

      </div>
    </header>
  );
}
