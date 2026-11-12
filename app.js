/* ============================================
   DUTYCAM v8 · FINAL STABLE RELEASE
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // Elements
  const video = document.getElementById('videoElement');
  const canvas = document.getElementById('canvasElement');
  const userNameInput = document.getElementById('userNameInput');
  const signInBtn = document.getElementById('signInBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  const testVoiceBtn = document.getElementById('testVoiceBtn');
  const onboardBtn = document.getElementById('onboardBtn');
  const onboardOverlay = document.getElementById('onboard');
  const searchInput = document.getElementById('searchInput');
  const scheduleList = document.getElementById('scheduleList');
  const totalHoursDisplay = document.getElementById('totalHoursDisplay');
  const subscriptionBox = document.getElementById('subscriptionBox');
  const sessionInfo = document.getElementById('sessionInfo');
  const cameraStatus = document.getElementById('cameraStatus');

  let mediaStream = null;
  let allRecords = []; // Our 3-month database

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
      renderSchedule(); // Refresh data when tab is opened
    }
  };

  // ============================================
  // 2. CAMERA & VOICE (Stable Implementation)
  // ============================================
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    // Request basic video to avoid green screen on older Androids
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => { 
        mediaStream = stream; 
        if (video) {
          video.srcObject = stream;
          // Force play to ensure the stream renders
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
        alert("Please allow camera access to use DutyCam.");
      });
  } else {
    alert("Camera API not supported in this browser.");
  }

  function takeSnapshot() {
    return new Promise((resolve) => {
      if (!mediaStream || !video || !video.videoWidth) return resolve(null);
      try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.save();
        // Match the CSS mirror effect
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        video.style.opacity = '0.3';
        setTimeout(() => video.style.opacity = '1', 200);
        
        // Slight delay to let the camera adjust lighting before saving image
        setTimeout(() => resolve(canvas.toDataURL('image/jpeg', 0.5)), 300);
      } catch (e) { 
        console.warn("Snapshot failed:", e);
        resolve(null); 
      }
    });
  }

  function speak(text) {
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    } catch(e) {}
  }

  if(testVoiceBtn) testVoiceBtn.onclick = () => speak("Test successful");

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
      
      const record = {
        id: Date.now(),
        name: name,
        type: 'in',
        timestamp: new Date().toISOString(),
        photo: photo,
        durationMinutes: null // Will be calculated on sign out
      };

      allRecords.push(record);
      saveToDatabase();
      alert(`Signed IN successfully at ${new Date().toLocaleTimeString()}`);
    };
  }

  if (signOutBtn) {
    signOutBtn.onclick = async (e) => {
      e.preventDefault();
      const name = userNameInput.value.trim();
      if (!name) return alert("Please enter your name first!");

      // Find the most recent "IN" for this user that doesn't have a duration yet
      const lastInRecord = allRecords.slice().reverse().find(r => r.name.toLowerCase() === name.toLowerCase() && r.type === 'in' && r.durationMinutes === null);
      
      if (!lastInRecord) {
        return alert(`Error: No active Sign-In found for ${name}. Please Sign In first.`);
      }

      speak("Goodbye " + name);
      const photo = await takeSnapshot();
      
      const now = new Date();
      const inTime = new Date(lastInRecord.timestamp);
      
      // Calculate exact minutes worked
      const diffMs = now - inTime;
      const diffMins = Math.floor(diffMs / 60000); 

      // Update the IN record with the calculated time
      lastInRecord.durationMinutes = diffMins;

      // Add the OUT record
      allRecords.push({
        id: Date.now(),
        name: name,
        type: 'out',
        timestamp: now.toISOString(),
        photo: photo
      });

      saveToDatabase();
      alert(`Signed OUT successfully. You worked for ${Math.floor(diffMins/60)}h ${diffMins%60}m.`);
    };
  }

  // ============================================
  // 4. DATABASE (3-Month Auto-Delete)
  // ============================================
  function saveToDatabase() {
    try {
      // Keep only records from the last 90 days
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
      
      allRecords = allRecords.filter(r => new Date(r.timestamp) > threeMonthsAgo);
      localStorage.setItem('dutycam_records', JSON.stringify(allRecords));
    } catch(e) { console.warn("Storage error", e); }
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
  if (searchInput) {
    searchInput.addEventListener('input', renderSchedule);
  }

  function renderSchedule() {
    if (!scheduleList) return;
    
    const query = searchInput.value.trim().toLowerCase();
    
    // Filter records by name
    const filtered = query 
      ? allRecords.filter(r => r.name.toLowerCase().includes(query))
      : allRecords;

    // Calculate Total Minutes
    let totalMins = 0;
    filtered.forEach(r => {
      if (r.type === 'in' && r.durationMinutes) totalMins += r.durationMinutes;
    });

    // Display Total Time
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    totalHoursDisplay.textContent = `${hours} hrs ${mins} mins`;

    // Render List (Newest first)
    if (filtered.length === 0) {
      scheduleList.innerHTML = `<div style="color: #9aa6c2; text-align: center; padding: 20px;">No records found for "${query}".</div>`;
      return;
    }

    let html = '';
    for (let i = filtered.length - 1; i >= 0; i--) {
      const r = filtered[i];
      const date = new Date(r.timestamp);
      
      const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      let durationHtml = '';
      if (r.type === 'in' && r.durationMinutes !== null) {
        const h = Math.floor(r.durationMinutes / 60);
        const m = r.durationMinutes % 60;
        durationHtml = `<span class="badge-total">Worked: ${h}h ${m}m</span>`;
      } else if (r.type === 'in') {
        durationHtml = `<span style="color: #f59e0b; font-size: 0.8rem;">Currently on shift...</span>`;
      }

      const icon = r.type === 'in' 
        ? '<i class="fas fa-sign-in-alt" style="color: #0b9e6b;"></i> SIGN IN'
        : '<i class="fas fa-sign-out-alt" style="color: #d64545;"></i> SIGN OUT';

      const photoHtml = r.photo 
        ? `<img src="${r.photo}" style="width: 45px; height: 45px; border-radius: 8px; object-fit: cover; background: #000;">`
        : `<div style="width: 45px; height: 45px; border-radius: 8px; background: rgba(255,255,255,0.1);"></div>`;

      html += `
        <div class="report-card" style="display: flex; gap: 12px; align-items: center;">
          ${photoHtml}
          <div style="flex: 1;">
            <div style="color: white; font-weight: bold; margin-bottom: 4px;">${r.name}</div>
            <div style="font-size: 0.85rem; color: #9aa6c2;">${dateStr} · ${timeStr}</div>
            <div style="margin-top: 5px;">${icon} ${durationHtml}</div>
          </div>
        </div>
      `;
    }
    scheduleList.innerHTML = html;
  }

      // ============================================
  // 6. SUBSCRIPTION & FREE TRIAL ENGINE (0 MIN TEST)
  // ============================================
  
  // Set this to a secret PIN you will give users after they pay
  const MASTER_UNLOCK_PIN = "2026"; 

  function checkSubscription() {
    try {
      let installTime = localStorage.getItem('dutycam_install_time');
      let isSubscribed = localStorage.getItem('dutycam_subscribed');

      // If first time opening the app, save the exact time
      if (!installTime) {
        installTime = new Date().toISOString();
        localStorage.setItem('dutycam_install_time', installTime);
      }

      // If they already entered the PIN, keep it unlocked
      if (isSubscribed === "true") {
        sessionInfo.innerHTML = `<i class="fas fa-check-circle"></i> Active (Subscribed)`;
        sessionInfo.style.color = "#0b9e6b";
        return;
      }

      const start = new Date(installTime);
      const now = new Date();
      
      // Calculate difference in MINUTES (for testing)
      const diffMinutes = Math.floor((now - start) / (1000 * 60));

      // LOCK AFTER 0 MINUTES
      if (diffMinutes > 0) {
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
        const minsLeft = 0 - diffMinutes;
        sessionInfo.innerHTML = `<i class="fas fa-clock"></i> Test Trial: ${minsLeft} mins left`;
      }
    } catch(e) { console.warn(e); }
  }

  // ============================================
  // 7. START APP
  // ============================================
  loadDatabase();
  checkSubscription();

     // ============================================
  // 8. ADMIN PANEL LOGIC (Secret Trigger)
  // ============================================
  
  // Secret trigger: Click the "DutyCam" logo 5 times to open Admin Panel
  let logoClicks = 0;
  const brandLogo = document.querySelector('.brand');
  const adminPanel = document.getElementById('adminPanel');
  const generateSmsBtn = document.getElementById('generateSmsBtn');

  if (brandLogo) {
    brandLogo.addEventListener('click', () => {
      logoClicks++;
      if (logoClicks >= 5) {
        if (adminPanel) {
          adminPanel.style.display = adminPanel.style.display === 'none' ? 'block' : 'none';
          alert("Admin Panel Toggled");
        }
        logoClicks = 0; // reset
      }
      // Reset clicks after 2 seconds of inactivity
      setTimeout(() => { logoClicks = 0; }, 2000);
    });
  }

  if (generateSmsBtn) {
    generateSmsBtn.onclick = () => {
      const phone = document.getElementById('adminPhone').value.trim();
      const name = document.getElementById('adminName').value.trim();
      
      if (!phone || !name) {
        return alert("Please enter the customer's name and phone number.");
      }

      // Generate Current Month Code
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, '0'); 
      const yy = String(now.getFullYear()).slice(-2);         
      const code = `SUVE-${mm}-${yy}`;

      // Create the SMS text
      const message = `Hello ${name}, your DutyCam payment was received. Your unlock code is ${code}. Enter this code in the app to unlock for 30 days.`;
      
      // Show output box
      document.getElementById('smsOutput').style.display = 'block';
      document.getElementById('smsText').textContent = message;

      // Create SMS link (Works on both iOS and Android)
      const smsLink = document.getElementById('smsLink');
      // iOS uses &body=, Android uses ?body=
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      smsLink.href = isIOS 
        ? `sms:${phone}&body=${encodeURIComponent(message)}` 
        : `sms:${phone}?body=${encodeURIComponent(message)}`;
    };
  }
});
