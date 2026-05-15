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
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';

function KnowledgeCard({ entry, idx, selectedEntries, setSelectedEntries, handleDelete }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.03 }}
      className="bg-white border border-gray-100 p-4 rounded-xl relative group hover:shadow-md transition-all flex items-center justify-between gap-3"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <input 
          type="checkbox"
          checked={selectedEntries.includes(entry.id)}
          onChange={() => setSelectedEntries((prev: string[]) => 
            prev.includes(entry.id) ? prev.filter(id => id !== entry.id) : [...prev, entry.id]
          )}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
        />
        
        <div className="flex flex-col min-w-0">
          <h3 className="text-xs font-bold tracking-tight text-[#1A1C1E] group-hover:text-blue-600 transition-colors uppercase truncate">
            {entry.title}
          </h3>
          <div className="flex flex-wrap gap-1 mt-1">
            {entry.tags.slice(0, 2).map((tag: string) => (
              <span key={tag} className="text-[7.5px] font-black text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 flex items-center gap-1">
                <Tag className="w-1.5 h-1.5 text-blue-400" />
                {tag.toUpperCase()}
              </span>
            ))}
            {entry.tags.length > 2 && <span className="text-[7.5px] text-gray-300">+{entry.tags.length - 2}</span>}
          </div>
        </div>
      </div>

      <button 
        onClick={(e) => handleDelete(entry.id, e)}
        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0"
      >
        <Trash2 className="w-3 h-3" />
      </button>
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
      const data = JSON.parse(JSON.stringify(await extractKnowledgeInsights(newEntry.content)));
      
      setNewEntry(prev => ({
        ...prev,
        title: prev.title || data.suggestedTitle,
        content: String(data.summary || ''),
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : String(data.tags || ''),
        category: data.category || prev.category
      }));
    } catch (err) {
      console.error("Extraction failed:", err);
    } finally {
      setExtracting(false);
    }
  };

  const fetchData = async () => {
    try {
      const data = await localDb.getAll('knowledge');
      // Sort by updatedAt desc
      data.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setEntries(data);
      setLoading(false);
    } catch (error) {
      console.error("[KnowledgeBase] fetchData error:", error);
      setLoading(false);
      // We could add an error state here if needed
    }
  };

  useEffect(() => {
    fetchData().catch(err => console.error("[KnowledgeBase] Initial fetchData failed:", err));
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
      // 1. Get selected entries
      let contextEntries = entries.filter(e => selectedEntries.includes(e.id));
      
      // 2. If query seems related to tags or we need more context, find by tag similarity
      if (contextEntries.length < 5) {
        // Simple tag matching for "AI Marketing" or content keywords
        const keywords = currentQuery.toLowerCase().split(/\s+/).filter(k => k.length > 1);
        const autoTags = entries.filter(e => 
          !selectedEntries.includes(e.id) && 
          e.tags?.some(t => keywords.includes(t.toLowerCase()) || t.toLowerCase().includes('marketing') || t.toLowerCase().includes('ai'))
        );
        contextEntries = [...contextEntries, ...autoTags.slice(0, 5)];
      }

      // Build context from filtered entries
      const context = contextEntries.length > 0 
        ? contextEntries.map(e => `【${e.title}】: ${e.content}`).join('\n\n')
        : entries.slice(0, 5).map(e => `【${e.title}】: ${e.content}`).join('\n\n'); // Fallback to fresh docs if nothing found

      const response = await queryKnowledgeBase(currentQuery, context);
      const safeResponse = typeof response === 'string' ? response : JSON.stringify(response);
      setQaHistory(prev => [...prev, { role: 'ai', content: safeResponse }]);
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
      
      const result = JSON.parse(JSON.stringify(await generateStrategicPrompt(promptRequirements, sources)));
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
    if (!file) return;

    try {
      const user = await localAuth.getCurrentUserAsync();
      if (!user) return;

      const fileName = file.name;
      const fileExt = fileName.split('.').pop()?.toLowerCase();

      // Show processing state would be nice, but for now we'll just handle it
      if (fileExt === 'xlsx' || fileExt === 'xls') {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const rawData: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wsname]);

            for (const row of rawData) {
              const content = row['内容'] || row['Content'] || JSON.stringify(row);
              // Auto-extract tags for each row if not present
              let tags = (row['标签'] || row['Tags'] || '').split(',').map((t: string) => t.trim()).filter(Boolean);
              if (tags.length === 0) {
                 const insights = await extractKnowledgeInsights(content);
                 if (insights.tags) tags = insights.tags;
              }

              await localDb.add('knowledge', {
                title: row['标题'] || row['Title'] || `来自 ${fileName}`,
                content: content,
                sourceType: 'excel',
                tags: tags,
                category: 'industry',
                ownerId: user.uid
              });
            }
            await fetchData();
            alert(`成功从 Excel 导入 ${rawData.length} 条知识点且已完成 AI 标签挂载`);
            setShowSuccess(true);
            setTimeout(() => {
              setShowSuccess(false);
              setIsAdding(false);
            }, 2000);
          } catch (err) {
            console.error("[KnowledgeBase] Excel import error:", err);
            alert('Excel 解析失败');
          }
        };
        reader.readAsBinaryString(file);
      } else {
        // Text or other files
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const text = evt.target?.result as string;
            setExtracting(true);
            const fileNameClean = fileName.replace(/\.[^/.]+$/, "");
            
            // Auto-trigger AI extraction for better tags and title
            const insights = await extractKnowledgeInsights(text);
            
            setNewEntry(prev => ({
              ...prev,
              title: insights.suggestedTitle || fileNameClean,
              content: text,
              tags: Array.isArray(insights.tags) ? insights.tags.join(', ') : (insights.tags || ''),
              category: insights.category || 'strategy',
              sourceType: fileExt === 'pdf' ? 'pdf' : 
                          (fileExt === 'doc' || fileExt === 'docx' ? 'word' : 
                          (fileExt === 'ppt' || fileExt === 'pptx' ? 'ppt' : 'document'))
            }));
          } catch (err) {
            console.error("[KnowledgeBase] File read processing error:", err);
            alert('文件处理失败');
          } finally {
            setExtracting(false);
          }
        };
        reader.readAsText(file);
      }
    } catch (err) {
      console.error("[KnowledgeBase] handleFileUpload error:", err);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await localAuth.getCurrentUserAsync();
      if (!user) return;
      
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

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0 overflow-hidden">
        {/* Q&A Section - Larger */}
        <div className="lg:col-span-7 border-r border-gray-100 pr-6 flex flex-col min-h-0 bg-white/40 p-6 rounded-[2.5rem]">
           <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#1A1C1E] flex items-center gap-2">
                 <MessageSquare className="w-5 h-5 text-blue-600" />
                 战略助手问答
              </h3>
              <div className="flex items-center gap-3">
                 {selectedEntries.length > 0 && (
                    <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      限定 {selectedEntries.length} 篇
                    </span>
                 )}
                 <button onClick={() => setQaHistory([])} className="text-[10px] font-bold text-gray-400 hover:text-red-500 uppercase transition-colors">清除</button>
              </div>
           </div>
           
           <div className="flex-1 overflow-y-auto mb-6 space-y-6 no-scrollbar bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
              {qaHistory.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-10 px-4">
                    <Sparkles className="w-10 h-10 text-blue-400 mb-6" />
                    <p className="text-base font-bold text-gray-900 mb-2">欢迎使用战略大脑</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 leading-relaxed">
                       基于所选文档集及标签关联<br />进行深度营销战略检索与博弈分析
                    </p>
                 </div>
              ) : (
                qaHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[95%] px-6 py-4 rounded-[1.5rem] text-sm leading-relaxed font-medium ${
                      msg.role === 'user' 
                        ? 'bg-[#1A1C1E] text-white shadow-xl' 
                        : 'bg-gray-50 border border-gray-200 text-gray-800'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {isQuerying && (
                <div className="flex justify-start">
                   <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-3">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">神经网络正在检索符合要求的节点...</span>
                   </div>
                </div>
              )}
           </div>

           <form onSubmit={handleKnowledgeQuery} className="relative shrink-0">
              <input 
                type="text" 
                value={qaQuery}
                onChange={e => setQaQuery(e.target.value)}
                placeholder="询问知识库 (默认检索所选文档 + 标签关联文档)..."
                className="w-full bg-white border-2 border-gray-100 px-8 py-5 pr-20 rounded-[2rem] text-sm outline-none focus:border-blue-500 transition-all font-medium placeholder:text-gray-300 shadow-xl shadow-gray-200/20"
              />
              <button 
                type="submit"
                disabled={!qaQuery.trim() || isQuerying}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-[#1A1C1E] text-white rounded-2xl flex items-center justify-center hover:bg-blue-600 transition-all disabled:opacity-30 active:scale-90 shadow-lg"
              >
                 <Send className="w-6 h-6" />
              </button>
           </form>
        </div>

        {/* Main List & Sidebar */}
        <div className="lg:col-span-5 flex flex-col min-h-0 overflow-hidden gap-8">
           {/* Main List */}
           <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-4">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">文档集群 ({filtered.length})</h3>
                 <div className="flex items-center gap-4">
                    <button 
                       onClick={() => setSelectedEntries(entries.map(e => e.id))}
                       className="text-[9px] font-bold text-blue-600 hover:underline"
                    >全选</button>
                    <button 
                       onClick={() => setSelectedEntries([])}
                       className="text-[9px] font-bold text-gray-400 hover:underline"
                    >清除</button>
                 </div>
              </div>
              <div className="space-y-2">
                {loading ? (
                  <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-16 bg-gray-50 border border-gray-100 rounded-xl animate-pulse" />
                      ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="h-full min-h-[200px] flex flex-col items-center justify-center bg-gray-50 border border-gray-200 border-dashed rounded-[2rem] text-gray-400 p-10 text-center">
                      <Brain className="w-10 h-10 text-gray-200 mb-6" />
                      <h3 className="text-base font-bold text-gray-900 mb-1">未发现目标集群</h3>
                      <p className="text-[10px] max-w-xs mx-auto">请尝试更换检索关键词或注入新节点。</p>
                  </div>
                ) : (
                  filtered.map((entry, idx) => (
                    <KnowledgeCard 
                      key={entry.id} 
                      entry={entry} 
                      idx={idx} 
                      selectedEntries={selectedEntries} 
                      setSelectedEntries={setSelectedEntries} 
                      handleDelete={handleDelete} 
                    />
                  ))
                )}
              </div>
           </div>

           {/* Labels Stats */}
           <div className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm shrink-0">
              <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                <Tag className="w-3 h-3 text-blue-600" /> 标签过滤
              </h3>
              <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto no-scrollbar">
                {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTags(prev => 
                          prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                      )}
                      className={`px-2 py-1 rounded-lg text-[8px] font-bold uppercase transition-all ${
                          selectedTags.includes(tag)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      #{tag.toLowerCase()}
                    </button>
                ))}
              </div>
           </div>
        </div>
      </div>

      {/* Add Modal */}
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

      {/* Selected Action Bar */}
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

      {/* Prompt Lab Modal */}
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
                                 onClick={async () => {
                                    try {
                                       await navigator.clipboard.writeText(promptResult.promptContent);
                                       alert('Prompt 已复制');
                                    } catch (err) {
                                       console.error(err);
                                    }
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
    </div>
  );
}
