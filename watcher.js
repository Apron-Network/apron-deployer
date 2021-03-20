// Required imports
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { CodePromise, ContractPromise } from '@polkadot/api-contract';
import { readFileSync, writeFileSync } from 'fs';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { time } from 'console';
import { v4 as uuidv4 } from 'uuid';
import { start } from 'repl';
import fetch from 'node-fetch';
import { Server } from 'http';

const market = './target/services_market.contract';
const stats = './target/services_statistics.contract';

const config = JSON.parse(readFileSync('./config.json').toString())
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


    let wait = ms => new Promise(resolve => setTimeout(resolve, ms));

    const endowment = 1230000000000n;
    const gasLimit = 100000n * 10000000n;


    const content = readFileSync(market).toString();
    const marketAbi = JSON.parse(content);
    const marketAddress = readFileSync('./marketAddress').toString();
    const marketContract = new ContractPromise(api, marketAbi, marketAddress);

    // watch
    while (true) {
        const resp = await marketContract.query.listServices(alicePair.address, { value: 0, gasLimit: -1 });

        // console.log('resp : ', resp);

        if (!resp.result.isOk) {
            console.error('#########Error!!!!', resp);
            continue;
        }

        const services = resp.output.toHuman();
        console.log("query output", services);

        // get service list from gateway. 
        var requestOptions = {
            method: 'GET',
            redirect: 'follow'
        };
        let url = gateway_endpoint + '/service/';
        let response = await fetch(url, requestOptions);
        let service_list = await response.json();
        console.log("get service list from gateway");
        console.log(service_list);


        // break;

        for (let i in service_list) {
            let gw_service = service_list[i];
            let exist = false;
            for (let j in services) {
                let ic = services[j];
                if (ic.uuid === gw_service.id) {
                    exist = true;
                    break;
                }
            }

            if (!exist) {
                console.log('gateway service is not exist in contract', gw_service);

                // gw_service.desc = 'test desc';
                // gw_service.logo = 'https://www.extremetech.com/wp-content/uploads/2014/01/Bitcoin-from-Wikipedia.jpg';
                // gw_service.create_time = Date.now();
                // gw_service.service_provider_name = 'alice';
                // gw_service.service_provider_account = alicePair.address;
                // gw_service.service_usage = 'Products on demand use, according to the amount of pay, stable and reliable';
                // gw_service.service_price_plan = '[{"name":"Heco RPC service","description":"Heco RPC service, pay-per-use","type":"post-paid/prepay","price":"0.001 unit"}]';
                // gw_service.service_declaimer = 'Service availability of 99.999%, if there is no availability clear as soon as possible to switch to other services.';

                const nonce = await api.rpc.system.accountNextIndex(alicePair.address);
                console.log("========= begin to add service to service market");
                const mm = new ContractPromise(api, marketAbi, marketContract.address);
                const unsub = await mm.tx
                    .addService({ value: 0, gasLimit: gasLimit }
                        , gw_service.id
                        , gw_service.name
                        , gw_service.desc
                        , gw_service.logo
                        , gw_service.create_time
                        , gw_service.service_provider_name
                        , gw_service.service_provider_account
                        , gw_service.service_usage
                        , gw_service.schema
                        , gw_service.service_price_plan
                        , gw_service.service_declaimer)
                    .signAndSend(alicePair, { nonce: nonce }, (result) => {
                        if (result.status.isInBlock || result.status.isFinalized) {
                            console.log("result is: ", result);
                            unsub();
                        }
                    });
            }
        }

        await wait(15000);
    }

    console.log("The End!!!");
}

main().catch(console.error).finally(() => process.exit());