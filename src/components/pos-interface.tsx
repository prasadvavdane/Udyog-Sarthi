'use client';

import { startTransition, useDeferredValue, useEffect, useEffectEvent, useRef, useState } from 'react';
import { CreditCard, Minus, Plus, Search, Smartphone, Sparkles, UserRound, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/format';

type ProductRow = {
  id: string;
  name: string;
  sku: string;
  category: string;
  stockQuantity: number;
  reorderLevel: number;
  sellingPrice: number;
  buyingPrice: number;
  gst: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
};

type OfferRow = {
  id: string;
  name: string;
  type: string;
  value: number;
  minOrder?: number;
};

type CustomerRow = {
  id: string;
  name: string;
  mobile: string;
  totalSpend: number;
  loyaltyPoints: number;
  tier: 'Bronze' | 'Silver' | 'Gold';
};

interface POSInterfaceProps {
  initialProducts: ProductRow[];
  activeOffers: OfferRow[];
  customerList: CustomerRow[];
  workspace: {
    businessName: string;
    tenantCode: string;
  };
  templateMeta: {
    label: string;
    modules: string[];
    summary: string;
  };
}

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  gst: number;
  total: number;
}

export default function POSInterface({
  initialProducts,
  activeOffers,
  customerList,
  workspace,
  templateMeta,
}: POSInterfaceProps) {
  const [products, setProducts] = useState(initialProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [customerMobile, setCustomerMobile] = useState('');
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const deferredSearch = useDeferredValue(searchTerm);

  const categories = ['All', ...new Set(products.map((product) => product.category))];

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      product.sku.toLowerCase().includes(deferredSearch.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const gstAmount = cart.reduce((sum, item) => sum + (item.total * item.gst) / 100, 0);
  const total = Math.max(subtotal + gstAmount - discount, 0);

  const addToCart = (product: ProductRow) => {
    if (product.stockQuantity <= 0) {
      toast.error('This product is currently out of stock.');
      return;
    }

    const existingItem = cart.find((item) => item.productId === product.id);

    if (existingItem) {
      if (existingItem.quantity >= product.stockQuantity) {
        toast.error('Insufficient stock for this product.');
        return;
      }

      setCart((currentCart) =>
        currentCart.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.price,
              }
            : item,
        ),
      );
      return;
    }

    setCart((currentCart) => [
      ...currentCart,
      {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.sellingPrice,
        gst: product.gst,
        total: product.sellingPrice,
      },
    ]);
  };

  const updateQuantity = (productId: string, nextQuantity: number) => {
    if (nextQuantity <= 0) {
      setCart((currentCart) => currentCart.filter((item) => item.productId !== productId));
      return;
    }

    const product = products.find((item) => item.id === productId);
    if (!product || nextQuantity > product.stockQuantity) {
      toast.error('Insufficient stock for this update.');
      return;
    }

    setCart((currentCart) =>
      currentCart.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: nextQuantity,
              total: nextQuantity * item.price,
            }
          : item,
      ),
    );
  };

  const applyOffer = (offer: OfferRow) => {
    if (offer.minOrder && subtotal < offer.minOrder) {
      toast.error(`This offer unlocks above ${formatCurrency(offer.minOrder)}.`);
      return;
    }

    const computedDiscount = offer.type === 'percentage' ? (subtotal * offer.value) / 100 : offer.value;
    setDiscount(Number(computedDiscount.toFixed(2)));
    toast.success(`${offer.name} applied to the current cart.`);
  };

  const completePayment = async (paymentMode: 'cash' | 'upi' | 'card') => {
    if (cart.length === 0) {
      toast.error('Add at least one item before billing.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          customerMobile: customerMobile || undefined,
          discount,
          paymentMode,
          paymentAmount: total,
        }),
      });

      const payload = (await response.json()) as { error?: string; invoice?: { invoiceNumber: string } };

      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to create invoice');
      }

      startTransition(() => {
        setProducts((currentProducts) =>
          currentProducts.map((product) => {
            const soldItem = cart.find((item) => item.productId === product.id);
            return soldItem
              ? {
                  ...product,
                  stockQuantity: Math.max(product.stockQuantity - soldItem.quantity, 0),
                }
              : product;
          }),
        );
        setCart([]);
        setCustomerMobile('');
        setDiscount(0);
      });

      toast.success(`Invoice ${payload.invoice?.invoiceNumber ?? ''} created successfully.`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const keyboardShortcuts = useEffectEvent((event: KeyboardEvent) => {
    const activeElement = document.activeElement;
    const isTyping =
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      activeElement instanceof HTMLSelectElement;

    if (event.key === '/') {
      event.preventDefault();
      searchInputRef.current?.focus();
      return;
    }

    if (isTyping) {
      return;
    }

    if (event.key === 'F2') {
      event.preventDefault();
      void completePayment('cash');
    }

    if (event.key === 'F3') {
      event.preventDefault();
      void completePayment('upi');
    }

    if (event.key === 'F4') {
      event.preventDefault();
      void completePayment('card');
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', keyboardShortcuts);
    return () => {
      window.removeEventListener('keydown', keyboardShortcuts);
    };
  }, []);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Search and add products</CardTitle>
            <CardDescription>Use category filters, SKU search, or barcode input to move faster at the counter.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={`Search ${workspace.businessName} catalog...`}
                  className="pl-11"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Kbd>/</Kbd>
                Focus search
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((category) => (
                <Button
                  key={category}
                  type="button"
                  size="sm"
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  className="shrink-0"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product)}
                  className="rounded-[24px] border border-border bg-white/72 p-4 text-left shadow-sm hover:border-primary/25 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div>
                        <p className="font-semibold text-foreground">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {product.sku} • {product.category}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={product.status === 'low-stock' ? 'secondary' : product.status === 'out-of-stock' ? 'destructive' : 'outline'}>
                          {product.status.replace('-', ' ')}
                        </Badge>
                        <Badge variant="outline">GST {product.gst}%</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-foreground">{formatCurrency(product.sellingPrice)}</p>
                      <p className="text-sm text-muted-foreground">Stock {product.stockQuantity}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Smart billing cues</CardTitle>
            <CardDescription>The UI now highlights the actions cashiers ask for most often in this template.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {templateMeta.modules.map((module) => (
              <div key={module} className="rounded-[24px] border border-border bg-white/68 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{module}</p>
                    <p className="text-sm text-muted-foreground">{templateMeta.summary}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Current bill</CardTitle>
            <CardDescription>Keep checkout focused with quantity controls and quick totals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {cart.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-border bg-white/50 px-4 py-10 text-center text-sm text-muted-foreground">
                  Add products from the left to begin a new invoice.
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.productId} className="rounded-[24px] border border-border bg-white/72 px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-foreground">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(item.price)} each • GST {item.gst}%
                        </p>
                      </div>
                      <p className="font-semibold text-foreground">{formatCurrency(item.total)}</p>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <Button type="button" size="icon" variant="outline" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="min-w-12 rounded-2xl border border-border bg-white/90 px-4 py-2 text-center font-semibold text-foreground">
                        {item.quantity}
                      </div>
                      <Button type="button" size="icon" variant="outline" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold text-foreground">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">GST</span>
                <span className="font-semibold text-foreground">{formatCurrency(gstAmount)}</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount">Discount</Label>
                <Input
                  id="discount"
                  type="number"
                  min={0}
                  value={discount}
                  onChange={(event) => setDiscount(Number(event.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total payable</p>
                  <p className="text-2xl font-semibold text-foreground">{formatCurrency(total)}</p>
                </div>
                <div className="rounded-[24px] bg-primary/10 px-4 py-3 text-right text-primary">
                  <p className="text-xs uppercase tracking-[0.14em]">Tenant</p>
                  <p className="font-semibold">{workspace.tenantCode}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer and loyalty</CardTitle>
            <CardDescription>Capture a mobile number or pick a familiar repeat buyer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerMobile">Customer mobile</Label>
              <Input
                id="customerMobile"
                type="tel"
                value={customerMobile}
                onChange={(event) => setCustomerMobile(event.target.value)}
                placeholder="Enter mobile number"
              />
            </div>

            <div className="grid gap-3">
              {customerList.slice(0, 3).map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => setCustomerMobile(customer.mobile)}
                  className="flex items-center justify-between rounded-[24px] border border-border bg-white/68 px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">{customer.mobile}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{customer.tier}</Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Offers and settlement</CardTitle>
            <CardDescription>Auto-suggested promotions and keyboard-friendly payment actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3">
              {activeOffers.slice(0, 3).map((offer) => (
                <button
                  key={offer.id}
                  type="button"
                  onClick={() => applyOffer(offer)}
                  className="rounded-[24px] border border-border bg-white/68 px-4 py-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{offer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {offer.minOrder ? `Minimum order ${formatCurrency(offer.minOrder)}` : 'Ready to apply'}
                      </p>
                    </div>
                    <Badge>{offer.type}</Badge>
                  </div>
                </button>
              ))}
            </div>

            <div className="grid gap-2 pt-2">
              <Button onClick={() => void completePayment('cash')} disabled={cart.length === 0 || loading} className="justify-between">
                <span className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Cash payment
                </span>
                <Kbd>F2</Kbd>
              </Button>
              <Button onClick={() => void completePayment('upi')} variant="outline" disabled={cart.length === 0 || loading} className="justify-between">
                <span className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  UPI payment
                </span>
                <Kbd>F3</Kbd>
              </Button>
              <Button onClick={() => void completePayment('card')} variant="outline" disabled={cart.length === 0 || loading} className="justify-between">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Card payment
                </span>
                <Kbd>F4</Kbd>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
