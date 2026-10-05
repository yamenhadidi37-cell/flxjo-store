import React, { useState } from 'react';
import { BrandLogo } from './BrandLogo';
import { Search, Bookmark, X, Menu } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onNavigate: (tab: string, param?: string) => void;
  watchlistCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onNavigate,
  watchlistCount,
  searchQuery,
  onSearchChange,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);

  const navLinks = [
    { id: 'home', label: 'الرئيسية' },
    { id: 'movies', label: 'الأفلام' },
    { id: 'series', label: 'المسلسلات' },
    { id: 'live', label: 'قنوات البث المباشر' },
    { id: 'folders', label: 'المجموعات' },
  ];

  const handleLinkClick = (tabId: string) => {
    onNavigate(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#070b14]/90 backdrop-blur-md border-b border-slate-800/80 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Zone 1: Single Brand element */}
        <div className="shrink-0 flex items-center gap-3">
          <BrandLogo
            size="md"
            clickable
            onClick={() => onNavigate('home')}
            className="hover:opacity-95"
          />
        </div>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold tracking-wide">
          {navLinks.map((link) => {
            const isActive = currentTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => handleLinkClick(link.id)}
                className={`transition-colors duration-200 py-1 border-b-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'text-amber-400 border-amber-400'
                    : 'text-slate-300 border-transparent hover:text-white hover:border-slate-600'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1-2 primary actions (Search, Watchlist) */}
        <div className="flex items-center gap-3">
          {/* Quick Search */}
          <div className="relative flex items-center">
            {showSearchInput ? (
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 focus-within:border-amber-400 transition-colors">
                <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1.5" />
                <input
                  type="text"
                  placeholder="ابحث عن فيلم أو مسلسل أو ممثل..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none w-48 sm:w-64"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setShowSearchInput(false);
                    onSearchChange('');
                  }}
                  className="text-slate-400 hover:text-white mr-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSearchInput(true)}
                title="بحث"
                className="p-2 text-slate-300 hover:text-amber-400 hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
              >
                <Search className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Watchlist Quick Button */}
          <button
            onClick={() => onNavigate('watchlist')}
            title="قائمتي المفضلة"
            className="relative p-2 text-slate-300 hover:text-amber-400 hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
          >
            <Bookmark className="w-5 h-5" />
            {watchlistCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {watchlistCount}
              </span>
            )}
          </button>

          {/* Mobile menu hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0a0f1d] border-b border-slate-800 px-4 py-4 space-y-2">
          {navLinks.map((link) => {
            const isActive = currentTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => handleLinkClick(link.id)}
                className={`w-full text-right px-3 py-2 rounded-md text-sm font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-amber-400/10 text-amber-400'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};

