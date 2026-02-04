/* =========================================================
   WALLET.JS — NFT TICKET (ADMIN GASLESS MINT)
   FINAL VERSION — CLEAN & SAFE
   ========================================================= */

let web3;
let userAccount = null;
let adminAccount = null;
let chainId = null;
let ticketContract = null;

/* =========================
   CONFIG
========================= */
const CONTRACT_ADDRESS = "0x562d1f41dC3A3237F38A0897a258fF1344db8cDF";
const ADMIN_ADDRESS    = "0x6b095ACd5Ce3da41a5E2394Bf4642C3ecbfB877c";

const TARGET_CHAIN_ID  = 80002;
const TARGET_CHAIN_HEX = "0x13882";
const TARGET_NETWORK_NAME = "Polygon Amoy Testnet";

/* =========================
   ABI
========================= */
const CONTRACT_ABI = [
  {
    inputs: [{ internalType: "address", name: "to", type: "address" }],
    name: "mintFor",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "hasMinted",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "nextTokenId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "maxSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "to", type: "address" },
      { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" }
    ],
    name: "TicketMinted",
    type: "event"
  }
];

/* =========================
   NETWORK MAP
========================= */
const NETWORKS = {
  1: "Ethereum Mainnet",
  5: "Goerli Testnet",
  11155111: "Sepolia Testnet",
  137: "Polygon Mainnet",
  80001: "Mumbai (Deprecated)",
  80002: "Polygon Amoy Testnet",
};

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
  initializeWallet();
  setupEventListeners();
});

/* =========================
   EVENT LISTENERS
========================= */
function setupEventListeners() {
  document.getElementById("connectBtn")?.addEventListener("click", connectWallet);
  document.getElementById("disconnectBtn")?.addEventListener("click", disconnectWallet);
  document.getElementById("mintBtn")?.addEventListener("click", mintTicket);

  if (window.ethereum) {
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", () => window.location.reload());
  }
}

/* =========================
   WALLET INIT
========================= */
async function initializeWallet() {
  if (!window.ethereum) return;

  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  if (accounts.length === 0) return;

  const account = accounts[0];

  if (account.toLowerCase() === ADMIN_ADDRESS.toLowerCase()) {
    adminAccount = account;
  } else {
    userAccount = account;
  }

  web3 = new Web3(window.ethereum);
  chainId = await web3.eth.getChainId();

  initializeContract();
  updateWalletUI(true);
  updateNetworkDisplay();
  updateMintButtonState();

  if (userAccount) {
    await checkMintStatus();
  }
}

/* =========================
   CONTRACT INIT
========================= */
function initializeContract() {
  ticketContract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
}

/* =========================
   CONNECT WALLET
========================= */
async function connectWallet() {
  if (!window.ethereum) {
    showStatus("MetaMask not detected", "error");
    return;
  }

  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });

  const account = accounts[0];

  if (account.toLowerCase() === ADMIN_ADDRESS.toLowerCase()) {
    adminAccount = account;
    userAccount = null;
    showStatus("Admin wallet connected", "success");
  } else {
    userAccount = account;
    showStatus("Wallet connected", "success");
  }

  web3 = new Web3(window.ethereum);
  chainId = await web3.eth.getChainId();

  initializeContract();
  updateWalletUI(true);
  updateNetworkDisplay();
  updateMintButtonState();

  if (userAccount) {
    await checkMintStatus();
  }

  if (chainId !== TARGET_CHAIN_ID) {
    setTimeout(promptNetworkSwitch, 800);
  }
}

/* =========================
   DISCONNECT
========================= */
function disconnectWallet() {
  userAccount = null;
  adminAccount = null;
  web3 = null;
  ticketContract = null;

  updateWalletUI(false);
  updateNetworkDisplay();
  updateMintButtonState();

  showStatus("Wallet disconnected", "info");
}

/* =========================
   ACCOUNT CHANGE
========================= */
function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    disconnectWallet();
    return;
  }

  const account = accounts[0];

  if (account.toLowerCase() === ADMIN_ADDRESS.toLowerCase()) {
    adminAccount = account;
    userAccount = null;
  } else {
    userAccount = account;
    adminAccount = null;
  }

  updateWalletUI(true);
  updateMintButtonState();
  checkMintStatus();
}

