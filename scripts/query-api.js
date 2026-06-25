/**
 * CanvasVideo Skill — 后端 API 查询脚本（v1.1）
 *
 * 封装所有后端 API 调用，LLM 直接调脚本，禁止自己敲 curl。
 *
 * 用法（CLI）：
 *   node query-api.js spec-batch <typeVariants.json路径>  # 批量查组件字段（需传入 type+variant）
 *   node query-api.js spec <type> <variant>                # 单查组件字段
 *   node query-api.js validate <project.json路径>          # 预校验 project.json
 *   node query-api.js health                               # 健康检查
 *
 * 程序化导出：
 *   - queryComponentSpecBatch(typeVariants)  → 批量查组件字段（传入 [{type, variant}, ...]）
 *   - queryComponentSpec(type, variant)       → 单查组件字段
 *   - validateProjectJson(projectOrPath)      → 预校验 project.json
 *   - healthCheck()                           → 健康检查
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const DEFAULT_SERVER_URL = 'https://dajiulanren.top/cv';

const REQUEST_TIMEOUT_MS = 30000;
const RETRY_MAX = 1;
const RETRY_BACKOFF_MS = 1000;

function resolveServerUrl(serverUrl) {
  return serverUrl && typeof serverUrl === 'string' ? serverUrl : DEFAULT_SERVER_URL;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function httpRequestOnce(options, body) {
  return new Promise((resolve, reject) => {
    const isHttps = options.protocol === 'https:';
    const lib = isHttps ? https : http;
    let settled = false;

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        if (settled) return;
        settled = true;
        resolve({ status: res.statusCode || 0, raw: data });
      });
    });

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      if (settled) return;
      settled = true;
      req.destroy();
      const err = new Error(`请求超时（${REQUEST_TIMEOUT_MS}ms 无响应）`);
      err.code = 'ETIMEDOUT';
      reject(err);
    });

    req.on('error', (e) => {
      if (settled) return;
      settled = true;
      reject(e);
    });

    if (body) req.write(body);
    req.end();
  });
}

async function httpRequestWithRetry(options, body) {
  let lastResult = null;
  for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
    const result = await httpRequestOnce(options, body);
    lastResult = result;
    if (result.status < 500) return result;
    if (attempt < RETRY_MAX) {
      await sleep(RETRY_BACKOFF_MS);
    }
  }
  return lastResult;
}

function buildRequestOptions(baseUrl, apiPath, body, extraHeaders, method = 'POST') {
  const base = new URL(resolveServerUrl(baseUrl));
  const isHttps = base.protocol === 'https:';
  // 路径必须以 /cv/api 开头。Nginx 的 location 块只把 /cv/ 转发到后端，裸 /api/ 走不通
  const fullPath = base.pathname.replace(/\/$/, '') + apiPath;
  return {
    protocol: base.protocol,
    hostname: base.hostname,
    port: base.port || (isHttps ? 443 : 80),
    path: fullPath,
    method,
    headers: Object.assign({
      'Content-Length': body ? body.length : 0,
    }, extraHeaders || {}),
  };
}

// ---------- 组件字段查询 ----------

/**
 * 批量查询组件字段规范
 * @param {Array<{type: string, variant: string}>} typeVariants - 组件类型+变种列表
 *   示例: [{ type: 'TitleComponent', variant: 'level1' }, { type: 'CardComponent', variant: 'image-text' }]
 * @param {string} [serverUrl]
 * @returns {Promise<Object>} - { success, data: { components: { Type.variant: {...} } } }
 */
async function queryComponentSpecBatch(typeVariants, serverUrl) {
  if (!Array.isArray(typeVariants) || typeVariants.length === 0) {
    throw new Error('typeVariants 必须是非空数组');
  }
  if (typeVariants.length > 20) {
    throw new Error('批量查询最多 20 个组件');
  }

  // 调用者必须传入 { type, variant }，不再使用默认 variant
  const components = typeVariants.map(tv => ({ type: tv.type, variant: tv.variant }));
  const body = Buffer.from(JSON.stringify({ components }));
  const options = buildRequestOptions(serverUrl, '/api/component/spec/batch', body, {
    'Content-Type': 'application/json',
  });

  const { status, raw } = await httpRequestWithRetry(options, body);

  let response = null;
  try { response = JSON.parse(raw); } catch { /* keep null */ }

  if (status >= 200 && status < 300 && response && response.success) {
    return response;
  }

  const msg = (response && response.error && response.error.message) || `查询失败 (HTTP ${status})`;
  throw new Error(msg);
}

/**
 * 单查组件字段规范
 * @param {string} type - 组件类型，如 'GraphicComponent'
 * @param {string} variant - 变体，如 'comparison'
 * @param {string} [serverUrl]
 * @returns {Promise<Object>} - { success, spec: {...} }
 */
