
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { debugService } from '../services/debug';

interface Props {
  children: ReactNode;
  name: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class DebugErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    debugService.log('ERROR', `React Crash in [${this.props.name}]`, {
      errorMessage: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      props: this.props
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 border-2 border-red-200 rounded-xl m-4">
          <h2 className="text-xl font-bold text-red-700 mb-2">组件 [ {this.props.name} ] 发生崩溃</h2>
          <p className="text-sm text-red-600 mb-4">{this.state.error?.message}</p>
          <button 
            onClick={() => {
              debugService.clearLogs();
              window.location.reload();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            清除日志并完全重启系统
          </button>
          <div className="mt-8">
            <h3 className="font-semibold text-gray-700 mb-2">崩溃前调试日志录 (最近10条):</h3>
            <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded overflow-auto max-h-64">
              {JSON.stringify(debugService.getLogs().slice(-10), null, 2)}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
