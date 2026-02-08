<?php
/**
 * seed.php - Standalone script to create test user
 * 
 * Usage:
 *   php seed.php
 *   
 * Or access via web:
 *   GET https://autohity.cz/php-api/seed
 */

// Load configuration
require_once __DIR__ . '/config.php';

try {
    // Connect to database
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );

    $email = 'test@autohity.cz';
    $password = 'test123';
    $passwordHash = hash('sha256', $password);
    
    // Check if user already exists
    $checkStmt = $pdo->prepare("SELECT id FROM users WHERE email = :email");
    $checkStmt->execute([':email' => $email]);
    $existingUser = $checkStmt->fetch();

    if ($existingUser) {
        // User exists - just update password
        $updateStmt = $pdo->prepare("UPDATE users SET password = :password, updated_at = NOW() WHERE email = :email");
        $updateStmt->execute([
            ':email' => $email,
            ':password' => $passwordHash,
        ]);
        $userId = $existingUser['id'];
        $result = [
            'success' => true,
            'message' => 'Test user updated',
            'email' => $email,
            'password' => $password,
            'id' => $userId,
        ];
    } else {
        // Create new user with UUID-like ID
        $userId = bin2hex(random_bytes(18)); // 36 character hex string
        
        $insertStmt = $pdo->prepare(
            "INSERT INTO users (id, email, password, created_at, updated_at) 
             VALUES (:id, :email, :password, NOW(), NOW())"
        );
        $insertStmt->execute([
            ':id' => $userId,
            ':email' => $email,
            ':password' => $passwordHash,
        ]);
        
        $result = [
            'success' => true,
            'message' => 'Test user created',
            'email' => $email,
            'password' => $password,
            'id' => $userId,
        ];
    }

    // Output JSON response
    header('Content-Type: application/json');
    echo json_encode($result);

} catch (PDOException $e) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage(),
    ]);
} catch (Exception $e) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error: ' . $e->getMessage(),
    ]);
}
?>
