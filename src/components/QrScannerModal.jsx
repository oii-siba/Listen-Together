import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { parseRoomId, isInAppBrowser } from '../lib/utils';

// Ensure WebRTC getUserMedia polyfill across mobile browsers & older WebViews
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
  const [permState, setPermState] = useState('requesting'); // 'requesting' | 'granted' | 'denied'
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

  // Cleanly stops and unloads the scanner hardware
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

  const handleDetected = useCallback(
    async (decodedText) => {
      if (isStoppedRef.current) return;
      isStoppedRef.current = true;

      // Haptic vibration feedback on successful scan
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

  // Directly requests permission from the browser without artificial delays
  const requestMediaPermission = useCallback(async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new Error(
        window.isSecureContext === false
          ? 'SECURE_CONTEXT_REQUIRED'
          : 'CAMERA_NOT_SUPPORTED'
      );
    }

    // Try requesting rear camera with ideal facingMode
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    // Cleanly stop tracks so hardware is free for Html5Qrcode
    try {
      stream.getTracks().forEach((track) => track.stop());
    } catch {}

    return true;
  }, []);

  // Starts the camera and attaches Html5Qrcode
  const startCamera = useCallback(
    async (preferredCameraId = null) => {
      setError('');
      setPermState('requesting');
      isStoppedRef.current = false;

      // Verify secure context & mediaDevices
      if (!navigator?.mediaDevices?.getUserMedia) {
        setPermState('denied');
        setError(
          window.isSecureContext === false
            ? 'Camera requires HTTPS or localhost. Please open via HTTPS or snap a photo of the QR code below.'
            : 'Camera access is not supported on this browser. You can snap a photo or upload a QR image below.'
        );
        return;
      }

      // 1. Explicitly request camera permission if not already granted
      try {
        await requestMediaPermission();
      } catch (permErr) {
        console.warn('Initial permission request failed:', permErr);
        setPermState('denied');
        const msg = (permErr?.message || '').toLowerCase();
        if (permErr?.name === 'NotAllowedError' || msg.includes('permission') || msg.includes('denied')) {
          setError('Camera permission denied. Tap "Allow Camera" or check browser settings below.');
        } else if (msg === 'SECURE_CONTEXT_REQUIRED') {
          setError('Camera requires HTTPS. Please open via HTTPS or take a photo below.');
        } else {
          setError('Camera permission needed. Please tap "Allow Camera" to start scanning.');
        }
        return;
      }

      if (isStoppedRef.current) return;

      // 2. Safely stop any lingering scanner instance
      try {
        if (scannerRef.current) {
          try {
            if (scannerRef.current.isScanning) await scannerRef.current.stop();
          } catch {}
          try {
            scannerRef.current.clear();
          } catch {}
          scannerRef.current = null;
        }
      } catch {}

      const id = 'qr-reader-viewport';
      const el = document.getElementById(id);
      if (!el) {
        // If DOM element is not mounted yet, retry on next animation frame
        requestAnimationFrame(() => {
          if (!isStoppedRef.current) startCamera(preferredCameraId);
        });
        return;
      }

      // Configure QR box sizing
      const config = {
        fps: 20,
        aspectRatio: 1.0,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth || 250, viewfinderHeight || 250);
          const qrboxSize = Math.max(80, Math.min(minEdge - 16, Math.floor(minEdge * 0.76)));
          return { width: qrboxSize, height: qrboxSize };
        },
      };

      // Helper to start Html5Qrcode instance
      const tryStartScanner = async (target) => {
        try {
          if (scannerRef.current) {
            try {
              if (scannerRef.current.isScanning) await scannerRef.current.stop();
            } catch {}
            try {
              scannerRef.current.clear();
            } catch {}
            scannerRef.current = null;
          }
        } catch {}

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

        // Fetch available camera devices
        const devices = await Html5Qrcode.getCameras().catch(() => []);
        if (devices && devices.length > 0) {
          setCameras(devices);
        }

        // Determine best camera to use:
        if (preferredCameraId) {
          activeScanner = await tryStartScanner(preferredCameraId);
          setActiveCameraId(preferredCameraId);
        } else {
          // Find back / rear camera
          const backCamera = devices.find((d) =>
            /back|rear|environment|facing back|world|main/i.test(d.label || '')
          );

          if (backCamera) {
            try {
              activeScanner = await tryStartScanner(backCamera.id);
              setActiveCameraId(backCamera.id);
            } catch (backErr) {
              console.warn('Back camera id start failed, trying environment constraints...', backErr);
            }
          }

          if (!activeScanner) {
            try {
              // Try facingMode environment
              activeScanner = await tryStartScanner({ facingMode: 'environment' });
            } catch (envErr) {
              console.warn('facingMode environment failed, trying fallback...', envErr);
              if (isStoppedRef.current) return;
              try {
                // Try facingMode user
                activeScanner = await tryStartScanner({ facingMode: 'user' });
              } catch (userErr) {
                console.warn('facingMode user failed, trying first enumerated camera...', userErr);
                if (isStoppedRef.current) return;
                if (devices && devices.length > 0) {
                  activeScanner = await tryStartScanner(devices[0].id);
                  setActiveCameraId(devices[0].id);
                } else {
                  throw userErr || envErr;
                }
              }
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

        // Inspect torch capability on active track
        try {
          const caps = activeScanner.getRunningTrackCapabilities();
          if (caps && caps.torch) {
            setHasTorch(true);
          }
        } catch {}
      } catch (err) {
        console.warn('Camera launch error:', err);
        setPermState('denied');
        const msg = (err?.message || '').toLowerCase();
        if (err?.name === 'NotAllowedError' || msg.includes('permission') || msg.includes('denied')) {
          setError(
            'Camera permission was denied. Tap "Allow Camera" or enable Camera access in your browser settings.'
          );
        } else if (err?.name === 'NotReadableError' || msg.includes('in use') || msg.includes('video source')) {
          setError('Camera is in use by another app. Please close other camera apps and tap "Try Camera Again".');
        } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
          setError('No camera found on this device. You can snap a photo or upload an image below.');
        } else {
          setError(err?.message || 'Could not start camera. Please allow permission or take a photo below.');
        }
      }
    },
    [handleDetected, requestMediaPermission]
  );

  // Mount effect: start camera immediately
  useEffect(() => {
    startCamera();
    return () => {
      stopScanner();
    };
  }, [startCamera, stopScanner]);

  // Direct user-gesture permission prompt handler
  const handleDirectEnablePermission = async () => {
    setError('');
    setPermState('requesting');
    try {
      await requestMediaPermission();
      startCamera();
    } catch (err) {
      console.warn('Manual permission request failed:', err);
      setPermState('denied');
      setError('Please tap the lock (🔒) or settings icon in your browser address bar and set Camera to "Allow".');
      setShowHelp(true);
    }
  };

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

  // Handles photo scan (either from file picker or mobile native camera snapshot)
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('Scanning QR image…');
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader-viewport');
      }
      const text = await scannerRef.current.scanFile(file, true);
      handleDetected(text);
    } catch (scanErr) {
      console.warn('Image scan failed:', scanErr);
      setError('Could not detect a TuneTogether QR code in this photo. Please try pointing closer to the QR code.');
      setTimeout(() => setError(''), 4000);
    } finally {
      // Clear input so same file can be selected again
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
        <div className="mb-2.5">
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
            ⚠️ You are in an in-app browser. Tap <strong>⋮ / •••</strong> and select <strong>Open in Chrome / Safari</strong>, or use the <strong>Take Photo</strong> button below.
          </div>
        )}

        {/* Camera Viewport Container */}
        <div className="relative w-full aspect-square bg-black rounded-2xl overflow-hidden border-2 border-green-500/40 shadow-inner flex items-center justify-center">
          {/* html5-qrcode target container */}
          <div
            id="qr-reader-viewport"
            className="w-full h-full min-w-[260px] min-h-[260px] overflow-hidden"
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
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4">
              <span className="w-9 h-9 border-3 border-green-400 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-bold text-white">Opening Camera…</p>
              <p className="text-[10px] text-white/60 mt-1 max-w-[220px]">
                Please tap <strong>Allow</strong> if your browser asks for camera permission.
              </p>
              <button
                type="button"
                onClick={handleDirectEnablePermission}
                className="mt-3 px-4 py-1.5 rounded-full bg-green-500/20 border border-green-400/50 text-green-300 font-bold text-[11px] active:scale-95 transition"
              >
                👉 Tap to Prompt Permission
              </button>
            </div>
          )}

          {/* Permission Denied / Error State */}
          {permState === 'denied' && (
            <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-4 text-center overflow-y-auto">
              <span className="text-3xl mb-1.5">📸</span>
              <p className="text-xs font-bold text-red-300">Camera Permission Required</p>
              <p className="text-[10.5px] text-white/70 mt-1 max-w-xs leading-relaxed">
                Mobile browser blocked camera access. Tap below to grant permission:
              </p>

              <button
                type="button"
                onClick={handleDirectEnablePermission}
                className="mt-3 px-5 py-2.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-400 text-black font-extrabold text-xs active:scale-95 transition shadow-[0_0_20px_rgba(34,197,94,0.4)]"
              >
                🔓 Allow Camera Permission
              </button>

              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="mt-2 text-[10px] text-green-400 underline hover:text-green-300 transition"
              >
                {showHelp ? 'Hide permission guide ▲' : 'How to allow on Chrome / Safari ▼'}
              </button>

              {showHelp && (
                <div className="mt-2 p-2.5 rounded-xl bg-white/5 border border-white/10 text-left text-[9.5px] text-white/80 space-y-1.5 max-w-xs">
                  <p>
                    <strong className="text-green-400">Android (Chrome/Edge):</strong> Tap the <strong>🔒 Lock icon</strong> in the address bar → <strong>Permissions</strong> → Turn <strong>Camera: ON</strong> → Tap "Allow Camera Permission".
                  </p>
                  <p>
                    <strong className="text-green-400">iPhone (Safari):</strong> Tap <strong>aA</strong> or <strong>🔒 Lock</strong> in the search bar → <strong>Website Settings</strong> → <strong>Camera: Allow</strong>.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Feedback message */}
        {error && (
          <div className="mt-2 text-[10.5px] font-medium text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-xl px-3 py-1.5 transition">
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
