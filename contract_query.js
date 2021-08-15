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

    // // read contract info
    // let unsub = await api.query.contracts.contractInfoOf(market_contract_address);
    // console.info(unsub);
    {
        console.log("========= begin to query listServices");
        const { gasConsumed, result, output } = await marketContract.query.listServices(alicePair.address,
            { value: 0, gasLimit: gasLimit })
        // The actual result from RPC as `ContractExecResult`
        // console.log(result.toHuman());
        // gas consumed
        // console.log(gasConsumed.toHuman());
        if (result.isOk) {
            console.log('listServices Success', output.toHuman());
        } else {
            console.error('query service Error', result.toHuman());
        }
    }

    // {
    //     console.log("========= begin to query listAllStatistics");
    //     const { gasConsumed, result, output } = await statsContract.query.listAllStatistics(alicePair.address,
    //         { value: 0, gasLimit: gasLimit })
    //     console.log(gasConsumed.toHuman());
    //     if (result.isOk) {
    //         console.log('listAllStatistics Success', output.toHuman());
    //     } else {
    //         console.error('query stats Error', result.toHuman());
    //     }
    // }

    {
        console.log("========= begin to query listAllStatisticsByPage");
        const { gasConsumed, result, output } = await statsContract.query.listAllStatisticsByPage(alicePair.address,
            { value: 0, gasLimit: gasLimit }, {
                "page_index": 0,
                "page_size": 100,
            })
        console.log("gasConsumed", gasConsumed.toHuman());
        if (result.isOk) {
            console.log('queryByIndex Success', output.toHuman());
        } else {
            console.error('query queryByIndex Error', result.toHuman());
        }
    }

    {
        console.log("========= begin to query queryByServiceUuid");
        const { gasConsumed, result, output } = await statsContract.query.queryByServiceUuid(alicePair.address,
            { value: 0, gasLimit: gasLimit }, "100", {
                "page_index": 0,
                "page_size": 100,
            })
        console.log("gasConsumed", gasConsumed.toHuman());
        if (result.isOk) {
            console.log('queryByServiceUuid Success', output.toHuman());
        } else {
            console.error('queryByServiceUuid Error', result.toHuman());
        }
    }
    console.log("The End!!!");
}

main().catch(console.error).finally(() => process.exit());
