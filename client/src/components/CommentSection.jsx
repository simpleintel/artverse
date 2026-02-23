import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';

export default function CommentSection({ postId, onCountChange }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/comments/${postId}`).then(res => setComments(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, [postId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/comments/${postId}`, { text: text.trim() });
      setComments(prev => [...prev, data]);
      onCountChange?.(comments.length + 1);
      setText('');
    } catch { toast.error('Failed'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/comments/${id}`); setComments(prev => prev.filter(c => c.id !== id)); onCountChange?.(comments.length - 1); } catch {}
  };

  const timeAgo = (date) => {
    const s = Math.floor((Date.now() - new Date(date + 'Z').getTime()) / 1000);
    if (s < 60) return 'now';
    const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  if (loading) return <div className="py-2 text-center text-ink-faint text-xs">Loading...</div>;

  return (
    <div className="space-y-2.5 border-t border-surface-3 pt-3 animate-slide-up">
      <div className="space-y-2.5 max-h-[200px] overflow-y-auto">
        {comments.map(c => (
          <div key={c.id} className="flex gap-2.5 group">
            <Link to={`/profile/${c.user.username}`} className="shrink-0 mt-0.5">
              {c.user.avatar ? (
                <img src={c.user.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center text-[10px] font-bold text-ink-muted">{c.user.username[0].toUpperCase()}</div>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-[13px]">
                <Link to={`/profile/${c.user.username}`} className="font-semibold hover:text-accent-violet transition-colors mr-1">{c.user.username}</Link>
                <span className="text-ink-light">{c.text}</span>
              </p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[11px] text-ink-faint">{timeAgo(c.createdAt)}</span>
                {user?.id === c.user.id && (
                  <button onClick={() => handleDelete(c.id)} className="text-[11px] text-ink-faint hover:text-like opacity-0 group-hover:opacity-100 transition-all">Delete</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {user && (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input type="text" value={text} onChange={e => setText(e.target.value)} placeholder="Reply..."
            className="flex-1 bg-transparent text-[13px] placeholder-ink-faint focus:outline-none py-1" />
          <button type="submit" disabled={!text.trim() || submitting}
            className="text-accent-violet text-[13px] font-bold hover:opacity-80 disabled:opacity-30 transition-opacity">Post</button>
        </form>
      )}
    </div>
  );
}
