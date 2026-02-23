import { useState } from 'react';
import { X, Heart, Loader2, DollarSign } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

const QUICK_AMOUNTS = [
  { id: 'tip_2', label: '$2', cents: 200 },
  { id: 'tip_5', label: '$5', cents: 500 },
  { id: 'tip_10', label: '$10', cents: 1000 },
  { id: 'tip_25', label: '$25', cents: 2500 },
];

export default function TipModal({ onClose, artist }) {
  const [selected, setSelected] = useState('tip_5');
  const [custom, setCustom] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      const body = { artistUsername: artist.username, message };
      if (useCustom) {
        const val = parseFloat(custom);
        if (!val || val < 1 || val > 500) { toast.error('Enter $1-$500'); setSending(false); return; }
        body.customAmount = val;
      } else {
        body.amountId = selected;
      }
      const { data } = await api.post('/billing/checkout/tip', body);
      if (data.url) window.location.href = data.url;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-sm bg-surface-0 rounded-2xl shadow-modal overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between h-12 border-b border-surface-3 px-4">
          <div className="flex items-center gap-2">
            <Heart size={16} className="text-pink-500" />
            <h2 className="text-sm font-bold">Support @{artist.username}</h2>
          </div>
          <button onClick={onClose} className="text-ink-faint hover:text-ink transition-colors"><X size={20} /></button>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-3 mb-5">
            {artist.avatar ? (
              <img src={artist.avatar} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-pink-100" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center text-lg font-bold text-pink-400">{artist.username[0].toUpperCase()}</div>
            )}
            <div>
              <p className="font-bold text-sm">{artist.displayName || artist.username}</p>
              <p className="text-xs text-ink-faint">Your tip goes directly to this creator</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-3">
            {QUICK_AMOUNTS.map(a => (
              <button key={a.id} onClick={() => { setSelected(a.id); setUseCustom(false); }}
                className={`py-2.5 rounded-xl text-sm font-bold transition-all ${!useCustom && selected === a.id ? 'bg-pink-500 text-white shadow-md' : 'bg-surface-2 text-ink-muted hover:bg-surface-3'}`}>
                {a.label}
              </button>
            ))}
          </div>

          <button onClick={() => setUseCustom(!useCustom)}
            className={`w-full text-xs text-center py-1.5 rounded-lg transition-all mb-3 ${useCustom ? 'text-pink-500 font-semibold' : 'text-ink-faint hover:text-ink-muted'}`}>
            {useCustom ? 'Use preset amount' : 'Custom amount'}
          </button>

          {useCustom && (
            <div className="relative mb-3">
              <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input type="number" min="1" max="500" step="0.01" value={custom} onChange={e => setCustom(e.target.value)}
                placeholder="Enter amount..." className="input-field pl-8" />
            </div>
          )}

          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Leave a message (optional)..."
            rows={2} className="input-field resize-none text-sm mb-4" maxLength={200} />

          <button onClick={handleSend} disabled={sending}
            className="w-full py-3 rounded-xl bg-pink-500 text-white font-bold text-sm hover:bg-pink-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md">
            {sending ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : <><Heart size={16} /> Send Tip</>}
          </button>

          <p className="text-[11px] text-ink-faint text-center mt-3">Secure payment via Stripe</p>
        </div>
      </div>
    </div>
  );
}
