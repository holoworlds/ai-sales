import { useState, useEffect, useMemo } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../services/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { KnowledgeEntry } from '../types';
import { extractKnowledgeInsights, queryKnowledgeBase } from '../services/gemini';
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
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

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

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定删除此知识节点吗？')) return;
    try {
      await deleteDoc(doc(db, 'knowledge', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `knowledge/${id}`);
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

  const categories = [
    { id: 'all', label: '全部知识', icon: Database },
    { id: 'strategy', label: '战略战术', icon: Zap },
    { id: 'competitor', label: '竞争情报', icon: FileSearch },
    { id: 'industry', label: '行业洞察', icon: Activity },
    { id: 'product', label: '产品能力', icon: Layers },
  ];

  useEffect(() => {
    const q = query(collection(db, 'knowledge'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as KnowledgeEntry)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'knowledge');
    });
    return () => unsubscribe();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

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
            await addDoc(collection(db, 'knowledge'), {
              title: row['标题'] || row['Title'] || `来自 ${fileName}`,
              content: row['内容'] || row['Content'] || JSON.stringify(row),
              sourceType: 'excel',
              tags: (row['标签'] || row['Tags'] || '').split(',').map((t: string) => t.trim()).filter(Boolean),
              category: 'industry',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              ownerId: auth.currentUser?.uid
            });
          }
          alert(`成功从 Excel 导入 ${rawData.length} 条知识点`);
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
    try {
      await addDoc(collection(db, 'knowledge'), {
        ...newEntry,
        tags: newEntry.tags.split(',').map(t => t.trim()).filter(Boolean),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ownerId: auth.currentUser?.uid
      });
      setIsAdding(false);
      setNewEntry({ title: '', content: '', sourceType: 'document', tags: '', category: 'strategy' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'knowledge');
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
                <motion.div 
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white border border-gray-200 p-10 rounded-[2.5rem] relative group overflow-hidden shadow-sm hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all"
                >
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
                    <button 
                      onClick={(e) => handleDelete(entry.id, e)}
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                       <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-2xl font-bold tracking-tight text-[#1A1C1E] mb-4 leading-tight">{entry.title}</h3>
                  
                  <div className="text-sm text-gray-600 leading-relaxed mb-8 line-clamp-3 font-medium">
                    {entry.content}
                  </div>

                  <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-50">
                    {entry.tags.map(tag => (
                      <span key={tag} className="text-[10px] font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-gray-100 transition-colors cursor-default">
                        <Tag className="w-3 h-3 text-blue-400" />
                        #{tag.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Intelligence Stats / Sidebar */}
        <div className="hidden lg:flex flex-col gap-8">
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
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
