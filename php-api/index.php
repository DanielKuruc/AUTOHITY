<?php
// index.php - API router

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept');
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
require_once __DIR__ . '/ClientAPI.php';

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
    // Clients
    } elseif ($path === '/clients' && $method === 'GET') {
        handleListClients($query);
    } elseif ($path === '/clients' && $method === 'POST') {
        handleCreateClient();
    } elseif (preg_match('/^\/clients\/(\d+)$/', $path, $m) && $method === 'GET') {
        handleGetClient($m[1]);
    } elseif (preg_match('/^\/clients\/(\d+)$/', $path, $m) && ($method === 'PUT' || $method === 'PATCH')) {
        handleUpdateClient($m[1]);
    } elseif (preg_match('/^\/clients\/(\d+)$/', $path, $m) && $method === 'DELETE') {
        handleDeleteClient($m[1]);
    // Purchases
    } elseif ($path === '/purchases' && $method === 'POST') {
        handleCreatePurchase();
    } elseif ($path === '/purchases' && $method === 'GET') {
        handleGetPurchases($query);
    } elseif (preg_match('/^\/purchases\/(\d+)$/', $path, $matches) && $method === 'GET') {
        handleGetPurchase($matches[1]);
    } elseif (preg_match('/^\/purchases\/(\d+)$/', $path, $matches) && ($method === 'PUT' || $method === 'PATCH')) {
        handleUpdatePurchase($matches[1]);
    } elseif (preg_match('/^\/purchases\/(\d+)$/', $path, $matches) && $method === 'DELETE') {
        handleDeletePurchase($matches[1]);
    } elseif (preg_match('/^\/purchases\/(\d+)\/upload-images$/', $path, $matches) && $method === 'POST') {
        handleUploadPhotos($matches[1]);
    } elseif (preg_match('/^\/purchases\/(\d+)\/upload-defect-images$/', $path, $matches) && $method === 'POST') {
        handleUploadDefectPhotos($matches[1]);
    } elseif (preg_match('/^\/purchases\/(\d+)\/photos\/(.+)$/', $path, $matches) && $method === 'DELETE') {
        handleDeletePhoto($matches[1], $matches[2]);
    // Vehicles under purchase (simple upsert GET/PUT/DELETE)
    } elseif (preg_match('/^\/purchases\/(\d+)\/vehicle$/', $path, $m) && $method === 'GET') {
        handleGetVehicle($m[1]);
    } elseif (preg_match('/^\/purchases\/(\d+)\/vehicle$/', $path, $m) && ($method === 'PUT' || $method === 'PATCH')) {
        handleUpsertVehicle($m[1]);
    } elseif (preg_match('/^\/purchases\/(\d+)\/vehicle$/', $path, $m) && $method === 'DELETE') {
        handleDeleteVehicle($m[1]);
    // Component statuses
    } elseif (preg_match('/^\/purchases\/(\d+)\/components$/', $path, $m) && $method === 'GET') {
        handleGetComponents($m[1]);
    } elseif (preg_match('/^\/purchases\/(\d+)\/components$/', $path, $m) && ($method === 'PUT' || $method === 'PATCH')) {
        handlePutComponents($m[1]);
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
    // Accept both 'defect_photos' and fallback 'photos' for compatibility
    $files = $_FILES['defect_photos'] ?? $_FILES['photos'] ?? null;
    if (empty($files)) {
        http_response_code(400);
        echo json_encode(['error' => 'No photos provided']);
        return;
    }

    try {
        $api = new PurchaseAPI();
        $result = $api->uploadDefectPhotos($id, $files);
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

// Clients handlers
function handleListClients($query) {
    try { $api = new ClientAPI(); echo json_encode($api->list($query)); }
    catch (Exception $e) { http_response_code(500); echo json_encode(['error'=>$e->getMessage()]); }
}
function handleCreateClient() {
    $input = json_decode(file_get_contents('php://input'), true);
    try { $api = new ClientAPI(); $res = $api->create($input); http_response_code(201); echo json_encode($res); }
    catch (Exception $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
}
function handleGetClient($id) {
    try { $api = new ClientAPI(); echo json_encode($api->get($id)); }
    catch (Exception $e) { http_response_code(404); echo json_encode(['error'=>$e->getMessage()]); }
}
function handleUpdateClient($id) {
    $input = json_decode(file_get_contents('php://input'), true);
    try { $api = new ClientAPI(); echo json_encode($api->update($id, $input)); }
    catch (Exception $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
}
function handleDeleteClient($id) {
    try { $api = new ClientAPI(); echo json_encode($api->delete($id)); }
    catch (Exception $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
}

// Vehicle handlers
function handleGetVehicle($purchaseId) {
    try {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("SELECT * FROM vehicles WHERE purchase_id = :pid LIMIT 1");
        $stmt->execute([':pid' => $purchaseId]);
        $row = $stmt->fetch();
        http_response_code($row ? 200 : 404);
        echo json_encode(['success' => (bool)$row, 'data' => $row]);
    } catch (Exception $e) { http_response_code(500); echo json_encode(['error'=>$e->getMessage()]); }
}
function handleUpsertVehicle($purchaseId) {
    $input = json_decode(file_get_contents('php://input'), true);
    try {
        $api = new PurchaseAPI();
        $api->update($purchaseId, ['carDetails' => $input]);
        echo json_encode(['success' => true]);
    } catch (Exception $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
}
function handleDeleteVehicle($purchaseId) {
    try {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("DELETE FROM vehicles WHERE purchase_id = :pid");
        $stmt->execute([':pid' => $purchaseId]);
        echo json_encode(['success' => true]);
    } catch (Exception $e) { http_response_code(400); echo json_encode(['error'=>$e->getMessage()]); }
}

// Components handlers
function handleGetComponents($purchaseId) {
    try {
        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("SELECT id, component, status, notes FROM component_statuses WHERE purchase_id = :pid");
        $stmt->execute([':pid' => $purchaseId]);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    } catch (Exception $e) { http_response_code(500); echo json_encode(['error'=>$e->getMessage()]); }
}
function handlePutComponents($purchaseId) {
    $input = json_decode(file_get_contents('php://input'), true);
    $items = is_array($input) ? $input : ($input['items'] ?? []);
    try {
        $db = Database::getInstance()->getConnection();
        $db->beginTransaction();
        $del = $db->prepare("DELETE FROM component_statuses WHERE purchase_id = :pid");
        $del->execute([':pid' => $purchaseId]);
        $ins = $db->prepare("INSERT INTO component_statuses (purchase_id, component, status, notes, created_at, updated_at) VALUES (:pid, :component, :status, :notes, NOW(), NOW())");
        foreach ($items as $c) {
            $ins->execute([
                ':pid' => $purchaseId,
                ':component' => $c['component'] ?? 'unknown',
                ':status' => $c['status'] ?? 'good',
                ':notes' => $c['notes'] ?? null,
            ]);
        }
        $db->commit();
        echo json_encode(['success' => true, 'count' => count($items)]);
    } catch (Exception $e) {
        if ($db && $db->inTransaction()) $db->rollBack();
        http_response_code(400); echo json_encode(['error'=>$e->getMessage()]);
    }
}