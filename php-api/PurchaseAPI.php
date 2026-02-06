<?php
// PurchaseAPI.php - Purchase CRUD operations

class PurchaseAPI {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    private function normalizeDate($value) {
        if (!$value) return null;
        if ($value instanceof DateTime) return $value->format('Y-m-d');
        if (is_string($value)) {
            // dd.mm.yyyy -> yyyy-mm-dd
            if (preg_match('/^(\d{1,2})\.(\d{1,2})\.(\d{4})/', $value, $m)) {
                $dd = str_pad($m[1], 2, '0', STR_PAD_LEFT);
                $mm = str_pad($m[2], 2, '0', STR_PAD_LEFT);
                return $m[3] . '-' . $mm . '-' . $dd;
            }
            // Already ISO like
            if (preg_match('/^\d{4}-\d{2}-\d{2}/', $value)) return $value;
        }
        return null;
    }

    private function normalizeTime($value) {
        if (!$value) return null;
        if ($value instanceof DateTime) return $value->format('H:i:s');
        if (is_string($value)) {
            // Accept HH:MM or HH:MM:SS
            if (preg_match('/^\d{1,2}:\d{2}(:\d{2})?$/', $value)) {
                if (strlen($value) === 5) {
                    return $value . ':00';
                }
                return $value;
            }
        }
        return null;
    }
    private function sanitize($data) {
        $out = [];
        foreach ($data as $k => $v) {
            if (is_string($v)) {
                $v = trim($v);
                if ($v === '') $v = null;
            }
            $out[$k] = $v;
        }
        // Coerce specific fields
        $out['purchaseDate'] = isset($data['purchaseDate']) ? $this->normalizeDate($data['purchaseDate']) : null;
        $out['inspectionDate'] = isset($data['inspectionDate']) ? $this->normalizeDate($data['inspectionDate']) : null;
        $out['purchaseTime'] = isset($data['purchaseTime']) ? $this->normalizeTime($data['purchaseTime']) : null;
        $out['inspectionTime'] = isset($data['inspectionTime']) ? $this->normalizeTime($data['inspectionTime']) : null;
        $toInt = ['totalAmount','customerPrice','offeredPrice','expectedSalePrice','employeeId','coverPhotoIndex'];
        foreach ($toInt as $key) {
            if (isset($out[$key])) {
                $out[$key] = ($out[$key] === null) ? null : (int)$out[$key];
            }
        }
        if (isset($data['isVatPayer'])) $out['isVatPayer'] = !empty($data['isVatPayer']) ? 1 : 0;
        if (isset($data['isCounterAccount'])) $out['isCounterAccount'] = !empty($data['isCounterAccount']) ? 1 : 0;
        if (isset($data['vinVerified'])) $out['vinVerified'] = !empty($data['vinVerified']) ? 1 : 0;
        return $out;
    }
    /**
     * Helper: Send push notification via send_push.php
     */
    private function sendPushNotification($title, $body, $userId = null, $data = []) {
        try {
            $payload = [
                'title' => $title,
                'body' => $body,
                'data' => $data,
            ];
            if ($userId !== null) {
                $payload['user_id'] = $userId;
            }

            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => getenv('API_BASE_URL') . '/send_push.php',
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($payload),
                CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
                CURLOPT_TIMEOUT => 10,
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode !== 200) {
                error_log("Push notification failed: HTTP $httpCode");
            }
        } catch (Exception $e) {
            error_log("Send push notification error: " . $e->getMessage());
        }
    }

    /**
     * Vytvoří nový nákup
     */
    public function create($data) {
        try {
            $data = $this->sanitize($data);

            // Optional: upsert client and link
            $clientId = null;
            if (!empty($data['clientType']) || !empty($data['phone']) || !empty($data['companyInfo']) || !empty($data['clientName'])) {
                // Split name for person if possible
                $first = null; $last = null; $companyName = null;
                if (($data['clientType'] ?? '') === 'company') {
                    $companyName = $data['companyInfo']['companyName'] ?? ($data['clientName'] ?? null);
                } else {
                    $name = trim($data['clientName'] ?? '');
                    if ($name) {
                        $parts = preg_split('/\s+/', $name);
                        $first = $parts[0] ?? null;
                        $last = isset($parts[1]) ? implode(' ', array_slice($parts, 1)) : null;
                    }
                }
                $ico = $data['companyInfo']['ico'] ?? null;
                $dic = $data['companyInfo']['dic'] ?? null;
                $phone = $data['phone'] ?? null;
                $street = $data['street'] ?? null; $city = $data['city'] ?? null; $postal = $data['postalCode'] ?? null;
                // Try find existing by phone or ico
                $find = $this->db->prepare("SELECT id FROM clients WHERE (phone = :phone AND :phone IS NOT NULL) OR (ico = :ico AND :ico IS NOT NULL) LIMIT 1");
                $find->execute([':phone' => $phone, ':ico' => $ico]);
                $clientId = $find->fetchColumn();
                if ($clientId) {
                    $upd = $this->db->prepare("UPDATE clients SET client_type=:client_type, first_name=:first_name, last_name=:last_name, company_name=:company_name, ico=:ico, dic=:dic, phone=:phone, street=:street, city=:city, postal_code=:postal_code, updated_at=NOW() WHERE id=:id");
                    $upd->execute([
                        ':id' => $clientId,
                        ':client_type' => ($data['clientType'] ?? 'person') === 'company' ? 'company' : 'person',
                        ':first_name' => $first,
                        ':last_name' => $last,
                        ':company_name' => $companyName,
                        ':ico' => $ico,
                        ':dic' => $dic,
                        ':phone' => $phone,
                        ':street' => $street,
                        ':city' => $city,
                        ':postal_code' => $postal,
                    ]);
                } else {
                    $ins = $this->db->prepare("INSERT INTO clients (client_type, first_name, last_name, company_name, ico, dic, phone, street, city, postal_code, created_at, updated_at) VALUES (:client_type, :first_name, :last_name, :company_name, :ico, :dic, :phone, :street, :city, :postal_code, NOW(), NOW())");
                    $ins->execute([
                        ':client_type' => ($data['clientType'] ?? 'person') === 'company' ? 'company' : 'person',
                        ':first_name' => $first,
                        ':last_name' => $last,
                        ':company_name' => $companyName,
                        ':ico' => $ico,
                        ':dic' => $dic,
                        ':phone' => $phone,
                        ':street' => $street,
                        ':city' => $city,
                        ':postal_code' => $postal,
                    ]);
                    $clientId = $this->db->lastInsertId();
                }
            }
            $sql = "INSERT INTO purchases (
                client_id, client_name, client_type, spz, purchase_date, purchase_time, purchase_state,
                employee_id, total_amount, customer_price, offered_price,
                expected_sale_price, is_vat_payer, is_counter_account, vin_verified, source_knowledge,
                phone, street, city, postal_code, notes, service_notes, inspection_date, inspection_time, company_info, cover_photo_index, cover_photo_uri, created_at, updated_at
            ) VALUES (
                :client_id, :client_name, :client_type, :spz, :purchase_date, :purchase_time, :purchase_state,
                :employee_id, :total_amount, :customer_price, :offered_price,
                :expected_sale_price, :is_vat_payer, :is_counter_account, :vin_verified, :source_knowledge,
                :phone, :street, :city, :postal_code, :notes, :service_notes, :inspection_date, :inspection_time, :company_info, :cover_photo_index, :cover_photo_uri, NOW(), NOW()
            )";

            $stmt = $this->db->prepare($sql);
            $params = [
                ':client_id' => $clientId,
                ':client_name' => $data['clientName'] ?? null,
                ':client_type' => $data['clientType'] ?? null,
                ':spz' => $data['spz'] ?? null,
                ':purchase_date' => $data['purchaseDate'] ?? $data['purchase_date'] ?? null,
                ':purchase_time' => $data['purchaseTime'] ?? $data['purchase_time'] ?? null,
                ':purchase_state' => $data['purchaseState'] ?? 'NEW',
                ':employee_id' => $data['employeeId'] ?? $data['employee_id'] ?? null,
                ':total_amount' => $data['totalAmount'] ?? $data['total_amount'] ?? null,
                ':customer_price' => $data['customerPrice'] ?? $data['customer_price'] ?? null,
                ':offered_price' => $data['offeredPrice'] ?? $data['offered_price'] ?? null,
                ':expected_sale_price' => $data['expectedSalePrice'] ?? $data['expected_sale_price'] ?? null,
                ':is_vat_payer' => isset($data['isVatPayer']) ? ($data['isVatPayer'] ? 1 : 0) : (isset($data['is_vat_payer']) ? ($data['is_vat_payer'] ? 1 : 0) : 0),
                ':is_counter_account' => isset($data['isCounterAccount']) ? ($data['isCounterAccount'] ? 1 : 0) : (isset($data['is_counter_account']) ? ($data['is_counter_account'] ? 1 : 0) : 0),
                ':vin_verified' => isset($data['vinVerified']) ? ($data['vinVerified'] ? 1 : 0) : (isset($data['vin_verified']) ? ($data['vin_verified'] ? 1 : 0) : 0),
                ':source_knowledge' => $data['sourceKnowledge'] ?? $data['source_knowledge'] ?? null,
                ':phone' => $data['phone'] ?? '',
                ':street' => $data['street'] ?? null,
                ':city' => $data['city'] ?? null,
                ':postal_code' => $data['postalCode'] ?? $data['postal_code'] ?? null,
                ':notes' => $data['notes'] ?? null,
                ':service_notes' => $data['serviceNotes'] ?? $data['service_notes'] ?? null,
                ':inspection_date' => $data['inspectionDate'] ?? $data['inspection_date'] ?? null,
                ':inspection_time' => $data['inspectionTime'] ?? $data['inspection_time'] ?? null,
                ':company_info' => isset($data['companyInfo']) ? json_encode($data['companyInfo']) : null,
                ':cover_photo_index' => $data['coverPhotoIndex'] ?? $data['cover_photo_index'] ?? 0,
                ':cover_photo_uri' => $data['coverPhotoUri'] ?? $data['cover_photo_uri'] ?? null,
            ];
            
            // DEBUG LOGGING
            error_log('[CREATE PURCHASE] inspection_date param: ' . ($params[':inspection_date'] ?? 'NULL'));
            error_log('[CREATE PURCHASE] inspection_time param: ' . ($params[':inspection_time'] ?? 'NULL'));
            error_log('[CREATE PURCHASE] phone param: ' . ($params[':phone'] ?? 'EMPTY'));
            
            $stmt->execute($params);

            $purchaseId = $this->db->lastInsertId();

            // Send push notification - all users notified about new purchase
            $this->sendPushNotification(
                '🚗 Nový výkup',
                'Byl vytvořen nový výkup - ' . ($data['spz'] ?? 'neznámá SPZ'),
                null, // send to all users
                ['type' => 'new_purchase', 'purchaseId' => $purchaseId, 'spz' => $data['spz'] ?? null]
            );

            // Optional nested inserts
            if (!empty($data['carDetails'])) {
                $v = $data['carDetails'];
                $sqlV = "INSERT INTO vehicles (
                    purchase_id, vin, make, model, year, color, mileage, fuel_type,
                    engine_size, transmission, body_type, drive_type, stk, first_registration,
                    is_import, is_first_owner, has_service_book, has_security_screws, has_ai_wheels,
                    pocet_vlastniku, pocet_provozovatelu, cebia, caVertical,
                    created_at, updated_at
                ) VALUES (
                    :purchase_id, :vin, :make, :model, :year, :color, :mileage, :fuel_type,
                    :engine_size, :transmission, :body_type, :drive_type, :stk, :first_registration,
                    :is_import, :is_first_owner, :has_service_book, :has_security_screws, :has_ai_wheels,
                    :pocet_vlastniku, :pocet_provozovatelu, :cebia, :caVertical,
                    NOW(), NOW()
                )";
                $stmtV = $this->db->prepare($sqlV);
                $stmtV->execute([
                    ':purchase_id' => $purchaseId,
                    ':vin' => $v['vin'] ?? null,
                    ':make' => $v['make'] ?? null,
                    ':model' => $v['model'] ?? null,
                    ':year' => isset($v['year']) ? (int)$v['year'] : null,
                    ':color' => $v['color'] ?? null,
                    ':mileage' => isset($v['mileage']) ? (int)$v['mileage'] : null,
                    ':fuel_type' => $v['fuelType'] ?? null,
                    ':engine_size' => $v['engineSize'] ?? null,
                    ':transmission' => $v['transmission'] ?? null,
                    ':body_type' => $v['bodyType'] ?? null,
                    ':drive_type' => $v['driveType'] ?? null,
                    ':stk' => $v['stk'] ?? null,
                    // accept alias doProvozu from client as well
                    ':first_registration' => $this->normalizeDate($v['firstRegistration'] ?? ($v['doProvozu'] ?? null)),
                    ':is_import' => !empty($v['isImport']) ? 1 : 0,
                    ':is_first_owner' => !empty($v['isFirstOwner']) ? 1 : 0,
                    ':has_service_book' => !empty($v['hasServiceBook']) ? 1 : 0,
                    ':has_security_screws' => !empty($v['hasSecurityScrews']) ? 1 : 0,
                    ':has_ai_wheels' => !empty($v['hasAiWheels']) ? 1 : 0,
                    ':pocet_vlastniku' => isset($v['pocetVlastniku']) ? (int)$v['pocetVlastniku'] : null,
                    ':pocet_provozovatelu' => isset($v['pocetProvozovatelu']) ? (int)$v['pocetProvozovatelu'] : null,
                    ':cebia' => !empty($v['cebia']) ? 1 : 0,
                    ':caVertical' => !empty($v['caVertical']) ? 1 : 0,
                ]);
            }

            if (!empty($data['componentStatuses']) && is_array($data['componentStatuses'])) {
                $sqlC = "INSERT INTO component_statuses (purchase_id, component, status, notes, created_at, updated_at)
                         VALUES (:purchase_id, :component, :status, :notes, NOW(), NOW())";
                $stmtC = $this->db->prepare($sqlC);
                foreach ($data['componentStatuses'] as $c) {
                    $stmtC->execute([
                        ':purchase_id' => $purchaseId,
                        ':component' => $c['component'] ?? 'unknown',
                        ':status' => $c['status'] ?? 'good',
                        ':notes' => $c['notes'] ?? null,
                    ]);
                }
            }

            return [
                'success' => true,
                'id' => $purchaseId,
                'message' => 'Purchase created successfully',
            ];
        } catch (Exception $e) {
            error_log('Create purchase error: ' . $e->getMessage());
            error_log('Payload: ' . json_encode($data));
            throw $e;
        }
    }

    /**
     * Získá všechny nákupy s filtrováním
     */
    public function getAll($filters = []) {
        try {
            $sql = "SELECT p.*, 
                           v.id AS vehicle_id, v.vin AS vehicle_vin, v.make AS vehicle_make, v.model AS vehicle_model,
                           v.year AS vehicle_year, v.color AS vehicle_color, v.mileage AS vehicle_mileage,
                           v.fuel_type AS vehicle_fuel_type, v.engine_size AS vehicle_engine_size,
                           v.transmission AS vehicle_transmission, v.body_type AS vehicle_body_type,
                           v.drive_type AS vehicle_drive_type, v.stk AS vehicle_stk, v.first_registration AS vehicle_first_registration,
                           v.is_import AS vehicle_is_import, v.is_first_owner AS vehicle_is_first_owner,
                           v.has_service_book AS vehicle_has_service_book, v.has_security_screws AS vehicle_has_security_screws,
                           v.has_ai_wheels AS vehicle_has_ai_wheels,
                           v.pocet_vlastniku AS vehicle_pocet_vlastniku, v.pocet_provozovatelu AS vehicle_pocet_provozovatelu,
                           v.cebia AS vehicle_cebia, v.caVertical AS vehicle_caVertical
                    FROM purchases p
                    LEFT JOIN vehicles v ON v.purchase_id = p.id
                    WHERE 1=1";
            $params = [];

            if (!empty($filters['client_name'])) {
                $sql .= " AND p.client_name LIKE :client_name";
                $params[':client_name'] = '%' . $filters['client_name'] . '%';
            }

            if (!empty($filters['spz'])) {
                $sql .= " AND p.spz = :spz";
                $params[':spz'] = $filters['spz'];
            }

            if (!empty($filters['purchase_state'])) {
                $sql .= " AND p.purchase_state = :purchase_state";
                $params[':purchase_state'] = $filters['purchase_state'];
            }

            if (!empty($filters['employee_id'])) {
                $sql .= " AND p.employee_id = :employee_id";
                $params[':employee_id'] = $filters['employee_id'];
            }

            if (!empty($filters['start_date'])) {
                $sql .= " AND p.purchase_date >= :start_date";
                $params[':start_date'] = $filters['start_date'];
            }

            if (!empty($filters['end_date'])) {
                $sql .= " AND p.purchase_date <= :end_date";
                $params[':end_date'] = $filters['end_date'];
            }

            $sql .= " ORDER BY p.created_at DESC";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();

            // Enrich rows with component_statuses and decode photos
            $purchases = [];
            foreach ($rows as $row) {
                $pid = $row['id'];
                // Prefer normalized table for photos
                $stmtP = $this->db->prepare("SELECT file_path, photo_type FROM purchase_photos WHERE purchase_id = :pid ORDER BY photo_type, order_index, id");
                $stmtP->execute([':pid' => $pid]);
                $photoRows = $stmtP->fetchAll();
                $veh = [];
                $def = [];
                if ($photoRows) {
                    foreach ($photoRows as $pr) {
                        if ($pr['photo_type'] === 'vehicle') $veh[] = $pr['file_path'];
                        if ($pr['photo_type'] === 'defect') $def[] = $pr['file_path'];
                    }
                }
                if (empty($veh)) {
                    $veh = !empty($row['photos']) ? (json_decode($row['photos'], true) ?? []) : [];
                }
                if (empty($def)) {
                    $def = !empty($row['defect_photos']) ? (json_decode($row['defect_photos'], true) ?? []) : [];
                }
                $row['photos'] = json_encode($veh);
                $row['defect_photos'] = json_encode($def);
                $row['company_info'] = !empty($row['company_info']) ? $row['company_info'] : null;

                // Map vehicle to nested object-like structure; client mapper will camelCase keys
                $car = null;
                if (!empty($row['vehicle_id'])) {
                    $car = [
                        'id' => $row['vehicle_id'],
                        'vin' => $row['vehicle_vin'],
                        'make' => $row['vehicle_make'],
                        'model' => $row['vehicle_model'],
                        'year' => $row['vehicle_year'],
                        'color' => $row['vehicle_color'],
                        'mileage' => $row['vehicle_mileage'],
                        'fuel_type' => $row['vehicle_fuel_type'],
                        'engine_size' => $row['vehicle_engine_size'],
                        'transmission' => $row['vehicle_transmission'],
                        'body_type' => $row['vehicle_body_type'],
                        'drive_type' => $row['vehicle_drive_type'],
                        'stk' => $row['vehicle_stk'],
                        'first_registration' => $row['vehicle_first_registration'],
                        'is_import' => $row['vehicle_is_import'],
                        'is_first_owner' => $row['vehicle_is_first_owner'],
                        'has_service_book' => $row['vehicle_has_service_book'],
                        'has_security_screws' => $row['vehicle_has_security_screws'],
                        'has_ai_wheels' => $row['vehicle_has_ai_wheels'],
                        'pocet_vlastniku' => $row['vehicle_pocet_vlastniku'] ?? null,
                        'pocet_provozovatelu' => $row['vehicle_pocet_provozovatelu'] ?? null,
                        'cebia' => $row['vehicle_cebia'] ?? 0,
                        'caVertical' => $row['vehicle_caVertical'] ?? 0,
                    ];
                }

                // Load components
                $stmtC = $this->db->prepare("SELECT component, status, notes FROM component_statuses WHERE purchase_id = :pid");
                $stmtC->execute([':pid' => $pid]);
                $components = $stmtC->fetchAll();

                // Attach nested keys for client mapper
                $row['car_details'] = $car;
                $row['component_statuses'] = $components;

                $purchases[] = $row;
            }

            return [
                'success' => true,
                'data' => $purchases,
                'count' => count($purchases),
            ];
        } catch (Exception $e) {
            error_log('Get purchases error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Získá nákup podle ID
     */
    public function getById($id) {
        try {
            $sql = "SELECT p.*, 
                           v.id AS vehicle_id, v.vin AS vehicle_vin, v.make AS vehicle_make, v.model AS vehicle_model,
                           v.year AS vehicle_year, v.color AS vehicle_color, v.mileage AS vehicle_mileage,
                           v.fuel_type AS vehicle_fuel_type, v.engine_size AS vehicle_engine_size,
                           v.transmission AS vehicle_transmission, v.body_type AS vehicle_body_type,
                           v.drive_type AS vehicle_drive_type, v.stk AS vehicle_stk, v.first_registration AS vehicle_first_registration,
                           v.is_import AS vehicle_is_import, v.is_first_owner AS vehicle_is_first_owner,
                           v.has_service_book AS vehicle_has_service_book, v.has_security_screws AS vehicle_has_security_screws,
                           v.has_ai_wheels AS vehicle_has_ai_wheels,
                           v.pocet_vlastniku AS vehicle_pocet_vlastniku, v.pocet_provozovatelu AS vehicle_pocet_provozovatelu,
                           v.cebia AS vehicle_cebia, v.caVertical AS vehicle_caVertical
                    FROM purchases p
                    LEFT JOIN vehicles v ON v.purchase_id = p.id
                    WHERE p.id = :id";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([':id' => $id]);
            $row = $stmt->fetch();

            if (!$row) {
                throw new Exception('Purchase not found');
            }

            // Decode photos: prefer normalized table purchase_photos, fallback to JSON columns
            $stmtP = $this->db->prepare("SELECT file_path, photo_type FROM purchase_photos WHERE purchase_id = :pid ORDER BY photo_type, order_index, id");
            $stmtP->execute([':pid' => $id]);
            $photoRows = $stmtP->fetchAll();
            $veh = [];
            $def = [];
            if ($photoRows) {
                foreach ($photoRows as $pr) {
                    if ($pr['photo_type'] === 'vehicle') $veh[] = $pr['file_path'];
                    if ($pr['photo_type'] === 'defect') $def[] = $pr['file_path'];
                }
            }
            if (empty($veh)) {
                $veh = !empty($row['photos']) ? (json_decode($row['photos'], true) ?? []) : [];
            }
            if (empty($def)) {
                $def = !empty($row['defect_photos']) ? (json_decode($row['defect_photos'], true) ?? []) : [];
            }
            $row['photos'] = json_encode($veh);
            $row['defect_photos'] = json_encode($def);
            $row['company_info'] = !empty($row['company_info']) ? $row['company_info'] : null;

            $car = null;
            if (!empty($row['vehicle_id'])) {
                $car = [
                    'id' => $row['vehicle_id'],
                    'vin' => $row['vehicle_vin'],
                    'make' => $row['vehicle_make'],
                    'model' => $row['vehicle_model'],
                    'year' => $row['vehicle_year'],
                    'color' => $row['vehicle_color'],
                    'mileage' => $row['vehicle_mileage'],
                    'fuel_type' => $row['vehicle_fuel_type'],
                    'engine_size' => $row['vehicle_engine_size'],
                    'transmission' => $row['vehicle_transmission'],
                    'body_type' => $row['vehicle_body_type'],
                    'drive_type' => $row['vehicle_drive_type'],
                    'stk' => $row['vehicle_stk'],
                    'first_registration' => $row['vehicle_first_registration'],
                    'is_import' => $row['vehicle_is_import'],
                    'is_first_owner' => $row['vehicle_is_first_owner'],
                    'has_service_book' => $row['vehicle_has_service_book'],
                    'has_security_screws' => $row['vehicle_has_security_screws'],
                    'has_ai_wheels' => $row['vehicle_has_ai_wheels'],
                    'pocet_vlastniku' => $row['vehicle_pocet_vlastniku'] ?? null,
                    'pocet_provozovatelu' => $row['vehicle_pocet_provozovatelu'] ?? null,
                    'cebia' => $row['vehicle_cebia'] ?? 0,
                    'caVertical' => $row['vehicle_caVertical'] ?? 0,
                ];
            }

            $stmtC = $this->db->prepare("SELECT component, status, notes FROM component_statuses WHERE purchase_id = :pid");
            $stmtC->execute([':pid' => $id]);
            $components = $stmtC->fetchAll();

            $row['car_details'] = $car;
            $row['component_statuses'] = $components;

            return [ 'success' => true, 'data' => $row ];
        } catch (Exception $e) {
            error_log('Get purchase error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Aktualizuje nákup
     */
    public function update($id, $data) {
        try {
            // Ověř, že nákup existuje
            $this->getById($id);

            $data = $this->sanitize($data);

            // Upsert client if provided
            $clientId = null;
            if (!empty($data['clientType']) || !empty($data['phone']) || !empty($data['companyInfo']) || !empty($data['clientName'])) {
                $first = null; $last = null; $companyName = null;
                if (($data['clientType'] ?? '') === 'company') {
                    $companyName = $data['companyInfo']['companyName'] ?? ($data['clientName'] ?? null);
                } else {
                    $name = trim($data['clientName'] ?? '');
                    if ($name) {
                        $parts = preg_split('/\s+/', $name);
                        $first = $parts[0] ?? null;
                        $last = isset($parts[1]) ? implode(' ', array_slice($parts, 1)) : null;
                    }
                }
                $ico = $data['companyInfo']['ico'] ?? null;
                $dic = $data['companyInfo']['dic'] ?? null;
                $phone = $data['phone'] ?? null;
                $street = $data['street'] ?? null; $city = $data['city'] ?? null; $postal = $data['postalCode'] ?? null;
                $find = $this->db->prepare("SELECT id FROM clients WHERE (phone = :phone AND :phone IS NOT NULL) OR (ico = :ico AND :ico IS NOT NULL) LIMIT 1");
                $find->execute([':phone' => $phone, ':ico' => $ico]);
                $clientId = $find->fetchColumn();
                if ($clientId) {
                    $upd = $this->db->prepare("UPDATE clients SET client_type=:client_type, first_name=:first_name, last_name=:last_name, company_name=:company_name, ico=:ico, dic=:dic, phone=:phone, street=:street, city=:city, postal_code=:postal_code, updated_at=NOW() WHERE id=:id");
                    $upd->execute([
                        ':id' => $clientId,
                        ':client_type' => ($data['clientType'] ?? 'person') === 'company' ? 'company' : 'person',
                        ':first_name' => $first,
                        ':last_name' => $last,
                        ':company_name' => $companyName,
                        ':ico' => $ico,
                        ':dic' => $dic,
                        ':phone' => $phone,
                        ':street' => $street,
                        ':city' => $city,
                        ':postal_code' => $postal,
                    ]);
                } else {
                    $ins = $this->db->prepare("INSERT INTO clients (client_type, first_name, last_name, company_name, ico, dic, phone, street, city, postal_code, created_at, updated_at) VALUES (:client_type, :first_name, :last_name, :company_name, :ico, :dic, :phone, :street, :city, :postal_code, NOW(), NOW())");
                    $ins->execute([
                        ':client_type' => ($data['clientType'] ?? 'person') === 'company' ? 'company' : 'person',
                        ':first_name' => $first,
                        ':last_name' => $last,
                        ':company_name' => $companyName,
                        ':ico' => $ico,
                        ':dic' => $dic,
                        ':phone' => $phone,
                        ':street' => $street,
                        ':city' => $city,
                        ':postal_code' => $postal,
                    ]);
                    $clientId = $this->db->lastInsertId();
                }
            }
            $sql = "UPDATE purchases SET ";
            $params = [':id' => $id];
            $updates = [];

            if ($clientId) { $updates[] = 'client_id = :client_id'; $params[':client_id'] = $clientId; }

            $map = [
                'clientName' => 'client_name',
                'clientType' => 'client_type',
                'spz' => 'spz',
                'purchaseDate' => 'purchase_date',
                'purchaseTime' => 'purchase_time',
                'purchaseState' => 'purchase_state',
                'employeeId' => 'employee_id',
                'totalAmount' => 'total_amount',
                'customerPrice' => 'customer_price',
                'offeredPrice' => 'offered_price',
                'expectedSalePrice' => 'expected_sale_price',
                'phone' => 'phone',
                'street' => 'street',
                'city' => 'city',
                'postalCode' => 'postal_code',
                'notes' => 'notes',
                'serviceNotes' => 'service_notes',
                'inspectionDate' => 'inspection_date',
                'inspectionTime' => 'inspection_time',
                'sourceKnowledge' => 'source_knowledge',
                'coverPhotoIndex' => 'cover_photo_index',
                'coverPhotoUri' => 'cover_photo_uri',
            ];

            foreach ($map as $key => $col) {
                if (array_key_exists($key, $data)) {
                    // IMPORTANT: Never allow partial UPDATE to set NOT NULL columns to NULL or empty
                    // Skip empty values for these fields to preserve existing data during partial updates
                    if (($col === 'phone' || $col === 'inspection_date' || $col === 'inspection_time') && empty($data[$key])) {
                        error_log('[UPDATE] Skipping ' . $col . ' field because it would be empty');
                        continue;
                    }
                    $updates[] = "$col = :$col";
                    $params[":$col"] = $data[$key];
                }
            }
            if (isset($data['isVatPayer'])) { $updates[] = "is_vat_payer = :is_vat_payer"; $params[':is_vat_payer'] = $data['isVatPayer'] ? 1 : 0; }
            if (isset($data['isCounterAccount'])) { $updates[] = "is_counter_account = :is_counter_account"; $params[':is_counter_account'] = $data['isCounterAccount'] ? 1 : 0; }
            if (isset($data['vinVerified'])) { $updates[] = "vin_verified = :vin_verified"; $params[':vin_verified'] = $data['vinVerified'] ? 1 : 0; }
            if (isset($data['companyInfo'])) { $updates[] = "company_info = :company_info"; $params[':company_info'] = json_encode($data['companyInfo']); }

            $updates[] = "updated_at = NOW()";

            if (empty($updates)) {
                return [
                    'success' => false,
                    'message' => 'No fields to update',
                ];
            }

            $sql .= implode(', ', $updates) . " WHERE id = :id";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);

            // Send push notification if purchase state changed
            if (isset($data['purchaseState'])) {
                $oldPurchase = $this->getById($id);
                $oldState = $oldPurchase['data']['purchase_state'] ?? null;
                $newState = $data['purchaseState'];

                if ($oldState !== $newState) {
                    $stateLabels = [
                        'NEW' => 'Nový',
                        'IN_PROGRESS' => 'Rozjednáno',
                        'COMPLETED' => 'Vykoupeno',
                        'CANCELLED' => 'Odmítnuto',
                    ];
                    $title = '📝 Změna stavu výkupu';
                    $body = ($data['spz'] ?? 'Výkup') . ' - ' . ($stateLabels[$newState] ?? $newState);
                    
                    $this->sendPushNotification(
                        $title,
                        $body,
                        $data['employeeId'] ?? null, // send to specific employee if available
                        ['type' => 'purchase_state_change', 'purchaseId' => $id, 'newState' => $newState, 'spz' => $data['spz'] ?? null]
                    );
                }
            }

            // Update nested tables if provided
            if (!empty($data['carDetails'])) {
                // upsert vehicle
                $check = $this->db->prepare("SELECT id FROM vehicles WHERE purchase_id = :pid");
                $check->execute([':pid' => $id]);
                $exists = $check->fetchColumn();
                $v = $data['carDetails'];
                if ($exists) {
                    $sqlV = "UPDATE vehicles SET vin=:vin, make=:make, model=:model, year=:year, color=:color, mileage=:mileage, fuel_type=:fuel_type, engine_size=:engine_size, transmission=:transmission, body_type=:body_type, drive_type=:drive_type, stk=:stk, first_registration=:first_registration, is_import=:is_import, is_first_owner=:is_first_owner, has_service_book=:has_service_book, has_security_screws=:has_security_screws, has_ai_wheels=:has_ai_wheels, pocet_vlastniku=:pocet_vlastniku, pocet_provozovatelu=:pocet_provozovatelu, cebia=:cebia, caVertical=:caVertical, updated_at=NOW() WHERE purchase_id=:purchase_id";
                    $stmtV = $this->db->prepare($sqlV);
                } else {
                    $sqlV = "INSERT INTO vehicles (purchase_id, vin, make, model, year, color, mileage, fuel_type, engine_size, transmission, body_type, drive_type, stk, first_registration, is_import, is_first_owner, has_service_book, has_security_screws, has_ai_wheels, pocet_vlastniku, pocet_provozovatelu, cebia, caVertical, created_at, updated_at) VALUES (:purchase_id, :vin, :make, :model, :year, :color, :mileage, :fuel_type, :engine_size, :transmission, :body_type, :drive_type, :stk, :first_registration, :is_import, :is_first_owner, :has_service_book, :has_security_screws, :has_ai_wheels, :pocet_vlastniku, :pocet_provozovatelu, :cebia, :caVertical, NOW(), NOW())";
                    $stmtV = $this->db->prepare($sqlV);
                }
                $stmtV->execute([
                    ':purchase_id' => $id,
                    ':vin' => $v['vin'] ?? null,
                    ':make' => $v['make'] ?? null,
                    ':model' => $v['model'] ?? null,
                    ':year' => isset($v['year']) ? (int)$v['year'] : null,
                    ':color' => $v['color'] ?? null,
                    ':mileage' => isset($v['mileage']) ? (int)$v['mileage'] : null,
                    ':fuel_type' => $v['fuelType'] ?? null,
                    ':engine_size' => $v['engineSize'] ?? null,
                    ':transmission' => $v['transmission'] ?? null,
                    ':body_type' => $v['bodyType'] ?? null,
                    ':drive_type' => $v['driveType'] ?? null,
                    ':stk' => $v['stk'] ?? null,
                    ':first_registration' => $this->normalizeDate($v['firstRegistration'] ?? ($v['doProvozu'] ?? null)),
                    ':is_import' => !empty($v['isImport']) ? 1 : 0,
                    ':is_first_owner' => !empty($v['isFirstOwner']) ? 1 : 0,
                    ':has_service_book' => !empty($v['hasServiceBook']) ? 1 : 0,
                    ':has_security_screws' => !empty($v['hasSecurityScrews']) ? 1 : 0,
                    ':has_ai_wheels' => !empty($v['hasAiWheels']) ? 1 : 0,
                    ':pocet_vlastniku' => isset($v['pocetVlastniku']) ? (int)$v['pocetVlastniku'] : null,
                    ':pocet_provozovatelu' => isset($v['pocetProvozovatelu']) ? (int)$v['pocetProvozovatelu'] : null,
                    ':cebia' => !empty($v['cebia']) ? 1 : 0,
                    ':caVertical' => !empty($v['caVertical']) ? 1 : 0,
                ]);
            }

            if (!empty($data['componentStatuses']) && is_array($data['componentStatuses'])) {
                // Simple strategy: delete and reinsert
                $del = $this->db->prepare("DELETE FROM component_statuses WHERE purchase_id = :pid");
                $del->execute([':pid' => $id]);
                $sqlC = "INSERT INTO component_statuses (purchase_id, component, status, notes, created_at, updated_at) VALUES (:purchase_id, :component, :status, :notes, NOW(), NOW())";
                $stmtC = $this->db->prepare($sqlC);
                foreach ($data['componentStatuses'] as $c) {
                    $stmtC->execute([
                        ':purchase_id' => $id,
                        ':component' => $c['component'] ?? 'unknown',
                        ':status' => $c['status'] ?? 'good',
                        ':notes' => $c['notes'] ?? null,
                    ]);
                }
            }

            return [
                'success' => true,
                'message' => 'Purchase updated successfully',
            ];
        } catch (Exception $e) {
            error_log('Update purchase error: ' . $e->getMessage());
            error_log('Payload: ' . json_encode($data));
            throw $e;
        }
    }

    /**
     * Smaže nákup
     */
    public function delete($id) {
        try {
            $this->getById($id);

            $sql = "DELETE FROM purchases WHERE id = :id";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([':id' => $id]);

            return [
                'success' => true,
                'message' => 'Purchase deleted successfully',
            ];
        } catch (Exception $e) {
            error_log('Delete purchase error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Nahraje fotky pro nákup
     */
    public function uploadPhotos($id, $files) {
        try {
            // Ověř, že nákup existuje
            $this->getById($id);

            $result = FileUpload::uploadMultiple($files);

            if (!$result['success']) {
                throw new Exception('No files uploaded successfully');
            }

            // Persist also into normalized table purchase_photos (type vehicle)
            $maxQ = $this->db->prepare("SELECT COALESCE(MAX(order_index), -1) FROM purchase_photos WHERE purchase_id = :pid AND photo_type = 'vehicle'");
            $maxQ->execute([':pid' => $id]);
            $startIndex = intval($maxQ->fetchColumn());
            $ins = $this->db->prepare("INSERT INTO purchase_photos (purchase_id, file_path, photo_type, order_index, created_at) VALUES (:pid, :path, 'vehicle', :ord, NOW())");
            $i = 0;
            foreach ($result['files'] as $path) {
                $i++;
                $ins->execute([':pid' => $id, ':path' => $path, ':ord' => $startIndex + $i]);
            }

            // Backward compatible JSON update in purchases.photos
            $sql = "UPDATE purchases SET photos = :photos, updated_at = NOW() WHERE id = :id";
            $existingPhotos = [];
            $existingPurchase = $this->db->prepare("SELECT photos FROM purchases WHERE id = :id");
            $existingPurchase->execute([':id' => $id]);
            $row = $existingPurchase->fetch();
            if ($row && $row['photos']) {
                $existingPhotos = json_decode($row['photos'], true) ?? [];
            }
            $allPhotos = array_merge($existingPhotos, $result['files']);
            $stmt = $this->db->prepare($sql);
            $stmt->execute([':id' => $id, ':photos' => json_encode($allPhotos)]);

            return [
                'success' => true,
                'files' => $result['files'],
                'message' => count($result['files']) . ' photos uploaded',
            ];
        } catch (Exception $e) {
            error_log('Upload photos error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Nahraje fotky vad do separátního pole defect_photos
     */
    public function uploadDefectPhotos($id, $files) {
        try {
            $this->getById($id);
            $result = FileUpload::uploadMultiple($files);
            if (!$result['success']) {
                throw new Exception('No defect photos uploaded successfully');
            }
            // Persist also into normalized table purchase_photos (type defect)
            $maxQ = $this->db->prepare("SELECT COALESCE(MAX(order_index), -1) FROM purchase_photos WHERE purchase_id = :pid AND photo_type = 'defect'");
            $maxQ->execute([':pid' => $id]);
            $startIndex = intval($maxQ->fetchColumn());
            $ins = $this->db->prepare("INSERT INTO purchase_photos (purchase_id, file_path, photo_type, order_index, created_at) VALUES (:pid, :path, 'defect', :ord, NOW())");
            $i = 0;
            foreach ($result['files'] as $path) {
                $i++;
                $ins->execute([':pid' => $id, ':path' => $path, ':ord' => $startIndex + $i]);
            }
            // Backward compatible JSON update
            $sql = "UPDATE purchases SET defect_photos = :photos, updated_at = NOW() WHERE id = :id";
            $existing = [];
            $q = $this->db->prepare("SELECT defect_photos FROM purchases WHERE id = :id");
            $q->execute([':id' => $id]);
            $row = $q->fetch();
            if ($row && $row['defect_photos']) {
                $existing = json_decode($row['defect_photos'], true) ?? [];
            }
            $all = array_merge($existing, $result['files']);
            $stmt = $this->db->prepare($sql);
            $stmt->execute([':id' => $id, ':photos' => json_encode($all)]);
            return [ 'success' => true, 'files' => $result['files'] ];
        } catch (Exception $e) {
            error_log('Upload defect photos error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Smaže fotku z nákupu
     */
    public function deletePhoto($id, $filename) {
        try {
            $purchase = $this->getById($id);
            $photos = json_decode($purchase['data']['photos'] ?? '[]', true);

            // Odeber fotku ze seznamu
            $photos = array_filter($photos, function($photo) use ($filename) {
                return $photo !== $filename && !strpos($photo, $filename);
            });

            // Remove from normalized table as well
            $delP = $this->db->prepare("DELETE FROM purchase_photos WHERE purchase_id = :pid AND (file_path = :fp OR file_path LIKE CONCAT('%', :fn))");
            $delP->execute([':pid' => $id, ':fp' => $filename, ':fn' => $filename]);

            FileUpload::deleteFile($filename);

            $sql = "UPDATE purchases SET photos = :photos, updated_at = NOW() WHERE id = :id";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                ':id' => $id,
                ':photos' => json_encode(array_values($photos)),
            ]);

            return [
                'success' => true,
                'message' => 'Photo deleted successfully',
            ];
        } catch (Exception $e) {
            error_log('Delete photo error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Smaže výkup a všechny související fotky z disku
     */
    public function deletePurchase($id) {
        try {
            // Načti fotky k výkupu
            $stmt = $this->db->prepare("SELECT photos, defect_photos FROM purchases WHERE id = :id");
            $stmt->execute([':id' => $id]);
            $row = $stmt->fetch();

            // Pokud neexistuje, nic nemaž
            if (!$row) {
                return [ 'success' => false, 'message' => 'Purchase not found' ];
            }

            $all = [];
            if (!empty($row['photos'])) {
                $p = json_decode($row['photos'], true);
                if (is_array($p)) $all = array_merge($all, $p);
            }
            if (!empty($row['defect_photos'])) {
                $d = json_decode($row['defect_photos'], true);
                if (is_array($d)) $all = array_merge($all, $d);
            }

            // Smaž soubory bezpečně
            foreach ($all as $path) {
                $filename = basename($path);
                try {
                    FileUpload::deleteFile($filename);
                } catch (Exception $e) {
                    // Pokračuj dál, loguj chybu
                    error_log('Delete file failed: ' . $filename . ' - ' . $e->getMessage());
                }
            }

            // Smaž záznam
            $del = $this->db->prepare("DELETE FROM purchases WHERE id = :id");
            $del->execute([':id' => $id]);

            return [ 'success' => true ];
        } catch (Exception $e) {
            error_log('Delete purchase error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * GET /api/purchases/statistics/personal
     * Vrací statistiky výkupů pro konkrétního uživatele
     * Mapuje purchase_state na stavy: 'new', 'in_progress', 'completed', 'cancelled'
     */
    public function getPersonalStatistics($userId) {
        try {
            $sql = "SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN purchase_state = 'NEW' THEN 1 ELSE 0 END) as new,
                SUM(CASE WHEN purchase_state = 'IN_PROGRESS' THEN 1 ELSE 0 END) as inProgress,
                SUM(CASE WHEN purchase_state = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN purchase_state = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled
            FROM purchases WHERE employee_id = :user_id";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([':user_id' => $userId]);
            $stats = $stmt->fetch();
            return [
                'success' => true,
                'data' => [
                    'total' => intval($stats['total'] ?? 0),
                    'new' => intval($stats['new'] ?? 0),
                    'inProgress' => intval($stats['inProgress'] ?? 0),
                    'completed' => intval($stats['completed'] ?? 0),
                    'cancelled' => intval($stats['cancelled'] ?? 0),
                    'lastUpdated' => date('Y-m-d\TH:i:s\Z')
                ]
            ];
        } catch (Exception $e) {
            error_log('Get personal statistics error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * GET /api/purchases/statistics/all
     * Vrací celkové statistiky všech výkupů v systému
     */
    public function getCompanyStatistics() {
        try {
            $sql = "SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN purchase_state = 'NEW' THEN 1 ELSE 0 END) as new,
                SUM(CASE WHEN purchase_state = 'IN_PROGRESS' THEN 1 ELSE 0 END) as inProgress,
                SUM(CASE WHEN purchase_state = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN purchase_state = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled
            FROM purchases";
            $stmt = $this->db->prepare($sql);
            $stmt->execute();
            $stats = $stmt->fetch();
            return [
                'success' => true,
                'data' => [
                    'total' => intval($stats['total'] ?? 0),
                    'new' => intval($stats['new'] ?? 0),
                    'inProgress' => intval($stats['inProgress'] ?? 0),
                    'completed' => intval($stats['completed'] ?? 0),
                    'cancelled' => intval($stats['cancelled'] ?? 0),
                    'lastUpdated' => date('Y-m-d\TH:i:s\Z')
                ]
            ];
        } catch (Exception $e) {
            error_log('Get company statistics error: ' . $e->getMessage());
            throw $e;
        }
    }
}
?>