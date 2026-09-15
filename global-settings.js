(function () {
  "use strict";

  const FLOW_GET_SETTINGS_URL =
    "https://default3e20ecb29cb04df1ad7b914e31dcdd.a4.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/3aac217eb2fc4adb8749f532f8c625ab/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=M6d0M-i3RnOlkq1uZP5vAzgxBXM_8O8BCJeUjQNHdF4";

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
