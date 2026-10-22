(function () {
  "use strict";

  function esTrialDrop(sitio) {
    return String(sitio?.description ?? "")
      .trim()
      .toLowerCase()
      .includes("drop");
  }

  function busquedaEspecial() {
    return typeof window.obtenerBusquedaEspecial === "function"
      ? window.obtenerBusquedaEspecial()
      : "";
  }

  const crearIconoTrialOriginal = window.crearIconoTrial;
  const crearPopupTrialOriginal = window.crearPopupTrial;
  const actualizarLeyendaOriginal = window.actualizarLeyenda;

  if (
    typeof crearIconoTrialOriginal !== "function" ||
    typeof crearPopupTrialOriginal !== "function" ||
    typeof actualizarLeyendaOriginal !== "function"
  ) {
    console.error("drop-trial-addon.js debe cargarse después de app.js.");
    return;
  }

  window.crearIconoTrial = function (cultivo, sitio) {
    if (!esTrialDrop(sitio)) return crearIconoTrialOriginal(
    cultivo,
    sitio
);

    const cfg = configuracionCultivo(cultivo);
    return L.divIcon({
      className: "marcador-drop-contenedor",
      html: `
        <span class="marcador-drop cultivo-${cfg.tipo}" aria-label="Trial Drop - No visitar">
          <span class="icono-drop-cultivo">${cfg.icono}</span>
          <span class="equis-drop" aria-hidden="true">×</span>
        </span>
      `,
      iconSize: [42, 48],
      iconAnchor: [21, 48],
      popupAnchor: [0, -45]
    });
  };

  window.crearPopupTrial = function (sitio) {
    let html = crearPopupTrialOriginal(sitio);
    if (!esTrialDrop(sitio)) return html;

    const aviso = `
      <div class="aviso-trial-drop" role="status">
        <strong>DROP - NO VISITAR</strong>
        ${sitio.description ? `<span>${escaparHTML(sitio.description)}</span>` : ""}
      </div>
    `;

    html = html.replace(
      '<div class="popup-detalles">',
      `${aviso}<div class="popup-detalles">`
    );
/*
    html = html.replace(
      /<div class="botones-navegacion">[\s\S]*?<\/div>\s*<\/div>$/,
      "</div>"
    );
*/
    return html;
  };

  window.actualizarLeyenda = function (sitiosFiltrados) {
    actualizarLeyendaOriginal(sitiosFiltrados);

    const hayDrop = sitiosFiltrados.some(
      sitio => tieneTrial(sitio) && esTrialDrop(sitio)
    );

    if (!hayDrop || !contenidoLeyenda) return;

    contenidoLeyenda.insertAdjacentHTML(
      "beforeend",
      `
        <div class="item-leyenda item-leyenda-drop">
          <span class="muestra-drop-leyenda" aria-hidden="true"><span>×</span></span>
          <span>Trial Drop - No visitar</span>
        </div>
      `
    );
  };

  let marcadoresCercanosAddon = [];
  let marcadoresAbiertosAddon = [];
  let lineasAbiertasAddon = [];

  function normalizarLocalidadAddon(valor) {
    return String(valor || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function cerrarGrupoAddon() {
    lineasAbiertasAddon.forEach(linea => {
      if (capaMarcadores.hasLayer(linea)) capaMarcadores.removeLayer(linea);
    });
    lineasAbiertasAddon = [];
    marcadoresAbiertosAddon.forEach(marcador => {
      if (marcador._posicionRealAddon) marcador.setLatLng(marcador._posicionRealAddon);
      marcador._abiertoAddon = false;
    });
    marcadoresAbiertosAddon = [];
  }

  function candidatosAddon(marcador) {
    const origen = mapa.latLngToContainerPoint(marcador._posicionRealAddon);
    return marcadoresCercanosAddon.filter(candidato => {
      if (!capaMarcadores.hasLayer(candidato)) return false;
      const mismaLocalidad = marcador._localidadAddon && candidato._localidadAddon === marcador._localidadAddon && candidato._tipoAddon === marcador._tipoAddon;
      const punto = mapa.latLngToContainerPoint(candidato._posicionRealAddon);
      return mismaLocalidad || origen.distanceTo(punto) <= 90;
    });
  }

  function abrirGrupoAddon(grupo) {
    cerrarGrupoAddon();
    if (grupo.length < 2) return false;
    const centroLat = grupo.reduce((s,m) => s + m._posicionRealAddon.lat, 0) / grupo.length;
    const centroLng = grupo.reduce((s,m) => s + m._posicionRealAddon.lng, 0) / grupo.length;
    const centro = L.latLng(centroLat, centroLng);
    const centroPx = mapa.latLngToLayerPoint(centro);
    const radio = Math.max(60, Math.min(96, 48 + grupo.length * 8));
    grupo.forEach((marcador, indice) => {
      const angulo = -Math.PI / 2 + (Math.PI * 2 * indice / grupo.length);
      const destino = mapa.layerPointToLatLng(L.point(centroPx.x + Math.cos(angulo) * radio, centroPx.y + Math.sin(angulo) * radio));
      lineasAbiertasAddon.push(L.polyline([marcador._posicionRealAddon, destino], {color:"#526158", weight:1.5, opacity:.8, dashArray:"4 3", interactive:false}).addTo(capaMarcadores));
      marcador.setLatLng(destino);
      marcador._abiertoAddon = true;
      marcador.setZIndexOffset(5000 + indice);
    });
    marcadoresAbiertosAddon = grupo;
    mapa.closePopup();
    return true;
  }

  function registrarAddon(marcador, sitio, tipo) {
    marcador._posicionRealAddon = L.latLng(marcador.getLatLng());
    marcador._localidadAddon = normalizarLocalidadAddon(sitio.location);
    marcador._tipoAddon = tipo;
    marcador._abiertoAddon = false;
    marcador.off("click");
    marcador.on("click", evento => {
      if (evento.originalEvent) L.DomEvent.stop(evento.originalEvent);
      if (marcador._abiertoAddon) {
        marcador.openPopup();
        return;
      }
      if (!abrirGrupoAddon(candidatosAddon(marcador))) marcador.openPopup();
    });
    marcadoresCercanosAddon.push(marcador);
  }

  mapa.on("zoomstart movestart", cerrarGrupoAddon);
  mapa.on("click", cerrarGrupoAddon);

  window.actualizarMapa = function () {
    cerrarGrupoAddon();
    marcadoresCercanosAddon = [];
    capaMarcadores.clearLayers();
    console.log("DROP actualizarMapa");
    console.log("contadorSitios:", contadorSitios?.innerHTML);
    const sitiosFiltrados = sitios.filter(coincideConFiltros);
    console.log("sitiosFiltrados:", sitiosFiltrados.length);
    const coordenadas = [];
    const modo = busquedaEspecial();
    let cantidadTrials = 0;
    let cantidadAccess = 0;
    let cantidadDrop = 0;
    let trialsVerificados = 0;
let accessVerificados = 0;

    sitiosFiltrados.forEach(sitio => {
      const esDrop = esTrialDrop(sitio);
      const mostrarTrial =
        tieneTrial(sitio) &&
        modo !== "access" &&
        (modo !== "drop" || esDrop);

      const mostrarAccess =
        tieneAccess(sitio) &&
        modo !== "trial" &&
        modo !== "drop";

      if (mostrarTrial) {
        const marcadorTrialAddon = L.marker(
          [sitio.latitudeTrial, sitio.longitudeTrial],
          { icon: window.crearIconoTrial(sitio.crop, sitio), bubblingMouseEvents: false }
        )
          .bindPopup(window.crearPopupTrial(sitio), {
            maxWidth: 390,
            minWidth: 285,
            maxHeight: 520
          })
          .addTo(capaMarcadores);

        registrarAddon(marcadorTrialAddon, sitio, "trial");

        coordenadas.push([sitio.latitudeTrial, sitio.longitudeTrial]);
        cantidadTrials += 1;

if (
  String(
    sitio.trialCoordinateStatus || ""
  )
    .trim()
    .toUpperCase() === "VERIFIED"
) {
  trialsVerificados += 1;
}
        
        if (esDrop) cantidadDrop += 1;
      }

      if (mostrarAccess) {
        const sitioAccess = {
          ...sitio,
          latitude: sitio.latitudeAccess,
          longitude: sitio.longitudeAccess
        };

        const marcadorAccessAddon = L.marker(
          [sitio.latitudeAccess, sitio.longitudeAccess],
          { icon: crearIconoAccess(sitio), zIndexOffset: 1000, bubblingMouseEvents: false }
        )
          .bindPopup(crearPopupAccess(sitioAccess), {
            maxWidth: 390,
            minWidth: 285,
            maxHeight: 520,
            sitioAccess
          })
          .addTo(capaMarcadores);

        registrarAddon(marcadorAccessAddon, sitio, "access");

        coordenadas.push([sitio.latitudeAccess, sitio.longitudeAccess]);
        cantidadAccess += 1;

if (
  String(
    sitio.accessCoordinateStatus || ""
  )
    .trim()
    .toUpperCase() === "VERIFIED"
) {
  accessVerificados += 1;
}
        
      }
    });
const porcentajeTrials =
  cantidadTrials > 0
    ? Math.round(
        (trialsVerificados / cantidadTrials) * 100
      )
    : 0;

const porcentajeAccess =
  cantidadTrials > 0
    ? Math.round(
        (accessVerificados / cantidadTrials) * 100
      )
    : 0;

    console.log(
  "Primer sitio:",
  sitiosFiltrados[0]
);
contadorSitios.innerHTML = `
  <div class="kpi-item">
    <span class="kpi-valor">${sitiosFiltrados.length}</span>
    <span class="kpi-label">AOI</span>
  </div>

  <div class="kpi-item">
    <span class="kpi-valor">${cantidadTrials}</span>
    <span class="kpi-label">Trials</span>
  </div>

  <div class="kpi-item">
    <span class="kpi-valor">${cantidadAccess}</span>
    <span class="kpi-label">Access</span>
  </div>

  <div class="kpi-item">
    <span class="kpi-valor">${cantidadDrop}</span>
    <span class="kpi-label">Drop</span>
  </div>
<div class="kpi-item">
  <span class="kpi-valor">
    ${trialsVerificados}
  </span>

  <span class="kpi-subvalor">
    (${porcentajeTrials}%)
  </span>

  <span class="kpi-label">
    Trial Verified
  </span>
</div>

<div class="kpi-item">
  <span class="kpi-valor">
    ${accessVerificados}
  </span>

  <span class="kpi-subvalor">
    (${porcentajeAccess}%)
  </span>

  <span class="kpi-label">
    Access Verified
  </span>
</div>

`;
    console.log(
  "CONTADOR WIDTH:",
  contadorSitios.offsetWidth
);

console.log(
  "DISPLAY:",
  getComputedStyle(contadorSitios).display
);

console.log(
  "GRID:",
  getComputedStyle(contadorSitios).gridTemplateColumns
);
    window.actualizarLeyenda(sitiosFiltrados);

    if (coordenadas.length) {
      mapa.fitBounds(coordenadas, { padding: [30, 30], maxZoom: 10 });
    }
  };

  console.log("Visualización de Trials Drop y búsqueda por tipo habilitadas.");
})();
