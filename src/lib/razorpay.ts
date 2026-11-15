// @ts-nocheck -- ported from original app; stricter project tsconfig
// Razorpay Checkout SDK types and dynamic loader.
// The SDK script is also included in index.html so `window.Razorpay` is
// available immediately; this loader is a fallback for safety.

interface RazorpayPrefill {
  name?: string;
  email?: string;
  contact?: string;
}

interface RazorpayTheme {
  color?: string;
}

interface RazorpayOptions {
  key: string;
  amount: number; // in paise (1 INR = 100 paise)
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id?: string;
  prefill?: RazorpayPrefill;
  theme?: RazorpayTheme;
  handler: (response: { razorpay_payment_id: string }) => void;
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    backdropclose?: boolean;
  };
}

interface RazorpayInstance {
  open(): void;
  on?(event: 'payment.failed', handler: (err: unknown) => void): void;
}

interface RazorpayConstructor {
  new (options: RazorpayOptions): RazorpayInstance;
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const RAZORPAY_SDK_URL = 'https://checkout.razorpay.com/v1/checkout.js';

let loadPromise: Promise<void> | null = null;

export function loadRazorpay(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay can only be used in the browser'));
  }
  if (window.Razorpay) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_SDK_URL}"]`
    );
    if (existing) {
      if (window.Razorpay) {
        resolve();
      } else {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () =>
          reject(new Error('Failed to load Razorpay Checkout SDK'))
        );
      }
      return;
    }
    const script = document.createElement('script');
    script.src = RAZORPAY_SDK_URL;
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) {
        resolve();
      } else {
        reject(new Error('Razorpay SDK loaded but Razorpay is not defined'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Razorpay Checkout SDK'));
    document.head.appendChild(script);
  });

  return loadPromise;
}

export interface InitPaymentParams {
  amountInr: number;
  customerName: string;
  customerEmail?: string;
  customerContact?: string;
  description: string;
  orderId?: string;
  onSuccess: (paymentId: string) => void;
  onDismiss?: () => void;
}

export async function initiateRazorpayPayment({
  amountInr,
  customerName,
  customerEmail,
  customerContact,
  description,
  orderId,
  onSuccess,
  onDismiss,
}: InitPaymentParams): Promise<void> {
  const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined;
  if (!keyId) {
    throw new Error(
      'Payment is not configured yet. Please try again later or contact support.'
    );
  }

  await loadRazorpay();

  const Razorpay = window.Razorpay;
  if (!Razorpay) {
    throw new Error('Razorpay Checkout SDK is not available.');
  }

  const instance = new Razorpay({
    key: keyId,
    amount: Math.round(amountInr * 100), // convert INR to paise
    currency: 'INR',
    name: 'Vahakam Transport',
    description,
    ...(orderId ? { order_id: orderId } : {}),
    prefill: {
      name: customerName,
      email: customerEmail,
      contact: customerContact,
    },
    theme: { color: '#0f57c4' },
    handler: (response) => {
      onSuccess(response.razorpay_payment_id);
    },
    modal: {
      ondismiss: onDismiss,
    },
  });

  instance.open();
}
