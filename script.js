document.addEventListener('DOMContentLoaded', () => {

  const video           = document.getElementById('videoElement');
  const signInBtn       = document.getElementById('signInBtn');
  const signOutBtn      = document.getElementById('signOutBtn');
  const logsList        = document.getElementById('logsList');
  const lastActionMsg   = document.getElementById('lastActionMessage');
  const userNameInput   = document.getElementById('userNameInput');
  const sessionInfo     = document.getElementById('sessionInfo');

  let logs = [];

  function addLog(type, name) {
    const now = new Date();
    logs.push({ type, timestamp: now, name: name });
    renderLogs();

    // Update the UI instantly
    const actionWord = type === 'signin' ? 'Signed in' : 'Signed out';
    const timeStr = now.toLocaleTimeString();
    
    if (lastActionMsg) {
      lastActionMsg.innerHTML = `<i class="fas fa-check-circle"></i> ${actionWord} at ${timeStr}`;
    }
    if (sessionInfo) {
      sessionInfo.innerHTML = type === 'signin' 
        ? `On duty since ${timeStr}` 
        : `Off duty since ${timeStr}`;
    }
  }

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
      const timeStr = entry.timestamp.toLocaleTimeString();
      
      html += `
        <div class="log-entry" style="border: 1px solid red; padding: 10px; margin-bottom: 5px;">
          <div><strong>${entry.name}</strong> · ${label}</div>
          <div>${timeStr}</div>
        </div>
      `;
    }
    logsList.innerHTML = html;
  }

  // STRICT DEBUG BUTTON LISTENERS
  if (signInBtn) {
    signInBtn.onclick = function() {
      console.log("Sign In Clicked!");
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
    signOutBtn.onclick = function() {
      console.log("Sign Out Clicked!");
      const name = userNameInput ? userNameInput.value.trim() : "";
      if (!name) {
        alert("Please enter your name first!");
        return;
      }
      addLog('signout', name);
      speak("Goodbye " + name);
    };
  }

  // VOICE
  function speak(text) {
    try {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    } catch(e) {}
  }

  // ONBOARDING
  const onboardBtn = document.getElementById('onboardBtn');
  const onboardOverlay = document.getElementById('onboard');
  if (onboardBtn && onboardOverlay) {
    onboardBtn.onclick = function() {
      onboardOverlay.style.display = 'none';
      speak("Welcome");
    };
  }

  // CAMERA
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => { if(video) video.srcObject = stream; })
      .catch(err => { console.log("Camera error", err); });
  }

});
