// Data models based on iOS Objective-C app structure

export interface Purchase {
  id: string;
  clientName: string;
  clientType: ClientType;
  companyInfo?: CompanyInfo;
  spz: string; // License plate (Slovak: "Státní poznávací značka")
  purchaseDate: string;
  purchaseState: PurchaseState;
  employeeId?: string;
  carDetails?: Car;
  images?: string[];
  notes?: string;
  totalAmount?: number;
  // Extended fields from form
  inspectionDate?: string;
  customerPrice?: number;
  offeredPrice?: number;
  expectedSalePrice?: number;
  isVatPayer?: boolean;
  sourceKnowledge?: string;
  isCounterAccount?: boolean;
  vinVerified?: boolean;
  // Client contact
  phone?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  // Component statuses
  componentStatuses?: ComponentStatus[];
}

export interface ComponentStatus {
  component: string;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  notes?: string;
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
  stk?: string;
  firstRegistration?: string;
  isImport?: boolean;
  isFirstOwner?: boolean;
  hasServiceBook?: boolean;
  hasSecurityScrews?: boolean;
  hasAiWheels?: boolean;
}

export interface PurchaseFilter {
  employeePurchasesOnly: boolean;
  todayPurchases: boolean;
  timeFilter: TimeFilterType;
  purchaseStateFilter: PurchaseState[];
  clientName?: string;
  spz?: string;
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
  PERSONAL = 'PERSONAL',
  COMPANY = 'COMPANY'
}