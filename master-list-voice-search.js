(function () {
  "use strict";

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const STOP = new Set(["mostrar","mostrame","muestrame","buscar","busca","quiero","ver","localidad","localidades","sitio","sitios","ensayo","ensayos","de","del","la","las","el","los","por","para","con","en","fts","especialista","responsable","que","tengan","tiene","estado"]);

  function norm(v) {
    return String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
  }

  function interpretar(frase) {
    const texto = norm(frase);
    if (/\b(limpiar|borrar|resetear|restablecer)\b/.test(texto) && /\bfiltros?\b/.test(texto)) return { clear: true, query: "" };
    return { clear: false, query: [...new Set(texto.split(" ").filter(Boolean).filter(x => !STOP.has(x)))].join(" ") };
  }

  function buscar(input, valor) {
    input.value = valor;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function iniciar() {
    const input = document.getElementById("busqueda");
    const boton = document.getElementById("btnVoiceSearchMasterList");
    if (!input || !boton || boton.dataset.voiceReady === "1") return;
    boton.dataset.voiceReady = "1";

    const recognition = Recognition ? new Recognition() : null;
    if (recognition) {
      recognition.lang = "es-AR";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => { boton.textContent = "🔴"; boton.title = "Escuchando..."; };
      recognition.onend = () => { boton.textContent = "🎙️"; boton.title = "Buscar por voz"; };
      recognition.onerror = e => {
        console.warn("Voice search:", e.error);
        boton.textContent = "🎙️";
        if (e.error !== "no-speech" && e.error !== "aborted") alert("No se pudo reconocer la búsqueda por voz.");
      };
      recognition.onresult = e => {
        const frase = e.results?.[0]?.[0]?.transcript || "";
        const r = interpretar(frase);
        if (r.clear) {
          const limpiar = document.getElementById("limpiarFiltros");
          if (limpiar) limpiar.click(); else buscar(input, "");
        } else if (r.query) {
          buscar(input, r.query);
        }
      };
    }

    boton.addEventListener("click", () => {
      if (!recognition) {
        alert("Este navegador no ofrece reconocimiento de voz. El micrófono queda visible y la búsqueda manual continúa disponible.");
        return;
      }
      try { recognition.start(); } catch (e) { console.warn(e); }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
