---
name: Video Downloader · 墨浅 Moqian
description: 同一张书桌的里间——继承 moqian.me 主页视觉世界的视频下载工具（Opus · Utility 01）
colors:
  desk-black: "#050505"
  panel-black: "#0A0A0A"
  raised-black: "#0D0D0D"
  ink: "#E5E5E5"
  muted-ink: "#8C8C8C"
  ghost-ink: "#404040"
  hairline: "#1A1A1A"
  hairline-lit: "#404040"
  err-red: "#B77777"
  moonlight: "rgba(255, 248, 240, 0.055)"
typography:
  display:
    fontFamily: "Cormorant Garamond, Times New Roman, serif"
    fontSize: "clamp(2.2rem, 5vw, 3.5rem)"
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  display-sm:
    fontFamily: "Cormorant Garamond, Times New Roman, serif"
    fontSize: "2rem"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Cormorant Garamond, Times New Roman, serif"
    fontSize: "1.45rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title-sm:
    fontFamily: "Noto Serif SC, Songti SC, STSong, serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Noto Serif SC, Songti SC, STSong, serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.9
  mono-sm:
    fontFamily: "Space Grotesk, Space Mono, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    letterSpacing: "0.05em"
  label:
    fontFamily: "Space Grotesk, Space Mono, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    letterSpacing: "0.14em"
  label-sm:
    fontFamily: "Space Grotesk, Space Mono, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 500
    letterSpacing: "0.2em"
  label-xs:
    fontFamily: "Space Grotesk, Space Mono, system-ui, sans-serif"
    fontSize: "0.5625rem"
    fontWeight: 400
    letterSpacing: "0.22em"
  ornament:
    fontFamily: "Space Grotesk, Space Mono, system-ui, sans-serif"
    fontSize: "clamp(0.42rem, 1vw, 0.62rem)"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.05em"
  signature:
    fontFamily: "Great Vibes, Cormorant Garamond, cursive"
    fontSize: "28px"
    fontWeight: 400
rounded:
  none: "0"
  thumb: "2px"
  full: "50%"
spacing:
  block-padding: "1.75rem 2rem"
  block-gap: "1.5rem"
  container: "860px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.desk-black}"
    rounded: "{rounded.none}"
    padding: "0.75rem 1.6rem"
  button-primary-hover:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.75rem 1.6rem"
  input-text:
    backgroundColor: "{colors.desk-black}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.75rem 1rem"
  block-card:
    backgroundColor: "{colors.panel-black}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "1.75rem 2rem"
---

# Design System: Video Downloader · 墨浅 Moqian

## Overview

**Creative North Star: "同一张书桌"（The Same Desk）**

这个工具不是一个独立的 app，而是 moqian.me 主页那张"长期展开的书桌"的里间——来访者从主页 Opus 卡（Sonata · Utility · 01）走进来，应当感觉走进了同一间书房，而不是打开了另一个产品。因此本系统不发明任何新视觉语言：主页的世界被整体继承，只按"工具页要高效克制"的原则做减法（用户钦定：网格+月光，不带粒子动画、乐谱剪影与自定义光标）。

密度与性格：编辑式、低亮度、零彩色。信息靠字重、字号、位置与留白分层，不靠颜色。交互反馈以"发丝线生长"（underline-grow）与明暗反转完成，唯一的动画时刻是流程块入场的一次 fade-up。

确认的反面参照：旧版绿色渐变消费级工具风（Inter 字体、#22c55e 绿色系、圆角卡片+发光阴影）已被整体废弃，任何元素不得回潮。

**Key Characteristics:**
- 48px 发丝网格背景 + 顶部一束月光 + 主页那轮 ASCII 月亮（载入时点亮），与主页同一片夜色
- 主页的十字光标与 difference 混合光晕（细指针设备启用，触屏保留原生光标）
- 全灰度类型系统：Cormorant Garamond 题字 / Noto Serif SC 正文 / Space Grotesk 数据与微标签 / Great Vibes 签名
- 方角、1px 发丝边、无阴影；纵深靠三阶黑（050→0A0→0D0） tonal layering
- 编号编辑列表（01/02/03 步骤、P1/P2 分P）承载工作流，顺序本身即信息
- 静音红 #B77777 只出现在出错的地方

## Colors

调色板性格：一间只开一盏灯的书房——黑为底，灰为言，月光为气氛，红只用于告警。

