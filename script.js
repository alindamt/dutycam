/* ============================================
   DUTYCAM · MAIN SCRIPT
   ============================================ */

// ---------- DOM ELEMENTS ----------
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

// ---------- STATE ----------
let mediaStream = null;
let logs = [];
let lastAction = null;

// ---------- HELPERS ----------
const formatTime = (date) =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const formatDate = (date) =>
  date.toLocaleDateString([], { month: 'short', day: 'numeric' });

// ---------- LIVE CLOCK ----------
function updateClock() {
  currentTimeSpan.textContent = formatTime(new Date());
}
setInterval(updateClock, 1000);
updateClock();

// ---------- LOG MANAGEMENT ----------
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

  // Persist (optional but included)
  try {
    localStorage.setItem('dutycam_logs', JSON.stringify(logs));
  } catch (e) { /* localStorage may be disabled */ }

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

// Clear logs
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

// ---------- CAMERA ----------
async function startCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    });

    mediaStream = stream;
    video.srcObject = stream;

    cameraStatus.textContent = 'active';
    cameraStatus.style.background = '#0b9e6b';
    cameraStatus.style.boxShadow = '0 0 10px #0b9e6b80';
  } catch (err) {
    console.error('Camera error:', err);
    cameraStatus.textContent = 'unavailable';
    cameraStatus.style.background = '#d64545';
    cameraStatus.style.boxShadow = '0 0 10px #d6454580';
    alert('Unable to access camera. Please check permissions.');
  }
}

// Stop camera on page unload
window.addEventListener('beforeunload', () => {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
  }
});

// Restart camera
retryCamBtn.addEventListener('click', () => {
  startCamera();
});

// Capture snapshot
captureBtn.addEventListener('click', () => {
  if (!mediaStream || !video.videoWidth) {
    alert('Camera not ready. Please wait or restart camera.');
    return;
  }

  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Visual feedback
  snapshotBadge.style.display = 'flex';
  setTimeout(() => { snapshotBadge.style.display = 'none'; }, 2000);

  video.style.opacity = '0.5';
  setTimeout(() => { video.style.opacity = '1'; }, 150);

  // Optional: log to console
  const dataUrl = canvas.toDataURL('image/png');
  console.log('Snapshot captured (length):', dataUrl.length);
});

// ---------- SIGN IN / SIGN OUT ----------
function handleSignIn() {
  if (!mediaStream) {
    if (!confirm('Camera is not active. Continue sign in without photo verification?')) return;
  }
  if (mediaStream && video.videoWidth) {
    video.style.opacity = '0.5';
    setTimeout(() => { video.style.opacity = '1'; }, 150);
  }
  addLog('signin');
}

function handleSignOut() {
  if (!mediaStream) {
    if (!confirm('Camera is not active. Continue sign out without photo verification?')) return;
  }
  if (mediaStream && video.videoWidth) {
    video.style.opacity = '0.5';
    setTimeout(() => { video.style.opacity = '1'; }, 150);
  }
  addLog('signout');
}

signInBtn.addEventListener('click', handleSignIn);
signOutBtn.addEventListener('click', handleSignOut);

// ---------- INIT ----------
(function init() {
  // Load saved logs
  try {
    const saved = localStorage.getItem('dutycam_logs');
    if (saved) {
      logs = JSON.parse(saved);
      renderLogs();
    }
  } catch (e) { /* ignore */ }

  // Start camera
  startCamera();

  // Friendly message
  lastActionMsg.innerHTML =
    `<i class="fas fa-info-circle"></i> Use Sign In / Sign Out to record duty.`;
})();