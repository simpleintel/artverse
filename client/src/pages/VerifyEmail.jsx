import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, Mail, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';

export default function VerifyEmail() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef([]);

  useEffect(() => {
    if (user?.emailVerified) navigate('/', { replace: true });
  }, [user?.emailVerified]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...code];
    next[idx] = val.slice(-1);
    setCode(next);
    if (val && idx < 5) inputs.current[idx + 1]?.focus();
    if (next.every(d => d !== '') && next.join('').length === 6) {
      verify(next.join(''));
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      const next = text.split('');
      setCode(next);
      inputs.current[5]?.focus();
      verify(text);
    }
  };

  const verify = async (fullCode) => {
    setLoading(true);
    try {
      await api.post('/auth/verify-email', { code: fullCode });
      updateUser({ emailVerified: true });
      toast.success('Email verified!');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid code');
      setCode(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally { setLoading(false); }
  };

  const resend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      const { data } = await api.post('/auth/resend-code');
      toast.success(data.message || 'Code sent!');
      setCooldown(60);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resend');
    } finally { setResending(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 bg-surface-1">
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-violet-100 items-center justify-center mb-5">
            <Mail size={30} className="text-accent-violet" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-2">Check your email</h1>
          <p className="text-ink-faint text-sm">
            We sent a 6-digit code to<br />
            <span className="font-semibold text-ink">{user?.email}</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-surface-3 p-6 mb-4">
          <div className="flex justify-center gap-2.5 mb-6" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input key={i} ref={el => inputs.current[i] = el}
                type="text" inputMode="numeric" maxLength={1} value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all focus:outline-none
                  ${digit ? 'border-accent-violet bg-violet-50/50' : 'border-surface-3 bg-surface-1'}
                  focus:border-accent-violet focus:ring-2 focus:ring-accent-violet/20`}
                disabled={loading}
              />
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 text-sm text-accent-violet mb-4">
              <Loader2 size={16} className="animate-spin" /> Verifying...
            </div>
          )}

          <button onClick={resend} disabled={cooldown > 0 || resending}
            className="w-full flex items-center justify-center gap-2 text-sm text-ink-muted hover:text-accent-violet transition-colors py-2 disabled:opacity-50">
            {resending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </div>

        <p className="text-center text-[12px] text-ink-faint">
          Didn't get it? Check your spam folder.
        </p>
      </div>
    </div>
  );
}
