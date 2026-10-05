import React, { useState } from 'react';
import { Folder, Film, Tv, Sparkles, ChevronLeft } from 'lucide-react';
import { FolderItem, MediaItem, ConsolidatedSeries } from '../types/media';
import { MediaCard } from './MediaCard';

interface FoldersViewProps {
  folders: FolderItem[];
  allMedia: (MediaItem | ConsolidatedSeries)[];
  onSelectMedia: (id: string) => void;
}

export const FoldersView: React.FC<FoldersViewProps> = ({
  folders,
  allMedia,
  onSelectMedia,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    folders[0]?.id || ''
  );

  const activeFolder = folders.find((f) => f.id === selectedFolderId) || folders[0];

  const folderMedia = allMedia.filter((item) => {
    return item.folderId === activeFolder?.id;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-slate-100">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
          <Folder className="w-4 h-4 text-amber-400" />
          <span>المجموعات المنظمة وقوائم المحتوى</span>
        </div>
        <h1 className="text-3xl font-black text-white">مجلدات وتصنيفات الأعمال</h1>
      </div>

      {/* Folders Navigation Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        {folders.map((folder) => {
          const isSelected = folder.id === activeFolder?.id;
          const count = allMedia.filter((m) => m.folderId === folder.id).length;

          return (
            <div
              key={folder.id}
              onClick={() => setSelectedFolderId(folder.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-amber-400/10 border-amber-400 text-amber-300 shadow-md scale-102'
                  : 'bg-[#0b1021] border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Folder className={`w-5 h-5 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                <span className="text-xs font-bold tabular-nums bg-slate-900 px-2 py-0.5 rounded text-slate-400">
                  {count > 0 ? count : folder.itemCount || 0} عمل
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mb-1">{folder.name}</h3>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                {folder.description || 'مجموعة منتقاة من الأعمال الحصرية.'}
              </p>
            </div>
          );
        })}
      </div>

      {/* Selected Folder Content Display */}
      {activeFolder && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>{activeFolder.name}</span>
                <span className="text-xs text-amber-400 font-semibold tabular-nums mr-2">
                  ({folderMedia.length} عمل متاح)
                </span>
              </h2>
              {activeFolder.description && (
                <p className="text-xs text-slate-400 mt-1">{activeFolder.description}</p>
              )}
            </div>
          </div>

          {folderMedia.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {folderMedia.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  onClick={() => onSelectMedia(item.id)}
                />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-[#0b1021] rounded-2xl border border-slate-800 text-slate-400">
              لا توجد أعمال مضافة لهذا المجلد حالياً.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
