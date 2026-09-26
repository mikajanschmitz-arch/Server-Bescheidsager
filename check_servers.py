import json
import os
import requests

from pywebpush import webpush


BACKEND_URL = os.environ["BACKEND_URL"].rstrip("/")
BACKEND_SECRET = os.environ["BACKEND_SECRET"]
VAPID_PRIVATE_KEY = os.environ["VAPID_PRIVATE_KEY"]

STATE_FILE = "state.json"


def load_state():
    if not os.path.exists(STATE_FILE):
        return {}

    with open(STATE_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


def save_state(state):
    with open(STATE_FILE, "w", encoding="utf-8") as file:
        json.dump(state, file, indent=2)


def get_configs():
    response = requests.get(
        f"{BACKEND_URL}/internal/configs",
        headers={
            "Authorization": f"Bearer {BACKEND_SECRET}"
        },
        timeout=20
    )

    response.raise_for_status()

    return response.json()


def check_server(host, port):
    address = f"{host}:{port}"

    url = (
        "https://api.mcstatus.io/v2/"
        f"status/bedrock/{address}"
    )

    try:
        response = requests.get(
            url,
            timeout=15
        )

        if response.status_code != 200:
            return False, 0

        data = response.json()

        online = bool(
            data.get("online", False)
        )

        players = data.get(
            "players",
            {}
        )

        player_count = players.get(
            "online",
            0
        )

        return online, player_count

    except Exception as error:
        print(
            f"Fehler bei {address}: {error}"
        )

        return False, 0


def send_push(subscription, server, players):

    if players == 1:
        player_text = "1 Spieler ist online."
    else:
        player_text = f"{players} Spieler sind online."

    payload = json.dumps({
        "title":
            f"🟢 {server['name']} ist online!",

        "body":
            player_text,

        "serverId":
            server["id"]
    })

    webpush(
        subscription_info=subscription,
        data=payload,
        vapid_private_key=VAPID_PRIVATE_KEY,
        vapid_claims={
            "sub": "mailto:you@example.com"
        },
        ttl=3600
    )


def main():

    configs = get_configs()
    state = load_state()

    servers = {}

    for config in configs:

        for server in config.get(
            "servers",
            []
        ):

            if not server.get(
                "enabled",
                False
            ):
                continue

            server_key = (
                f"{server['host']}:"
                f"{server['port']}"
            )

            if server_key not in servers:

                servers[server_key] = {
                    "server": server,
                    "users": []
                }

            servers[
                server_key
            ]["users"].append(config)


    for server_key, info in servers.items():

        server = info["server"]

        online, players = check_server(
            server["host"],
            server["port"]
        )

        previous = state.get(
            server_key,
            False
        )

        print(
            f"{server['name']}: "
            f"online={online}, "
            f"players={players}"
        )


        # Nur bei OFFLINE -> ONLINE benachrichtigen

        if online and not previous:

            for config in info["users"]:

                try:

                    send_push(
                        config["subscription"],
                        server,
                        players
                    )

                except Exception as error:

                    print(
                        f"Push-Fehler: {error}"
                    )


        state[server_key] = online


    save_state(state)


if __name__ == "__main__":
    main()
