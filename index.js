const { Mnemonic } = require('@liskhq/lisk-passphrase');
const liskCryptography = require('@liskhq/lisk-cryptography');
const liskTransactions = require('@liskhq/lisk-transactions');
const axios = require('axios');

const DEFAULT_API_MAX_PAGE_SIZE = 100;
const DEFAULT_API_TIMEOUT = 10000;

class LiskAdapter {
  async load(options) {
    this.apiURL = options.apiURL;
    this.apiMaxPageSize = options.apiMaxPageSize || DEFAULT_API_MAX_PAGE_SIZE;
    this.apiTimeout = options.apiTimeout || DEFAULT_API_TIMEOUT;
  }

  prepareTransfer(amount, recipientAddress, message, passphrase) {
    return liskTransactions.transfer({
      amount: liskTransactions.utils.convertLSKToBeddows(amount.toString()).toString(),
      recipientId: recipientAddress,
      data: message,
      passphrase,
    });
  }

  generateWallet() {
    let passphrase = Mnemonic.generateMnemonic();
    let walletAddress = this.getAddressFromPassphrase(passphrase);
    return {
      walletAddress,
      passphrase
    };
  }

  validatePassphrase(passphrase) {
    return Mnemonic.validateMnemonic(passphrase, Mnemonic.wordlists.english);
  }

  getAddressFromPassphrase(passphrase) {
    return liskCryptography.getAddressAndPublicKeyFromPassphrase(passphrase).address;
  }

  async postTransaction(transaction) {
    await axios.post(`${this.apiURL}/transactions`, transaction);
  }

  async getLatestOutboundTransactions(walletAddress, limit) {
    let client = axios.create();
    client.defaults.timeout = this.apiTimeout;
    let result = await client.get(
      `${this.apiURL}/transactions?senderId=${
        walletAddress
      }&limit=${
        limit || this.apiMaxPageSize
      }&sort=timestamp:desc`
    );
    return result.data.data;
  }

  async getAccountBalance(walletAddress) {
    let client = axios.create();
    client.defaults.timeout = this.apiTimeout;
    let response = await client.get(`${this.apiURL}/accounts?address=${walletAddress}`);
    let balanceList = Array.isArray(response.data) ? response.data : response.data.data;
    if (!balanceList.length) {
      throw new Error(
        `Failed to fetch account balance for wallet address ${
          walletAddress
        } - Could not find any balance records for that account`
      );
    }
    return balanceList[0].balance;
  }

  async unload() {}
}

module.exports = LiskAdapter;