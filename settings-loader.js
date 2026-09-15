window.FIELD_TRIAL_SETTINGS = {
  trialVisits: true,
  trialPhotos: true,
  visitComments: true,
  visitScore: true,
  cropStage: true,
  timeline: true
};

fetch("settings.json?v=" + Date.now())
  .then(response => response.json())
  .then(settings => {

    window.FIELD_TRIAL_SETTINGS = settings;

    console.log(
      "Global Settings loaded",
      settings
    );

  })
  .catch(error => {

    console.error(
      "Unable to load settings.json",
      error
    );

  });
