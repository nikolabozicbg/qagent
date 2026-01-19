"use strict";
/**
 * V9 Verification Filter
 *
 * Filters candidate actions to only those that produce observable runtime effects.
 * This is the CRITICAL filter that ensures test quality.
 *
 * RULES (NON-NEGOTIABLE):
 * 1. No URL change AND no network AND no DOM mutation → DISCARD
 * 2. Same effect as another action → keep only canonical one
 * 3. Only runtime-verified actions may become steps
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAndFilter = verifyAndFilter;
exports.buildVerifiedFlows = buildVerifiedFlows;
/**
 * Verify candidates against their observations.
 * Returns only steps that have observable runtime effects.
 */
function verifyAndFilter(candidates, observations) {
    // Create observation lookup
    const observationById = new Map();
    for (const obs of observations) {
        observationById.set(obs.candidateId, obs);
    }
    const verifiedSteps = [];
    const discardReasons = {};
    let candidatesExecuted = 0;
    let candidatesVerified = 0;
    let candidatesDiscarded = 0;
    for (const candidate of candidates) {
        const observation = observationById.get(candidate.id);
        if (!observation) {
            incrementReason(discardReasons, 'no-observation');
            candidatesDiscarded++;
            continue;
        }
        if (!observation.executed) {
            incrementReason(discardReasons, 'execution-failed');
            candidatesDiscarded++;
            continue;
        }
        candidatesExecuted++;
        // Verify the action has observable effects
        const verification = verifyObservableEffect(candidate, observation);
        if (!verification) {
            incrementReason(discardReasons, 'no-observable-effect');
            candidatesDiscarded++;
            continue;
        }
        // Build verified step
        const verifiedStep = {
            id: `verified:${candidate.id}`,
            candidate,
            observation,
            verifiedSelector: buildVerifiedSelector(candidate, observation),
            destinationUrl: observation.urlAfter,
            verificationReason: verification.reason,
        };
        verifiedSteps.push(verifiedStep);
        candidatesVerified++;
    }
    // Deduplicate steps with same effect
    const deduplicatedSteps = deduplicateByEffect(verifiedSteps, discardReasons);
    return {
        verifiedSteps: deduplicatedSteps,
        stats: {
            totalCandidates: candidates.length,
            candidatesExecuted,
            candidatesVerified,
            candidatesDiscarded: candidates.length - deduplicatedSteps.length,
            discardReasons,
        },
    };
}
/**
 * Check if an action produced an observable effect.
 * Returns the verification reason or null if no effect.
 */
function verifyObservableEffect(candidate, observation) {
    // Priority 1: URL change (navigation)
    if (observation.urlAfter && observation.urlAfter !== observation.urlBefore) {
        return { reason: 'url-change' };
    }
    // Priority 2: Network calls (API interactions)
    if (observation.networkCalls.length > 0) {
        // Must have at least one successful call
        const hasSuccessfulCall = observation.networkCalls.some(c => c.status !== null && c.status >= 200 && c.status < 400);
        if (hasSuccessfulCall) {
            return { reason: 'network-call' };
        }
    }
    // Priority 3: Storage changes (state persistence)
    if (observation.storageChanges.length > 0) {
        return { reason: 'storage-change' };
    }
    // Priority 4: Significant DOM mutations
    if (hasSignificantDomChange(observation)) {
        return { reason: 'dom-mutation' };
    }
    // No observable effect
    return null;
}
/**
 * Check if DOM mutations are significant enough to count as an effect.
 * Filters out noise like tooltip/hover animations.
 */
function hasSignificantDomChange(observation) {
    if (observation.domMutations.length === 0) {
        return false;
    }
    // Count significant mutations (not just hover effects)
    const significantMutations = observation.domMutations.filter(m => {
        // Skip common noise selectors
        const noiseSelectors = ['tooltip', 'hover', 'ripple', 'focus'];
        const isNoise = noiseSelectors.some(n => m.selector.toLowerCase().includes(n) ||
            m.description.toLowerCase().includes(n));
        return !isNoise;
    });
    // Need at least 1 significant mutation
    return significantMutations.length >= 1;
}
/**
 * Build the verified selector - prefer what actually worked at runtime.
 */
