self.addEventListener(
    "push",
    event => {

        let data = {

            title:
                "Minecraft Server",

            body:
                "Ein Server ist online."

        };


        try {

            if (event.data) {

                data =
                    event.data.json();

            }

        } catch (error) {

            console.error(error);

        }


        event.waitUntil(

            self.registration
                .showNotification(
                    data.title,
                    {
                        body:
                            data.body,

                        tag:
                            data.serverId ||
                            "minecraft-server",

                        renotify:
                            true
                    }
                )

        );

    }
);


self.addEventListener(
    "notificationclick",
    event => {

        event.notification.close();


        event.waitUntil(

            clients.matchAll({
                type: "window",
                includeUncontrolled: true
            }).then(
                windows => {

                    for (
                        const window of windows
                    ) {

                        if (
                            "focus" in window
                        ) {

                            return window.focus();

                        }

                    }


                    return clients.openWindow(
                        "./"
                    );

                }
            )

        );

    }
);
