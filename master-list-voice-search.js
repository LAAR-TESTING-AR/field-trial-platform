(function () {
  "use strict";

  const MICROPHONE_SVG = `
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" stroke-width="1.8"/>
      <path d="M6.5 10.5V11.5C6.5 14.5376 8.96243 17 12 17C15.0376 17 17.5 14.5376 17.5 11.5V10.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M12 17V21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M9 21H15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`;

  const LISTENING_SVG = `
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" stroke-width="2"/>
      <path d="M6.5 10.5V11.5C6.5 14.5376 8.96243 17 12 17C15.0376 17 17.5 14.5376 17.5 11.5V10.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <circle cx="19" cy="5" r="2.25" fill="#28a060"/>
    </svg>`;

  const STOP_WORDS = new Set([
    "mostrar", "mostrame", "muestrame", "buscar", "busca", "quiero", "ver",
    "dame", "traeme", "filtrar", "filtra", "localidad", "localidades", "sitio",
    "sitios", "ensayo", "ensayos", "de", "del", "la", "las", "el", "los",
    "por", "para", "con", "en", "fts", "especialista", "responsable", "que",
    "tengan", "tiene", "estado", "un", "una", "todos", "todas"
  ]);

  const PHRASE_ALIASES = [
    [/\b(no sembradas|sin sembrar|not planted)\b/g, "not planted"],
    [/\b(sembradas|sembrados|sembrada|sembrado|plantados|plantadas)\b/g, "planted"],
    [/\b(no cosechadas|sin cosechar|not harvested)\b/g, "not harvested"],
    [/\b(cosechadas|cosechados|cosechada|cosechado)\b/g, "harvested"],
    [/\b(en proceso|en progreso|in progress)\b/g, "in process"],
    [/\b(descartadas|descartados|descartada|descartado|bajas)\b/g, "drop"],
    [/\b(verificadas|verificados|verificada|verificado)\b/g, "verified"],
    [/\b(no verificadas|no verificados|pendiente de verificar)\b/g, "reference"],
    [/\b(maiz regulado|maíz regulado|corn regulado)\b/g, "corn regulated"],
    [/\b(maiz stewardship|maíz stewardship|maiz stewarded|maíz stewarded)\b/g, "corn stewarded"],
    [/\b(soja|soy)\b/g, "soybean"]
  ];

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function interpret(transcript) {
    let text = normalize(transcript);

    if (/\b(limpiar|borrar|resetear|restablecer)\b/.test(text) && /\bfiltros?\b/.test(text)) {
      return { clear: true, query: "", understood: "Limpiar filtros" };
    }

    PHRASE_ALIASES.forEach(([pattern, replacement]) => {
      text = text.replace(pattern, replacement);
    });

    const protectedPhrases = ["not planted", "not harvested", "in process", "corn regulated", "corn stewarded"];
    const placeholders = new Map();
    protectedPhrases.forEach((phrase, index) => {
      const key = `phrase${index}`;
      if (text.includes(phrase)) {
        text = text.replaceAll(phrase, key);
        placeholders.set(key, phrase);
      }
    });

    const terms = text
      .split(" ")
      .filter(Boolean)
      .filter(term => !STOP_WORDS.has(term))
      .map(term => placeholders.get(term) || term);

    return {
      clear: false,
      query: [...new Set(terms)].join(" "),
      understood: transcript.trim()
    };
  }

  function applySearch(input, interpreted) {
    if (interpreted.clear) {
      const clearButton = document.getElementById("limpiarFiltros");
      if (clearButton) clearButton.click();
      else input.value = "";
    } else {
      input.value = interpreted.query;
    }

    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.title = interpreted.understood ? `Voz: ${interpreted.understood}` : "";
  }

  function configureLayout(row, input, button) {
    row.style.position = "relative";
    row.style.display = "block";
    row.style.width = "100%";
    row.style.maxWidth = "100%";
    row.style.boxSizing = "border-box";

    input.style.width = "100%";
    input.style.minWidth = "0";
    input.style.margin = "0";
    input.style.paddingRight = "46px";
    input.style.boxSizing = "border-box";

    button.style.position = "absolute";
    button.style.right = "4px";
    button.style.top = "50%";
    button.style.transform = "translateY(-50%)";
    button.style.width = "36px";
    button.style.minWidth = "36px";
    button.style.height = "34px";
    button.style.margin = "0";
    button.style.padding = "0";
    button.style.border = "0";
    button.style.borderLeft = "1px solid #d2ddd7";
    button.style.borderRadius = "0 8px 8px 0";
    button.style.background = "transparent";
    button.style.color = "#34423a";
    button.style.boxShadow = "none";
    button.style.display = "flex";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    button.style.zIndex = "3";
    button.style.touchAction = "manipulation";
    button.innerHTML = MICROPHONE_SVG;
  }

  function init() {
    const row = document.getElementById("masterSearchRow");
    const input = document.getElementById("busqueda");
    const button = document.getElementById("btnVoiceSearchMasterList");
    if (!row || !input || !button) return;

    configureLayout(row, input, button);

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;

    if (Recognition) {
      recognition = new Recognition();
      recognition.lang = "es-AR";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;

      recognition.onstart = function () {
        button.innerHTML = LISTENING_SVG;
        button.style.color = "#0b6b3a";
        button.title = "Escuchando...";
      };

      recognition.onresult = function (event) {
        const transcript = event.results?.[0]?.[0]?.transcript || "";
        applySearch(input, interpret(transcript));
      };

      recognition.onerror = function (event) {
        console.warn("Voice search error:", event.error);
        if (!["no-speech", "aborted"].includes(event.error)) {
          alert(`Búsqueda por voz: ${event.error}`);
        }
      };

      recognition.onend = function () {
        button.innerHTML = MICROPHONE_SVG;
        button.style.color = "#34423a";
        button.title = "Buscar por voz";
      };
    }

    window.masterListVoiceStart = function (event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      if (!recognition) {
        input.focus();
        alert("Este navegador no habilita reconocimiento de voz directo. Podés usar el micrófono del teclado dentro del buscador.");
        return false;
      }

      try {
        recognition.start();
      } catch (error) {
        console.warn("Voice recognition already active:", error);
      }
      return false;
    };

    button.onclick = window.masterListVoiceStart;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
