console.log("Field Trial Platform Dashboard v1");

function limpiarTexto(valor) {
  return String(valor ?? "").trim();
}

function esDrop(sitio) {
  return limpiarTexto(sitio["Harvest status"]).toLowerCase() === "drop";
}


// DROP DETAIL
function escDrop(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}
function abrirDropDetail(base=sitios){document.getElementById("dropDetailOverlay")?.remove();const ds=base.filter(esDrop).slice().sort((a,b)=>limpiarTexto(a.Location).localeCompare(limpiarTexto(b.Location),"es",{sensitivity:"base"}));const ov=document.createElement("div");ov.id="dropDetailOverlay";ov.style.cssText="position:fixed;inset:0;z-index:40000;background:rgba(10,25,17,.52);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box";const p=document.createElement("div");p.style.cssText="width:min(680px,100%);max-height:90vh;overflow:hidden;background:#fff;border-radius:18px;display:flex;flex-direction:column;box-shadow:0 24px 70px rgba(0,0,0,.32)";const cards=ds.map(s=>{const loc=escDrop(limpiarTexto(s.Location)||"Sin localidad"),aoi=escDrop(limpiarTexto(s["AOI ID"])||"Sin AOI"),reason=escDrop(limpiarTexto(s["Drop reason"])),com=escDrop(limpiarTexto(s.Comments||s.Comment));return `<article style="padding:13px 14px;border:1px solid #e2e7e4;border-radius:12px;background:#fbfcfb"><div style="display:flex;justify-content:space-between;gap:10px"><b style="color:#173f2a">${loc}</b><span style="padding:3px 8px;border-radius:999px;background:#202020;color:#fff;font-size:10px;font-weight:900">DROP</span></div><div style="margin-top:3px;color:#68756d;font-size:11px">AOI · ${aoi}</div><div style="margin-top:10px;font-size:11px;font-weight:900;color:#59665e">DROP REASON</div><div style="margin-top:3px;font-size:13px">${reason||"Sin razón registrada"}</div>${com?`<div style="margin-top:9px;font-size:11px;font-weight:900;color:#59665e">COMMENTS</div><div style="margin-top:3px;font-size:13px;line-height:1.35">${com}</div>`:""}</article>`}).join("");p.innerHTML=`<div style="display:flex;padding:17px 18px 14px;border-bottom:1px solid #e5ebe7"><div style="flex:1"><div style="font-size:20px;font-weight:900;color:#173f2a">Detalle de localidades Drop</div><div style="margin-top:3px;color:#6c786f;font-size:12px">${ds.length} ${ds.length===1?"localidad":"localidades"} · Harvest status = Drop</div></div><button data-close-drop style="width:36px;height:36px;border:0;border-radius:50%;font-size:22px">×</button></div><div style="padding:14px 18px 18px;overflow:auto;display:grid;gap:10px">${cards||"Sin localidades Drop"}</div>`;ov.appendChild(p);document.body.appendChild(ov);document.body.style.overflow="hidden";const c=()=>{ov.remove();document.body.style.overflow=""};ov.onclick=e=>{if(e.target===ov)c()};p.querySelector("[data-close-drop]").onclick=c;}
function activarDropKpiNO(){const n=document.getElementById("drop"),t=n?.parentElement;if(!t||t.dataset.dropReady)return;t.dataset.dropReady="1";t.style.cursor="pointer";t.title="Ver localidades Drop y sus razones";t.setAttribute("role","button");t.setAttribute("tabindex","0");const a=()=>abrirDropDetail(obtenerSitiosFiltrados());t.onclick=a;t.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();a()}};}
function estaSembrado(sitio) {
  return Boolean(limpiarTexto(sitio["Planting Date (MM/DD/YYYY)"]));
}

