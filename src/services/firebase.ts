import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
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
  return localStorage.getItem(STORAGE_KEY_API_KEY) || DEFAULT_FIREBASE_CONFIG.apiKey;
};

export const setStoredApiKey = (key: string): void => {
  if (key && key.trim()) {
    localStorage.setItem(STORAGE_KEY_API_KEY, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_API_KEY);
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
      firestoreInstance = getFirestore(app);
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
  serverSynced: boolean;
}

export interface PlatformUpdateConfig {
  downloadUrl: string;
  version: string;
}

const firstValue = (data: Record<string, unknown>, fields: string[]): unknown => {
  for (const field of fields) {
    const value = data[field];
    if (value !== undefined && value !== null && String(value).trim()) return value;
  }
  return undefined;
};

const firstMatchingValue = (data: Record<string, unknown>, tokens: string[], valueTokens: string[]): unknown => {
  const match = Object.entries(data).find(([key, value]) => {
    const normalizedKey = key.toLocaleLowerCase().replace(/[\s_-]+/g, '');
    return tokens.some((token) => normalizedKey.includes(token))
      && valueTokens.some((token) => normalizedKey.includes(token))
      && ((typeof value === 'string' && value.trim()) || typeof value === 'number');
  });
  return match?.[1];
};

const readPlatformUpdateConfig = (
  data: Record<string, unknown>,
  nestedFields: string[],
  urlFields: string[],
  versionFields: string[],
): PlatformUpdateConfig => {
  const nested = nestedFields
    .map((field) => data[field])
    .find((value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value));
  const rawUrl = firstValue(data, urlFields)
    ?? (nested ? firstValue(nested, ['updateUrl', 'downloadUrl', 'url', 'تحديث عنوان URL']) : undefined)
    ?? firstMatchingValue(data, nestedFields, ['url', 'رابط', 'تحديث']);
  const rawVersion = firstValue(data, versionFields)
    ?? (nested ? firstValue(nested, ['versionName', 'version', 'versionCode']) : undefined)
    ?? firstMatchingValue(data, nestedFields, ['version', 'versionname', 'versioncode', 'إصدار', 'اصدار', 'نسخة']);

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

  return {
    downloadUrl,
    version: rawVersion === undefined ? '' : String(rawVersion).trim(),
  };
};

const readAppUpdateConfig = (data: Record<string, unknown>): Omit<AppUpdateConfig, 'serverSynced'> => ({
  mobile: readPlatformUpdateConfig(
    data,
    ['mobile', 'phone', 'androidMobile', 'هاتف', 'الهاتف', 'موبايل', 'تحديث_الهاتف', 'تحديث الهاتف'],
    ['mobileUpdateUrl', 'phoneUpdateUrl', 'androidMobileUpdateUrl', 'mobileDownloadUrl', 'phoneDownloadUrl', 'رابط_تحديث_الهاتف', 'رابط تحديث الهاتف', 'تحديث_الهاتف_URL', 'رابط الهاتف'],
    ['mobileVersionName', 'phoneVersionName', 'androidMobileVersionName', 'mobileVersion', 'phoneVersion', 'mobileVersionCode', 'phoneVersionCode', 'إصدار_الهاتف', 'اصدار_الهاتف', 'رقم_إصدار_الهاتف'],
  ),
  tv: readPlatformUpdateConfig(
    data,
    ['tv', 'androidTv', 'screen', 'television', 'شاشة', 'الشاشة', 'تلفاز', 'التلفاز', 'تلفزيون', 'تحديث_الشاشة', 'تحديث الشاشة', 'تحديث_التلفاز'],
    ['tvUpdateUrl', 'androidTvUpdateUrl', 'screenUpdateUrl', 'tvDownloadUrl', 'رابط_تحديث_الشاشة', 'رابط تحديث الشاشة', 'تحديث_الشاشة_URL', 'رابط_تحديث_التلفاز', 'رابط التلفاز'],
    ['tvVersionName', 'androidTvVersionName', 'screenVersionName', 'tvVersion', 'androidTvVersion', 'tvVersionCode', 'androidTvVersionCode', 'إصدار_الشاشة', 'اصدار_الشاشة', 'رقم_إصدار_الشاشة'],
  ),
});

/** Listen for live changes to the app's download URL and version in Firestore. */
export const subscribeAppUpdateConfig = (
  onUpdate: (config: AppUpdateConfig) => void,
  onError?: (error: Error) => void,
): (() => void) => {
  const db = getFirebaseDb();
  if (!db) {
    onError?.(new Error('تعذر تهيئة اتصال Firebase.'));
    return () => undefined;
  }

  return onSnapshot(
    doc(db, 'app_config', 'تحديث_المعلومات'),
    { includeMetadataChanges: true },
    (snapshot) => onUpdate({
      ...readAppUpdateConfig(snapshot.data() || {}),
      serverSynced: !snapshot.metadata.fromCache,
    }),
    (error) => onError?.(error),
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
    return {
      media: [],
      channels: [],
      folders: [],
      source: 'seed',
      error: err.message || 'حدث خطأ أثناء جلب البيانات من Firebase.',
    };
  }
};
