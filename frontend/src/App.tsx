import { useEffect, useState } from 'react';
import { AstranovusLogo } from './components/AstranovusLogo';
import { NeuralBackdrop } from './components/NeuralBackdrop';
import { Navbar, type PageId } from './components/Navbar';
import { AboutPage } from './pages/AboutPage';
import { ComparePage } from './pages/ComparePage';
import { DiscoverPage } from './pages/DiscoverPage';
import { ExplorePage } from './pages/ExplorePage';
import { HomePage } from './pages/HomePage';
import { MethodologyPage } from './pages/MethodologyPage';
import { ProfilesPage } from './pages/ProfilesPage';
import { MissionProvider, useMission } from './state/MissionContext';

const PAGES: PageId[] = ['home', 'explore', 'profiles', 'compare', 'discover', 'methodology', 'about'];

function initialPage(): PageId {
  const v = new URLSearchParams(window.location.search).get('view') as PageId | null;
  return v && PAGES.includes(v) ? v : 'home';
}

function Shell() {
  const m = useMission();
  const [page, setPage] = useState<PageId>(initialPage);

  const navigate = (p: PageId) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Keep the URL reloadable: view + mission selection.
  useEffect(() => {
    const qs = new URLSearchParams();
    qs.set('view', page);
    if (m.body) qs.set('body', m.body);
    if (m.experimentId) qs.set('exp', m.experimentId);
    if (m.targetId) qs.set('target', m.targetId);
    window.history.replaceState(null, '', `${window.location.pathname}?${qs.toString()}`);
  }, [page, m.body, m.experimentId, m.targetId]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F8FF] text-[#142B50] relative overflow-x-clip">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-70" aria-hidden="true">
        <NeuralBackdrop />
      </div>
      <Navbar activePage={page} onNavigate={navigate} />
      <main className="flex-1 relative z-[1]">
        {page === 'home' && <HomePage onNavigate={navigate} />}
        {page === 'explore' && <ExplorePage onOpenProfile={() => navigate('profiles')} />}
        {page === 'profiles' && <ProfilesPage onNavigate={navigate} />}
        {page === 'compare' && <ComparePage onNavigate={navigate} />}
        {page === 'discover' && <DiscoverPage />}
        {page === 'methodology' && <MethodologyPage />}
        {page === 'about' && <AboutPage />}
      </main>
      <footer className="relative z-[1] bg-[#000000] border-t border-[#16305F] mt-12 text-[#B7C6DF]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center text-xs">
          <div className="md:col-span-4">
            <AstranovusLogo variant="full" className="h-24 w-auto" />
          </div>
          <div className="md:col-span-8 space-y-1.5 md:text-right">
            <div>
              Developed by <strong className="text-[#FFFFFF]">Team Astravant</strong> for the NASA Space Apps Challenge 2026.
            </div>
            <div className="max-w-2xl md:ml-auto">
              An Earth analog screening and research-support tool. Scores are team-generated estimates from public NASA-derived data, not official NASA ratings, and results
              are regions to investigate, not certified landing or field sites.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <MissionProvider>
      <Shell />
    </MissionProvider>
  );
}
