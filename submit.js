// Required imports
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { CodePromise, ContractPromise } from '@polkadot/api-contract';
import { readFileSync, writeFileSync } from 'fs';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { time } from 'console';
import { v4 as uuidv4 } from 'uuid';
import { start } from 'repl';
import fetch from 'node-fetch';

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


    const content = readFileSync(stats).toString();
    const statsAbi = JSON.parse(content);
    const statsAddress = readFileSync('./statsAddress').toString();
    // const serviceId = readFileSync('./serviceid').toString();
    // const userKey = uuidv4(); 

    console.log("========= begin to submit usage report");
    const statsContract = new ContractPromise(api, statsAbi, statsAddress);
    
    // submit usage
    while (true) {
        endtime = Date.now();

        // get data from gateway. 
        var requestOptions = {
            method: 'GET',
            redirect: 'follow'
          };
        let url = gateway_endpoint + '/service/report/';
        let response = await fetch(url, requestOptions);
        let reports = await response.json();
        console.log("get data from gate way");
        console.log(reports);

        for (var index in reports) {

            let report = reports[index];

            // console.log(report)
            // console.log("submit %s usage to chain", report.service_uuid);

            // remove service name empty.
            if( report.service_uuid === "" ){
                // console.log("continue");
                continue;
            }

            console.log("submit %s usage to chain", report.service_uuid);

            const nonce = await api.rpc.system.accountNextIndex(alicePair.address);
            const unsub = await statsContract.tx
            .submitUsage({ value: 0, gasLimit: -1 }, report.service_uuid, report.user_key, report.start_time, report.end_time, report.usage, report.price_plan, report.cost)
            .signAndSend(alicePair, {nonce: nonce}, (result) => {
                if (result.status.isInBlock || result.status.isFinalized) {
                    // console.log("contract", contract);
                    if (!!result.dispatchError) {
                        console.log('isBadOrigin is ', result.dispatchError.isBadOrigin);
                        console.log('isOther is ', result.dispatchError.isOther);
                        console.log('isModule is ', result.dispatchError.isModule);
                    } else {
                        console.log('submit usage success for ', report.service_uuid, report.user_key);
                    }
                    unsub();
                }
            });
        }
        
        await wait(30000); // 30s
    }

    console.log("The End!!!");
}

main().catch(console.error).finally(() => process.exit());