/**
 * CanvasVideo Skill — 上传与用户体系（v1.4 无感化）
 *
 * 默认服务端：http://8.147.60.112/cv
 *   - 可在 CLI 通过位置参数显式覆盖
 *   - 程序化调用时给 serverUrl 传 null/undefined 即使用默认值
 *
 * 用法（CLI）：
 *   node upload-video.js [serverUrl] <skillProjectId> <zipPath>
 *   node upload-video.js cv-xxx ./demo.zip                       # 用默认服务端
 *   node upload-video.js http://localhost:3000 cv-xxx ./demo.zip # 自定义服务端
 *
 * 程序化导出：
 *   - generateUserId / generateUserToken      ：生成用户标识
 *   - readLocalUser                           ：只读本地 .user.json（用于"查询账号"指令）
 *   - getOrCreateUser                         ：检查本地，没有则远程注册 + 写本地，返回 { user, isFirstTime }
 *   - registerUser                            ：纯远程注册（带冲突重试）
 *   - ensureWorkdirRoot                       ：确保工作根目录 canvasvideo-workdir/ 存在
 *   - upload                                  ：上传 zip（必须传入 userId/userToken）
 *   - uploadWithUser                          ：高层封装：getOrCreateUser → upload，返回 { previewToken, previewUrl, isFirstTime, user }
 *   - DEFAULT_SERVER_URL                      ：默认服务端地址常量
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

const DEFAULT_SERVER_URL = 'http://8.147.60.112/cv';

// 网络层默认参数（单次请求超时 + 5xx 退避重试）
const REQUEST_TIMEOUT_MS = 30000;   // 30s
const RETRY_MAX = 1;                // 5xx 最多重试 1 次
const RETRY_BACKOFF_MS = 1000;      // 重试前等待 1s

function resolveServerUrl(serverUrl) {
  return serverUrl && typeof serverUrl === 'string' ? serverUrl : DEFAULT_SERVER_URL;
}

// ---------- HTTP 请求底层封装（超时 + 5xx 退避重试） ----------

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 底层 HTTP 请求：内置 30s 超时
 * @param {object} options - http.request options
 * @param {Buffer} body - 请求体
 * @returns {Promise<{status: number, raw: string}>}
 */
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

/**
 * 带 5xx 退避重试的 HTTP 请求
 *   - 网络错误 / 超时 → 不重试（避免重复上传大文件）
 *   - HTTP 5xx → 退避 RETRY_BACKOFF_MS 后重试 RETRY_MAX 次
 *   - HTTP 4xx / 2xx → 直接返回
 */
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

function buildRequestOptions(baseUrl, apiPath, body, extraHeaders) {
  const base = new URL(resolveServerUrl(baseUrl));
  const isHttps = base.protocol === 'https:';
  const fullPath = base.pathname.replace(/\/$/, '') + apiPath;
  return {
    protocol: base.protocol,
    hostname: base.hostname,
    port: base.port || (isHttps ? 443 : 80),
    path: fullPath,
    method: 'POST',
    headers: Object.assign({
      'Content-Length': body ? body.length : 0,
    }, extraHeaders || {}),
    _base: base,
  };
}

// ---------- 服务端预校验（云端权威） ----------

/**
 * 调用云端 /api/projects/validate 预校验 project.json。
 *
 * 这是"云端权威校验"——服务端镜像了前端 ComponentFactory 的 customStyle 必填表，
 * 能在不落盘的情况下提前捕获浏览器渲染期才会爆的硬错误（如 borderRadius 缺失）。
 *
 * @param {string} serverUrl
 * @param {object|string} projectOrPath - project.json 对象或文件路径
 * @returns {Promise<{ valid: boolean, errors: string[] }>}
 * @throws 网络错误 / 5xx 服务异常
 */
async function precheckProjectJson(serverUrl, projectOrPath) {
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
  const err = new Error(msg);
  err.status = status;
  err.code = 'PRECHECK_NETWORK_ERROR';
  throw err;
}

// ---------- 路径与工作目录 ----------

/**
 * 确保工作根目录存在（canvasvideo-workdir/）
 * @param {string} workdirRoot
 */
function ensureWorkdirRoot(workdirRoot) {
  fs.mkdirSync(workdirRoot, { recursive: true });
  return workdirRoot;
}

function userFilePath(workdirRoot) {
  return path.join(workdirRoot, '.user.json');
}

// ---------- 用户体系 ----------

const USER_ID_RE = /^cu-[0-9a-f]{12}$/;
const USER_TOKEN_RE = /^ut-[0-9a-f]{32}$/;

