/** Progressive enhancement only: all content, contact links and QR work without this file. */
(() => {
  'use strict';
  const shareButton = document.getElementById('share-site');
  const copyButton = document.getElementById('copy-link');
  const controls = document.getElementById('share-controls');
  const status = document.getElementById('share-status');
  const manualRegion = document.getElementById('manual-copy');
  const manualInput = document.getElementById('official-url');
  const canonical = document.querySelector('link[rel="canonical"]');
  if (!shareButton || !copyButton || !controls || !status || !manualRegion || !manualInput || !canonical) return;
  const publicUrl = canonical.href;
  const shareText = document.querySelector('meta[name="description"]')?.content || document.title;
  let resetFeedbackTimer;

  /** Show a selectable URL when clipboard APIs are absent or denied. No modal or external dependency. */
  function showManualCopy() {
    manualRegion.hidden = false;
    manualInput.value = publicUrl;
    manualInput.focus();
    manualInput.select();
    status.textContent = 'Seleccioná y copiá la dirección de la página.';
  }

  /** Copy only the canonical official URL. Failure falls back to a visible labelled input. */
  async function copyOfficialUrl() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(publicUrl);
      manualRegion.hidden = true;
      copyButton.textContent = 'Enlace copiado';
      status.textContent = 'El enlace oficial se copió al portapapeles.';
      window.clearTimeout(resetFeedbackTimer);
      resetFeedbackTimer = window.setTimeout(() => { copyButton.textContent = 'Copiar enlace'; }, 2500);
    } catch { showManualCopy(); }
  }

  /** Prefer native share on supporting browsers; cancellation is expected, not an error. */
  async function shareOfficialPage() {
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title: 'Tu Gimnasio', text: shareText, url: publicUrl }); return; }
      catch (error) { if (error?.name === 'AbortError') return; }
    }
    await copyOfficialUrl();
  }

  copyButton.addEventListener('click', copyOfficialUrl);
  shareButton.addEventListener('click', shareOfficialPage);
  controls.hidden = false;
})();
