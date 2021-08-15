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

const contractsPath = "./contracts.json";
const config = JSON.parse(readFileSync('./config.json').toString());
const ws_endpoint = config.ws_endpoint;
const gateway_endpoint = config.gateway_api_endpoint;

console.log(ws_endpoint);
console.log(gateway_endpoint);

async function main() {

    await cryptoWaitReady(); // wait for crypto initializing

    const keyring = new Keyring({ type: 'sr25519' });
    let alicePair = keyring.createFromUri('//Alice');

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


    // Init
    const service_id = uuidv4();
    writeFileSync('serviceid', service_id);


    let wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const endowment = 1000000000000000n * 100n;
    const gasLimit = 100000n * 1000000n;

    let marketBluePrint, statsBluePrint;
    let marketContract, statsContract;

    let contracts = {
        market_contract_address: "",
        stats_contract_address: ""
    }

    // deploy market contract
    {
        const content = readFileSync(market).toString();
        const marketAbi = JSON.parse(content);

        let nonce = await api.rpc.system.accountNextIndex(alicePair.address);
        console.log("======= begin to upload market contrace code");
        const code = new CodePromise(api, marketAbi, marketAbi.wasm);
        const unsub1 = await code.tx
            .new(endowment, gasLimit, alicePair.address)
            .signAndSend(alicePair, { nonce: nonce }, (result) => {
                console.log("result:", result.toHuman());
                if (result.status.isInBlock || result.status.isFinalized) {
                    // here we have an additional field in the result, containing the contract
                    marketContract = result.contract;
                    console.log("market contract address is : ", marketContract.address.toString());
                    contracts.market_contract_address = marketContract.address.toString();
                    unsub1();
                }
            });

        await wait(10000);
    }

    // deploy stats contract
    {
        const content = readFileSync(stats).toString();
        const statsAbi = JSON.parse(content);

        let nonce = await api.rpc.system.accountNextIndex(alicePair.address);
        console.log("======= begin to upload stats contract code");
        const code = new CodePromise(api, statsAbi, statsAbi.wasm);
        const unsub2 = await code.tx
            .new(endowment, gasLimit, alicePair.address, marketContract.address.toString())
            .signAndSend(alicePair, { nonce: nonce }, (result) => {
                console.log("result:", result.toHuman());
                if (result.status.isInBlock || result.status.isFinalized) {

                    if (!!result.dispatchError) {
                        console.log('isBadOrigin is ', result.dispatchError.isBadOrigin);
                        console.log('isOther is ', result.dispatchError.isOther);
                        console.log('isModule is ', result.dispatchError.isModule);
                    }

                    statsContract = result.contract;
                    console.log("stats contract address is: ", statsContract.address.toString());
                    contracts.stats_contract_address = statsContract.address.toString();
                    unsub2();
                }
            });

        await wait(10000);
    }
    writeFileSync(contractsPath, JSON.stringify(contracts));

    console.log("The End!!!");
}

main().catch(console.error).finally(() => process.exit());