function generateUserId() {
  return 'cu-' + crypto.randomBytes(6).toString('hex');
}

function generateUserToken() {
  return 'ut-' + crypto.randomBytes(16).toString('hex');
}

function isValidUser(obj) {
  return obj
    && typeof obj === 'object'
    && typeof obj.userId === 'string'
    && typeof obj.userToken === 'string'
    && USER_ID_RE.test(obj.userId)
    && USER_TOKEN_RE.test(obj.userToken);
}

/**
 * 只读本地 .user.json（用于"查询账号"指令）
 * @returns { user: {userId, userToken} | null, error: string | null }
 */
function readLocalUser(workdirRoot) {
  const file = userFilePath(workdirRoot);
  if (!fs.existsSync(file)) {
    return { user: null, error: null };
  }
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf-8');
  } catch (e) {
    return { user: null, error: '读取本地账号文件失败: ' + e.message };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { user: null, error: '本地账号文件已损坏（非合法 JSON）' };
  }
  if (!isValidUser(parsed)) {
    return { user: null, error: '本地账号文件字段缺失或格式不正确' };
  }
  // 仅返回两个字段
  return { user: { userId: parsed.userId, userToken: parsed.userToken }, error: null };
}

/**
 * 写本地 .user.json（极简两字段）
 */
function writeLocalUser(workdirRoot, user) {
  ensureWorkdirRoot(workdirRoot);
  const data = JSON.stringify({ userId: user.userId, userToken: user.userToken }, null, 2);
  fs.writeFileSync(userFilePath(workdirRoot), data, 'utf-8');
}

/**
 * 远程注册用户（带 30s 超时 + 5xx 退避重试 + 409 冲突识别）
 * @param {string} serverUrl
 * @param {string} userId
 * @param {string} userToken
 * @returns {Promise<{ ok: true } | never>}
 */
async function registerUser(serverUrl, userId, userToken) {
  const body = Buffer.from(JSON.stringify({ userId, userToken }));
  const options = buildRequestOptions(serverUrl, '/api/users/register', body, {
    'Content-Type': 'application/json',
  });

  const { status, raw } = await httpRequestWithRetry(options, body);

  let response = null;
  try { response = JSON.parse(raw); } catch { /* keep null */ }

  if (status === 409 || (response && response.error && response.error.code === 'USER_ID_CONFLICT')) {
    const err = new Error('USER_ID_CONFLICT');
    err.code = 'USER_ID_CONFLICT';
    throw err;
  }
  if (status >= 200 && status < 300 && response && response.success) {
    return { ok: true };
  }
  const msg = (response && response.error && response.error.message) || `注册失败 (HTTP ${status})`;
  const err = new Error(msg);
  err.status = status;
  throw err;
}

/**
 * 检查本地，没有/损坏则远程注册并写本地，返回 { user, isFirstTime, warnings }
 *
 * 行为：
 *  1) 本地存在且合法 → isFirstTime=false 直接返回
 *  2) 本地不存在或损坏 → 生成新凭证 → register（409 冲突重生一次再 register）→ 写本地 → isFirstTime=true 返回
 *  3) 注册成功但本地写失败 → 抛带 user 信息的错误（上层必须把 user 暴露给用户手抄）
 *
 * @param {string} serverUrl
 * @param {string} workdirRoot - 工作根目录 canvasvideo-workdir/
 * @returns {Promise<{ user, isFirstTime, warnings: string[] }>}
 */
async function getOrCreateUser(serverUrl, workdirRoot) {
  ensureWorkdirRoot(workdirRoot);
  const warnings = [];

  // 1) 本地有效
  const local = readLocalUser(workdirRoot);
  if (local.user) {
    return { user: local.user, isFirstTime: false, warnings };
  }
  if (local.error) {
    warnings.push('检测到本地账号文件存在但无法使用：' + local.error + '；将重新创建账号');
  }

  // 2) 远程注册（最多重试 1 次冲突）
  let user = { userId: generateUserId(), userToken: generateUserToken() };
  try {
    await registerUser(serverUrl, user.userId, user.userToken);
  } catch (e) {
    if (e && e.code === 'USER_ID_CONFLICT') {
      // 重新生成一次
      user = { userId: generateUserId(), userToken: generateUserToken() };
      await registerUser(serverUrl, user.userId, user.userToken);
    } else {
      throw e;
    }
  }

  // 3) 写本地，写失败要把账号暴露出来
  try {
    writeLocalUser(workdirRoot, user);
  } catch (e) {
    const err = new Error(
      '账号已在服务器创建，但本地凭证保存失败：' + e.message +
      '\n请立即手动备份以下账号信息（丢失无法找回）：\n' +
      '  userId:    ' + user.userId + '\n' +
      '  userToken: ' + user.userToken
    );
    err.code = 'LOCAL_USER_WRITE_FAILED';
    err.user = user; // 让上层可以拿到
    throw err;
  }

  return { user, isFirstTime: true, warnings };
}

