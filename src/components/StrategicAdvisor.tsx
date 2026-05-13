import { useState, useRef, useEffect } from 'react';
import { localDb, localAuth } from '../services/storage';
import { Client, KnowledgeEntry, AgentSkill, EvolutionProposal, AgentInteraction, LLMProvider, LLMConfig } from '../types';
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
  ArrowRight,
  Settings,
  Activity,
  Shield,
  Layers,
  Globe,
  Database as DbIcon,
  Trash2,
  Key,
  Link
} from 'lucide-react';
import { motion } from 'motion/react';

import { useRenderTrace } from '../hooks/useRenderTrace';

interface StrategicAdvisorProps {
  setCurrentView?: (view: 'dashboard' | 'agent' | 'clients' | 'knowledge' | 'journey') => void;
  setSelectedClientId?: (id: string | null) => void;
  minimal?: boolean;
}

export default function StrategicAdvisor({ setCurrentView, setSelectedClientId, minimal = false }: StrategicAdvisorProps) {
  const [activeTab, setActiveTab] = useState<'agent' | 'skills' | 'evolution' | 'llm' | 'lab' | 'history'>('agent');
  
  useRenderTrace('StrategicAdvisor', { activeTab, minimal });
  
  // Interaction History
  const [interactionHistory, setInteractionHistory] = useState<AgentInteraction[]>([]);
  const [viewingHistoryItem, setViewingHistoryItem] = useState<AgentInteraction | null>(null);

  // Lab State
  const [labType, setLabType] = useState<'PPT' | 'Report' | 'Strategy' | 'Prompt'>('Prompt');
  const [labReqs, setLabReqs] = useState('');
  const [labResult, setLabResult] = useState('');
  const [isGeneratingLab, setIsGeneratingLab] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reasoningResult, setReasoningResult] = useState<any>(null);
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [executingAction, setExecutingAction] = useState(false);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [skills, setSkills] = useState<AgentSkill[]>([]);
  const [proposals, setProposals] = useState<EvolutionProposal[]>([]);
  const [llmConfigs, setLlmConfigs] = useState<LLMConfig[]>([]);

  // Modals
  const [isAddingProposal, setIsAddingProposal] = useState(false);
  const [manualProposal, setManualProposal] = useState({ name: '', description: '', goal: '' });
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const [isAddingLLM, setIsAddingLLM] = useState(false);
  const [newLLM, setNewLLM] = useState<Partial<LLMConfig>>({
    displayName: '',
    provider: LLMProvider.GOOGLE,
    modelId: '',
    apiKey: '',
    baseUrl: '',
    isPrimary: false
  });

  const [selectedSkill, setSelectedSkill] = useState<AgentSkill | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<EvolutionProposal | null>(null);

  useEffect(() => {
    fetchData().catch(err => console.error("[StrategicAdvisor] Initial fetchData failed:", err));
  }, []);

  const fetchData = async () => {
    try {
      const clientsData = await localDb.getAll('clients');
      const knowledgeData = await localDb.getAll('knowledge');
      const skillsData = await localDb.getAll('skills');
      const proposalsData = await localDb.getAll('proposals');
      const configsData = await localDb.getAll('llmConfigs');
      const historyData = await localDb.getAll('agentLogs');
      
      setClients(clientsData);
      setKnowledge(knowledgeData);
      setSkills(skillsData);
      setProposals(proposalsData.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
      setLlmConfigs(configsData);
      setInteractionHistory(historyData.sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ));
    } catch (error) {
      console.error("[StrategicAdvisor] fetchData error:", error);
      setError("从数据库读取数据失败，请重试。");
    }
  };

  const getActiveModel = () => {
     return llmConfigs.find(c => c.isPrimary)?.modelId || 'gemini-3-flash-preview';
  };

  const setActiveModel = async (modelId: string) => {
    try {
      const updated = llmConfigs.map(c => ({
         ...c,
         isPrimary: c.modelId === modelId
      }));
      for (const config of updated) {
         await localDb.update('llmConfigs', config.id, config);
      }
      setLlmConfigs(updated);
    } catch (error) {
      console.error("[StrategicAdvisor] setActiveModel error:", error);
      setError("设置主模型失败");
    }
  };

  const setPrimaryModel = async (id: string) => {
    try {
      const updated = llmConfigs.map(c => ({
         ...c,
         isPrimary: c.id === id
      }));
      for (const config of updated) {
         await localDb.update('llmConfigs', config.id, config);
      }
      setLlmConfigs(updated);
    } catch (error) {
      console.error("[StrategicAdvisor] setPrimaryModel error:", error);
      setError("设置主模型失败");
    }
  };

  const handleAddLLM = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await localAuth.getCurrentUserAsync();
      const config: LLMConfig = {
        id: crypto.randomUUID(),
        displayName: newLLM.displayName!,
        provider: newLLM.provider!,
        modelId: newLLM.modelId!,
        apiKey: newLLM.apiKey!,
        baseUrl: newLLM.baseUrl,
        isPrimary: llmConfigs.length === 0,
        status: 'Active',
        ownerId: user?.uid || 'local-user'
      } as any; 
      await localDb.add('llmConfigs', config);
      setLlmConfigs([...llmConfigs, config]);
      setIsAddingLLM(false);
      setNewLLM({
        displayName: '',
        provider: LLMProvider.GOOGLE,
        modelId: '',
        apiKey: '',
        baseUrl: '',
        isPrimary: false
      });
    } catch (error) {
      console.error("[StrategicAdvisor] handleAddLLM error:", error);
      setError("添加模型配置失败");
    }
  };

  const deleteLLM = async (id: string) => {
    try {
      await localDb.delete('llmConfigs', id);
      setLlmConfigs(llmConfigs.filter(c => c.id !== id));
    } catch (error) {
      console.error("[StrategicAdvisor] deleteLLM error:", error);
      setError("删除模型配置失败");
    }
  };

  const handleReasoning = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!queryText.trim()) return;

    setLoading(true);
    setError(null);
    setReasoningResult(null);
    setPendingAction(null);

    try {
      const result = await performStrategicAgentReasoning(
        queryText,
        { clients, knowledge, skills }
      );
      
      if (result?.error) {
        setError(result.message || 'AI 推理暂时不可用');
        setReasoningResult(JSON.parse(JSON.stringify({
          decision: '推理受阻',
          analysis: result.message || '由于模型响应异常，Agent 无法完成该指令的推理。建议检查模型 API 配置。',
          recommendedAction: '重试或更换模型',
          generatedMessage: '系统错误',
          confidence: 0,
          usedSkills: []
        })));
      } else {
        const dehydratedResult = JSON.parse(JSON.stringify(result));
        setReasoningResult(dehydratedResult);
        if (dehydratedResult?.suggestedSystemAction) {
          setPendingAction(dehydratedResult.suggestedSystemAction);
        }
      }
      setQueryText('');
      
      const user = await localAuth.getCurrentUserAsync();
      const historyEntry: AgentInteraction = {
        id: crypto.randomUUID(),
        type: 'reasoning',
        query: queryText,
        result: dehydratedResult,
        ownerId: user?.uid || 'local-user',
        timestamp: new Date().toISOString()
      };
      await localDb.add('agentLogs', historyEntry);
      setInteractionHistory([historyEntry, ...interactionHistory]);
    } catch (error: any) {
      console.error("Reasoning failed:", error);
      setError(error.message || 'AI 推理引擎发生严重错误');
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async () => {
    if (!pendingAction) return;
    setExecutingAction(true);
    try {
      if (pendingAction.type === 'CREATE_CLIENT') {
        await localDb.add('clients', pendingAction.data);
      } else if (pendingAction.type === 'UPDATE_CLIENT') {
        await localDb.update('clients', pendingAction.data.id, pendingAction.data);
      } else if (pendingAction.type === 'CREATE_KNOWLEDGE') {
        await localDb.add('knowledge', pendingAction.data);
      }
      setPendingAction(null);
      await fetchData();
    } catch (err) {
      console.error("Action execution failed:", err);
      setError("操作执行失败");
    } finally {
      setExecutingAction(false);
    }
  };

  const handleManualInject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEvaluating(true);
    try {
      const rawResult = await evaluateEvolutionProposal({
        name: manualProposal.name,
        description: manualProposal.description,
        goal: manualProposal.goal,
        currentSkills: skills
      });
      
      const result = JSON.parse(JSON.stringify(rawResult));
      setEvaluationResult(result);
      
      if (result.isAccepted) {
        const proposal: EvolutionProposal = {
          id: crypto.randomUUID(),
          ...(result.refinedProposal || {}),
          status: 'pending',
          isManual: true,
          createdAt: new Date()
        };
        await localDb.add('proposals', proposal);
        await fetchData();
      }
      
      setTimeout(() => {
        setIsAddingProposal(false);
        setEvaluationResult(null);
        setManualProposal({ name: '', description: '', goal: '' });
      }, 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const approveProposal = async (proposal: EvolutionProposal) => {
    try {
      const rawResult = await evaluateEvolutionProposal({ proposal, existingSkills: skills }); 
      const result = JSON.parse(JSON.stringify(rawResult));
      const newSkill = {
        name: result?.refinedProposal?.suggestedSkillName || proposal.suggestedSkillName,
        description: result?.refinedProposal?.suggestedSkillDescription || proposal.suggestedSkillDescription,
        code: "// Simulated evolved code bundle",
        id: crypto.randomUUID()
      };

      await localDb.add('skills', {
        ...newSkill,
        performanceScore: 0.8,
        usageCount: 0
      });
      await localDb.update('proposals', proposal.id, {
        status: 'implemented'
      });
      await fetchData();
    } catch (err) {
      console.error(err);
      setError("能力集成失败");
    }
  };

  return (
    <div className={`h-full flex flex-col lg:flex-row bg-[#0F1113] text-white overflow-hidden ${minimal ? 'rounded-none' : 'rounded-[3.5rem] shadow-2xl border border-white/5'}`}>
        {!minimal && (
          <div className="w-full lg:w-28 bg-[#1A1C1E] border-r border-white/5 flex flex-row lg:flex-col items-center py-8 gap-4 px-4 lg:px-0 scroll-smooth shadow-2xl">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20 mb-0 lg:mb-8 active:scale-95 transition-all">
                <Brain className="w-6 h-6" />
            </div>
            
            <button 
              title="智能问答"
              onClick={() => setActiveTab('agent')}
              className={`p-4 rounded-2xl transition-all relative group ${activeTab === 'agent' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-white'}`}
            >
                <TrendingUp className="w-6 h-6" />
                {activeTab === 'agent' && <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-blue-500 rounded-full" />}
            </button>
            <button 
              title="能力系统"
              onClick={() => setActiveTab('skills')}
              className={`p-4 rounded-2xl transition-all relative group ${activeTab === 'skills' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-gray-500 hover:text-white'}`}
            >
                <Workflow className="w-6 h-6" />
                {activeTab === 'skills' && <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-indigo-500 rounded-full" />}
            </button>
            <button 
              title="进化引擎"
              onClick={() => setActiveTab('evolution')}
              className={`p-4 rounded-2xl transition-all relative group ${activeTab === 'evolution' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-gray-500 hover:text-white'}`}
            >
                <Zap className="w-6 h-6" />
                {activeTab === 'evolution' && <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-emerald-500 rounded-full" />}
            </button>
            <button 
              title="LLM 实验室"
              onClick={() => setActiveTab('lab')}
              className={`p-4 rounded-2xl transition-all relative group ${activeTab === 'lab' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'text-gray-500 hover:text-white'}`}
            >
                <MessageSquarePlus className="w-6 h-6" />
                {activeTab === 'lab' && <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-purple-500 rounded-full" />}
            </button>
            <button 
              title="历史记录"
              onClick={() => setActiveTab('history')}
              className={`p-4 rounded-2xl transition-all relative group ${activeTab === 'history' ? 'bg-gray-600 text-white shadow-lg shadow-gray-600/20' : 'text-gray-500 hover:text-white'}`}
            >
                <History className="w-6 h-6" />
                {activeTab === 'history' && <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-gray-500 rounded-full" />}
            </button>
            <button 
              title="模型枢纽"
              onClick={() => setActiveTab('llm')}
              className={`p-4 rounded-2xl transition-all relative group ${activeTab === 'llm' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-gray-500 hover:text-white'}`}
            >
                <Layers className="w-6 h-6" />
                {activeTab === 'llm' && <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-orange-500 rounded-full" />}
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 p-12 overflow-y-auto no-scrollbar">
              {activeTab === 'agent' && (
                <motion.div 
                  key="agent"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
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
                         {llmConfigs.length > 0 && (
                            <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
                               <Layers className="w-4 h-4 text-orange-400" />
                               <select 
                                 value={getActiveModel()}
                                 onChange={(e) => setActiveModel(e.target.value)}
                                 className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-gray-200 outline-none cursor-pointer"
                               >
                                 {llmConfigs.map(config => (
                                    <option key={config.id} value={config.modelId} className="bg-[#1A1C1E]">
                                       {config.displayName}
                                    </option>
                                 ))}
                               </select>
                            </div>
                         )}
                         <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
                            <History className="w-4 h-4 text-gray-500" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Memory: {clients.length + knowledge.length}</span>
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
                         {error && (
                            <motion.div 
                              initial={{ opacity: 0, y: -20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-start gap-4"
                            >
                               <AlertCircle className="w-5 h-5 text-red-500 mt-1 shrink-0" />
                               <div className="flex-1">
                                  <div className="text-sm font-bold text-red-500 mb-1">推理引擎异常</div>
                                  <div className="text-xs text-red-400/80 leading-relaxed font-mono break-all">{error}</div>
                               </div>
                               <button onClick={() => setError(null)} className="text-red-500 p-1 hover:bg-red-500/10 rounded-lg">
                                  <XCircle className="w-4 h-4" />
                               </button>
                            </motion.div>
                         )}
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
                                          Confidence: {Math.round((reasoningResult?.confidence || 0) * 100)}%
                                       </div>
                                    </div>
                                    <h4 className="text-xl font-bold mb-4 leading-tight">{reasoningResult?.decision}</h4>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-10">{reasoningResult?.analysis}</p>
                                    
                                    <div className="bg-blue-600 p-8 rounded-3xl shadow-xl shadow-blue-600/20">
                                       <div className="flex items-center gap-2 text-[9px] font-black uppercase text-white/50 tracking-widest mb-4">
                                          <Zap className="w-3 h-3" /> 认知驱动行动建议
                                       </div>
                                       <div className="text-lg font-bold text-white mb-6 leading-tight">{reasoningResult?.recommendedAction}</div>
                                       <div className="p-5 bg-white/10 rounded-2xl border border-white/10 text-sm font-medium leading-relaxed italic text-white/90">
                                          "{reasoningResult?.generatedMessage}"
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
                                       {(reasoningResult.usedSkills || []).map((s: string) => (
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

              {activeTab === 'lab' && (
                <motion.div key="lab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                   <div className="flex items-center justify-between">
                      <div>
                         <h2 className="text-3xl font-bold tracking-tight mb-2">LLM 实验室 (Asset Laboratory)</h2>
                         <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                            <Sparkles className="w-3 h-3" /> Generative AI Asset Forge
                         </p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] space-y-8 h-fit">
                         <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-2">资产类型 (Asset Type)</label>
                            <div className="grid grid-cols-2 gap-4">
                               {['PPT', 'Report', 'Strategy', 'Prompt'].map(type => (
                                  <button 
                                    key={type}
                                    onClick={() => setLabType(type as any)}
                                    className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${labType === type ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20' : 'bg-white/5 border-white/10 text-gray-400'}`}
                                  >
                                     {type}
                                  </button>
                               ))}
                            </div>
                         </div>

                         <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-2">需求描述 (Requirements)</label>
                            <textarea 
                               value={labReqs}
                               onChange={e => setLabReqs(e.target.value)}
                               className="w-full h-48 bg-white/5 border border-white/10 rounded-3xl p-8 text-sm text-white focus:bg-white/10 focus:border-purple-500 outline-none transition-all resize-none"
                               placeholder="描述您需要生成的资产内容，例如：针对医疗科技行业的 PPT 大纲，或者一个能够自动提取财报关键指标的 Prompt..."
                            />
                         </div>

                         <button 
                            onClick={async () => {
                               if (!labReqs.trim()) return;
                               setIsGeneratingLab(true);
                               try {
                                  const { generateContentAsset } = await import('../services/gemini');
                                  const result = await generateContentAsset(labType as any, "系统全局上下文 (知识集 + 技能集)", labReqs);
                                  const resultText = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
                                  setLabResult(resultText);

                                  // Save to history
                                  const user = await localAuth.getCurrentUserAsync();
                                  const historyEntry: AgentInteraction = {
                                    id: crypto.randomUUID(),
                                    type: 'lab',
                                    query: `[${labType}] ${labReqs}`,
                                    result: {
                                      analysis: "Asset generated via Lab",
                                      labResult: resultText,
                                      labType: labType
                                    } as any,
                                    ownerId: user?.uid || 'local-user',
                                    timestamp: new Date().toISOString()
                                  };
                                  await localDb.add('agentLogs', historyEntry);
                                  setInteractionHistory([historyEntry, ...interactionHistory]);
                               } catch (err) { 
                                 console.error(err); 
                                 setLabResult("资产生成失败，请检查网络或模型配置。");
                               }
                               finally { setIsGeneratingLab(false); }
                            }}
                            disabled={isGeneratingLab || !labReqs.trim()}
                            className="w-full py-6 bg-purple-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.4em] shadow-2xl hover:bg-purple-700 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50"
                         >
                            {isGeneratingLab ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6" />}
                            熔炼生成
                         </button>
                      </div>

                      <div className="bg-[#1A1C1E] border border-white/10 rounded-[3rem] overflow-hidden flex flex-col relative min-h-[500px]">
                         <div className="px-8 py-5 border-b border-white/5 bg-white/5 flex justify-between items-center relative z-10">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">熔炼输出 (Forge Output)</span>
                            {labResult && (
                               <button 
                                onClick={async () => { 
                                  try {
                                    await navigator.clipboard.writeText(labResult); 
                                    alert('已复制到剪贴板'); 
                                  } catch (err) {
                                    console.error('Failed to copy:', err);
                                  }
                                }} 
                                className="text-purple-400 hover:text-white transition-colors"
                              >
                                  <Cpu className="w-4 h-4" />
                               </button>
                            )}
                         </div>
                         <div className="flex-1 p-10 overflow-y-auto no-scrollbar font-mono text-xs leading-relaxed text-gray-300">
                            {labResult ? (
                               <div className="prose prose-invert prose-sm max-w-none">
                                  {labResult.split('\n').map((line, i) => (
                                     <p key={i} className="mb-4">{line}</p>
                                  ))}
                               </div>
                            ) : (
                               <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                                  <DbIcon className="w-16 h-16 mb-6" />
                                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">待熔炼生成中...</p>
                               </div>
                            )}
                         </div>
                      </div>
                   </div>
                </motion.div>
              )}

              {activeTab === 'skills' && (
                <motion.div key="skills" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                   <h2 className="text-3xl font-bold tracking-tight text-gray-900 italic">Layer 4: 认知能力集</h2>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {skills.map(skill => (
                        <div 
                          key={skill.id} 
                          onClick={() => setSelectedSkill(skill)}
                          className="bg-[#1A1C1E] border border-white/10 p-8 rounded-[2.5rem] relative group hover:border-indigo-500/30 transition-all cursor-pointer shadow-xl shadow-indigo-500/5"
                        >
                           <div className="flex justify-between items-start mb-4">
                              <Workflow className="w-6 h-6 text-indigo-400 group-hover:scale-110 transition-transform" />
                              <div className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Usage: {skill.usageCount || 0}</div>
                           </div>
                            <h4 className="text-lg font-bold mb-3 group-hover:text-indigo-300 text-white transition-colors uppercase tracking-tight">
                               {skill.name || '未命名能力'}
                            </h4>
                            <div className="flex gap-2 flex-wrap mb-4">
                               <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-[8px] font-black uppercase rounded border border-indigo-500/30">
                                  {skill.type || 'Core'}
                               </span>
                               <span className="px-1.5 py-0.5 bg-white/10 text-gray-400 text-[8px] font-bold uppercase rounded border border-white/10">
                                  v{(skill.usageCount || 0) > 10 ? '2.1' : '1.0'}
                               </span>
                            </div>
                            <p className="text-[11px] text-gray-400 mb-6 leading-relaxed line-clamp-3 group-hover:text-gray-300 transition-colors">
                               {skill.description || '该能力暂无详细描述，系统正在自动完善中...'}
                            </p>
                           <div className="space-y-2">
                              <div className="flex justify-between items-center text-[9px] font-black uppercase text-gray-500">
                                 <span>Performance</span>
                                 <span>{Math.round(skill.performanceScore * 100)}%</span>
                              </div>
                              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                 <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${skill.performanceScore * 100}%` }}
                                    className="h-full bg-indigo-500"
                                 />
                              </div>
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
                <motion.div key="evolution" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                   <div className="flex items-center justify-between">
                      <h2 className="text-3xl font-bold tracking-tight">Layer 7: 进化引擎</h2>
                      <div className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold flex items-center gap-2">
                         <Zap className="w-4 h-4" /> 自治化提案审核
                      </div>
                   </div>
                   <div className="space-y-6 pb-20">
                      {proposals.length === 0 ? (
                        <div className="py-20 text-center opacity-30">
                          <Lightbulb className="w-12 h-12 mx-auto mb-4" />
                          <p className="text-[10px] font-black uppercase tracking-widest">暂无进化提案</p>
                        </div>
                      ) : (
                        proposals.map(proposal => (
                          <div 
                            key={proposal.id} 
                            onClick={() => setSelectedProposal(proposal)}
                            className="bg-white/5 border border-white/10 p-10 rounded-[3rem] grid grid-cols-1 lg:grid-cols-4 gap-10 hover:bg-white/10 transition-all cursor-pointer group"
                          >
                             <div className="lg:col-span-3 space-y-6">
                                <div className="flex items-center gap-4">
                                   <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${proposal.status === 'pending' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>{proposal.status}</div>
                                   {proposal.isManual && <div className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[9px] font-black uppercase">Human Inject</div>}
                                </div>
                                <h4 className="text-xl font-bold text-emerald-400 group-hover:translate-x-2 transition-transform tracking-tight flex items-center gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    「{proposal.suggestedSkillName}」
                                 </h4>
                                <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{proposal.suggestedSkillDescription}</p>
                                {proposal.evaluation && <div className="p-5 bg-blue-600/5 rounded-2xl text-xs text-gray-400 italic mb-2">“{proposal.evaluation}”</div>}
                                <div className="grid grid-cols-2 gap-4">
                                   <div className="text-[10px] text-gray-600">
                                      <span className="font-black uppercase mr-2 text-emerald-500/50">Problem:</span>
                                      <span className="line-clamp-1 italic">{proposal.problem}</span>
                                   </div>
                                   <div className="text-[10px] text-gray-600">
                                      <span className="font-black uppercase mr-2 text-blue-500/50">Capability:</span>
                                      <span className="line-clamp-1 italic text-gray-400">{proposal.missingCapability}</span>
                                   </div>
                                </div>
                             </div>
                             <div className="flex flex-col items-center justify-center gap-4 border-l border-white/5 pl-10">
                                <ArrowRight className="w-8 h-8 text-gray-800 group-hover:text-emerald-500 transition-all group-hover:translate-x-2" />
                                <span className="text-[8px] font-black uppercase text-gray-800 group-hover:text-emerald-500">View Proposal</span>
                             </div>
                          </div>
                        ))
                      )}
                   </div>
                </motion.div>
              )}

              {activeTab === 'llm' && (
                <motion.div key="llm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                   <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-3xl font-bold tracking-tight mb-2">模型枢纽 (LLM Hub)</h2>
                        <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest flex items-center gap-2">
                           <Layers className="w-3 h-3" /> Multi-Model Orchestration Layer
                        </p>
                      </div>
                      <button 
                        onClick={() => setIsAddingLLM(true)}
                        className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                      >
                         <Plus className="w-3.5 h-3.5" /> 添加新模型配置
                      </button>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {llmConfigs.map(config => (
                        <div 
                          key={config.id} 
                          className={`p-10 rounded-[2.5rem] border transition-all flex flex-col gap-6 relative group overflow-hidden ${
                            config.isPrimary 
                              ? 'bg-blue-600/5 border-blue-500/30 ring-2 ring-blue-500/20' 
                              : 'bg-white/5 border-white/10'
                          }`}
                        >
                           <div className="flex justify-between items-start relative z-10">
                              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                                 <Globe className={`w-6 h-6 ${config.isPrimary ? 'text-blue-400' : 'text-gray-500'}`} />
                              </div>
                              <div className="flex gap-2">
                                {!config.isPrimary && (
                                  <>
                                    <button 
                                      onClick={() => setPrimaryModel(config.id)}
                                      className="px-3 py-1 bg-white/5 text-[9px] font-black uppercase rounded-lg hover:bg-blue-600 transition-colors"
                                    >
                                       设为默认
                                    </button>
                                    <button 
                                      onClick={() => deleteLLM(config.id)}
                                      className="p-1.5 text-gray-600 hover:text-red-500 transition-colors"
                                    >
                                       <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                                {config.isPrimary && (
                                  <span className="px-3 py-1 bg-blue-600 text-white text-[9px] font-black uppercase rounded-lg shadow-lg">
                                     正在运行
                                  </span>
                                )}
                              </div>
                           </div>

                           <div className="relative z-10">
                              <h4 className="text-xl font-bold mb-1">{config.displayName}</h4>
                              <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500">
                                 <span className="px-2 py-0.5 bg-white/5 rounded border border-white/10 uppercase">{config.provider}</span>
                                 <span className="opacity-40">|</span>
                                 <span>{config.modelId}</span>
                              </div>
                           </div>

                           <div className="mt-4 flex items-center gap-6 relative z-10">
                              <div className="flex items-center gap-2">
                                 <div className={`w-1.5 h-1.5 rounded-full ${config.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                 <span className="text-[10px] font-bold text-gray-400 capitalize">{config.status}</span>
                              </div>
                              {config.latency && (
                                <div className="text-[10px] font-bold text-gray-500">
                                   Latency: <span className="text-gray-300">{config.latency}ms</span>
                                </div>
                              )}
                           </div>
                           <div className="absolute -bottom-4 -right-4 text-7xl font-black text-white/[0.02] pointer-events-none select-none italic uppercase">
                                {config.provider}
                           </div>
                        </div>
                      ))}
                   </div>
                </motion.div>
              )}

              {activeTab === 'history' && (
                <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                   <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-3xl font-bold tracking-tight mb-2">研讨历史 (Agent Logs)</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                           <Clock className="w-3 h-3" /> Historical Decision & Generation Logs
                        </p>
                      </div>
                      <button 
                        onClick={async () => {
                          if (confirm('确定要清空所有历史记录吗？')) {
                            const logs = await localDb.getAll('agentLogs');
                            for (const log of logs) {
                              await localDb.delete('agentLogs', log.id);
                            }
                            setInteractionHistory([]);
                          }
                        }}
                        className="px-4 py-2 bg-red-900/10 text-red-400 border border-red-800/20 rounded-xl text-[10px] font-black uppercase hover:bg-red-900/20 transition-all"
                      >
                         清空记录
                      </button>
                   </div>

                   <div className="space-y-4">
                      {interactionHistory.length === 0 ? (
                        <div className="py-20 text-center opacity-20">
                          <History className="w-16 h-16 mx-auto mb-4" />
                          <p className="text-sm font-bold uppercase tracking-widest">暂无历史记录</p>
                        </div>
                      ) : (
                        interactionHistory.map(item => (
                          <div 
                            key={item.id}
                            onClick={() => setViewingHistoryItem(item)}
                            className="bg-white/5 border border-white/10 p-6 rounded-3xl hover:bg-white/10 transition-all cursor-pointer flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-6">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.type === 'reasoning' ? 'bg-blue-600/20 text-blue-400' : 'bg-purple-600/20 text-purple-400'}`}>
                                {item.type === 'reasoning' ? <TrendingUp className="w-6 h-6" /> : <MessageSquarePlus className="w-6 h-6" />}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-gray-200 line-clamp-1 mb-1">{item.query}</h4>
                                <div className="flex items-center gap-3">
                                  <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">
                                    {new Date(item.timestamp).toLocaleString()}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${item.type === 'reasoning' ? 'bg-blue-600/20 text-blue-300' : 'bg-purple-600/20 text-purple-300'}`}>
                                    {item.type === 'reasoning' ? 'Strategic Reasoning' : 'Asset Generation'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-all group-hover:translate-x-1" />
                          </div>
                        ))
                      )}
                   </div>
                </motion.div>
              )}
        </div>

           {viewingHistoryItem && (
             <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-gray-900/90 backdrop-blur-xl">
               <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#1A1C1E] border border-white/10 rounded-[3rem] w-full max-w-4xl relative p-12 text-white shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar flex flex-col">
                  <button onClick={() => setViewingHistoryItem(null)} className="absolute top-10 right-10 text-gray-500 hover:text-white"><XCircle className="w-8 h-8" /></button>
                  
                  <div className="flex items-center gap-6 mb-10 shrink-0">
                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg ${viewingHistoryItem.type === 'reasoning' ? 'bg-blue-600/20 text-blue-400' : 'bg-purple-600/20 text-purple-400'}`}>
                      {viewingHistoryItem.type === 'reasoning' ? <TrendingUp className="w-8 h-8" /> : <MessageSquarePlus className="w-8 h-8" />}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">历史记录详情</h3>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{new Date(viewingHistoryItem.timestamp).toLocaleString()}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${viewingHistoryItem.type === 'reasoning' ? 'bg-blue-600/20 text-blue-300' : 'bg-purple-600/20 text-purple-300'}`}>
                          {viewingHistoryItem.type === 'reasoning' ? 'Strategic reasoning' : 'Lab Asset'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8 flex-1">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">原始指令 (Original Query)</label>
                      <div className="p-6 bg-white/5 rounded-2xl border border-white/5 text-sm italic text-gray-100">
                        "{viewingHistoryItem.query}"
                      </div>
                    </div>

                    {viewingHistoryItem.type === 'reasoning' ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="md:col-span-2 bg-blue-600/5 border border-blue-500/20 p-8 rounded-3xl">
                            <h4 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-400">
                              <BarChart3 className="w-5 h-5" /> 核心决策
                            </h4>
                            <div className="font-bold text-gray-100 mb-4">{viewingHistoryItem.result.decision}</div>
                            <div className="text-sm text-gray-400 leading-relaxed mb-6">{viewingHistoryItem.result.analysis}</div>
                            <div className="p-4 bg-blue-600 shadow-xl shadow-blue-600/20 rounded-2xl text-sm font-bold">
                              {viewingHistoryItem.result.recommendedAction}
                            </div>
                          </div>
                          <div className="bg-white/5 border border-white/5 p-8 rounded-3xl">
                            <h4 className="text-[10px] font-black tracking-widest text-gray-500 mb-6 uppercase">命中的能力</h4>
                            <div className="flex flex-wrap gap-2">
                              {(viewingHistoryItem.result.usedSkills || []).map((s: any) => (
                                <span key={s} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[9px] font-bold text-gray-300">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 block">生成的资产 (Generated Asset - {viewingHistoryItem.result.labType})</label>
                        <div className="bg-black/40 p-8 rounded-3xl border border-white/10 font-mono text-xs leading-relaxed text-gray-300 overflow-x-auto whitespace-pre-wrap">
                          {viewingHistoryItem.result.labResult}
                        </div>
                        <div className="mt-6 flex justify-end">
                           <button 
                             onClick={() => {
                               navigator.clipboard.writeText(viewingHistoryItem.result.labResult || '');
                               alert('已复制到剪贴板');
                             }}
                             className="px-6 py-3 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-purple-700 transition-all"
                           >
                             <Plus className="w-4 h-4" /> 复制资产
                           </button>
                        </div>
                      </div>
                    )}
                  </div>
               </motion.div>
             </div>
           )}

           {selectedSkill && (
             <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-gray-900/80 backdrop-blur-md">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#1A1C1E] border border-white/10 rounded-[3rem] w-full max-w-2xl relative p-12 text-white shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
                   <button onClick={() => setSelectedSkill(null)} className="absolute top-10 right-10 text-gray-500 hover:text-white"><XCircle className="w-8 h-8" /></button>
                   
                   <div className="flex items-center gap-6 mb-10">
                      <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                         <Workflow className="w-8 h-8" />
                      </div>
                      <div>
                         <h3 className="text-2xl font-bold">{selectedSkill.name}</h3>
                         <div className="flex items-center gap-4 mt-2">
                            <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">{selectedSkill.type} Capability</span>
                            <span className="text-[10px] font-black uppercase text-gray-600 tracking-widest">Usage: {selectedSkill.usageCount}</span>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-8">
                      <div>
                         <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 block">能力描述 (Description)</label>
                         <p className="text-sm text-gray-300 leading-relaxed">{selectedSkill.description}</p>
                      </div>

                      <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 block">内置逻辑 (Internal Logic / Prompt)</label>
                          <div className="bg-black/40 p-6 rounded-2xl font-mono text-xs text-indigo-300 border border-white/5 leading-relaxed">
                             {selectedSkill.logic}
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                         <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 block">适用阶段 (Applicable Phases)</label>
                            <div className="flex flex-wrap gap-2">
                               {(selectedSkill.applicablePhases || []).map(p => (
                                 <span key={p} className="px-2 py-1 bg-white/5 rounded text-[9px] font-bold text-gray-400 uppercase">{p}</span>
                               ))}
                            </div>
                         </div>
                         <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 block">性能评分 (Performance)</label>
                            <div className="flex items-center gap-4">
                               <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-500" style={{ width: `${selectedSkill.performanceScore * 100}%` }} />
                               </div>
                               <span className="text-sm font-bold text-indigo-400">{Math.round(selectedSkill.performanceScore * 100)}%</span>
                            </div>
                         </div>
                      </div>
                   </div>
                </motion.div>
             </div>
           )}

           {selectedProposal && (
             <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-gray-900/80 backdrop-blur-md">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#1A1C1E] border border-white/10 rounded-[3rem] w-full max-w-3xl relative p-12 text-white shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
                   <button onClick={() => setSelectedProposal(null)} className="absolute top-10 right-10 text-gray-500 hover:text-white"><XCircle className="w-8 h-8" /></button>
                   
                   <div className="flex items-center gap-6 mb-10">
                      <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
                         <Zap className="w-8 h-8" />
                      </div>
                      <div>
                         <h3 className="text-2xl font-bold">{selectedProposal.suggestedSkillName}</h3>
                         <div className="flex items-center gap-4 mt-2">
                            <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${selectedProposal.status === 'pending' ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{selectedProposal.status}</div>
                            <span className="text-[10px] font-black uppercase text-gray-600 tracking-widest">Evolution Proposal</span>
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-8">
                         <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-3 block">发现的问题 (Observed Problem)</label>
                            <p className="text-sm font-medium text-gray-300 leading-relaxed border-l-2 border-red-500/30 pl-4 bg-red-500/5 p-4 rounded-r-xl">{selectedProposal.problem}</p>
                         </div>
                         <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-3 block">缺少的的能力 (Missing Capability)</label>
                            <p className="text-sm font-medium text-gray-300 leading-relaxed border-l-2 border-blue-500/30 pl-4 bg-blue-500/5 p-4 rounded-r-xl">{selectedProposal.missingCapability}</p>
                         </div>
                         <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-3 block">根本原因 (Root Cause)</label>
                            <p className="text-sm font-medium text-gray-300 leading-relaxed border-l-2 border-indigo-500/30 pl-4 bg-indigo-500/5 p-4 rounded-r-xl">{selectedProposal.rootCause}</p>
                         </div>
                      </div>

                      <div className="space-y-8">
                         <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-3 block">建议的能力逻辑 (Suggested Logic)</label>
                            <div className="bg-black/40 p-6 rounded-2xl font-mono text-[10px] text-emerald-300 border border-white/5 leading-relaxed h-[200px] overflow-y-auto no-scrollbar">
                               {selectedProposal.suggestedSkillLogic}
                            </div>
                         </div>
                         {selectedProposal.evaluation && (
                            <div>
                               <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 block">AI 自评 (Evaluation)</label>
                               <div className="p-5 bg-white/5 rounded-2xl text-xs text-gray-400 italic border border-white/5">
                                  "{selectedProposal.evaluation}"
                               </div>
                            </div>
                         )}
                         {selectedProposal.status === 'pending' && (
                           <button 
                             onClick={() => {
                                approveProposal(selectedProposal);
                                setSelectedProposal(null);
                             }}
                             className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 transition-all active:scale-95"
                           >
                               批准并立即集成
                           </button>
                         )}
                      </div>
                   </div>
                </motion.div>
             </div>
           )}

           {isAddingLLM && (
             <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-gray-900/80 backdrop-blur-md">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#1A1C1E] border border-white/10 rounded-[3rem] w-full max-w-xl relative p-12 text-white shadow-2xl">
                   <button onClick={() => setIsAddingLLM(false)} className="absolute top-10 right-10 text-gray-500 hover:text-white"><XCircle className="w-8 h-8" /></button>
                   <div className="flex items-center gap-6 mb-10">
                      <div className="w-14 h-14 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-600/20 text-white font-bold text-2xl">
                         +
                      </div>
                      <h3 className="text-2xl font-bold">添加模型配置</h3>
                   </div>

                    <form onSubmit={handleAddLLM} className="space-y-6">
                       <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-500 px-2">显示名称 (Display Name)</label>
                         <input required value={newLLM.displayName} onChange={e => setNewLLM({...newLLM, displayName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-orange-500" placeholder="例如：Kimi-V1-Pro" />
                       </div>

                       <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-gray-500 px-2">供应商 (Provider)</label>
                           <select 
                             value={newLLM.provider} 
                             onChange={e => setNewLLM({...newLLM, provider: e.target.value as LLMProvider})}
                             className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-orange-500 appearance-none"
                           >
                              <option value={LLMProvider.GOOGLE} className="bg-[#1A1C1E]">Google Gemini</option>
                              <option value={LLMProvider.OPENAI} className="bg-[#1A1C1E]">OpenAI</option>
                              <option value={LLMProvider.DEEPSEEK} className="bg-[#1A1C1E]">Deepseek</option>
                              <option value={LLMProvider.KIMI} className="bg-[#1A1C1E]">Kimi (Moonshot)</option>
                              <option value={LLMProvider.CUSTOM} className="bg-[#1A1C1E]">Custom (OpenAI Compatible)</option>
                           </select>
                         </div>
                         <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-gray-500 px-2">模型标识符 (Model ID)</label>
                           <input required value={newLLM.modelId} onChange={e => setNewLLM({...newLLM, modelId: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-orange-500" placeholder="例如：moonshot-v1-8k" />
                         </div>
                       </div>

                       <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-500 px-2 flex items-center gap-2">
                           <Key className="w-3 h-3" /> API KEY
                         </label>
                         <input type="password" required={newLLM.provider !== LLMProvider.GOOGLE} value={newLLM.apiKey} onChange={e => setNewLLM({...newLLM, apiKey: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-orange-500" placeholder="sk-..." />
                       </div>

                       <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-500 px-2 flex items-center gap-2">
                           <Link className="w-3 h-3" /> 自定义终端 (Base URL - 可选)
                         </label>
                         <input value={newLLM.baseUrl} onChange={e => setNewLLM({...newLLM, baseUrl: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-orange-500" placeholder="https://api.openai.com/v1" />
                       </div>

                       <div className="pt-6">
                         <button type="submit" className="w-full py-5 bg-orange-600 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-orange-700 transition-all flex items-center justify-center gap-3">
                            保存配置
                         </button>
                       </div>
                    </form>
                </motion.div>
             </div>
           )}

        {/* Manual Proposal Modal */}
           {isAddingProposal && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/80 backdrop-blur-md">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#1A1C1E] border border-white/10 rounded-[3rem] w-full max-w-2xl relative p-12 text-white">
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
    </div>
  );
}
