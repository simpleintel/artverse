import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Repeat2, Bookmark, MoreHorizontal, Sparkles, Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CommentSection from './CommentSection';
import api from '../api';
import toast from 'react-hot-toast';

export default function PostCard({ post, onDelete }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [showHeart, setShowHeart] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const lastTap = useRef(0);

  const handleLike = async () => {
    if (!user) return;
    try {
      const { data } = await api.post(`/posts/${post.id}/like`);
      setLiked(data.liked); setLikeCount(data.likeCount);
      if (data.liked) { setShowHeart(true); setTimeout(() => setShowHeart(false), 600); }
    } catch { toast.error('Failed'); }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!liked) handleLike();
      else { setShowHeart(true); setTimeout(() => setShowHeart(false), 600); }
    }
    lastTap.current = now;
  };

  const handleDelete = async () => {
    if (!confirm('Delete this creation?')) return;
    try { await api.delete(`/posts/${post.id}`); onDelete?.(post.id); toast.success('Deleted'); }
    catch { toast.error('Failed'); }
    setShowMenu(false);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(post.aiPrompt);
    setCopied(true); toast.success('Prompt copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const timeAgo = (date) => {
    const s = Math.floor((Date.now() - new Date(date + 'Z').getTime()) / 1000);
    if (s < 60) return 'now';
    const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24); if (d < 7) return `${d}d`;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const fmtCount = (n) => n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : n.toString();

  return (
    <article className="card animate-fade-in hover:shadow-card-hover transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Link to={`/profile/${post.user.username}`} className="flex items-center gap-3 min-w-0">
          {post.user.avatar ? (
            <img src={post.user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center text-sm font-bold text-ink-muted">
              {post.user.username[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <span className="text-sm font-semibold hover:text-accent-violet transition-colors truncate block">
              {post.user.displayName || post.user.username}
            </span>
            <span className="text-xs text-ink-faint">@{post.user.username} · {timeAgo(post.createdAt)}</span>
          </div>
        </Link>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 rounded-full text-ink-faint hover:bg-surface-2 hover:text-ink transition-all">
            <MoreHorizontal size={18} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-surface-0 border border-surface-3 rounded-xl shadow-card-hover p-1 z-10 animate-fade-in">
              {user?.id === post.user.id && (
                <button onClick={handleDelete} className="w-full text-left px-3 py-2 text-sm text-like font-medium rounded-lg hover:bg-red-50 transition-colors">Delete</button>
              )}
              {post.aiPrompt && (
                <button onClick={handleCopyPrompt} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-surface-2 transition-colors">Copy prompt</button>
              )}
              <button onClick={() => setShowMenu(false)} className="w-full text-left px-3 py-2 text-sm text-ink-faint rounded-lg hover:bg-surface-2 transition-colors">Cancel</button>
            </div>
          )}
        </div>
      </div>

      {/* Caption */}
      {post.caption && (
        <p className="px-4 pb-3 text-[15px] leading-relaxed text-ink-light">{post.caption}</p>
      )}

      {/* AI prompt — always visible */}
      {post.aiPrompt && (
        <div className="mx-4 mb-3 rounded-lg bg-violet-50 border border-violet-100 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-violet-100/50">
            <div className="flex items-center gap-1.5">
              <Sparkles size={12} className="text-accent-violet" />
              <span className="text-xs font-semibold text-accent-violet">AI Generated</span>
              <span className="text-xs text-ink-faint">· {post.aiModel?.split('/').pop()}</span>
            </div>
            <button onClick={handleCopyPrompt}
              className="flex items-center gap-1 text-xs text-ink-muted hover:text-accent-violet transition-colors">
              {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
              {copied ? 'Copied' : 'Remix'}
            </button>
          </div>
          <p className="px-3 py-2 text-sm text-ink-muted italic">"{post.aiPrompt}"</p>
        </div>
      )}

      {/* Media */}
      <div className="relative cursor-pointer mx-4 mb-3 rounded-lg overflow-hidden bg-surface-2" onClick={handleDoubleTap}>
        {post.mediaType === 'video' ? (
          <video src={post.mediaUrl} controls className="w-full max-h-[520px] object-contain" preload="metadata" playsInline poster="" />
        ) : (
          <img src={post.mediaUrl} alt={post.caption} className="w-full max-h-[520px] object-contain" loading="lazy" />
        )}
        {showHeart && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Heart size={80} className="text-like fill-like animate-heart-pop drop-shadow-lg" />
          </div>
        )}
      </div>

      {/* Engagement */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-5">
            <button onClick={handleLike} className="flex items-center gap-1.5 group">
              <Heart size={19} strokeWidth={liked ? 0 : 1.5}
                className={`transition-all ${liked ? 'text-like fill-like' : 'text-ink-faint group-hover:text-like'}`} />
              {likeCount > 0 && <span className={`text-[13px] font-medium ${liked ? 'text-like' : 'text-ink-faint'}`}>{fmtCount(likeCount)}</span>}
            </button>
            <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 group">
              <MessageCircle size={19} strokeWidth={1.5} className="text-ink-faint group-hover:text-accent-blue transition-colors" />
              {commentCount > 0 && <span className="text-[13px] font-medium text-ink-faint">{fmtCount(commentCount)}</span>}
            </button>
            <button className="group">
              <Repeat2 size={19} strokeWidth={1.5} className="text-ink-faint group-hover:text-green-500 transition-colors" />
            </button>
          </div>
          <button onClick={() => setSaved(!saved)} className="group">
            <Bookmark size={19} strokeWidth={saved ? 0 : 1.5}
              className={`transition-all ${saved ? 'text-accent-violet fill-accent-violet' : 'text-ink-faint group-hover:text-accent-violet'}`} />
          </button>
        </div>

        {!showComments && commentCount > 0 && (
          <button onClick={() => setShowComments(true)} className="text-[13px] text-ink-faint mt-1 hover:text-ink-muted transition-colors">
            View {commentCount === 1 ? '1 reply' : `all ${commentCount} replies`}
          </button>
        )}
        {showComments && (
          <div className="mt-2">
            <CommentSection postId={post.id} onCountChange={setCommentCount} />
          </div>
        )}
      </div>
    </article>
  );
}
