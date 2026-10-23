import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { parseRoomId } from '../lib/utils';

export default function QrScannerModal({ onClose, onScanSuccess }) {
  const [error, setError] = useState('');
  const [permState, setPermState] = useState('requesting'); // 'requesting' | 'granted' | 'denied'
  const [cameras, setCameras] = useState([]);
  const [activeCameraId, setActiveCameraId] = useState(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const scannerRef = useRef(null);
  const isStoppedRef = useRef(false);
  const fileInputRef = useRef(null);

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
        setTimeout(() => setError(''), 3000);
      }
    },
    [onScanSuccess, stopScanner]
  );

  const startCamera = useCallback(
    async (preferredCameraId = null) => {
      setError('');
      setPermState('requesting');
      isStoppedRef.current = false;

      // 1. Verify mediaDevices support and HTTPS/localhost context
      if (!navigator?.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPermState('denied');
        setError(
          window.isSecureContext === false
            ? 'Camera requires a secure HTTPS connection or localhost. Please open via HTTPS or upload a QR image below.'
            : 'Camera access is not supported on this browser. Please upload a QR image below.'
        );
        return;
      }

      // 2. Cleanly stop any running scanner instance
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

      // Short pause to ensure media hardware releases cleanly
      await new Promise((resolve) => setTimeout(resolve, 120));
      if (isStoppedRef.current) return;

      const id = 'qr-reader-viewport';
      const el = document.getElementById(id);
      // Wait if container element is not yet rendered or has 0 dimensions
      if (!el || el.clientWidth === 0) {
        setTimeout(() => {
          if (!isStoppedRef.current) startCamera(preferredCameraId);
        }, 120);
        return;
      }

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth || 250, viewfinderHeight || 250);
          const qrboxSize = Math.max(80, Math.min(minEdge - 24, Math.floor(minEdge * 0.72)));
          return { width: qrboxSize, height: qrboxSize };
        },
      };

      // Helper to attempt starting with a fresh Html5Qrcode instance
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

        // Sequence of camera candidates:
        if (preferredCameraId) {
          activeScanner = await tryStartScanner(preferredCameraId);
        } else {
          try {
            // Priority 1: Rear camera (environment)
            activeScanner = await tryStartScanner({ facingMode: 'environment' });
          } catch (envErr) {
            console.warn('Rear camera not available, trying user/front camera...', envErr);
            if (isStoppedRef.current) return;
            try {
              // Priority 2: Front / User camera (webcams, laptops, tablets)
              activeScanner = await tryStartScanner({ facingMode: 'user' });
            } catch (userErr) {
              console.warn('Front camera failed, trying enumerated device fallback...', userErr);
              if (isStoppedRef.current) return;
              // Priority 3: First available device ID
              const devices = await Html5Qrcode.getCameras().catch(() => []);
              if (devices && devices.length > 0) {
                activeScanner = await tryStartScanner(devices[0].id);
              } else {
                throw userErr || envErr;
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

        // Check torch capability
        try {
          const caps = activeScanner.getRunningTrackCapabilities();
          if (caps && caps.torch) {
            setHasTorch(true);
          }
        } catch {}

        // Populate available cameras for flip button
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            setCameras(devices);
          }
        } catch {}
      } catch (err) {
        console.warn('Camera start error:', err);
        setPermState('denied');
        const msg = (err?.message || '').toLowerCase();
        if (err?.name === 'NotAllowedError' || msg.includes('permission') || msg.includes('denied')) {
          setError(
            'Camera permission was denied. Please tap the lock/settings icon in your browser address bar to allow Camera access.'
          );
        } else if (err?.name === 'NotReadableError' || msg.includes('device in use') || msg.includes('could not start video source')) {
          setError(
            'Camera is in use by another app or browser tab. Please close other camera apps and tap "Try Camera Again".'
          );
        } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError' || msg.includes('no camera')) {
          setError(
            'No camera found on this device. You can upload a QR image from Photos below.'
          );
        } else {
          setError(
            err?.message || 'Could not start camera. Please verify permissions or upload a QR image below.'
          );
        }
      }
    },
    [handleDetected]
  );

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

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('Scanning uploaded image…');
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader-viewport');
      }
      const text = await scannerRef.current.scanFile(file, true);
      handleDetected(text);
    } catch {
      setError('Could not detect a QR code in this image. Please try another image.');
      setTimeout(() => setError(''), 3500);
    }
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-panel border border-green-500/30 rounded-3xl p-5 shadow-[0_0_50px_rgba(34,197,94,0.25)] relative text-center flex flex-col max-h-[92vh]">
        {/* Close Button */}
        <button
          onClick={handleClose}
          type="button"
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/60 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-bold tracking-wider uppercase mb-1.5">
            <span>📷</span> Camera Scanner
          </div>
          <h2 className="text-lg font-extrabold text-white">Scan Room QR Code</h2>
          <p className="text-[11px] text-white/60">
            Point your camera at a friend's QR code to join directly.
          </p>
        </div>

        {/* Camera Viewport Container */}
        <div className="relative w-full aspect-square bg-black rounded-2xl overflow-hidden border-2 border-green-500/40 shadow-inner flex items-center justify-center">
          {/* html5-qrcode target div */}
          <div id="qr-reader-viewport" className="w-full h-full overflow-hidden" />

          {/* Futuristic HUD Scan Overlay */}
          {permState === 'granted' && isScanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Target Focus Box */}
              <div className="w-56 h-56 relative rounded-2xl border border-green-400/40">
                {/* 4 Corner Markers */}
                <span className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-green-400 rounded-tl-lg" />
                <span className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-green-400 rounded-tr-lg" />
                <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-green-400 rounded-bl-lg" />
                <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-green-400 rounded-br-lg" />

                {/* Animated Green Laser Scan Line */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent shadow-[0_0_12px_#22c55e] animate-[scanLaser_2.2s_ease-in-out_infinite]" />
              </div>
            </div>
          )}

          {/* Permission Requesting State */}
          {permState === 'requesting' && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4">
              <span className="w-8 h-8 border-3 border-green-400 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-bold text-white">Opening Camera…</p>
              <p className="text-[10px] text-white/50 mt-1">Please allow camera permissions if prompted</p>
            </div>
          )}

          {/* Permission Denied / Error State */}
          {permState === 'denied' && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-5 text-center">
              <span className="text-3xl mb-2">📸</span>
              <p className="text-xs font-bold text-red-300">Camera Access Blocked</p>
              <p className="text-[10.5px] text-white/60 mt-1 max-w-xs leading-relaxed">
                Please tap the lock or site settings icon in your browser address bar to allow Camera access.
              </p>
              <button
                type="button"
                onClick={() => startCamera(activeCameraId)}
                className="mt-3 px-4 py-2 rounded-full bg-green-500 text-black font-extrabold text-[11px] active:scale-95 transition shadow"
              >
                Try Camera Again
              </button>
            </div>
          )}
        </div>

        {/* Feedback message */}
        {error && (
          <div className="mt-2 text-[11px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-1.5 transition">
            {error}
          </div>
        )}

        {/* Camera Controls (Switch camera, Flashlight, Gallery picker) */}
        <div className="mt-3.5 flex items-center justify-center gap-2">
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

          {/* Upload Image from Gallery */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 rounded-full bg-panel2 border border-white/10 text-white font-bold text-xs hover:bg-white/10 active:scale-95 transition flex items-center gap-1.5"
            title="Upload QR Code from Photos"
          >
            <span>🖼️</span>
            <span>Photos</span>
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
        <p className="mt-3 text-[10.5px] text-white/40">
          Tip: You can also copy and paste the Room Code on the home screen.
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
