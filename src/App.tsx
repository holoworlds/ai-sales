import { useState, useEffect } from 'react';
import { localAuth } from './services/storage';
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
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Dashboard from './components/Dashboard';
import StrategicAdvisor from './components/StrategicAdvisor';
import ClientManager from './components/ClientManager';
import KnowledgeBase from './components/KnowledgeBase';
import JourneyGenerator from './components/JourneyGenerator';

type View = 'dashboard' | 'agent' | 'clients' | 'knowledge' | 'journey';

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
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    localStorage.setItem('nexus_current_view', currentView);
  }, [currentView]);

  useEffect(() => {
    if (selectedClientId) {
      localStorage.setItem('nexus_selected_client_id', selectedClientId);
    } else {
      localStorage.removeItem('nexus_selected_client_id');
    }
  }, [selectedClientId]);

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('App Runtime Error:', error);
      // Capture error details for the user
      const errorMsg = error.error?.message || error.message || 'Unknown Error';
      setHasError(errorMsg as any);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
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
      const u = await localAuth.getCurrentUserAsync();
      setUser(u);
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const logoutLocal = () => {
    setUser(null);
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

  if (hasError) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <X className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">系统遇到一个关键性错误</h2>
        <p className="text-gray-500 mb-4 max-w-md">当前渲染过程中发生了未预期的异常。为了保护您的数据安全，系统已进入防护模式。</p>
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl mb-6 max-w-md w-full">
           <p className="text-[10px] font-mono text-red-600 break-words line-clamp-4">
             {typeof hasError === 'string' ? hasError : '发生未知渲染错误'}
           </p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs"
        >
          尝试重新激活
        </button>
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

  return (
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
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
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
          </AnimatePresence>
        </div>

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
  );
}
