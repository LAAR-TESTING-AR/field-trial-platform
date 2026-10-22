console.log("Planting Tracker v2 - filtros dependientes");

const capaMapaActual = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }
);

const capaSatelital = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 19,
    attribution: "Esri World Imagery"
  }
);

const capaInicial =
  localStorage.getItem("plantingMapLayer") || "map";

const mapa = L.map("mapa", {
  center: [-34.5, -63.0],
  zoom: 5,
  layers: [
    capaInicial === "satellite"
      ? capaSatelital
      : capaMapaActual
  ]
});

const capaMarcadores = L.layerGroup().addTo(mapa);
L.control.layers(
  {
    "Map": capaMapaActual,
    "Satellite": capaSatelital
  },
  {},
  {
    position: "topleft"
  }
).addTo(mapa);
mapa.on("baselayerchange", function (evento) {

  if (evento.name === "Satellite") {

    localStorage.setItem(
      "plantingMapLayer",
      "satellite"
    );

  } else {

    localStorage.setItem(
      "plantingMapLayer",
      "map"
    );

  }

});
let sitios = [];
const URL_FLOW_SIEMBRA =
  "https://defaultdb5054808ec6495cb57932c58ed84a.01.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/23/workflows/d1ccb1bbfc2d42b1971a8e732db9aba7/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=a8tOXFBAyVBQZYwChwZCWsyvLfc33_lmeIcMHcH74Qs";
const URL_FLOW_PLANNING =
  "https://defaultdb5054808ec6495cb57932c58ed84a.01.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/09/workflows/f9679e187c0b4d3d837a55d18fd9f608/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=0nhZHl2vRMJWQYe4tEuF1p7TN3BZ3yq7LE2XBY5quGE";
const URL_FLOW_PLANNING_GET =
  "https://defaultdb5054808ec6495cb57932c58ed84a.01.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/24/workflows/af587c26aece442f80e564de5760ef4c/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=pLrdlfm9Ppj7utl9RMcw8iR_ZoL5h75LICgKvIykcPE";
const URL_FLOW_PLANNING_DELETE =
  "https://defaultdb5054808ec6495cb57932c58ed84a.01.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/29/workflows/bf37955d8b4e4564ace52d7d377ea427/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=IIeyWIwFS9mFfY6Jj4x0iXPPdNZFhfdgYtLeTHrRMhw";
const URL_FLOW_PLANNING_UPDATE =
  "https://defaultdb5054808ec6495cb57932c58ed84a.01.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/13/workflows/bf43c54ef2f844cb97c4cc1025ec47e6/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=28XOoj6pFx3-AUyCvx2RYqr6rCJa_WhpPyrjIi93DpY";
let modalSiembra;
let modalFechaSiembra;
let modalPlanter;
let btnCancelarSiembra;
let btnGuardarSiembra;

document.addEventListener(
  "DOMContentLoaded",
  () => {

    modalSiembra =
      document.getElementById(
        "modalSiembra"
      );

    modalFechaSiembra =
      document.getElementById(
        "modalFechaSiembra"
      );
modalPlanter =
  document.getElementById(
    "modalPlanter"
  );
    btnCancelarSiembra =
      document.getElementById(
        "btnCancelarSiembra"
      );

    btnGuardarSiembra =
      document.getElementById(
        "btnGuardarSiembra"
      );

    if (btnCancelarSiembra) {
      btnCancelarSiembra.onclick =
        cerrarModalSiembra;
    }

    if (btnGuardarSiembra) {

btnGuardarSiembra.onclick =
  () => {

const fecha =
  modalFechaSiembra.value;

const planter =
  modalPlanter.value;

const aoiId =
  aoiPendienteSiembra;

if (!fecha || !aoiId) {
  alert(
    "Seleccione una fecha de siembra"
  );

  return;
}

if (!planter) {
  alert(
    "Seleccione una sembradora"
  );

  return;
}

    btnGuardarSiembra.disabled =
      true;

    btnGuardarSiembra.textContent =
      "Guardando...";

    /*
     * Primero guardamos localmente.
     * El registro ya es seguro aunque
     * desaparezca la conexión.
     */
 agregarSiembraPendiente(
  aoiId,
  fecha,
  planter
);

    /*
     * Actualización visual inmediata.
     */
    const sitioLocal =
      sitios.find(
        sitio =>
          limpiarTexto(
            sitio["AOI ID"]
          ) === aoiId
      );

if (sitioLocal) {
  sitioLocal[
    "Planting Date (MM/DD/YYYY)"
  ] = fecha;

  sitioLocal[
    "Planter"
  ] = planter;
}

    actualizarVista();

    btnGuardarSiembra.disabled =
      false;

    btnGuardarSiembra.textContent =
      "Guardar";

    cerrarModalSiembra();

    /*
     * No usamos await.
     * El usuario puede seguir trabajando
     * mientras se intenta sincronizar.
     */
    sincronizarSiembrasPendientes();
  };

    }

  }
);

const btnRefreshData =
  document.getElementById(
    "btnRefreshData"
  );

if (btnRefreshData) {
  btnRefreshData.addEventListener(
    "click",
    () => {
      window.location.reload();
    }
  );
}

const filtroCrop =
  document.getElementById("filtroCrop");

const filtroSeason =
  document.getElementById("filtroSeason");

const filtroLaar =
  document.getElementById("filtroLaar");
const filtroLaarModo =
  document.getElementById(
    "filtroLaarModo"
  );

const filtroLaarTexto =
  document.getElementById(
    "filtroLaarTexto"
  );

const filtroLaarExacto =
  document.getElementById(
    "filtroLaarExacto"
  );

const listaLaarExacto =
  document.getElementById(
    "listaLaarExacto"
  );

const resumenLaarExacto =
  document.getElementById(
    "resumenLaarExacto"
  );

const sugerenciasLaar =
  document.getElementById(
    "sugerenciasLaar"
  );

let valoresLaarExactosSeleccionados =
  new Set();
const filtroOperation =
  document.getElementById("filtroOperation");
const filtroStation =
  document.getElementById("filtroStation");
const busqueda =
  document.getElementById("busqueda");

const limpiarFiltros =
  document.getElementById("limpiarFiltros");

const configuracionFiltros = [
  {
    elemento: filtroCrop,
    campo: "Crop",
    textoInicial: "Todos los cultivos"
  },
  {
    elemento: filtroSeason,
    campo: "Season",
    textoInicial: "Todas las seasons"
  },

  {
    elemento: filtroOperation,
    campo: "Operations",
    textoInicial: "Todas las operaciones"
  },
  {
  elemento: filtroStation,
  campo: "Station",
  textoInicial: "Todas las estaciones"
}
];

