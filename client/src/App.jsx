import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Explore from './pages/Explore';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import Docs from './pages/Docs';
import About from './pages/About';

export default function App() {
  const { loading } = useAuth();
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isDocsPage = location.pathname === '/docs';
  const isAboutPage = location.pathname === '/about';
  const isFullWidthPage = isAuthPage || isDocsPage || isAboutPage;

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-1 flex items-center justify-center">
        <div className="w-7 h-7 border-[3px] border-accent-violet/20 border-t-accent-violet rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Toaster position="bottom-center" toastOptions={{
        style: { background: '#fff', color: '#111827', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '13px', border: '1px solid #e5e7eb' },
      }} />
      <Navbar />
      <main className={isFullWidthPage ? 'min-h-screen' : 'pb-20 sm:pb-0 sm:pl-[68px] lg:pl-[240px] min-h-screen'}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/about" element={<About />} />
          <Route path="/" element={<Explore />} />
          <Route path="/explore" element={<Navigate to="/" />} />
          <Route path="/feed" element={<Navigate to="/" />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </>
  );
}
