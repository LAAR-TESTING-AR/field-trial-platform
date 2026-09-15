(function () {
  "use strict";

  const FLOW_GET_SETTINGS_URL =
    "PEGAR_AQUI_URL_DE_Obtener_Platform_Settings";

  const SETTINGS_KEYS = [
    "trialVisits",
    "trialPhotos",
    "visitComments",
    "visitScore",
    "cropStage",
    "timeline"
  ];

  async function cargarConfiguracionGlobal() {
    const response = await fetch(
      FLOW_GET_SETTINGS_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: "{}",
        cache: "no-store",
        credentials: "omit"
      }
    );

    if (!response.ok) {
      throw new Error(
        `No fue posible obtener los Settings. Estado ${response.status}.`
      );
    }

    const settings = await response.json();

    SETTINGS_KEYS.forEach(settingName => {
      if (typeof settings[settingName] === "boolean") {
        localStorage.setItem(
          settingName,
          String(settings[settingName])
        );
      }
    });

    window.FIELD_TRIAL_SETTINGS = settings;

    window.dispatchEvent(
      new CustomEvent("fieldtrial:settings-loaded", {
        detail: settings
      })
    );

    return settings;
  }

  window.FieldTrialGlobalSettings = {
    cargar: cargarConfiguracionGlobal
  };

  window.FIELD_TRIAL_SETTINGS_READY =
    cargarConfiguracionGlobal().catch(error => {
      console.error(
        "No fue posible cargar la configuración global:",
        error
      );

      return null;
    });
})();
