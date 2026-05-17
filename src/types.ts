export interface Pond {
  id: string;
  name: string;
  location: string;
  ownerId: string;
  createdAt: any;
}

export interface SensorData {
  temperature: number;
  dissolvedOxygen: number;
  pH: number;
  ammonia: number;
  nitrite: number;
  updatedAt: any;
}

export interface Equipment {
  id: string;
  type: 'aerator' | 'feeder' | 'pump';
  status: 'on' | 'off';
  mode: 'manual' | 'auto';
  lastActionAt: any;
}

export interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'info' | 'critical';
  message: string;
  severity: string;
  handled: boolean;
  createdAt: any;
}

export interface HistoricalStats {
  id: string;
  date: string;
  avgTemp: number;
  avgDO: number;
  minDO: number;
  status: 'normal' | 'warning' | 'critical';
}
