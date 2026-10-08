import type { ExperienceRole, Profile } from '../content/profile';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PAPER = '#ece5d8';
const INK = '#121e28';
const INK_SOFT = '#46525c';
const VERMILION = '#d9684b';
const MONO = 'ui-monospace,Menlo,monospace';

export type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4';

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function externalAttrs(href: string): string {
  if (href.startsWith('mailto:') || href.startsWith('/')) return '';
  return ' target="_blank" rel="noopener noreferrer"';
}

export function monthIndex(value: string): number {
  const [year, month] = value.split('-').map(Number);
  return year * 12 + month - 1;
}

export function monthLabel(index: number): string {
  return `${MONTHS[index % 12]} ${Math.floor(index / 12)}`;
}

export function programmeNumber(profile: Profile): string {
  return `${profile.dateModified.slice(2, 4)}/${profile.dateModified.slice(5, 7)}`;
}

export function firstReelLabel(profile: Profile): string {
  const starts = profile.experience.map((role) => monthIndex(role.start));
  return starts.length > 0 ? monthLabel(Math.min(...starts)) : '';
}

function spanLabel(role: ExperienceRole): string {
  const end = role.end ? monthLabel(monthIndex(role.end)) : 'Present';
  return `${monthLabel(monthIndex(role.start))} – ${end}`;
}

