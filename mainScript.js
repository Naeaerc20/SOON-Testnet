// mainScript.js

const bridgeEVMtoSVM = require('./actions/bridgeEVM_to_SVM');
const generateWallets = require('./actions/privateKeysAddresses');
const readline = require('readline');
const fs = require('fs');
const colors = require('colors');
const clearConsole = require('console-clear');
const figlet = require('figlet');

// Placeholder for bridgeSVMtoEVM module
const bridgeSVMtoEVM = async () => {
  console.log('Bridge from SVM to EVM functionality is not yet implemented.'.yellow);
};

// Function to clear console and display the welcome text
const presentacion = () => {
  clearConsole(); // Clear the console
  figlet.text(
    'SOON Testnet', 
    {
      font: 'Standard',
      horizontalLayout: 'default',
      verticalLayout: 'default',
      width: 80,
      whitespaceBreak: true
    },
    function (err, data) {
      if (err) {
        console.log('Error generating large text');
        console.dir(err);
        return;
      }
      console.log(data.blue); // Print the large text in blue color
      console.log('Welcome to SOON Testnet Manager\n'.green);
      console.log('Developed by Naeaex - x.com/naeaex_dev'.yellow);
    }
  );
};

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

// Function to display current wallets
function checkCurrentWallets() {
  const keysFilePath = './actions/keys.txt';

  // Check if the keys file exists
  if (!fs.existsSync(keysFilePath)) {
    console.error('No wallets available. Please generate wallets first.'.red);
    return;
  }

  // Read and display the wallets
  const data = fs.readFileSync(keysFilePath, 'utf8').split('\n').filter(line => line.trim() !== '');

  console.log('Current Wallets:'.blue);
  data.forEach(line => {
    const [id, evmAddress, , svmAddress] = line.split(',');
    console.log(`ID: ${id}`);
    console.log(`  EVM Wallet: ${evmAddress}`.green);
    console.log(`  SVM Wallet: ${svmAddress}`.green);
    console.log(); // Add an empty line between wallets
  });
}

// Main function to display the menu and handle user input
async function mainMenu() {
  // Display the welcome presentation
  presentacion();

  // Wait a moment to display the menu
  await new Promise(resolve => setTimeout(resolve, 500)); // Delay to allow the presentation to show clearly

  while (true) {
    console.log('\nSelect an option:'.blue);
    console.log('1. Bridge from EVM to SVM');
    console.log('2. Bridge from SVM to EVM');
    console.log('3. Generate Wallets');
    console.log('4. Check current wallets');
    console.log('5. Exit');

    const option = await prompt('Enter your choice: '.green);

    switch (option) {
      case '1':
        await bridgeEVMtoSVM();
        break;
      case '2':
        await bridgeSVMtoEVM();
        break;
      case '3':
        await generateWallets();
        break;
      case '4':
        checkCurrentWallets();
        break;
      case '5':
        console.log('Exiting...'.blue);
        process.exit(0);
      default:
        console.error('Invalid option. Please try again.'.red);
    }
  }
}

mainMenu().catch(error => {
  console.error('Error:'.red, error);
});
