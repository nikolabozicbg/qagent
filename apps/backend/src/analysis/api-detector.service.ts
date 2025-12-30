import { Injectable, Logger } from '@nestjs/common';

export interface APICall {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  fullURL?: string;
  requestBody?: any;
  errorHandling?: {
    errorVariable?: string;
    errorSelector?: string;
  };
  successHandling?: {
    navigationTarget?: string;
    stateUpdate?: string;
  };
  libraryUsed: 'fetch' | 'axios' | 'react-query' | 'swr' | 'custom';
}

@Injectable()
export class APIDetectorService {
  private readonly logger = new Logger(APIDetectorService.name);

  /**
   * Detect all API calls from component source code
   */
  detectAPICalls(sourceCode: string): APICall[] {
    const apiCalls: APICall[] = [];

    // Pattern 1: fetch() calls
    const fetchCalls = this.detectFetchCalls(sourceCode);
    apiCalls.push(...fetchCalls);

    // Pattern 2: axios calls
    const axiosCalls = this.detectAxiosCalls(sourceCode);
    apiCalls.push(...axiosCalls);

    // Pattern 3: React Query (useQuery, useMutation)
    const reactQueryCalls = this.detectReactQueryCalls(sourceCode);
    apiCalls.push(...reactQueryCalls);

    // Pattern 4: SWR
    const swrCalls = this.detectSWRCalls(sourceCode);
    apiCalls.push(...swrCalls);

    // Pattern 5: Custom agent/API service
    const customCalls = this.detectCustomAPICalls(sourceCode);
    apiCalls.push(...customCalls);

    // Pattern 6: Redux dispatch actions (saga/thunk patterns)
    const reduxCalls = this.detectReduxActions(sourceCode);
    apiCalls.push(...reduxCalls);

    return apiCalls;
  }