// ---------- 上传 ----------

/**
 * 上传视频项目包（必须带 userId/userToken）
 * @param {string} serverUrl
 * @param {string} skillProjectId
 * @param {string} zipPath
 * @param {string} userId
 * @param {string} userToken
 * @returns {Promise<{previewToken: string, previewUrl: string}>}
 */
async function upload(serverUrl, skillProjectId, zipPath, userId, userToken) {
  if (!userId || !userToken) {
    throw new Error('upload 必须传入 userId 和 userToken（v1.4 起强制）');
  }
  const boundary = `----FormBoundary${Date.now()}`;
  const zipBuffer = fs.readFileSync(zipPath);
  const zipName = path.basename(zipPath);

  const parts = [
    buildPart('skillProjectId', skillProjectId, boundary),
    buildPart('userId', userId, boundary),
    buildPart('userToken', userToken, boundary),
    buildFilePart('zip', zipName, zipBuffer, boundary),
    `--${boundary}--\r\n`,
  ];
  const body = Buffer.concat(parts.map(p => typeof p === 'string' ? Buffer.from(p) : p));

  const options = buildRequestOptions(serverUrl, '/api/projects/upload', body, {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  });

  const { status, raw } = await httpRequestWithRetry(options, body);

  let response = null;
  try { response = JSON.parse(raw); } catch { /* keep null */ }

  if (status === 401) {
    const err = new Error('账号验证失败：本地 userToken 与服务器记录不匹配，请检查 .user.json');
    err.status = 401;
    throw err;
  }
  if (status === 413) {
    const err = new Error('视频包体积超过服务器限制，请压缩素材或减少时长');
    err.status = 413;
    throw err;
  }
  if (status >= 500) {
    const err = new Error(`服务器内部错误 (HTTP ${status})，已重试 ${RETRY_MAX} 次仍失败`);
    err.status = status;
    throw err;
  }
  if (response && response.success) {
    const previewUrl = response.previewUrl;
    let absUrl = previewUrl;
    if (previewUrl && previewUrl.startsWith('/')) {
      const base = options._base;
      const prefix = base.pathname.replace(/\/$/, '');
      absUrl = `${base.origin}${prefix}${previewUrl}`;
    }
    return { previewToken: response.previewToken, previewUrl: absUrl };
  }
  const msg = (response && response.error && response.error.message) || `上传失败 (HTTP ${status})`;
  throw new Error(msg);
}

/**
 * 高层封装：precheck（可选）→ getOrCreateUser → upload
 * 上层只需调这一个接口即可，自动处理首次注册并返回 isFirstTime 让 LLM 决定输出文案。
 *
 * @param {string} serverUrl
 * @param {string} workdirRoot
 * @param {string} skillProjectId
 * @param {string} zipPath
 * @param {object} [options]
 * @param {string} [options.projectJsonPath] - project.json 路径；提供则上传前先调云端预校验，失败直接抛 PRECHECK_FAILED
 */
async function uploadWithUser(serverUrl, workdirRoot, skillProjectId, zipPath, options) {
  const opts = options || {};

  // Step 0：云端预校验（若提供了 projectJsonPath）
  if (opts.projectJsonPath) {
    const pre = await precheckProjectJson(serverUrl, opts.projectJsonPath);
    if (!pre.valid) {
      const err = new Error(
        '云端预校验未通过，已阻止上传。请逐条修复后重试：\n' +
        pre.errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')
      );
      err.code = 'PRECHECK_FAILED';
      err.errors = pre.errors;
      throw err;
    }
  }

  const { user, isFirstTime, warnings } = await getOrCreateUser(serverUrl, workdirRoot);
  const { previewToken, previewUrl } = await upload(serverUrl, skillProjectId, zipPath, user.userId, user.userToken);
  return { previewToken, previewUrl, isFirstTime, user, warnings };
}

// ---------- multipart 工具 ----------

function buildPart(name, value, boundary) {
  return `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;
}

function buildFilePart(name, filename, buffer, boundary) {
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${filename}"\r\nContent-Type: application/zip\r\n\r\n`;
  const footer = '\r\n';
  return Buffer.concat([Buffer.from(header), buffer, Buffer.from(footer)]);
}

// ---------- CLI ----------

