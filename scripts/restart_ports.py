import os
import signal
import socket
import subprocess
import sys
import time
import urllib.request

try:
    import psutil
except Exception:
    print("psutil is required. Install with: pip install psutil")
    sys.exit(1)

APP_PORTS = {3000, 4002}
HEALTH_URLS = {
    3000: "http://127.0.0.1:3000",
    4002: "http://127.0.0.1:4002/api/health",
}


def pids_on_ports(ports):
    result = {}
    for conn in psutil.net_connections(kind="inet"):
        if conn.laddr and conn.status == psutil.CONN_LISTEN and conn.laddr.port in ports and conn.pid:
            result.setdefault(conn.laddr.port, set()).add(conn.pid)
    return result


def kill_pid(pid):
    try:
        p = psutil.Process(pid)
        p.terminate()
        p.wait(timeout=3)
        return True
    except Exception:
        try:
            os.kill(pid, signal.SIGKILL)
            return True
        except Exception:
            return False


def port_is_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.3)
        return s.connect_ex(("127.0.0.1", port)) == 0


def http_ready(url):
    try:
        with urllib.request.urlopen(url, timeout=1.5) as response:
            return 200 <= response.status < 500
    except Exception:
        return False


def wait_until_ready(timeout=20.0):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if all(http_ready(url) for url in HEALTH_URLS.values()):
            return True
        time.sleep(0.5)
    return False


def start_detached(command):
    flags = 0
    if os.name == "nt":
        flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
    return subprocess.Popen(
        command,
        cwd=os.getcwd(),
        shell=True,
        creationflags=flags,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def main():
    found = pids_on_ports(APP_PORTS)
    for port, pids in sorted(found.items()):
        for pid in pids:
            kill_pid(pid)
            print(f"killed pid={pid} on port={port}")

    time.sleep(1.0)

    start_detached("npm run api")
    start_detached("npm run dev")
    wait_until_ready()

    state = {p: port_is_open(p) for p in sorted(APP_PORTS)}
    ready = {p: http_ready(url) for p, url in sorted(HEALTH_URLS.items())}
    print("port_state:", state)
    print("http_ready:", ready)


if __name__ == "__main__":
    main()
