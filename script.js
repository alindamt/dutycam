/* ============================================
   DUTYCAM v3 · Universal Smartphone Support
   Works on: Tecno, itel, Samsung, Motorola,
             Infinix, Xiaomi, Realme, Oppo, Vivo,
             Nokia, iPhone, Pixel, OnePlus, etc.
   ============================================ */

// ---------- DOM ----------
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

// ---------- STATE ----------
let mediaStream = null;
let logs = [];
let lastAction = null;
let voiceUnlocked = false;
let chosenVoice = null;
let audioCtx = null;   // fallback beep for phones where TTS fails

// ---------- HELPERS ----------
const formatTime = (d) =>
  d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const formatDate = (d) =>
  d.toLocaleDateString([], { month: 'short', day: 'numeric' });

// ---------- CLOCK ----------
function updateClock() { currentTimeSpan.textContent = formatTime(new Date()); }
setInterval(updateClock, 1000);
updateClock();

// ============================================
//   DEVICE DETECTION (helps pick voice strategy)
// ============================================
const ua = navigator.userAgent || '';
const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = /Android/i.test(ua);

console.log('📱 Device:', { isIOS, isAndroid });

// ============================================
//   VOICE ENGINE (universal)
// ============================================

// Load + pick the best English voice for this device
function loadVoices() {
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return;

  const enVoices = voices.filter(v => /^en/i.test(v.lang));

  chosenVoice =
    enVoices.find(v => /en[-_]US/i.test(v.lang) && v.localService) ||
    enVoices.find(v => /google.*(us|uk)/i.test(v.name)) ||
    enVoices.find(v => /microsoft/i.test(v.name)) ||
    enVoices.find(v => v.localService) ||
    enVoices[0] ||
    voices[0];

  if (chosenVoice) {
    console.log('🎙️ Voice selected:', chosenVoice.name, chosenVoice.lang);
  }
}

// iOS / Android fire this asynchronously
speechSynthesis.onvoiceschanged = loadVoices;
speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
loadVoices();
setTimeout(loadVoices, 300);
setTimeout(loadVoices, 1200);

// Prepare audio context (unlocks media volume on Android)
function initAudioContext() {
  if (audioCtx) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { /* ignore */ }
}

// Unlock speech — CRITICAL on Tecno/itel/Samsung/Android
function unlockSpeech() {
  initAudioContext();
  if (voiceUnlocked) return;

  try {
    const warm = new SpeechSynthesisUtterance(' ');
    warm.volume = 0.01;      // near-silent, but >0 so Android accepts it
    warm.lang = 'en-US';
    if (chosenVoice) warm.voice = chosenVoice;
    speechSynthesis.speak(warm);
    voiceUnlocked = true;
    console.log('🔊 Voice unlocked');
  } catch (e) {
    console.warn('Voice unlock failed:', e);
  }
}

// Universal speak function
function speak(text) {
  if (!chosenVoice) loadVoices();

  try {
    speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.volume = 1;
    utter.rate = 0.9;         
    utter.pitch = 1.0;
    utter.lang = chosenVoice?.lang || 'en-US';
    if (chosenVoice) utter.voice = chosenVoice;

    // Safety net: fallback beep
    let spoken = false;
    utter.onstart = () => { spoken = true; };
    utter.onerror = (e) => {
      console.warn('Speech error:', e);
      fallbackBeep();
    };

    speechSynthesis.speak(utter);

    setTimeout(() => {
      if (!spoken && !speechSynthesis.speaking) {
        console.warn('Speech did not start — using fallback beep');
        fallbackBeep();
      }
    }, 800);

  } catch (e) {
    console.warn('Speak failed:', e);
    fallbackBeep();
  }
}

// Fallback tone
function fallbackBeep() {
  if (!audioCtx) initAudioContext();
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  } catch (e) { /* silent fail */ }
}

// Global unlock on first tap anywhere
['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'].forEach(evt => {
  document.addEventListener(evt, () => {
    initAudioContext();
    unlockSpeech();
  }, { once: true, passive: true });
});

