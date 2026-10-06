import {
  useEffect,
  useRef,
  useState,
} from "react";

import { BrowserMultiFormatReader } from "@zxing/browser";

import "./BarcodeScanner.css";

interface BarcodeScannerProps {
  onDetected: (value: string) => void;
  onClose: () => void;
}

const BarcodeScanner = ({
  onDetected,
  onClose,
}: BarcodeScannerProps) => {
  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const detectedRef = useRef(false);

  const [error, setError] = useState("");
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();

    let controls: {
      stop: () => void;
    } | null = null;

    let mounted = true;

    const startScanner = async () => {
      try {
        setStarting(true);
        setError("");

        if (
          !navigator.mediaDevices?.getUserMedia
        ) {
          setError(
            "Camera access is not supported on this device or application."
          );

          setStarting(false);
          return;
        }

        if (!videoRef.current) {
          setError(
            "Camera preview could not be initialized."
          );

          setStarting(false);
          return;
        }

        controls =
          await reader.decodeFromVideoDevice(
            undefined,
            videoRef.current,
            (result) => {
              if (
                !mounted ||
                detectedRef.current ||
                !result
              ) {
                return;
              }

              const value =
                result.getText().trim();

              if (!value) {
                return;
              }

              detectedRef.current = true;

              controls?.stop();

              onDetected(value);
            }
          );

        if (mounted) {
          setStarting(false);
        }
      } catch (scannerError) {
        console.error(
          "Camera scanner error:",
          scannerError
        );

        if (!mounted) {
          return;
        }

        const errorName =
          scannerError instanceof Error
            ? scannerError.name
            : "";

        if (
          errorName === "NotAllowedError"
        ) {
          setError(
            "Camera permission was denied. Please allow camera access and try again."
          );
        } else if (
          errorName === "NotReadableError"
        ) {
          setError(
            "The camera is already being used by another application."
          );
        } else if (
          errorName === "NotFoundError"
        ) {
          setError(
            "No camera was found on this device."
          );
        } else {
          setError(
            "Unable to start the camera. Please check camera permissions."
          );
        }

        setStarting(false);
      }
    };

    startScanner();

    return () => {
      mounted = false;

      controls?.stop();
    };
  }, [onDetected]);

  return (
    <div className="scanner-overlay">
      <div className="scanner-modal">
        <div className="scanner-header">
          <div>
            <p className="scanner-eyebrow">
              BARCODE SCANNER
            </p>

            <h2>Scan Product</h2>
          </div>

          <button
            type="button"
            className="scanner-close-button"
            onClick={onClose}
            aria-label="Close scanner"
          >
            ×
          </button>
        </div>

        <div className="scanner-preview">
          <video
            ref={videoRef}
            className="scanner-video"
            autoPlay
            muted
            playsInline
          />

          <div className="scanner-frame">
            <span className="scanner-corner top-left" />
            <span className="scanner-corner top-right" />
            <span className="scanner-corner bottom-left" />
            <span className="scanner-corner bottom-right" />

            <div className="scanner-line" />
          </div>

          {starting && (
            <div className="scanner-status">
              Starting camera...
            </div>
          )}
        </div>

        {error && (
          <div className="scanner-error">
            <strong>
              Camera unavailable
            </strong>

            <span>{error}</span>
          </div>
        )}

        <div className="scanner-instructions">
          <strong>
            Position the barcode inside the
            frame
          </strong>

          <span>
            Keep the product steady until the
            barcode is detected.
          </span>
        </div>

        <button
          type="button"
          className="scanner-cancel-button"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default BarcodeScanner;