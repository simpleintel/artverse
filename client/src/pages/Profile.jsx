import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Grid3X3, List, Heart, Play, Sparkles, Loader2, Camera, MessageCircle, Key, Copy, Check, Zap, DollarSign, ImagePlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import BuyCreditsModal from '../components/BuyCreditsModal';
import TipModal from '../components/TipModal';
import EarningsPanel from '../components/EarningsPanel';
import api from '../api';
import toast from 'react-hot-toast';

export default function Profile() {
  const { username } = useParams();
  const { user: currentUser, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ displayName: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [credits, setCredits] = useState(null);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [tipsReceived, setTipsReceived] = useState(null);
  const [searchParams] = useSearchParams();

  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    setLoading(true); setViewMode('grid'); setApiKey(null);
    const fetches = [api.get(`/users/${username}`), api.get(`/users/${username}/posts`), api.get(`/billing/tips-received/${username}`)];
    if (currentUser) fetches.push(api.get('/billing/credits'));
    Promise.all(fetches)
      .then(([p, posts, tips, creds]) => {
        setProfile(p.data); setPosts(posts.data);
        setEditForm({ displayName: p.data.displayName || p.data.display_name || '', bio: p.data.bio || '' });
        setTipsReceived(tips.data);
        if (creds) setCredits(creds.data.credits);
      })
      .catch(() => toast.error('User not found'))
      .finally(() => setLoading(false));
  }, [username]);

  useEffect(() => {
    if (searchParams.get('purchase') === 'success') {
      const sid = searchParams.get('session_id');
      if (sid) api.post('/billing/verify-session', { sessionId: sid }).then(({ data }) => { if (data.credits != null) setCredits(data.credits); });
      toast.success('Credits purchased!');
    }
    if (searchParams.get('tip') === 'success') {
      const sid = searchParams.get('session_id');
      if (sid) api.post('/billing/verify-session', { sessionId: sid });
      toast.success('Tip sent! Thank you for supporting this creator.');
    }
  }, [searchParams]);

  const handleFollow = async () => {
    if (!currentUser) return;
    try { const { data } = await api.post(`/users/${username}/follow`); setProfile(p => p ? { ...p, isFollowing: data.following, followers: data.followers } : null); }
    catch { toast.error('Failed'); }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/users/profile/update', editForm);
      setProfile(p => p ? { ...p, displayName: data.displayName, bio: data.bio } : null);
      updateUser({ displayName: data.displayName, bio: data.bio }); setEditing(false); toast.success('Updated');
    } catch { toast.error('Failed'); } finally { setSaving(false); }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const form = new FormData(); form.append('avatar', file);
    try { const { data } = await api.put('/users/profile/update', form); setProfile(p => p ? { ...p, avatar: data.avatar } : null); updateUser({ avatar: data.avatar }); toast.success('Avatar updated'); }
    catch { toast.error('Failed'); }
  };

  const handleBannerChange = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const form = new FormData(); form.append('banner', file);
    try { const { data } = await api.put('/users/profile/update', form); setProfile(p => p ? { ...p, banner: data.banner } : null); toast.success('Banner updated'); }
    catch { toast.error('Failed'); }
  };

  const handleGenerateApiKey = async () => {
    try { const { data } = await api.post('/auth/api-key'); setApiKey(data.key); toast.success('API key generated'); }
    catch { toast.error('Failed'); }
  };

  const handleCopyKey = () => { if (!apiKey) return; navigator.clipboard.writeText(apiKey); setKeyCopied(true); toast.success('Copied!'); setTimeout(() => setKeyCopied(false), 2000); };

  const handleDelete = (id) => { setPosts(prev => prev.filter(p => p.id !== id)); setProfile(p => p ? { ...p, postCount: p.postCount - 1 } : null); };

  const aiCount = posts.filter(p => p.aiModel).length;
  const models = [...new Set(posts.filter(p => p.aiModel).map(p => p.aiModel?.split('/').pop()))];

  if (loading) return <div className="flex justify-center py-20"><div className="w-7 h-7 border-[3px] border-accent-violet/20 border-t-accent-violet rounded-full animate-spin" /></div>;
  if (!profile) return <div className="text-center py-20 text-ink-faint">User not found</div>;

  return (
    <div className="max-w-[700px] mx-auto px-4 sm:px-5 py-6">
      {/* Header */}
      <div className="card mb-4 overflow-hidden">
        {/* Banner */}
        <div className="relative h-36 sm:h-48 bg-violet-50 group/banner">
          {profile.banner && (
            <img src={profile.banner} alt="" className="w-full h-full object-cover" />
          )}
          {isOwnProfile && (
            <label className="absolute inset-0 bg-black/0 group-hover/banner:bg-black/30 flex items-center justify-center cursor-pointer transition-colors">
              <div className="opacity-0 group-hover/banner:opacity-100 transition-opacity flex items-center gap-2 bg-black/50 text-white text-xs font-semibold rounded-lg px-3 py-2">
                <ImagePlus size={14} /> {profile.banner ? 'Change banner' : 'Add banner'}
              </div>
              <input type="file" accept="image/*" onChange={handleBannerChange} className="hidden" />
            </label>
          )}
        </div>

        <div className="px-6 pb-6">
        {/* Avatar + info */}
        <div className="flex items-start gap-5 sm:gap-8 -mt-10 sm:-mt-14">
          <div className="shrink-0 relative group">
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-surface-0 ring-4 ring-white shadow-md">
              {profile.avatar ? (
                <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-surface-2 flex items-center justify-center text-2xl sm:text-4xl font-light text-ink-faint">{profile.username[0].toUpperCase()}</div>
              )}
            </div>
            {isOwnProfile && (
              <label className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 flex items-center justify-center cursor-pointer transition-colors">
                <Camera size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h1 className="text-xl font-bold">{profile.displayName || profile.username}</h1>
              <span className="text-ink-faint text-sm">@{profile.username}</span>
            </div>

            <div className="flex items-center gap-6 mb-3 text-sm">
              <div><span className="font-bold">{profile.postCount}</span> <span className="text-ink-muted">{profile.postCount === 1 ? 'creation' : 'creations'}</span></div>
              <div><span className="font-bold">{profile.followers}</span> <span className="text-ink-muted">{profile.followers === 1 ? 'collector' : 'collectors'}</span></div>
              <div><span className="font-bold">{profile.following}</span> <span className="text-ink-muted">collecting</span></div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              {isOwnProfile ? (
                <>
                  <button onClick={() => setEditing(!editing)} className="btn-secondary text-xs py-1.5 px-4">Edit profile</button>
                  <button onClick={() => setShowBuyCredits(true)} className="flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors font-semibold">
                    <Zap size={13} /> {credits ?? '—'} credits
                  </button>
                </>
              ) : currentUser ? (
                <>
                  <button onClick={handleFollow} className={`text-xs py-1.5 px-5 ${profile.isFollowing ? 'btn-secondary' : 'btn-primary'}`}>
                    {profile.isFollowing ? 'Collecting' : 'Collect'}
                  </button>
                  <button onClick={() => setShowTip(true)} className="flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg bg-pink-50 text-pink-500 hover:bg-pink-100 transition-colors font-semibold">
                    <Heart size={13} /> Support
                  </button>
                </>
              ) : null}
            </div>

            {tipsReceived && tipsReceived.count > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-pink-500 mb-2">
                <DollarSign size={12} />
                <span className="font-semibold">{tipsReceived.count} supporter{tipsReceived.count !== 1 ? 's' : ''}</span>
              </div>
            )}

            {editing ? (
              <div className="space-y-2 max-w-sm animate-slide-up">
                <input type="text" placeholder="Display name" value={editForm.displayName}
                  onChange={e => setEditForm(p => ({ ...p, displayName: e.target.value }))} className="input-field text-sm" />
                <textarea placeholder="Bio" value={editForm.bio}
                  onChange={e => setEditForm(p => ({ ...p, bio: e.target.value }))} rows={3} className="input-field text-sm resize-none" />
                <div className="flex gap-2">
                  <button onClick={handleSaveProfile} disabled={saving} className="btn-primary text-xs py-1.5 flex items-center gap-1">
                    {saving && <Loader2 size={12} className="animate-spin" />} Save
                  </button>
                  <button onClick={() => setEditing(false)} className="btn-secondary text-xs py-1.5">Cancel</button>
                </div>
              </div>
            ) : profile.bio ? (
              <p className="text-sm text-ink-light whitespace-pre-wrap">{profile.bio}</p>
            ) : null}
          </div>
        </div>

        {(aiCount > 0 || models.length > 0) && (
          <div className="mt-4 pt-4 border-t border-surface-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-violet-50 text-accent-violet rounded-full px-3 py-1">
              <Sparkles size={12} />
              <span className="text-xs font-semibold">{aiCount} AI {aiCount === 1 ? 'creation' : 'creations'}</span>
            </div>
            {models.slice(0, 4).map(m => (
              <span key={m} className="text-xs bg-surface-2 text-ink-muted rounded-full px-2.5 py-1">{m}</span>
            ))}
          </div>
        )}

        {isOwnProfile && (
          <div className="mt-4 pt-4 border-t border-surface-3">
            <div className="flex items-center gap-2 mb-2">
              <Key size={14} className="text-accent-violet" />
              <span className="text-xs font-semibold">Agent API Key</span>
            </div>
            {apiKey ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-surface-2 rounded-lg px-3 py-2 text-ink-muted font-mono truncate">{apiKey}</code>
                <button onClick={handleCopyKey} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                  {keyCopied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />} {keyCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
            ) : (
              <button onClick={handleGenerateApiKey} className="btn-outline text-xs py-1.5">Generate API Key</button>
            )}
            <p className="text-[11px] text-ink-faint mt-1.5">Let AI agents post on your behalf via REST API.</p>
          </div>
        )}
        </div>
      </div>

      {/* Earnings panel (own profile only) */}
      {isOwnProfile && <EarningsPanel />}

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        <button onClick={() => setViewMode('grid')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all
            ${viewMode === 'grid' ? 'bg-ink text-white' : 'bg-surface-0 text-ink-muted hover:bg-surface-2 shadow-card'}`}>
          <Grid3X3 size={14} /> Grid
        </button>
        <button onClick={() => setViewMode('list')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all
            ${viewMode === 'list' ? 'bg-ink text-white' : 'bg-surface-0 text-ink-muted hover:bg-surface-2 shadow-card'}`}>
          <List size={14} /> Feed
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-16 card p-8">
          <Sparkles size={32} className="text-surface-4 mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-1">No Creations Yet</h3>
          {isOwnProfile && <p className="text-sm text-ink-faint">Hit Create to share your first piece.</p>}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-3 gap-1.5">
          {posts.map(post => (
            <button key={post.id} onClick={() => setViewMode('list')}
              className="relative aspect-square group overflow-hidden rounded-xl bg-surface-2 shadow-card hover:shadow-card-hover transition-shadow">
              {post.mediaType === 'video' ? (
                <><video src={post.mediaUrl} className="w-full h-full object-cover" preload="metadata" muted />
                  <Play size={16} className="absolute top-2 right-2 text-white drop-shadow-lg" fill="white" /></>
              ) : (
                <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-4">
                  <span className="flex items-center gap-1 text-white font-bold text-xs"><Heart size={14} fill="white" /> {post.likeCount}</span>
                  <span className="flex items-center gap-1 text-white font-bold text-xs"><MessageCircle size={14} fill="white" /> {post.commentCount}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">{posts.map(post => <PostCard key={post.id} post={post} onDelete={handleDelete} />)}</div>
      )}

      {showBuyCredits && <BuyCreditsModal onClose={() => setShowBuyCredits(false)} credits={credits} />}
      {showTip && profile && <TipModal onClose={() => setShowTip(false)} artist={profile} />}
    </div>
  );
}
