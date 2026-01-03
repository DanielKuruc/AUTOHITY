<?php
// Database.php - MySQL connection class

class Database {
    private $pdo;
    private static $instance = null;

    private function __construct() {
        try {
            $this->pdo = new PDO(
                'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                ]
            );
        } catch (PDOException $e) {
            error_log('Database connection error: ' . $e->getMessage());
            throw new Exception('Database connection failed');
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->pdo;
    }

    public function execute($sql, $params = []) {
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            error_log('Database execute error: ' . $e->getMessage());
            throw new Exception('Database operation failed');
        }
    }

    public function fetch($sql, $params = []) {
        return $this->execute($sql, $params)->fetch();
    }

    public function fetchAll($sql, $params = []) {
        return $this->execute($sql, $params)->fetchAll();
    }

    public function lastInsertId() {
        return $this->pdo->lastInsertId();
    }
}