// Test Voice button
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
    const label = entry.type === 'signin' ? 'Sign in' : 'Sign out';
    const timeStr = `${formatDate(entry.timestamp)} · ${formatTime(entry.timestamp)}`;
    return `
      <div class="log-entry">
        <div class="log-type">${icon} ${label}</div>
        <div class="log-time">${timeStr}</div>
      </div>
    `;
  }).join('');
}

function addLog(type) {
  const now = new Date();
  logs.push({ type, timestamp: now });
  if (logs.length > 20) logs.shift();

  try { localStorage.setItem('dutycam_logs', JSON.stringify(logs)); } catch (e) {}

  renderLogs();

  lastAction = type;
  const actionWord = type === 'signin' ? 'Signed in' : 'Signed out';
  const timeStr = formatTime(now);
  const color = type === 'signin' ? '#0b9e6b' : '#d64545';

  lastActionMsg.innerHTML =
    `<i class="fas fa-check-circle" style="color: ${color};"></i> ${actionWord} at ${timeStr}`;

  sessionInfo.innerHTML = type === 'signin'
    ? `<i class="fas fa-user-check" style="color: #0b9e6b;"></i> On duty since ${timeStr}`
    : `<i class="fas fa-user-slash" style="color: #d64545;"></i> Off duty since ${timeStr}`;
}

clearLogsBtn.addEventListener('click', () => {
  if (confirm('Clear all activity logs?')) {
    logs = [];
    localStorage.removeItem('dutycam_logs');
    renderLogs();
    lastActionMsg.innerHTML = `<i class="fas fa-history"></i> No recent activity`;
    sessionInfo.textContent = 'Idle';
    lastAction = null;
  }
});

// ============================================
//   CAMERA (universal)
// ============================================
async function startCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    cameraStatus.textContent = 'unsupported';
    cameraStatus.style.background = '#d64545';
    alert('Your browser does not support camera access.\n\nPlease use Chrome, Safari, or Edge.');
    return;
  }

  let constraints = {
    audio: false,
    video: {
      facingMode: 'user',
      width:  { ideal: 1280 },
      height: { ideal: 720 }
    }
  };

  if (isIOS) {
    constraints = { audio: false, video: { facingMode: 'user' } };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    mediaStream = stream;
    video.srcObject = stream;

    video.onloadedmetadata = () => {
      video.play().catch(e => console.warn('play() failed:', e));
    };

    cameraStatus.textContent = 'active';
    cameraStatus.style.background = '#0b9e6b';
    cameraStatus.style.boxShadow = '0 0 10px #0b9e6b80';

  } catch (err) {
    console.error('Camera error:', err.name, err.message);
    let msg = 'Unable to access camera.';
    if (err.name === 'NotAllowedError') {
      msg = 'Camera permission denied.\n\nTap the 🔒 lock icon in your browser address bar → allow Camera → reload page.';
    } else if (err.name === 'NotFoundError') {
      msg = 'No camera found on this device.';
    } else if (err.name === 'NotReadableError') {
      msg = 'Camera is being used by another app.\n\nClose other apps using the camera (WhatsApp, Zoom, Camera app) and tap Restart Camera.';
    } else if (err.name === 'OverconstrainedError') {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        mediaStream = s;
        video.srcObject = s;
        cameraStatus.textContent = 'active';
        cameraStatus.style.background = '#0b9e6b';
        return;
      } catch (e2) {
        msg = 'Camera constraints failed. Please try another browser.';
      }
    }

    cameraStatus.textContent = 'unavailable';
    cameraStatus.style.background = '#d64545';
    alert(msg);
  }
}

window.addEventListener('beforeunload', () => {
  if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
});

retryCamBtn.addEventListener('click', startCamera);

