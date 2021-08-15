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
const contracts = JSON.parse(readFileSync('./contracts.json').toString())
const ws_endpoint = config.ws_endpoint;
const stats_contract_address = contracts.stats_contract_address;
const market_contract_address = contracts.market_contract_address;

console.log("contract ws: ", ws_endpoint);
async function main() {
    await cryptoWaitReady(); // wait for crypto initializing

    const keyring = new Keyring({ type: 'sr25519' });

    let alicePair = keyring.createFromUri('//Alice');
    let bobPair = keyring.createFromUri('//Bob');
    const provider = new WsProvider(ws_endpoint);

    const api = await ApiPromise.create({
        provider: provider,
        types: {
            "Address": "MultiAddress",
            "LookupSource": "MultiAddress"
        }
    });
    // Retrieve the chain & node information information via rpc calls
    const [chain, nodeName, nodeVersion] = await Promise.all([
        api.rpc.system.chain(),
        api.rpc.system.name(),
        api.rpc.system.version()
    ]);

    console.log(`You are connected to chain ${chain} using ${nodeName} v${nodeVersion}`);

    let wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const endowment = 1230000000000n;

    const gasLimit = 5000000000000n;
    const marketAbi = JSON.parse(readFileSync(market).toString());
    const marketContract = new ContractPromise(api, marketAbi, market_contract_address);
    const statsAbi = JSON.parse(readFileSync(stats).toString());
    const statsContract = new ContractPromise(api, statsAbi, stats_contract_address);

    for (let i = 0; i < 1500; i++) {
        let report = {
            service_uuid: "100",
            user_key: "test" + Date.parse(new Date()),
            start_time: 0,
            end_time: 0,
            usage: 0,
            price_plan: "test",
            cost: 0,
        }
        try {
            const nonce = await api.rpc.system.accountNextIndex(alicePair.address);
            const unsub = await statsContract.tx
                .submitUsage({ value: 0, gasLimit: -1 }, report.service_uuid, report.user_key, report.start_time,
                    report.end_time, report.usage, report.price_plan, report.cost)
                .signAndSend(alicePair, { nonce: nonce }, (result) => {
                    if (result.status.isInBlock || result.status.isFinalized) {
                        // console.log("contract", contract);
                        if (!!result.dispatchError) {
                            console.log('submit usage failed for ', report.service_uuid, report.user_key);
                            console.log('result', result);
                        } else {
                            console.log('submit usage success for ', report.service_uuid, report.user_key);
                        }
                        unsub();
                    }
                });
            await wait(2000); // 2s
        }catch (ex) {
            console.error(ex);
            continue
        }
    }
    console.log("The End!!!");
}

main().catch(console.error).finally(() => process.exit());
