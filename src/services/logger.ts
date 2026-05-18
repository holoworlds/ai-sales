
import { localDb } from './storage';
import { ErrorLog } from '../types';

const LOG_COLLECTION = 'errorLogs';
const STORAGE_KEY = '_crash_logs';
const MAX_LOGS = 200;
const MAX_STORAGE_LOGS = 50;

interface StateTracker {
  lastClickEvent?: ErrorLog['lastClickEvent'];
  lastSetState?: ErrorLog['lastSetState'];
  lastPromiseReject?: ErrorLog['lastPromiseReject'];
  currentRoute?: string;
  currentView?: string;
  appState?: any;
}

const tracker: StateTracker = {};

export const AppLogger = {
  trackClick: (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    tracker.lastClickEvent = {
      tag: target.tagName,
      id: target.id,
      className: target.className,
      text: target.innerText?.substring(0, 50),
      timestamp: Date.now()
    };
  },

  trackSetState: (component: string) => {
    tracker.lastSetState = {
      component,
      timestamp: Date.now()
    };
  },

  trackPromiseReject: (reason: any) => {
    tracker.lastPromiseReject = {
      reason,
      timestamp: Date.now()
    };
  },

  updateContext: (route?: string, view?: string, state?: any) => {
    if (route) tracker.currentRoute = route;
    if (view) tracker.currentView = view;
    if (state) tracker.appState = state;
  },

  // Synchronous fallback for critical crashes
  logToLocalStorage: (level: string, message: string, extra?: any) => {
    try {
      const logs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      logs.push({
        timestamp: Date.now(),
        level,
        message,
        extra,
        url: typeof window !== 'undefined' ? window.location.href : 'N/A',
        view: tracker.currentView,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'
      });
      
      if (logs.length > MAX_STORAGE_LOGS) logs.shift();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch (e) {
      // Ignore storage errors (quota etc)
    }
  },

  logError: async (error: Error, extra?: Partial<ErrorLog>) => {
    const message = error.message || String(error);
    
    // 1. Immediate sync write to localStorage (most reliable for crashes)
    AppLogger.logToLocalStorage('CRITICAL_ERROR', message, { 
      stack: error.stack,
      ...extra 
    });

    const log: Omit<ErrorLog, 'id'> = {
      message: message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      route: tracker.currentRoute,
      view: tracker.currentView,
      state: tracker.appState,
      lastClickEvent: tracker.lastClickEvent,
      lastSetState: tracker.lastSetState,
      lastPromiseReject: tracker.lastPromiseReject,
      browserInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform
      },
      ...extra
    };

    try {
      console.error('[AppLogger] Logging error:', log);
      await localDb.add(LOG_COLLECTION, log);
      
      // Cleanup: maintain last MAX_LOGS
      const logs = await localDb.getAll(LOG_COLLECTION);
      if (logs.length > MAX_LOGS) {
        // Simple cleanup: delete the oldest ones beyond MAX_LOGS
        // Note: logs are saved with createdAt by localDb.add
        const sorted = logs.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const toDelete = sorted.slice(0, logs.length - MAX_LOGS);
        for (const item of toDelete) {
          await localDb.delete(LOG_COLLECTION, item.id);
        }
      }
    } catch (err) {
      console.error('[AppLogger] Failed to save log to localDb:', err);
    }
  },

  getLogs: async () => {
    return await localDb.getAll(LOG_COLLECTION);
  },

  getCrashLogs: () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  },

  clearLogs: async () => {
    const logs = await localDb.getAll(LOG_COLLECTION);
    for (const log of logs) {
      await localDb.delete(LOG_COLLECTION, log.id);
    }
    localStorage.removeItem(STORAGE_KEY);
  }
};

// Global Listeners
if (typeof window !== 'undefined') {
  window.addEventListener('click', (e) => AppLogger.trackClick(e), true);
  
  // Use addEventListener for more robust listener stacking
  window.addEventListener('error', (event) => {
    AppLogger.logError(event.error || new Error(event.message || 'Unknown window error'), {
      message: event.message,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    AppLogger.trackPromiseReject(event.reason);
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    AppLogger.logError(error, {
      lastPromiseReject: {
        reason: event.reason,
        timestamp: Date.now()
      }
    });
  });

  // Intercept console.error to capture logged errors
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    originalConsoleError.apply(console, args);
    const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    AppLogger.logToLocalStorage('CONSOLE_ERROR', message);
  };
}
