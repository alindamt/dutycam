/* ============================================
   DUTYCAM · BULLETPROOF VERSION
   ============================================ */

// We wrap everything in this event listener to ensure the HTML is fully loaded before JS runs.
document.addEventListener('DOMContentLoaded', () => {

  // DOM Elements
  const video           = document.getElementById('videoElement');
  const canvas          = document.getElementById('canvasElement');
  const captureBtn      = document.getElementById('captureBtn');
  const retryCamBtn     = document.getElementById('retryCamBtn');
  const signInBtn       = document.getElementById('signInBtn');
  const signOutBtn      = document.getElementById('signOutBtn');
  const logsList        = document.getElementById('logsList');
  const clearLogsBtn    = document.getElementById('clearLogsBtn');
  const lastActionMsg   = document.getElementById('lastActionMessage');
  const snapshotBadge   = document.getElementById('snapshotBadge');
  const cameraStatus    = document.getElementById('cameraStatus');
  const currentTimeSpan = document.getElementById('currentTime');
  const sessionInfo     = document.getElementById('sessionInfo');
  const testVoiceBtn    = document.getElementById('testVoiceBtn');
  const userNameInput   = document.getElementById('userNameInput');
  const onboardOverlay  = document.getElementById('onboard');
  const onboardBtn      = document.getElementById('onboardBtn');

  // State
  let mediaStream = null;
  let logs = [];
  let voiceUnlocked = false;
  let chosenVoice = null;
  let audioCtx = null;

  // Helpers
  const formatTime = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatDate = (d) => d.toLocaleDateString([], { month: 'short', day: 'numeric' });

  // Clock
  function updateClock() { 
    if (currentTimeSpan) currentTimeSpan.textContent = formatTime(new Date()); 
  }
  setInterval(updateClock, 1000);
  updateClock();

  // Load Name on Startup
  if (localStorage.getItem('dutycam_username') && userNameInput) {
    userNameInput.value = localStorage.getItem('dutycam_username');
  }
  
  // Save Name as typed
  if (userNameInput) {
    userNameInput.addEventListener('input', (e) => {
      localStorage.setItem('dutycam_username', e.target.value);
    });
  }

  // ============================================
  //   ONBOARDING OVERLAY FIX
  // ============================================
  if (onboardBtn && onboardOverlay) {
    onboardBtn.addEventListener('click', (e) => {
      e.preventDefault(); // Prevent any weird default behavior
      onboardOverlay.style.display = 'none';
      initAudioContext();
      unlockSpeech();
    });
  }

  // ============================================
  //   VOICE ENGINE
  // ============================================
  function loadVoices() {
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return;
    const enVoices = voices.filter(v => /^en/i.test(v.lang));
    chosenVoice = enVoices.find(v => /en[-_]US/i.test(v.lang) && v.localService) || enVoices[0] || voices[0];
  }
  speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();

  function initAudioContext() {
    if (audioCtx) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = new Ctx();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) {}
  }

  function unlockSpeech() {
    initAudioContext();
    if (voiceUnlocked) return;
    try {
      const warm = new SpeechSynthesisUtterance(' ');
      warm.volume = 0.01;
      if (chosenVoice) warm.voice = chosenVoice;
      speechSynthesis.speak(warm);
      voiceUnlocked = true;
    } catch (e) {}
  }

  function speak(text) {
    if (!chosenVoice) loadVoices();
    try {
      speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.volume = 1;
      utter.rate = 0.9;
      if (chosenVoice) utter.voice = chosenVoice;
      speechSynthesis.speak(utter);
    } catch (e) {
      console.warn('Speech failed', e);
    }
  }

  // Unlock on first tap anywhere
  ['click', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, () => { initAudioContext(); unlockSpeech(); }, { once: true, passive: true });
  });

  if (testVoiceBtn) {
    testVoiceBtn.addEventListener('click', () => {
      initAudioContext();
      unlockSpeech();
      setTimeout(() => speak('Voice test successful'), 100);
    });
  }

  // ============================================
  //   LOG MANAGEMENT
  // ============================================
  function renderLogs() {
    if (!logs.length) {
      logsList.innerHTML = `<div class="empty-log">No sign in/out records yet.</div>`;
      return;
    }
    const reversed = [...logs].reverse();
    logsList.innerHTML = reversed.map(entry => {
      const icon = entry.type === 'signin'
        ? '<i class="fas fa-sign-in-alt" style="color: #0b9e6b;"></i>'
        : '<i class="fas fa-sign-out-alt" style="color: #d64545;"></i>';
      
      const label = entry.type === 'signin' ? 'Sign In' : 'Sign Out';
      const displayName = entry.name || 'Unknown';
      const timeStr = `${formatDate(entry.timestamp)} · ${formatTime(entry.timestamp)}`;
      
      return `
        <div class="log-entry">
          <div class="log-type">
            ${icon} 
            <span style="color: white; font-weight: 600; margin-right: 4px;">${displayName}</span> 
            <span style="color: #9aa6c2; font-size: 0.85rem;">· ${label}</span>
          </div>
          <div class="log-time">${timeStr}</div>
        </div>
      `;
    }).join('');
  }

  function addLog(type, name) {
    const now = new Date();
    logs.push({ type, timestamp: now, name: name });
    if (logs.length > 20) logs.shift();
    try { localStorage.setItem('dutycam_logs', JSON.stringify(logs)); } catch (e) {}
    renderLogs();

    const actionWord = type === 'signin' ? 'Signed in' : 'Signed out';
    const timeStr = formatTime(now);
    const color = type === 'signin' ? '#0b9e6b' : '#d64545';

    lastActionMsg.innerHTML = `<i class="fas fa-check-circle" style="color: ${color};"></i> ${actionWord} at ${timeStr}`;
    sessionInfo.innerHTML = type === 'signin'
      ? `<i class="fas fa-user-check" style="color: #0b9e6b;"></i> On duty since ${timeStr}`
      : `<i class="fas fa-user-slash" style="color: #d64545;"></i> Off duty since ${timeStr}`;
  }

  if (clearLogsBtn) {
    clearLogsBtn.addEventListener('click', () => {
      if (confirm('Clear all activity logs?')) {
        logs = [];
        localStorage.removeItem('dutycam_logs');
        renderLogs();
        lastActionMsg.innerHTML = `<i class="fas fa-history"></i> No recent activity`;
        sessionInfo.textContent = 'Idle';
      }
    });
  }

  // ============================================
  //   CAMERA
  // ============================================
  async function startCamera() {
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      mediaStream = stream;
      video.srcObject = stream;
      cameraStatus.textContent = 'active';
      cameraStatus.style.background = '#0b9e6b';
      cameraStatus.style.boxShadow = '0 0 10px #0b9e6b80';
    } catch (err) {
      cameraStatus.textContent = 'unavailable';
      cameraStatus.style.background = '#d64545';
      alert('Unable to access camera. Please check permissions.');
    }
  }

  if (retryCamBtn) retryCamBtn.addEventListener('click', startCamera);

  // ============================================
  //   SNAPSHOT
  // ============================================
  function captureSnapshot() {
    return new Promise((resolve) => {
      if (!mediaStream || !video.videoWidth) return resolve(false);
      try {
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        video.style.opacity = '0.4';
        setTimeout(() => { video.style.opacity = '1'; }, 180);

        snapshotBadge.style.display = 'flex';
        setTimeout(() => { snapshotBadge.style.display = 'none'; }, 2000);
        resolve(true);
      } catch (e) { resolve(false); }
    });
  }

  if (captureBtn) {
    captureBtn.addEventListener('click', async () => {
      const ok = await captureSnapshot();
      if (ok) speak('Snapshot saved');
    });
  }

  // ============================================
  //   SIGN IN / SIGN OUT
  // ============================================
  async function handleSignIn() {
    const name = userNameInput.value.trim();
    if (!name) return alert('Please enter your name first!');
    
    initAudioContext();
    unlockSpeech();
    speak('Welcome, ' + name);
    addLog('signin', name);
    captureSnapshot();
  }

  async function handleSignOut() {
    const name = userNameInput.value.trim();
    if (!name) return alert('Please enter your name first!');
    
    initAudioContext();
    unlockSpeech();
    speak('Goodbye, ' + name);
    addLog('signout', name);
    captureSnapshot();
  }

  if (signInBtn) signInBtn.addEventListener('click', handleSignIn);
  if (signOutBtn) signOutBtn.addEventListener('click', handleSignOut);

  // ============================================
  //   START APP
  // ============================================
  try {
    const saved = localStorage.getItem('dutycam_logs');
    if (saved) {
      logs = JSON.parse(saved);
      renderLogs();
    }
  } catch (e) {}

  startCamera();
  if (lastActionMsg) {
    lastActionMsg.innerHTML = `<i class="fas fa-info-circle"></i> Enter your name and use Sign In / Sign Out.`;
  }
});
