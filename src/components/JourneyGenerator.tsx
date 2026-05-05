import { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { Client } from '../types';
import { generateClientJourney } from '../services/gemini';
import { 
  Zap, 
  Sparkles, 
  RefreshCw,
  Search,
  Users,
  ChevronRight,
  FileText,
  Copy,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

export default function JourneyGenerator() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [genReqs, setGenReqs] = useState('');
  const [journeyHotTopics, setJourneyHotTopics] = useState('');
  const [generatingContent, setGeneratingContent] = useState(false);
  const [generatedJourney, setGeneratedJourney] = useState<any>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'clients'), 
      where('ownerId', '==', auth.currentUser.uid),
      orderBy('updatedAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client)));
    });
    return unsub;
  }, []);

  const handleGenerateContent = async () => {
    setGeneratingContent(true);
    setGeneratedJourney(null);
    try {
      const clientContext = selectedClient ? JSON.stringify(selectedClient) : "General B2B Context";
      const journey = await generateClientJourney(genReqs, journeyHotTopics, clientContext);
      setGeneratedJourney(journey);

      // If a client is selected, also save to their assets
      if (selectedClient && auth.currentUser) {
        const stepsBody = (journey.journeySteps || []).map((s: any) => 
          `#### ${s.step || '步骤'}\n**策略:** ${s.strategy || '待定'}\n**建议话术:** \n> ${s.scripts || '无'}\n**推荐内容:** ${s.recommendedContent || '无'}\n`
        ).join('\n---\n');

        const successBody = (journey.successSignals || []).map((s: any) => `- ${s}`).join('\n');
        const riskBody = (journey.riskSignals || []).map((s: any) => `- ${s}`).join('\n');

        await addDoc(collection(db, 'clients', selectedClient.id, 'content'), {
          title: `GEO Cognitive Journey (${journey.currentSimulatedStage || 'Unknown'}) - ${new Date().toLocaleDateString()}`,
          type: 'Journey',
          body: `### 模拟当前阶段: ${journey.currentSimulatedStage || '未知'}\n\n` +
                 `### 总体战术导图摘要\n${journey.summary || '无摘要'}\n\n` + 
                 `### 认知旅程核心步骤\n` + stepsBody +
                 `\n### 成功信号\n` + successBody +
                 `\n### 风险信号\n` + riskBody,
          ownerId: auth.currentUser.uid,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingContent(false);
    }
  };

  const filteredClients = clients.filter(c => 
    c.company.toLowerCase().includes(search.toLowerCase()) || 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1A1C1E] mb-2 flex items-center gap-3">
             <Zap className="w-8 h-8 text-yellow-400" />
             认知旅程合成器 (Phase 0-2)
          </h1>
          <p className="text-sm font-medium text-gray-500 max-w-2xl leading-relaxed">
             针对早期阶段的「认知引导」路由。基于状态模拟和客户认知旅途，将客户从现状惯性 (Phase 0) 逐步推进到问题归属 (Phase 2)。
          </p>
        </div>
      </div>

      <div className="flex-1 flex gap-10 overflow-hidden">
        {/* Input Side */}
        <div className="flex-1 flex flex-col gap-8 overflow-y-auto no-scrollbar">
           <div className="bg-white border border-gray-200 rounded-[2.5rem] p-10 shadow-sm space-y-10">
              {/* Client Selection */}
              <div className="space-y-4">
                 <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">特定客户上下文 (选填)</label>
                    {selectedClient && (
                      <button onClick={() => setSelectedClient(null)} className="text-[10px] font-bold text-blue-600 uppercase hover:underline">清除选择</button>
                    )}
                 </div>
                 {selectedClient ? (
                   <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <Users className="w-6 h-6 text-blue-600" />
                         </div>
                         <div>
                            <div className="text-sm font-bold text-gray-900">{selectedClient.company}</div>
                            <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{selectedClient.stage}</div>
                         </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-blue-200" />
                   </div>
                 ) : (
                   <div className="relative group">
                     <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                     <input 
                        type="text"
                        placeholder="搜索现有客户以注入上下文..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 pl-14 pr-6 py-5 rounded-2xl text-sm focus:bg-white focus:border-blue-600 outline-none transition-all shadow-inner"
                     />
                     {search && filteredClients.length > 0 && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto">
                           {filteredClients.map(c => (
                             <button 
                                key={c.id} 
                                onClick={() => { setSelectedClient(c); setSearch(''); }}
                                className="w-full text-left px-6 py-4 hover:bg-gray-50 flex items-center gap-4 transition-colors border-b border-gray-50 last:border-0"
                             >
                                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-400">{c.company[0]}</div>
                                <span className="text-sm font-medium text-gray-700">{c.company}</span>
                             </button>
                           ))}
                        </div>
                     )}
                   </div>
                 )}
              </div>

              <div className="grid grid-cols-2 gap-8">
                 <div className="space-y-4">
                   <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">当前推广产品/价值点</label>
                   <textarea 
                      value={genReqs}
                      onChange={e => setGenReqs(e.target.value)}
                      placeholder="描述您要切入的核心价值，例如：AI驱动的供应链优化..."
                      className="w-full h-40 bg-gray-50 border border-gray-100 rounded-3xl p-6 text-sm focus:bg-white focus:border-blue-600 outline-none transition-all resize-none shadow-inner"
                   />
                 </div>
                 <div className="space-y-4">
                   <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">行业痛点/热点担忧</label>
                   <textarea 
                      value={journeyHotTopics}
                      onChange={e => setJourneyHotTopics(e.target.value)}
                      placeholder="目前行业在讨论什么？或者客户最担心的风险？"
                      className="w-full h-40 bg-gray-50 border border-gray-100 rounded-3xl p-6 text-sm focus:bg-white focus:border-blue-600 outline-none transition-all resize-none shadow-inner"
                   />
                 </div>
              </div>

              <button 
                onClick={handleGenerateContent}
                disabled={generatingContent || !genReqs}
                className="w-full py-7 bg-blue-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.4em] shadow-2xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50"
              >
                {generatingContent ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                启动认知状态模拟与合成
              </button>
           </div>

           {/* Result Area */}
           <AnimatePresence>
             {generatedJourney && (
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="bg-white border border-gray-200 rounded-[3rem] overflow-hidden shadow-2xl"
               >
                 <div className="p-10 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-6">
                       <div className="px-5 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20">
                          {generatedJourney.currentSimulatedStage}
                       </div>
                       <div>
                          <h3 className="text-xl font-bold tracking-tight">模拟合成旅程结果</h3>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">AI 驱动的状态推进引擎已就绪</p>
                       </div>
                    </div>
                    <button 
                      onClick={() => navigator.clipboard.writeText(JSON.stringify(generatedJourney, null, 2))}
                      className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm"
                    >
                      <Copy className="w-4 h-4" /> 复制方案
                    </button>
                 </div>
                 
                 <div className="p-10 space-y-12">
                    <div className="bg-blue-600/5 border border-blue-600/10 rounded-3xl p-8">
                       <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-4 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" /> 总体战术导图摘要
                       </h4>
                       <div className="text-lg font-medium text-gray-800 leading-relaxed">
                          {generatedJourney.summary}
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                       <div className="space-y-4 bg-emerald-50/50 border border-emerald-100 p-8 rounded-[2rem]">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 flex items-center gap-2 mb-2">
                             <CheckCircle2 className="w-4 h-4" /> 成功信号 (推进迹象)
                          </h4>
                          <div className="space-y-3">
                           {(generatedJourney.successSignals || []).map((sig: string, i: number) => (
                             <div key={i} className="flex gap-3 text-sm font-medium text-emerald-900 leading-relaxed">
                                <span className="text-emerald-300 select-none">•</span>
                                {sig}
                             </div>
                           ))}
                        </div>
                     </div>
                     <div className="space-y-4 bg-amber-50/50 border border-amber-100 p-8 rounded-[2rem]">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 flex items-center gap-2 mb-2">
                           <AlertTriangle className="w-4 h-4" /> 风险信号 (停滞警戒)
                        </h4>
                        <div className="space-y-3">
                           {(generatedJourney.riskSignals || []).map((sig: string, i: number) => (
                             <div key={i} className="flex gap-3 text-sm font-medium text-amber-900 leading-relaxed">
                                <span className="text-amber-300 select-none">•</span>
                                {sig}
                             </div>
                           ))}
                        </div>
                       </div>
                    </div>

                    <div className="space-y-10">
                       <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 text-center">三阶段进化路径 (Phase 0 ➔ Phase 2)</h4>
                       { (generatedJourney.journeySteps || []).map((step: any, idx: number) => (
                         <div key={idx} className="relative pl-12 border-l-2 border-gray-100 last:border-0 pb-12 last:pb-0">
                            <div className="absolute top-0 left-[-13px] w-6 h-6 bg-white border-2 border-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold text-blue-600 z-10 shadow-sm shadow-blue-100">
                               {idx}
                            </div>
                            <div className="space-y-6">
                               <h5 className="text-2xl font-black text-[#1A1C1E]">{step.step}</h5>
                               
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
                                     <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3 flex items-center gap-2">
                                        <Lightbulb className="w-3 h-3" /> 核心策略
                                     </label>
                                     <div className="text-sm font-medium text-gray-600 leading-relaxed">{step.strategy}</div>
                                  </div>
                                  <div className="bg-blue-50/30 border border-blue-100/50 rounded-2xl p-6">
                                     <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-3 flex items-center gap-2">
                                        <FileText className="w-3 h-3" /> 推荐内容投喂
                                     </label>
                                     <div className="text-sm font-bold text-blue-900">{step.recommendedContent}</div>
                                  </div>
                               </div>

                               <div className="bg-white border-2 border-indigo-50 rounded-[2rem] p-8 shadow-sm">
                                  <label className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mb-4 block">建议互动话术 / Hook</label>
                                  <div className="text-lg font-bold text-indigo-950 leading-relaxed italic border-l-4 border-indigo-200 pl-6">
                                     <ReactMarkdown>{step.scripts}</ReactMarkdown>
                                  </div>
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>

        {/* Sidebar Info */}
        <div className="w-[350px] space-y-8 shrink-0">
           <div className="bg-[#1A1C1E] text-white rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -mr-16 -mt-16" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-8">三向认知模型</h3>
              <div className="space-y-8">
                 {[
                   { step: "Phase 0: 现状惯性", desc: "打破「没必要变」的错觉，建立变革紧迫感。" },
                   { step: "Phase 1: 认知觉醒", desc: "引导客户回答「这和我有什么关系？」" },
                   { step: "Phase 2: 问题归属", desc: "确认痛点的责任归属，锁定内部推动者。" }
                 ].map((s, i) => (
                   <div key={i} className="flex gap-5">
                      <div className="text-sm font-black text-white/20 select-none">P{i}</div>
                      <div>
                         <div className="text-sm font-bold text-white/90 mb-1">{s.step}</div>
                         <div className="text-[10px] text-white/40 leading-relaxed">{s.desc}</div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           <div className="bg-white border border-gray-200 rounded-[2.5rem] p-10 shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6">自学习与反馈机制</h3>
              <ul className="space-y-6">
                 <li className="flex gap-4">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                    <div>
                       <div className="text-xs font-bold text-gray-900 mb-1">行为关联分析</div>
                       <div className="text-[10px] text-gray-500 leading-normal">系统通过历史互动自动优化对状态的判断精度。</div>
                    </div>
                 </li>
                 <li className="flex gap-4">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                    <div>
                       <div className="text-xs font-bold text-gray-900 mb-1">强化学习策略</div>
                       <div className="text-[10px] text-gray-500 leading-normal">根据客户回复反馈，动态调整互动 Hook 的推荐权重。</div>
                    </div>
                 </li>
              </ul>
           </div>
        </div>
      </div>
    </div>
  );
}
