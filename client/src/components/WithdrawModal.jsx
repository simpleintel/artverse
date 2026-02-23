import { useState } from 'react';
import { X, ArrowDownToLine, Loader2, AlertTriangle } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

const fmt = (cents) => `$${(cents / 100).toFixed(2)}`;

export default function WithdrawModal({ onClose, availableCents, feePercent, onSuccess }) {
  const [useMax, setUseMax] = useState(true);
  const [customAmount, setCustomAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  const requestedCents = useMax ? availableCents : Math.round(parseFloat(customAmount || '0') * 100);
  const feeCents = Math.round(requestedCents * feePercent / 100);
  const netCents = requestedCents - feeCents;
  const valid = requestedCents >= 100 && requestedCents <= availableCents;

  const handleWithdraw = async () => {
    if (!valid || processing) return;
    setProcessing(true);
    try {
      const { data } = await api.post('/billing/withdraw', { amountCents: requestedCents });
      toast.success(`${fmt(data.netCents)} sent to your bank!`);
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Withdrawal failed');
    } finally { setProcessing(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-sm bg-surface-0 rounded-2xl shadow-modal overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between h-12 border-b border-surface-3 px-4">
          <div className="flex items-center gap-2">
            <ArrowDownToLine size={16} className="text-green-600" />
            <h2 className="text-sm font-bold">Withdraw Earnings</h2>
          </div>
          <button onClick={onClose} className="text-ink-faint hover:text-ink transition-colors"><X size={20} /></button>
        </div>

        <div className="p-5">
          <div className="bg-green-50 rounded-xl p-4 text-center mb-5">
            <p className="text-xs text-green-600 font-medium mb-1">Available balance</p>
            <p className="text-2xl font-bold text-green-700">{fmt(availableCents)}</p>
          </div>

          {/* Amount selector */}
          <div className="space-y-3 mb-5">
            <button onClick={() => setUseMax(true)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${useMax ? 'border-green-500 bg-green-50/50' : 'border-surface-3 hover:border-green-300'}`}>
              <span className="text-sm font-semibold">Withdraw all</span>
              <span className="text-sm font-bold text-green-600">{fmt(availableCents)}</span>
            </button>
            <button onClick={() => setUseMax(false)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${!useMax ? 'border-green-500 bg-green-50/50' : 'border-surface-3 hover:border-green-300'}`}>
              <span className="text-sm font-semibold">Custom amount</span>
              {!useMax && (
                <input type="number" min="1" max={(availableCents / 100).toFixed(2)} step="0.01"
                  value={customAmount} onChange={e => setCustomAmount(e.target.value)}
                  onClick={e => e.stopPropagation()} autoFocus
                  placeholder="0.00" className="w-24 text-right text-sm font-bold bg-transparent focus:outline-none" />
              )}
            </button>
          </div>

          {/* Fee breakdown */}
          {valid && (
            <div className="bg-surface-1 rounded-xl p-3 mb-5 space-y-1.5 text-xs">
              <div className="flex justify-between text-ink-muted">
                <span>Gross amount</span>
                <span>{fmt(requestedCents)}</span>
              </div>
              <div className="flex justify-between text-ink-muted">
                <span>Platform fee ({feePercent}%)</span>
                <span className="text-like">-{fmt(feeCents)}</span>
              </div>
              <div className="border-t border-surface-3 pt-1.5 flex justify-between font-bold text-ink">
                <span>You receive</span>
                <span className="text-green-600">{fmt(netCents)}</span>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 mb-4 text-[11px] text-ink-faint">
            <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-500" />
            <span>Funds are sent to your connected Stripe account. Bank processing may take 1-3 business days.</span>
          </div>

          <button onClick={handleWithdraw} disabled={!valid || processing}
            className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {processing ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : <><ArrowDownToLine size={16} /> Withdraw {valid ? fmt(netCents) : ''}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
