# Flutter Token Reception Guide

This document explains how to set up your Flutter app to receive authentication tokens from the React login page via WebView.

## Important: Hosting the React Login Page

The React login page is hosted separately from your Flutter app (typically on a domain like Vercel, your own server, etc.). Your Flutter app will **load this page in a WebView** and intercept the token messages sent via `Print.postMessage()`.

### Deployment Steps:

1. **Host React App**: Deploy the React login app to:
   - Vercel
   - Firebase Hosting
   - Your custom domain
   - Any web hosting service

2. **Get the Public URL**: Example: `https://kingslist-login.vercel.app` or `https://your-domain.com/login`

3. **Share URL with Flutter Dev**: The Flutter developer will use this URL in their WebViewController

### Example URLs:
- Production: `https://kingslist-login.vercel.app`
- Staging: `https://kingslist-login-staging.vercel.app`
- Development: `http://localhost:3000` (for local testing)

## Overview

The React login page exposes authentication tokens to your Flutter app using the `Print.postMessage()` method. After the user successfully logs in on the hosted webpage (loaded in WebView), the tokens are automatically sent to your Flutter app, which needs to listen for and handle these messages.

## Architecture

```
User Login (React Page)
         ↓
Authenticate with KingsChat SDK
         ↓
Tokens Generated
         ↓
Print.postMessage(tokenData) ← Sent to Flutter
         ↓
Flutter Receives via JavaScript Channel
         ↓
Parse & Store Tokens
         ↓
Use tokens for API calls
```

## Token Data Format

The tokens are sent as a JSON string with the following structure:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_value...",
  "expiresIn": 3600,
  "timestamp": 1707000000000
}
```

### Token Fields

- **accessToken**: JWT token used to authenticate API requests
- **refreshToken**: Token used to refresh the access token when it expires
- **expiresIn**: Token expiration time in seconds (typically 3600 = 1 hour)
- **timestamp**: When the tokens were generated (milliseconds since epoch)

## Flutter Implementation

### 0. Configuration Setup (Environment URLs)

Create a config file to manage different login URLs:

```dart
// lib/config/app_config.dart

class AppConfig {
  // Change these based on your environment
  static const String loginPageUrl = 'https://kingslist-login.vercel.app';
  // For development: 'http://192.168.1.100:3000'
  // For staging: 'https://kingslist-login-staging.vercel.app'
  // For production: 'https://kingslist-login.vercel.app'
}
```

Then use it in your app:

```dart
//Later in your app
LoginWebView(loginUrl: AppConfig.loginPageUrl)
```

### 1. Set Up WebViewController with JavaScript Channel

```dart
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'dart:convert';

class LoginWebView extends StatefulWidget {
  // Accept the login URL as a parameter (can be from config, env, etc.)
  final String loginUrl;
  
  const LoginWebView({
    Key? key,
    this.loginUrl = 'https://kingslist-login.vercel.app', // Default/production URL
  }) : super(key: key);

  @override
  State<LoginWebView> createState() => _LoginWebViewState();
}

class _LoginWebViewState extends State<LoginWebView> {
  late WebViewController _webViewController;

  @override
  void initState() {
    super.initState();
    
    _webViewController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..addJavaScriptChannel(
        'Print',
        onMessageReceived: (JavaScriptMessage message) {
          _handleTokenMessage(message.message);
        },
      )
      ..loadRequest(
        Uri.parse(widget.loginUrl), // Load the hosted React login page
      );
  }

  void _handleTokenMessage(String message) {
    try {
      // Parse the JSON token data
      final Map<String, dynamic> tokenData = jsonDecode(message);
      
      final String accessToken = tokenData['accessToken'];
      final String refreshToken = tokenData['refreshToken'] ?? '';
      final int expiresIn = tokenData['expiresIn'] ?? 3600;
      final int timestamp = tokenData['timestamp'] ?? 0;

      // Store tokens securely
      _saveTokensSecurely(
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresIn: expiresIn,
        timestamp: timestamp,
      );

      // Navigate to home screen or main app
      Navigator.of(context).pushReplacementNamed('/home');
    } catch (e) {
      print('Error parsing token message: $e');
      _showErrorDialog('Failed to process authentication tokens');
    }
  }

