// bridgeEVM_to_SVM.js

const { ethers } = require("ethers");
const fs = require('fs');
const readline = require("readline");
const bs58 = require('bs58'); // Use bs58 version 4.0.1
const colors = require('colors'); // Import colors for colored output

// Path to keys.txt in the current directory (__dirname ensures it looks in /root/SOON-Testnet/actions)
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

// Function to generate a random number within a specified range
function getRandomNumber(min, max) {
  return Math.random() * (max - min) + min;
}

// Function to generate a random integer within a specified range
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function bridgeEVMtoSVM() {
  try {
    // Load wallets from keys.txt
    const data = fs.readFileSync(KEYS_FILE_PATH, 'utf8').split('\n').filter(line => line.trim() !== '');

    // Sub-menu to select which wallets to perform bridges on
    console.log(); // Add a space before sub-menu
    const option = await prompt('On which wallets would you like to perform Bridges?\n1. All of Them\n2. Specific Wallets\n3. Back to main Menu\nEnter your choice: '.blue);

    let selectedWallets = [];

    if (option === '1') {
      // Select all wallets
      selectedWallets = data.map((_, index) => index + 1); // Create an array [1, 2, ..., n]
    } else if (option === '2') {
      // Ask for specific wallet IDs
      const walletIds = await prompt('Enter the IDs of the wallets to use (separated by spaces): '.blue);
      selectedWallets = walletIds.split(' ').map(id => parseInt(id)).filter(id => !isNaN(id) && id > 0 && id <= data.length);
      if (selectedWallets.length === 0) {
        console.error('No valid wallet IDs entered.'.red);
        return; // Exit the function and return to the main menu
      }
    } else if (option === '3') {
      // Back to main menu
      return;
    } else {
      console.error('Invalid option selected.'.red);
      return;
    }

    // Ask for minimum and maximum number of transactions
    const minTransactions = await prompt('Enter the minimum number of transactions per wallet: '.blue);
    const maxTransactions = await prompt('Enter the maximum number of transactions per wallet: '.blue);

    // Validate input
    const minTrans = parseInt(minTransactions);
    const maxTrans = parseInt(maxTransactions);
    if (isNaN(minTrans) || isNaN(maxTrans) || minTrans <= 0 || maxTrans < minTrans) {
      console.error('Invalid number of transactions. Ensure that minimum is greater than 0 and maximum is greater than or equal to minimum.'.red);
      return;
    }

    // Add a blank line after data input
    console.log();

    // Perform transactions for each selected wallet
    for (let walletId of selectedWallets) {
      const [idStr, evmAddress, evmPrivateKey, svmAddress] = data[walletId - 1].split(',');

      // Convert the SVM wallet address into bytes32 _to
      const svmAddressBytes = bs58.decode(svmAddress);
      const _to = '0x' + svmAddressBytes.toString('hex').padStart(64, '0');

      // Create a provider to check the wallet balance
      const rpcUrl = "https://eth-sepolia.g.alchemy.com/v2/t_qjVdhjAo-ygO6wAiQIu_bOiJ7BopN5";
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

      // Wallet instance
      const wallet = new ethers.Wallet(evmPrivateKey, provider);

      // Check the wallet balance
      const balance = await wallet.getBalance();
      const balanceInEth = parseFloat(ethers.utils.formatEther(balance));

      // Skip this wallet if balance is insufficient
      if (balanceInEth < 0.0055) { // Minimal needed to perform a single transaction
        console.log(`Insufficient balance for wallet [${evmAddress}]. Skipping transactions.`.red);
        continue;
      }

      // Perform a random number of transactions within the specified range
      const numTransactions = getRandomInt(minTrans, maxTrans);

      for (let i = 0; i < numTransactions; i++) {
        // Random amount of ETH to bridge between 0.0055 and 0.015
        const amountToBridge = getRandomNumber(0.0055, 0.015).toFixed(6);

        // Convert the amount to BigNumber
        const value = ethers.utils.parseEther(amountToBridge);

        // Check if there's enough balance to perform this transaction
        if (balance.lt(value)) {
          console.log(`Insufficient balance for wallet [${evmAddress}] for transaction amount ${amountToBridge} ETH. Skipping this transaction.`.yellow);
          break; // Exit the transaction loop for this wallet
        }

        // Contract address and ABI
        const contractAddress = "0xd30dbF109bb5Ba51FbCCE34F9eeC09F41E7970a4";
        const abi = [
          "function bridgeETHTo(bytes32 _to, uint32 _minGasLimit, bytes _extraData) payable",
        ];

        // Create contract instance
        const contract = new ethers.Contract(contractAddress, abi, wallet);

        // Parameters for the function
        const _minGasLimit = 100000;
        const _extraData = "0x"; // Empty bytes

        // Get the latest block to access baseFeePerGas
        const block = await provider.getBlock("latest");
        const baseFeePerGas = block.baseFeePerGas;

        // Convert baseFeePerGas to Gwei for comparison
        const baseFeePerGasGwei = Number(ethers.utils.formatUnits(baseFeePerGas, "gwei"));

        // Determine the multiplier based on baseFeePerGasGwei
        let multiplier;
        if (baseFeePerGasGwei > 1 && baseFeePerGasGwei < 5) {
          multiplier = 3;
        } else if (baseFeePerGasGwei > 5) {
          multiplier = 2;
        } else if (baseFeePerGasGwei < 1) {
          multiplier = 5;
        } else {
          multiplier = 3; // Default multiplier
        }

        // Calculate maxFeePerGas and maxPriorityFeePerGas
        const maxFeePerGas = baseFeePerGas.mul(multiplier);
        const maxPriorityFeePerGas = baseFeePerGas.mul(multiplier);

        // Generate a random gas limit between 700,000 and 1,250,000
        const gasLimit = getRandomInt(700000, 1250000);

        // Print transaction details in the specified format
        console.log(`⏳ Bridging funds from EVM [${evmAddress}] to SVM [${svmAddress}]`.magenta);
        console.log(`   🟢 [${amountToBridge} ETH]`.green);
        console.log(`   🟢 [${_to}]`.green);

        try {
          // Send the transaction
          const tx = await contract.bridgeETHTo(_to, _minGasLimit, _extraData, {
            gasLimit: gasLimit,
            maxFeePerGas: maxFeePerGas,
            maxPriorityFeePerGas: maxPriorityFeePerGas,
            value: value,
          });

          console.log(`   🟢 [Transaction Hash: ${tx.hash}]`.green);

          // Wait for the transaction to be mined
          const receipt = await tx.wait();

          console.log(`   🟢 [Block Number: ${receipt.blockNumber}]`.green);
          console.log(`🎉 Funds transferred with success`.magenta);
        } catch (error) {
          // Handle errors for each transaction
          if (error.code === 'CALL_EXCEPTION' || error.code === 'INSUFFICIENT_FUNDS') {
            console.error('Error: Insufficient funds to complete the transaction.'.red);
          } else {
            console.error('Error:'.red, error.message || error);
          }
          break; // If an error occurs, stop further transactions for this wallet
        }

        console.log(); // Add an empty line between each transaction's output
      }
    }
  } catch (error) {
    // General error handling
    console.error('Error:'.red, error.message || error);
    process.exit(1);
  }
}

module.exports = bridgeEVMtoSVM;
