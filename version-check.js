async function checkAppVersion() {

    try {

        const response = await fetch(
            "version.json?ts=" + Date.now(),
            {
                cache: "no-store"
            }
        );

        if (!response.ok) return;

        const data = await response.json();

        const latestVersion =
            data.version;

        if (
            latestVersion !==
            window.APP_VERSION
        ) {

            alert(
                "Nueva versión disponible.\n\n" +
                "Actual: " +
                window.APP_VERSION +
                "\n" +
                "Disponible: " +
                latestVersion
            );

        }

    } catch (error) {

        console.log(
            "No fue posible validar la versión"
        );

    }

}
