import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Play, Sparkles } from 'lucide-react';
import api from '../api';

export default function Explore() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
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

  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-5 py-6">
      <h1 className="text-xl font-bold mb-5">Discover</h1>
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
