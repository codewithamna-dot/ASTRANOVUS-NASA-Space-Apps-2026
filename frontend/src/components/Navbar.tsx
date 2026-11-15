import { Menu, Search, X } from 'lucide-react';
import { useState } from 'react';
import { useMission } from '../state/MissionContext';
import { bodyLabel } from '../utils/mission';
import { AstranovusLogo } from './AstranovusLogo';

export type PageId = 'home' | 'explore' | 'profiles' | 'compare' | 'discover' | 'methodology' | 'about';

interface NavbarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}

const NAV_ITEMS: Array<{ id: PageId; label: string }> = [
  { id: 'explore', label: 'Explore' },
  { id: 'profiles', label: 'Site Profiles' },
  { id: 'compare', label: 'Compare' },
  { id: 'discover', label: 'Discover' },
  { id: 'methodology', label: 'Methodology' },
  { id: 'about', label: 'About' },
];

export function Navbar({ activePage, onNavigate }: NavbarProps) {
  const { boot, health, experiments, experiment, body, setExperiment } = useMission();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const status = boot === 'ready' && health?.ok ? 'connected' : boot === 'loading' ? 'checking' : 'offline';
  const isMars = body === 'mars';

  const q = query.trim().toLowerCase();
  const matches = (q
    ? experiments.filter((e) => `${e.name} ${e.body} ${e.short_name}`.toLowerCase().includes(q))
    : experiments
  ).slice(0, 6);

  const go = (page: PageId) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FFFFFF]/82 backdrop-blur-md border-b border-[#E1E8F0]/80 shadow-[0_2px_16px_rgba(20,43,80,0.04)]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4 lg:gap-8">
        <button
          type="button"
          onClick={() => go('home')}
          className="flex items-center whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5ED7] rounded-lg py-1 transition-transform duration-150 hover:scale-[1.01]"
          aria-label="ASTRANOVUS Home"
        >
          <AstranovusLogo />
        </button>

        <nav className="hidden lg:flex items-center gap-2" aria-label="Primary Navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                className={`relative px-3 py-2 text-sm font-medium transition-all duration-150 whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5ED7] rounded-lg ${
                  isActive
                    ? 'text-[#0B5ED7] font-semibold bg-[#EDF3FA]/70'
                    : 'text-[#68788F] hover:text-[#142B50] hover:bg-[#EDF3FA]/60'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
                {isActive && (
                  <span className="absolute left-2 right-2 -bottom-[13px] h-[2px] bg-[#0B5ED7] rounded-full" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-3 shrink-0">
          {/* Current mission context */}
          <button
            type="button"
            onClick={() => go('explore')}
            className="inline-flex items-center gap-2 bg-[#EDF3FA] border border-[#E1E8F0] hover:border-[#0B5ED7] text-[#142B50] text-xs font-semibold rounded-lg px-3 py-2 max-w-[260px] transition-colors"
            title="Open the mission workflow"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${isMars ? 'bg-[#F28B45]' : body === 'moon' ? 'bg-[#C7D2E0] ring-1 ring-[#68788F]/40' : 'bg-[#AAB7C7]'}`}
              aria-hidden="true"
            />
            <span className="truncate">
              {experiment ? `${bodyLabel(experiment.body)} · ${experiment.short_name}` : body ? `${bodyLabel(body)} · pick an experiment` : 'Start a mission'}
            </span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setSearchOpen((p) => !p)}
              aria-label="Search experiments"
              aria-expanded={searchOpen}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#142B50] bg-[#FFFFFF]/80 border border-[#E1E8F0] hover:border-[#0B5ED7] hover:text-[#0B5ED7] rounded-lg transition-all duration-150 whitespace-nowrap"
            >
              <Search className="w-4 h-4 text-[#0B5ED7]" />
              <span>Search</span>
            </button>
            {searchOpen && (
              <div className="absolute right-0 mt-2 w-80 glass-light-hud rounded-xl p-3 z-50">
                <div className="flex items-center gap-2 border border-[#E1E8F0] bg-[#FFFFFF]/80 rounded-lg px-2.5 py-1.5 focus-within:border-[#0B5ED7]">
                  <Search className="w-4 h-4 text-[#68788F] shrink-0" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search experiments..."
                    aria-label="Search experiments"
                    autoFocus
                    className="w-full text-sm text-[#142B50] placeholder-[#68788F] focus:outline-none bg-transparent"
                  />
                  {query && (
                    <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="text-[#68788F] hover:text-[#142B50]">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="mt-2 divide-y divide-[#E6ECF3] max-h-64 overflow-y-auto">
                  {matches.length === 0 ? (
                    <p className="py-3 px-2 text-xs text-[#68788F]">No matching experiments.</p>
                  ) : (
                    matches.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => {
                          setSearchOpen(false);
                          setQuery('');
                          setExperiment(e.id);
                          go('explore');
                        }}
                        className="w-full text-left px-2.5 py-2 hover:bg-[#EDF3FA]/90 rounded-md transition-colors"
                      >
                        <div className="text-xs font-semibold text-[#142B50] truncate">{e.name}</div>
                        <div className="text-[11px] text-[#68788F]">{bodyLabel(e.body)}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <span
            title={status === 'connected' ? 'FastAPI backend connected' : status === 'checking' ? 'Checking backend' : 'Backend unreachable'}
            className="hidden xl:inline-flex items-center gap-1.5 text-[11px] font-medium text-[#68788F] whitespace-nowrap"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${status === 'connected' ? 'bg-[#16A34A]' : status === 'checking' ? 'bg-[#54B9F5]' : 'bg-[#F28B45]'}`}
              aria-hidden="true"
            />
            {status === 'connected' ? 'API Ready' : status === 'checking' ? 'Connecting' : 'API Offline'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((p) => !p)}
          className="lg:hidden inline-flex items-center justify-center p-2 rounded-lg border border-[#E1E8F0] text-[#142B50] hover:bg-[#EDF3FA]"
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-[#FFFFFF] border-t border-[#E1E8F0] px-4 py-4 space-y-4">
          <button
            type="button"
            onClick={() => go('explore')}
            className="w-full text-left bg-[#EDF3FA] border border-[#E1E8F0] text-[#142B50] text-sm font-semibold rounded-lg px-3 py-2"
          >
            {experiment ? `${bodyLabel(experiment.body)} · ${experiment.short_name}` : 'Start a mission'}
          </button>
          <div className="grid grid-cols-2 gap-2">
            {NAV_ITEMS.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => go(item.id)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${
                    isActive
                      ? 'bg-[#EDF3FA] text-[#0B5ED7] font-semibold border border-[#0B5ED7]/30'
                      : 'text-[#142B50] hover:bg-[#EDF3FA] border border-[#E1E8F0]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
