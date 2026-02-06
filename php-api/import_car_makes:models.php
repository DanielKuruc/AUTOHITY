<?php

$pdo = new PDO(
    "mysql:host=localhost;dbname=app;charset=utf8mb4",
    "autohitycz",
    "Xx123Xx456a",
    [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]
);

$data = json_decode(file_get_contents('car-makes.json'), true);

$insertMake = $pdo->prepare(
    "INSERT IGNORE INTO car_makes (name) VALUES (?)"
);

$getMakeId = $pdo->prepare(
    "SELECT id FROM car_makes WHERE name = ?"
);

$insertModel = $pdo->prepare(
    "INSERT IGNORE INTO car_models (make_id, name, series)
     VALUES (?, ?, ?)"
);

foreach ($data as $make) {

    $makeName = trim($make['name']);
    $insertMake->execute([$makeName]);

    $getMakeId->execute([$makeName]);
    $makeId = $getMakeId->fetchColumn();

    foreach ($make['models'] as $model) {

        $modelName = trim($model['name']);
        $series = $model['series'] !== null
            ? trim($model['series'])
            : null;

        if ($modelName === '') {
            continue;
        }

        $insertModel->execute([
            $makeId,
            $modelName,
            $series
        ]);
    }
}

echo "Import dokončen ✅\n";