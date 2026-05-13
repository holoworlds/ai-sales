
export interface DebugLog {
  timestamp: string;
  type: 'ERROR' | 'PROMISE' | 'ACTION' | 'RENDER' | 'NAV' | 'STATE';
  message: string;
  details: any;
  route?: string;
}

class DebugService {
  private logs: DebugLog[] = [];
  private readonly MAX_LOGS = 200;
  private lastAction: string = '';

  constructor() {
    this.loadFromStorage();
    this.initGlobalHandlers();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('nexus_debug_logs');
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (e) {
      this.logs = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('nexus_debug_logs', JSON.stringify(this.logs.slice(-this.MAX_LOGS)));
    } catch (e) {
      // 溢出处理
      if (this.logs.length > 50) {
        this.logs = this.logs.slice(-50);
        this.saveToStorage();
      }
    }
  }

  public log(type: DebugLog['type'], message: string, details: any = {}) {
    const logEntry: DebugLog = {
      timestamp: new Date().toISOString(),
      type,
      message,
      details,
      route: window.location.hash || window.location.pathname
    };
    
    this.logs.push(logEntry);
    console.log(`[DEBUG][${type}] ${message}`, details);
    this.saveToStorage();
  }

  public setLastAction(action: string) {
    this.lastAction = action;
  }

  public getLogs() {
    return this.logs;
  }

  public clearLogs() {
    this.logs = [];
    localStorage.removeItem('nexus_debug_logs');
  }

  private initGlobalHandlers() {
    if (typeof window === 'undefined') return;

    window.onerror = (message, source, lineno, colno, error) => {
      this.log('ERROR', 'Global JS Error', {
        message: String(message),
        source,
        lineno,
        colno,
        stack: error?.stack,
        lastAction: this.lastAction,
        userAgent: navigator.userAgent
      });
    };

    window.addEventListener('unhandledrejection', (event) => {
      this.log('PROMISE', 'Unhandled Promise Rejection', {
        reason: event.reason,
        lastAction: this.lastAction,
        stack: event.reason instanceof Error ? event.reason.stack : null
      });
    });

    // 追踪点击
    window.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      this.setLastAction(`Click: ${target.tagName}#${target.id}.${target.className} text:${target.innerText?.slice(0, 20)}`);
      this.log('ACTION', 'User Click', {
        tag: target.tagName,
        id: target.id,
        classes: target.className,
        text: target.innerText?.slice(0, 50)
      });
    }, true);
  }
}

export const debugService = new DebugService();
