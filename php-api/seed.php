<?php
// seed.php - Create test user
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Auth.php';

try {
    $db = Database::getInstance()->getConnection();
    
    // Create test user
    $email = 'test@autohity.cz';
    $password = 'test123';
    $passwordHash = hash('sha256', $password);
    
    $sql = "INSERT INTO users (email, password, created_at) VALUES (:email, :password, NOW())
            ON DUPLICATE KEY UPDATE password = :password";
    
    $stmt = $db->prepare($sql);
    $stmt->execute([
        ':email' => $email,
        ':password' => $passwordHash,
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Test user created',
        'email' => $email,
        'password' => $password,
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ]);
}
?>
