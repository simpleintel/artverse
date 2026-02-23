import { useState, useEffect } from 'react';
import { X, Zap, Sparkles, Loader2, Check } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function BuyCreditsModal({ onClose, credits }) {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);

  useEffect(() => {
    api.get('/billing/packs').then(({ data }) => setPacks(data.packs)).catch(() => toast.error('Failed to load packs')).finally(() => setLoading(false));
  }, []);

  const handleBuy = async (packId) => {
    setBuying(packId);
    try {
      const { data } = await api.post('/billing/checkout/credits', { packId });
      if (data.url) window.location.href = data.url;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start checkout');
      setBuying(null);
    }
  };

  const formatPrice = (cents) => `$${(cents / 100).toFixed(2)}`;
  const perCredit = (cents, credits) => `$${(cents / credits).toFixed(3)}/credit`;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md bg-surface-0 rounded-2xl shadow-modal overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between h-12 border-b border-surface-3 px-4">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-accent-violet" />
            <h2 className="text-sm font-bold">Buy Credits</h2>
          </div>
          <button onClick={onClose} className="text-ink-faint hover:text-ink transition-colors"><X size={20} /></button>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-center gap-2 mb-5 py-3 bg-violet-50 rounded-xl">
            <Sparkles size={16} className="text-accent-violet" />
            <span className="text-sm font-semibold">Current balance:</span>
            <span className="text-lg font-bold text-accent-violet">{credits ?? 0}</span>
            <span className="text-sm text-ink-muted">credits</span>
          </div>

          <p className="text-xs text-ink-faint mb-4 text-center">1 credit = 1 image &bull; 5 credits = 1 video</p>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-accent-violet" /></div>
          ) : (
            <div className="space-y-3">
              {packs.map((pack, i) => (
                <button key={pack.id} onClick={() => handleBuy(pack.id)} disabled={buying !== null}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all hover:shadow-card-hover
                    ${i === 1 ? 'border-accent-violet bg-violet-50/50 ring-1 ring-accent-violet/20' : 'border-surface-3 hover:border-accent-violet/30'}`}>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{pack.description}</span>
                      {i === 1 && <span className="text-[10px] font-bold uppercase bg-accent-violet text-white px-1.5 py-0.5 rounded">Best value</span>}
                    </div>
                    <p className="text-xs text-ink-faint mt-0.5">{pack.credits} credits &bull; {perCredit(pack.price_cents, pack.credits)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {buying === pack.id ? (
                      <Loader2 size={16} className="animate-spin text-accent-violet" />
                    ) : (
                      <span className="font-bold text-accent-violet">{formatPrice(pack.price_cents)}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          <p className="text-[11px] text-ink-faint text-center mt-4">Secure payment via Stripe. Credits never expire.</p>
        </div>
      </div>
    </div>
  );
}
