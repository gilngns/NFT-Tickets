let web3;
let userAccount = null;
let chainId = null;
let ticketContract = null;

const CONTRACT_ADDRESS = "0x723bd48913CFC218D1Ac458cD7A1202f99EdD7cA";

const CONTRACT_ABI = [
  {
    inputs: [],
    name: "mintTicket",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "hasMinted",
    outputs: [{ internalType: "bool", name: "", "type": "bool" }],
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
];

const NETWORKS = {
  1: "Ethereum Mainnet",
  5: "Goerli Testnet",
  11155111: "Sepolia Testnet",
  137: "Polygon Mainnet",
  80001: "Mumbai Testnet (Deprecated)",
  80002: "Polygon Amoy Testnet",
};

const TARGET_CHAIN_ID = 80002; 
const TARGET_CHAIN_HEX = "0x13882"; 
const TARGET_NETWORK_NAME = "Polygon Amoy Testnet";

document.addEventListener("DOMContentLoaded", () => {
  initializeWallet();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById("connectBtn")?.addEventListener("click", connectWallet);
  document.getElementById("disconnectBtn")?.addEventListener("click", disconnectWallet);
  document.getElementById("mintBtn")?.addEventListener("click", mintTicket);

  if (window.ethereum) {
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
  }
}

// ✅ DETECT MOBILE & METAMASK APP
function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isMetaMaskAppBrowser() {
  return /MetaMask/i.test(navigator.userAgent);
}

function openInMetaMaskApp() {
  const currentUrl = window.location.href;
  const metamaskAppDeepLink = `https://metamask.app.link/dapp/${currentUrl.replace(/^https?:\/\//, '')}`;
  
  console.log("📱 Redirecting to MetaMask app:", metamaskAppDeepLink);
  window.location.href = metamaskAppDeepLink;
}

async function initializeWallet() {
  const isWalletConnected = localStorage.getItem("isWalletConnected");

  if (isWalletConnected === "true" && window.ethereum) {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });

      if (accounts.length > 0) {
        userAccount = accounts[0];
        web3 = new Web3(window.ethereum);
        chainId = await web3.eth.getChainId();

        initializeContract();
        await checkMintStatus();

        updateWalletUI(true);
        updateNetworkDisplay();
        updateMintButtonState();

        console.log("✅ Auto-reconnected:", userAccount);
        console.log("📡 Chain ID:", chainId);
      } else {
        clearWalletData();
      }
    } catch (error) {
      console.error("❌ Auto-connect error:", error);
      clearWalletData();
    }
  }

  updateMintButtonState();
}

function initializeContract() {
  if (web3 && CONTRACT_ADDRESS && CONTRACT_ADDRESS !== "YOUR_CONTRACT_ADDRESS_ON_AMOY") {
    ticketContract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
    console.log("📄 Contract initialized:", CONTRACT_ADDRESS);
  } else {
    console.warn("⚠️ Contract address not set. Please update CONTRACT_ADDRESS.");
  }
}

async function connectWallet() {
  try {
    // ✅ CHECK IF MOBILE & NOT IN METAMASK APP
    if (isMobile() && !window.ethereum && !isMetaMaskAppBrowser()) {
      showStatus("Redirecting to MetaMask app...", "loading");
      
      // Wait 1 second then redirect
      setTimeout(() => {
        openInMetaMaskApp();
      }, 1000);
      
      return;
    }

    if (!window.ethereum) {
      showStatus("MetaMask not detected! Please install MetaMask.", "error");
      
      // Open MetaMask download page based on device
      setTimeout(() => {
        if (isMobile()) {
          // Detect Android or iOS
          const isAndroid = /Android/i.test(navigator.userAgent);
          const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
          
          if (isAndroid) {
            window.open("https://play.google.com/store/apps/details?id=io.metamask", "_blank");
          } else if (isIOS) {
            window.open("https://apps.apple.com/app/metamask/id1438144202", "_blank");
          } else {
            window.open("https://metamask.io/download/", "_blank");
          }
        } else {
          window.open("https://metamask.io/download/", "_blank");
        }
      }, 2000);
      
      return;
    }

    showStatus("Connecting to wallet...", "loading");

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    userAccount = accounts[0];
    web3 = new Web3(window.ethereum);
    chainId = await web3.eth.getChainId();

    initializeContract();
    await checkMintStatus();

    localStorage.setItem("isWalletConnected", "true");
    localStorage.setItem("connectedAccount", userAccount);

    updateWalletUI(true);
    updateNetworkDisplay();
    updateMintButtonState();

    showStatus("Wallet connected successfully! 🎉", "success");

    console.log("✅ Connected:", userAccount);
    console.log("📡 Chain ID:", chainId);

    // Check network
    if (Number(chainId) !== TARGET_CHAIN_ID) {
      showStatus(`⚠️ Please switch to ${TARGET_NETWORK_NAME}`, "error");
      setTimeout(() => {
        promptNetworkSwitch();
      }, 2000);
    }

    // ✅ Generate QR after successful mint
    await generateQRAfterConnection();

  } catch (error) {
    console.error("❌ Connection error:", error);

    if (error.code === 4001) {
      showStatus("Connection rejected by user", "error");
    } else {
      showStatus("Failed to connect: " + error.message, "error");
    }
  }
}