function buildVerifiedSelector(candidate, observation) {
    // If we have a data-testid, use it (most stable)
    if (candidate.testId) {
        return `[data-testid="${candidate.testId}"]`;
    }
    // If we have a selector that worked, use it
    if (candidate.selector) {
        return candidate.selector;
    }
    // For links, use href
    if (candidate.type === 'link' && candidate.href) {
        return `a[href="${candidate.href}"]`;
    }
    // For buttons with text
    if (candidate.type === 'button' && candidate.text) {
        return `button:has-text("${candidate.text}")`;
    }
    // Fallback to form
    if (candidate.type === 'form-submit') {
        return 'form';
    }
    return 'unknown';
}
/**
 * Deduplicate steps that produce the same effect.
 * Keeps only the canonical (first) action for each unique effect.
 */
function deduplicateByEffect(steps, discardReasons) {
    const uniqueEffects = new Map();
    for (const step of steps) {
        const effectKey = computeEffectKey(step);
        if (!uniqueEffects.has(effectKey)) {
            uniqueEffects.set(effectKey, step);
        }
        else {
            // Duplicate effect - discard this one
            incrementReason(discardReasons, 'duplicate-effect');
        }
    }
    return Array.from(uniqueEffects.values());
}
/**
 * Compute a unique key for an action's effect.
 * Used to identify duplicate effects.
 */
function computeEffectKey(step) {
    const parts = [];
    // Include destination URL
    if (step.destinationUrl) {
        parts.push(`url:${normalizeUrl(step.destinationUrl)}`);
    }
    // Include network endpoints
    if (step.observation.networkCalls.length > 0) {
        const endpoints = step.observation.networkCalls
            .map(c => `${c.method}:${new URL(c.url).pathname}`)
            .sort()
            .join(',');
        parts.push(`network:${endpoints}`);
    }
    // Include storage keys
    if (step.observation.storageChanges.length > 0) {
        const keys = step.observation.storageChanges
            .map(c => `${c.storage}:${c.key}:${c.action}`)
            .sort()
            .join(',');
        parts.push(`storage:${keys}`);
    }
    // If no other effect, use source + action type
    if (parts.length === 0) {
        parts.push(`action:${step.candidate.sourceUrl}:${step.candidate.type}`);
    }
    return parts.join('|');
}
function normalizeUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.pathname;
    }
    catch {
        return url;
    }
}
function incrementReason(reasons, reason) {
    reasons[reason] = (reasons[reason] || 0) + 1;
}
/**
 * Build verified flows from verified steps.
 * Groups steps by their effect to create meaningful test cases.
 */
function buildVerifiedFlows(verifiedSteps) {
    const flows = [];
    // Group by destination URL for navigation flows
    const navigationSteps = verifiedSteps.filter(s => s.verificationReason === 'url-change');
    const stepsByDestination = new Map();
    for (const step of navigationSteps) {
        const dest = step.destinationUrl || 'unknown';
        if (!stepsByDestination.has(dest)) {
            stepsByDestination.set(dest, []);
        }
        stepsByDestination.get(dest).push(step);
    }
    // Create navigation flows
    for (const [destination, steps] of stepsByDestination) {
        // Keep only the most direct path (fewest steps from same source)
        const bySource = new Map();
        for (const step of steps) {
            const source = step.candidate.sourceUrl;
            if (!bySource.has(source)) {
                bySource.set(source, step);
            }
        }
        for (const step of bySource.values()) {
            flows.push({
                id: `flow:nav:${step.candidate.sourceUrl}:${destination}`,
                startUrl: step.candidate.sourceUrl,
                endUrl: destination,
                steps: [step],
                flowType: 'navigation',
            });
        }
    }
    // Create form submission flows
    const formSteps = verifiedSteps.filter(s => s.candidate.type === 'form-submit' &&
        (s.verificationReason === 'network-call' || s.verificationReason === 'url-change'));
    for (const step of formSteps) {
        flows.push({
            id: `flow:form:${step.candidate.sourceUrl}:${step.candidate.id}`,
            startUrl: step.candidate.sourceUrl,
            endUrl: step.destinationUrl || step.candidate.sourceUrl,
            steps: [step],
            flowType: 'form-submission',
        });
    }
    // Create interaction flows for other verified actions
    const interactionSteps = verifiedSteps.filter(s => s.candidate.type === 'button' &&
        s.verificationReason !== 'url-change' &&
        !formSteps.includes(s));
    for (const step of interactionSteps) {
        flows.push({
            id: `flow:interaction:${step.candidate.sourceUrl}:${step.candidate.id}`,
            startUrl: step.candidate.sourceUrl,
            endUrl: step.candidate.sourceUrl,
            steps: [step],
            flowType: 'interaction',
        });
    }
    return flows;
}
