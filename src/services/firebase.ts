import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
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