function limpiarTexto(valor) {
  return String(valor ?? "").trim();
}
function normalizarTexto(valor) {
  return limpiarTexto(valor)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function coincideConBusqueda(sitio) {

  const consulta =
    normalizarTexto(
      busqueda.value
    ).trim();

  if (!consulta) {
    return true;
  }

  const partesBusqueda =
    consulta
      .split(/\s+/)
      .filter(Boolean);

  /*
   * Exclusiones aplicadas al Crop.
   *
   * Ejemplo:
   * corn r3 -steward
   */
  const exclusionesCrop =
    partesBusqueda
      .filter(
        palabra =>
          palabra.startsWith("-") &&
          palabra.length > 1
      )
      .map(
        palabra =>
          palabra.slice(1)
      );

  /*
   * Palabras positivas.
   * Las de un carácter se ignoran.
   */
  const palabras =
    partesBusqueda
      .filter(
        palabra =>
          !palabra.startsWith("-") &&
          palabra.length >= 2
      );

  if (palabras.length === 0) {
    return true;
  }

  const cropActual =
    normalizarTexto(
      sitio["Crop"]
    );

  const cropExcluido =
    exclusionesCrop.some(
      exclusion =>
        cropActual.includes(
          exclusion
        )
    );

  if (cropExcluido) {
    return false;
  }

  /*
   * LAAR Status separado en palabras
   * completas.
   *
   * Así R2 no coincide con PAR2T
   * dentro del AOI.
   */
  const palabrasLaar =
    normalizarTexto(
      sitio[
        "LAAR Status 2026-2027"
      ]
    )
      .match(/[a-z0-9]+/g) || [];

  /*
   * Todas las columnas del registro.
   * Se utilizan únicamente para palabras
   * de tres caracteres o más.
   */
  const valoresGenerales =
    Object.values(sitio)
      .map(normalizarTexto);

  return palabras.every(
    palabra => {

      /*
       * Exactamente dos caracteres:
       * buscar exclusivamente en
       * LAAR Status.
       */
      if (palabra.length === 2) {
        return palabrasLaar.includes(
          palabra
        );
      }

      /*
       * Tres caracteres o más:
       * buscar en todas las columnas.
       */
      return valoresGenerales.some(
        valor =>
          valor.includes(
            palabra
          )
      );

    }
  );
}

function ordenarValores(valores) {
  return [...new Set(
    valores
      .map(limpiarTexto)
      .filter(Boolean)
  )].sort((a, b) =>
    a.localeCompare(
      b,
      "es",
      { sensitivity: "base" }
    )
  );
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

function estaPlanificado(
  sitio
) {

  const aoiId =
    limpiarTexto(
      sitio["AOI ID"]
    );

  const encontrado =
    planningData.find(
      item =>
        limpiarTexto(
          item.aoiId
        ) === aoiId
    );


  return Boolean(
    encontrado
  );

}
function coincideConFiltros(
  sitio,
  campoIgnorado = null
) {

  const cumpleFiltrosExactos =
    configuracionFiltros.every(
      ({ elemento, campo }) => {

        if (campo === campoIgnorado) {
          return true;
        }

        const valorSeleccionado =
          limpiarTexto(
            elemento.value
          );

        return (
          !valorSeleccionado ||
          limpiarTexto(
            sitio[campo]
          ) === valorSeleccionado
        );

      }
    );

  if (!cumpleFiltrosExactos) {
    return false;
  }

 const modoLaar =
  filtroLaarModo?.value ||
  "contains";

const valorLaarOriginal =
  limpiarTexto(
    sitio[
      "LAAR Status 2026-2027"
    ]
  );

const valorLaarNormalizado =
  normalizarTexto(
    valorLaarOriginal
  );

/*
 * Coincidencia exacta:
 * permite una o varias combinaciones.
 */
if (modoLaar === "exact") {

  if (
    valoresLaarExactosSeleccionados
      .size === 0
  ) {
    return true;
  }

  return [
    ...valoresLaarExactosSeleccionados
  ].some(
    valorSeleccionado =>
      normalizarTexto(
        valorSeleccionado
      ) === valorLaarNormalizado
  );
}

/*
 * Modo Contiene.
 */
const textoLaar =
  normalizarTexto(
    filtroLaarTexto?.value
  );

return (
  !textoLaar ||
  valorLaarNormalizado.includes(
    textoLaar
  )
);
}

function obtenerSitiosFiltrados() {
  return sitios.filter(sitio =>
    coincideConBusqueda(sitio) &&
    coincideConFiltros(sitio)
  );
}


function obtenerValoresDisponibles(campo) {
  return ordenarValores(
    sitios
      .filter(sitio =>
        coincideConBusqueda(sitio) &&
        coincideConFiltros(sitio, campo)
      )
      .map(sitio => sitio[campo])
  );
}


function reconstruirFiltro(
  elemento,
  valores,
  textoInicial
) {
  const valorActual = elemento.value;

  elemento.innerHTML = "";

  const opcionTodos =
    document.createElement("option");

  opcionTodos.value = "";
  opcionTodos.textContent = textoInicial;

  elemento.appendChild(opcionTodos);

  valores.forEach(valor => {
    const opcion =
      document.createElement("option");

    opcion.value = valor;
    opcion.textContent = valor;

    elemento.appendChild(opcion);
  });

  if (valores.includes(valorActual)) {
    elemento.value = valorActual;
  } else {
    elemento.value = "";
  }
}
function coincideConFiltrosBase(
  sitio
) {

  return configuracionFiltros.every(
    ({ elemento, campo }) => {

      const valorSeleccionado =
        limpiarTexto(
          elemento.value
        );

      return (
        !valorSeleccionado ||
        limpiarTexto(
          sitio[campo]
        ) === valorSeleccionado
      );

    }
  );
}

function obtenerOpcionesLaarExactas() {

  return ordenarValores(
    sitios
      .filter(
        sitio =>
          coincideConBusqueda(sitio) &&
          coincideConFiltrosBase(sitio)
      )
      .map(
        sitio =>
          limpiarTexto(
            sitio[
              "LAAR Status 2026-2027"
            ]
          )
      )
      .filter(Boolean)
  );
}
function actualizarResumenLaarExacto() {

  if (!resumenLaarExacto) {
    return;
  }

  const cantidad =
    valoresLaarExactosSeleccionados
      .size;

  resumenLaarExacto.textContent =
    cantidad === 0
      ? "Ninguna"
      : cantidad === 1
      ? "1 seleccionada"
      : `${cantidad} seleccionadas`;
}

function actualizarOpcionesLaar() {

  if (
    !listaLaarExacto ||
    !sugerenciasLaar
  ) {
    return;
  }

  const opciones =
    obtenerOpcionesLaarExactas();

  /*
   * Descarta selecciones que dejaron
   * de estar disponibles por cambios
   * en Crop, Season u Operations.
   */
  valoresLaarExactosSeleccionados =
    new Set(
      [
        ...valoresLaarExactosSeleccionados
      ].filter(
        valor =>
          opciones.includes(valor)
      )
    );

  listaLaarExacto.innerHTML = "";
  sugerenciasLaar.innerHTML = "";

  opciones.forEach(valor => {

    /*
     * Sugerencias para el modo Contiene.
     */
    const sugerencia =
      document.createElement(
        "option"
      );

    sugerencia.value = valor;

    sugerenciasLaar.appendChild(
      sugerencia
    );

    /*
     * Selecciones para el modo exacto.
     */
    const fila =
      document.createElement(
        "label"
      );

    fila.className =
      "opcion-laar-exacta";

    const checkbox =
      document.createElement(
        "input"
      );

    checkbox.type = "checkbox";
    checkbox.value = valor;

    checkbox.checked =
      valoresLaarExactosSeleccionados
        .has(valor);

    const texto =
      document.createElement(
        "span"
      );

    texto.textContent = valor;

    checkbox.addEventListener(
      "change",
      () => {

        if (checkbox.checked) {

          valoresLaarExactosSeleccionados
            .add(valor);

        } else {

          valoresLaarExactosSeleccionados
            .delete(valor);

        }

        actualizarResumenLaarExacto();
        actualizarVista();

      }
    );

    fila.appendChild(checkbox);
    fila.appendChild(texto);

    listaLaarExacto.appendChild(
      fila
    );

  });

  actualizarResumenLaarExacto();
}

function actualizarFiltrosDependientes() {

  configuracionFiltros.forEach(
    ({
      elemento,
      campo,
      textoInicial
    }) => {

      reconstruirFiltro(
        elemento,
        obtenerValoresDisponibles(
          campo
        ),
        textoInicial
      );

    }
  );

  actualizarOpcionesLaar();
}

function actualizarDashboard(sitiosFiltrados) {
  const drops = sitiosFiltrados.filter(
    esDrop
  ).length;

  const sembradas = sitiosFiltrados.filter(
    sitio =>
      !esDrop(sitio) &&
      estaSembrado(sitio)
  ).length;

  const pendientes = sitiosFiltrados.filter(
    sitio =>
      !esDrop(sitio) &&
      !estaSembrado(sitio)
  ).length;

  const totalOperativo =
    sembradas + pendientes;

  const avance =
    totalOperativo > 0
      ? Math.round(
          (sembradas / totalOperativo) * 100
        )
      : 0;

  document.getElementById("totalAOI").textContent =
    sitiosFiltrados.length;

  document.getElementById("sembradas").textContent =
    sembradas;

  document.getElementById("pendientes").textContent =
    pendientes;

  document.getElementById("drop").textContent =
    drops;

  document.getElementById("avanceGrande").textContent =
  `${avance}%`;
let colorAvance;

if (avance <= 25) {

  colorAvance = "#d32f2f";

} else if (avance <= 50) {

  colorAvance = "#f57c00";

} else if (avance <= 75) {

  colorAvance = "#fbc02d";

} else {

  colorAvance = "#2e7d32";

}

document.getElementById(
  "avanceGrande"
).style.color = colorAvance;
const anguloAvance =
  -90 + (
    Math.max(
      0,
      Math.min(100, avance)
    ) * 1.8
  );

document.getElementById(
  "agujaAvance"
).style.transform =
  `rotate(${anguloAvance}deg)`;
}
function generarDatosPlanter(
  sitiosBase = sitios
) {

  const resultado = {};

  sitiosBase.forEach(sitio => {

    if (
      esDrop(sitio) ||
      !estaSembrado(sitio)
    ) {
      return;
    }

    const planter =
      limpiarTexto(
        sitio["Planter"]
      );
console.log(
  "PLANTER:",
  sitio["Planter"]
);
    if (!planter) {
      return;
    }

    const area =
      Number(
        String(
          sitio["Area ( Ha)"] || "0"
        ).replace(",", ".")
      ) || 0;

    if (!resultado[planter]) {

      resultado[planter] = {

        planter: planter,

        aoi: 0,

        hectareas: 0

      };

    }

    resultado[planter].aoi += 1;

    resultado[planter].hectareas += area;

  });

  return Object.values(resultado)
    .sort(
      (a, b) =>
        b.hectareas - a.hectareas
    );

}
function generarDatosTimeline(
  sitiosBase = sitios
) {

  const sembrados =
    sitiosBase.filter(
      sitio =>
        !esDrop(sitio) &&
        estaSembrado(sitio)
    );

  const cultivos = {};

  sembrados.forEach(sitio => {

    const cultivo =
      limpiarTexto(sitio.Crop);

    const fechaPlanting =
      convertirFechaPlanting(
        sitio[
          "Planting Date (MM/DD/YYYY)"
        ]
      );

    if (
      !cultivo ||
      !fechaPlanting
    ) {
      return;
    }

    const semana =
      crearClaveSemana(
        fechaPlanting
      );

    if (!cultivos[cultivo]) {
      cultivos[cultivo] = {};
    }

    if (!cultivos[cultivo][semana]) {

      cultivos[cultivo][semana] = {
        cantidad: 0,
        aoiIds: [],
        localidades: []
      };

    }

    cultivos[cultivo][semana]
      .cantidad += 1;

    cultivos[cultivo][semana]
      .aoiIds.push(
        limpiarTexto(
          sitio["AOI ID"]
        )
      );

    const localidad =
      limpiarTexto(
        sitio.Location
      );

    if (
      localidad &&
      !cultivos[cultivo][semana]
        .localidades.includes(localidad)
    ) {

      cultivos[cultivo][semana]
        .localidades.push(localidad);

    }

  });

  return cultivos;
}

function cargarFiltroTimeline({
  campo,
  selectorId,
  listaId,
  resumenId,
  textoTodos
}) {
  const selector =
    document.getElementById(selectorId);

  const lista =
    document.getElementById(listaId);

  const resumen =
    document.getElementById(resumenId);

  if (
    !selector ||
    !lista ||
    !resumen
  ) {
    return;
  }

  const valores = ordenarValores(
    sitios.map(
      sitio => sitio[campo]
    )
  );

  selector.innerHTML = "";
  lista.innerHTML = "";

  valores.forEach(valor => {
    const opcion =
      document.createElement("option");

    opcion.value = valor;
    opcion.textContent = valor;

    selector.appendChild(opcion);

    const fila =
      document.createElement("label");

    fila.className =
      "timeline-opcion-item";

    const checkbox =
      document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.value = valor;

    const textoOpcion =
      document.createElement("span");

    textoOpcion.textContent = valor;

    checkbox.addEventListener(
      "change",
      () => {
        opcion.selected =
          checkbox.checked;

        const cantidadSeleccionada =
          Array.from(
            selector.selectedOptions
          ).length;

        resumen.textContent =
          cantidadSeleccionada === 0
            ? textoTodos
            : `${cantidadSeleccionada} seleccionados`;

        selector.dispatchEvent(
          new Event("change")
        );
      }
    );

    fila.appendChild(checkbox);
    fila.appendChild(textoOpcion);
    lista.appendChild(fila);
  });

  resumen.textContent = textoTodos;
}


function cargarFiltrosTimeline() {
  cargarFiltroTimeline({
    campo: "Crop",
    selectorId:
      "selectorCultivosTimeline",
    listaId:
      "listaCultivosTimeline",
    resumenId:
      "resumenCultivosTimeline",
    textoTodos: "Todos"
  });

  cargarFiltroTimeline({
    campo: "Region",
    selectorId:
      "selectorRegionesTimeline",
    listaId:
      "listaRegionesTimeline",
    resumenId:
      "resumenRegionesTimeline",
    textoTodos: "Todas"
  });

  cargarFiltroTimeline({
    campo: "Season",
    selectorId:
      "selectorSeasonsTimeline",
    listaId:
      "listaSeasonsTimeline",
    resumenId:
      "resumenSeasonsTimeline",
    textoTodos: "Todas"
  });
}

function convertirFechaPlanting(fechaTexto) {

  const partes =
    limpiarTexto(fechaTexto)
      .split("/");

  if (partes.length !== 3) {
    return null;
  }

  const mes =
    Number(partes[0]);

  const dia =
    Number(partes[1]);

  const anio =
    Number(partes[2]);

  const fecha =
    new Date(
      anio,
      mes - 1,
      dia
    );

  if (
    Number.isNaN(fecha.getTime()) ||
    fecha.getFullYear() !== anio ||
    fecha.getMonth() !== mes - 1 ||
    fecha.getDate() !== dia
  ) {
    return null;
  }

  return fecha;
}

function obtenerInicioSemana(fecha) {

  const inicio =
    new Date(
      fecha.getFullYear(),
      fecha.getMonth(),
      fecha.getDate()
    );

  const diaSemana =
    inicio.getDay();

  const diferencia =
    diaSemana === 0
      ? -6
      : 1 - diaSemana;

  inicio.setDate(
    inicio.getDate() + diferencia
  );

  return inicio;
}

function crearClaveSemana(fecha) {

  const inicioSemana =
    obtenerInicioSemana(fecha);

  const anio =
    inicioSemana.getFullYear();

  const mes =
    String(
      inicioSemana.getMonth() + 1
    ).padStart(2, "0");

  const dia =
    String(
      inicioSemana.getDate()
    ).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function formatearSemanaTimeline(claveSemana) {

  const partes =
    claveSemana
      .split("-")
      .map(Number);

  const inicio =
    new Date(
      partes[0],
      partes[1] - 1,
      partes[2]
    );

  const fin =
    new Date(inicio);

  fin.setDate(
    fin.getDate() + 6
  );

  const inicioTxt =
    inicio.toLocaleDateString(
      "es-AR",
      {
        day: "2-digit",
        month: "2-digit"
      }
    );

  const finTxt =
    fin.toLocaleDateString(
      "es-AR",
      {
        day: "2-digit",
        month: "2-digit"
      }
    );

  return `${inicioTxt}-${finTxt}`;
}

function generarCalendarioSemanal(sitiosBase) {

  const fechasValidas =
    sitiosBase
      .filter(
        sitio =>
          !esDrop(sitio) &&
          estaSembrado(sitio)
      )
      .map(
        sitio =>
          convertirFechaPlanting(
            sitio[
              "Planting Date (MM/DD/YYYY)"
            ]
          )
      )
      .filter(Boolean)
      .sort(
        (a, b) => a - b
      );

  if (fechasValidas.length === 0) {
    return [];
  }

  const primeraSemana =
    obtenerInicioSemana(
      fechasValidas[0]
    );

  const ultimaSemana =
    obtenerInicioSemana(
      fechasValidas[
        fechasValidas.length - 1
      ]
    );

  const semanas = [];

  const cursor =
    new Date(primeraSemana);

  while (cursor <= ultimaSemana) {

    semanas.push(
      crearClaveSemana(cursor)
    );

    cursor.setDate(
      cursor.getDate() + 7
    );
  }

  return semanas;
}

function crearPopup(sitio, estado) {

  const aoiId =
    limpiarTexto(
      sitio["AOI ID"]
    );

  const plantingDate =
    limpiarTexto(
      sitio["Planting Date (MM/DD/YYYY)"]
    );

  let bloqueAccion = "";

if (
  estado === "NO PLANIFICADO" ||
  estado === "PLANIFICADO"
) {

  const esViewer =
    window.FieldTrialAppMode &&
    window.FieldTrialAppMode.isViewer;

  if (!esViewer) {

    bloqueAccion = `

      <hr>

      <button
        type="button"
        class="btn-registrar-siembra"
        data-aoi="${aoiId}">
        Registrar Siembra
      </button>

    `;

  }

}
  else if (estado === "SEMBRADO") {

    bloqueAccion = `

      <hr>

      <div class="popup-fecha-registrada">

        <strong>
          Fecha de siembra
        </strong>

        <br>

        ${plantingDate}

      </div>

    `;

  }

  return `

    <div class="popup-planting">

      <div class="popup-aoi">

        ${aoiId}

      </div>

      <div class="popup-info">

        ${limpiarTexto(
          sitio.Location
        )}

        <br>

        ${limpiarTexto(
          sitio.Crop
        )}

        <br>

        ${limpiarTexto(
          sitio.Season
        )}

        <br>

        ${limpiarTexto(
          sitio["LAAR Status 2026-2027"]
        )}

        <br>

        ${limpiarTexto(
          sitio.Operations
        )}

      </div>

      <div class="popup-estado">

        Estado: ${estado}

      </div>

      ${bloqueAccion}

    </div>

  `;
}


function actualizarMapa(sitiosFiltrados) {
  capaMarcadores.clearLayers();

  const coordenadas = [];

  sitiosFiltrados.forEach(sitio => {
const latTexto =
  limpiarTexto(
    sitio["Latitude Trial"]
  );

const lonTexto =
  limpiarTexto(
    sitio["Longitude Trial"]
  );

if (
  !latTexto ||
  !lonTexto
) {
  return;
}

const lat =
  Number(latTexto);

const lon =
  Number(lonTexto);

if (
  !Number.isFinite(lat) ||
  !Number.isFinite(lon)
) {
  return;
}

const drop =
  esDrop(sitio);

const sembrado =
  estaSembrado(sitio);

const planificado =
  estaPlanificado(sitio);

if (
  limpiarTexto(
    sitio["AOI ID"]
  ) === "ANCY04NRDLET"
) {

  console.log(
    "AOI prueba",
    sitio["AOI ID"],
    estaPlanificado(sitio),
    planningData.length
  );

}
    
let color =
  "#d32f2f";

let estado =
  "NO PLANIFICADO";

if (drop) {

  color = "#000000";
  estado = "DROP";

}
else if (sembrado) {

  color = "#2e7d32";
  estado = "SEMBRADO";

}
else if (planificado) {

  color = "#f4b400";
  estado = "PLANIFICADO";

}

  const marcador = L.circleMarker(
  [lat, lon],
  {
    radius: 10,
    fillColor: color,
    color: "#ffffff",
    weight: 2,
    opacity: 1,
    fillOpacity: 0.95
  }
);
marcador.bindPopup(
  crearPopup(sitio, estado)
);

marcador.on(
  "popupopen",
  () => {

    const aoiId =
      limpiarTexto(
        sitio["AOI ID"]
      );

    const boton =
      document.querySelector(
        `.btn-registrar-siembra[data-aoi="${aoiId}"]`
      );

    if (!boton) {
      return;
    }
if (
  window.FieldTrialAppMode &&
  window.FieldTrialAppMode.isViewer
) {

  boton.remove();

  return;

}
    boton.onclick =
      async () => {

  abrirModalSiembra(
  aoiId
);

return;

if (
  !fecha ||
  fecha.trim() === ""
) {
  return;
}
      
        boton.disabled = true;
        boton.textContent =
          "Registrando...";

        const ok =
          await registrarSiembra(
            aoiId,
            fecha
          );

        if (ok) {

          alert(
            "Siembra registrada correctamente"
          );

        } else {

          alert(
            "Error registrando siembra"
          );

          boton.disabled = false;

          boton.textContent =
            "Registrar Siembra";

        }

      };

  }
);

marcador.addTo(capaMarcadores);

    coordenadas.push([lat, lon]);
  });

  if (coordenadas.length > 0) {
    mapa.fitBounds(
      coordenadas,
      {
        padding: [30, 30],
        maxZoom: 9
      }
    );
  }
}

function actualizarVista() {
  actualizarFiltrosDependientes();

  const sitiosFiltrados =
    obtenerSitiosFiltrados();

  actualizarDashboard(sitiosFiltrados);
  actualizarMapa(sitiosFiltrados);
}

configuracionFiltros.forEach(
  ({ elemento }) => {
    elemento.addEventListener(
      "change",
      actualizarVista
    );
  }
);
busqueda.addEventListener(
  "input",
  actualizarVista
);
if (filtroLaarTexto) {

  filtroLaarTexto.addEventListener(
    "input",
    actualizarVista
  );

}
if (filtroLaarModo) {

  filtroLaarModo.addEventListener(
    "change",
    () => {

      const esModoExacto =
        filtroLaarModo.value ===
        "exact";

      if (filtroLaarTexto) {
        filtroLaarTexto.hidden =
          esModoExacto;
      }

      if (filtroLaarExacto) {

        filtroLaarExacto.hidden =
          !esModoExacto;

        filtroLaarExacto.open =
          esModoExacto;

      }

      actualizarOpcionesLaar();
      actualizarVista();

    }
  );

}

limpiarFiltros.addEventListener(
  "click",
  () => {

    busqueda.value = "";

    if (filtroLaarTexto) {

      filtroLaarTexto.value = "";
      filtroLaarTexto.hidden = false;

    }

    if (filtroLaarModo) {

      filtroLaarModo.value =
        "contains";

    }

    valoresLaarExactosSeleccionados.clear();

    if (filtroLaarExacto) {

      filtroLaarExacto.hidden = true;
      filtroLaarExacto.open = false;

    }

    actualizarResumenLaarExacto();

    configuracionFiltros.forEach(
      ({ elemento }) => {

        elemento.value = "";

      }
    );

    actualizarVista();

  }
);

Papa.parse(
  `../Sitios_test.csv?v=${Date.now()}`,
  {
  download: true,
  header: true,
  skipEmptyLines: true,

  transformHeader: encabezado =>
    limpiarTexto(
      encabezado.replace(/^\uFEFF/, "")
    ),

 complete: async resultado => {
    sitios = resultado.data.filter(
      sitio =>
        limpiarTexto(sitio["AOI ID"]) &&
        limpiarTexto(sitio.Location)
    );

    console.log(
      `Sitios cargados: ${sitios.length}`
    );
cargarFiltrosTimeline();

await cargarPlanningDesdeSharePoint();

actualizarVista();
console.log(
"Pendientes guardados:",
obtenerSiembrasPendientes()
);
reconciliarPendientesConSitios(
  sitios
);

sincronizarSiembrasPendientes();

if (resultado.errors.length) {
      console.warn(
        "Advertencias del CSV:",
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
const botonLeyenda =
  document.getElementById("botonLeyenda");

const panelLeyenda =
  document.getElementById("panelLeyenda");

botonLeyenda.addEventListener(
  "click",
  () => {
    panelLeyenda.classList.toggle("visible");
  }
);
let aoiPendienteSiembra = null;

function abrirModalSiembra(
  aoiId
) {
console.log(
  "Abriendo modal",
  aoiId
);
  aoiPendienteSiembra =
    aoiId;

  modalFechaSiembra.value =
    new Date()
      .toISOString()
      .split("T")[0];

  modalPlanter.value = "";
  
  modalSiembra.classList.add(
    "visible"
  );

}

function cerrarModalSiembra() {

  modalSiembra.classList.remove(
    "visible"
  );

  aoiPendienteSiembra =
    null;

}


window.addEventListener(
  "online",
  async () => {

    console.log(
      "Sincronizando siembras pendientes..."
    );

    await sincronizarSiembrasPendientes();

  }
);
const btnTimeline =
  document.getElementById("btnTimeline");

const modalTimeline =
  document.getElementById("modalTimeline");

const cerrarTimeline =
  document.getElementById("cerrarTimeline");
const btnPlanning =
  document.getElementById(
    "btnPlanning"
  );

const modalPlanning =
  document.getElementById(
    "modalPlanning"
  );
const btnAddPlanning =
  document.getElementById(
    "btnAddPlanning"
  );

const btnAddSpecialPlanning =
  document.getElementById(
    "btnAddSpecialPlanning"
  );

const planningForm =
  document.getElementById(
    "planningForm"
  );

const btnCancelarPlanning =
  document.getElementById(
    "btnCancelarPlanning"
  );
const btnGuardarPlanning =
  document.getElementById(
    "btnGuardarPlanning"
  );
const cerrarPlanning =
  document.getElementById(
    "cerrarPlanning"
  );

let planningData = [];
let planningChanges = [];

let draggedPlanningCard =
  null;

let semanaPlanningVisible =
  null;

let planningWeekOffset = 0;
let planningReferenceStart = null;
const plantingPlanters = [
  "BE19182",
  "BE19183",
  "BE19184",
  "BE19185",
  "BE19186",
  "BE19187",
  "BE19188",
  "PP23191"
];
async function eliminarPlanning(
  id
) {

  try {

    const response =
      await fetch(
        URL_FLOW_PLANNING_DELETE,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            ID: id
          })
        }
      );

    if (!response.ok) {

      throw new Error(
        "Error eliminando Planning"
      );

    }

    planningChanges = planningChanges.filter(
      cambio => cambio.id !== id
    );

    await cargarPlanningDesdeSharePoint();

    renderPlanningBoard();

  } catch (error) {

    console.error(error);

    alert(
      "Error eliminando Planning"
    );

  }

}

function registrarCambioPlanning(
  item,
  planter,
  week,
  sortOrder = 0
) {

  const cambio = {
    id: item.id,
    week,
    planter,
    sortOrder
  };

  const indiceExistente =
    planningChanges.findIndex(
      actual => actual.id === item.id
    );

  if (indiceExistente >= 0) {
    planningChanges[indiceExistente] =
      cambio;
  } else {
    planningChanges.push(cambio);
  }

}

async function guardarCambiosPlanning() {

  if (planningChanges.length === 0) {
    return;
  }

  const btnGuardarCambios =
    document.getElementById(
      "btnGuardarCambiosPlanning"
    );

  if (btnGuardarCambios) {
    btnGuardarCambios.disabled = true;
    btnGuardarCambios.textContent =
      "Guardando...";
  }

  try {

    for (const cambio of planningChanges) {

      const response =
        await fetch(
          URL_FLOW_PLANNING_UPDATE,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              ID: cambio.id,
              Week: cambio.week,
              Planter: cambio.planter,
              SortOrder: cambio.sortOrder
            })
          }
        );

      if (!response.ok) {
        throw new Error(
          `Error actualizando Planning ID ${cambio.id}`
        );
      }

    }

    planningChanges = [];

    await cargarPlanningDesdeSharePoint();

    renderPlanningBoard();

    alert(
      "Cambios guardados correctamente"
    );

  } catch (error) {

    console.error(error);

    alert(
      "Error guardando los cambios del Planning"
    );

    renderPlanningBoard();

  }

}

function configuracionCultivoPlanning(
  cultivo
) {

  const nombre =
    limpiarTexto(cultivo)
      .toLowerCase();

  const parent =
    nombre.includes("parent chr");

  const stewarded =
    nombre.includes("stewarded");

  const regulated =
    nombre.includes("regulated");

  let tipo = "otro";
  let icono = "📍";
  let color = "#64748b";

  if (nombre.startsWith("canola")) {
    tipo = "canola";
    icono = "🌼";
    color = "#2563eb";
  } else if (nombre.startsWith("corn")) {
    tipo = "corn";
    icono = "🌽";
    color = "#c2410c";
  } else if (nombre.startsWith("mustard")) {
    tipo = "mustard";
    icono = "🌿";
    color = "#312e81";
  } else if (nombre.startsWith("soybean")) {
    tipo = "soybean";
    icono = "🌱";
    color = "#7c4a1d";
  } else if (nombre.startsWith("sunflower")) {
    tipo = "sunflower";
    icono = "🌻";
    color = "#d4a017";
  }

  if (parent) {
    color = "#f97316";
  }

  if (stewarded) {
    color = "#7e22ce";
  }

  if (regulated) {
    color = "#166534";
  }

  return {
    tipo,
    icono,
    color,
    parent,
    stewarded,
    regulated
  };

}

function renderIconoCultivoPlanning(
  cultivo,
  size = 26
) {

  const cfg =
    configuracionCultivoPlanning(
      cultivo
    );

  const insignia =
    cfg.parent
      ? "PC"
      : cfg.stewarded
      ? "S"
      : cfg.regulated
      ? "R"
      : "";

  return `
    <span
      title="${cultivo}"
      style="
        position:relative;
        width:${size}px;
        height:${size}px;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        border-radius:50%;
        background:${cfg.color}18;
        border:2px solid ${cfg.color};
        box-sizing:border-box;
        flex:0 0 auto;
        font-size:${Math.max(13, size - 10)}px;
        line-height:1;
      "
    >
      ${cfg.icono}
      ${
        insignia
          ? `
            <span style="
              position:absolute;
              right:-5px;
              bottom:-5px;
              min-width:14px;
              height:14px;
              padding:0 2px;
              display:flex;
              align-items:center;
              justify-content:center;
              border-radius:8px;
              background:${cfg.color};
              color:white;
              border:2px solid white;
              box-sizing:border-box;
              font-size:7px;
              font-weight:900;
              letter-spacing:-.2px;
            ">
              ${insignia}
            </span>
          `
          : ""
      }
    </span>
  `;

}

function configuracionEstadoPlanning(
  item
) {

  if (item.sembrado) {
    return {
      clave: "sembrado",
      etiqueta: "Sembrado",
      color: "#2e7d32",
      fondo: "#f3faf4",
      indicador: "✓"
    };
  }

  return {
    clave: "planificado",
    etiqueta: "Planificado",
    color: "#f4b400",
    fondo: "#fffdf5",
    indicador: ""
  };

}

  function crearTarjetaPlanning(item) {
    const estado =
      configuracionEstadoPlanning(item);
    const detalleEstado =
      item.sembrado
        ? `${item.plantingDate || "Fecha registrada"}${
            item.actualPlanter
              ? ` · ${item.actualPlanter}`
              : ""
          }`
        : estado.etiqueta;
    const esMobilePlanning =
      window.matchMedia(
        "(max-width: 1100px), (pointer: coarse)"
      ).matches;
    const cfgCultivo =
      configuracionCultivoPlanning(
        item.crop
      );
    const tipoPlanning =
      item.planningType &&
      item.planningType !== "Master"
        ? ` · ${item.planningType}`
        : "";
    const contenidoPrincipal =
      esMobilePlanning
        ? `
          <div style="
            min-width:0;
            flex:1 1 auto;
          ">
            <div style="
              font-weight:800;
              font-size:10px;
              color:#17251d;
              overflow:hidden;
              text-overflow:ellipsis;
              white-space:nowrap;
              line-height:1.2;
            ">
              ${item.location}
            </div>
            <div style="
              margin-top:3px;
              display:flex;
              align-items:center;
              gap:3px;
              min-width:0;
              color:#526158;
              font-size:8px;
              line-height:1.15;
            ">
              <span style="
                flex:0 0 auto;
                font-size:12px;
                line-height:1;
              ">
                ${cfgCultivo.icono}
              </span>
              <span style="
                min-width:0;
                overflow:hidden;
                text-overflow:ellipsis;
                white-space:nowrap;
              ">
                ${item.crop}${tipoPlanning}
              </span>
            </div>
          </div>
        `
        : `
          <div style="
            display:flex;
            align-items:center;
            gap:6px;
            min-width:0;
            flex:1 1 auto;
          ">
            ${renderIconoCultivoPlanning(
              item.crop,
              23
            )}
            <div style="min-width:0;">
              <div style="
                font-weight:800;
                font-size:11px;
                color:#17251d;
                overflow:hidden;
                text-overflow:ellipsis;
                white-space:nowrap;
                line-height:1.15;
              ">
                ${item.location}
              </div>
              <div style="
                margin-top:1px;
                font-size:9px;
                color:#526158;
                overflow:hidden;
                text-overflow:ellipsis;
                white-space:nowrap;
                line-height:1.15;
              ">
                ${item.crop}${tipoPlanning}
              </div>
            </div>
          </div>
        `;
    return `
      <div
        class="planning-card"
        draggable="true"
        data-id="${item.id}"
        data-planter="${item.planter}"
        data-week="${item.week}"
        data-sembrado="${item.sembrado}"
        title="${item.location} · ${item.crop} · ${item.aoiId} · ${detalleEstado}"
        style="
          background:${estado.fondo};
          border-left:5px solid ${estado.color};
          border-top:1px solid #e2e8e4;
          border-right:1px solid #e2e8e4;
          border-bottom:1px solid #e2e8e4;
          border-radius:9px;
          padding:${esMobilePlanning ? "5px 4px" : "6px 7px"};
          text-align:left;
          font-size:11px;
          margin-top:5px;
          cursor:grab;
          box-shadow:0 1px 2px rgba(20,45,30,.05);
          box-sizing:border-box;
          overflow:hidden;
        "
      >
        <div style="
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:${esMobilePlanning ? "2px" : "5px"};
          min-width:0;
        ">
          ${contenidoPrincipal}
          <div style="
            display:flex;
            align-items:center;
            gap:${esMobilePlanning ? "1px" : "4px"};
            flex:0 0 auto;
          ">
            ${
              item.sembrado
                ? `
                  <span
                    title="Sembrado"
                    style="
                      width:${esMobilePlanning ? "14px" : "17px"};
                      height:${esMobilePlanning ? "14px" : "17px"};
                      display:flex;
                      align-items:center;
                      justify-content:center;
                      border-radius:50%;
                      background:#2e7d32;
                      color:white;
                      font-size:${esMobilePlanning ? "8px" : "10px"};
                      font-weight:900;
                    "
                  >
                    ✓
                  </span>
                `
                : ""
            }
            <button
              type="button"
              class="btn-eliminar-planning"
              data-id="${item.id}"
              title="Eliminar del Planning"
              style="
                border:none;
                background:none;
                cursor:pointer;
                color:#b73b3b;
                font-size:${esMobilePlanning ? "10px" : "12px"};
                padding:0;
                opacity:.75;
              "
            >
              🗑
            </button>
          </div>
        </div>
        ${
          esMobilePlanning
            ? ""
            : `
              <div
                class="planning-card-footer"
                style="
                  display:flex;
                  justify-content:space-between;
                  align-items:center;
                  gap:5px;
                  margin-top:5px;
                  padding-top:4px;
                  border-top:1px solid ${estado.color}2d;
                "
              >
                <span
                  class="planning-card-aoi"
                  style="
                    min-width:0;
                    color:#6a756e;
                    font-size:8px;
                    overflow:hidden;
                    text-overflow:ellipsis;
                    white-space:nowrap;
                  "
                >
                  ${item.aoiId}
                </span>
                <span
                  class="planning-card-status"
                  style="
                    color:${estado.color};
                    font-size:8px;
                    font-weight:800;
                    overflow:hidden;
                    text-overflow:ellipsis;
                    white-space:nowrap;
                    text-align:right;
                  "
                >
                  ${detalleEstado}
                </span>
              </div>
            `
        }
      </div>
    `;
  }
function renderTarjetasPlanter(
  planter,
  week
) {

  return planningData
    .filter(
      item =>
        item.planter === planter &&
        item.week === week
    )
    .sort(
      (a, b) =>
        (a.sortOrder || 0) -
        (b.sortOrder || 0)
    )
    .map(
      item =>
        crearTarjetaPlanning(item)
    )
    .join("");

}

function renderColumnaPlanter(
  planter,
  week
) {

  return `
    <div
      class="planning-drop-zone"
      data-planter="${planter}"
      data-week="${week}"
      style="
        min-height:112px;
        border:1px dashed #d6e0da;
        border-radius:10px;
        background:#ffffff;
        padding:6px;
        box-sizing:border-box;
      "
    >
      ${renderTarjetasPlanter(
        planter,
        week
      )}
    </div>
  `;

}

function formatearRangoPlanning(
  inicio
) {

  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 6);

  const inicioTxt =
    inicio.toLocaleDateString(
      "es-AR",
      {
        day: "2-digit",
        month: "2-digit"
      }
    );

  const finTxt =
    fin.toLocaleDateString(
      "es-AR",
      {
        day: "2-digit",
        month: "2-digit"
      }
    );

  return `${inicioTxt} - ${finTxt}`;

}

function obtenerSemanasPlanningVisibles() {

  if (!planningReferenceStart) {
    planningReferenceStart =
      obtenerInicioSemana(new Date());
  }

  return [-1, 0, 1].map(
    posicion => {

      const inicio =
        new Date(planningReferenceStart);

      inicio.setDate(
        inicio.getDate() +
        ((planningWeekOffset + posicion) * 7)
      );

      return {
        posicion,
        inicio,
        week: formatearRangoPlanning(inicio),
        etiqueta:
          posicion === -1
            ? "Semana anterior"
            : posicion === 0
            ? "Semana central"
            : "Semana siguiente"
      };

    }
  );

}

function renderEncabezadoPlanters() {

  return plantingPlanters
    .map(
      planter => `
        <div style="
          background:#edf5ee;
          padding:9px 6px;
          border-radius:9px;
          font-weight:700;
          text-align:center;
          white-space:nowrap;
          box-sizing:border-box;
        ">
          ${planter}
        </div>
      `
    )
    .join("");

}

function renderBloqueSemanaPlanning(
  semana
) {

  const esSemanaActual =
    semana.week ===
    formatearRangoPlanning(
      obtenerInicioSemana(new Date())
    );

  const cantidad =
    planningData.filter(
      item => item.week === semana.week
    ).length;

  return `
    <section style="
      border:1px solid ${
        esSemanaActual
          ? "#7bb695"
          : "#dce5df"
      };
      border-radius:12px;
      background:${
        esSemanaActual
          ? "#f7fbf8"
          : "#fbfcfb"
      };
      overflow:hidden;
      box-sizing:border-box;
    ">

      <div style="
        min-height:34px;
        display:flex;
        justify-content:center;
        align-items:center;
        gap:9px;
        padding:5px 12px;
        background:${
          esSemanaActual
            ? "#e5f2e9"
            : "#f1f5f2"
        };
        border-bottom:1px solid #dce5df;
        box-sizing:border-box;
      ">

        <span style="
          font-size:12px;
          font-weight:700;
          color:${
            esSemanaActual
              ? "#0b6b3a"
              : "#52645a"
          };
          text-transform:uppercase;
          letter-spacing:.3px;
        ">
          ${
            esSemanaActual
              ? "Semana actual"
              : semana.etiqueta
          }
        </span>

        <span style="
          font-size:15px;
          font-weight:800;
          color:#173f2a;
        ">
          ${semana.week}
        </span>

        <span style="
          min-width:22px;
          padding:2px 7px;
          border-radius:999px;
          background:white;
          border:1px solid #d5dfd9;
          color:#5d6c63;
          font-size:11px;
          font-weight:700;
        ">
          ${cantidad}
        </span>

      </div>

      <div style="
        display:grid;
        grid-template-columns:repeat(8, minmax(0, 1fr));
        gap:8px;
        align-items:stretch;
        padding:8px;
        min-height:128px;
        box-sizing:border-box;
      ">
        ${plantingPlanters
          .map(
            planter =>
              renderColumnaPlanter(
                planter,
                semana.week
              )
          )
          .join("")}
      </div>

    </section>
  `;

}

function activarInteraccionesPlanning() {

  document
    .querySelectorAll(
      ".planning-card"
    )
    .forEach(
      tarjeta => {

        tarjeta.addEventListener(
          "dragstart",
          evento => {

            const id =
              Number(
                tarjeta.dataset.id
              );

            draggedPlanningCard = {
              id,
              planter:
                tarjeta.dataset.planter,
              week:
                tarjeta.dataset.week
            };

            evento.dataTransfer.effectAllowed =
              "move";

            evento.dataTransfer.setData(
              "text/plain",
              String(id)
            );

            tarjeta.style.opacity =
              "0.55";

          }
        );

        tarjeta.addEventListener(
          "dragend",
          () => {
            tarjeta.style.opacity = "1";
          }
        );

      }
    );

  document
    .querySelectorAll(
      ".planning-drop-zone"
    )
    .forEach(
      zona => {

        zona.addEventListener(
          "dragover",
          evento => {
            evento.preventDefault();
            evento.dataTransfer.dropEffect =
              "move";
          }
        );

        zona.addEventListener(
          "drop",
          evento => {

            evento.preventDefault();

            if (!draggedPlanningCard) {
              return;
            }

            const item =
              planningData.find(
                actual =>
                  actual.id ===
                  draggedPlanningCard.id
              );

            if (!item) {
              return;
            }

            const planterDestino =
              zona.dataset.planter;

            const weekDestino =
              zona.dataset.week;

            const cantidadDestino =
              planningData.filter(
                actual =>
                  actual.id !== item.id &&
                  actual.planter ===
                    planterDestino &&
                  actual.week ===
                    weekDestino
              ).length;

            item.planter = planterDestino;
            item.week = weekDestino;
            item.sortOrder = cantidadDestino;

            registrarCambioPlanning(
              item,
              planterDestino,
              weekDestino,
              cantidadDestino
            );

            draggedPlanningCard = null;

            renderPlanningBoard(
              semanaPlanningVisible
            );

          }
        );

      }
    );

  document
    .querySelectorAll(
      ".btn-eliminar-planning"
    )
    .forEach(
      boton => {

        boton.addEventListener(
          "click",
          async evento => {

            evento.stopPropagation();

            const id =
              Number(
                boton.dataset.id
              );

            await eliminarPlanning(id);

          }
        );

      }
    );

  const btnGuardarCambios =
    document.getElementById(
      "btnGuardarCambiosPlanning"
    );

  btnGuardarCambios?.addEventListener(
    "click",
    guardarCambiosPlanning
  );

  document
    .getElementById("btnPlanningAnterior")
    ?.addEventListener(
      "click",
      () => {
        planningWeekOffset -= 1;
        renderPlanningBoard();
      }
    );

  document
    .getElementById("btnPlanningSiguiente")
    ?.addEventListener(
      "click",
      () => {
        planningWeekOffset += 1;
        renderPlanningBoard();
      }
    );

  document
    .getElementById("btnPlanningHoy")
    ?.addEventListener(
      "click",
      () => {
        planningWeekOffset = 0;
        renderPlanningBoard();
      }
    );

  const navegadorSemanas =
    document.getElementById(
      "planningWeekNavigator"
    );

  navegadorSemanas?.addEventListener(
    "wheel",
    evento => {

      if (
        Math.abs(evento.deltaX) <=
        Math.abs(evento.deltaY)
      ) {
        return;
      }

      evento.preventDefault();

      planningWeekOffset +=
        evento.deltaX > 0 ? 1 : -1;

      renderPlanningBoard();

    },
    { passive: false }
  );

}

function obtenerCultivosPlanningManual() {

  return [
    ...new Set(
      sitios
        .map(
          sitio =>
            limpiarTexto(sitio.Crop)
        )
        .filter(Boolean)
    )
  ].sort(
    (a, b) =>
      a.localeCompare(
        b,
        "es",
        { sensitivity: "base" }
      )
  );

}

function poblarSemanasPlanningManual(
  select
) {

  if (!select) {
    return;
  }

  select.innerHTML = "";

  const hoy = new Date();

  for (let i = -8; i < 20; i++) {

    const inicio =
      obtenerInicioSemana(
        new Date(
          hoy.getFullYear(),
          hoy.getMonth(),
          hoy.getDate() + (i * 7)
        )
      );

    const semana =
      formatearRangoPlanning(inicio);

    const option =
      document.createElement("option");

    option.value = semana;
    option.textContent = semana;

    if (i === 0) {
      option.selected = true;
    }

    select.appendChild(option);

  }

}

function crearFormularioSpecialPlanning() {

  if (
    document.getElementById(
      "specialPlanningForm"
    )
  ) {
    return;
  }

  const toolbar =
    document.getElementById(
      "planningToolbar"
    );

  if (!toolbar) {
    return;
  }

  const form =
    document.createElement("div");

  form.id = "specialPlanningForm";
  form.hidden = true;

  form.innerHTML = `
    <div style="
      margin:10px 0 12px;
      padding:12px;
      border:1px solid #d9e3dc;
      border-radius:10px;
      background:#f8fbf9;
    ">

      <div style="
        margin-bottom:10px;
        color:#173f2a;
        font-size:14px;
        font-weight:800;
      ">
        Nursery / Special Planning
      </div>

      <div style="
        display:grid;
        grid-template-columns:repeat(3, minmax(0, 1fr));
        gap:10px;
      ">

        <div>
          <label for="specialPlanningType" style="display:block;margin-bottom:4px;font-size:11px;font-weight:700;color:#536159;">
            Type
          </label>
          <select id="specialPlanningType" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #bfc7c1;border-radius:8px;background:white;">
            <option value="Nursery">Nursery</option>
            <option value="Special">Special</option>
          </select>
        </div>

        <div>
          <label for="specialPlanningLocation" style="display:block;margin-bottom:4px;font-size:11px;font-weight:700;color:#536159;">
            Location
          </label>
          <input id="specialPlanningLocation" type="text" autocomplete="off" placeholder="Escribir localidad" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #bfc7c1;border-radius:8px;background:white;">
        </div>

        <div>
          <label for="specialPlanningCrop" style="display:block;margin-bottom:4px;font-size:11px;font-weight:700;color:#536159;">
            Crop
          </label>
          <select id="specialPlanningCrop" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #bfc7c1;border-radius:8px;background:white;">
            <option value="">Seleccionar cultivo</option>
          </select>
        </div>

        <div>
          <label for="specialPlanningIdentifier" style="display:block;margin-bottom:4px;font-size:11px;font-weight:700;color:#536159;">
            Identifier / AOI Name
          </label>
          <input id="specialPlanningIdentifier" type="text" autocomplete="off" placeholder="Ej. NURSERY-01" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #bfc7c1;border-radius:8px;background:white;">
        </div>

        <div>
          <label for="specialPlanningWeek" style="display:block;margin-bottom:4px;font-size:11px;font-weight:700;color:#536159;">
            Week
          </label>
          <select id="specialPlanningWeek" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #bfc7c1;border-radius:8px;background:white;"></select>
        </div>

        <div>
          <label for="specialPlanningPlanter" style="display:block;margin-bottom:4px;font-size:11px;font-weight:700;color:#536159;">
            Planter
          </label>
          <select id="specialPlanningPlanter" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #bfc7c1;border-radius:8px;background:white;">
            <option value="">Seleccionar sembradora</option>
            ${plantingPlanters
              .map(
                planter =>
                  `<option value="${planter}">${planter}</option>`
              )
              .join("")}
          </select>
        </div>

      </div>

      <div style="
        display:flex;
        justify-content:flex-end;
        gap:8px;
        margin-top:12px;
      ">
        <button id="btnCancelarSpecialPlanning" type="button" style="padding:8px 12px;border:1px solid #bfc7c1;border-radius:8px;background:white;color:#536159;font-weight:700;cursor:pointer;">
          Cancelar
        </button>
        <button id="btnGuardarSpecialPlanning" type="button" style="padding:8px 12px;border:none;border-radius:8px;background:#0b6b3a;color:white;font-weight:800;cursor:pointer;">
          Agregar al Planning
        </button>
      </div>

    </div>
  `;

  toolbar.insertAdjacentElement(
    "afterend",
    form
  );

  document
    .getElementById(
      "btnCancelarSpecialPlanning"
    )
    ?.addEventListener(
      "click",
      () => {
        form.hidden = true;
      }
    );

  document
    .getElementById(
      "btnGuardarSpecialPlanning"
    )
    ?.addEventListener(
      "click",
      guardarSpecialPlanning
    );

}

function prepararFormularioSpecialPlanning() {

  crearFormularioSpecialPlanning();

  const form =
    document.getElementById(
      "specialPlanningForm"
    );

  const cropSelect =
    document.getElementById(
      "specialPlanningCrop"
    );

  const weekSelect =
    document.getElementById(
      "specialPlanningWeek"
    );

  if (!form || !cropSelect) {
    return;
  }

  cropSelect.innerHTML = `
    <option value="">
      Seleccionar cultivo
    </option>
  `;

  obtenerCultivosPlanningManual()
    .forEach(
      cultivo => {
        const option =
          document.createElement("option");
        option.value = cultivo;
        option.textContent = cultivo;
        cropSelect.appendChild(option);
      }
    );

  poblarSemanasPlanningManual(
    weekSelect
  );

  document.getElementById(
    "specialPlanningType"
  ).value = "Nursery";

  document.getElementById(
    "specialPlanningLocation"
  ).value = "";

  document.getElementById(
    "specialPlanningIdentifier"
  ).value = "";

  document.getElementById(
    "specialPlanningPlanter"
  ).value = "";

  planningForm.hidden = true;
  form.hidden = false;

  document.getElementById(
    "specialPlanningLocation"
  ).focus();

}

async function guardarSpecialPlanning() {

  const type =
    limpiarTexto(
      document.getElementById(
        "specialPlanningType"
      )?.value
    );

  const location =
    limpiarTexto(
      document.getElementById(
        "specialPlanningLocation"
      )?.value
    );

  const crop =
    limpiarTexto(
      document.getElementById(
        "specialPlanningCrop"
      )?.value
    );

  const aoiId =
    limpiarTexto(
      document.getElementById(
        "specialPlanningIdentifier"
      )?.value
    );

  const week =
    limpiarTexto(
      document.getElementById(
        "specialPlanningWeek"
      )?.value
    );

  const planter =
    limpiarTexto(
      document.getElementById(
        "specialPlanningPlanter"
      )?.value
    );

  if (
    !type ||
    !location ||
    !crop ||
    !aoiId ||
    !week ||
    !planter
  ) {
    alert(
      "Complete todos los campos de Nursery / Special"
    );
    return;
  }

  const existe =
    planningData.some(
      item =>
        normalizarTexto(item.aoiId) ===
        normalizarTexto(aoiId)
    );

  if (existe) {
    alert(
      "Este identificador ya se encuentra planificado"
    );
    return;
  }

  const sortOrder =
    planningData.filter(
      item =>
        item.week === week &&
        item.planter === planter
    ).length;

  const boton =
    document.getElementById(
      "btnGuardarSpecialPlanning"
    );

  if (boton) {
    boton.disabled = true;
    boton.textContent = "Guardando...";
  }

  try {

    const response =
      await fetch(
        URL_FLOW_PLANNING,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            AOI_ID: aoiId,
            Location: location,
            Crop: crop,
            PlanningType: type,
            Week: week,
            Planter: planter,
            SortOrder: sortOrder
          })
        }
      );

    if (!response.ok) {
      throw new Error(
        "Error Flow Planning Nursery / Special"
      );
    }

    document.getElementById(
      "specialPlanningForm"
    ).hidden = true;

    await cargarPlanningDesdeSharePoint();
    renderPlanningBoard();

    alert(
      `${type} agregado correctamente al Planning`
    );

  } catch (error) {

    console.error(error);

    alert(
      "Error guardando Nursery / Special"
    );

  } finally {

    if (boton) {
      boton.disabled = false;
      boton.textContent =
        "Agregar al Planning";
    }

  }

}

