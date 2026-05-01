// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary   from './components/ErrorBoundary';
import Navbar          from './components/Navbar';
import Home            from './pages/Home';
import Login           from './pages/Login';
import Register        from './pages/Register';
import AuctionList     from './pages/AuctionList';
import AuctionDetail   from './pages/AuctionDetail';
import CreateAuction   from './pages/CreateAuction';
import Dashboard       from './pages/Dashboard';

function PrivateRoute({ children, requireRole }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (requireRole && user.role !== 'both' && user.role !== requireRole) {
    return <Navigate to="/auctions" replace state={{ error: `You need a ${requireRole} account to access this page.` }} />;
  }
  return children;
}

function AppRoutes() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <ErrorBoundary>
          <Routes>
            <Route path="/"              element={<Home />} />
            <Route path="/login"         element={<Login />} />
            <Route path="/register"      element={<Register />} />
            <Route path="/auctions"      element={<AuctionList />} />
            <Route path="/auctions/new"  element={
              <PrivateRoute requireRole="seller"><CreateAuction /></PrivateRoute>
            } />
            <Route path="/auctions/:id"  element={<AuctionDetail />} />
            <Route path="/dashboard"     element={
              <PrivateRoute><Dashboard /></PrivateRoute>
            } />
            <Route path="/profile"       element={
              <PrivateRoute><Dashboard /></PrivateRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        Auctara © {new Date().getFullYear()} — Fraud Detection Active
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}