  /**
   * Detect fetch() API calls
   */
  private detectFetchCalls(sourceCode: string): APICall[] {
    const calls: APICall[] = [];

    // Pattern: fetch('url', { method: 'POST', body: JSON.stringify(...) })
    const fetchPattern =
      /fetch\([`'"]([^`'"]+)[`'"](?:,\s*{([^}]+)})?[\s\S]*?\)/g;
    let match;

    while ((match = fetchPattern.exec(sourceCode)) !== null) {
      const url = match[1];
      const options = match[2];

      let method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET';
      let requestBody: any = undefined;

      if (options) {
        const methodMatch = options.match(/method:\s*['"](\w+)['"]/);
        if (methodMatch) {
          method = methodMatch[1].toUpperCase() as any;
        }

        const bodyMatch = options.match(
          /body:\s*JSON\.stringify\(([^)]+)\)/,
        );
        if (bodyMatch) {
          requestBody = this.parseRequestBody(bodyMatch[1]);
        }
      }

      // Extract error handling
      const errorHandling = this.extractErrorHandling(sourceCode, match.index);

      // Extract success handling
      const successHandling = this.extractSuccessHandling(
        sourceCode,
        match.index,
      );

      calls.push({
        method,
        endpoint: this.extractEndpoint(url),
        fullURL: url,
        requestBody,
        errorHandling,
        successHandling,
        libraryUsed: 'fetch',
      });
    }

    return calls;
  }

  /**
   * Detect axios API calls
   */
  private detectAxiosCalls(sourceCode: string): APICall[] {
    const calls: APICall[] = [];

    // Pattern: axios.post('url', data)
    const axiosPattern =
      /axios\.(get|post|put|patch|delete)\([`'"]([^`'"]+)[`'"](?:,\s*([^)]+))?\)/g;
    let match;

    while ((match = axiosPattern.exec(sourceCode)) !== null) {
      const method = match[1].toUpperCase() as
        | 'GET'
        | 'POST'
        | 'PUT'
        | 'PATCH'
        | 'DELETE';
      const url = match[2];
      const data = match[3];

      const requestBody = data ? this.parseRequestBody(data) : undefined;

      const errorHandling = this.extractErrorHandling(sourceCode, match.index);
      const successHandling = this.extractSuccessHandling(
        sourceCode,
        match.index,
      );

      calls.push({
        method,
        endpoint: this.extractEndpoint(url),
        fullURL: url,
        requestBody,
        errorHandling,
        successHandling,
        libraryUsed: 'axios',
      });
    }

    return calls;
  }

  /**
   * Detect React Query API calls
   */
  private detectReactQueryCalls(sourceCode: string): APICall[] {
    const calls: APICall[] = [];

    // Pattern: useMutation(['key'], (data) => fetch(...))
    const mutationPattern =
      /useMutation\(\[?['"]([^'"]+)['"]\]?,\s*(?:\([^)]*\)\s*=>\s*)?([^,)]+)/g;
    let match;

    while ((match = mutationPattern.exec(sourceCode)) !== null) {
      const mutationFn = match[2];

      // Try to extract fetch/axios call from mutation function
      const fetchMatch = mutationFn.match(/fetch\([`'"]([^`'"]+)[`'"]/);
      if (fetchMatch) {
        calls.push({
          method: 'POST', // Default for mutations
          endpoint: this.extractEndpoint(fetchMatch[1]),
          fullURL: fetchMatch[1],
          libraryUsed: 'react-query',
        });
      }
    }

    return calls;
  }

  /**
   * Detect SWR API calls
   */
  private detectSWRCalls(sourceCode: string): APICall[] {
    const calls: APICall[] = [];

    // Pattern: useSWR('/api/user', fetcher)
    const swrPattern = /useSWR\([`'"]([^`'"]+)[`'"]/g;
    let match;

    while ((match = swrPattern.exec(sourceCode)) !== null) {
      calls.push({
        method: 'GET',
        endpoint: this.extractEndpoint(match[1]),
        fullURL: match[1],
        libraryUsed: 'swr',
      });
    }

    return calls;
  }

  /**
   * Detect Redux dispatch actions that trigger API calls
   * Patterns: dispatch(loginAction()), dispatch(enterLoginAction())
   */
  private detectReduxActions(sourceCode: string): APICall[] {
    const calls: APICall[] = [];

    // Pattern: dispatch(someAction(args))
    const dispatchPattern = /dispatch\((\w+Action)\([^)]*\)\)/g;
    let match;

    while ((match = dispatchPattern.exec(sourceCode)) !== null) {
      const actionName = match[1];
      
      // Infer endpoint from action name
      // e.g., enterLoginAction -> /auth/login, fetchUsersAction -> /users
      const endpoint = this.inferEndpointFromAction(actionName);
      const method = this.inferMethodFromName(actionName);

      calls.push({
        method,
        endpoint,
        libraryUsed: 'custom',
      });
    }

    return calls;
  }

  /**
   * Infer API endpoint from Redux action name
   */
  private inferEndpointFromAction(actionName: string): string {
    // Remove "Action" suffix and common prefixes
    let name = actionName
      .replace(/Action$/, '')
      .replace(/^(enter|fetch|load|get|create|update|delete)/, '');

    // Special cases
    if (actionName.includes('login') || actionName.includes('Login')) {
      return '/auth/login';
    }
    if (actionName.includes('logout') || actionName.includes('Logout')) {
      return '/auth/logout';
    }
    if (actionName.includes('register') || actionName.includes('Register')) {
      return '/auth/register';
    }

    // Generic: convert camelCase to /path
    // e.g., fetchUsers -> /users, loadUserProfile -> /user/profile
    name = name.charAt(0).toLowerCase() + name.slice(1);
    name = name.replace(/([A-Z])/g, '/$1').toLowerCase();
    return name.startsWith('/') ? name : `/${name}`;
  }

  /**
   * Detect custom API/agent calls
   */
  private detectCustomAPICalls(sourceCode: string): APICall[] {
    const calls: APICall[] = [];

    // Pattern: agent.Auth.login(email, password)
    const customPattern = /(\w+)\.(\w+)\.(\w+)\(([^)]*)\)/g;
    let match;

    while ((match = customPattern.exec(sourceCode)) !== null) {
      const agentName = match[1];
      const serviceName = match[2];
      const methodName = match[3];
      const args = match[4];

      // Only consider if it looks like an API call
      if (
        agentName.toLowerCase().includes('agent') ||
        agentName.toLowerCase().includes('api') ||
        agentName.toLowerCase().includes('service')
      ) {
        // Infer endpoint from service and method names
        const endpoint = `/${serviceName.toLowerCase()}/${methodName.toLowerCase()}`;

        const errorHandling = this.extractErrorHandling(
          sourceCode,
          match.index,
        );
        const successHandling = this.extractSuccessHandling(
          sourceCode,
          match.index,
        );

        calls.push({
          method: this.inferMethodFromName(methodName),
          endpoint,
          errorHandling,
          successHandling,
          libraryUsed: 'custom',
        });
      }
    }

    return calls;
  }

  /**
   * Extract endpoint path from full URL
   */
  private extractEndpoint(url: string): string {
    // If it's a full URL, extract the path
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      // Already a path
      return url;
    }
  }

  /**
   * Parse request body from code string
   */
  private parseRequestBody(bodyStr: string): any {
    // Try to match object literal patterns
    const objectMatch = bodyStr.match(/{([^}]+)}/);
    if (objectMatch) {
      const fields: Record<string, string> = {};
      const fieldPattern = /(\w+):\s*(\w+)/g;
      let match;

      while ((match = fieldPattern.exec(objectMatch[1])) !== null) {
        fields[match[1]] = `{{${match[2]}}}`;
      }

      return fields;
    }

    return undefined;
  }

  /**
   * Extract error handling logic
   */
  private extractErrorHandling(
    sourceCode: string,
    callIndex: number,
  ): APICall['errorHandling'] {
    // Look for catch block after the API call
    const codeAfterCall = sourceCode.substring(callIndex, callIndex + 500);

    // Pattern: .catch(err => { setErrors(...) })
    const catchPattern = /catch\s*\([^)]*\)\s*{([^}]+)}/;
    const catchMatch = codeAfterCall.match(catchPattern);

    if (catchMatch) {
      const catchBody = catchMatch[1];

      // Find error state variable
      const setErrorMatch = catchBody.match(/set(\w+)\(/);
      const errorVariable = setErrorMatch
        ? setErrorMatch[1].toLowerCase()
        : undefined;

      // Find error selector
      const errorSelectorMatch = sourceCode.match(
        /data-testid=["']error-message["']/,
      );
      const errorSelector = errorSelectorMatch
        ? '[data-testid="error-message"]'
        : undefined;

      return {
        errorVariable,
        errorSelector,
      };
    }

    return undefined;
  }

  /**
   * Extract success handling logic
   */
  private extractSuccessHandling(
    sourceCode: string,
    callIndex: number,
  ): APICall['successHandling'] {
    // Look for then/success handling after the API call
    const codeAfterCall = sourceCode.substring(callIndex, callIndex + 500);

    // Pattern: .then(response => { navigate('/path') })
    const thenPattern = /then\s*\([^)]*\)\s*{([^}]+)}/;
    const thenMatch = codeAfterCall.match(thenPattern);

    if (thenMatch) {
      const thenBody = thenMatch[1];

      // Find navigation
      const navigateMatch = thenBody.match(/navigate\(['"](\/[^'"]+)['"]\)/);
      const navigationTarget = navigateMatch ? navigateMatch[1] : undefined;

      // Find state update
      const setStateMatch = thenBody.match(/set(\w+)\(/);
      const stateUpdate = setStateMatch ? setStateMatch[1] : undefined;

      return {
        navigationTarget,
        stateUpdate,
      };
    }

    return undefined;
  }

  /**
   * Infer HTTP method from function name
   */
  private inferMethodFromName(
    methodName: string,
  ): 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' {
    const lower = methodName.toLowerCase();

    if (
      lower.includes('create') ||
      lower.includes('login') ||
      lower.includes('register') ||
      lower.includes('submit')
    ) {
      return 'POST';
    }
    if (lower.includes('update') || lower.includes('edit')) {
      return 'PUT';
    }
    if (lower.includes('delete') || lower.includes('remove')) {
      return 'DELETE';
    }
    if (lower.includes('get') || lower.includes('fetch')) {
      return 'GET';
    }

    return 'POST'; // Default for actions
  }
}