async function cargarPlanningDesdeSharePoint() {

  try {

    const response =
      await fetch(
        URL_FLOW_PLANNING_GET,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: "{}"
        }
      );

const data =
  await response.json();

planningData = data.map(
  item => {

    const sitio =
      sitios.find(
        s =>
          limpiarTexto(
            s["AOI ID"]
          ) ===
          limpiarTexto(
            item.AOI_ID
          )
      );

    return {
      id:
        item.ID,

      sortOrder:
        Number(item.SortOrder) || 0,

      week:
        item.Week,

      planter:
        item.Planter,

      aoiId:
        item.AOI_ID,

      planningType:
        limpiarTexto(
          item.PlanningType
        ) || (sitio ? "Master" : "Special"),

      location:
        sitio
          ? limpiarTexto(
              sitio.Location
            )
          : limpiarTexto(
              item.Location
            ) || item.AOI_ID,

      crop:
        sitio
          ? limpiarTexto(
              sitio.Crop
            )
          : limpiarTexto(
              item.Crop
            ) || "Sin cultivo",

      plantingDate:
        sitio
          ? limpiarTexto(
              sitio[
                "Planting Date (MM/DD/YYYY)"
              ]
            )
          : "",

      sembrado:
        sitio
          ? estaSembrado(sitio)
          : false,

      actualPlanter:
        sitio
          ? limpiarTexto(
              sitio.Planter
            )
          : ""

    };

  }
);
console.log(
  "PlanningData cargado",
  planningData
);
console.table(
  planningData.map(
    item => ({
      aoiId: item.aoiId,
      location: item.location,
      crop: item.crop,
      planningType: item.planningType
    })
  )
);

  } catch (error) {

    console.error(
      "Error leyendo Planning",
      error
    );

  }

}

