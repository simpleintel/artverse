import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, ArrowDownToLine, ExternalLink, Loader2, CheckCircle2, Clock, XCircle, Banknote } from 'lucide-react';
import WithdrawModal from './WithdrawModal';
import api from '../api';
import toast from 'react-hot-toast';

const fmt = (cents) => `$${(cents / 100).toFixed(2)}`;

export default function EarningsPanel() {
  const [earnings, setEarnings] = useState(null);
  const [connectStatus, setConnectStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const load = () => {
    Promise.all([api.get('/billing/earnings'), api.get('/billing/connect/status')])
      .then(([e, c]) => { setEarnings(e.data); setConnectStatus(c.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connect') === 'complete') {
      api.post('/billing/connect/verify').then(({ data }) => {
        setConnectStatus(prev => ({ ...prev, onboarded: data.onboarded }));
        if (data.onboarded) toast.success('Payouts connected!');
        else toast('Onboarding incomplete — finish setup to withdraw.', { icon: '⚠️' });
      });
    }
  }, []);

  const handleOnboard = async () => {
    setOnboarding(true);
    try {
      const { data } = await api.post('/billing/connect/onboard');
      if (data.url) window.location.href = data.url;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start onboarding');
      setOnboarding(false);
    }
  };

  const handleDashboard = async () => {
    try {
      const { data } = await api.get('/billing/connect/dashboard');
      if (data.url) window.open(data.url, '_blank');
    } catch {
      toast.error('Failed to open Stripe dashboard');
    }
  };

  if (loading) return <div className="card p-6 flex justify-center"><Loader2 size={18} className="animate-spin text-accent-violet" /></div>;
  if (!earnings) return null;

  const { totalEarnedCents, availableCents, withdrawnCents, pendingCents, platformFeePercent, recentTips, withdrawals } = earnings;

  const statusIcon = (status) => {
    if (status === 'completed') return <CheckCircle2 size={13} className="text-green-500" />;
    if (status === 'processing') return <Clock size={13} className="text-amber-500" />;
    if (status === 'failed') return <XCircle size={13} className="text-red-500" />;
    return <Clock size={13} className="text-ink-faint" />;
  };

  return (
    <div className="card p-6 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Banknote size={18} className="text-green-600" />
        <h3 className="font-bold text-sm">Creator Earnings</h3>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-[11px] text-green-600 font-medium mb-0.5">Total Earned</p>
          <p className="text-lg font-bold text-green-700">{fmt(totalEarnedCents)}</p>
        </div>
        <div className="bg-violet-50 rounded-xl p-3 text-center">
          <p className="text-[11px] text-accent-violet font-medium mb-0.5">Available</p>
          <p className="text-lg font-bold text-accent-violet">{fmt(availableCents)}</p>
        </div>
        <div className="bg-surface-2 rounded-xl p-3 text-center">
          <p className="text-[11px] text-ink-muted font-medium mb-0.5">Withdrawn</p>
          <p className="text-lg font-bold text-ink-light">{fmt(withdrawnCents)}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <p className="text-[11px] text-amber-600 font-medium mb-0.5">Pending</p>
          <p className="text-lg font-bold text-amber-600">{fmt(pendingCents)}</p>
        </div>
      </div>

      {/* Connect / Withdraw actions */}
      {!connectStatus?.onboarded ? (
        <div className="bg-surface-1 rounded-xl p-4 mb-5 border border-surface-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <DollarSign size={18} className="text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold mb-0.5">Set up payouts</p>
              <p className="text-xs text-ink-faint mb-3">Connect your bank account or debit card via Stripe to withdraw your earnings.</p>
              <button onClick={handleOnboard} disabled={onboarding}
                className="flex items-center gap-2 text-xs font-bold py-2 px-4 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50">
                {onboarding ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                {connectStatus?.connectId ? 'Continue Setup' : 'Connect with Stripe'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <button onClick={() => setShowWithdraw(true)} disabled={availableCents < 100}
            className="flex items-center gap-2 text-xs font-bold py-2 px-4 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <ArrowDownToLine size={14} /> Withdraw {availableCents >= 100 ? fmt(availableCents) : ''}
          </button>
          <button onClick={handleDashboard}
            className="flex items-center gap-2 text-xs font-semibold py-2 px-4 rounded-lg bg-surface-2 text-ink-muted hover:bg-surface-3 transition-colors">
            <ExternalLink size={14} /> Stripe Dashboard
          </button>
          <span className="text-[11px] text-ink-faint">{platformFeePercent}% platform fee on withdrawals</span>
        </div>
      )}

      {/* Recent tips */}
      {recentTips && recentTips.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-ink-muted mb-2 flex items-center gap-1.5">
            <TrendingUp size={13} /> Recent Tips
          </p>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {recentTips.map((tip, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-surface-1 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-ink">@{tip.tipper_username}</span>
                  {tip.message && <span className="text-ink-faint truncate max-w-[120px]">"{tip.message}"</span>}
                </div>
                <span className="font-bold text-green-600 shrink-0">+{fmt(tip.amount_cents)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Withdrawal history */}
      {withdrawals && withdrawals.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-ink-muted mb-2 flex items-center gap-1.5">
            <ArrowDownToLine size={13} /> Withdrawals
          </p>
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
            {withdrawals.map(w => (
              <div key={w.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-surface-1 text-xs">
                <div className="flex items-center gap-2">
                  {statusIcon(w.status)}
                  <span className="capitalize text-ink-muted">{w.status}</span>
                  <span className="text-ink-faint">{new Date(w.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-ink-faint line-through">{fmt(w.amount_cents)}</span>
                  <span className="font-bold text-ink">{fmt(w.net_amount_cents)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showWithdraw && (
        <WithdrawModal
          onClose={() => setShowWithdraw(false)}
          availableCents={availableCents}
          feePercent={platformFeePercent}
          onSuccess={() => { setShowWithdraw(false); load(); }}
        />
      )}
    </div>
  );
}
