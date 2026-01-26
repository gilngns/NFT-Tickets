// Smooth scroll for navigation
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});

// Animate elements on scroll
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -100px 0px",
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("slide-up");
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll(".feature-card, .stat-card").forEach((el) => {
  observer.observe(el);
});

// Wallet connection (placeholder)
function connectWallet() {
  // TODO: Implement actual wallet connection
  console.log("Connect wallet clicked");
  alert("Wallet connection will be implemented with Web3.js");
}

// Add event listeners
document.addEventListener("DOMContentLoaded", () => {
  // Add any initialization code here
  console.log("NFT Ticket Platform Loaded");

  // Example: Add click handlers for buttons
  const connectButtons = document.querySelectorAll(".connect-wallet-btn");
  connectButtons.forEach((btn) => {
    btn.addEventListener("click", connectWallet);
  });
});