window.FIELD_TRIAL_FEATURES = {
  VISITS: localStorage.getItem("trialVisits") === "true",
  ACCESS_PHOTOS: true,
  ACCESS_HISTORY: true,
  COORDINATE_UPDATE: true
};

window.addEventListener(
  "fieldtrial:settings-loaded",
  event => {
    const settings = event.detail || {};

    window.FIELD_TRIAL_FEATURES.VISITS =
      settings.trialVisits === true;

    window.dispatchEvent(
      new CustomEvent(
        "fieldtrial:features-updated",
        {
          detail:
            window.FIELD_TRIAL_FEATURES
        }
      )
    );
  }
);
``
