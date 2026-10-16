const CLAVE_SIEMBRAS_PENDIENTES =
  "harvestingPendingSync";

let sincronizacionSiembraEnCurso = false;

function obtenerSiembrasPendientes() {
  try {
    const contenido =
      localStorage.getItem(
        CLAVE_SIEMBRAS_PENDIENTES
      );

    return contenido
      ? JSON.parse(contenido)
      : [];
  } catch (error) {
    console.error(
      "Error leyendo siembras pendientes:",
      error
    );

    return [];
  }
}

function guardarSiembrasPendientes(
  pendientes
) {
  localStorage.setItem(
    CLAVE_SIEMBRAS_PENDIENTES,
    JSON.stringify(pendientes)
  );

  actualizarIndicadorOffline();
}

function agregarSiembraPendiente(
  aoiId,
  fecha,
  combine
) {
  const pendientes =
    obtenerSiembrasPendientes();

  const sinDuplicado =
    pendientes.filter(
      registro =>
        registro.aoiId !== aoiId
    );

  sinDuplicado.push({
    aoiId: aoiId,
    harvestDate: fecha,
    combine: combine,
    registeredAt:
      new Date().toISOString(),
    source:
      "Field Trial Platform Harvesting Offline"
  });

  guardarSiembrasPendientes(
    sinDuplicado
  );

  console.log(
    "Harvesting guardado localmente:",
    {
      aoiId: aoiId,
      harvestDate: fecha,
      combine: combine
    }
  );
}

function actualizarIndicadorOffline() {
  const indicador =
    document.getElementById(
      "estadoSincronizacion"
    );

  if (!indicador) {
    return;
  }

  const cantidad =
    obtenerSiembrasPendientes().length;

  if (cantidad === 0) {
    indicador.textContent =
      "✅ Sync";

    indicador.style.color =
      "#0b6b3a";

    indicador.title =
      "Todos los registros están sincronizados";

    return;
  }

  indicador.textContent =
    cantidad === 1
      ? "📡 1 pendiente"
      : `📡 ${cantidad} pendientes`;

  indicador.style.color =
    "#c26800";

indicador.title =
  "Cosechas pendientes de sincronización";
}

async function sincronizarSiembrasPendientes() {
  if (sincronizacionSiembraEnCurso) {
    return;
  }

  const pendientes =
    obtenerSiembrasPendientes();

  if (pendientes.length === 0) {
    actualizarIndicadorOffline();
    return;
  }

  sincronizacionSiembraEnCurso = true;

console.log(
  `Intentando sincronizar ${pendientes.length} cosecha(s)`
);

  const pendientesRestantes = [];

  try {
    for (const siembra of pendientes) {
      try {
        const respuesta =
          await fetch(
            URL_FLOW_SIEMBRA,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json"
              },
body: JSON.stringify({
  aoiId:
    siembra.aoiId,

  harvestDate:
    siembra.harvestDate,

  combine:
    siembra.combine,

  registeredAt:
    siembra.registeredAt,

  source:
    "Field Trial Platform Harvesting Offline Sync"
})
            }
          );

        if (!respuesta.ok) {
          pendientesRestantes.push(
            siembra
          );

          continue;
        }

        console.log(
  "Cosecha sincronizada:",
  siembra.aoiId
);

      } catch (error) {
        console.log(
  "La cosecha continúa pendiente:",
  siembra.aoiId
);

        pendientesRestantes.push(
          siembra
        );
      }
    }

    guardarSiembrasPendientes(
      pendientesRestantes
    );

  } finally {
    sincronizacionSiembraEnCurso = false;
    actualizarIndicadorOffline();
  }
}
function reconciliarPendientesConSitios(
  sitiosActuales
) {
  const pendientes =
    obtenerSiembrasPendientes();

  if (
    pendientes.length === 0 ||
    !Array.isArray(sitiosActuales)
  ) {
    actualizarIndicadorOffline();
    return;
  }

  const pendientesReales =
    pendientes.filter(pendiente => {

      const sitioBase =
        sitiosActuales.find(
          sitio =>
            String(
              sitio["AOI ID"] || ""
            ).trim() ===
            String(
              pendiente.aoiId || ""
            ).trim()
        );

      if (!sitioBase) {
        return true;
      }

const fechaEnBase =
  String(
    sitioBase[
      "Harvest Date (MM/DD/YYYY)"
    ] || ""
  ).trim();

      /*
       * Si el CSV ya tiene fecha,
       * significa que el registro llegó
       * correctamente al Excel.
       */
      return fechaEnBase === "";    });

  guardarSiembrasPendientes(
    pendientesReales
  );

  console.log(
    "Pendientes después de reconciliar:",
    pendientesReales.length
  );

  actualizarIndicadorOffline();
}
document.addEventListener(
  "DOMContentLoaded",
  actualizarIndicadorOffline
);


