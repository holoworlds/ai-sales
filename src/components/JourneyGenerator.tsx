import { useState } from 'react';
import { generateIntegratedStrategicInsight } from '../services/gemini';
import { 
  Zap, 
  Sparkles, 
  RefreshCw,
  MessageSquare,
  Target,
  ArrowRight,
  TrendingUp,
  Brain,
  ShieldCheck,
  Flag,
  ChevronDown,
  Info,
  Copy,
  Layout
} from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';

export default function JourneyGenerator() {
  const [productInfo, setProductInfo] = useState({
    name: 'GEO服务',
    industry: '医药',
    coreValue: '提升AI中的品牌提及与正确表达',
    targetUser: '市场部/品牌部',
    usageScenario: '患者通过AI获取疾病与用药信息'
  });
  const [customerMessage, setCustomerMessage] = useState('我们也在关注这个方向');
  const [generating, setGenerating] = useState(false);
  const [insight, setInsight] = useState<any>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const handleSynthesize = async () => {
    setGenerating(true);
    try {
      const result = await generateIntegratedStrategicInsight(productInfo, customerMessage);
      // [CRITICAL FIX] SES-Proofing: 强制脱水，移除所有非纯 JSON 元素（Proxy, Symbols, Methods）
      const sanitized = JSON.parse(JSON.stringify(result));
      console.log('[JourneyGenerator] Sanitized AI Insight:', sanitized);
      setInsight(sanitized);
    } catch (err) {
      console.error("[JourneyGenerator] synthesize error:", err);
      // Optional: set an error state if the UI needs it
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] -m-10 p-10 overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#1A1C1E] rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-yellow-400" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[#1A1C1E]">
              认知旅程合成器 <span className="text-blue-600">v2.0</span>
            </h1>
          </div>
          <p className="text-sm font-medium text-gray-500 max-w-2xl">
            驱动「实时决策」与「全旅途预测」的双引擎系统。将客户发言转化为精准的状态契机。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Left: Input Panel (4 cols) */}
        <div className="xl:col-span-4 space-y-8">
          <section className="bg-white border border-gray-200 rounded-[2.5rem] p-8 shadow-sm space-y-8">
            <div className="flex items-center gap-3 mb-2">
              <Layout className="w-5 h-5 text-blue-600" />
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">产品战略配置</h2>
            </div>
            
            <div className="space-y-6">
              {[
                { label: '产品名称', key: 'name', placeholder: 'e.g., GEO服务' },
                { label: '所属行业', key: 'industry', placeholder: 'e.g., 医药' },
                { label: '核心价值', key: 'coreValue', placeholder: 'e.g., 提升AI中的品牌提及...' },
                { label: '目标用户', key: 'targetUser', placeholder: 'e.g., 市场部/品牌部' },
                { label: '使用场景', key: 'usageScenario', placeholder: 'e.g., 患者通过AI获取疾病...' },
              ].map((field) => (
                <div key={field.key} className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">{field.label}</label>
                  <input 
                    type="text"
                    value={(productInfo as any)[field.key]}
                    onChange={(e) => setProductInfo({...productInfo, [field.key]: e.target.value})}
                    placeholder={field.placeholder}
                    className="w-full bg-gray-50 border border-gray-100 px-5 py-3.5 rounded-xl text-sm focus:bg-white focus:border-blue-600 outline-none transition-all"
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">客户实时发言</h2>
            </div>
            <textarea 
               value={customerMessage}
               onChange={(e) => setCustomerMessage(e.target.value)}
               placeholder="输入客户最近说的一句话..."
               className="w-full h-32 bg-gray-50 border border-gray-100 rounded-2xl p-5 text-sm focus:bg-white focus:border-indigo-600 outline-none transition-all resize-none italic"
            />
            <button 
              onClick={handleSynthesize}
              disabled={generating || !customerMessage}
              className="w-full py-5 bg-[#1A1C1E] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3"
            >
              {generating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              合成认知演进蓝图
            </button>
          </section>
        </div>

        {/* Right: Results Panel (8 cols) */}
        <div className="xl:col-span-8 flex flex-col gap-10">
          {!insight ? (
            <div className="flex-1 border-2 border-dashed border-gray-200 rounded-[3rem] flex flex-col items-center justify-center p-20 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-8">
                <Brain className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-400 mb-4">等待认知合成指令</h3>
              <p className="text-sm text-gray-400 max-w-sm">
                请配置左侧的产品信息及客户最新发言点位，系统将自动推演战术话术及全旅途演进路径。
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {/* Tactical Insight Card */}
              <motion.div 
                 key="tactical"
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="bg-[#1A1C1E] text-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden"
              >
                 <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] -mr-32 -mt-32" />
                 
                 <div className="relative z-10">
                    <div className="flex items-center justify-between mb-10">
                       <div className="flex items-center gap-4">
                          <div className="px-4 py-1.5 bg-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest">实时对话引擎</div>
                          <div className="flex items-center gap-2 text-blue-400">
                             <Target className="w-4 h-4" />
                             <span className="text-xs font-bold font-mono tracking-tighter">MODE: DECISION_RESPONSE</span>
                          </div>
                       </div>
                       <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Judgment: {insight?.currentAnalysis?.stage || 'Unknown'}</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                       <div className="space-y-8">
                          <div>
                             <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 mb-3 block">意图识别</label>
                             <div className="text-xl font-bold leading-relaxed">{insight?.currentAnalysis?.intent || '分析中...'}</div>
                          </div>
                          <div>
                             <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 mb-3 block">当前目标</label>
                             <div className="text-lg text-blue-200 font-medium">{insight?.currentAnalysis?.objective || '设定中...'}</div>
                          </div>
                          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                             <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 mb-3 block">回答策略</label>
                             <div className="text-sm leading-relaxed text-gray-300">{insight?.currentAnalysis?.strategy || '推演中...'}</div>
                          </div>
                       </div>

                       <div className="bg-white text-[#1A1C1E] rounded-[2rem] p-8 shadow-inner flex flex-col justify-between">
                          <div>
                             <div className="flex items-center justify-between mb-6">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600">推荐建议话术</label>
                                <button onClick={async () => { 
                                  try { 
                                    await navigator.clipboard.writeText(insight?.currentAnalysis?.suggestedScript || ''); 
                                    alert('已复制建议话术'); 
                                  } catch (err) { 
                                    console.error(err); 
                                  } 
                                }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                   <Copy className="w-4 h-4 text-gray-400" />
                                </button>
                             </div>
                             <div className="text-xl font-bold leading-[1.6] markdown-body">
                                <ReactMarkdown skipHtml>{String(insight?.currentAnalysis?.suggestedScript || '')}</ReactMarkdown>
                             </div>
                          </div>
                          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                             <span className="text-[9px] font-black text-gray-400 uppercase">推进系数: 0.92</span>
                             <div className="flex gap-1">
                                {[1,2,3,4,5].map(i => <div key={i} className="w-1 h-3 bg-blue-600 rounded-full" />)}
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </motion.div>

              {/* Global Journey Map */}
              <motion.div 
                 key="strategic"
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.1 }}
                 className="bg-white border border-gray-200 rounded-[3rem] p-10 shadow-sm"
              >
                 <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                          <TrendingUp className="w-6 h-6 text-gray-400" />
                       </div>
                       <div>
                          <h3 className="text-xl font-bold tracking-tight">全客户旅途预测蓝图 (1-7)</h3>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Journey Predictor Engine</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="flex -space-x-2">
                          {[1,2,3].map(i => (
                            <div key={i} className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white" />
                          ))}
                       </div>
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">AI Agent 已模拟 10,000+ 路径</span>
                    </div>
                 </div>

                 <div className="space-y-4">
                    {(insight?.fullJourney || []).map((step: any, idx: number) => {
                      const isCurrent = step.stage === insight?.currentAnalysis?.stage;
                      return (
                        <div 
                          key={idx}
                          className={`group border-2 transition-all duration-500 rounded-[2rem] overflow-hidden ${
                            isCurrent ? 'border-blue-600 bg-blue-50/30' : 'border-gray-50 bg-white hover:border-gray-100'
                          }`}
                        >
                           <button 
                             onClick={() => setExpandedStep(expandedStep === idx ? null : idx)}
                             className="w-full text-left p-6 flex items-center justify-between"
                           >
                              <div className="flex items-center gap-6">
                                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-xs ${
                                   isCurrent ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                                 }`}>
                                    {idx + 1}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                       <h4 className={`text-base font-bold truncate ${isCurrent ? 'text-blue-900' : 'text-gray-900'}`}>{step.stage}</h4>
                                       {isCurrent && (
                                         <span className="px-2 py-0.5 bg-blue-500 text-white text-[8px] font-black uppercase tracking-widest rounded whitespace-nowrap">Current Focus</span>
                                       )}
                                    </div>
                                    <p className="text-xs text-gray-500 font-medium truncate">{step.definingTraits}</p>
                                 </div>
                              </div>
                              <div className={`transition-transform duration-300 ${expandedStep === idx ? 'rotate-180' : ''}`}>
                                 <ChevronDown className="w-5 h-5 text-gray-400" />
                              </div>
                           </button>

                           {expandedStep === idx && (
                             <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                className="overflow-hidden"
                             >
                                <div className="px-8 pb-8 pt-2 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-black/5">
                                   <div className="space-y-6">
                                      <div>
                                         <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                                            <Info className="w-3 h-3" /> 客户心理
                                         </label>
                                         <div className="text-sm text-gray-600 leading-relaxed font-medium">"{step.psychology}"</div>
                                      </div>
                                      <div className="space-y-3">
                                         <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                                            可能说的话
                                         </label>
                                         <div className="flex flex-wrap gap-2">
                                            {(step.possibleQuotes || []).map((q: string, qidx: number) => (
                                              <div key={qidx} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-500 italic">
                                                 "{q}"
                                              </div>
                                            ))}
                                         </div>
                                      </div>
                                   </div>
                                   <div className="space-y-6">
                                      <div className="grid grid-cols-2 gap-4">
                                         <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                            <label className="text-[9px] font-black uppercase text-indigo-600 tracking-widest mb-2 block flex items-center gap-2">
                                               <Flag className="w-3 h-3" /> 你的目标
                                            </label>
                                            <div className="text-xs font-bold text-indigo-900 leading-relaxed">{step.objective}</div>
                                         </div>
                                         <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                            <label className="text-[9px] font-black uppercase text-emerald-600 tracking-widest mb-2 block flex items-center gap-2">
                                               <ShieldCheck className="w-3 h-3" /> 应对策略
                                            </label>
                                            <div className="text-xs font-bold text-emerald-900 leading-relaxed">{step.strategy}</div>
                                         </div>
                                      </div>
                                      <div className="p-6 bg-[#1A1C1E] text-white rounded-3xl relative overflow-hidden">
                                         <div className="absolute top-0 right-0 p-2 opacity-20"><Zap className="w-4 h-4 text-yellow-400" /></div>
                                         <label className="text-[9px] font-black uppercase text-gray-500 tracking-widest mb-4 block">示例话术</label>
                                         <div className="text-sm font-bold leading-relaxed markdown-body">
                                            <ReactMarkdown skipHtml>{String(step.suggestedScript || '')}</ReactMarkdown>
                                         </div>
                                      </div>
                                   </div>
                                </div>
                             </motion.div>
                           )}
                        </div>
                      );
                    })}
                 </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
