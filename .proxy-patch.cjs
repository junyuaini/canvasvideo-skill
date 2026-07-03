// Patch https.request to honor HTTPS_PROXY env var via fetch.
// Loaded via --require. Idempotent.

const https = require('https');
const { URL } = require('url');
const EventEmitter = require('events');

if (https.request.__proxyPatched) return;

function getProxyForUrl(targetUrl) {
  try {
    const u = new URL(targetUrl);
    const isHttps = u.protocol === 'https:';
    const proxyEnv = isHttps
      ? (process.env.HTTPS_PROXY || process.env.https_proxy)
      : (process.env.HTTP_PROXY || process.env.http_proxy);
    if (!proxyEnv) return null;
    const noProxy = (process.env.NO_PROXY || process.env.no_proxy || '').split(',').map(s => s.trim()).filter(Boolean);
    if (noProxy.some(np => u.hostname === np || u.hostname.endsWith('.' + np))) return null;
    return proxyEnv;
  } catch { return null; }
}

function makeRequestViaFetch(originalRequest) {
  return function patchedRequest(input, options, cb) {
    let opts;
    if (typeof input === 'string' || input instanceof URL) {
      opts = Object.assign({}, options || {});
      if (typeof input === 'string') {
        const u = new URL(input);
        opts.protocol = u.protocol;
        opts.hostname = u.hostname;
        opts.port = u.port || (u.protocol === 'https:' ? 443 : 80);
        opts.path = u.pathname + u.search;
      } else {
        opts.protocol = input.protocol;
        opts.hostname = input.hostname;
        opts.port = input.port || (input.protocol === 'https:' ? 443 : 80);
        opts.path = input.pathname + input.search;
      }
    } else {
      opts = input || {};
    }
    if (typeof options === 'function' || (options && typeof options === 'object' && !(options.method || options.path))) {
      cb = options;
    }

    const fullUrl = `${opts.protocol}//${opts.hostname}${opts.port ? ':' + opts.port : ''}${opts.path}`;

    const proxy = getProxyForUrl(fullUrl);
    if (!proxy) {
      return originalRequest.apply(this, arguments);
    }

    const headers = Object.assign({}, opts.headers || {});
    const method = (opts.method || 'GET').toUpperCase();
    const fetchOptions = { method, headers };
    if (opts.body) fetchOptions.body = opts.body;

    const ac = new AbortController();
    fetchOptions.signal = ac.signal;

    const reqEmitter = new EventEmitter();
    reqEmitter.abortController = ac;
    let responded = false;
    let timeoutHandle = null;
    let timeoutMs = 0;

    reqEmitter.setTimeout = function(ms, onTimeout) {
      timeoutMs = ms;
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (ms > 0) {
        timeoutHandle = setTimeout(() => {
          if (responded) return;
          responded = true;
          try { ac.abort(); } catch {}
          const err = new Error(`请求超时（${ms}ms 无响应）`);
          err.code = 'ETIMEDOUT';
          reqEmitter.emit('error', err);
          if (typeof onTimeout === 'function') onTimeout.call(reqEmitter);
        }, ms);
      }
      return reqEmitter;
    };

    reqEmitter.destroy = function() {
      if (responded) return;
      responded = true;
      try { ac.abort(); } catch {}
      if (timeoutHandle) clearTimeout(timeoutHandle);
    };

    reqEmitter.write = function(chunk) {
      // Buffer additional body chunks (binary-safe)
      if (chunk) {
        if (!fetchOptions._bodyBuf) fetchOptions._bodyBuf = [];
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        fetchOptions._bodyBuf.push(buf);
      }
      return true;
    };

    reqEmitter.end = function() {
      if (fetchOptions._bodyBuf) {
        fetchOptions.body = Buffer.concat(fetchOptions._bodyBuf);
      }
      fetch(fullUrl, fetchOptions).then(async (res) => {
        if (responded) return;
        responded = true;
        if (timeoutHandle) clearTimeout(timeoutHandle);
        const resEmitter = new EventEmitter();
        resEmitter.statusCode = res.status;
        resEmitter.headers = res.headers;
        const reader = res.body && res.body.getReader();
        if (!reader) { resEmitter.emit('end'); if (cb) cb(resEmitter); return; }
        const pump = async () => {
          const { done, value } = await reader.read();
          if (done) { resEmitter.emit('end'); return; }
          resEmitter.emit('data', Buffer.from(value));
          return pump();
        };
        pump();
        if (cb) cb(resEmitter);
      }).catch(err => {
        if (responded) return;
        responded = true;
        if (timeoutHandle) clearTimeout(timeoutHandle);
        reqEmitter.emit('error', err);
      });
      return reqEmitter;
    };

    return reqEmitter;
  };
}

const origHttpsRequest = https.request.bind(https);
https.request = makeRequestViaFetch(origHttpsRequest);
https.request.__proxyPatched = true;
