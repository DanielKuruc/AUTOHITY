<?php

/**
 * PushNotificationService - Send push notifications via Expo Push Service
 * Dokumentace: https://docs.expo.dev/push-notifications/overview/
 */
class PushNotificationService {
    private const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
    
    /**
     * Uloží push token pro zařízení
     */
    public static function savePushToken($deviceToken, $deviceType = 'ios') {
        try {
            $db = Database::getInstance()->getConnection();
            
            // Kontrola validního Expo tokenu
            if (!self::isValidExpoToken($deviceToken)) {
                throw new Exception('Neplatný Expo push token');
            }
            
            // Ulož nebo aktualizuj token
            $sql = "INSERT INTO push_tokens (device_token, device_type, is_active, created_at, updated_at)
                    VALUES (:token, :type, 1, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE is_active = 1, updated_at = NOW()";
            
            $stmt = $db->prepare($sql);
            $stmt->execute([
                ':token' => $deviceToken,
                ':type' => $deviceType
            ]);
            
            error_log("[PushNotificationService] Token uložen: {$deviceToken}");
            
            return ['success' => true, 'message' => 'Push token saved'];
        } catch (Exception $e) {
            error_log("[PushNotificationService] Chyba při ukládání tokenu: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Posílá push notifikaci
     */
    public static function sendNotification($title, $body, $deviceTokens = null, $data = []) {
        try {
            // Pokud nejsou zadané tokeny, vezmi všechny aktivní
            if (!$deviceTokens) {
                $deviceTokens = self::getActiveTokens();
            }
            
            // Zajisti pole
            if (!is_array($deviceTokens)) {
                $deviceTokens = [$deviceTokens];
            }
            
            if (empty($deviceTokens)) {
                error_log("[PushNotificationService] Žádné aktivní tokeny");
                return ['success' => true, 'sent' => 0, 'message' => 'No active tokens'];
            }
            
            $messages = [];
            foreach ($deviceTokens as $token) {
                if (!self::isValidExpoToken($token)) {
                    error_log("[PushNotificationService] Neplatný token: {$token}");
                    continue;
                }
                
                $messages[] = [
                    'to' => $token,
                    'sound' => 'default',
                    'title' => $title,
                    'body' => $body,
                    'data' => $data,
                    'badge' => 1,
                    'ios' => [
                        'sound' => true,
                    ],
                    'android' => [
                        'sound' => true,
                        'priority' => 'high',
                        'channelId' => 'default',
                    ]
                ];
            }
            
            if (empty($messages)) {
                return ['success' => false, 'message' => 'No valid tokens'];
            }
            
            // Pošli notifikace v batch
            $result = self::sendBatch($messages);
            
            error_log("[PushNotificationService] Notifikace odeslány: " . json_encode($result));
            
            return $result;
        } catch (Exception $e) {
            error_log("[PushNotificationService] Chyba při odesílání: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Posílá batch notifikací
     */
    private static function sendBatch($messages) {
        try {
            $ch = curl_init(self::EXPO_PUSH_URL);
            
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => [
                    'Accept: application/json',
                    'Accept-Encoding: gzip, deflate',
                    'Content-Type: application/json',
                ],
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($messages),
                CURLOPT_CONNECTTIMEOUT => 10,
                CURLOPT_TIMEOUT => 30,
            ]);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);
            
            if ($error) {
                throw new Exception("cURL error: {$error}");
            }
            
            if ($httpCode !== 200) {
                error_log("[PushNotificationService] Expo API error: {$httpCode} - {$response}");
                return ['success' => false, 'httpCode' => $httpCode, 'message' => $response];
            }
            
            $data = json_decode($response, true);
            
            return [
                'success' => true,
                'sent' => count($messages),
                'data' => $data
            ];
        } catch (Exception $e) {
            error_log("[PushNotificationService] Batch error: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Vrací všechny aktivní tokeny
     */
    public static function getActiveTokens() {
        try {
            $db = Database::getInstance()->getConnection();
            $sql = "SELECT device_token FROM push_tokens WHERE is_active = 1";
            $stmt = $db->prepare($sql);
            $stmt->execute();
            $rows = $stmt->fetchAll();
            return array_column($rows, 'device_token');
        } catch (Exception $e) {
            error_log("[PushNotificationService] Chyba při načítání tokenů: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Zkontroluje, zda je token validní Expo push token
     */
    private static function isValidExpoToken($token) {
        // Expo tokeny začínají s ExponentPushToken[
        return is_string($token) && (
            strpos($token, 'ExponentPushToken[') === 0 ||
            strpos($token, '[') > 0
        );
    }
    
    /**
     * Deaktivuje token
     */
    public static function deactivateToken($deviceToken) {
        try {
            $db = Database::getInstance()->getConnection();
            $sql = "UPDATE push_tokens SET is_active = 0 WHERE device_token = :token";
            $stmt = $db->prepare($sql);
            $stmt->execute([':token' => $deviceToken]);
            return ['success' => true];
        } catch (Exception $e) {
            error_log("[PushNotificationService] Chyba při deaktivaci: " . $e->getMessage());
            throw $e;
        }
    }
}