function disconnectWallet() {
  userAccount = null;
  chainId = null;
  web3 = null;
  ticketContract = null;

  clearWalletData();

  updateWalletUI(false);
  updateNetworkDisplay();
  updateMintButtonState();

  showStatus("Wallet disconnected", "info");
}

function clearWalletData() {
  localStorage.removeItem("isWalletConnected");
  localStorage.removeItem("connectedAccount");
}

async function checkMintStatus() {
  if (!ticketContract || !userAccount) return;

  try {
    const hasMinted = await ticketContract.methods.hasMinted(userAccount).call();
    const mintBtn = document.getElementById("mintBtn");

    if (hasMinted) {
      if (mintBtn) {
        mintBtn.disabled = true;
        mintBtn.innerHTML = `
          <span class="flex items-center justify-center gap-3">
            <i class="fas fa-check-circle text-2xl"></i>
            <span>Already Minted</span>
          </span>
        `;
        mintBtn.classList.add("opacity-50", "cursor-not-allowed");
      }

      showStatus("You have already minted a ticket!", "info");

      const balance = await ticketContract.methods.balanceOf(userAccount).call();
      console.log("🎫 Tickets owned:", balance);

      // ✅ Show QR if already minted
      const nextTokenId = await ticketContract.methods.nextTokenId().call();
      const tokenId = Number(nextTokenId) - 1;
      await generateQR(tokenId);

    } else {
      if (mintBtn) {
        mintBtn.disabled = false;
        mintBtn.innerHTML = `
          <span class="flex items-center justify-center gap-3">
            <i class="fas fa-wand-magic-sparkles text-2xl group-hover:rotate-12 transition-transform"></i>
            <span>Mint Ticket NFT</span>
          </span>
        `;
        mintBtn.classList.remove("opacity-50", "cursor-not-allowed");
      }
    }
  } catch (error) {
    console.error("❌ Check mint status error:", error);
  }
}

function updateWalletUI(isConnected) {
  const connectBtn = document.getElementById("connectBtn");
  const walletInfo = document.getElementById("walletInfo");
  const walletAddress = document.getElementById("walletAddress");

  if (isConnected && userAccount) {
    connectBtn?.classList.add("hidden");
    walletInfo?.classList.remove("hidden");
    walletInfo?.classList.add("flex");

    const formattedAddress = formatAddress(userAccount);
    if (walletAddress) {
      walletAddress.textContent = formattedAddress;
    }
  } else {
    connectBtn?.classList.remove("hidden");
    walletInfo?.classList.add("hidden");
    walletInfo?.classList.remove("flex");
  }
}

function updateNetworkDisplay() {
  const networkName = document.getElementById("networkName");
  if (!networkName) return;

  if (chainId) {
    const networkText = NETWORKS[chainId] || `Chain ID: ${chainId}`;
    networkName.textContent = networkText;

    if (Number(chainId) !== TARGET_CHAIN_ID) {
      networkName.classList.add("text-yellow-400");
      networkName.classList.remove("text-white");
    } else {
      networkName.classList.remove("text-yellow-400");
      networkName.classList.add("text-white");
    }
  } else {
    networkName.textContent = "Not Connected";
    networkName.classList.remove("text-yellow-400");
  }
}