async function queryComponentSpec(type, variant, serverUrl) {
  if (!type || !variant) {
    throw new Error('type 和 variant 必填');
  }

  const options = buildRequestOptions(
    serverUrl,
    `/api/component/spec/${encodeURIComponent(type)}/${encodeURIComponent(variant)}`,
    null,
    {},
    'GET'
  );

  const { status, raw } = await httpRequestWithRetry(options, null);

  let response = null;
  try { response = JSON.parse(raw); } catch { /* keep null */ }

  if (status >= 200 && status < 300 && response && response.success) {
    return response;
  }

  const msg = (response && response.error && response.error.message) || `查询失败 (HTTP ${status})`;
  throw new Error(msg);
}

// ---------- 项目预校验 ----------

/**
 * 调用云端 /api/projects/validate 预校验 project.json
 * @param {object|string} projectOrPath - project.json 对象或文件路径
 * @param {string} [serverUrl]
 * @returns {Promise<{ valid: boolean, errors: string[] }>}
 */
async function validateProjectJson(projectOrPath, serverUrl) {
  let project;
  if (typeof projectOrPath === 'string') {
    project = JSON.parse(fs.readFileSync(projectOrPath, 'utf-8'));
  } else {
    project = projectOrPath;
  }

  const body = Buffer.from(JSON.stringify(project));
  const options = buildRequestOptions(serverUrl, '/api/projects/validate', body, {
    'Content-Type': 'application/json',
  });

  const { status, raw } = await httpRequestWithRetry(options, body);

  let response = null;
  try { response = JSON.parse(raw); } catch { /* keep null */ }

  if (status >= 200 && status < 300 && response && response.success) {
    return {
      valid: !!response.valid,
      errors: Array.isArray(response.errors) ? response.errors : [],
    };
  }

  const msg = (response && response.error && response.error.message) || `预校验失败 (HTTP ${status})`;
  throw new Error(msg);
}

// ---------- 健康检查 ----------

/**
 * 健康检查
 * @param {string} [serverUrl]
 * @returns {Promise<{ status: string }>}
 */
async function healthCheck(serverUrl) {
  const options = buildRequestOptions(serverUrl, '/api/health', null, {}, 'GET');

  const { status, raw } = await httpRequestWithRetry(options, null);

  let response = null;
  try { response = JSON.parse(raw); } catch { /* keep null */ }

  if (status >= 200 && status < 300 && response && response.status === 'ok') {
    return response;
  }

  throw new Error(`健康检查失败 (HTTP ${status})`);
}

// ---------- CLI ----------

function printUsage() {
  console.log('用法：');
  console.log('  node query-api.js spec-batch <typeVariants.json路径>  批量查组件字段（需传入 type+variant）');
  console.log('  node query-api.js spec <type> <variant>              单查组件字段');
  console.log('  node query-api.js validate <project.json路径>       预校验 project.json');
  console.log('  node query-api.js health                              健康检查');
  console.log('');
  console.log('typeVariants.json 格式：[{ "type": "TitleComponent", "variant": "level1" }, ...]');
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const command = argv[0];

  if (!command) {
    printUsage();
    process.exit(1);
  }

  (async () => {
    try {
      switch (command) {
        case 'spec-batch': {
          const typeVariantsPath = argv[1];
          if (!typeVariantsPath) {
            console.error('❌ 缺少 typeVariants.json 路径');
            printUsage();
            process.exit(1);
          }
          const typeVariants = JSON.parse(fs.readFileSync(typeVariantsPath, 'utf-8'));
          const result = await queryComponentSpecBatch(typeVariants);
          console.log(JSON.stringify(result, null, 2));
          break;
        }
        case 'spec': {
          const type = argv[1];
          const variant = argv[2];
          if (!type || !variant) {
            console.error('❌ 缺少 type 或 variant');
            printUsage();
            process.exit(1);
          }
          const result = await queryComponentSpec(type, variant);
          console.log(JSON.stringify(result, null, 2));
          break;
        }
        case 'validate': {
          const projectPath = argv[1];
          if (!projectPath) {
            console.error('❌ 缺少 project.json 路径');
            printUsage();
            process.exit(1);
          }
          const result = await validateProjectJson(projectPath);
          console.log(JSON.stringify(result, null, 2));
          break;
        }
        case 'health': {
          const result = await healthCheck();
          console.log(JSON.stringify(result, null, 2));
          break;
        }
        default: {
          console.error(`❌ 未知命令: ${command}`);
          printUsage();
          process.exit(1);
        }
      }
    } catch (err) {
      console.error('❌ ' + err.message);
      process.exit(1);
    }
  })();
}

module.exports = {
  queryComponentSpecBatch,
  queryComponentSpec,
  validateProjectJson,
  healthCheck,
  DEFAULT_SERVER_URL,
};
