import { Injectable, Logger } from '@nestjs/common';

export interface StateVariable {
  name: string;
  type: 'useState' | 'useReducer' | 'zustand' | 'redux' | 'context' | 'custom';
  initialValue?: any;
  setter?: string;
  usedInElement?: string;
}

@Injectable()
export class StateAnalyzerService {
  private readonly logger = new Logger(StateAnalyzerService.name);

  /**
   * Analyze all state management patterns in component
   */
  analyzeState(sourceCode: string): StateVariable[] {
    const stateVars: StateVariable[] = [];

    // Pattern 1: useState hooks
    const useStateVars = this.detectUseState(sourceCode);
    stateVars.push(...useStateVars);

    // Pattern 2: useReducer hooks
    const useReducerVars = this.detectUseReducer(sourceCode);
    stateVars.push(...useReducerVars);

    // Pattern 3: Redux selectors
    const reduxVars = this.detectRedux(sourceCode);
    stateVars.push(...reduxVars);

    // Pattern 4: Zustand stores
    const zustandVars = this.detectZustand(sourceCode);
    stateVars.push(...zustandVars);

    // Pattern 5: Context API
    const contextVars = this.detectContext(sourceCode);
    stateVars.push(...contextVars);

    return stateVars;
  }

  /**
   * Detect useState hooks
   */
  private detectUseState(sourceCode: string): StateVariable[] {
    const vars: StateVariable[] = [];

    // Pattern: const [state, setState] = useState(initialValue)
    const useStatePattern =
      /const\s*\[(\w+),\s*(\w+)\]\s*=\s*useState\(([^)]*)\)/g;
    let match;

    while ((match = useStatePattern.exec(sourceCode)) !== null) {
      const varName = match[1];
      const setter = match[2];
      const initialValue = match[3].trim();

      vars.push({
        name: varName,
        type: 'useState',
        setter,
        initialValue: this.parseInitialValue(initialValue),
      });
    }

