/* ============================================
   DUTYCAM v6 · WITH SCHEDULE
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  const video           = document.getElementById('videoElement');
  const canvas          = document.getElementById('canvasElement');
  const signInBtn       = document.getElementById('signInBtn');
  const signOutBtn      = document.getElementById('signOutBtn');
  const logsList        = document.getElementById('logsList');
  const lastActionMsg   = document.getElementById('lastActionMessage');
  const userNameInput   = document.getElementById('userNameInput');
  const sessionInfo     = document.getElementById('sessionInfo');
  const testVoiceBtn    = document.getElementById('testVoiceBtn');
  const onboardBtn      = document.getElementById('onboardBtn');
  const onboardOverlay  = document.getElementById('onboard');
  const clearLogsBtn    = document.getElementById('clearLogsBtn');

  // Schedule Elements
  const openScheduleBtn = document.getElementById('openScheduleBtn');
  const closeScheduleBtn= document.getElementById('closeScheduleBtn');
  const scheduleScreen  = document.getElementById('scheduleScreen');
  const calendarStrip   = document.getElementById('calendarStrip');
  const currentMonthYear= document.getElementById('currentMonthYear');

  let logs = [];
  let mediaStream = null;

  // ============================================
  //   SCHEDULE CALENDAR LOGIC
  // ============================================
  function renderCalendar() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();

    // Set Month Title
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    currentMonthYear.textContent = `${monthNames[month]} ${year}`;

    // Generate 7-day strip centered around today
    let html = '';
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Start 3 days before today, end 3 days after
    for (let i = -3; i <= 3; i++) {
      let d = new Date(year, month, today + i);
      let dNum = d.getDate();
      let dName = dayNames[d.getDay()];
      let isToday = (i === 0);

      // Simulate a "shift" on Wednesdays (just like your screenshot)
      let hasShift = (d.getDay() === 3); 

      html += `
        <div class="cal-day ${isToday ? 'active' : ''}">
          <div class="num">${dNum.toString().padStart(2, '0')}</div>
          <div class="name">${dName}</div>
          ${hasShift ? '<div class="shift-dot"></div>' : ''}
        </div>
      `;
    }
    calendarStrip.innerHTML = html;
  }

  // Open/Close Schedule
  if (openScheduleBtn) {
    openScheduleBtn.onclick = () => {
      renderCalendar();
      scheduleScreen.style.display = 'flex';
    };
  }
  if (closeScheduleBtn) {
    closeScheduleBtn.onclick = () => {
      scheduleScreen.style.display = 'none';
    };
  }

  // ============================================
  //   DUTY ACTIONS & IMAGES
  // ============================================
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

        const dataUrl = canvas.toDataURL('image/jpeg', 0.4); 
        resolve(dataUrl);
      } catch (e) { resolve(null); }
    });
  }

  function renderLogs() {
    if (!logsList) return;
    if (logs.length === 0) {
      logsList.innerHTML = `<div class="empty-log">No sign in/out records yet.</div>`;
      return;
    }
    
    let html = '';
    for (let i = logs.length - 1; i >= 0; i--) {
      const entry = logs[i];
      const label = entry.type === 'signin' ? 'Sign In' : 'Sign Out';
      const timeStr = entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = entry.timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' });
      
      const icon = entry.type === 'signin'
        ? '<i class="fas fa-sign-in-alt" style="color: #0b9e6b;"></i>'
        : '<i class="fas fa-sign-out-alt" style="color: #d64545;"></i>';

      const photoHtml = entry.photo 
        ? `<img src="${entry.photo}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover; border: 1px solid rgba(255,255,255,0.2);">`
        : `<div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center;"><i class="fas fa-camera" style="color: #9aa6c2;"></i></div>`;

      html += `
        <div class="log-entry" style="display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.03); padding: 10px; border-radius: 12px; margin-bottom: 8px;">
          ${photoHtml}
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 6px; font-size: 0.95rem;">
              ${icon} 
              <span style="color: white; font-weight: 600;">${entry.name}</span> 
              <span style="color: #9aa6c2;">· ${label}</span>
            </div>
            <div style="color: #9aa6c2; font-size: 0.75rem; margin-top: 2px;">${dateStr} · ${timeStr}</div>
          </div>
        </div>
      `;
    }
    logsList.innerHTML = html;
  }

  async function addLog(type, name) {
    const photo = await takeSnapshot();
    const now = new Date();
    
    logs.push({ type, timestamp: now, name: name, photo: photo });
    renderLogs();

    const actionWord = type === 'signin' ? 'Signed in' : 'Signed out';
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (lastActionMsg) {
      lastActionMsg.innerHTML = `<i class="fas fa-check-circle" style="color: #0b9e6b;"></i> ${actionWord} at ${timeStr}`;
    }
    if (sessionInfo) {
      sessionInfo.innerHTML = type === 'signin' 
        ? `<i class="fas fa-user-check" style="color: #0b9e6b;"></i> On duty since ${timeStr}`
        : `<i class="fas fa-user-slash" style="color: #d64545;"></i> Off duty since ${timeStr}`;
    }
  }

  if (signInBtn) {
    signInBtn.onclick = async function(e) {
      e.preventDefault();
      const name = userNameInput ? userNameInput.value.trim() : "";
      if (!name) return alert("Please enter your name first!");
      
      speak("Welcome " + name);
      await addLog('signin', name);
    };
  }

  if (signOutBtn) {
    signOutBtn.onclick = async function(e) {
      e.preventDefault();
      const name = userNameInput ? userNameInput.value.trim() : "";
      if (!name) return alert("Please enter your name first!");
      
      speak("Goodbye " + name);
      await addLog('signout', name);
    };
  }

  if (clearLogsBtn) {
    clearLogsBtn.onclick = function() {
      if (confirm('Clear all activity logs?')) {
        logs = [];
        renderLogs();
      }
    };
  }

  // ============================================
  //   VOICE & ONBOARDING
  // ============================================
  function speak(text) {
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    } catch(e) {}
  }

  if (testVoiceBtn) {
    testVoiceBtn.onclick = function() { speak("Test successful"); };
  }

  if (onboardBtn && onboardOverlay) {
    onboardBtn.onclick = function() {
      onboardOverlay.style.display = 'none';
      speak("Welcome to Duty Cam");
    };
  }

  // ============================================
  //   CAMERA START
  // ============================================
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then(stream => { 
        mediaStream = stream;
        if(video) video.srcObject = stream; 
      })
      .catch(err => { console.log("Camera error", err); });
  }

});
