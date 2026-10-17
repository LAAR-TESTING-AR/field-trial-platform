console.log("Field Trial Platform Dashboard v1");

function limpiarTexto(valor) {
  return String(valor ?? "").trim();
}

function esDrop(sitio) {
  return limpiarTexto(sitio.Description)
    .toLowerCase()
    .includes("drop");
}

function estaSembrado(sitio) {
  return Boolean(
    limpiarTexto(
      sitio["Planting Date (MM/DD/YYYY)"]
    )
  );
}

function actualizarDashboardPlataforma(sitios) {

  const sitiosValidos =
    sitios.filter(
      sitio =>
        limpiarTexto(sitio["AOI ID"]) &&
        limpiarTexto(sitio.Location)
    );
console.log(
  "Total CSV:",
  sitios.length,
  "Sitios válidos:",
  sitiosValidos.length
);
  const drops =
    sitiosValidos.filter(
      esDrop
    ).length;

  const sembrados =
    sitiosValidos.filter(
      sitio =>
        !esDrop(sitio) &&
        estaSembrado(sitio)
    ).length;

  const pendientes =
    sitiosValidos.filter(
      sitio =>
        !esDrop(sitio) &&
        !estaSembrado(sitio)
    ).length;

  const totalOperativo =
    sembrados + pendientes;

  const avance =
    totalOperativo > 0
      ? Math.round(
          (sembrados / totalOperativo) * 100
        )
      : 0;
const cosechados =
  sitiosValidos.filter(
    sitio =>
      !esDrop(sitio) &&
      Boolean(
        limpiarTexto(
          sitio["Harvest Date (MM/DD/YYYY)"]
        )
      )
  ).length;

const pendientesCosecha =
  sitiosValidos.filter(
    sitio =>
      !esDrop(sitio) &&
      !limpiarTexto(
        sitio["Harvest Date (MM/DD/YYYY)"]
      )
  ).length;

const totalOperativoCosecha =
  cosechados + pendientesCosecha;

const avanceCosecha =
  totalOperativoCosecha > 0
    ? Math.round(
        (cosechados / totalOperativoCosecha) * 100
      )
    : 0;
  const tarjetasKpi =
    document.querySelectorAll(
      ".kpi-card"
    );

 /*
 * KPI superiores:
 * 0 = AOI
 * 1 = Sown
 * 2 = Harvested
 * 3 = Drop
 */
if (tarjetasKpi.length >= 4) {

* tarjetasKpi[0]
    .querySelector*".kpi-valor")
    .textContent =
 *    sitiosValidos.length;

  tarje*asKpi[1]
    .querySelector(".kpi-*alor")
    .textContent =
      `$*avance}%`;

  tarjetasKpi[2]
    .*uerySelector(".kpi-valor")
    .te*tContent =
      `${avanceCosecha}*`;

  tarjetasKpi[3]
    .querySel*ctor(".kpi-valor")
    .textConten* =
      drops;
}

  /*
   * KPI y barra dentro de Sowing.
   */
  const miniKpiValor =
    document.querySelector(
      ".mini-kpi-valor"
    );

  const miniProgressFill =
    document.querySelector(
      ".mini-progress-fill"
    );

  const sowingProgress =
  document.getElementById(
    "sowingProgress"
  );

if (sowingProgress) {
  sowingProgress.textContent =
    `${avance}%`;
}

  if (miniProgressFill) {
    miniProgressFill.style.width =
      `${avance}%`;
  }

const sowingCompleted =
  document.getElementById(
    "sowingCompleted"
  );

const sowingPending =
  document.getElementById(
    "sowingPending"
  );

if (sowingCompleted) {

  sowingCompleted.textContent =
    `${sembrados} Sown`;

}

if (sowingPending) {

  sowingPending.textContent =
    `${pendientes} Pending`;

}

/*
 * KPI y barra dentro de Harvesting.
 */
const harvestingProgress =
  document.getElementById(
    "harvestingProgress"
  );

const harvestingProgressBar =
  document.getElementById(
    "harvestingProgressBar"
  );

const harvestingCompleted =
  document.getElementById(
    "harvestingCompleted"
  );

const harvestingPending =
  document.getElementById(
    "harvestingPending"
  );

if (harvestingProgress) {
  harvestingProgress.textContent =
    `${avanceCosecha}%`;
}

const kpiHarvesting =
  document.getElementById(
    "kpiHarvesting"
  );

if (kpiHarvesting) {
  kpiHarvesting.textContent =
    `${avanceCosecha}%`;
}
  
if (harvestingProgressBar) {
  harvestingProgressBar.style.width =
    `${avanceCosecha}%`;
}

if (harvestingCompleted) {
  harvestingCompleted.textContent =
    `${cosechados} Harvested`;
}

if (harvestingPending) {
  harvestingPending.textContent =
    `${pendientesCosecha} Pending`;
}
  
const masterAoi =
  document.getElementById(
    "masterAoi"
  );

if (masterAoi) {

  masterAoi.textContent =
    sitiosValidos.length;

}
const regiones =
  new Set(
    sitiosValidos
      .map(s => limpiarTexto(s.Region))
      .filter(Boolean)
  ).size;
const trials =
  sitiosValidos.filter(
    sitio =>
      limpiarTexto(
        sitio["Latitude Trial"]
      ) &&
      limpiarTexto(
        sitio["Longitude Trial"]
      )
  ).length;
const access =
  sitiosValidos.filter(
    sitio =>
      limpiarTexto(
        sitio["Latitude Access"]
      ) &&
      limpiarTexto(
        sitio["Longitude Access"]
      )
  ).length;

const masterTrials =
  document.getElementById(
    "masterTrials"
  );

const masterAccess =
  document.getElementById(
    "masterAccess"
  );

if (masterTrials) {
  masterTrials.textContent =
    `${trials} Trials`;
}
if (masterAccess) {
  masterAccess.textContent =
    `${access} Access`;
}
  
  console.log(
    "Dashboard actualizado:",
    {
      totalAOI: sitiosValidos.length,
      sembrados,
      pendientes,
      drops,
      avance
    }
  );
}

Papa.parse("Sitios_test.csv", {

  download: true,

  header: true,

  skipEmptyLines: true,

  transformHeader: encabezado =>
    limpiarTexto(
      encabezado.replace(
        /^\uFEFF/,
        ""
      )
    ),

  complete: resultado => {

    actualizarDashboardPlataforma(
      resultado.data
    );

    if (resultado.errors.length) {
      console.warn(
        "Advertencias leyendo Sitios_test.csv:",
        resultado.errors
      );
    }

  },

  error: error => {

    console.error(
      "Error cargando Sitios_test.csv:",
      error
    );

  }

});
