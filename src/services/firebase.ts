import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  collection,
  doc,
  getDocs,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import { MediaItem, LiveChannel, FolderItem } from '../types/media';

const STORAGE_KEY_API_KEY = 'flexjo_firebase_apikey';

// Real Production Firebase Config provided by user
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCucLj9W843sJXwhlfVsi15soRyq29wkdU',
  authDomain: 'kpro-a1c5d.firebaseapp.com',
  projectId: 'kpro-a1c5d',
  storageBucket: 'kpro-a1c5d.firebasestorage.app',
  messagingSenderId: '247021058792',
  appId: '1:247021058792:web:c0fce646002c471634e75d',
  measurementId: 'G-F40NS7FQYL',
};

export const getStoredApiKey = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEY_API_KEY) || DEFAULT_FIREBASE_CONFIG.apiKey;
  } catch {
    return DEFAULT_FIREBASE_CONFIG.apiKey;
  }
};

export const setStoredApiKey = (key: string): void => {
  try {
    if (key && key.trim()) {
      localStorage.setItem(STORAGE_KEY_API_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_API_KEY);
    }
  } catch {
    // Some console browsers or privacy modes disable local storage.
  }
};

let firestoreInstance: Firestore | null = null;

export const getFirebaseDb = (): Firestore | null => {
  try {
    const activeApiKey = getStoredApiKey();
    const config = {
      ...DEFAULT_FIREBASE_CONFIG,
      apiKey: activeApiKey,
    };

    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    if (!firestoreInstance) {
      const isPlayStationBrowser =
        typeof navigator !== 'undefined' && /PlayStation\s*(?:4|5)/i.test(navigator.userAgent);
      firestoreInstance = initializeFirestore(
        app,
        isPlayStationBrowser
          ? { experimentalForceLongPolling: true, experimentalAutoDetectLongPolling: false }
          : {},
      );
    }
    return firestoreInstance;
  } catch (err) {
    console.warn('[Firebase] Init notice:', err);
    return null;
  }
};

export interface AppUpdateConfig {
  mobile: PlatformUpdateConfig;
  tv: PlatformUpdateConfig;
}

export interface PlatformUpdateConfig {
  downloadUrl: string;
  version: string;
  serverSynced: boolean;
  error: boolean;
}

const firstValue = (data: Record<string, unknown>, fields: string[]): unknown => {
  for (const field of fields) {
    const value = data[field];
    if (value !== undefined && value !== null && String(value).trim()) return value;
  }
  return undefined;
};

const emptyPlatformUpdate = (serverSynced = false, error = false): PlatformUpdateConfig => ({
  downloadUrl: '',
  version: '',
  serverSynced,
  error,
});

const readPlatformUpdateConfig = (data: Record<string, unknown>): Omit<PlatformUpdateConfig, 'serverSynced' | 'error'> => {
  const rawUrl = firstValue(data, [
    'updateUrl', 'downloadUrl', 'url', 'update_url', 'تحديث عنوان URL', 'رابط التحديث', 'رابط_التحديث',
  ]);
  const rawVersion = firstValue(data, [
    'versionName', 'version', 'versionCode', 'version_name', 'رقم الإصدار', 'رقم_الإصدار', 'الإصدار', 'الاصدار',
  ]);

  let downloadUrl = '';
  if (typeof rawUrl === 'string') {
    try {
      const parsedUrl = new URL(rawUrl.trim());
      if (parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:') {
        downloadUrl = parsedUrl.toString();
      }
    } catch {
      // Keep only valid HTTP(S) download links.
    }
  }

  return { downloadUrl, version: rawVersion === undefined ? '' : String(rawVersion).trim() };
};

/**
 * Phone updates use app_config/update_info.
 * TV updates use an independent document, preferring tv_update_config/update_info,
 * then the Arabic collection and app_config/update_info_tv fallbacks.
 */
