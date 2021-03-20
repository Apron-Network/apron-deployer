#!/usr/bin/env python3

# This script is used for demo apron usage, the script contains those features
# 1. List all services and users from gateway
# 2. Create new user key if new service or users fetched
# 3. Invoke ALL services with ALL userkeys

import requests
import os
import json
import time
import typing
import logging


class ApronHackathonDemo(object):
    def __init__(self, admin_url: str, proxy_url: str):
        self.admin_url = admin_url
        self.proxy_url = proxy_url
        self.services = set()
        self.users = set(["5FcD6TAfQGZNwkaPTN1n1KYcNgqkTaQP9keGHQTbJRjLWjrb"])

        self.proxy_base_set = set()

        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.setLevel(logging.INFO)

    def run(self):
        new_services = self.update_service()

        if new_services:
            self.logger.warning(f"New services: {new_services}")

        for s in new_services:
            for u in self.users:
                k = self.create_userkey(s, u)
                self.logger.info(f'Created user key {k} for service: {s}, user: {u}')

        for base_url in self.proxy_base_set:
            r = requests.get(f'{base_url}/anything/{time.time()}')
            self.logger.info('-' * 20)
            self.logger.info(r.json())
            time.sleep(0.5)

    def update_service(self) -> typing.Iterable:
        url = f'{self.admin_url}/service/'
        r = requests.get(url)

        new_service_added = set()
        for service in r.json():
            service_id = service['id']
            if service_id not in self.services:
                self.services.add(service_id)
                new_service_added.add(service_id)

        return new_service_added

    def create_userkey(self, service_id: str, user_id: str) -> str:
        url = f'{self.admin_url}/service/{service_id}/keys'
        params = {'account_id': user_id}
        r = requests.post(url, json=params)
        rslt = r.json()
        new_key = rslt['key']
        self.proxy_base_set.add(f'{self.proxy_url}/v1/{service_id}/{new_key}')
        return new_key


if __name__ == '__main__':
    api_url = 'http://localhost:8082'
    proxy_url = 'http://localhost:8080'

    config_file = "./config.json"
    if os.path.isfile(config_file):
        with open(config_file, 'rb') as f:
            config = json.load(f)
            api_url = config["gateway_api_endpoint"]
            proxy_url = config["gateway_proxy_endpoint"]

    demo = ApronHackathonDemo(admin_url=api_url, proxy_url=proxy_url)
    while True:
        demo.run()
        time.sleep(1)
