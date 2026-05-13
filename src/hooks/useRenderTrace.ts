
import { useEffect, useRef } from 'react';
import { debugService } from '../services/debug';

export function useRenderTrace(name: string, props: any, stateToWatch?: any) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      debugService.log('RENDER', `[${name}] Mounted`, { props });
      isInitialMount.current = false;
    }
    return () => {
      debugService.log('RENDER', `[${name}] Unmounted`);
    };
  }, []);

  const now = performance.now();
  const duration = now - lastRenderTime.current;
  lastRenderTime.current = now;
  renderCount.current++;

  if (renderCount.current % 5 === 0 || duration > 16) {
    debugService.log('RENDER', `[${name}] Stats`, {
      renderCount: renderCount.current,
      duration: `${duration.toFixed(2)}ms`,
      propsKeys: Object.keys(props),
      watchedState: stateToWatch
    });
  }

  // 检测无限循环
  if (renderCount.current > 50) {
    debugService.log('ERROR', `[${name}] Possible Infinite Rerender detected!`, {
      renderCount: renderCount.current
    });
  }
}
