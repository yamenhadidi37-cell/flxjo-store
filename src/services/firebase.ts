import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  doc,
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

export interface FetchResult {
  media: MediaItem[];
  channels: LiveChannel[];
  folders: FolderItem[];
  source: 'static' | 'seed';
  error: string | null;
}

/**
 * Read the build-generated catalog snapshot. Visitors do not query the full
 * Firestore collections, which avoids spending the project's daily read quota
 * once per browser visit and works around console-browser transport limits.
 */
export const fetchAllMediaData = async (): Promise<FetchResult> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const response = await Promise.race([
      fetch('/data/catalog.json', { cache: 'no-cache' }),
      new Promise<Response>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('انتهت مهلة تحميل نسخة الكتالوج.')), 10000);
      }),
    ]);
    if (!response.ok) throw new Error(`تعذر تحميل نسخة الكتالوج (${response.status}).`);

    const catalog = await response.json() as {
      schemaVersion?: number;
      media?: MediaItem[];
      channels?: LiveChannel[];
      folders?: FolderItem[];
    };
    if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.media) || catalog.media.length === 0) {
      throw new Error('نسخة الكتالوج المنشورة غير صالحة أو لا تحتوي على أعمال.');
    }

    return {
      media: catalog.media,
      channels: Array.isArray(catalog.channels) ? catalog.channels : [],
      folders: Array.isArray(catalog.folders) ? catalog.folders : [],
      source: 'static',
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '';
    return {
      media: [],
      channels: [],
      folders: [],
      source: 'seed',
      error: message || 'نسخة بيانات المكتبة غير متوفرة حالياً على الموقع. يرجى المحاولة لاحقاً.',
    };
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
};