### Neutral
- **Desk Black**（#050505）：页面地。所有表面的底板，配 48px 网格线使用。
- **Panel Black**（#0A0A0A）：流程块（block）表面，与地之间以发丝线分隔而非阴影。
- **Raised Black**（#0D0D0D）：悬浮态表面（上传区 hover、code 标记底）。
- **Ink**（#E5E5E5）：主文字与主行动填充色；按钮反白时的"纸"。
- **Muted Ink**（#8C8C8C）：次要文字、占位符、说明文字；AA 对比度的下限担当。
- **Ghost Ink**（#404040）：**只用于边框与选区底色，不承载任何文字**——它在 Panel Black 上只有 1.9:1，任何用它写字的地方都是缺陷（本次构建已全部上调为 Muted Ink）。
- **Hairline**（#1A1A1A）：一切分隔——块边框、分割线、进度轨道。
- **Hairline Lit**（#404040）：可交互发丝线的常态（按钮边、虚线上传区），hover 时升至 Ink。
- **Moonlight**（rgba(255,248,240,0.055) 页面光场 / 0.15 月亮本体光晕 / 0.25 光标光晕）：三处同一束月光的浓度——视口顶部的广域光场、ASCII 月亮 -45% 外扩的近场光晕、以及跟随指针的 200px difference 混合光斑。
- **Moon Dim / Moon Lit**（#2A2A2A → #505050）：ASCII 月亮载入前后的两种亮度，与主页 hero 的 MOON_DIM / MOON_LIT 同值。

### Signal
- **Err Red**（#B77777）：唯一非灰色。访问码错误、下载失败、校验提示、危险操作 hover。它出现的地方必定有事发生。

### Named Rules
**The One Room Rule（同一间房）.** 禁止任何彩色强调色——没有"品牌绿""链接蓝"。灰度之内用明度分层，灰度之外只有 Err Red。新增表面时先试纯灰方案，想加颜色就是走错了房间。
**The Moonlight Rule（只有一束光）.** 全页光源只有月亮及其光——顶部广域光场（0.055）、月亮本体光晕（0.15）、指针光晕（0.25）三者是同一束光的三种浓度。除此之外禁止给卡片、按钮、徽标加任何 radial/box 光晕或发光描边。

## Typography

**Display Font:** Cormorant Garamond（fallback Times New Roman, serif）
**Body Font:** Noto Serif SC（fallback Songti SC, STSong, serif）
**Label/Mono Font:** Space Grotesk（fallback Space Mono, system-ui）
**Signature Font:** Great Vibes（仅品牌签名 "Moqian"）

**Character:** 题字有文学性的衬线风骨，正文是安静的中文宋体，数据与标签用几何无衬线收口——三种声音各司其职，互不串场。

### Hierarchy
九级阶梯，无例外——任何新字号必须落在其中一级，或先改这份文件。

- **Display**（Cormorant 500, clamp(2.2rem,5vw,3.5rem), lh 1.05, -0.03em）：页面题字（Video Downloader）。一页只许一个。
- **Display-sm**（Cormorant 500, 2rem, lh 1.1, -0.02em）：访问页卡片题字（访问验证）。
- **Title**（Cormorant 500, 1.45rem, lh 1.2, -0.01em）：流程块题字（输入链接 / 选择格式 / 下载进度 / Cookie）。
- **Title-sm**（宋体 600, 1rem, lh 1.5）：内容级小标题——视频标题、指南步骤标题。
- **Body**（宋体 400, 0.875rem, lh 1.9）：正文、说明、列表、输入框、提示与错误文字。中文内容永远走 Body。
- **Mono-sm**（Grotesk 400, 0.75rem, +0.05em）：返回链接、页脚链接、代码块、下拉框、访问页表单标签与注记——一切"要点、要读"的 Grotesk 文字。
- **Label**（Grotesk 500, 0.6875rem, +0.14em, uppercase）：按钮（含 btn-sm 与复制按钮）、状态徽章、状态条、进度数据、分P 计数——可交互或承载状态的标签下限。
- **Label-sm**（Grotesk 500, 0.625rem, +0.2em, uppercase）：**纯装饰**——块头步骤号、页面元信息、分P 序号、指南序号、上传格式注记。删掉它们页面依然可用。
- **Label-xs**（Grotesk 400, 0.5625rem, +0.22em, uppercase）：块头英文微标签（Paste URL / Progress / Notes 之类），装饰性最强的一级。
- **Ornament**（Grotesk 400, clamp(0.42rem,1vw,0.62rem), lh 1.2, +0.05em）：ASCII 月亮，唯一的装饰性字号。
- **Signature**（Great Vibes 400, 28px）：顶栏 "Moqian"，全页唯一花体。

