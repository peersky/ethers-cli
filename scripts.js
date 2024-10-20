#!/usr/bin/env node
const ethers = require("ethers");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

// const argv = yargs(hideBin(process.argv)).argv

yargs(hideBin(process.argv))
  .command(
    "randomWallet",
    "create random wallet mnemonic",
    (yargs) => {
      return yargs.positional("depth", {
        describe: "number of accounts to generate",
        default: 10,
      });
    },
    (argv) => {
      const wallet = ethers.Wallet.createRandom();
      console.log("************MNEMONIC**************");
      console.log(wallet.mnemonic);
      for (let i = 0; i < argv.depth; i++) {
        const walletIdx = ethers.Wallet.fromMnemonic(wallet.mnemonic.phrase, `m/44'/60'/0'/0/${i}`);
        console.log(walletIdx.address);
      }
      console.log("**********************************");
    }
  )
  .command(
    "randomMnemonic",
    "create random wallet mnemonic",
    (yargs) => {
      return yargs.positional("depth", {
        describe: "number of accounts to generate",
        default: 10,
      });
    },
    (argv) => {
      const wallet = ethers.Wallet.createRandom();
      console.log("************MNEMONIC**************");
      console.log(wallet.mnemonic);
      for (let i = 0; i < argv.depth; i++) {
        const walletIdx = ethers.Wallet.fromMnemonic(wallet.mnemonic.phrase, `m/44'/60'/0'/0/${i}`);
        console.log(walletIdx.address);
      }
      console.log("**********************************");
    }
  )
  .command(
    "transaction",
    "create transaction",
    (yargs) => {
      return (
        yargs
          .positional("signature", {
            describe: "function signature given as readable string",
            type: "string",
            demandOption: true,
          })
          // .string("signature")
          .array("arguments")
          .positional("arguments", { describe: "Arguments", type: "string" })
          .positional("signer", {
            describe: "Private key of signer",
            demandOption: true,
            type: "string",
          })
          .positional("RPC", {
            describe: "RPC rpovider",
            demandOption: true,
            type: "string",
          })
          .positional("contractAddress", {
            describe: "contract address",
            demandOption: true,
            type: "string",
          })
      );
    },
    async (argv) => {
      console.log(typeof argv.arguments[2]);
      const provider = new ethers.providers.JsonRpcProvider(argv.RPC);
      const signer = new ethers.Wallet(argv.signer, provider);
      if (ethers.utils.isAddress(argv.contractAddress)) {
        const contract = new ethers.Contract(argv.contractAddress, [`function ${argv.signature}`], signer);
        const tx = await contract.functions[argv.signature](...argv.arguments);
        console.log("transactions hash:", tx?.hash);
      } else {
        console.error("not an address:", contractAddress);
      }
    }
  )
  .command(
    "getAccounts",
    "gets accounts of a mnemonic",
    (yargs) => {
      return yargs
        .string("mnemonic")
        .positional("mnemonic", { describe: "wallet mnemonic" })
        .positional("depth", {
          describe: "number of accounts to get",
          default: 10,
        })
        .demandOption(["mnemonic"]);
    },
    (argv) => {
      const depth = argv.depth ?? 10;
      const wallet = new ethers.Wallet.fromMnemonic(argv.mnemonic);
      for (let i = 0; i < depth; i++) {
        const walletIdx = ethers.Wallet.fromMnemonic(wallet.mnemonic.phrase, `m/44'/60'/0'/0/${i}`);
        console.log(walletIdx.address);
      }
    }
  )
  .command(
    "findPK <account>",
    "takes an account address and mnemonic and finds matching private key",
    (yargs) => {
      return yargs
        .positional("account", { describe: "account PK of which need to find", type: "string" })
        .positional("mnemonic", {
          describe: "wallet mnemonic. Optionally you can set up MNEMONIC environment variable",
          type: "string",
        })
        .positional("depth", {
          describe: "number of accounts check",
          default: 10,
        })
        .demandOption(["account"]);
    },
    (argv) => {
      const depth = argv.depth ?? 10;
      const mnemonic = argv?.mnemonic ?? process.env?.MNEMONIC;
      if (!mnemonic) throw new Error("no mnemonic");
      const wallet = new ethers.Wallet.fromMnemonic(mnemonic);
      let finding;
      for (let i = 0; i < depth; i++) {
        const walletIdx = ethers.Wallet.fromMnemonic(wallet.mnemonic.phrase, `m/44'/60'/0'/0/${i}`);
        walletIdx.address == argv.account && (finding = walletIdx.privateKey);
      }
      console.log(finding ?? "Private key not found");
    }
  )
  .command(
    "fromPK",
    "Returns address from a given Private key",
    (yargs) => {
      return yargs.string("pk").positional("pk", {
        describe: "private key. Alternatively set PRIVATE_KEY enviroment variable",
        type: "string",
      });
    },
    (argv) => {
      const pk = argv?.pk ?? process.env?.PRIVATE_KEY;
      const wallet = new ethers.Wallet(pk);
      console.log(wallet.address);
    }
  )
  .command(
    "fundWallets",
    "fund wallets",
    (yargs) => {
      return yargs
        .positional("addresses", { describe: "addresses to send to" })
        .array("addresses")
        .string("addresses")
        .string("value")
        .demandOption(["addresses", "value", "RPC", "signer"])
        .positional("value", {
          describe: "value to send to each address",
        })
        .positional("RPC", {
          describe: "RPC rpovider",
        })
        .positional("signer", { describe: "signing wallet private key" });
    },
    async (argv) => {
      if (!argv.RPC) throw new Error("No RPC no fun");
      if (!argv.signer) throw new Error("No Signer no tx");
      const provider = new ethers.providers.JsonRpcProvider(argv.RPC);
      const seedingWallet = new ethers.Wallet(argv.signer, provider);
      console.log("argv.addresses", argv.addresses);
      for (const adr of argv.addresses) {
        const promises = [];
        if (ethers.utils.isAddress(adr)) {
          const tx = {
            to: adr,
            value: ethers.utils.parseEther(argv.value),
          };
          promises.push(seedingWallet.sendTransaction(tx));
        } else {
          console.error("not an address:", adr);
        }
        await Promise.all(promises)
          .then((results) => {
            console.log("All done", results);
          })
          .catch((e) => {
            console.error("Errors ", e);
          });
      }
    }
  )
  .command(
    "drop20",
    "create erc20 airdrop",
    (yargs) => {
      return yargs
        .positional("addresses", { describe: "addresses to send to" })
        .array("addresses")
        .string("addresses")
        .string("value")
        .positional("value", {
          describe: "value to send to each address",
        })
        .positional("RPC", {
          describe: "RPC rpovider (or set RPC_URL env)",
        })
        .positional("signer", { describe: "signing wallet private key" })
        .positional("contract", {
          describe: "contract address",
          demandOption: true,
          type: "string",
        })
        .option("transfer", {
          describe: "Make transfer instead of mint",
          type: "boolean",
        })
        .demandOption(["addresses", "value", "contract", "signer"]);
    },
    async (argv) => {
      const rpc = argv.RPC ?? process.env.RPC_URL;
      if (!rpc) throw new Error("RPC must be set in --RPC or export RPC_URL");
      const abi = ["function transfer(address to, uint256 value)", "function mint(address to, uint256 value)"];
      const provider = new ethers.providers.JsonRpcProvider(rpc);
      const seedingWallet = new ethers.Wallet(argv.signer, provider);
      const erc20Contract = new ethers.Contract(argv.contract, abi, seedingWallet);
      const value = ethers.utils.parseEther(argv.value);
      console.log("argv.addresses", argv.addresses);
      for (const adr of argv.addresses) {
        const promises = [];
        if (ethers.utils.isAddress(adr)) {
          promises.push(argv.transfer ? erc20Contract.transfer(adr, value) : erc20Contract.mint(adr, value));
        } else {
          console.error("not an address:", adr);
        }
        await Promise.all(promises)
          .then((results) => {
            console.log("All done", results);
          })
          .catch((e) => {
            console.error("Errors ", e);
          });
      }
    }
  )
  .parse();
