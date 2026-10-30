(function () {
  "use strict";

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const INPUT_ID = "busqueda";
  const BUTTON_ID = "btnVoiceSearchMasterList";

  const STOP_WORDS = new Set([
    "mostrar", "mostrame", "muestrame", "buscar", "busca", "quiero", "ver",
    "localidad", "localidades", "sitio", "sitios", "ensayo", "ensayos",
    "de", "del", "la", "las", "el", "los", "por", "para", "con", "en",
    "fts", "especialista", "responsable", "que", "tengan", "tiene", "estado"
  ]);

  function normalizar(valor) {
    return String(valor || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function interpretarFrase(frase) {
    const texto = normalizar(frase);
    if (!texto) return { query: "", display: "" };

    if (/\b(limpiar|borrar|resetear|restablecer)\b/.test(texto) && /\bfiltros?\b/.test(texto)) {
      return { clear: true, query: "", display: "Limpiar filtros" };
    }

    const tokens = texto
      .split(" ")
      .filter(Boolean)
      .filter(token => !STOP_WORDS.has(token));

    // Mantener palabras operativas reconocidas por la base y el addon.
    // Ejemplo: “localidades Drop de FTS Romero Cuny” -> “drop romero cuny”.
    return {
      clear: false,
      query: [...new Set(tokens)].join(" "),
      display: frase.trim()
    };
  }

  function dispararBusqueda(input, valor) {
    input.value = valor;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function limpiarFiltros(input) {
    const botonLimpiar = document.getElementById("limpiarFiltros");
    if (botonLimpiar) {
      botonLimpiar.click();
      return;
    }
    dispararBusqueda(input, "");
  }

  function crearBoton(input) {
    if (document.getElementById(BUTTON_ID)) return;

    const boton = document.createElement("button");
    boton.id = BUTTON_ID;
    boton.type = "button";
    boton.title = "Buscar por voz";
    boton.setAttribute("aria-label", "Buscar por voz");
    boton.innerHTML = "🎙️";
    boton.style.cssText = [
      "margin-left:6px", "width:38px", "height:38px", "border-radius:10px",
      "border:1px solid #b9c9c0", "background:#fff", "color:#174c31",
      "font-size:17px", "cursor:pointer", "display:inline-flex",
      "align-items:center", "justify-content:center", "flex:0 0 auto",
      "box-shadow:0 2px 5px rgba(23,63,42,.12)"
    ].join(";");

    const recognition = SpeechRecognition ? new SpeechRecognition() : null;
    if (recognition) {
      recognition.lang = "es-AR";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
    }

    if (recognition) recognition.onstart = function () {
      boton.innerHTML = "🔴";
      boton.title = "Escuchando...";
      boton.style.background = "#eef7f1";
      input.placeholder = "Escuchando búsqueda...";
    };

    if (recognition) recognition.onresult = function (event) {
      const frase = event.results?.[0]?.[0]?.transcript || "";
      const interpretada = interpretarFrase(frase);
      if (interpretada.clear) {
        limpiarFiltros(input);
      } else if (interpretada.query) {
        dispararBusqueda(input, interpretada.query);
      }
      input.title = interpretada.display
        ? `Búsqueda por voz: ${interpretada.display}`
        : "";
    };

    if (recognition) recognition.onerror = function (event) {
      console.warn("Búsqueda por voz no disponible:", event.error);
      if (event.error !== "no-speech" && event.error !== "aborted") {
        window.alert("No se pudo reconocer la búsqueda por voz. Podés seguir usando el buscador manual.");
      }
    };

    if (recognition) recognition.onend = function () {
      boton.innerHTML = "🎙️";
      boton.title = "Buscar por voz";
      boton.style.background = "#fff";
      input.placeholder = input.dataset.voiceOriginalPlaceholder || "Buscar...";
    };

    boton.addEventListener("click", function () {
      if (!recognition) {
        window.alert("Este navegador no ofrece reconocimiento de voz para la búsqueda. Podés seguir usando el buscador manual.");
        return;
      }
      try {
        recognition.start();
      } catch (error) {
        console.warn("El reconocimiento de voz ya estaba activo.", error);
      }
    });

    input.dataset.voiceOriginalPlaceholder = input.placeholder || "Buscar...";

    // No modificar el layout del panel ni el ancho del buscador.
    // El micrófono se inserta como un control hermano inmediatamente después del buscador.
    input.insertAdjacentElement("afterend", boton);
  }

  function iniciar() {
    const input = document.getElementById(INPUT_ID);
    if (!input) return;
    crearBoton(input);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
