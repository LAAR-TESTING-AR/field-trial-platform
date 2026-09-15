window.FIELD_TRIAL_SETTINGS = {
  trialVisits: true,
  trialPhotos: true,
  visitComments: true,
  visitScore: true,
  cropStage: true,
  timeline: true
};

const FLOW_SETTINGS_URL =
  "PEGAR_AQUI_URL_DE_Obtener_Platform_Settings";

fetch(
  FLOW_SETTINGS_URL,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  }
)
  .then(response => response.json())
  .then(settings => {

    window.FIELD_TRIAL_SETTINGS =
      settings;

    console.log(
      "Global Settings loaded",
      settings
    );

  })
  .catch(error => {

    console.error(
      "Unable to load settings",
      error
    );

  });
