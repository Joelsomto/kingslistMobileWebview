// kingschat.js
import kingsChatWebSdk from 'kingschat-web-sdk';

const CLIENT_ID = '5d61e98b-7f02-4ea6-ac7a-9b193f2e425d';

export const login = async (scopes = ["send_chat_message"]) => {
  try {
    console.log("login in with:", scopes);
    const response = await kingsChatWebSdk.login({
      scopes,
      clientId: CLIENT_ID,
    });
    console.log("login successful, tokens received");
    return response;
  } catch (error) {
    console.error("login failed:", {
      message: error.message,
      stack: error.stack,
      response: error.response
    });
    throw new Error(`Login failed: ${error.message || "Unknown error"}`);
  }
};

export const refreshToken = async (refreshToken) => {
  try {
    console.log("Attempting token refresh");
    const response = await kingsChatWebSdk.refreshAuthenticationToken({
      clientId: CLIENT_ID,
      refreshToken,
    });
    console.log("Token refresh successful");
    return response;
  } catch (error) {
    console.error("Token refresh failed:", {
      message: error.message,
      stack: error.stack
    });
    throw new Error(`Token refresh failed: ${error.message || "Unknown error"}`);
  }
};

// export const sendMessage = async (accessToken, userIdentifier, message) => {
//   try {
//     console.log("Sending message to:", userIdentifier);
//     console.log("Using access token:", accessToken.substring(0, 10) + "...");
    
//     const response = await kingsChatWebSdk.sendMessage({
//       accessToken,
//       userIdentifier,
//       message,
//     });
    
//     console.log("Message sent successfully");
//     return response;
//   } catch (error) {
//     console.error("Message send failed:", {
//       message: error.message,
//       stack: error.stack,
//       response: error.response
//     });
//     throw new Error(`Failed to send message: ${error.message || "Unknown error"}`);
//   }
// };

// Metrics counters
let successCount = 0;
let errorCount = 0;

export const getMessageMetrics = () => ({
  successCount,
  errorCount,
  totalProcessed: successCount + errorCount,
  successRate: successCount > 0 ? (successCount/(successCount + errorCount)) * 100 : 0
});

export const resetMessageMetrics = () => {
  successCount = 0;
  errorCount = 0;
};

export const sendMessage = async (accessToken, userIdentifier, message) => {
  try {
    console.log("Sending message to:", userIdentifier);
    console.log("Using access token:", accessToken.substring(0, 10) + "...");
    console.log(`Message: ${message.substring(0, 50)}...`);
    
    const response = await kingsChatWebSdk.sendMessage({
      accessToken,
      userIdentifier,
      message,
    });
    
    successCount++;
    console.log(`Message sent successfully. Total successes: ${successCount}`);
    console.log(`[Success #${successCount}] ${userIdentifier}`);
    console.log("Message sent successfully");
    return response;
  } catch (error) {
    errorCount++;
    console.error(`Message send failed. Total errors: ${errorCount} [Error #${errorCount}] ${userIdentifier}:`, {
      message: error.message,
      stack: error.stack,
      response: error.response
    });
    throw new Error(`Failed to send message: ${error.message || "Unknown error"}`);
  }
};