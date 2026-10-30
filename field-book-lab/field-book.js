(function () {
  "use strict";

  console.log("Field Book Lab iniciado");

  const selectorAoi = document.getElementById("fieldBookAoi");
  const contenido = document.getElementById("fieldBookContent");

  if (!selectorAoi || !contenido) {
    console.error("Field Book Lab: elementos principales no encontrados.");
    return;
  }

  const configuracionDemo = {
    ANCY04NMETAT: {
      location: "Metan",
      crop: "Soybean",
      status: "REAL LAYOUT · LAB",
      settings: {
        experiment: "Research",
        seedsPerRow: 68,
        targetDensity: 319048,
        tripHorn: 1,
        splitter: "YES",
        machineConfig: 2,
        extraSeeds: 1.14,
        recommendation: 160
      }
    }
  };

  const coloresExperimento = [
    "#dff3e7", "#e5ecff", "#fff0d8", "#f3e4ff", "#dff4f7",
    "#ffe3e3", "#edf1d4", "#f6e8cf", "#e8e8ff", "#dff0de"
  ];

  const estado = {
    aoiId: "",
    datos: null,
    plotSeleccionado: null
  };

  function escaparHTML(valor) {
    return String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function valorVisible(valor, fallback = "-") {
    return valor === null || valor === undefined || valor === ""
      ? fallback
      : escaparHTML(valor);
  }

  function crearFila(etiqueta, valor) {
    return `
      <div style="display:flex;justify-content:space-between;gap:15px;padding:8px 0;border-bottom:1px solid #edf2ef;">
        <span style="color:#6c7a72;font-size:12px;">${escaparHTML(etiqueta)}</span>
        <strong style="color:#26352d;font-size:12px;text-align:right;overflow-wrap:anywhere;">${valorVisible(valor)}</strong>
      </div>
    `;
  }

  function renderizarCarga(mensaje) {
    contenido.innerHTML = `
      <div class="empty-state">
        <strong>${escaparHTML(mensaje)}</strong>
        <span>Cargando datos reales del layout...</span>
      </div>
    `;
  }

  function renderizarError(mensaje) {
    contenido.innerHTML = `
      <div class="empty-state">
        <strong>No se pudo cargar el plano</strong>
        <span>${escaparHTML(mensaje)}</span>
        <span style="max-width:680px;margin-top:8px;color:#8a5b00;">
          Si abriste index.html con doble clic, el navegador puede bloquear la lectura del JSON local.
          Probá la carpeta mediante un servidor local o la vista publicada del LAB.
        </span>
      </div>
    `;
  }

  async function cargarLayout(aoiId) {
    const ruta = `data/layouts/${encodeURIComponent(aoiId)}.json`;
    const separador = ruta.includes("?") ? "&" : "?";
    const respuesta = await fetch(`${ruta}${separador}v=${Date.now()}`, {
      cache: "no-store"
    });

    if (!respuesta.ok) {
      throw new Error(`No se encontró ${ruta} (${respuesta.status}).`);
    }

    const datos = await respuesta.json();

    if (!datos?.trial?.trialName || !Array.isArray(datos?.plots)) {
      throw new Error("El JSON no tiene el esquema esperado de Field Book.");
    }

    return datos;
  }

  function mapaColoresExperimento(datos) {
    const mapa = new Map();
    (datos.experiments || []).forEach((experimento, indice) => {
      mapa.set(
        experimento.name,
        coloresExperimento[indice % coloresExperimento.length]
      );
    });
    return mapa;
  }

  function crearLeyenda(datos, colores) {
    return (datos.experiments || []).map(experimento => `
      <span style="display:inline-flex;align-items:center;gap:5px;padding:4px 7px;border:1px solid #d9e3dd;border-radius:999px;background:#fff;font-size:10px;color:#44564b;">
        <i style="width:9px;height:9px;border-radius:3px;background:${colores.get(experimento.name) || "#e7ece9"};border:1px solid rgba(0,0,0,.08);"></i>
        ${escaparHTML(experimento.name)}
        <strong>${valorVisible(experimento.plotCount, "0")}</strong>
      </span>
    `).join("");
  }

  function crearPlano(datos) {
    const layout = datos.layout;
    const colores = mapaColoresExperimento(datos);
    const plotsPorCoordenada = new Map(
      datos.plots.map(plot => [`${plot.range}|${plot.column}`, plot])
    );

    const columnas = [];
    for (let columna = layout.columnMin; columna <= layout.columnMax; columna += 1) {
      columnas.push(columna);
    }

    const ranges = [];
    for (let range = layout.rangeMax; range >= layout.rangeMin; range -= 1) {
      ranges.push(range);
    }

    const cabecera = columnas.map(columna => `
      <div style="width:34px;min-width:34px;text-align:center;font-size:9px;font-weight:800;color:#6b786f;">${columna}</div>
    `).join("");

    const filas = ranges.map(range => {
      const celdas = columnas.map(columna => {
        const plot = plotsPorCoordenada.get(`${range}|${columna}`);

        if (!plot) {
          return `
            <div
              title="Posición vacía · Range ${range} · Column ${columna}"
              style="width:34px;min-width:34px;height:30px;border:1px dashed #e2e9e5;border-radius:4px;background:transparent;"
            ></div>
          `;
        }

        const color = colores.get(plot.experimentName) || "#e7ece9";

        return `
          <button
            type="button"
            class="field-book-plot"
            data-plot-id="${escaparHTML(plot.id)}"
            title="Range ${plot.range} · Column ${plot.column} · ${escaparHTML(plot.experimentName)}"
            style="width:34px;min-width:34px;height:30px;margin:0;padding:0;border:1px solid rgba(61,78,68,.24);border-radius:4px;background:${color};color:#24352b;font-size:8px;font-weight:800;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
          >${plot.column}</button>
        `;
      }).join("");

      return `
        <div style="display:flex;align-items:center;gap:3px;margin-bottom:3px;">
          <div style="position:sticky;left:0;z-index:3;width:40px;min-width:40px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:5px;background:#eef6f1;color:#174c31;font-size:10px;font-weight:900;box-shadow:2px 0 4px rgba(23,63,42,.08);">R${range}</div>
          ${celdas}
        </div>
      `;
    }).join("");

    return `
      <div style="display:flex;gap:3px;margin:0 0 5px 43px;">${cabecera}</div>
      ${filas}
    `;
  }

  function crearDetallePlot(plot) {
    if (!plot) {
      return `
        <div id="fieldBookPlotDetail" style="margin-top:14px;padding:13px;border:1px solid #d9e3dd;border-radius:9px;background:#fff;">
          <span class="section-label">PLOT DETAIL</span>
          <p style="margin:6px 0 0;color:#6c7a72;font-size:12px;line-height:1.45;">
            Tocá una parcela del plano para ver sus datos reales.
          </p>
        </div>
      `;
    }

    return `
      <div id="fieldBookPlotDetail" style="margin-top:14px;padding:13px;border:1px solid #bfd4c7;border-radius:9px;background:#fff;box-shadow:0 3px 8px rgba(23,63,42,.07);">
        <span class="section-label">PLOT DETAIL</span>
        <h4 style="margin:5px 0 9px;color:#174c31;">Range ${plot.range} · Column ${plot.column}</h4>
        ${crearFila("Experiment", plot.experimentName)}
        ${crearFila("Germplasm", plot.germplasmName)}
        ${crearFila("Germplasm ID", plot.germplasmId)}
        ${crearFila("EU ID", plot.euId)}
        ${crearFila("EUDQ", plot.eudq)}
        ${crearFila("Rep", plot.rep)}
        ${crearFila("Entry comment", plot.entryComment)}
      </div>
    `;
  }

  function crearPanelSetup(datos, configuracion) {
    const settings = configuracion?.settings;

    if (!settings) {
      return `
        <span class="section-label">PLANTING SETUP</span>
        <h3 style="margin:5px 0 8px;">Pendiente</h3>
        <p style="color:#6c7a72;font-size:12px;line-height:1.45;">
          El layout ya es real. Los seteos de siembra todavía son datos LAB y serán reemplazados por la fuente de configuraciones.
        </p>
      `;
    }

    return `
      <span class="section-label">PLANTING SETUP</span>
      <h3 style="margin:5px 0 10px;">${escaparHTML(settings.experiment)}</h3>
      <div style="margin-bottom:10px;padding:7px 8px;border-radius:7px;background:#fff7df;color:#775900;font-size:10px;font-weight:800;">
        SETUP DEMO · Layout real
      </div>
      ${crearFila("Seeds / row", settings.seedsPerRow)}
      ${crearFila("Target density", settings.targetDensity)}
      ${crearFila("Trip horn", settings.tripHorn)}
      ${crearFila("Splitter", settings.splitter)}
      ${crearFila("Machine config", settings.machineConfig)}
      ${crearFila("Extra seeds", settings.extraSeeds)}
      ${crearFila("Recommendation", settings.recommendation)}
      ${crearFila("Plot records", datos.layout.plotRecordCount)}
      ${crearFila("Empty positions", datos.layout.emptyPositionCount)}
    `;
  }

  function conectarEventosPlot() {
    contenido.querySelectorAll(".field-book-plot").forEach(boton => {
      boton.addEventListener("click", () => {
        const plot = estado.datos.plots.find(item => item.id === boton.dataset.plotId);
        estado.plotSeleccionado = plot || null;

        contenido.querySelectorAll(".field-book-plot").forEach(actual => {
          actual.style.outline = "none";
          actual.style.transform = "none";
        });

        boton.style.outline = "3px solid #0b6b3a";
        boton.style.outlineOffset = "1px";
        boton.style.transform = "scale(1.08)";

        const detalle = document.getElementById("fieldBookPlotDetail");
        if (detalle) detalle.outerHTML = crearDetallePlot(estado.plotSeleccionado);
      });
    });
  }

  function renderizarAoi(aoiId, datos) {
    const configuracion = configuracionDemo[aoiId] || {};
    const trial = datos.trial;
    const colores = mapaColoresExperimento(datos);

    estado.aoiId = aoiId;
    estado.datos = datos;
    estado.plotSeleccionado = null;

    contenido.innerHTML = `
      <div style="padding:18px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:18px;margin-bottom:18px;">
          <div>
            <span class="section-label">AOI</span>
            <h2 style="margin:0;color:#174c31;font-size:21px;">${escaparHTML(trial.trialName)}</h2>
            <div style="margin-top:6px;color:#6c7a72;font-size:12px;">
              ${valorVisible(configuracion.location, "Localidad pendiente")}
              · ${valorVisible(configuracion.crop, "Crop pendiente")}
              · ${valorVisible(trial.year)} / Season ${valorVisible(trial.season)}
            </div>
          </div>

          <span style="padding:6px 9px;border-radius:999px;background:#e7f5ec;color:#0b6b3a;font-size:10px;font-weight:900;">
            REAL LAYOUT · READ ONLY
          </span>
        </div>

        <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,340px);gap:16px;align-items:start;">
          <section style="min-width:0;min-height:330px;padding:15px;border:1px solid #d9e3dd;border-radius:11px;background:#f8fbf9;">
            <span class="section-label">LAYOUT</span>
            <h3 style="margin:5px 0 4px;">Plano interactivo</h3>
            <p style="margin:0 0 10px;color:#6c7a72;font-size:12px;">
              Range ${datos.layout.rangeMin}-${datos.layout.rangeMax}
              · Column ${datos.layout.columnMin}-${datos.layout.columnMax}
              · ${datos.layout.plotRecordCount} parcelas
              · ${datos.experiments.length} experimentos
            </p>

            <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:11px;">
              ${crearLeyenda(datos, colores)}
            </div>

            <div style="overflow:auto;max-height:68vh;padding:8px;border:1px solid #d9e3dd;border-radius:9px;background:#fff;overscroll-behavior:contain;">
              <div style="width:max-content;min-width:100%;">
                ${crearPlano(datos)}
              </div>
            </div>
          </section>

          <aside style="position:sticky;top:12px;padding:15px;border:1px solid #d9e3dd;border-radius:11px;background:#fff;">
            ${crearPanelSetup(datos, configuracion)}
            ${crearDetallePlot(null)}
          </aside>
        </div>
      </div>
    `;

    conectarEventosPlot();
  }

  selectorAoi.addEventListener("change", async function () {
    const aoiId = selectorAoi.value;

    if (!aoiId) {
      estado.aoiId = "";
      estado.datos = null;
      contenido.innerHTML = `
        <div class="empty-state">
          <strong>Field Book Lab</strong>
          <span>Seleccioná una AOI para comenzar.</span>
        </div>
      `;
      return;
    }

    renderizarCarga(aoiId);

    try {
      const datos = await cargarLayout(aoiId);
      renderizarAoi(aoiId, datos);
    } catch (error) {
      console.error("Field Book Lab:", error);
      renderizarError(error.message || "Error desconocido.");
    }
  });
})();