function actualizarDashboardPlataforma(sitios) {
  const sitiosValidos = sitios.filter(
    sitio => limpiarTexto(sitio["AOI ID"]) && limpiarTexto(sitio.Location)
  );

  console.log("Total CSV:", sitios.length, "Sitios validos:", sitiosValidos.length);

  const drops = sitiosValidos.filter(esDrop).length;
  const porcentajeDrop = sitiosValidos.length > 0
    ? ((drops / sitiosValidos.length) * 100).toFixed(1)
    : "0.0";

  const sembrados = sitiosValidos.filter(
    sitio => !esDrop(sitio) && estaSembrado(sitio)
  ).length;

  const pendientes = sitiosValidos.filter(
    sitio => !esDrop(sitio) && !estaSembrado(sitio)
  ).length;

  const totalOperativo = sembrados + pendientes;
  const avance = totalOperativo > 0
    ? Math.round((sembrados / totalOperativo) * 100)
    : 0;

  const cosechados = sitiosValidos.filter(
    sitio => !esDrop(sitio) && Boolean(limpiarTexto(sitio["Harvest Date (MM/DD/YYYY)"]))
  ).length;

  const pendientesCosecha = sitiosValidos.filter(
    sitio => !esDrop(sitio) && !limpiarTexto(sitio["Harvest Date (MM/DD/YYYY)"])
  ).length;

  const totalOperativoCosecha = cosechados + pendientesCosecha;
  const avanceCosecha = totalOperativoCosecha > 0
    ? Math.round((cosechados / totalOperativoCosecha) * 100)
    : 0;

  const tarjetasKpi = document.querySelectorAll(".kpi-card");

  /* KPI superiores: 0 = AOI, 1 = Sown, 2 = Harvested, 3 = Drop */
  if (tarjetasKpi.length >= 4) {
    tarjetasKpi[0].querySelector(".kpi-valor").textContent = sitiosValidos.length;
    tarjetasKpi[1].querySelector(".kpi-valor").textContent = `${avance}%`;
    tarjetasKpi[2].querySelector(".kpi-valor").textContent = `${avanceCosecha}%`;
    tarjetasKpi[3].querySelector(".kpi-valor").textContent = `${drops} - (${porcentajeDrop}%)`;
      const td=tarjetasKpi[3];if(!td.dataset.dropReady){td.dataset.dropReady="1";td.style.cursor="pointer";td.title="Ver localidades Drop y sus razones";td.setAttribute("role","button");td.setAttribute("tabindex","0");const abrir=()=>abrirDropDetail(sitiosValidos);td.onclick=abrir;td.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();abrir()}};}
  }

  const miniKpiValor = document.querySelector(".mini-kpi-valor");
  const miniProgressFill = document.querySelector(".mini-progress-fill");
  const sowingProgress = document.getElementById("sowingProgress");

  if (sowingProgress) sowingProgress.textContent = `${avance}%`;
  if (miniProgressFill) miniProgressFill.style.width = `${avance}%`;

  const sowingCompleted = document.getElementById("sowingCompleted");
  const sowingPending = document.getElementById("sowingPending");

  if (sowingCompleted) sowingCompleted.textContent = `${sembrados} Planting`;
  if (sowingPending) sowingPending.textContent = `${pendientes} Pending`;

  const harvestingProgress = document.getElementById("harvestingProgress");
  const harvestingProgressBar = document.getElementById("harvestingProgressBar");
  const harvestingCompleted = document.getElementById("harvestingCompleted");
  const harvestingPending = document.getElementById("harvestingPending");

  if (harvestingProgress) harvestingProgress.textContent = `${avanceCosecha}%`;

  const kpiHarvesting = document.getElementById("kpiHarvesting");
  if (kpiHarvesting) kpiHarvesting.textContent = `${avanceCosecha}%`;
  if (harvestingProgressBar) harvestingProgressBar.style.width = `${avanceCosecha}%`;
  if (harvestingCompleted) harvestingCompleted.textContent = `${cosechados} Harvesting`;
  if (harvestingPending) harvestingPending.textContent = `${pendientesCosecha} Pending`;

  const masterAoi = document.getElementById("masterAoi");
  if (masterAoi) masterAoi.textContent = sitiosValidos.length;

  const regiones = new Set(
    sitiosValidos.map(s => limpiarTexto(s.Region)).filter(Boolean)
  ).size;

  const trials = sitiosValidos.filter(
    sitio => limpiarTexto(sitio["Latitude Trial"]) && limpiarTexto(sitio["Longitude Trial"])
  ).length;

  const access = sitiosValidos.filter(
    sitio => limpiarTexto(sitio["Latitude Access"]) && limpiarTexto(sitio["Longitude Access"])
  ).length;

  const masterTrials = document.getElementById("masterTrials");
  const masterAccess = document.getElementById("masterAccess");

  if (masterTrials) masterTrials.textContent = `${trials} Trials`;
  if (masterAccess) masterAccess.textContent = `${access} Access`;

  console.log("Dashboard actualizado:", {
    totalAOI: sitiosValidos.length,
    sembrados,
    pendientes,
    drops,
    avance
  });
}

Papa.parse("Sitios_test.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  transformHeader: encabezado => limpiarTexto(encabezado.replace(/^\uFEFF/, "")),
  complete: resultado => {
    actualizarDashboardPlataforma(resultado.data);
    if (resultado.errors.length) {
      console.warn("Advertencias leyendo Sitios_test.csv:", resultado.errors);
    }
  },
  error: error => {
    console.error("Error cargando Sitios_test.csv:", error);
  }
});
