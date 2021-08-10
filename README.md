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
## please modify `config.json` according to your env.

## test connection with chain
`yarn run connect`

## deploy contract and add service in contract and gateway.
`yarn run deploy`

## simulate user behavior. 
`python3 test_demo.py`

## submit user usage to the chain. 
`yarn run submit`

# Check result from chain

## 1. open `Developer->Contracts->Add an existing contract`

### a. `contract address` from `statsAddress` file.
### b. `contract ABI` from `target\services_statistics.contract`
![add an existing contract](https://github.com/Apron-Network/apron-deployer/blob/master/images/add_an_existing_contract.png)

## 2. run `queryServiceByUuid` 
### a. `uuid` from `serviceid` file.
![call a contract](https://github.com/Apron-Network/apron-deployer/blob/master/images/call_a_contract.png)

# run webserver
```bash
yarn run webserver
```

## register gateway service
```bash
curl --location --request POST 'http://localhost:4000/service' \
--header 'Content-Type: application/json' \
--data-raw '{
    "id" : "m1-alice_apron_network:8080",
    "domain_name": "m1-alice_apron_network",
    "providers": [
        {
            "id" : "test_provider1",
            "name": "test_provider1 http provider1",
            "desc": "test http provider1 desc",
            "base_url": "http://httpbin/anything",
            "schema": "http",
            "service_price_plan": "[{\"name\":\"Free\",\"type\":\"post-paid\",\"price\":0,\"unit\":\"APN\",\"desc\":\"to be continue\"}]"
        }

    ]
}'
```
