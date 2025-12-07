// Vehicle selection options for New Purchase form

export const VEHICLE_MAKES = [
  'Audi', 'BMW', 'Mercedes-Benz', 'Volkswagen', 'Ford', 'Toyota', 
  'Honda', 'Nissan', 'Hyundai', 'Kia', 'Mazda', 'Suzuki',
  'Peugeot', 'Renault', 'Citroen', 'Fiat', 'Alfa Romeo',
  'Volvo', 'Saab', 'Porsche', 'Jaguar', 'Land Rover',
  'Lexus', 'Infiniti', 'Acura', 'Genesis', 'Tesla',
  'Škoda', 'Seat', 'Opel', 'Dacia', 'Mini', 'Jeep', 
  'Chevrolet', 'Mitsubishi', 'Subaru'
].sort();

export const VEHICLE_MODELS: Record<string, string[]> = {
  'Audi': ['A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q2', 'Q3', 'Q5', 'Q7', 'Q8', 'e-tron', 'R8', 'TT', 'RS3', 'RS4', 'RS5', 'RS6', 'RS7'],
  'BMW': ['1 Series', '2 Series', '3 Series', '4 Series', '5 Series', '6 Series', '7 Series', '8 Series', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'Z4', 'i3', 'i4', 'iX', 'M3', 'M4', 'M5'],
  'Mercedes-Benz': ['A-Class', 'B-Class', 'C-Class', 'CLA', 'CLS', 'E-Class', 'S-Class', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'AMG GT', 'EQA', 'EQB', 'EQC', 'EQS', 'V-Class', 'Vito'],
  'Volkswagen': ['Polo', 'Golf', 'Passat', 'Tiguan', 'Touran', 'Touareg', 'T-Cross', 'T-Roc', 'Arteon', 'ID.3', 'ID.4', 'ID.5', 'Caddy', 'Transporter', 'Multivan'],
  'Ford': ['Fiesta', 'Focus', 'Mondeo', 'Kuga', 'Explorer', 'Mustang', 'F-150', 'Transit', 'Ranger', 'Puma', 'EcoSport', 'S-Max', 'Galaxy'],
  'Toyota': ['Yaris', 'Corolla', 'Camry', 'RAV4', 'Highlander', 'Land Cruiser', 'Prius', 'Supra', 'C-HR', 'Aygo', 'Avensis', 'Auris'],
  'Honda': ['Civic', 'Accord', 'CR-V', 'HR-V', 'Pilot', 'Ridgeline', 'Insight', 'Jazz', 'e'],
  'Nissan': ['Micra', 'Sentra', 'Altima', 'Maxima', 'Rogue', 'Murano', 'Pathfinder', 'Leaf', 'GT-R', 'Qashqai', 'Juke', 'X-Trail', 'Note'],
  'Hyundai': ['i10', 'i20', 'i30', 'i40', 'Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Genesis', 'Kona', 'IONIQ', 'ix20', 'ix35'],
  'Kia': ['Picanto', 'Rio', 'Ceed', 'Forte', 'Optima', 'Sportage', 'Sorento', 'Telluride', 'Niro', 'EV6', 'Stonic', 'Stinger', 'Venga'],
  'Škoda': ['Fabia', 'Octavia', 'Superb', 'Kodiaq', 'Karoq', 'Kamiq', 'Scala', 'Rapid', 'Citigo', 'Yeti', 'Roomster', 'Enyaq'],
  'Seat': ['Ibiza', 'Leon', 'Ateca', 'Arona', 'Tarraco', 'Alhambra', 'Toledo', 'Mii'],
  'Opel': ['Corsa', 'Astra', 'Insignia', 'Mokka', 'Crossland', 'Grandland', 'Zafira', 'Meriva', 'Adam', 'Karl'],
  'Peugeot': ['208', '308', '508', '2008', '3008', '5008', 'Partner', 'Rifter', '107', '206', '207', '307', '407'],
  'Renault': ['Clio', 'Megane', 'Scenic', 'Captur', 'Kadjar', 'Koleos', 'Talisman', 'Twingo', 'Zoe', 'Kangoo'],
  'Citroen': ['C1', 'C3', 'C4', 'C5', 'Berlingo', 'C3 Aircross', 'C5 Aircross', 'SpaceTourer'],
  'Dacia': ['Sandero', 'Duster', 'Logan', 'Dokker', 'Lodgy', 'Spring'],
  'Mazda': ['2', '3', '6', 'CX-3', 'CX-30', 'CX-5', 'CX-60', 'MX-5', 'MX-30'],
  'Volvo': ['S60', 'S90', 'V40', 'V60', 'V90', 'XC40', 'XC60', 'XC90', 'C40'],
  'Fiat': ['500', 'Panda', 'Tipo', 'Punto', 'Doblo', '500X', '500L'],
  'Mini': ['Cooper', 'Countryman', 'Clubman', 'Paceman'],
  'Jeep': ['Renegade', 'Compass', 'Cherokee', 'Grand Cherokee', 'Wrangler'],
  'Mitsubishi': ['ASX', 'Outlander', 'Eclipse Cross', 'L200', 'Pajero', 'Space Star'],
  'Subaru': ['Impreza', 'Forester', 'Outback', 'XV', 'Legacy', 'Levorg', 'BRZ'],
};

export const VEHICLE_COLORS = [
  'Black', 'White', 'Silver', 'Gray', 'Blue', 'Red', 'Green', 
  'Brown', 'Beige', 'Gold', 'Orange', 'Yellow', 'Purple'
].sort();

export const ENGINE_SIZES = [
  '1.0L', '1.2L', '1.4L', '1.5L', '1.6L', '1.8L', '2.0L', 
  '2.2L', '2.4L', '2.5L', '2.7L', '3.0L', '3.5L', '4.0L',
  '1.0L TSI', '1.4L TFSI', '1.6L TDI', '2.0L TDI', '2.0L TFSI',
  '3.0L TDI', 'Electric', 'Hybrid'
].sort();

export const FUEL_TYPES = [
  'Petrol', 'Diesel', 'Hybrid', 'Electric', 'LPG', 'CNG'
];

export const TRANSMISSION_TYPES = [
  'Manual', 'Automatic', 'CVT', 'Semi-automatic'
];