/* BarrioRadar · mobile map-first interaction shell. Existing app handles reviews, auth and map data. */
(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);
    const sheet = $('detailsCard');
    const overlay = $('sheetBackdrop');
    const showButton = $('mobileSheetChip');
    const rateButton = $('mobileRateCTA');
    const dismiss = $('sheetClose');
    const map = $('mapViewport');
    const legend = $('mobileLegendToggle');
    const navAccount = $('mobileAccountButton');
    if (!sheet || !map || !showButton || !overlay) return;
    const mobile = window.matchMedia('(max-width:760px)');
    const isOpen = () => document.body.classList.contains('sheet-open');
    const setOpen = (open, focus) => {
      const next = Boolean(open && mobile.matches);
      document.body.classList.toggle('sheet-open', next);
      showButton.setAttribute('aria-expanded', String(next));
      sheet.setAttribute('aria-hidden', String(!next && mobile.matches));
      sheet.inert = !next && mobile.matches;
      if (next) {
        const inner = $('detailsContent');
        if (inner) inner.scrollTop = 0;
        if (focus) dismiss?.focus({preventScroll:true});
      } else if (focus) showButton.focus({preventScroll:true});
    };
    const resetForSize = () => {
      if (mobile.matches) setOpen(false,false);
      else {
        document.body.classList.remove('sheet-open');
        sheet.inert = false;
        sheet.removeAttribute('aria-hidden');
      }
    };
    resetForSize();
    if (mobile.addEventListener) mobile.addEventListener('change', resetForSize);
    else if (mobile.addListener) mobile.addListener(resetForSize);
    let touch=null;
    const activeTouches=new Set();
    let multiTouch=false;
    map.addEventListener('pointerdown',event=>{
      if(!mobile.matches || (event.pointerType==='mouse'&&event.button!==0))return;
      activeTouches.add(event.pointerId);
      if(activeTouches.size>1){multiTouch=true;touch=null;return;}
      if(!multiTouch)touch={id:event.pointerId,x:event.clientX,y:event.clientY};
    },{passive:true});
    map.addEventListener('pointermove',event=>{
      if(multiTouch)return;
      if(touch&&touch.id===event.pointerId&&Math.hypot(event.clientX-touch.x,event.clientY-touch.y)>9)touch=null;
    },{passive:true});
    map.addEventListener('pointerup',event=>{
      activeTouches.delete(event.pointerId);
      if(multiTouch){
        touch=null;
        if(activeTouches.size===0)multiTouch=false;
        return; // A two-finger gesture must never open the details sheet.
      }
      if(!touch||touch.id!==event.pointerId)return;
      touch=null;
      requestAnimationFrame(()=>{
        if(mobile.matches&&!document.querySelector('#modalRoot:not(.hidden)'))setOpen(true,false);
      });
    },{passive:true});
    map.addEventListener('pointercancel',event=>{
      activeTouches.delete(event.pointerId);touch=null;
      if(activeTouches.size===0)multiTouch=false;
    },{passive:true});
    map.addEventListener('keydown',event=>{
      if (event.key==='Enter' && mobile.matches) requestAnimationFrame(()=>setOpen(true,false));
    });
    showButton.addEventListener('click',()=>setOpen(true,true));
    dismiss?.addEventListener('click',()=>setOpen(false,true));
    overlay.addEventListener('click',()=>setOpen(false,false));
    $('sheetGrip')?.addEventListener('click',()=>setOpen(false,true));
    rateButton?.addEventListener('click',()=>{
      const action=$('detailRate');
      if (action) action.click();
      else setOpen(true,true);
    });
    navAccount?.addEventListener('click',()=>{
      setOpen(false,false);
      $('accountButton')?.click();
    });
    document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>setOpen(false,false)));
    $('placeForm')?.addEventListener('submit',()=>setOpen(false,false));
    $('mobileLegendToggle')?.addEventListener('click',()=>{
      const expanded=document.body.classList.toggle('legend-expanded');
      legend?.setAttribute('aria-expanded',String(expanded));
    });
    document.addEventListener('keydown',event=>{
      if (event.key==='Escape' && isOpen()) setOpen(false,false);
    });
    // A visit to the preview remains clearly labelled and cannot submit real votes.
    if (new URLSearchParams(location.search).get('muestras')==='1') {
      rateButton?.setAttribute('title','La muestra es ilustrativa y no acepta valoraciones');
    }
  });
})();