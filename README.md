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
`node index.js`

## deploy contract and add service in contract and gateway.
`node deploy.js`

## simulate user behavior. 
`python3 test_demo.py`

## submit user usage to the chain. 
`node submit.js`

# Check result from chain

## 1. open `Developer->Contracts->Add an existing contract`

### a. `contract address` from `statsAddress` file.
### b. `contract ABI` from `target\services_statistics.contract`
![add an existing contract](https://github.com/Apron-Network/apron-deployer/blob/master/images/add_an_existing_contract.png)

## 2. run `queryServiceByUuid` 
### a. `uuid` from `serviceid` file.
![call a contract](https://github.com/Apron-Network/apron-deployer/blob/master/images/call_a_contract.png)


