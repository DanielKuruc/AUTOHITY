import { API_BASE_URL } from './apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StatisticsSummary {
  total_count: number;
  completed_count: number;
  total_amount: number;
  average_amount: number;
}

export interface StatByState {
  purchase_state: string;
  count: number;
  total_amount: number | null;
}

export interface TopMake {
  make: string;
  count: number;
  completed: number;
}

export interface TopEmployee {
  employee_id: number;
  count: number;
  completed: number;
  total_amount: number | null;
}

export interface StatisticsData {
  summary: StatisticsSummary;
  statsByState: StatByState[];
  topMakes: TopMake[];
  topEmployees: TopEmployee[];
}

export class StatisticsService {
  async getStatistics(
    timeFilter: string = 'ALL',
    employeeId?: number,
    onlyMyPurchases: boolean = false,
    fromDate?: string,
    toDate?: string
  ): Promise<StatisticsData> {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      const params = new URLSearchParams();
      
      params.append('timeFilter', timeFilter);
      if (employeeId) params.append('employeeId', employeeId.toString());
      if (onlyMyPurchases) params.append('onlyMyPurchases', 'true');
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const response = await fetch(`${API_BASE_URL}/statistics?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load statistics: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      throw error;
    }
  }
}

export const statisticsService = new StatisticsService();