function obtenerAoiPlanificadosMaster() {

  return new Set(
    planningData
      .filter(
        item =>
          !item.planningType ||
          item.planningType === "Master"
      )
      .map(
        item =>
          normalizarTexto(
            item.aoiId
          )
      )
      .filter(Boolean)
  );

}

function obtenerSitiosDisponiblesPlanning() {

  const aoiPlanificados =
    obtenerAoiPlanificadosMaster();

  return sitios.filter(
    sitio => {

      const aoiId =
        normalizarTexto(
          sitio["AOI ID"]
        );

      return (
        aoiId &&
        !aoiPlanificados.has(aoiId)
      );

    }
  );

}

function cargarLocalidadesPlanning() {

  const comboLocality =
    document.getElementById(
      "planningLocality"
    );

  const comboCrop =
    document.getElementById(
      "planningCrop"
    );

  const preview =
    document.getElementById(
      "planningAoiPreview"
    );

  if (!comboLocality) {
    return;
  }

  const sitiosDisponibles =
    obtenerSitiosDisponiblesPlanning();

  const localidades =
    [
      ...new Set(
        sitiosDisponibles
          .map(
            sitio =>
              limpiarTexto(
                sitio.Location
              )
          )
          .filter(Boolean)
      )
    ].sort(
      (a, b) =>
        a.localeCompare(
          b,
          "es",
          { sensitivity: "base" }
        )
    );

  comboLocality.innerHTML = `
    <option value="">
      Seleccionar localidad
    </option>
  `;

  localidades.forEach(
    localidad => {

      const option =
        document.createElement(
          "option"
        );

      option.value = localidad;
      option.textContent = localidad;

      comboLocality.appendChild(
        option
      );

    }
  );

  if (comboCrop) {
    comboCrop.innerHTML = `
      <option value="">
        Seleccionar cultivo
      </option>
    `;
    comboCrop.disabled = true;
  }

  if (preview) {
    preview.textContent =
      localidades.length
        ? "Seleccione localidad y cultivo"
        : "No hay AOI disponibles para planificar";
  }

}

