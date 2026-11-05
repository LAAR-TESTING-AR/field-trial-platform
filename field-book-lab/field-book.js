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
    Refilled: { simbolo: "R", color: "#995c00", fondo: "#fff3d6" },
    Lost: { simbolo: "X", color: "#8b2d2d", fondo: "#fdeaea" },
    Observation: { simbolo: "!", color: "#674d9b", fondo: "#f2edfb" }
  };

  const shiftConfig = {
    simbolo: "↕",
    color: "#315d91",
    fondo: "#eaf2fb"
  };

  function simboloShift(offset) {
    return Number(offset) > 0 ? "↑" : "↓";
  }

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
    if (!status) delete eventos[key];
    else eventos[key] = { status, comment: String(comment || "").trim(), updatedAt: new Date().toISOString() };
    localStorage.setItem(claveStorage(aoiId), JSON.stringify(eventos));
  }

  function restaurarNormal(aoiId, range, column) {
    guardarEvento(aoiId, range, column, "", "");
  }

  function claveShiftStorage(aoiId) {
    return `fieldBookLabBlockShifts:${aoiId}`;
  }

  function leerBlockShifts(aoiId) {
    try { return JSON.parse(localStorage.getItem(claveShiftStorage(aoiId)) || "[]"); }
    catch (error) { return []; }
  }

  function guardarBlockShifts(aoiId, shifts) {
    localStorage.setItem(claveShiftStorage(aoiId), JSON.stringify(shifts));
  }

  function shiftParaPlot(aoiId, range, column) {
    return leerBlockShifts(aoiId).find(shift => {
      const desde = Math.min(Number(shift.startRange), Number(shift.endRange));
      const hasta = Math.max(Number(shift.startRange), Number(shift.endRange));
      return (
        Number(shift.column) === Number(column) &&
        Number(range) >= desde &&
        Number(range) <= hasta
      );
    }) || null;
  }

  function eliminarShift(aoiId, shiftId) {
    guardarBlockShifts(aoiId, leerBlockShifts(aoiId).filter(item => item.id !== shiftId));
  }

  function aplicarMarcaBoton(boton, evento) {
    boton.querySelector(".field-book-status-mark")?.remove();
    boton.style.position = "relative";
    if (!evento?.status) return;
    const cfg = evento.status === "Shifted" ? shiftConfig : estadosEjecucion[evento.status];
    if (!cfg) return;
    const marca = document.createElement("span");
    marca.className = "field-book-status-mark";
    marca.textContent = evento.status === "Shifted"
      ? simboloShift(evento.offset)
      : cfg.simbolo;
    marca.style.cssText = `position:absolute;right:1px;top:1px;min-width:11px;height:11px;padding:0 1px;border-radius:3px;background:${cfg.fondo};color:${cfg.color};font-size:8px;line-height:11px;font-weight:900;text-align:center;border:1px solid ${cfg.color}55;`;
    boton.appendChild(marca);
  }

  function crearEjecucionHTML(aoiId, plot, layout) {
    if (!plot) return "";
    if ((leerVisit(aoiId).status || "Not started") === "Completed") {
      const evento = leerEventos(aoiId)[claveEvento(aoiId, plot.range, plot.column)] || {};
      const shift = shiftParaPlot(aoiId, plot.range, plot.column);
      const estado = evento.status || (shift ? `Shifted ${shift.offset > 0 ? "+" : ""}${shift.offset}` : "Normal");
      const comentario = evento.comment || shift?.comment || "-";
      return `<div style="margin-top:12px;padding:10px;border-top:1px solid #dce6e0;background:#f7faf8;border-radius:7px"><span class="section-label">PLANTING EXECUTION · READ ONLY</span><div style="margin-top:6px;color:#536159;font-size:10px"><b>Status:</b> ${estado}<br><b>Comment:</b> ${comentario}</div></div>`;
    }
    const evento = leerEventos(aoiId)[claveEvento(aoiId, plot.range, plot.column)] || {};
    const shift = shiftParaPlot(aoiId, plot.range, plot.column);
    const actualRange = shift ? Number(plot.range) + Number(shift.offset) : Number(plot.range);
    const actualColumn = Number(plot.column);
    const fuera = shift && (actualRange < Number(layout.rangeMin) || actualRange > Number(layout.rangeMax));
    const botones = Object.keys(estadosEjecucion).map(status => {
      const cfg = estadosEjecucion[status];
      const activo = status === evento.status;
      return `<button type="button" class="field-book-exec-status" data-status="${status}" style="padding:7px 8px;border:1px solid ${activo ? cfg.color : '#d4ded8'};border-radius:7px;background:${activo ? cfg.fondo : '#fff'};color:${activo ? cfg.color : '#536159'};font-size:10px;font-weight:900;cursor:pointer;white-space:nowrap">${cfg.simbolo} ${status}</button>`;
    }).join("");
    const restore = evento.status ? `<button id="fieldBookRestoreNormal" type="button" style="width:100%;margin-top:7px;padding:7px;border:1px solid #c7d4cc;border-radius:7px;background:#fff;color:#536159;font-weight:800;font-size:10px;cursor:pointer">↺ RESTORE TO NORMAL</button>` : "";
    const shiftInfo = shift ? `<div style="margin:8px 0;padding:8px;border-radius:7px;background:${shiftConfig.fondo};color:${shiftConfig.color};font-size:10px"><b>${simboloShift(shift.offset)} BLOCK SHIFT ${shift.offset > 0 ? '+' : ''}${shift.offset}</b><br>Planned: ${plot.range}-${plot.column}<br>Actual: ${actualRange}-${actualColumn}${fuera ? '<br><b>⚠ Outside planned layout</b>' : ''}<br>Range ${shift.startRange}-${shift.endRange} · Column ${shift.column}</div><button id="fieldBookRemoveShift" data-shift-id="${shift.id}" type="button" style="width:100%;padding:7px;border:1px solid #9fb8d5;border-radius:7px;background:#fff;color:#315d91;font-weight:800;font-size:10px;cursor:pointer">↺ REMOVE BLOCK SHIFT</button>` : "";
    return `
      <div id="fieldBookExecution" style="margin-top:12px;padding-top:11px;border-top:1px solid #dce6e0">
        <span class="section-label">PLANTING EXECUTION · LAB</span>
        <div style="margin-top:6px;color:#6c7a72;font-size:10px">${evento.status ? `Current issue: <b>${evento.status}</b>` : "No issues registered · Normal by default"}</div>
        ${shiftInfo}
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin:8px 0 9px">${botones}<button type="button" id="fieldBookShiftBlock" style="padding:7px 8px;border:1px solid ${shiftConfig.color};border-radius:7px;background:#fff;color:${shiftConfig.color};font-size:10px;font-weight:900;cursor:pointer">SHIFT BLOCK</button></div>
        <textarea id="fieldBookExecutionComment" rows="3" placeholder="Comentario de ejecución..." style="width:100%;box-sizing:border-box;resize:vertical;padding:8px;border:1px solid #c7d4cc;border-radius:7px;font:inherit;font-size:11px">${evento.comment || ""}</textarea>
        <button id="fieldBookSaveExecution" type="button" style="width:100%;margin-top:7px;padding:8px;border:0;border-radius:7px;background:#0b6b3a;color:#fff;font-weight:900;font-size:11px;cursor:pointer">GUARDAR INCIDENCIA</button>
        ${restore}
        <div id="fieldBookExecutionMsg" style="margin-top:5px;color:#6c7a72;font-size:9px">Solo se guardan excepciones. Normal no genera registro.</div>
      </div>`;
  }

  function abrirShiftBlock(aoiId, plot, layout, porCoord, refrescar) {
    document.getElementById("fieldBookShiftModal")?.remove();
    const maxInColumn = Math.max(...[...porCoord.values()].filter(p => Number(p.column) === Number(plot.column)).map(p => Number(p.range)));
    const minInColumn = Math.min(...[...porCoord.values()].filter(p => Number(p.column) === Number(plot.column)).map(p => Number(p.range)));
    const overlay = document.createElement("div");
    overlay.id = "fieldBookShiftModal";
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.42);display:flex;align-items:center;justify-content:center;padding:16px";
    overlay.innerHTML = `<div style="width:min(500px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:14px;padding:16px;box-shadow:0 20px 55px rgba(0,0,0,.28)">
      <span class="section-label">SHIFT BLOCK · LAB</span><h3 style="margin:5px 0 4px">Column ${plot.column} · From Range ${plot.range}</h3>
      <p style="margin:0 0 12px;color:#6c7a72;font-size:11px">Desplaza esta parcela y todas las siguientes de la misma columna.</p>
      <label style="font-size:10px;font-weight:800;color:#536159">DIRECTION / OFFSET</label>
      <select id="fieldBookShiftOffset" style="width:100%;margin:5px 0 10px;padding:8px;border:1px solid #c7d4cc;border-radius:7px"><option value="1">↑ +1 Range</option><option value="-1">↓ -1 Range</option><option value="2">↑ +2 Ranges</option><option value="-2">↓ -2 Ranges</option></select>
      <div id="fieldBookShiftPreview" style="padding:10px;background:#f7faf8;border:1px solid #d9e3dd;border-radius:8px;font-size:10px;line-height:1.55"></div>
      <textarea id="fieldBookShiftComment" rows="3" placeholder="Comentario del salto..." style="width:100%;box-sizing:border-box;margin-top:10px;padding:8px;border:1px solid #c7d4cc;border-radius:7px"></textarea>
      <div style="display:flex;gap:7px;margin-top:10px"><button id="fieldBookShiftCancel" style="flex:1;padding:8px;border:1px solid #c7d4cc;border-radius:7px;background:#fff;font-weight:800">CANCEL</button><button id="fieldBookShiftApply" style="flex:1;padding:8px;border:0;border-radius:7px;background:#315d91;color:#fff;font-weight:900">APPLY SHIFT</button></div>
    </div>`;
    document.body.appendChild(overlay);
    const offsetEl = overlay.querySelector("#fieldBookShiftOffset");
    const preview = () => {
      const offset = Number(offsetEl.value);
      const endRange = offset > 0 ? maxInColumn : minInColumn;
      const start = Number(plot.range);
      const affected = [...porCoord.values()].filter(p => Number(p.column)===Number(plot.column) && (offset > 0 ? Number(p.range)>=start : Number(p.range)<=start)).sort((a,b)=>Number(a.range)-Number(b.range));
      const lines = affected.map(p => { const to=Number(p.range)+offset; const out=to<Number(layout.rangeMin)||to>Number(layout.rangeMax); return `${p.range}-${p.column} → ${to}-${p.column}${out?' ⚠ outside layout':''}`; });
      previewEl.innerHTML = `<b>${simboloShift(offset)} ${affected.length} parcelas afectadas · ${offset > 0 ? '+' : ''}${offset}</b><br>${lines.join('<br>')}`;
      overlay.dataset.endRange=String(endRange);
      overlay.dataset.affected=String(affected.length);
    };
    const previewEl=overlay.querySelector("#fieldBookShiftPreview");
    offsetEl.addEventListener("change",preview); preview();
    overlay.querySelector("#fieldBookShiftCancel").onclick=()=>overlay.remove();
    overlay.querySelector("#fieldBookShiftApply").onclick=()=>{
      const offset=Number(offsetEl.value); const shifts=leerBlockShifts(aoiId);
      shifts.push({id:`shift-${Date.now()}`,column:Number(plot.column),startRange:Number(plot.range),endRange:Number(overlay.dataset.endRange),offset,comment:overlay.querySelector("#fieldBookShiftComment").value.trim(),createdAt:new Date().toISOString()});
      guardarBlockShifts(aoiId,shifts); overlay.remove(); refrescar();
    };
  }

  const checklistTemplate = [
    { id:"PRE_COORD", section:"Antes de sembrar", label:"Coordenadas verificadas" },
    { id:"PRE_MAP", section:"Antes de sembrar", label:"Plano de localidad disponible" },
    { id:"PRE_DIM", section:"Antes de sembrar", label:"Largo y ancho verificados" },
    { id:"PRE_LOT", section:"Antes de sembrar", label:"Lote / cuadra confirmados" },
    { id:"PRE_EPP", section:"Antes de sembrar", label:"EPP completo" },
    { id:"PRE_STAKES", section:"Antes de sembrar", label:"Estacas colocadas" },
    { id:"CFG_SLIP", section:"Configuración", label:"Patinamiento de sembradora controlado" },
    { id:"CFG_FERT", section:"Configuración", label:"Estado y dosis de fertilizante verificados" },
    { id:"CFG_SENSOR", section:"Configuración", label:"Sensores verificados" },
    { id:"CFG_DENS", section:"Configuración", label:"Densidad por configuración verificada" },
    { id:"CFG_SPLIT", section:"Configuración", label:"Splitter / bloqueo verificado" },
    { id:"CFG_DEPTH", section:"Configuración", label:"Profundidad de siembra verificada" },
    { id:"CLS_STREETS", section:"Ejecución y cierre", label:"Calles verificadas" },
    { id:"CLS_FLAGS", section:"Ejecución y cierre", label:"Banderas y carteles colocados" },
    { id:"CLS_LAYOUT", section:"Ejecución y cierre", label:"Plano final revisado" },
    { id:"CLS_ISSUES", section:"Ejecución y cierre", label:"Incidencias registradas" }
  ];

  function claveChecklistStorage(aoiId) { return `fieldBookLabChecklist:${aoiId}`; }
  function leerChecklist(aoiId) {
    try { return JSON.parse(localStorage.getItem(claveChecklistStorage(aoiId)) || "{}"); }
    catch (error) { return {}; }
  }
  function guardarChecklist(aoiId, respuestas) {
    localStorage.setItem(claveChecklistStorage(aoiId), JSON.stringify(respuestas));
  }
  function claveVisitStorage(aoiId) { return `fieldBookLabVisit:${aoiId}`; }
  function leerVisit(aoiId) {
    try { return JSON.parse(localStorage.getItem(claveVisitStorage(aoiId)) || "{}"); }
    catch (error) { return {}; }
  }
  function guardarVisit(aoiId, visit) {
    localStorage.setItem(claveVisitStorage(aoiId), JSON.stringify(visit));
  }

  function metricasChecklist(aoiId) {
    const respuestas = leerChecklist(aoiId);
    const valores = checklistTemplate.map(item => respuestas[item.id]?.status || "Pending");
    return {
      total: checklistTemplate.length,
      completed: valores.filter(x => x && x !== "Pending").length,
      ok: valores.filter(x => x === "OK").length,
      observations: valores.filter(x => x === "Observation").length,
      problems: valores.filter(x => x === "Problem").length,
      na: valores.filter(x => x === "N/A").length,
      pending: valores.filter(x => x === "Pending").length
    };
  }

  function metricasIssues(aoiId) {
    const eventos = Object.values(leerEventos(aoiId));
    const shifts = leerBlockShifts(aoiId);
    return {
      refilled: eventos.filter(x => x.status === "Refilled").length,
      lost: eventos.filter(x => x.status === "Lost").length,
      observations: eventos.filter(x => x.status === "Observation").length,
      shifts: shifts.length,
      total: eventos.length + shifts.length
    };
  }

  function crearOverviewHTML(aoiId, layout) {
    const loc = obtenerLocationSetting(aoiId) || {};
    const exp = obtenerExperimentSetting(loc) || {};
    const visit = leerVisit(aoiId);
    const checklist = metricasChecklist(aoiId);
    const issues = metricasIssues(aoiId);
    const status = visit.status || "Not started";
    const statusColor = status === "Completed" ? "#0b6b3a" : status === "In progress" ? "#995c00" : "#6c7a72";
    const fila = (label,value) => `<div style="display:flex;justify-content:space-between;gap:16px;padding:7px 0;border-bottom:1px solid #edf2ef"><span style="color:#6c7a72;font-size:10px">${label}</span><strong style="color:#34473c;font-size:10px;text-align:right">${value ?? "-"}</strong></div>`;
    return `
      <section>
        <div style="padding:16px;border:1px solid #d9e3dd;border-radius:11px;background:#f8fbf9">
          <div style="display:flex;justify-content:space-between;gap:15px;align-items:flex-start;flex-wrap:wrap">
            <div><span class="section-label">FIELD BOOK OVERVIEW</span><h3 style="margin:5px 0 3px">${loc.Location || aoiId}</h3><div style="color:#6c7a72;font-size:11px">${aoiId} · ${loc.Config || "-"} · ${loc.Crop || "-"}</div></div>
            <span style="padding:7px 10px;border-radius:999px;background:#fff;color:${statusColor};border:1px solid ${statusColor}55;font-size:10px;font-weight:900">${status.toUpperCase()}</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,minmax(130px,1fr));gap:9px;margin-top:14px">
            <div style="padding:13px;border:1px solid #d9e3dd;border-radius:10px;background:#fff"><span style="font-size:9px;color:#6c7a72;font-weight:900">PLOTS</span><strong style="display:block;margin-top:4px;font-size:23px">${layout.plotRecordCount || 0}</strong></div>
            <div style="padding:13px;border:1px solid #d9e3dd;border-radius:10px;background:#fff"><span style="font-size:9px;color:#6c7a72;font-weight:900">BUFFER</span><strong style="display:block;margin-top:4px;font-size:23px">${layout.bufferCount || 0}</strong></div>
            <div style="padding:13px;border:1px solid #d9e3dd;border-radius:10px;background:#fff"><span style="font-size:9px;color:#6c7a72;font-weight:900">ISSUES</span><strong style="display:block;margin-top:4px;font-size:23px">${issues.total}</strong></div>
            <div style="padding:13px;border:1px solid #d9e3dd;border-radius:10px;background:#fff"><span style="font-size:9px;color:#6c7a72;font-weight:900">CHECKLIST</span><strong style="display:block;margin-top:4px;font-size:23px">${checklist.completed}/${checklist.total}</strong></div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px">
          <section style="padding:15px;border:1px solid #d9e3dd;border-radius:11px;background:#fff"><span class="section-label">PLANTING SETUP</span><h3 style="margin:5px 0 10px">${loc.Config || "-"}</h3>${fila("Seeds / row",exp.SeedsPerRow)}${fila("Target density",exp.TargetDensity)}${fila("Trip horn",exp.TripHorn)}${fila("Splitter",exp.Splitter)}${fila("Machine config",exp.MachineConfig)}${fila("Extra seeds",exp.ExtraSeeds)}${fila("Seed min clams",exp.SeedMinClams)}${fila("Recommendation",exp.Recommendation)}</section>
          <section style="padding:15px;border:1px solid #d9e3dd;border-radius:11px;background:#fff"><span class="section-label">LOCATION SETUP</span><h3 style="margin:5px 0 10px">${loc.Location || "-"}</h3>${fila("Area",loc.AreaHa==null?"-":`${loc.AreaHa} ha`)}${fila("Urea",loc.UreaKgHa==null?"-":`${loc.UreaKgHa} kg/ha`)}${fila("Microstar",loc.MicrostarKgHa==null?"-":`${loc.MicrostarKgHa} kg/ha`)}${fila("Microstar bags",loc.MicrostarBags)}</section>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
          ${status === "Not started" ? `<button id="fieldBookStartVisit" type="button" style="padding:9px 13px;border:0;border-radius:8px;background:#6d4aff;color:#fff;font-size:10px;font-weight:900;cursor:pointer">START FIELD BOOK</button>` : ""}
          ${status === "Not started" ? "" : `<button id="fieldBookCompleteVisit" type="button" ${status === "Completed" ? "disabled" : ""} style="padding:9px 13px;border:1px solid #6d4aff;border-radius:8px;background:${status === "Completed" ? "#eef6f1" : "#fff"};color:${status === "Completed" ? "#0b6b3a" : "#5a3cc6"};font-size:10px;font-weight:900;cursor:${status === "Completed" ? "default" : "pointer"};opacity:1">${status === "Completed" ? "FIELD BOOK COMPLETED" : "COMPLETE FIELD BOOK"}</button>`}
        </div>
      </section>`;
  }

  function crearChecklistHTML(aoiId) {
    const respuestas = leerChecklist(aoiId);
    const checklistReadOnly = (leerVisit(aoiId).status || "Not started") === "Completed";
    const metrics = metricasChecklist(aoiId);
    const sections = [...new Set(checklistTemplate.map(x => x.section))];
    const sectionHTML = sections.map(section => `
      <section style="margin-top:15px"><h4 style="margin:0 0 7px;color:#174c31;font-size:11px">${section.toUpperCase()}</h4>
        <div style="display:grid;gap:7px">${checklistTemplate.filter(x => x.section === section).map(item => {
          const response = respuestas[item.id] || {};
          return `<div class="field-book-check-row" data-check-id="${item.id}" style="padding:10px;border:1px solid #d9e3dd;border-radius:9px;background:#fff">
            <div style="display:grid;grid-template-columns:minmax(190px,1fr) 145px;gap:9px;align-items:center">
              <strong style="font-size:11px;color:#34473c">${item.label}</strong>
              <select class="field-book-check-status" ${checklistReadOnly ? "disabled" : ""} style="padding:7px;border:1px solid #c7d4cc;border-radius:7px;font-size:10px"><option value="Pending" ${!response.status || response.status === "Pending" ? "selected" : ""}>Pending</option><option value="OK" ${response.status === "OK" ? "selected" : ""}>✓ OK</option><option value="Observation" ${response.status === "Observation" ? "selected" : ""}>! Observation</option><option value="Problem" ${response.status === "Problem" ? "selected" : ""}>X Problem</option><option value="N/A" ${response.status === "N/A" ? "selected" : ""}>N/A</option></select>
            </div>
            <input class="field-book-check-comment" ${checklistReadOnly ? "readonly" : ""} value="${String(response.comment || "").replace(/"/g,"&quot;")}" placeholder="Comentario opcional..." style="width:100%;box-sizing:border-box;margin-top:7px;padding:7px;border:1px solid #d9e3dd;border-radius:7px;font-size:10px">
          </div>`;
        }).join("")}</div>
      </section>`).join("");
    return `<section style="padding:15px;border:1px solid #d9e3dd;border-radius:11px;background:#f8fbf9"><span class="section-label">PLANTING CHECKLIST</span><div style="display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:8px;margin-top:8px"><div style="padding:10px;background:#fff;border:1px solid #d9e3dd;border-radius:9px"><small>Completed</small><b style="display:block;font-size:20px">${metrics.completed}/${metrics.total}</b></div><div style="padding:10px;background:#fff;border:1px solid #d9e3dd;border-radius:9px"><small>Observations</small><b style="display:block;font-size:20px">${metrics.observations}</b></div><div style="padding:10px;background:#fff;border:1px solid #d9e3dd;border-radius:9px"><small>Problems</small><b style="display:block;font-size:20px">${metrics.problems}</b></div><div style="padding:10px;background:#fff;border:1px solid #d9e3dd;border-radius:9px"><small>Pending</small><b style="display:block;font-size:20px">${metrics.pending}</b></div></div>${sectionHTML}${checklistReadOnly ? `<div style="margin-top:14px;padding:9px;border-radius:8px;background:#eef6f1;color:#0b6b3a;font-size:10px;font-weight:900;text-align:center">FIELD BOOK COMPLETED · CHECKLIST READ ONLY</div>` : `<button id="fieldBookSaveChecklist" type="button" style="width:100%;margin-top:14px;padding:10px;border:0;border-radius:8px;background:#0b6b3a;color:#fff;font-size:11px;font-weight:900;cursor:pointer">SAVE CHECKLIST</button>`}<div id="fieldBookChecklistMsg" style="margin-top:6px;color:#6c7a72;font-size:9px">Guardado local en LAB.</div></section>`;
  }

  function crearIssuesMapHTML(aoiId, layoutReal, colorPorExperimento) {
    const layout = layoutReal.layout || {};
    const porCoord = new Map(layoutReal.plots.map(plot => [`${plot.range}|${plot.column}`, plot]));
    const eventos = leerEventos(aoiId);
    const columnas = [];
    const ranges = [];
    for (let c = layout.columnMin; c <= layout.columnMax; c++) columnas.push(c);
    for (let r = layout.rangeMax; r >= layout.rangeMin; r--) ranges.push(r);
    const header = columnas.map(c => `<div style="width:44px;min-width:44px;text-align:center;font-size:9px;font-weight:800;color:#6c7a72">${c}</div>`).join("");
    const filas = ranges.map(r => `<div style="display:flex;gap:3px;margin-bottom:3px;align-items:center"><div style="position:sticky;left:0;z-index:2;width:38px;min-width:38px;text-align:center;background:#eef6f1;color:#174c31;font-size:10px;font-weight:900;padding:9px 0;border-radius:5px">R${r}</div>${columnas.map(c => {
      const plot=porCoord.get(`${r}|${c}`);
      if(!plot) return `<div style="width:44px;min-width:44px;height:28px;border:1px dashed #e2e9e5;border-radius:4px"></div>`;
      const esBuffer=plot.type === "BUFFER" || String(plot.experimentName || "").toLowerCase() === "buffer";
      const color=esBuffer ? "#e2e5e3" : (colorPorExperimento.get(plot.experimentName) || "#e7ece9");
      const evento=eventos[claveEvento(aoiId,r,c)];
      const shift=shiftParaPlot(aoiId,r,c);
      const marca=evento ? estadosEjecucion[evento.status]?.simbolo : shift ? simboloShift(shift.offset) : "";
      const cfg=evento ? estadosEjecucion[evento.status] : shift ? shiftConfig : null;
      return `<button type="button" class="field-book-issues-plot" data-range="${r}" data-column="${c}" style="position:relative;width:44px;min-width:44px;height:28px;border:1px solid ${cfg ? cfg.color : '#bfcac3'};border-radius:4px;background:${color};font-size:8px;font-weight:800;cursor:pointer;white-space:nowrap">${r}-${c}${marca ? `<span style="position:absolute;right:1px;top:1px;min-width:12px;height:12px;border-radius:3px;background:${cfg.fondo};color:${cfg.color};font-size:9px;line-height:12px;font-weight:900">${marca}</span>` : ""}</button>`;
    }).join("")}</div>`).join("");
    return `<section style="margin-top:15px;padding:15px;border:1px solid #d9e3dd;border-radius:11px;background:#f8fbf9"><span class="section-label">ISSUES MAP · READ ONLY</span><p style="margin:5px 0 10px;color:#6c7a72;font-size:11px">Vista informativa. La edición de incidencias se realiza únicamente en Field Map.</p><div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(230px,300px);gap:12px"><div style="overflow:auto;max-height:62vh;padding:8px;border:1px solid #d9e3dd;border-radius:9px;background:#fff"><div style="display:flex;gap:3px;margin:0 0 5px 41px;width:max-content">${header}</div><div style="width:max-content">${filas}</div></div><aside style="padding:12px;border:1px solid #bfd4c7;border-radius:9px;background:#fff"><span class="section-label">PLOT INFORMATION</span><div id="fieldBookIssuesPlotInfo" style="margin-top:8px;color:#6c7a72;font-size:11px">Tocá una parcela para consultar el material y su incidencia.</div></aside></div></section>`;
  }

  function conectarIssuesMap(aoiId, layoutReal) {
    const porCoord=new Map(layoutReal.plots.map(plot=>[`${plot.range}|${plot.column}`,plot]));
    document.querySelectorAll(".field-book-issues-plot").forEach(btn=>btn.addEventListener("click",()=>{
      const plot=porCoord.get(`${btn.dataset.range}|${btn.dataset.column}`);
      const info=document.getElementById("fieldBookIssuesPlotInfo");
      if(!plot || !info) return;
      const evento=leerEventos(aoiId)[claveEvento(aoiId,plot.range,plot.column)];
      const shift=shiftParaPlot(aoiId,plot.range,plot.column);
      const issue=evento?.status || (shift ? `Shifted ${shift.offset > 0 ? '+' : ''}${shift.offset}` : "Normal");
      const comment=evento?.comment || shift?.comment || "-";
      info.innerHTML=`<strong style="color:#174c31">Range ${plot.range} · Column ${plot.column}</strong><div style="margin-top:8px;line-height:1.55"><b>Experiment:</b> ${plot.experimentName || "-"}<br><b>Germplasm:</b> ${plot.germplasmName || "-"}<br><b>EU ID:</b> ${plot.euId ?? "-"}<br><b>Rep:</b> ${plot.rep ?? "-"}<br><b>Issue:</b> ${issue}<br><b>Comment:</b> ${comment}</div>`;
    }));
  }

  function crearIssuesHTML(aoiId, layout) {
    const eventos = leerEventos(aoiId);
    const shifts = leerBlockShifts(aoiId);
    const individuales = Object.entries(eventos).map(([key, evento]) => {
      const partes = key.split("|");
      return { range:Number(partes[1]), column:Number(partes[2]), status:evento.status, comment:evento.comment || "" };
    });
    const counts = {
      Refilled: individuales.filter(x => x.status === "Refilled").length,
      Lost: individuales.filter(x => x.status === "Lost").length,
      Observation: individuales.filter(x => x.status === "Observation").length,
      Shifts: shifts.length
    };
    const total = counts.Refilled + counts.Lost + counts.Observation + counts.Shifts;
    const cards = [
      ["Refilled",counts.Refilled,"R",estadosEjecucion.Refilled],
      ["Lost",counts.Lost,"X",estadosEjecucion.Lost],
      ["Observation",counts.Observation,"!",estadosEjecucion.Observation],
      ["Shift Blocks",counts.Shifts,"↑↓",shiftConfig]
    ].map(([label,value,symbol,cfg]) => `<div style="padding:12px;border:1px solid #d9e3dd;border-radius:10px;background:#fff"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><span style="display:inline-flex;align-items:center;gap:7px;color:${cfg.color};font-size:11px;font-weight:900"><b style="min-width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;background:${cfg.fondo};border:1px solid ${cfg.color}55">${symbol}</b>${label}</span><strong style="font-size:20px;color:#26352d">${value}</strong></div></div>`).join("");
    const individualHTML = ["Lost","Refilled","Observation"].map(status => {
      const items=individuales.filter(x=>x.status===status); if(!items.length) return ""; const cfg=estadosEjecucion[status];
      return `<section style="margin-top:16px"><h4 style="margin:0 0 7px;color:${cfg.color};font-size:11px">${cfg.simbolo} ${status.toUpperCase()}</h4><div style="display:grid;gap:6px">${items.map(item=>`<button type="button" class="field-book-issue-link" data-range="${item.range}" data-column="${item.column}" style="width:100%;padding:9px 10px;text-align:left;border:1px solid #d9e3dd;border-radius:8px;background:#fff;cursor:pointer"><strong style="color:#174c31">${item.range}-${item.column}</strong><span style="display:block;margin-top:3px;color:#6c7a72;font-size:10px">${item.comment || "Sin comentario"}</span></button>`).join("")}</div></section>`;
    }).join("");
    const shiftHTML = shifts.length ? `<section style="margin-top:16px"><h4 style="margin:0 0 7px;color:${shiftConfig.color};font-size:11px">↑↓ SHIFT BLOCKS</h4><div style="display:grid;gap:6px">${shifts.map(shift=>{const affected=Math.abs(Number(shift.endRange)-Number(shift.startRange))+1;const actualEnd=Number(shift.endRange)+Number(shift.offset);const outside=actualEnd<Number(layout.rangeMin)||actualEnd>Number(layout.rangeMax);return `<button type="button" class="field-book-issue-link" data-range="${shift.startRange}" data-column="${shift.column}" style="width:100%;padding:9px 10px;text-align:left;border:1px solid #c8d8e9;border-radius:8px;background:#f7faff;cursor:pointer"><strong style="color:${shiftConfig.color}">${simboloShift(shift.offset)} Column ${shift.column} · Range ${shift.startRange}-${shift.endRange} · ${shift.offset>0?"+":""}${shift.offset}</strong><span style="display:block;margin-top:3px;color:#6c7a72;font-size:10px">${affected} parcelas afectadas${outside?" · ⚠ termina fuera del layout":""}</span>${shift.comment?`<span style="display:block;margin-top:3px;color:#6c7a72;font-size:10px">${shift.comment}</span>`:""}</button>`;}).join("")}</div></section>` : "";
    return `<section style="padding:15px;border:1px solid #d9e3dd;border-radius:11px;background:#f8fbf9"><span class="section-label">FIELD EXECUTION SUMMARY</span><div style="display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:8px;margin-top:8px">${cards}</div><div style="margin-top:10px;padding:10px 12px;border-radius:9px;background:#174c31;color:#fff;display:flex;justify-content:space-between;align-items:center"><strong style="font-size:11px">TOTAL ISSUES</strong><strong style="font-size:22px">${total}</strong></div>${total ? individualHTML+shiftHTML : `<div style="margin-top:18px;padding:28px;text-align:center;border:1px dashed #cbd7d0;border-radius:10px;color:#6c7a72;font-size:12px">No hay incidencias registradas en esta AOI.</div>`}</section>`;
  }

  function activarVistaFieldBook(vista) {
    const views = { overview:"fieldBookOverviewView", layout:"fieldBookLayoutView", checklist:"fieldBookChecklistView", issues:"fieldBookIssuesView" };
    const tabs = { overview:"fieldBookTabOverview", layout:"fieldBookTabLayout", checklist:"fieldBookTabChecklist", issues:"fieldBookTabIssues" };
    Object.entries(views).forEach(([name,id]) => {
      const el=document.getElementById(id);
      if(!el) return;
      const active=name===vista;
      el.hidden=!active;
      el.style.display=active ? (name === "layout" ? "grid" : "block") : "none";
    });
    Object.entries(tabs).forEach(([name,id]) => {
      const el=document.getElementById(id);
      if(!el) return;
      const active=name===vista;
      el.style.background=active?"#174c31":"#fff";
      el.style.color=active?"#fff":"#536159";
      el.style.borderColor=active?"#174c31":"#c8d5ce";
    });
  }

  function refrescarIssuesEnPantalla(aoiId, layout) {
    const issuesView=document.getElementById("fieldBookIssuesView");
    const layoutReal=layoutsEmbebidos[aoiId];
    if(!issuesView || !layoutReal) return;
    const estabaVisible=issuesView.style.display !== "none" && !issuesView.hidden;
    const colores=["#dff3e7","#e5ecff","#fff0d8","#f3e4ff","#dff4f7","#ffe3e3","#edf1d4","#f6e8cf","#e8e8ff"];
    const colorPorExperimento=new Map((layoutReal.experiments||[]).map((exp,i)=>[exp.name,(exp.type === "BUFFER" || String(exp.name||"").toLowerCase() === "buffer") ? "#e2e5e3" : colores[i % colores.length]]));
    issuesView.innerHTML=crearIssuesHTML(aoiId,layout)+crearIssuesMapHTML(aoiId,layoutReal,colorPorExperimento);
    conectarIssuesMap(aoiId,layoutReal);
    issuesView.querySelectorAll(".field-book-issue-link").forEach(issueButton=>issueButton.addEventListener("click",()=>{
      activarVistaFieldBook("issues");
      const target=issuesView.querySelector(`.field-book-issues-plot[data-range="${issueButton.dataset.range}"][data-column="${issueButton.dataset.column}"]`);
      if(target){target.click();target.scrollIntoView({behavior:"smooth",block:"center",inline:"center"});}
    }));
    if(estabaVisible) activarVistaFieldBook("issues");
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
      contenido.innerHTML = `<div style="padding:18px"><div style="display:flex;justify-content:space-between;gap:15px;margin-bottom:14px"><div><span class="section-label">AOI</span><h2 style="margin:0;color:#174c31">${aoiId}</h2><div style="margin-top:5px;color:#6c7a72;font-size:12px">${layoutReal.trial?.year || "-"} · Season ${layoutReal.trial?.season || "-"}</div></div><span style="padding:6px 9px;border-radius:999px;background:#e7f5ec;color:#0b6b3a;font-size:10px;font-weight:900;height:max-content">REAL LAYOUT · READ ONLY</span></div><div style="display:flex;gap:7px;margin-bottom:12px;flex-wrap:wrap"><button id="fieldBookTabOverview" type="button" style="padding:8px 15px;border:1px solid #174c31;border-radius:8px;background:#174c31;color:#fff;font-size:10px;font-weight:900;cursor:pointer">OVERVIEW</button><button id="fieldBookTabLayout" type="button" style="padding:8px 15px;border:1px solid #c8d5ce;border-radius:8px;background:#fff;color:#536159;font-size:10px;font-weight:900;cursor:pointer">FIELD MAP</button><button id="fieldBookTabChecklist" type="button" style="padding:8px 15px;border:1px solid #c8d5ce;border-radius:8px;background:#fff;color:#536159;font-size:10px;font-weight:900;cursor:pointer">CHECKLIST</button><button id="fieldBookTabIssues" type="button" style="padding:8px 15px;border:1px solid #c8d5ce;border-radius:8px;background:#fff;color:#536159;font-size:10px;font-weight:900;cursor:pointer">ISSUES</button></div><div id="fieldBookOverviewView">${crearOverviewHTML(aoiId, layout)}</div><div id="fieldBookLayoutView" hidden style="display:grid;grid-template-columns:minmax(0,1fr) minmax(240px,320px);gap:16px"><section style="min-width:0;padding:15px;border:1px solid #d9e3dd;border-radius:11px;background:#f8fbf9"><span class="section-label">FIELD MAP</span><h3 style="margin:5px 0">Plano interactivo</h3><p style="color:#6c7a72;font-size:12px">Range ${layout.rangeMin}-${layout.rangeMax} · Column ${layout.columnMin}-${layout.columnMax} · ${layout.plotRecordCount} parcelas · ${experimentos.length} experimentos</p><div style="overflow:auto;max-height:68vh;padding:8px;border:1px solid #d9e3dd;border-radius:9px;background:#fff"><div style="display:flex;gap:3px;margin:0 0 5px 41px;width:max-content">${header}</div><div style="width:max-content">${filas}</div></div></section><aside style="padding:15px;border:1px solid #d9e3dd;border-radius:11px;background:#fff;max-height:76vh;overflow:auto">
            <section style="padding:12px;border:1px solid #bfd4c7;border-radius:9px;background:#f8fbf9">
              <span class="section-label">PLOT DETAIL</span>
              <div id="fieldBookRealDetail" style="margin-top:8px;color:#6c7a72;font-size:12px">Tocá una parcela para ver sus datos.</div>
            </section>
          </aside></div><div id="fieldBookChecklistView" hidden>${crearChecklistHTML(aoiId)}</div><div id="fieldBookIssuesView" hidden>${crearIssuesHTML(aoiId, layout)}${crearIssuesMapHTML(aoiId, layoutReal, colorPorExperimento)}</div></div>`;
      const visitStatusActual = (leerVisit(aoiId).status || "Not started");
      const procesoIniciado = visitStatusActual !== "Not started";
      ["fieldBookTabLayout","fieldBookTabChecklist","fieldBookTabIssues"].forEach(id => {
        const tab = document.getElementById(id);
        if (!tab) return;
        tab.disabled = !procesoIniciado;
        if (!procesoIniciado) {
          tab.style.opacity = ".38";
          tab.style.cursor = "not-allowed";
          tab.title = "Primero iniciá el Field Book desde Overview";
        }
      });

      document.getElementById("fieldBookTabOverview")?.addEventListener("click",()=>activarVistaFieldBook("overview"));
      document.getElementById("fieldBookTabLayout")?.addEventListener("click",()=>{ if (procesoIniciado) activarVistaFieldBook("layout"); });
      document.getElementById("fieldBookTabChecklist")?.addEventListener("click",()=>{ if (procesoIniciado) activarVistaFieldBook("checklist"); });
      document.getElementById("fieldBookTabIssues")?.addEventListener("click",()=>{ if (procesoIniciado) activarVistaFieldBook("issues"); });
      conectarIssuesMap(aoiId, layoutReal);
      activarVistaFieldBook("overview");
      document.getElementById("fieldBookStartVisit")?.addEventListener("click",()=>{const v=leerVisit(aoiId);guardarVisit(aoiId,{...v,status:"In progress",startedAt:v.startedAt||new Date().toISOString()});renderizarAoi(aoiId);});
      document.getElementById("fieldBookCompleteVisit")?.addEventListener("click",()=>{const m=metricasChecklist(aoiId);if(m.pending){alert(`Checklist pendiente: ${m.pending} ítems.`);return;}const v=leerVisit(aoiId);guardarVisit(aoiId,{...v,status:"Completed",startedAt:v.startedAt||new Date().toISOString(),completedAt:new Date().toISOString()});renderizarAoi(aoiId);});
      document.getElementById("fieldBookSaveChecklist")?.addEventListener("click",()=>{const respuestas={};contenido.querySelectorAll(".field-book-check-row").forEach(row=>{respuestas[row.dataset.checkId]={status:row.querySelector(".field-book-check-status")?.value||"Pending",comment:row.querySelector(".field-book-check-comment")?.value?.trim()||"",updatedAt:new Date().toISOString()};});guardarChecklist(aoiId,respuestas);const view=document.getElementById("fieldBookChecklistView");if(view)view.innerHTML=crearChecklistHTML(aoiId);renderizarAoi(aoiId);setTimeout(()=>activarVistaFieldBook("checklist"),0);});
      contenido.querySelectorAll(".field-book-issue-link").forEach(issueButton=>issueButton.addEventListener("click",()=>{
        activarVistaFieldBook("issues");
        const target=contenido.querySelector(`.field-book-issues-plot[data-range="${issueButton.dataset.range}"][data-column="${issueButton.dataset.column}"]`);
        if(target){target.click();target.scrollIntoView({behavior:"smooth",block:"center",inline:"center"});}
      }));

      const eventosIniciales = leerEventos(aoiId);
      contenido.querySelectorAll(".field-book-real-plot").forEach(btn => {
        const plotInicial = porCoord.get(`${btn.dataset.range}|${btn.dataset.column}`);
        if (plotInicial) {
          const eventoIndividual = eventosIniciales[claveEvento(aoiId, plotInicial.range, plotInicial.column)];
          const shift = shiftParaPlot(aoiId, plotInicial.range, plotInicial.column);
          aplicarMarcaBoton(
              btn,
              eventoIndividual || (shift ? { status: "Shifted", offset: shift.offset } : null)
            );
        }

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

          d.innerHTML = `<strong style="color:#174c31">Range ${plot.range} · Column ${plot.column}</strong><div style="margin-top:9px;line-height:1.6"><b>Experiment:</b> ${plot.experimentName || "-"}<br><b>Germplasm:</b> ${plot.germplasmName || "-"}<br><b>Germplasm ID:</b> ${plot.germplasmId ?? "-"}<br><b>EU ID:</b> ${plot.euId ?? "-"}<br><b>EUDQ:</b> ${plot.eudq || "-"}<br><b>Rep:</b> ${plot.rep ?? "-"}<br><b>Comment:</b> ${plot.entryComment || "-"}</div>${crearEjecucionHTML(aoiId, plot, layout)}`;

          let statusSeleccionado = leerEventos(aoiId)[claveEvento(aoiId, plot.range, plot.column)]?.status || "";
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
            refrescarIssuesEnPantalla(aoiId, layout);
            const evento = leerEventos(aoiId)[claveEvento(aoiId, plot.range, plot.column)];
            aplicarMarcaBoton(btn, evento);
            const msg = d.querySelector("#fieldBookExecutionMsg");
            if (msg) {
              msg.textContent = "✓ Guardado localmente en LAB";
              msg.style.color = "#0b6b3a";
              msg.style.fontWeight = "800";
            }
          });

          d.querySelector("#fieldBookRestoreNormal")?.addEventListener("click", () => {
            restaurarNormal(aoiId, plot.range, plot.column);
            refrescarIssuesEnPantalla(aoiId, layout);
            aplicarMarcaBoton(btn, null);
            btn.click();
          });

          d.querySelector("#fieldBookRemoveShift")?.addEventListener("click", e => {
            eliminarShift(aoiId, e.currentTarget.dataset.shiftId);
            renderizarAoi(aoiId);
          });

          d.querySelector("#fieldBookShiftBlock")?.addEventListener("click", () => {
            abrirShiftBlock(aoiId, plot, layout, porCoord, () => renderizarAoi(aoiId));
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
