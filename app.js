/* ============================================
   DUTYCAM v6 · SCHEDULE & PAYROLL ENGINE
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

  let mediaStream = null;
  let allRecords = []; // Our 3-month database

  // ============================================
  // 1. NAVIGATION & TABS
  // ============================================
  window.switchPage = function(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    
    document.getElementById(`page-${pageName}`).classList.add('active');
    event.target.closest('.nav-tab').classList.add('active');

    if (pageName === 'schedule') {
      renderSchedule(); // Refresh data when tab is opened
    }
  };

  // ============================================
  // 2. CAMERA & VOICE
  // ============================================
  if (navigator.mediaDevices) {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then(stream => { mediaStream = stream; video.srcObject = stream; })
      .catch(err => console.log("Camera error"));
  }

  function takeSnapshot() {
    return new Promise((resolve) => {
      if (!mediaStream || !video.videoWidth) return resolve(null);
      try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        video.style.opacity = '0.3';
        setTimeout(() => video.style.opacity = '1', 200);
        resolve(canvas.toDataURL('image/jpeg', 0.4));
      } catch (e) { resolve(null); }
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
        ? `<img src="${r.photo}" style="width: 45px; height: 45px; border-radius: 8px; object-fit: cover;">`
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
  // 6. SUBSCRIPTION & FREE TRIAL ENGINE
  // ============================================
  function checkSubscription() {
    try {
      let installDate = localStorage.getItem('dutycam_install_date');
      
      // If first time opening the app, save today's date
      if (!installDate) {
        installDate = new Date().toISOString();
        localStorage.setItem('dutycam_install_date', installDate);
      }

      const start = new Date(installDate);
      const now = new Date();
      const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));

      if (diffDays > 14) {
        // Trial Expired
        sessionInfo.innerHTML = `<i class="fas fa-lock"></i> Trial Expired`;
        sessionInfo.style.color = "#d64545";
        subscriptionBox.innerHTML = `
          <div style="background: rgba(214,69,69,0.2); border: 1px solid #d64545; padding: 10px; border-radius: 8px; margin-bottom: 10px; color: white;">
            <strong>Your 14-day free trial has ended.</strong><br>
            Please subscribe to continue using DutyCam.
          </div>
          <i class="fas fa-credit-card"></i> Pay 5,000 UGX / month<br>
          MTN Merchant: <strong>67117277</strong> (Name: DutyCam)<br>
          Airtel Merchant: <strong>654237</strong> (Name: DutyCam)
        `;
        
        // Optionally, you can disable buttons here if you want to lock the app fully
        // signInBtn.disabled = true;
        // signOutBtn.disabled = true;
      } else {
        const daysLeft = 14 - diffDays;
        sessionInfo.innerHTML = `<i class="fas fa-check-circle"></i> Active (Trial: ${daysLeft} days left)`;
      }
    } catch(e) {}
  }

  // ============================================
  // 7. START APP
  // ============================================
  loadDatabase();
  checkSubscription();
});
