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

  function renderizarAoi(
    aoiId
  ) {
    const layoutReal = layoutsEmbebidos[aoiId] || null;
    const datos = datosDemo[aoiId];

    if (layoutReal && Array.isArray(layoutReal.plots)) {
      const layout = layoutReal.layout || {};
      const experimentos = layoutReal.experiments || [];
      const colores = ["#dff3e7","#e5ecff","#fff0d8","#f3e4ff","#dff4f7","#ffe3e3","#edf1d4","#f6e8cf","#e8e8ff"];
      const colorPorExperimento = new Map(experimentos.map((exp, i) => [exp.name, colores[i % colores.length]]));
      const porCoord = new Map(layoutReal.plots.map(plot => [`${plot.range}|${plot.column}`, plot]));
      const columnas = [];
      for (let c = layout.columnMin; c <= layout.columnMax; c++) columnas.push(c);
      const ranges = [];
      for (let r = layout.rangeMax; r >= layout.rangeMin; r--) ranges.push(r);
      const header = columnas.map(c => `<div style="width:32px;min-width:32px;text-align:center;font-size:9px;font-weight:800;color:#6c7a72">${c}</div>`).join("");
      const filas = ranges.map(r => `<div style="display:flex;gap:3px;margin-bottom:3px;align-items:center"><div style="position:sticky;left:0;z-index:2;width:38px;min-width:38px;text-align:center;background:#eef6f1;color:#174c31;font-size:10px;font-weight:900;padding:9px 0;border-radius:5px">R${r}</div>${columnas.map(c => { const plot=porCoord.get(`${r}|${c}`); if(!plot) return `<div style="width:32px;min-width:32px;height:28px;border:1px dashed #e2e9e5;border-radius:4px"></div>`; const color=colorPorExperimento.get(plot.experimentName)||"#e7ece9"; return `<button class="field-book-real-plot" data-range="${r}" data-column="${c}" type="button" style="width:32px;min-width:32px;height:28px;border:1px solid #bfcac3;border-radius:4px;background:${color};font-size:8px;font-weight:800;cursor:pointer">${c}</button>`; }).join("")}</div>`).join("");
      contenido.innerHTML = `<div style="padding:18px"><div style="display:flex;justify-content:space-between;gap:15px;margin-bottom:14px"><div><span class="section-label">AOI</span><h2 style="margin:0;color:#174c31">${aoiId}</h2><div style="margin-top:5px;color:#6c7a72;font-size:12px">${layoutReal.trial?.year || "-"} · Season ${layoutReal.trial?.season || "-"}</div></div><span style="padding:6px 9px;border-radius:999px;background:#e7f5ec;color:#0b6b3a;font-size:10px;font-weight:900;height:max-content">REAL LAYOUT · READ ONLY</span></div><div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(240px,320px);gap:16px"><section style="min-width:0;padding:15px;border:1px solid #d9e3dd;border-radius:11px;background:#f8fbf9"><span class="section-label">LAYOUT</span><h3 style="margin:5px 0">Plano interactivo</h3><p style="color:#6c7a72;font-size:12px">Range ${layout.rangeMin}-${layout.rangeMax} · Column ${layout.columnMin}-${layout.columnMax} · ${layout.plotRecordCount} parcelas · ${experimentos.length} experimentos</p><div style="overflow:auto;max-height:68vh;padding:8px;border:1px solid #d9e3dd;border-radius:9px;background:#fff"><div style="display:flex;gap:3px;margin:0 0 5px 41px;width:max-content">${header}</div><div style="width:max-content">${filas}</div></div></section><aside style="padding:15px;border:1px solid #d9e3dd;border-radius:11px;background:#fff"><span class="section-label">PLOT DETAIL</span><div id="fieldBookRealDetail" style="margin-top:8px;color:#6c7a72;font-size:12px">Tocá una parcela para ver sus datos.</div></aside></div></div>`;
      contenido.querySelectorAll(".field-book-real-plot").forEach(btn => btn.addEventListener("click", () => { const plot=porCoord.get(`${btn.dataset.range}|${btn.dataset.column}`); const d=document.getElementById("fieldBookRealDetail"); if(d&&plot) d.innerHTML=`<strong style="color:#174c31">Range ${plot.range} · Column ${plot.column}</strong><div style="margin-top:9px;line-height:1.6"><b>Experiment:</b> ${plot.experimentName || "-"}<br><b>Germplasm:</b> ${plot.germplasmName || "-"}<br><b>Germplasm ID:</b> ${plot.germplasmId ?? "-"}<br><b>EU ID:</b> ${plot.euId ?? "-"}<br><b>EUDQ:</b> ${plot.eudq || "-"}<br><b>Rep:</b> ${plot.rep ?? "-"}<br><b>Comment:</b> ${plot.entryComment || "-"}</div>`; }));
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