function cargarSemanasPlanning() {

  const comboSemana =
    document.getElementById(
      "planningWeek"
    );

  if (!comboSemana) {
    return;
  }

  comboSemana.innerHTML = "";

  const hoy = new Date();

  for (let i = 0; i < 20; i++) {

    const inicio =
      obtenerInicioSemana(
        new Date(
          hoy.getFullYear(),
          hoy.getMonth(),
          hoy.getDate() + (i * 7)
        )
      );

    const fin =
      new Date(inicio);

    fin.setDate(
      fin.getDate() + 6
    );

    const semana =
      `${inicio.toLocaleDateString(
        "es-AR",
        {
          day: "2-digit",
          month: "2-digit"
        }
      )} - ${fin.toLocaleDateString(
        "es-AR",
        {
          day: "2-digit",
          month: "2-digit"
        }
      )}`;

    const option =
      document.createElement(
        "option"
      );

    option.value = semana;
    option.textContent = semana;

    comboSemana.appendChild(
      option
    );

  }

}

function cargarCultivosPlanning() {

  const localidad =
    document.getElementById(
      "planningLocality"
    ).value;

  const comboCrop =
    document.getElementById(
      "planningCrop"
    );

  const preview =
    document.getElementById(
      "planningAoiPreview"
    );

  if (!comboCrop) {
    return;
  }

  comboCrop.innerHTML = `
    <option value="">
      Seleccionar cultivo
    </option>
  `;

  if (!localidad) {
    comboCrop.disabled = true;

    if (preview) {
      preview.textContent =
        "Seleccione localidad y cultivo";
    }

    return;
  }

  const cultivos =
    [
      ...new Set(
        obtenerSitiosDisponiblesPlanning()
          .filter(
            sitio =>
              limpiarTexto(
                sitio.Location
              ) === localidad
          )
          .map(
            sitio =>
              limpiarTexto(
                sitio.Crop
              )
          )
          .filter(Boolean)
      )
    ].sort(
      (a, b) =>
        a.localeCompare(
          b,
          "es",
          { sensitivity: "base" }
        )
    );

  cultivos.forEach(
    cultivo => {

      const option =
        document.createElement(
          "option"
        );

      option.value = cultivo;
      option.textContent = cultivo;

      comboCrop.appendChild(
        option
      );

    }
  );

  comboCrop.disabled =
    cultivos.length === 0;

  if (preview) {
    preview.textContent =
      cultivos.length
        ? "Seleccione un cultivo"
        : "No hay cultivos disponibles para esta localidad";
  }

}

function actualizarAoiPlanning() {

  const locality =
    document.getElementById(
      "planningLocality"
    )?.value;

  const crop =
    document.getElementById(
      "planningCrop"
    )?.value;

  const preview =
    document.getElementById(
      "planningAoiPreview"
    );

  if (!preview) {
    return;
  }

  if (!locality || !crop) {
    preview.textContent =
      "Seleccione localidad y cultivo";
    return;
  }

  const aoi =
    obtenerSitiosDisponiblesPlanning()
      .filter(
        sitio =>
          limpiarTexto(
            sitio.Location
          ) === locality &&
          limpiarTexto(
            sitio.Crop
          ) === crop
      )
      .map(
        sitio =>
          limpiarTexto(
            sitio["AOI ID"]
          )
      )
      .filter(Boolean);

  preview.innerHTML =
    aoi.length
      ? aoi.join("<br>")
      : "Sin AOI disponibles";

}

const btnPlanterStats =
  document.getElementById(
    "btnPlanterStats"
  );

const modalPlanterStats =
  document.getElementById(
    "modalPlanterStats"
  );

const cerrarPlanterStats =
  document.getElementById(
    "cerrarPlanterStats"
  );

const selectorRegionesTimeline =
  document.getElementById(
    "selectorRegionesTimeline"
  );

selectorRegionesTimeline.addEventListener(
  "change",
  () => {

    console.log(
      "REGIONES CAMBIARON"
    );

    console.log(
      Array.from(
        selectorRegionesTimeline.selectedOptions
      ).map(
        o => o.value
      )
    );

    if (chartTimeline) {
      btnTimeline.click();
    }

  }
);
const selectorCultivosTimeline =
  document.getElementById(
    "selectorCultivosTimeline"
  );

const selectorSeasonsTimeline =
  document.getElementById(
    "selectorSeasonsTimeline"
  );

selectorCultivosTimeline.addEventListener(
  "change",
  () => {

    if (chartTimeline) {
      btnTimeline.click();
    }

  }
);

selectorSeasonsTimeline.addEventListener(
  "change",
  () => {

    if (chartTimeline) {
      btnTimeline.click();
    }

  }
);

let chartTimeline = null;

