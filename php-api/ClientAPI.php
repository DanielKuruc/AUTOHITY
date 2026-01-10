<?php
// ClientAPI.php - Clients CRUD operations

class ClientAPI {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function list($filters = []) {
        $sql = "SELECT * FROM clients WHERE 1=1";
        $params = [];
        if (!empty($filters['type'])) { $sql .= " AND client_type = :type"; $params[':type'] = $filters['type']; }
        if (!empty($filters['phone'])) { $sql .= " AND phone = :phone"; $params[':phone'] = $filters['phone']; }
        if (!empty($filters['company_name'])) { $sql .= " AND company_name LIKE :company_name"; $params[':company_name'] = '%'.$filters['company_name'].'%'; }
        if (!empty($filters['ico'])) { $sql .= " AND ico = :ico"; $params[':ico'] = $filters['ico']; }
        $sql .= " ORDER BY created_at DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return ['success' => true, 'data' => $stmt->fetchAll()];
    }

    public function get($id) {
        $stmt = $this->db->prepare("SELECT * FROM clients WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        if (!$row) throw new Exception('Client not found');
        return ['success' => true, 'data' => $row];
    }

    public function create($data) {
        if (empty($data['client_type']) || empty($data['phone'])) {
            throw new Exception('client_type and phone are required');
        }
        $sql = "INSERT INTO clients (client_type, first_name, last_name, company_name, ico, dic, phone, street, city, postal_code, created_at, updated_at)
                VALUES (:client_type, :first_name, :last_name, :company_name, :ico, :dic, :phone, :street, :city, :postal_code, NOW(), NOW())";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':client_type' => $data['client_type'],
            ':first_name' => $data['first_name'] ?? null,
            ':last_name' => $data['last_name'] ?? null,
            ':company_name' => $data['company_name'] ?? null,
            ':ico' => $data['ico'] ?? null,
            ':dic' => $data['dic'] ?? null,
            ':phone' => $data['phone'],
            ':street' => $data['street'] ?? null,
            ':city' => $data['city'] ?? null,
            ':postal_code' => $data['postal_code'] ?? null,
        ]);
        return ['success' => true, 'id' => $this->db->lastInsertId()];
    }

    public function update($id, $data) {
        $updates = [];
        $params = [':id' => $id];
        $map = ['client_type','first_name','last_name','company_name','ico','dic','phone','street','city','postal_code'];
        foreach ($map as $key) {
            if (array_key_exists($key, $data)) { $updates[] = "$key = :$key"; $params[":$key"] = $data[$key]; }
        }
        if (empty($updates)) return ['success' => false, 'message' => 'No fields to update'];
        $sql = 'UPDATE clients SET '.implode(', ', $updates).', updated_at = NOW() WHERE id = :id';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return ['success' => true];
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM clients WHERE id = :id");
        $stmt->execute([':id' => $id]);
        return ['success' => $stmt->rowCount() > 0];
    }
}
?>
