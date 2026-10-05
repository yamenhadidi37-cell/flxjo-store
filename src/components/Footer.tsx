import React from 'react';
import { BrandLogo } from './BrandLogo';
import { ShieldCheck, Heart, Radio, MapPin, Globe } from 'lucide-react';

interface FooterProps {
  onNavigate: (tab: string) => void;
  mediaCount: number;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, mediaCount }) => {
  return (
    <footer className="bg-[#050811] border-t border-slate-800/80 text-slate-400 text-xs py-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800/60">
          <BrandLogo size="md" clickable onClick={() => onNavigate('home')} />

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-slate-300">
            <button onClick={() => onNavigate('home')} className="hover:text-amber-400 transition-colors cursor-pointer">
              الرئيسية
            </button>
            <button onClick={() => onNavigate('movies')} className="hover:text-amber-400 transition-colors cursor-pointer">
              الأفلام
            </button>
            <button onClick={() => onNavigate('series')} className="hover:text-amber-400 transition-colors cursor-pointer">
              المسلسلات
            </button>
            <button onClick={() => onNavigate('live')} className="hover:text-amber-400 transition-colors cursor-pointer">
              البث المباشر
            </button>
            <button onClick={() => onNavigate('folders')} className="hover:text-amber-400 transition-colors cursor-pointer">
              المجموعات
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-xs">
          <p className="text-center sm:text-right">
            © {new Date().getFullYear()} FLEXJO VIP. جميع الحقوق محفوظة. منصة مخصصة لمشاهدة الأفلام والمسلسلات وقنوات البث المباشر.
          </p>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>فهرسة متطابقة مع معايير السيو</span>
            </span>
            <span>·</span>
            <span className="tabular-nums font-semibold text-slate-400">
              {mediaCount} عمل مفهرس
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