function updateMintButtonState() {
  const mintBtn = document.getElementById("mintBtn");
  if (!mintBtn) return;
  if (mintBtn.innerHTML.includes("Already Minted")) return;

  if (userAccount) {
    mintBtn.disabled = false;
    mintBtn.classList.remove("opacity-50", "cursor-not-allowed");
  } else {
    mintBtn.disabled = true;
    mintBtn.classList.add("opacity-50", "cursor-not-allowed");
  }
}

function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    disconnectWallet();
  } else if (accounts[0] !== userAccount) {
    userAccount = accounts[0];
    localStorage.setItem("connectedAccount", userAccount);

    checkMintStatus();
    updateWalletUI(true);

    showStatus("Switched to: " + formatAddress(userAccount), "info");
  }
}

function handleChainChanged(_chainId) {
  window.location.reload();
}

async function mintTicket() {
  if (!userAccount) {
    showStatus("Please connect your wallet first!", "error");
    return;
  }

  if (!ticketContract) {
    showStatus("Contract not initialized! Update CONTRACT_ADDRESS.", "error");
    return;
  }

  try {
    showStatus("Checking network...", "loading");

    if (Number(chainId) !== TARGET_CHAIN_ID) {
      showStatus(`Please switch to ${TARGET_NETWORK_NAME}`, "error");
      await promptNetworkSwitch();
      return;
    }

    showStatus("Checking eligibility...", "loading");

    const hasMinted = await ticketContract.methods.hasMinted(userAccount).call();
    if (hasMinted) {
      showStatus("You have already minted a ticket!", "error");
      await checkMintStatus();
      return;
    }

    const maxSupply = await ticketContract.methods.maxSupply().call();
    const nextTokenId = await ticketContract.methods.nextTokenId().call();

    if (Number(nextTokenId) >= Number(maxSupply)) {
      showStatus("All tickets have been minted!", "error");
      return;
    }

    showStatus("Please confirm transaction in MetaMask...", "loading");

    const tx = await ticketContract.methods.mintTicket().send({
      from: userAccount,
      gas: 300000,
    });

    console.log("✅ Transaction:", tx.transactionHash);

    const mintedTokenId = Number(nextTokenId);

    showStatus("Ticket minted successfully! 🎉", "success");

    await checkMintStatus();

    const tokenIdElement = document.getElementById("tokenIdDisplay");
    if (tokenIdElement) {
      tokenIdElement.textContent = `#${mintedTokenId}`;
    }

    // ✅ Generate QR Code
    await generateQR(mintedTokenId);

    setTimeout(() => {
      const explorerUrl = `https://amoy.polygonscan.com/tx/${tx.transactionHash}`;
      showStatus(`<a href="${explorerUrl}" target="_blank" class="underline hover:text-emerald-300">View on PolygonScan</a>`, "success");
    }, 3000);

  } catch (error) {
    console.error("❌ Minting error:", error);

    if (error.code === 4001) {
      showStatus("Transaction rejected by user", "error");
    } else if (error.message?.includes("Already minted")) {
      showStatus("You have already minted a ticket!", "error");
      await checkMintStatus();
    } else if (error.message?.includes("Max supply")) {
      showStatus("All tickets have been minted!", "error");
    } else {
      showStatus("Minting failed: " + (error.message || "Unknown error"), "error");
    }
  }
}

