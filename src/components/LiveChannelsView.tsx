import React, { useState } from 'react';
import { StreamPlayer } from './StreamPlayer';
import { Radio, Play, Tv, Share2, Check, Sparkles, Volume2 } from 'lucide-react';
import { LiveChannel } from '../types/media';

interface LiveChannelsViewProps {
  channels: LiveChannel[];
  initialChannelId?: string;
}

export const LiveChannelsView: React.FC<LiveChannelsViewProps> = ({
  channels,
  initialChannelId,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<LiveChannel>(() => {
    if (initialChannelId) {
      const match = channels.find((c) => c.id === initialChannelId);
      if (match) return match;
    }
    return channels[0] || null;
  });

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [copied, setCopied] = useState(false);

  const categories = [
    { id: 'all', label: 'جميع القنوات' },
    { id: 'sports', label: 'رياضة (beIN & SSC)' },
    { id: 'movies', label: 'أفلام وسينما' },
    { id: 'entertainment', label: 'ترفيه ومنوعات' },
    { id: 'news', label: 'إخبارية' },
    { id: 'documentary', label: 'وثائقية' },
  ];

  const filteredChannels = channels.filter((c) => {
    if (activeCategory === 'all') return true;
    return c.category === activeCategory;
  });

  const handleShare = (channel: LiveChannel) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/live?channel=${channel.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (!selectedChannel) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-400">
        لا توجد قنوات بث مباشر متاحة حالياً.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-100">
      {/* Header Banner */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>بث مباشر 24/7 دون تقطيع</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            قنوات البث التلفزيوني المباشر (Live TV)
          </h1>
        </div>

        <button
          onClick={() => handleShare(selectedChannel)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-400/50 text-slate-200 text-xs font-bold cursor-pointer transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-amber-400" />}
          <span>{copied ? 'تم نسخ الرابط' : 'مشاركة البث'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Live Player Column */}
        <div className="lg:col-span-2 space-y-4">
          <StreamPlayer
            url={selectedChannel.streamUrl}
            title={selectedChannel.name}
            poster={selectedChannel.logoUrl}
          />

          {/* Current Channel Info */}
          <div className="bg-[#0b1021] border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
                <img
                  src={selectedChannel.logoUrl}
                  alt={selectedChannel.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{selectedChannel.name}</h3>
                <p className="text-xs text-amber-400 font-medium mt-0.5">
                  البرنامج الحالي: {selectedChannel.currentProgram || 'بث مباشر متواصل'}
                </p>
              </div>
            </div>

            <div className="bg-slate-900 text-amber-300 border border-amber-400/30 text-xs font-black px-3 py-1 rounded-lg">
              {selectedChannel.quality || 'FHD 1080p'}
            </div>
          </div>
        </div>

        {/* Channels Sidebar List */}
        <div className="space-y-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Channels Scroll Area */}
          <div className="bg-[#0b1021] border border-slate-800 rounded-xl p-2.5 max-h-[520px] overflow-y-auto space-y-1.5">
            {filteredChannels.map((channel) => {
              const isCurrent = channel.id === selectedChannel.id;
              return (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel)}
                  className={`w-full text-right p-2.5 rounded-lg flex items-center justify-between gap-3 transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-amber-400/15 border border-amber-400 text-amber-300 shadow-sm'
                      : 'bg-slate-900/60 hover:bg-slate-800 text-slate-200 border border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-slate-700/60">
                      <img
                        src={channel.logoUrl}
                        alt={channel.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold truncate text-white">{channel.name}</h4>
                      <span className="text-[10px] text-slate-400 truncate block">
                        {channel.currentProgram || 'بث مباشر'}
                      </span>
                    </div>
                  </div>

                  {isCurrent && (
                    <span className="shrink-0 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
