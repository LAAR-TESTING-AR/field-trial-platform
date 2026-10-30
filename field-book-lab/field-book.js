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
    const datos =
      datosDemo[aoiId];

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
