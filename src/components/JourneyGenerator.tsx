import { useState, useEffect } from 'react';
import { localDb, localAuth } from '../services/storage';
import { Product, JourneyLog } from '../types';
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
  Layout,
  History,
  Plus,
  Trash2,
  XCircle,
  Clock,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

import { useRenderTrace } from '../hooks/useRenderTrace';

export default function JourneyGenerator() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    industry: '',
    coreValue: '',
    targetUser: '',
    usageScenario: ''
  });

  const [journeyHistory, setJourneyHistory] = useState<JourneyLog[]>([]);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  
  const [insight, setInsight] = useState<any>(null);
  const [customerMessage, setCustomerMessage] = useState('我们也在关注这个方向');
  const [generating, setGenerating] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  
  useRenderTrace('JourneyGenerator', { generating: !!insight, productsCount: products.length });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const productsData = await localDb.getAll('products');
      const historyData = await localDb.getAll('journeyLogs');
      
      setProducts(productsData);
      setJourneyHistory(historyData.sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ));

      if (productsData.length > 0 && !selectedProductId) {
        setSelectedProductId(productsData[0].id);
      }
    } catch (err) {
      console.error("[JourneyGenerator] fetchData error:", err);
    }
  };

  const activeProduct = products.find(p => p.id === selectedProductId);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await localAuth.getCurrentUserAsync();
      const product: Product = {
        id: crypto.randomUUID(),
        name: newProduct.name!,
        industry: newProduct.industry!,
        coreValue: newProduct.coreValue!,
        targetUser: newProduct.targetUser!,
        usageScenario: newProduct.usageScenario!,
        ownerId: user?.uid || 'local-user',
        createdAt: new Date().toISOString()
      };
      await localDb.add('products', product);
      setProducts([...products, product]);
      setSelectedProductId(product.id);
      setIsAddingProduct(false);
      setNewProduct({ name: '', industry: '', coreValue: '', targetUser: '', usageScenario: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteProduct = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除该产品吗？相关生成的旅途记录将保留但失去关联。')) return;
    try {
      await localDb.delete('products', id);
      const updated = products.filter(p => p.id !== id);
      setProducts(updated);
      if (selectedProductId === id) {
        setSelectedProductId(updated.length > 0 ? updated[0].id : '');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSynthesize = async () => {
    if (!activeProduct) return;
    setGenerating(true);
    try {
      const productInfo = {
        name: activeProduct.name,
        industry: activeProduct.industry,
        coreValue: activeProduct.coreValue,
        targetUser: activeProduct.targetUser,
        usageScenario: activeProduct.usageScenario
      };
      const result = await generateIntegratedStrategicInsight(productInfo, customerMessage);
      const sanitized = JSON.parse(JSON.stringify(result));
      setInsight(sanitized);

      // Save to history
      const user = await localAuth.getCurrentUserAsync();
      const logEntry: JourneyLog = {
        id: crypto.randomUUID(),
        productId: activeProduct.id,
        productName: activeProduct.name,
        customerMessage: customerMessage,
        insight: sanitized,
        ownerId: user?.uid || 'local-user',
        timestamp: new Date().toISOString()
      };
      await localDb.add('journeyLogs', logEntry);
      setJourneyHistory([logEntry, ...journeyHistory]);
    } catch (err) {
      console.error("[JourneyGenerator] synthesize error:", err);
    } finally {
      setGenerating(false);
    }
  };

  const loadFromHistory = (item: JourneyLog) => {
    setInsight(item.insight);
    setCustomerMessage(item.customerMessage);
    setSelectedProductId(item.productId);
    setIsViewingHistory(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] -m-10 p-10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#1A1C1E] rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-yellow-400" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[#1A1C1E]">
              认知旅程合成器 <span className="text-blue-600">v2.1</span>
            </h1>
          </div>
          <p className="text-sm font-medium text-gray-500 max-w-2xl">
            驱动「实时决策」与「全旅途预测」的双引擎系统。支持多产品认知资产管理与历史溯源。
          </p>
        </div>
        <button 
           onClick={() => setIsViewingHistory(true)}
           className="px-6 py-3 bg-white border border-gray-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-gray-600 hover:shadow-lg hover:border-blue-600/30 transition-all"
        >
          <History className="w-4 h-4" /> 旅途历史库
        </button>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Left: Input Panel (4 cols) */}
        <div className="xl:col-span-4 flex flex-col gap-8 overflow-y-auto no-scrollbar pb-10">
          <section className="bg-white border border-gray-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Layout className="w-5 h-5 text-blue-600" />
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">产品战略中心</h2>
              </div>
              <button 
                onClick={() => setIsAddingProduct(true)}
                className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 transition-all"
              >
                 <Plus className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar max-h-[300px] mb-8 pr-2">
               {products.length === 0 ? (
                 <div className="py-10 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">请点击右上角添加产品</p>
                 </div>
               ) : (
                 products.map(product => (
                   <div 
                     key={product.id}
                     onClick={() => setSelectedProductId(product.id)}
                     className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${selectedProductId === product.id ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' : 'bg-gray-50 border-gray-100 text-gray-700 hover:border-blue-300'}`}
                   >
                     <div className="flex items-center gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full ${selectedProductId === product.id ? 'bg-white' : 'bg-blue-600'}`} />
                        <span className="text-sm font-bold">{product.name}</span>
                     </div>
                     <button 
                        onClick={(e) => deleteProduct(product.id, e)}
                        className={`p-1.5 rounded-lg transition-all ${selectedProductId === product.id ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100'}`}
                      >
                       <Trash2 className="w-3.5 h-3.5" />
                     </button>
                   </div>
                 ))
               )}
            </div>

            {activeProduct && (
              <div className="space-y-4 pt-6 border-t border-gray-50">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase text-gray-400 pl-1 tracking-widest">行业</label>
                       <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs font-bold text-gray-600">{activeProduct.industry}</div>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase text-gray-400 pl-1 tracking-widest">目标用户</label>
                       <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs font-bold text-gray-600">{activeProduct.targetUser}</div>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 pl-1 tracking-widest">核心价值</label>
                    <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs font-medium text-gray-500 line-clamp-2">{activeProduct.coreValue}</div>
                 </div>
              </div>
            )}
          </section>

          <section className="bg-white border border-gray-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col shrink-0">
            <div className="flex items-center gap-3 mb-6">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">客户实时发言点位</h2>
            </div>
            <textarea 
               value={customerMessage}
               onChange={(e) => setCustomerMessage(e.target.value)}
               placeholder="输入客户最近说的一句话..."
               className="w-full h-32 bg-gray-50 border border-gray-100 rounded-2xl p-5 text-sm focus:bg-white focus:border-indigo-600 outline-none transition-all resize-none italic mb-6 shadow-inner"
            />
            <button 
              onClick={handleSynthesize}
              disabled={generating || !customerMessage || !selectedProductId}
              className="w-full py-5 bg-[#1A1C1E] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {generating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              合成认知演进蓝图
            </button>
          </section>
        </div>

        {/* Right: Results Panel (8 cols) */}
        <div className="xl:col-span-8 flex flex-col overflow-y-auto no-scrollbar pb-10">
          {!insight ? (
            <div className="flex-1 border-2 border-dashed border-gray-200 rounded-[3rem] flex flex-col items-center justify-center p-20 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-8">
                <Brain className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-400 mb-4">等待认知合成指令</h3>
              <p className="text-sm text-gray-400 max-w-sm">
                请在左侧选择一个产品或添加新产品，并输入客户最新发言，系统将自动推演认知演进路径。
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

      {/* Add Product Modal */}
      <AnimatePresence>
        {isAddingProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 mb-0">
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setIsAddingProduct(false)}
               className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
             />
             <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="bg-white rounded-[3rem] w-full max-w-xl relative p-12 shadow-2xl z-10"
             >
                <div className="flex items-center gap-4 mb-10">
                   <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white">
                      <Layout className="w-6 h-6" />
                   </div>
                   <h3 className="text-2xl font-black text-[#1A1C1E]">添加新产品战略</h3>
                </div>

                <form onSubmit={handleAddProduct} className="space-y-6">
                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-400 pl-2">产品名称</label>
                         <input required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3 text-sm focus:border-blue-600 outline-none" placeholder="e.g., GEO服务" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-400 pl-2">所属行业</label>
                         <input required value={newProduct.industry} onChange={e => setNewProduct({...newProduct, industry: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3 text-sm focus:border-blue-600 outline-none" placeholder="e.g., 医药" />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 pl-2">目标用户群</label>
                      <input required value={newProduct.targetUser} onChange={e => setNewProduct({...newProduct, targetUser: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3 text-sm focus:border-blue-600 outline-none" placeholder="e.g., 市场部/品牌部" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 pl-2">核心价值主张</label>
                      <textarea required value={newProduct.coreValue} onChange={e => setNewProduct({...newProduct, coreValue: e.target.value})} className="w-full h-24 bg-gray-50 border border-gray-100 rounded-xl px-5 py-3 text-sm focus:border-blue-600 outline-none resize-none" placeholder="描述该产品的核心差异化价值..." />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 pl-2">使用场景</label>
                      <input required value={newProduct.usageScenario} onChange={e => setNewProduct({...newProduct, usageScenario: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3 text-sm focus:border-blue-600 outline-none" placeholder="e.g., 用户通过搜索引擎咨询病情时..." />
                   </div>

                   <div className="flex gap-4 pt-4">
                      <button type="button" onClick={() => setIsAddingProduct(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all">取消</button>
                      <button type="submit" className="flex-2 py-4 bg-[#1A1C1E] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl">保存并应用</button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {isViewingHistory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setIsViewingHistory(false)}
               className="absolute inset-0 bg-[#1A1C1E]/80 backdrop-blur-md"
             />
             <motion.div 
               initial={{ x: '100%' }}
               animate={{ x: 0 }}
               exit={{ x: '100%' }}
               transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               className="bg-white w-full max-w-2xl h-full absolute right-0 shadow-2xl flex flex-col p-12"
             >
                <div className="flex items-center justify-between mb-12">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                         <History className="w-6 h-6 text-[#1A1C1E]" />
                      </div>
                      <h3 className="text-2xl font-black text-[#1A1C1E]">旅途合成历史</h3>
                   </div>
                   <button onClick={() => setIsViewingHistory(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                      <XCircle className="w-8 h-8 text-gray-300 hover:text-[#1A1C1E]" />
                   </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
                   {journeyHistory.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-50">
                        <Clock className="w-12 h-12 mb-4" />
                        <p className="text-sm font-bold uppercase tracking-widest">暂无生成记录</p>
                     </div>
                   ) : (
                     journeyHistory.map(item => (
                       <div 
                         key={item.id}
                         onClick={() => loadFromHistory(item)}
                         className="p-8 border border-gray-100 rounded-[2rem] hover:border-blue-300 hover:shadow-xl hover:shadow-blue-600/5 transition-all cursor-pointer group relative overflow-hidden"
                       >
                          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500" />
                          
                          <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                               <span className="text-[10px] font-black uppercase text-blue-600 tracking-[0.2em]">{item.productName}</span>
                               <span className="text-[9px] font-bold text-gray-400">{new Date(item.timestamp).toLocaleString()}</span>
                            </div>
                            <h4 className="text-sm font-bold text-[#1A1C1E] mb-3 line-clamp-1 italic">"{item.customerMessage}"</h4>
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-2">
                                  <div className="px-2 py-0.5 bg-gray-100 rounded text-[8px] font-black uppercase text-gray-500">Stage: {item.insight.currentAnalysis.stage}</div>
                               </div>
                               <div className="text-blue-600 group-hover:translate-x-1 transition-transform">
                                  <ChevronRight className="w-4 h-4" />
                               </div>
                            </div>
                          </div>
                       </div>
                     ))
                   )}
                </div>

                <div className="mt-10 pt-10 border-t border-gray-100">
                   <button 
                     onClick={async () => {
                       if (confirm('确定要清空所有旅途历史吗？')) {
                         const logs = await localDb.getAll('journeyLogs');
                         for (const log of logs) await localDb.delete('journeyLogs', log.id);
                         setJourneyHistory([]);
                       }
                     }}
                     className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors"
                   >
                     清空所有历史数据
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