  void _saveTokensSecurely({
    required String accessToken,
    required String refreshToken,
    required int expiresIn,
    required int timestamp,
  }) {
    // TODO: Implement secure token storage
    // Use flutter_secure_storage or similar
    
    // Example:
    // final secureStorage = FlutterSecureStorage();
    // await secureStorage.write(key: 'access_token', value: accessToken);
    // await secureStorage.write(key: 'refresh_token', value: refreshToken);
    // await secureStorage.write(key: 'token_expires_in', value: expiresIn.toString());
    // await secureStorage.write(key: 'token_timestamp', value: timestamp.toString());
    
    print('Tokens stored successfully');
  }

  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Error'),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Login'),
      ),
      body: WebViewWidget(controller: _webViewController),
    );
  }
}
```

### 2. Secure Token Storage

**Important**: Never store tokens in plain text. Use `flutter_secure_storage` package:

```bash
flutter pub add flutter_secure_storage
```

```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorage {
  static const _secureStorage = FlutterSecureStorage();

  static Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
    required int expiresIn,
    required int timestamp,
  }) async {
    await Future.wait([
      _secureStorage.write(key: 'access_token', value: accessToken),
      _secureStorage.write(key: 'refresh_token', value: refreshToken),
      _secureStorage.write(key: 'token_expires_in', value: expiresIn.toString()),
      _secureStorage.write(key: 'token_timestamp', value: timestamp.toString()),
    ]);
  }

  static Future<String?> getAccessToken() async {
    return await _secureStorage.read(key: 'access_token');
  }

  static Future<String?> getRefreshToken() async {
    return await _secureStorage.read(key: 'refresh_token');
  }

  static Future<bool> isTokenExpired() async {
    final timestamp = await _secureStorage.read(key: 'token_timestamp');
    final expiresIn = await _secureStorage.read(key: 'token_expires_in');
    
    if (timestamp == null || expiresIn == null) return true;
    
    final tokenTime = int.parse(timestamp);
    final expiration = int.parse(expiresIn) * 1000; // Convert to milliseconds
    final now = DateTime.now().millisecondsSinceEpoch;
    
    return now > (tokenTime + expiration);
  }

  static Future<void> clearTokens() async {
    await Future.wait([
      _secureStorage.delete(key: 'access_token'),
      _secureStorage.delete(key: 'refresh_token'),
      _secureStorage.delete(key: 'token_expires_in'),
      _secureStorage.delete(key: 'token_timestamp'),
    ]);
  }
}
```

### 3. Using Tokens in API Calls

```dart
import 'package:http/http.dart' as http;

class ApiClient {
  static const String _baseUrl = 'https://kingslist.pro/app/default/api';

  static Future<http.Response> makeAuthenticatedRequest({
    required String endpoint,
    required String method,
    Map<String, dynamic>? body,
  }) async {
    final accessToken = await TokenStorage.getAccessToken();

    if (accessToken == null) {
      throw Exception('No access token available');
    }

    final Uri url = Uri.parse('$_baseUrl/$endpoint');
    
    final Map<String, String> headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $accessToken',
    };

    try {
      http.Response response;

      if (method == 'GET') {
        response = await http.get(url, headers: headers);
      } else if (method == 'POST') {
        response = await http.post(
          url,
          headers: headers,
          body: jsonEncode(body),
        );
      } else {
        throw Exception('Unsupported HTTP method: $method');
      }

      // Handle token expiration - refresh if needed
      if (response.statusCode == 401) {
        final refreshed = await _refreshToken();
        if (refreshed) {
          return makeAuthenticatedRequest(
            endpoint: endpoint,
            method: method,
            body: body,
          );
        } else {
          throw Exception('Token refresh failed');
        }
      }

      return response;
    } catch (e) {
      throw Exception('API request failed: $e');
    }
  }

  static Future<bool> _refreshToken() async {
    final refreshToken = await TokenStorage.getRefreshToken();

    if (refreshToken == null) {
      return false;
    }

    try {
      final response = await http.post(
        Uri.parse('https://kingslist.pro/app/default/api/refresh_token.php'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': refreshToken}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        await TokenStorage.saveTokens(
          accessToken: data['accessToken'],
          refreshToken: data['refreshToken'] ?? refreshToken,
          expiresIn: data['expiresIn'] ?? 3600,
          timestamp: DateTime.now().millisecondsSinceEpoch,
        );
        return true;
      }
    } catch (e) {
      print('Token refresh error: $e');
    }

    return false;
  }
}
```

### 4. Example API Usage

```dart
// Make authenticated API call
try {
  final response = await ApiClient.makeAuthenticatedRequest(
    endpoint: 'user/profile',
    method: 'GET',
  );

  if (response.statusCode == 200) {
    final userData = jsonDecode(response.body);
    print('User data: $userData');
  }
} catch (e) {
  print('Error: $e');
}
```

## Complete Example: Login Flow

```dart
// lib/screens/login_screen.dart
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'dart:convert';
import 'package:yourapp/config/app_config.dart';
import 'package:yourapp/services/token_storage.dart';

