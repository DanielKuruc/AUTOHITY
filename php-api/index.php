<?php
// index.php - API router

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Auth.php';
require_once __DIR__ . '/FileUpload.php';
require_once __DIR__ . '/PurchaseAPI.php';

try {
    // Parse request
    $method = $_SERVER['REQUEST_METHOD'];
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $originalPath = $path;
    // Remove /php-api prefix if present
    if (strpos($path, '/php-api') === 0) {
        $path = substr($path, strlen('/php-api'));
    }
    // Also handle case where it's just /index.php or similar
    if (empty($path) || $path === '/index.php') {
        $path = '/purchases';
    }
    // Debug logging
    error_log("REQUEST_URI: {$_SERVER['REQUEST_URI']}");
    error_log("Parsed path: {$originalPath}");
    error_log("After replace: {$path}");
    error_log("Method: {$method}");
    // Parse query string
    parse_str(parse_url($_SERVER['REQUEST_URI'], PHP_URL_QUERY) ?? '', $query);

    // Router
    if ($path === '/seed' && $method === 'GET') {
        handleSeed();
    } elseif ($path === '/auth/login' && $method === 'POST') {
        handleLogin();
    } elseif ($path === '/purchases' && $method === 'POST') {
        handleCreatePurchase();
    } elseif ($path === '/purchases' && $method === 'GET') {
        handleGetPurchases($query);
    } elseif (preg_match('/^\/purchases\/(\d+)$/', $path, $matches) && $method === 'GET') {
        handleGetPurchase($matches[1]);
    } elseif (preg_match('/^\/purchases\/(\d+)$/', $path, $matches) && $method === 'PUT') {
        handleUpdatePurchase($matches[1]);
    } elseif (preg_match('/^\/purchases\/(\d+)$/', $path, $matches) && $method === 'DELETE') {
        handleDeletePurchase($matches[1]);
    } elseif (preg_match('/^\/purchases\/(\d+)\/upload-images$/', $path, $matches) && $method === 'POST') {
        handleUploadPhotos($matches[1]);
    } elseif (preg_match('/^\/purchases\/(\d+)\/upload-defect-images$/', $path, $matches) && $method === 'POST') {
        handleUploadDefectPhotos($matches[1]);
    } elseif (preg_match('/^\/purchases\/(\d+)\/photos\/(.+)$/', $path, $matches) && $method === 'DELETE') {
        handleDeletePhoto($matches[1], $matches[2]);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Not found']);
    }
} catch (Exception $e) {
    error_log('API error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error', 'message' => $e->getMessage()]);
}

// ============= HANDLERS =============

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
function handleLogin() {
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input['email']) || empty($input['password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Email and password required']);
        return;
    }

    try {
        $db = Database::getInstance()->getConnection();
        $sql = "SELECT id, email FROM users WHERE email = :email AND password = SHA2(:password, 256) LIMIT 1";
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':email' => $input['email'],
            ':password' => $input['password'],
        ]);

        $user = $stmt->fetch();

        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid credentials']);
            return;
        }

        $token = Auth::generateToken($user['id'], $user['email']);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'token' => $token,
            'user' => $user,
        ]);
    } catch (Exception $e) {
        error_log('Login error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Login failed']);
    }
}

/**
 * POST /api/purchases
 */
function handleCreatePurchase() {
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input['clientName']) || empty($input['spz'])) {
        http_response_code(400);
        echo json_encode(['error' => 'clientName and spz are required']);
        return;
    }

    try {
        $api = new PurchaseAPI();
        $result = $api->create($input);
        http_response_code(201);
        echo json_encode($result);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

/**
 * GET /api/purchases?client_name=...&spz=...
 */
function handleGetPurchases($filters) {
    try {
        $api = new PurchaseAPI();
        $result = $api->getAll($filters);
        http_response_code(200);
        echo json_encode($result);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

/**
 * GET /api/purchases/{id}
 */
function handleGetPurchase($id) {
    try {
        $api = new PurchaseAPI();
        $result = $api->getById($id);
        http_response_code(200);
        echo json_encode($result);
    } catch (Exception $e) {
        http_response_code(404);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

/**
 * PUT /api/purchases/{id}
 */
function handleUpdatePurchase($id) {
    $input = json_decode(file_get_contents('php://input'), true);

    try {
        $api = new PurchaseAPI();
        $result = $api->update($id, $input);
        http_response_code(200);
        echo json_encode($result);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

/**
 * DELETE /api/purchases/{id}
 */
function handleDeletePurchase($id) {
    try {
        $api = new PurchaseAPI();
        $result = $api->deletePurchase($id);
        http_response_code($result['success'] ? 200 : 404);
        echo json_encode($result);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

/**
 * POST /api/purchases/{id}/upload-images
 */
function handleUploadPhotos($id) {
    if (empty($_FILES['photos'])) {
        http_response_code(400);
        echo json_encode(['error' => 'No photos provided']);
        return;
    }

    try {
        $api = new PurchaseAPI();
        $result = $api->uploadPhotos($id, $_FILES['photos']);
        http_response_code(200);
        echo json_encode($result);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function handleUploadDefectPhotos($id) {
    if (empty($_FILES['photos'])) {
        http_response_code(400);
        echo json_encode(['error' => 'No photos provided']);
        return;
    }

    try {
        $api = new PurchaseAPI();
        $result = $api->uploadDefectPhotos($id, $_FILES['photos']);
        http_response_code(200);
        echo json_encode($result);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

/**
 * DELETE /api/purchases/{id}/photos/{filename}
 */
function handleDeletePhoto($id, $filename) {
    try {
        $api = new PurchaseAPI();
        $result = $api->deletePhoto($id, $filename);
        http_response_code(200);
        echo json_encode($result);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

/**
 * GET /seed - Create test user
 */
function handleSeed() {
    try {
        $db = Database::getInstance()->getConnection();
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
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Test user created',
            'email' => $email,
            'password' => $password,
        ]);
    } catch (Exception $e) {
        error_log('Seed error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
        ]);
    }
}