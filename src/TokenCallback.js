import React, { useEffect } from 'react';

function TokenCallback({ tokens, onClose }) {
  useEffect(() => {
    if (tokens) {
      // Expose tokens via Print.postMessage() to Dart/Flutter WebView
      const tokenData = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || "",
        expiresIn: tokens.expiresIn || 3600,
        timestamp: Date.now()
      };

      console.log("Sending tokens to Dart app via Print.postMessage");
      
      // Send to Dart WebView
      if (window.Print && window.Print.postMessage) {
        window.Print.postMessage(JSON.stringify(tokenData));
      } else {
        console.warn("Print.postMessage not available - may not be running in Dart WebView");
      }

      // Close after a short delay to ensure message is sent
      const timer = setTimeout(() => {
        if (onClose) {
          onClose();
        }
      }, 500);

      return () => clearTimeout(timer);
    }
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
