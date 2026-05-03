import { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
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
  Clock
} from 'lucide-react';

interface DashboardProps {
  setCurrentView: (view: 'dashboard' | 'clients' | 'knowledge' | 'journey') => void;
}

export default function Dashboard({ setCurrentView }: DashboardProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'clients'),
      where('ownerId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
      setClients(data);
      setLoading(false);
    });

    return () => unsubscribe();
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

        {/* Pending Actions */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">待执行战略行动</h2>
            <button onClick={() => setCurrentView('clients')} className="text-[10px] font-bold text-blue-600 hover:underline">查看全部</button>
          </div>
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-6 overflow-hidden">
            {clients.filter(c => c.nextActionSuggestion && !c.nextActionCompleted).slice(0, 5).map((client) => (
              <div 
                key={client.id} 
                onClick={() => setCurrentView('clients')}
                className="flex gap-4 items-start group cursor-pointer border-b border-gray-50 last:border-0 pb-6 last:pb-0"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <div className="text-[10px] font-black">{client.company.charAt(0)}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-tight truncate">{client.company}</div>
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed opacity-70">{client.nextActionSuggestion}</div>
                  <div className="flex items-center gap-2 mt-3 text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded">
                    <Clock className="w-2.5 h-2.5" />
                    建议执行: {client.nextActionDate?.toDate ? client.nextActionDate.toDate().toLocaleDateString() : '待定'}
                  </div>
                </div>
              </div>
            ))}
            {clients.filter(c => c.nextActionSuggestion && !c.nextActionCompleted).length === 0 && (
              <div className="py-20 text-center flex flex-col items-center gap-4 opacity-30">
                <CheckCircle2 className="w-12 h-12 text-blue-500" />
                <p className="text-[10px] font-bold uppercase tracking-widest">所有建议行动已完成</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
