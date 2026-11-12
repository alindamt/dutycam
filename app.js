  // ============================================
  // 6. SUBSCRIPTION & FREE TRIAL ENGINE (Auto Lock)
  // ============================================
  
  // Set this to a secret PIN you will give users after they pay
  const MASTER_UNLOCK_PIN = "2026"; 

  function checkSubscription() {
    try {
      let installDate = localStorage.getItem('dutycam_install_date');
      let isSubscribed = localStorage.getItem('dutycam_subscribed');

      if (!installDate) {
        installDate = new Date().toISOString();
        localStorage.setItem('dutycam_install_date', installDate);
      }

      // If they already entered the PIN, keep it unlocked
      if (isSubscribed === "true") {
        sessionInfo.innerHTML = `<i class="fas fa-check-circle"></i> Active (Subscribed)`;
        return;
      }

      const start = new Date(installDate);
      const now = new Date();
      const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));

      if (diffDays > 14) {
        // TRIAL EXPIRED: LOCK THE APP
        sessionInfo.innerHTML = `<i class="fas fa-lock"></i> Trial Expired`;
        sessionInfo.style.color = "#d64545";
        
        // Show the lock overlay
        const lockOverlay = document.getElementById('lockOverlay');
        if (lockOverlay) lockOverlay.style.display = 'flex';

        // Handle the Unlock Button
        const unlockBtn = document.getElementById('unlockBtn');
        const unlockCode = document.getElementById('unlockCode');
        
        if (unlockBtn) {
          unlockBtn.onclick = () => {
            if (unlockCode.value.trim() === MASTER_UNLOCK_PIN) {
              localStorage.setItem('dutycam_subscribed', 'true');
              alert("Subscription activated successfully! Thank you.");
              lockOverlay.style.display = 'none';
              sessionInfo.innerHTML = `<i class="fas fa-check-circle"></i> Active (Subscribed)`;
              sessionInfo.style.color = "#0b9e6b";
            } else {
              alert("Invalid PIN. Please check your payment receipt and try again.");
            }
          };
        }

      } else {
        const daysLeft = 14 - diffDays;
        sessionInfo.innerHTML = `<i class="fas fa-check-circle"></i> Active (Trial: ${daysLeft} days left)`;
      }
    } catch(e) { console.warn(e); }
  }
