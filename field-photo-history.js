(function () {
  "use strict";

  const CSV_URL = "AccessPhotos.csv";
  const REFRESH_ATTEMPTS = 5;
  const REFRESH_DELAY_MS = 2500;
  const UPDATE_COMMENT_URL =
    "https://defaultdb5054808ec6495cb57932c58ed84a.01.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/11/workflows/4572bdc03ad742f28aa4b08b37975774/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=VcS9B9f0qySwIOVSgnjerXEKfoPVk___3FlGBgYiyyM";

  let registros = [];
  let cargaPromise = null;

  function texto(valor) {
    return String(valor ?? "").trim();
  }

  function esperar(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
  }

  function limpiarComentario(valor) {
    const original = texto(valor);

    if (!original) {
      return "";
    }

    const contenedor = document.createElement("div");
    contenedor.innerHTML = original;

    contenedor
      .querySelectorAll("br")
      .forEach(elemento => {
        elemento.replaceWith("\n");
      });

    contenedor
      .querySelectorAll("p, div, li")
      .forEach(elemento => {
        elemento.appendChild(
          document.createTextNode("\n")
        );
      });

    return String(
      contenedor.textContent ||
      contenedor.innerText ||
      ""
    )
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }

  function numero(valor, predeterminado = 0) {
    const convertido = Number(texto(valor));
    return Number.isFinite(convertido)
      ? convertido
      : predeterminado;
  }

  function colorScore(score) {
    const valor = Number(score);

    if (valor === 9) return "#146b32";
    if (valor === 8) return "#238b45";
    if (valor === 7) return "#66bd63";
    if (valor === 6) return "#d9d83f";
    if (valor === 5) return "#f4b942";
    if (valor === 4) return "#f07c28";
    if (valor === 3) return "#e85c4a";
    if (valor === 2) return "#cc3434";
    if (valor === 1) return "#8f1d1d";

    return "#9aa39e";
  }

  function transformarFila(fila) {
    return {
      title: texto(fila["Title"]),
      aoiId: texto(fila["AccessID"]),
      location: texto(fila["Location"]),
      comments: limpiarComentario(fila["Comments"]),
      photoLink: texto(fila["PhotoLink"]),
      captureDate: texto(fila["CaptureDate"]),
      publicPhotoUrl: texto(fila["PublicPhotoUrl"]),
      photoType: texto(fila["PhotoType"]),
      crop: texto(fila["Crop"]),
      cropStage: texto(fila["CropStage"]),
      visitId: texto(fila["VisitId"]),
      visitScore: numero(fila["VisitScore"], null),
      photoOrder: numero(fila["PhotoOrder"], 1)
    };
  }

  function crearUrlActualizada() {
    const url = new URL(CSV_URL, window.location.href);
    url.searchParams.set("update", String(Date.now()));
    return url.href;
  }

  function cargarHistorial(forzar = false) {
    if (cargaPromise && !forzar) {
      return cargaPromise;
    }

    if (forzar) {
      cargaPromise = null;
    }

    const urlCarga = forzar
      ? crearUrlActualizada()
      : CSV_URL;

    cargaPromise = new Promise((resolve, reject) => {
      Papa.parse(urlCarga, {
        download: true,
        header: true,
        skipEmptyLines: true,
        downloadRequestHeaders: forzar
          ? {
              "Cache-Control": "no-cache",
              "Pragma": "no-cache"
            }
          : undefined,

        transformHeader: encabezado =>
          encabezado
            .replace(/^\uFEFF/, "")
            .trim(),

        complete: resultado => {
          registros = resultado.data
            .map(transformarFila)
            .filter(registro =>
              registro.aoiId &&
              registro.publicPhotoUrl
            );

          if (resultado.errors.length) {
            console.warn(
              "Advertencias al cargar AccessPhotos.csv:",
              resultado.errors
            );
          }

          console.log(
            `${registros.length} fotografías históricas cargadas.`
          );

          window.dispatchEvent(
            new CustomEvent("fieldphotos:history-updated", {
              detail: {
                count: registros.length,
                forced: forzar
              }
            })
          );

          resolve(registros);
        },

        error: error => {
          cargaPromise = null;

          console.error(
            "No fue posible cargar el historial de fotografías:",
            error
          );

          reject(error);
        }
      });
    });

    return cargaPromise;
  }

  function normalizar(valor) {
    return texto(valor).toLowerCase();
  }

  function existeRegistroEsperado(criterio = {}) {
    const recordId = normalizar(criterio.recordId);
    const visitId = normalizar(criterio.visitId);
    const aoiId = normalizar(criterio.aoiId);
    const photoType = normalizar(criterio.photoType);
    const photoOrder = Number(criterio.photoOrder || 0);

    return registros.some(registro => {
      if (recordId && normalizar(registro.title) === recordId) {
        return true;
      }

      return Boolean(
        visitId &&
        normalizar(registro.visitId) === visitId &&
        (!aoiId || normalizar(registro.aoiId) === aoiId) &&
        (!photoType || normalizar(registro.photoType) === photoType) &&
        (!photoOrder || registro.photoOrder === photoOrder)
      );
    });
  }

  async function refrescarHastaEncontrar(
    criterio,
    intentos = REFRESH_ATTEMPTS
  ) {
    let ultimoResultado = [];

    for (let intento = 1; intento <= intentos; intento += 1) {
      ultimoResultado = await cargarHistorial(true);

      if (!criterio || existeRegistroEsperado(criterio)) {
        return {
          found: true,
          attempts: intento,
          records: ultimoResultado
        };
      }

      if (intento < intentos) {
        console.log(
          `La visita todavía no está publicada. Reintento ${intento + 1} de ${intentos}...`
        );
        await esperar(REFRESH_DELAY_MS);
      }
    }

    return {
      found: false,
      attempts: intentos,
      records: ultimoResultado
    };
  }

  async function obtenerFotos(aoiId, photoType) {
    await cargarHistorial();

    return registros
      .filter(registro =>
        normalizar(registro.aoiId) ===
          normalizar(aoiId) &&
        normalizar(registro.photoType) ===
          normalizar(photoType)
      )
      .sort((a, b) => {
        const diferenciaFecha =
          new Date(b.captureDate).getTime() -
          new Date(a.captureDate).getTime();

        if (diferenciaFecha !== 0) {
          return diferenciaFecha;
        }

        return a.photoOrder - b.photoOrder;
      });
  }

  async function obtenerVisitas(aoiId, photoType) {
    const fotos = await obtenerFotos(
      aoiId,
      photoType
    );

    const grupos = new Map();

    fotos.forEach(foto => {
      const clave = foto.visitId || foto.title;

      if (!grupos.has(clave)) {
        grupos.set(clave, {
          visitId: clave,
          aoiId: foto.aoiId,
          location: foto.location,
          photoType: foto.photoType,
          crop: foto.crop,
          cropStage: foto.cropStage,
          visitScore: foto.visitScore,
          comments: foto.comments,
          captureDate: foto.captureDate,
          recordId: foto.title,
          photos: []
        });
      }

      grupos.get(clave).photos.push(foto);
    });

    return [...grupos.values()]
      .map(visita => {
        visita.photos.sort(
          (a, b) =>
            a.photoOrder - b.photoOrder
        );

        return visita;
      })
      .sort(
        (a, b) =>
          new Date(b.captureDate).getTime() -
          new Date(a.captureDate).getTime()
      );
  }

  async function actualizarComentarioVisita(visita, comments) {
    const comentario = texto(comments);
    if (!visita?.visitId || !visita?.aoiId) {
      throw new Error("La visita no tiene VisitId o AccessID válido.");
    }

    const response = await fetch(UPDATE_COMMENT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordId: texto(visita.recordId || visita.photos?.[0]?.title),
        visitId: texto(visita.visitId),
        aoiId: texto(visita.aoiId),
        comments: comentario
      })
    });

    if (!response.ok) {
      throw new Error(`No se pudo actualizar el comentario (${response.status}).`);
    }

    await cargarHistorial(true);
    return comentario;
  }

  function abrirEditorComentario(visita, onSaved) {
    document.getElementById("fieldPhotoCommentEditor")?.remove();
    const overlay = document.createElement("div");
    overlay.id = "fieldPhotoCommentEditor";
    overlay.style.cssText = "position:fixed;inset:0;z-index:45000;background:rgba(0,0,0,.48);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box";
    const panel = document.createElement("div");
    panel.style.cssText = "width:min(520px,100%);background:#fff;border-radius:16px;padding:20px;box-shadow:0 22px 60px rgba(0,0,0,.28)";
    panel.innerHTML = `
      <div style="font-size:18px;font-weight:900;color:#21352a">${visita.comments ? "Editar comentario" : "Agregar comentario"}</div>
      <div style="font-size:12px;color:#66756d;margin-top:4px">${texto(visita.location)} · ${texto(visita.aoiId)}</div>
      <textarea id="fieldPhotoCommentText" rows="5" style="width:100%;box-sizing:border-box;margin-top:14px;padding:11px;border:1px solid #bfcac3;border-radius:9px;resize:vertical;font:inherit" placeholder="Escriba una referencia del Access...">${texto(visita.comments).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</textarea>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
        <button type="button" data-comment-cancel style="padding:9px 13px;border:1px solid #c6d1ca;border-radius:9px;background:#fff;font-weight:800">Cancelar</button>
        <button type="button" data-comment-save style="padding:9px 13px;border:0;border-radius:9px;background:#0b6b3a;color:#fff;font-weight:900">Guardar</button>
      </div>`;
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    const cerrar = () => overlay.remove();
    overlay.onclick = e => { if (e.target === overlay) cerrar(); };
    panel.querySelector("[data-comment-cancel]").onclick = cerrar;
    panel.querySelector("[data-comment-save]").onclick = async e => {
      const boton = e.currentTarget;
      const nuevo = texto(panel.querySelector("#fieldPhotoCommentText").value);
      boton.disabled = true;
      boton.textContent = "Guardando...";
      try {
        await actualizarComentarioVisita(visita, nuevo);
        visita.comments = nuevo;
        cerrar();
        if (typeof onSaved === "function") await onSaved(nuevo);
        window.dispatchEvent(new CustomEvent("fieldphotos:comment-updated", { detail: { visitId: visita.visitId, aoiId: visita.aoiId, comments: nuevo } }));
      } catch (error) {
        console.error(error);
        alert("No se pudo actualizar el comentario del Access.");
        boton.disabled = false;
        boton.textContent = "Guardar";
      }
    };
    panel.querySelector("#fieldPhotoCommentText")?.focus();
  }

  window.FieldPhotoHistory = {
    cargarHistorial,
    refrescarHastaEncontrar,
    obtenerFotos,
    obtenerVisitas,
    limpiarComentario,
    colorScore,
    actualizarComentarioVisita,
    abrirEditorComentario
  };

  cargarHistorial().catch(() => {
    /* El historial podrá reintentarse al abrirlo. */
  });
})();
