/**
 * Authoritative Digital Products & Direct Purchases Service
 * Connects directly to backend server routes:
 * - Direct purchasing with Naira Task Wallet balance
 * - Direct purchasing with Paystack server verification
 * - Administrator management with custom payment methods selection
 */

export interface DigitalProduct {
  id: string;
  title: string;
  description: string;
  long_description?: string;
  price: number;
  image_url: string;
  digital_access_url: string;
  access_instructions?: string;
  payment_methods: 'wallet_only' | 'paystack_only' | 'both';
  is_active: boolean;
  is_digital: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DigitalProductOrder {
  orderId: string;
  productId: string;
  productTitle: string;
  amount: number;
  paymentMethod: 'wallet' | 'paystack';
  paystackReference?: string;
  userId: string;
  userEmail: string;
  purchasedAt: string;
  digitalAccessUrl: string;
  accessInstructions?: string;
  status: 'completed';
}

export async function fetchDigitalProducts(includeInactive = false): Promise<DigitalProduct[]> {
  try {
    const res = await fetch(`/api/digital-products${includeInactive ? '?all=true' : ''}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        return data.products;
      }
    }
  } catch (err) {
    console.warn('Could not fetch digital products:', err);
  }
  return [];
}

export async function fetchDigitalProductById(id: string): Promise<DigitalProduct | null> {
  try {
    const res = await fetch(`/api/digital-products/${encodeURIComponent(id)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.product) {
        return data.product;
      }
    }
  } catch (err) {
    console.warn(`Could not fetch digital product ${id}:`, err);
  }
  return null;
}

export async function saveDigitalProduct(
  productData: Partial<DigitalProduct>,
  adminEmail: string,
  userId?: string
): Promise<{ success: boolean; product?: DigitalProduct; error?: string }> {
  try {
    const res = await fetch('/api/digital-products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-email': adminEmail,
        ...(userId ? { 'x-user-id': userId } : {}),
      },
      body: JSON.stringify({ ...productData, adminEmail, userId }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, product: data.product };
    }
    return { success: false, error: data.error || 'Failed to save digital product' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error saving product' };
  }
}

export async function deleteDigitalProduct(
  id: string,
  adminEmail: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/digital-products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'x-admin-email': adminEmail,
        ...(userId ? { 'x-user-id': userId } : {}),
      },
      body: JSON.stringify({ adminEmail, userId }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true };
    }
    return { success: false, error: data.error || 'Failed to delete digital product' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error deleting product' };
  }
}

export async function purchaseDigitalProductWithWallet(
  productId: string,
  userId: string,
  userEmail?: string
): Promise<{
  success: boolean;
  order?: DigitalProductOrder;
  digitalAccessUrl?: string;
  accessInstructions?: string;
  newWalletBalance?: number;
  error?: string;
  requiredBalance?: number;
  currentBalance?: number;
}> {
  try {
    const res = await fetch('/api/digital-products/checkout/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, userId, userEmail }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        order: data.order,
        digitalAccessUrl: data.digitalAccessUrl,
        accessInstructions: data.accessInstructions,
        newWalletBalance: data.newWalletBalance,
      };
    }
    return {
      success: false,
      error: data.error || 'Wallet payment was not successful',
      requiredBalance: data.requiredBalance,
      currentBalance: data.currentBalance,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error during purchase' };
  }
}

export async function verifyPaystackDigitalPurchase(
  reference: string,
  productId: string,
  userId: string,
  userEmail?: string
): Promise<{
  success: boolean;
  order?: DigitalProductOrder;
  digitalAccessUrl?: string;
  accessInstructions?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/digital-products/checkout/paystack/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference, productId, userId, userEmail }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        order: data.order,
        digitalAccessUrl: data.digitalAccessUrl,
        accessInstructions: data.accessInstructions,
      };
    }
    return { success: false, error: data.error || 'Payment verification failed' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error verifying Paystack payment' };
  }
}

export async function fetchMyPurchasedDigitalProducts(userId: string): Promise<DigitalProductOrder[]> {
  try {
    const res = await fetch(`/api/digital-products/my-purchases?userId=${encodeURIComponent(userId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.purchases)) {
        return data.purchases;
      }
    }
  } catch (err) {
    console.warn('Could not fetch user purchases:', err);
  }
  return [];
}
