import { useState, useEffect } from 'react';
import { localDb, localAuth } from '../services/storage';
import { Client } from '../types';
import { motion } from 'motion/react';
import { 
  Users, 
  TrendingUp, 
  Zap, 
  Target, 
  ChevronRight,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Cpu,
  Brain,
  Workflow
} from 'lucide-react';

import { useRenderTrace } from '../hooks/useRenderTrace';

interface DashboardProps {
  setCurrentView: (view: 'dashboard' | 'agent' | 'clients' | 'knowledge' | 'journey') => void;
  setSelectedClientId: (id: string | null) => void;
}

export default function Dashboard({ setCurrentView, setSelectedClientId }: DashboardProps) {
  const [clients, setClients] = useState<Client[]>([]);
  
  useRenderTrace('Dashboard', { clientCount: clients.length });
  const [skillCount, setSkillCount] = useState(0);
  const [proposalCount, setProposalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const user = await localAuth.getCurrentUserAsync();
        if (!user) return;

        const clientsData = await localDb.getAll('clients');
        setClients(clientsData);

        const skillsData = await localDb.getAll('skills');
        setSkillCount(skillsData.length);

        const proposalsData = (await localDb.getAll('evolution_proposals')).filter((p: any) => p.status === 'pending');
        setProposalCount(proposalsData.length);
      } catch (error) {
        console.error("Dashboard data fetch failed:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats().catch(err => {
      console.error("[Dashboard] Initial lifecycle fetchStats failed:", err);
      setError("数据加载失败");
    });
  }, []);

  const pendingActionsCount = clients.filter(c => c.nextActionSuggestion && !c.nextActionCompleted).length;
  const nurtureCount = clients.filter(c => ['phase_0', 'phase_1', 'phase_2'].includes(c.stage)).length;
  const alignmentCount = clients.filter(c => ['phase_3', 'phase_4', 'phase_5', 'phase_6', 'phase_7'].includes(c.stage)).length;

  const stats = [
    { label: '战略资产总数', value: clients.length.toString(), icon: Users, color: 'text-blue-600' },
    { label: '认知培养期 (P0-2)', value: nurtureCount.toString(), icon: Zap, color: 'text-amber-600' },
    { label: '决策对齐期 (P3-7)', value: alignmentCount.toString(), icon: TrendingUp, color: 'text-emerald-600' },
    { label: '待执行行动建议', value: pendingActionsCount.toString(), icon: Target, color: 'text-purple-600', highlight: pendingActionsCount > 0 },
  ];

  const quickActions = [
    { title: '分析新客户', desc: '识别潜在瓶颈并生成定制化营销战略', view: 'clients' },
    { title: '認知旅程合成', desc: '針對早期階段的「認知引導」路由', view: 'journey' },
    { title: '更新知识库', desc: '同步最新的行业文档以供 AI 深度学习', view: 'knowledge' },
    { title: '生成营销资产', desc: '快速创建 PPT、报告以及 AI 提示词', view: 'clients' },
  ];

  // 计算当前周的所有日期 (周一至周日)
  const [weekOffset, setWeekOffset] = useState(0);
  const today = new Date();
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    // 增加偏移量来支持切换周
    d.setDate(d.getDate() + weekOffset * 7);
    const day = d.getDay();
    // 调整为周一作为一周的开始
    const diff = d.getDate() - (day === 0 ? 6 : day - 1) + i;
    return new Date(d.setDate(diff));
  });

  const getActionsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return clients.filter(c => {
      if (!c.nextActionSuggestion || c.nextActionCompleted || !c.nextActionDate) return false;
      let actionDate;
      if (typeof (c.nextActionDate as any).toDate === 'function') {
        actionDate = (c.nextActionDate as any).toDate();
      } else {
        actionDate = new Date(c.nextActionDate as any);
      }
      return actionDate.toISOString().split('T')[0] === dateStr;
    });
  };

  return (
    <div className="space-y-10">
      {/* Welcome Section */}
      <section>
        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
          <Sparkles className="w-3 h-3 text-blue-500" />
          神经营销引擎 v2.1
        </div>
        <h1 className="text-4xl font-bold text-[#1A1C1E] leading-tight flex flex-col">
          <span className="text-gray-400 font-medium text-lg mb-1 tracking-normal">战略决策中心</span>
          当前营销概览
        </h1>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start mb-6">
              <div className={`p-3 rounded-2xl bg-gray-50 ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Live</span>
            </div>
            <div className="text-3xl font-bold mb-1 tracking-tight">{stat.value}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Cognitive Agent Entry Card */}
      <section>
        <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           onClick={() => setCurrentView('agent')}
           className="bg-[#1A1C1E] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden group cursor-pointer"
        >
           {/* Background Pulse Decor */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none group-hover:bg-blue-600/10 transition-all duration-1000" />
           
           <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="flex items-center gap-8">
                 <div className="relative">
                    <div className="w-24 h-24 rounded-3xl bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-600/40 relative z-10">
                       <Brain className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -inset-2 bg-blue-600/20 rounded-[2rem] animate-pulse" />
                 </div>
                 
                 <div>
                    <div className="flex items-center gap-3 mb-2">
                       <h2 className="text-2xl font-bold text-white">认知型 Agent 决策中心</h2>
                       <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-[0.2em] rounded border border-blue-500/30">Active</span>
                    </div>
                    <p className="text-gray-400 text-sm max-w-md leading-relaxed">
                       神经网络已连接 Layer 1 记忆系统。当前 Agent 拥有 <span className="text-white font-bold">{skillCount}</span> 个核心技能，发现 <span className="text-blue-400 font-bold">{proposalCount}</span> 个待处理进化提案。
                    </p>
                 </div>
              </div>

              <div className="flex items-center gap-4">
                 <div className="hidden lg:flex items-center gap-8 px-8 border-x border-white/5">
                    <div className="text-center">
                       <div className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">进化水平</div>
                       <div className="text-xl font-bold text-white flex items-center gap-2 justify-center">
                          <Zap className="w-4 h-4 text-amber-500" />
                          Lv.{(Math.floor(skillCount / 5) + 1)}
                       </div>
                    </div>
                    <div className="text-center">
                       <div className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">认知容量</div>
                       <div className="text-xl font-bold text-white">98%</div>
                    </div>
                 </div>

                 <button className="bg-white text-[#1A1C1E] px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-600 hover:text-white transition-all flex items-center gap-3 shadow-xl">
                    进入深度推理 <ArrowRight className="w-4 h-4" />
                 </button>
              </div>
           </div>
        </motion.div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Quick Actions */}
        <section className="lg:col-span-2 space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">优先操作建议</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quickActions.map((action) => (
              <button
                key={action.title}
                onClick={() => setCurrentView(action.view as any)}
                className="group flex flex-col items-start text-left p-8 bg-white border border-gray-200 rounded-3xl hover:border-blue-600 transition-all relative overflow-hidden shadow-sm"
              >
                <div className="absolute -top-4 -right-4 p-8 bg-blue-50 rounded-full opacity-0 group-hover:opacity-100 transition-all text-blue-600">
                  <ArrowRight className="w-8 h-8 -rotate-45" />
                </div>
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2 group-hover:text-blue-600">
                  {action.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {action.desc}
                </p>
                <div className="mt-8 flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                  启动协议 <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Pending Actions Weekly Calendar */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">战略执行周历</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setWeekOffset(prev => prev - 1)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                title="上一周"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
              <button 
                onClick={() => setWeekOffset(0)}
                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest transition-colors ${weekOffset === 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 hover:text-gray-600'}`}
              >
                Today
              </button>
              <button 
                onClick={() => setWeekOffset(prev => prev + 1)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                title="下一周"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-[2.5rem] p-6 shadow-sm flex flex-col">
            {weekDates.map((date, index) => {
              const actions = getActionsForDate(date);
              const isToday = today.toISOString().split('T')[0] === date.toISOString().split('T')[0];
              const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
              
              return (
                <div 
                  key={index} 
                  className={`flex items-start gap-4 py-4 border-b border-gray-50 last:border-0 ${isToday ? 'bg-blue-50/30 -mx-3 px-3 rounded-2xl border-none my-1' : ''}`}
                >
                  <div className="flex flex-col items-center min-w-[36px] pt-1">
                    <span className={`text-[9px] font-black uppercase tracking-tighter ${isToday ? 'text-blue-600' : 'text-gray-300'}`}>
                      {dayNames[date.getDay()]}
                    </span>
                    <span className={`text-base font-bold leading-none mt-1 ${isToday ? 'text-blue-700' : 'text-gray-900'}`}>
                      {date.getDate()}
                    </span>
                  </div>
                  
                  <div className="flex-1 flex flex-wrap gap-2 pt-1.5">
                    {actions.length > 0 ? (
                      actions.map(action => (
                        <motion.div 
                          key={action.id}
                          whileHover={{ scale: 1.02 }}
                          onClick={() => {
                            setSelectedClientId(action.id);
                            setCurrentView('clients');
                          }}
                          className="px-3 py-1.5 bg-white border border-gray-100 rounded-xl text-[10px] font-bold text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-all cursor-pointer shadow-sm shadow-black/5 truncate max-w-full"
                        >
                          {action.company}
                        </motion.div>
                      ))
                    ) : (
                      <div className="h-6 w-full max-w-[80px] bg-gray-50/50 rounded-xl border border-dashed border-gray-100" />
                    )}
                  </div>

                  {isToday && (
                    <div className="mt-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                    </div>
                  )}
                </div>
              );
            })}

            {clients.filter(c => c.nextActionSuggestion && !c.nextActionCompleted).length === 0 && (
              <div className="py-20 text-center flex flex-col items-center gap-4 opacity-30">
                <CheckCircle2 className="w-12 h-12 text-blue-500" />
                <p className="text-[10px] font-bold uppercase tracking-widest">无待办执行项</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
