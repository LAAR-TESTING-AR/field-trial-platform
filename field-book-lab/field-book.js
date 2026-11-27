(function () {
  "use strict";

  console.log("Field Book Lab iniciado");

  // DEV endpoint. Pegá solamente en tu copia local la URL HTTP POST completa del Flow.

const FIELD_BOOK_SAVE_URL = "https://614eb69dae3de7e79ee743c51a72c5.1c.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/10/workflows/98c6ecc5302e48fba99d4eabb6790747/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=E-vDpXW7I2ZV2npkaw6NsQDuHtw_BtjJiaQudQF-HXg";

  // DEV read endpoint: Field Book Data DEV. Paste the complete HTTP POST URL here.
  const FIELD_BOOK_DATA_URL = "https://614eb69dae3de7e79ee743c51a72c5.1c.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/13/workflows/74bbd77cb3f44335b476f5afa2a1d61c/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=yVKDbXApzywVF7Fp3eS0_rEPocHaPW034WaA9dJrX2w";
    
  function endpointConfigurado(){return Boolean(FIELD_BOOK_SAVE_URL && !FIELD_BOOK_SAVE_URL.includes("PEGAR_URL_FLOW_AQUI"));}

  const FIELD_BOOK_SYNC_QUEUE_KEY = "fieldBookSyncQueue:v1";
  let fieldBookSyncEnCurso = false;

  function leerSyncQueue() {
    try {
      const value = JSON.parse(localStorage.getItem(FIELD_BOOK_SYNC_QUEUE_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.warn("Field Book: no se pudo leer la cola de sincronizacion", error);
      return [];
    }
  }

  function guardarSyncQueue(queue) {
    localStorage.setItem(FIELD_BOOK_SYNC_QUEUE_KEY, JSON.stringify(queue));
    actualizarSyncUI();
  }

  function claveOperacion(payload) {
    const type = String(payload?.type || "unknown");
    if (type === "visit") return `visit|${payload.visitId}`;
    if (type === "plotEvent") return `plotEvent|${payload.visitId}|${payload.range}|${payload.column}`;
    if (type === "blockShift") return `blockShift|${payload.visitId}|${payload.shiftId}`;
    if (type === "checklist") return `checklist|${payload.visitId}|${payload.checkId}`;
    return `${type}|${payload.visitId || payload.aoiId || "global"}|${Date.now()}`;
  }

  function encolarPayload(payload) {
    const queue = leerSyncQueue();
    const operationKey = claveOperacion(payload);
    const now = new Date().toISOString();
    const requestId = (crypto?.randomUUID?.() || `fb-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const item = {
      id: requestId,
      operationKey,
      payload: { ...payload, clientRequestId: requestId },
      status: "pending",
      attempts: 0,
      createdAt: now,
      updatedAt: now,
      lastError: ""
    };
    const existingIndex = queue.findIndex(entry => entry.operationKey === operationKey);
    if (existingIndex >= 0) {
      item.createdAt = queue[existingIndex].createdAt || now;
      queue[existingIndex] = item;
    } else {
      queue.push(item);
    }
    guardarSyncQueue(queue);
    return item;
  }

  function pendientesSyncCount() {
    return leerSyncQueue().length;
  }

  function actualizarSyncUI(message = "") {
    const count = pendientesSyncCount();
    const badge = document.getElementById("fieldBookSyncCount");
    const button = document.getElementById("fieldBookSyncButton");
    const state = document.getElementById("fieldBookSyncState");
    if (badge) {
      badge.textContent = String(count);
      badge.hidden = count === 0;
    }
    if (button) {
      button.disabled = fieldBookSyncEnCurso || count === 0 || !navigator.onLine;
      button.textContent = fieldBookSyncEnCurso ? "SYNCING..." : count ? `SYNC PENDING (${count})` : "SYNCED";
    }
    if (state) {
      state.textContent = message || (navigator.onLine ? (count ? `${count} pending` : "All synced") : `${count} pending · Offline`);
      state.dataset.mode = navigator.onLine ? (count ? "pending" : "synced") : "offline";
    }
  }

  function montarSyncUI() {
    const header = document.querySelector(".lab-header");
    if (!header || document.getElementById("fieldBookSyncButton")) return;
    const controls = document.createElement("div");
    controls.className = "field-book-sync-controls";
    controls.innerHTML = `
      <span id="fieldBookSyncState" class="field-book-sync-state">Checking sync...</span>
      <button id="fieldBookSyncButton" class="field-book-sync-button" type="button">
        SYNCED
        <span id="fieldBookSyncCount" class="field-book-sync-count" hidden>0</span>
      </button>`;
    header.appendChild(controls);
    controls.querySelector("#fieldBookSyncButton")?.addEventListener("click", async () => {
      await sincronizarPendientes({ manual: true });
    });
    actualizarSyncUI();
  }

  async function guardarEnSharePoint(payload){if(!endpointConfigurado())throw new Error("Falta configurar FIELD_BOOK_SAVE_URL");const response=await fetch(FIELD_BOOK_SAVE_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const text=await response.text();let data={};try{data=text?JSON.parse(text):{};}catch(_){data={raw:text};}if(!response.ok||data.success===false)throw new Error(data.error||data.message||`HTTP ${response.status}`);return data;}

  async function sincronizarPendientes({ manual = false } = {}) {
    if (fieldBookSyncEnCurso) return { synced: 0, failed: 0, remaining: pendientesSyncCount() };
    if (!navigator.onLine) {
      actualizarSyncUI("Offline · Sync pending");
      if (manual) alert("Sin conexion. Los cambios continuan guardados localmente.");
      return { synced: 0, failed: 0, remaining: pendientesSyncCount() };
    }
    fieldBookSyncEnCurso = true;
    actualizarSyncUI("Syncing...");
    let synced = 0;
    let failed = 0;
    const snapshot = leerSyncQueue();
    for (let index = 0; index < snapshot.length; index += 1) {
      const current = snapshot[index];
      actualizarSyncUI(`Syncing ${index + 1}/${snapshot.length}...`);
      try {
        await guardarEnSharePoint(current.payload);
        const liveQueue = leerSyncQueue().filter(entry => entry.id !== current.id);
        guardarSyncQueue(liveQueue);
        synced += 1;
      } catch (error) {
        const liveQueue = leerSyncQueue();
        const liveItem = liveQueue.find(entry => entry.id === current.id);
        if (liveItem) {
          liveItem.status = "error";
          liveItem.attempts = Number(liveItem.attempts || 0) + 1;
          liveItem.updatedAt = new Date().toISOString();
          liveItem.lastError = String(error?.message || error);
          guardarSyncQueue(liveQueue);
        }
        failed += 1;
        console.warn("Field Book sync pendiente", current.operationKey, error);
      }
    }
    fieldBookSyncEnCurso = false;
    const remaining = pendientesSyncCount();
    actualizarSyncUI(remaining ? `${remaining} pending` : "All synced");
    if (manual) {
      if (!remaining) alert(`Sincronizacion completa. ${synced} registro(s) enviado(s).`);
      else alert(`Sincronizacion parcial. ${synced} enviado(s), ${remaining} pendiente(s).`);
    }
    return { synced, failed, remaining };
  }

  async function guardarConCola(payload) {
    const item = encolarPayload(payload);
    if (!navigator.onLine) throw new Error("Sin conexion. Guardado localmente y pendiente de sincronizacion.");
    await sincronizarPendientes();
    const pendiente = leerSyncQueue().find(entry => entry.id === item.id);
    if (pendiente) throw new Error(pendiente.lastError || "Guardado localmente y pendiente de sincronizacion.");
    return { success: true, queued: false };
  }

  function crearVisitId(aoiId){const ts=new Date().toISOString().replace(/[-:]/g,"").replace(/\..+/,"");return `${aoiId}-${ts}`;}

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
    montarSyncUI();
    window.addEventListener("online", () => {
      actualizarSyncUI("Online · Syncing pending...");
      sincronizarPendientes();
    });
    window.addEventListener("offline", () => actualizarSyncUI());
    setTimeout(() => {
      actualizarSyncUI();
      if (navigator.onLine && pendientesSyncCount()) sincronizarPendientes();
    }, 400);

  // Layouts activos. Se cargan desde Field Book Data DEV (CSV de SharePoint).
  // Mantiene compatibilidad con window.FIELD_BOOK_LAYOUTS si existiera una copia local de prueba.
  const layoutsEmbebidos = window.FIELD_BOOK_LAYOUTS || {};

  const OFFLINE_DB="FieldBookOfflineDB",OFFLINE_STORE="fieldBooks";
  function openOfflineDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(OFFLINE_DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(OFFLINE_STORE))r.result.createObjectStore(OFFLINE_STORE,{keyPath:"aoiId"});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async function getOfflineBooks(){const db=await openOfflineDB();const rows=await new Promise((resolve,reject)=>{const r=db.transaction(OFFLINE_STORE).objectStore(OFFLINE_STORE).getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error);});db.close();return rows;}
  async function saveOfflineBook(aoiId){const db=await openOfflineDB();await new Promise((resolve,reject)=>{const tx=db.transaction(OFFLINE_STORE,"readwrite");tx.objectStore(OFFLINE_STORE).put({aoiId,downloadedAt:new Date().toISOString(),data:layoutsEmbebidos[aoiId]});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}
  async function removeOfflineBook(aoiId){const db=await openOfflineDB();await new Promise((resolve,reject)=>{const tx=db.transaction(OFFLINE_STORE,"readwrite");tx.objectStore(OFFLINE_STORE).delete(aoiId);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}
  async function loadOfflineBooks(){const rows=await getOfflineBooks();rows.forEach(x=>{if(x?.data)layoutsEmbebidos[x.aoiId]=x.data;});return rows;}

  function endpointDatosConfigurado() {
    return Boolean(
      FIELD_BOOK_DATA_URL &&
      !FIELD_BOOK_DATA_URL.includes("PEGAR_URL_FIELD_BOOK_DATA_DEV_AQUI")
    );
  }

  function esBufferRow(row) {
    const exp = normalizar(row?.ExperimentName);
    const entry = normalizar(row?.Entry);
    const euId = normalizar(row?.EUId);
    return (
      !exp || exp === "buffer" ||
      entry === "0" || entry === "buffer" ||
      euId === "0" || euId === "buffer"
    );
  }

  function convertirFilasEnLayouts(rows) {
    const porAoi = new Map();

    rows.forEach(row => {
      const aoiId = String(row?.TrialName || "").trim();
      const range = Number.parseInt(String(row?.Range ?? "").trim(), 10);
      const column = Number.parseInt(String(row?.Column ?? "").trim(), 10);
      if (!aoiId || !Number.isFinite(range) || !Number.isFinite(column)) return;

      if (!porAoi.has(aoiId)) porAoi.set(aoiId, []);
      porAoi.get(aoiId).push({ ...row, __range: range, __column: column });
    });

    porAoi.forEach((aoiRows, aoiId) => {
      const plots = aoiRows.map(row => {
        const buffer = esBufferRow(row);
        return {
          range: row.__range,
          column: row.__column,
          type: buffer ? "BUFFER" : "EXPERIMENT",
          experimentName: buffer ? "Buffer" : String(row.ExperimentName || "").trim(),
          germplasmName: buffer ? "Buffer" : String(row.GermplasmName || "").trim(),
          germplasmId: null,
          eudq: String(row.EUDQ || "").trim(),
          euId: buffer ? "Buffer" : String(row.EUId ?? "").trim(),
          entryComment: String(row.EntryComment || "").trim(),
          rep: buffer ? "Buffer" : String(row.Rep ?? "").trim(),
          entry: buffer ? "Buffer" : String(row.Entry ?? "").trim(),
          siid: buffer ? "Buffer" : String(row.SIID ?? "").trim(),
          year: String(row.Year ?? "").trim(),
          season: String(row.Season ?? "").trim()
        };
      });

      const ranges = plots.map(plot => plot.range);
      const columns = plots.map(plot => plot.column);
      const experimentNames = [];
      plots.forEach(plot => {
        const name = plot.type === "BUFFER" ? "Buffer" : plot.experimentName;
        if (name && !experimentNames.includes(name)) experimentNames.push(name);
      });

      const sourceRow = aoiRows[0] || {};
      layoutsEmbebidos[aoiId] = {
        aoiId,
        campaign: String(sourceRow.Campaign || "Sin campaña").trim(),
        crop: String(sourceRow.Crop || "Sin cultivo").trim(),
        plantingSeason: String(sourceRow.PlantingSeason || "Sin estación").trim(),
        layout: {
          rangeMin: Math.min(...ranges),
          rangeMax: Math.max(...ranges),
          columnMin: Math.min(...columns),
          columnMax: Math.max(...columns)
        },
        experiments: experimentNames.map(name => ({
          name,
          type: normalizar(name) === "buffer" ? "BUFFER" : "EXPERIMENT"
        })),
        plots
      };
    });

    return layoutsEmbebidos;
  }

  async function cargarLayoutsDesdeSharePoint() {
    if (!endpointDatosConfigurado()) {
      throw new Error("Falta configurar FIELD_BOOK_DATA_URL");
    }

    const response = await fetch(FIELD_BOOK_DATA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aoiId: "ALL" })
    });

    const text = await response.text();
    let rows;
    try { rows = text ? JSON.parse(text) : []; }
    catch (_) { throw new Error("Field Book Data DEV no devolvió JSON válido"); }

    if (!response.ok) {
      throw new Error(`Field Book Data DEV respondió HTTP ${response.status}`);
    }
    if (!Array.isArray(rows)) {
      throw new Error("Field Book Data DEV no devolvió una matriz");
    }

    convertirFilasEnLayouts(rows);
    return rows;
  }
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

  function iconoCultivo(crop) {
    const value = normalizar(crop);
    if (value.includes("corn")) return "🌽";
    if (value.includes("soy")) return "🌱";
    if (value.includes("sunflower")) return "🌻";
    return "🌾";
  }
  function estadoLibroAoi(aoiId) {
    const visit = leerVisit(aoiId);
    if (visit.status === "Completed") return { label:"COMPLETED", color:"#0b6b3a", bg:"#e7f5ec", mark:"✓" };
    if (visit.status === "In progress") return { label:"IN PROGRESS", color:"#995c00", bg:"#fff3d6", mark:"●" };
    return { label:"NOT STARTED", color:"#66736b", bg:"#eef1ef", mark:"○" };
  }
  async function montarBibliotecaVisual() {
    document.getElementById("fieldBookVisualLibrary")?.remove();
    const landing = document.getElementById("fieldBookLanding");
    const app = document.querySelector(".field-book-app") || document.body;
    if (landing) landing.style.display = "none";
    selectorAoi.style.display = "none";
    const books = Object.values(layoutsEmbebidos).map(layout => ({
      aoiId: layout.aoiId,
      campaign: layout.campaign || "Sin campaña",
      crop: layout.crop || "Sin cultivo",
      plantingSeason: layout.plantingSeason || "Sin estación"
    }));
    const campaigns = [...new Set(books.map(book => book.campaign))].sort();
    let selectedCampaign = campaigns[0] || "";
    let selectedCrop = "";
    let selectedSeason = "";
    const selectedAois = new Set();
    let offlineIds=new Set((await getOfflineBooks()).map(x=>x.aoiId));
    const library = document.createElement("section");
    library.id = "fieldBookVisualLibrary";
    library.style.cssText = "width:min(1180px,calc(100% - 28px));min-height:calc(100vh - 105px);margin:18px auto;padding:24px;box-sizing:border-box;border:1px solid #cbd9d1;border-radius:20px;background:linear-gradient(180deg,#f9fcfa,#edf5f0);color:#26352d;box-shadow:0 18px 42px rgba(23,76,49,.12)";
    app.insertBefore(library, app.firstChild);
    function openBook(aoiId) {
      library.style.display = "none";
      if (landing) landing.style.display = "none";
      const content=document.getElementById("fieldBookContent");
      if (content) content.style.removeProperty("display");
      selectorAoi.value = aoiId;
      selectorAoi.dispatchEvent(new Event("change", { bubbles:true }));
    }
    function render() {
      const campaignBooks = books.filter(book => book.campaign === selectedCampaign);
      const crops = [...new Set(campaignBooks.map(book => book.crop))].sort();
      if (!crops.includes(selectedCrop)) selectedCrop = crops[0] || "";
      const cropBooks = campaignBooks.filter(book => book.crop === selectedCrop);
      const seasons = [...new Set(cropBooks.map(book => book.plantingSeason))].sort();
      if (!seasons.includes(selectedSeason)) selectedSeason = seasons[0] || "";
      const visibleBooks = cropBooks.filter(book => book.plantingSeason === selectedSeason);
      library.innerHTML = `
        <header style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;padding-bottom:18px;border-bottom:1px solid #d5e1da">
          <div><span style="font-size:11px;font-weight:950;letter-spacing:.14em;color:#0b6b3a">FIELD BOOK LIBRARY</span><h1 style="margin:5px 0 4px;color:#174c31;font-size:32px">Elegí tus localidades</h1><p style="margin:0;color:#62736a;font-size:13px">Filtrá por campaña, cultivo y estación. Después seleccioná únicamente los libros que necesitás.</p></div>
          <label style="display:grid;gap:5px;color:#607067;font-size:10px;font-weight:900">CAMPAIGN<select id="fbLibraryCampaign" style="min-width:220px;min-height:43px;padding:8px 11px;border:1px solid #aebfb5;border-radius:10px;background:#fff;color:#174c31;font-size:14px;font-weight:850">${campaigns.map(value => `<option value="${value}" ${value===selectedCampaign?'selected':''}>${value}</option>`).join("")}</select></label>
        </header>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:18px">${crops.map(crop => `<button type="button" data-crop="${crop}" style="padding:14px;border:2px solid ${crop===selectedCrop?'#0b6b3a':'#d3dfd8'};border-radius:13px;background:${crop===selectedCrop?'#e7f5ec':'#fff'};color:#174c31;font-size:13px;font-weight:950;cursor:pointer"><span style="font-size:28px;margin-right:8px">${iconoCultivo(crop)}</span>${crop.toUpperCase()}</button>`).join("")}</div>
        <div style="display:flex;justify-content:center;gap:9px;flex-wrap:wrap;margin-top:14px">${seasons.map(season => `<button type="button" data-season="${season}" style="min-width:125px;padding:10px 15px;border:1px solid ${season===selectedSeason?'#174c31':'#b9c9c0'};border-radius:999px;background:${season===selectedSeason?'#174c31':'#fff'};color:${season===selectedSeason?'#fff':'#174c31'};font-size:11px;font-weight:950;cursor:pointer">${season.toUpperCase()}</button>`).join("")}</div>
        <section style="margin-top:20px;border:1px solid #d1ddd6;border-radius:15px;background:#fff;overflow:hidden">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:13px 15px;background:#f4f8f6;border-bottom:1px solid #dce5e0"><div><strong style="color:#174c31;font-size:14px">${selectedCrop} · ${selectedSeason}</strong><span style="margin-left:8px;color:#708078;font-size:11px">${visibleBooks.length} AOI</span></div><div style="display:flex;gap:8px"><button type="button" id="fbSelectAll" style="padding:7px 10px;border:1px solid #afc0b6;border-radius:7px;background:#fff;color:#174c31;font-size:9px;font-weight:900;cursor:pointer">SELECT ALL</button><span id="fbSelectedCount" style="padding:7px 10px;border-radius:7px;background:#e7f5ec;color:#0b6b3a;font-size:9px;font-weight:900">${selectedAois.size} selected</span></div></div>
          <div style="max-height:46vh;overflow:auto">${visibleBooks.map(book => { const status=estadoLibroAoi(book.aoiId); return `<div style="display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px 15px;border-bottom:1px solid #edf2ef"><input type="checkbox" data-select-aoi="${book.aoiId}" ${selectedAois.has(book.aoiId)?'checked':''} style="width:18px;height:18px;accent-color:#0b6b3a"><button type="button" data-open-aoi="${book.aoiId}" style="padding:0;border:0;background:transparent;text-align:left;cursor:pointer"><strong style="display:block;color:#174c31;font-size:14px">📗 ${book.aoiId}</strong><span style="display:block;margin-top:3px;color:#718078;font-size:10px">${book.crop} · ${book.plantingSeason}</span></button><div style="display:flex;gap:6px;align-items:center;justify-content:flex-end;flex-wrap:wrap"><span style="padding:5px 8px;border-radius:999px;background:${offlineIds.has(book.aoiId)?'#e7f5ec':'#eef1ef'};color:${offlineIds.has(book.aoiId)?'#0b6b3a':'#66736b'};font-size:8px;font-weight:950">${offlineIds.has(book.aoiId)?'✓ OFFLINE READY':'☁ ONLINE ONLY'}</span>${offlineIds.has(book.aoiId)?`<button type="button" data-remove-offline="${book.aoiId}" style="padding:5px 7px;border:1px solid #b8c5bd;border-radius:7px;background:#fff;color:#66736b;font-size:8px;font-weight:900;cursor:pointer">REMOVE</button>`:''}<span style="padding:5px 8px;border-radius:999px;background:${status.bg};color:${status.color};font-size:8px;font-weight:950">${status.mark} ${status.label}</span></div></div>`; }).join("") || `<div style="padding:28px;text-align:center;color:#718078">No hay AOI para esta combinación.</div>`}</div>
        </section>
        <footer style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:15px"><span style="color:#687970;font-size:11px">${offlineIds.size} Field Book${offlineIds.size===1?'':'s'} disponibles offline.</span><button type="button" id="fbDownloadSelected" ${selectedAois.size?'':'disabled'} style="padding:11px 16px;border:0;border-radius:10px;background:${selectedAois.size?'#0b6b3a':'#b9c6bf'};color:#fff;font-size:11px;font-weight:950;cursor:${selectedAois.size?'pointer':'not-allowed'}">DOWNLOAD SELECTED (${selectedAois.size})</button></footer>`;
      library.querySelector("#fbLibraryCampaign")?.addEventListener("change", event => { selectedCampaign=event.target.value;selectedCrop="";selectedSeason="";render(); });
      library.querySelectorAll("[data-crop]").forEach(button => button.addEventListener("click",()=>{selectedCrop=button.dataset.crop;selectedSeason="";render();}));
      library.querySelectorAll("[data-season]").forEach(button => button.addEventListener("click",()=>{selectedSeason=button.dataset.season;render();}));
      library.querySelectorAll("[data-open-aoi]").forEach(button => button.addEventListener("click",()=>openBook(button.dataset.openAoi)));
      library.querySelectorAll("[data-select-aoi]").forEach(box => box.addEventListener("change",()=>{box.checked?selectedAois.add(box.dataset.selectAoi):selectedAois.delete(box.dataset.selectAoi);render();}));
      library.querySelector("#fbSelectAll")?.addEventListener("click",()=>{const allSelected=visibleBooks.every(book=>selectedAois.has(book.aoiId));visibleBooks.forEach(book=>allSelected?selectedAois.delete(book.aoiId):selectedAois.add(book.aoiId));render();});
    library.querySelector("#fbDownloadSelected")?.addEventListener("click",async e=>{if(!selectedAois.size)return;const b=e.currentTarget;b.disabled=true;b.textContent="DOWNLOADING...";try{for(const id of selectedAois)await saveOfflineBook(id);offlineIds=new Set((await getOfflineBooks()).map(x=>x.aoiId));selectedAois.clear();render();alert("Field Books disponibles offline.");}catch(error){console.error(error);alert(`No se pudo descargar: ${error.message}`);render();}});
    library.querySelectorAll("[data-remove-offline]").forEach(b=>b.addEventListener("click",async()=>{if(!confirm(`Eliminar descarga offline de ${b.dataset.removeOffline}?`))return;await removeOfflineBook(b.dataset.removeOffline);offlineIds=new Set((await getOfflineBooks()).map(x=>x.aoiId));render();}));
    }
    window.addEventListener("fieldbook:show-library",()=>{
      document.body.classList.remove("field-book-book-open", "field-book-module-open");
      if (landing) { landing.style.display="none"; landing.classList.add("is-hidden"); }
      const content=document.getElementById("fieldBookContent");
      if (content) content.style.display="none";
      selectorAoi.value="";
      library.style.display="block";
      library.scrollIntoView({block:"start",behavior:"smooth"});
    });
    render();
  }

  function completarSelectorAoi() {
    selectorAoi.innerHTML = '<option value="">Seleccionar AOI</option>';

    const settingsPorAoi = new Map(
      (settingsEmbebidos.locationSettings || []).map(item => [normalizar(item.AOI_ID), item])
    );

    Object.keys(layoutsEmbebidos)
      .sort((a, b) => a.localeCompare(b))
      .forEach(aoiId => {
        const item = settingsPorAoi.get(normalizar(aoiId));
        const option = document.createElement("option");
        option.value = aoiId;
        option.textContent = item?.Location ? `${aoiId} · ${item.Location}` : aoiId;
        selectorAoi.appendChild(option);
      });
    montarBibliotecaVisual();
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

  function marcarHuellaShifts(aoiId) {
    const shifts = leerBlockShifts(aoiId).filter(shift => Number(shift.offset) !== 0);
    if (!shifts.length) return;

    const buttons = [...contenido.querySelectorAll(".field-book-real-plot")];
    const byKey = new Map(buttons.map(btn => [`${Number(btn.dataset.range)}|${Number(btn.dataset.column)}`, btn]));

    shifts.forEach(shift => {
      const column = Number(shift.column);
      const offset = Number(shift.offset) || 0;
      const originalFrom = Math.min(Number(shift.startRange), Number(shift.endRange));
      const originalTo = Math.max(Number(shift.startRange), Number(shift.endRange));
      const from = originalFrom + offset;
      const to = originalTo + offset;
      if (!Number.isFinite(column) || !Number.isFinite(from) || !Number.isFinite(to)) return;

      for (let range = from; range <= to; range++) {
        const btn = byKey.get(`${range}|${column}`);
        if (!btn) continue;

        const hasSiblingLeft = shifts.some(other =>
          Number(other.offset) !== 0 &&
          Number(other.column) === column - 1 &&
          range >= Math.min(Number(other.startRange), Number(other.endRange)) + (Number(other.offset) || 0) &&
          range <= Math.max(Number(other.startRange), Number(other.endRange)) + (Number(other.offset) || 0)
        );
        const hasSiblingRight = shifts.some(other =>
          Number(other.offset) !== 0 &&
          Number(other.column) === column + 1 &&
          range >= Math.min(Number(other.startRange), Number(other.endRange)) + (Number(other.offset) || 0) &&
          range <= Math.max(Number(other.startRange), Number(other.endRange)) + (Number(other.offset) || 0)
        );

        // Perímetro punteado persistente de la nueva posición del bloque desplazado.
        btn.style.borderTopStyle = range === to ? "dashed" : btn.style.borderTopStyle;
        btn.style.borderTopWidth = range === to ? "3px" : btn.style.borderTopWidth;
        btn.style.borderBottomStyle = range === from ? "dashed" : btn.style.borderBottomStyle;
        btn.style.borderBottomWidth = range === from ? "3px" : btn.style.borderBottomWidth;
        btn.style.borderLeftStyle = hasSiblingLeft ? btn.style.borderLeftStyle : "dashed";
        btn.style.borderLeftWidth = hasSiblingLeft ? btn.style.borderLeftWidth : "3px";
        btn.style.borderRightStyle = hasSiblingRight ? btn.style.borderRightStyle : "dashed";
        btn.style.borderRightWidth = hasSiblingRight ? btn.style.borderRightWidth : "3px";
        btn.style.borderTopColor = range === to ? "#d3a900" : btn.style.borderTopColor;
        btn.style.borderBottomColor = range === from ? "#d3a900" : btn.style.borderBottomColor;
        btn.style.borderLeftColor = hasSiblingLeft ? btn.style.borderLeftColor : "#d3a900";
        btn.style.borderRightColor = hasSiblingRight ? btn.style.borderRightColor : "#d3a900";
      }
    });
  }

  function aplicarMarcaBoton(boton, evento) {
    boton.querySelector(".field-book-status-mark")?.remove();
    boton.style.position = "relative";
    boton.style.boxShadow = "none";
    boton.style.borderWidth = "1px";
    boton.style.borderStyle = "solid";
    if (!evento?.status) {
      boton.style.borderColor = "#bfcac3";
      return;
    }
    const cfg = evento.status === "Shifted" ? shiftConfig : estadosEjecucion[evento.status];
    if (!cfg) return;
    boton.style.borderColor = cfg.color;
    boton.style.borderWidth = "3px";
    boton.style.boxShadow = `0 0 0 1px #fff inset,0 2px 7px ${cfg.color}35`;
    const marca = document.createElement("span");
    marca.className = "field-book-status-mark";
    marca.textContent = evento.status === "Shifted" ? simboloShift(evento.offset) : cfg.simbolo;
    marca.style.cssText = `position:absolute;right:1px;top:1px;min-width:16px;height:16px;padding:0 2px;border-radius:4px;background:${cfg.color};color:#fff;font-size:10px;line-height:16px;font-weight:900;text-align:center;border:1px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.16);`;
    boton.appendChild(marca);
  }
  function crearEjecucionHTML(aoiId, plot, layout) {
    if (!plot) return "";
    if ((leerVisit(aoiId).status || "Not started") === "Completed") {
      const evento = leerEventos(aoiId)[claveEvento(aoiId, plot.range, plot.column)] || {};
      const shift = shiftParaPlot(aoiId, plot.range, plot.column);
      const estado = evento.status || (shift ? `Shifted ${shift.offset > 0 ? "+" : ""}${shift.offset}` : "Normal");
      const comentario = evento.comment || shift?.comment || "-";
      return `<div style="margin-top:8px;padding:10px;border-top:1px solid #dce6e0;background:#f7faf8;border-radius:7px"><span class="section-label">PLANTING EXECUTION · READ ONLY</span><div style="margin-top:6px;color:#536159;font-size:10px"><b>Status:</b> ${estado}<br><b>Comment:</b> ${comentario}</div></div>`;
    }
    const evento = leerEventos(aoiId)[claveEvento(aoiId, plot.range, plot.column)] || {};
    const shift = shiftParaPlot(aoiId, plot.range, plot.column);
    const actualRange = shift ? Number(plot.range) + Number(shift.offset) : Number(plot.range);
    const actualColumn = Number(plot.column);
    const fuera = shift && (actualRange < Number(layout.rangeMin) || actualRange > Number(layout.rangeMax));
    const botones = Object.keys(estadosEjecucion).map(status => {
      const cfg = estadosEjecucion[status];
      const activo = status === evento.status;
      return `<button type="button" class="field-book-exec-status" data-status="${status}" style="min-height:72px;padding:9px 8px;border:2px solid ${cfg.color};border-radius:9px;background:${activo ? cfg.color : cfg.fondo};color:${activo ? '#fff' : cfg.color};font-size:13px;font-weight:950;cursor:pointer;white-space:nowrap">${cfg.simbolo} ${status}</button>`;
    }).join("");
    const restore = evento.status ? `<button id="fieldBookRestoreNormal" type="button" style="width:100%;margin-top:7px;padding:7px;border:1px solid #c7d4cc;border-radius:7px;background:#fff;color:#536159;font-weight:800;font-size:10px;cursor:pointer">↺ RESTORE TO NORMAL</button>` : "";
    const shiftInfo = shift ? `<div style="margin:8px 0;padding:8px;border-radius:7px;background:${shiftConfig.fondo};color:${shiftConfig.color};font-size:10px"><b>${simboloShift(shift.offset)} BLOCK SHIFT ${shift.offset > 0 ? '+' : ''}${shift.offset}</b><br>Planned: ${plot.range}-${plot.column}<br>Actual: ${actualRange}-${actualColumn}${fuera ? '<br><b>⚠ Outside planned layout</b>' : ''}<br>Range ${shift.startRange}-${shift.endRange} · Column ${shift.column}</div><button id="fieldBookRemoveShift" data-shift-id="${shift.id}" type="button" style="width:100%;padding:7px;border:1px solid #9fb8d5;border-radius:7px;background:#fff;color:#315d91;font-weight:800;font-size:10px;cursor:pointer">↺ REMOVE BLOCK SHIFT</button>` : "";
    return `
      <div id="fieldBookExecution" style="margin-top:10px;padding-top:10px;border-top:1px solid #dce6e0">
        <span class="section-label">PLANTING EXECUTION</span>
        <div style="margin-top:6px;color:#6c7a72;font-size:10px">${evento.status ? `Current issue: <b>${evento.status}</b>` : "No issues registered · Normal by default"}</div>
        ${shiftInfo}
        <div style="display:grid;grid-template-columns:1fr;gap:9px;margin:10px 0">${botones}<button type="button" id="fieldBookShiftBlock" style="min-height:72px;padding:9px 8px;border:2px solid ${shiftConfig.color};border-radius:9px;background:${shift ? shiftConfig.color : shiftConfig.fondo};color:${shift ? '#fff' : shiftConfig.color};font-size:13px;font-weight:950;cursor:pointer;box-shadow:0 2px 8px ${shiftConfig.color}22">↕ SHIFT BLOCK</button></div>
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
    overlay.querySelector("#fieldBookShiftApply").onclick=async()=>{
      const applyBtn=overlay.querySelector("#fieldBookShiftApply");
      applyBtn.disabled=true; applyBtn.textContent="SAVING...";
      const offset=Number(offsetEl.value); const shifts=leerBlockShifts(aoiId);
      const shift={id:`shift-${Date.now()}`,column:Number(plot.column),startRange:Number(plot.range),endRange:Number(overlay.dataset.endRange),offset,comment:overlay.querySelector("#fieldBookShiftComment").value.trim(),createdAt:new Date().toISOString()};
      shifts.push(shift); guardarBlockShifts(aoiId,shifts);
      try { await guardarBlockShiftRemoto(aoiId,shift); overlay.remove(); refrescar(); }
      catch(error) { console.error(error); overlay.remove(); refrescar(); alert(`Shift guardado localmente, pendiente de sincronización: ${error.message}`); }
    };
  }


  /* =========================================================
     SHIFT BLOCK GESTUAL - una sola maquinada / una sola Column
  ========================================================= */
  function habilitarShiftGestual(aoiId, layout, porCoord) {
    const plots = [...contenido.querySelectorAll(".field-book-real-plot")];
    if (!plots.length) return;

    const state = {
      mode: "idle", // idle | selecting | selected | moving
      selectionMode: "individual", // individual | machine
      pointerId: null,
      column: null,
      startRange: null,
      endRange: null,
      offset: 0,
      startY: 0,
      moved: false,
      longPressTimer: null,
      suppressClickUntil: 0
    };

    const rangeOf = el => Number(el?.dataset?.range);
    const columnOf = el => Number(el?.dataset?.column);
    const plotAtPoint = (x, y) => document.elementFromPoint(x, y)?.closest?.(".field-book-real-plot") || null;
    const selectedBounds = () => ({
      from: Math.min(Number(state.startRange), Number(state.endRange)),
      to: Math.max(Number(state.startRange), Number(state.endRange))
    });
    const machineColumns = () => {
      const selectedColumn = Number(state.column);
      const first = selectedColumn % 2 === 0 ? selectedColumn - 1 : selectedColumn;
      return [first, first + 1];
    };
    const activeColumns = () => state.selectionMode === "machine" ? machineColumns() : [Number(state.column)];
    const selectedPlots = () => {
      const { from, to } = selectedBounds();
      const columns = activeColumns();
      return plots.filter(el => columns.includes(columnOf(el)) && rangeOf(el) >= from && rangeOf(el) <= to);
    };

    function clearClasses() {
      plots.forEach(el => el.classList.remove("fb-shift-selected", "fb-shift-preview", "fb-shift-overlap"));
    }
    function clearGesture() {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
      clearClasses();
      state.mode = "idle";
      state.pointerId = null;
      state.column = null;
      state.startRange = null;
      state.endRange = null;
      state.offset = 0;
      state.moved = false;
      document.getElementById("fieldBookShiftGestureBar")?.remove();
    }
    function markSelection() {
      plots.forEach(el => el.classList.remove("fb-shift-selected"));
      selectedPlots().forEach(el => el.classList.add("fb-shift-selected"));
    }
    function updateSelection(target) {
      if (!target || columnOf(target) !== Number(state.column)) return;
      state.endRange = rangeOf(target);
      markSelection();
    }
    function previewOffset(offset) {
      state.offset = Number(offset) || 0;
      plots.forEach(el => el.classList.remove("fb-shift-preview", "fb-shift-overlap"));
      if (!state.offset) return { overlaps: 0, outside: 0 };
      const originals = new Set(selectedPlots().map(el => `${rangeOf(el)}|${columnOf(el)}`));
      let overlaps = 0;
      let outside = 0;
      selectedPlots().forEach(el => {
        const targetRange = rangeOf(el) + state.offset;
        const targetColumn = columnOf(el);
        const targetKey = `${targetRange}|${targetColumn}`;
        if (targetRange < Number(layout.rangeMin) || targetRange > Number(layout.rangeMax)) {
          outside += 1;
          return;
        }
        const target = plots.find(p => rangeOf(p) === targetRange && columnOf(p) === targetColumn);
        if (target) target.classList.add("fb-shift-preview");
        const occupied = porCoord.get(targetKey);
        if (occupied && !originals.has(targetKey)) {
          overlaps += 1;
          target?.classList.add("fb-shift-overlap");
        }
      });
      return { overlaps, outside };
    }

    function showSelectionBar() {
      document.getElementById("fieldBookShiftGestureBar")?.remove();
      const { from, to } = selectedBounds();
      const count = selectedPlots().length;
      const bar = document.createElement("div");
      bar.id = "fieldBookShiftGestureBar";
      bar.className = "fb-shift-gesture-bar";
      const cols = activeColumns();
      const columnLabel = cols.length === 2 ? `Columns ${cols[0]}-${cols[1]}` : `Column ${cols[0]}`;
      bar.innerHTML = `
        <div><b>SHIFT BLOCK</b><span>${columnLabel} · Range ${from}-${to} · ${count} plots</span></div>
        <div class="fb-shift-gesture-actions">
          <button type="button" data-action="individual" style="${state.selectionMode === 'individual' ? 'background:#174c31;color:#fff;' : ''}">INDIVIDUAL</button>
          <button type="button" data-action="machine" style="${state.selectionMode === 'machine' ? 'background:#174c31;color:#fff;' : ''}">MAQUINADA</button>
          <button type="button" data-action="cancel">CANCEL</button>
          <button type="button" data-action="help">DRAG BLOCK ↕</button>
        </div>`;
      document.body.appendChild(bar);
      bar.querySelector('[data-action="individual"]').onclick = () => {
        state.selectionMode = "individual";
        markSelection();
        showSelectionBar();
      };
      bar.querySelector('[data-action="machine"]').onclick = () => {
        state.selectionMode = "machine";
        markSelection();
        showSelectionBar();
      };
      bar.querySelector('[data-action="cancel"]').onclick = clearGesture;
      bar.querySelector('[data-action="help"]').onclick = () => {
        alert(state.selectionMode === "machine"
          ? `Maquinada fija: Columns ${activeColumns()[0]}-${activeColumns()[1]}. Arrastrá verticalmente una parcela seleccionada para mover ambas columnas juntas.`
          : "Individual: arrastrá verticalmente la selección para mover una sola columna.");
      };
    }

    function openConfirm() {
      if (!state.offset) { state.mode = "selected"; showSelectionBar(); return; }
      const info = previewOffset(state.offset);
      const { from, to } = selectedBounds();
      document.getElementById("fieldBookShiftGestureConfirm")?.remove();
      const overlay = document.createElement("div");
      overlay.id = "fieldBookShiftGestureConfirm";
      overlay.className = "fb-shift-confirm-overlay";
      const destinationFrom = from + state.offset;
      const destinationTo = to + state.offset;
      overlay.innerHTML = `<div class="fb-shift-confirm-card">
        <span class="section-label">SHIFT BLOCK · PREVIEW</span>
        <h3>${state.selectionMode === "machine" ? `Columns ${activeColumns()[0]}-${activeColumns()[1]}` : `Column ${state.column}`}</h3>
        <div class="fb-shift-confirm-grid">
          <span>Selected ranges</span><b>${from}-${to}</b>
          <span>Movement</span><b>${state.offset > 0 ? "+" : ""}${state.offset}</b>
          <span>Actual position</span><b>${destinationFrom}-${destinationTo}</b>
          <span>Plots shifted</span><b>${selectedPlots().length}</b>
          <span>Overlaps</span><b class="${info.overlaps ? 'is-warning' : ''}">${info.overlaps}</b>
          <span>Outside layout</span><b class="${info.outside ? 'is-danger' : ''}">${info.outside}</b>
        </div>
        <p>Overlap and outside-layout positions are allowed and remain traceable. Existing destination plots are never deleted.</p>
        <textarea id="fieldBookShiftGestureComment" rows="3" placeholder="Shift comment..."></textarea>
        <div class="fb-shift-confirm-actions"><button data-action="back">BACK</button><button data-action="confirm">CONFIRM SHIFT</button></div>
      </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('[data-action="back"]').onclick = () => { overlay.remove(); previewOffset(0); state.mode="selected"; showSelectionBar(); };
      overlay.querySelector('[data-action="confirm"]').onclick = async event => {
        const btn = event.currentTarget;
        btn.disabled = true; btn.textContent = "SAVING...";
        const comment = overlay.querySelector("#fieldBookShiftGestureComment").value.trim();
        const timestamp = Date.now();
        const newShifts = activeColumns().map((column, index) => ({
          id: `shift-${timestamp}-${index}`,
          column: Number(column),
          startRange: from,
          endRange: to,
          offset: Number(state.offset),
          comment,
          createdAt: new Date().toISOString()
        }));
        const shifts = leerBlockShifts(aoiId);
        shifts.push(...newShifts);
        guardarBlockShifts(aoiId, shifts);
        try {
          for (const shift of newShifts) {
            await guardarBlockShiftRemoto(aoiId, shift);
          }
          const firstShift = newShifts[0];
          overlay.remove(); clearGesture();
          reabrirFieldMapEnPlot(aoiId, from, firstShift.column);
        } catch (error) {
          console.error(error);
          const firstShift = newShifts[0];
          overlay.remove(); clearGesture();
          reabrirFieldMapEnPlot(aoiId, from, firstShift.column);
          alert(`Shift guardado localmente, pendiente de sincronización: ${error.message}`);
        }
      };
    }

    function beginSelection(el, event) {
      state.mode = "selecting";
      state.pointerId = event.pointerId;
      state.column = columnOf(el);
      state.startRange = rangeOf(el);
      state.endRange = state.startRange;
      state.startY = event.clientY;
      state.moved = true;
      markSelection();
      state.suppressClickUntil = Date.now() + 700;
      navigator.vibrate?.(18);
    }

    plots.forEach(el => {
      el.addEventListener("click", event => {
        if (Date.now() < state.suppressClickUntil || state.mode === "selected" || state.mode === "moving") {
          event.preventDefault(); event.stopImmediatePropagation();
        }
      }, true);

      el.addEventListener("pointerdown", event => {
        if (event.button != null && event.button !== 0) return;
        if (state.mode === "selected" && el.classList.contains("fb-shift-selected")) {
          state.mode = "moving";
          state.pointerId = event.pointerId;
          state.startY = event.clientY;
          state.offset = 0;
          state.suppressClickUntil = Date.now() + 900;
          event.preventDefault();
          return;
        }
        if (state.mode !== "idle") return;
        state.pointerId = event.pointerId;
        state.startY = event.clientY;
        state.moved = false;
        if (event.pointerType === "mouse") {
          // Mouse: selection starts as soon as the pointer is dragged.
          state.column = columnOf(el); state.startRange = rangeOf(el); state.endRange = state.startRange;
        } else {
          // Touch/pen: long press prevents accidental selection while scrolling.
          state.longPressTimer = setTimeout(() => beginSelection(el, event), 420);
        }
      });
    });

    document.addEventListener("pointermove", event => {
      if (state.pointerId !== event.pointerId) return;
      if (state.mode === "idle" && event.pointerType === "mouse" && state.column != null) {
        if (Math.abs(event.clientY - state.startY) > 5) {
          const original = plots.find(p => columnOf(p)===Number(state.column) && rangeOf(p)===Number(state.startRange));
          if (original) beginSelection(original, event);
        }
      }
      if (state.mode === "selecting") {
        event.preventDefault();
        const target = plotAtPoint(event.clientX, event.clientY);
        updateSelection(target);
        return;
      }
      if (state.mode === "moving") {
        event.preventDefault();
        const sample = selectedPlots()[0];
        const cellStep = Math.max(31, (sample?.getBoundingClientRect().height || 34) + 3);
        // Range values increase upward on the rendered map.
        const offset = -Math.round((event.clientY - state.startY) / cellStep);
        previewOffset(offset);
      }
    }, { passive: false });

    document.addEventListener("pointerup", event => {
      if (state.pointerId !== event.pointerId) return;
      clearTimeout(state.longPressTimer); state.longPressTimer = null;
      if (state.mode === "selecting") {
        state.mode = "selected";
        state.pointerId = null;
        state.suppressClickUntil = Date.now() + 700;
        showSelectionBar();
        return;
      }
      if (state.mode === "moving") {
        state.pointerId = null;
        state.suppressClickUntil = Date.now() + 700;
        openConfirm();
        return;
      }
      // Tap without drag/long press remains a normal plot click.
      state.pointerId = null;
      state.column = null; state.startRange = null; state.endRange = null;
    });

    document.addEventListener("pointercancel", event => {
      if (state.pointerId !== event.pointerId) return;
      clearTimeout(state.longPressTimer); state.longPressTimer = null;
      if (state.mode === "selecting" || state.mode === "moving") clearGesture();
      else { state.pointerId=null; state.column=null; state.startRange=null; state.endRange=null; }
    });
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

  async function guardarVisitRemota(aoiId,visitStatus){const loc=obtenerLocationSetting(aoiId)||{};const local=leerVisit(aoiId);const visitId=local.visitId||crearVisitId(aoiId);const startedAt=local.startedAt||new Date().toISOString();const completedAt=visitStatus==="Completed"?new Date().toISOString():null;const payload={type:"visit",visitId,season:loc.Season||"",aoiId,location:loc.Location||"",config:loc.Config||"",visitStatus,comment:"",startedAt,completedAt};let syncPending=false;try{await guardarConCola(payload);}catch(error){syncPending=true;console.warn("Visita guardada localmente; sincronizacion pendiente",error);}return{...local,visitId,status:visitStatus,startedAt,completedAt,syncPending};}

  function contextoRemoto(aoiId) {
    const visit = leerVisit(aoiId);
    const loc = obtenerLocationSetting(aoiId) || {};
    if (!visit.visitId) throw new Error("Field Book no tiene VisitId activo");
    return { visitId:visit.visitId, season:loc.Season || "", aoiId, location:loc.Location || "", config:loc.Config || "" };
  }

  async function guardarPlotEventRemoto(aoiId, range, column, status, comment) {
    await guardarConCola({ type:"plotEvent", ...contextoRemoto(aoiId), range:Number(range), column:Number(column), status, comment:String(comment || "") });
  }

  async function guardarBlockShiftRemoto(aoiId, shift) {
    await guardarConCola({ type:"blockShift", ...contextoRemoto(aoiId), shiftId:shift.id, column:Number(shift.column), startRange:Number(shift.startRange), endRange:Number(shift.endRange), offset:Number(shift.offset), comment:String(shift.comment || "") });
  }

  async function guardarChecklistRemoto(aoiId, respuestas) {
    const contexto = contextoRemoto(aoiId);
    const payloads = checklistTemplate.map(item => {
      const response = respuestas[item.id] || { status:"Pending", comment:"" };
      return { type:"checklist", ...contexto, checkId:item.id, section:item.section, label:item.label, checkStatus:response.status || "Pending", comment:String(response.comment || "") };
    });
    const operationKeys = payloads.map(payload => encolarPayload(payload).operationKey);
    if (!navigator.onLine) throw new Error("Checklist guardado localmente y pendiente de sincronizacion.");
    await sincronizarPendientes();
    const remaining = new Set(leerSyncQueue().map(item => item.operationKey));
    if (operationKeys.some(key => remaining.has(key))) throw new Error("Checklist guardado localmente; quedan elementos pendientes de sincronizacion.");
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
    const metrics = metricasChecklist(aoiId);
    const checklistReadOnly = leerVisit(aoiId).status === "Completed";
    const pct = metrics.total ? Math.round((metrics.completed / metrics.total) * 100) : 0;
    const statusStyle = status => {
      if (status === "OK") return { bg:"#e6f5eb", border:"#68a97c", color:"#0b6b3a", mark:"✓", label:"OK" };
      if (status === "Observation") return { bg:"#fff4dc", border:"#d8a72b", color:"#8a6400", mark:"!", label:"OBS" };
      if (status === "Problem") return { bg:"#fdeaea", border:"#ca6b6b", color:"#9b2f2f", mark:"×", label:"PROBLEM" };
      if (status === "N/A") return { bg:"#eef1ef", border:"#aeb9b2", color:"#66736b", mark:"–", label:"N/A" };
      return { bg:"#fff", border:"#d5dfd9", color:"#748078", mark:"○", label:"PENDING" };
    };
    const sectionNames = {
      "Antes de sembrar":"FIELD SETUP",
      "Configuración":"PLANTER SETUP",
      "Ejecución y cierre":"TRIAL / FINAL CHECK"
    };
    const itemLabel = label => String(label || "").replace(" verificados","").replace(" verificada","").replace(" verificado","").replace(" colocados","");
    const coordinates = [2,3,1,4].map(corner => {
      const position = {2:"top:8px;left:8px",3:"top:8px;right:8px",1:"bottom:8px;left:8px",4:"bottom:8px;right:8px"}[corner];
      return `
        <div class="fb-field-corner" data-corner="${corner}" style="position:absolute;${position};z-index:3">
          <button type="button" class="fb-corner-marker" ${checklistReadOnly ? "disabled" : ""} style="width:50px;height:50px;border:3px solid #2f9e44;border-radius:50% 50% 50% 8px;background:#fff;color:#174c31;font-size:18px;font-weight:950;box-shadow:0 5px 13px rgba(23,76,49,.18);cursor:pointer;transform:rotate(-45deg)"><span style="display:block;transform:rotate(45deg)">${corner}</span></button>
          <div class="fb-corner-panel" style="display:none;position:absolute;${corner===2||corner===1?'left:0':'right:0'};${corner===2||corner===3?'top:58px':'bottom:58px'};width:235px;padding:11px;border:1px solid #bfcfc5;border-radius:11px;background:#fff;box-shadow:0 12px 28px rgba(23,76,49,.17);z-index:8">
            <div style="display:flex;justify-content:space-between;align-items:center"><b style="color:#174c31;font-size:10px">CORNER ${corner}</b><button type="button" class="fb-corner-close" style="border:0;background:transparent;color:#6f7e76;font-size:14px;cursor:pointer">×</button></div>
            <div class="fb-coordinate-value" style="min-height:30px;margin-top:6px;color:#6f7e76;font-size:8.5px;line-height:1.45">No coordinate</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:7px"><button type="button" class="fb-coordinate-auto" style="padding:7px 4px;border:1px solid #0b6b3a;border-radius:6px;background:#e7f5ec;color:#0b6b3a;font-size:8px;font-weight:900">📍 GPS</button><button type="button" class="fb-coordinate-manual-toggle" style="padding:7px 4px;border:1px solid #9caaa2;border-radius:6px;background:#fff;color:#536159;font-size:8px;font-weight:900">✎ MANUAL</button></div>
            <div class="fb-coordinate-manual" style="display:none;margin-top:6px;padding-top:6px;border-top:1px solid #edf2ef"><div style="display:grid;grid-template-columns:1fr 1fr;gap:4px"><input class="fb-coordinate-lat" inputmode="decimal" placeholder="Latitude" style="min-width:0;width:100%;box-sizing:border-box;padding:6px;border:1px solid #cad6cf;border-radius:6px;font-size:8px"><input class="fb-coordinate-lon" inputmode="decimal" placeholder="Longitude" style="min-width:0;width:100%;box-sizing:border-box;padding:6px;border:1px solid #cad6cf;border-radius:6px;font-size:8px"></div><button type="button" class="fb-coordinate-save-manual" style="width:100%;margin-top:5px;padding:6px;border:0;border-radius:6px;background:#174c31;color:#fff;font-size:8px;font-weight:900">SAVE</button></div>
          </div>
        </div>`;
    }).join("");
    const sections = [...new Set(checklistTemplate.map(x => x.section))];
    const sectionHTML = sections.map(section => {
      const cards = checklistTemplate.filter(x => x.section === section && x.id !== "CLS_ISSUES").map(item => {
        const response = respuestas[item.id] || { status:"Pending", comment:"" };
        const st = statusStyle(response.status || "Pending");
        const needsComment = response.status === "Observation" || response.status === "Problem" || Boolean(response.comment);
        return `<div class="field-book-check-row field-book-check-card" data-check-id="${item.id}" data-status="${response.status || 'Pending'}" style="min-height:122px;padding:13px;border:2px solid ${st.border};border-radius:13px;background:${st.bg};box-shadow:0 4px 13px rgba(23,76,49,.05);position:relative">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><strong style="color:#263d31;font-size:11px;line-height:1.35">${itemLabel(item.label)}</strong><b style="min-width:27px;height:27px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:${st.color};color:#fff;font-size:14px">${st.mark}</b></div>
          <div class="fb-check-actions" style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:12px">
            <button type="button" data-status="OK" ${checklistReadOnly?'disabled':''} style="padding:7px 3px;border:1px solid #68a97c;border-radius:7px;background:${response.status==='OK'?'#0b6b3a':'#fff'};color:${response.status==='OK'?'#fff':'#0b6b3a'};font-size:8px;font-weight:950;cursor:pointer">✓ OK</button>
            <button type="button" data-status="Observation" ${checklistReadOnly?'disabled':''} style="padding:7px 3px;border:1px solid #d8a72b;border-radius:7px;background:${response.status==='Observation'?'#d8a72b':'#fff'};color:${response.status==='Observation'?'#fff':'#8a6400'};font-size:8px;font-weight:950;cursor:pointer">! OBS</button>
            <button type="button" data-status="Problem" ${checklistReadOnly?'disabled':''} style="padding:7px 3px;border:1px solid #ca6b6b;border-radius:7px;background:${response.status==='Problem'?'#9b2f2f':'#fff'};color:${response.status==='Problem'?'#fff':'#9b2f2f'};font-size:8px;font-weight:950;cursor:pointer">× PROB</button>
            <button type="button" data-status="N/A" ${checklistReadOnly?'disabled':''} style="padding:7px 3px;border:1px solid #aeb9b2;border-radius:7px;background:${response.status==='N/A'?'#66736b':'#fff'};color:${response.status==='N/A'?'#fff':'#66736b'};font-size:8px;font-weight:950;cursor:pointer">N/A</button>
          </div>
          <div class="fb-check-comment-wrap" style="display:${needsComment?'block':'none'};margin-top:8px">
            <textarea class="field-book-check-comment" rows="2" placeholder="Comment..." ${checklistReadOnly?'disabled':''} style="width:100%;box-sizing:border-box;padding:7px;border:1px solid #cad6cf;border-radius:7px;background:#fff;font-size:9px;resize:vertical">${String(response.comment || '').replace(/</g,'&lt;')}</textarea>
          </div>
          <button type="button" class="fb-check-comment-toggle" ${checklistReadOnly?'disabled':''} style="margin-top:7px;padding:0;border:0;background:transparent;color:#607067;font-size:8px;font-weight:800;cursor:pointer">${needsComment?'HIDE COMMENT':'+ COMMENT'}</button>
          <input type="hidden" class="field-book-check-status" value="${response.status || 'Pending'}">
        </div>`;
      }).join("");
      return `<section style="margin-top:18px"><div style="display:flex;align-items:center;gap:9px;margin-bottom:9px"><span style="width:7px;height:7px;border-radius:50%;background:#0b6b3a"></span><b style="color:#174c31;font-size:10px;letter-spacing:.08em">${sectionNames[section] || section.toUpperCase()}</b></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px">${cards}</div></section>`;
    }).join("");
    return `<section style="padding:16px;border:1px solid #d9e3dd;border-radius:14px;background:linear-gradient(180deg,#f8fbf9 0%,#f2f7f4 100%)">
      <div style="display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap"><div><span class="section-label">PLANTING CHECKLIST</span><h2 style="margin:4px 0 0;color:#173f2b;font-size:22px">${aoiId}</h2></div><span style="padding:7px 10px;border-radius:999px;background:#fff;border:1px solid #cddbd3;color:#174c31;font-size:9px;font-weight:900">${pct}% COMPLETE</span></div>
      <div style="margin-top:13px;height:8px;border-radius:999px;background:#dde7e1;overflow:hidden"><div style="width:${pct}%;height:100%;background:#0b6b3a"></div></div>
      <div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:9px;color:#536159;font-size:9px;font-weight:850"><span>✓ ${metrics.completed} completed</span><span style="color:#8a6400">! ${metrics.observations} observations</span><span style="color:#9b2f2f">× ${metrics.problems} problems</span><span>○ ${metrics.pending} pending</span></div>
      <section style="margin-top:15px;padding:12px;border:1px solid #d5dfd9;border-radius:13px;background:#f0f6f2"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><b style="color:#174c31;font-size:10px;letter-spacing:.08em">FIELD COORDINATES</b><div style="margin-top:2px;color:#748078;font-size:8.5px">Tap a numbered corner · GPS or manual entry</div></div><span style="color:#174c31;font-size:15px">⌖</span></div><div class="fb-field-coordinate-map" style="position:relative;height:320px;max-width:800px;margin:10px auto 2px;box-sizing:border-box"><div style="position:absolute;left:70px;right:70px;top:55px;bottom:55px;border:4px solid #39a844;border-radius:10px;background:linear-gradient(135deg,#f2fbdf,#dff3b6);overflow:hidden"><div style="position:absolute;inset:14px;opacity:.22;background:repeating-linear-gradient(90deg,transparent 0 42px,#65b84d 42px 45px)"></div><div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#174c31"><strong style="display:block;font-size:24px;font-weight:950;line-height:1.05;letter-spacing:.02em">${aoiId}</strong><span style="display:block;margin-top:7px;font-size:9px;color:#4f765b;font-weight:800;letter-spacing:.12em">FIELD AREA</span></div></div>${coordinates}</div></section>
      ${sectionHTML}
      ${checklistReadOnly ? `<div style="margin-top:16px;padding:10px;border-radius:9px;background:#eaf4ed;color:#0b6b3a;font-size:10px;font-weight:900;text-align:center">FIELD BOOK COMPLETED · CHECKLIST READ ONLY</div>` : `<button id="fieldBookSaveChecklist" type="button" style="width:100%;margin-top:18px;padding:13px;border:0;border-radius:10px;background:#0b6b3a;color:#fff;font-size:11px;font-weight:950;cursor:pointer;box-shadow:0 6px 16px rgba(11,107,58,.16)">SAVE CHECKLIST</button>`}
      <div id="fieldBookChecklistMsg" style="margin-top:7px;color:#6c7a72;font-size:9px;text-align:center">Saved locally in LAB.</div>
    </section>`;
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

  let fieldBookAoiActivo = "";

  function elementosCabeceraFieldBook() {
    return {
      warning: document.querySelector(".lab-warning"),
      header: document.querySelector(".field-book-header"),
      selector: document.querySelector(".field-book-selector")
    };
  }

  function mostrarCabeceraPrincipal(mostrar) {
    const elementos = elementosCabeceraFieldBook();
    [elementos.warning, elementos.header, elementos.selector].forEach(el => {
      if (el) el.style.display = mostrar ? "" : "none";
    });
    document.body.classList.toggle("field-book-module-open", !mostrar);
  }

  function ocultarVistasFieldBook() {
    ["fieldBookOverviewView","fieldBookLayoutView","fieldBookChecklistView","fieldBookIssuesView"].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.hidden = true;
      el.style.display = "none";
    });
  }

  function abrirModuloFieldBook(vista) {
    const home = document.getElementById("fieldBookModuleHome");
    const toolbar = document.getElementById("fieldBookModuleToolbar");
    const titulo = document.getElementById("fieldBookModuleTitle");
    if (home) home.style.display = "none";
    if (toolbar) toolbar.style.display = "flex";
    mostrarCabeceraPrincipal(false);
    activarVistaFieldBook(vista);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function volverInicioFieldBook() {
    ocultarVistasFieldBook();
    const home = document.getElementById("fieldBookModuleHome");
    const toolbar = document.getElementById("fieldBookModuleToolbar");
    if (toolbar) toolbar.style.display = "none";
    if (home) home.style.display = "block";
    mostrarCabeceraPrincipal(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function crearHomeModularFieldBook(aoiId, layout, procesoIniciado) {
    const loc = obtenerLocationSetting(aoiId) || {};
    const visit = leerVisit(aoiId);
    const checklist = metricasChecklist(aoiId);
    const issues = metricasIssues(aoiId);
    const estado = visit.status || "Not started";
    const shell = contenido.firstElementChild;
    if (!shell) return;

    const cabeceraAoi = shell.children[0];
    const tabs = shell.children[1];
    if (cabeceraAoi) cabeceraAoi.style.display = "none";
    if (tabs) tabs.style.display = "none";

    const toolbar = document.createElement("div");
    toolbar.id = "fieldBookModuleToolbar";
    toolbar.style.cssText = "display:none;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;padding:9px 12px;border:1px solid #cddbd3;border-radius:11px;background:#fff;box-shadow:0 4px 15px rgba(23,76,49,.07);position:sticky;top:6px;z-index:50";
    toolbar.innerHTML = `<button id="fieldBookBackHome" type="button" style="min-height:38px;padding:8px 12px;border:1px solid #174c31;border-radius:9px;background:#fff;color:#174c31;font-size:10px;font-weight:900;cursor:pointer">← FIELD BOOK</button><div style="text-align:center"><strong id="fieldBookModuleTitle" style="display:block;color:#174c31;font-size:20px;font-weight:950">${aoiId}</strong><span style="display:block;margin-top:3px;color:#5f7167;font-size:10px;font-weight:800">${loc.Location || ""}${loc.Crop ? ` · ${loc.Crop}` : ""}${loc.Season ? ` · ${loc.Season}` : ""}</span></div><span style="padding:6px 9px;border-radius:999px;background:${navigator.onLine ? '#e7f5ec' : '#fff3d6'};color:${navigator.onLine ? '#0b6b3a' : '#995c00'};font-size:9px;font-weight:900">${navigator.onLine ? '● ONLINE' : '○ OFFLINE'}</span>`;

    const home = document.createElement("section");
    home.id = "fieldBookModuleHome";
    home.innerHTML = `<div style="padding:19px;border:1px solid #cddbd3;border-radius:14px;background:linear-gradient(135deg,#f7fbf8 0%,#edf7f1 100%);box-shadow:0 7px 24px rgba(23,76,49,.08)"><span class="section-label">ACTIVE FIELD BOOK</span><div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;margin-top:5px"><div><h2 style="margin:0;color:#174c31;font-size:24px">${loc.Location || aoiId}</h2><div style="margin-top:5px;color:#5f7167;font-size:12px">${aoiId} · ${loc.Crop || '-'} · ${loc.Season || '-'}</div></div><span style="padding:7px 11px;border-radius:999px;background:#fff;border:1px solid #cddbd3;color:#174c31;font-size:10px;font-weight:900">${estado.toUpperCase()}</span></div><p style="margin:12px 0 0;max-width:700px;color:#66786e;font-size:11px;line-height:1.5">Select a workspace to continue with planting execution.</p></div><div class="field-book-module-grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin-top:14px"><button class="field-book-module-card" data-module="overview" type="button" style="min-height:150px;padding:18px;text-align:left;border:1px solid #cddbd3;border-radius:14px;background:#fff;box-shadow:0 5px 17px rgba(23,76,49,.07);cursor:pointer"><span style="display:inline-flex;width:38px;height:38px;align-items:center;justify-content:center;border-radius:11px;background:#e7f5ec;color:#0b6b3a;font-size:19px;font-weight:900">▦</span><h3 style="margin:13px 0 4px;color:#174c31;font-size:17px">Overview</h3><p style="margin:0;color:#6c7a72;font-size:11px;line-height:1.45">Status, setup and execution progress.</p><strong style="display:block;margin-top:13px;color:#0b6b3a;font-size:10px">${estado.toUpperCase()} →</strong></button><button class="field-book-module-card" data-module="layout" type="button" ${procesoIniciado ? '' : 'disabled'} style="min-height:150px;padding:18px;text-align:left;border:1px solid #174c31;border-radius:14px;background:linear-gradient(135deg,#174c31,#0b6b3a);box-shadow:0 7px 22px rgba(23,76,49,.19);cursor:${procesoIniciado ? 'pointer' : 'not-allowed'};opacity:${procesoIniciado ? '1' : '.48'}"><span style="display:inline-flex;width:38px;height:38px;align-items:center;justify-content:center;border-radius:11px;background:rgba(255,255,255,.14);color:#fff;font-size:19px;font-weight:900">▦</span><h3 style="margin:13px 0 4px;color:#fff;font-size:17px">Field Map</h3><p style="margin:0;color:#dcece3;font-size:11px;line-height:1.45">Interactive map, plot events and block shifts.</p><strong style="display:block;margin-top:13px;color:#fff;font-size:10px">${layout.plotRecordCount || 0} PLOTS · ${issues.total} ISSUES →</strong></button><button class="field-book-module-card" data-module="checklist" type="button" ${procesoIniciado ? '' : 'disabled'} style="min-height:150px;padding:18px;text-align:left;border:1px solid #cddbd3;border-radius:14px;background:#fff;box-shadow:0 5px 17px rgba(23,76,49,.07);cursor:${procesoIniciado ? 'pointer' : 'not-allowed'};opacity:${procesoIniciado ? '1' : '.48'}"><span style="display:inline-flex;width:38px;height:38px;align-items:center;justify-content:center;border-radius:11px;background:#eaf2fb;color:#315d91;font-size:19px;font-weight:900">✓</span><h3 style="margin:13px 0 4px;color:#174c31;font-size:17px">Checklist</h3><p style="margin:0;color:#6c7a72;font-size:11px;line-height:1.45">Planting controls, GPS coordinates and signature.</p><strong style="display:block;margin-top:13px;color:#315d91;font-size:10px">${checklist.completed}/${checklist.total} COMPLETED →</strong></button><button class="field-book-module-card" data-module="issues" type="button" ${procesoIniciado ? '' : 'disabled'} style="min-height:150px;padding:18px;text-align:left;border:1px solid #cddbd3;border-radius:14px;background:#fff;box-shadow:0 5px 17px rgba(23,76,49,.07);cursor:${procesoIniciado ? 'pointer' : 'not-allowed'};opacity:${procesoIniciado ? '1' : '.48'}"><span style="display:inline-flex;width:38px;height:38px;align-items:center;justify-content:center;border-radius:11px;background:#fff3d6;color:#995c00;font-size:19px;font-weight:900">!</span><h3 style="margin:13px 0 4px;color:#174c31;font-size:17px">Issues</h3><p style="margin:0;color:#6c7a72;font-size:11px;line-height:1.45">Review exceptions, comments and shifts.</p><strong style="display:block;margin-top:13px;color:#995c00;font-size:10px">${issues.total} REGISTERED →</strong></button></div>`;

    shell.insertBefore(toolbar, shell.firstChild);
    shell.insertBefore(home, toolbar.nextSibling);
    toolbar.querySelector("#fieldBookBackHome")?.addEventListener("click", volverInicioFieldBook);
    home.querySelectorAll(".field-book-module-card").forEach(card => {
      card.addEventListener("click", () => {
        if (card.disabled) return;
        abrirModuloFieldBook(card.dataset.module);
      });
    });
    fieldBookAoiActivo = aoiId;
    volverInicioFieldBook();
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

  function reabrirFieldMapEnPlot(aoiId, range, column) {
    renderizarAoi(aoiId);
    abrirModuloFieldBook("layout");

    const target = contenido.querySelector(
      `.field-book-real-plot[data-range="${range}"][data-column="${column}"]`
    );

    if (!target) return;

    target.click();
    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center"
    });
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
      const header = columnas.map(c => `<div style="width:52px;min-width:52px;text-align:center;font-size:9px;font-weight:900;color:#44594d">C${c}</div>`).join("");
      const filas = ranges.map(r => `<div style="display:flex;gap:3px;margin-bottom:3px;align-items:center"><div style="position:sticky;left:0;z-index:2;width:38px;min-width:38px;text-align:center;background:#eef6f1;color:#174c31;font-size:10px;font-weight:900;padding:9px 0;border-radius:5px">R${r}</div>${columnas.map(c => { const plot=porCoord.get(`${r}|${c}`); if(!plot) return `<div style="width:44px;min-width:44px;height:28px;border:1px dashed #e2e9e5;border-radius:4px"></div>`; const esBuffer = plot.type === "BUFFER" || String(plot.experimentName || "").toLowerCase() === "buffer"; const color = esBuffer ? "#e2e5e3" : (colorPorExperimento.get(plot.experimentName)||"#e7ece9"); return `<button class="field-book-real-plot" data-range="${r}" data-column="${c}" type="button" style="width:52px;min-width:52px;height:34px;border:1px solid #bfcac3;border-radius:5px;background:${color};font-size:9px;font-weight:900;cursor:pointer;white-space:nowrap;transition:.12s ease">${r}-${c}</button>`; }).join("")}</div>`).join("");
      contenido.innerHTML = `<div style="padding:18px"><div style="display:flex;justify-content:space-between;gap:15px;margin-bottom:14px"><div><span class="section-label">AOI</span><h2 style="margin:0;color:#174c31">${aoiId}</h2><div style="margin-top:5px;color:#6c7a72;font-size:12px">${layoutReal.trial?.year || "-"} · Season ${layoutReal.trial?.season || "-"}</div></div><span style="padding:6px 9px;border-radius:999px;background:#e7f5ec;color:#0b6b3a;font-size:10px;font-weight:900;height:max-content">REAL LAYOUT · READ ONLY</span></div><div style="display:flex;gap:7px;margin-bottom:12px;flex-wrap:wrap"><button id="fieldBookTabOverview" type="button" style="padding:8px 15px;border:1px solid #174c31;border-radius:8px;background:#174c31;color:#fff;font-size:10px;font-weight:900;cursor:pointer">OVERVIEW</button><button id="fieldBookTabLayout" type="button" style="padding:8px 15px;border:1px solid #c8d5ce;border-radius:8px;background:#fff;color:#536159;font-size:10px;font-weight:900;cursor:pointer">FIELD MAP</button><button id="fieldBookTabChecklist" type="button" style="padding:8px 15px;border:1px solid #c8d5ce;border-radius:8px;background:#fff;color:#536159;font-size:10px;font-weight:900;cursor:pointer">CHECKLIST</button><button id="fieldBookTabIssues" type="button" style="padding:8px 15px;border:1px solid #c8d5ce;border-radius:8px;background:#fff;color:#536159;font-size:10px;font-weight:900;cursor:pointer">ISSUES</button></div><div id="fieldBookOverviewView">${crearOverviewHTML(aoiId, layout)}</div><div id="fieldBookLayoutView" hidden style="display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,230px);gap:10px"><section style="min-width:0;padding:12px;border:1px solid #cddbd3;border-radius:12px;background:#f5faf7;box-shadow:0 4px 16px rgba(23,76,49,.06)"><div style="display:grid;grid-template-columns:minmax(360px,.9fr) minmax(560px,1.45fr);gap:9px;align-items:start"><div><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px"><div><h2 style="margin:0;color:#174c31;font-size:21px">Interactive Planting Map</h2><p style="margin:3px 0 0;color:#536159;font-size:12px;font-weight:700">Range ${layout.rangeMin}-${layout.rangeMax} · Column ${layout.columnMin}-${layout.columnMax} · ${layout.plotRecordCount} plots · ${experimentos.length} experiments</p></div><button id="fieldBookExportMenu" type="button" style="padding:7px 10px;border:1px solid #174c31;border-radius:8px;background:#fff;color:#174c31;font-size:10px;font-weight:900;cursor:pointer">EXPORT ▾</button></div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px"><span style="padding:7px 10px;border-radius:9px;background:#fff3d6;border:2px solid #995c00;font-size:9px;font-weight:950;color:#995c00">R Refilled · ${metricasIssues(aoiId).refilled}</span><span style="padding:7px 10px;border-radius:9px;background:#fdeaea;border:2px solid #8b2d2d;font-size:9px;font-weight:950;color:#8b2d2d">X Lost · ${metricasIssues(aoiId).lost}</span><span style="padding:7px 10px;border-radius:9px;background:#f2edfb;border:2px solid #674d9b;font-size:9px;font-weight:950;color:#674d9b">! Observation · ${metricasIssues(aoiId).observations}</span><span style="padding:7px 10px;border-radius:9px;background:#eaf2fb;border:2px solid #315d91;font-size:9px;font-weight:950;color:#315d91">↕ Shift · ${metricasIssues(aoiId).shifts}</span></div></div><section style="padding:7px 10px;border:1px solid #bfd4c7;border-radius:10px;background:#fff;min-height:54px"><span class="section-label">PLOT DETAIL</span><div id="fieldBookRealDetail" style="margin-top:3px;color:#536159;font-size:12px;line-height:1.2">Select a plot to view its data.</div></section></div><div style="display:flex;justify-content:flex-end;margin:3px 0 5px"><span style="padding:5px 8px;border-radius:7px;background:#fff9d8;border:1px solid #d5bc24;color:#8b7600;font-size:9px;font-weight:900">● Stake points · next phase</span></div><div style="overflow:auto;max-height:76vh;padding:10px;border:1px solid #cbd8d0;border-radius:10px;background:#fff;box-shadow:inset 0 0 0 1px #f1f5f2"><div style="display:flex;gap:3px;margin:0 0 6px 41px;width:max-content">${header}</div><div style="width:max-content">${filas}</div></div></section><aside style="padding:12px;border:2px solid #cddbd3;border-radius:12px;background:#fff;max-height:82vh;overflow:auto;box-shadow:0 4px 16px rgba(23,76,49,.06)"><div style="padding:2px 2px 6px"><span class="section-label">FIELD ACTIONS</span><p style="margin:4px 0 0;color:#6c7a72;font-size:9px">Select a plot and register the field event.</p></div><div id="fieldBookActionsPanel" style="margin-top:6px"><div style="padding:16px 8px;text-align:center;color:#89978f;font-size:10px;border:1px dashed #d8e2dc;border-radius:9px">Select a plot</div></div></aside></div><div id="fieldBookChecklistView" hidden>${crearChecklistHTML(aoiId)}</div><div id="fieldBookIssuesView" hidden>${crearIssuesHTML(aoiId, layout)}${crearIssuesMapHTML(aoiId, layoutReal, colorPorExperimento)}</div></div>`;
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
      document.getElementById("fieldBookExportMenu")?.addEventListener("click", () => {
        alert("Export options\n\n• Field Map PDF\n• Planting Issues PDF\n\nPDF generation will be enabled after Stake Points are implemented.");
      });
      conectarIssuesMap(aoiId, layoutReal);
      crearHomeModularFieldBook(aoiId, layout, procesoIniciado);
      document.getElementById("fieldBookStartVisit")?.addEventListener("click",async(event)=>{const btn=event.currentTarget,original=btn.textContent;btn.disabled=true;btn.textContent="STARTING...";try{const v=await guardarVisitRemota(aoiId,"In progress");guardarVisit(aoiId,v);renderizarAoi(aoiId);requestAnimationFrame(()=>window.dispatchEvent(new CustomEvent("fieldbook:go-to-page",{detail:{page:"layout"}})));}catch(error){console.error(error);alert(`No se pudo iniciar Field Book: ${error.message}`);btn.disabled=false;btn.textContent=original;}});
      document.getElementById("fieldBookCompleteVisit")?.addEventListener("click",async(event)=>{const m=metricasChecklist(aoiId);if(m.pending){const accepted=window.confirm(`Hay ${m.pending} ítems del Checklist pendientes.

Si continuás, el Field Book se cerrará igualmente y los pendientes quedarán registrados como responsabilidad del operario.

¿Confirmás cerrar Field Book?`);if(!accepted)return;}const btn=event.currentTarget,original=btn.textContent;btn.disabled=true;btn.textContent="COMPLETING...";try{const v=await guardarVisitRemota(aoiId,"Completed");guardarVisit(aoiId,v);renderizarAoi(aoiId);}catch(error){console.error(error);alert(`No se pudo completar Field Book: ${error.message}`);btn.disabled=false;btn.textContent=original;}});
      contenido.querySelectorAll(".field-book-check-card").forEach(card => {
        const saveDraftAndRefresh = () => {
          const draft = leerChecklist(aoiId);
          contenido.querySelectorAll(".field-book-check-row").forEach(row => {
            draft[row.dataset.checkId] = {
              status: row.querySelector(".field-book-check-status")?.value || "Pending",
              comment: row.querySelector(".field-book-check-comment")?.value?.trim() || "",
              updatedAt: new Date().toISOString()
            };
          });
          guardarChecklist(aoiId, draft);
          renderizarAoi(aoiId);
          setTimeout(()=>abrirModuloFieldBook("checklist"),0);
        };
        card.querySelectorAll("[data-status]").forEach(action => {
          action.addEventListener("click", event => {
            event.stopPropagation();
            const status = action.dataset.status;
            card.querySelector(".field-book-check-status").value = status;
            const wrap = card.querySelector(".fb-check-comment-wrap");
            if (wrap && (status === "Observation" || status === "Problem")) wrap.style.display = "block";
            if (status === "OK" || status === "N/A") saveDraftAndRefresh();
            else {
              card.dataset.status = status;
              card.querySelector(".field-book-check-comment")?.focus();
            }
          });
        });
        card.querySelector(".fb-check-comment-toggle")?.addEventListener("click", event => {
          event.stopPropagation();
          const wrap = card.querySelector(".fb-check-comment-wrap");
          if (!wrap) return;
          wrap.style.display = wrap.style.display === "none" ? "block" : "none";
          if (wrap.style.display === "block") card.querySelector(".field-book-check-comment")?.focus();
        });
        card.querySelector(".field-book-check-comment")?.addEventListener("change", saveDraftAndRefresh);
      });
      const coordStorageKey = `fieldBookChecklistCoordinates:${aoiId}`;
      const readCoords = () => { try { return JSON.parse(localStorage.getItem(coordStorageKey) || "{}"); } catch (_) { return {}; } };
      const saveCoord = (corner, data) => { const all=readCoords(); all[corner]=data; localStorage.setItem(coordStorageKey,JSON.stringify(all)); };
      contenido.querySelectorAll(".fb-field-corner").forEach(btn => {
        const corner=btn.dataset.corner;
        const value=btn.querySelector(".fb-coordinate-value");
        const stored=readCoords()[corner];
        const marker=btn.querySelector(".fb-corner-marker");
        const panel=btn.querySelector(".fb-corner-panel");
        marker?.addEventListener("click",()=>{contenido.querySelectorAll(".fb-corner-panel").forEach(p=>{if(p!==panel)p.style.display="none";});panel.style.display=panel.style.display==="none"?"block":"none";});
        btn.querySelector(".fb-corner-close")?.addEventListener("click",()=>{panel.style.display="none";});
        const renderCoord=data=>{ if(!data){value.textContent="No coordinate";return;} value.innerHTML=`Lat ${Number(data.latitude).toFixed(6)}<br>Lon ${Number(data.longitude).toFixed(6)}${data.accuracy!=null?`<br>Accuracy ±${Math.round(data.accuracy)} m`:"<br>Manual coordinate"}`; if(marker){marker.style.background="#2f9e44";marker.style.color="#fff";} };
        if(stored) renderCoord(stored);
        const capture=()=>{ if(!navigator.geolocation){value.textContent="GPS unavailable · use MANUAL";return;} value.textContent="Capturing GPS..."; navigator.geolocation.getCurrentPosition(pos=>{const data={latitude:pos.coords.latitude,longitude:pos.coords.longitude,accuracy:pos.coords.accuracy,source:"gps",timestamp:new Date().toISOString()};saveCoord(corner,data);renderCoord(data);},err=>{value.textContent=`GPS unavailable (${err.message}) · use MANUAL`;},{enableHighAccuracy:true,timeout:12000,maximumAge:0}); };
        btn.querySelector(".fb-coordinate-auto")?.addEventListener("click",capture);
        btn.querySelector(".fb-coordinate-manual-toggle")?.addEventListener("click",()=>{const box=btn.querySelector(".fb-coordinate-manual");box.style.display=box.style.display==="none"?"block":"none";});
        btn.querySelector(".fb-coordinate-save-manual")?.addEventListener("click",()=>{const latitude=Number(String(btn.querySelector(".fb-coordinate-lat").value).replace(",","."));const longitude=Number(String(btn.querySelector(".fb-coordinate-lon").value).replace(",","."));if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude < -90||latitude > 90||longitude < -180||longitude > 180){alert("Revisá latitud y longitud. Latitud: -90 a 90. Longitud: -180 a 180.");return;}const data={latitude,longitude,accuracy:null,source:"manual",timestamp:new Date().toISOString()};saveCoord(corner,data);renderCoord(data);btn.querySelector(".fb-coordinate-manual").style.display="none";});
      });
      document.getElementById("fieldBookSaveChecklist")?.addEventListener("click",async(event)=>{
        const btn=event.currentTarget; btn.disabled=true; btn.textContent="SAVING CHECKLIST...";
        const respuestas={}; contenido.querySelectorAll(".field-book-check-row").forEach(row=>{respuestas[row.dataset.checkId]={status:row.querySelector(".field-book-check-status")?.value||"Pending",comment:row.querySelector(".field-book-check-comment")?.value?.trim()||"",updatedAt:new Date().toISOString()};});
        guardarChecklist(aoiId,respuestas);
        try { await guardarChecklistRemoto(aoiId,respuestas); renderizarAoi(aoiId); setTimeout(()=>{abrirModuloFieldBook("checklist");const msg=document.getElementById("fieldBookChecklistMsg");if(msg){msg.textContent="✓ Checklist sincronizado con SharePoint DEV";msg.style.color="#0b6b3a";msg.style.fontWeight="800";}},0); }
        catch(error) { console.error(error); renderizarAoi(aoiId); setTimeout(()=>abrirModuloFieldBook("checklist"),0); alert(`Checklist guardado localmente, pendiente de sincronización: ${error.message}`); }
      });
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

        // La huella completa se aplica una vez finalizado el marcado de todos los botones.
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

          d.innerHTML = `<strong style="color:#174c31;font-size:13px">Range ${plot.range} · Column ${plot.column}</strong><div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:2px 9px;margin-top:4px;line-height:1.2;font-size:12px"><span><b>Experiment:</b> ${plot.experimentName || "-"}</span><span><b>Germplasm:</b> ${plot.germplasmName || "-"}</span><span><b>Germplasm ID:</b> ${plot.germplasmId ?? "-"}</span><span><b>EU ID:</b> ${plot.euId ?? "-"}</span><span><b>EUDQ:</b> ${plot.eudq || "-"}</span><span><b>Rep:</b> ${plot.rep ?? "-"}</span><span style="grid-column:1/-1"><b>Comment:</b> ${plot.entryComment || "-"}</span></div>`;

          const actionsPanel = document.getElementById("fieldBookActionsPanel");
          if (!actionsPanel) return;
          actionsPanel.innerHTML = crearEjecucionHTML(aoiId, plot, layout);

          let statusSeleccionado = leerEventos(aoiId)[claveEvento(aoiId, plot.range, plot.column)]?.status || "";
          actionsPanel.querySelectorAll(".field-book-exec-status").forEach(statusBtn => {
            statusBtn.addEventListener("click", () => {
              statusSeleccionado = statusBtn.dataset.status;
              const cfg = estadosEjecucion[statusSeleccionado];
              actionsPanel.querySelectorAll(".field-book-exec-status").forEach(b => {
                const c = estadosEjecucion[b.dataset.status];
                const activo = b.dataset.status === statusSeleccionado;
                b.style.borderColor = c.color; b.style.borderWidth = "2px";
                b.style.background = activo ? c.color : c.fondo;
                b.style.color = activo ? "#fff" : c.color;
              });
            });
          });

          actionsPanel.querySelector("#fieldBookSaveExecution")?.addEventListener("click", async(event) => {
            const saveBtn=event.currentTarget; const original=saveBtn.textContent; saveBtn.disabled=true; saveBtn.textContent="SAVING...";
            const comment = actionsPanel.querySelector("#fieldBookExecutionComment")?.value || "";
            if (!statusSeleccionado) { saveBtn.disabled=false; saveBtn.textContent=original; alert("Seleccioná Refilled, Lost u Observation."); return; }
            guardarEvento(aoiId, plot.range, plot.column, statusSeleccionado, comment);
            refrescarIssuesEnPantalla(aoiId, layout);
            const evento = leerEventos(aoiId)[claveEvento(aoiId, plot.range, plot.column)]; aplicarMarcaBoton(btn, evento);
            const msg = actionsPanel.querySelector("#fieldBookExecutionMsg");
            try { await guardarPlotEventRemoto(aoiId,plot.range,plot.column,statusSeleccionado,comment); if(msg){msg.textContent="✓ Sincronizado con SharePoint DEV";msg.style.color="#0b6b3a";msg.style.fontWeight="800";} }
            catch(error) { console.error(error); if(msg){msg.textContent="⚠ Guardado local · Pending sync";msg.style.color="#995c00";msg.style.fontWeight="800";} }
            saveBtn.disabled=false; saveBtn.textContent=original;
          });

          d.querySelector("#fieldBookRestoreNormal")?.addEventListener("click", async() => {
            restaurarNormal(aoiId, plot.range, plot.column); refrescarIssuesEnPantalla(aoiId, layout); aplicarMarcaBoton(btn, null);
            try { await guardarPlotEventRemoto(aoiId,plot.range,plot.column,"Normal",""); } catch(error) { console.error(error); alert("Restaurado localmente; sincronización pendiente."); }
            btn.click();
          });

          actionsPanel.querySelector("#fieldBookRemoveShift")?.addEventListener("click", async e => {
            const shiftId=e.currentTarget.dataset.shiftId; const shift=leerBlockShifts(aoiId).find(item=>item.id===shiftId);
            eliminarShift(aoiId,shiftId); reabrirFieldMapEnPlot(aoiId, plot.range, plot.column);
            if(shift){try{await guardarBlockShiftRemoto(aoiId,{...shift,offset:0,comment:`REMOVED · ${shift.comment||""}`});}catch(error){console.error(error);alert("Shift removido localmente; sincronización pendiente.");}}
          });

          actionsPanel.querySelector("#fieldBookShiftBlock")?.addEventListener("click", () => {
            abrirShiftBlock(aoiId, plot, layout, porCoord, () => reabrirFieldMapEnPlot(aoiId, plot.range, plot.column));
          });
        });
      });
      // Shift Block gestual estable: selección y desplazamiento vertical limitado a una sola Column.
      marcarHuellaShifts(aoiId);
      habilitarShiftGestual(aoiId, layout, porCoord);
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

  async function iniciarFieldBookData() {
    selectorAoi.disabled = true;
    selectorAoi.innerHTML = '<option value="">Cargando AOI desde SharePoint...</option>';

    try {
      await cargarLayoutsDesdeSharePoint();
      completarSelectorAoi();
      selectorAoi.disabled = false;

      if (!Object.keys(layoutsEmbebidos).length) {
        selectorAoi.innerHTML = '<option value="">No se encontraron AOI</option>';
        selectorAoi.disabled = true;
      }
    } catch (error) {
      console.warn("Field Book: cargando descargas offline",error);
      const rows=await loadOfflineBooks();
      if(rows.length){completarSelectorAoi();selectorAoi.disabled=false;actualizarSyncUI(`Offline · ${rows.length} Field Books available`);}
      else{selectorAoi.disabled=true;contenido.innerHTML=`<div class="empty-state"><strong>No hay conexión ni descargas offline</strong><span>Conectate y descargá al menos una AOI.</span></div>`;}
    }
  }

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


  iniciarFieldBookData();

})();
