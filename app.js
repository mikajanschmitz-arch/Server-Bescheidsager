const API_URL =
    "https://minecraft-monitor.mikajan-schmitz.workers.dev";


let clientId =
    localStorage.getItem("minecraftMonitorClientId");


if (!clientId) {

    clientId =
        crypto.randomUUID();

    localStorage.setItem(
        "minecraftMonitorClientId",
        clientId
    );
}


let servers = [];


// ===============================
// SERVER LADEN
// ===============================

async function loadConfig() {

    try {

        const response =
            await fetch(
                `${API_URL}/api/config/${clientId}`
            );


        if (!response.ok) {

            throw new Error(
                "Konfiguration konnte nicht geladen werden."
            );

        }


        const data =
            await response.json();


        servers =
            data.servers || [];


        renderServers();


    } catch (error) {

        showMessage(
            "Fehler: " + error.message
        );

    }

}


// ===============================
// SERVER ANZEIGEN
// ===============================

function renderServers() {

    const container =
        document.getElementById("servers");


    container.innerHTML = "";


    if (servers.length === 0) {

        container.innerHTML =
            "<p>Noch keine Server hinzugefügt.</p>";

        return;

    }


    servers.forEach(
        (server, index) => {

            const div =
                document.createElement("div");


            div.className =
                "server";


            div.innerHTML = `

                <div class="server-info">

                    <div class="server-name">

                        ${escapeHtml(server.name)}

                    </div>

                </div>


                <input
                    type="checkbox"
                    ${server.enabled ? "checked" : ""}
                    onchange="toggleServer(${index})"
                >


                <button
                    class="danger"
                    onclick="deleteServer(${index})"
                >

                    Löschen

                </button>

            `;


            container.appendChild(div);

        }
    );

}


// ===============================
// SERVER SPEICHERN
// ===============================

async function saveServers() {

    try {

        const response =
            await fetch(
                `${API_URL}/api/config/${clientId}`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            servers: servers
                        })
                }
            );


        if (!response.ok) {

            throw new Error(
                "Server konnten nicht gespeichert werden."
            );

        }


        showMessage(
            "Gespeichert."
        );


    } catch (error) {

        showMessage(
            "Fehler beim Speichern."
        );

    }

}


// ===============================
// SERVER HINZUFÜGEN
// ===============================

async function addServer() {

    const name =
        document
            .getElementById("serverName")
            .value
            .trim();


    const host =
        document
            .getElementById("serverHost")
            .value
            .trim();


    const port =
        Number(
            document
                .getElementById("serverPort")
                .value
        );


    if (!name || !host || !port) {

        showMessage(
            "Bitte alle Felder ausfüllen."
        );

        return;

    }


    if (
        port < 1 ||
        port > 65535
    ) {

        showMessage(
            "Ungültiger Port."
        );

        return;

    }


    servers.push({

        id:
            crypto.randomUUID(),

        name:
            name,

        host:
            host,

        port:
            port,

        enabled:
            true

    });


    await saveServers();


    document
        .getElementById("serverName")
        .value = "";


    document
        .getElementById("serverHost")
        .value = "";


    document
        .getElementById("serverPort")
        .value = "";


    renderServers();

}


// ===============================
// SERVER AKTIVIEREN / DEAKTIVIEREN
// ===============================

async function toggleServer(index) {

    servers[index].enabled =
        !servers[index].enabled;


    await saveServers();

}


// ===============================
// SERVER LÖSCHEN
// ===============================

async function deleteServer(index) {

    if (
        !confirm(
            "Diesen Server wirklich löschen?"
        )
    ) {

        return;

    }


    servers.splice(
        index,
        1
    );


    await saveServers();


    renderServers();

}


// ===============================
// BENACHRICHTIGUNGEN AKTIVIEREN
// ===============================

async function enableNotifications() {

    try {

        if (
            !("serviceWorker" in navigator)
        ) {

            throw new Error(
                "Dieser Browser unterstützt keine Service Worker."
            );

        }


        if (
            !("PushManager" in window)
        ) {

            throw new Error(
                "Dieser Browser unterstützt Web Push nicht."
            );

        }


        const permission =
            await Notification.requestPermission();


        if (
            permission !== "granted"
        ) {

            throw new Error(
                "Benachrichtigungen wurden nicht erlaubt."
            );

        }


        const registration =
            await navigator.serviceWorker.register(
                "sw.js"
            );


        const publicKey =
            await getPublicVapidKey();


        let subscription =
            await registration
                .pushManager
                .getSubscription();


        if (!subscription) {

            subscription =
                await registration
                    .pushManager
                    .subscribe({

                        userVisibleOnly:
                            true,

                        applicationServerKey:
                            urlBase64ToUint8Array(
                                publicKey
                            )

                    });

        }


        const response =
            await fetch(
                `${API_URL}/api/subscription/${clientId}`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            subscription
                        )
                }
            );


        if (!response.ok) {

            throw new Error(
                "Benachrichtigung konnte nicht registriert werden."
            );

        }


        showMessage(
            "Benachrichtigungen sind aktiviert."
        );


        document
            .getElementById(
                "notificationButton"
            )
            .style.display =
                "none";


    } catch (error) {

        console.error(error);


        showMessage(
            "Fehler: " +
            error.message
        );

    }

}


// ===============================
// PUBLIC VAPID KEY LADEN
// ===============================

async function getPublicVapidKey() {

    const response =
        await fetch(
            `${API_URL}/api/public-key`
        );


    if (!response.ok) {

        throw new Error(
            "VAPID-Key konnte nicht geladen werden."
        );

    }


    const data =
        await response.json();


    return data.publicKey;

}


// ===============================
// VAPID KEY UMFORMEN
// ===============================

function urlBase64ToUint8Array(
    base64String
) {

    const padding =
        "=".repeat(
            (
                4 -
                base64String.length % 4
            ) % 4
        );


    const base64 =
        (
            base64String +
            padding
        )
        .replace(/-/g, "+")
        .replace(/_/g, "/");


    const rawData =
        window.atob(base64);


    return Uint8Array.from(
        [...rawData].map(
            char =>
                char.charCodeAt(0)
        )
    );

}


// ===============================
// HTML SICHER DARSTELLEN
// ===============================

function escapeHtml(text) {

    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// ===============================
// MELDUNGEN
// ===============================

function showMessage(message) {

    document
        .getElementById("message")
        .textContent =
            message;

}


// ===============================
// START
// ===============================

loadConfig();