function reelNumber(index: number): string {
  return String(index + 1).padStart(2, '0');
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function spineMarkup(profile: Profile): string {
  return `<div class="about-spine" aria-hidden="true"><span>Programme № ${programmeNumber(profile)}</span><span lang="zh-CN">北京 · 二环</span></div>`;
}

export function nameMarkup(profile: Profile, tag: HeadingTag, id: string): string {
  return `<${tag} class="about-name" id="${id}">${escapeHtml(profile.name)}</${tag}>`;
}

export function identityMarkup(profile: Profile, eyebrow: string, summaryId: string): string {
  return [
    `<p class="about-eyebrow">${escapeHtml(eyebrow)}</p>`,
    `<p class="about-role">${escapeHtml(profile.role)}</p>`,
    `<p class="about-status">${escapeHtml(profile.status)}</p>`,
    `<p class="about-summary" id="${summaryId}">${escapeHtml(profile.summary)}</p>`,
  ].join('');
}

export function stampMarkup(profile: Profile): string {
  const index = profile.experience.findIndex((role) => role.end === null);
  const role = profile.experience[index];
  if (!role) return '';
  return `<svg class="about-stamp" viewBox="0 0 132 132" aria-hidden="true" focusable="false"><defs><path id="about-arc-top" d="M18 66a48 48 0 0 1 96 0"/><path id="about-arc-bottom" d="M12 66a54 54 0 0 0 108 0"/><filter id="about-ink"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="4"/><feDisplacementMap in="SourceGraphic" scale="1.8"/></filter></defs><g filter="url(#about-ink)" fill="currentColor" font-family="${MONO}" text-anchor="middle"><circle cx="66" cy="66" r="62" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="66" cy="66" r="36" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="9.5" cy="66" r="1.7"/><circle cx="122.5" cy="66" r="1.7"/><text font-size="10.5" letter-spacing="2.2"><textPath href="#about-arc-top" startOffset="50%">NOW SHOWING</textPath></text><text font-size="10.5" letter-spacing="2.2"><textPath href="#about-arc-bottom" startOffset="50%">${escapeHtml(role.org.toUpperCase())}</textPath></text><text x="66" y="58" font-size="8.5" letter-spacing="2.4">REEL</text><text x="66" y="84" font-family="Iowan Old Style,Palatino,Georgia,serif" font-weight="900" font-size="27">${reelNumber(index)}</text></g></svg>`;
}

export function creditsMarkup(profile: Profile): string {
  const [now, ...alsoRunning] = profile.experience.filter((role) => role.end === null);
  const [previously, ...earlier] = profile.experience
    .filter((role) => role.end !== null)
    .sort((left, right) => monthIndex(right.end ?? '') - monthIndex(left.end ?? ''));
  const rows: Array<[string, ExperienceRole[]]> = [
    ['Now showing', now ? [now] : []],
    ['Also running', alsoRunning],
    ['Previously', previously ? [previously] : []],
    ['Earlier reels', earlier],
  ];
  const credits = rows
    .filter(([, roles]) => roles.length > 0)
    .map(
      ([term, roles]) =>
        `<div><dt>${term}</dt><dd>${escapeHtml(roles.map((role) => role.org).join(' · '))}</dd></div>`,
    )
    .join('');
  return `<dl class="about-credits">${credits}</dl>`;
}

export function focusMarkup(profile: Profile): string {
  return `<p class="about-focus"><span class="about-eyebrow">Featuring</span> ${escapeHtml(profile.focus)}</p>`;
}

export function stripMarkup(profile: Profile, width: number, variant: 'wide' | 'narrow'): string {
  const compact = width < 700;
  const id = `about-strip-${variant}`;
  const lanes = [...profile.experience].sort(
    (left, right) => monthIndex(left.start) - monthIndex(right.start),
  );
  const first = lanes[0];
  if (!first) return '';
  const origin = monthIndex(first.start);
  const now = monthIndex(profile.dateModified.slice(0, 7));
  const span = Math.max(1, now - origin);
  const lane = compact ? 13 : 20;
  const gap = compact ? 4 : 6;
  const band = compact ? 12 : 16;
  const inner = compact ? 7 : 10;
  const padX = compact ? 12 : 18;
  const font = compact ? 8 : 9.5;
  const tracking = compact ? 1.1 : 1.6;
  const hole = compact ? 7 : 9;
  const holeHeight = compact ? 4.5 : 6;
  const pitch = compact ? 12 : 16;
  const stripHeight = band * 2 + inner * 2 + lanes.length * lane + (lanes.length - 1) * gap;
  const height = stripHeight + (compact ? 20 : 26);
  const scale = (width - padX * 2) / span;
  const x = (month: number) => round(padX + (month - origin) * scale);
  const top = band + inner;
  const bottom = stripHeight - band - inner;
  const holes = Math.floor((width - hole - 6) / pitch);
  const holeBand = 6 + holes * pitch + hole;
  const nowX = x(now);

  const bars = lanes.map((role, index) => {
    const y = top + index * (lane + gap);
    const x1 = x(monthIndex(role.start));
    const x2 = role.end ? x(monthIndex(role.end)) : nowX;
    const fits = x2 - x1 >= role.org.length * (font * 0.62 + tracking) + 12;
    const label = `<text x="${round(fits ? x1 + 6 : x1 - 7)}" y="${round(y + lane / 2 + font * 0.36)}" fill="${fits ? INK : PAPER}"${fits ? '' : ' text-anchor="end"'}>${escapeHtml(role.org.toUpperCase())}</text>`;
    return `<rect x="${x1}" y="${y}" width="${round(Math.max(2, x2 - x1))}" height="${lane}" fill="${PAPER}"/>${label}`;
  });

  const ticks: Array<{ month: number; text: string; anchor: string }> = [
    { month: origin, text: monthLabel(origin).toUpperCase(), anchor: 'start' },
  ];
  for (let month = origin + 1; month < now; month += 1) {
    if (month % 12 === 0) ticks.push({ month, text: String(month / 12), anchor: 'middle' });
  }
  ticks.push({
    month: now,
    text: compact ? 'NOW' : `NOW · ${monthLabel(now).toUpperCase()}`,
    anchor: 'end',
  });
  const charWidth = font * 0.62 + tracking;
  const extent = ({ month, text, anchor }: { month: number; text: string; anchor: string }) => {
    const labelWidth = text.length * charWidth;
    const start = x(month) - (anchor === 'start' ? 0 : anchor === 'end' ? labelWidth : labelWidth / 2);
    return [start, start + labelWidth];
  };
  const fixed = [extent(ticks[0]), extent(ticks[ticks.length - 1])];
  const labelled = new Set<number>([origin, now]);
  for (const tick of ticks.slice(1, -1)) {
    const [left, right] = extent(tick);
    if (fixed.every(([start, end]) => right + 6 < start || left > end + 6)) {
      fixed.push([left, right]);
      labelled.add(tick.month);
    }
  }
  const tickMarkup = ticks.map(({ month, text, anchor }) => {
    const tx = x(month);
    const isNow = month === now;
    const mark = `<line x1="${tx}" y1="${stripHeight}" x2="${tx}" y2="${stripHeight + (compact ? 4 : 6)}" stroke="${INK}"/>`;
    if (!labelled.has(month)) return mark;
    return `${mark}<text x="${tx}" y="${stripHeight + (compact ? 14 : 19)}" text-anchor="${anchor}" fill="${isNow ? INK : INK_SOFT}"${isNow ? ' font-weight="700"' : ''}>${text}</text>`;
  });
  const years = ticks
    .filter(({ anchor }) => anchor === 'middle')
    .map(({ month }) => `<rect x="${round(x(month) - 0.5)}" y="${top - inner / 2}" width="1" height="${bottom - top + inner}" fill="${PAPER}" fill-opacity=".3"/>`);
  const lastLane = top + (lanes.length - 1) * (lane + gap) + lane / 2;

  return [
    `<svg class="about-strip ${id}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true" focusable="false">`,
    `<defs><pattern id="${id}-holes" width="${pitch}" height="${band}" patternUnits="userSpaceOnUse" x="6"><rect y="${(band - holeHeight) / 2}" width="${hole}" height="${holeHeight}" rx="1.4" fill="${PAPER}"/></pattern>`,
    `<pattern id="${id}-quarters" width="${round(scale * 3)}" height="1" patternUnits="userSpaceOnUse" x="${padX - 0.5}"><rect width="1" height="1" fill="${PAPER}" fill-opacity=".12"/></pattern></defs>`,
    `<rect width="${width}" height="${stripHeight}" fill="${INK}"/>`,
    `<rect width="${holeBand}" height="${band}" fill="url(#${id}-holes)"/>`,
    `<rect width="${holeBand}" height="${band}" fill="url(#${id}-holes)" transform="translate(0 ${stripHeight - band})"/>`,
    `<rect x="${padX - 0.5}" y="${top - inner / 2}" width="${round(nowX - padX + 1)}" height="${bottom - top + inner}" fill="url(#${id}-quarters)"/>`,
    ...years,
    `<g font-family="${MONO}" font-size="${font}" letter-spacing="${tracking}">`,
    ...bars,
    ...tickMarkup,
    `</g>`,
    `<line x1="${nowX}" y1="${top - inner / 2}" x2="${nowX}" y2="${bottom + inner / 2}" stroke="${VERMILION}" stroke-width="${compact ? 1.2 : 1.6}"/>`,
    `<circle cx="${nowX}" cy="${lastLane}" r="${compact ? 4.5 : 6.5}" fill="${VERMILION}"/>`,
    `</svg>`,
  ].join('');
}

export function reelsMarkup(profile: Profile, tag: HeadingTag): string {
  const reels = profile.experience.map((role, index) => {
    const [synopsis = '', ...rest] = role.summary;
    const more = [...rest, ...role.details];
    const id = escapeHtml(role.id);
    const disclosure =
      more.length > 0
        ? `<details class="about-more"><summary class="about-expand" data-expand="${id}">Read the full reel</summary><ul class="about-details" data-detail-list="${id}">${more.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></details>`
        : '';
    return `<article class="about-reel"><p class="about-reel-no" aria-hidden="true"><small>Reel</small>${reelNumber(index)}</p><div><${tag} class="about-reel-title">${escapeHtml(role.org)}</${tag}><p class="about-role-meta">${escapeHtml(`${role.title} · ${spanLabel(role)} · ${role.note}`)}</p><p class="about-synopsis">${escapeHtml(synopsis)}</p>${disclosure}</div></article>`;
  });
  return `<div class="about-reels">${reels.join('\n')}</div>`;
}

export function proofMarkup(profile: Profile): string {
  const items = profile.publicProof.map(
    (item, index) =>
      `<li><a class="proof-link" href="${escapeHtml(item.href)}"${externalAttrs(item.href)}><span class="about-tag" aria-hidden="true">${String.fromCharCode(65 + index)}</span><span><span class="about-proof-label">${escapeHtml(item.label)}</span><span class="about-fine">${escapeHtml(item.detail)}</span></span><span aria-hidden="true">↗</span></a></li>`,
  );
  return `<ol class="about-proof">${items.join('')}</ol>`;
}

export function educationMarkup(profile: Profile): string {
  const items = profile.education.map(
    (item) =>
      `<li><p class="about-edu-school">${escapeHtml(item.school)}</p><p class="about-fine">${escapeHtml(item.detail)}</p></li>`,
  );
  return `<ul class="about-education">${items.join('')}</ul>`;
}

export function sectionMarkup(
  id: string,
  tag: HeadingTag,
  title: string,
  meta: string,
  body: string,
): string {
  const heading = `<${tag} class="about-section-title" id="${id}">${title}</${tag}>`;
  const head = meta
    ? `<div class="about-section-head">${heading}<p class="about-section-meta">${meta}</p></div>`
    : heading;
  return `<section class="about-section" aria-labelledby="${id}">${head}${body}</section>`;
}

export function reelsBody(profile: Profile, tag: HeadingTag, wideWidth: number): string {
  return [
    `<p class="about-experience-note">${escapeHtml(profile.experienceNote)}</p>`,
    stripMarkup(profile, wideWidth, 'wide'),
    stripMarkup(profile, 300, 'narrow'),
    reelsMarkup(profile, tag),
  ].join('\n');
}

export function stubMarkup(profile: Profile): string {
  const actions = profile.primaryActions.map(
    (action) =>
      `<a href="${escapeHtml(action.href)}"${externalAttrs(action.href)}><span class="about-action-label">${escapeHtml(action.label)}</span><span class="about-action-note" aria-hidden="true">${escapeHtml(action.note)} ↗</span></a>`,
  );
  return `<nav class="about-primary-actions" aria-label="Primary contact links"><span class="about-admit" aria-hidden="true">Admit one</span>${actions.join('')}</nav>`;
}

export function emailAddress(profile: Profile): string {
  const email = profile.primaryActions.find((action) => action.id === profile.identity.emailLinkId);
  return email ? email.href.replace(/^mailto:/, '') : '';
}

export function introMarkup(profile: Profile, assetBase: string): string {
  const email = emailAddress(profile);
  return `
<div class="about-backdrop" aria-hidden="true"></div>
<section class="about-panel" role="dialog" aria-modal="true" tabindex="-1" aria-labelledby="about-name" aria-describedby="about-summary">
${spineMarkup(profile)}
<div class="about-sheet">
<div class="about-scroll">
<header class="about-cover">
<img class="about-plate" src="${escapeHtml(assetBase)}programme/cover-axis.png" alt="" width="1280" height="560" loading="lazy" decoding="async">
<p class="about-film" aria-hidden="true">Loop 01 · Endless Second Ring</p>
<p class="about-cjk" lang="zh-CN" aria-hidden="true">正阳门</p>
<button class="about-close" type="button" data-about-close aria-label="Close personal intro" title="Close personal intro (Esc)">Close ✕</button>
${nameMarkup(profile, 'h2', 'about-name')}
</header>
<div class="about-ident">${stampMarkup(profile)}${identityMarkup(profile, 'Personal intro', 'about-summary')}</div>
${creditsMarkup(profile)}
${focusMarkup(profile)}
${sectionMarkup('about-reels-title', 'h3', 'The reels', '', reelsBody(profile, 'h4', 556))}
${sectionMarkup('about-proof-title', 'h3', 'Exhibits', '', proofMarkup(profile))}
${sectionMarkup('about-education-title', 'h3', 'Schooling', '', educationMarkup(profile))}
<p class="about-colophon">Printed ${escapeHtml(profile.dateModified)}<a href="/about/">Full programme</a><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
</div>
${stubMarkup(profile)}
</div>
</section>`;
}
