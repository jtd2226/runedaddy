import {
  Children,
  cloneElement,
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import PropTypes from 'prop-types';
import { isFunction, isEqual, uniqueId } from 'lodash';

export const IterationContext = createContext();
export const useIteration = () => useContext(IterationContext);

export default function Iteration({ values: items, children: Child }) {
  const original = useRef();
  const [[values, keys], set] = useState([[], []]);

  useEffect(() => {
    if (isEqual(items, original.current)) return;
    original.current = items;
    const values = Array.isArray(items) ? items : Object.values(items ?? {});
    const keys = values.map((_, index) => uniqueId(`${index}`));
    set([values, keys]);
  }, [items, original]);

  const childs = useMemo(
    () =>
      values.map((value, index) =>
        isFunction(Child) ? (
          <Child value={value} index={index} key={keys[index]} />
        ) : (
          Children.map(Child, child => {
            if (!child) return null;
            const props = {
              value,
              values,
              index,
              key: keys[index],
              ...child.props,
            };
            return cloneElement(child, props);
          })
        )
      ),
    [keys, values, Child]
  );

  return (
    <IterationContext.Provider value={{ values }}>
      {childs}
    </IterationContext.Provider>
  );
}

Iteration.propTypes = {
  values: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  children: PropTypes.any,
  handler: PropTypes.any,
};