### Named Rules
**The Three Voices Rule（三种声音）.** 标题问 Cormorant，正文问宋体，数据问 Grotesk。跨界即失格——尤其禁止把 Space Grotesk 当"技术感"装饰字体铺满标题。
**The Meta Line Rule.** 块级题字的上方信息（Opus — Utility · 01）用 Label 字 + 2rem 发丝线收束，与主页 SectionHeader 同构；题字自己承重，标签不许抢戏。

## Layout

单列书房桌面：860px 居中容器，内容自上而下依次展开——顶栏 → 题字区 → 状态条 → 步骤块 01/02/03 → 可选凭证块 → 指南 → 页脚。块间距一律 1.5rem，题字区下方留白（2.5rem）大于块间距，呼吸自上而下递减。

- **顶栏**：sticky，与容器同宽（860px），下缘发丝线，背景 rgba(5,5,5,0.88) + 8px 模糊——与主页 Header 滚动态同构。
- **背景层**：fixed 48px 发丝网格 + 顶部月光，z-index 0；内容 z-index 1。
- **响应式**（≤640px）：容器内边距 40px/18px，块内边距降至 1.4rem/1.25rem，输入行与格式选择行纵排，主按钮全宽，视频封面图全宽，页脚居中。
- **工作流显隐**：步骤 02/03 默认 `display:none`，由 JS 以 `.active` 展开并播一次 fade-up；不用手风琴、不用模态。

## Elevation & Depth

**无阴影系统。** 纵深完全靠三阶黑的明度阶梯（050 地 → 0A0 块 → 0D0 悬浮）与 1px 发丝线表达；唯一"光"是背景层的月光。这是与主页一致的 tonal layering，不是偷懒的省略。

### Named Rules
**The Flat Desk Rule（平桌面）.** 表面静止时一律平坦：无 box-shadow、无发光描边、无玻璃拟态。状态变化用边框明度（hairline → hairline-lit → ink）与填充反转表达，不许用阴影抬升。

## Shapes

方角世界：`border-radius: 0` 是默认值也是规则——按钮、输入框、下拉框、复选框、块全部方角，与发丝网格和编辑气质一致。仅两个例外是几何本身要求的圆：状态点（6px, 50%）与滚动条thumb（2px 圆角，主页同款）。复选框勾选标记以 1.5px 旋转对勾绘制，不用 emoji 或字体图标。

## Components

### Buttons
- **Shape:** 方角（0），1px 边框，Label 字（0.6875rem, +0.14em, uppercase）。
- **Primary:** Ink 填充 + Desk Black 文字（0.75rem 1.6rem）；hover 反转为透明底 + Ink 文字——明暗对调是本系统唯一的按钮强调。
- **Ghost:** 透明底 + Hairline Lit 边 + Ink 字；hover 边升至 Ink。
- **Quiet-danger:** 常态 Muted Ink 字 + Hairline 边（克制）；仅 hover 时转 Err Red——破坏性在确认意图时才显露。
- **States:** disabled 统一 opacity 0.35；loading 内嵌 11px 旋转弧（currentColor 双色）。

### Inputs / Fields
- **Style:** 方角，Desk Black 底，Hairline 边，Body 字 0.9rem，占位符 Muted Ink。
- **Focus:** 边升至 Hairline Lit；无发光、无外框扩散。键盘焦点另有全站统一的 1px dashed Muted Ink 环（offset 3px）。
- **Select:** 同输入框，Grotesk 字 0.78rem，右侧自绘 12px 发丝 chevron。

### Blocks（流程容器）
- **Corner Style:** 方角。
- **Background:** Panel Black；边框 Hairline 1px；无阴影（见 The Flat Desk Rule）。
- **Internal Padding:** 1.75rem 2rem（移动端 1.4rem 1.25rem）。
- **块头：** 步骤号（Label, Ghost Ink）+ Title 题字 + 弹性发丝线 + 英文微标签（Label, Ghost Ink）。