    return vars;
  }

  /**
   * Detect useReducer hooks
   */
  private detectUseReducer(sourceCode: string): StateVariable[] {
    const vars: StateVariable[] = [];

    // Pattern: const [state, dispatch] = useReducer(reducer, initialState)
    const useReducerPattern =
      /const\s*\[(\w+),\s*(\w+)\]\s*=\s*useReducer\([^,]+,\s*([^)]+)\)/g;
    let match;

    while ((match = useReducerPattern.exec(sourceCode)) !== null) {
      const varName = match[1];
      const setter = match[2];
      const initialValue = match[3].trim();

      vars.push({
        name: varName,
        type: 'useReducer',
        setter,
        initialValue: this.parseInitialValue(initialValue),
      });
    }

    return vars;
  }

  /**
   * Detect Redux selectors
   */
  private detectRedux(sourceCode: string): StateVariable[] {
    const vars: StateVariable[] = [];

    // Pattern 1: const data = useSelector(state => state.module.data)
    const useSelectorPattern =
      /const\s+(\w+)\s*=\s*useSelector\(\s*(?:state|s)\s*=>\s*(?:state|s)\.([^)]+)\)/g;
    let match;

    while ((match = useSelectorPattern.exec(sourceCode)) !== null) {
      const varName = match[1];
      const statePath = match[2].trim();

      vars.push({
        name: varName,
        type: 'redux',
        initialValue: `Redux: ${statePath}`,
      });
    }

    // Pattern 2: Destructured useSelector with structured selector
    // const { initialValues, isLoading, errors } = useSelector(stateSelector);
    const destructuredSelectorPattern =
      /const\s+{([^}]+)}\s*=\s*useSelector\((\w+)\)/g;

    while ((match = destructuredSelectorPattern.exec(sourceCode)) !== null) {
      const fields = match[1].split(',').map((f) => f.trim());
      const selectorName = match[2];

      fields.forEach((field) => {
        vars.push({
          name: field,
          type: 'redux',
          initialValue: `Redux: ${selectorName}.${field}`,
        });
      });
    }

    // Pattern 3: createStructuredSelector definition
    // const stateSelector = createStructuredSelector({ initialValues: makeInitialValuesSelector(), ... })
    const structuredSelectorPattern =
      /const\s+(\w+)\s*=\s*createStructuredSelector\(\{([^}]+)\}\)/g;

    while ((match = structuredSelectorPattern.exec(sourceCode)) !== null) {
      const selectorName = match[1];
      const fieldsStr = match[2];
      
      // Extract field names
      const fieldPattern = /(\w+):/g;
      let fieldMatch;
      while ((fieldMatch = fieldPattern.exec(fieldsStr)) !== null) {
        const fieldName = fieldMatch[1];
        vars.push({
          name: fieldName,
          type: 'redux',
          initialValue: `Redux: ${selectorName}.${fieldName}`,
        });
      }
    }

    // Pattern 4: useDispatch hook
    const useDispatchPattern = /const\s+(\w+)\s*=\s*useDispatch\(\)/g;
    while ((match = useDispatchPattern.exec(sourceCode)) !== null) {
      const dispatchVarName = match[1];
      vars.push({
        name: dispatchVarName,
        type: 'redux',
        setter: 'dispatch',
        initialValue: 'Redux dispatch function',
      });
    }

    return vars;
  }

  /**
   * Detect Zustand stores
   */
  private detectZustand(sourceCode: string): StateVariable[] {
    const vars: StateVariable[] = [];

    // Pattern: const data = useStore(state => state.data)
    const zustandPattern =
      /const\s+(\w+)\s*=\s*use\w+Store\(\s*(?:state|s)\s*=>\s*(?:state|s)\.([^)]+)\)/g;
    let match;

    while ((match = zustandPattern.exec(sourceCode)) !== null) {
      const varName = match[1];
      const statePath = match[2].trim();

      vars.push({
        name: varName,
        type: 'zustand',
        initialValue: `Zustand: ${statePath}`,
      });
    }

    return vars;
  }

  /**
   * Detect Context API usage
   */
  private detectContext(sourceCode: string): StateVariable[] {
    const vars: StateVariable[] = [];

    // Pattern: const { data } = useContext(SomeContext)
    const contextPattern =
      /const\s+(?:{([^}]+)}|(\w+))\s*=\s*useContext\((\w+)\)/g;
    let match;

    while ((match = contextPattern.exec(sourceCode)) !== null) {
      const destructured = match[1];
      const varName = match[2];
      const contextName = match[3];

      if (destructured) {
        // Handle destructured context
        const fields = destructured.split(',').map((f) => f.trim());
        fields.forEach((field) => {
          vars.push({
            name: field,
            type: 'context',
            initialValue: `Context: ${contextName}`,
          });
        });
      } else {
        // Handle direct context
        vars.push({
          name: varName,
          type: 'context',
          initialValue: `Context: ${contextName}`,
        });
      }
    }

    return vars;
  }

  /**
   * Parse initial value from string
   */
  private parseInitialValue(valueStr: string): any {
    if (!valueStr) return undefined;

    // Remove quotes for strings
    if (valueStr.startsWith("'") || valueStr.startsWith('"')) {
      return valueStr.slice(1, -1);
    }

    // Parse numbers
    if (!isNaN(Number(valueStr))) {
      return Number(valueStr);
    }

    // Parse booleans
    if (valueStr === 'true') return true;
    if (valueStr === 'false') return false;
    if (valueStr === 'null') return null;

    // Parse arrays
    if (valueStr.startsWith('[')) {
      return '[]';
    }

    // Parse objects
    if (valueStr.startsWith('{')) {
      return '{}';
    }

    return valueStr;
  }

  /**
   * Find which elements use a state variable
   */
  findStateUsage(sourceCode: string, stateName: string): string[] {
    const usages: string[] = [];

    // Pattern: value={stateName}
    const valuePattern = new RegExp(`value={${stateName}}`, 'g');
    if (valuePattern.test(sourceCode)) {
      usages.push('value binding');
    }

    // Pattern: onChange={(e) => setStateName(e.target.value)}
    const onChangePattern = new RegExp(`set\\w*${stateName}`, 'i');
    if (onChangePattern.test(sourceCode)) {
      usages.push('onChange handler');
    }

    // Pattern: {stateName && <...>}
    const conditionalPattern = new RegExp(`{${stateName}\\s*&&`, 'g');
    if (conditionalPattern.test(sourceCode)) {
      usages.push('conditional rendering');
    }

    // Pattern: disabled={loading}
    const disabledPattern = new RegExp(`disabled={${stateName}}`, 'g');
    if (disabledPattern.test(sourceCode)) {
      usages.push('disabled state');
    }

    return usages;
  }

  /**
   * Map state variable to element selector
   */
  mapStateToElement(
    sourceCode: string,
    stateName: string,
  ): string | undefined {
    // Find element that uses this state in value prop
    const pattern = new RegExp(
      `data-testid=["']([^"']+)["'][^>]*value={${stateName}}`,
      'g',
    );
    const match = pattern.exec(sourceCode);

    if (match) {
      return `[data-testid="${match[1]}"]`;
    }

    return undefined;
  }
}
