import { useState, useEffect, Component, ReactNode } from 'react';
import { localAuth } from './services/storage';
import { AppLogger } from './services/logger';
import { ErrorLog } from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useRenderTrace } from './hooks/useRenderTrace';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
  Sparkles,
  Search,
  Bell,
  Cpu,
  History
} from 'lucide-react';
import { motion } from 'motion/react';
import Dashboard from './components/Dashboard';
import StrategicAdvisor from './components/StrategicAdvisor';
import ClientManager from './components/ClientManager';
import KnowledgeBase from './components/KnowledgeBase';
import JourneyGenerator from './components/JourneyGenerator';

type View = 'dashboard' | 'agent' | 'clients' | 'knowledge' | 'journey';

// Simplified Error Boundary for functional app structure
class LocalErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Component Error Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 border border-red-100 rounded-2xl">
          <h3 className="text-red-900 font-bold mb-2">组件渲染异常</h3>
          <p className="text-red-700 text-sm mb-4">{this.state.error?.message || '未知错误'}</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold"
          >
            重试该件
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>(() => {
    const saved = localStorage.getItem('nexus_current_view');
    return (saved as View) || 'dashboard';
  });
  const [selectedClientId, setSelectedClientId] = useState<string | null>(() => {
    return localStorage.getItem('nexus_selected_client_id');
  });
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [persistentLogs, setPersistentLogs] = useState<ErrorLog[]>([]);

  useRenderTrace('App', { currentView, selectedClientId, user: !!user });

  useEffect(() => {
    AppLogger.updateContext(undefined, currentView, { user: user?.uid });
  }, [currentView, user]);

  useEffect(() => {
    localStorage.setItem('nexus_current_view', currentView);
  }, [currentView]);

  useEffect(() => {
    if (showDebugPanel) {
      AppLogger.getLogs().then(logs => {
        setPersistentLogs(logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      });
    }
  }, [showDebugPanel]);

  useEffect(() => {
    if (selectedClientId) {
      localStorage.setItem('nexus_selected_client_id', selectedClientId);
    } else {
      localStorage.removeItem('nexus_selected_client_id');
    }
  }, [selectedClientId]);

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      // Ignore some non-critical SES warnings or known benign errors
      if (error.message?.includes('SES Removing unpermitted intrinsics')) {
        return;
      }
      
      AppLogger.logError(error.error || new Error(error.message), {
        message: error.message,
        browserInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform
        }
      });
    };

    const handlePromiseRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled Promise Rejection:', event.reason);
      AppLogger.trackPromiseReject(event.reason);
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      AppLogger.logError(error);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handlePromiseRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
    };
  }, []);

  useEffect(() => {
    console.log(`[Nav] View changed to: ${currentView}`);
  }, [currentView]);

  useEffect(() => {
    // Async local auth check
    const checkAuth = async () => {
      try {
        const u = await localAuth.getCurrentUserAsync();
        setUser(u);
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const loginLocal = async () => {
    setLoading(true);
    try {
      const u = await localAuth.login();
      setUser(u);
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const logoutLocal = async () => {
    try {
      await localAuth.logout();
      setUser(null);
    } catch (err) {
      console.error("Logout error:", err);
      setUser(null);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F5F7FA]">
        <motion.div 
          animate={{ opacity: [0.5, 1, 0.5] }} 
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-[#1A1C1E] font-sans text-sm font-bold uppercase tracking-widest flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Sparkles className="w-6 h-6 text-white animate-pulse" />
          </div>
          系统初始化中...
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F5F7FA] p-6 relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-[radial-gradient(circle_at_top_right,_rgba(37,99,235,0.05)_0%,_transparent_70%)]" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-[radial-gradient(circle_at_bottom_left,_rgba(37,99,235,0.05)_0%,_transparent_70%)]" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white border border-gray-200 rounded-3xl p-10 shadow-xl relative z-10"
        >
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#1A1C1E]">Nexus AI</h1>
              <p className="text-[10px] uppercase tracking-widest text-blue-600 font-bold">B2B 企业级智能门户</p>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold mb-4">欢迎回来</h2>
          
          <p className="text-sm text-gray-500 mb-10 leading-relaxed">
            访问您的智能营销指挥中心。自动化知识学习、客户关系维护及内容生成。
          </p>

          <button 
            id="google-login-btn"
            onClick={loginLocal}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white py-4 rounded-2xl font-bold text-sm tracking-wide hover:bg-blue-700 transition-all group shadow-lg shadow-blue-100"
          >
            使用 Google 账号登录
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <div className="mt-10 pt-8 border-t border-gray-100 flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
            <span className="flex items-center gap-1.5 font-sans font-bold uppercase tracking-tighter text-blue-600">
               <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
               v2.1.0-稳定版
            </span>
            <span>加密会话</span>
          </div>
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: '控制中心', icon: LayoutDashboard },
    { id: 'agent', label: '认知演进', icon: Cpu },
    { id: 'clients', label: '客户资产', icon: Users },
    { id: 'journey', label: '认知旅程', icon: Sparkles },
    { id: 'knowledge', label: '智能知识库', icon: BookOpen },
  ];

  // Main Content
  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-[#F5F7FA] text-[#1A1C1E] font-sans selection:bg-blue-600 selection:text-white">
        {/* Sidebar */}
        <motion.aside 
          initial={false}
          animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
          className="bg-white border-r border-gray-200 flex flex-col overflow-hidden"
        >
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-bold uppercase tracking-tight text-lg">Nexus</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-gray-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as View)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all ${
                currentView === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className={`w-5 h-5 ${currentView === item.id ? 'text-white' : ''}`} />
              {isSidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl mb-4 overflow-hidden border border-gray-100">
            <img src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`} className="w-10 h-10 rounded-xl border border-white shadow-sm shrink-0" alt="Profile" />
            <div className="overflow-hidden">
              <p className="text-[10px] font-bold uppercase truncate text-gray-400 tracking-wider mb-0.5">{user.email}</p>
              <p className="text-sm font-bold truncate leading-none">{user.displayName}</p>
            </div>
          </div>
          <button
            onClick={logoutLocal}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>退出登录</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-6">
            {!isSidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-50 rounded-lg">
                <Menu className="w-5 h-5 text-gray-400" />
              </button>
            )}
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">系统状态</span>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-500">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  自主进化中 (活跃)
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
              <input 
                type="text" 
                placeholder="搜索资源..." 
                className="bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 outline-none pl-10 pr-4 py-2 text-sm rounded-xl w-64 transition-all"
              />
            </div>
            <button className="p-2 hover:bg-gray-50 rounded-xl relative group">
              <Bell className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full border-2 border-white" />
            </button>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {currentView === 'dashboard' && (
              <Dashboard 
                setCurrentView={setCurrentView} 
                setSelectedClientId={setSelectedClientId} 
              />
            )}
            {currentView === 'agent' && (
              <StrategicAdvisor 
                setCurrentView={setCurrentView} 
                setSelectedClientId={setSelectedClientId} 
              />
            )}
            {currentView === 'clients' && (
              <ClientManager 
                initialClientId={selectedClientId} 
                onClientClear={() => setSelectedClientId(null)} 
              />
            )}
            {currentView === 'knowledge' && <KnowledgeBase />}
            {currentView === 'journey' && <JourneyGenerator />}
          </motion.div>
        </div>

        {/* Debug Panel Toggle */}
        <button 
          onClick={() => setShowDebugPanel(!showDebugPanel)}
          className="fixed bottom-4 right-4 z-[9999] w-10 h-10 bg-gray-900 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
        >
          <History className="w-5 h-5" />
        </button>

        {showDebugPanel && (
          <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-end justify-end p-4 pointer-events-none">
            <div className="w-full max-w-2xl h-[80vh] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-800/50">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-400" /> 
                  Nexus 持久化黑匣子 (Persistent Error Logs)
                </h3>
                <div className="flex gap-2">
                  <button 
                    onClick={async () => {
                      if (confirm('确定要清空所有持久化日志吗？')) {
                        await AppLogger.clearLogs();
                        setPersistentLogs([]);
                      }
                    }}
                    className="px-3 py-1 bg-red-900/30 text-red-400 border border-red-800 rounded-lg text-xs font-bold"
                  >
                    清除日志
                  </button>
                  <button 
                    onClick={() => setShowDebugPanel(false)}
                    className="p-1 text-gray-500 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 font-mono text-[11px] space-y-4 no-scrollbar">
                {persistentLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-20 italic">
                    暂无持久化错误记录
                  </div>
                ) : (
                  persistentLogs.map((log) => (
                    <div key={log.id} className="p-4 rounded-xl border border-white/5 bg-white/5 space-y-3">
                      <div className="flex justify-between items-start opacity-50 text-[9px] font-black uppercase tracking-widest">
                        <span className="text-red-400 font-bold">{new Date(log.timestamp).toLocaleString()}</span>
                        <span>View: {log.view || 'N/A'}</span>
                      </div>
                      <div className="text-gray-100 font-bold text-xs">{log.message}</div>
                      
                      {log.lastClickEvent && (
                        <div className="p-2 bg-blue-500/10 rounded border border-blue-500/20 text-blue-300 text-[10px]">
                           Last Click: [{log.lastClickEvent.tag}] {log.lastClickEvent.text}
                        </div>
                      )}

                      {log.stack && (
                        <details className="cursor-pointer group">
                          <summary className="text-gray-500 hover:text-gray-300 transition-colors">View Stack Trace</summary>
                          <pre className="mt-2 text-red-400/60 overflow-x-auto p-3 bg-black/40 rounded-lg text-[9px]">
                            {log.stack}
                          </pre>
                        </details>
                      )}

                      {log.componentStack && (
                         <details className="cursor-pointer group">
                           <summary className="text-gray-500 hover:text-gray-300 transition-colors">View Component Stack</summary>
                           <pre className="mt-2 text-indigo-400/60 overflow-x-auto p-3 bg-black/40 rounded-lg text-[9px]">
                             {log.componentStack}
                           </pre>
                         </details>
                      )}

                      <div className="flex gap-4 opacity-40 text-[8px] uppercase tracking-tighter">
                        <span>UA: {log.browserInfo.userAgent.substring(0, 30)}...</span>
                        <span>State Object: {log.state ? 'YES' : 'NO'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="h-10 bg-white border-t border-gray-200 px-8 flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-widest shrink-0">
          <div className="flex gap-6">
             <span className="text-gray-500">版本 2.1.0-稳定版</span>
             <span className="text-blue-500">知识库同步: 100% 已完成</span>
          </div>
          <div className="flex gap-4">
             <span className="text-gray-900">© 2024 NEXUS B2B 智能系统</span>
          </div>
        </footer>
      </main>
    </div>
  </ErrorBoundary>
);
}
