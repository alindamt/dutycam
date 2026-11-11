/* ============================================
   DUTYCAM v5 · FINAL VERSION (WITH IMAGES)
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

  let logs = [];
  let mediaStream = null;

  // 1. CAPTURE PHOTO
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
        
        // Visual flash effect
        video.style.opacity = '0.3';
        setTimeout(() => video.style.opacity = '1', 200);

        // Convert to a small image string so it loads fast
        const dataUrl = canvas.toDataURL('image/jpeg', 0.4); 
        resolve(dataUrl);
      } catch (e) { resolve(null); }
    });
  }

  // 2. LOG MANAGEMENT (With Images)
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

      // IMAGE THUMBNAIL
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

  // 3. ADD LOG
  async function addLog(type, name) {
    const photo = await takeSnapshot(); // Take photo first
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

  // 4. BUTTON CLICKS
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

  // 5. CLEAR LOGS
  if (clearLogsBtn) {
    clearLogsBtn.onclick = function() {
      if (confirm('Clear all activity logs?')) {
        logs = [];
        renderLogs();
      }
    };
  }

  // 6. VOICE ENGINE
  function speak(text) {
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    } catch(e) {}
  }

  if (testVoiceBtn) {
    testVoiceBtn.onclick = function() { speak("Test successful"); };
  }

  // 7. ONBOARDING
  if (onboardBtn && onboardOverlay) {
    onboardBtn.onclick = function() {
      onboardOverlay.style.display = 'none';
      speak("Welcome to Duty Cam");
    };
  }

  // 8. CAMERA START
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then(stream => { 
        mediaStream = stream;
        if(video) video.srcObject = stream; 
      })
      .catch(err => { console.log("Camera error", err); });
  }

});
