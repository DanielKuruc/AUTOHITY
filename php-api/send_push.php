<?php
// send_push.php - Send push notifications to Expo devices

require_once __DIR__ . '/Database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input['title']) || empty($input['body'])) {
        http_response_code(400);
        echo json_encode(['error' => 'title and body are required']);
        exit;
    }

    $title = trim($input['title']);
    $body = trim($input['body']);
    $data = $input['data'] ?? [];
    $user_id = $input['user_id'] ?? null;

    $db = Database::getInstance();

    $sql = "SELECT DISTINCT expo_token FROM push_tokens WHERE 1=1";
    $params = [];

    if ($user_id !== null) {
        $sql .= " AND user_id = ?";
        $params[] = (int)$user_id;
    }

    $result = $db->fetchAll($sql, $params);

    $tokens = [];
    foreach ($result as $row) {
        $tokens[] = $row['expo_token'];
    }

    if (empty($tokens)) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'No tokens found',
            'tokens_sent' => 0
        ]);
        exit;
    }

    $batches = array_chunk($tokens, 100);
    $totalSent = 0;
    $failures = [];

    foreach ($batches as $batch) {
        $result = sendPushNotifications($batch, $title, $body, $data);
        $totalSent += $result['sent'];
        if (!empty($result['failures'])) {
            $failures = array_merge($failures, $result['failures']);
        }
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => "Push notifications sent to $totalSent devices",
        'tokens_sent' => $totalSent,
        'total_tokens' => count($tokens),
        'failures' => count($failures),
        'failed_tokens' => $failures
    ]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}

/**
 * Send push notifications via Expo Push API
 */
function sendPushNotifications($tokens, $title, $body, $data = []) {
    $url = 'https://exp.host/--/api/v2/push/send';

    $messages = [];
    foreach ($tokens as $token) {
        $messages[] = [
            'to' => $token,
            'sound' => 'default',
            'title' => $title,
            'body' => $body,
            'data' => $data,
            'badge' => 1,
        ];
    }

    $payload = json_encode($messages);

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'Accept-encoding: gzip, deflate',
            'Content-Type: application/json',
        ],
        CURLOPT_TIMEOUT => 30,
    ]);

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code !== 200) {
        return ['sent' => 0, 'failures' => $tokens];
    }

    $result = json_decode($response, true);

    $sent = 0;
    $failures = [];

    if (isset($result['data']) && is_array($result['data'])) {
        foreach ($result['data'] as $receipt) {
            if (isset($receipt['status']) && $receipt['status'] === 'ok') {
                $sent++;
            } else {
                $failures[] = $receipt['message'] ?? 'Unknown error';
            }
        }
    }

    return ['sent' => $sent, 'failures' => $failures];
}