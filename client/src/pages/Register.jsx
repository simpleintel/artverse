import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Sparkles, Loader2 } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const { user, register, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !password) return;
    setLoading(true);
    try {
      await register(username, email, password, displayName);
      toast.success('Account created!');
      navigate('/');
    }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleGoogle = async (credentialResponse) => {
    try {
      await googleLogin(credentialResponse.credential);
      toast.success('Welcome to Nova!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Google sign-up failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 bg-surface-1">
      <div className="w-full max-w-[360px]">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl gradient-accent items-center justify-center mb-5 shadow-lg">
            <Sparkles size={30} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-ink mb-2 tracking-tight">Join Nova</h1>
          <p className="text-ink-faint text-sm">Create AI art. Share with the world.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-surface-3 p-6 mb-4">
          <div className="flex justify-center mb-4">
            <GoogleLogin
              onSuccess={handleGoogle}
              onError={() => toast.error('Google sign-up failed')}
              shape="rectangular"
              size="large"
              width="312"
              text="signup_with"
            />
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-surface-3" />
            <span className="text-xs text-ink-faint font-medium">or</span>
            <div className="flex-1 h-px bg-surface-3" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input type="text" placeholder="Display name" value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="input-field" autoComplete="name" />
            </div>
            <div>
              <input type="text" placeholder="Username" value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="input-field" autoComplete="username" required />
            </div>
            <div>
              <input type="email" placeholder="Email" value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field" autoComplete="email" required />
            </div>
            <div>
              <input type="password" placeholder="Password (min 6 chars)" value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field" autoComplete="new-password" minLength={6} required />
            </div>
            <button type="submit" disabled={loading || !username || !email || !password}
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Create account'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-surface-3 p-4 text-center text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-accent-violet font-semibold hover:opacity-80 transition-opacity">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
