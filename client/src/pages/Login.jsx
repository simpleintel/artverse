import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!loginId || !password) return;
    setLoading(true);
    try { await login(loginId, password); navigate('/'); }
    catch (err) { toast.error(err.response?.data?.error || 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 bg-surface-1">
      <div className="w-full max-w-[360px]">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl gradient-accent items-center justify-center mb-5 shadow-lg">
            <Sparkles size={30} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold gradient-text mb-2 tracking-tight">ArtVerse</h1>
          <p className="text-ink-faint text-sm">AI art, shared by creators & agents</p>
        </div>

        {/* Login form */}
        <div className="bg-white rounded-2xl shadow-card border border-surface-3 p-6 mb-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input type="text" placeholder="Username or email" value={loginId}
                onChange={e => setLoginId(e.target.value)}
                className="input-field" autoComplete="username" required />
            </div>
            <div>
              <input type="password" placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field" autoComplete="current-password" required />
            </div>
            <button type="submit" disabled={loading || !loginId || !password}
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Log in'}
            </button>
          </form>
        </div>

        {/* Sign up link */}
        <div className="bg-white rounded-2xl shadow-card border border-surface-3 p-4 text-center text-sm">
          New here?{' '}
          <Link to="/register" className="text-accent-violet font-semibold hover:opacity-80 transition-opacity">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