### Navigation（顶栏）
- 左：Great Vibes 签名 + 1px 竖发丝 + Body 字"视频下载"（Muted Ink）；右：Grotesk 0.75rem "moqian.me ↗"（Muted Ink）。
- hover：文字转 Ink，下缘发丝线以 scaleX(0→1) 向左生长（0.5s ease-out）——与主页导航同构。

### Status Strip（签名组件）
- 系统状态（FFmpeg / Cookie）不做卡片：一条上下发丝线夹出的横带，Grotesk 0.6875rem Muted Ink，6px 状态点。ok = Ink 实心，err = Err Red 实心，未决 = Ghost Ink 空心圈。

### Moon（签名组件）
- 主页 hero 的 FULL_MOON ASCII 图，以 Ornament 字号固定在视口右上（top 4.5rem / right clamp(1rem,7vw,7rem)），`pointer-events:none`、`z-index:0`，永远在内容层之下。
- 载入 0.4s 后点亮：颜色 Moon Dim → Moon Lit（2.4s ease-out），本体光晕由 0 淡入至满（2.8s ease-out）。**不搬主页的打字机**——工具页该直接给光，不该让人等。
- 移动端只调位置不改字号（clamp 自行收缩）。

### Custom Cursor（签名组件）
- 32px 十字准星 SVG（1px Ink 描边 + 中心 1.5px 圆点 + 4px 深色方孔）直接跟随指针；200px 光晕以 lerp 0.15 迟滞跟随，`mix-blend-mode: difference` + 20px 模糊。
- 悬停可交互元素（a / button / input / select / textarea / label / [role=button]）时准星 `scale(0.7)`（0.25s ease）。
- 仅在 `(hover: hover) and (pointer: fine)` 下启用并隐藏原生光标；触屏设备完全不注入，保留系统光标。指针移出文档时两者同时淡出。

### Progress
- 2px 轨道（Hairline）+ Ink 填充，宽度随 JS 更新；百分比 Ink、速度与 ETA Muted Ink，均 Grotesk。
- 状态徽章为发丝描边小胶囊：pending 灰、downloading 明、completed 亮、error 红——靠明度与那一抹红分级。

### Lists（分P / 指南 / 注意事项）
- 分P：编辑式编号列表，行间发丝线；14px 方角复选框，选中 Ink 填充 + 深色对勾。
- 指南步骤：双位数序号（Label, Ghost Ink）+ 正文，行间发丝线。
- 注意事项：无序列表标记一律用 em-dash（—），不用圆点。

## Do's and Don'ts

### Do:
- **Do** 一切新表面先取三阶黑之一（050/0A0/0D0）+ 发丝线，再谈其他。
- **Do** 用 Label 字 + 发丝线 + 英文小标构成块头，与主页 SectionHeader 保持同构。
- **Do** 占位符与次要文字用 Muted Ink（#8C8C8C，AA 达标）；Ghost Ink 只给不承担信息的装饰标签。
- **Do** hover 反馈走"边明度升级 / 填充反转 / 下划线生长"三选一，全站统一 0.25–0.5s ease(-out)。
- **Do** 主题浏览器默认面：选区（Ghost Ink 底）、光标色、滚动条（4px）、focus-visible（1px dashed）——与主页同一套。
- **Do** 保持 `prefers-reduced-motion` 全局兜底。
- **Do** 任何新字号先落在 Typography 的九级阶梯上；确实需要新阶梯时先改本文件，再改 CSS。
- **Do** 新增特效前问一句"主页有没有"——有就照搬其数值（月亮 #2A2A2A→#505050、光晕 0.15/0.25、lerp 0.15），没有就先别发明。

### Don't:
- **Don't** 引入任何彩色（绿、蓝、紫渐变一律禁止）；Err Red 之外无例外。
- **Don't** 使用圆角、阴影、发光、玻璃拟态或渐变文字。
- **Don't** 把 Space Grotesk 用于标题或装饰性"技术感"排版——它只服务标签、数据、代码。
- **Don't** 用 emoji 或 Unicode 字形充当图标；图标用 1.25–1.5px 描边的内联 SVG。
- **Don't** 给题字加与内容无关的 kicker/eyebrow；块头标签必须承载真实信息（步骤号、作品编号）。
- **Don't** 把旧版绿色渐变世界的任何 token（#22c55e 家族、Inter、圆角卡片）带回仓库。
