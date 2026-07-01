# Atelier 主题 · Altruistic · Authentic · Artistic · Elegant

**适合**: 培训工坊、战略闭门课、品牌私享会、Atelier HTML Lab 项目页。
**调性**: 白 + 深空蓝 `#0A1626` + 金 `#A88B52`，极简、克制、有灵感感。Cormorant Garamond + Outfit。

---

## 使用方法

1. 使用模板 `assets/template-atelier.html`（已内置本主题）
2. 若从 `template.html` 迁移，整体替换 `:root` 中主题色块为下方 CSS
3. 布局、组件、翻页逻辑与杂志风默认模板相同 — 见 `references/layouts.md` 与 `references/components.md`

---

## ✦ Atelier 深空金 (Deep Blue & Gold)

**适合**: 餐饮/商业实战培训、两天工作坊、600 页互动旅程、数据与案例闪频流。
**调性**: 深空蓝底 + 白字 + 金色强调，Altruistic / Authentic / Artistic / Elegant。

```css
--ink:#0A1626;
--ink-rgb:10,22,38;
--paper:#ffffff;
--paper-rgb:255,255,255;
--paper-tint:#f4f1ea;
--ink-tint:#132a45;
--gold:#A88B52;
--gold-rgb:168,139,82;
```

字体栈（已在 `template-atelier.html` 配置）:

- 标题衬线: Cormorant Garamond + Noto Serif SC
- 正文/UI: Outfit + Noto Sans SC
- 元数据: IBM Plex Mono

---

## 与其他主题的关系

| 维度 | 墨水经典 (默认) | Atelier |
| --- | --- | --- |
| 主色 | 墨黑 + 暖米 | 深空蓝 + 白 |
| 强调 | currentColor | 金色 `#A88B52` |
| 场景 | 通用杂志风 | Atelier 品牌 / 培训旅程 |
| 模板 | `template.html` | `template-atelier.html` |

---

## ❌ 不要做的事

- ❌ 不要混搭 Atelier 与 `themes.md` 其他预设的 ink/paper
- ❌ 不要在 deck 中途切换至瑞士风或墨水经典
- ❌ 用户自定义 hex 时，引导至本预设或 `themes.md` 五套预设

选定后在项目记录中备注 **Atelier 深空金**，便于 `html-lab` 与生成脚本保持一致。
