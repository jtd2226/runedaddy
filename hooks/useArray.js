import {
  createRef,
  useState,
  useCallback,
  useEffect,
  createContext,
  useContext,
  useRef,
  useMemo,
} from 'react';
import { isFunction, isEqual } from 'lodash';
import ForEach from 'iteration';

const ArrayContext = createContext({});
export const useArrayContext = () => useContext(ArrayContext);

const ItemContext = createContext({});
export const useArrayItemContext = () => useContext(ItemContext);

function ArrayItem({ children, ...rest }) {
  const context = useArrayContext();
  const update = useCallback(
    (data, i) => context.update(i ?? rest.index, data),
    [context, rest.index]
  );
  const remove = useCallback(
    i => context.remove(i ?? rest.index),
    [context, rest.index]
  );
  const array = useMemo(
    () => ({
      ...context,
      update,
      remove,
    }),
    [context, remove, update]
  );
  const props = useMemo(
    () => ({
      ...rest,
      array,
      ref: context.refs[rest.index],
    }),
    [array, rest, context.refs]
  );
  const child = useMemo(
    () => (isFunction(children) ? children(props) : children),
    [children, props]
  );

  return <ItemContext.Provider value={props}>{child}</ItemContext.Provider>;
}

const Iterator =
  arrayProps =>
  ({ children, ...rest }) => {
    return (
      <ArrayContext.Provider value={arrayProps}>
        <ForEach values={arrayProps.values} {...rest}>
          <ArrayItem>{children}</ArrayItem>
        </ForEach>
      </ArrayContext.Provider>
    );
  };

export default function useArray(items) {
  const original = useRef();
  const [values, set] = useState([]);

  useEffect(() => {
    if (isEqual(items, original.current)) return;
    original.current = items;
    set(Array.isArray(items) ? items : Object.values(items ?? {}));
  }, [items, original]);

  const [refs, setRefs] = useState([]);

  useEffect(() => {
    setRefs(old =>
      new Array(values.length).fill().map((_, i) => old[i] ?? createRef())
    );
  }, [values.length]);

  const add = useCallback((value = {}) => {
    set(old => {
      old.push(value);
      return [...old];
    });
  }, []);

  const remove = useCallback(
    index =>
      set(old => {
        return old.filter((_, i) => i !== index);
      }),
    []
  );

  const update = useCallback(
    (index, data) =>
      set(old => {
        old[index] = data;
        return [...old];
      }),
    []
  );

  const props = {
    refs,
    values,
    add,
    remove,
    update,
    set,
  };
  props.Iterator = Iterator(props);
  return props;
}
