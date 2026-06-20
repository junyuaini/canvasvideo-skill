# BGM 库速查表（CanvasVideo Skill）

> 本目录用于存放**内置背景音乐文件**（mp3 格式，免版权），供 LLM 在创作模式下默认配 BGM 使用。
> 详见 [`../../SKILL.md`](../../SKILL.md) §2.4.4 创作模式默认配 BGM 规则。

---

## 📋 6 首标准 BGM 清单

| 风格代号 | 文件名 | 适用场景 | 推荐时长 | 特征 |
|---|---|---|---|---|
| `tech` | `tech-pulse.mp3` | AI / 编程 / 数据可视化 / 科技产品 | 30-60s 循环 | 节奏感强、电子合成、未来感 |
| `warm` | `warm-cafe.mp3` | 品牌故事 / 小确幸 / 餐饮 / 生活方式 | 45-75s 循环 | 钢琴 / 吉他、温馨柔和 |
| `uplifting` | `uplifting.mp3` | 创业 / 成长 / 产品发布 / 励志 | 40-60s 循环 | 上扬旋律、积极、激励 |
| `corporate` | `corporate.mp3` | 商务 / 演示 / B2B / 专业服务 | 60-90s 循环 | 平稳、专业、不抢戏 |
| `light-pop` | `light-pop.mp3` | 教程 / 小游戏 / Vlog / 轻松内容 | 35-60s 循环 | 流行、明快、活泼 |
| `cinematic` | `cinematic.mp3` | 大场面 / 旅行 / 纪录片 / 史诗感 | 50-90s 循环 | 弦乐、宏大、有张力 |

---

## 🎯 风格匹配决策树（LLM 必读）

LLM 根据**视频主题 + 风格关键词**自动选 BGM：

```
视频主题或关键词 → 选用 BGM
─────────────────────────
AI / 编程 / 算法 / 大模型 / 数据 / 区块链 / IoT
  → tech-pulse.mp3

咖啡 / 餐饮 / 烘焙 / 民宿 / 母婴 / 家居 / 生活方式
  → warm-cafe.mp3

创业 / 团队 / 成长 / 产品发布 / 励志 / 教育 / 培训
  → uplifting.mp3

企业 / B2B / 演示 / 财务 / 法律 / 顾问 / 培训机构
  → corporate.mp3

教程 / 知识科普 / 小游戏 / Vlog / 轻量短视频 / 校园
  → light-pop.mp3

旅行 / 纪录片 / 大场面 / 跨境出海 / 体育 / 时尚发布
  → cinematic.mp3
```

**风格 / 主题不明确时**：默认选 `corporate.mp3`（最不易出错）。

---

## 📥 BGM 文件说明

> ✅ **当前仓库已内置 6 首合成 BGM**（`*.wav` 格式，约 5MB/首）。
> 由 `scripts/generate-bgm.js` 自动生成，无版权风险，可直接商用。
> 音质为简单合成器音色（正弦波/三角波/锯齿波 + 和弦进行），作为系统默认占位。

### 升级方案（可选）

如需更高品质的真实音乐，可从以下免版权来源下载并按上表命名（`.mp3` 优先）：

| 来源 | 网址 | 许可 | 说明 |
|---|---|---|---|
| **Pixabay Music** | https://pixabay.com/music/ | Pixabay License（免费商用、无需署名） | 推荐，搜索关键词如 `corporate`、`uplifting`、`cinematic` |
| **YouTube Audio Library** | https://studio.youtube.com/channel/UC.../music | Free Use（部分需署名） | 非常丰富 |
| **Free Music Archive** | https://freemusicarchive.org/ | CC0 / CC-BY 等 | 注意各曲目许可证 |
| **Bensound** | https://www.bensound.com/ | 部分免费、部分需 license | 质量高 |

**替换工作流**：
1. 在以上来源搜索对应风格，选 1 首 30-60 秒的曲目
2. 压缩到 96-128 kbps，控制每首 ≤ 1MB
3. 重命名为本表中的标准文件名（`.mp3` 或 `.wav`）
4. 覆盖 `canvasvideo-skill/templates/bgm/` 下的同名文件
5. `ensureBgm()` 会自动识别 `.mp3` 和 `.wav` 两种格式

#### 方案 B：用户自带 BGM

用户也可以提供自己的 mp3 文件：
1. 把 mp3 放到工作目录的 `assets/` 下
2. 告诉 AI："用我桌面的 my-bgm.mp3 当背景音乐"
3. AI 会写：
   ```json
   "audio": {
     "path": "./assets/my-bgm.mp3",
     "loop": true,
     "fadeIn": 1,
     "fadeOut": 2
   }
   ```

#### 方案 C：暂无 BGM 时优雅降级

如果 `templates/bgm/{xxx}.mp3` 不存在：
- LLM **不要**强行写 audio 字段（前端会破图般报 404）
- 视频静音播出（合法）
- 在上传成功提示中告诉用户："本次没有 BGM，把 mp3 放到 assets/ 下重新打包可以加上"

---

## 🎚️ 标准 BGM 用法（必照抄）

LLM 在 project.json 中写 BGM 必须按以下格式：

```jsonc
{
  "audio": {
    "path": "./assets/placeholders/bgm/uplifting.mp3",  // 注意：路径前缀是工作目录里的 assets
    "loop": true,         // 必设 true
    "fadeIn": 1,          // 推荐 1 秒淡入
    "fadeOut": 2          // 推荐 2 秒淡出
  }
}
```

**重要**：
- LLM 写 `./assets/placeholders/bgm/{文件名}.mp3` 路径
- Skill 的 `scripts/scaffold.js` 会自动把 `templates/bgm/` 下的对应文件**复制**到工作目录的 `assets/placeholders/bgm/` 下
- 这样打包 zip 时音频也会进 zip，前端能加载到

---

## ⚠️ 严禁

- ❌ 在 BGM 用法的 audio 字段下**配 subtitles**（字幕会跟着 BGM 进度走，毫无意义）
- ❌ 用 BGM 文件名当作"配音音频"使用（即配 SRT 字幕）
- ❌ BGM 选源不匹配主题（比如做"纪录片视频"配 `light-pop.mp3` 显得轻浮）
- ❌ 写一个不存在的 BGM 路径（用户没下载就先静音，详见方案 C）
- ❌ 不设 loop（BGM 不循环就只播 30 秒，剩下的视频是静音）
- ❌ 修改 BGM 文件 → 改名后必须更新本表 + 测试
