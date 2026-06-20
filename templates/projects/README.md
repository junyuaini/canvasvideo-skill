# 项目模板索引

> 本目录是 LLM 生成 project.json 时的"参考样板库"。
> **优先看示例（按场景选合适的），最后再 fallback 到通用模板**。

---

## 示例 1：通用视频.json（最简模板，36 行）

- **场景**：所有场景的兜底，仅展示最小可用的 project.json 字段
- **包含**：1 个 TitleComponent + 1 个 TextComponent，无主题美化
- **用途**：仅作字段格式参考，**不要直接当生成模板用**（太简单了，AI 生成的视频会很 low）

---

## 示例 2：示例-产品演示型-2分钟口播.json（120 秒，48K 行）

- **原始项目**：HTML2PPT 工具演示
- **场景**：**产品/工具演示**型视频
- **时长**：120.466 秒
- **模式**：口播模式（用户提供 audio.mp3 + subtitle.srt）
- **覆盖能力**：
  - ✅ 多区域分章节（按时间段切区域）
  - ✅ TitleComponent + ShockComponent + CardComponent + GraphicComponent 综合编排
  - ✅ AggregateComponent（custom 模式）的双栏/多列布局
  - ✅ 复杂的 customStyle 配色（蓝紫渐变 + 阴影）
  - ✅ 字幕与组件时间精确对齐
- **学习要点**：
  - 看 P1 区如何用 ShockComponent 做开场金句冲击
  - 看 P3 区如何用 AggregateComponent 排 4 列卡片
  - 看 GraphicComponent flow 图如何展示工作流

---

## 示例 3：示例-案例分享型-1分钟口播.json（53 秒，32K 行）

- **原始项目**：AI 4 小时开发会员管理系统案例
- **场景**：**案例/故事分享**型视频
- **时长**：52.966 秒
- **模式**：口播模式
- **覆盖能力**：
  - ✅ HOOK + PAIN + SOLVE + RESULT + CTA 五段式叙事
  - ✅ 大数据 ShockComponent（如"4小时"、"50%"）
  - ✅ Before/After 用 GraphicComponent comparison 对比
  - ✅ TextComponent paragraph / lead 嵌套样式
- **学习要点**：
  - 看如何在短视频里用最少组件讲清楚故事
  - 看 PAIN 区域的红色色调如何制造痛点共鸣
  - 看 RESULT 区如何用大数字 Shock 建立信任

---

## 选型决策

| 用户需求 | 用哪个示例当 base？ |
|---|---|
| 产品介绍、工具演示、API 介绍 | 示例 2 |
| 案例分享、故事讲述、Before/After | 示例 3 |
| 概念科普、知识讲解、教学 | 示例 2（节奏改为更慢） |
| 短宣传片（< 30 秒） | 示例 3（再砍掉 PAIN/RESULT） |
| 其他 / 不确定 | 示例 3（叙事结构更通用） |

---

## ⚠️ 使用注意

1. **示例只是参考样板，不要直接复制粘贴**：组件 ID（如 P1-001）、文案、时间轴必须根据用户实际需求重新生成
2. **assets 路径必须改**：示例里有 `./assets/20260610/audio.mp3` 这种硬编码，在新项目里要改成实际素材路径
3. **time/duration 必须改**：示例的时长是固定的，新项目按用户的视频长度调整
4. **theme 通常保留 white**：除非用户明确要求黑色/深色调
