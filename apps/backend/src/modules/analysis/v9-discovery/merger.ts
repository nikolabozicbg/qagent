/**
 * V9 Discovery Merger
 * 
 * Merges StaticBehaviorGraph (SBG) and RuntimeObservationGraph (ROG)
 * into a Verified Test Model with full provenance tracking.
 */

import { NormalizedData } from './normalizer';
import {
  MergedTestModel,
  InternalSuite,
  InternalCase,
  InternalStep,
  StaticBehaviorNodeV9,
  RuntimePageV9,
  RuntimeInteractiveElementV9,
  StepAction,
  StepExpectation,
} from './types';

/**
 * Merge SBG and ROG into a unified test model
 */
export function mergeGraphs(normalized: NormalizedData): MergedTestModel {
  const warnings: string[] = [...normalized.warnings];
  const suites: InternalSuite[] = [];

  // Group static nodes by route/page
  const staticNodesByRoute = groupStaticNodesByRoute(normalized.sbg.nodes);

  // Group runtime pages by URL
  const runtimePagesByUrl = new Map<string, RuntimePageV9>();
  for (const page of normalized.rog.pages) {
    runtimePagesByUrl.set(page.url, page);
  }

  // Create suites for each route
  for (const route of normalized.routes) {
    const staticNodes = staticNodesByRoute.get(route) || [];
    const runtimePage = runtimePagesByUrl.get(route);

    const suite = createSuiteForRoute(
      route,
      staticNodes,
      runtimePage,
      normalized,
      warnings
    );

    if (suite.cases.length > 0) {
      suites.push(suite);
    }
  }

  // Handle routes that only exist in runtime
  for (const page of normalized.rog.pages) {
    if (!staticNodesByRoute.has(page.url)) {
      const suite = createSuiteFromRuntimeOnly(page, warnings);
      if (suite.cases.length > 0) {
        suites.push(suite);
      }
    }
  }

  return { suites, warnings };
}

function groupStaticNodesByRoute(
  nodes: StaticBehaviorNodeV9[]
): Map<string, StaticBehaviorNodeV9[]> {
  const byRoute = new Map<string, StaticBehaviorNodeV9[]>();

  for (const node of nodes) {
    // Use route if available, otherwise derive from file path
    const route = node.route || deriveRouteFromFilePath(node.filePath);
    
    if (!byRoute.has(route)) {
      byRoute.set(route, []);
    }
    byRoute.get(route)!.push(node);
  }

  return byRoute;
}