/* =========================
   MINT STATUS
========================= */
async function checkMintStatus() {
  if (!ticketContract || !userAccount) return;

  const hasMinted = await ticketContract.methods.hasMinted(userAccount).call();
  const mintBtn = document.getElementById("mintBtn");

  if (hasMinted) {
    mintBtn.disabled = true;
    mintBtn.innerHTML = "Already Minted";
    mintBtn.classList.add("opacity-50");
  } else {
    mintBtn.disabled = false;
    mintBtn.innerHTML = "Mint Ticket NFT";
    mintBtn.classList.remove("opacity-50");
  }
}

/* =========================
   MINT (ADMIN GAS)
========================= */
async function mintTicket() {
  if (!userAccount) {
    showStatus("Connect wallet first", "error");
    return;
  }

  if (!adminAccount) {
    showStatus("Admin wallet not connected", "error");
    return;
  }

  if (chainId !== TARGET_CHAIN_ID) {
    await promptNetworkSwitch();
    return;
  }

  try {
    showStatus("Minting ticket...", "loading");

    const tx = await ticketContract.methods.mintFor(userAccount).send({
      from: adminAccount,
      gas: 300000,
    });

    const tokenId = tx.events.TicketMinted.returnValues.tokenId;

    showStatus("Mint success!", "success");
    document.getElementById("tokenIdDisplay").textContent = `#${tokenId}`;

    await generateQR(tokenId);

  } catch (err) {
    console.error(err);
    showStatus("Mint failed", "error");
  }
}

/* =========================
   QR GENERATOR
========================= */
async function generateQR(tokenId) {
  const qrContainer = document.getElementById("qrCodeContainer");
  const qrSection = document.getElementById("qrSection");

  if (!qrContainer || !qrSection) return;

  const payload = JSON.stringify({
    t: tokenId,
    c: CONTRACT_ADDRESS,
    w: userAccount,
    n: TARGET_CHAIN_ID,
    ts: Math.floor(Date.now() / 1000),
  });

  qrContainer.innerHTML = "";

  new QRCode(qrContainer, {
    text: payload,
    width: 256,
    height: 256,
    correctLevel: QRCode.CorrectLevel.L,
  });

  document.getElementById("qrTokenId").textContent = `#${tokenId}`;
  document.getElementById("qrWallet").textContent = userAccount;

  qrSection.classList.remove("hidden");
}

/* =========================
   NETWORK
========================= */
function updateNetworkDisplay() {
  const el = document.getElementById("networkName");
  if (!el) return;

  el.textContent = NETWORKS[chainId] || "Unknown Network";
}

async function promptNetworkSwitch() {
  await switchToAmoyNetwork();
}

async function switchToAmoyNetwork() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: TARGET_CHAIN_HEX }],
    });
  } catch (e) {
    console.error(e);
  }
}

/* =========================
   UI HELPERS
========================= */
function updateWalletUI(isConnected) {
  const connectBtn = document.getElementById("connectBtn");
  const walletInfo = document.getElementById("walletInfo");
  const walletAddress = document.getElementById("walletAddress");

  if (isConnected && userAccount) {
    connectBtn?.classList.add("hidden");
    walletInfo?.classList.remove("hidden");
    walletAddress.textContent = formatAddress(userAccount);
  } else {
    connectBtn?.classList.remove("hidden");
    walletInfo?.classList.add("hidden");
  }
}

function updateMintButtonState() {
  const mintBtn = document.getElementById("mintBtn");
  if (!mintBtn) return;
  mintBtn.disabled = !userAccount;
}

function showStatus(message, type) {
  const box = document.getElementById("statusBox");
  if (!box) return;
  box.textContent = message;
}

/* =========================
   UTIL
========================= */
function formatAddress(addr) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

/* =========================
   EXPORT
========================= */
window.walletConnection = {
  connectWallet,
  disconnectWallet,
  mintTicket,
};
