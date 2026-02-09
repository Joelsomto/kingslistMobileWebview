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

  const tokenValueStyle = {
    backgroundColor: "#f5f5f5",
    padding: "12px",
    borderRadius: "4px",
    margin: "12px 0",
    fontSize: "12px",
    wordBreak: "break-all",
    fontFamily: "monospace",
    color: "#333"
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={headingStyle}>✓ Login Successful</h2>
        <p style={textStyle}>Your credentials have been securely passed to the app.</p>
        
        {tokens && (
          <div>
            <p style={{...textStyle, marginTop: "24px", fontWeight: "600"}}>Tokens:</p>
            <div style={tokenValueStyle}>
              <strong>Access Token:</strong>
              <div>{tokens.accessToken?.substring(0, 20)}...</div>
            </div>
            <div style={tokenValueStyle}>
              <strong>Refresh Token:</strong>
              <div>{tokens.refreshToken ? tokens.refreshToken.substring(0, 20) + "..." : "N/A"}</div>
            </div>
            <p style={{...textStyle, fontSize: "13px", color: "#999", marginTop: "20px"}}>
              You can close this window now.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TokenCallback;
