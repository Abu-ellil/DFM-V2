/**
 * Currency and Number Formatting Utilities
 */

interface FormatOptions {
  showCurrency?: boolean;
  showSymbol?: boolean;
  decimals?: number;
  useCommas?: boolean;
  currencyText?: string;
}

/**
 * Format a number as Egyptian Pounds currency
 */
export function formatCurrency(amount: number | string | null | undefined, options: FormatOptions = {}): string {
  const defaults: FormatOptions = {
    showCurrency: true,
    showSymbol: true, // Default to true for the v2 app as seen in screenshots
    decimals: 2,
    useCommas: true,
    currencyText: "ج.م",
  };

  const opts = { ...defaults, ...options };

  // Handle null, undefined, or invalid values
  if (amount === null || amount === undefined || (typeof amount === 'string' && isNaN(parseFloat(amount)))) {
    return opts.showCurrency ? `0.00 ${opts.currencyText}` : "0.00";
  }

  // Convert to number
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return opts.showCurrency ? `0.00 ${opts.currencyText}` : "0.00";
  }

  // Format with thousand separators and decimal places
  let formatted = numAmount.toLocaleString("en-US", {
    minimumFractionDigits: opts.decimals,
    maximumFractionDigits: opts.decimals,
  });

  // Note: Using 'en-US' for the numeric part to keep Western digits (0-9) 
  // which seems to be what the app is using in the screenshot, 
  // but with the Arabic currency symbol.

  // Add currency symbol or text
  if (opts.showCurrency) {
    formatted = `${formatted} ${opts.currencyText}`;
  }

  return formatted;
}

/**
 * Format a number with thousand separators only (no currency)
 */
export function formatNumber(amount: number | string | null | undefined, decimals = 2): string {
  if (amount === null || amount === undefined || (typeof amount === 'string' && isNaN(parseFloat(amount)))) {
    return "0.00";
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return "0.00";

  return numAmount.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
