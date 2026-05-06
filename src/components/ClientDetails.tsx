import { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../services/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Client, Interaction, ContentAsset, ClientStage } from '../types';
import { generateMarketingReply, analyzeClientStage, generateContentAsset, consultClientStrategy, generateClientJourney, generateMeetingIntelligence } from '../services/gemini';
import { PHASE_MATRIX } from '../constants';
import { 
  ArrowLeft, 
  MessageSquare, 
  FileText, 
  BrainCircuit, 
  Sparkles, 
  Send,
  Copy,
  RefreshCw,
  Target,
  CheckCircle2,
  X,
  Archive,
  ChevronRight,
  ShieldAlert,
  Flag,
  UserCheck,
  TrendingUp,
  Workflow,
  Clock,
  MessageCircle,
  Map,
  Zap,
  BarChart3,
  Users2,
  ShieldCheck,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

interface ClientDetailsProps {
  client: Client;
  onBack: () => void;
}

export default function ClientDetails({ client, onBack }: ClientDetailsProps) {
  const [activeTab, setActiveTab] = useState<'interactions' | 'content' | 'analysis' | 'consult' | 'briefing'>('interactions');
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [contentAssets, setContentAssets] = useState<ContentAsset[]>([]);
  
  // Interaction Form
  const [newInteraction, setNewInteraction] = useState('');
  const [generatingReply, setGeneratingReply] = useState(false);
  const [aiReply, setAiReply] = useState('');

  // Analysis State
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Consult State
  const [consultationText, setConsultationText] = useState('');
  const [consulting, setConsulting] = useState(false);
  const [consultHistory, setConsultHistory] = useState<{ role: 'user' | 'ai', content: string }[]>([]);

  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Client>>({});

  // Content Gen Form
  const [genType, setGenType] = useState<'PPT' | 'Report' | 'Strategy' | 'Prompt' | 'Journey' | 'Briefing'>('Strategy');
  const [genReqs, setGenReqs] = useState('');
  const [journeyHotTopics, setJourneyHotTopics] = useState('');
  const [generatingContent, setGeneratingContent] = useState(false);

  // Briefing State
  const [rawMeetingInput, setRawMeetingInput] = useState('');
  const [generatingBriefing, setGeneratingBriefing] = useState(false);
  const [briefingResult, setBriefingResult] = useState<any>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const iRef = collection(db, 'clients', client.id, 'interactions');
    const iQuery = query(iRef, orderBy('timestamp', 'asc'));
    const iUnsub = onSnapshot(iQuery, (snap) => {
      setInteractions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Interaction)));
    });

    const cRef = collection(db, 'clients', client.id, 'content');
    const cQuery = query(cRef, orderBy('createdAt', 'desc'));
    const cUnsub = onSnapshot(cQuery, (snap) => {
      setContentAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as ContentAsset)));
    });

    return () => { iUnsub(); cUnsub(); };
  }, [client.id]);

  const handleGenerateReply = async () => {
    if (!newInteraction.trim()) return;
    setGeneratingReply(true);
    try {
      const history = interactions.slice(-5).map(i => `${i.authorId === auth.currentUser?.uid ? 'Me' : 'Client'}: ${i.content}`).join('\n');
      const reply = await generateMarketingReply(newInteraction, history || client.memorySummary || '');
      setAiReply(reply || '');
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingReply(false);
    }
  };

  const handleSaveInteraction = async () => {
    if (!newInteraction.trim() || !auth.currentUser) return;
    try {
      await addDoc(collection(db, 'clients', client.id, 'interactions'), {
        type: 'chat',
        content: newInteraction,
        aiReplySuggestion: aiReply,
        authorId: auth.currentUser.uid,
        timestamp: serverTimestamp(),
      });
      
      await updateDoc(doc(db, 'clients', client.id), {
        updatedAt: serverTimestamp()
      });

      setNewInteraction('');
      setAiReply('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `clients/${client.id}/interactions`);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const textLog = interactions.map(i => `${i.type}: ${i.content}`).join('\n');
      const result = await analyzeClientStage(textLog);
      setAnalysisResult(result);
      
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + (result.recommendedFollowupDays || 7));

      await updateDoc(doc(db, 'clients', client.id), {
        stage: result.stage,
        decisionMatrix: result.matrix,
        nextActionSuggestion: result.nextActionSuggestion,
        nextActionDate: nextDate,
        projectScore: result.scoreDetails.total,
        scoreDetails: result.scoreDetails,
        promoter: result.extractedFields?.promoter || client.promoter,
        promoterDept: result.extractedFields?.promoterDept || client.promoterDept,
        keyPerson: result.extractedFields?.keyPerson || client.keyPerson,
        groupMeeting: result.extractedFields?.groupMeeting || client.groupMeeting,
        interestedProducts: result.extractedFields?.interestedProducts || client.interestedProducts,
        budgetScale: result.extractedFields?.budgetScale || client.budgetScale,
        resistancePoint: result.extractedFields?.resistancePoint || client.resistancePoint,
        missingMaterials: result.extractedFields?.missingMaterials || client.missingMaterials,
        progress: result.extractedFields?.progress || client.progress,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateContent = async (overrideType?: typeof genType) => {
    const activeType = overrideType || genType;
    setGeneratingContent(true);
    try {
      let body = '';
      let title = '';
      
      if (activeType === 'Journey') {
        const journey = await generateClientJourney(genReqs, journeyHotTopics, JSON.stringify(client));
        title = `GEO Cognitive Journey for ${client.company}`;
        body = `### 总体战术导图摘要\n${journey.summary}\n\n` + 
               journey.journeySteps.map((s: any) => 
                 `#### ${s.step}\n**策略:** ${s.strategy}\n\n**建议话术:** \n> ${s.scripts}\n`
               ).join('\n---\n');
      } else {
        body = await generateContentAsset(activeType, JSON.stringify(client), genReqs);
        title = `${activeType} for ${client.company} - ${new Date().toLocaleDateString()}`;
      }

      await addDoc(collection(db, 'clients', client.id, 'content'), {
        title,
        type: activeType,
        body,
        ownerId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
      });
      setGenReqs('');
      setJourneyHotTopics('');
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingContent(false);
    }
  };

  const handleGenerateBriefing = async () => {
    if (!rawMeetingInput.trim()) return;
    setGeneratingBriefing(true);
    try {
      const result = await generateMeetingIntelligence(rawMeetingInput, {
        clientName: client.company,
        projectName: client.company, // Using company as project name for simple context
        currentPhase: client.stage,
        participants: [client.name]
      });
      setBriefingResult(result);

      // Save as a permanent asset
      const body = `
### 3.1 一句话结论 (Summary)
${result.summary}

### 3.2 项目关键进展 (Key Updates)
${result.keyUpdates.map((u: string) => `- ${u}`).join('\n')}

### 3.3 风险识别 (Risks)
${result.risks.map((r: any) => `- **${r.risk}**\n  → 影响：${r.impact}`).join('\n')}

### 3.4 机会点 (Opportunities)
${result.opportunities.map((o: string) => `- ${o}`).join('\n')}

### 3.5 下一步行动 (Next Actions)
${result.nextActions.map((a: any) => `- **${a.who}**: ${a.what} (${a.when})`).join('\n')}

### 3.6 资源诉求 (Resource Requests)
${result.resourceRequests.map((r: any) => `- **${r.resource}**\n  → 原因：${r.reason}`).join('\n')}

### 3.7 战略意义 (Strategic Implication)
${result.strategicImplication}

---

### Stakeholder Mapping (组织博弈)
**当前格局:**
${result.stakeholderMapping.currentLandscape.map((l: string) => `- ${l}`).join('\n')}

${result.stakeholderMapping.competitorAnalysis ? `
**对手情况 (${result.stakeholderMapping.competitorAnalysis.competitorName}):**
- **优势:** ${result.stakeholderMapping.competitorAnalysis.theirStrengths.join(', ')}
- **风险:** ${result.stakeholderMapping.competitorAnalysis.theirRisks.join(', ')}
` : ''}

### Winning Strategy (赢单策略)
${result.winningStrategy}
      `;

      await addDoc(collection(db, 'clients', client.id, 'content'), {
        title: `Meeting Intelligence & Progress - ${new Date().toLocaleDateString()}`,
        type: 'Briefing',
        body: body.trim(),
        ownerId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
      });
      
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingBriefing(false);
    }
  };

  const handleConsult = async () => {
    if (!consultationText.trim()) return;
    const userMsg = consultationText;
    setConsultationText('');
    setConsultHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setConsulting(true);

    try {
      const context = `
        Client: ${client.company}
        Summary: ${client.memorySummary}
        Interactions: ${interactions.map(i => i.content).join('\n')}
      `;
      const result = await consultClientStrategy(userMsg, context);
      setConsultHistory(prev => [...prev, { role: 'ai', content: result.reply }]);

      if (result.suggestedUpdates) {
        // AI suggests updating client profile based on discussion
        const updates: any = { updatedAt: serverTimestamp() };
        if (result.suggestedUpdates.memorySummary) updates.memorySummary = result.suggestedUpdates.memorySummary;
        if (result.suggestedUpdates.stage) updates.stage = result.suggestedUpdates.stage;
        if (result.suggestedUpdates.nextActionSuggestion) updates.nextActionSuggestion = result.suggestedUpdates.nextActionSuggestion;
        
        await updateDoc(doc(db, 'clients', client.id), updates);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setConsulting(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateDoc(doc(db, 'clients', client.id), {
        ...editForm,
        updatedAt: serverTimestamp()
      });
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `clients/${client.id}`);
    }
  };

  const currentPhaseInfo = PHASE_MATRIX[client.stage];

  return (
    <div className="flex flex-col h-full bg-[#F5F7FA] -m-8 lg:-m-10">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 px-10 py-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-8">
          <button onClick={onBack} className="p-3 hover:bg-gray-50 border border-gray-100 rounded-xl transition-all shadow-sm">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <div className="flex items-center gap-4 mb-1">
              <h1 className="text-3xl font-bold tracking-tight text-[#1A1C1E]">{client.company}</h1>
              <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-blue-600 text-white rounded-full border border-blue-600">
                {currentPhaseInfo?.label || client.stage}
              </span>
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              主要联系人: {client.name} <span className="text-gray-200">•</span> 会话 ID: {client.id.slice(0, 8)}
            </p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => {
              setEditForm({ ...client });
              setIsEditing(true);
            }}
            className="flex flex-col items-start gap-1 px-6 py-3 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all shadow-sm group"
          >
            <div className="flex items-center gap-2.5">
               <Workflow className="w-4 h-4 text-emerald-600" />
               <span className="text-xs font-black uppercase tracking-widest text-[#1A1C1E]">手动更新档案</span>
            </div>
            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter group-hover:text-emerald-500 transition-colors">修改基础信息与决策阶段</span>
          </button>

          <button 
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex flex-col items-start gap-1 px-6 py-3 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all shadow-sm disabled:opacity-50 group"
          >
            <div className="flex items-center gap-2.5">
               {analyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4 text-blue-600" />}
               <span className="text-xs font-black uppercase tracking-widest text-[#1A1C1E]">同步战略审计</span>
            </div>
            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter group-hover:text-blue-500 transition-colors">基于全量互动同步得分与档案</span>
          </button>
        </div>
      </header>

      {/* Tabs Container */}
      <div className="px-10 py-6 bg-white border-b border-gray-100 shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex bg-gray-50 p-1.5 rounded-2xl w-fit">
          {[
            { id: 'interactions', label: 'CRM与AI对话', icon: MessageSquare },
            { id: 'briefing', label: '会议纪要/项目进展', icon: Briefcase },
            { id: 'consult', label: '战略咨询', icon: MessageCircle },
            { id: 'analysis', label: '战略阶段分析', icon: Target },
            { id: 'content', label: '资产实验室', icon: FileText },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-3 px-8 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${
                activeTab === tab.id 
                  ? 'bg-white text-[#1A1C1E] shadow-md shadow-gray-200/50' 
                  : 'text-gray-400 hover:text-gray-900'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-600' : ''}`} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col p-8 lg:p-10">
        <AnimatePresence mode="wait">
          {activeTab === 'briefing' && (
            <motion.div 
               key="briefing"
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 10 }}
               className="flex-1 flex gap-10 h-full overflow-hidden"
            >
               <div className="flex-1 flex flex-col gap-8 h-full overflow-y-auto no-scrollbar pb-10">
                  <section className="bg-white border border-gray-200 rounded-[2.5rem] p-10 shadow-sm space-y-8">
                     <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-[#1A1C1E] rounded-xl flex items-center justify-center shadow-lg">
                              <Briefcase className="w-5 h-5 text-blue-400" />
                           </div>
                           <div>
                              <h2 className="text-xl font-bold tracking-tight text-[#1A1C1E]">会议情报 & 项目结构化</h2>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">服务“推进决策”的自动化引擎</p>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-2 flex items-center gap-2">
                           <MessageSquare className="w-3 h-3" /> 原始对话 / 语音转写 / 笔记
                        </label>
                        <textarea 
                           value={rawMeetingInput}
                           onChange={e => setRawMeetingInput(e.target.value)}
                           placeholder="在此粘贴会议原始录音文本或碎片化沟通笔记..."
                           className="w-full h-48 bg-gray-50 border border-gray-100 rounded-3xl p-8 text-sm focus:bg-white focus:border-blue-600 outline-none transition-all resize-none shadow-inner"
                        />
                     </div>

                     <button 
                        onClick={handleGenerateBriefing}
                        disabled={generatingBriefing || !rawMeetingInput.trim()}
                        className="w-full py-7 bg-[#1A1C1E] text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.4em] shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50"
                     >
                        {generatingBriefing ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                        启动结构化分析并入库
                     </button>
                  </section>

                  <AnimatePresence>
                    {briefingResult && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-8"
                      >
                         {/* One Line Summary */}
                         <div className="bg-blue-600 text-white rounded-[2.5rem] p-10 shadow-2xl shadow-blue-500/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full -mr-16 -mt-16" />
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-200 mb-4 block flex items-center gap-2">
                               <Flag className="w-4 h-4" /> 一句话结论 (Summary)
                            </label>
                            <div className="text-2xl font-bold tracking-tight leading-relaxed">
                               {briefingResult.summary}
                            </div>
                         </div>

                         {/* Grid Modules */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white border border-gray-200 rounded-[2.5rem] p-8 shadow-sm">
                               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-6 block flex items-center gap-2">
                                  <TrendingUp className="w-4 h-4" /> 项目关键进展 (Key Updates)
                               </label>
                               <ul className="space-y-4">
                                  {briefingResult.keyUpdates.map((u: string, i: number) => (
                                    <li key={i} className="flex gap-4 group">
                                       <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 shrink-0 group-hover:scale-150 transition-transform" />
                                       <p className="text-sm font-bold text-gray-800 leading-relaxed">{u}</p>
                                    </li>
                                  ))}
                               </ul>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-[2.5rem] p-8 shadow-sm">
                               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600 mb-6 block flex items-center gap-2">
                                  <ShieldAlert className="w-4 h-4" /> 风险识别 (Risks)
                               </label>
                               <div className="space-y-6">
                                  {briefingResult.risks.map((r: any, i: number) => (
                                    <div key={i} className="bg-red-50/50 border border-red-100 p-5 rounded-2xl">
                                       <div className="text-sm font-black text-red-900 mb-1">{r.risk}</div>
                                       <p className="text-[11px] text-red-700 leading-relaxed">→ 影响：{r.impact}</p>
                                    </div>
                                  ))}
                               </div>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-[2.5rem] p-8 shadow-sm">
                               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-6 block flex items-center gap-2">
                                  <Zap className="w-4 h-4" /> 机会点 (Opportunities)
                               </label>
                               <ul className="space-y-4">
                                  {briefingResult.opportunities.map((o: string, i: number) => (
                                    <li key={i} className="flex gap-3">
                                       <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                       <p className="text-sm font-medium text-emerald-900 leading-relaxed">{o}</p>
                                    </li>
                                  ))}
                               </ul>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-[2.5rem] p-8 shadow-sm">
                               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-6 block flex items-center gap-2">
                                  <Clock className="w-4 h-4" /> 下一步行动 (Next Actions)
                               </label>
                               <div className="space-y-4">
                                  {briefingResult.nextActions.map((a: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                                       <div>
                                          <div className="text-xs font-black text-indigo-900 uppercase tracking-widest">{a.who}</div>
                                          <div className="text-sm font-bold text-gray-800">{a.what}</div>
                                       </div>
                                       <div className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">{a.when}</div>
                                    </div>
                                  ))}
                               </div>
                            </div>
                         </div>

                         {/* Resource Requests */}
                         <div className="bg-[#f1f5f9] border border-gray-200 rounded-[2.5rem] p-10">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-8 block flex items-center gap-2">
                               <BarChart3 className="w-4 h-4" /> 资源诉求 (Resource Requests)
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                               {briefingResult.resourceRequests.map((r: any, i: number) => (
                                 <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
                                    <div className="text-sm font-black text-gray-900 mb-3">{r.resource}</div>
                                    <div className="mt-auto pt-4 border-t border-gray-50">
                                       <p className="text-[11px] text-gray-500 leading-relaxed">
                                          <span className="font-black text-blue-600 uppercase text-[9px] mr-1">Why:</span> {r.reason}
                                       </p>
                                    </div>
                                 </div>
                               ))}
                            </div>
                         </div>

                         {/* Strategic Alignment */}
                         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 bg-[#1A1C1E] text-white rounded-[3rem] p-10 overflow-hidden relative">
                               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-[80px] -mr-32 -mt-32" />
                               <div className="relative z-10 space-y-10">
                                  <div className="flex items-center gap-3">
                                     <Users2 className="w-6 h-6 text-emerald-400" />
                                     <h3 className="text-xl font-bold">Stakeholder Mapping & 博弈分析</h3>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                     <div className="space-y-6">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500/50">当前格局</label>
                                        <div className="space-y-4">
                                           {briefingResult.stakeholderMapping.currentLandscape.map((l: string, i: number) => (
                                             <div key={i} className="text-sm font-bold text-emerald-50 leading-relaxed border-l-2 border-emerald-500/30 pl-4">{l}</div>
                                           ))}
                                        </div>
                                     </div>
                                     {briefingResult.stakeholderMapping.competitorAnalysis && (
                                       <div className="space-y-6 bg-white/5 p-6 rounded-2xl border border-white/10">
                                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center justify-between">
                                             <span>主要对手: {briefingResult.stakeholderMapping.competitorAnalysis.competitorName}</span>
                                             <ShieldCheck className="w-3 h-3" />
                                          </label>
                                          <div className="space-y-4">
                                             <div>
                                                <div className="text-[9px] font-black text-gray-500 uppercase mb-2">对手优势</div>
                                                <div className="flex flex-wrap gap-2">
                                                   {briefingResult.stakeholderMapping.competitorAnalysis.theirStrengths.map((s: string, i: number) => (
                                                      <span key={i} className="text-[10px] font-bold bg-white/10 px-2 py-1 rounded-md">{s}</span>
                                                   ))}
                                                </div>
                                             </div>
                                             <div>
                                                <div className="text-[9px] font-black text-gray-500 uppercase mb-2">对手风险</div>
                                                <div className="flex flex-wrap gap-2">
                                                   {briefingResult.stakeholderMapping.competitorAnalysis.theirRisks.map((r: string, i: number) => (
                                                      <span key={i} className="text-[10px] font-bold bg-red-400/20 text-red-200 px-2 py-1 rounded-md">{r}</span>
                                                   ))}
                                                </div>
                                             </div>
                                          </div>
                                       </div>
                                     )}
                                  </div>
                               </div>
                            </div>

                            <div className="flex flex-col gap-8">
                               <div className="bg-amber-500 text-white p-8 rounded-[2.5rem] shadow-xl shadow-amber-500/20">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-amber-100 mb-4 block">Winning Strategy (赢单策略)</label>
                                  <div className="text-lg font-black leading-relaxed">{briefingResult.winningStrategy}</div>
                               </div>
                               <div className="bg-white border border-gray-200 p-8 rounded-[2.5rem] flex-1">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">战略意义 (Strategic Implication)</label>
                                  <div className="text-sm font-medium text-gray-600 leading-relaxed italic border-l-4 border-gray-100 pl-4">
                                     {briefingResult.strategicImplication}
                                  </div>
                               </div>
                            </div>
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
               </div>

               <div className="w-[300px] shrink-0 space-y-8">
                  <div className="bg-[#1A1C1E] text-white rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -mr-16 -mt-16" />
                     <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-8">分析准则</h3>
                     <div className="space-y-6">
                        {[
                          { title: "拒绝流水账", desc: "AI 会自动过滤寒暄与废话，只保留核心信息。" },
                          { title: "服务决策", desc: "所有输出均围绕“下一步如何推进”展开。" },
                          { title: "组织映射", desc: "自动识别 Stakeholder 的心理账户与博弈倾向。" },
                          { title: "资源对齐", desc: "明确告知后端团队需要何种支持才能锁定闭环。" }
                        ].map((s, i) => (
                          <div key={i} className="space-y-1">
                             <div className="text-xs font-bold text-white/90">{s.title}</div>
                             <div className="text-[10px] text-white/40 leading-relaxed">{s.desc}</div>
                          </div>
                        ))}
                     </div>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'interactions' && (
            <motion.div 
              key="interactions"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 flex gap-10 h-full overflow-hidden"
            >
              {/* Interaction Log */}
              <div className="flex-1 bg-white border border-gray-200 rounded-[2.5rem] flex flex-col overflow-hidden shadow-sm">
                <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">互动流</span>
                  <div className="flex items-center gap-2">
                     <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                     <span className="text-[10px] font-bold uppercase text-gray-400">实时反馈循环</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                  {interactions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                         <MessageSquare className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">等待初始互动记录...</p>
                    </div>
                  ) : (
                    interactions.map((i, idx) => (
                      <div key={idx} className="space-y-4">
                        <div className="flex gap-6 items-start group">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ${
                            i.authorId === auth.currentUser?.uid 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-white border border-gray-200 text-gray-900'
                          }`}>
                            {i.authorId === auth.currentUser?.uid ? 'ME' : 'CL'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm bg-gray-50 p-6 rounded-2xl rounded-tl-none border border-gray-100/50 leading-relaxed text-gray-700 shadow-sm whitespace-pre-wrap">
                              {i.content}
                            </div>
                            <div className="mt-2 text-[8px] font-bold uppercase text-gray-400 tracking-widest px-1">
                              {i.timestamp?.toDate ? i.timestamp.toDate().toLocaleString() : '处理中...'}
                            </div>
                          </div>
                        </div>
                        {i.aiReplySuggestion && (
                          <div className="ml-16 bg-blue-600/5 border border-blue-600/10 rounded-2xl p-6 relative overflow-hidden group">
                             <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 rounded-bl-full -mr-8 -mt-8" />
                            <div className="flex items-center gap-2 text-[9px] font-bold uppercase text-blue-600 tracking-wider mb-3">
                              <Sparkles className="w-3 h-3" />
                              AI 战略建议
                            </div>
                            <div className="text-sm text-gray-800 prose-sm prose-p:leading-relaxed prose-strong:text-blue-700 max-w-none">
                              <ReactMarkdown>{i.aiReplySuggestion}</ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Tactical Progress Column */}
              <div className="w-[450px] flex flex-col gap-8 shrink-0">
                {/* Next Action Suggestion Card */}
                {client.nextActionSuggestion && (
                  <div className="bg-white border border-gray-200 rounded-[2.5rem] p-12 shadow-xl relative overflow-hidden min-h-[400px] flex flex-col">
                     <div className={`absolute top-0 right-0 w-4 h-full ${client.nextActionCompleted ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                     <div className="flex items-center justify-between mb-10">
                       <div className="flex items-center gap-4">
                          <Flag className={`w-6 h-6 ${client.nextActionCompleted ? 'text-emerald-500' : 'text-amber-500'}`} />
                          <span className="text-sm font-black uppercase tracking-widest text-[#1A1C1E]">
                             下一步行动建议 <span className="text-gray-300 ml-2">/AI 深度生成</span>
                          </span>
                       </div>
                       {client.nextActionCompleted && (
                         <span className="text-xs font-bold uppercase px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shadow-sm">已执行</span>
                       )}
                     </div>
                     <div className={`text-lg font-semibold leading-[1.8] mb-12 flex-1 overflow-y-auto max-h-[500px] pr-4 custom-scrollbar ${client.nextActionCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                       <div className="prose-p:mb-4">
                         <ReactMarkdown>{client.nextActionSuggestion}</ReactMarkdown>
                       </div>
                     </div>
                     <div className="flex items-center justify-between mt-auto pt-8 border-t border-gray-50">
                        <div className="flex flex-col gap-1">
                           <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              <Clock className="w-4 h-4" />
                              执行期限
                           </div>
                           <div className="text-xs font-bold text-gray-900">
                              {client.nextActionDate?.toDate ? client.nextActionDate.toDate().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) : '待定'}
                           </div>
                        </div>
                        <button 
                          onClick={async () => {
                            try {
                              await updateDoc(doc(db, 'clients', client.id), {
                                nextActionCompleted: !client.nextActionCompleted,
                                updatedAt: serverTimestamp()
                              });
                            } catch (err) { console.error(err); }
                          }}
                          className={`flex items-center gap-3 px-8 py-4.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
                            client.nextActionCompleted 
                              ? 'bg-gray-100 text-gray-400 hover:bg-gray-200 shadow-none' 
                              : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
                          }`}
                        >
                          <CheckCircle2 className={`w-5 h-5 ${client.nextActionCompleted ? 'text-emerald-500' : 'text-white'}`} /> 
                          {client.nextActionCompleted ? '已完成 - 点击撤回' : '确认已完成'}
                        </button>
                     </div>
                  </div>
                )}

                <div className="bg-[#1A1C1E] border border-gray-800 rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                  <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                       <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">AI 战术助手 (响应引擎)</span>
                    </div>
                    <span className="text-[8px] font-mono text-white/20 uppercase tracking-tighter">神经计算就绪</span>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-1">输入互动上下文</label>
                       <p className="text-[8px] text-white/10 uppercase tracking-tight px-1">粘贴邮件、通话摘要或客户反馈</p>
                    </div>
                    <textarea 
                      value={newInteraction}
                      onChange={e => setNewInteraction(e.target.value)}
                      placeholder="注入实时互动内容以生成话术建议..."
                      className="w-full h-40 bg-white/5 border border-white/10 p-5 text-sm text-white focus:bg-white/10 focus:border-blue-500/50 outline-none transition-all resize-none rounded-2xl font-sans placeholder:text-white/10"
                    />
                    <div className="flex gap-3">
                      <button 
                        onClick={handleGenerateReply}
                        disabled={generatingReply || !newInteraction}
                        className="flex-[2] flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-4 text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20 active:scale-95"
                      >
                        {generatingReply ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        生成回复建议
                      </button>
                      <button 
                         onClick={handleSaveInteraction}
                         disabled={!newInteraction}
                         className="flex-1 flex items-center justify-center bg-white/10 text-white rounded-xl py-4 hover:bg-white/20 transition-all disabled:opacity-50"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {aiReply && (
                    <motion.div 
                      key="ai-reply"
                      initial={{ height: 0, opacity: 0, y: 10 }}
                      animate={{ height: 'auto', opacity: 1, y: 0 }}
                      exit={{ height: 0, opacity: 0, y: 10 }}
                      className="bg-white border border-gray-200 rounded-[2rem] p-8 overflow-hidden relative shadow-lg"
                    >
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">草稿建议</span>
                        <button onClick={() => navigator.clipboard.writeText(aiReply)} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-blue-600 transition-colors">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-sm prose-sm text-gray-700 leading-relaxed font-sans prose-headings:text-gray-900 prose-headings:font-bold prose-strong:text-blue-600 selection:bg-blue-100">
                        <ReactMarkdown>{aiReply}</ReactMarkdown>
                      </div>
                      <div className="mt-8 pt-6 border-t border-gray-100 flex items-center gap-2 text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                         <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                         已就绪
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {activeTab === 'consult' && (
            <motion.div 
              key="consult"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex-1 flex gap-10 h-full overflow-hidden"
            >
              <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-[2.5rem] shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <MessageCircle className="w-5 h-5 text-blue-600" />
                      <h2 className="text-sm font-bold uppercase tracking-widest">战略研讨室</h2>
                   </div>
                   <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      与 AI 教练共创策略
                   </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
                  {consultHistory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-30">
                       <BrainCircuit className="w-16 h-16 text-gray-300" />
                       <p className="text-sm font-medium text-gray-500 max-w-xs">
                          向 AI 教练咨询该客户的情况，AI 将根据讨论结果自动更新客户画像与建议。
                       </p>
                    </div>
                  ) : (
                    consultHistory.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-6 rounded-[2rem] shadow-sm ${
                          msg.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : 'bg-gray-50 text-gray-900 border border-gray-100 rounded-tl-none'
                        }`}>
                          <div className="text-sm leading-relaxed prose-sm">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  {consulting && (
                    <div className="flex justify-start">
                      <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 rounded-tl-none flex items-center gap-3">
                        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">教练正在思考...</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-8 border-t border-gray-100 bg-gray-50/50">
                  <div className="flex gap-4 items-start">
                    <textarea 
                      rows={2}
                      value={consultationText}
                      onChange={e => setConsultationText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleConsult();
                        }
                      }}
                      placeholder="探讨：客户好像有新的决策者加入了..."
                      className="flex-1 bg-white border border-gray-200 px-6 py-4 rounded-2xl outline-none focus:border-blue-600 shadow-sm transition-all text-sm resize-none"
                    />
                    <button 
                      type="button"
                      onClick={handleConsult}
                      disabled={consulting || !consultationText.trim()}
                      className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 disabled:opacity-50 active:scale-95"
                    >
                      发送并研讨
                    </button>
                  </div>
                </div>
              </div>

              <div className="w-[300px] shrink-0 space-y-6">
                <div className="bg-white border border-gray-200 rounded-[2rem] p-8 shadow-sm">
                   <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#1A1C1E] mb-6">研讨小贴士</h3>
                   <ul className="space-y-4">
                      {[
                        "描述客户的新动向",
                        "请教如何说服特定角色",
                        "探讨竞争对手的切入点",
                        "确认下一步资料的方向"
                      ].map((tip, i) => (
                        <li key={i} className="flex gap-3 text-[10px] font-medium text-gray-500">
                           <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                           {tip}
                        </li>
                      ))}
                   </ul>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'analysis' && (
            <motion.div 
              key="analysis"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex-1 h-full overflow-y-auto no-scrollbar"
            >
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Tactical Status Cards */}
                <div className="xl:col-span-2 space-y-8">
                  {/* Project Rating Model Card */}
                  <div className="bg-white border border-gray-200 rounded-[3rem] p-10 shadow-sm relative overflow-hidden">
                    <div className="flex flex-col lg:flex-row gap-12">
                      <div className="flex flex-col items-center justify-center border-r border-gray-100 pr-12 lg:min-w-[200px]">
                         <div className="relative w-32 h-32 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle
                                cx="64"
                                cy="64"
                                r="58"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                className="text-gray-50"
                              />
                              <circle
                                cx="64"
                                cy="64"
                                r="58"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                strokeDasharray={364.4}
                                strokeDashoffset={364.4 - (364.4 * (client.projectScore || 0)) / 100}
                                className={`${
                                  (client.projectScore || 0) >= 75 ? 'text-emerald-500' :
                                  (client.projectScore || 0) >= 55 ? 'text-blue-500' :
                                  (client.projectScore || 0) >= 35 ? 'text-amber-500' : 'text-red-500'
                                } transition-all duration-1000 ease-out`}
                              />
                            </svg>
                            <div className="absolute flex flex-col items-center">
                              <span className="text-4xl font-black tracking-tighter text-gray-900">{client.projectScore || 0}</span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase">/ 100</span>
                            </div>
                         </div>
                         <div className={`mt-6 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap ${
                            (client.projectScore || 0) >= 75 ? 'bg-emerald-500 text-white' :
                            (client.projectScore || 0) >= 55 ? 'bg-blue-500 text-white' :
                            (client.projectScore || 0) >= 35 ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                         }`}>
                            {(client.projectScore || 0) >= 75 ? 'A级 深耕重点' :
                             (client.projectScore || 0) >= 55 ? 'B级 培养+观察' :
                             (client.projectScore || 0) >= 35 ? 'C级 轻触达' : 'D级 低维护'}
                         </div>
                      </div>

                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8 py-4">
                         <div className="space-y-4">
                            <div className="flex justify-between items-end">
                               <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">战略价值</span>
                               <span className="text-sm font-bold text-gray-900">{client.scoreDetails?.strategicValue || 0}/40</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                               <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${((client.scoreDetails?.strategicValue || 0) / 40) * 100}%` }}
                                  className="h-full bg-blue-600 rounded-full"
                               />
                            </div>
                            <p className="text-[9px] text-gray-400 leading-relaxed">评估产品阶段、疾病复杂度、组织成熟度及增长压力。</p>
                         </div>

                         <div className="space-y-4">
                            <div className="flex justify-between items-end">
                               <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">成交可行性</span>
                               <span className="text-sm font-bold text-gray-900">{client.scoreDetails?.feasibility || 0}/40</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                               <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${((client.scoreDetails?.feasibility || 0) / 40) * 100}%` }}
                                  className="h-full bg-emerald-500 rounded-full"
                               />
                            </div>
                            <p className="text-[9px] text-gray-400 leading-relaxed">评估目前客户温度、内部Champion、预算及决策路径。</p>
                         </div>

                         <div className="space-y-4">
                            <div className="flex justify-between items-end">
                               <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">推进状态</span>
                               <span className="text-sm font-bold text-gray-900">{client.scoreDetails?.progress || 0}/20</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                               <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${((client.scoreDetails?.progress || 0) / 20) * 100}%` }}
                                  className="h-full bg-purple-500 rounded-full"
                               />
                            </div>
                            <p className="text-[9px] text-gray-400 leading-relaxed">根据当前所处 Phase 及关系深度综合判定。</p>
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* New Project Profile Fields */}
                  <div className="bg-white border border-gray-200 rounded-[3rem] p-10 shadow-sm relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-16 -mt-16 opacity-30" />
                     <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 mb-8 flex items-center gap-2">
                        <Archive className="w-4 h-4" /> 扩展项目画像
                     </h3>
                     <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
                        <div>
                           <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">感兴趣的产品</label>
                           <div className="text-sm font-bold text-gray-900">{client.interestedProducts || '待确认'}</div>
                        </div>
                        <div>
                           <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">推动部门</label>
                           <div className="text-sm font-bold text-gray-900">{client.promoterDept || '待确认'}</div>
                        </div>
                        <div>
                           <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">主要推动人 / Champion</label>
                           <div className="text-sm font-bold text-gray-900">{client.promoter || '待识别'}</div>
                        </div>
                        {(client.stage === 'phase_4' || client.stage === 'phase_5' || client.stage === 'phase_6' || client.stage === 'phase_7') && (
                           <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                              <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3 block">预算规模 (PHASE 4+)</label>
                              <div className="text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg w-fit border border-emerald-100">{client.budgetScale || '需评估'}</div>
                           </motion.div>
                        )}
                     </div>
                  </div>

                  {/* Phase Overview */}
                  <div className="bg-white border border-gray-200 rounded-[3rem] p-10 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50 rounded-bl-full -mr-16 -mt-16 opacity-50" />
                    <div className="flex flex-col md:flex-row gap-10 items-start relative z-10">
                      <div className="w-20 h-20 bg-gray-900 text-white rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-2xl">
                        <Target className="w-10 h-10" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">战略一致性审计</h2>
                        <div className="flex flex-wrap gap-2 mb-4">
                           <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-blue-600 text-white rounded-lg">
                              {currentPhaseInfo?.label}
                           </span>
                           <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-gray-100 text-gray-500 rounded-lg">
                              {currentPhaseInfo?.decisionState}
                           </span>
                        </div>
                        <p className="text-sm font-medium text-gray-500 leading-relaxed max-w-xl">
                          系统根据最近的互动动态评估客户处于 {currentPhaseInfo?.label}。此阶段的关键目标是：<span className="text-blue-600 font-bold">{currentPhaseInfo?.nextTarget}</span>。
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Strategic Matrix Detail */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Your Role & Action */}
                    <div className="bg-white border border-gray-200 rounded-[2.5rem] p-8 shadow-sm">
                       <div className="flex items-center gap-3 mb-8">
                          <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                             <UserCheck className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">执行指南</span>
                       </div>
                       <div className="space-y-6">
                          <div>
                             <label className="text-[10px] font-black tracking-widest text-purple-600 uppercase mb-2 block">当前角色</label>
                             <div className="text-xl font-bold text-gray-900">{currentPhaseInfo?.yourRole}</div>
                          </div>
                          <div>
                             <label className="text-[10px] font-black tracking-widest text-purple-600 uppercase mb-2 block">关键动作</label>
                             <div className="text-sm font-medium text-gray-600 leading-relaxed">{currentPhaseInfo?.keyAction}</div>
                          </div>
                       </div>
                    </div>

                    {/* Internal Status & Org Action */}
                    <div className="bg-white border border-gray-200 rounded-[2.5rem] p-8 shadow-sm">
                       <div className="flex items-center gap-3 mb-8">
                          <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                             <Workflow className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">客户组织动态</span>
                       </div>
                       <div className="space-y-6">
                          <div>
                             <label className="text-[10px] font-black tracking-widest text-emerald-600 uppercase mb-2 block">内部真实状态</label>
                             <div className="text-sm font-medium text-gray-900">{currentPhaseInfo?.internalStatus}</div>
                          </div>
                          <div>
                             <label className="text-[10px] font-black tracking-widest text-emerald-600 uppercase mb-2 block">组织侧预期行动</label>
                             <div className="text-sm font-medium text-gray-600 leading-relaxed">{currentPhaseInfo?.orgAction}</div>
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Signals & Barriers */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="bg-emerald-50/50 border border-emerald-100 rounded-[2.5rem] p-8">
                        <div className="flex items-center gap-2 mb-6 text-emerald-600">
                           <TrendingUp className="w-4 h-4" />
                           <span className="text-[10px] font-bold uppercase tracking-widest">成功信号</span>
                        </div>
                        <p className="text-sm font-bold text-emerald-900">{currentPhaseInfo?.successSignal}</p>
                     </div>
                     <div className="bg-red-50/50 border border-red-100 rounded-[2.5rem] p-8">
                        <div className="flex items-center gap-2 mb-6 text-red-600">
                           <ShieldAlert className="w-4 h-4" />
                           <span className="text-[10px] font-bold uppercase tracking-widest">风险信号</span>
                        </div>
                        <p className="text-sm font-bold text-red-900">{currentPhaseInfo?.riskSignal}</p>
                     </div>
                  </div>
                </div>

                {/* AI Reasoning Sidebar */}
                <div className="space-y-8">
                  <div className="bg-[#1A1C1E] rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
                    <div className="flex items-center gap-3 mb-8">
                       <Sparkles className="w-5 h-5 text-blue-400" />
                       <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">神经审计推理</span>
                    </div>
                    {analysisResult ? (
                      <div className="space-y-6">
                        <p className="text-sm leading-relaxed text-blue-100 font-medium italic">
                          "{analysisResult.reasoning}"
                        </p>
                        <div className="space-y-3 pt-6 border-t border-white/10">
                           <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">阶段核心卡点：</label>
                           {analysisResult.bottlenecks.map((b: string, i: number) => (
                             <div key={i} className="flex items-center gap-3 text-xs text-white/80">
                               <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                               {b}
                             </div>
                           ))}
                        </div>
                      </div>
                    ) : (
                      <div className="py-20 text-center">
                        <p className="text-xs text-white/30 font-bold uppercase tracking-[0.2em]">等待新数据输入以同步推理模型</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-white border border-gray-200 rounded-[3rem] p-8">
                     <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> 推荐战术动作
                     </h3>
                     <div className="space-y-4">
                        {(analysisResult?.suggestions || [
                          "运行阶段深度对齐对话",
                          "准备针对性的ROI论证报告",
                          "识别并建立内部Champion联系"
                        ]).map((s: string, i: number) => (
                          <div key={i} className="flex gap-4 items-start p-4 hover:bg-gray-50 rounded-2xl transition-colors group cursor-pointer border border-transparent hover:border-gray-100">
                             <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {i + 1}
                             </div>
                             <span className="text-xs font-medium text-gray-600 line-clamp-2">{s}</span>
                          </div>
                        ))}
                     </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'content' && (
            <motion.div 
              key="content"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-10 h-full overflow-hidden"
            >
              <div className="flex-1 flex flex-col gap-8 overflow-y-auto no-scrollbar">
                <div className="flex items-center justify-between sticky top-0 bg-[#F5F7FA] py-4 z-10">
                   <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                      <Archive className="w-3.5 h-3.5" /> 生成的战略抵押品
                   </h2>
                   <span className="text-[10px] font-bold text-blue-600 bg-white px-2 py-1 rounded border border-gray-200">{contentAssets.length} 项资产</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {contentAssets.length === 0 ? (
                    <div className="col-span-2 p-20 text-center bg-white border border-gray-200 rounded-[3rem] border-dashed">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                         <FileText className="w-8 h-8 text-gray-200" />
                      </div>
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">等待实验室生成</p>
                    </div>
                  ) : (
                    contentAssets.map(asset => (
                      <div key={asset.id} className="bg-white border border-gray-200 p-10 rounded-[2.5rem] flex flex-col shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-bl-[3rem] -mr-12 -mt-12 group-hover:bg-blue-50 transition-colors" />
                        <div className="flex justify-between items-start mb-8">
                          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-100 transition-all">
                            <FileText className="w-6 h-6" />
                          </div>
                          <span className="text-[9px] font-bold uppercase px-3 py-1.5 bg-[#1A1C1E] text-white rounded-full tracking-widest">{asset.type}</span>
                        </div>
                        <h3 className="font-bold text-lg mb-2 text-gray-900 leading-tight">{asset.title}</h3>
                        <div className="text-[10px] font-bold text-gray-400 uppercase mb-6 tracking-widest">
                           {asset.createdAt?.toDate ? asset.createdAt.toDate().toLocaleDateString('en-GB') : '已就绪'}
                        </div>
                        <div className="flex-1 line-clamp-5 text-sm text-gray-500 mb-8 prose-sm font-sans italic opacity-80 group-hover:opacity-100 transition-opacity">
                          <ReactMarkdown>{asset.body}</ReactMarkdown>
                        </div>
                        <div className="flex gap-3 border-t border-gray-100 pt-8 mt-auto">
                          <button 
                            onClick={() => navigator.clipboard.writeText(asset.body)} 
                            className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gray-50 hover:bg-blue-600 hover:text-white rounded-2xl transition-all text-[10px] font-bold uppercase tracking-widest shadow-sm"
                          >
                            <Copy className="w-4 h-4" /> 导出资产
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Lab Config Side */}
              <div className="w-[400px] shrink-0 bg-white border border-gray-200 rounded-[3rem] flex flex-col shadow-2xl overflow-hidden self-start">
                 <div className="p-10 border-b border-gray-100 bg-[#1A1C1E] text-white relative">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                    <h3 className="text-2xl font-bold tracking-tight mb-2">资产实验室</h3>
                    <p className="text-[10px] font-bold opacity-40 uppercase tracking-[0.3em]">神经内容合成器</p>
                 </div>
                 <div className="p-10 space-y-10">
                    <div className="space-y-4">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1">合成格式</label>
                       <div className="grid grid-cols-2 gap-3">
                           {[
                             { id: 'PPT', label: '演示文稿' }, 
                             { id: 'Report', label: '研究报告' }, 
                             { id: 'Strategy', label: '战略方案' }, 
                             { id: 'Prompt', label: '提示词库' }
                           ].map(type => (
                              <button
                                 key={type.id}
                                 onClick={() => setGenType(type.id as any)}
                                 className={`px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest rounded-xl border transition-all ${
                                    genType === type.id 
                                     ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' 
                                     : 'bg-white border-gray-200 text-gray-400 hover:border-blue-600 hover:text-blue-600'
                                 }`}
                              >
                                 {type.label}
                              </button>
                           ))}
                        </div>
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1">上下文约束</label>
                       <textarea 
                          value={genReqs}
                          onChange={e => setGenReqs(e.target.value)}
                          placeholder="注入特定目标、语调风格或目标痛点..."
                          className="w-full h-40 bg-gray-50 border border-gray-100 px-5 py-4 text-sm text-gray-800 rounded-2xl focus:bg-white focus:border-blue-600 outline-none transition-all resize-none font-sans placeholder:text-gray-300"
                       />
                    </div>
                    <button 
                       onClick={() => handleGenerateContent()}
                       disabled={generatingContent || !genReqs}
                       className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/10 disabled:opacity-50 active:scale-95"
                    >
                       {generatingContent ? (
                          <>
                             <RefreshCw className="w-5 h-5 animate-spin" />
                             正在合成模型...
                          </>
                       ) : (
                          <>
                             <Sparkles className="w-5 h-5" />
                             确认生成
                          </>
                       )}
                    </button>
                 </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-10 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
                 <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">手动更新客户档案</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">更新基础数据与决策认知阶段</p>
                 </div>
                 <button onClick={() => setIsEditing(false)} className="p-3 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
                    <X className="w-6 h-6" />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar">
                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">公司名称</label>
                       <input 
                          type="text" 
                          value={editForm.company || ''} 
                          onChange={e => setEditForm({ ...editForm, company: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-100 px-6 py-4 rounded-2xl focus:bg-white focus:border-blue-600 outline-none transition-all shadow-inner"
                       />
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">主要联系人</label>
                       <input 
                          type="text" 
                          value={editForm.name || ''} 
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-100 px-6 py-4 rounded-2xl focus:bg-white focus:border-blue-600 outline-none transition-all shadow-inner"
                       />
                    </div>
                 </div>

                 <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">当前决策阶段 (Phase 0-7)</label>
                    <div className="grid grid-cols-4 gap-3">
                       {[
                         { id: 'phase_0', label: '现状惯性' },
                         { id: 'phase_1', label: '认知觉醒' },
                         { id: 'phase_2', label: '问题归属' },
                         { id: 'phase_3', label: '优先级确认' },
                         { id: 'phase_4', label: '方案定义' },
                         { id: 'phase_5', label: '组织对齐' },
                         { id: 'phase_6', label: '商业决策' },
                         { id: 'phase_7', label: '验证扩展' }
                       ].map(p => (
                         <button
                           key={p.id}
                           onClick={() => setEditForm({ ...editForm, stage: p.id as ClientStage })}
                           className={`px-4 py-3 rounded-xl border text-[10px] font-bold uppercase transition-all ${
                             editForm.stage === p.id 
                               ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                               : 'bg-white border-gray-100 text-gray-400 hover:border-blue-600'
                           }`}
                         >
                           {p.label}
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">赞助者 (Promoter)</label>
                       <input 
                          type="text" 
                          value={editForm.promoter || ''} 
                          onChange={e => setEditForm({ ...editForm, promoter: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-100 px-6 py-4 rounded-2xl focus:bg-white focus:border-blue-600 outline-none transition-all shadow-inner"
                       />
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">关键人物 (Key Person)</label>
                       <input 
                          type="text" 
                          value={editForm.keyPerson || ''} 
                          onChange={e => setEditForm({ ...editForm, keyPerson: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-100 px-6 py-4 rounded-2xl focus:bg-white focus:border-blue-600 outline-none transition-all shadow-inner"
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">推动部门</label>
                       <input 
                          type="text" 
                          value={editForm.promoterDept || ''} 
                          onChange={e => setEditForm({ ...editForm, promoterDept: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-100 px-6 py-4 rounded-2xl focus:bg-white focus:border-blue-600 outline-none transition-all shadow-inner"
                       />
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">感兴趣的产品</label>
                       <input 
                          type="text" 
                          value={editForm.interestedProducts || ''} 
                          onChange={e => setEditForm({ ...editForm, interestedProducts: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-100 px-6 py-4 rounded-2xl focus:bg-white focus:border-blue-600 outline-none transition-all shadow-inner"
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">项目评分</label>
                       <input 
                          type="number" 
                          value={editForm.projectScore || 0} 
                          onChange={e => setEditForm({ ...editForm, projectScore: Number(e.target.value) })}
                          className="w-full bg-gray-50 border border-gray-100 px-6 py-4 rounded-2xl focus:bg-white focus:border-blue-600 outline-none transition-all shadow-inner"
                       />
                    </div>
                    {(editForm.stage === 'phase_4' || editForm.stage === 'phase_5' || editForm.stage === 'phase_6' || editForm.stage === 'phase_7') && (
                       <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase text-emerald-600 tracking-widest px-1">预算规模 (PHASE 4+)</label>
                          <input 
                             type="text" 
                             value={editForm.budgetScale || ''} 
                             onChange={e => setEditForm({ ...editForm, budgetScale: e.target.value })}
                             className="w-full bg-emerald-50/50 border border-emerald-100 px-6 py-4 rounded-2xl focus:bg-white focus:border-emerald-600 outline-none transition-all shadow-inner"
                          />
                       </div>
                    )}
                 </div>

                 <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">现状摘要 (Memory Summary)</label>
                    <textarea 
                       value={editForm.memorySummary || ''} 
                       onChange={e => setEditForm({ ...editForm, memorySummary: e.target.value })}
                       className="w-full h-32 bg-gray-50 border border-gray-100 p-6 rounded-2xl focus:bg-white focus:border-blue-600 outline-none transition-all resize-none shadow-inner text-sm"
                    />
                 </div>
              </div>

              <div className="p-10 border-t border-gray-100 flex gap-4 shrink-0 bg-gray-50/50">
                 <button 
                   onClick={() => setIsEditing(false)}
                   className="flex-1 py-5 bg-white border border-gray-200 text-gray-500 rounded-2xl font-bold uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95"
                 >
                   取消修改
                 </button>
                 <button 
                   onClick={handleSaveProfile}
                   className="flex-[2] py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
                 >
                   保存档案更新
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