const btnLimpiarFiltrosTimeline =
  document.getElementById(
    "limpiarFiltrosTimeline"
  );

if (btnLimpiarFiltrosTimeline) {

  btnLimpiarFiltrosTimeline.addEventListener(
    "click",
    () => {

      document
        .querySelectorAll(
          "#listaCultivosTimeline input[type='checkbox'], " +
          "#listaRegionesTimeline input[type='checkbox'], " +
          "#listaSeasonsTimeline input[type='checkbox']"
        )
        .forEach(
          checkbox => {
            checkbox.checked = false;
          }
        );

      document
        .querySelectorAll(
          "#selectorCultivosTimeline option, " +
          "#selectorRegionesTimeline option, " +
          "#selectorSeasonsTimeline option"
        )
        .forEach(
          option => {
            option.selected = false;
          }
        );

      document.getElementById(
        "resumenCultivosTimeline"
      ).textContent = "Todos";

      document.getElementById(
        "resumenRegionesTimeline"
      ).textContent = "Todas";

      document.getElementById(
        "resumenSeasonsTimeline"
      ).textContent = "Todas";

      if (chartTimeline) {
        btnTimeline.click();
      }

    }
  );

}

btnTimeline.addEventListener("click", () => {

  modalTimeline.classList.add("visible");

  const datosTimeline =
  generarDatosTimeline();

  console.log("TIMELINE");
console.log(datosTimeline);
  
console.table(datosTimeline);

  const ctx =
    document.getElementById("graficoTimeline");

  if (chartTimeline) {
    chartTimeline.destroy();
  }

const cultivosSeleccionados =
  Array.from(
    document.getElementById(
      "selectorCultivosTimeline"
    ).selectedOptions
  )
  .map(
    opcion => opcion.value
  );

const regionesSeleccionadas =
  Array.from(
    document.getElementById(
      "selectorRegionesTimeline"
    ).selectedOptions
  )
  .map(
    opcion => opcion.value
  );

const seasonsSeleccionadas =
  Array.from(
    document.getElementById(
      "selectorSeasonsTimeline"
    ).selectedOptions
  )
  .map(
    opcion => opcion.value
  );

const sitiosFiltradosRegion =
  sitios.filter(sitio => {

    const cumpleCultivo =
      cultivosSeleccionados.length === 0 ||
      cultivosSeleccionados.includes(
        sitio.Crop
      );

    const cumpleRegion =
      regionesSeleccionadas.length === 0 ||
      regionesSeleccionadas.includes(
        sitio.Region
      );

    const cumpleSeason =
      seasonsSeleccionadas.length === 0 ||
      seasonsSeleccionadas.includes(
        sitio.Season
      );

    return (
      cumpleCultivo &&
      cumpleRegion &&
      cumpleSeason
    );
  });
const cultivos =
  generarDatosTimeline(
    sitiosFiltradosRegion
  );
  
const esMobile =
  window.innerWidth <= 768;
  
const datasets = [];

const coloresCultivos = {

  // CORN
  "Corn": "#c2410c",                 // naranja oscuro
  "Corn - Parent Chr": "#f97316",    // naranja claro
  "Corn - Regulated": "#166534",     // verde bosque
  "Corn - Stewarded": "#5b21b6",     // violeta oscuro

  // SOYBEAN
  "Soybean": "#7c4a1d",              // marrón
  "Soybean - Regulated": "#22c55e",  // verde brillante
  "Soybean - Stewarded": "#9333ea",  // violeta brillante

  // SUNFLOWER
  "Sunflower": "#d4a017",            // amarillo opaco
  "Sunflower - Regulated": "#65a30d",// verde oliva
  "Sunflower - Stewarded": "#c026d3",// magenta violeta

  // CANOLA
  "Canola": "#2563eb",               // azul
  "Canola - Parent Chr": "#60a5fa",  // azul claro
  "Canola - Regulated": "#0f766e",   // verde petróleo
  "Canola - Stewarded": "#8b5cf6",   // lavanda

  // MUSTARD
  "Mustard - Stewarded": "#312e81"   // índigo
};
/*
 * Calendario continuo por semanas.
 * Usa únicamente las regiones seleccionadas.
 */
const calendarioSemanal =
  generarCalendarioSemanal(
    sitiosFiltradosRegion.filter(
      sitio => {

        const cumpleCultivo =
          cultivosSeleccionados.length === 0 ||
          cultivosSeleccionados.includes(
            sitio.Crop
          );

        const cumpleSeason =
          seasonsSeleccionadas.length === 0 ||
          seasonsSeleccionadas.includes(
            sitio.Season
          );

        return (
          cumpleCultivo &&
          cumpleSeason
        );

      }
    )
  );

const labelsGlobales =
  calendarioSemanal.map(
    semana =>
      formatearSemanaTimeline(
        semana
      )
  );

let indiceColor = 0;

/*
 * Una línea por cultivo.
 */
Object.entries(cultivos).forEach(
  ([cultivo, semanasCultivo]) => {

    const totalCultivo =
      sitiosFiltradosRegion.filter(
        sitio =>
          !esDrop(sitio) &&
          limpiarTexto(
            sitio.Crop
          ) === cultivo
      ).length;

    if (totalCultivo === 0) {
      return;
    }
const semanasConActividad =
  Object.keys(semanasCultivo)
    .sort();

const primeraSemanaCultivo =
  semanasConActividad[0];

const ultimaSemanaCultivo =
  semanasConActividad[
    semanasConActividad.length - 1
  ];
    let acumulado = 0;

    const puntos =
      calendarioSemanal.map(
        semana => {

          if (
  semana < primeraSemanaCultivo ||
  semana > ultimaSemanaCultivo
) {
  return {
    x:
      formatearSemanaTimeline(
        semana
      ),

    y: null,

    aoiDia: 0,
    aoiIds: [],
    localidades: [],
    semana: semana
  };
}
          
          const actividad =
            semanasCultivo[semana];

          const cantidadSemana =
            actividad
              ? actividad.cantidad
              : 0;

          acumulado += cantidadSemana;

          return {
            x:
              formatearSemanaTimeline(
                semana
              ),

            y:
              (
                acumulado /
                totalCultivo
              ) * 100,

            aoiDia:
              cantidadSemana,

            aoiIds:
              actividad
                ? actividad.aoiIds
                : [],

            localidades:
              actividad
                ? actividad.localidades
                : [],

            semana:
              semana
          };

        }
      );

    datasets.push({

      label:
        cultivo,

      data:
        puntos,

      ultimoAvance:
        puntos.length
          ? puntos[
              puntos.length - 1
            ].y
          : 0,

      /*
       * No muestra círculo en semanas
       * sin actividad.
       */
      pointRadius:
        contexto => {

          const punto =
            contexto.raw;

          if (
            !punto ||
            punto.aoiDia === 0
          ) {
            return 0;
          }

   return esMobile
  ? Math.max(
      3,
      punto.aoiDia * 1.5
    )
  : Math.max(
      5,
      punto.aoiDia * 3
    );

        },

      pointHoverRadius:
        contexto => {

          const punto =
            contexto.raw;

          if (
            !punto ||
            punto.aoiDia === 0
          ) {
            return 0;
          }

        return esMobile
  ? Math.max(
      5,
      punto.aoiDia * 1.5 + 2
    )
  : Math.max(
      7,
      punto.aoiDia * 3 + 2
    );


        },

borderColor:
  coloresCultivos[cultivo] ||
  "#64748b",

backgroundColor:
  coloresCultivos[cultivo] ||
  "#64748b",

      borderWidth:
        2,

      tension:
        0,

      fill:
        false

    });

    indiceColor++;

  }
);

/*
 * Ordenar la leyenda por avance final.
 */
datasets.sort(
  (a, b) =>
    b.ultimoAvance -
    a.ultimoAvance
);

/*
 * Línea gris de avance total.
 */
const sitiosOperativos =
  sitiosFiltradosRegion.filter(
    sitio =>
      !esDrop(sitio)
  );

const totalAOI =
  sitiosOperativos.length;

let acumuladoGeneral = 0;

const puntosGenerales =
  calendarioSemanal.map(
    semana => {

      const aoiDeLaSemana =
        sitiosOperativos.filter(
          sitio => {

            if (
              !estaSembrado(sitio)
            ) {
              return false;
            }

            const fecha =
              convertirFechaPlanting(
                sitio[
                  "Planting Date (MM/DD/YYYY)"
                ]
              );

            return (
              fecha &&
              crearClaveSemana(fecha) ===
                semana
            );

          }
        );

      acumuladoGeneral +=
        aoiDeLaSemana.length;

      return {
        x:
          formatearSemanaTimeline(
            semana
          ),

        y:
          totalAOI > 0
            ? (
                acumuladoGeneral /
                totalAOI
              ) * 100
            : 0,

        aoiDia:
          aoiDeLaSemana.length,

        aoiIds:
          aoiDeLaSemana.map(
            sitio =>
              limpiarTexto(
                sitio["AOI ID"]
              )
          ),

        localidades:
          [
            ...new Set(
              aoiDeLaSemana
                .map(
                  sitio =>
                    limpiarTexto(
                      sitio.Location
                    )
                )
                .filter(Boolean)
            )
          ],

        semana:
          semana
      };

    }
  );


  
  chartTimeline = new Chart(ctx, {

    type: "line",

    data: {

labels: labelsGlobales,
datasets: datasets
   
    },

plugins: [{

  id: "mostrarNumerosBurbujas",

  afterDatasetsDraw(chart) {

    const { ctx } = chart;

    chart.data.datasets.forEach(
      (dataset, datasetIndex) => {

     const meta =
  chart.getDatasetMeta(
    datasetIndex
  );

if (meta.hidden) {
  return;
}
   
        
        meta.data.forEach(
          (puntoGrafico, index) => {

            const dato =
              dataset.data[index];

            if (
              !dato ||
              !dato.aoiDia ||
              dato.aoiDia === 0
            ) {
              return;
            }

            ctx.save();

            ctx.fillStyle =
              dataset.borderColor;

            ctx.font =
              "bold 13px Arial";

            ctx.textAlign =
              "center";

const radio =
  Math.max(
    5,
    dato.aoiDia * 3
  );

const desplazamiento =
  radio + 10;

ctx.fillText(
  dato.aoiDia,
  puntoGrafico.x - desplazamiento,
  puntoGrafico.y - desplazamiento
);

            ctx.restore();

          }
        );

      }
    );

  }

}],
    
    options: {

      responsive: true,

      maintainAspectRatio: false,

plugins: {

 legend: {

  display: true,

  onClick: null,

  labels: {
    padding: 10
  }

},
  tooltip: {

    callbacks: {

      label: function(context) {

        const punto =
          context.raw;

      return [

  `Avance: ${punto.y.toFixed(1)}%`,

  `AOI sembrados: ${punto.aoiDia}`,

  "Localidades:",

  ...punto.localidades.map(
    loc => `• ${loc}`
  )

];

      }

    }

  }

}, 

scales: {

        y: {
          beginAtZero: true,
          max: 105,
ticks: {
  stepSize: 5
},
          title: {
            display: true,
            text: "% Avance Siembra"
          }
        },

        x: {
          type: "category",
          title: {
            display: true,
            text: "Planting Week"
          }
          
        }
      }
    }
  });

});

cerrarTimeline.addEventListener("click", () => {
  modalTimeline.classList.remove("visible");
});
function renderLeyendaEstadoPlanning() {

  return `
    <div style="
      display:flex;
      align-items:center;
      gap:14px;
      flex-wrap:wrap;
      color:#536159;
      font-size:13px;
      line-height:1;
    ">
      <span>
        <b style="color:#f4b400;font-size:18px;">●</b>
        Planificado
      </span>
      <span>
        <b style="color:#2e7d32;font-size:18px;">●</b>
        Sembrado
      </span>
    </div>
  `;

}

function cargarLibreriaExportPlanning(src, disponible) {
  if (disponible()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existente = document.querySelector(`script[src="${src}"]`);
    if (existente) {
      existente.addEventListener("load", resolve, { once: true });
      existente.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function asegurarLibreriasExportPlanning() {
  await cargarLibreriaExportPlanning(
    "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
    () => typeof window.html2canvas === "function"
  );
  await cargarLibreriaExportPlanning(
    "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js",
    () => Boolean(window.jspdf?.jsPDF)
  );
}

function nombreArchivoPlanning(texto) {
  return String(texto || "Planting_Planning")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "_");
}

function renderTarjetaExportPlanning(item) {
  const estado = configuracionEstadoPlanning(item);
  const cfg = configuracionCultivoPlanning(item.crop);
  const tipo = item.planningType && item.planningType !== "Master"
    ? ` · ${item.planningType}` : "";
  const detalle = item.sembrado
    ? `${item.plantingDate || "Sembrado"}${item.actualPlanter ? ` · ${item.actualPlanter}` : ""}`
    : "Planificado";

  return `
    <div style="margin-top:5px;padding:7px;border-left:5px solid ${estado.color};border-top:1px solid #dde6e0;border-right:1px solid #dde6e0;border-bottom:1px solid #dde6e0;border-radius:8px;background:${estado.fondo};box-sizing:border-box;overflow:hidden;">
      <div style="display:flex;align-items:center;gap:6px;min-width:0;">
        <span style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:${cfg.color}18;border:2px solid ${cfg.color};box-sizing:border-box;flex:0 0 auto;font-size:13px;">${cfg.icono}</span>
        <div style="min-width:0;">
          <div style="font-size:11px;font-weight:800;color:#17251d;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.location}</div>
          <div style="margin-top:1px;font-size:8px;color:#526158;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.crop}${tipo}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;gap:4px;margin-top:5px;padding-top:4px;border-top:1px solid ${estado.color}35;font-size:7px;">
        <span style="color:#66736b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.aoiId}</span>
        <span style="color:${estado.color};font-weight:800;white-space:nowrap;">${detalle}</span>
      </div>
    </div>`;
}

function renderSemanaExportPlanning(semana) {
  const central = semana.posicion === 0;
  const cantidad = planningData.filter(item => item.week === semana.week).length;
  const etiqueta = semana.posicion === -1 ? "SEMANA ANTERIOR" : central ? "SEMANA CENTRAL" : "SEMANA SIGUIENTE";

  return `
    <section style="margin-top:10px;border:2px solid ${central ? "#69ad84" : "#d8e2dc"};border-radius:11px;background:${central ? "#f5fbf7" : "#fbfcfb"};overflow:hidden;box-sizing:border-box;">
      <div style="display:flex;align-items:center;justify-content:center;gap:9px;padding:6px 10px;background:${central ? "#e4f3e9" : "#f0f4f1"};border-bottom:1px solid #d8e2dc;">
        <span style="color:${central ? "#0b6b3a" : "#59675f"};font-size:10px;font-weight:800;">${etiqueta}</span>
        <span style="color:#173f2a;font-size:${central ? "16px" : "14px"};font-weight:900;">${semana.week}</span>
        <span style="min-width:24px;padding:2px 7px;border:1px solid #cedbd3;border-radius:999px;background:#fff;color:#5d6c63;font-size:9px;font-weight:700;text-align:center;">${cantidad}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:7px;align-items:start;padding:7px;">
        ${plantingPlanters.map(planter => `
          <div style="min-height:90px;padding:4px;border:1px dashed #d6e0da;border-radius:8px;background:#fff;box-sizing:border-box;">
            ${planningData
              .filter(item => item.planter === planter && item.week === semana.week)
              .sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0))
              .map(renderTarjetaExportPlanning).join("")}
          </div>`).join("")}
      </div>
    </section>`;
}

