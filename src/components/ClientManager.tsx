import { useState, useEffect } from 'react';
import { localDb, localAuth } from '../services/storage';
import { Client, ClientStage } from '../types';
import { PHASE_MATRIX } from '../constants';
import { analyzeClientStage } from '../services/gemini';
import { 
  Search, 
  Plus, 
  Building2,
  ChevronRight,
  TrendingUp,
  BrainCircuit,
  Clock,
  CheckCircle2,
  Calendar,
  MessageSquarePlus,
  LayoutGrid,
  List,
  Sparkles,
  RefreshCw,
  X,
  FileDown,
  FileUp
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion } from 'motion/react';
import ClientDetails from './ClientDetails';

import { useRenderTrace } from '../hooks/useRenderTrace';

interface ClientManagerProps {
  initialClientId?: string | null;
  onClientClear?: () => void;
}

export default function ClientManager({ initialClientId, onClientClear }: ClientManagerProps) {
  const [clients, setClients] = useState<Client[]>([]);
  
  useRenderTrace('ClientManager', { initialClientId, clientCount: clients.length });
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Handle initial client selection from dashboard
  useEffect(() => {
    if (initialClientId && clients.length > 0) {
      const client = clients.find(c => c.id === initialClientId);
      if (client) {
        setSelectedClient(client);
      }
    }
  }, [initialClientId, clients]);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', company: '', industry: '' });
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');
  const [quickLogClient, setQuickLogClient] = useState<Client | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [logContent, setLogContent] = useState('');

  const excelHeaders = [
    '客户名称', '推动人', '关键人（拍板/影响者）', '群体会议', '产品', '规模', '项目评分', '当前阶段', '阻力点', '缺什么材料', '下一步行动建议', '进展'
  ];

  const handleExportExcel = () => {
    const data = clients.map(c => ({
      '客户名称': c.company,
      '推动人': c.promoter || c.name || '',
      '推动部门': c.promoterDept || '',
      '关键人（拍板/影响者）': c.keyPerson || '',
      '群体会议': c.groupMeeting || '',
      '产品': c.interestedProducts || c.product || '',
      '预算规模': c.budgetScale || c.scale || '',
      '项目评分': c.projectScore || 0,
      '当前阶段': PHASE_MATRIX[c.stage]?.label || c.stage,
      '阻力点': c.resistancePoint || '',
      '缺什么材料': c.missingMaterials || '',
      '下一步行动建议': c.nextActionSuggestion || '',
      '进展': c.progress || '',
      '现状摘要': (c.memorySummary || '').slice(0, 100)
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ClientAssets");
    XLSX.writeFile(workbook, `Client_Assets_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const [expandedActionIds, setExpandedActionIds] = useState<Set<string>>(new Set());

  const toggleExpandAction = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSet = new Set(expandedActionIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedActionIds(newSet);
  };

  const fetchData = async () => {
    try {
      const user = await localAuth.getCurrentUserAsync();
      if (!user) return;
      const data = await localDb.getAll('clients');
      // Sort by updatedAt desc
      data.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setClients(data);
      setLoading(false);
    } catch (error) {
      console.error("[ClientManager] fetchData error:", error);
      setLoading(false);
      setError("数据加载失败");
    }
  };

  useEffect(() => {
    fetchData().catch(err => console.error("[ClientManager] Initial fetchData failed:", err));
  }, []);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const user = await localAuth.getCurrentUserAsync();
      if (!user) return;

      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const rawData: any[] = XLSX.utils.sheet_to_json(ws);

          if (rawData.length === 0) {
            alert('Excel 文件中没有数据');
            return;
          }

          const headerMap: { [key: string]: string } = {
            '客户名称': 'company',
            '公司': 'company',
            '企业': 'company',
            '推动人': 'promoter',
            '联系人': 'name',
            '关键人': 'keyPerson',
            '产品': 'product',
            '规模': 'scale',
            '项目评分': 'projectScore',
            '当前阶段': 'stage',
            '阶段': 'stage',
            '阻力点': 'resistancePoint',
            '进展': 'progress',
            '下一步行动建议': 'nextActionSuggestion',
            '缺什么材料': 'missingMaterials'
          };

          let importedCount = 0;

          for (const row of rawData) {
            const processedRow: any = {};
            
            Object.keys(row).forEach(key => {
              const cleanKey = key.trim();
              for (const [header, field] of Object.entries(headerMap)) {
                if (cleanKey.includes(header)) {
                  processedRow[field] = row[key];
                  break;
                }
              }
            });

            let stage: ClientStage = 'phase_0';
            const stageValue = String(processedRow['stage'] || '').trim();
            if (stageValue) {
              for (const [key, value] of Object.entries(PHASE_MATRIX)) {
                if (value.label === stageValue || key === stageValue || stageValue.toLowerCase().includes(key.toLowerCase())) {
                  stage = key as ClientStage;
                  break;
                }
              }
            }

            await localDb.add('clients', {
              company: processedRow['company'] || '未命名企业',
              name: processedRow['name'] || processedRow['keyPerson'] || '未命名联系人',
              promoter: processedRow['promoter'] || '',
              keyPerson: processedRow['keyPerson'] || '',
              groupMeeting: processedRow['groupMeeting'] || '',
              product: processedRow['product'] || '',
              scale: processedRow['scale'] || '',
              projectScore: Number(processedRow['projectScore']) || 0,
              stage,
              resistancePoint: processedRow['resistancePoint'] || '',
              missingMaterials: processedRow['missingMaterials'] || '',
              nextActionSuggestion: processedRow['nextActionSuggestion'] || '',
              progress: processedRow['progress'] || '',
              ownerId: user.uid,
              nextActionCompleted: false
            });
            importedCount++;
          }
          await fetchData();
          alert(`导入完成：共成功导入 ${importedCount} 条记录`);
        } catch (err) {
          console.error("[ClientManager] Import error:", err);
          alert('导入过程中出现错误，请检查文件格式');
        }
      };
      reader.readAsBinaryString(file);
      e.target.value = ''; // Reset input
    } catch (err) {
      console.error("[ClientManager] handleImportExcel error:", err);
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingClient) return;
    setIsCreatingClient(true);
    try {
      const user = await localAuth.getCurrentUserAsync();
      if (!user) {
        setIsCreatingClient(false);
        return;
      }
      await localDb.add('clients', {
        ...newClient,
        promoter: newClient.name, // Ensure promoter is synced from name on creation
        stage: 'phase_0' as ClientStage,
        ownerId: user.uid,
        nextActionSuggestion: '正在为您初始化战术建议...',
        nextActionCompleted: false
      });
      await fetchData();
      setIsAddingClient(false);
      setNewClient({ name: '', company: '', industry: '' });
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreatingClient(false);
    }
  };

  const handleQuickLog = async () => {
    if (!quickLogClient || !logContent.trim()) return;
    setIsLogging(true);
    try {
      const user = await localAuth.getCurrentUserAsync();
      if (!user) throw new Error('User not found');

      await localDb.add(`clients/${quickLogClient.id}/interactions` as any, {
        clientId: quickLogClient.id,
        content: logContent,
        type: 'note',
        authorId: user?.uid
      });

      const result = JSON.parse(JSON.stringify(await analyzeClientStage(logContent)));
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + (result.recommendedFollowupDays || 7));

      await localDb.update('clients', quickLogClient.id, {
        stage: result.stage,
        decisionMatrix: result.matrix,
        nextActionSuggestion: result.nextActionSuggestion,
        nextActionDate: nextDate,
        projectScore: result.scoreDetails?.total || quickLogClient.projectScore,
        promoter: result.extractedFields?.promoter || quickLogClient.promoter,
        promoterDept: result.extractedFields?.promoterDept || quickLogClient.promoterDept,
        keyPerson: result.extractedFields?.keyPerson || quickLogClient.keyPerson,
        groupMeeting: result.extractedFields?.groupMeeting || quickLogClient.groupMeeting,
        interestedProducts: result.extractedFields?.interestedProducts || quickLogClient.interestedProducts,
        budgetScale: result.extractedFields?.budgetScale || quickLogClient.budgetScale,
        resistancePoint: result.extractedFields?.resistancePoint || quickLogClient.resistancePoint,
        missingMaterials: result.extractedFields?.missingMaterials || quickLogClient.missingMaterials,
        progress: result.extractedFields?.progress || quickLogClient.progress,
      });

      await fetchData();
      setQuickLogClient(null);
      setLogContent('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLogging(false);
    }
  };

  const handleToggleAction = async (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    try {
      await localDb.update('clients', client.id, {
        nextActionCompleted: !client.nextActionCompleted
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredClients = clients
    .filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.company.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => (b.projectScore || 0) - (a.projectScore || 0));

  const phases = Object.keys(PHASE_MATRIX) as ClientStage[];

  if (selectedClient) {
    return (
      <ClientDetails 
        client={selectedClient} 
        onBack={() => {
          setSelectedClient(null);
          onClientClear?.();
        }} 
      />
    );
  }

  return (
    <div className="space-y-8 h-full flex flex-col">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1A1C1E] mb-1">战略资产管线</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            基于决策阶段 (Phase 0-7) 的科学管理
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-xl mr-4">
            <button 
              onClick={() => setViewMode('pipeline')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${viewMode === 'pipeline' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> 管线图
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
            >
              <List className="w-3.5 h-3.5" /> 列表
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer bg-white border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm">
               <FileUp className="w-3.5 h-3.5" /> 导入 Excel
               <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" />
            </label>
            <button 
              onClick={handleExportExcel}
              className="bg-white border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm"
            >
              <FileDown className="w-3.5 h-3.5" /> 导出 Excel
            </button>
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
            <input 
              type="text" 
              placeholder="搜索资产或决策者..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all w-48 shadow-sm"
            />
          </div>
          <button 
            onClick={() => setIsAddingClient(true)}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm tracking-wide flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            新建档案
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="h-full flex items-center justify-center">
             <div className="w-12 h-12 border-2 border-blue-600/20 border-t-blue-600 animate-spin rounded-full" />
          </div>
        ) : viewMode === 'list' ? (
          <>
            <div className="grid grid-cols-12 gap-4 px-10 py-3 border-b border-gray-100 bg-gray-50/50 text-[9px] font-black uppercase tracking-widest text-gray-400">
              <div className="col-span-3">项目实体 / 负责人</div>
              <div className="col-span-1 text-center">Score</div>
              <div className="col-span-2">当前战略 Phase</div>
              <div className="col-span-5">下一步行动 (Fact-Based)</div>
              <div className="col-span-1"></div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50 no-scrollbar">
              {filteredClients.map(client => {
                const isExpanded = expandedActionIds.has(client.id);
                return (
                  <div 
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className="grid grid-cols-12 gap-4 px-10 py-3 hover:bg-blue-50/20 cursor-pointer transition-all group items-start"
                  >
                    <div className="col-span-3 flex items-center gap-4">
                      <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all font-black text-xs">
                        {client.company.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-gray-900 leading-tight group-hover:text-blue-600 transition-colors truncate">{client.company}</div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">{client.name}</div>
                      </div>
                    </div>
                    <div className="col-span-1 text-center self-center">
                      <span className={`text-xs font-black ${(client.projectScore || 0) >= 75 ? 'text-emerald-500' : (client.projectScore || 0) >= 55 ? 'text-blue-500' : (client.projectScore || 0) >= 35 ? 'text-amber-500' : 'text-red-500'}`}>
                        {client.projectScore || 0}
                      </span>
                    </div>
                    <div className="col-span-2 self-center">
                      <span className="text-[9px] font-bold bg-blue-50/50 text-blue-600 px-2 py-1 rounded border border-blue-100/50">
                        {PHASE_MATRIX[client.stage as keyof typeof PHASE_MATRIX]?.label || '未知阶段'}
                      </span>
                    </div>
                    <div className="col-span-5 self-center">
                      {client.nextActionSuggestion && (
                        <div className="flex flex-col gap-1">
                          <div 
                             onClick={(e) => toggleExpandAction(e, client.id)}
                             className="flex items-start gap-2 group/text cursor-pointer"
                          >
                             <div className={`flex items-start gap-1.5 flex-1 transition-opacity ${client.nextActionCompleted ? 'opacity-30' : 'opacity-100'}`}>
                                <Sparkles className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                                <span className={`text-[11px] font-medium transition-colors group-hover/text:text-blue-600 ${isExpanded ? '' : 'line-clamp-1'} ${client.nextActionCompleted ? 'line-through' : 'text-gray-600'}`}>
                                   {client.nextActionSuggestion}
                                </span>
                             </div>
                             <ChevronRight className={`w-3 h-3 mt-1 text-gray-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </div>
                          
                          {isExpanded && (
                             <div className="flex items-center gap-3 pl-4.5">
                                <div className="flex items-center gap-1 text-[9px] font-black text-blue-500/60 uppercase">
                                   <Clock className="w-2.5 h-2.5" />
                                   截止: {client.nextActionDate?.toDate ? 
                                       client.nextActionDate.toDate().toISOString().split('T')[0] : 
                                       (client.nextActionDate ? new Date(client.nextActionDate).toISOString().split('T')[0] : '待定')}
                                </div>
                                <button 
                                  onClick={(e) => handleToggleAction(e, client)}
                                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                    client.nextActionCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-200 text-gray-300 hover:border-emerald-500 hover:text-emerald-500'
                                  }`}
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                </button>
                             </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="col-span-1 text-right self-center">
                      <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-blue-600 transition-colors inline-block" />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex gap-6 h-full overflow-x-auto pb-4 no-scrollbar">
            {phases.map(phase => {
              const phaseClients = filteredClients.filter(c => c.stage === phase);
              const isNurture = ['phase_0', 'phase_1', 'phase_2'].includes(phase);
              
              return (
                <div key={phase} className="flex-shrink-0 w-80 flex flex-col h-full">
                  <div className={`p-4 rounded-t-[2rem] border-x border-t flex flex-col gap-2 ${isNurture ? 'bg-blue-50/50 border-blue-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${isNurture ? 'text-blue-600' : 'text-emerald-600'}`}>
                        {PHASE_MATRIX[phase as keyof typeof PHASE_MATRIX]?.label || phase}
                      </span>
                      <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded-full border border-current opacity-50">
                        {phaseClients.length}
                      </span>
                    </div>
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter truncate opacity-70">
                      目标: {PHASE_MATRIX[phase as keyof typeof PHASE_MATRIX]?.nextTarget || '待定'}
                    </div>
                  </div>
                  
                        <div className="flex-1 bg-gray-50/30 border-x border-b border-gray-100 rounded-b-[2rem] p-3 space-y-3 overflow-y-auto no-scrollbar">
                      {phaseClients
                        .sort((a, b) => (b.projectScore || 0) - (a.projectScore || 0))
                        .map(client => (
                        <div 
                          key={client.id}
                          className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all group relative cursor-pointer"
                        >
                        <div className="flex items-start justify-between mb-4">
                           <div onClick={() => setSelectedClient(client)} className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                 <h4 className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition-colors truncate">{client.company}</h4>
                                 <span className={`text-[8px] font-black px-1.5 py-0.5 rounded text-white shrink-0 ${
                                    (client.projectScore || 0) >= 75 ? 'bg-emerald-500' : 
                                    (client.projectScore || 0) >= 55 ? 'bg-blue-500' : 
                                    (client.projectScore || 0) >= 35 ? 'bg-amber-500' : 'bg-red-500'
                                 }`}>
                                    {(client.projectScore || 0) >= 75 ? 'A' : (client.projectScore || 0) >= 55 ? 'B' : (client.projectScore || 0) >= 35 ? 'C' : 'D'}
                                 </span>
                              </div>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{client.name}</p>
                           </div>
                           <button 
                             onClick={(e) => { e.stopPropagation(); setQuickLogClient(client); }}
                             className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                           >
                             <MessageSquarePlus className="w-4 h-4" />
                           </button>
                        </div>

                        {client.nextActionSuggestion && (
                          <div className={`mt-3 pt-3 border-t border-gray-50 space-y-2 transition-opacity ${client.nextActionCompleted ? 'opacity-40' : 'opacity-100'}`}>
                             <div 
                                onClick={(e) => toggleExpandAction(e, client.id)}
                                className="flex items-start gap-2.5 cursor-pointer group/action"
                             >
                                <BrainCircuit className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />
                                <span className={`text-[10px] leading-relaxed font-medium group-hover/action:text-blue-600 ${expandedActionIds.has(client.id) ? '' : 'line-clamp-1'} ${client.nextActionCompleted ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                                  {client.nextActionSuggestion}
                                </span>
                             </div>
                             
                             {(expandedActionIds.has(client.id) || client.nextActionCompleted) && (
                                <div className="flex items-center justify-between">
                                   <div className={`flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest w-fit px-1.5 py-0.5 rounded cursor-pointer ${
                                     client.nextActionCompleted ? 'bg-gray-100 text-gray-400' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                                   } relative`}>
                                      <Clock className="w-2 h-2" />
                                      <input 
                                         type="date"
                                         value={client.nextActionDate?.toDate ? 
                                           client.nextActionDate.toDate().toISOString().split('T')[0] : 
                                           (client.nextActionDate ? new Date(client.nextActionDate).toISOString().split('T')[0] : '')
                                         }
                                         onChange={async (e) => {
                                           const newDate = new Date(e.target.value);
                                           if (!isNaN(newDate.getTime())) {
                                             await localDb.update('clients', client.id, { nextActionDate: newDate });
                                             await fetchData();
                                           }
                                         }}
                                         onClick={e => e.stopPropagation()}
                                         className="bg-transparent border-none p-0 focus:ring-0 cursor-pointer outline-none w-[75px] text-[8px] font-black uppercase"
                                      />
                                   </div>
                                   <button 
                                     onClick={(e) => handleToggleAction(e, client)}
                                     className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                                       client.nextActionCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-200 text-gray-300 hover:border-emerald-500 hover:text-emerald-500'
                                     }`}
                                   >
                                     <CheckCircle2 className="w-3.5 h-3.5" />
                                   </button>
                                </div>
                             )}
                          </div>
                        )}
                        
                        <div onClick={() => setSelectedClient(client)} className="mt-4 flex items-center justify-end">
                           <div className="text-[8px] font-bold text-gray-300 uppercase tracking-widest group-hover:text-blue-500 transition-colors">查看档案 →</div>
                        </div>
                      </div>
                    ))}
                    
                    {phaseClients.length === 0 && (
                      <div className="py-20 flex flex-col items-center justify-center text-gray-300 opacity-50 border-2 border-dashed border-gray-100 rounded-3xl">
                        <TrendingUp className="w-8 h-8 mb-2" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">无活动资产</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Log Modal */}
      {quickLogClient && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !isLogging && setQuickLogClient(null)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-lg relative z-10 shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                 <div>
                    <h3 className="font-bold text-gray-900">快速同步互动: {quickLogClient.company}</h3>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-1">
                       管线更新 · AI 神经审计将同步运行
                    </p>
                 </div>
                 <button onClick={() => setQuickLogClient(null)} className="p-2 text-gray-400 hover:text-gray-900">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="p-8 space-y-6">
                 <textarea 
                   value={logContent}
                   onChange={e => setLogContent(e.target.value)}
                   placeholder="粘贴会议纪要、聊天记录或邮件摘要..."
                   className="w-full h-[285px] bg-gray-50 border border-gray-100 rounded-2xl p-5 text-sm focus:bg-white focus:border-blue-600 outline-none transition-all resize-none shadow-inner"
                 />
                 <button 
                   onClick={handleQuickLog}
                   disabled={isLogging || !logContent.trim()}
                   className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50"
                 >
                   {isLogging ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> 正在分析同步...
                      </>
                   ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-blue-200" /> 确认同步
                      </>
                   )}
                 </button>
              </div>
            </motion.div>
          </div>
        )}

      {/* Add Client Modal */}
      {isAddingClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAddingClient(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white border border-gray-200 rounded-[2.5rem] shadow-2xl w-full max-w-xl relative z-10 p-12 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
              <div className="mb-10 text-center">
                <h2 className="text-3xl font-bold tracking-tight mb-2">初始化战略档案</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">将建立在 Phase 0: 现状惯性 阶段</p>
              </div>
              <form onSubmit={handleAddClient} className="space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">组织名称</label>
                    <input 
                      required type="text" value={newClient.company}
                      onChange={e => setNewClient({...newClient, company: e.target.value})}
                      placeholder="企业/组织全称"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 focus:border-blue-600 focus:bg-white outline-none font-sans text-sm transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">推动人</label>
                    <input 
                      required type="text" value={newClient.name}
                      onChange={e => setNewClient({...newClient, name: e.target.value})}
                      placeholder="姓名/职位"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 focus:border-blue-600 focus:bg-white outline-none font-sans text-sm transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">所属行业/垂类</label>
                  <input 
                    type="text" value={newClient.industry}
                    onChange={e => setNewClient({...newClient, industry: e.target.value})}
                    placeholder="例如: 智能制造, 跨境电商..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 focus:border-blue-600 focus:bg-white outline-none font-sans text-sm transition-all"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsAddingClient(false)} className="flex-1 py-4 text-xs font-bold uppercase tracking-widest text-gray-400 rounded-2xl">取消</button>
                  <button 
                    type="submit" 
                    disabled={isCreatingClient}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm tracking-widest shadow-lg shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isCreatingClient && <RefreshCw className="w-4 h-4 animate-spin" />}
                    {isCreatingClient ? '正在建立...' : '建立档案'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
    </div>
  );
}
