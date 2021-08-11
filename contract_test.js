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
    const gasLimit = 100000n * 10000000n;
    const marketAbi = JSON.parse(readFileSync(market).toString());
    const marketContract = new ContractPromise(api, marketAbi, market_contract_address);

    const statsAbi = JSON.parse(readFileSync(stats).toString());
    const statsContract = new ContractPromise(api, statsAbi, stats_contract_address);

    console.log("========= begin to add service to service market");
    let gw_service = {
        id: "100000",
        name:"test1",
        desc: "test1",
        logo: "test1",
        create_time: 0,
        service_provider_name: "provider_test",
        service_provider_account: "5GtMaYJc7kx9NYpUpzibiCLz5NzEyZCPvBXGMveh4jZFEJkh",
        service_usage: "usage_test",
        schema: "test",
        service_price_plan: "plan_test",
        service_declaimer: "declaimer"
    }
    let nonce = await api.rpc.system.accountNextIndex(alicePair.address);
    const unsubCall1 = await marketContract.tx
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
                if (!!result.dispatchError) {
                    console.log('isBadOrigin is ', result.dispatchError.isBadOrigin);
                    console.log('isOther is ', result.dispatchError.isOther);
                    console.log('isModule is ', result.dispatchError.isModule);
                } else {
                    console.log('add service success for ', gw_service.id);
                }
                unsubCall1();
            }
        });
    await wait(10000); // 10s
    const { gasConsumed, result, output } = await marketContract.query.queryServiceByUuid(alicePair.address,
        { value: 0, gasLimit: gasLimit }, gw_service.id)
    if (result.isOk) {
        console.log('query service Success', output.toHuman());
    } else {
        console.error('query service Error', result.asErr);
    }

    console.log("submit service uuid %s usage to chain", gw_service.id);
    let report = {
        service_uuid: gw_service.id,
        user_key: "test1",
        start_time: 0,
        end_time: 1,
        usage: 100,
        price_plan: "plan_test",
        cost: 10000,
    }
    nonce = await api.rpc.system.accountNextIndex(alicePair.address);
    const unsubCall2 = await statsContract.tx
        .submitUsage({ value: 0, gasLimit: -1 },
            report.service_uuid,
            report.user_key,
            report.start_time,
            report.end_time,
            report.usage,
            report.price_plan,
            report.cost)
        .signAndSend(alicePair, {nonce: nonce}, (result) => {
            if (result.status.isInBlock || result.status.isFinalized) {
                if (!!result.dispatchError) {
                    console.log('isBadOrigin is ', result.dispatchError.isBadOrigin);
                    console.log('isOther is ', result.dispatchError.isOther);
                    console.log('isModule is ', result.dispatchError.isModule);
                } else {
                    console.log('submit usage success for ', report.service_uuid, report.user_key);
                }
                unsubCall2();
            }
        });
    await wait(10000); // 10s
    const { gasConsumed2, result2, output2 } = await statsContract.query.listAllStatistics(alicePair.address,
        { value: 0, gasLimit: gasLimit })
    console.log(gasConsumed2, result2, output2)
    if (result2.isOk) {
        console.log('query stats Success', output2.toHuman());
    } else {
        console.error('query stats Error', result2.asErr);
    }
    console.log("The End!!!");
}

main().catch(console.error).finally(() => process.exit());
