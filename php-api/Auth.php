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
            if (empty($token)) {
                return null;
            }

            $parts = explode('.', $token);
            if (count($parts) !== 3) {
                return null;
            }

            list($header, $payload, $signature) = $parts;

            // Reconstruct base64 padding for decode
            $padded_payload = $payload . str_repeat('=', 4 - strlen($payload) % 4);
            $padded_header = $header . str_repeat('=', 4 - strlen($header) % 4);

            // Decode payload first
            $decoded = json_decode(base64_decode($padded_payload), true);
            if (!$decoded) {
                return null;
            }


            // Check expiration FIRST
            if (!isset($decoded['exp']) || $decoded['exp'] < time()) {
                return null;
            }

            // Verify signature
            $message = "$header.$payload";

            $sig_bytes = hash_hmac('sha256', $message, JWT_SECRET, true);
            $expectedSignature = rtrim(strtr(base64_encode($sig_bytes), '+/', '-_'), '=');


            if ($signature !== $expectedSignature) {
                return null;
            }

            return $decoded;
        } catch (Exception $e) {
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
                    return $matches[1];
                }
            }
        }

        // Fallback: try $_SERVER['HTTP_AUTHORIZATION']
        if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $auth = $_SERVER['HTTP_AUTHORIZATION'];
            if (preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) {
                return $matches[1];
            }
        }

        // Last fallback: check for REDIRECT_HTTP_AUTHORIZATION (some CGI configs)
        if (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $auth = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
            if (preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) {
                return $matches[1];
            }
        }

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