(function () {
  "use strict";

  console.log("Field Book Lab iniciado");

  const selectorAoi =
    document.getElementById("fieldBookAoi");

  const contenido =
    document.getElementById("fieldBookContent");

  if (!selectorAoi || !contenido) {
    console.error(
      "Field Book Lab: elementos principales no encontrados."
    );

    return;
  }

  // Datos embebidos opcionales para pruebas con doble clic (file://).
  // Si existe window.FIELD_BOOK_LAYOUTS, Field Book usa esos datos sin fetch.
  const layoutsEmbebidos = window.FIELD_BOOK_LAYOUTS || {};
  const settingsEmbebidos = window.FIELD_BOOK_SETTINGS || { experimentSettings: [], locationSettings: [] };

  function normalizar(valor) { return String(valor ?? "").trim().toLowerCase(); }

  function obtenerLocationSetting(aoiId) {
    return (settingsEmbebidos.locationSettings || []).find(item => normalizar(item.AOI_ID) === normalizar(aoiId)) || null;
  }

  function obtenerExperimentSetting(location) {
    if (!location) return null;
    return (settingsEmbebidos.experimentSettings || []).find(item =>
      normalizar(item.Season) === normalizar(location.Season) &&
      normalizar(item.Crop) === normalizar(location.Crop) &&
      normalizar(item.Config) === normalizar(location.Config)
    ) || null;
  }

  function completarSelectorAoi() {
    const existentes = new Set([...selectorAoi.options].map(option => option.value).filter(Boolean));
    (settingsEmbebidos.locationSettings || []).forEach(item => {
      const aoiId = String(item.AOI_ID || "").trim();
      if (!aoiId || existentes.has(aoiId)) return;
      const option = document.createElement("option");
      option.value = aoiId;
      option.textContent = `${aoiId} · ${item.Location || ""}`;
      selectorAoi.appendChild(option);
      existentes.add(aoiId);
    });
  }

  const datosDemo = {
    ANCY04NMETAT: {
      season: "2026-27",
      aoiId: "ANCY04NMETAT",
      location: "Metan",
      crop: "Soybean",

      status: "LAB DATA",

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

  function crearFila(
    etiqueta,
    valor
  ) {
    return `
      <div style="
        display:flex;
        justify-content:space-between;
        gap:15px;
        padding:8px 0;
        border-bottom:1px solid #edf2ef;
      ">
        <span style="
          color:#6c7a72;
          font-size:12px;
        ">
          ${etiqueta}
        </span>

        <strong style="
          color:#26352d;
          font-size:12px;
          text-align:right;
        ">
          ${valor}
        </strong>
      </div>
    `;
  }

  function crearPlantingSetupHTML(aoiId) {
    const loc = obtenerLocationSetting(aoiId);
    const exp = obtenerExperimentSetting(loc);

    if (!loc) {
      return `
        <span class="section-label">PLANTING SETUP</span>
        <p style="margin:6px 0 0;color:#6c7a72;font-size:12px;">Sin settings cargados para esta AOI.</p>
      `;
    }

    return `
      <span class="section-label">PLANTING SETUP</span>
      <h3 style="margin:5px 0 10px;">${loc.Config || "-"}</h3>
      <div style="margin-bottom:10px;padding:7px 8px;border-radius:7px;background:#e7f5ec;color:#0b6b3a;font-size:10px;font-weight:900;">SETUP REAL · DEV</div>
      ${crearFila("Seeds / row", exp?.SeedsPerRow ?? "-")}
      ${crearFila("Target density", exp?.TargetDensity ?? "-")}
      ${crearFila("Trip horn", exp?.TripHorn ?? "-")}
      ${crearFila("Splitter", exp?.Splitter ?? "-")}
      ${crearFila("Machine config", exp?.MachineConfig ?? "-")}
      ${crearFila("Extra seeds", exp?.ExtraSeeds ?? "-")}
      ${crearFila("Seed min clams", exp?.SeedMinClams ?? "-")}
      ${crearFila("Recommendation", exp?.Recommendation ?? "-")}
    `;
  }

  function crearLocationSetupHTML(aoiId) {
    const loc = obtenerLocationSetting(aoiId);
    if (!loc) return "";
    return `
      <span class="section-label">LOCATION SETUP</span>
      ${crearFila("Area", loc.AreaHa == null ? "-" : `${loc.AreaHa} ha`)}
      ${crearFila("Urea", loc.UreaKgHa == null ? "-" : `${loc.UreaKgHa} kg/ha`)}
      ${crearFila("Microstar", loc.MicrostarKgHa == null ? "-" : `${loc.MicrostarKgHa} kg/ha`)}
      ${crearFila("Microstar bags", loc.MicrostarBags ?? "-")}
    `;
  }

  const estadosEjecucion = {
    Normal: { simbolo: "✓", color: "#178047", fondo: "#e9f7ef" },
    Refilled: { simbolo: "R", color: "#995c00", fondo: "#fff3d6" },
    Lost: { simbolo: "X", color: "#8b2d2d", fondo: "#fdeaea" },
    Shifted: { simbolo: "↔", color: "#315d91", fondo: "#eaf2fb" },
    Observation: { simbolo: "!", color: "#674d9b", fondo: "#f2edfb" }
  };

  function claveEvento(aoiId, range, column) {
    return `${aoiId}|${range}|${column}`;
  }

  function claveStorage(aoiId) {
    return `fieldBookLabEvents:${aoiId}`;
  }

  function leerEventos(aoiId) {
    try {
      return JSON.parse(localStorage.getItem(claveStorage(aoiId)) || "{}");
    } catch (error) {
      console.warn("Field Book: no se pudieron leer eventos locales", error);
      return {};
    }
  }

  function guardarEvento(aoiId, range, column, status, comment) {
    const eventos = leerEventos(aoiId);
    const key = claveEvento(aoiId, range, column);
    if (!status || status === "Normal") {
      if (status === "Normal" && String(comment || "").trim()) {
        eventos[key] = { status: "Normal", comment: String(comment || "").trim(), updatedAt: new Date().toISOString() };
      } else {
        delete eventos[key];
      }
    } else {
      eventos[key] = { status, comment: String(comment || "").trim(), updatedAt: new Date().toISOString() };
    }
    localStorage.setItem(claveStorage(aoiId), JSON.stringify(eventos));
  }

  function aplicarMarcaBoton(boton, evento) {
    boton.querySelector(".field-book-status-mark")?.remove();
    boton.style.position = "relative";
    if (!evento?.status) return;
    const cfg = estadosEjecucion[evento.status];
    if (!cfg) return;
    const marca = document.createElement("span");
    marca.className = "field-book-status-mark";
    marca.textContent = cfg.simbolo;
    marca.style.cssText = `position:absolute;right:1px;top:1px;min-width:11px;height:11px;padding:0 1px;border-radius:3px;background:${cfg.fondo};color:${cfg.color};font-size:8px;line-height:11px;font-weight:900;text-align:center;border:1px solid ${cfg.color}55;`;
    boton.appendChild(marca);
  }

  function crearEjecucionHTML(aoiId, plot) {
    if (!plot) return "";
    const evento = leerEventos(aoiId)[claveEvento(aoiId, plot.range, plot.column)] || {};
    const actual = evento.status || "Normal";
    const botones = Object.keys(estadosEjecucion).map(status => {
      const cfg = estadosEjecucion[status];
      const activo = status === actual;
      return `<button type="button" class="field-book-exec-status" data-status="${status}" style="padding:7px 8px;border:1px solid ${activo ? cfg.color : '#d4ded8'};border-radius:7px;background:${activo ? cfg.fondo : '#fff'};color:${activo ? cfg.color : '#536159'};font-size:10px;font-weight:900;cursor:pointer;white-space:nowrap">${cfg.simbolo} ${status}</button>`;
    }).join("");
    return `
      <div id="fieldBookExecution" style="margin-top:12px;padding-top:11px;border-top:1px solid #dce6e0">
        <span class="section-label">PLANTING EXECUTION · LAB</span>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin:7px 0 9px">${botones}</div>
        <textarea id="fieldBookExecutionComment" rows="3" placeholder="Comentario de ejecución..." style="width:100%;box-sizing:border-box;resize:vertical;padding:8px;border:1px solid #c7d4cc;border-radius:7px;font:inherit;font-size:11px">${evento.comment || ""}</textarea>
        <button id="fieldBookSaveExecution" type="button" style="width:100%;margin-top:7px;padding:8px;border:0;border-radius:7px;background:#0b6b3a;color:#fff;font-weight:900;font-size:11px;cursor:pointer">GUARDAR EN LAB</button>
        <div id="fieldBookExecutionMsg" style="margin-top:5px;color:#6c7a72;font-size:9px">Guardado local en este navegador. No sincroniza con SharePoint.</div>
      </div>`;
  }

  function renderizarAoi(
    aoiId
  ) {
    const layoutReal = layoutsEmbebidos[aoiId] || null;
    const datos = datosDemo[aoiId];

    if (layoutReal && Array.isArray(layoutReal.plots)) {
      const layout = layoutReal.layout || {};
      const experimentos = layoutReal.experiments || [];
      const colores = ["#dff3e7","#e5ecff","#fff0d8","#f3e4ff","#dff4f7","#ffe3e3","#edf1d4","#f6e8cf","#e8e8ff"];
      const colorPorExperimento = new Map(experimentos.map((exp, i) => [exp.name, (exp.type === "BUFFER" || String(exp.name || "").toLowerCase() === "buffer") ? "#e2e5e3" : colores[i % colores.length]]));
      const porCoord = new Map(layoutReal.plots.map(plot => [`${plot.range}|${plot.column}`, plot]));
      const columnas = [];
      for (let c = layout.columnMin; c <= layout.columnMax; c++) columnas.push(c);
      const ranges = [];
      for (let r = layout.rangeMax; r >= layout.rangeMin; r--) ranges.push(r);
      const header = columnas.map(c => `<div style="width:44px;min-width:44px;text-align:center;font-size:9px;font-weight:800;color:#6c7a72">${c}</div>`).join("");
      const filas = ranges.map(r => `<div style="display:flex;gap:3px;margin-bottom:3px;align-items:center"><div style="position:sticky;left:0;z-index:2;width:38px;min-width:38px;text-align:center;background:#eef6f1;color:#174c31;font-size:10px;font-weight:900;padding:9px 0;border-radius:5px">R${r}</div>${columnas.map(c => { const plot=porCoord.get(`${r}|${c}`); if(!plot) return `<div style="width:44px;min-width:44px;height:28px;border:1px dashed #e2e9e5;border-radius:4px"></div>`; const esBuffer = plot.type === "BUFFER" || String(plot.experimentName || "").toLowerCase() === "buffer"; const color = esBuffer ? "#e2e5e3" : (colorPorExperimento.get(plot.experimentName)||"#e7ece9"); return `<button class="field-book-real-plot" data-range="${r}" data-column="${c}" type="button" style="width:44px;min-width:44px;height:28px;border:1px solid #bfcac3;border-radius:4px;background:${color};font-size:8px;font-weight:800;cursor:pointer;white-space:nowrap">${r}-${c}</button>`; }).join("")}</div>`).join("");
      contenido.innerHTML = `<div style="padding:18px"><div style="display:flex;justify-content:space-between;gap:15px;margin-bottom:14px"><div><span class="section-label">AOI</span><h2 style="margin:0;color:#174c31">${aoiId}</h2><div style="margin-top:5px;color:#6c7a72;font-size:12px">${layoutReal.trial?.year || "-"} · Season ${layoutReal.trial?.season || "-"}</div></div><span style="padding:6px 9px;border-radius:999px;background:#e7f5ec;color:#0b6b3a;font-size:10px;font-weight:900;height:max-content">REAL LAYOUT · READ ONLY</span></div><div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(240px,320px);gap:16px"><section style="min-width:0;padding:15px;border:1px solid #d9e3dd;border-radius:11px;background:#f8fbf9"><span class="section-label">LAYOUT</span><h3 style="margin:5px 0">Plano interactivo</h3><p style="color:#6c7a72;font-size:12px">Range ${layout.rangeMin}-${layout.rangeMax} · Column ${layout.columnMin}-${layout.columnMax} · ${layout.plotRecordCount} parcelas · ${experimentos.length} experimentos</p><div style="overflow:auto;max-height:68vh;padding:8px;border:1px solid #d9e3dd;border-radius:9px;background:#fff"><div style="display:flex;gap:3px;margin:0 0 5px 41px;width:max-content">${header}</div><div style="width:max-content">${filas}</div></div></section><aside style="padding:15px;border:1px solid #d9e3dd;border-radius:11px;background:#fff;max-height:76vh;overflow:auto">
            <section style="padding:12px;border:1px solid #bfd4c7;border-radius:9px;background:#f8fbf9">
              <span class="section-label">PLOT DETAIL</span>
              <div id="fieldBookRealDetail" style="margin-top:8px;color:#6c7a72;font-size:12px">Tocá una parcela para ver sus datos.</div>
            </section>
            <div style="height:1px;background:#e4ebe7;margin:16px 0"></div>
            <section>${crearPlantingSetupHTML(aoiId)}</section>
            <div style="height:1px;background:#e4ebe7;margin:16px 0"></div>
            <section>${crearLocationSetupHTML(aoiId)}</section>
          </aside></div></div>`;
      const eventosIniciales = leerEventos(aoiId);
      contenido.querySelectorAll(".field-book-real-plot").forEach(btn => {
        const plotInicial = porCoord.get(`${btn.dataset.range}|${btn.dataset.column}`);
        if (plotInicial) aplicarMarcaBoton(btn, eventosIniciales[claveEvento(aoiId, plotInicial.range, plotInicial.column)]);

        btn.addEventListener("click", () => {
          const plot = porCoord.get(`${btn.dataset.range}|${btn.dataset.column}`);
          const d = document.getElementById("fieldBookRealDetail");
          if (!d || !plot) return;

          contenido.querySelectorAll(".field-book-real-plot").forEach(actual => {
            actual.style.outline = "none";
            actual.style.outlineOffset = "0";
          });
          btn.style.outline = "3px solid #0b6b3a";
          btn.style.outlineOffset = "1px";

          d.innerHTML = `<strong style="color:#174c31">Range ${plot.range} · Column ${plot.column}</strong><div style="margin-top:9px;line-height:1.6"><b>Experiment:</b> ${plot.experimentName || "-"}<br><b>Germplasm:</b> ${plot.germplasmName || "-"}<br><b>Germplasm ID:</b> ${plot.germplasmId ?? "-"}<br><b>EU ID:</b> ${plot.euId ?? "-"}<br><b>EUDQ:</b> ${plot.eudq || "-"}<br><b>Rep:</b> ${plot.rep ?? "-"}<br><b>Comment:</b> ${plot.entryComment || "-"}</div>${crearEjecucionHTML(aoiId, plot)}`;

          let statusSeleccionado = leerEventos(aoiId)[claveEvento(aoiId, plot.range, plot.column)]?.status || "Normal";
          d.querySelectorAll(".field-book-exec-status").forEach(statusBtn => {
            statusBtn.addEventListener("click", () => {
              statusSeleccionado = statusBtn.dataset.status;
              const cfg = estadosEjecucion[statusSeleccionado];
              d.querySelectorAll(".field-book-exec-status").forEach(b => {
                const c = estadosEjecucion[b.dataset.status];
                const activo = b.dataset.status === statusSeleccionado;
                b.style.borderColor = activo ? c.color : "#d4ded8";
                b.style.background = activo ? c.fondo : "#fff";
                b.style.color = activo ? c.color : "#536159";
              });
            });
          });

          d.querySelector("#fieldBookSaveExecution")?.addEventListener("click", () => {
            const comment = d.querySelector("#fieldBookExecutionComment")?.value || "";
            guardarEvento(aoiId, plot.range, plot.column, statusSeleccionado, comment);
            const evento = leerEventos(aoiId)[claveEvento(aoiId, plot.range, plot.column)];
            aplicarMarcaBoton(btn, evento);
            const msg = d.querySelector("#fieldBookExecutionMsg");
            if (msg) {
              msg.textContent = "✓ Guardado localmente en LAB";
              msg.style.color = "#0b6b3a";
              msg.style.fontWeight = "800";
            }
          });
        });
      });
      return;
    }

    const locationSetting = obtenerLocationSetting(aoiId);
    const experimentSetting = obtenerExperimentSetting(locationSetting);

    if (!layoutReal && locationSetting) {
      const loc = locationSetting;
      const exp = experimentSetting;
      contenido.innerHTML = `
        <div style="padding:18px">
          <div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:16px">
            <div><span class="section-label">AOI</span><h2 style="margin:0;color:#174c31">${aoiId}</h2><div style="margin-top:5px;color:#6c7a72;font-size:12px">${loc.Location || "-"} · ${loc.Crop || "-"} · ${loc.Season || "-"}</div></div>
            <span style="padding:6px 9px;border-radius:999px;background:#fff7df;color:#775900;font-size:10px;font-weight:900;height:max-content">SETTINGS REAL · LAYOUT PENDING</span>
          </div>
          <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,340px);gap:16px">
            <section style="min-height:330px;padding:15px;border:1px solid #d9e3dd;border-radius:11px;background:#f8fbf9">
              <span class="section-label">LAYOUT</span><h3 style="margin:5px 0 8px">Plano pendiente</h3><p style="color:#6c7a72;font-size:12px">Todavía no se cargó el export de plano para ${aoiId}.</p>
            </section>
            <aside style="padding:15px;border:1px solid #d9e3dd;border-radius:11px;background:#fff">
              <span class="section-label">PLANTING SETUP</span><h3 style="margin:5px 0 10px">${loc.Config || "-"}</h3>
              <div style="margin-bottom:10px;padding:7px 8px;border-radius:7px;background:#e7f5ec;color:#0b6b3a;font-size:10px;font-weight:900">SETUP REAL · DEV</div>
              ${crearFila("Seeds / row", exp?.SeedsPerRow)}
              ${crearFila("Target density", exp?.TargetDensity)}
              ${crearFila("Trip horn", exp?.TripHorn)}
              ${crearFila("Splitter", exp?.Splitter)}
              ${crearFila("Machine config", exp?.MachineConfig)}
              ${crearFila("Extra seeds", exp?.ExtraSeeds)}
              ${crearFila("Seed min clams", exp?.SeedMinClams)}
              ${crearFila("Recommendation", exp?.Recommendation)}
              <div style="margin-top:14px"><span class="section-label">LOCATION SETUP</span>
                ${crearFila("Area", loc.AreaHa == null ? null : `${loc.AreaHa} ha`)}
                ${crearFila("Urea", loc.UreaKgHa == null ? null : `${loc.UreaKgHa} kg/ha`)}
                ${crearFila("Microstar", loc.MicrostarKgHa == null ? null : `${loc.MicrostarKgHa} kg/ha`)}
                ${crearFila("Microstar bags", loc.MicrostarBags)}
              </div>
            </aside>
          </div>
        </div>`;
      return;
    }

    if (!datos) {
      contenido.innerHTML = `
        <div class="empty-state">
          <strong>
            Field Book no disponible
          </strong>

          <span>
            No existen datos LAB
            para esta AOI.
          </span>
        </div>
      `;

      return;
    }

    contenido.innerHTML = `
      <div style="
        padding:18px;
      ">

        <div style="
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:18px;
          margin-bottom:18px;
        ">

          <div>

            <span class="section-label">
              AOI
            </span>

            <h2 style="
              margin:0;
              color:#174c31;
              font-size:21px;
            ">
              ${datos.aoiId}
            </h2>

            <div style="
              margin-top:6px;
              color:#6c7a72;
              font-size:12px;
            ">
              ${datos.location}
              ·
              ${datos.crop}
              ·
              ${datos.season}
            </div>

          </div>

          <span style="
            padding:6px 9px;
            border-radius:999px;
            background:#f1edff;
            color:#5a3cc6;
            font-size:10px;
            font-weight:900;
          ">
            ${datos.status}
          </span>

        </div>

        <div style="
          display:grid;
          grid-template-columns:
            minmax(0, 1fr)
            minmax(230px, 320px);
          gap:16px;
        ">

          <section style="
            min-height:330px;
            padding:15px;
            border:1px solid #d9e3dd;
            border-radius:11px;
            background:#f8fbf9;
          ">

            <span class="section-label">
              LAYOUT
            </span>

            <h3 style="
              margin:5px 0 8px;
            ">
              Plano interactivo
            </h3>

            <p style="
              color:#6c7a72;
              font-size:12px;
            ">
              En el próximo paso vamos
              a generar aquí el plano
              desde Range + Plot.
            </p>

            <div style="
              min-height:220px;
              display:flex;
              align-items:center;
              justify-content:center;
              border:1px dashed #b8c7be;
              border-radius:9px;
              color:#708078;
              font-size:12px;
            ">
              Área reservada para
              el plano
            </div>

          </section>

          <aside style="
            padding:15px;
            border:1px solid #d9e3dd;
            border-radius:11px;
            background:#fff;
          ">

            <span class="section-label">
              PLANTING SETUP
            </span>

            <h3 style="
              margin:5px 0 10px;
            ">
              ${datos.settings.experiment}
            </h3>

            ${crearFila(
              "Seeds / row",
              datos.settings.seedsPerRow
            )}

            ${crearFila(
              "Target density",
              datos.settings.targetDensity
            )}

            ${crearFila(
              "Trip horn",
              datos.settings.tripHorn
            )}

            ${crearFila(
              "Splitter",
              datos.settings.splitter
            )}

            ${crearFila(
              "Machine config",
              datos.settings.machineConfig
            )}

            ${crearFila(
              "Extra seeds",
              datos.settings.extraSeeds
            )}

            ${crearFila(
              "Recommendation",
              datos.settings.recommendation
            )}

          </aside>

        </div>

      </div>
    `;
  }

  completarSelectorAoi();

  selectorAoi.addEventListener(
    "change",
    function () {
      const aoiId =
        selectorAoi.value;

      if (!aoiId) {
        contenido.innerHTML = `
          <div class="empty-state">

            <strong>
              Field Book Lab
            </strong>

            <span>
              Seleccioná una AOI
              para comenzar.
            </span>

          </div>
        `;

        return;
      }

      renderizarAoi(
        aoiId
      );
    }
  );

})();
