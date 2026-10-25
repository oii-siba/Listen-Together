import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { parseRoomId, isInAppBrowser } from '../lib/utils';

// WebRTC getUserMedia polyfill for older mobile browsers & WebViews
if (typeof navigator !== 'undefined') {
  if (!navigator.mediaDevices) {
    navigator.mediaDevices = {};
  }
  if (!navigator.mediaDevices.getUserMedia) {
    const legacyGUM =
      navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia ||
      navigator.msGetUserMedia;
    if (legacyGUM) {
      navigator.mediaDevices.getUserMedia = (constraints) =>
        new Promise((resolve, reject) => {
          legacyGUM.call(navigator, constraints, resolve, reject);
        });
    }
  }
}

export default function QrScannerModal({ onClose, onScanSuccess }) {
  const [error, setError] = useState('');
  const [permState, setPermState] = useState('prompt'); // 'prompt' | 'requesting' | 'granted' | 'denied'
  const [cameras, setCameras] = useState([]);
  const [activeCameraId, setActiveCameraId] = useState(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const scannerRef = useRef(null);
  const isStoppedRef = useRef(false);
  const fileInputRef = useRef(null);
  const cameraSnapRef = useRef(null);

  // Stop scanner cleanly
  const stopScanner = useCallback(async () => {
    isStoppedRef.current = true;
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      try {
        scanner.clear();
      } catch {}
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  // Handle successful QR code decode
  const handleDetected = useCallback(
    async (decodedText) => {
      if (isStoppedRef.current) return;
      isStoppedRef.current = true;

      // Haptic feedback
      try {
        if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
      } catch {}

      const extractedRoomId = parseRoomId(decodedText);
      if (extractedRoomId) {
        await stopScanner();
        onScanSuccess(extractedRoomId);
      } else {
        isStoppedRef.current = false;
        setError(`Not a TuneTogether QR code: "${decodedText.slice(0, 25)}…"`);
        setTimeout(() => setError(''), 3500);
      }
    },
    [onScanSuccess, stopScanner]
  );

  // Core start scanner method
  const startCamera = useCallback(
    async (preferredCameraId = null) => {
      setError('');
      setPermState('requesting');
      isStoppedRef.current = false;

      // Cleanly stop any existing scanner
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) await scannerRef.current.stop();
        } catch {}
        try {
          scannerRef.current.clear();
        } catch {}
        scannerRef.current = null;
      }

      const id = 'qr-reader-viewport';
      const el = document.getElementById(id);
      if (!el) {
        requestAnimationFrame(() => {
          if (!isStoppedRef.current) startCamera(preferredCameraId);
        });
        return;
      }

      el.innerHTML = '';

      // Scanner configuration (no fixed aspectRatio to prevent mobile camera sensor overconstraint)
      const config = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth || 250, viewfinderHeight || 250);
          const qrboxSize = Math.max(80, Math.min(minEdge - 16, Math.floor(minEdge * 0.78)));
          return { width: qrboxSize, height: qrboxSize };
        },
      };

      const tryStart = async (target) => {
        if (scannerRef.current) {
          try {
            if (scannerRef.current.isScanning) await scannerRef.current.stop();
          } catch {}
          try {
            scannerRef.current.clear();
          } catch {}
        }
        el.innerHTML = '';
        const scanner = new Html5Qrcode(id);
        scannerRef.current = scanner;

        await scanner.start(
          target,
          config,
          (text) => handleDetected(text),
          () => {}
        );
        return scanner;
      };

      try {
        let activeScanner = null;

        if (preferredCameraId) {
          activeScanner = await tryStart(preferredCameraId);
          setActiveCameraId(preferredCameraId);
        } else {
          // Priority 1: Rear camera via facingMode environment
          try {
            activeScanner = await tryStart({ facingMode: 'environment' });
          } catch (envErr) {
            console.warn('facingMode environment failed, checking device cameras...', envErr);
            if (isStoppedRef.current) return;

            // Priority 2: Check enumerated cameras for back camera
            const devices = await Html5Qrcode.getCameras().catch(() => []);
            if (devices && devices.length > 0) {
              setCameras(devices);
              const backCam = devices.find((d) =>
                /back|rear|environment|facing back|world|main/i.test(d.label || '')
              );
              const targetId = backCam ? backCam.id : devices[0].id;
              try {
                activeScanner = await tryStart(targetId);
                setActiveCameraId(targetId);
              } catch (idErr) {
                console.warn('Camera deviceId failed, trying user camera...', idErr);
                if (isStoppedRef.current) return;
                // Priority 3: Front camera fallback
                activeScanner = await tryStart({ facingMode: 'user' });
              }
            } else {
              // Priority 4: Generic user camera
              activeScanner = await tryStart({ facingMode: 'user' });
            }
          }
        }

        if (isStoppedRef.current) {
          try {
            if (activeScanner && activeScanner.isScanning) await activeScanner.stop();
            activeScanner?.clear();
          } catch {}
          return;
        }

        setPermState('granted');
        setIsScanning(true);

        // Fetch cameras for switch button
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            setCameras(devices);
          }
        } catch {}

        // Check torch capability
        try {
          const caps = activeScanner.getRunningTrackCapabilities();
          if (caps && caps.torch) {
            setHasTorch(true);
          }
        } catch {}
      } catch (err) {
        console.warn('Camera start error:', err);
        setPermState('denied');
        const errName = err?.name || '';
        const msg = (err?.message || (typeof err === 'string' ? err : '')).toLowerCase();

        if (errName === 'NotAllowedError' || msg.includes('permission') || msg.includes('denied')) {
          setError('Camera permission was blocked. Tap "Allow Camera" or enable Camera access in your browser settings.');
        } else if (errName === 'NotReadableError' || msg.includes('in use') || msg.includes('source')) {
          setError('Camera is being used by another app. Please close other camera apps and retry.');
        } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
          setError('No camera device found. Tap "Take Photo" below to snap the QR code.');
        } else {
          setError(
            msg ? `Camera error: ${msg.slice(0, 80)}` : 'Could not start camera stream. Tap "Take Photo" below to scan with camera.'
          );
        }
      }
    },
    [handleDetected]
  );

  // Direct user-gesture permission prompt & start handler
  const handleEnablePermission = async () => {
    setError('');
    setPermState('requesting');

    // Explicitly prompt via native getUserMedia in user gesture stack
    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (e) {
      console.warn('Direct getUserMedia prompt rejected:', e);
    }

    startCamera();
  };

  // Try auto-starting on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopScanner();
    };
  }, [startCamera, stopScanner]);

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const next = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: next }],
      });
      setIsTorchOn(next);
    } catch {}
  };

  const switchCamera = async () => {
    if (cameras.length <= 1) return;
    const curIdx = cameras.findIndex((c) => c.id === activeCameraId);
    const nextIdx = (curIdx + 1) % cameras.length;
    const nextId = cameras[nextIdx].id;
    setActiveCameraId(nextId);
    await stopScanner();
    startCamera(nextId);
  };

  // Dedicated file scanner (uses dummy element so it never conflicts with live camera)
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('Scanning QR photo…');
    try {
      await stopScanner();

      const dummyId = 'qr-reader-file-dummy';
      let dummyEl = document.getElementById(dummyId);
      if (!dummyEl) {
        dummyEl = document.createElement('div');
        dummyEl.id = dummyId;
        dummyEl.style.display = 'none';
        document.body.appendChild(dummyEl);
      }
      dummyEl.innerHTML = '';

      const fileScanner = new Html5Qrcode(dummyId);
      const text = await fileScanner.scanFile(file, false);
      try {
        fileScanner.clear();
      } catch {}
      handleDetected(text);
    } catch (scanErr) {
      console.warn('Image scan failed:', scanErr);
      setError('Could not detect QR code in this photo. Please hold camera closer to the QR code.');
      setTimeout(() => setError(''), 4000);
    } finally {
      e.target.value = '';
    }
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  const inApp = isInAppBrowser();

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-panel border border-green-500/30 rounded-3xl p-4 sm:p-5 shadow-[0_0_50px_rgba(34,197,94,0.25)] relative text-center flex flex-col max-h-[94vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={handleClose}
          type="button"
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/70 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-bold tracking-wider uppercase mb-1">
            <span>📷</span> Camera Scanner
          </div>
          <h2 className="text-lg font-extrabold text-white">Scan Room QR Code</h2>
          <p className="text-[11px] text-white/60">
            Point camera at friend's QR code to enter room instantly.
          </p>
        </div>

        {/* In-App Browser Warning Alert */}
        {inApp && (
          <div className="mb-2 p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[10.5px] text-amber-300 text-left leading-relaxed">
            ⚠️ You are in an in-app browser. Tap <strong>⋮ / •••</strong> and choose <strong>Open in Chrome / Safari</strong>, or tap <strong>Take Photo</strong> below.
          </div>
        )}

        {/* Camera Viewport Container */}
        <div className="relative w-full aspect-square bg-black rounded-2xl overflow-hidden border-2 border-green-500/40 shadow-inner">
          {/* html5-qrcode target container */}
          <div
            id="qr-reader-viewport"
            style={{ width: '100%', height: '100%', minHeight: '260px' }}
          />

          {/* Futuristic HUD Scan Overlay */}
          {permState === 'granted' && isScanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-56 h-56 relative rounded-2xl border border-green-400/40">
                <span className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-green-400 rounded-tl-lg" />
                <span className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-green-400 rounded-tr-lg" />
                <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-green-400 rounded-bl-lg" />
                <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-green-400 rounded-br-lg" />
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent shadow-[0_0_12px_#22c55e] animate-[scanLaser_2.2s_ease-in-out_infinite]" />
              </div>
            </div>
          )}

          {/* Permission Requesting State */}
          {permState === 'requesting' && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 z-10">
              <span className="w-9 h-9 border-3 border-green-400 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-bold text-white">Opening Camera…</p>
              <p className="text-[10px] text-white/60 mt-1 max-w-[220px]">
                Please tap <strong>Allow</strong> if prompted by your mobile browser.
              </p>
              <button
                type="button"
                onClick={handleEnablePermission}
                className="mt-3 px-4 py-1.5 rounded-full bg-green-500/20 border border-green-400/50 text-green-300 font-bold text-[11px] active:scale-95 transition"
              >
                👉 Tap to Enable Camera
              </button>
            </div>
          )}

          {/* Permission Denied / Error State */}
          {permState === 'denied' && (
            <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-4 text-center overflow-y-auto z-10">
              <span className="text-3xl mb-1.5">📸</span>
              <p className="text-xs font-bold text-red-300">Camera Access Blocked</p>
              <p className="text-[10.5px] text-white/70 mt-1 max-w-xs leading-relaxed">
                Mobile browser needs permission, or you can take a photo of the QR code:
              </p>

              <button
                type="button"
                onClick={handleEnablePermission}
                className="mt-2.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-400 text-black font-extrabold text-xs active:scale-95 transition shadow-[0_0_20px_rgba(34,197,94,0.4)]"
              >
                🔓 Allow Camera Permission
              </button>

              {/* Instant Camera Snap Action */}
              <button
                type="button"
                onClick={() => cameraSnapRef.current?.click()}
                className="mt-2 px-4 py-2 rounded-full bg-panel2 border border-green-500/40 text-green-300 font-bold text-[11px] hover:bg-green-500/20 active:scale-95 transition flex items-center gap-1.5"
              >
                <span>📸</span>
                <span>Take Photo with Camera</span>
              </button>

              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="mt-2 text-[10px] text-green-400 underline hover:text-green-300 transition"
              >
                {showHelp ? 'Hide guide ▲' : 'Browser settings guide ▼'}
              </button>

              {showHelp && (
                <div className="mt-2 p-2.5 rounded-xl bg-white/5 border border-white/10 text-left text-[9.5px] text-white/80 space-y-1.5 max-w-xs">
                  <p>
                    <strong className="text-green-400">Android:</strong> Tap the <strong>🔒 Lock icon</strong> beside URL → <strong>Permissions</strong> → Set <strong>Camera to Allow</strong>.
                  </p>
                  <p>
                    <strong className="text-green-400">iPhone:</strong> Tap <strong>aA</strong> or <strong>🔒 Lock</strong> in address bar → <strong>Website Settings</strong> → <strong>Camera: Allow</strong>.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hidden dummy element for scanFile */}
        <div id="qr-reader-file-dummy" className="hidden" />

        {/* Feedback message */}
        {error && (
          <div className="mt-2 text-[10.5px] font-medium text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-xl px-3 py-1.5 transition text-left">
            {error}
          </div>
        )}

        {/* Camera Controls & Mobile Fallback Options */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {/* Flip Camera (Front / Rear) */}
          {cameras.length > 1 && (
            <button
              type="button"
              onClick={switchCamera}
              className="px-3 py-2 rounded-full bg-panel2 border border-white/10 text-white font-bold text-xs hover:bg-white/10 active:scale-95 transition flex items-center gap-1.5"
              title="Switch between front and back camera"
            >
              <span>🔄</span>
              <span>Flip Camera</span>
            </button>
          )}

          {/* Flashlight / Torch */}
          {hasTorch && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`px-3 py-2 rounded-full border text-xs font-bold active:scale-95 transition flex items-center gap-1.5 ${
                isTorchOn
                  ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                  : 'bg-panel2 border-white/10 text-white hover:bg-white/10'
              }`}
              title="Toggle Flashlight"
            >
              <span>🔦</span>
              <span>{isTorchOn ? 'Torch On' : 'Torch'}</span>
            </button>
          )}

          {/* Mobile Native Camera Snap Fallback: Opens phone camera app natively */}
          <button
            type="button"
            onClick={() => cameraSnapRef.current?.click()}
            className="px-3.5 py-2 rounded-full bg-green-500/20 border border-green-500/40 text-green-300 font-bold text-xs hover:bg-green-500/30 active:scale-95 transition flex items-center gap-1.5"
            title="Take a photo of QR code with phone camera app"
          >
            <span>📸</span>
            <span>Take Photo</span>
          </button>
          <input
            ref={cameraSnapRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Upload Image from Gallery */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 rounded-full bg-panel2 border border-white/10 text-white font-bold text-xs hover:bg-white/10 active:scale-95 transition flex items-center gap-1.5"
            title="Upload QR Code from Photos"
          >
            <span>🖼️</span>
            <span>Gallery</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Bottom manual join fallback */}
        <p className="mt-2.5 text-[10.5px] text-white/40">
          Tip: You can also enter the 8-character Room Code on the home screen.
        </p>
      </div>

      <style>{`
        #qr-reader-viewport {
          width: 100% !important;
          height: 100% !important;
          min-height: 260px !important;
          border: none !important;
        }
        #qr-reader-viewport video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 1rem !important;
        }
        @keyframes scanLaser {
          0% { top: 6%; opacity: 0.3; }
          50% { top: 92%; opacity: 1; }
          100% { top: 6%; opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
