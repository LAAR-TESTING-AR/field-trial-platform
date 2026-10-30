(function () {
  "use strict";
  const STOP = new Set(["mostrar","mostrame","muestrame","buscar","busca","quiero","ver","localidad","localidades","sitio","sitios","ensayo","ensayos","de","del","la","las","el","los","por","para","con","en","fts","especialista","responsable","que","tengan","tiene","estado"]);
  const norm = v => String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
  function interpretar(frase) {
    const t = norm(frase);
    if (/\b(limpiar|borrar|resetear|restablecer)\b/.test(t) && /\bfiltros?\b/.test(t)) return {clear:true,query:""};
    return {clear:false,query:[...new Set(t.split(" ").filter(Boolean).filter(x=>!STOP.has(x)))].join(" ")};
  }
  function aplicar(input, frase) {
    const r=interpretar(frase);
    if(r.clear){ const b=document.getElementById("limpiarFiltros"); if(b)b.click(); else input.value=""; }
    else if(r.query) input.value=r.query;
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  }
  function mensaje(boton,texto,ms=2200){ boton.title=texto; const original=boton.textContent; boton.textContent="…"; setTimeout(()=>{boton.textContent=original;boton.title="Buscar por voz";},ms); }
  function iniciar(){
    const input=document.getElementById("busqueda"), boton=document.getElementById("btnVoiceSearchMasterList");
    if(!input||!boton||boton.dataset.voiceReady==="1")return;
    boton.dataset.voiceReady="1";
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    let recognition=null;
    if(Recognition){
      recognition=new Recognition(); recognition.lang="es-AR"; recognition.continuous=false; recognition.interimResults=false; recognition.maxAlternatives=1;
      recognition.onstart=()=>{boton.textContent="🔴";boton.title="Escuchando...";};
      recognition.onresult=e=>aplicar(input,e.results?.[0]?.[0]?.transcript||"");
      recognition.onend=()=>{boton.textContent="🎙️";boton.title="Buscar por voz";};
      recognition.onerror=e=>{console.warn("Voice search",e.error);boton.textContent="🎙️";boton.title="Buscar por voz";alert("Búsqueda por voz: "+e.error);};
    }
    async function activar(ev){
      ev.preventDefault(); ev.stopPropagation();
      if(recognition){ try{ recognition.start(); }catch(e){ console.warn(e); } return; }
      // Visible feedback on iOS/PWA where SpeechRecognition is not exposed.
      input.focus();
      mensaje(boton,"Usá el dictado del teclado del iPhone");
      alert("Este iPhone/PWA no expone SpeechRecognition a esta página. El buscador quedó activo: tocá el micrófono del teclado de iOS para dictar la frase y Master List filtrará automáticamente.");
    }
    boton.addEventListener("pointerup",activar,{passive:false});
    boton.addEventListener("click",ev=>{ if(ev.detail===0) activar(ev); });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",iniciar,{once:true}); else iniciar();
})();
