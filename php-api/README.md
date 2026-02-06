# AUTOHITY REST API

PHP REST API pro správu nákupů automobilů s nahráváním fotek.

## Instalace

### 1. Požadavky
- PHP 7.4+
- MySQL 5.7+
- Apache/Nginx s mod_rewrite
- cURL pro testing

### 2. Upload na server

Nahraj složku `php-api/` na server autohity.cz:
```bash
/public_html/api/
```

### 3. Databáze setup

1. Vytvoř novou databázi:
```sql
CREATE DATABASE autohity CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Importuj `schema.sql`:
```bash
mysql -u root -p autohity < schema.sql
```

3. Vytvoř test uživatele:
```sql
INSERT INTO users (id, email, password, name) VALUES 
('user-1', 'test@autohity.cz', SHA2('password123', 256), 'Test User');
```

### 4. Konfiguruj `config.php`

Nastav environment proměnné nebo přímo v `config.php`:
```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', 'password');
define('DB_NAME', 'autohity');
define('JWT_SECRET', 'your-secret-key-production');
```

### 5. Vytvoř složky

```bash
mkdir -p photos/uploads/
mkdir -p logs/
chmod 755 photos/uploads/
chmod 755 logs/
```

## API Endpoints

### Autentizace

#### POST `/api/auth/login`
Přihlášení a získání JWT tokenu

**Request:**
```json
{
  "email": "test@autohity.cz",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": "user-1",
    "email": "test@autohity.cz"
  }
}
```

### Nákupy

#### POST `/api/purchases`
Vytvoří nový nákup

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "clientName": "Jan Novák",
  "clientType": "PERSONAL",
  "spz": "4A2 1234",
  "purchaseDate": "2025-12-16",
  "purchaseState": "NEW",
  "employeeId": "emp-1",
  "totalAmount": 150000,
  "customerPrice": 140000,
  "offeredPrice": 145000,
  "expectedSalePrice": 155000,
  "isVatPayer": true,
  "phone": "+420723456789",
  "street": "Hlavní 123",
  "city": "Praha",
  "postalCode": "10000",
  "notes": "Dobrý stav vozu",
  "inspectionDate": "2025-12-20"
}
```

**Response:**
```json
{
  "success": true,
  "id": "123",
  "message": "Purchase created successfully"
}
```

#### GET `/api/purchases`
Seznam nákupů s filtrováním

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `client_name` - filtruj po jménu klienta
- `spz` - filtruj po SPZ
- `purchase_state` - filtruj po stavu (NEW, IN_PROGRESS, COMPLETED, CANCELLED)
- `employee_id` - filtruj po zaměstnanci
- `start_date` - filtruj od data (YYYY-MM-DD)
- `end_date` - filtruj do data (YYYY-MM-DD)

**Example:**
```
GET /api/purchases?client_name=Novák&purchase_state=NEW
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "123",
      "client_name": "Jan Novák",
      "spz": "4A2 1234",
      "purchase_state": "NEW",
      ...
    }
  ],
  "count": 1
}
```

#### GET `/api/purchases/{id}`
Detail konkrétního nákupu

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123",
    "client_name": "Jan Novák",
    ...
  }
}
```

#### PUT `/api/purchases/{id}`
Aktualizuj nákup (partial update)

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "purchaseState": "IN_PROGRESS",
  "notes": "Aktualizované poznámky"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Purchase updated successfully"
}
```

#### DELETE `/api/purchases/{id}`
Smaž nákup

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Purchase deleted successfully"
}
```

### Nahrávání fotek

#### POST `/api/purchases/{id}/upload-images`
Nahraj fotky pro nákup

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body:**
```
files: [file1.jpg, file2.jpg, ...]
```

**Response:**
```json
{
  "success": true,
  "files": [
    "/api/photos/uploads/photo_123_1702788000.jpg",
    "/api/photos/uploads/photo_456_1702788001.jpg"
  ],
  "message": "2 photos uploaded"
}
```

#### DELETE `/api/purchases/{id}/photos/{filename}`
Smaž fotku

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Photo deleted successfully"
}
```

## Chybové kódy

| Status | Error |
|--------|-------|
| 400 | Bad Request - chybějící nebo nevalidní parametry |
| 401 | Unauthorized - chybný nebo chybějící token |
| 404 | Not Found - zdroj neexistuje |
| 500 | Server Error - interní chyba serveru |

## Testing s cURL

### Přihlášení
```bash
curl -X POST https://autohity.cz/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@autohity.cz","password":"password123"}'
```

### Vytvoření nákupu
```bash
curl -X POST https://autohity.cz/api/purchases \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientName":"Jan Novák",
    "spz":"4A2 1234",
    "purchaseState":"NEW"
  }'
```

### Nahrání fotek
```bash
curl -X POST https://autohity.cz/api/purchases/123/upload-images \
  -H "Authorization: Bearer TOKEN" \
  -F "photos=@photo1.jpg" \
  -F "photos=@photo2.jpg"
```

## Security

- JWT tokeny expirují za 7 dní
- Všechny požadavky vyžadují autentizaci (kromě login)
- Fotky jsou uloženy mimo web root
- Validace MIME typů
- SQL injection ochrana (prepared statements)

## Struktura souborů

```
php-api/
├── index.php              # API router
├── config.php             # Konfigurace
├── Database.php           # MySQL connection
├── Auth.php               # JWT autentizace
├── FileUpload.php         # Nahrávání souborů
├── PurchaseAPI.php        # CRUD pro nákupy
├── schema.sql             # Databázové schéma
├── .htaccess              # Apache rewrite rules
├── photos/
│   └── uploads/           # Nahraté fotky
├── logs/                  # Log soubory
└── README.md              # Tato dokumentace
```

## Troubleshooting

### "Database connection failed"
- Zkontroluj DB_HOST, DB_USER, DB_PASS v `config.php`
- Ujisti se, že MySQL běží

### "File upload failed"
- Zkontroluj práva na `photos/uploads/` (755)
- Zkontroluj `upload_max_filesize` v php.ini

### "Invalid token"
- Token vypršel (7 dní) - přihlášení znovu
- Zkontroluj JWT_SECRET je stejný na serveru a klientu

## License

AUTOHITY © 2025
