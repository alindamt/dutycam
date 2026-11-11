/* ============================================
   DUTYCAM v4 · FINAL WORKING SCRIPT
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  const video           = document.getElementById('videoElement');
  const signInBtn       = document.getElementById('signInBtn');
  const signOutBtn      = document.getElementById('signOutBtn');
  const logsList        = document.getElementById('logsList');
  const lastActionMsg   = document.getElementById('lastActionMessage');
  const userNameInput   = document.getElementById('userNameInput');
  const sessionInfo     = document.getElementById('sessionInfo');
  const testVoiceBtn    = document.getElementById('testVoiceBtn');
  const onboardBtn      = document.getElementById('onboardBtn');
  const onboardOverlay  = document.getElementById('onboard');

  let logs = [];

  // 1. LOG MANAGEMENT
  function renderLogs() {
    if (!logsList) return;
    if (logs.length === 0) {
      logsList.innerHTML = `<div class="empty-log">No sign in/out records yet.</div>`;
      return;
    }
    
    let html = '';
    // Show newest first
    for (let i = logs.length - 1; i >= 0; i--) {
      const entry = logs[i];
      const label = entry.type === 'signin' ? 'Sign In' : 'Sign Out';
      const timeStr = entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = entry.timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' });
      
      // Beautiful matching log entry
      const icon = entry.type === 'signin'
        ? '<i class="fas fa-sign-in-alt" style="color: #0b9e6b;"></i>'
        : '<i class="fas fa-sign-out-alt" style="color: #d64545;"></i>';

      html += `
        <div class="log-entry">
          <div class="log-type">
            ${icon} 
            <span style="color: white; font-weight: 600; margin-right: 4px;">${entry.name}</span> 
            <span style="color: #9aa6c2; font-size: 0.85rem;">· ${label}</span>
          </div>
          <div class="log-time">${dateStr} · ${timeStr}</div>
        </div>
      `;
    }
    logsList.innerHTML = html;
  }

  function addLog(type, name) {
    const now = new Date();
    logs.push({ type, timestamp: now, name: name });
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

  // 2. BUTTON CLICKS (Strict)
  if (signInBtn) {
    signInBtn.onclick = function(e) {
      e.preventDefault();
      const name = userNameInput ? userNameInput.value.trim() : "";
      if (!name) {
        alert("Please enter your name first!");
        return;
      }
      addLog('signin', name);
      speak("Welcome " + name);
    };
  }

  if (signOutBtn) {
    signOutBtn.onclick = function(e) {
      e.preventDefault();
      const name = userNameInput ? userNameInput.value.trim() : "";
      if (!name) {
        alert("Please enter your name first!");
        return;
      }
      addLog('signout', name);
      speak("Goodbye " + name);
    };
  }

  // 3. VOICE ENGINE
  function speak(text) {
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    } catch(e) { console.log("Voice error", e); }
  }

  if (testVoiceBtn) {
    testVoiceBtn.onclick = function() {
      speak("Test successful");
    };
  }

  // 4. ONBOARDING
  if (onboardBtn && onboardOverlay) {
    onboardBtn.onclick = function() {
      onboardOverlay.style.display = 'none';
      speak("Welcome to Duty Cam");
    };
  }

  // 5. CAMERA
  const video = document.getElementById('videoElement');
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => { if(video) video.srcObject = stream; })
      .catch(err => { console.log("Camera error", err); });
  }
});