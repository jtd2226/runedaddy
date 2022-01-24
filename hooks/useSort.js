import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import { isEqual, isFunction } from 'lodash';
import useLocalStorage from 'hooks/useLocalStorage';

const sorts = {};
sorts.default = (a, b) => {
  if (a > b) return 1;
  if (a < b) return -1;
  return 0;
};
sorts[String.name] = sorts.default;
sorts[Date.name] = (a, b) => {
  return new Date(a).getTime() - new Date(b).getTime();
};
sorts[Number.name] = (a, b) => {
  return a - b;
};

sorts.Datetime = (a, b) => {
  return a?.isBefore(b) ? -1 : 1;
};

sorts.Time = (a, b) => {
  const aminutes = (a?.hour ?? 0) * 60 + (a.minutes ?? 0);
  const bminutes = (b?.hour ?? 0) * 60 + (b.minutes ?? 0);
  return aminutes - bminutes;
};

const SortBy = {};

/**
 * Sorting with map
 * The compareFunction can be invoked multiple times per element within the array.
 * Depending on the compareFunction's nature, this may yield a high overhead.
 * The more work a compareFunction does and the more elements there are to sort,
 * it may be more efficient to use map for sorting.
 * The idea is to traverse the array once to extract the actual values used for sorting into a temporary array,
 * sort the temporary array, and then traverse the temporary array to achieve the right order.
 *
 * source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
 */
SortBy.default = function (values, name, order, type) {
  const mapped = values.map((value, i) => {
    return { i, value: isFunction(name) ? name(value) : value[name] ?? value };
  });
  mapped.sort((a, b) => {
    const sort = sorts[type ?? a?.constructor?.name] ?? sorts.default;
    return sort(a.value, b.value) * (order ?? 1);
  });
  return mapped.map(v => values[v.i]);
};

SortBy.Datetime = function (values, name, order) {
  const mapped = values.map((value, i) => {
    const { date, time } = isFunction(name)
      ? name(value)
      : value[name] ?? value;
    return {
      i,
      value: dayjs(date)
        .hour(time?.hour ?? 0)
        .minute(time?.minutes ?? 0),
    };
  });
  mapped.sort((a, b) => sorts.Datetime(a.value, b.value) * (order ?? 1));
  return mapped.map(v => values[v.i]);
};

const Order = {
  DESC: -1,
  ASC: 1,
};

export default function useSort({
  name: defaultName,
  value,
  type: defaultType,
  order: defaultOrder,
  storage_key,
}) {
  const original = useRef();
  const [values, setValues] = useState([]);

  const [[name, type, order], setState] = useLocalStorage(storage_key, [
    defaultName,
    defaultType ?? null,
    Order[defaultOrder] ?? Order.DESC,
  ]);

  useEffect(() => {
    if (isEqual(value, original.current)) return;
    original.current = value;
    setValues(Array.isArray(value) ? value : Object.values(value ?? {}));
  }, [value, original]);

  const sorted = useMemo(() => {
    const sort = SortBy[type] ?? SortBy.default;
    const result = sort(values, name, order, type);
    return result;
  }, [values, name, type, order]);

  const toggle = useCallback(
    ({ name, type } = {}) =>
      setState(([oldname, oldtype, oldorder]) => {
        return [name, type, oldorder === Order.DESC ? Order.ASC : Order.DESC];
      }),
    []
  );

  const sort = useCallback(
    ({ name, type, order } = {}) => setState([name, type, Order[order]]),
    []
  );

  return {
    options: { name, type, order },
    sorted,
    sort,
    toggle,
  };
}
