<?php
// register_push_token.php - Register Expo push token for a user

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

    if (empty($input['user_id']) || empty($input['expo_token'])) {
        http_response_code(400);
        echo json_encode(['error' => 'user_id and expo_token are required']);
        exit;
    }

    $user_id = (int)$input['user_id'];
    $expo_token = trim($input['expo_token']);

    // Validate token format (basic check)
    if (!preg_match('/^ExponentPushToken\[.+\]$/', $expo_token)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid Expo token format']);
        exit;
    }

    $db = new Database();

    // Insert or ignore if already exists (UNIQUE KEY on user_id, expo_token)
    $sql = "INSERT INTO push_tokens (user_id, expo_token, created_at) 
            VALUES (?, ?, NOW())
            ON DUPLICATE KEY UPDATE created_at = NOW()";

    $stmt = $db->prepare($sql);
    $stmt->bind_param('is', $user_id, $expo_token);
    $stmt->execute();

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Token registered successfully',
        'user_id' => $user_id,
        'token' => substr($expo_token, 0, 20) . '...' // Don't return full token
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
