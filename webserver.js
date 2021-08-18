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
import { Command } from 'commander';

const program = new Command();
program
    .option('-c, --config <type>', 'set config path', './config.json');
program.parse();

const configPath = program.opts().config;
console.log("load config from", configPath);
const config = JSON.parse(readFileSync(configPath).toString())
const contracts = JSON.parse(readFileSync('./contracts.json').toString())
const listen_port = config.listen_port;
const ws_endpoint = config.ws_endpoint;
const gateway_endpoint = config.gateway_api_endpoint;
const stats_contract_address = contracts.stats_contract_address;
const market_contract_address = contracts.market_contract_address;

const market = './target/services_market.contract';
const stats = './target/services_statistics.contract';

console.log("contract ws:", ws_endpoint);
console.log("gateway addr:", gateway_endpoint);

new Worker("./submit.js");
const app = express();

app.use(express.json());

app.use(function (err, req, res, next) {
    console.error(err.stack)
    next(err)
})

app.use(function (err, req, res, next) {
    if (req.xhr) {
        res.status(500).send({ error: 'Something failed!' })
    } else {
        res.status(500).render('error', { error: err })
    }
})

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
    console.log(`Listening at http://localhost:${listen_port}`)
})


export async function registerServices(data) {

    // Step 0: setup env
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

    // Step 1: process request data
    let v = data.providers[0];

    let sid = data.id;
    let sname = data.name;
    let sdesc = data.desc;
    let slogo = data.logo;
    let screate_time = Date.now();
    let sprovider_name = v.name;
    let sprovider_account = v.id; // fixme: need account;
    let susage = data.usage;
    let sschema = v.schema;
    // let sprice_plan = data.price_plan;
    // let sdeclaimer = data.declaimer; // fixme: need default ones;

    let sprice_plan = JSON.stringify(
        [{
            name: "Free",
            type: "post-paid",
            price: 0,
            unit: "APN",
            desc: "Free plan for all."
        }]
    );
    let sdeclaimer = "THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.";

    // Step 2: register service with Apron Gateway
    console.log("========= begin to register to gateway");
    let gw_data = {
        id: data.id,
        domain_name: data.domain_name,
        providers: [
            {
                id: v.id,
                name: v.name,
                desc: v.desc,
                base_url: v.base_url,
                schema: v.schema
            }
        ]
    }

    // let response = await axios({
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     url: gateway_endpoint + "/service",
    //     data: gw_data
    // })
    // console.log("register result", response.status)
    //
    // if(response.status != 200) { // failed, then return error
    //     return response.status;
    // }

    // Step 3: register service with smart contract
    console.log("========= begin to add service to service market");

    const endowment = 1230000000000n;
    const gasLimit = 100000n * 10000000n;

    const marketAbi = JSON.parse(readFileSync(market).toString());
    const marketContract = new ContractPromise(api, marketAbi, market_contract_address);

    let nonce = await api.rpc.system.accountNextIndex(alicePair.address);
    const unsubCall1 = await marketContract.tx
        .addService({ value: 0, gasLimit: gasLimit },
            sid,
            sname,
            sdesc,
            slogo,
            screate_time,
            sprovider_name,
            sprovider_account,
            susage,
            sschema,
            sprice_plan,
            sdeclaimer)
        .signAndSend(alicePair, { nonce: nonce }, (result) => {
            console.log("addService", result.toHuman());
            if (result.status.isInBlock || result.status.isFinalized) {
                if (!!result.dispatchError) {
                    console.log('add service failed for ', sid, sprovider_account);
                    console.log('isBadOrigin is ', result.dispatchError.isBadOrigin);
                    console.log('isOther is ', result.dispatchError.isOther);
                    console.log('isModule is ', result.dispatchError.isModule);
                } else {
                    console.log('add service success for ', v.id);
                }
                unsubCall1();
            }
        });
}
