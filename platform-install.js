let deferredPrompt = null;

const pwaInstalada =
  window.matchMedia(
    "(display-mode: standalone)"
  ).matches ||
  window.navigator.standalone === true;
const installBtn =
  document.getElementById(
    "installAppBtn"
  );
if (
  installBtn &&
  pwaInstalada
) {
  installBtn.style.display = "none";
}
window.addEventListener(
  "beforeinstallprompt",
  event => {

    event.preventDefault();

    deferredPrompt = event;

    if (installBtn) {
      installBtn.style.display =
        "inline-block";
    }

  }
);

if (installBtn) {

  installBtn.addEventListener(
    "click",
    async () => {

      const esIOS =
        /iphone|ipad|ipod/i.test(
          navigator.userAgent
        );

      if (esIOS) {

        alert(
          "En iPhone:\n\n1. Presioná Compartir\n2. Agregar a pantalla de inicio"
        );

        return;

      }

      if (!deferredPrompt) {

        alert(
          "La aplicación ya está instalada o este dispositivo no admite instalación PWA."
        );

        return;

      }

      deferredPrompt.prompt();

      await deferredPrompt.userChoice;

      deferredPrompt = null;

    }
  );

}