// ✅ GENERATE QR CODE FUNCTION
async function generateQR(tokenId) {
  const qrSection = document.getElementById("qrSection");
  const qrContainer = document.getElementById("qrCodeContainer");
  const qrTokenId = document.getElementById("qrTokenId");
  const qrWallet = document.getElementById("qrWallet");

  if (!qrSection || !qrContainer) {
    console.error("❌ QR elements not found in DOM");
    return;
  }

  // ✅ SHORTENED QR PAYLOAD
  const qrData = {
    t: tokenId,
    c: CONTRACT_ADDRESS,
    w: userAccount,
    e: "Web3Summit2026",
    n: TARGET_CHAIN_ID,
    ts: Math.floor(Date.now()/1000)
  };

  const payload = JSON.stringify(qrData);
  console.log("🔳 Generating QR Code with payload:", payload);
  console.log("📏 Payload size:", payload.length, "bytes");

  qrContainer.innerHTML = "";

  try {
    if (typeof QRCode === 'undefined') {
      console.error("❌ QRCode library not loaded!");
      showStatus("QR Code library not loaded. Please refresh the page.", "error");
      return;
    }

    new QRCode(qrContainer, {
      text: payload,
      width: 256,
      height: 256,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.L
    });

    if (qrTokenId) qrTokenId.textContent = `#${tokenId}`;
    if (qrWallet) qrWallet.textContent = userAccount;

    qrSection.classList.remove("hidden");
    
    setTimeout(() => {
      qrSection.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);

    console.log("✅ QR Code generated successfully");
    setupQRDownload(tokenId);

  } catch (error) {
    console.error("❌ QR generation failed:", error);
    showStatus("Failed to generate QR code: " + error.message, "error");
  }
}

// ✅ Generate QR after connection if already minted
async function generateQRAfterConnection() {
  if (!ticketContract || !userAccount) return;

  try {
    const hasMinted = await ticketContract.methods.hasMinted(userAccount).call();
    if (hasMinted) {
      const nextTokenId = await ticketContract.methods.nextTokenId().call();
      const tokenId = Number(nextTokenId) - 1;
      await generateQR(tokenId);
    }
  } catch (error) {
    console.error("❌ Error checking mint status for QR:", error);
  }
}

// ✅ Setup QR Download
function setupQRDownload(tokenId) {
  const downloadBtn = document.getElementById("downloadQrBtn");
  if (!downloadBtn) return;

  downloadBtn.onclick = () => {
    const qrCanvas = document.querySelector("#qrCodeContainer canvas");
    if (!qrCanvas) {
      alert("QR Code not found!");
      return;
    }

    qrCanvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `nft-ticket-${tokenId}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log("✅ QR Code downloaded");
      showStatus("QR Code downloaded successfully!", "success");
    });
  };
}

async function promptNetworkSwitch() {
  if (confirm(`Switch to ${TARGET_NETWORK_NAME}?`)) {
    await switchToAmoyNetwork();
  }
}

async function switchToAmoyNetwork() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: TARGET_CHAIN_HEX }],
    });
    showStatus("Switched to Amoy Testnet!", "success");
  } catch (switchError) {
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: TARGET_CHAIN_HEX,
              chainName: TARGET_NETWORK_NAME,
              nativeCurrency: {
                name: "MATIC",
                symbol: "MATIC",
                decimals: 18,
              },
              rpcUrls: ["https://rpc-amoy.polygon.technology/"],
              blockExplorerUrls: ["https://amoy.polygonscan.com/"],
            },
          ],
        });
        showStatus("Amoy Testnet added successfully!", "success");
      } catch (addError) {
        console.error("❌ Failed to add network:", addError);
        showStatus("Failed to add network", "error");
      }
    } else {
      console.error("❌ Failed to switch network:", switchError);
      showStatus("Failed to switch network", "error");
    }
  }
}

function showStatus(message, type = "info") {
  const statusBox = document.getElementById("statusBox");
  if (!statusBox) return;

  const icons = {
    loading: '<i class="fas fa-spinner fa-spin"></i>',
    success: '<i class="fas fa-check-circle"></i>',
    error: '<i class="fas fa-exclamation-circle"></i>',
    info: '<i class="fas fa-info-circle"></i>',
  };

  const colors = {
    loading: "text-blue-400",
    success: "text-emerald-400",
    error: "text-red-400",
    info: "text-gray-400",
  };

  statusBox.innerHTML = `
    <div class="flex items-center justify-center gap-2 ${colors[type]}">
      ${icons[type]}
      <span>${message}</span>
    </div>
  `;

  if (type === "success" || type === "error") {
    setTimeout(() => {
      statusBox.innerHTML = "";
    }, 7000);
  }
}

function formatAddress(address) {
  if (!address) return "";
  return address.substring(0, 6) + "..." + address.substring(38);
}

async function getBalance(address) {
  if (!web3 || !address) return "0";
  try {
    const balance = await web3.eth.getBalance(address);
    return web3.utils.fromWei(balance, "ether");
  } catch (error) {
    console.error("❌ Balance error:", error);
    return "0";
  }
}

window.walletConnection = {
  connectWallet,
  disconnectWallet,
  isConnected: () => !!userAccount,
  getAccount: () => userAccount,
  getChainId: () => chainId,
  getWeb3: () => web3,
  getContract: () => ticketContract,
  getBalance,
  checkMintStatus,
  switchToAmoyNetwork,
  mintTicket,
  isMobile,
  isMetaMaskAppBrowser
};