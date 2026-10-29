import { calculateElapsed } from './elapsed-time.0915083a0e92.js';
/** Optional, independent enhancements. Facts and navigation always work without JavaScript. */
(() => {
  'use strict';

  if (navigator.connection?.saveData) document.documentElement.dataset.reducedEffects = 'true';

  /** Wall-clock calculation: no accumulated tick drift, work only while visible, user can pause. */
  function initializeLiveClock() {
    const clock = document.getElementById('live-clock');
    const button = document.getElementById('toggle-clock');
    const status = document.getElementById('clock-status');
    if (!clock || !button || !status) return;
    const format = new Intl.NumberFormat('es-AR');
    const unitNodes = ['days', 'hours', 'minutes', 'seconds'].map((unit) => ({
      unit,
      elements: [
        ...clock.querySelectorAll(`[data-time-unit="${unit}"], [data-time-accessible="${unit}"]`),
      ],
    }));
    const yearNodes = [...document.querySelectorAll('[data-elapsed-years]')];
    const currentYearNodes = [...document.querySelectorAll('[data-current-year]')];
    let paused = false;
    let timer;
    function updateElapsed() {
      const elapsed = calculateElapsed(clock.dataset.foundedDate);
      for (const { unit, elements } of unitNodes) {
        const value = format.format(elapsed[unit]);
        for (const element of elements)
          if (element.textContent !== value) element.textContent = value;
      }
      const years = format.format(elapsed.years);
      yearNodes.forEach((element) => {
        if (element.textContent !== years) element.textContent = years;
      });
      const currentYear = String(elapsed.currentYear);
      currentYearNodes.forEach((element) => {
        if (element.textContent !== currentYear) element.textContent = currentYear;
      });
    }
    function scheduleClock() {
      clearTimeout(timer);
      if (paused || document.hidden) return;
      updateElapsed();
      timer = setTimeout(scheduleClock, 1000 - (Date.now() % 1000) + 10);
    }
    button.hidden = false;
    status.textContent = 'Actualización automática según el reloj del dispositivo.';
    button.addEventListener('click', () => {
      paused = !paused;
      button.setAttribute('aria-pressed', String(paused));
      button.textContent = paused ? 'Reanudar contador' : 'Pausar contador';
      status.textContent = paused ? 'Contador en pausa.' : 'Contador actualizado.';
      scheduleClock();
    });
    document.addEventListener('visibilitychange', scheduleClock);
    window.addEventListener('pagehide', () => clearTimeout(timer));
    window.addEventListener('pageshow', scheduleClock);
    scheduleClock();
    // Reveal ages only after a valid calculation. Static HTML remains true after any anniversary.
    document.querySelectorAll('[data-static-age]').forEach((element) => (element.hidden = true));
    document.querySelectorAll('[data-live-age]').forEach((element) => (element.hidden = false));
  }

  /** Sharing is independent from motion: removing a control never disables other features. */
  function initializeSharing() {
    const shareButton = document.getElementById('share-site');
    const copyButton = document.getElementById('copy-link');
    const controls = document.getElementById('share-controls');
    const status = document.getElementById('share-status');
    const manualRegion = document.getElementById('manual-copy');
    const manualInput = document.getElementById('official-url');
    const canonical = document.querySelector('link[rel="canonical"]');
    if (
      !shareButton ||
      !copyButton ||
      !controls ||
      !status ||
      !manualRegion ||
      !manualInput ||
      !canonical
    )
      return;
    const publicUrl = canonical.href;
    const shareText = document.querySelector('meta[name="description"]')?.content || document.title;
    let resetFeedbackTimer;

    /** Visible and selectable fallback for absent or denied clipboard permissions. */
    function showManualCopy() {
      manualRegion.hidden = false;
      manualInput.value = publicUrl;
      manualInput.focus();
      manualInput.select();
      status.textContent = 'Seleccioná y copiá la dirección de la página.';
    }

    /** Only the stable canonical URL is copied, regardless of location or anniversary changes. */
    async function copyOfficialUrl() {
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
        await navigator.clipboard.writeText(publicUrl);
        manualRegion.hidden = true;
        copyButton.textContent = 'Enlace copiado';
        status.textContent = 'El enlace oficial se copió al portapapeles.';
        window.clearTimeout(resetFeedbackTimer);
        resetFeedbackTimer = window.setTimeout(() => {
          copyButton.textContent = 'Copiar enlace';
        }, 2500);
      } catch {
        showManualCopy();
      }
    }

    /** A cancelled native share is expected; unsupported sharing falls back to copying. */
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

  /**
   * A short, optional brand flight to the real header slots.
   * The static header owns the facts. Temporary copies are decorative, never intercept input,
   * and disappear immediately on interaction, reduced motion, resize, hiding or any failure.
   */
  async function initializeBrandIntro() {
    const root = document.documentElement;
    root.dataset.brandIntro = 'skipped';
    const brand = document.getElementById('header-brand');
    const logo = brand?.querySelector('.brand-logo');
    const years = brand?.querySelector('.brand-years');
    if (!logo || !years || !window.matchMedia || !Element.prototype.animate) return;
    const preference = window.matchMedia(
      '(prefers-reduced-motion: reduce), (forced-colors: active)',
    );
    if (
      preference.matches ||
      document.hidden ||
      window.scrollY > 24 ||
      (location.hash && location.hash !== '#inicio') ||
      navigator.connection?.saveData
    )
      return;

    const animations = [];
    const removers = [];
    let overlay;
    let loadTimer;
    let cancelLoad;
    let safetyTimer;
    let finished = false;

    function finishIntro() {
      if (finished) return;
      finished = true;
      cancelLoad?.();
      clearTimeout(loadTimer);
      clearTimeout(safetyTimer);
      animations.forEach((animation) => animation.cancel());
      overlay?.remove();
      root.classList.remove('brand-flight-active');
      root.dataset.brandIntro = 'complete';
      removers.forEach((remove) => remove());
    }

    function subscribe(target, event, listener, options) {
      target.addEventListener(event, listener, options);
      removers.push(() => target.removeEventListener(event, listener, options));
    }

    try {
      for (const event of ['pointerdown', 'keydown', 'wheel', 'touchstart'])
        subscribe(document, event, finishIntro, { capture: true, passive: true });
      for (const event of ['resize', 'orientationchange', 'pagehide', 'scroll'])
        subscribe(window, event, finishIntro, { passive: true });
      subscribe(document, 'visibilitychange', () => {
        if (document.hidden) finishIntro();
      });
      if (preference.addEventListener) subscribe(preference, 'change', finishIntro);
      else {
        preference.addListener(finishIntro);
        removers.push(() => preference.removeListener(finishIntro));
      }

      // A slow or unavailable image never becomes a loading screen.
      const imageReady = logo.complete
        ? logo.naturalWidth > 0
        : await Promise.race([
            typeof logo.decode === 'function'
              ? logo.decode().then(
                  () => true,
                  () => false,
                )
              : Promise.resolve(false),
            new Promise((resolve) => {
              cancelLoad = () => resolve(false);
              loadTimer = setTimeout(() => resolve(false), 220);
            }),
          ]);
      clearTimeout(loadTimer);
      cancelLoad = undefined;
      if (!imageReady || finished || document.hidden || preference.matches) {
        finishIntro();
        return;
      }

      // Read all geometry together; only transform/opacity animate afterward.
      const logoBox = logo.getBoundingClientRect();
      const yearsBox = years.getBoundingClientRect();
      const yearsStyle = getComputedStyle(years);
      if (!logoBox.width || !yearsBox.width) {
        finishIntro();
        return;
      }
      const centerX = innerWidth / 2;
      const centerY = innerHeight * 0.44;
      const largeLogo = Math.min(184, innerWidth * 0.42, innerHeight * 0.3);
      const yearsScale = Math.min(1.8, (innerWidth - 40) / yearsBox.width);
      const yearsY = centerY + largeLogo / 2 + 26;

      overlay = document.createElement('div');
      overlay.className = 'brand-intro';
      overlay.setAttribute('aria-hidden', 'true');
      const scrim = document.createElement('div');
      scrim.className = 'brand-intro-scrim';
      overlay.append(scrim);

      function addFlightCopy(original, box, x, y, scale, className) {
        const copy = original.cloneNode(true);
        copy.className = className;
        if (copy.tagName === 'IMG') copy.alt = '';
        copy.removeAttribute('id');
        // The live, accessible years remain in the real header, not this transient copy.
        copy
          .querySelectorAll('[data-elapsed-years]')
          .forEach((item) => item.removeAttribute('data-elapsed-years'));
        const from =
          'translate(' +
          (x - box.left - box.width / 2) +
          'px, ' +
          (y - box.top - box.height / 2) +
          'px) scale(' +
          scale +
          ')';
        Object.assign(copy.style, {
          left: box.left + 'px',
          top: box.top + 'px',
          width: box.width + 'px',
          height: box.height + 'px',
          transform: from,
        });
        if (original === years) copy.style.font = yearsStyle.font;
        overlay.append(copy);
        return { copy, from };
      }

      const logoFlight = addFlightCopy(
        logo,
        logoBox,
        centerX,
        centerY,
        largeLogo / logoBox.width,
        'brand-intro-logo',
      );
      const yearsFlight = addFlightCopy(
        years,
        yearsBox,
        centerX,
        yearsY,
        yearsScale,
        'brand-intro-years',
      );
      document.body.append(overlay);
      root.classList.add('brand-flight-active');
      root.dataset.brandIntro = 'running';
      const duration = 1040;
      for (const { copy, from } of [logoFlight, yearsFlight])
        animations.push(
          copy.animate(
            [
              { transform: from, opacity: 1, offset: 0 },
              { transform: from, opacity: 1, offset: 0.14 },
              { transform: 'none', opacity: 1, offset: 1 },
            ],
            { duration, easing: 'cubic-bezier(0.65, 0, 0.22, 1)', fill: 'both' },
          ),
        );
      animations.push(
        scrim.animate(
          [
            { opacity: 1, offset: 0 },
            { opacity: 0.94, offset: 0.18 },
            { opacity: 0, offset: 0.78 },
            { opacity: 0, offset: 1 },
          ],
          { duration, easing: 'linear', fill: 'both' },
        ),
      );
      safetyTimer = setTimeout(finishIntro, 1450);
      await Promise.all(animations.map((animation) => animation.finished));
      finishIntro();
    } catch (error) {
      finishIntro();
      // User interaction and the watchdog cancel with AbortError; unexpected failures stay visible.
      if (error?.name !== 'AbortError') console.error('Error en la presentación de marca:', error);
    }
  }

  /** One-time motion. The DOM starts complete; failures or reduced motion leave it readable. */
  function initializeMotion() {
    if (!window.matchMedia || !('IntersectionObserver' in window) || !Element.prototype.animate)
      return;
    const preference = window.matchMedia(
      '(prefers-reduced-motion: reduce), (forced-colors: active)',
    );
    const activeAnimations = new Set();
    const cleanup = [];
    let observer;

    /** Distinct section entrances, with only transform and opacity; no permanent hidden states. */
    function animateSection(element) {
      const kind = element.dataset.reveal;
      const parts =
        kind === 'time'
          ? [...element.querySelectorAll('.time-metric')]
          : kind === 'group'
            ? [...element.children].filter((child) => !child.hidden).slice(0, 6)
            : [element];
      parts.forEach((part, index) => {
        const from =
          kind === 'art'
            ? 'scale(0.99)'
            : kind === 'time'
              ? 'translateY(10px)'
              : 'translateY(12px)';
        const animation = part.animate(
          [
            { transform: from, opacity: kind === 'schedule' ? 0.9 : 0.82 },
            { transform: 'none', opacity: 1 },
          ],
          {
            duration: kind === 'schedule' ? 380 : kind === 'art' ? 640 : 540,
            delay: index * 55,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          },
        );
        activeAnimations.add(animation);
        animation.onfinish = animation.oncancel = () => activeAnimations.delete(animation);
      });
    }

    /** Honor a preference change immediately, including while a count is in progress. */
    function handleMotionPreference() {
      if (!preference.matches) return;
      observer?.disconnect();
      activeAnimations.forEach((animation) => animation.cancel());
    }

    if (preference.matches || navigator.connection?.saveData) return;
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          if (!preference.matches) animateSection(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -12px 0px' },
    );
    document.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));
    if (preference.addEventListener) {
      preference.addEventListener('change', handleMotionPreference);
      cleanup.push(() => preference.removeEventListener('change', handleMotionPreference));
    } else {
      preference.addListener(handleMotionPreference);
      cleanup.push(() => preference.removeListener(handleMotionPreference));
    }
    function stopForKeyboard() {
      observer.disconnect();
      activeAnimations.forEach((animation) => animation.cancel());
    }
    document.addEventListener('keydown', stopForKeyboard, { once: true });
    cleanup.push(() => document.removeEventListener('keydown', stopForKeyboard));
    window.addEventListener(
      'pagehide',
      () => {
        observer.disconnect();
        activeAnimations.forEach((animation) => animation.cancel());
        cleanup.forEach((remove) => remove());
      },
      { once: true },
    );
  }

  initializeLiveClock();
  initializeSharing();
  initializeMotion();
  void initializeBrandIntro();
})();