function crearReporteExportPlanning() {
  const semanas = obtenerSemanasPlanningVisibles();
  const node = document.createElement("div");
  node.style.position = "fixed";
  node.style.left = "-20000px";
  node.style.top = "0";
  node.style.width = "1600px";
  node.style.padding = "24px";
  node.style.background = "#fff";
  node.style.color = "#17251d";
  node.style.fontFamily = "Arial,Helvetica,sans-serif";
  node.style.boxSizing = "border-box";

  const generado = new Date().toLocaleString("es-AR", {
    day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit"
  });

  node.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding-bottom:12px;border-bottom:2px solid #0b6b3a;">
      <div>
        <div style="color:#0b6b3a;font-size:24px;font-weight:900;">Planting Planning</div>
        <div style="margin-top:4px;color:#66736b;font-size:11px;">Planificación visible de tres semanas</div>
      </div>
      <div style="color:#66736b;font-size:10px;text-align:right;line-height:1.5;">Trial Platform 2026-27<br>Generado: ${generado}</div>
    </div>
    <div style="display:flex;align-items:center;justify-content:center;gap:11px;margin:12px 0 9px;">
      <span style="color:#69766e;font-size:12px;font-weight:700;opacity:.75;">${semanas[0].week}</span>
      <span style="color:#a7b5ac;">•</span>
      <span style="padding:5px 14px;border:1px solid #b9ddc5;border-radius:999px;background:#e7f4eb;color:#0b6b3a;font-size:16px;font-weight:900;">${semanas[1].week}</span>
      <span style="color:#a7b5ac;">•</span>
      <span style="color:#69766e;font-size:12px;font-weight:700;opacity:.75;">${semanas[2].week}</span>
    </div>
    <div style="display:flex;gap:16px;margin:0 5px 8px;color:#536159;font-size:10px;font-weight:700;">
      <span><b style="color:#f4b400;font-size:16px;">●</b> Planificado</span>
      <span><b style="color:#2e7d32;font-size:16px;">●</b> Sembrado</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:7px;padding:0 7px;">
      ${plantingPlanters.map(planter => `<div style="padding:9px 5px;border-radius:8px;background:#eaf3ed;color:#173f2a;font-size:12px;font-weight:900;text-align:center;">${planter}</div>`).join("")}
    </div>
    ${semanas.map(renderSemanaExportPlanning).join("")}`;

  document.body.appendChild(node);
  return { node, semanas };
}

function descargarPlanningPNG(canvas, nombre) {
  const link = document.createElement("a");
  link.download = `${nombre}.png`;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function descargarPlanningPDF(canvas, nombre) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation:"landscape", unit:"mm", format:"a3", compress:true });
  const margen = 8;
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const escala = Math.min((pw - margen*2)/canvas.width, (ph - margen*2)/canvas.height);
  const w = canvas.width * escala;
  const h = canvas.height * escala;
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", (pw-w)/2, (ph-h)/2, w, h, undefined, "FAST");
  pdf.save(`${nombre}.pdf`);
}

async function asegurarLibreriaExcelPlanning() {
  await cargarLibreriaExportPlanning(
    "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
    () => Boolean(window.XLSX)
  );
}

function obtenerFilasExcelPlanning() {
  const semanas = obtenerSemanasPlanningVisibles();
  const ordenSemanas = new Map(
    semanas.map((semana, index) => [semana.week, index])
  );

  const filas = planningData
    .filter(item => ordenSemanas.has(item.week))
    .slice()
    .sort((a, b) => {
      const semanaA = ordenSemanas.get(a.week) ?? 99;
      const semanaB = ordenSemanas.get(b.week) ?? 99;
      if (semanaA !== semanaB) return semanaA - semanaB;

      const planterA = plantingPlanters.indexOf(a.planter);
      const planterB = plantingPlanters.indexOf(b.planter);
      if (planterA !== planterB) return planterA - planterB;

      return (a.sortOrder || 0) - (b.sortOrder || 0);
    })
    .map(item => ({
      Week: item.week || "",
      Planter: item.planter || "",
      Location: item.location || "",
      Crop: item.crop || "",
      "AOI ID": item.aoiId || "",
      "Planning Type": item.planningType || "Master",
      Status: item.sembrado ? "Sembrado" : "Planificado",
      "Planting Date": item.plantingDate || "",
      "Actual Planter": item.actualPlanter || "",
      SortOrder: Number(item.sortOrder) || 0
    }));

  return { semanas, filas };
}

function crearResumenExcelPlanning(semanas) {
  return semanas.map((semana, index) => {
    const items = planningData.filter(item => item.week === semana.week);
    const sembrados = items.filter(item => item.sembrado).length;
    const planificados = items.length - sembrados;

    return {
      "Visible Position": index === 0 ? "Previous" : index === 1 ? "Central" : "Next",
      Week: semana.week,
      Planificados: planificados,
      Sembrados: sembrados,
      Total: items.length
    };
  });
}

function aplicarAnchosHojaPlanning(hoja, anchos) {
  hoja["!cols"] = anchos.map(width => ({ wch: width }));
}

async function exportarPlanningExcel() {
  const boton = document.getElementById("btnExportPlanningExcel");
  const textoOriginal = boton?.textContent || "📊 Export Excel";

  if (boton) {
    boton.disabled = true;
    boton.textContent = "Generando...";
  }

  try {
    await asegurarLibreriaExcelPlanning();

    const { semanas, filas } = obtenerFilasExcelPlanning();
    const resumen = crearResumenExcelPlanning(semanas);

    const workbook = window.XLSX.utils.book_new();

    const hojaPlanning = window.XLSX.utils.json_to_sheet(
      filas.length ? filas : [{
        Week: "",
        Planter: "",
        Location: "",
        Crop: "",
        "AOI ID": "",
        "Planning Type": "",
        Status: "",
        "Planting Date": "",
        "Actual Planter": "",
        SortOrder: ""
      }]
    );

    aplicarAnchosHojaPlanning(
      hojaPlanning,
      [18, 13, 22, 24, 18, 15, 13, 16, 15, 10]
    );

    hojaPlanning["!autofilter"] = {
      ref: hojaPlanning["!ref"] || "A1:J1"
    };

    const hojaSummary = window.XLSX.utils.json_to_sheet(resumen);
    aplicarAnchosHojaPlanning(hojaSummary, [18, 18, 14, 12, 10]);

    window.XLSX.utils.book_append_sheet(
      workbook,
      hojaPlanning,
      "Planning"
    );

    window.XLSX.utils.book_append_sheet(
      workbook,
      hojaSummary,
      "Summary"
    );

    const nombre = nombreArchivoPlanning(
      `Planting_Planning_${semanas[0].week}_${semanas[2].week}`
    );

    window.XLSX.writeFile(
      workbook,
      `${nombre}.xlsx`
    );

  } catch (error) {
    console.error("Error exportando Planning a Excel", error);
    alert("No se pudo generar el archivo Excel de Planning");
  } finally {
    if (boton) {
      boton.disabled = false;
      boton.textContent = textoOriginal;
    }
  }
}

async function exportarPlanning(formato) {
  const botones = [
    document.getElementById("btnExportPlanningPDF"),
    document.getElementById("btnExportPlanningPNG"),
    document.getElementById("btnExportPlanningExcel")
  ].filter(Boolean);
  const textos = botones.map(b => b.textContent);
  botones.forEach(b => { b.disabled = true; b.textContent = "Generando..."; });
  let reporte;
  try {
    await asegurarLibreriasExportPlanning();
    reporte = crearReporteExportPlanning();
    const canvas = await window.html2canvas(reporte.node, {
      backgroundColor:"#ffffff", scale:1.35, useCORS:true, logging:false, windowWidth:1650, scrollX:0, scrollY:0
    });
    const nombre = nombreArchivoPlanning(`Planting_Planning_${reporte.semanas[0].week}_${reporte.semanas[2].week}`);
    if (formato === "png") descargarPlanningPNG(canvas, nombre);
    else descargarPlanningPDF(canvas, nombre);
  } catch (error) {
    console.error("Error exportando Planning", error);
    alert("No se pudo generar el archivo de Planning");
  } finally {
    reporte?.node?.remove();
    botones.forEach((b,i) => { b.disabled = false; b.textContent = textos[i]; });
  }
}

function agregarBotonesExportPlanning() {
  const toolbar = document.getElementById("planningToolbar");
  if (!toolbar) return;
  let grupo = document.getElementById("planningExportActions");
  if (!grupo) {
    grupo = document.createElement("div");
    grupo.id = "planningExportActions";
    grupo.style.display = "flex";
    grupo.style.alignItems = "center";
    grupo.style.gap = "8px";
    grupo.style.marginLeft = "auto";
    grupo.innerHTML = `
      <button id="btnExportPlanningPDF" type="button" style="padding:8px 12px;border:1px solid #c7d7cd;border-radius:9px;background:#fff;color:#0b6b3a;font-size:12px;font-weight:800;cursor:pointer;">📄 Export PDF</button>
      <button id="btnExportPlanningPNG" type="button" style="padding:8px 12px;border:1px solid #c7d7cd;border-radius:9px;background:#fff;color:#0b6b3a;font-size:12px;font-weight:800;cursor:pointer;">🖼 Export PNG</button>
      <button id="btnExportPlanningExcel" type="button" style="padding:8px 12px;border:1px solid #c7d7cd;border-radius:9px;background:#fff;color:#0b6b3a;font-size:12px;font-weight:800;cursor:pointer;">📊 Export Excel</button>`;
    toolbar.style.display = "flex";
    toolbar.style.alignItems = "center";
    toolbar.style.gap = "8px";
    toolbar.style.flexWrap = "wrap";
    toolbar.appendChild(grupo);
  }
  const pdf = document.getElementById("btnExportPlanningPDF");
  const png = document.getElementById("btnExportPlanningPNG");
  if (pdf && !pdf.dataset.exportReady) {
    pdf.dataset.exportReady = "1";
    pdf.addEventListener("click", () => exportarPlanning("pdf"));
  }
  if (png && !png.dataset.exportReady) {
    png.dataset.exportReady = "1";
    png.addEventListener("click", () => exportarPlanning("png"));
  }
  const excel = document.getElementById("btnExportPlanningExcel");
  if (excel && !excel.dataset.exportReady) {
    excel.dataset.exportReady = "1";
    excel.addEventListener("click", exportarPlanningExcel);
  }
}

function renderPlanningBoard() {

  const semanas =
    obtenerSemanasPlanningVisibles();

  semanaPlanningVisible =
    semanas[1].week;

  const hayCambios =
    planningChanges.length > 0;

  document.getElementById(
    "planningGrid"
  ).innerHTML = `

    <div style="
      height:calc(100vh - 126px);
      min-height:540px;
      max-height:900px;
      display:grid;
      grid-template-rows:auto auto auto minmax(0, 1fr) auto;
      padding:7px 16px 8px;
      box-sizing:border-box;
      background:#ffffff;
      overflow:hidden;
    ">

      <div
        id="planningWeekNavigator"
        style="
          display:grid;
          grid-template-columns:34px 1fr 34px;
          align-items:center;
          gap:9px;
          min-height:31px;
          margin-bottom:3px;
        "
      >

        <button
          id="btnPlanningAnterior"
          type="button"
          title="Mostrar una semana anterior"
          style="
            width:34px;
            height:30px;
            border:1px solid #b9c9bf;
            border-radius:8px;
            background:white;
            color:#0b6b3a;
            font-size:19px;
            font-weight:800;
            cursor:pointer;
            padding:0;
          "
        >‹</button>

        <div style="
          display:flex;
          align-items:center;
          justify-content:center;
          gap:9px;
          min-width:0;
          white-space:nowrap;
        ">
<span style="
  font-size:13px;
  font-weight:700;
  color:#617265;
  opacity:.75;
">
  ${semanas[0].week}
</span>

<span style="color:#a7b5ac;">•</span>

<span style="
  font-size:15px;
  font-weight:900;
  color:#0b6b3a;
  background:#e8f4ec;
  padding:4px 10px;
  border-radius:999px;
  border:1px solid #cbe4d3;
">
  ${semanas[1].week}
</span>

<span style="color:#a7b5ac;">•</span>

<span style="
  font-size:13px;
  font-weight:700;
  color:#617265;
  opacity:.75;
">
  ${semanas[2].week}
</span>
          <button
            id="btnPlanningHoy"
            type="button"
            title="Volver a la semana actual"
            style="
              border:none;
              background:none;
              padding:0 0 0 4px;
              color:#627369;
              font-size:13px;
              cursor:pointer;
              text-decoration:underline;
              white-space:nowrap;
            "
          >Hoy</button>
        </div>

        <button
          id="btnPlanningSiguiente"
          type="button"
          title="Mostrar una semana siguiente"
          style="
            width:34px;
            height:30px;
            border:1px solid #b9c9bf;
            border-radius:8px;
            background:white;
            color:#0b6b3a;
            font-size:19px;
            font-weight:800;
            cursor:pointer;
            padding:0;
          "
        >›</button>

      </div>

      <div style="
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:8px;
        min-height:20px;
        margin:0 8px 4px;
      ">
        ${renderLeyendaEstadoPlanning()}
        <span style="color:#7a867f;font-size:11px;line-height:1;">
          Las tarjetas sembradas pueden moverse o eliminarse.
        </span>
      </div>

      <div style="
        display:grid;
        grid-template-columns:repeat(8, minmax(0, 1fr));
        gap:8px;
        padding:0 8px 5px;
        background:white;
        z-index:5;
      ">
        ${renderEncabezadoPlanters()}
      </div>

      <div
        id="planningWeeksScroll"
        style="
          min-height:0;
          overflow-y:auto;
          overflow-x:hidden;
          overscroll-behavior:contain;
          scrollbar-gutter:stable;
          padding:0 5px 8px 0;
        "
      >
        <div style="
          display:grid;
          gap:8px;
          padding-bottom:4px;
        ">
          ${semanas
            .map(renderBloqueSemanaPlanning)
            .join("")}
        </div>
      </div>

<div
  class="planning-save-container"
  style="
    display:flex;
    justify-content:flex-end;
    align-items:center;
    min-height:46px;
    padding:6px 4px 0;
    border-top:1px solid #e5ebe7;
    background:white;
    z-index:20;
  "
>
        <button
          id="btnGuardarCambiosPlanning"
          type="button"
          ${hayCambios ? "" : "disabled"}
          style="
            border:none;
            border-radius:9px;
            padding:9px 14px;
            background:${hayCambios ? "#0b6b3a" : "#cfd8d3"};
            color:white;
            font-weight:800;
            box-shadow:${
              hayCambios
                ? "0 6px 18px rgba(11,107,58,.24)"
                : "none"
            };
            cursor:${hayCambios ? "pointer" : "default"};
          "
        >
          💾 Guardar cambios${
            hayCambios
              ? ` (${planningChanges.length})`
              : ""
          }
        </button>
      </div>

    </div>
  `;

  agregarBotonesExportPlanning();
  activarInteraccionesPlanning();

}

function estilizarFormularioMasterPlanning() {

  if (!planningForm) {
    return;
  }

  planningForm.style.margin =
    "10px 0 12px";

  planningForm.style.padding =
    "12px";

  planningForm.style.border =
    "1px solid #d9e3dc";

  planningForm.style.borderRadius =
    "10px";

  planningForm.style.background =
    "#f8fbf9";

  planningForm.style.boxSizing =
    "border-box";

  let titulo =
    document.getElementById(
      "masterPlanningFormTitle"
    );

  if (!titulo) {

    titulo =
      document.createElement("div");

    titulo.id =
      "masterPlanningFormTitle";

    titulo.textContent =
      "Master Planning";

    titulo.style.marginBottom =
      "10px";

    titulo.style.color =
      "#173f2a";

    titulo.style.fontSize =
      "14px";

    titulo.style.fontWeight =
      "800";

    planningForm.prepend(titulo);

  }

  const grid =
    planningForm.querySelector(
      ".planning-form-grid"
    );

  if (grid) {

    grid.style.display = "grid";

    grid.style.gridTemplateColumns =
      "repeat(3, minmax(0, 1fr))";

    grid.style.gap = "10px";

    grid.style.alignItems = "start";

  }

  planningForm
    .querySelectorAll("label")
    .forEach(
      label => {

        label.style.display = "block";
        label.style.marginBottom = "4px";
        label.style.color = "#536159";
        label.style.fontSize = "11px";
        label.style.fontWeight = "700";

      }
    );

  planningForm
    .querySelectorAll("select")
    .forEach(
      select => {

        select.style.width = "100%";
        select.style.boxSizing = "border-box";
        select.style.padding = "9px";
        select.style.border =
          "1px solid #bfc7c1";
        select.style.borderRadius = "8px";
        select.style.background = "white";
        select.style.color = "#25352c";
        select.style.fontSize = "13px";

      }
    );

  const preview =
    document.getElementById(
      "planningAoiPreview"
    );

  if (preview) {

    preview.style.minHeight = "38px";
    preview.style.maxHeight = "74px";
    preview.style.overflowY = "auto";
    preview.style.boxSizing = "border-box";
    preview.style.padding = "9px";
    preview.style.border =
      "1px solid #bfc7c1";
    preview.style.borderRadius = "8px";
    preview.style.background = "white";
    preview.style.color = "#25352c";
    preview.style.fontSize = "12px";
    preview.style.lineHeight = "1.35";

  }

  const actions =
    planningForm.querySelector(
      ".planning-form-actions"
    );

  if (actions) {

    actions.style.display = "flex";
    actions.style.justifyContent = "flex-end";
    actions.style.gap = "8px";
    actions.style.marginTop = "12px";

  }

  if (btnCancelarPlanning) {

    btnCancelarPlanning.style.padding =
      "8px 12px";

    btnCancelarPlanning.style.border =
      "1px solid #bfc7c1";

    btnCancelarPlanning.style.borderRadius =
      "8px";

    btnCancelarPlanning.style.background =
      "white";

    btnCancelarPlanning.style.color =
      "#536159";

    btnCancelarPlanning.style.fontWeight =
      "700";

    btnCancelarPlanning.style.cursor =
      "pointer";

  }

  if (btnGuardarPlanning) {

    btnGuardarPlanning.style.padding =
      "8px 12px";

    btnGuardarPlanning.style.border =
      "none";

    btnGuardarPlanning.style.borderRadius =
      "8px";

    btnGuardarPlanning.style.background =
      "#0b6b3a";

    btnGuardarPlanning.style.color =
      "white";

    btnGuardarPlanning.style.fontWeight =
      "800";

    btnGuardarPlanning.style.cursor =
      "pointer";

  }

}

btnPlanning.addEventListener(
  "click",
  async () => {

    modalPlanning.classList.add(
      "visible"
    );

    planningChanges = [];
    planningWeekOffset = 0;
    planningReferenceStart =
      obtenerInicioSemana(new Date());

    await cargarPlanningDesdeSharePoint();

    renderPlanningBoard();

  }
);

btnAddPlanning?.addEventListener(
  "click",
  () => {

    estilizarFormularioMasterPlanning();
    cargarLocalidadesPlanning();
    cargarSemanasPlanning();

    const specialForm =
      document.getElementById(
        "specialPlanningForm"
      );

    if (specialForm) {
      specialForm.hidden = true;
    }

    planningForm.hidden =
      false;

  }
);

btnAddSpecialPlanning?.addEventListener(
  "click",
  prepararFormularioSpecialPlanning
);

btnCancelarPlanning?.addEventListener(
  "click",
  () => {

    planningForm.hidden =
      true;

  }
);
btnGuardarPlanning?.addEventListener(
  "click",
  async () => {

    const locality =
      document.getElementById(
        "planningLocality"
      ).value;

    const crop =
      document.getElementById(
        "planningCrop"
      ).value;

    const week =
      document.getElementById(
        "planningWeek"
      ).value;

    const planter =
      document.getElementById(
        "planningPlanter"
      ).value;

    if (
      !locality ||
      !crop ||
      !week ||
      !planter
    ) {

      alert(
        "Complete todos los campos"
      );

      return;
    }

    const registro =
      obtenerSitiosDisponiblesPlanning()
        .find(
          sitio =>
            limpiarTexto(
              sitio.Location
            ) === locality &&
            limpiarTexto(
              sitio.Crop
            ) === crop
        );

    if (!registro) {
      return;
    }

    const aoiId =
      limpiarTexto(
        registro["AOI ID"]
      );
const existe =
  planningData.some(
    item =>
      limpiarTexto(
        item.aoiId
      ) === aoiId
  );

if (existe) {

  alert(
    "Este AOI ya se encuentra planificado"
  );

  return;

}
    try {

      const response =
        await fetch(
          URL_FLOW_PLANNING,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              AOI_ID: aoiId,
              Location: locality,
              Crop: crop,
              PlanningType: "Master",
              Week: week,
              Planter: planter,
              SortOrder:
                planningData.filter(
                  item =>
                    item.week === week &&
                    item.planter === planter
                ).length
            })
          }
        );

      if (!response.ok) {

        throw new Error(
          "Error Flow Planning"
        );

      }

      planningData.push({

        week,

        planter,

        location: locality,

        crop,

        aoiId,

        planningType: "Master",

        sortOrder:
          planningData.filter(
            item =>
              item.week === week &&
              item.planter === planter
          ).length

      });

      planningForm.hidden =
        true;

      alert(
        "Planning guardado correctamente"
      );

      btnPlanning.click();

    } catch (error) {

      console.error(error);

      alert(
        "Error guardando Planning"
      );

    }

  }
);
document
  .getElementById(
    "planningLocality"
  )
  ?.addEventListener(
    "change",
    cargarCultivosPlanning
  );
document
  .getElementById(
    "planningCrop"
  )
  ?.addEventListener(
    "change",
    actualizarAoiPlanning
  );
cerrarPlanning.addEventListener(
  "click",
  () => {

    modalPlanning.classList.remove(
      "visible"
    );

  }
);

btnPlanterStats.addEventListener(
  "click",
  () => {

    const datos =
      generarDatosPlanter();

     const coloresPlanter = [

  "#3B82F6", // BE19186
  "#F85D7F", // PP23191
  "#F59E3A", // BE19182
  "#F2C84C", // BE19187
  "#4EB5B7", // BE19185
  "#8B5CF6", // BE19184
  "#BFC3C7", // Contractor
  "#38BDF8"  // BE19183

];
    
const totalAOI =
  datos.reduce(
    (suma, item) =>
      suma + item.aoi,
    0
  );

const totalHa =
  datos.reduce(
    (suma, item) =>
      suma + item.hectareas,
    0
  );

document.getElementById(
  "totalAOIPlanter"
).textContent =
  `${totalAOI} AOI`;

document.getElementById(
  "totalHaPlanter"
).textContent =
  `${totalHa.toFixed(1)} ha`;
    
    console.table(datos);
const ranking =
  document.getElementById(
    "planterRanking"
  );

ranking.innerHTML = `

  <table style="
    width:100%;
    border-collapse:collapse;
    font-size:14px;
  ">
  
    <thead>
      <tr>
        <th style="text-align:left;padding:8px;">
          Sembradora
        </th>

<th style="text-align:center;padding:8px;">
  AOI
</th>

<th style="text-align:center;padding:8px;">
  %AOI
</th>

<th style="text-align:center;padding:8px;">
  Ha
</th>

<th style="text-align:center;padding:8px;">
  %Ha
</th>
      </tr>
    </thead>

    <tbody>

${datos.map((item, index) => `

        <tr>

        <td style="
  padding:8px;
  border-top:1px solid #eeeeee;
  font-weight:600;
">

  <span
    style="
      display:inline-block;
      width:12px;
      height:12px;
      border-radius:50%;
      background:${
        coloresPlanter[index]
      };
      margin-right:8px;
      vertical-align:middle;
    "
  ></span>

  ${item.planter}

</td>

<td style="
  text-align:center;
  border-top:1px solid #eeeeee;
">
  ${item.aoi}
</td>

<td style="
  text-align:center;
  border-top:1px solid #eeeeee;
">
  ${((item.aoi / totalAOI) * 100).toFixed(1)}%
</td>

<td style="
  text-align:center;
  border-top:1px solid #eeeeee;
">
  ${item.hectareas.toFixed(1)}
</td>

<td style="
  text-align:center;
  border-top:1px solid #eeeeee;
">
  ${((item.hectareas / totalHa) * 100).toFixed(1)}%
</td>

        </tr>

      `).join("")}

    </tbody>

  </table>

`;
 
    const labels =
      datos.map(
        d => d.planter
      );

    const hectareas =
      datos.map(
        d => d.hectareas
      );
const aoi =
  datos.map(
    d => d.aoi
  );
   
    const canvas =
      document.getElementById(
        "graficoPlanter"
      );

    if (
      window.chartPlanter
    ) {
      window.chartPlanter.destroy();
    }

    window.chartPlanter =
      new Chart(
        canvas,
        {

          type: "doughnut",

          data: {

            labels: labels,

datasets: [

  {
    label: "AOI",

    data: aoi,

    backgroundColor: coloresPlanter,

    weight: 1
  },

  {
    label: "Ha",

    data: hectareas,

    backgroundColor: coloresPlanter,

    weight: 2
  }

]

          },

          options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

             legend: {
  display: false
}

            }

          }

        }
      );

    modalPlanterStats.classList.add(
      "visible"
    );

  }
);
cerrarPlanterStats.addEventListener(
  "click",
  () => {
    modalPlanterStats.classList.remove(
      "visible"
    );
  }
);
