import { calculateElapsed } from './elapsed-time.0915083a0e92.js';
(() => {
'use strict';
const root = document.documentElement;
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');
const forcedQuery = matchMedia('(forced-colors: active)');
const saveData = Boolean(navigator.connection?.saveData);
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const motionOff = () => reduceQuery.matches || forcedQuery.matches || saveData;
let reduce = motionOff();
root.classList.toggle('rm', reduce);
if (saveData) root.dataset.reducedEffects = 'true';
const header = $('[data-header]');
const hero = $('[data-hero]');
const emblem = $('[data-emblem]');
const heroLogo = $('.hero-logo', hero);
const heroTitle = $('[data-hero-title]');
const progress = $('[data-progress]');
const fab = $('[data-fab]');
const years = $('[data-years]');
const arcs = years ? $$('circle', years) : [];
const motionListeners = new Set();
const onMotionChange = (fn) => motionListeners.add(fn);
const syncMotion = () => {
reduce = motionOff();
root.classList.toggle('rm', reduce);
motionListeners.forEach((fn) => fn());
};
reduceQuery.addEventListener?.('change', syncMotion);
forcedQuery.addEventListener?.('change', syncMotion);
function initializeLiveClock() {
const clock = document.getElementById('live-clock');
const button = document.getElementById('toggle-clock');
const status = document.getElementById('clock-status');
if (!clock || !button || !status) return;
const format = new Intl.NumberFormat('es-AR');
const units = ['days', 'hours', 'minutes', 'seconds'].map((unit) => ({
unit,
nodes: $$(`[data-time-unit="${unit}"], [data-time-accessible="${unit}"]`, clock),
}));
const seconds = $('[data-time-unit="seconds"]', clock);
const yearNodes = $$('[data-elapsed-years]');
let paused = false;
let timer;
function update() {
const elapsed = calculateElapsed(clock.dataset.foundedDate);
for (const { unit, nodes } of units) {
const value = format.format(elapsed[unit]);
for (const node of nodes) if (node.textContent !== value) node.textContent = value;
}
const age = format.format(elapsed.years);
for (const node of yearNodes) if (node.textContent !== age) node.textContent = age;
if (!reduce && seconds) {
seconds.classList.remove('tick');
void seconds.offsetWidth;
seconds.classList.add('tick');
}
}
function schedule() {
clearTimeout(timer);
if (paused || document.hidden) return;
update();
timer = setTimeout(schedule, 1000 - (Date.now() % 1000) + 10);
}
button.hidden = false;
status.textContent = 'Contador en vivo, según el reloj del dispositivo y la hora argentina.';
button.addEventListener('click', () => {
paused = !paused;
button.setAttribute('aria-pressed', String(paused));
button.textContent = paused ? 'Reanudar contador' : 'Pausar contador';
status.textContent = paused ? 'Contador en pausa.' : 'Contador actualizado.';
schedule();
});
document.addEventListener('visibilitychange', schedule);
addEventListener('pagehide', () => clearTimeout(timer));
addEventListener('pageshow', schedule);
schedule();
$$('[data-static-age]').forEach((element) => (element.hidden = true));
$$('[data-live-age]').forEach((element) => (element.hidden = false));
}
function initializeHeroIntro() {
const parts = $$('[data-intro]', hero);
let animations = [];
const settle = (state) => {
if (root.dataset.heroIntro && root.dataset.heroIntro !== 'running') return;
root.dataset.heroIntro = state;
cancelers.forEach(([target, type, fn]) => target.removeEventListener(type, fn));
};
const finish = () => {
if (root.dataset.heroIntro !== 'running') return;
animations.forEach((animation) => animation.finish());
settle('complete');
};
const cancelers = [
[window, 'pointerdown', finish],
[window, 'keydown', finish],
[window, 'wheel', finish],
[window, 'touchstart', finish],
[window, 'resize', finish],
[document, 'visibilitychange', () => document.hidden && finish()],
];
const shown = () => parts.some((part) => part.getAnimations().some((a) => a.animationName === 'intro-safety' && a.currentTime >= a.effect.getTiming().delay));
if (reduce || typeof Element.prototype.animate !== 'function' || location.hash || scrollY > 4 || document.hidden || shown())
return settle('skipped');
const ready = Promise.all([
document.fonts?.load?.('1em "Tu Gimnasio Display"').catch(() => null),
heroLogo.decode ? heroLogo.decode().catch(() => null) : null,
]);
const wait = new Promise((resolve) => setTimeout(() => resolve('late'), Math.max(0, 900 - performance.now())));
Promise.race([ready, wait]).then((result) => {
if (result === 'late' || reduce || document.hidden || scrollY > 4 || location.hash || shown()) return settle('skipped');
const ease = 'cubic-bezier(.22,1,.36,1)';
let line = 0;
let foot = 0;
const plan = {
light: () => [[{ opacity: 0 }, { opacity: 1 }], 1000, 0],
line: () => [[{ transform: 'translateY(106%)' }, { transform: 'none' }], 950, 60 + 90 * line++],
emblem: () => [[{ opacity: 0, transform: 'translateY(3%) scale(.94) rotate(-3deg)' }, { opacity: 1, transform: 'none' }], 1100, 160],
rule: () => [[{ transform: 'scaleX(0)' }, { transform: 'none' }], 900, 380],
foot: () => [[{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], 700, 560 + 70 * foot++],
};
root.dataset.heroIntro = 'running';
animations = parts.map((part) => {
const [keyframes, duration, delay] = plan[part.dataset.intro]();
return part.animate(keyframes, { duration, delay, easing: ease, fill: 'backwards' });
});
cancelers.forEach(([target, type, fn]) => target.addEventListener(type, fn, { passive: true }));
onMotionChange(() => reduce && finish());
Promise.all(animations.map((animation) => animation.finished)).then(() => settle('complete'), () => settle('complete'));
});
}
function initializeHeader() {
const nav = $('.header-nav', header);
const menuButton = $('.menu-button', header);
menuButton.hidden = false;
const brand = $('.brand', header);
const actions = $('.header-actions', header);
const fit = () => {
root.classList.remove('header-compact');
if (innerWidth <= 960) return;
const style = getComputedStyle(header);
const room = header.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
const need = brand.scrollWidth + nav.scrollWidth + actions.scrollWidth + 2 * parseFloat(style.columnGap || 0);
root.classList.toggle('header-compact', need > room + 1);
};
fit();
new ResizeObserver(fit).observe(header);
new MutationObserver(fit).observe(root, { attributes: true, attributeFilter: ['style'] });
document.fonts?.ready.then(fit);
if (fab) {
fab.hidden = false;
fab.inert = true;
}
}
function initializeScroll() {
const words = [];
const wordsElement = $('[data-words]');
if (wordsElement && !reduce) {
const text = wordsElement.textContent.trim();
wordsElement.setAttribute('aria-label', text);
wordsElement.textContent = '';
text.split(' ').forEach((word, index) => {
if (index) wordsElement.append(' ');
const span = document.createElement('span');
span.className = 'w';
span.setAttribute('aria-hidden', 'true');
span.textContent = word;
wordsElement.append(span);
words.push(span);
});
}
let heroHeight = hero.offsetHeight;
let documentHeight = root.scrollHeight;
let lastY = scrollY;
let queued = false;
const withButtons = new Set();
function frame() {
queued = false;
const y = scrollY;
const vh = innerHeight;
const wordsBox = words.length && !reduce ? wordsElement.getBoundingClientRect() : null;
const yearsBox = arcs.length && !reduce ? years.getBoundingClientRect() : null;
header.classList.toggle('is-scrolled', y > 24);
if (y > vh * 0.85 && y > lastY + 3 && !header.contains(document.activeElement)) header.classList.add('is-hidden');
else if (y < lastY - 3 || y < vh * 0.85) header.classList.remove('is-hidden');
root.classList.toggle('header-shown', !header.classList.contains('is-hidden') && y > vh * 0.85);
lastY = y;
progress.style.setProperty('--progress', clamp(y / Math.max(1, documentHeight - vh)).toFixed(4));
const fabOn = y > vh * 0.75 && !withButtons.size;
if (fab && fab.classList.contains('is-visible') !== fabOn) {
fab.classList.toggle('is-visible', fabOn);
fab.inert = !fabOn;
}
const p = clamp(y / (heroHeight || vh));
header.style.setProperty('--brand', reduce ? +(p > 0.6) : clamp((p - 0.42) / 0.3).toFixed(3));
if (reduce) return;
if (p < 1) {
emblem.style.translate = `0 ${(-p * 18).toFixed(2)}vh`;
emblem.style.scale = (1 - p * 0.22).toFixed(4);
emblem.style.opacity = (1 - clamp((p - 0.35) / 0.5) * 0.85).toFixed(3);
heroTitle.style.translate = `0 ${(p * 9).toFixed(2)}vh`;
heroTitle.style.opacity = (1 - p * 0.85).toFixed(3);
}
if (wordsBox) {
const lit = clamp((vh * 0.88 - wordsBox.top) / (wordsBox.height + vh * 0.38)) * (words.length + 2);
words.forEach((word, index) => (word.style.opacity = clamp(0.5 + (lit - index) * 0.5, 0.5, 1).toFixed(3)));
}
if (yearsBox) {
const seen = clamp((vh - yearsBox.top) / (yearsBox.height * 0.85 + vh * 0.25));
arcs.forEach((arc, index) => arc.style.setProperty('--p', clamp(seen * 1.3 - index * 0.14).toFixed(4)));
}
}
const request = () => {
if (queued) return;
queued = true;
requestAnimationFrame(frame);
};
if (fab && 'IntersectionObserver' in window) {
const watch = new IntersectionObserver((entries) => {
entries.forEach((entry) => (entry.isIntersecting ? withButtons.add(entry.target) : withButtons.delete(entry.target)));
request();
}, { rootMargin: '0px 0px -12% 0px' });
$$('.activity-schedules, .agenda, .teacher-grid, .final-cta, .site-footer').forEach((element) => watch.observe(element));
}
addEventListener('scroll', request, { passive: true });
addEventListener('resize', () => {
heroHeight = hero.offsetHeight;
request();
}, { passive: true });
new ResizeObserver(() => (documentHeight = root.scrollHeight)).observe(document.body);
onMotionChange(() => {
[emblem, heroTitle].forEach((element) => (element.style.translate = element.style.scale = element.style.opacity = ''));
heroLogo.style.transform = '';
words.forEach((word) => (word.style.opacity = ''));
arcs.forEach((arc) => arc.style.removeProperty('--p'));
request();
});
frame();
if (!finePointer) return;
let targetX = 0, targetY = 0, x = 0, y = 0, raf = 0;
const tilt = () => {
x += (targetX - x) * 0.075;
y += (targetY - y) * 0.075;
heroLogo.style.transform = `rotateY(${(x * 16).toFixed(2)}deg) rotateX(${(-y * 13).toFixed(2)}deg) translate3d(${(x * 14).toFixed(1)}px,${(y * 10).toFixed(1)}px,0)`;
raf = Math.abs(targetX - x) + Math.abs(targetY - y) > 0.0008 ? requestAnimationFrame(tilt) : 0;
};
hero.addEventListener('pointermove', (event) => {
if (reduce) return;
const box = hero.getBoundingClientRect();
targetX = (event.clientX - box.left) / box.width - 0.5;
targetY = (event.clientY - box.top) / box.height - 0.5;
if (!raf) raf = requestAnimationFrame(tilt);
});
hero.addEventListener('pointerleave', () => {
targetX = targetY = 0;
if (!raf && !reduce) raf = requestAnimationFrame(tilt);
});
$$('[data-magnetic]').forEach((element) => {
element.addEventListener('pointermove', (event) => {
if (reduce) return;
const box = element.getBoundingClientRect();
element.style.translate = `${((event.clientX - box.left - box.width / 2) * 0.16).toFixed(1)}px ${((event.clientY - box.top - box.height / 2) * 0.26).toFixed(1)}px`;
});
element.addEventListener('pointerleave', () => (element.style.translate = ''));
});
}
function initializeReveals() {
if (reduce || !('IntersectionObserver' in window)) return;
$$('[data-split]').forEach((title) => $$('.ln', title).forEach((line, index) => line.style.setProperty('--li', index)));
$$('.activity-schedules, .teacher-grid, .visit-side, .location-panel, .share-copy, .anniversary-inner, .final-copy').forEach((group) =>
$$('[data-reveal]', group).forEach((element, index) => element.style.setProperty('--i', index)),
);
const targets = $$('[data-reveal], [data-split], [data-clip]');
targets.forEach((element) => {
const box = element.getBoundingClientRect();
if (box.top < innerHeight && box.bottom > 0) element.classList.add('is-in');
});
root.dataset.reveals = 'on';
const observer = new IntersectionObserver(
(entries) =>
entries.forEach((entry) => {
if (!entry.isIntersecting) return;
entry.target.classList.add('is-in');
observer.unobserve(entry.target);
}),
{ rootMargin: '0px 0px -7% 0px', threshold: 0.1 },
);
targets.filter((element) => !element.classList.contains('is-in')).forEach((element) => observer.observe(element));
onMotionChange(() => reduce && targets.forEach((element) => element.classList.add('is-in')));
}
function initializeNavigationState() {
if (!('IntersectionObserver' in window)) return;
const links = $$('[data-spy]');
const indicator = $('.nav-indicator');
let active = null;
const place = () => {
if (!indicator) return;
indicator.classList.toggle('is-placing', indicator.style.getPropertyValue('--o') !== '1');
if (active) {
indicator.style.setProperty('--x', `${active.offsetLeft}px`);
indicator.style.setProperty('--w', `${active.offsetWidth}px`);
}
indicator.style.setProperty('--o', active ? 1 : 0);
};
const spy = new IntersectionObserver(
(entries) =>
entries.forEach((entry) => {
if (!entry.isIntersecting) return;
active = null;
links.forEach((link) => {
if (link.dataset.spy !== entry.target.id) return link.removeAttribute('aria-current');
link.setAttribute('aria-current', 'location');
active = link;
});
place();
}),
{ rootMargin: '-45% 0px -50% 0px' },
);
$$('main > section').forEach((element) => spy.observe(element));
addEventListener('resize', place, { passive: true });
document.fonts?.ready.then(place);
const section = $('[data-acts]');
const track = $('[data-index-track]');
const indexLinks = $$('[data-index]');
const scrollable = () => track.classList.toggle('is-scrollable', track.scrollWidth > track.clientWidth + 2);
scrollable();
addEventListener('resize', scrollable, { passive: true });
const select = (id) =>
indexLinks.forEach((link) => {
if (link.dataset.index !== id) return link.removeAttribute('aria-current');
link.setAttribute('aria-current', 'true');
section.style.setProperty('--glow', getComputedStyle(link).getPropertyValue('--c').trim());
if (track.classList.contains('is-scrollable')) {
const box = link.getBoundingClientRect();
const bar = track.getBoundingClientRect();
track.scrollBy({ left: box.left + box.width / 2 - bar.left - bar.width / 2, behavior: reduce ? 'auto' : 'smooth' });
}
});
const watcher = new IntersectionObserver((entries) => entries.forEach((entry) => entry.isIntersecting && select(entry.target.id)), { rootMargin: '-42% 0px -52% 0px' });
$$('[data-act]').forEach((card) => watcher.observe(card));
if (indexLinks[0]) select(indexLinks[0].dataset.index);
}
function initializeToday() {
const source = document.getElementById('agenda-data');
const picker = $('[data-seg]');
const agenda = $('[data-agenda]');
if (!source || !picker || !agenda) return;
const data = JSON.parse(source.textContent);
const general = data.general;
const names = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const toMinutes = (time) => +time.slice(0, 2) * 60 + +time.slice(3);
const short = (time) => time.replace(/^0(?=\d:)/, '');
const open = toMinutes(general.periods[0].start);
const close = toMinutes(general.periods.at(-1).end);
const percent = (minutes) => `${(clamp((minutes - open) / (close - open)) * 100).toFixed(2)}%`;
const indicator = $('.day-indicator', picker);
const caption = $('[data-cap]');
const status = $('[data-status]');
const line = $('[data-line]');
const lineNow = $('[data-line-now]');
const marks = $('[data-line-marks]');
const track = $('[data-line-track]');
const scale = $('[data-line-scale]');
const clockDay = $('[data-now-day]');
const clockTime = $('[data-now-time]');
const weekday = (day) => general.days.includes(day);
let selected = null;
const make = (tag, className, text) => {
const node = document.createElement(tag);
if (className) node.className = className;
if (text != null) node.textContent = text;
return node;
};
const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
function now() {
const values = Object.fromEntries(parts.formatToParts(new Date()).map((part) => [part.type, part.value]));
return {
day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(values.weekday),
minutes: +values.hour * 60 + +values.minute,
label: `${values.hour}:${values.minute}`,
};
}
function renderStatus(current) {
clockDay.textContent = `Hoy es ${names[current.day]},`;
clockTime.textContent = `${current.label} en Santa Lucía`;
const dot = make('span', 'dot');
const text = make('span');
if (!weekday(current.day)) {
dot.classList.add('off');
text.textContent = data.weekend;
} else {
const period = general.periods.find((p) => current.minutes >= toMinutes(p.start) && current.minutes < toMinutes(p.end));
const next = general.periods.find((p) => current.minutes < toMinutes(p.start));
if (period) text.textContent = `La sala de musculación está abierta hasta las ${short(period.end)}, con Profe ${general.teacher}.`;
else {
dot.classList.add('off');
const first = short(general.periods[0].start);
text.textContent = next
? `La sala de musculación abre a las ${short(next.start)}.`
: `La sala de musculación ya cerró por hoy. ${current.day < 5 ? `Mañana abre a las ${first}.` : `Vuelve a abrir el lunes a las ${first}.`}`;
}
}
status.replaceChildren(dot, text);
}
function moveIndicator() {
const active = $('button[aria-pressed="true"]', picker);
if (!active) return;
indicator.style.setProperty('--x', `${active.offsetLeft}px`);
indicator.style.setProperty('--w', `${active.offsetWidth}px`);
}
function renderLine(day, current, rows) {
line.hidden = day === 6;
if (day === 6) return;
track.replaceChildren(
...general.periods.map((p) => {
const band = make('i');
band.style.left = percent(toMinutes(p.start));
band.style.width = `calc(${percent(toMinutes(p.end))} - ${percent(toMinutes(p.start))})`;
return band;
}),
);
marks.replaceChildren(
...rows.slice(1).map((row) => {
const mark = make('i');
mark.style.left = percent(toMinutes(row.start));
mark.style.setProperty('--c', row.color);
return mark;
}),
);
if (!scale.childElementCount)
[...new Set(general.periods.flatMap((p) => [p.start, p.end]))].forEach((time) => {
const label = make('span', null, short(time).replace(/:00$/, ''));
label.style.left = percent(toMinutes(time));
scale.append(label);
});
const visible = day === current.day && current.minutes >= open && current.minutes <= close;
lineNow.hidden = !visible;
if (visible) {
const at = (current.minutes - open) / (close - open);
lineNow.style.left = percent(current.minutes);
lineNow.classList.toggle('is-start', at < 0.08);
lineNow.classList.toggle('is-end', at > 0.92);
}
}
function renderDay(day, current, animate) {
selected = day;
$$('button', picker).forEach((button) => button.setAttribute('aria-pressed', String(+button.dataset.day === day)));
moveIndicator();
const tomorrow = current.day >= 1 && current.day < 5 && day === current.day + 1;
caption.hidden = false;
caption.textContent = day === 6 ? data.weekend.split(':')[0] : day === current.day ? 'Clases de hoy' : tomorrow ? `Clases de mañana, ${names[day]}` : `Clases del ${names[day]}`;
const isToday = day === current.day;
const rows = [];
if (day !== 6) {
rows.push({
start: general.periods[0].start,
title: 'Sala de musculación, horario general',
detail: `${general.periods.map((p) => `${short(p.start)} a ${short(p.end)}`).join(' y ')}. Profe ${general.teacher}.`,
color: '#ffc31b',
href: general.href,
teacher: general.teacher,
now: isToday && general.periods.some((p) => current.minutes >= toMinutes(p.start) && current.minutes < toMinutes(p.end)),
past: isToday && current.minutes >= close,
});
data.items
.filter((item) => item.days.includes(day))
.sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
.forEach((item) => {
const started = isToday && current.minutes >= toMinutes(item.start);
rows.push({
...item,
title: item.activity,
detail: `${item.end ? `${short(item.start)} a ${short(item.end)}` : `Inicio ${short(item.start)}, duración a consultar`}. Profe ${item.teacher}.`,
now: started && item.end && current.minutes < toMinutes(item.end),
past: started && item.end && current.minutes >= toMinutes(item.end),
begun: started && !item.end,
});
});
const latest = Math.max(-1, ...rows.slice(1).filter((row) => isToday && current.minutes >= toMinutes(row.start)).map((row) => toMinutes(row.start)));
rows.forEach((row) => {
const closedSince = general.periods.some((p) => toMinutes(row.start) < toMinutes(p.end) && toMinutes(p.end) <= current.minutes);
if (row.begun && (closedSince || toMinutes(row.start) < latest)) {
row.begun = false;
row.past = true;
}
});
}
const items = day === 6
? [Object.assign(make('li', 'note'), { textContent: data.weekend })]
: rows.map((row, index) => {
const item = make('li', [row.now && 'is-now', row.past && 'is-past', animate && 'enter'].filter(Boolean).join(' '));
item.style.setProperty('--c', row.color);
item.style.setProperty('--i', index);
const what = make('span', 'agenda-what');
const title = make('b', null, row.title);
if (row.now) title.append(make('span', 'agenda-tag', 'Ahora'));
if (row.begun) title.append(make('span', 'agenda-tag soft', 'Ya empezó'));
what.append(title, make('span', null, row.detail));
const link = make('a', 'agenda-cta', 'Consultar');
link.href = row.href;
link.target = '_blank';
link.rel = 'noopener noreferrer';
link.setAttribute('aria-label', `Consultar con ${row.teacher} por ${row.title}, ${short(row.start)}`);
item.append(make('span', 'agenda-time', short(row.start)), what, link);
return item;
});
agenda.replaceChildren(...items);
renderLine(day, current, rows);
}
const current = now();
const firstDay = weekday(current.day) && current.minutes < close ? current.day : weekday(current.day) && current.day < 5 ? current.day + 1 : 1;
picker.hidden = false;
$('[data-agenda-fallback]').hidden = true;
renderStatus(current);
renderDay(firstDay, current, false);
picker.addEventListener('click', (event) => {
const button = event.target.closest('button[data-day]');
if (button && +button.dataset.day !== selected) renderDay(+button.dataset.day, now(), true);
});
picker.addEventListener('keydown', (event) => {
if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
const buttons = $$('button', picker);
const index = buttons.indexOf(document.activeElement);
if (index < 0) return;
const next = buttons[(index + (event.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length];
next.focus();
next.click();
event.preventDefault();
});
addEventListener('resize', moveIndicator, { passive: true });
document.fonts?.ready.then(moveIndicator);
let last = current.minutes;
setInterval(() => {
const fresh = now();
renderStatus(fresh);
if (fresh.minutes !== last && selected === fresh.day) renderDay(selected, fresh, false);
last = fresh.minutes;
}, 30000);
}
function initializeDialogs() {
let opener = null;
const open = (id, from) => {
const dialog = document.getElementById(id);
if (!dialog || dialog.open || typeof dialog.showModal !== 'function') return false;
opener = from;
if (dialog.classList.contains('menu') && from) {
const box = from.getBoundingClientRect();
dialog.style.setProperty('--ox', `${box.left + box.width / 2}px`);
dialog.style.setProperty('--oy', `${box.top + box.height / 2}px`);
}
const gap = innerWidth - root.clientWidth;
document.body.style.paddingRight = gap ? `${gap}px` : '';
document.body.classList.add('dialog-open');
dialog.showModal();
requestAnimationFrame(() => requestAnimationFrame(() => dialog.classList.add('is-open')));
return true;
};
const close = (dialog, after) => {
if (!dialog.open) return after?.();
dialog.classList.remove('is-open');
setTimeout(() => {
dialog.close();
after?.();
}, reduce ? 0 : dialog.classList.contains('menu') ? 440 : 260);
};
const sheet = $('.sheet');
const narrow = matchMedia('(max-width: 640px)');
let drag = null;
sheet?.addEventListener('pointerdown', (event) => {
const handle = event.target.closest('.sheet-grip, .sheet-head');
if (!narrow.matches || event.button || event.target.closest('a, button') || !handle) return;
drag = { start: event.clientY, y: event.clientY, t: event.timeStamp, v: 0, dy: 0 };
handle.setPointerCapture(event.pointerId);
sheet.classList.add('is-dragging');
});
sheet?.addEventListener('pointermove', (event) => {
if (!drag) return;
drag.v = (event.clientY - drag.y) / Math.max(1, event.timeStamp - drag.t);
drag.y = event.clientY;
drag.t = event.timeStamp;
drag.dy = Math.max(0, event.clientY - drag.start);
sheet.style.transform = `translateY(${drag.dy}px)`;
});
const release = () => {
if (!drag) return;
const { dy, v } = drag;
drag = null;
sheet.classList.remove('is-dragging');
sheet.style.transform = '';
if (dy > 96 || (v > 0.5 && dy > 24)) close(sheet);
};
sheet?.addEventListener('pointerup', release);
sheet?.addEventListener('pointercancel', release);
$$('.menu nav a').forEach((link, index) => link.style.setProperty('--i', index));
$$('dialog').forEach((dialog) => {
dialog.addEventListener('cancel', (event) => {
event.preventDefault();
close(dialog);
});
dialog.addEventListener('close', () => {
document.body.classList.remove('dialog-open');
document.body.style.paddingRight = '';
dialog.classList.remove('is-open');
opener?.focus({ preventScroll: true });
opener = null;
});
dialog.addEventListener('click', (event) => {
if (event.target === dialog && dialog.classList.contains('sheet')) return close(dialog);
const closer = event.target.closest('[data-close]');
if (closer) {
const hash = closer.getAttribute('href');
if (!hash?.startsWith('#')) return close(dialog);
event.preventDefault();
opener = null;
close(dialog, () => {
document.querySelector(hash)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
history.replaceState(null, '', hash);
});
} else if (event.target.closest('.contact-option')) setTimeout(() => close(dialog), 150);
});
});
document.addEventListener('click', (event) => {
const trigger = event.target.closest('[data-open]');
if (trigger && open(trigger.dataset.open, trigger)) event.preventDefault();
});
}
function initializeQuestions() {
$$('.questions details').forEach((details) => {
const answer = $('p', details);
details.dataset.state = details.open ? 'open' : 'closed';
let animation = null;
$('summary', details).addEventListener('click', (event) => {
if (reduce || !answer.animate) {
details.dataset.state = details.open ? 'closed' : 'open';
return;
}
event.preventDefault();
animation?.cancel();
if (details.dataset.state === 'open') {
details.dataset.state = 'closed';
animation = answer.animate([{ height: `${answer.offsetHeight}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 300, easing: 'cubic-bezier(.65,0,.35,1)' });
animation.onfinish = () => (details.open = false);
} else {
details.dataset.state = 'open';
details.open = true;
animation = answer.animate([{ height: '0px', opacity: 0 }, { height: `${answer.offsetHeight}px`, opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
}
});
});
}
function initializeSharing() {
const shareButton = document.getElementById('share-site');
const copyButton = document.getElementById('copy-link');
const controls = document.getElementById('share-controls');
const status = document.getElementById('share-status');
const manualRegion = document.getElementById('manual-copy');
const manualInput = document.getElementById('official-url');
const canonical = $('link[rel="canonical"]');
if (!shareButton || !copyButton || !controls || !status || !manualRegion || !manualInput || !canonical) return;
const publicUrl = canonical.href;
const shareText = $('meta[name="description"]')?.content || document.title;
const copyLabel = $('span', copyButton);
let resetFeedbackTimer;
function showManualCopy() {
manualRegion.hidden = false;
manualInput.value = publicUrl;
manualInput.focus();
manualInput.select();
status.textContent = 'Seleccioná y copiá la dirección de la página.';
}
async function copyOfficialUrl() {
try {
if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
await navigator.clipboard.writeText(publicUrl);
manualRegion.hidden = true;
copyLabel.textContent = 'Enlace copiado';
copyButton.dataset.state = 'done';
status.textContent = 'El enlace oficial se copió al portapapeles.';
clearTimeout(resetFeedbackTimer);
resetFeedbackTimer = setTimeout(() => {
copyLabel.textContent = 'Copiar enlace';
delete copyButton.dataset.state;
}, 2500);
} catch {
showManualCopy();
}
}
async function shareOfficialPage() {
if (typeof navigator.share === 'function') {
try {
await navigator.share({ title: 'Tu Gimnasio', text: shareText, url: publicUrl });
return;
} catch (error) {
if (error?.name === 'AbortError') return;
}
}
await copyOfficialUrl();
}
copyButton.addEventListener('click', copyOfficialUrl);
shareButton.addEventListener('click', shareOfficialPage);
controls.hidden = false;
}
for (const initialize of [initializeLiveClock, initializeHeader, initializeHeroIntro, initializeScroll, initializeReveals, initializeNavigationState, initializeToday, initializeDialogs, initializeQuestions, initializeSharing]) {
try {
initialize();
} catch (error) {
if (initialize === initializeHeroIntro) root.dataset.heroIntro = 'skipped';
console.error(error);
}
}
})();
