  // ============================================
  // 2. CAMERA & VOICE (BLOB FIX FOR GREEN SCREEN)
  // ============================================
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
      .then(stream => { 
        mediaStream = stream; 
        if (video) {
          // THE FIX: Convert stream to a Blob to bypass Android green screen bug
          if (window.MediaRecorder) {
            try {
              const recorder = new MediaRecorder(stream);
              const chunks = [];
              
              recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
              };
              
              recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                video.src = URL.createObjectURL(blob);
                video.play().catch(e => console.log("Play error:", e));
              };
              
              recorder.start();
              // Record a tiny 0.5 second clip to use as the live feed
              setTimeout(() => recorder.stop(), 500); 
            } catch (e) {
              // Fallback if MediaRecorder fails
              video.srcObject = stream;
            }
          } else {
            // Fallback for older browsers
            video.srcObject = stream;
          }
          
          video.onloadedmetadata = () => {
            video.play().catch(err => console.log("Play error:", err));
          };
        }
      })
      .catch(err => {
        console.error("Camera error:", err);
        alert("Please allow camera access to use DutyCam.");
      });
  }

  function takeSnapshot() {
    return new Promise((resolve) => {
      // Check if video is playing or has loaded
      if (!mediaStream || !video || (!video.videoWidth && !video.src)) return resolve(null);
      
      try {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        
        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        video.style.opacity = '0.3';
        setTimeout(() => video.style.opacity = '1', 200);
        
        setTimeout(() => resolve(canvas.toDataURL('image/jpeg', 0.5)), 300);
      } catch (e) { 
        console.warn("Snapshot failed:", e);
        resolve(null); 
      }
    });
  }
