/* The SVG artwork is embedded in index.html, visible from the first web paint. */
(()=>{'use strict';
  let dismissed=false;
  function close(){
    if(dismissed)return;
    dismissed=true;
    const splash=document.getElementById('zonentaSplash');
    if(!splash)return;
    splash.classList.add('is-hidden');
    setTimeout(()=>splash.remove(),450);
  }
  window.addEventListener('zonenta:app-ready',()=>setTimeout(close,650),{once:true});
  // Never trap an offline user on the illustration.
  setTimeout(close,4500);
  window.addEventListener('pageshow',event=>{if(event.persisted)close();});
})();
