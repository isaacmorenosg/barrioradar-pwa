/* White first paint, followed by a soft branded map reveal, then the app. */
(()=>{'use strict';
  const started=performance.now();
  let finished=false;
  function close(){
    if(finished)return;
    finished=true;
    const splash=document.getElementById('zonentaSplash');
    if(!splash)return;
    splash.classList.add('is-hidden');
    setTimeout(()=>splash.remove(),450);
  }
  window.addEventListener('zonenta:app-ready',()=>{
    const remaining=Math.max(0,1500-(performance.now()-started));
    setTimeout(close,remaining);
  },{once:true});
  // Never strand the user behind a loading screen.
  setTimeout(close,4500);
  window.addEventListener('pageshow',event=>{if(event.persisted)close();});
})();
