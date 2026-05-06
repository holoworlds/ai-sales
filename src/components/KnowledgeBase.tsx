import { useState, useEffect, useMemo } from 'react';
import { localDb, localAuth } from '../services/storage';
import { KnowledgeEntry } from '../types';
import { extractKnowledgeInsights, queryKnowledgeBase, generateStrategicPrompt } from '../services/gemini';
import { 
  BookOpen, 
  Search, 
  Plus, 
  FileText, 
  Tag, 
  Clock, 
  Trash2,
  Database,
  Brain,
  ChevronRight,
  Sparkles,
  X,
  ChevronDown,
  Activity,
  Layers,
  Upload,
  FileCheck,
  FileSearch,
  Zap,
  Info,
  Filter,
  RefreshCw,
  MessageSquare,
  Send,
  Loader2,
  Users,
  Wand2,
  Copy,
  ChevronUp,
  FileCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

function KnowledgeCard({ entry, idx, CatIcon, selectedEntries, setSelectedEntries, handleDelete }: any) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="bg-white border border-gray-200 p-10 rounded-[2.5rem] relative group overflow-hidden shadow-sm hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all"
    >
      <div className="absolute top-6 left-6 z-10">
        <input 
          type="checkbox"
          checked={selectedEntries.includes(entry.id)}
          onChange={() => setSelectedEntries((prev: string[]) => 
            prev.includes(entry.id) ? prev.filter(id => id !== entry.id) : [...prev, entry.id]
          )}
          className="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
      </div>

      <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-bl-[4rem] flex items-center justify-center -mr-8 -mt-8 group-hover:bg-blue-50 transition-colors">
         <CatIcon className="w-8 h-8 text-gray-200 group-hover:text-blue-100 transition-colors" />
      </div>
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${
            entry.sourceType === 'document' ? 'bg-blue-50 border-blue-100 text-blue-600' :
            entry.sourceType === 'feedback' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
            entry.sourceType === 'word' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' :
            entry.sourceType === 'pdf' ? 'bg-red-50 border-red-100 text-red-600' :
            entry.sourceType === 'excel' ? 'bg-emerald-100 border-emerald-200 text-emerald-800' :
            entry.sourceType === 'ppt' ? 'bg-orange-50 border-orange-100 text-orange-600' :
            'bg-purple-50 border-purple-100 text-purple-600'
          }`}>
            {entry.sourceType === 'document' ? '文档集群' : 
             entry.sourceType === 'feedback' ? '反馈循环' : 
             entry.sourceType === 'word' ? 'WORD 文档' :
             entry.sourceType === 'pdf' ? 'PDF文件' :
             entry.sourceType === 'excel' ? 'EXCEL 表格' :
             entry.sourceType === 'ppt' ? 'PPT 演示' :
             '市场情报'}
          </span>
          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
             <Clock className="w-3.5 h-3.5" />
             {entry.createdAt?.toDate ? entry.createdAt.toDate().toLocaleDateString('en-GB') : '刚刚'}
          </span>
        </div>
        <AnimatePresence>
          {isHovered && (
            <motion.button 
              initial={{ opacity: 0, scale: 0.8, x: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 10 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => handleDelete(entry.id, e)}
              className="p-3 text-red-500 bg-red-50 rounded-2xl transition-all shadow-xl shadow-red-500/10 border border-red-100/50 flex items-center justify-center"
              title="永久移除此资产"
            >
               <Trash2 className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <h3 className="text-2xl font-bold tracking-tight text-[#1A1C1E] mb-4 leading-tight">{entry.title}</h3>
      
      <div className="text-sm text-gray-600 leading-relaxed mb-8 line-clamp-3 font-medium">
        {entry.content}
      </div>

      <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-50">
        {entry.tags.map((tag: string) => (
          <span key={tag} className="text-[10px] font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-gray-100 transition-colors cursor-default">
            <Tag className="w-3 h-3 text-blue-400" />
            #{tag.toUpperCase()}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

export default function KnowledgeBase() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  
  const [newEntry, setNewEntry] = useState({ 
    title: '', 
    content: '', 
    sourceType: 'document' as 'document' | 'feedback' | 'market_report' | 'word' | 'ppt' | 'excel' | 'pdf', 
    tags: '',
    category: 'strategy'
  });

  const [extracting, setExtracting] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [qaQuery, setQaQuery] = useState('');
  const [qaResponse, setQaResponse] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [qaHistory, setQaHistory] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  // Prompt Lab State
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [isPromptLabOpen, setIsPromptLabOpen] = useState(false);
  const [promptRequirements, setPromptRequirements] = useState('');
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [promptResult, setPromptResult] = useState<{ title: string, promptContent: string } | null>(null);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    entries.forEach(e => e.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [entries]);

  const handleExtractInsights = async () => {
    if (!newEntry.content) return;
    setExtracting(true);
    try {
      const data = await extractKnowledgeInsights(newEntry.content);
      
      setNewEntry(prev => ({
        ...prev,
        title: prev.title || data.suggestedTitle,
        content: data.summary,
        tags: data.tags.join(', '),
        category: data.category || prev.category
      }));
    } catch (err) {
      console.error("Extraction failed:", err);
    } finally {
      setExtracting(false);
    }
  };

  const fetchData = async () => {
    const data = await localDb.getAll('knowledge');
    // Sort by updatedAt desc
    data.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setEntries(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定删除此知识节点吗？')) return;
    try {
      await localDb.delete('knowledge', id);
      await fetchData();
      setSelectedEntries(prev => prev.filter(eid => eid !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleKnowledgeQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaQuery.trim() || isQuerying) return;

    setIsQuerying(true);
    const currentQuery = qaQuery;
    setQaQuery('');
    setQaHistory(prev => [...prev, { role: 'user', content: currentQuery }]);

    try {
      // Build context from all current knowledge base entries
      const context = entries.map(e => `【${e.title}】: ${e.content}`).join('\n\n');
      const response = await queryKnowledgeBase(currentQuery, context);
      setQaHistory(prev => [...prev, { role: 'ai', content: response }]);
    } catch (err) {
      console.error(err);
      setQaHistory(prev => [...prev, { role: 'ai', content: '连接战略大脑失败，请检查网络或配置。' }]);
    } finally {
      setIsQuerying(false);
    }
  };

  const handleGeneratePrompt = async () => {
    if (!promptRequirements.trim() || selectedEntries.length === 0) return;
    setGeneratingPrompt(true);
    try {
      const sources = entries
          .filter(e => selectedEntries.includes(e.id))
          .map(e => ({ title: e.title, content: e.content }));
      
      const result = await generateStrategicPrompt(promptRequirements, sources);
      setPromptResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingPrompt(false);
    }
  };

  const handleSavePromptAsKnowledge = async () => {
    const user = await localAuth.getCurrentUserAsync();
    if (!promptResult || !user) return;
    try {
      await localDb.add('knowledge', {
        title: `AI Prompt: ${promptResult.title}`,
        content: promptResult.promptContent,
        sourceType: 'document',
        tags: ['PROMPT', 'AI-SOP'],
        category: 'strategy',
        ownerId: user.uid
      });
      await fetchData();
      alert('Prompt 已成功存入知识库');
      setIsPromptLabOpen(false);
      setPromptResult(null);
      setPromptRequirements('');
      setSelectedEntries([]);
    } catch (err) {
      console.error(err);
    }
  };

  const categories = [
    { id: 'all', label: '全部知识', icon: Database },
    { id: 'strategy', label: '战略战术', icon: Zap },
    { id: 'competitor', label: '竞争情报', icon: FileSearch },
    { id: 'customer_case', label: '客户案例', icon: Users },
    { id: 'industry', label: '行业洞察', icon: Activity },
    { id: 'product', label: '产品能力', icon: Layers },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const user = await localAuth.getCurrentUserAsync();
    if (!file || !user) return;

    const fileName = file.name;
    const fileExt = fileName.split('.').pop()?.toLowerCase();

    if (fileExt === 'xlsx' || fileExt === 'xls') {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const rawData: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wsname]);

          for (const row of rawData) {
            await localDb.add('knowledge', {
              title: row['标题'] || row['Title'] || `来自 ${fileName}`,
              content: row['内容'] || row['Content'] || JSON.stringify(row),
              sourceType: 'excel',
              tags: (row['标签'] || row['Tags'] || '').split(',').map((t: string) => t.trim()).filter(Boolean),
              category: 'industry',
              ownerId: user.uid
            });
          }
          await fetchData();
          alert(`成功从 Excel 导入 ${rawData.length} 条知识点`);
          setShowSuccess(true);
          setTimeout(() => {
            setShowSuccess(false);
            setIsAdding(false);
          }, 2000);
        } catch (err) {
          console.error(err);
          alert('Excel 解析失败');
        }
      };
      reader.readAsBinaryString(file);
    } else {
      // Text or other files
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const text = evt.target?.result as string;
          setNewEntry({
            ...newEntry,
            title: fileName.replace(/\.[^/.]+$/, ""),
            content: text,
            sourceType: fileExt === 'pdf' ? 'pdf' : 
                        (fileExt === 'doc' || fileExt === 'docx' ? 'word' : 
                        (fileExt === 'ppt' || fileExt === 'pptx' ? 'ppt' : 'document'))
          });
        };
        reader.readAsText(file);
      }
    };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = await localAuth.getCurrentUserAsync();
    try {
      await localDb.add('knowledge', {
        ...newEntry,
        tags: newEntry.tags.split(',').map(t => t.trim()).filter(Boolean),
        ownerId: user?.uid
      });
      await fetchData();
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setIsAdding(false);
      }, 2000);
      setNewEntry({ title: '', content: '', sourceType: 'document', tags: '', category: 'strategy' });
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = entries.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase()) || 
      e.content.toLowerCase().includes(search.toLowerCase()) ||
      (e.tags && e.tags.some(t => t.toLowerCase().includes(search.toLowerCase())));
    
    const matchesCategory = activeCategory === 'all' || (e as any).category === activeCategory;
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(t => e.tags?.includes(t));
    
    return matchesSearch && matchesCategory && matchesTags;
  });

  return (
    <div className="space-y-10 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 shrink-0">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-[#1A1C1E] mb-2">智能知识库</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            神经仓库 <span className="text-gray-200">/</span> 战略大脑同步中
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-blue-600 transition-colors" />
            <input 
              type="text" 
              placeholder="搜索知识节点..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white border border-gray-200 pl-11 pr-5 py-3 text-sm rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all w-72 shadow-sm font-medium placeholder:text-gray-300"
            />
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 text-white px-8 py-3 font-bold text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            手动注入 / 上传
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar shrink-0">
        {categories.map(cat => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                activeCategory === cat.id 
                  ? 'bg-[#1A1C1E] border-[#1A1C1E] text-white shadow-xl shadow-gray-200' 
                  : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${activeCategory === cat.id ? 'text-blue-400' : 'text-gray-300'}`} />
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-10 min-h-0 overflow-hidden">
        {/* Q&A Section */}
        <div className="lg:col-span-1 border-r border-gray-100 pr-6 flex flex-col min-h-0">
           <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#1A1C1E] flex items-center gap-2">
                 <MessageSquare className="w-4 h-4 text-blue-600" />
                 战略助手问答
              </h3>
              <button onClick={() => setQaHistory([])} className="text-[10px] font-bold text-gray-400 hover:text-red-500 uppercase transition-colors">清除对话</button>
           </div>
           
           <div className="flex-1 overflow-y-auto mb-6 space-y-4 no-scrollbar bg-gray-50/50 rounded-3xl p-6 border border-gray-100 shadow-inner">
              {qaHistory.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-10 px-4">
                    <Sparkles className="w-8 h-8 text-blue-400 mb-4" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                       基于知识库现状<br />提供决策建议与检索
                    </p>
                 </div>
              ) : (
                qaHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] px-4 py-3 rounded-2xl text-[11px] leading-relaxed font-medium ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : 'bg-white border border-gray-200 text-gray-700 shadow-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {isQuerying && (
                <div className="flex justify-start">
                   <div className="bg-white border border-gray-200 p-3 rounded-2xl shadow-sm flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">大脑沉思中...</span>
                   </div>
                </div>
              )}
           </div>

           <form onSubmit={handleKnowledgeQuery} className="relative shrink-0">
              <input 
                type="text" 
                value={qaQuery}
                onChange={e => setQaQuery(e.target.value)}
                placeholder="询问知识库..."
                className="w-full bg-white border border-gray-200 px-5 py-4 pr-14 rounded-2xl text-[11px] outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium placeholder:text-gray-300 shadow-sm"
              />
              <button 
                type="submit"
                disabled={!qaQuery.trim() || isQuerying}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-all disabled:opacity-30 active:scale-90"
              >
                 <Send className="w-4 h-4" />
              </button>
           </form>
        </div>

        {/* Main List */}
        <div className="lg:col-span-2 overflow-y-auto pr-2 no-scrollbar space-y-6">
          {loading ? (
             <div className="space-y-4">
                {[1, 2, 3].map(i => (
                   <div key={i} className="h-40 bg-white border border-gray-100 rounded-3xl animate-pulse" />
                ))}
             </div>
          ) : filtered.length === 0 ? (
             <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white border border-gray-200 border-dashed rounded-[3rem] text-gray-400 p-10 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                   <Brain className="w-10 h-10 text-gray-200" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">未发现目标集群</h3>
                <p className="text-sm max-w-xs mx-auto">请尝试更换检索关键词或在该目录下注入新节点。</p>
             </div>
          ) : (
            filtered.map((entry, idx) => {
              const category = categories.find(c => c.id === (entry as any).category) || categories[1];
              const CatIcon = category.icon;
              
              return (
                <KnowledgeCard 
                  key={entry.id} 
                  entry={entry} 
                  idx={idx} 
                  CatIcon={CatIcon} 
                  selectedEntries={selectedEntries} 
                  setSelectedEntries={setSelectedEntries} 
                  handleDelete={handleDelete} 
                />
              );
            })
          )}
        </div>

        {/* Intelligence Stats / Sidebar */}
        <div className="hidden lg:flex flex-col gap-8 overflow-y-auto pr-2 no-scrollbar">
           <div className="bg-white border border-gray-200 p-10 rounded-[3rem] shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-8 flex items-center gap-3">
                <Tag className="w-4 h-4 text-blue-600" />
                标签过滤器
              </h3>
              <div className="flex flex-wrap gap-2">
                 {allTags.length === 0 ? (
                    <div className="text-[10px] text-gray-300 font-bold uppercase py-4">暂无可用标签</div>
                 ) : (
                    allTags.map(tag => (
                       <button
                          key={tag}
                          onClick={() => setSelectedTags(prev => 
                             prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                          )}
                          className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                             selectedTags.includes(tag)
                               ? 'bg-blue-600 text-white shadow-md'
                               : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                          }`}
                       >
                          #{tag}
                       </button>
                    ))
                 )}
              </div>
              {selectedTags.length > 0 && (
                 <button 
                  onClick={() => setSelectedTags([])}
                  className="mt-6 w-full py-3 text-[10px] font-black uppercase text-blue-600 hover:underline"
                 >
                    清除所有筛选
                 </button>
              )}
           </div>

           <div className="bg-[#1A1C1E] text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500" />
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
              
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-8 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                网络指标
              </h3>
              
              <div className="space-y-10 relative z-10">
                 <div>
                    <div className="text-5xl font-black tracking-tighter mb-1">{entries.length}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">已锁定知识集群</div>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="flex justify-between items-end">
                       <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">密度指数</span>
                       <span className="text-xs font-bold text-blue-400">82.4%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '82.4%' }}
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                       />
                    </div>
                 </div>
                 
                 <p className="text-[11px] font-medium text-white/50 leading-relaxed">
                   神经模型的准确性随主动注入而扩展。预计在下次数据库同步时进行覆盖优化。
                 </p>
              </div>
           </div>

           <div className="bg-white border border-gray-200 p-10 rounded-[3rem] shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-8 flex items-center gap-3">
                <Layers className="w-4 h-4 text-blue-600" />
                活动学习轨道
              </h3>
              <div className="space-y-6">
                 {[
                   '市场扩张 Q3',
                   '客户情绪脉动',
                   '产品差异化 v2'
                 ].map((item, i) => (
                   <div key={item} className="flex items-center group cursor-pointer">
                      <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 mr-4 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                         <span className="text-[10px] font-bold">{i + 1}</span>
                      </div>
                      <span className="text-[11px] font-bold text-gray-600 uppercase tracking-tight group-hover:text-gray-900 transition-colors flex-1">{item}</span>
                      <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                   </div>
                 ))}
                 
                 <button className="w-full py-4 mt-4 border border-gray-100 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all">
                   管理所有学习项
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAdding(false)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="bg-white border border-gray-200 rounded-[3rem] shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500" />
               
               <div className="px-12 py-10 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">注入知识节点</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">扩展神经仓库</p>
                  </div>
                  <button onClick={() => setIsAdding(false)} className="p-3 hover:bg-white rounded-2xl border border-transparent hover:border-gray-200 transition-all text-gray-400">
                    <X className="w-5 h-5" />
                  </button>
               </div>
               
               <form onSubmit={handleAdd} className="p-12 space-y-8 overflow-y-auto no-scrollbar">
                  {showSuccess ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="py-20 flex flex-col items-center justify-center text-center"
                    >
                      <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                        <FileCheck className="w-10 h-10" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">提交成功</h3>
                      <p className="text-gray-500">知识节点已同步至全球战略分层数据库</p>
                    </motion.div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1">集群标题</label>
                      <input 
                        required
                        type="text" 
                        value={newEntry.title}
                        onChange={e => setNewEntry({...newEntry, title: e.target.value})}
                        placeholder="核心智能标识符"
                        className="w-full bg-gray-50 border border-gray-100 px-5 py-4 rounded-2xl outline-none focus:bg-white focus:border-blue-500 transition-all font-medium text-gray-900"
                      />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1">战略分类</label>
                       <div className="relative">
                         <select 
                           value={newEntry.category}
                           onChange={e => setNewEntry({...newEntry, category: e.target.value})}
                           className="w-full bg-gray-50 border border-gray-100 px-5 py-4 rounded-2xl outline-none focus:bg-white focus:border-blue-500 transition-all appearance-none font-bold text-[10px] tracking-widest uppercase text-gray-600 cursor-pointer"
                         >
                           {categories.filter(c => c.id !== 'all').map(cat => (
                             <option key={cat.id} value={cat.id}>{cat.label}</option>
                           ))}
                         </select>
                         <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                       </div>
                    </div>
                  </div>

                  {/* File Upload Zone */}
                  <div className="space-y-3">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1">从本地资产导入 (PDF / TXT / EXCEL / WORD / PPT)</label>
                     <label className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-100 rounded-3xl cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                           <Upload className="w-6 h-6 text-blue-500 mb-2" />
                           <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">点击或拖拽文件进行神经映射</p>
                           <p className="text-[8px] text-gray-300 uppercase mt-1">支持常见文本、表格与演示格式 (PDF, TXT, DOCX, XLSX, PPTX)</p>
                        </div>
                        <input type="file" className="hidden" onChange={handleFileUpload} accept=".txt, .pdf, .docx, .xlsx, .xls, .ppt, .pptx" />
                     </label>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">知识载荷</label>
                       <button 
                         type="button"
                         onClick={handleExtractInsights}
                         disabled={extracting || !newEntry.content}
                         className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 disabled:opacity-50"
                       >
                          {extracting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-yellow-400" />}
                          AI 智能提炼洞察
                       </button>
                    </div>
                    <textarea 
                      required
                      value={newEntry.content}
                      onChange={e => setNewEntry({...newEntry, content: e.target.value})}
                      placeholder="输入核心洞察、原始数据或战略总结..."
                      className="w-full h-48 bg-gray-50 border border-gray-100 p-6 text-sm outline-none focus:bg-white focus:border-blue-500 transition-all rounded-[2rem] resize-none font-medium leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-8">
                     <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1">语义标签 (逗号分隔)</label>
                        <div className="relative">
                          <Tag className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                          <input 
                            type="text" 
                            value={newEntry.tags}
                            onChange={e => setNewEntry({...newEntry, tags: e.target.value})}
                            placeholder="战略, 路线图, 竞争优势"
                            className="w-full bg-gray-50 border border-gray-100 pl-14 pr-5 py-4 rounded-2xl outline-none focus:bg-white focus:border-blue-500 transition-all font-mono text-[10px] uppercase tracking-widest text-gray-600"
                          />
                        </div>
                     </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-5 bg-blue-600 text-white font-bold text-xs uppercase tracking-[0.3em] rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 mt-4 active:scale-95"
                  >
                    确认提交节点至情报库
                  </button>
                    </>
                  )}
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Selected Action Bar */}
      <AnimatePresence>
        {selectedEntries.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#1A1C1E] text-white px-10 py-6 rounded-[2.5rem] shadow-2xl z-40 flex items-center gap-10 border border-white/10 backdrop-blur-xl"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-black whitespace-nowrap">已选择 {selectedEntries.length} 份战略素材</div>
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">准备进行提示词合成</div>
              </div>
            </div>
            
            <div className="h-10 w-px bg-white/10" />

            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsPromptLabOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 shadow-lg shadow-blue-500/20 active:scale-95"
              >
                <Wand2 className="w-4 h-4 text-blue-200" />
                进入提示词实验室
              </button>
              <button 
                onClick={() => setSelectedEntries([])}
                className="text-xs font-bold text-white/40 hover:text-white transition-colors"
              >
                取消选择
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prompt Lab Modal */}
      <AnimatePresence>
        {isPromptLabOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPromptLabOpen(false)} className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="bg-white border border-gray-200 rounded-[3.5rem] shadow-2xl w-full max-w-5xl relative z-10 overflow-hidden flex flex-col h-[85vh]"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600" />
              
              <div className="px-12 py-10 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-[#1A1C1E] rounded-2xl flex items-center justify-center shadow-xl">
                    <Wand2 className="w-7 h-7 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tight text-gray-900">提示词实验室 (Prompt Lab)</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 mt-1">基于现有知识资产合成生产力引擎</p>
                  </div>
                </div>
                <button onClick={() => setIsPromptLabOpen(false)} className="p-4 hover:bg-gray-50 rounded-full transition-colors text-gray-400"><X className="w-6 h-6" /></button>
              </div>

              <div className="flex-1 overflow-hidden flex">
                {/* Left: Input & Selected Materials */}
                <div className="w-1/2 border-r border-gray-100 p-12 overflow-y-auto no-scrollbar flex flex-col gap-10">
                   <div className="space-y-6">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#1A1C1E] flex items-center gap-2">
                        <Zap className="w-4 h-4 text-blue-600" /> 核心生成要求 (Generation Intent)
                      </label>
                      <textarea 
                        value={promptRequirements}
                        onChange={e => setPromptRequirements(e.target.value)}
                        placeholder="例如：我需要一份针对该行业数字化转型的 PPT 提纲，要求专业且富有科技感..."
                        className="w-full h-48 bg-gray-50 border border-gray-100 rounded-[2.5rem] p-8 text-sm outline-none focus:bg-white focus:border-blue-600 transition-all shadow-inner resize-none font-medium leading-relaxed"
                      />
                   </div>

                   <div className="space-y-6">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                         <BookOpen className="w-4 h-4" /> 已选材料源 ({selectedEntries.length})
                      </label>
                      <div className="space-y-3">
                         {entries.filter(e => selectedEntries.includes(e.id)).map(e => (
                           <div key={e.id} className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                              <FileText className="w-4 h-4 text-gray-300" />
                              <span className="text-[11px] font-bold text-gray-700 truncate">{e.title}</span>
                           </div>
                         ))}
                      </div>
                   </div>

                   <button 
                     onClick={handleGeneratePrompt}
                     disabled={generatingPrompt || !promptRequirements.trim()}
                     className="w-full py-6 bg-[#1A1C1E] text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50 mt-auto"
                   >
                     {generatingPrompt ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                     启动提示词合成
                   </button>
                </div>

                {/* Right: Output */}
                <div className="w-1/2 p-12 bg-gray-50/30 overflow-y-auto no-scrollbar flex flex-col">
                  {promptResult ? (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="h-full flex flex-col gap-8">
                       <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                             <FileCode className="w-4 h-4" /> 生成的提示词 (Generated Prompt)
                          </label>
                          <div className="flex items-center gap-2">
                             <button 
                                onClick={() => {
                                   navigator.clipboard.writeText(promptResult.promptContent);
                                   alert('Prompt 已复制');
                                }}
                                className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm group"
                                title="复制到剪贴板"
                             >
                                <Copy className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                             </button>
                             <button 
                                onClick={handleSavePromptAsKnowledge}
                                className="px-5 py-3 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-emerald-500 hover:text-emerald-600 transition-all shadow-sm"
                             >
                                存入知识库
                             </button>
                          </div>
                       </div>

                       <div className="bg-[#1A1C1E] text-emerald-400 p-10 rounded-[3rem] font-mono text-[11px] leading-loose shadow-2xl flex-1 overflow-y-auto custom-scrollbar border border-white/5 whitespace-pre-wrap">
                          {promptResult.promptContent}
                       </div>
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-20 opacity-30">
                       <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center mb-6">
                          <Wand2 className="w-8 h-8 text-gray-300" />
                       </div>
                       <p className="text-xs font-black uppercase tracking-widest text-gray-400">等待实验室炼金...</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
