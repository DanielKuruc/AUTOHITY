<?php
// FileUpload.php - File upload handling

class FileUpload {
    /**
     * Nahraje fotku a vrátí cestu
     */
    public static function uploadFile($file) {
        // Validace souboru
        if (!isset($file['tmp_name']) || !isset($file['size']) || !isset($file['type'])) {
            throw new Exception('Invalid file');
        }

        // Kontrola velikosti
        if ($file['size'] > MAX_FILE_SIZE) {
            throw new Exception('File too large. Maximum size: ' . (MAX_FILE_SIZE / 1024 / 1024) . 'MB');
        }

        // Kontrola MIME typu
        if (!in_array($file['type'], ALLOWED_MIME_TYPES)) {
            throw new Exception('Invalid file type. Allowed: JPEG, PNG, WebP');
        }

        // Validace MIME typu opravdu
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mimeType, ALLOWED_MIME_TYPES)) {
            throw new Exception('Invalid file type detected');
        }

        // Generuj jedinečný název
        $filename = 'photo_' . uniqid() . '_' . time() . '.' . self::getExtension($file['type']);
        $filepath = UPLOAD_DIR . $filename;

        // Přesuň soubor
        if (!move_uploaded_file($file['tmp_name'], $filepath)) {
            throw new Exception('Failed to upload file');
        }

        // Vrátí relativní cestu (veřejná URL cesta)
        return '/php-api/photos/uploads/' . $filename;
    }

    /**
     * Nahraje více fotek
     */
    public static function uploadMultiple($files) {
        $uploadedFiles = [];
        $errors = [];

        // Normalizuj $_FILES array
        $files = self::normalizeFiles($files);

        foreach ($files as $file) {
            try {
                $uploadedFiles[] = self::uploadFile($file);
            } catch (Exception $e) {
                $errors[] = $e->getMessage();
            }
        }

        return [
            'success' => count($uploadedFiles) > 0,
            'files' => $uploadedFiles,
            'errors' => $errors,
        ];
    }

    /**
     * Smaže fotku
     */
    public static function deleteFile($filename) {
        // Bezpečnostní kontrola - jen filename, bez cest
        $filename = basename($filename);
        $filepath = UPLOAD_DIR . $filename;

        // Ověř, že soubor je ve správném adresáři
        if (realpath($filepath) !== realpath(UPLOAD_DIR) . '/' . $filename) {
            throw new Exception('Invalid file path');
        }

        if (file_exists($filepath)) {
            unlink($filepath);
            return true;
        }

        return false;
    }

    /**
     * Normalizuj $_FILES array pro více souborů
     */
    private static function normalizeFiles($files) {
        if (!isset($files['name']) || !is_array($files['name'])) {
            return [$files];
        }

        $normalized = [];
        foreach ($files['name'] as $key => $name) {
            $normalized[] = [
                'name' => $name,
                'type' => $files['type'][$key],
                'tmp_name' => $files['tmp_name'][$key],
                'error' => $files['error'][$key],
                'size' => $files['size'][$key],
            ];
        }

        return $normalized;
    }

    /**
     * Vrátí příponu na základě MIME typu
     */
    private static function getExtension($mimeType) {
        $extensions = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
        ];

        return $extensions[$mimeType] ?? 'jpg';
    }
}

?>