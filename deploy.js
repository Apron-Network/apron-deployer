// Required imports
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { CodePromise, ContractPromise } from '@polkadot/api-contract';
import { readFileSync, writeFileSync } from 'fs';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { time } from 'console';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';


const market = './target/services_market.contract';
const stats = './target/services_statistics.contract';

const config = JSON.parse(readFileSync('./config.json').toString());
const ws_endpoint = config.ws_endpoint;
const gateway_endpoint = config.gateway_api_endpoint;

console.log(ws_endpoint);
console.log(gateway_endpoint);

async function main() {

    await cryptoWaitReady(); // wait for crypto initializing

    const keyring = new Keyring({ type: 'sr25519' });
    let alicePair = keyring.createFromUri('//Alice');
    let bobPair = keyring.createFromUri('//Bob');

    const provider = new WsProvider(ws_endpoint);
    const api = await ApiPromise.create({ provider: provider, types: { "Address": "AccountId", "LookupSource": "AccountId" } });

    // Retrieve the chain & node information information via rpc calls
    const [chain, nodeName, nodeVersion] = await Promise.all([
        api.rpc.system.chain(),
        api.rpc.system.name(),
        api.rpc.system.version()
    ]);

    console.log(`You are connected to chain ${chain} using ${nodeName} v${nodeVersion}`);


    // Init
    const service_id = uuidv4();
    writeFileSync('serviceid', service_id);


    let wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const endowment = 1000000000000000n * 100n;
    const gasLimit = 100000n * 1000000n;

    let marketBluePrint, statsBluePrint;
    let marketContract, statsContract;

    // deploy market contract
    {
        const content = readFileSync(market).toString();
        const marketAbi = JSON.parse(content);

        let nonce = await api.rpc.system.accountNextIndex(alicePair.address);
        console.log("======= begin to upload market contrace code");
        const code = new CodePromise(api, marketAbi, marketAbi.wasm);
        const unsub1 = await code
            .createBlueprint().signAndSend(alicePair, { nonce: nonce }, (result) => {
                if (result.status.isInBlock || result.status.isFinalized) {
                    marketBluePrint = result.blueprint;
                    console.log('~~~inblock', result.toHuman());
                    unsub1();
                } else {
                    console.log('result~~~', result.toHuman());
                }
            });

        await wait(5000);

        nonce = await api.rpc.system.accountNextIndex(alicePair.address);
        console.log("========= begin to deploy market contract");
        const unsub2 = await marketBluePrint.tx
            .new(endowment, gasLimit, alicePair.address)
            .signAndSend(alicePair, { nonce: nonce }, (result) => {
                if (result.status.isInBlock || result.status.isFinalized) {
                    // here we have an additional field in the result, containing the contract
                    marketContract = result.contract;
                    console.log("market contract : ", result);
                    console.log("market contract address is : ", marketContract.address.toString());
                    writeFileSync('./marketAddress', marketContract.address.toString());
                    unsub2();
                }
            });

        await wait(5000);

        const service_name = 'service_test_' + service_id;
        const service_desc = 'service desc';
        const service_logo = 'https://www.extremetech.com/wp-content/uploads/2014/01/Bitcoin-from-Wikipedia.jpg';
        const service_create_time = Date.now();
        const service_provider_name = 'My Dear Alice';
        const service_provider_account = alicePair.address;
        const service_usage = 'here is the instruction of how to use this service.';
        const service_price_plan = '$1 per 100000 calls';
        const service_declaimer = 'This is the declaimer of this service! It\'s your own responsibility to use this service!';

        // Add service to Gate Way.
        console.log("========= begin to add service %s to gateway", service_id);
        var raw = {
            name : service_id,
            base_url : "httpbin/",
            schema : "http"
        }
        console.log(JSON.stringify(raw));
        var requestOptions = {
            method: 'POST',
            body: JSON.stringify(raw),
            redirect: 'follow'
        };
        fetch(gateway_endpoint+"/service/", requestOptions)
        .then(response => response.text())
        .then(result => console.log("result is: %s", result))
        .catch(error => console.log('error', error));

        nonce = await api.rpc.system.accountNextIndex(alicePair.address);
        console.log("========= begin to add service to service market");
        const mm = new ContractPromise(api, marketAbi, marketContract.address);
        const unsub = await mm.tx
            .addService({ value: 0, gasLimit: gasLimit }
                , service_id
                , service_name
                , service_desc
                , service_logo
                , service_create_time
                , service_provider_name
                , service_provider_account
                , service_usage
                , service_price_plan
                , service_declaimer)
            .signAndSend(alicePair, { nonce: nonce }, (result) => {
                if (result.status.isInBlock || result.status.isFinalized) {
                    console.log("result is: ", result);
                    unsub();
                }
            });

        await wait(5000);

        /*
        const unsub3 = await marketContract.tx
            .addService({ value: 0, gasLimit: gasLimit }
                , service_id
                , service_name
                , service_desc
                , service_logo
                , service_create_time
                , service_provider_name
                , service_provider_account
                , service_usage
                , service_price_plan
                , service_declaimer)
            .signAndSend(alicePair, (result) => {
                if (result.status.isInBlock || result.status.isFinalized) {
                    console.log("result is: ", result.status);
                    unsub3();
                }
            });
            
        await wait(10000);
        */
    }


    // deploy stats contract
    {
        const content = readFileSync(stats).toString();
        const statsAbi = JSON.parse(content);

        let nonce = await api.rpc.system.accountNextIndex(alicePair.address);
        console.log("======= begin to upload stats contract code");
        const code = new CodePromise(api, statsAbi, statsAbi.wasm);
        const unsub = await code
            .createBlueprint().signAndSend(alicePair, { nonce: nonce }, (result) => {
                if (result.status.isInBlock || result.status.isFinalized) {
                    statsBluePrint = result.blueprint;
                    console.log('~~~inblock', result.toHuman());
                    unsub();
                } else {
                    console.log('result~~~', result.toHuman());
                }
            });

        await wait(10000);

        nonce = await api.rpc.system.accountNextIndex(alicePair.address);
        console.log("========= begin to deploy stats contract");
        const unsub2 = await statsBluePrint.tx
            .new(endowment, gasLimit, alicePair.address, marketContract.address)
            .signAndSend(alicePair, { nonce: nonce }, (result) => {
                if (result.status.isInBlock || result.status.isFinalized) {

                    if (!!result.dispatchError) {
                        console.log('isBadOrigin is ', result.dispatchError.isBadOrigin);
                        console.log('isOther is ', result.dispatchError.isOther);
                        console.log('isModule is ', result.dispatchError.isModule);
                    }

                    statsContract = result.contract;
                    console.log("stats contract address is: ", statsContract.address.toString());
                    writeFileSync('./statsAddress', statsContract.address.toString());
                    unsub2();
                }
            });

        await wait(5000);
    }

    // console.log("======== begin to query");
    // {
    //     const { gasConsumed, result, outcome } = await contract.query.name(alicePair.address, { value: 0, gasLimit: gasLimit });

    //     console.log("query result", result.toHuman());
    //     console.log("gas consumed", gasConsumed.toHuman());

    //     if (result.isOk) {
    //         console.log('Success', outcome);
    //     } else {
    //         console.error('Error', result.asErr);
    //     }
    //     await wait(1000);
    // }

    console.log("The End!!!");
}

main().catch(console.error).finally(() => process.exit());