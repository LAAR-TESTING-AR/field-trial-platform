window.PlatformSettings = {

  isEnabled(settingName) {
    return localStorage.getItem(settingName) === "true";
  },

  getAll() {
    return {
      trialPhotos: this.isEnabled("trialPhotos"),
      visitComments: this.isEnabled("visitComments"),
      visitScore: this.isEnabled("visitScore"),
      cropStage: this.isEnabled("cropStage"),
      timeline: this.isEnabled("timeline")
    };
  }

};
