"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  EthereumInjectedWallet: () => EthereumInjectedWallet,
  EthereumWalletApi: () => EthereumWalletApi,
  EvmWindowObjectWithStarknetKeys: () => EvmWindowObjectWithStarknetKeys,
  isEVMWallet: () => isEVMWallet,
  isEthereumWindowObject: () => isEthereumWindowObject
});
module.exports = __toCommonJS(index_exports);

// src/discovery/evm-wallets.ts
var import_mipd = require("mipd");
async function EvmWindowObjectWithStarknetKeys() {
  let starknetWallets = [];
  const store = await (0, import_mipd.createStore)();
  const providers = await store.getProviders();
  for (const wallet of providers) {
    if (wallet.info.rdns === "com.bitget.web3") {
      wallet.info.name = "Bitget Wallet via Rosettanet";
    } else if (wallet.info.rdns === "com.okex.wallet") {
      wallet.info.name = "OKX Wallet via Rosettanet";
    }
    const starkNetWallet = {
      ...wallet.provider,
      id: wallet.info.name,
      name: wallet.info.name,
      icon: wallet.info.icon,
      version: wallet.info.icon,
      on: wallet.provider.on,
      off: wallet.provider.off
    };
    starknetWallets.push(starkNetWallet);
  }
  return starknetWallets;
}
__name(EvmWindowObjectWithStarknetKeys, "EvmWindowObjectWithStarknetKeys");
var ETHEREUM_WALLET_KEYS = ["sendAsync", "send", "request"];
function isEthereumWindowObject(wallet) {
  if (typeof wallet !== "object" || wallet === null) return false;
  return ETHEREUM_WALLET_KEYS.every((key) => key in wallet);
}
__name(isEthereumWindowObject, "isEthereumWindowObject");

// src/wallet-standard/evm-injected-wallet.ts
var import_features = require("@wallet-standard/features");
var EthereumWalletApi = "ethereum:wallet";
var EthereumInjectedWallet = class {
  constructor(injected) {
    this.injected = injected;
    this.injected.on("accountsChanged", (accounts) => {
      if (Array.isArray(accounts) && accounts.every((a) => typeof a === "string")) {
        this.#onAccountsChanged(accounts);
      } else {
        console.warn("Unexpected accounts type:", accounts);
      }
    });
    this.injected.on("chainChanged", (chainIdHex) => {
      if (typeof chainIdHex === "string") {
        this.#onChainChanged(chainIdHex);
      } else {
        console.warn("Unexpected chainIdHex type:", chainIdHex);
      }
    });
    this.injected.on("disconnect", this.#onDisconnect.bind(this));
  }
  static {
    __name(this, "EthereumInjectedWallet");
  }
  #listeners = {};
  #account = null;
  get version() {
    return "1.0.0";
  }
  get name() {
    return this.injected.name;
  }
  get icon() {
    return this.injected.icon;
  }
  get features() {
    return {
      [import_features.StandardConnect]: {
        version: "1.0.0",
        connect: this.#connect.bind(this)
      },
      [import_features.StandardDisconnect]: {
        version: "1.0.0",
        disconnect: this.#disconnect.bind(this)
      },
      [import_features.StandardEvents]: {
        version: "1.0.0",
        on: this.#on.bind(this)
      },
      [EthereumWalletApi]: {
        version: "1.0.0",
        request: this.#request.bind(this)
      }
    };
  }
  get chains() {
    return [
      "eip155:1381192787"
      // Rosettanet Chain ID
    ];
  }
  get accounts() {
    if (this.#account) {
      return [
        {
          address: this.#account.address,
          publicKey: new Uint8Array(),
          chains: [this.#account.chain],
          features: []
        }
      ];
    }
    return [];
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  #connect = /* @__PURE__ */ __name(async ({ silent } = {}) => {
    if (!this.#account) {
      try {
        const accounts = await this.injected.request({
          method: "eth_requestAccounts"
        });
        if (!accounts || accounts.length === 0) {
          return { accounts: [] };
        }
        await this.#onAccountsChanged(accounts);
      } catch (error) {
        console.error("Connection error:", error);
        return { accounts: [] };
      }
    }
    return { accounts: this.accounts };
  }, "#connect");
  #disconnect = /* @__PURE__ */ __name(async () => {
    this.#disconnected();
    return;
  }, "#disconnect");
  #on = /* @__PURE__ */ __name((event, listener) => {
    if (!this.#listeners[event]) {
      this.#listeners[event] = [];
    }
    this.#listeners[event].push(listener);
    return () => {
      this.#off(event, listener);
    };
  }, "#on");
  #emit(event, ...args) {
    if (!this.#listeners[event]) return;
    for (const listener of this.#listeners[event]) {
      listener.apply(null, args);
    }
  }
  #off(event, listener) {
    const arr = this.#listeners[event];
    if (!arr) return;
    this.#listeners[event] = arr.filter((l) => l !== listener);
  }
  #disconnected() {
    if (this.#account) {
      this.#account = null;
      this.#emit("change", { accounts: this.accounts });
    }
  }
  async #onAccountsChanged(accounts) {
    if (!accounts || accounts.length === 0) {
      this.#disconnected();
      return;
    }
    const [account] = accounts;
    if (this.#account?.chain) {
      this.#account.address = account;
      this.#emit("change", { accounts: this.accounts });
    } else {
      const chain = await this.#getEthereumChain();
      this.#account = { address: account, chain };
      this.#emit("change", { accounts: this.accounts });
    }
  }
  #onChainChanged(chainIdHex) {
    if (!chainIdHex || !this.#account) {
      this.#disconnected();
      return;
    }
    const chainId = Number.parseInt(chainIdHex, 16).toString();
    const chain = `eip155:${chainId}`;
    if (!this.chains.includes(chain)) {
      console.warn("Switched to unsupported chain:", chain);
    }
    this.#account.chain = chain;
    this.#emit("change", { accounts: this.accounts });
  }
  #onDisconnect() {
    this.#disconnected();
  }
  #request(args) {
    return this.injected.request(args);
  }
  async #getEthereumChain() {
    try {
      const chainIdHex = await this.injected.request({
        method: "eth_chainId"
      });
      const chainId = Number.parseInt(chainIdHex, 16).toString();
      const chain = `eip155:${chainId}`;
      return chain;
    } catch (error) {
      console.error("Failed to get chain ID:", error);
      throw new Error("Invalid Ethereum chain");
    }
  }
};

// src/wallet-standard/features.ts
var import_features2 = require("@wallet-standard/features");
var RequiredEthereumFeatures = [
  EthereumWalletApi,
  import_features2.StandardConnect,
  import_features2.StandardDisconnect,
  import_features2.StandardEvents
];
function isEVMWallet(wallet) {
  const result = RequiredEthereumFeatures.every((feature) => feature in wallet.features);
  return result;
}
__name(isEVMWallet, "isEVMWallet");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  EthereumInjectedWallet,
  EthereumWalletApi,
  EvmWindowObjectWithStarknetKeys,
  isEVMWallet,
  isEthereumWindowObject
});
//# sourceMappingURL=index.cjs.map