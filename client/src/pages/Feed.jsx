import { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import PostCard from '../components/PostCard';
import api from '../api';

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const observer = useRef(null);

  const fetchPosts = useCallback(async (p) => {
    try {
      const { data } = await api.get(`/posts/feed?page=${p}&limit=10`);
      if (p === 1) setPosts(data); else setPosts(prev => [...prev, ...data]);
      setHasMore(data.length === 10);
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

  return (
    <div className="max-w-[600px] mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-5">Timeline</h1>
      {loading && posts.length === 0 ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-[3px] border-accent-violet/20 border-t-accent-violet rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 card p-8">
          <Sparkles size={36} className="text-surface-4 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Your timeline is empty</h3>
          <p className="text-sm text-ink-faint">Collect creators from Discover to fill your timeline.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post, i) => (
            <div key={post.id} ref={i === posts.length - 1 ? lastRef : null}>
              <PostCard post={post} onDelete={(id) => setPosts(prev => prev.filter(p => p.id !== id))} />
            </div>
          ))}
          {loading && (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-[3px] border-accent-violet/20 border-t-accent-violet rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
