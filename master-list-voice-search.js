(function () {
  "use strict";

  const STOP = new Set(["mostrar","mostrame","muestrame","buscar","busca","quiero","ver","localidad","localidades","sitio","sitios","ensayo","ensayos","de","del","la","las","el","los","por","para","con","en","fts","especialista","responsable","que","tengan","tiene","estado"]);

  function norm(v) {
    return String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
  }

  function interpretar(frase) {
    const texto = norm(frase);
    if (/\b(limpiar|borrar|resetear|restablecer)\b/.test(texto) && /\bfiltros?\b/.test(texto)) return { clear: true, query: "" };
    return { clear: false, query: [...new Set(texto.split(" ").filter(Boolean).filter(x => !STOP.has(x)))].join(" ") };
  }

  function aplicar(input, frase) {
    const r = interpretar(frase);
    if (r.clear) {
      const limpiar = document.getElementById("limpiarFiltros");
      if (limpiar) limpiar.click();
      else input.value = "";
    } else if (r.query) {
      input.value = r.query;
    }
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function iniciar() {
    const input = document.getElementById("busqueda");
    const boton = document.getElementById("btnVoiceSearchMasterList");
    if (!input || !boton || boton.dataset.voiceReady === "1") return;
    boton.dataset.voiceReady = "1";

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    if (Recognition) {
      recognition = new Recognition();
      recognition.lang = "es-AR";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => { boton.textContent = "🔴"; boton.title = "Escuchando..."; };
      recognition.onend = () => { boton.textContent = "🎙️"; boton.title = "Buscar por voz"; };
      recognition.onerror = e => {
        console.warn("Voice search:", e.error);
        boton.textContent = "🎙️";
        boton.title = "Buscar por voz";
        if (!["no-speech","aborted"].includes(e.error)) alert("No se pudo reconocer la búsqueda por voz.");
      };
      recognition.onresult = e => aplicar(input, e.results?.[0]?.[0]?.transcript || "");
    }

    boton.addEventListener("click", async () => {
      if (recognition) {
        try { recognition.start(); } catch (e) { console.warn(e); }
        return;
      }

      // iOS/Safari/PWA: Web Speech recognition may not be exposed. Keep the control functional
      // by focusing the search field so the native keyboard dictation can be used immediately.
      input.focus({ preventScroll: true });
      alert("En este dispositivo el navegador no habilita reconocimiento de voz directo. Usá el micrófono de dictado del teclado: el texto dictado se filtra automáticamente en Master List.");
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