function deriveRouteFromFilePath(filePath: string): string {
  // Convert file path to route (Next.js convention)
  // app/(auth)/sign-in/page.tsx -> /sign-in
  // pages/products/[id].tsx -> /products/:id
  
  let route = filePath
    .replace(/^app\//, '/')
    .replace(/^pages\//, '/')
    .replace(/\/page\.(tsx?|jsx?)$/, '')
    .replace(/\.(tsx?|jsx?)$/, '')
    .replace(/\/index$/, '')
    .replace(/\([^)]+\)\//g, ''); // Remove route groups like (auth)

  // Normalize dynamic segments
  route = route.replace(/\[([^\]]+)\]/g, ':$1');

  return route || '/';
}

function createSuiteForRoute(
  route: string,
  staticNodes: StaticBehaviorNodeV9[],
  runtimePage: RuntimePageV9 | undefined,
  normalized: NormalizedData,
  warnings: string[]
): InternalSuite {
  const cases: InternalCase[] = [];

  // Find the primary file path for this route
  const primaryFilePath = staticNodes.find(n => n.type === 'page')?.filePath
    || staticNodes[0]?.filePath
    || 'unknown';

  // Create cases from forms
  const formNodes = staticNodes.filter(n => n.type === 'form');
  for (const formNode of formNodes) {
    const formCase = createCaseFromForm(formNode, runtimePage, normalized, warnings);
    cases.push(formCase);
  }

  // Create cases from button interactions
  const buttonNodes = staticNodes.filter(n => n.type === 'button');
  for (const buttonNode of buttonNodes) {
    const buttonCase = createCaseFromButton(buttonNode, runtimePage, normalized, warnings);
    cases.push(buttonCase);
  }

  // Create navigation case if there are links
  const linkNodes = staticNodes.filter(n => n.type === 'link');
  if (linkNodes.length > 0) {
    const navCase = createCaseFromLinks(route, linkNodes, runtimePage, warnings);
    cases.push(navCase);
  }

  // If no specific cases but we have runtime elements, create exploration case
  if (cases.length === 0 && runtimePage && runtimePage.elements.length > 0) {
    const explorationCase = createExplorationCase(route, runtimePage, warnings);
    cases.push(explorationCase);
  }

  return {
    id: `suite:${route}`,
    route,
    filePath: primaryFilePath,
    cases,
    componentIds: staticNodes.map(n => n.id),
  };
}

function createSuiteFromRuntimeOnly(
  page: RuntimePageV9,
  warnings: string[]
): InternalSuite {
  const cases: InternalCase[] = [];

  // Create cases from interactive elements
  const forms = page.elements.filter(e => e.type === 'form');
  const buttons = page.elements.filter(e => e.type === 'button');
  const links = page.elements.filter(e => e.type === 'link');
  const inputs = page.elements.filter(e => e.type === 'input');

  // Form interaction case
  if (forms.length > 0 || inputs.length > 0) {
    cases.push(createRuntimeFormCase(page, forms, inputs, warnings));
  }

  // Button interaction case
  if (buttons.length > 0) {
    cases.push(createRuntimeButtonCase(page, buttons, warnings));
  }

  // Navigation case
  if (links.length > 0) {
    cases.push(createRuntimeLinkCase(page, links, warnings));
  }

  warnings.push(`Route ${page.url} found only in runtime - no static code reference`);

  return {
    id: `suite:runtime:${page.url}`,
    route: page.url,
    filePath: 'RUNTIME_ONLY',
    cases,
    componentIds: [],
  };
}

function createCaseFromForm(
  formNode: StaticBehaviorNodeV9,
  runtimePage: RuntimePageV9 | undefined,
  normalized: NormalizedData,
  warnings: string[]
): InternalCase {
  const steps: InternalStep[] = [];

  // Navigate step
  steps.push(createNavigateStep(formNode.route || '/', formNode));

  // Find matching runtime form element
  const runtimeForm = runtimePage?.elements.find(e => 
    e.type === 'form' || (e.type === 'input' && e.selector.includes('form'))
  );

  // Get input nodes associated with this form
  const inputNodes = normalized.sbg.nodes.filter(n => 
    n.type === 'input' && n.filePath === formNode.filePath
  );

  // Add fill steps for each input
  for (const inputNode of inputNodes) {
    const runtimeInput = runtimePage?.elements.find(e => 
      e.type === 'input' && matchSelector(e.selector, inputNode.selector)
    );

    steps.push(createFillStep(inputNode, runtimeInput));
  }

  // Submit step
  const submitAction: StepAction = {
    type: 'submit',
    selector: runtimeForm?.selector || formNode.selector,
    selectorStability: runtimeForm?.selectorStability || formNode.selectorStability,
    value: null,
    targetRoute: null,
    unknownReason: !runtimeForm?.selector && !formNode.selector ? 'No selector found for form' : null,
  };

  steps.push({
    action: submitAction,
    expected: createExpectation(formNode, runtimePage),
    from: runtimeForm ? 'MERGED' : 'SBG',
    staticRef: formNode.id,
    runtimeRef: runtimeForm?.id || null,
    filePath: formNode.filePath,
    lineNumber: formNode.lineNumber,
  });

  return {
    id: `case:${formNode.id}`,
    staticRefs: [formNode.id, ...inputNodes.map(n => n.id)],
    runtimeRefs: runtimeForm ? [runtimeForm.id] : [],
    steps,
    hasRuntimeEvidence: !!runtimeForm,
  };
}

function createCaseFromButton(
  buttonNode: StaticBehaviorNodeV9,
  runtimePage: RuntimePageV9 | undefined,
  normalized: NormalizedData,
  warnings: string[]
): InternalCase {
  const steps: InternalStep[] = [];

  // Navigate step
  steps.push(createNavigateStep(buttonNode.route || '/', buttonNode));

  // Find matching runtime button
  const runtimeButton = runtimePage?.elements.find(e => 
    e.type === 'button' && matchSelector(e.selector, buttonNode.selector)
  );

  // Click step
  const clickAction: StepAction = {
    type: 'click',
    selector: runtimeButton?.selector || buttonNode.selector,
    selectorStability: runtimeButton?.selectorStability || buttonNode.selectorStability,
    value: null,
    targetRoute: null,
    unknownReason: !runtimeButton?.selector && !buttonNode.selector ? 'No selector found for button' : null,
  };

  steps.push({
    action: clickAction,
    expected: createExpectation(buttonNode, runtimePage),
    from: runtimeButton ? 'MERGED' : 'SBG',
    staticRef: buttonNode.id,
    runtimeRef: runtimeButton?.id || null,
    filePath: buttonNode.filePath,
    lineNumber: buttonNode.lineNumber,
  });

  return {
    id: `case:${buttonNode.id}`,
    staticRefs: [buttonNode.id],
    runtimeRefs: runtimeButton ? [runtimeButton.id] : [],
    steps,
    hasRuntimeEvidence: !!runtimeButton,
  };
}

function createCaseFromLinks(
  route: string,
  linkNodes: StaticBehaviorNodeV9[],
  runtimePage: RuntimePageV9 | undefined,
  warnings: string[]
): InternalCase {
  const steps: InternalStep[] = [];

  // Navigate to page step
  steps.push(createNavigateStep(route, linkNodes[0]));

  // Create click steps for each link
  for (const linkNode of linkNodes) {
    const runtimeLink = runtimePage?.elements.find(e => 
      e.type === 'link' && matchSelector(e.selector, linkNode.selector)
    );

    const clickAction: StepAction = {
      type: 'click',
      selector: runtimeLink?.selector || linkNode.selector,
      selectorStability: runtimeLink?.selectorStability || linkNode.selectorStability,
      value: null,
      targetRoute: linkNode.metadata.href as string || null,
      unknownReason: !runtimeLink?.selector && !linkNode.selector ? 'No selector found for link' : null,
    };

    steps.push({
      action: clickAction,
      expected: linkNode.metadata.href ? {
        evidenceType: 'url',
        evidenceRef: linkNode.metadata.href as string,
        matcher: 'contains',
        description: `Navigate to ${linkNode.metadata.href}`,
      } : null,
      from: runtimeLink ? 'MERGED' : 'SBG',
      staticRef: linkNode.id,
      runtimeRef: runtimeLink?.id || null,
      filePath: linkNode.filePath,
      lineNumber: linkNode.lineNumber,
    });
  }

  return {
    id: `case:nav:${route}`,
    staticRefs: linkNodes.map(n => n.id),
    runtimeRefs: [],
    steps,
    hasRuntimeEvidence: runtimePage !== undefined,
  };
}

function createExplorationCase(
  route: string,
  page: RuntimePageV9,
  warnings: string[]
): InternalCase {
  const steps: InternalStep[] = [];

  // Navigate step
  steps.push({
    action: {
      type: 'navigate',
      selector: null,
      selectorStability: null,
      value: null,
      targetRoute: route,
      unknownReason: null,
    },
    expected: {
      evidenceType: 'url',
      evidenceRef: route,
      matcher: 'contains',
      description: `Page loads at ${route}`,
    },
    from: 'ROG',
    staticRef: null,
    runtimeRef: null,
    filePath: null,
    lineNumber: null,
  });

  // Add exploration steps for interactive elements
  for (const element of page.elements.slice(0, 5)) { // Limit to first 5
    const action: StepAction = {
      type: element.type === 'input' ? 'fill' : 'click',
      selector: element.selector,
      selectorStability: element.selectorStability,
      value: element.type === 'input' ? `{{${element.text || 'value'}}}` : null,
      targetRoute: null,
      unknownReason: null,
    };

    steps.push({
      action,
      expected: null,
      from: 'ROG',
      staticRef: null,
      runtimeRef: element.id,
      filePath: null,
      lineNumber: null,
    });
  }

  warnings.push(`Created exploration case for ${route} from runtime observations only`);

  return {
    id: `case:explore:${route}`,
    staticRefs: [],
    runtimeRefs: page.elements.map(e => e.id),
    steps,
    hasRuntimeEvidence: true,
  };
}

function createRuntimeFormCase(
  page: RuntimePageV9,
  forms: RuntimeInteractiveElementV9[],
  inputs: RuntimeInteractiveElementV9[],
  warnings: string[]
): InternalCase {
  const steps: InternalStep[] = [];

  // Navigate step
  steps.push({
    action: {
      type: 'navigate',
      selector: null,
      selectorStability: null,
      value: null,
      targetRoute: page.url,
      unknownReason: null,
    },
    expected: {
      evidenceType: 'url',
      evidenceRef: page.url,
      matcher: 'contains',
      description: `Page loads at ${page.url}`,
    },
    from: 'ROG',
    staticRef: null,
    runtimeRef: null,
    filePath: null,
    lineNumber: null,
  });

  // Fill steps for inputs
  for (const input of inputs) {
    steps.push({
      action: {
        type: 'fill',
        selector: input.selector,
        selectorStability: input.selectorStability,
        value: `{{${input.text || 'input'}}}`,
        targetRoute: null,
        unknownReason: null,
      },
      expected: null,
      from: 'ROG',
      staticRef: null,
      runtimeRef: input.id,
      filePath: null,
      lineNumber: null,
    });
  }

  // Submit step
  const form = forms[0];
  if (form) {
    steps.push({
      action: {
        type: 'submit',
        selector: form.selector,
        selectorStability: form.selectorStability,
        value: null,
        targetRoute: null,
        unknownReason: null,
      },
      expected: null,
      from: 'ROG',
      staticRef: null,
      runtimeRef: form.id,
      filePath: null,
      lineNumber: null,
    });
  }

  return {
    id: `case:runtime:form:${page.url}`,
    staticRefs: [],
    runtimeRefs: [...forms.map(f => f.id), ...inputs.map(i => i.id)],
    steps,
    hasRuntimeEvidence: true,
  };
}

function createRuntimeButtonCase(
  page: RuntimePageV9,
  buttons: RuntimeInteractiveElementV9[],
  warnings: string[]
): InternalCase {
  const steps: InternalStep[] = [];

  // Navigate step
  steps.push({
    action: {
      type: 'navigate',
      selector: null,
      selectorStability: null,
      value: null,
      targetRoute: page.url,
      unknownReason: null,
    },
    expected: {
      evidenceType: 'url',
      evidenceRef: page.url,
      matcher: 'contains',
      description: `Page loads at ${page.url}`,
    },
    from: 'ROG',
    staticRef: null,
    runtimeRef: null,
    filePath: null,
    lineNumber: null,
  });

  // Click steps for buttons
  for (const button of buttons.slice(0, 3)) {
    steps.push({
      action: {
        type: 'click',
        selector: button.selector,
        selectorStability: button.selectorStability,
        value: null,
        targetRoute: null,
        unknownReason: null,
      },
      expected: null,
      from: 'ROG',
      staticRef: null,
      runtimeRef: button.id,
      filePath: null,
      lineNumber: null,
    });
  }

  return {
    id: `case:runtime:buttons:${page.url}`,
    staticRefs: [],
    runtimeRefs: buttons.map(b => b.id),
    steps,
    hasRuntimeEvidence: true,
  };
}

function createRuntimeLinkCase(
  page: RuntimePageV9,
  links: RuntimeInteractiveElementV9[],
  warnings: string[]
): InternalCase {
  const steps: InternalStep[] = [];

  // Navigate step
  steps.push({
    action: {
      type: 'navigate',
      selector: null,
      selectorStability: null,
      value: null,
      targetRoute: page.url,
      unknownReason: null,
    },
    expected: {
      evidenceType: 'url',
      evidenceRef: page.url,
      matcher: 'contains',
      description: `Page loads at ${page.url}`,
    },
    from: 'ROG',
    staticRef: null,
    runtimeRef: null,
    filePath: null,
    lineNumber: null,
  });

  // Click steps for links
  for (const link of links.slice(0, 3)) {
    steps.push({
      action: {
        type: 'click',
        selector: link.selector,
        selectorStability: link.selectorStability,
        value: null,
        targetRoute: null,
        unknownReason: null,
      },
      expected: null,
      from: 'ROG',
      staticRef: null,
      runtimeRef: link.id,
      filePath: null,
      lineNumber: null,
    });
  }

  return {
    id: `case:runtime:links:${page.url}`,
    staticRefs: [],
    runtimeRefs: links.map(l => l.id),
    steps,
    hasRuntimeEvidence: true,
  };
}

// Helper functions

function createNavigateStep(route: string, node: StaticBehaviorNodeV9): InternalStep {
  return {
    action: {
      type: 'navigate',
      selector: null,
      selectorStability: null,
      value: null,
      targetRoute: route,
      unknownReason: null,
    },
    expected: {
      evidenceType: 'url',
      evidenceRef: route,
      matcher: 'contains',
      description: `Navigate to ${route}`,
    },
    from: 'SBG',
    staticRef: node.id,
    runtimeRef: null,
    filePath: node.filePath,
    lineNumber: node.lineNumber,
  };
}

function createFillStep(
  inputNode: StaticBehaviorNodeV9,
  runtimeInput: RuntimeInteractiveElementV9 | undefined
): InternalStep {
  const fieldName = inputNode.metadata.name as string || inputNode.metadata.label as string || 'field';
  const fieldType = inputNode.metadata.type as string || 'text';

  return {
    action: {
      type: 'fill',
      selector: runtimeInput?.selector || inputNode.selector,
      selectorStability: runtimeInput?.selectorStability || inputNode.selectorStability,
      value: `{{${fieldType}:${fieldName}}}`,
      targetRoute: null,
      unknownReason: !runtimeInput?.selector && !inputNode.selector ? `No selector found for input ${fieldName}` : null,
    },
    expected: {
      evidenceType: 'dom',
      evidenceRef: runtimeInput?.selector || inputNode.selector || 'input',
      matcher: 'value-equals',
      description: `Input ${fieldName} contains entered value`,
    },
    from: runtimeInput ? 'MERGED' : 'SBG',
    staticRef: inputNode.id,
    runtimeRef: runtimeInput?.id || null,
    filePath: inputNode.filePath,
    lineNumber: inputNode.lineNumber,
  };
}

function createExpectation(
  node: StaticBehaviorNodeV9,
  runtimePage: RuntimePageV9 | undefined
): StepExpectation | null {
  // Check for navigation expectation from metadata
  if (node.metadata.navigatesTo) {
    return {
      evidenceType: 'url',
      evidenceRef: node.metadata.navigatesTo as string,
      matcher: 'contains',
      description: `Navigate to ${node.metadata.navigatesTo}`,
    };
  }

  // Check for API call expectation
  if (node.metadata.apiEndpoint) {
    return {
      evidenceType: 'network',
      evidenceRef: node.metadata.apiEndpoint as string,
      matcher: 'called',
      description: `API call to ${node.metadata.apiEndpoint}`,
    };
  }

  // Check runtime observations for clues
  if (runtimePage) {
    const navObs = runtimePage.observations.find(o => o.type === 'navigation');
    if (navObs && navObs.data.toUrl) {
      return {
        evidenceType: 'url',
        evidenceRef: navObs.data.toUrl as string,
        matcher: 'equals',
        description: `Navigate to ${navObs.data.toUrl}`,
      };
    }
  }

  return null;
}

function matchSelector(runtimeSelector: string, staticSelector: string | null): boolean {
  if (!staticSelector) return false;
  
  // Exact match
  if (runtimeSelector === staticSelector) return true;
  
  // data-testid match
  const testIdMatch = staticSelector.match(/data-testid="([^"]+)"/);
  if (testIdMatch && runtimeSelector.includes(testIdMatch[1])) return true;

  return false;
}
