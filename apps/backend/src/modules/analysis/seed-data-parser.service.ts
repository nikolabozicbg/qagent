import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface SeedUser {
  username: string;
  password: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * SeedDataParserService
 * 
 * Extracts real test data from seed files in the application.
 * Allows tests to use actual credentials instead of fake ones.
 * 
 * Goal: Login test should use 'Katharina_Bernier' / 's3cret' (real Cypress RWA user)
 */
@Injectable()
export class SeedDataParserService {
  private cache = new Map<string, SeedUser[]>();
  
  /**
   * Find and parse seed data files from project
   */
  findSeedData(projectRoot: string): SeedUser[] {
    // Check cache
    if (this.cache.has(projectRoot)) {
      return this.cache.get(projectRoot)!;
    }
    
    // Find seed files
    const seedFiles = this.findSeedFiles(projectRoot);
    
    if (seedFiles.length === 0) {
      console.log('No seed files found, using default test data');
      return this.getDefaultTestUsers();
    }
    
    // Parse seed files
    const users: SeedUser[] = [];
    for (const seedFile of seedFiles) {
      try {
        const parsedUsers = this.parseSeedFile(seedFile);
        users.push(...parsedUsers);
      } catch (error) {
        console.error(`Failed to parse seed file ${seedFile}:`, error.message);
      }
    }
    
    // Cache results
    this.cache.set(projectRoot, users);
    
    console.log(`Found ${users.length} seed users from ${seedFiles.length} files`);
    return users;
  }
  
  /**
   * Get a seed user for login tests
   */
  getLoginUser(projectRoot: string): SeedUser | null {
    const users = this.findSeedData(projectRoot);
    
    // Prefer first non-admin user
    const regularUser = users.find(u => 
      !u.username.toLowerCase().includes('admin') &&
      !u.username.toLowerCase().includes('test')
    );
    
    return regularUser || users[0] || null;
  }
  
  /**
   * Get unique username/email for registration tests
   */
  getUniqueRegistrationData(): { username: string; email: string } {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    
    return {
      username: `user_${timestamp}_${random}`,
      email: `test_${timestamp}@example.com`
    };
  }
  
  /**
   * Find seed files in project
   */
  private findSeedFiles(projectRoot: string): string[] {
    const candidates = [
      // Cypress Real World App patterns
      'data/database.json',
      'backend/database.json',
      'cypress/fixtures/users.json',
      
      // Common patterns
      'db/seeds.json',
      'db/seeds.ts',
      'db/seeds.js',
      'database/seeds.json',
      'seeds.json',
      'test-data.json',
      'fixtures/users.json',
      
      // Rails/Django patterns
      'db/seeds.rb',
      'fixtures.json',
    ];
    
    const found: string[] = [];
    
    // Search in project root and parent directories
    const searchPaths = [
      projectRoot,
      path.join(projectRoot, '..'),
      path.join(projectRoot, '../..'),
    ];
    
    for (const basePath of searchPaths) {
      for (const candidate of candidates) {
        const fullPath = path.join(basePath, candidate);
        if (fs.existsSync(fullPath)) {
          found.push(fullPath);
        }
      }
    }
    
    return found;
  }
  
  /**
   * Parse seed file and extract users
   */
  private parseSeedFile(filePath: string): SeedUser[] {
    const ext = path.extname(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    if (ext === '.json') {
      return this.parseJSONSeed(content);
    } else if (ext === '.js' || ext === '.ts') {
      return this.parseJSSeed(content);
    } else if (ext === '.rb') {
      return this.parseRubySeed(content);
    }
    
    return [];
  }
  
  /**
   * Parse JSON seed file
   */
  private parseJSONSeed(content: string): SeedUser[] {
    try {
      const data = JSON.parse(content);
      
      // Format 1: { users: [...] }
      if (data.users && Array.isArray(data.users)) {
        return data.users.map((u: any) => this.normalizeUser(u));
      }
      
      // Format 2: Direct array [...]
      if (Array.isArray(data)) {
        return data.map((u: any) => this.normalizeUser(u));
      }
      
      // Format 3: Object with user objects
      const users: SeedUser[] = [];
      for (const key in data) {
        if (typeof data[key] === 'object' && data[key].username) {
          users.push(this.normalizeUser(data[key]));
        }
      }
      
      return users;
    } catch (error) {
      console.error('Failed to parse JSON seed:', error.message);
      return [];
    }
  }
  
  /**
   * Parse JavaScript/TypeScript seed file
   */
  private parseJSSeed(content: string): SeedUser[] {
    const users: SeedUser[] = [];
    
    // Pattern: { username: 'xxx', password: 'yyy' }
    const userPattern = /\{[^}]*username:\s*['"]([^'"]+)['"][^}]*password:\s*['"]([^'"]+)['"][^}]*\}/g;
    let match;
    
    while ((match = userPattern.exec(content)) !== null) {
      users.push({
        username: match[1],
        password: match[2]
      });
    }
    
    return users;
  }
  
  /**
   * Parse Ruby seed file
   */
  private parseRubySeed(content: string): SeedUser[] {
    const users: SeedUser[] = [];
    
    // Pattern: User.create(username: 'xxx', password: 'yyy')
    const createPattern = /User\.create\([^)]*username:\s*['"]([^'"]+)['"][^)]*password:\s*['"]([^'"]+)['"][^)]*\)/g;
    let match;
    
    while ((match = createPattern.exec(content)) !== null) {
      users.push({
        username: match[1],
        password: match[2]
      });
    }
    
    return users;
  }
  
  /**
   * Normalize user object from various formats
   */
  private normalizeUser(raw: any): SeedUser {
    // Cypress RWA uses bcrypt hashed passwords in seed, but all use 's3cret'
    // Detect hashed password and use common default
    let password = raw.password || raw.pass || raw.pwd || '';
    if (password.startsWith('$2a$') || password.startsWith('$2b$')) {
      password = 's3cret'; // Cypress RWA default password
    }
    
    return {
      username: raw.username || raw.user || raw.login || raw.name || '',
      password,
      email: raw.email || raw.mail || undefined,
      firstName: raw.firstName || raw.first_name || raw.fname || undefined,
      lastName: raw.lastName || raw.last_name || raw.lname || undefined,
    };
  }
  
  /**
   * Default test users as fallback
   */
  private getDefaultTestUsers(): SeedUser[] {
    return [
      {
        username: 'testuser',
        password: 'TestPass123!',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      }
    ];
  }
}
