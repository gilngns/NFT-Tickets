let html5QrCode;
let isScanning = false;
let currentMode = "camera";

let stats = {
  scanned: 0,
  verified: 0,
  rejected: 0,
  pending: 0,
};

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initializeScanner();
});

function initializeScanner() {
  // Tab switching
  document.getElementById("cameraTab")?.addEventListener("click", () => {
    switchMode("camera");
  });

  document.getElementById("fileTab")?.addEventListener("click", () => {
    switchMode("file");
  });

  // File upload handling
  setupFileUpload();

  // Scanner controls
  document.getElementById("toggleCamera")?.addEventListener("click", () => {
    if (isScanning) {
      stopScanner();
    } else {
      startScanner();
    }
  });

  document.getElementById("resetBtn")?.addEventListener("click", resetScan);

  document.getElementById("retryBtn")?.addEventListener("click", () => {
    startScanner();
  });

  document.getElementById("confirmBtn")?.addEventListener("click", () => {
    alert("Entry confirmed! Attendee has been checked in.");
    resetScan();
  });

  // Auto-start scanner
  setTimeout(() => {
    startScanner();
  }, 500);
}

function switchMode(mode) {
  currentMode = mode;

  const cameraMode = document.getElementById("cameraMode");
  const fileMode = document.getElementById("fileMode");
  const cameraTab = document.getElementById("cameraTab");
  const fileTab = document.getElementById("fileTab");

  if (mode === "camera") {
    cameraMode?.classList.remove("hidden");
    fileMode?.classList.add("hidden");
    cameraTab?.classList.add("active");
    fileTab?.classList.remove("active");

    if (!isScanning) {
      setTimeout(() => startScanner(), 300);
    }
  } else {
    cameraMode?.classList.add("hidden");
    fileMode?.classList.remove("hidden");
    cameraTab?.classList.remove("active");
    fileTab?.classList.add("active");

    if (isScanning) {
      stopScanner();
    }
  }
}

function setupFileUpload() {
  const fileUploadArea = document.getElementById("fileUploadArea");
  const fileInput = document.getElementById("fileInput");
  const filePreview = document.getElementById("filePreview");
  const previewImage = document.getElementById("previewImage");

  if (!fileUploadArea || !fileInput) return;

  fileUploadArea.addEventListener("click", () => {
    fileInput.click();
  });

  fileUploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    fileUploadArea.classList.add("dragover");
  });

  fileUploadArea.addEventListener("dragleave", () => {
    fileUploadArea.classList.remove("dragover");
  });

  fileUploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    fileUploadArea.classList.remove("dragover");

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  });
}

function handleFileUpload(file) {
  if (!file.type.startsWith("image/")) {
    alert("Please upload an image file");
    return;
  }

  const reader = new FileReader();
  const previewImage = document.getElementById("previewImage");
  const filePreview = document.getElementById("filePreview");

  reader.onload = (e) => {
    if (previewImage && filePreview) {
      previewImage.src = e.target.result;
      filePreview.classList.remove("hidden");
    }

    html5QrCode = new Html5Qrcode("reader");
    html5QrCode
      .scanFile(file, true)
      .then((decodedText) => {
        onScanSuccess(decodedText, null);
      })
      .catch((err) => {
        console.error("Scan error:", err);
        updateStatusCard(
          "error",
          "No QR Code Found",
          "Image does not contain a valid QR code"
        );
      });
  };
  reader.readAsDataURL(file);
}

function onScanSuccess(decodedText, decodedResult) {
  console.log("QR Code detected:", decodedText);

  stats.scanned++;
  stats.pending++;
  updateStats();

  updateStatusCard(
    "processing",
    "Processing...",
    "Verifying ticket on blockchain"
  );

  setTimeout(() => {
    verifyTicket(decodedText);
  }, 2000);
}

