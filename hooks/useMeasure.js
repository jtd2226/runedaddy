import * as React from 'react';
import { isEqual } from 'lodash';

export default function useMeasure(on = true) {
  const ref = React.useRef();
  const [bounds, set] = React.useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });
  const [ro] = React.useState(() => {
    if (typeof window !== 'undefined' && window?.ResizeObserver) {
      return new ResizeObserver(function ([entry]) {
        const height = entry.borderBoxSize.length
          ? entry.borderBoxSize[0].blockSize
          : entry.borderBoxSize.blockSize;

        const width = entry.borderBoxSize.length
          ? entry.borderBoxSize[0].inlineSize
          : entry.borderBoxSize.inlineSize;

        set({ ...entry.contentRect.toJSON(), height, width });
      });
    }
  });

  React.useEffect(() => {
    if (!ref.current) return;
    if (on) {
      ro.observe(ref.current);
    }
    return () => ro.disconnect();
  }, [on, ro, ref]);

  return { ref, bounds };
}

export function useResize(ref) {
  const isMounted = React.useRef();
  React.useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  });

  const [bounds, set] = React.useState({});
  const hash = JSON.stringify(bounds);
  const isAnimating = React.useRef();
  const handleResize = React.useCallback(() => {
    if (!isMounted.current) return;
    if (!ref.current) return;
    const rect = ref.current?.getBoundingClientRect() ?? {};
    const { bottom, height, left, right, top, width, x, y } = rect;
    if (isEqual(bounds, { bottom, height, left, right, top, width, x, y }))
      return;
    set(Object.assign({}, { bottom, height, left, right, top, width, x, y }));
  }, [hash, isMounted]);

  const animate = React.useCallback(() => {
    isAnimating.current = requestAnimationFrame(handleResize);
  }, [handleResize, isAnimating]);

  React.useEffect(() => {
    animate();
    addEventListener('resize', animate, true);
    addEventListener('click', animate, true);
    addEventListener('scroll', animate, true);
    return () => {
      cancelAnimationFrame(isAnimating.current);
      removeEventListener('resize', animate);
      removeEventListener('click', animate);
      removeEventListener('scroll', animate);
    };
  }, [animate, isAnimating]);

  return { ref, bounds };
}
