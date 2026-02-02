  const CONTRACT_ADDRESS = "0x723bd48913CFC218D1Ac458cD7A1202f99EdD7cA";

  const CONTRACT_ABI = [
    {
      "inputs": [{"internalType": "address", "name": "", "type": "address"}],
      "name": "hasMinted",
      "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "nextTokenId",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  let web3;
  let account;
  let contract;
  let tokenId;

  window.addEventListener('DOMContentLoaded', async () => {
    await autoConnect();
  });

  async function autoConnect() {
    const isWalletConnected = localStorage.getItem("isWalletConnected");
    const savedAccount = localStorage.getItem("connectedAccount");

    if (isWalletConnected === "true" && window.ethereum) {
      try {
        console.log("🔄 Auto-connecting wallet...");
        
        web3 = new Web3(window.ethereum);
        const accounts = await window.ethereum.request({ method: "eth_accounts" });

        if (accounts.length > 0 && accounts[0] === savedAccount) {
          account = accounts[0];
          console.log("✅ Auto-connected:", account);
          await loadTicket();
        } else {
          console.log("⚠️ Wallet state changed, please reconnect");
          showConnectSection();
        }
      } catch (error) {
        console.error("❌ Auto-connect failed:", error);
        showConnectSection();
      }
    } else {
      showConnectSection();
    }
  }

  function showConnectSection() {
    document.getElementById("connectSection").classList.remove("hidden");
    document.getElementById("ticketSection").classList.add("hidden");
  }

  async function connect() {
    if (!window.ethereum) {
      document.getElementById("connectStatus").innerHTML = 
        '<span class="text-red-400">❌ MetaMask not found! Please install MetaMask.</span>';
      setTimeout(() => {
        window.open("https://metamask.io/download/", "_blank");
      }, 2000);
      return;
    }

    try {
      document.getElementById("connectStatus").innerHTML = 
        '<span class="text-blue-400"><i class="fas fa-spinner fa-spin mr-2"></i>Connecting...</span>';

      web3 = new Web3(window.ethereum);
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      account = accounts[0];

      localStorage.setItem("isWalletConnected", "true");
      localStorage.setItem("connectedAccount", account);

      console.log("✅ Connected:", account);
      await loadTicket();

    } catch (error) {
      console.error("❌ Connection error:", error);
      document.getElementById("connectStatus").innerHTML = 
        '<span class="text-red-400">❌ Connection failed: ' + error.message + '</span>';
    }
  }

  async function loadTicket() {
    try {
      console.log("📋 Loading ticket for:", account);
      
      contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

      const hasMinted = await contract.methods.hasMinted(account).call();
      console.log("🎫 Has minted:", hasMinted);

      document.getElementById("connectSection").classList.add("hidden");
      document.getElementById("ticketSection").classList.remove("hidden");

      if (!hasMinted) {
        document.getElementById("noTicketSection").classList.remove("hidden");
        document.getElementById("hasTicketSection").classList.add("hidden");
        console.log("ℹ️ User has not minted a ticket yet");
        return;
      }

      document.getElementById("noTicketSection").classList.add("hidden");
      document.getElementById("hasTicketSection").classList.remove("hidden");

      const nextTokenId = await contract.methods.nextTokenId().call();
      tokenId = Number(nextTokenId) - 1;
      
      console.log("🎫 Token ID:", tokenId);

      document.getElementById("ticketTokenId").textContent = `#${tokenId}`;
      document.getElementById("ticketTokenIdDisplay").textContent = `#${tokenId}`;
      document.getElementById("ticketOwner").textContent = formatAddress(account);
      document.getElementById("contractAddress").textContent = CONTRACT_ADDRESS;

      const qrData = {
        t: tokenId,                   
        c: CONTRACT_ADDRESS,           
        w: account,                    
        e: "Web3Summit2026",           
        n: 80002,                       
        ts: Math.floor(Date.now()/1000) 
      };

      const payload = JSON.stringify(qrData);
      console.log("🔳 QR Payload size:", payload.length, "bytes");
      console.log("🔳 QR Data:", payload);

      document.getElementById("qrCodeDisplay").innerHTML = "";

      new QRCode(document.getElementById("qrCodeDisplay"), {
        text: payload,
        width: 220,
        height: 220,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.L  // ✅ Changed from H to L (Low error correction = smaller QR)
      });

      setupDownload();
      console.log("✅ Ticket loaded successfully");

    } catch (error) {
      console.error("❌ Load ticket error:", error);
      
      document.getElementById("connectSection").classList.remove("hidden");
      document.getElementById("ticketSection").classList.add("hidden");
      document.getElementById("connectStatus").innerHTML = 
        '<span class="text-red-400">❌ Failed to load ticket: ' + error.message + '</span>';
    }
  }

  function setupDownload() {
    document.getElementById("downloadQrBtn").onclick = () => {
      const qrCanvas = document.querySelector("#qrCodeDisplay canvas");
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
      });
    };
  }

  function formatAddress(address) {
    if (!address) return "";
    return address.substring(0, 6) + "..." + address.substring(38);
  }

  function viewOnExplorer() {
    const explorerUrl = `https://amoy.polygonscan.com/address/${CONTRACT_ADDRESS}`;
    window.open(explorerUrl, "_blank");
  }

  function disconnect() {
    account = null;
    web3 = null;
    contract = null;
    
    localStorage.removeItem("isWalletConnected");
    localStorage.removeItem("connectedAccount");
    
    document.getElementById("connectSection").classList.remove("hidden");
    document.getElementById("ticketSection").classList.add("hidden");
    document.getElementById("connectStatus").innerHTML = "";

    console.log("🔌 Wallet disconnected");
  }

  if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        account = accounts[0];
        localStorage.setItem("connectedAccount", account);
        location.reload();
      }
    });

    window.ethereum.on('chainChanged', () => {
      location.reload();
    });
  }