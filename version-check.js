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

    if (
        document.getElementById(
            "versionUpdateBanner"
        )
    ) {
        return;
    }

    const banner =
        document.createElement(
            "div"
        );

    banner.id =
        "versionUpdateBanner";

    banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 99999;
        background: #f59e0b;
        color: white;
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,.2);
    `;

    banner.innerHTML = `
        <div>
            ⚡ Nueva versión disponible:
            ${latestVersion}
        </div>

        <div>
            <button
                id="updateAppNow"
                style="
                    background:white;
                    color:#b45309;
                    border:none;
                    border-radius:6px;
                    padding:6px 12px;
                    cursor:pointer;
                    margin-right:8px;
                    font-weight:bold;
                ">
                Actualizar
            </button>

            <button
                id="hideVersionBanner"
                style="
                    background:transparent;
                    border:1px solid white;
                    color:white;
                    border-radius:6px;
                    padding:6px 12px;
                    cursor:pointer;
                ">
                Ocultar
            </button>
        </div>
    `;

    document.body.appendChild(
        banner
    );

    document
        .getElementById(
            "hideVersionBanner"
        )
        .addEventListener(
            "click",
            () => banner.remove()
        );

    document
        .getElementById(
            "updateAppNow"
        )
        .addEventListener(
            "click",
            async () => {

                try {

                    if (
                        "serviceWorker" in navigator
                    ) {

                        const regs =
                            await navigator.serviceWorker.getRegistrations();

                        for (
                            const reg
                            of regs
                        ) {

                            await reg.update();

                        }

                    }

                } catch (e) {

                    console.error(e);

                }

                window.location.reload();

            }
        );

}

    } catch (error) {

        console.log(
            "No fue posible validar la versión"
        );

    }

}