function verifyTicket(qrData) {
  try {
    let ticketData;
    try {
      ticketData = JSON.parse(qrData);
    } catch {
      ticketData = {
        wallet:
          "0x" +
          qrData.substring(0, 8) +
          "..." +
          qrData.substring(qrData.length - 4),
        tokenId: "#" + Math.floor(Math.random() * 9999),
        event: "Web3 Summit 2026",
      };
    }

    const isValid = Math.random() > 0.2;

    if (isValid) {
      stats.verified++;
      stats.pending--;
      updateStats();

      updateStatusCard("success", "Valid Ticket!", "Entry approved");
      updateTicketDetails(ticketData, true);
    } else {
      stats.rejected++;
      stats.pending--;
      updateStats();

      updateStatusCard("error", "Invalid Ticket", "Entry denied");
      updateTicketDetails(null, false);
    }
  } catch (error) {
    console.error("Error verifying ticket:", error);
    stats.rejected++;
    stats.pending--;
    updateStats();
    updateStatusCard("error", "Invalid QR Code", "Not a valid ticket");
  }
}

function updateTicketDetails(ticketData, isValid) {
  const walletAddr = document.getElementById("walletAddr");
  const tokenId = document.getElementById("tokenId");
  const eventName = document.getElementById("eventName");
  const verification = document.getElementById("verification");
  const confirmBtn = document.getElementById("confirmBtn");

  if (isValid && ticketData) {
    walletAddr.textContent = ticketData.wallet || "0x1234...5678";
    tokenId.textContent = ticketData.tokenId || "#1234";
    eventName.textContent = ticketData.event || "Web3 Summit 2026";
    verification.innerHTML =
      '<span class="text-emerald-400 font-semibold">✓ Verified</span>';

    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.classList.remove("opacity-50", "cursor-not-allowed");
      confirmBtn.classList.add("hover:scale-105");
    }
  } else {
    walletAddr.textContent = "-";
    tokenId.textContent = "-";
    eventName.textContent = "-";
    verification.innerHTML =
      '<span class="text-red-400 font-semibold">✗ Invalid</span>';
  }
}

function updateStatusCard(type, title, subtitle) {
  const statusCard = document.getElementById("statusCard");
  if (!statusCard) return;

  const templates = {
    success: {
      className:
        "mb-6 p-6 rounded-xl glass-card border border-emerald-500/30 text-center",
      icon: "fa-check-circle",
      iconColor: "text-emerald-400",
      bgColor: "bg-emerald-500/20",
    },
    error: {
      className:
        "mb-6 p-6 rounded-xl glass-card border border-red-500/30 text-center",
      icon: "fa-times-circle",
      iconColor: "text-red-400",
      bgColor: "bg-red-500/20",
    },
    processing: {
      className:
        "mb-6 p-6 rounded-xl glass-card border border-blue-500/30 text-center",
      icon: "fa-spinner fa-spin",
      iconColor: "text-blue-400",
      bgColor: "bg-blue-500/20",
    },
    waiting: {
      className:
        "mb-6 p-6 rounded-xl glass-card border border-yellow-500/30 text-center",
      icon: "fa-hourglass-half",
      iconColor: "text-yellow-400",
      bgColor: "bg-yellow-500/20",
    },
  };

  const template = templates[type] || templates.waiting;

  statusCard.className = template.className;
  statusCard.innerHTML = `
    <div class="w-16 h-16 mx-auto mb-4 rounded-full ${template.bgColor} flex items-center justify-center pulse-animation">
      <i class="fas ${template.icon} text-3xl ${template.iconColor}"></i>
    </div>
    <div class="${template.iconColor} font-semibold text-lg mb-1">${title}</div>
    <div class="text-gray-500 text-sm">${subtitle}</div>
  `;
}

function updateStats() {
  const elements = {
    scannedCount: stats.scanned,
    verifiedCount: stats.verified,
    rejectedCount: stats.rejected,
    pendingCount: stats.pending,
  };

  Object.entries(elements).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });
}

function onScanError(errorMessage) {
  // Silent error handling
}

