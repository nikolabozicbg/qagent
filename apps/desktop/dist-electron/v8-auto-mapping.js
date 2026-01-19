"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeStartPathForGoal = computeStartPathForGoal;
exports.autoMapGoalOnPage = autoMapGoalOnPage;
function xpathStringLiteral(text) {
    // XPath literal escaping: if contains both quote types, use concat().
    if (!text.includes('"'))
        return `"${text}"`;
    if (!text.includes("'"))
        return `'${text}'`;
    const parts = text.split('"');
    const concatParts = [];
    for (let i = 0; i < parts.length; i++) {
        if (parts[i] !== '')
            concatParts.push(`"${parts[i]}"`);
        if (i !== parts.length - 1)
            concatParts.push(`'"'`);
    }
    return `concat(${concatParts.join(', ')})`;
}
async function isUnique(page, selector) {
    try {
        const count = await page.locator(selector).count();
        return count === 1;
    }
    catch {
        return false;
    }
}
async function existsAny(page, selector) {
    try {
        const count = await page.locator(selector).count();
        return count > 0;
    }
    catch {
        return false;
    }
}
async function resolveByHref(page, to) {
    const selector = `a[href='${to}']`;
    if (await isUnique(page, selector))
        return selector;
    return null;
}
async function resolveByButtonText(page, label) {
    // Prefer exact match on <button> text.
    const trimmed = label.trim();
    if (!trimmed)
        return null;
    // 1) Find unique button by exact text via XPath
    const xp = `xpath=//button[normalize-space(.)=${xpathStringLiteral(trimmed)}]`;
    if (await isUnique(page, xp)) {
        // If it has data-testid, use that (more stable)
        try {
            const testId = await page.locator(xp).getAttribute('data-testid');
            if (testId) {
                const byTestId = `[data-testid="${testId}"]`;
                if (await isUnique(page, byTestId))
                    return byTestId;
            }
        }
        catch {
            // ignore
        }
        return xp;
    }
    return null;
}
async function resolveByDataTestId(page, label) {
    const trimmed = label.trim();
    if (!trimmed)
        return null;
    const selector = `[data-testid="${trimmed}"]`;
    if (await isUnique(page, selector))
        return selector;
    return null;
}
async function resolveByFormSubmit(page) {
    const selector = 'form button[type="submit"], form button:not([type])';
    if (await existsAny(page, selector))
        return selector;
    return null;
}
function computeStartPathForGoal(params) {
    const { payload, goal } = params;
    const nodesById = new Map(payload.graph.nodes.map(n => [n.id, n]));
    // Determine start page by finding incoming edges from Page -> startUserActionId
    const incoming = payload.graph.edges.filter(e => e.target === goal.startUserActionId);
    const startPages = incoming
        .map(e => nodesById.get(e.source))
        .filter((n) => !!n && n.type === 'Page' && typeof n.route === 'string');
    const uniqueRoutes = Array.from(new Set(startPages.map(p => p.route)));
    if (uniqueRoutes.length !== 1)
        return null;
    const route = uniqueRoutes[0];
    if (!route.startsWith('/'))
        return null;
    return route;
}
async function autoMapGoalOnPage(params) {
    const { page, payload, goal } = params;
    const nodesById = new Map(payload.graph.nodes.map(n => [n.id, n]));
    const ua = nodesById.get(goal.startUserActionId);
    const terminal = nodesById.get(goal.terminalNodeId);
    // 1) href
    if (terminal && terminal.type === 'Navigation' && typeof terminal.to === 'string' && terminal.to.startsWith('/')) {
        const sel = await resolveByHref(page, terminal.to);
        if (sel) {
            return {
                goalId: goal.id,
                startUserActionId: goal.startUserActionId,
                action: { type: 'click', selector: sel },
                debug: { chosenBy: 'href' },
            };
        }
    }
    // 2) button text
    if (ua && typeof ua.label === 'string') {
        const sel = await resolveByButtonText(page, ua.label);
        if (sel) {
            return {
                goalId: goal.id,
                startUserActionId: goal.startUserActionId,
                action: { type: 'click', selector: sel },
                debug: { chosenBy: 'button_text' },
            };
        }
    }
    // 3) data-testid
    if (ua && typeof ua.label === 'string') {
        const sel = await resolveByDataTestId(page, ua.label);
        if (sel) {
            return {
                goalId: goal.id,
                startUserActionId: goal.startUserActionId,
                action: { type: 'click', selector: sel },
                debug: { chosenBy: 'data_testid' },
            };
        }
    }
    // 4) form submit
    const sel = await resolveByFormSubmit(page);
    if (sel) {
        return {
            goalId: goal.id,
            startUserActionId: goal.startUserActionId,
            action: { type: 'click', selector: sel },
            debug: { chosenBy: 'form_submit' },
        };
    }
    return null;
}
