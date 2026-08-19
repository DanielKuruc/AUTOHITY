// Data models based on iOS Objective-C app structure

export interface Purchase {
  id: string;
  clientId?: string | null; // Client/Supplier ID
  clientName: string;
  clientType: ClientType;
  companyInfo?: CompanyInfo;
  spz: string; // License plate
  purchaseDate: string | null;
  purchaseTime?: string | null; // Format: hh:mm
  purchaseState: PurchaseState;
  employeeId?: string | null;
  totalAmount?: number | null;
  customerPrice?: number | null;
  offeredPrice?: number | null;
  expectedSalePrice?: number | null;
  isVatPayer?: boolean;
  phone?: string | null;
  street?: string | null;
  city?: string | null;
  postalCode?: string | null;
  notes?: string | null;
  serviceNotes?: string | null;
  inspectionDate?: string | null;
  inspectionTime?: string | null; // Format: hh:mm
  createdAt?: string;
  updatedAt?: string;
  // Extended fields from form
  carDetails?: Car;
  images?: string[];
  defectImages?: string[];
  componentStatuses?: ComponentStatus[];
  paintThickness?: PaintThicknessReading[];
  sourceKnowledge?: string;
  vinVerified?: boolean;
  isCounterAccount?: boolean;
  cebia?: boolean;
  caVertical?: boolean;
  coverPhotoUri?: string | null;
  // Priority feature
  isPriority?: number; // 0 or 1
}

export interface ComponentStatus {
  component: string;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  notes?: string;
}

// Panely karoserie pro měření tloušťky laku.
// Orientace diagramu: příď vlevo, horní hrana = pravá strana vozu, dolní = levá.
export type PaintZoneKey =
  | 'hood'
  | 'roof'
  | 'tailgate'
  | 'fenderFrontRight'
  | 'doorFrontRight'
  | 'doorRearRight'
  | 'fenderRearRight'
  | 'fenderFrontLeft'
  | 'doorFrontLeft'
  | 'doorRearLeft'
  | 'fenderRearLeft';

export interface PaintThicknessReading {
  zone: PaintZoneKey;
  // Tloušťka v µm; null = panel nebyl změřen
  valueUm: number | null;
}

export interface CompanyInfo {
  companyName: string;
  ico?: string; // Company identification number
  dic?: string; // Tax identification number
  address?: string;
}

export interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  color?: string;
  mileage?: number;
  fuelType?: string;
  engineSize?: string;
  transmission?: string;
  condition: CarCondition;
  // Extended fields
  bodyType?: string;
  driveType?: string;
  spz?: string;
  stk?: string;
  firstRegistration?: string;
  motorovaVarianta?: string;
  pocetVlastniku?: number;
  pocetProvozovatelu?: number;
  isImport?: boolean;
  isFirstOwner?: boolean;
  hasServiceBook?: boolean;
  hasSecurityScrews?: boolean;
  hasAiWheels?: boolean;
  registered?: boolean;
}

export interface PurchaseFilter {
  employeePurchasesOnly: boolean;
  todayPurchases: boolean;
  timeFilter: TimeFilterType;
  purchaseStateFilter: PurchaseState[];
  clientName?: string;
  spz?: string;
  employeeId?: string;
  serviceNotesOnly?: boolean;
}

export enum PurchaseState {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS', 
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum CarCondition {
  NEW = 'NEW',
  USED = 'USED',
  DAMAGED = 'DAMAGED'
}

export enum TimeFilterType {
  ALL = 'ALL',
  TODAY = 'TODAY', 
  WEEK = 'WEEK',
  MONTH = 'MONTH'
}

export interface Employee {
  id: string;
  name: string;
  role: string;
}

export enum ClientType {
  PERSONAL = 'person',
  COMPANY = 'company'
}