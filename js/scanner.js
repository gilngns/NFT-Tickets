    const CONTRACT_ADDRESS = "0x723bd48913CFC218D1Ac458cD7A1202f99EdD7cA";
    const TARGET_CHAIN_ID = 80002; 
    const CONTRACT_ABI = [
      {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "ownerOf",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
      }
    ];

    let html5QrCode;
    let web3;
    let contract;

    // Initialize Web3
    async function initWeb3() {
      if (typeof window.ethereum !== 'undefined') {
        web3 = new Web3(window.ethereum);
        contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
        console.log("✅ Web3 initialized");
      } else {
        console.error("❌ MetaMask not found");
      }
    }

    // Switch between camera and manual mode
    function switchMode(mode) {
      if (mode === 'camera') {
        document.getElementById('cameraSection').classList.remove('hidden');
        document.getElementById('manualSection').classList.add('hidden');
        document.getElementById('cameraBtn').className = 'px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 neon-border text-white font-semibold';
        document.getElementById('manualBtn').className = 'px-6 py-3 rounded-xl glass-card border border-indigo-500/50 text-gray-300 hover:neon-border transition-all';
      } else {
        document.getElementById('cameraSection').classList.add('hidden');
        document.getElementById('manualSection').classList.remove('hidden');
        document.getElementById('manualBtn').className = 'px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 neon-border text-white font-semibold';
        document.getElementById('cameraBtn').className = 'px-6 py-3 rounded-xl glass-card border border-indigo-500/50 text-gray-300 hover:neon-border transition-all';
        stopScanning();
      }
    }

    // Start QR scanning
    function startScanning() {
      html5QrCode = new Html5Qrcode("qr-reader");
      
      const config = { 
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      html5QrCode.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        onScanError
      ).then(() => {
        console.log("📷 Camera started");
        document.getElementById('startScanBtn').classList.add('hidden');
        document.getElementById('stopScanBtn').classList.remove('hidden');
      }).catch(err => {
        console.error("❌ Camera error:", err);
        alert("Failed to start camera. Please allow camera permissions.");
      });
    }

    // Stop scanning
    function stopScanning() {
      if (html5QrCode) {
        html5QrCode.stop().then(() => {
          console.log("📷 Camera stopped");
          document.getElementById('startScanBtn').classList.remove('hidden');
          document.getElementById('stopScanBtn').classList.add('hidden');
        }).catch(err => {
          console.error("Error stopping camera:", err);
        });
      }
    }

    // On QR scan success
    function onScanSuccess(decodedText, decodedResult) {
      console.log("🔍 QR Scanned:", decodedText);
      stopScanning();
      verifyTicket(decodedText);
    }

    // On QR scan error (ignore)
    function onScanError(error) {
      // Ignore scan errors
    }

    // Manual verification
    function verifyManual() {
      const input = document.getElementById('qrInput').value.trim();
      if (!input) {
        alert("Please paste QR data");
        return;
      }
      verifyTicket(input);
    }

    // Verify ticket on blockchain
    async function verifyTicket(qrData) {
      try {
        // Parse QR data
        const data = JSON.parse(qrData);
        
        // Support both old and new format
        const tokenId = data.t || data.tokenId;
        const contractAddr = data.c || data.contract;
        const walletAddr = data.w || data.wallet;
        const event = data.e || data.event;
        const chainId = data.n || data.chainId;

        console.log("📋 Parsed data:", { tokenId, contractAddr, walletAddr, event, chainId });

        // Validate contract address
        if (contractAddr.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
          showInvalidTicket("Wrong contract address", `Expected: ${CONTRACT_ADDRESS}\nGot: ${contractAddr}`);
          return;
        }

        // Validate chain ID
        if (chainId !== TARGET_CHAIN_ID) {
          showInvalidTicket("Wrong network", `Expected: Polygon Amoy (${TARGET_CHAIN_ID})\nGot: ${chainId}`);
          return;
        }

        // Show loading
        showStatus("Verifying on blockchain...", "⏳", "text-blue-400");

        // Verify ownership on blockchain
        const owner = await contract.methods.ownerOf(tokenId).call();
        console.log("🔍 Blockchain owner:", owner);
        console.log("🎫 QR wallet:", walletAddr);

        if (owner.toLowerCase() === walletAddr.toLowerCase()) {
          showValidTicket(tokenId, event, walletAddr, contractAddr);
        } else {
          showInvalidTicket("Ownership mismatch", `Blockchain owner: ${owner}\nQR wallet: ${walletAddr}`);
        }

      } catch (error) {
        console.error("❌ Verification error:", error);
        
        if (error.message.includes("ERC721")) {
          showInvalidTicket("Token does not exist", "This token ID has not been minted");
        } else if (error.message.includes("JSON")) {
          showInvalidTicket("Invalid QR format", "Failed to parse QR data");
        } else {
          showInvalidTicket("Verification failed", error.message);
        }
      }
    }

    // Show status message
    function showStatus(message, icon, colorClass) {
      const section = document.getElementById('statusSection');
      const iconEl = document.getElementById('statusIcon');
      const titleEl = document.getElementById('statusTitle');
      
      section.classList.remove('hidden');
      iconEl.innerHTML = `<div class="text-6xl">${icon}</div>`;
      titleEl.textContent = message;
      titleEl.className = `text-3xl font-bold ${colorClass}`;
    }

    // Show valid ticket
    function showValidTicket(tokenId, event, owner, contract) {
      document.getElementById('statusSection').classList.add('hidden');
      document.getElementById('resultSection').classList.remove('hidden');
      document.getElementById('validTicket').classList.remove('hidden');
      document.getElementById('invalidTicket').classList.add('hidden');

      document.getElementById('validTokenId').textContent = `#${tokenId}`;
      document.getElementById('validEvent').textContent = event.replace(/([A-Z])/g, ' $1').trim();
      document.getElementById('validOwner').textContent = owner;
      document.getElementById('validContract').textContent = contract;
      document.getElementById('validNetwork').textContent = 'Polygon Amoy Testnet';

      console.log("✅ Valid ticket displayed");
    }

    // Show invalid ticket
    function showInvalidTicket(reason, details) {
      document.getElementById('statusSection').classList.add('hidden');
      document.getElementById('resultSection').classList.remove('hidden');
      document.getElementById('validTicket').classList.add('hidden');
      document.getElementById('invalidTicket').classList.remove('hidden');

      document.getElementById('invalidReason').textContent = reason;
      document.getElementById('invalidDetails').textContent = details;

      console.log("❌ Invalid ticket displayed:", reason);
    }

    // Reset scanner
    function resetScanner() {
      document.getElementById('resultSection').classList.add('hidden');
      document.getElementById('statusSection').classList.add('hidden');
      document.getElementById('qrInput').value = '';
      
      if (document.getElementById('cameraSection').classList.contains('hidden')) {
        switchMode('manual');
      } else {
        startScanning();
      }
    }

    // Initialize on page load
    window.addEventListener('DOMContentLoaded', () => {
      initWeb3();
    });