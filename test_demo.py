import json
import time
import typing
import os
import uuid

import requests


api_url = 'http://localhost:8082'
proxy_url = 'http://localhost:8080'

config_file = "./config.json"
if os.path.isfile(config_file):
    with open(config_file, 'rb') as f:
        config = json.load(f)
        api_url = config["gateway_api_endpoint"]
        proxy_url = config["gateway_proxy_endpoint"]


def create_service(service_id, service_name: str, base_url: str, schema: str):
    url = f'{api_url}/service/'
    payload = {
        'id': service_id,
        'name': service_name,
        'base_url': base_url,
        'schema': schema,
        'desc': 'service desc',
        'logo': 'https://via.placeholder.com/150?text=Apron',
        'create_time': int(time.time()),
        'service_provider_name': 'sp',
        'service_provider_account': 'sp_account',
        'service_usage': 'usage',
        'service_price_plan': 'price',
        'service_declaimer': 'declaimer',
    }
    r = requests.post(url, json=payload)
    assert r.status_code == 201


def create_key(service_id: str) -> str:
    url = f'{api_url}/service/{service_id}/keys/'
    r = requests.post(url, json={'account_id': 'foobar'})
    assert r.status_code == 200

    rslt = r.json()
    # assert rslt['serviceId'] == service_id
    return rslt['key']


def send_request(service_id: str, user_key: str, payload: typing.Dict):
    url = f'{proxy_url}/v1/{service_id}/{user_key}/anything/aaa'
    r = requests.post(url, json=payload)
    assert r.status_code == 200
    print(json.dumps(r.json(), indent=2))


def fetch_usage_report():
    url = f'{api_url}/service/report/'
    r = requests.get(url)
    print(r.content)
    assert r.status_code == 200
    print(json.dumps(r.json(), indent=2))


if __name__ == '__main__':
    service_id = uuid.uuid4().hex

    service_name = ""
    with open("./serviceid",'r') as f:
        service_id = f.readline()
    print(service_id)
    base_url = 'httpbin/'
    schema = 'http'
    # create_service(service_id, service_name, base_url, schema)
    k = create_key(service_id)

    for _ in range(3):
        print('-' * 20)
        send_request(service_id, k, {'now': time.time()})
        time.sleep(1)

    print('+' * 20)
    fetch_usage_report()
