// privateKeysAddresses.js

const { ethers } = require("ethers");
const bs58 = require('bs58');
const { Keypair } = require('@solana/web3.js');
const fs = require('fs');
const readline = require("readline");

// Path to the keys.txt file
const KEYS_FILE_PATH = __dirname + '/keys.txt';

// Function to prompt user input
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(question, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

// Function to generate wallets and save to keys.txt
async function generateWallets() {
  // Ask for the number of wallets to generate
  const numWallets = await prompt('How many wallets do you want to generate? '.blue);

  // Validate input
  const num = parseInt(numWallets);
  if (isNaN(num) || num <= 0) {
    console.error('Invalid number of wallets.');
    process.exit(1);
  }

  let existingKeys = [];
  let startingId = 1;

  // Check if keys.txt exists and read the existing wallets
  if (fs.existsSync(KEYS_FILE_PATH)) {
    const existingData = fs.readFileSync(KEYS_FILE_PATH, 'utf8').split('\n').filter(line => line.trim() !== '');
    if (existingData.length > 0) {
      existingKeys = existingData;
      const lastLine = existingData[existingData.length - 1];
      const lastIdMatch = lastLine.match(/^\[(\d+)\]/);
      if (lastIdMatch) {
        startingId = parseInt(lastIdMatch[1]) + 1;
      }
    }
  }

  const newKeys = [];

  // Generate wallets starting from the next ID
  for (let i = 0; i < num; i++) {
    // Generate EVM wallet
    const evmWallet = ethers.Wallet.createRandom();
    const evmAddress = evmWallet.address;
    const evmPrivateKey = evmWallet.privateKey;

    // Generate SVM wallet
    const svmWallet = Keypair.generate();
    const svmAddress = bs58.encode(svmWallet.publicKey.toBytes());
    const svmPrivateKey = bs58.encode(svmWallet.secretKey);

    // Store the keys in the specified format
    newKeys.push(`[${startingId + i}],${evmAddress},${evmPrivateKey},${svmAddress},${svmPrivateKey}`);
  }

  // Append new keys to existing ones and save to keys.txt
  const allKeys = existingKeys.concat(newKeys);
  fs.writeFileSync(KEYS_FILE_PATH, allKeys.join('\n'), 'utf8');
  console.log(`Generated ${num} new wallets and saved to keys.txt`);
}

module.exports = generateWallets;
