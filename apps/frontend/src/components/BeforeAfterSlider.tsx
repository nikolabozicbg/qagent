'use client';

import { useState } from 'react';

const beforeCode = `// Manual test writing - 2 hours
describe('User authentication', () => {
  it('should login with valid credentials', () => {
    cy.visit('/login');
    cy.get('[data-testid="email"]').type('user@example.com');
    cy.get('[data-testid="password"]').type('password123');
    cy.get('[data-testid="submit"]').click();
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="welcome"]').should('be.visible');
  });

  it('should show error for invalid credentials', () => {
    cy.visit('/login');
    cy.get('[data-testid="email"]').type('wrong@example.com');
    cy.get('[data-testid="password"]').type('wrongpass');
    cy.get('[data-testid="submit"]').click();
    cy.get('[data-testid="error"]').should('contain', 'Invalid');
  });

  it('should validate email format', () => {
    cy.visit('/login');
    cy.get('[data-testid="email"]').type('invalid-email');
    cy.get('[data-testid="email"]').blur();
    cy.get('[data-testid="email-error"]').should('be.visible');
  });
});`;

const afterCode = `// QAgenAI generated - 12 minutes ✨
describe('User authentication', () => {
  it('should login with valid credentials', () => {
    cy.visit('/login');
    cy.get('[data-testid="email"]').type('user@example.com');
    cy.get('[data-testid="password"]').type('password123');
    cy.get('[data-testid="submit"]').click();
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="welcome"]').should('be.visible');
  });

  it('should show error for invalid credentials', () => {
    cy.visit('/login');
    cy.get('[data-testid="email"]').type('wrong@example.com');
    cy.get('[data-testid="password"]').type('wrongpass');
    cy.get('[data-testid="submit"]').click();
    cy.get('[data-testid="error"]').should('contain', 'Invalid');
  });

  it('should validate email format', () => {
    cy.visit('/login');
    cy.get('[data-testid="email"]').type('invalid-email');
    cy.get('[data-testid="email"]').blur();
    cy.get('[data-testid="email-error"]').should('be.visible');
  });

  it('should handle password reset flow', () => {
    cy.visit('/login');
    cy.get('[data-testid="forgot-password"]').click();
    cy.url().should('include', '/reset-password');
  });

  it('should remember me checkbox persist session', () => {
    cy.visit('/login');
    cy.get('[data-testid="remember-me"]').check();
    cy.get('[data-testid="email"]').type('user@example.com');
    cy.get('[data-testid="password"]').type('password123');
    cy.get('[data-testid="submit"]').click();
    cy.getCookie('session').should('have.property', 'expiry');
  });

  it('should prevent login with empty fields', () => {
    cy.visit('/login');
    cy.get('[data-testid="submit"]').click();
    cy.get('[data-testid="error"]').should('be.visible');
  });
});`;

export function BeforeAfterSlider() {
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setPosition(Math.max(0, Math.min(100, percentage)));
  };

  return (
    <div className="relative w-full">
      <div
        className="relative w-full h-[500px] overflow-hidden rounded-lg border border-border/50 select-none cursor-col-resize"
        onMouseMove={handleMouseMove}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      >
        {/* Before (left side) */}
        <div className="absolute inset-0 bg-background">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <div className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium">
              BEFORE - Manual
            </div>
            <span className="text-xs text-muted-foreground">2 hours ⏱️</span>
          </div>
          <pre className="p-6 pt-16 text-xs font-mono overflow-auto h-full">
            <code className="text-muted-foreground">{beforeCode}</code>
          </pre>
        </div>

        {/* After (right side) */}
        <div
          className="absolute inset-0 bg-background"
          style={{ clipPath: `inset(0 0 0 ${position}%)` }}
        >
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">12 minutes ⚡</span>
            <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-medium">
              AFTER - QAgenAI
            </div>
          </div>
          <pre className="p-6 pt-16 text-xs font-mono overflow-auto h-full">
            <code className="text-foreground">{afterCode}</code>
          </pre>
        </div>

        {/* Divider */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-pink-500 cursor-col-resize z-20"
          style={{ left: `${position}%` }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg flex items-center justify-center">
            <div className="flex gap-0.5">
              <div className="w-1 h-4 bg-white rounded-full" />
              <div className="w-1 h-4 bg-white rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <p className="text-center text-xs text-muted-foreground mt-4">
        ← Drag to compare → • QAgenAI generates 2x more test cases in 10x less time
      </p>
    </div>
  );
}