// ============================================
//   SNAPSHOT (universal)
// ============================================
function captureSnapshot() {
  return new Promise((resolve) => {
    if (!mediaStream || !video.videoWidth) {
      console.warn('Camera not ready — skipping snapshot');
      return resolve(false);
    }

    try {
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Visual flash
      video.style.opacity = '0.4';
      setTimeout(() => { video.style.opacity = '1'; }, 180);

      // Badge
      snapshotBadge.style.display = 'flex';
      setTimeout(() => { snapshotBadge.style.display = 'none'; }, 2000);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');

      try {
        sessionStorage.setItem('dutycam_last_snapshot', dataUrl);
        sessionStorage.setItem('dutycam_last_snapshot_time', stamp);
      } catch (e) {
        window.__lastSnapshot = dataUrl;
      }

      console.log(`📸 Snapshot captured (${(dataUrl.length / 1024).toFixed(1)} KB)`);
      resolve(true);
    } catch (e) {
      console.warn('Capture failed:', e);
      resolve(false);
    }
  });
}

captureBtn.addEventListener('click', async () => {
  const ok = await captureSnapshot();
  if (ok) {
    speak('Snapshot saved');
  }
});

// ============================================
//   SIGN IN / SIGN OUT (Fixed Voice Timing)
// ============================================
async function handleSignIn() {
  // 1. Unlock audio/voice on first tap
  initAudioContext();
  unlockSpeech();

  // 2. Speak IMMEDIATELY on tap (browsers require voice on exact tap)
  speak('Welcome');

  // 3. Add log
  addLog('signin');

  // 4. Auto-capture AFTER voice starts
  captureSnapshot();
}

async function handleSignOut() {
  initAudioContext();
  unlockSpeech();

  // 1. Speak IMMEDIATELY on tap
  speak('Goodbye');

  // 2. Add log
  addLog('signout');

  // 3. Auto-capture AFTER voice starts
  captureSnapshot();
}

signInBtn.addEventListener('click', handleSignIn);
signOutBtn.addEventListener('click', handleSignOut);

// ============================================
//   ONBOARDING OVERLAY (First visit)
// ============================================
const onboardOverlay = document.getElementById('onboard');
const onboardBtn = document.getElementById('onboardBtn');

if (onboardBtn && onboardOverlay) {
  onboardBtn.addEventListener('click', () => {
    onboardOverlay.style.display = 'none';
    
    // Unlock audio/voice when they click "Got it"
    initAudioContext();
    unlockSpeech();
    
    // Optional greeting
    setTimeout(() => {
      speak('Welcome to Duty Cam');
    }, 300);
  });
}

// ============================================
//   INIT
// ============================================
(function init() {
  try {
    const saved = localStorage.getItem('dutycam_logs');
    if (saved) {
      logs = JSON.parse(saved);
      renderLogs();
    }
  } catch (e) {}

  startCamera();

  lastActionMsg.innerHTML =
    `<i class="fas fa-info-circle"></i> Tap "Test Voice" once, then use Sign In / Sign Out.`;
})();

// ============================================
//   NAME INPUT (Save and Greet User)
// ============================================
const userNameInput = document.getElementById('userNameInput');

// Load saved name on startup
if (localStorage.getItem('dutycam_username')) {
  userNameInput.value = localStorage.getItem('dutycam_username');
}

// Save name as they type
userNameInput.addEventListener('input', (e) => {
  localStorage.setItem('dutycam_username', e.target.value);
});

// Override the Sign In / Sign Out to include the name
const originalHandleSignIn = handleSignIn;
const originalHandleSignOut = handleSignOut;

handleSignIn = async function() {
  const name = userNameInput.value.trim();
  if (!name) {
    alert('Please enter your name first!');
    return;
  }
  initAudioContext();
  unlockSpeech();
  speak('Welcome, ' + name); // Speak with name
  addLog('signin');
  captureSnapshot();
};

handleSignOut = async function() {
  const name = userNameInput.value.trim();
  if (!name) {
    alert('Please enter your name first!');
    return;
  }
  initAudioContext();
  unlockSpeech();
  speak('Goodbye, ' + name); // Speak with name
  addLog('signout');
  captureSnapshot();
};

// Re-attach the new functions to the buttons
signInBtn.removeEventListener('click', originalHandleSignIn);
signOutBtn.removeEventListener('click', originalHandleSignOut);
signInBtn.addEventListener('click', handleSignIn);
signOutBtn.addEventListener('click', handleSignOut);

