import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { isFunction, isEqual } from 'lodash';

export default function useFilters(value, defaults) {
  const [filters, setFilters] = useState({});
  const originalFilters = useRef();
  useEffect(() => {
    if (isEqual(defaults, originalFilters.current)) return;
    originalFilters.current = defaults;
    setFilters(defaults ?? {});
  }, [defaults, originalFilters]);

  const original = useRef();
  const [values, setValues] = useState([]);
  useEffect(() => {
    if (isEqual(value, original.current)) return;
    original.current = value;
    setValues(Array.isArray(value) ? value : Object.values(value ?? {}));
  }, [value, original]);

  const getOptions = useCallback(
    apiName =>
      Array.from(
        new Set(values.flatMap(item => item[apiName]).filter(x => !!x))
      ),
    [values]
  );
  const removeFilter = useCallback(
    name =>
      setFilters(old => {
        delete old[name];
        return { ...old };
      }),
    []
  );
  const addFilter = useCallback(
    (name, value) => setFilters(old => ({ ...old, [name]: value })),
    []
  );

  const toggle = useCallback(
    (name, value) => {
      if (value === null || value === undefined) {
        removeFilter(name);
      } else {
        addFilter(name, value);
      }
    },
    [addFilter, removeFilter]
  );

  const search = useCallback(
    (name, value) =>
      toggle(name, item => {
        return item?.toLowerCase?.()?.includes?.(value?.toLowerCase?.() ?? '');
      }),
    [toggle]
  );

  const setFiltered = useCallback(obj => {
    for (const key in obj) {
      if (obj[key] === null || obj[key] === undefined) {
        delete obj[key];
      }
    }
    setFilters({ ...obj });
  }, []);

  const clear = useCallback(() => setFilters({}), []);

  const filtered = useMemo(() => {
    return values.filter(item => {
      return Object.entries(filters)
        .filter(([key, value]) => value !== null && value !== undefined)
        .every(([key, value]) => {
          if (isFunction(value)) return value(item[key]);
          const itemValue = new Set([].concat(item[key]));
          const filterBy = [].concat(value);
          return filterBy.filter(x => itemValue.has(x)).length;
        });
    });
  }, [filters, values]);
  return {
    filtered,
    filters,
    removeFilter,
    addFilter,
    getOptions,
    setFiltered,
    toggle,
    search,
    clear,
  };
}
