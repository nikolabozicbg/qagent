/**
 * Auth configuration for protected routes
 */
export interface AuthConfig {
  enabled: boolean;
  username: string;
  password: string;
  // Auto-detected or manual override
  loginRoute?: string;          // default: '/signin'
  usernameSelector?: string;    // default: '[name="username"]'
  passwordSelector?: string;    // default: '[name="password"]'
  submitSelector?: string;      // default: 'button[type="submit"]'
  successUrlPattern?: string;   // default: '/dashboard|/home'
}

/**
 * Project configuration stored with the project
 */
export interface ProjectConfig {
  projectPath: string;
  projectName: string;
  framework: 'playwright' | 'cypress';
  baseUrl: string;
  testDir: string;
  auth?: AuthConfig;
}

// Import TestSuite types from smart-journey-discovery.service
import type { TestSuite, TestCase, TestStep } from '../../analysis/smart-journey-discovery.service';

// Re-export for use in project module
export type { TestSuite, TestCase, TestStep };

/**
 * Cached project data in memory
 */
export interface CachedProject {
  config: ProjectConfig;
  suites: TestSuite[];
  lastScan: Date;
  metadata?: {
    totalCases: number;
    totalSteps: number;
    analysisTime: number;
  };
}

/**
 * DTO for creating/updating a project
 */
export interface CreateProjectDto {
  projectPath: string;
  projectName: string;
  framework: 'playwright' | 'cypress';
  baseUrl: string;
  testDir?: string;
  auth?: AuthConfig;
}

/**
 * DTO for project discovery request
 */
export interface DiscoverProjectDto {
  projectPath: string;
  framework?: 'playwright' | 'cypress';
  forceRefresh?: boolean; // If true, ignore cache and re-discover
}
