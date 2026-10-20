/* Zonenta v19: detach mobile sheet from the map layer; scroll the sheet itself. */
(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const sheet = document.getElementById('detailsCard');
    const topbar = sheet?.querySelector('.sheet-topbar');
    const grip = document.getElementById('sheetGrip');
    if (!sheet || !topbar || !grip) return;

    const home = sheet.parentNode;
    const anchor = document.createComment('Original desktop sheet position');
    home.insertBefore(anchor, sheet);
    const mobile = window.matchMedia('(max-width:760px)');
    let expanded = false;
    let wasOpen = document.body.classList.contains('sheet-open');

    const expand = document.createElement('button');
    expand.type = 'button';
    expand.id = 'sheetExpand';
    expand.textContent = 'Ampliar';
    expand.setAttribute('aria-label', 'Ampliar ficha de zona a pantalla completa');
    expand.setAttribute('aria-pressed', 'false');
    topbar.appendChild(expand);

    const setExpanded = value => {
      expanded = !!value && mobile.matches;
      document.body.classList.toggle('sheet-expanded', expanded);
      expand.textContent = expanded ? 'Reducir' : 'Ampliar';
      expand.setAttribute('aria-label', expanded ? 'Reducir ficha de zona' : 'Ampliar ficha de zona a pantalla completa');
      expand.setAttribute('aria-pressed', String(expanded));
    };
    const relocate = () => {
      if (mobile.matches) {
        if (sheet.parentNode !== document.body) document.body.appendChild(sheet);
        sheet.classList.add('mobile-sheet-root');
      } else {
        sheet.classList.remove('mobile-sheet-root');
        if (sheet.parentNode !== home) home.insertBefore(sheet, anchor.nextSibling);
        setExpanded(false);
      }
    };
    relocate();
    if (mobile.addEventListener) mobile.addEventListener('change', relocate);
    else if (mobile.addListener) mobile.addListener(relocate);

    const toggle = () => setExpanded(!expanded);
    expand.addEventListener('click', toggle);
    // Override the old grip click-to-dismiss, keeping the separate X close button.
    grip.setAttribute('aria-label', 'Ampliar o reducir la ficha de zona');
    grip.addEventListener('click', event => {
      if (!mobile.matches) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      toggle();
    }, true);

    // Swipes over the header can expand/reduce without stealing comment scrolling.
    let start = null;
    topbar.addEventListener('touchstart', event => {
      if (!mobile.matches || event.touches.length !== 1 || event.target.closest('#sheetClose,#sheetExpand')) return;
      start = event.touches[0].clientY;
    }, {passive:true});
    topbar.addEventListener('touchend', event => {
      if (start === null || !mobile.matches || event.changedTouches.length === 0) return;
      const delta = event.changedTouches[0].clientY - start;
      start = null;
      if (delta < -30) setExpanded(true);
      else if (delta > 30) setExpanded(false);
    }, {passive:true});
    topbar.addEventListener('touchcancel', () => { start = null; }, {passive:true});

    // Reset to the beginning when the sheet opens; never reset during scrolling.
    const observer = new MutationObserver(() => {
      const open = document.body.classList.contains('sheet-open');
      if (open && !wasOpen) sheet.scrollTop = 0;
      if (!open && (wasOpen || expanded)) setExpanded(false);
      wasOpen = open;
    });
    observer.observe(document.body, {attributes:true, attributeFilter:['class']});
  });
})();