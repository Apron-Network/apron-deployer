import json
import time
import typing
import os

import requests


api_url = 'http://localhost:8082'
proxy_url = 'http://localhost:8080'

config_file = "./config.json"
if os.path.isfile(config_file):
    with open(config_file, 'rb') as f:
        config = json.load(f)
        api_url = config["gateway_api_endpoint"]
        proxy_url = config["gateway_proxy_endpoint"]


def create_service(service_name: str, base_url: str, schema: str):
    url = f'{api_url}/service/'
    payload = {
        'name': service_name,
        'base_url': base_url,
        'schema': schema,
    }
    r = requests.post(url, json=payload)
    assert r.status_code == 201


def create_key(service_name: str) -> str:
    url = f'{api_url}/service/{service_name}/keys/'
    r = requests.post(url)
    assert r.status_code == 200

    rslt = r.json()
    assert rslt['serviceName'] == service_name
    return rslt['key']


def send_request(service_name: str, user_key: str, payload: typing.Dict):
    url = f'{proxy_url}/v1/{service_name}/{user_key}/anything/aaa'
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

    service_name = ""
    with open("./serviceid",'r') as f:
        service_name = f.readline()
    print(service_name)
    base_url = 'httpbin/'
    schema = 'http'
    # create_service(service_name, base_url, schema)
    k = create_key(service_name)

    for _ in range(3):
        print('-' * 20)
        send_request(service_name, k, {'now': time.time()})
        time.sleep(1)

    print('+' * 20)
    fetch_usage_report()
