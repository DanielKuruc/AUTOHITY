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

            // Verify signature - use the exact format from token
            $message = "$header.$payload";
            $expectedSignature = base64_encode(
                hash_hmac('sha256', $message, JWT_SECRET, true)
            );
            
            // Also need to handle URL-safe base64 in signature
            $urlSafeSignature = str_replace(['+', '/'], ['-', '_'], rtrim($expectedSignature, '='));
            
            if ($signature !== $urlSafeSignature && $signature !== $expectedSignature) {
                error_log("Signature mismatch. Expected: $urlSafeSignature, Got: $signature");
                return null;
            }

            // Decode payload
            $decoded = json_decode(base64_decode($padded_payload), true);

            // Check expiration
            if (!$decoded || $decoded['exp'] < time()) {
                return null;
            }

            return $decoded;
        } catch (Exception $e) {
            error_log('Token verification error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Získá token z Authorization headeru
     */
    public static function getToken() {
        $headers = getallheaders();
        
        if (isset($headers['Authorization'])) {
            $auth = $headers['Authorization'];
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