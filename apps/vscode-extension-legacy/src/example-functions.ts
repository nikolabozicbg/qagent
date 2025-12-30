/**
 * Example file to test CodeLens functionality
 * Open this file in VS Code to see "⚡ Generate Test" above functions
 */

export function calculateTotal(items: number[]): number {
  return items.reduce((sum, item) => sum + item, 0);
}

export function formatPrice(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export const applyDiscount = (price: number, discountPercent: number): number => {
  return price * (1 - discountPercent / 100);
};

export async function fetchUserData(userId: string): Promise<{ name: string }> {
  // Simulated async function
  return { name: 'Test User' };
}

export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
