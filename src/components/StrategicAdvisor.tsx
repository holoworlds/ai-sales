import { useState, useRef, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../services/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  getDocs,
  updateDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { Client, KnowledgeEntry, AgentSkill, EvolutionProposal, AgentInteraction } from '../types';
import { performStrategicAgentReasoning, evolveAgentCapability, evaluateEvolutionProposal } from '../services/gemini';
import { 
  Sparkles, 
  Send, 
  Brain, 
  TrendingUp, 
  AlertCircle,
  Loader2,
  Maximize2,
  Zap,
  Target,
  History,
  Workflow,
  Plus,
  CheckCircle2,
  XCircle,
  Cpu,
  BarChart3,
  Lightbulb,
  RefreshCw,
  MessageSquarePlus,
  Clock,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StrategicAdvisorProps {
  setCurrentView?: (view: 'dashboard' | 'agent' | 'clients' | 'knowledge' | 'journey') => void;
  setSelectedClientId?: (id: string | null) => void;
  minimal?: boolean;
}

export default function StrategicAdvisor({ setCurrentView, setSelectedClientId, minimal = false }: StrategicAdvisorProps) {
  const [activeTab, setActiveTab] = useState<'agent' | 'skills' | 'evolution'>('agent');
  const [queryText, setQueryText] = useState('');
  const [loading, setLoading] = useState(false);
  const [reasoningResult, setReasoningResult] = useState<any>(null);
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [executingAction, setExecutingAction] = useState(false);
  
  // Manual Evolution State
  const [isAddingProposal, setIsAddingProposal] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [manualProposal, setManualProposal] = useState({ name: '', description: '', goal: '' });
  const [evaluationResult, setEvaluationResult] = useState<any>(null);

  // Data State
  const [clients, setClients] = useState<Client[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [skills, setSkills] = useState<AgentSkill[]>([]);
  const [proposals, setProposals] = useState<EvolutionProposal[]>([]);
  const [interactions, setInteractions] = useState<AgentInteraction[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const unsubClients = onSnapshot(query(collection(db, 'clients'), where('ownerId', '==', uid)), (s) => 
      setClients(s.docs.map(d => ({ id: d.id, ...d.data() } as Client))), (err) => handleFirestoreError(err, OperationType.GET, 'clients'));

    const unsubKnowledge = onSnapshot(query(collection(db, 'knowledge'), where('ownerId', '==', uid)), (s) => 
      setKnowledge(s.docs.map(d => ({ id: d.id, ...d.data() } as KnowledgeEntry))), (err) => handleFirestoreError(err, OperationType.GET, 'knowledge'));

    const unsubSkills = onSnapshot(query(collection(db, 'skills'), where('ownerId', '==', uid)), (s) => 
      setSkills(s.docs.map(d => ({ id: d.id, ...d.data() } as AgentSkill))), (err) => handleFirestoreError(err, OperationType.GET, 'skills'));

    const unsubProposals = onSnapshot(query(collection(db, 'evolution_proposals'), where('ownerId', '==', uid), orderBy('createdAt', 'desc')), (s) => 
      setProposals(s.docs.map(d => ({ id: d.id, ...d.data() } as EvolutionProposal))), (err) => handleFirestoreError(err, OperationType.GET, 'evolution_proposals'));

    const unsubLogs = onSnapshot(query(collection(db, 'agent_logs'), where('ownerId', '==', uid), orderBy('timestamp', 'desc'), limit(10)), (s) => 
      setInteractions(s.docs.map(d => ({ id: d.id, ...d.data() } as AgentInteraction))), (err) => handleFirestoreError(err, OperationType.GET, 'agent_logs'));

    // Seed initial skills
    const seedInitialSkills = async () => {
      const skillsRef = collection(db, 'skills');
      const q = query(skillsRef, where('ownerId', '==', uid), limit(1));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        const initialSkills = [
          { name: 'Phase判断引擎', type: 'analysis', description: '精确识别客户所处认知阶段(Phase 0-7)', logic: 'analyze_stage', performanceScore: 0.95 },
          { name: '阻力识别器', type: 'analysis', description: '识别当前决策路径上的隐蔽卡点', logic: 'identify_bottlenecks', performanceScore: 0.9 },
          { name: '定制话术生成', type: 'generation', description: '基于认知共感生成极具穿透力的互动回复', logic: 'generate_scripts', performanceScore: 0.85 }
        ];

        for (const s of initialSkills) {
          await addDoc(skillsRef, { ...s, ownerId: uid, createdAt: serverTimestamp(), usageCount: 0, applicablePhases: ['phase_0','phase_1','phase_2','phase_3','phase_4','phase_5','phase_6','phase_7'] });
        }
      }
    };
    seedInitialSkills();

    return () => {
      unsubClients();
      unsubKnowledge();
      unsubSkills();
      unsubProposals();
      unsubLogs();
    };
  }, []);

  const handleReasoning = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!queryText.trim() || loading) return;

    setLoading(true);
    try {
      const result = await performStrategicAgentReasoning(queryText, {
        clients,
        knowledge,
        skills
      });

      setReasoningResult(result);
      if (result.suggestedSystemAction) {
        setPendingAction(result.suggestedSystemAction);
      } else {
        setPendingAction(null);
      }

      await addDoc(collection(db, 'agent_logs'), {
        query: queryText,
        response: result,
        timestamp: serverTimestamp(),
        ownerId: auth.currentUser?.uid
      });

      if (result.confidence < 0.7) {
        const proposal = await evolveAgentCapability(interactions, skills);
        if (proposal.suggestedSkillName) {
            await addDoc(collection(db, 'evolution_proposals'), {
                ...proposal,
                status: 'pending',
                ownerId: auth.currentUser?.uid,
                createdAt: serverTimestamp()
            });
        }
      }

      setQueryText('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async () => {
    if (!pendingAction || executingAction) return;
    setExecutingAction(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const normalizeStage = (s: string) => {
        if (!s) return 'phase_1';
        const lower = s.toLowerCase().replace(/ /g, '_');
        if (lower.startsWith('phase')) {
           return lower.includes('_') ? lower : lower.replace('phase', 'phase_');
        }
        return 'phase_1';
      };

      const data = pendingAction.data;
      if (!data) throw new Error('Action data is missing');

      if (pendingAction.type === 'CREATE_CLIENT') {
        await addDoc(collection(db, 'clients'), {
          ...data,
          name: data.name || data.company || '新客户',
          company: data.company || '未知公司',
          ownerId: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          stage: normalizeStage(data.stage),
          phaseDescription: data.phaseDescription || '',
          memorySummary: data.memorySummary || '',
        });
      } else if (pendingAction.type === 'UPDATE_CLIENT') {
        const { id, ...updates } = data;
        if (id) {
          await updateDoc(doc(db, 'clients', id), {
            ...updates,
            stage: updates.stage ? normalizeStage(updates.stage) : undefined,
            updatedAt: serverTimestamp()
          });
        }
      } else if (pendingAction.type === 'ADD_KNOWLEDGE') {
        await addDoc(collection(db, 'knowledge'), {
          ...data,
          title: data.title || 'Agent 提取洞察',
          content: data.content || '',
          sourceType: data.sourceType || 'document',
          category: data.category || 'strategy',
          tags: data.tags || [],
          ownerId: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      
      setPendingAction(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'system_action');
    } finally {
      setExecutingAction(false);
    }
  };

  const approveProposal = async (proposal: EvolutionProposal) => {
    try {
      await addDoc(collection(db, 'skills'), {
          name: proposal.suggestedSkillName,
          description: proposal.suggestedSkillDescription,
          type: 'strategy',
          logic: (proposal as any).suggestedSkillLogic || '',
          performanceScore: 0,
          usageCount: 0,
          applicablePhases: ['phase_0', 'phase_1', 'phase_2', 'phase_3', 'phase_4', 'phase_5', 'phase_6', 'phase_7'],
          ownerId: auth.currentUser?.uid,
          createdAt: serverTimestamp(),
          tags: (proposal as any).tags || []
      });

      await updateDoc(doc(db, 'evolution_proposals', proposal.id), {
          status: 'implemented'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `evolution_proposals/${proposal.id}`);
    }
  };

  const handleManualInject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualProposal.name || isEvaluating) return;

    setIsEvaluating(true);
    try {
      const result = await evaluateEvolutionProposal(manualProposal);
      setEvaluationResult(result);
      
      if (result.isAccepted) {
        await addDoc(collection(db, 'evolution_proposals'), {
          ...result.refinedProposal,
          status: 'pending',
          ownerId: auth.currentUser?.uid,
          createdAt: serverTimestamp(),
          tags: [...(result.tags || []), 'Manual'],
          isManual: true,
          evaluation: result.evaluation
        });
        setTimeout(() => {
          setIsAddingProposal(false);
          setEvaluationResult(null);
          setManualProposal({ name: '', description: '', goal: '' });
          setActiveTab('evolution');
        }, 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className={`bg-[#1A1C1E] text-white rounded-[3.5rem] p-1 shadow-2xl border border-white/5 overflow-hidden flex ${minimal ? 'h-auto' : 'h-[700px] lg:h-[85vh] max-h-[1000px]'}`}>
        {/* Navigation Sidebar */}
        {!minimal && (
          <div className="w-24 border-r border-white/5 flex flex-col items-center py-10 gap-8">
            <button 
              onClick={() => setActiveTab('agent')}
              className={`p-4 rounded-2xl transition-all ${activeTab === 'agent' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-white'}`}
            >
                <Cpu className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setActiveTab('skills')}
              className={`p-4 rounded-2xl transition-all ${activeTab === 'skills' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-gray-500 hover:text-white'}`}
            >
                <Workflow className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setActiveTab('evolution')}
              className={`p-4 rounded-2xl transition-all ${activeTab === 'evolution' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-gray-500 hover:text-white'}`}
            >
                <TrendingUp className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 p-12 overflow-y-auto no-scrollbar">
           <AnimatePresence mode="wait">
              {activeTab === 'agent' && (
                <motion.div 
                  key="agent"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-10"
                >
                   <div className="flex items-center justify-between">
                      <div>
                         <h2 className="text-3xl font-bold tracking-tight mb-2">认知型 Agent 决策中心</h2>
                         <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                            <Sparkles className="w-3 h-3" /> Cognitive Strategy Engine v2.0
                         </p>
                      </div>
                      <div className="flex gap-2">
                         <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
                            <History className="w-4 h-4 text-gray-500" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Memory: {clients.length + knowledge.length} Slots</span>
                         </div>
                      </div>
                   </div>

                   {!reasoningResult && !loading ? (
                      <div className="space-y-10">
                        <div className={`${minimal ? 'py-12' : 'h-[350px]'} border-2 border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center text-center px-20 text-gray-500`}>
                           <Brain className="w-16 h-16 opacity-20 mb-8" />
                           <h3 className="text-2xl font-bold mb-4 text-gray-400">战略决策待命中</h3>
                           <p className="text-sm leading-relaxed max-w-md">
                               神经网络已连接 Layer 1 记忆系统。您可以前往“认知演进”中心开启深度战略推理及能力进化。
                           </p>
                           {minimal && setCurrentView && (
                             <button 
                               onClick={() => setCurrentView('agent')}
                               className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all"
                             >
                               进入深度推理中心 <ArrowRight className="w-4 h-4" />
                             </button>
                           )}
                        </div>

                        {!minimal && (
                          <form onSubmit={handleReasoning} className="relative">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-4">
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
                            </div>
                            <input 
                              type="text" 
                              value={queryText}
                              onChange={e => setQueryText(e.target.value)}
                              placeholder="输入客户反馈或战略疑问，Agent 即刻执行推理..."
                              className="w-full bg-white/5 border border-white/20 px-14 py-6 pr-20 rounded-3xl text-sm outline-none focus:bg-white/10 focus:border-blue-500 transition-all font-medium placeholder:text-gray-600"
                            />
                            <button 
                              type="submit" disabled={!queryText.trim() || loading}
                              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center hover:bg-blue-700 transition-all"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                          </form>
                        )}
                      </div>
                   ) : (
                      <div className="space-y-8">
                         {loading ? (
                           <div className="h-[400px] flex flex-col items-center justify-center text-center">
                              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-6" />
                              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 animate-pulse">正在穿透认知分层，构建最佳决策路径...</p>
                           </div>
                         ) : (
                           <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                              <div className="lg:col-span-2 space-y-6">
                                 <div className="bg-white/5 border border-white/10 p-10 rounded-[2.5rem]">
                                    <div className="flex items-center justify-between mb-8">
                                       <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                                             <BarChart3 className="w-5 h-5" />
                                          </div>
                                          <span className="text-[11px] font-black uppercase tracking-[0.2em]">Layer 3: 深度决策推理</span>
                                       </div>
                                       <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase">
                                          Confidence: {Math.round(reasoningResult.confidence * 100)}%
                                       </div>
                                    </div>
                                    <h4 className="text-xl font-bold mb-4 leading-tight">{reasoningResult.decision}</h4>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-10">{reasoningResult.analysis}</p>
                                    
                                    <div className="bg-blue-600 p-8 rounded-3xl shadow-xl shadow-blue-600/20">
                                       <div className="flex items-center gap-2 text-[9px] font-black uppercase text-white/50 tracking-widest mb-4">
                                          <Zap className="w-3 h-3" /> 认知驱动行动建议
                                       </div>
                                       <div className="text-lg font-bold text-white mb-6 leading-tight">{reasoningResult.recommendedAction}</div>
                                       <div className="p-5 bg-white/10 rounded-2xl border border-white/10 text-sm font-medium leading-relaxed italic text-white/90">
                                          "{reasoningResult.generatedMessage}"
                                       </div>
                                    </div>

                                    {pendingAction && (
                                       <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 bg-emerald-600/10 border border-emerald-500/20 p-8 rounded-3xl">
                                          <div className="flex justify-between items-start mb-4">
                                             <h5 className="text-lg font-bold flex items-center gap-2 text-emerald-400">
                                                <Target className="w-5 h-5" />
                                                {pendingAction.type === 'CREATE_CLIENT' ? '创建新客户项目' : 
                                                 pendingAction.type === 'UPDATE_CLIENT' ? '更新项目获客进度' : 
                                                 '录入新知识资产'}
                                             </h5>
                                             {pendingAction.type === 'UPDATE_CLIENT' && pendingAction.data.id && setSelectedClientId && setCurrentView && (
                                               <button 
                                                 onClick={() => {
                                                   setSelectedClientId(pendingAction.data.id);
                                                   setCurrentView('clients');
                                                 }}
                                                 className="text-[10px] font-bold text-blue-400 hover:underline"
                                               >
                                                 查看当前档案 →
                                               </button>
                                              )}
                                           </div>
                                          <p className="text-xs text-gray-400 mb-6">{pendingAction.reasoning}</p>
                                          <div className="flex gap-4">
                                             <button onClick={executeAction} disabled={executingAction} className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                {executingAction ? <Loader2 className="w-3" /> : <CheckCircle2 className="w-3" />} 执行操作
                                             </button>
                                             <button onClick={() => setPendingAction(null)} className="px-6 py-3 bg-white/5 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest">忽略</button>
                                          </div>
                                       </motion.div>
                                    )}
                                 </div>
                              </div>
                              
                              <div className="space-y-6">
                                 <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem]">
                                    <div className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-6">Layer 4: 命中的能力集</div>
                                    <div className="space-y-3">
                                       {reasoningResult.usedSkills?.map((s: string) => (
                                          <div key={s} className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/5">
                                             <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                             <span className="text-[10px] font-bold text-gray-300">{s}</span>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                                 <button 
                                   onClick={() => minimal && setCurrentView ? setCurrentView('agent') : setReasoningResult(null)} 
                                   className="w-full py-5 text-[10px] font-black uppercase text-gray-500 hover:text-white transition-all underline underline-offset-8 decoration-white/10"
                                 >
                                   {minimal ? '进入认知决策中心追问 →' : '开启新对话'}
                                 </button>
                              </div>
                           </motion.div>
                         )}
                         
                         {!loading && reasoningResult && !minimal && (
                            <form onSubmit={handleReasoning} className="relative mt-10">
                               <input 
                                 type="text" value={queryText} onChange={e => setQueryText(e.target.value)}
                                 placeholder="追问 Agent 或提供更多细节..."
                                 className="w-full bg-white/5 border border-white/20 px-14 py-6 pr-20 rounded-3xl text-sm outline-none focus:bg-white/10 focus:border-blue-500 transition-all placeholder:text-gray-600"
                               />
                               <button type="submit" disabled={!queryText.trim() || loading} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center"><Send className="w-5 h-5" /></button>
                            </form>
                         )}
                      </div>
                   )}
                </motion.div>
              )}

              {activeTab === 'skills' && (
                <motion.div key="skills" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                   <h2 className="text-3xl font-bold tracking-tight">Layer 4: 能力系统</h2>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {skills.map(skill => (
                        <div key={skill.id} className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] relative group hover:bg-white/10 transition-all">
                           <Workflow className="w-6 h-6 text-gray-700 mb-4 group-hover:text-indigo-400 transition-colors" />
                           <h4 className="text-lg font-bold mb-3">{skill.name}</h4>
                           <p className="text-xs text-gray-500 mb-6">{skill.description}</p>
                           <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500" style={{ width: `${skill.performanceScore * 100}%` }} />
                           </div>
                        </div>
                      ))}
                      <button 
                        onClick={() => setIsAddingProposal(true)}
                        className="border-2 border-dashed border-white/10 p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-gray-600 hover:border-indigo-500 hover:text-indigo-400 transition-all gap-4"
                      >
                         <Plus className="w-8 h-8" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-center">手动注入进化提案</span>
                      </button>
                   </div>
                </motion.div>
              )}

              {activeTab === 'evolution' && (
                <motion.div key="evolution" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                   <div className="flex items-center justify-between">
                      <h2 className="text-3xl font-bold tracking-tight">Layer 7: 进化引擎</h2>
                      <div className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold flex items-center gap-2">
                         <Zap className="w-4 h-4" /> 自治化提案审核
                      </div>
                   </div>
                   <div className="space-y-6 pb-20">
                      {proposals.length === 0 ? (
                        <div className="py-20 text-center opacity-30"><Lightbulb className="w-12 h-12 mx-auto mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">暂无进化提案</p></div>
                      ) : (
                        proposals.map(proposal => (
                          <div key={proposal.id} className="bg-white/5 border border-white/10 p-10 rounded-[3rem] grid grid-cols-1 lg:grid-cols-4 gap-10">
                             <div className="lg:col-span-3 space-y-6">
                                <div className="flex items-center gap-4">
                                   <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${proposal.status === 'pending' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>{proposal.status}</div>
                                   {proposal.isManual && <div className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[9px] font-black uppercase">Human Inject</div>}
                                </div>
                                <h4 className="text-xl font-bold text-emerald-400">「{proposal.suggestedSkillName}」</h4>
                                <p className="text-sm text-gray-400 leading-relaxed">{proposal.suggestedSkillDescription}</p>
                                {proposal.evaluation && <div className="p-5 bg-blue-600/5 rounded-2xl text-xs text-gray-400 italic">“{proposal.evaluation}”</div>}
                             </div>
                             <div className="flex flex-col justify-center gap-4">
                                {proposal.status === 'pending' && <button onClick={() => approveProposal(proposal)} className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-all">批准并集成</button>}
                                {proposal.status === 'implemented' && <div className="text-center py-4 bg-emerald-500/10 text-emerald-400 rounded-2xl text-[10px] font-black uppercase">已集成至系统</div>}
                             </div>
                          </div>
                        ))
                      )}
                   </div>
                </motion.div>
              )}
           </AnimatePresence>
        </div>

        {/* Manual Proposal Modal */}
        <AnimatePresence>
           {isAddingProposal && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/80 backdrop-blur-md">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#1A1C1E] border border-white/10 rounded-[3rem] w-full max-w-2xl relative p-12 text-white">
                   <button onClick={() => setIsAddingProposal(false)} className="absolute top-10 right-10 text-gray-500 hover:text-white"><XCircle className="w-8 h-8" /></button>
                   <h3 className="text-2xl font-bold mb-10">手动注入进化提案</h3>
                   {evaluationResult ? (
                      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                         <div className={`p-8 rounded-3xl border ${evaluationResult.isAccepted ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                            <h4 className="text-lg font-bold mb-4">{evaluationResult.isAccepted ? '系统已接思接纳并补全' : '提案被拒绝'}</h4>
                            <p className="text-sm text-gray-400 leading-relaxed mb-6">{evaluationResult.evaluation}</p>
                            {evaluationResult.isAccepted && <div className="text-white font-bold">补全能力: 「{evaluationResult.refinedProposal.suggestedSkillName}」</div>}
                         </div>
                         <div className="text-xs text-gray-500 text-center">3秒后返回进化中心...</div>
                      </div>
                   ) : (
                      <form onSubmit={handleManualInject} className="space-y-6">
                         <input required value={manualProposal.name} onChange={e => setManualProposal({...manualProposal, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-blue-500" placeholder="提案名称" />
                         <textarea required value={manualProposal.description} onChange={e => setManualProposal({...manualProposal, description: e.target.value})} className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-blue-500 resize-none" placeholder="逻辑描述" />
                         <input value={manualProposal.goal} onChange={e => setManualProposal({...manualProposal, goal: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-blue-500" placeholder="进化目标" />
                         <button type="submit" disabled={isEvaluating} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
                            {isEvaluating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Brain className="w-5 h-5" />} 启动 AI 学习补全
                         </button>
                      </form>
                   )}
                </motion.div>
             </div>
           )}
        </AnimatePresence>
    </div>
  );
}