export const subscribeAppUpdateConfig = (
  onUpdate: (config: AppUpdateConfig) => void,
  onError?: (error: Error) => void,
): (() => void) => {
  const db = getFirebaseDb();
  if (!db) {
    onError?.(new Error('تعذر تهيئة اتصال Firebase.'));
    return () => undefined;
  }

  let mobile = emptyPlatformUpdate();
  const tvPaths = [
    ['tv_update_config', 'update_info'],
    ['تحديث_الشاشة_tv', 'update_info'],
    ['app_config', 'update_info_tv'],
  ] as const;
  const tvSnapshots = tvPaths.map(() => ({
    config: emptyPlatformUpdate(),
    exists: false,
    serverSynced: false,
    error: false,
  }));
  const emit = () => {
    const tvSettled = tvSnapshots.every((snapshot) => snapshot.serverSynced);
    const tvSource = tvSnapshots.find((snapshot) => snapshot.serverSynced && snapshot.exists && snapshot.config.downloadUrl)
      ?? tvSnapshots.find((snapshot) => snapshot.serverSynced && snapshot.exists);
    const tvConfig = tvSource?.config || emptyPlatformUpdate();
    onUpdate({
      mobile,
      tv: {
        ...tvConfig,
        serverSynced: tvSettled,
        error: tvSettled && tvSnapshots.every((snapshot) => snapshot.error),
      },
    });
  };

  const unsubscribers = [onSnapshot(
    doc(db, 'app_config', 'update_info'),
    { includeMetadataChanges: true },
    (snapshot) => {
      const data = snapshot.data() || {};
      mobile = {
        ...readPlatformUpdateConfig(data),
        serverSynced: !snapshot.metadata.fromCache,
        error: false,
      };
      emit();
    },
    () => {
      mobile = emptyPlatformUpdate(true, true);
      emit();
    },
  )];

  tvPaths.forEach(([collectionName, documentName], index) => {
    unsubscribers.push(onSnapshot(
      doc(db, collectionName, documentName),
      { includeMetadataChanges: true },
      (snapshot) => {
        const serverSynced = !snapshot.metadata.fromCache;
        tvSnapshots[index] = {
          config: { ...readPlatformUpdateConfig(snapshot.data() || {}), serverSynced, error: false },
          exists: snapshot.exists(),
          serverSynced,
          error: false,
        };
        emit();
      },
      () => {
        tvSnapshots[index] = { config: emptyPlatformUpdate(true, true), exists: false, serverSynced: true, error: true };
        emit();
      },
    ));
  });

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
};

export interface PreRollAdConfig {
  enabled: boolean;
  adMediaUrls: string[];
  skipAfterSeconds: number;
}

export const DEFAULT_PRE_ROLL_AD_CONFIG: PreRollAdConfig = {
  enabled: true,
  adMediaUrls: [
    'https://www.dismal-library.pro/152327/199275/559492_3f3f4y.mp4',
    'https://www.dismal-library.pro/152327/199275/559492_3f3f4y.webm',
    'https://www.dismal-library.pro/152327/199275/559492_3f3f4y480.mp4',
    'https://www.dismal-library.pro/152327/199275/559492_3f3f4y480.webm',
    'https://www.dismal-library.pro/152327/199275/559492_3f3f4y360.mp4',
    'https://www.dismal-library.pro/152327/199275/559492_3f3f4y360.webm',
  ],
  skipAfterSeconds: 5,
};

const normalizeAdMediaUrl = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value.trim());
    const isSupportedVideo = /\.(mp4|webm)$/i.test(url.pathname);
    return url.protocol === 'https:' && isSupportedVideo ? url.toString() : '';
  } catch {
    return '';
  }
};

export const subscribePreRollAdConfig = (
  onUpdate: (config: PreRollAdConfig) => void,
  onError?: (error: Error) => void,
): (() => void) => {
  const db = getFirebaseDb();
  if (!db) {
    onUpdate(DEFAULT_PRE_ROLL_AD_CONFIG);
    onError?.(new Error('تعذر تهيئة اتصال Firebase لإعدادات الإعلان.'));
    return () => undefined;
  }

  return onSnapshot(
    doc(db, 'app_config', 'preroll_ads'),
    (snapshot) => {
      const data = snapshot.data() || {};
      const hasConfiguredMediaUrls = Array.isArray(data.adMediaUrls);
      const adMediaUrls = hasConfiguredMediaUrls
        ? data.adMediaUrls.map(normalizeAdMediaUrl).filter(Boolean)
        : DEFAULT_PRE_ROLL_AD_CONFIG.adMediaUrls;
      const requestedDelay = Number(data.skipAfterSeconds);
      const skipAfterSeconds = Number.isFinite(requestedDelay)
        ? Math.min(60, Math.max(0, Math.floor(requestedDelay)))
        : DEFAULT_PRE_ROLL_AD_CONFIG.skipAfterSeconds;

      onUpdate({
        enabled: typeof data.enabled === 'boolean' ? data.enabled : true,
        adMediaUrls,
        skipAfterSeconds,
      });
    },
    (error) => {
      onUpdate(DEFAULT_PRE_ROLL_AD_CONFIG);
      onError?.(error);
    },
  );
};

export interface FetchResult {
  media: MediaItem[];
  channels: LiveChannel[];
  folders: FolderItem[];
  source: 'firestore' | 'seed';
  error: string | null;
}