class LoginScreen extends StatefulWidget {
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  late WebViewController _webViewController;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _initializeWebView();
  }

  void _initializeWebView() {
    _webViewController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (String url) {
            setState(() => _isLoading = true);
          },
          onPageFinished: (String url) {
            setState(() => _isLoading = false);
          },
          onWebResourceError: (WebResourceError error) {
            _showError('Loading error: ${error.description}');
          },
        ),
      )
      ..addJavaScriptChannel(
        'Print',
        onMessageReceived: (JavaScriptMessage message) {
          _handleTokens(message.message);
        },
      )
      ..loadRequest(
        Uri.parse(AppConfig.loginPageUrl), // Load from config
      );
  }

  Future<void> _handleTokens(String tokenJson) async {
    try {
      final Map<String, dynamic> tokenData = jsonDecode(tokenJson);
      
      print('Token received with accessToken: ${tokenData['accessToken']?.substring(0, 20)}...');

      // Save tokens
      await TokenStorage.saveTokens(
        accessToken: tokenData['accessToken'],
        refreshToken: tokenData['refreshToken'] ?? '',
        expiresIn: tokenData['expiresIn'] ?? 3600,
        timestamp: tokenData['timestamp'] ?? DateTime.now().millisecondsSinceEpoch,
      );

      // Navigate to home screen
      if (mounted) {
        Navigator.of(context).pushReplacementNamed('/home');
      }
    } catch (e) {
      _showError('Authentication failed: $e');
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Login'),
        elevation: 0,
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _webViewController),
          if (_isLoading)
            Center(
              child: CircularProgressIndicator(),
            ),
        ],
      ),
    );
  }
}
```

### Usage in Your App:

```dart
// In your main.dart or navigation
MaterialApp(
  routes: {
    '/login': (context) => LoginScreen(),
    '/home': (context) => HomeScreen(),
  },
)
```

## Key Points for Flutter Developers

1. **JavaScript Channel**: Register a `Print` JavaScript channel in your WebViewController
2. **JSON Parsing**: Parse the incoming message as JSON to extract token fields
3. **Secure Storage**: Always use `flutter_secure_storage` for token storage, never plain SharedPreferences
4. **Token Expiry**: Check if token has expired before making API calls
5. **Token Refresh**: Implement token refresh logic using the refresh token
6. **Error Handling**: Handle cases where tokens are missing or invalid
7. **Navigation**: After successful token receipt, navigate away from login screen

## Common Issues

### Issue: Print channel not receiving messages
- Ensure JavaScript mode is set to `unrestricted` in WebViewController
- Verify the JavaScript channel name matches exactly: `'Print'`
- Check that the React app is correctly calling `Print.postMessage()`

### Issue: Token payload is empty
- Verify the login was successful in React
- Check browser console in React app for errors
- Ensure tokens are not null before sending

### Issue: Tokens not persisted
- Verify `flutter_secure_storage` is properly initialized
- Check platform-specific initialization (iOS requires Keychain setup, Android requires secure storage setup)
- Handle platform-specific exceptions

## Testing

To test the token reception:

1. Build and run your Flutter app in debug mode
2. Add print statements in the token handler to verify messages are received
3. Use Android Studio's Logcat or Xcode's console to debug
4. Verify tokens are saved in secure storage using device inspection tools

## Security Considerations

- Always use HTTPS for your login page
- Never log full tokens (only debug first few characters)
- Clear tokens on logout
- Implement certificate pinning for production
- Use secure WebView cookies settings for session management

## Deployment & Hosting Guide

### Deploy React Login Page to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from your project directory
vercel

# For production deployment
vercel --prod
```

This will give you a URL like: `https://kingslist-login.vercel.app`

### Environment Configuration

Create different configs for different environments:

```dart
// lib/config/app_config.dart

class AppConfig {
  static const String environment = const String.fromEnvironment('ENVIRONMENT', defaultValue: 'production');
  
  static String get loginPageUrl {
    switch (environment) {
      case 'development':
        return 'http://192.168.1.100:3000'; // Local machine IP for testing
      case 'staging':
        return 'https://kingslist-login-staging.vercel.app';
      case 'production':
      default:
        return 'https://kingslist-login.vercel.app';
    }
  }
}
```

### Build Flutter App with Different Environments

```bash
# Development
flutter run --dart-define=ENVIRONMENT=development

# Staging
flutter run --dart-define=ENVIRONMENT=staging

# Production
flutter run --dart-define=ENVIRONMENT=production
```

### Workflow for Updates

1. **Update React code** locally
2. **Test on localhost** - Flutter dev uses `http://192.168.1.100:3000`
3. **Deploy to Staging** - `vercel --prod --scope staging`
4. **Test on Staging** - Flutter dev uses staging URL
5. **Deploy to Production** - `vercel --prod`
6. **All users automatically get new login page** - No app update needed!

This is the main benefit: **Update login UI without releasing new app versions!**
