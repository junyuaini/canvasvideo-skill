# 骨架设计（口播模式）

> 本文件为 AI 生成，生成后需执行 `node scripts/generate-skeleton.js` 自动生成 `skeleton.json`，严禁手动编写 JSON。

---

## 视频基本信息

| 字段 | 值 |
|------|-----|
| 时长 | 10 秒 |
| 模式 | 口播（配音 + 字幕 + 画面同步） |
| 主题 | white |
| 画布 | 780 × 585 px |
| 字幕样式 | 底部居中，白底黑字，32px，700 weight |

---

## 配音音频

用户未提供口播文案，AI 根据以下结构生成口播脚本。

**口播脚本：**
> P1：欢迎来到 AI 学习指南。今天我们从认知开始。
> P2：第一步，明确目标。第二步，持续实践。

---

## 项目配置（JSON）

```json
{
  "name": "口播模式示例",
  "description": "口播短视频样例：演示 data-subtitle / data-global / CSS animation 新约定",
  "mode": "dubbing",
  "theme": "white",
  "duration": 10,
  "viewport": { "width": 780, "height": 585 },
  "subtitle": {
    "color": "#1a1a1a",
    "fontSize": "32px",
    "position": "bottom-center",
    "weight": 700,
    "background": "rgba(255,255,255,0.75)",
    "textShadow": "0 1px 2px rgba(255,255,255,0.6)"
  }
}
```

---

## 区域列表

| Region | 名称 | 包含字幕 | 时长 | 说明 |
|--------|------|---------|------|------|
| P1 | 开头引入 | 1-3 | 5s | 欢迎语 + 认知铺垫 |
| P2 | 四步方法 | 4-6 | 5s | 两步方法论 |

---

## Region P1：开头引入

**字幕内容（配音文稿）：**
1. 00:00 - 00:02.5：「欢迎来到 AI 学习指南」
2. 00:02.5 - 00:05：「今天我们从认知开始」

**画面内容：**
- 主标题（字幕绑定）：data-subtitle="1" → 字幕 1 时段显示
- 副标题（字幕绑定）：data-subtitle="2" → 字幕 2 时段显示
- 装饰角标（全局）：data-global="true" → P1 全程显示（5s）
- 背景渐变（全局）：data-global="true" → P1 全程显示

---

## Region P2：四步方法

**字幕内容（配音文稿）：**
3. 00:05 - 00:07.5：「第一步，明确目标」
4. 00:07.5 - 00:10：「第二步，持续实践」

**画面内容：**
- 步骤 1 卡片（字幕绑定）：data-subtitle="3" → 字幕 3 时段显示
- 步骤 2 卡片（字幕绑定）：data-subtitle="4" → 字幕 4 时段显示
- 装饰角标（全局）：data-global="true" → P2 全程显示（5s）
- 背景渐变（全局）：data-global="true" → P2 全程显示

---

## 素材清单

| 素材 | 状态 | 说明 |
|------|------|------|
| 配音音频 | AI 自动生成（TTS） | 口播文稿见上方 |
| 背景图 | 无 | 纯 CSS 渐变实现 |
| 装饰元素 | AI 生成 | CSS + SVG 绘制 |

---

## 配色方案（white 主题）

| 用途 | 颜色 |
|------|------|
| 背景 | #f8fafc → #e0e7ff |
| 主标题文字 | #111827 |
| 副标题文字 | #374151 |
| 装饰强调 | #3B82F6 |
| 步骤卡片背景 | rgba(255,255,255,0.8) |

---

## 动画风格

- 入场：fade-in + translateY(20px→0)，0.5s ease-out forwards
- 卡片：pop-in，0.4s cubic-bezier(0.68,-0.55,0.265,1.55) forwards
- 全局装饰：fade-in，0.3s ease-out forwards

---

## 技术约束（R11 新约定）

- ✅ 元素出现/消失由 CSS animation + data-subtitle 驱动
- ✅ 装饰/背景元素使用 data-global="true"
- ✅ 有 class 必有 id，有 id 必有 data-subtitle 或 data-global
- ❌ 不手写 elementIds.start/end
- ❌ 不写 JS display:none/block