import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Play, Sparkles, X, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../api';

export default function Explore() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showNote, setShowNote] = useState(() => !sessionStorage.getItem('note-dismissed'));
  const [noteExpanded, setNoteExpanded] = useState(false);
  const observer = useRef(null);

  const fetchPosts = useCallback(async (p) => {
    try {
      const { data } = await api.get(`/posts/explore?page=${p}&limit=24`);
      if (p === 1) setPosts(data); else setPosts(prev => [...prev, ...data]);
      setHasMore(data.length === 24);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPosts(1); }, [fetchPosts]);

  const lastRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => { const next = prev + 1; fetchPosts(next); return next; });
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, fetchPosts]);

  if (loading && posts.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-7 h-7 border-[3px] border-accent-violet/20 border-t-accent-violet rounded-full animate-spin" />
      </div>
    );
  }

  const dismissNote = () => { setShowNote(false); sessionStorage.setItem('note-dismissed', '1'); };

  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-5 py-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold">Discover</h1>
        <span className="text-xs font-medium text-ink-faint bg-surface-2 rounded-full px-3 py-1 border border-surface-3">A Constellation of Machine Dreams</span>
      </div>

      {showNote && (
        <div className="mb-6 relative overflow-hidden rounded-2xl border border-surface-3 bg-white shadow-card">
          <div className="absolute top-0 left-0 right-0 h-1 bg-accent-violet" />
          <div className="px-5 sm:px-7 pt-6 pb-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl gradient-accent flex items-center justify-center shadow-sm shrink-0">
                  <Sparkles size={14} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">A Note from Us</h3>
                  <p className="text-[11px] text-ink-faint">Community Note</p>
                </div>
              </div>
              <button onClick={dismissNote} className="text-ink-faint hover:text-ink transition-colors p-1 -mr-1 -mt-1">
                <X size={16} />
              </button>
            </div>

            <div className="text-sm leading-relaxed text-ink-muted space-y-3">
              <p>
                View of Nova was born from a simple belief:
                <span className="block mt-1 text-ink font-semibold italic">
                  Creativity is not owned by humans or machines — it is a force that moves through both.
                </span>
              </p>

              {noteExpanded && (
                <div className="space-y-3 animate-fade-in">
                  <p>
                    Every piece of AI-generated art begins with a human impulse. A question. A curiosity. A feeling that cannot quite be explained in words. The machine does not replace the artist — it becomes a mirror, a collaborator, a lens into possibility.
                  </p>
                  <p className="text-ink font-medium italic">
                    "Nova" is the moment a star expands into brilliance.
                  </p>
                  <p>
                    We believe creativity works the same way. A small spark — an idea — becomes something luminous when shared.
                  </p>
                  <p>This platform exists for those who explore that edge.</p>
                  <div className="pl-4 border-l-2 border-accent-violet/25 space-y-0.5 py-0.5">
                    <p className="text-ink text-[13px]">Where code meets imagination.</p>
                    <p className="text-ink text-[13px]">Where prompts become poetry.</p>
                    <p className="text-ink text-[13px]">Where algorithms reveal emotion.</p>
                  </div>
                  <p>
                    Art has always been a conversation between tools and vision.
                    Today, the tools have evolved.
                    <span className="block mt-1 font-semibold text-ink">The wonder remains.</span>
                  </p>
                  <div className="pt-2">
                    <div className="h-px bg-surface-3" />
                  </div>
                  <p className="text-center text-ink font-medium tracking-wide">
                    Welcome to your view of the new light.
                  </p>
                </div>
              )}
            </div>

            <button onClick={() => setNoteExpanded(!noteExpanded)}
              className="mt-3 flex items-center gap-1 text-xs font-semibold text-accent-violet hover:text-accent-violet/80 transition-colors">
              {noteExpanded ? <><ChevronUp size={14} /> Show less</> : <><ChevronDown size={14} /> Read more</>}
            </button>
          </div>
        </div>
      )}
      {posts.length === 0 ? (
        <div className="text-center py-20 card p-8">
          <Sparkles size={36} className="text-surface-4 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nothing here yet</h3>
          <p className="text-sm text-ink-faint">Be the first to create something.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {posts.map((post, i) => (
            <Link key={post.id} to={`/profile/${post.user.username}`}
              ref={i === posts.length - 1 ? lastRef : null}
              className="relative aspect-square group overflow-hidden rounded-xl bg-surface-2 shadow-card hover:shadow-card-hover transition-shadow">
              {post.mediaType === 'video' ? (
                <>
                  <video src={post.mediaUrl} className="w-full h-full object-cover" preload="metadata" muted />
                  <div className="absolute top-2.5 right-2.5"><Play size={16} className="text-white drop-shadow-lg" fill="white" /></div>
                </>
              ) : (
                <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
              )}
              {post.aiModel && (
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-full px-2 py-0.5">
                  <Sparkles size={10} className="text-accent-violet" />
                  <span className="text-[10px] font-semibold text-ink">AI</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-5">
                  <span className="flex items-center gap-1.5 text-white font-bold text-sm"><Heart size={18} fill="white" /> {post.likeCount}</span>
                  <span className="flex items-center gap-1.5 text-white font-bold text-sm"><MessageCircle size={18} fill="white" /> {post.commentCount}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      {loading && posts.length > 0 && (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-[3px] border-accent-violet/20 border-t-accent-violet rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
