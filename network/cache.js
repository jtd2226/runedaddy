import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { debounce } from './util';
import { uniqueId } from 'lodash';
import useEventStream from 'network/stream';

const logger = console;

class ClientError {
  constructor(data) {
    const error = data.error;
    this.data = data;
    this.message = error.message;
    this.code = error.code;
  }
}

const Cache = {
  get(url) {
    const { data, loading = false, error } = Cache[url]?.state ?? {};
    return { data, loading, error };
  },
  set(url, state = {}) {
    if (!Cache[url]) {
      logger.warn(`No data found in cache for url: ${url}`);
      return;
    }
    logger.log(`State changed for url: ${url}. Notifying listeners`);
    const previous = Cache.get(url);
    Cache[url].state = Object.assign(previous, state);
    // logger.log('New state:', Cache[url].state);
    const { listeners } = Cache[url];
    for (const id in listeners) {
      if (id === 'count') continue;
      listeners[id](Cache[url].state);
    }
  },
  mutate(url, updates) {
    const { data } = Cache.get(url);
    logger.log('mutating');
    Cache.set(url, { data: Object.assign(data, updates) });
  },
  update(url, body) {
    const state = Cache.get(url);
    state.data = Object.assign(state.data, body);
    Cache.set(state);
  },
  fetch(url, fetcher, ...args) {
    const { data, loading } = Cache.get(url);
    if (loading) return Promise.resolve(data);
    Cache.set(url, { loading: true });
    const state = {};
    return fetcher(url, ...args)
      .then(data => {
        state.data = data;
        return data;
      })
      .catch(error => {
        state.error = error;
      })
      .finally(() => {
        state.loading = false;
        Cache.set(url, state);
      });
  },
  new(url, fetcher) {
    return {
      add(callback, auto) {
        logger.log('Adding listener to cache for url: ', url);
        const { listeners } = (Cache[url] ??= { listeners: { count: 0 } });
        const id = uniqueId('cache-listener-');
        listeners[id] = callback;
        listeners.count++;
        logger.log('listener count', listeners.count);
        if (auto) Cache.fetch(url, fetcher);
        return id;
      },
      remove(id) {
        const { listeners } = Cache[url];
        delete listeners[id];
        listeners.count--;
        logger.log('listener count', listeners.count);
        clearTimeout(Cache[url].timer);
        delete Cache[url].timer;
        logger.log('Starting invalidation timer for url: ', url);
        // delete data from cache after 5 seconds
        // if no listeners are present
        Cache[url].timer = setTimeout(() => {
          const { listeners } = Cache[url];
          if (listeners.count === 0) {
            logger.log('Invalidation timer timed out for url: ', url);
            delete Cache[url];
          }
        }, 5000);
      },
    };
  },
};

export function useCache({ url, fetcher, wait = 0, auto = true }) {
  return (function usePromiseCallback(url) {
    const promise = useCallback(() => {
      const send = wait ? debounce(fetcher, wait) : fetcher;
      return send(url);
    }, [url]);
    return (function useAsync(promise) {
      const [state, setState] = useState(Cache.get(url));
      state.refresh = () => Cache.fetch(url, promise);
      state.mutate = data => Cache.mutate(url, data);
      useEffect(() => {
        const cache = Cache.new(url, promise);
        const id = cache.add(setState, auto);
        return () => {
          cache.remove(id);
        };
      }, [promise]);
      return state;
    })(promise);
  })(url);
}

function useSync({ url, fetcher, mutator, wait = 0 }) {
  return (function usePromiseCallback(url) {
    const promise = useMemo(
      () => (wait ? debounce(mutator, wait) : mutator),
      []
    );
    const [[data, loading, error], setData] = useState([
      Cache.get(url)?.data,
      false,
      null,
    ]);
    const isMounted = useRef();
    useEffect(() => {
      isMounted.current = true;
      return () => {
        isMounted.current = false;
      };
    }, []);
    const send = useCallback(
      (...args) => {
        setData(([data]) => [data, true, null]);
        return promise(...args)
          .then(data => {
            const query = Cache.fetch(url, fetcher, ...args);
            return data ?? query;
          })
          .then(data => {
            if (!isMounted.current) return data;
            setData([data, false, null]);
            return data;
          })
          .catch(err => {
            if (!isMounted.current) throw err;
            setData(([data]) => [data, false, err]);
            throw err;
          });
      },
      [url, promise]
    );
    return { send, data, loading, error };
  })(url);
}

