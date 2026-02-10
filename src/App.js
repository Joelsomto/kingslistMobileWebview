import React, { useState, useEffect } from "react";
import { login, fetchUserProfile } from "./services/kingschat";
import TokenCallback from "./TokenCallback";

function LoginForm() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("kc_session") !== null;
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokens, setTokens] = useState(null);
  const [showCallback, setShowCallback] = useState(false);
  const [tokensExposed, setTokensExposed] = useState(false);

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
    maxWidth: "400px",
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
    margin: "0 0 24px",
    fontSize: "15px"
  };

  const buttonStyle = {
    width: "100%",
    padding: "12px",
    backgroundColor: "#4a6bff",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px"
  };

  const disabledButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#ccc",
    cursor: "not-allowed"
  };

  const errorStyle = {
    color: "#d32f2f",
    backgroundColor: "#fde8e8",
    padding: "12px",
    borderRadius: "6px",
    marginBottom: "20px",
    fontSize: "14px"
  };

  const spinnerStyle = {
    width: "18px",
    height: "18px",
    border: "3px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "50%",
    borderTopColor: "white",
    animation: "spin 1s ease-in-out infinite"
  };

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const authResponse = await login();

      let profile = null;
      try {
        profile = await fetchUserProfile(authResponse.accessToken);
        console.log("Profile fetched:", profile);
      } catch (profileError) {
        console.warn("Profile fetch failed, continuing without profile.", profileError);
      }

      const sessionData = {
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken || "",
        expiresIn: authResponse.expiresIn || 3600,
        timestamp: Date.now(),
      };
      localStorage.setItem("kc_session", JSON.stringify(sessionData));
      setIsLoggedIn(true);
      
      // Set tokens and show callback component
      setTokens({ ...authResponse, profile });
      setShowCallback(true);
    } catch (err) {
      setError("Failed to log in. Please try again.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const verifySession = async () => {
      const session = localStorage.getItem("kc_session");
      if (!session) return;
  
      try {
        const sessionData = JSON.parse(session);
        const response = await fetch(
          "https://kingslist.pro/app/default/api/verify_session.php",
          {
            method: "POST",
            credentials: 'include',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accessToken: sessionData.accessToken,
              refreshToken: sessionData.refreshToken
            }),
          }
        );
  
        if (response.ok) {
          const data = await response.json();
          if (!data.valid) {
            localStorage.removeItem("kc_session");
            setIsLoggedIn(false);
          } else if (data.newToken) {
            const updatedSession = {
              ...sessionData,
              accessToken: data.newToken,
              timestamp: Date.now()
            };
            localStorage.setItem("kc_session", JSON.stringify(updatedSession));
          }
        }
      } catch (err) {
        console.error("Session verification failed:", err);
        localStorage.removeItem("kc_session");
        setIsLoggedIn(false);
      }
    };
  
    verifySession();
    const interval = setInterval(verifySession, 300000);
    return () => clearInterval(interval);
  }, []);

  // Show token callback if login was successful
  if (showCallback && tokens) {
    return <TokenCallback tokens={tokens} onClose={() => {
      setShowCallback(false);
      setTokensExposed(true);
    }} />;
  }

  // Show success message after tokens are exposed
  if (tokensExposed) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h2 style={headingStyle}>✓ Connection Successful</h2>
          <p style={textStyle}>Your account has been connected to the app.</p>
          <p style={{...textStyle, fontSize: "13px", color: "#999"}}>
            You can now close this window.
          </p>
        </div>
      </div>
    );
  }

  if (isLoggedIn) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h2 style={headingStyle}>Welcome Back!</h2>
          <p style={textStyle}>You are already logged in.</p>
          <button 
            style={buttonStyle}
            onClick={() => {
              localStorage.removeItem("kc_session");
              setIsLoggedIn(false);
              setShowCallback(false);
              setTokens(null);
              setTokensExposed(false);
            }}
          >
            Log Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={headingStyle}>Login with KingsChat</h2>
        <p style={textStyle}>Connect your KingsChat account to continue</p>
        
        {error && <div style={errorStyle}>{error}</div>}

        <button
          style={loading ? disabledButtonStyle : buttonStyle}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <>
              <span style={spinnerStyle}></span>
              Connecting...
            </>
          ) : (
            "Login with KingsChat"
          )}
        </button>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default LoginForm;