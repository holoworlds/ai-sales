
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AppLogger } from '../services/logger';
import { AlertCircle, RefreshCw, History } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    AppLogger.logError(error, {
      componentStack: errorInfo.componentStack
    });
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0F1113] flex items-center justify-center p-6 text-white font-sans">
          <div className="max-w-2xl w-full bg-[#1A1C1E] border border-white/5 rounded-[3rem] p-12 shadow-2xl space-y-10">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-red-600/20 text-red-500 rounded-3xl flex items-center justify-center">
                <AlertCircle size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">系统渲染中断 (Render Crash)</h1>
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Global Error Recovery Layer Enabled</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-8 bg-black/40 rounded-3xl border border-white/5 font-mono text-xs text-gray-400 overflow-x-auto leading-relaxed">
                <p className="text-red-400 font-bold mb-4">{this.state.error?.message}</p>
                <div className="max-h-48 overflow-y-auto no-scrollbar opacity-60">
                   {this.state.errorInfo?.componentStack}
                </div>
              </div>
              <p className="text-sm text-gray-500 italic">
                致命错误已自动记录并持久化保存。您可以查看“错误日志”或尝试重置系统状态。
              </p>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={this.handleReset}
                className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
              >
                <RefreshCw size={16} /> 重置系统状态
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="px-10 py-5 bg-white/5 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10"
              >
                刷新页面
              </button>
            </div>

            <div className="pt-6 border-t border-white/5 flex items-center justify-between">
               <div className="flex items-center gap-2 text-[9px] font-black uppercase text-gray-600 tracking-widest">
                  <History size={12} /> Persisted Bug Log ID: {Math.random().toString(36).substring(7)}
               </div>
               <span className="text-[9px] font-black uppercase text-gray-800">Cortex Guard Active</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