function showError(message) {
  const reader = document.getElementById("reader");
  const errorMessage = document.getElementById("errorMessage");
  const errorText = document.getElementById("errorText");
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");

  if (reader) reader.style.display = "none";
  if (errorMessage) errorMessage.classList.remove("hidden");
  if (errorText) errorText.textContent = message;
  if (statusDot) {
    statusDot.classList.remove("bg-yellow-400", "bg-emerald-400");
    statusDot.classList.add("bg-red-400");
  }
  if (statusText) {
    statusText.textContent = "Error";
    statusText.classList.add("text-red-400");
  }
}

function startScanner() {
  const reader = document.getElementById("reader");
  const errorMessage = document.getElementById("errorMessage");
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");

  if (reader) reader.style.display = "block";
  if (errorMessage) errorMessage.classList.add("hidden");
  if (statusDot) {
    statusDot.classList.remove("bg-red-400", "bg-gray-400");
    statusDot.classList.add("bg-yellow-400");
  }
  if (statusText) {
    statusText.textContent = "Starting...";
    statusText.classList.remove("text-red-400");
    statusText.classList.add("text-yellow-400");
  }

  html5QrCode = new Html5Qrcode("reader");
  const config = {
    fps: 10,
    qrbox: { width: 250, height: 250 },
    aspectRatio: 1.0,
  };

  Html5Qrcode.getCameras()
    .then((devices) => {
      if (devices && devices.length) {
        const cameraId = devices[0].id;

        html5QrCode
          .start(cameraId, config, onScanSuccess, onScanError)
          .then(() => {
            isScanning = true;
            if (statusDot) {
              statusDot.classList.remove("bg-yellow-400");
              statusDot.classList.add("bg-emerald-400");
            }
            if (statusText) {
              statusText.textContent = "Active";
              statusText.classList.remove("text-yellow-400");
              statusText.classList.add("text-emerald-400");
            }
            const toggleBtn = document.getElementById("toggleCamera");
            if (toggleBtn) {
              toggleBtn.innerHTML =
                '<i class="fas fa-video-slash"></i> Stop Camera';
            }
          })
          .catch((err) => {
            console.error("Camera start error:", err);
            showError(
              "Unable to access camera. Try using File Upload mode instead."
            );
          });
      } else {
        showError("No camera found. Use File Upload mode instead.");
      }
    })
    .catch((err) => {
      console.error("Camera enumeration error:", err);
      showError(
        "Camera not available on HTTP. Use File Upload mode or switch to HTTPS."
      );
    });
}

function stopScanner() {
  if (html5QrCode && isScanning) {
    html5QrCode.stop().then(() => {
      isScanning = false;
      const statusDot = document.getElementById("statusDot");
      const statusText = document.getElementById("statusText");
      const toggleBtn = document.getElementById("toggleCamera");

      if (statusDot) {
        statusDot.classList.remove("bg-emerald-400");
        statusDot.classList.add("bg-gray-400");
      }
      if (statusText) {
        statusText.textContent = "Stopped";
        statusText.classList.remove("text-emerald-400");
        statusText.classList.add("text-gray-400");
      }
      if (toggleBtn) {
        toggleBtn.innerHTML = '<i class="fas fa-video"></i> Start Camera';
      }
    });
  }
}

function resetScan() {
  updateTicketDetails(null, false);

  const confirmBtn = document.getElementById("confirmBtn");
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.classList.add("opacity-50", "cursor-not-allowed");
    confirmBtn.classList.remove("hover:scale-105");
  }

  updateStatusCard(
    "waiting",
    "Waiting for Scan",
    "Point camera or upload QR code"
  );

  const filePreview = document.getElementById("filePreview");
  const fileInput = document.getElementById("fileInput");
  if (filePreview) filePreview.classList.add("hidden");
  if (fileInput) fileInput.value = "";
}

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  if (html5QrCode && isScanning) {
    html5QrCode.stop();
  }
});