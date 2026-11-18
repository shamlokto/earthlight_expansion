#!/usr/bin/env python3
"""Start a sandbox GPU pod and arm its self-destruct before anything else happens.

    python3 launch.py --hours 3 [--idle 15] [--gpu "NVIDIA L40S" ...] [--volume 100]

1. Creates the pod (Runpod GraphQL API). Its name carries its deadline: sandbox-u<unix time>.
2. Waits for the pod's Jupyter server (about a minute) and immediately starts sandbox.sh ON THE POD.
   From then on the pod deletes ITSELF after --idle quiet minutes or at the --hours hard stop, using
   the key Runpod gives every pod (tested 2026-11-18). Nothing here depends on Claude, this machine,
   a session or anyone's usage credit: the watchdog is a plain process on the pod.
3. Backstop: .github/workflows/sandbox-reaper.yml runs on GitHub every 15 minutes and deletes any
   pod named sandbox-u<time> whose time has passed (needs the RUNPOD_API_KEY repository secret).
(Runpod's ComfyUI image appends any start command to its own /start.sh, so a boot-time timer in the
start command does not work there; that is why the watchdog is armed through Jupyter.)

Uses Runpod's GraphQL API (https://api.runpod.io/graphql). The API key comes from RUNPOD_API_KEY or,
in the Claude cloud sandbox, is added by the network proxy (any placeholder value works there).
Prints the pod id and the Jupyter password on success.
"""
import argparse, json, os, secrets, sys, time, urllib.request

API = 'https://api.runpod.io/graphql'
UA = {'User-Agent': 'sandbox-launcher/1.0'}            # the pod proxy refuses Python's default user agent
IMAGE = 'runpod/comfyui:cuda12.8'          # its own start command is /start.sh (ComfyUI, Jupyter, FileBrowser)


