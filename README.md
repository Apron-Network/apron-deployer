# apron-deployer
Deployer Demo for substrate smart contracts

# Prerequisites

```
$ node -v
v12.21.0
$ yarn -v
1.22.5
```

# Build

1. Run `yarn` to install all dependencies.

# Run
please modify `config.json` according to your env.
```json
{
    "listen_port": 4000,
    "ws_endpoint" : "ws://47.242.250.114:9944",
    "gateway_api_endpoint" : "http://m1-alice.apron.network:8082",
    "gateway_proxy_endpoint" : "http://47.242.250.114:8080",
}
```

## test connection with chain
`yarn run connect`

## deploy contract and add service in contract and gateway.
`yarn run deploy`

## simulate user behavior. 
`python3 test_demo.py`

## submit user usage to the chain. 
`yarn run submit`

# Check result from chain

1. open `Developer->Contracts->Add an existing contract`
    1. `contract address` from `statsAddress` file.
    2. `contract ABI` from `target\services_statistics.contract`
![add an existing contract](https://github.com/Apron-Network/apron-deployer/blob/master/images/add_an_existing_contract.png)
/sc 
2. run `queryServiceByUuid` 
    1. `uuid` from `serviceid` file.
![call a contract](https://github.com/Apron-Network/apron-deployer/blob/master/images/call_a_contract.png)

# run webserver
```bash
yarn run webserver
```

## register gateway service
```bash
curl --location --request POST 'http://localhost:4001/service' \
--header 'Content-Type: application/json' \
--data-raw '{
    "id" : "m1-alice_apron_network:8080",
    "domain_name": "m1-alice.apron.network",
    "name": "Httpbin",
	"desc": "httpbin service for testing purpose.",
	"logo": "https://via.placeholder.com/150?text=httpbin",
	"usage": "Just run the command `curl http://m1-alice.apron.network:8080`. More information please refer the official documents.",
    "providers": [
        {
            "id" : "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
            "name": "Alice",
            "desc": "Httpbin service for testing",
            "base_url": "https://httpbin.org/anything",
            "schema": "http"
        }
    ]
}'
```

# run another webserver
```bash
yarn run webserver --config ./config2.js
```

## register gateway service
```bash
curl --location --request POST 'http://localhost:4000/service' \
--header 'Content-Type: application/json' \
--data-raw '{
    "id" : "m1-bob_apron_network:8080",
    "domain_name": "m1-bob_apron_network",
    "name": "Httpbin",
	"desc": "httpbin service for testing purpose.",
	"logo": "https://via.placeholder.com/150?text=httpbin",
	"usage": "Just run the command `curl http://m1-bob.apron.network:8080`. More information please refer the official documents.",
    "providers": [
        {
            "id" : "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
            "name": "Alice",
            "desc": "Httpbin service for testing",
            "base_url": "https://httpbin.org/anything",
            "schema": "http"
        }
    ]
}'
```

# query contract
you can run query contract by exec `node contract_query.js`.