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

function resolveServerUrl(serverUrl) {
  return serverUrl && typeof serverUrl === 'string' ? serverUrl : DEFAULT_SERVER_URL;
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
 * 远程注册用户（带冲突重试一次）
 * @param {string} serverUrl
 * @param {string} userId
 * @param {string} userToken
 * @returns {Promise<{ ok: true } | never>}
 */
async function registerUser(serverUrl, userId, userToken) {
  const base = new URL(resolveServerUrl(serverUrl));
  const isHttps = base.protocol === 'https:';
  const apiPath = base.pathname.replace(/\/$/, '') + '/api/users/register';
  const body = Buffer.from(JSON.stringify({ userId, userToken }));

  return await new Promise((resolve, reject) => {
    const req = (isHttps ? https : http).request({
      hostname: base.hostname,
      port: base.port || (isHttps ? 443 : 80),
      path: apiPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': body.length,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        const status = res.statusCode || 0;
        let response = null;
        try { response = JSON.parse(data); } catch { /* keep null */ }
        if (status === 409 || (response && response.error && response.error.code === 'USER_ID_CONFLICT')) {
          const err = new Error('USER_ID_CONFLICT');
          err.code = 'USER_ID_CONFLICT';
          return reject(err);
        }
        if (status >= 200 && status < 300 && response && response.success) {
          return resolve({ ok: true });
        }
        const msg = (response && response.error && response.error.message) || `注册失败 (HTTP ${status})`;
        const err = new Error(msg);
        err.status = status;
        reject(err);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
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

  const base = new URL(resolveServerUrl(serverUrl));
  const isHttps = base.protocol === 'https:';
  const apiPath = base.pathname.replace(/\/$/, '') + '/api/projects/upload';

  return await new Promise((resolve, reject) => {
    const req = (isHttps ? https : http).request({
      hostname: base.hostname,
      port: base.port || (isHttps ? 443 : 80),
      path: apiPath,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        const status = res.statusCode || 0;
        let response = null;
        try { response = JSON.parse(data); } catch { /* keep null */ }
        if (status === 401) {
          const err = new Error('账号验证失败：本地 userToken 与服务器记录不匹配，请检查 .user.json');
          err.status = 401;
          return reject(err);
        }
        if (status === 413) {
          const err = new Error('视频包体积超过服务器限制，请压缩素材或减少时长');
          err.status = 413;
          return reject(err);
        }
        if (status >= 500) {
          const err = new Error(`服务器内部错误 (HTTP ${status})`);
          err.status = status;
          return reject(err);
        }
        if (response && response.success) {
          const previewUrl = response.previewUrl;
          // 如果服务端返回相对路径，拼绝对（保留 base.pathname 前缀）
          let absUrl = previewUrl;
          if (previewUrl && previewUrl.startsWith('/')) {
            const prefix = base.pathname.replace(/\/$/, '');
            // previewUrl 已包含 /view/...；若 base 是 /cv，则补成 /cv/view/...
            absUrl = `${base.origin}${prefix}${previewUrl}`;
          }
          return resolve({ previewToken: response.previewToken, previewUrl: absUrl });
        }
        const msg = (response && response.error && response.error.message) || `上传失败 (HTTP ${status})`;
        reject(new Error(msg));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * 高层封装：getOrCreateUser → upload
 * 上层只需调这一个接口即可，自动处理首次注册并返回 isFirstTime 让 LLM 决定输出文案。
 */
async function uploadWithUser(serverUrl, workdirRoot, skillProjectId, zipPath) {
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

  // CLI 默认把工作目录定位到 zipPath 所在目录的父级（即 canvasvideo-workdir/）
  const workdirRoot = path.resolve(path.dirname(zipPath), '..');

  uploadWithUser(serverUrl, workdirRoot, skillProjectId, zipPath)
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
      process.exit(0);
    })
    .catch(err => {
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
  // 上传
  upload,
  uploadWithUser,
};
