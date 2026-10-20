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

if (estado === "PENDIENTE") {

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

    const drop = esDrop(sitio);
    const sembrado = estaSembrado(sitio);

    let color = "#d32f2f";
    let estado = "PENDIENTE";

    if (drop) {
      color = "#000000";
      estado = "DROP";
    } else if (sembrado) {
      color = "#2e7d32";
      estado = "SEMBRADO";
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

  complete: resultado => {
    sitios = resultado.data.filter(
      sitio =>
        limpiarTexto(sitio["AOI ID"]) &&
        limpiarTexto(sitio.Location)
    );

    console.log(
      `Sitios cargados: ${sitios.length}`
    );
cargarFiltrosTimeline();
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

const cerrarPlanning =
  document.getElementById(
    "cerrarPlanning"
  );
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

btnPlanning.addEventListener(
  "click",
  () => {

    modalPlanning.classList.add(
      "visible"
    );

document.getElementById(
  "planningGrid"
).innerHTML = `

<div
  style="
    padding:20px;
    text-align:center;
  "
>

<div
  style="
    font-size:24px;
    font-weight:700;
    color:#0b6b3a;
    margin-bottom:4px;
  "
>
    19/10 - 25/10
  </div>

  <div
    style="
      font-size:13px;
      color:#666;
      margin-bottom:10px;
    "
  >
    Current Week
  </div>
<div
  style="
    height:1px;
    background:#d9e3dc;
    margin:10px 0;
  "
></div>
  <div
    style="
display:grid;
grid-template-columns:
  repeat(8, 1fr);
gap:8px;
align-items:start;
    "
  >

  <div
  style="
    background:#edf5ee;
    padding:10px;
    border-radius:10px;
    font-weight:700;
  "
>
  BE19182
</div>

<div
  style="
    background:#edf5ee;
    padding:10px;
    border-radius:10px;
    font-weight:700;
  "
>
  BE19183
</div>

<div
  style="
    background:#edf5ee;
    padding:10px;
    border-radius:10px;
    font-weight:700;
  "
>
  BE19184
</div>

<div
  style="
    background:#edf5ee;
    padding:10px;
    border-radius:10px;
    font-weight:700;
  "
>
  BE19185
</div>

<div
  style="
    background:#edf5ee;
    padding:10px;
    border-radius:10px;
    font-weight:700;
  "
>
  BE19186
</div>

<div
  style="
    background:#edf5ee;
    padding:10px;
    border-radius:10px;
    font-weight:700;
  "
>
  BE19187
</div>

<div
  style="
    background:#edf5ee;
    padding:10px;
    border-radius:10px;
    font-weight:700;
  "
>
  BE19188
</div>

<div
  style="
    background:#edf5ee;
    padding:10px;
    border-radius:10px;
    font-weight:700;
  "
>
  PP23191
</div>

  </div>

</div>

`;
  }
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