/**
 * CLI 模式下推算 project.json 路径，找不到返回 null（跳过 precheck，不阻断老流程）
 * 推算优先级：
 *   1. workdirRoot/{skillProjectId}/project.json
 *   2. zip 同级 project.json
 */
function resolveProjectJsonForCli(workdirRoot, skillProjectId, zipPath) {
  const candidates = [
    path.join(workdirRoot, skillProjectId, 'project.json'),
    path.join(path.dirname(zipPath), 'project.json'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

if (require.main === module) {
  // 支持两种 CLI 形式：
  //   node upload-video.js <skillProjectId> <zipPath>                     ← 用默认 SERVER_URL
  //   node upload-video.js <serverUrl>      <skillProjectId> <zipPath>    ← 显式 SERVER_URL
  const argv = process.argv.slice(2);
  let serverUrl, skillProjectId, zipPath;
  if (argv.length === 2) {
    serverUrl = DEFAULT_SERVER_URL;
    skillProjectId = argv[0];
    zipPath = argv[1];
  } else if (argv.length === 3) {
    serverUrl = argv[0];
    skillProjectId = argv[1];
    zipPath = argv[2];
  } else {
    console.error('用法: node upload-video.js [serverUrl] <skillProjectId> <zipPath>');
    console.error('  默认 serverUrl: ' + DEFAULT_SERVER_URL);
    process.exit(1);
  }

  // 工作目录推算（与 api-rules.md §4 保持一致：CWD 优先，兜底回 zipPath 父级）
  //   1) Agent 当前工作目录（CWD）下的 canvasvideo-workdir/
  //   2) 如果 CWD 下不存在 canvasvideo-workdir/，但 zipPath 父级是 canvasvideo-workdir/，回退到该路径
  let workdirRoot = path.resolve(process.cwd(), 'canvasvideo-workdir');
  if (!fs.existsSync(workdirRoot)) {
    const fallback = path.resolve(path.dirname(zipPath), '..');
    if (path.basename(fallback) === 'canvasvideo-workdir' && fs.existsSync(fallback)) {
      workdirRoot = fallback;
    }
    // 否则保持 CWD 下的路径——后续 ensureWorkdirRoot 会自动创建
  }

  uploadWithUser(serverUrl, workdirRoot, skillProjectId, zipPath, {
    projectJsonPath: resolveProjectJsonForCli(workdirRoot, skillProjectId, zipPath),
  })
    .then(res => {
      if (res.warnings.length) {
        res.warnings.forEach(w => console.warn('⚠️  ' + w));
      }
      if (res.isFirstTime) {
        console.log('\n⚠️ 重要：本次为你创建了 CanvasVideo 账号');
        console.log('  userId:    ' + res.user.userId);
        console.log('  userToken: ' + res.user.userToken);
        console.log('📁 凭证已保存到本地：' + path.join(workdirRoot, '.user.json'));
        console.log('🔒 请妥善保管，丢失无法找回\n');
      }
      console.log('✅ 视频已上线：' + res.previewUrl);
      console.log('📤 这条链接可以直接分享给同事、朋友、客户或社群——');
      console.log('   点开即看，无需登录、无需安装任何 App，桌面/手机都能播放。');
      console.log('');
      console.log('🎮 快捷键：空格=播放/暂停 · ←→=快进快退 · 双击空格=全景 · ↑↓=显示/隐藏组件 ID');
      console.log('🖼️ 替换占位图：把图片放到 ./assets/images/，然后让 AI "把 P3-004 替换成 my-photo.png"');
      console.log('🛠️ 调整组件：先按 ↑ 显示 ID，再让 AI "P4-001 再大一点 / P3-003 改成红色"');
      process.exit(0);
    })
    .catch(err => {
      if (err.code === 'PRECHECK_FAILED') {
        console.error('❌ 云端预校验未通过，未上传。请按下面的错误清单逐条修复 project.json 后重试：');
        err.errors.forEach((e, i) => console.error(`  ${i + 1}. ${e}`));
        process.exit(2);
      }
      console.error('❌ ' + err.message);
      if (err.code === 'LOCAL_USER_WRITE_FAILED' && err.user) {
        // 已经在 message 中暴露过，无需重复
      }
      process.exit(1);
    });
}

module.exports = {
  // 配置
  DEFAULT_SERVER_URL,
  // 用户体系
  generateUserId,
  generateUserToken,
  readLocalUser,
  getOrCreateUser,
  registerUser,
  ensureWorkdirRoot,
  // 预校验
  precheckProjectJson,
  // 上传
  upload,
  uploadWithUser,
};
