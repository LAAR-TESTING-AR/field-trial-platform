(function () {
  "use strict";

  const MIC = `<svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" stroke-width="1.8"/><path d="M6.5 10.5V11.5C6.5 14.5376 8.96243 17 12 17C15.0376 17 17.5 14.5376 17.5 11.5V10.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 17V21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M9 21H15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  const MIC_ON = `<svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" stroke-width="2"/><path d="M6.5 10.5V11.5C6.5 14.5376 8.96243 17 12 17C15.0376 17 17.5 14.5376 17.5 11.5V10.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="19" cy="5" r="2.3" fill="#28a060"/></svg>`;

  const STOP = new Set(["mostrar","mostrame","muestrame","buscar","busca","quiero","ver","dame","traeme","filtrar","filtra","localidad","localidades","sitio","sitios","ensayo","ensayos","de","del","la","las","el","los","por","para","con","en","fts","especialista","responsable","que","tengan","tiene","estado","un","una","todos","todas"]);
  function norm(v){return String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9\s-]/g," ").replace(/\s+/g," ").trim();}

  function interpretar(frase){
    let t=norm(frase);
    if(/\b(limpiar|borrar|resetear|restablecer)\b/.test(t)&&/\bfiltros?\b/.test(t))return{clear:true,query:""};
    // Ordered: negative forms first so “no sembradas” does not become “no planted”.
    const aliases=[
      [/\bno sembrad[oa]s?\b|\bsin sembrar\b|\bnot planted\b/g,"not planted"],
      [/\bsembrad[oa]s?\b|\bplantad[oa]s?\b/g,"planted"],
      [/\bno cosechad[oa]s?\b|\bsin cosechar\b|\bnot harvested\b/g,"not harvested"],
      [/\bcosechad[oa]s?\b/g,"harvested"],
      [/\ben proceso\b|\ben progreso\b|\bin progress\b/g,"in process"],
      [/\bdescartad[oa]s?\b|\bbajas?\b/g,"drop"],
      [/\bno verificad[oa]s?\b|\bpendiente de verificar\b/g,"reference"],
      [/\bverificad[oa]s?\b/g,"verified"],
      [/\bmaiz regulado\b|\bcorn regulado\b/g,"corn regulated"],
      [/\bmaiz stewarded\b|\bmaiz stewardship\b/g,"corn stewarded"],
      [/\bsoja\b|\bsoy\b/g,"soybean"]
    ];
    aliases.forEach(([r,v])=>{t=t.replace(r,v);});
    const phrases=["not planted","not harvested","in process","corn regulated","corn stewarded"];
    const keep=new Map();
    phrases.forEach((phrase,i)=>{const k=`zzphrase${i}`;if(t.includes(phrase)){t=t.replaceAll(phrase,k);keep.set(k,phrase);}});
    const terms=t.split(" ").filter(Boolean).filter(x=>!STOP.has(x)).map(x=>keep.get(x)||x);
    return{clear:false,query:[...new Set(terms)].join(" ")};
  }

  function aplicar(input,resultado){
    if(resultado.clear){const b=document.getElementById("limpiarFiltros");if(b)b.click();else input.value="";}
    else input.value=resultado.query;
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  }

  function layout(row,input,button){
    // Microphone sits INSIDE the search box, so mobile width is fully used.
    row.style.position="relative";row.style.display="block";row.style.width="100%";row.style.boxSizing="border-box";
    input.style.width="100%";input.style.minWidth="0";input.style.margin="0";input.style.paddingRight="44px";input.style.boxSizing="border-box";
    Object.assign(button.style,{position:"absolute",right:"3px",top:"50%",transform:"translateY(-50%)",width:"36px",minWidth:"36px",height:"34px",margin:"0",padding:"0",border:"0",borderLeft:"1px solid #d5ded9",borderRadius:"0 8px 8px 0",background:"transparent",color:"#34423a",boxShadow:"none",display:"flex",alignItems:"center",justifyContent:"center",zIndex:"5"});
    button.innerHTML=MIC;
  }

  function iniciar(){
    const row=document.getElementById("masterSearchRow"),input=document.getElementById("busqueda"),button=document.getElementById("btnVoiceSearchMasterList");
    if(!row||!input||!button)return;
    layout(row,input,button);
    const R=window.SpeechRecognition||window.webkitSpeechRecognition;
    let rec=null;
    if(R){
      rec=new R();rec.lang="es-AR";rec.continuous=false;rec.interimResults=false;rec.maxAlternatives=3;
      rec.onstart=()=>{button.innerHTML=MIC_ON;button.style.color="#0b6b3a";};
      rec.onresult=e=>aplicar(input,interpretar(e.results?.[0]?.[0]?.transcript||""));
      rec.onerror=e=>{console.warn("Voice search",e.error);if(!["no-speech","aborted"].includes(e.error))alert("Búsqueda por voz: "+e.error);};
      rec.onend=()=>{button.innerHTML=MIC;button.style.color="#34423a";};
    }
    button.onclick=function(e){e.preventDefault();e.stopPropagation();if(!rec){input.focus();alert("Este navegador no habilita reconocimiento de voz directo. Usá el micrófono del teclado dentro del buscador.");return;}try{rec.start();}catch(err){console.warn(err);}};
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",iniciar,{once:true});else iniciar();
})();
