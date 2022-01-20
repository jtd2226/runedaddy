import { useCallback } from 'react';

function debounce(fn, wait = 700) {
  let timeout = null;
  const time = wait === true ? 700 : wait;
  return (...args) => {
    clearTimeout(timeout);
    return new Promise(resolve => {
      timeout = setTimeout(() => {
        timeout = null;
        resolve(fn(...args));
      }, time);
    });
  };
}

export default function useDebounce(fn, wait = 700) {
  const debounced = useCallback(
    callback => debounce((...args) => callback(...args), wait),
    [wait]
  );
  return debounced(fn);
}
