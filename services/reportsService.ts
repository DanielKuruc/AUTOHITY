import { API_BASE_URL } from './apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Purchase } from '@/constants/types';

export interface ReportSummary {
  total_count: number;
  completed_count: number;
  total_amount: number;
  average_amount: number;
}

export interface TopMake {
  make: string;
  count: number;
  completed: number;
}

export interface TopEmployee {
  name: string;
  count: number;
  completed: number;
  value: number;
}

export interface TopSupplier {
  id: number;
  name: string;
  count: number;
  completed: number;
  value: number;
}

export interface StatByState {
  purchase_state: string;
  count: number;
  total_amount?: number;
}

export interface ReportData {
  purchases: Purchase[];
  summary: ReportSummary;
  topMakes: TopMake[];
  topEmployees: TopEmployee[];
  topSuppliers: TopSupplier[];
  statsByState: StatByState[];
  total: number;
  completed: number;
  cancelled: number;
  completedValue: number;
  successRate: number;
  periodLabel: string;
  startDate: string;
  endDate: string;
  byState: {
    [key: string]: number;
  };
}

export class ReportsService {
  async getReportData(
    timeFilter: string = 'ALL',
    employeeId?: number,
    onlyMyPurchases: boolean = false,
    fromDate?: string,
    toDate?: string
  ): Promise<ReportData> {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      const params = new URLSearchParams();
      
      params.append('timeFilter', timeFilter);
      if (employeeId) params.append('employeeId', employeeId.toString());
      if (onlyMyPurchases) params.append('onlyMyPurchases', 'true');
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const response = await fetch(`${API_BASE_URL}/reports?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load report data: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      throw error;
    }
  }
}

export const reportsService = new ReportsService();