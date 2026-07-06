#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fileArg = process.argv[2];
const allowExperimental = process.argv.includes('--allow-experimental');

if (!fileArg) {
  console.error('Usage: node scripts/validate-tableai-deck.mjs <index.html> [--allow-experimental]');
  console.error('Style C fork of validate-swiss-deck.mjs. Checks both Swiss S01-S22 layout IDs and Table AI Style C brand constraints.');
  process.exit(2);
}

const file = resolve(process.cwd(), fileArg);
const html = readFileSync(file, 'utf8');
const htmlForSlides = html.replace(/<!--[\s\S]*?-->/g, '');
const errors = [];
const warnings = [];

/* ============================================================
   1) 复用 Style B 的 22 版式 ID 集合
   ============================================================ */
const allowedLayouts = new Set([
  'SWISS-COVER-ASCII',
  'SWISS-CLOSING-ASCII',
  /* Style C 也接受同义别名 (tableai 自定义命名) */
  'TABLEAI-COVER',
  'TABLEAI-CLOSING',
  'TABLEAI-COVER-ASCII',
  'TABLEAI-CLOSING-ASCII',
  ...Array.from({ length: 22 }, (_, i) => `S${String(i + 1).padStart(2, '0')}`),
]);

const slideRe = /<section\b[^>]*class="[^"]*\bslide\b[^"]*"[^>]*>[\s\S]*?<\/section>/g;
const slides = [...htmlForSlides.matchAll(slideRe)].map((m, idx) => ({
  idx: idx + 1,
  html: m[0],
  tag: m[0].match(/<section\b[^>]*>/)?.[0] ?? '',
}));

if (!slides.length) {
  errors.push('No <section class="slide"> pages found.');
}

slides.forEach((slide) => {
  const layout = slide.tag.match(/\bdata-layout="([^"]+)"/)?.[1];

  /* P0-1: lock 版式 */
  if (!layout) {
    errors.push(`Slide ${slide.idx}: missing data-layout. Table AI locked mode requires S01-S22 or TABLEAI-COVER/TABLEAI-CLOSING.`);
  } else if (!allowedLayouts.has(layout)) {
    errors.push(`Slide ${slide.idx}: data-layout="${layout}" is not registered.`);
  }

  /* P0-2: 实验版式禁止 */
  if (
    !allowExperimental &&
    /\bdata-layout="P2[34]\b|Swiss Image Split|Swiss Evidence Grid|swiss-img-split|swiss-img-grid/.test(slide.html)
  ) {
    errors.push(`Slide ${slide.idx}: uses experimental P23/P24 image structure. Use S22 or S15/S16 image-grid adaptations instead.`);
  }

  /* P0-3: 顶部大标题左对齐 (statement/split/specials 除外) */
  const isStatement =
    layout === 'S03' || layout === 'S09' || layout === 'S10' ||
    layout === 'SWISS-COVER-ASCII' || layout === 'SWISS-CLOSING-ASCII' ||
    layout === 'TABLEAI-COVER-ASCII' || layout === 'TABLEAI-CLOSING-ASCII' ||
    layout === 'TABLEAI-COVER' || layout === 'TABLEAI-CLOSING';

  const topChunk = slide.html.slice(0, 1800);
  if (!isStatement && /text-align\s*:\s*center/i.test(topChunk)) {
    errors.push(`Slide ${slide.idx}: top title area contains text-align:center. Table AI body titles should stay left aligned.`);
  }
  if (!isStatement && /align-self\s*:\s*center/i.test(topChunk) && /<h[12]\b/i.test(topChunk)) {
    errors.push(`Slide ${slide.idx}: top heading appears vertically/centrally aligned. Use the original left-top title skeleton.`);
  }
  if (!isStatement && /grid-template-columns\s*:\s*[0-9.]+fr\s+[0-9.]+fr/i.test(topChunk) && /<h[12]\b/i.test(topChunk)) {
    warnings.push(`Slide ${slide.idx}: heading inside a custom fr/fr grid. Confirm this is copied from the original Sxx skeleton, not a centered title hack.`);
  }

  /* P0-4: SVG 中不允许 <text> */
  if (/<svg\b[\s\S]*?<text\b/i.test(slide.html)) {
    errors.push(`Slide ${slide.idx}: SVG contains visible <text>. Put labels in HTML grid/captions, keep SVG for geometry only.`);
  }

  /* P0-5: 图片槽位绑定 */
  const localImages = [...slide.html.matchAll(/<img\b[^>]*src="images\//g)];
  localImages.forEach((_, imageIndex) => {
    const imgTag = slide.html.slice(_.index, slide.html.indexOf('>', _.index) + 1);
    if (!/\bdata-image-slot="/.test(imgTag)) {
      errors.push(`Slide ${slide.idx}: local image ${imageIndex + 1} missing data-image-slot. Bind every image to a layout slot such as s22-hero-21x9 or s15-grid-21x9.`);
    }
  });

  const frameImageRe = /<div\b(?=[^>]*\bclass="([^"]*\bframe-img\b[^"]*)")[^>]*>\s*<img\b(?=[^>]*\bdata-image-slot="([^"]+)")[^>]*>/g;
  const frameImages = [...slide.html.matchAll(frameImageRe)];
  frameImages.forEach((match) => {
    const className = match[1];
    const slot = match[2];
    const frameTag = match[0].match(/^<div\b[^>]*>/)?.[0] ?? '';
    if (/^s1[56]-(?:grid|brief)-21x9$/.test(slot)) {
      if (/\bfit-contain\b/.test(className)) {
        errors.push(`Slide ${slide.idx}: ${slot} uses fit-contain. Regenerated S15/S16 21:9 images should fill the slot with .frame-img.r-21x9.`);
      }
      if (!/\br-21x9\b/.test(className)) {
        errors.push(`Slide ${slide.idx}: ${slot} must use .frame-img.r-21x9 so the image slot controls the visible size.`);
      }
      if (/height\s*:\s*\d+(?:\.\d+)?vh/i.test(frameTag)) {
        errors.push(`Slide ${slide.idx}: ${slot} frame has a fixed vh height. Use aspect-ratio .r-21x9 instead of shrinking long images into a short slot.`);
      }
    }
  });

  if (layout === 'S22') {
    if (!/data-image-slot="s22-hero-21x9"/.test(slide.html)) {
      errors.push(`Slide ${slide.idx}: S22 must use data-image-slot="s22-hero-21x9".`);
    }
    if (/object-position\s*:\s*top center/i.test(slide.html)) {
      errors.push(`Slide ${slide.idx}: S22 photo uses object-position:top center, which commonly crops faces. Use center 35% or center center.`);
    }
  }

  /* ============================================================
     2) Style C 品牌专属检查
     ============================================================ */

  /* C-CHECK-1: 标题层级不得使用 font-weight:200 / 300 (Manrope 应保持 600/700) */
  const headingWeightMatch = slide.html.match(/font-weight\s*:\s*(200|300)/g);
  if (headingWeightMatch) {
    /* 排除注释 / 已知可接受的 hero dark 强调字 (style C 允许它用在 italic 强调) */
    const acceptedContext = /italic/i.test(slide.html.slice(0, 800));
    if (!acceptedContext && headingWeightMatch.length > 0) {
      warnings.push(`Slide ${slide.idx}: heading uses font-weight:200/300. Style C Manrope should be 600/700. Exception: italic emphasis on hero dark slides.`);
    }
  }

  /* C-CHECK-2: 不得给 card-fill / stack-block / sub-card 加 box-shadow (Table AI design.md 明确禁止) */
  if (/box-shadow\s*:\s*(?!none)/i.test(slide.html)) {
    /* 检查是否是 accent-block / .ink-block (允许) */
    if (!/class="[^"]*\b(accent-block|ink-block|kpi-hero-stat)\b/i.test(slide.html)) {
      errors.push(`Slide ${slide.idx}: contains box-shadow. Table AI design.md forbids shadows on cards. Use hairline borders instead.`);
    }
  }

  /* C-CHECK-3: 字体应为 Manrope (sans-tab) 不是 Inter vw 流式 */
  if (/font-family\s*:\s*var\(--sans\)\s*,\s*var\(--sans-zh\)/i.test(slide.html) &&
      /font-weight\s*:\s*(600|700)/.test(slide.html)) {
    /* h-xl/h-hero 等显式声明 font-family:var(--sans) + font-weight:600/700 是 Style C 错误:应改 var(--sans-tab) */
    /* 但 footer / .nb 等小位置允许 var(--sans),所以这里只警告 */
    if (/<h[12]\b/i.test(slide.html)) {
      warnings.push(`Slide ${slide.idx}: top heading uses var(--sans) Inter + font-weight 600/700. Should be var(--sans-tab) Manrope for Style C.`);
    }
  }

  /* C-CHECK-4: S22 主图比例必须 21:9 或落在 r-21x9 槽位 (Table AI 与 Style B 一致) */
  /* (继承自上方 frameImages 检查) */

  /* C-CHECK-5: 颜色 hex 不在白名单内 */
  /* 允许白名单: #0A1626 (ink), #A88B52 / #C9A86B (gold + bright), #FFFFFF (paper),
     #44474C / #75777D / #C5C6CD (text-secondary/helper/placeholder),
     #F5F3F4 / #DCD9DB / #E4E2E3 (grey 系列),
     rgba 灰色透明 (rgba(127,127,127,*)), rgba 白透明 */
  /* 此检查为警告而非错误,因为用户可能在配图 / SVG 中需要自定义色 */
  const hexes = [...slide.html.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toUpperCase());
  const allowedHexes = new Set([
    '#0A1626', '#A88B52', '#C9A86B', '#FFFFFF',
    '#44474C', '#75777D', '#C5C6CD',
    '#F5F3F4', '#DCD9DB', '#E4E2E3',
    '#000000', '#0A0A0A',
  ]);
  hexes.forEach((hex) => {
    if (!allowedHexes.has(hex)) {
      warnings.push(`Slide ${slide.idx}: non-brand hex "${hex}" found. Style C allowed palette: ink #0A1626, gold #A88B52/#C9A86B, paper #FFFFFF, grey ramp #F5F3F4/#DCD9DB/#E4E2E3, text #44474C/#75777D/#C5C6CD.`);
    }
  });
});

if (warnings.length) {
  console.warn('Warnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length) {
  console.error('Table AI deck validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Table AI deck validation passed: ${slides.length} slide(s).`);
