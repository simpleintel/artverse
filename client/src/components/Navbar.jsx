import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Compass, PlusCircle, User, Search, X, LogOut, Sparkles, Zap, Book, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CreatePostModal from './CreatePostModal';
import BuyCreditsModal from './BuyCreditsModal';
import api from '../api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [credits, setCredits] = useState(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (user) api.get('/billing/credits').then(({ data }) => setCredits(data.credits)).catch(() => {});
  }, [user, location.pathname]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      try { const { data } = await api.get(`/users/search?q=${encodeURIComponent(query)}`); setResults(data); }
      catch { setResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  if (!user && (location.pathname === '/login' || location.pathname === '/register')) return null;
  if (location.pathname === '/docs' || location.pathname === '/about') return null;

  const NavItem = ({ to, icon: Icon, label, match }) => {
    const active = match.includes(location.pathname);
    return (
      <Link to={to} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
        ${active ? 'bg-surface-2 text-ink font-semibold' : 'text-ink-muted hover:bg-surface-2 hover:text-ink'}`}>
        <Icon size={22} strokeWidth={active ? 2.2 : 1.5} />
        <span className="text-[14px] hidden lg:block">{label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden sm:flex fixed left-0 top-0 bottom-0 z-50 w-[68px] lg:w-[240px] border-r border-surface-3 bg-surface-0 flex-col py-5 px-2.5">
        <Link to="/" className="flex items-center gap-2.5 px-3 mb-6">
          <div className="w-8 h-8 rounded-xl gradient-accent flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles size={17} className="text-white" />
          </div>
          <span className="text-xl font-extrabold gradient-text hidden lg:block tracking-tight">ArtVerse</span>
        </Link>

        {/* Search */}
        <div ref={searchRef} className="relative mb-3 hidden lg:block px-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input type="text" placeholder="Search creators..."
            value={query} onChange={e => { setQuery(e.target.value); setShowSearch(true); }}
            onFocus={() => setShowSearch(true)}
            className="w-full bg-surface-2 rounded-lg pl-9 pr-8 py-2 text-sm placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent-violet/20 border border-transparent focus:border-accent-violet/30 transition-all" />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink">
              <X size={14} />
            </button>
          )}
          {showSearch && results.length > 0 && (
            <div className="absolute top-full mt-1.5 w-full bg-surface-0 border border-surface-3 rounded-xl shadow-card-hover p-1.5 animate-fade-in z-50 max-h-[300px] overflow-y-auto">
              {results.map(u => (
                <button key={u.id} onClick={() => { navigate(`/profile/${u.username}`); setShowSearch(false); setQuery(''); }}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2 transition-colors text-left">
                  {u.avatar ? (
                    <img src={u.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center text-xs font-bold text-ink-muted">{u.username[0].toUpperCase()}</div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{u.username}</p>
                    <p className="text-xs text-ink-faint truncate">{u.displayName}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-0.5 px-1">
          {user && (
            <>
              <NavItem to="/" icon={Compass} label="Discover" match={['/', '/explore']} />
              <NavItem to="/feed" icon={Home} label="Timeline" match={['/feed']} />
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-ink-muted hover:bg-surface-2 hover:text-ink transition-all mt-1">
                <div className="w-[22px] h-[22px] rounded-md gradient-accent flex items-center justify-center">
                  <PlusCircle size={14} className="text-white" />
                </div>
                <span className="text-[14px] font-semibold hidden lg:block">Create</span>
              </button>
              <button onClick={() => setShowCredits(true)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-ink-muted hover:bg-surface-2 hover:text-ink transition-all">
                <Zap size={22} strokeWidth={1.5} className="text-amber-500" />
                <span className="text-[14px] hidden lg:flex items-center gap-1.5">
                  <span className="font-bold text-ink">{credits ?? '—'}</span>
                  <span className="text-ink-faint text-xs">credits</span>
                </span>
              </button>
              <Link to={`/profile/${user.username}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                  ${location.pathname.includes('/profile/') ? 'bg-surface-2 font-semibold' : 'text-ink-muted hover:bg-surface-2 hover:text-ink'}`}>
                {user.avatar ? (
                  <img src={user.avatar} alt="" className={`w-[22px] h-[22px] rounded-full object-cover ${location.pathname.includes('/profile/') ? 'ring-2 ring-accent-violet' : ''}`} />
                ) : (
                  <User size={22} strokeWidth={1.5} />
                )}
                <span className="text-[14px] hidden lg:block">Profile</span>
              </Link>
            </>
          )}
        </div>

        <div className="px-1 mb-1 space-y-0.5">
          <Link to="/about"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
              ${location.pathname === '/about' ? 'bg-surface-2 text-ink font-semibold' : 'text-ink-faint hover:bg-surface-2 hover:text-ink'}`}>
            <Info size={20} strokeWidth={1.5} />
            <span className="text-[14px] hidden lg:block">About</span>
          </Link>
          <Link to="/docs"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
              ${location.pathname === '/docs' ? 'bg-surface-2 text-ink font-semibold' : 'text-ink-faint hover:bg-surface-2 hover:text-ink'}`}>
            <Book size={20} strokeWidth={1.5} />
            <span className="text-[14px] hidden lg:block">API Docs</span>
          </Link>
        </div>

        {user ? (
          <div className="px-1">
            <button onClick={() => { logout(); navigate('/login'); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-ink-faint hover:text-like hover:bg-red-50 transition-all w-full">
              <LogOut size={20} strokeWidth={1.5} />
              <span className="text-[14px] hidden lg:block">Log out</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2 px-1">
            <Link to="/login" className="btn-primary block text-center">Log in</Link>
            <Link to="/register" className="btn-outline block text-center">Sign up</Link>
          </div>
        )}
      </nav>

      {/* Mobile bottom bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-0 border-t border-surface-3 px-2 safe-area-pb">
        <div className="flex items-center justify-around h-14">
          <Link to="/" className={location.pathname === '/' ? 'text-ink' : 'text-ink-faint'}><Compass size={25} strokeWidth={1.5} /></Link>
          <Link to="/feed" className={location.pathname === '/feed' ? 'text-ink' : 'text-ink-faint'}><Home size={25} strokeWidth={1.5} /></Link>
          {user && (
            <button onClick={() => setShowCreate(true)} className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center shadow-md">
              <PlusCircle size={20} className="text-white" />
            </button>
          )}
          {user ? (
            <Link to={`/profile/${user.username}`}>
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <User size={25} strokeWidth={1.5} className={location.pathname.includes('/profile/') ? 'text-ink' : 'text-ink-faint'} />
              )}
            </Link>
          ) : (
            <Link to="/login" className="text-ink-faint"><User size={25} strokeWidth={1.5} /></Link>
          )}
        </div>
      </nav>

      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); navigate(location.pathname); }} credits={credits} onBuyCredits={() => { setShowCreate(false); setShowCredits(true); }} />}
      {showCredits && <BuyCreditsModal onClose={() => setShowCredits(false)} credits={credits} />}
    </>
  );
}
