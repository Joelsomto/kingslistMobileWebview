import React, { useEffect, useRef } from 'react';

function TokenCallback({ tokens, onClose }) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (!tokens || sentRef.current) return;

    const tokenData = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || "",
      expiresIn: (tokens.expiresIn || 3600) * 1000, // Convert to milliseconds
      timestamp: Date.now(),
      profile: tokens.profile || null
    };

    // ── Always store for polling-based retrieval ──
    window.authData = tokenData;
    try {
      localStorage.setItem("authData", JSON.stringify(tokenData));
    } catch (e) {
      console.warn("localStorage.setItem failed:", e);
    }

    console.log("[TokenCallback] Auth data stored. Attempting to send to Flutter...");

    // ── Try to send to Flutter via JS channels ──
    // Retry multiple times because channels may not be ready immediately
    // (especially after navigation back from KC login page)
    let attempt = 0;
    const maxAttempts = 10;

    const trySend = () => {
      attempt++;
      const json = JSON.stringify(tokenData);
      const channels = ["KingsListBridge", "KingsListAuth", "FlutterChannel"];

      for (const ch of channels) {
        try {
          if (window[ch] && typeof window[ch].postMessage === "function") {
            window[ch].postMessage(json);
            console.log(`[TokenCallback] ✅ Sent via ${ch} (attempt ${attempt})`);
            sentRef.current = true;
            // Still call onClose after a delay
            setTimeout(() => { if (onClose) onClose(); }, 500);
            return;
          }
        } catch (e) {
          console.warn(`[TokenCallback] ${ch} failed:`, e);
        }
      }

      // Also try sendAuthToFlutter (set by bridge injection)
      try {
        if (window.sendAuthToFlutter) {
          const result = window.sendAuthToFlutter(tokenData);
          if (result) {
            console.log(`[TokenCallback] ✅ Sent via sendAuthToFlutter (attempt ${attempt})`);
            sentRef.current = true;
            setTimeout(() => { if (onClose) onClose(); }, 500);
            return;
          }
        }
      } catch (e) {}

      if (attempt < maxAttempts) {
        console.log(`[TokenCallback] No channel available (attempt ${attempt}/${maxAttempts}), retrying in 500ms...`);
        setTimeout(trySend, 500);
      } else {
        console.log("[TokenCallback] Max attempts reached. Data is stored in window.authData and localStorage for polling.");
        // Close anyway - Flutter polling will pick up the data
        setTimeout(() => { if (onClose) onClose(); }, 1000);
      }
    };

    // Start sending attempts immediately
    trySend();

  }, [tokens, onClose]);

  const containerStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
    padding: "20px"
  };

  const cardStyle = {
    background: "white",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    padding: "32px",
    width: "100%",
    maxWidth: "500px",
    textAlign: "center"
  };

  const headingStyle = {
    margin: "0 0 16px",
    color: "#333",
    fontSize: "24px",
    fontWeight: "600"
  };

  const textStyle = {
    color: "#666",
    margin: "12px 0",
    fontSize: "15px"
  };

  const spinnerStyle = {
    width: "40px",
    height: "40px",
    border: "4px solid rgba(74, 107, 255, 0.2)",
    borderRadius: "50%",
    borderTopColor: "#4a6bff",
    animation: "spin 1s ease-in-out infinite",
    margin: "0 auto 16px"
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={spinnerStyle}></div>
        <h2 style={headingStyle}>✓ Authenticated</h2>
        <p style={textStyle}>Connecting to app...</p>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default TokenCallback;
