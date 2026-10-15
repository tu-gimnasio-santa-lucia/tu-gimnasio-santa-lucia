/** Optional, independent enhancements. Facts and navigation always work without JavaScript. */
(() => {
  'use strict';

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

  /** One-time motion. The DOM starts complete; failures or reduced motion leave it readable. */
  function initializeMotion() {
    if (!window.matchMedia || !('IntersectionObserver' in window) || !Element.prototype.animate)
      return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const activeAnimations = new Set();
    const activeFrames = new Set();
    const format = new Intl.NumberFormat('es-AR');
    const metrics = [...document.querySelectorAll('[data-count]')];
    let observer;

    /** Restore the fixed owner-supplied number; it is never a real-time elapsed clock. */
    function restoreMetric(element) {
      element.textContent = format.format(Number(element.dataset.count));
    }

    /** Count once, for at most 1.2 s. Screen readers retain the separate, fixed accessible value. */
    function animateMetric(element) {
      const target = Number(element.dataset.count);
      if (!Number.isSafeInteger(target) || target < 1 || preference.matches) return;
      const start = performance.now();
      function tick(now) {
        activeFrames.delete(frame);
        if (preference.matches) {
          restoreMetric(element);
          return;
        }
        const fraction = Math.min(1, (now - start) / 1200);
        const eased = 1 - Math.pow(1 - fraction, 3);
        element.textContent = format.format(Math.floor(target * eased));
        if (fraction < 1) {
          frame = requestAnimationFrame(tick);
          activeFrames.add(frame);
        } else restoreMetric(element);
      }
      let frame = requestAnimationFrame(tick);
      activeFrames.add(frame);
    }

    /** Distinct section entrances, with only transform and opacity; no permanent hidden states. */
    function animateSection(element) {
      const kind = element.dataset.reveal;
      const parts = kind === 'time' ? [...element.querySelectorAll('.time-metric')] : [element];
      parts.forEach((part, index) => {
        const from =
          kind === 'art'
            ? 'scale(0.985)'
            : kind === 'time'
              ? 'translateX(14px)'
              : 'translateY(20px)';
        const animation = part.animate(
          [
            { transform: from, opacity: 0.7 },
            { transform: 'none', opacity: 1 },
          ],
          {
            duration: 750,
            delay: index * 75,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          },
        );
        activeAnimations.add(animation);
        animation.onfinish = animation.oncancel = () => activeAnimations.delete(animation);
      });
      element.querySelectorAll('[data-count]').forEach(animateMetric);
    }

    /** Honor a preference change immediately, including while a count is in progress. */
    function handleMotionPreference() {
      if (!preference.matches) return;
      observer?.disconnect();
      activeAnimations.forEach((animation) => animation.cancel());
      activeFrames.forEach(cancelAnimationFrame);
      activeFrames.clear();
      metrics.forEach(restoreMetric);
    }

    if (preference.matches) return;
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          if (!preference.matches) animateSection(entry.target);
        });
      },
      { threshold: 0.12 },
    );
    document.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));
    if (preference.addEventListener) preference.addEventListener('change', handleMotionPreference);
    else preference.addListener(handleMotionPreference);
    window.addEventListener(
      'pagehide',
      () => {
        observer.disconnect();
        activeAnimations.forEach((animation) => animation.cancel());
        activeFrames.forEach(cancelAnimationFrame);
        activeFrames.clear();
        metrics.forEach(restoreMetric);
      },
      { once: true },
    );
  }

  initializeSharing();
  initializeMotion();
})();
