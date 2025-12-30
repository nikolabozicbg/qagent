import { Injectable } from '@nestjs/common';
import { chromium, Browser, Page } from 'playwright';

export interface PageStructure {
  forms: FormInfo[];
  buttons: ButtonInfo[];
  inputs: InputInfo[];
  headings: HeadingInfo[];
  links: LinkInfo[];
}

export interface FormInfo {
  selector: string;
  id?: string;
  className?: string;
  index: number;
  fields: InputInfo[];
}

export interface ButtonInfo {
  selector: string;
  text?: string;
  type?: string;
  id?: string;
  className?: string;
  ariaLabel?: string;
  index: number;
}

export interface InputInfo {
  selector: string;
  name?: string;
  id?: string;
  type?: string;
  placeholder?: string;
  ariaLabel?: string;
  label?: string;
  index: number;
}

export interface HeadingInfo {
  tag: string;
  text?: string;
  className?: string;
  id?: string;
}

export interface LinkInfo {
  selector: string;
  text?: string;
  href?: string;
  ariaLabel?: string;
}

@Injectable()
export class RuntimeInspectorService {
  private browser: Browser | null = null;

  /**
   * Inspect a live page and extract all useful selectors
   */
  async inspectPage(url: string, timeout = 10000): Promise<PageStructure> {
    console.log(`🔍 Runtime Inspector: Inspecting ${url}`);
    const startTime = Date.now();

    try {
      // Launch browser (headless)
      this.browser = await chromium.launch({ headless: true });
      const page = await this.browser.newPage();

      // Navigate to page
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout });

      // Extract page structure
      const structure = await page.evaluate(() => {
        // Helper: Generate best selector for element
        const getBestSelector = (element: Element, index: number): string => {
          if (element.id) return `#${element.id}`;
          if (element.className && typeof element.className === 'string') {
            const classes = element.className.split(' ').filter(c => c && !c.includes('--'));
            if (classes.length > 0) return `.${classes[0]}`;
          }
          return `${element.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
        };

        // Helper: Find associated label
        const findLabel = (input: Element): string | null => {
          // Via for attribute
          if (input.id) {
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (label?.textContent) return label.textContent.trim();
          }
          // Via parent label
          const parentLabel = input.closest('label');
          if (parentLabel?.textContent) return parentLabel.textContent.trim();
          return null;
        };

        // Extract forms
        const forms = Array.from(document.querySelectorAll('form')).map((form, idx) => {
          const fields = Array.from(form.querySelectorAll('input, textarea, select')).map((input, fieldIdx) => {
            const inputEl = input as HTMLInputElement;
            return {
              selector: getBestSelector(input, fieldIdx),
              name: inputEl.name || null,
              id: inputEl.id || null,
              type: inputEl.type || null,
              placeholder: inputEl.placeholder || null,
              ariaLabel: input.getAttribute('aria-label') || null,
              label: findLabel(input),
              index: fieldIdx,
            };
          });

          return {
            selector: getBestSelector(form, idx),
            id: form.id || null,
            className: form.className || null,
            index: idx,
            fields,
          };
        });

        // Extract buttons
        const buttons = Array.from(document.querySelectorAll('button')).map((btn, idx) => ({
          selector: getBestSelector(btn, idx),
          text: btn.textContent?.trim() || null,
          type: btn.getAttribute('type') || null,
          id: btn.id || null,
          className: btn.className || null,
          ariaLabel: btn.getAttribute('aria-label') || null,
          index: idx,
        }));

        // Extract all inputs (including those outside forms)
        const inputs = Array.from(document.querySelectorAll('input, textarea, select')).map((input, idx) => {
          const inputEl = input as HTMLInputElement;
          return {
            selector: getBestSelector(input, idx),
            name: inputEl.name || null,
            id: inputEl.id || null,
            type: inputEl.type || null,
            placeholder: inputEl.placeholder || null,
            ariaLabel: input.getAttribute('aria-label') || null,
            label: findLabel(input),
            index: idx,
          };
        });

        // Extract headings
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((h) => ({
          tag: h.tagName.toLowerCase(),
          text: h.textContent?.trim() || null,
          className: h.className || null,
          id: h.id || null,
        }));

        // Extract links
        const links = Array.from(document.querySelectorAll('a')).slice(0, 10).map((a, idx) => ({
          selector: getBestSelector(a, idx),
          text: a.textContent?.trim() || null,
          href: a.getAttribute('href') || null,
          ariaLabel: a.getAttribute('aria-label') || null,
        }));

        return {
          forms,
          buttons,
          inputs,
          headings,
          links,
        };
      });

      await this.browser.close();
      this.browser = null;

      const elapsed = Date.now() - startTime;
      console.log(`✅ Inspection complete in ${elapsed}ms`);
      console.log(`   Forms: ${structure.forms.length}`);
      console.log(`   Buttons: ${structure.buttons.length}`);
      console.log(`   Inputs: ${structure.inputs.length}`);
      console.log(`   Headings: ${structure.headings.length}`);

      return structure;
    } catch (error) {
      console.error('❌ Page inspection failed:', error.message);
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      throw error;
    }
  }

  /**
   * Convert PageStructure to readable format for AI prompt
   */
  formatStructureForPrompt(structure: PageStructure): string {
    let output = 'ACTUAL PAGE STRUCTURE (from live inspection):\n\n';

    // Forms
    if (structure.forms.length > 0) {
      output += `FORMS (${structure.forms.length} found):\n`;
      structure.forms.forEach((form, idx) => {
        output += `  Form ${idx + 1}: ${form.selector}\n`;
        if (form.fields.length > 0) {
          output += `    Fields:\n`;
          form.fields.forEach((field) => {
            const selectors = [
              field.name && `[name="${field.name}"]`,
              field.id && `#${field.id}`,
              field.type && `input[type="${field.type}"]`,
              field.ariaLabel && `[aria-label="${field.ariaLabel}"]`,
            ].filter(Boolean);
            output += `      - ${selectors.join(' OR ')}\n`;
            if (field.label) output += `        Label: "${field.label}"\n`;
            if (field.placeholder) output += `        Placeholder: "${field.placeholder}"\n`;
          });
        }
      });
      output += '\n';
    }

    // Buttons
    if (structure.buttons.length > 0) {
      output += `BUTTONS (${structure.buttons.length} found):\n`;
      structure.buttons.slice(0, 10).forEach((btn) => {
        const selectors = [
          btn.type && `button[type="${btn.type}"]`,
          btn.id && `#${btn.id}`,
          btn.text && `button:has-text("${btn.text}")`,
          btn.ariaLabel && `[aria-label="${btn.ariaLabel}"]`,
        ].filter(Boolean);
        output += `  - ${selectors.join(' OR ')}\n`;
      });
      output += '\n';
    }

    // Headings
    if (structure.headings.length > 0) {
      output += `HEADINGS:\n`;
      structure.headings.slice(0, 5).forEach((h) => {
        output += `  ${h.tag.toUpperCase()}: "${h.text}"\n`;
      });
      output += '\n';
    }

    output += 'USE THESE REAL SELECTORS IN YOUR TEST - DO NOT INVENT ANY!\n';

    return output;
  }
}
