/* ============================================
   DUTYCAM v10 · FINAL RELEASE (Voice/Silent)
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // Elements
  const video = document.getElementById('videoElement');
  const canvas = document.getElementById('canvasElement');
  const userNameInput = document.getElementById('userNameInput');
  const signInBtn = document.getElementById('signInBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  const testVoiceBtn = document.getElementById('testVoiceBtn');
  const toggleSoundBtn = document.getElementById('toggleSoundBtn'); // New Toggle Button
  const onboardBtn = document.getElementById('onboardBtn');
  const onboardOverlay = document.getElementById('onboard');
  const searchInput = document.getElementById('searchInput');
  const scheduleList = document.getElementById('scheduleList');
  const totalHoursDisplay = document.getElementById('totalHoursDisplay');
  const sessionInfo = document.getElementById('sessionInfo');
  const cameraStatus = document.getElementById('cameraStatus');

  let mediaStream = null;
  let allRecords = [];

  // ============================================
  // 1. NAVIGATION & TABS
  // ============================================
  window.switchPage = function(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    
    document.getElementById(`page-${pageName}`).classList.add('active');
    
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      if (tab.getAttribute('onclick').includes(pageName)) {
        tab.classList.add('active');
      }
    });

    if (pageName === 'schedule') {
      renderSchedule();
    }
  };

  // ============================================
  // 2. CAMERA & VOICE
  // ============================================
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => { 
        mediaStream = stream; 
        if (video) {
          video.srcObject = stream;
          video.onloadedmetadata = () => {
            video.play().catch(err => console.log("Play error:", err));
          };
          if(cameraStatus) {
            cameraStatus.textContent = "active";
            cameraStatus.style.background = "#0b9e6b";
          }
        }
      })
      .catch(err => {
        console.error("Camera error:", err);
        if(cameraStatus) {
            cameraStatus.textContent = "blocked";
            cameraStatus.style.background = "#d64545";
        }
      });
  }

  function takeSnapshot() {
    return new Promise((resolve) => {
      if (!mediaStream || !video || !video.videoWidth) return resolve(null);
      try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        video.style.opacity = '0.3';
        setTimeout(() => video.style.opacity = '1', 200);
        
        setTimeout(() => resolve(canvas.toDataURL('image/jpeg', 0.5)), 300);
      } catch (e) { resolve(null); }
    });
  }

  // --- SOUND ENGINE ---
  // Check local storage for sound preference (default is ON)
  let soundEnabled = localStorage.getItem('dutycam_sound_enabled') !== 'false';

  function updateSoundButton() {
    if (toggleSoundBtn) {
      if (soundEnabled) {
        toggleSoundBtn.innerHTML = '<i class="fas fa-volume-up"></i> Voice ON';
        toggleSoundBtn.style.borderColor = '#0b9e6b';
        toggleSoundBtn.style.color = '#0b9e6b';
      } else {
        toggleSoundBtn.innerHTML = '<i class="fas fa-volume-mute"></i> Silent';
        toggleSoundBtn.style.borderColor = '#d64545';
        toggleSoundBtn.style.color = '#d64545';
      }
    }
  }
  updateSoundButton();

  if (toggleSoundBtn) {
    toggleSoundBtn.onclick = () => {
      soundEnabled = !soundEnabled;
      localStorage.setItem('dutycam_sound_enabled', soundEnabled);
      updateSoundButton();
      if (soundEnabled) speak("Voice enabled");
    };
  }

  function speak(text) {
    if (!soundEnabled) return; // Do nothing if in Silent mode
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    } catch(e) {}
  }

  if(testVoiceBtn) testVoiceBtn.onclick = () => {
    if(soundEnabled) {
      speak("Test successful");
    } else {
      alert("You are in Silent mode. Turn Voice ON to test.");
    }
  };

  if (onboardBtn && onboardOverlay) {
    onboardBtn.onclick = () => {
      onboardOverlay.style.display = 'none';
      speak("Ready to work");
    };
  }

  // ============================================
  // 3. CLOCK IN / OUT LOGIC
  // ============================================
  if (signInBtn) {
    signInBtn.onclick = async (e) => {
      e.preventDefault();
      const name = userNameInput.value.trim();
      if (!name) return alert("Please enter your name first!");
      
      speak("Welcome " + name);
      const photo = await takeSnapshot();
      
      allRecords.push({
        id: Date.now(),
        name: name,
        type: 'in',
        timestamp: new Date().toISOString(),
        photo: photo,
        durationMinutes: null
      });

      saveToDatabase();
      
      const now = new Date().toLocaleTimeString();
      const lastActionMessage = document.getElementById('lastActionMessage');
      if(lastActionMessage) lastActionMessage.innerHTML = `<i class="fas fa-check-circle" style="color: #0b9e6b;"></i> Signed in at ${now}`;
    };
  }

  if (signOutBtn) {
    signOutBtn.onclick = async (e) => {
      e.preventDefault();
      const name = userNameInput.value.trim();
      if (!name) return alert("Please enter your name first!");

      const lastIn = allRecords.slice().reverse().find(r => r.name.toLowerCase() === name.toLowerCase() && r.type === 'in' && r.durationMinutes === null);
      
      if (!lastIn) return alert(`No active Sign-In found for ${name}.`);

      speak("Goodbye " + name);
      const photo = await takeSnapshot();
      
      const now = new Date();
      const diffMins = Math.floor((now - new Date(lastIn.timestamp)) / 60000);
      lastIn.durationMinutes = diffMins;

      allRecords.push({
        id: Date.now(),
        name: name,
        type: 'out',
        timestamp: now.toISOString(),
        photo: photo
      });

      saveToDatabase();
      
      const timeStr = now.toLocaleTimeString();
      const lastActionMessage = document.getElementById('lastActionMessage');
      if(lastActionMessage) lastActionMessage.innerHTML = `<i class="fas fa-check-circle" style="color: #d64545;"></i> Signed out at ${timeStr}`;
    };
  }

  // ============================================
  // 4. DATABASE
  // ============================================
  function saveToDatabase() {
    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
      allRecords = allRecords.filter(r => new Date(r.timestamp) > threeMonthsAgo);
      localStorage.setItem('dutycam_records', JSON.stringify(allRecords));
    } catch(e) {}
  }

  function loadDatabase() {
    try {
      const saved = localStorage.getItem('dutycam_records');
      if (saved) allRecords = JSON.parse(saved);
    } catch(e) {}
  }

  // ============================================
  // 5. SCHEDULE & SEARCH RENDERER
  // ============================================
  if (searchInput) searchInput.addEventListener('input', renderSchedule);

  function renderSchedule() {
    if (!scheduleList) return;
    const query = searchInput.value.trim().toLowerCase();
    const filtered = query ? allRecords.filter(r => r.name.toLowerCase().includes(query)) : allRecords;

    let totalMins = 0;
    filtered.forEach(r => { if (r.type === 'in' && r.durationMinutes) totalMins += r.durationMinutes; });

    totalHoursDisplay.textContent = `${Math.floor(totalMins / 60)} hrs ${totalMins % 60} mins`;

    if (filtered.length === 0) {
      scheduleList.innerHTML = `<div style="color: #9aa6c2; text-align: center; padding: 20px;">No records found.</div>`;
      return;
    }

    let html = '';
    for (let i = filtered.length - 1; i >= 0; i--) {
      const r = filtered[i];
      const date = new Date(r.timestamp);
            let durationHtml = '';
      if (r.type === 'in' && r.durationMinutes !== null && !isNaN(r.durationMinutes)) {
        const h = Math.floor(r.durationMinutes / 60);
        const m = r.durationMinutes % 60;
        durationHtml = `<span class="badge-total">Worked: ${h}h ${m}m</span>`;
      } else if (r.type === 'in') {
        durationHtml = `<span style="color: #f59e0b; font-size: 0.8rem;">On shift...</span>`;
      }
      
      const icon = r.type === 'in' ? '<i class="fas fa-sign-in-alt" style="color: #0b9e6b;"></i>' : '<i class="fas fa-sign-out-alt" style="color: #d64545;"></i>';
      const photoHtml = r.photo ? `<img src="${r.photo}" style="width: 45px; height: 45px; border-radius: 8px; object-fit: cover; background: #000;">` : `<div style="width: 45px; height: 45px; border-radius: 8px; background: rgba(255,255,255,0.1);"></div>`;

      html += `
        <div class="report-card" style="display: flex; gap: 12px; align-items: center;">
          ${photoHtml}
          <div style="flex: 1;">
            <div style="color: white; font-weight: bold; margin-bottom: 4px;">${r.name}</div>
            <div style="font-size: 0.85rem; color: #9aa6c2;">${date.toLocaleDateString()} · ${date.toLocaleTimeString()}</div>
            <div style="margin-top: 5px;">${icon} ${durationHtml}</div>
          </div>
        </div>
      `;
    }
    scheduleList.innerHTML = html;
  }

  // ============================================
  // 6. SUBSCRIPTION & LOCK ENGINE
  // ============================================
  function checkSubscription() {
    try {
      const now = new Date();
      let installTime = localStorage.getItem('dutycam_install_time');
      let paidUntil = localStorage.getItem('dutycam_paid_until');

      if (!installTime) {
        installTime = now.toISOString();
        localStorage.setItem('dutycam_install_time', installTime);
      }

      const trialStart = new Date(installTime);
      const trialDaysPassed = Math.floor((now - trialStart) / (1000 * 60 * 60 * 24));

      if (paidUntil) {
        const paidDate = new Date(paidUntil);
        if (now < paidDate) {
          const daysLeft = Math.ceil((paidDate - now) / (1000 * 60 * 60 * 24));
          if (sessionInfo) {
            sessionInfo.innerHTML = `<i class="fas fa-check-circle"></i> Subscribed (${daysLeft} days left)`;
            sessionInfo.style.color = "#0b9e6b";
          }
          return;
        } else {
          localStorage.removeItem('dutycam_paid_until');
        }
      }

      // 0 Days Free Trial (Change 0 to 0 for immediate testing)
      if (trialDaysPassed >= 0) {
        if (sessionInfo) {
          sessionInfo.innerHTML = `<i class="fas fa-lock"></i> Trial Expired`;
          sessionInfo.style.color = "#d64545";
        }
        
        const lockOverlay = document.getElementById('lockOverlay');
        if (lockOverlay) lockOverlay.style.display = 'flex';

        const verifyBtn = document.getElementById('verifyPaymentBtn');
        const txnIdInput = document.getElementById('txnIdInput');
        
        if (verifyBtn) {
          verifyBtn.onclick = () => {
            const userInput = txnIdInput.value.trim().toUpperCase();
            if (!userInput) return alert("Please enter the unlock code from your SMS.");

            // Generate the valid code for the current month
            const now = new Date();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const yy = String(now.getFullYear()).slice(-2);
            const VALID_CODE = `SUVE-${mm}-${yy}`;

            // Check if the user typed the exact code
            if (userInput === VALID_CODE) {
              // Payment Verified! Set 30-day expiry
              const nextMonth = new Date();
              nextMonth.setDate(nextMonth.getDate() + 30);
              localStorage.setItem('dutycam_paid_until', nextMonth.toISOString());
              
              alert(`Code Verified! You now have 30 days of access.`);
              lockOverlay.style.display = 'none';
              if (sessionInfo) {
                sessionInfo.innerHTML = `<i class="fas fa-check-circle"></i> Subscribed (30 days left)`;
                sessionInfo.style.color = "#0b9e6b";
              }
            } else {
              alert("Invalid Code. Please check the SMS you received from the Admin and try again.");
            }
          };
        }
      } else {
        const daysLeft = 0 - trialDaysPassed;
        if (sessionInfo) {
          sessionInfo.innerHTML = `<i class="fas fa-clock"></i> Free Trial: ${daysLeft} days left`;
          sessionInfo.style.color = "#0b9e6b";
        }
      }
    } catch(e) { console.warn(e); }
  }

  // ============================================
  // 7. ADMIN PANEL (Secret Trigger: Tap logo 5 times)
  // ============================================
  let logoClicks = 0;
  const adminTrigger = document.getElementById('adminTrigger');
  const adminPanel = document.getElementById('adminPanel');
  const generateSmsBtn = document.getElementById('generateSmsBtn');

  if (adminTrigger) {
    adminTrigger.addEventListener('click', () => {
      logoClicks++;
      if (logoClicks >= 5) {
        if (adminPanel) adminPanel.style.display = adminPanel.style.display === 'none' ? 'block' : 'none';
        logoClicks = 0;
      }
      setTimeout(() => { logoClicks = 0; }, 2000);
    });
  }

  if (generateSmsBtn) {
    generateSmsBtn.onclick = () => {
      const phone = document.getElementById('adminPhone').value.trim();
      const name = document.getElementById('adminName').value.trim();
      if (!phone || !name) return alert("Enter customer name and phone.");

      const now = new Date();
      const code = `SUVE-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getFullYear()).slice(-2)}`;

      const message = `Hello ${name}, your DutyCam payment was received. Your unlock code is ${code}.`;
      
      document.getElementById('smsOutput').style.display = 'block';
      document.getElementById('smsText').textContent = message;

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      document.getElementById('smsLink').href = isIOS ? `sms:${phone}&body=${encodeURIComponent(message)}` : `sms:${phone}?body=${encodeURIComponent(message)}`;
    };
  }

  // ============================================
  // 8. START APP
  // ============================================
  loadDatabase();
  checkSubscription();
});
