import express from 'express';
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { CodePromise, ContractPromise } from '@polkadot/api-contract';
import { readFileSync, writeFileSync } from 'fs';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { time } from 'console';
import { v4 as uuidv4 } from 'uuid';
import { start } from 'repl';
import fetch from 'node-fetch';
import axios from "axios";
import * as path from "path";
import { Worker } from "worker_threads";

const market = './target/services_market.contract';
const stats = './target/services_statistics.contract';

const config = JSON.parse(readFileSync('./config.json').toString())
const listen_port = config.listen_port;
const ws_endpoint = config.ws_endpoint;
const gateway_endpoint = config.gateway_api_endpoint;
const stats_contract_address = config.stats_contract_address;
const market_contract_address = config.market_contract_address;

console.log(ws_endpoint);
console.log(gateway_endpoint);
new Worker('./submit.js');
const app = express()
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.post('/service', (req, res) => {
    console.log("/service", req.body)
    registerServices(req.body).then(r => {
        console.log("registerServices done", r)
        res.send("success")
    })
})

app.listen(listen_port, () => {
    console.log(`Example app listening at http://localhost:${listen_port}`)
})


export async function registerServices(data) {

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

    let v = data.providers[0]
    console.log("========= begin to add service to service market");
    let nonce = await api.rpc.system.accountNextIndex(alicePair.address);
    const unsubCall1 = await marketContract.tx
        .addService({ value: 0, gasLimit: gasLimit },
            data.id,
            v.name,
            v.desc,
            v.logo,
            v.create_time,
            v.service_provider_name,
            v.service_provider_account,
            v.service_usage,
            v.schema,
            v.service_price_plan,
            v.service_declaimer)
        .signAndSend(alicePair, { nonce: nonce }, (result) => {
            if (result.status.isInBlock || result.status.isFinalized) {
                if (!!result.dispatchError) {
                    console.log('add service failed for ', report.service_uuid, report.user_key);
                    console.log('isBadOrigin is ', result.dispatchError.isBadOrigin);
                    console.log('isOther is ', result.dispatchError.isOther);
                    console.log('isModule is ', result.dispatchError.isModule);
                } else {
                    console.log('add service success for ', v.id);
                }
                unsubCall1();
            }
        });

    console.log("========= begin to register to gateway");
    let response = await axios({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        url: gateway_endpoint + "/service",
        data: data
    })
    console.log("register result", response.status)
}
