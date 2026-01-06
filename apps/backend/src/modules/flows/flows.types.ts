export interface Flow {
  id: string;
  name: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'no-tests' | 'passing' | 'partial' | 'failing';
  route: string;
  components: number;
  apis: number;
  enriched: boolean;
  confidence?: number;
  lastRun?: string;
  passing?: number;
  total?: number;
  testFile?: boolean;
  projectPath: string;
  createdAt: number;
  updatedAt: number;
  enrichedData?: any;
  steps?: any[];
}

export interface CreateFlowDto {
  name: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  route: string;
  components?: number;
  apis?: number;
  enriched?: boolean;
  confidence?: number;
  projectPath: string;
  enrichedData?: any;
  steps?: any[];
}

export interface UpdateFlowDto {
  name?: string;
  priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status?: 'no-tests' | 'passing' | 'partial' | 'failing';
  lastRun?: string;
  passing?: number;
  total?: number;
  testFile?: boolean;
}
