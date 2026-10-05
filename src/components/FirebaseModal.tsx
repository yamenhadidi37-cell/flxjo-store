import React, { useState } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Key,
  ShieldCheck,
  Server,
  Layers,
  Radio,
  Folder,
} from 'lucide-react';
import {
  DEFAULT_FIREBASE_CONFIG,
  getStoredApiKey,
  setStoredApiKey,
} from '../services/firebase';

interface FirebaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: {
    source: 'firestore' | 'seed';
    error: string | null;
    mediaCount: number;
    channelsCount: number;
    foldersCount: number;
  };
  onRefresh: () => Promise<void>;
}

export const FirebaseModal: React.FC<FirebaseModalProps> = ({
  isOpen,
  onClose,
  status,
  onRefresh,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState(() => getStoredApiKey());
  const [isSyncing, setIsSyncing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveAndSync = async () => {
    setIsSyncing(true);
    setSuccessMessage(null);
    setStoredApiKey(apiKeyInput);
    await onRefresh();
    setIsSyncing(false);
    setSuccessMessage('تم تحديث إعدادات الاتصال وفحص قاعدة البيانات.');
  };

  const handleReset = async () => {
    setApiKeyInput(DEFAULT_FIREBASE_CONFIG.apiKey);
    setStoredApiKey(DEFAULT_FIREBASE_CONFIG.apiKey);
    setIsSyncing(true);
    await onRefresh();
    setIsSyncing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#0b1021] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">إعدادات واتصال Firebase Firestore</h2>
              <span className="text-xs text-slate-400">مراقبة وفهرسة المجموعات الثلاث (وضع القراءة فقط)</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Read-Only Guarantee Badge */}
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3.5 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-200 leading-relaxed">
            <strong className="font-bold block text-emerald-300 mb-0.5">ضمان القراءة فقط 100% (Strict Read-Only):</strong>
            التطبيق مصمم برمجياً ليقوم بقراءة البيانات حصراً من مجموعاتك دون أي صلاحيات كتابة أو تعديل أو حذف، تماماً كما طلبت لحماية بياناتك.
          </div>
        </div>

        {/* Current Firestore Collections Status */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
            <Layers className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <span className="text-[11px] text-slate-400 block">vip_media</span>
            <strong className="text-lg font-black text-white tabular-nums">
              {status.mediaCount}
            </strong>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
            <Radio className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <span className="text-[11px] text-slate-400 block">live_channels</span>
            <strong className="text-lg font-black text-white tabular-nums">
              {status.channelsCount}
            </strong>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
            <Folder className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <span className="text-[11px] text-slate-400 block">folders</span>
            <strong className="text-lg font-black text-white tabular-nums">
              {status.foldersCount}
            </strong>
          </div>
        </div>

        {/* Connection Source Status */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">مشروع Firebase المرتبط:</span>
            <span className="font-mono text-amber-300 font-semibold" dir="ltr">
              {DEFAULT_FIREBASE_CONFIG.projectId}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">حالة الاتصال المباشر:</span>
            <span
              className={`flex items-center gap-1.5 font-bold ${
                status.source === 'firestore' ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {status.source === 'firestore' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>متصل مباشرة بـ Firestore الحية</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>مفتاح التجربة / في انتظار المفتاح الحقيقي</span>
                </>
              )}
            </span>
          </div>

          {status.error && (
            <p className="text-[11px] text-amber-300/90 pt-1 leading-relaxed border-t border-slate-800/80">
              {status.error}
            </p>
          )}
        </div>

        {/* API Key Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>مفتاح Firebase Web API Key:</span>
            </span>
            <span className="text-[11px] text-slate-500 font-normal">
              (إذا كان مفتاحك يحتوي نجوم AIz*****2A)
            </span>
          </label>
          <input
            type="text"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-400"
            dir="ltr"
          />
          <p className="text-[11px] text-slate-400 leading-normal">
            يمكنك إدخال مفتاح الـ API الحقيقي الخاص بك هنا في أي وقت إذا أردت تحديث الاتصال المباشر.
          </p>
        </div>

        {successMessage && (
          <div className="text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 p-2.5 rounded-lg text-center font-bold">
            {successMessage}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            onClick={handleReset}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            استعادة الإعدادات الأصلية
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              إغلاق
            </button>
            <button
              onClick={handleSaveAndSync}
              disabled={isSyncing}
              className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'جارٍ الفحص...' : 'حفظ وفحص الاتصال'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
