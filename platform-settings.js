window.PlatformSettings = {

  isEnabled(settingName) {

    return localStorage.getItem(settingName)
      === "true";

  }

};