/**
 * STRICTLY READ-ONLY FETCH
 * Reads all 292 works from Firestore collections: vip_media, live_channels, folders.
 * Does NOT perform any writes, modifications, or deletions.
 */
export const fetchAllMediaData = async (): Promise<FetchResult> => {
  try {
    const db = getFirebaseDb();
    if (!db) {
      throw new Error('تعذر تهيئة اتصال Firebase.');
    }

    // 1. Fetch all items from vip_media (Read-only)
    const mediaSnap = await getDocs(collection(db, 'vip_media'));
    const firestoreMedia: MediaItem[] = [];

    mediaSnap.forEach((doc) => {
      const data = doc.data();
      const rawTitle = (data.title || data.name || '').trim();
      const rawEpisodes = Array.isArray(data.episodes) ? data.episodes : [];

      firestoreMedia.push({
        id: doc.id,
        title: rawTitle || 'عمل بدون عنوان',
        type: data.type === 'movie' ? 'movie' : (data.type === 'anime' ? 'anime' : 'tv'),
        posterUrl: data.posterUrl || '',
        backdropUrl: data.backdropUrl || data.posterUrl || '',
        category: data.category ? String(data.category).trim() : 'general',
        parentSeries: data.parentSeries ? String(data.parentSeries).trim() : '',
        seasonName: data.seasonName ? String(data.seasonName).trim() : '',
        hidden: Boolean(data.hidden),
        videoUrl: data.videoUrl || '',
        episodes: rawEpisodes.map((ep: any, idx: number) => ({
          title: ep.title || `الحلقة ${idx + 1}`,
          videoUrl: ep.videoUrl || '',
          hidden: Boolean(ep.hidden),
          duration: ep.duration || '45 دقيقة',
          thumbnail: ep.thumbnail || '',
          overview: ep.overview || '',
          episodeNumber: ep.episodeNumber || idx + 1,
        })),
        folderId: data.folderId ? String(data.folderId).trim() : '',
        year: data.year || '',
        rating: data.rating || '',
        story: data.story || data.description || '',
        cast: Array.isArray(data.cast) ? data.cast : [],
        duration: data.duration,
        quality: data.quality || 'FHD 1080p',
        views: typeof data.views === 'number' ? data.views : 0,
      });
    });

    // 2. Fetch all channels from live_channels (Read-only)
    const liveSnap = await getDocs(collection(db, 'live_channels'));
    const firestoreChannels: LiveChannel[] = [];

    liveSnap.forEach((doc) => {
      const data = doc.data();
      if (data.hidden) return;

      const channelName = (data.nameAr || data.name || data.nameEn || 'قناة بث مباشر').trim();
      firestoreChannels.push({
        id: doc.id,
        name: channelName,
        logoUrl: data.logoUrl || '',
        streamUrl: data.streamUrl || '',
        category: data.category || 'general',
        quality: data.isHd ? 'HD' : (data.quality || 'FHD'),
        currentProgram: data.currentProgram || '',
      });
    });

    // 3. Fetch all folders from folders (Read-only)
    const foldersSnap = await getDocs(collection(db, 'folders'));
    const firestoreFolders: FolderItem[] = [];

    foldersSnap.forEach((doc) => {
      const data = doc.data();
      if (data.hidden) return;

      const folderName = (data.title || data.name || 'مجلد').trim();
      firestoreFolders.push({
        id: doc.id,
        name: folderName,
        icon: data.icon || 'Folder',
        description: data.description || '',
        coverUrl: data.posterUrl || data.coverUrl || '',
        itemCount: typeof data.itemCount === 'number' ? data.itemCount : 0,
      });
    });

    return {
      media: firestoreMedia,
      channels: firestoreChannels,
      folders: firestoreFolders,
      source: 'firestore',
      error: null,
    };
  } catch (err: any) {
    console.error('[Firebase Fetch Live Error]:', err);
    const code = typeof err?.code === 'string' ? err.code.toLowerCase() : '';
    const message = typeof err?.message === 'string' ? err.message : '';
    const isQuotaError =
      code.includes('resource-exhausted') || /quota exceeded|resource exhausted|\b429\b/i.test(message);
    return {
      media: [],
      channels: [],
      folders: [],
      source: 'seed',
      error: isQuotaError
        ? 'رفض Firestore الطلب بسبب تجاوز حصة أو حدّ الطلبات في مشروع Firebase (429). افحص صفحة Usage وQuotas في Firebase/Google Cloud Console؛ هذا الخلل من جهة المشروع وليس خاصاً بمتصفح PlayStation وحده.'
        : message || 'تعذر الاتصال بـ Firestore. تحقق من اتصال الإنترنت أو إعدادات قاعدة البيانات.',
    };
  }
};
