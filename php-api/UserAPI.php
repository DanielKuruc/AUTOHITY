<?php

class UserAPI {
    private $db;

    public function __construct($database) {
        $this->db = $database;
    }

    /**
     * Sync user to database - INSERT IF NOT EXISTS or UPDATE
     * POST /php-api/index.php?action=syncUser
     * Body: { userId, firstName, lastName }
     */
    public function syncUser($data) {
        try {
            if (!isset($data['userId']) || !isset($data['firstName']) || !isset($data['lastName'])) {
                return $this->error('Missing required fields: userId, firstName, lastName');
            }

            $userId = $data['userId'];
            $firstName = trim($data['firstName']);
            $lastName = trim($data['lastName']);

            // Check if employee exists
            $sql = "SELECT id FROM employees WHERE id = :id";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([':id' => $userId]);
            $exists = $stmt->fetchColumn() ? true : false;

            if ($exists) {
                // UPDATE - if name changed
                $sql = "UPDATE employees 
                        SET first_name = :first_name, last_name = :last_name
                        WHERE id = :id";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([
                    ':first_name' => $firstName,
                    ':last_name' => $lastName,
                    ':id' => $userId
                ]);

                return $this->success([
                    'message' => 'User updated successfully',
                    'isNew' => false,
                    'userId' => $userId
                ]);
            } else {
                // INSERT - new employee
                $sql = "INSERT INTO employees (id, first_name, last_name, synced_at)
                        VALUES (:id, :first_name, :last_name, NOW())";
                error_log('[syncUser] INSERT SQL: ' . $sql);
                $stmt = $this->db->prepare($sql);
                error_log('[syncUser] Executing with data: ' . json_encode([':id' => $userId, ':first_name' => $firstName, ':last_name' => $lastName]));
                $stmt->execute([
                    ':id' => $userId,
                    ':first_name' => $firstName,
                    ':last_name' => $lastName
                ]);

                return $this->success([
                    'message' => 'User created successfully',
                    'isNew' => true,
                    'userId' => $userId
                ]);
            }
        } catch (Exception $e) {
            return $this->error('Error syncing user: ' . $e->getMessage());
        }
    }

    /**
     * Get all employees from database
     * GET /php-api/index.php?action=listUsers
     */
    public function listUsers() {
        try {
            $sql = "SELECT id, first_name, last_name, phone_number, is_admin, synced_at, updated_at
                    FROM employees
                    ORDER BY first_name ASC, last_name ASC";
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Map to match app format
            $mappedUsers = array_map(function($user) {
                return [
                    'id' => $user['id'],
                    'name' => trim($user['first_name'] . ' ' . $user['last_name']),
                    'firstName' => $user['first_name'],
                    'lastName' => $user['last_name'],
                    'phoneNumber' => $user['phone_number'],
                    'isAdmin' => (bool)$user['is_admin'],
                    'syncedAt' => $user['synced_at'],
                    'updatedAt' => $user['updated_at']
                ];
            }, $users);

            return $this->success([
                'users' => $mappedUsers,
                'total' => count($mappedUsers)
            ]);
        } catch (Exception $e) {
            return $this->error('Error fetching users: ' . $e->getMessage());
        }
    }

    private function success($data) {
        return [
            'success' => true,
            'data' => $data
        ];
    }

    private function error($message) {
        return [
            'success' => false,
            'error' => $message
        ];
    }
}
?>