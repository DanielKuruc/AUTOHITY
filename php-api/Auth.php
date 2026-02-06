<?php
// Auth.php - JWT authentication

class Auth {
    /**
     * Vytvoří JWT token
     */
    public static function generateToken($userId, $email) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode([
            'iat' => time(),
            'exp' => time() + (7 * 24 * 60 * 60), // 7 days
            'user_id' => $userId,
            'email' => $email,
        ]);

        // Use URL-safe base64 encoding
        $header = rtrim(strtr(base64_encode($header), '+/', '-_'), '=');
        $payload = rtrim(strtr(base64_encode($payload), '+/', '-_'), '=');
        $message = "$header.$payload";
        $sig_bytes = hash_hmac('sha256', $message, JWT_SECRET, true);
        $signature = rtrim(strtr(base64_encode($sig_bytes), '+/', '-_'), '=');

        return "$message.$signature";
    }

    /**
     * Ověří JWT token
     */
    public static function verifyToken($token) {
        try {
            error_log('[Auth] 🔍 Starting token verification');
            if (empty($token)) {
                error_log('[Auth] ❌ Token is empty');
                return null;
            }

            error_log('[Auth] Token length: ' . strlen($token) . ' chars');
            error_log('[Auth] Token starts: ' . substr($token, 0, 30) . '...');
            $parts = explode('.', $token);
            error_log('[Auth] Token parts count: ' . count($parts));
            if (count($parts) !== 3) {
                error_log('[Auth] ❌ Token does not have 3 parts, got: ' . count($parts));
                return null;
            }

            list($header, $payload, $signature) = $parts;

            error_log('[Auth] Header length: ' . strlen($header));
            error_log('[Auth] Payload length: ' . strlen($payload));
            error_log('[Auth] Signature: ' . $signature);
            // Reconstruct base64 padding for decode
            $padded_payload = $payload . str_repeat('=', 4 - strlen($payload) % 4);
            $padded_header = $header . str_repeat('=', 4 - strlen($header) % 4);

            // Decode payload first
            $decoded = json_decode(base64_decode($padded_payload), true);
            if (!$decoded) {
                error_log('[Auth] ❌ Failed to decode payload');
                return null;
            }

            error_log('[Auth] ✅ Payload decoded: user_id=' . ($decoded['user_id'] ?? 'N/A') . ', exp=' . ($decoded['exp'] ?? 'N/A'));
            error_log('[Auth] JWT_SECRET defined: ' . (defined('JWT_SECRET') ? 'YES' : 'NO'));
            error_log('[Auth] JWT_SECRET length: ' . (defined('JWT_SECRET') ? strlen(JWT_SECRET) : 'N/A'));

            // Check expiration FIRST
            if (!isset($decoded['exp']) || $decoded['exp'] < time()) {
                error_log('[Auth] ❌ Token expired. exp=' . ($decoded['exp'] ?? 'N/A') . ', now=' . time());
                return null;
            }

            // Verify signature
            $message = "$header.$payload";
            error_log('[Auth] Message to verify: ' . substr($message, 0, 50) . '...');

            $sig_bytes = hash_hmac('sha256', $message, JWT_SECRET, true);
            $expectedSignature = rtrim(strtr(base64_encode($sig_bytes), '+/', '-_'), '=');

            error_log('[Auth] Expected signature: ' . substr($expectedSignature, 0, 30) . '...');
            error_log('[Auth] Actual signature:   ' . substr($signature, 0, 30) . '...');
            error_log('[Auth] Signature match: ' . ($signature === $expectedSignature ? 'YES ✅' : 'NO ❌'));

            if ($signature !== $expectedSignature) {
                error_log('[Auth] ❌ Signature mismatch!');
                return null;
            }

            error_log('[Auth] ✅ Token is valid!');
            return $decoded;
        } catch (Exception $e) {
            error_log('[Auth] ❌ Token verification exception: ' . $e->getMessage());
            error_log('[Auth] Stack trace: ' . $e->getTraceAsString());
            return null;
        }
    }

    /**
     * Získá token z Authorization headeru
     */
    public static function getToken() {
        // Try getallheaders() first (most servers)
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            if (isset($headers['Authorization'])) {
                $auth = $headers['Authorization'];
                if (preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) {
                    error_log('[Auth] Token found via getallheaders()');
                    return $matches[1];
                }
            }
        }

        // Fallback: try $_SERVER['HTTP_AUTHORIZATION']
        if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $auth = $_SERVER['HTTP_AUTHORIZATION'];
            if (preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) {
                error_log('[Auth] Token found via $_SERVER[HTTP_AUTHORIZATION]');
                return $matches[1];
            }
        }

        // Last fallback: check for REDIRECT_HTTP_AUTHORIZATION (some CGI configs)
        if (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $auth = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
            if (preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) {
                error_log('[Auth] Token found via $_SERVER[REDIRECT_HTTP_AUTHORIZATION]');
                return $matches[1];
            }
        }

        error_log('[Auth] ❌ No Authorization token found in headers');
        error_log('[Auth] Available SERVER vars: ' . json_encode(array_filter($_SERVER, function($k) { return strpos($k, 'AUTH') !== false || strpos($k, 'HTTP') !== false; }, ARRAY_FILTER_USE_KEY)));
        return null;
    }

    /**
     * Ověří autentizaci a vrací user_id
     */
    public static function authenticate() {
        $token = self::getToken();
        if (empty($token)) {
            http_response_code(401);
            echo json_encode(['error' => 'Missing authorization token']);
            exit;
        }

        $decoded = self::verifyToken($token);
        if (!$decoded) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid or expired token']);
            exit;
        }

        return $decoded['user_id'];
    }
}