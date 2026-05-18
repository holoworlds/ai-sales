import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  title?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  countdown: number;
}

export default class NexusErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    countdown: 0
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, countdown: 5 };
  }

  private errorStartTime: number = 0;
  private timerRef: any = null;

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[NexusErrorBoundary] Uncaught error:', error, errorInfo);
    this.errorStartTime = Date.now();
    this.setState({ countdown: 5 });
    
    this.timerRef = setInterval(() => {
      this.setState(prev => {
        if (prev.countdown <= 1) {
          clearInterval(this.timerRef);
          return { countdown: 0 };
        }
        return { countdown: prev.countdown - 1 };
      });
    }, 1000);
  }

  componentWillUnmount() {
    if (this.timerRef) clearInterval(this.timerRef);
  }

  private handleReset = () => {
    if (this.state.countdown > 0) return;
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="h-full flex items-center justify-center p-12 bg-[#0F1113] rounded-[3.5rem] border border-white/5 shadow-2xl">
          <div className="max-w-md w-full bg-[#1A1C1E] border border-red-500/20 p-12 rounded-[2.5rem] text-center space-y-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">{this.props.title || '系统模块出现异常'}</h2>
              <p className="text-xs text-gray-500 leading-relaxed">
                组件在执行某些逻辑时遇到了异常状态循环或渲染冲突。
              </p>
            </div>
            {this.state.error && (
              <div className="p-4 bg-black/40 rounded-xl border border-white/5 font-mono text-[10px] text-red-400 text-left overflow-auto max-h-32">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReset}
              disabled={this.state.countdown > 0}
              className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                this.state.countdown > 0 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {this.state.countdown > 0 ? (
                <>锁定中 ({this.state.countdown}s)</>
              ) : (
                <><RefreshCw className="w-4 h-4" /> 重新启动引擎</>
              )}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
