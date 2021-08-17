#!/bin/bash

cd /app

sleep 3
echo "Deploy the contracts"
yarn run deploy

sleep 5
yarn run webserver --config /app/config2.json
