import sys
import traceback
sys.path.insert(0, '/home/nikshaan/indianext/PRRN_IndiaNext/backend/sentinel_behavior')
try:
    import main as sentinel_api
    from fastapi.testclient import TestClient
    client = TestClient(sentinel_api.app)
    with client:
        res = client.get('/health')
        print('HEALTH:', res.status_code, res.json())
        scenarios = client.get('/demo-scenarios').json()
        for s in scenarios:
            sid = s['scenario_id']
            r = client.post(f'/demo/{sid}')
            print(f'{sid}:', r.status_code)
            if r.status_code != 200:
                print(r.text)
except Exception as e:
    traceback.print_exc()
