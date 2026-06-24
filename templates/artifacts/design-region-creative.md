# 区域设计（创作模式）：P{n} — {主题}

> 基于骨架中的单个区域，设计具体的组件布局、出场顺序、配色方案。

---

## 区域信息

| 字段 | 值 |
|------|-----|
| 区域序号 | P{n} |
| 区域类型 | Hook/Point/Data/Story/Step/Quote/CTA/Contrast/List/Timeline/Q&A/Scene/Emotion/Summary |
| 时间段 | {start}s - {end}s |
| 时长 | {duration}秒 |
| 情绪强度 | 低/中/高 |
| 区域位置 | 开头/前1/3/中段/后1/3/结尾 |
| 前区域情绪 | 低/中/高/无 |
| 核心信息 | 一句话概括 |

---

## 布局与锚点

- 布局模式：单点聚焦/左右分栏/上下分层/多列并排/对比式/时间轴/问答式/极简过渡/全屏沉浸/上下分屏/中心环绕/卡片堆叠/网格矩阵/对角线构图/留白聚焦/图文穿插/瀑布流/悬浮卡片
- 锚点类型：大字/图片/数据/图标
- 锚点内容：...
- 锚点位置：...
- 锚点大小：...
- 锚点颜色：...

---

## 组件清单（按出场顺序）

> 每个组件必须明确 `start`（出现时间）和 `end`（消失时间）。
> 时间基于区域绝对时间（如区域为 0s-4s，则 start/end 必须在 0-4 范围内）。
> **重要硬规则**：所有组件必须放在 AggregateComponent.children 中！

**AggregateComponent 格式（使用 manual 模式，推荐）**：
1. AggregateComponent（整体容器）
   - layoutMode: auto（自动布局）
   - position: 宽780高585 居中
   - start：__s end：__s
   内部：
   - 类型：__ 内容：__ 大小：__ 颜色：__ start：__s end：__s
   - 类型：__ 内容：__ 大小：__ 颜色：__ start：__s end：__s
   - ...

**AggregateComponent 格式（使用 manual 模式）**：
1. AggregateComponent（整体容器）
   - layoutMode: manual（手动布局）
   - position: 宽780高585 居中
   - start：__s end：__s
   内部：
   - 类型：__ 内容：__ 位置：__ 大小：__ 颜色：__ start：__s end：__s
   - 类型：__ 内容：__ 位置：__ 大小：__ 颜色：__ start：__s end：__s
   - ...

---

## 配色方案

- 背景：#...
- 主色：#...
- 辅色：#...
- 强调色：#...

---

## 图片关键词

- 氛围图/主体图/图标/数据图/全屏背景/悬浮背景：...

---

## 稳定期

- 稳定期时长：...秒

---

## 设计意图

...

---

## 示例：P2 — 心动、陪伴、永恒

**区域信息**

| 字段 | 值 |
|------|-----|
| 区域序号 | P2 |
| 区域类型 | Point |
| 时间段 | 5s - 10s |
| 时长 | 5秒 |
| 情绪强度 | 高 |
| 区域位置 | 前1/3 |
| 前区域情绪 | 中 |
| 核心信息 | 心动、陪伴、永恒三个维度诠释爱情 |

**布局与锚点**

- 布局模式：多列并排（3列）
- 锚点类型：多列卡片整体
- 锚点内容：三个概念卡片
- 锚点大小：宽90%，高60%
- 锚点颜色：卡片背景#252540

> **注意**：锚点位置由前端自动流式布局，无需手动配置。

**组件清单**

> 区域总时长 5s（5s-10s），所有组件 start/end 必须在此范围内。
> **重要硬规则**：所有组件必须放在 AggregateComponent.children 中！

1. AggregateComponent（整体容器）
   - layoutMode: auto（自动布局，flex居中排列）
   - position: 宽780高585 居中
   - start：5.0s end：9.5s
   内部：
   - TitleComponent（心动） 内容：心动，level:1 大小：32px 颜色：#ff6b6b start：5.3s end：9.5s
   - TextComponent（是看见你时加速的心跳） 内容：是看见你时加速的心跳 大小：16px 颜色：#a0a0b0 start：5.5s end：9.0s
   - TitleComponent（陪伴） 内容：陪伴，level:1 大小：32px 颜色：#00d4ff start：5.9s end：9.5s
   - TextComponent（是平淡日子里无声的守护） 内容：是平淡日子里无声的守护 大小：16px 颜色：#a0a0b0 start：6.1s end：9.0s
   - TitleComponent（永恒） 内容：永恒，level:1 大小：32px 颜色：#f9ca24 start：6.5s end：9.5s
   - TextComponent（是时光尽头依然的选择） 内容：是时光尽头依然的选择 大小：16px 颜色：#a0a0b0 start：6.7s end：9.0s

**配色方案**

- 背景：#1a1a2e
- 主色：#ffffff
- 辅色：#a0a0b0
- 强调色：#ff6b6b/#00d4ff/#f9ca24（各卡片一个，均从warm色系选取）

**图片关键词**

- 图标：heart、handshake、infinity

**稳定期**

- 稳定期时长：0.5秒

**设计意图**

三个维度逐层展开，每个卡片内部图标→标题→正文，卡片之间间隔0.4秒，形成波浪节奏。前区域是Hook（中情绪），当前区域提升到高情绪，制造第一次小高潮。
