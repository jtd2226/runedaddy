import { useState, useEffect } from 'react';

const Streams = {};

function Stream(path) {
  if (Streams[path]) return Streams[path];
  const src = new EventSource(path);
  const callbacks = {
    message: {},
    error: {},
  };
  function handler(e) {
    for (const key in callbacks) {
      const funcs = callbacks[key];
      for (const k in funcs) funcs[k](e);
    }
  }
  return {
    add: function (name, callback) {
      const index = Object.keys(callbacks[name]).length;
      callbacks[name][index] = callback;
      if (index === 0) {
        src.addEventListener(name, handler);
        Streams[path] = this;
      }
      return index;
    },
    remove: function (name, index) {
      delete callbacks[name][index];
      if (!Object.keys(callbacks[name]).length) {
        src.removeEventListener(name, handler);
        src.close();
        delete Streams[path];
      }
    },
  };
}

export default function useEventStream(path) {
  const [data, setData] = useState();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState();
  useEffect(() => {
    setError(false);
  }, [data]);
  useEffect(() => {
    setLoading(false);
  }, [data, error]);
  useEffect(() => {
    const stream = Stream(path);
    const mapData = e => setData(JSON.parse(e.data));
    const id = stream.add('message', mapData);
    const errorId = stream.add('error', setError);
    return () => {
      stream.remove('message', id);
      stream.remove('error', errorId);
    };
  }, [path]);
  return { data, loading, error };
}