export const Path = (...args) => args.filter(x => !!x).join('/');

const GlobalConfig = {};

const CacheRequest = props => {
  const config = Object.assign({}, props);
  const { path, query, debounced, type = 'json', ...options } = config;
  const Query = new URLSearchParams(query);
  const url = path + '?' + Query.toString();

  const update = (obj, to) => {
    if (!obj) return to;
    return { ...obj, ...to };
  };

  function send() {
    const intercepts = GlobalConfig.intercepts;
    const {
      path,
      query,
      debounced = fetch,
      type = 'json',
      ...options
    } = Object.assign(config, intercepts);
    if (!url) return Promise.resolve();
    return debounced(url, options)
      .then(r => r[type ?? 'json']?.() ?? r)
      .then(data => {
        if (data.error) {
          logger.error(data);
          if (data.error.code === 500) {
            location.reload();
          }
          throw new ClientError(data);
        } else return data;
      });
  }

  return {
    URL: config,
    url,
    send,
    next: function (callback) {
      return callback(CacheRequest(config));
    },
    Accept(mimetype) {
      config.headers = update(config.headers, {
        Accept: mimetype,
      });
      return CacheRequest(config);
    },
    get asBlob() {
      config.type = 'blob';
      return CacheRequest(config);
    },
    get asJson() {
      config.type = 'json';
      return CacheRequest(config);
    },
    get asText() {
      config.type = 'text';
      return CacheRequest(config);
    },
    get asResponse() {
      config.type = '';
      return CacheRequest(config);
    },
    path: (...args) =>
      CacheRequest(update(config, { path: Path(path, ...args) })),
    headers: headers => {
      config.headers = update(options.headers, headers);
      return CacheRequest(config);
    },
    query: obj => {
      config.query = update(query, obj);
      return CacheRequest(config);
    },
    get POST() {
      config.method = 'POST';
      return CacheRequest(config);
    },
    debounce: (wait = 700) => {
      config.debounce = debounce(fetch, wait);
      CacheRequest(config);
    },
    json: body => {
      config.headers = update(config.headers, {
        'Content-Type': 'application/json',
      });
      config.body = JSON.stringify(body);
      return CacheRequest(config);
    },
    raw: body => {
      config.body = body;
      return CacheRequest(config);
    },
    then: function (callback) {
      return send().then(callback);
    },
    cache: function () {
      return {
        refresh: () => Cache.fetch(url, send),
        mutate: data => Cache.mutate(url, data),
        set: data => Cache.set(url, data),
      };
    },
    intercept: function (obj) {
      GlobalConfig.intercepts = update(GlobalConfig.intercepts, obj);
    },
    updateCache: function () {},
    useCache: function ({ auto = true, wait }) {
      return useCache({
        url,
        fetcher: send,
        wait,
        auto,
      });
    },
    useMutation: function ({ url, wait }) {
      return useCache({
        url,
        fetcher: this.send,
        wait,
        auto: false,
      });
    },
    useSend: function (fetcher) {
      return useSync({
        url,
        fetcher: fetcher ?? (() => Promise.resolve()),
        mutator: body => {
          if (body) {
            config.body = JSON.stringify(body);
            config.method = 'POST';
            config.headers = update(config.headers, {
              'Content-Type': 'application/json',
            });
          }
          return send();
        },
      });
    },
    useSync: function ({ mutator, wait }) {
      return useSync({ url, fetcher: send, mutator, wait });
    },
    useStream: function () {
      return useEventStream(url);
    },
  };
};

const CachedRequest = CacheRequest({ path: '' });
export default CachedRequest;