def gql(query, variables=None):
    req = urllib.request.Request(API, data=json.dumps({'query': query, 'variables': variables or {}}).encode(),
                                 headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + os.environ.get('RUNPOD_API_KEY', 'proxy-injected')})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def arm(pod, pw, max_minutes, idle):
    """Upload sandbox.sh through the pod's Jupyter server and start it. Returns its first log line."""
    import base64, uuid, ssl
    base = f'https://{pod}-8888.proxy.runpod.net'
    for _ in range(80):                                    # wait for Jupyter (about a minute)
        try:
            with urllib.request.urlopen(urllib.request.Request(f'{base}/api/status?token={pw}', headers=UA), timeout=10) as r:
                if r.status == 200: break
        except Exception: pass
        time.sleep(5)
    else:
        return 'JUPYTER NEVER CAME UP: delete the pod by hand'
    import websocket                                       # pip install websocket-client
    script = base64.b64encode(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sandbox.sh'), 'rb').read()).decode()
    cmd = (f"mkdir -p /workspace/sandbox && cd /workspace/sandbox && echo {script} | base64 -d > sandbox.sh && "
           f"(MAX_MINUTES={max_minutes} IDLE_MINUTES={idle} nohup setsid bash ./sandbox.sh > sandbox.log 2>&1 < /dev/null &) ; sleep 3; head -1 sandbox.log")
    req = urllib.request.Request(f'{base}/api/kernels', data=b'{"name":"python3"}', method='POST', headers={'Authorization': 'token ' + pw, 'Content-Type': 'application/json', **UA})
    kid = None
    for _ in range(24):                                    # Jupyter can answer /api/status a little before kernels work
        try:
            with urllib.request.urlopen(urllib.request.Request(req.full_url, data=req.data, method='POST', headers=dict(req.header_items())), timeout=30) as r: kid = json.load(r)['id']; break
        except Exception: time.sleep(5)
    if not kid: return 'could not start a kernel'
    px = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy'); kw = {}
    if px:
        from urllib.parse import urlparse
        u = urlparse(px); kw = dict(http_proxy_host=u.hostname, http_proxy_port=u.port, proxy_type='http')
    ca = os.environ.get('SSL_CERT_FILE') or ('/root/.ccr/ca-bundle.crt' if os.path.exists('/root/.ccr/ca-bundle.crt') else None)
    ws = None
    for _ in range(20):                                    # the kernel's websocket can 404 for a short while after start-up
        try:
            ws = websocket.create_connection(f'wss://{pod}-8888.proxy.runpod.net/api/kernels/{kid}/channels?token={pw}', timeout=60, header=['User-Agent: sandbox-launcher/1.0'], sslopt={'ca_certs': ca} if ca else {}, **kw)
            break
        except Exception:
            time.sleep(6)
            try:                                           # start a fresh kernel in case that one died
                with urllib.request.urlopen(urllib.request.Request(req.full_url, data=req.data, method='POST', headers=dict(req.header_items())), timeout=30) as r: kid = json.load(r)['id']
            except Exception: pass
    if not ws: return 'could not reach a kernel'
    mid = uuid.uuid4().hex
    code = 'import subprocess\nprint(subprocess.run(%r, shell=True, capture_output=True, text=True, executable="/bin/bash").stdout)' % cmd
    ws.send(json.dumps({'header': {'msg_id': mid, 'username': 'x', 'session': uuid.uuid4().hex, 'msg_type': 'execute_request', 'version': '5.3'}, 'parent_header': {}, 'metadata': {},
                        'content': {'code': code, 'silent': False, 'store_history': False, 'user_expressions': {}, 'allow_stdin': False}, 'channel': 'shell'}))
    out = ''
    while True:
        m = json.loads(ws.recv())
        if m.get('parent_header', {}).get('msg_id') != mid: continue
        if m['msg_type'] == 'stream': out += m['content']['text']
        if m['msg_type'] == 'status' and m['content']['execution_state'] == 'idle': break
    ws.close()
    return out.strip() or 'no log line: check /workspace/sandbox/sandbox.log'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--hours', type=float, default=3, help='hard stop: the pod deletes itself after this many hours')
    ap.add_argument('--gpu', action='append', help='GPU type ids to try, in order')
    ap.add_argument('--idle', type=int, default=15, help='minutes of idleness before the pod deletes itself')
    ap.add_argument('--name', default='sandbox')
    ap.add_argument('--volume', type=int, default=100, help='pod volume at /workspace in GB (0 = none)')
    ap.add_argument('--disk', type=int, default=60, help='container disk in GB')
    ap.add_argument('--tries', type=int, default=4)
    a = ap.parse_args()
    gpus = a.gpu or ['NVIDIA L40S', 'NVIDIA RTX A6000', 'NVIDIA RTX 6000 Ada Generation']
    secs = max(60, int(a.hours * 3600))
    deadline = int(time.time()) + secs
    pw = secrets.token_urlsafe(12).replace('-', '').replace('_', '')
    q = '''mutation($i: PodFindAndDeployOnDemandInput!) { podFindAndDeployOnDemand(input: $i) { id costPerHr machine { gpuDisplayName } } }'''
    for t in range(a.tries):
        for g in gpus:
            inp = {'cloudType': 'SECURE', 'gpuCount': 1, 'gpuTypeId': g, 'name': f'{a.name}-u{deadline}', 'imageName': IMAGE,
                   'containerDiskInGb': a.disk, 'volumeInGb': a.volume, 'ports': '8188/http,8888/http,22/tcp',
                   'env': [{'key': 'JUPYTER_PASSWORD', 'value': pw}]}
            if a.volume: inp['volumeMountPath'] = '/workspace'
            r = gql(q, {'i': inp})
            p = (r.get('data') or {}).get('podFindAndDeployOnDemand')
            if p:
                info = {'id': p['id'], 'gpu': p['machine']['gpuDisplayName'], 'costPerHr': p['costPerHr'], 'jupyter_password': pw,
                        'hard_stop_utc': time.strftime('%H:%M', time.gmtime(deadline))}
                try: info['watchdog'] = arm(p['id'], pw, max(1, secs // 60), a.idle)
                except Exception as e: info['watchdog'] = 'ERROR ' + str(e)[:200]
                if 'watchdog started' not in info['watchdog']:          # fail safe: an unguarded pod is never left running
                    info['deleted'] = gql('mutation($id: String!) { podTerminate(input: { podId: $id }) }', {'id': p['id']})
                    print(json.dumps(info)); return 2
                print(json.dumps(info))
                return 0
            print(f'{g}: {(r.get("errors") or [{}])[0].get("message", r)}'[:160], file=sys.stderr)
            time.sleep(4)
    return 1


if __name__ == '__main__':
    sys.exit(main())
