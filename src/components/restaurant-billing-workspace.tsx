'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useDeferredValue, useEffect, useRef, useState } from 'react';
import {
  CreditCard,
  Loader2,
  Minus,
  Plus,
  Save,
  Search,
  Smartphone,
  UserRound,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { customerEntrySchema } from '@/lib/validations';
import { formatCurrency } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type ProductRow = {
  id: string;
  productName: string;
  category: string;
  sellingPrice: number;
  GSTPercentage: number;
  stockQuantity: number;
  foodType: 'veg' | 'non-veg';
  isAvailable: boolean;
};

type CustomerRow = {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  numberOfGuests?: number;
  specialNotes?: string;
};

type DraftInvoice = {
  id?: string;
  _id: string;
  invoiceDraftId: string;
  sessionId: string;
  invoiceStatus: 'draft' | 'active' | 'paid' | 'closed';
  paymentMode?: string;
  customerId?: string;
  customerSnapshot?: {
    customerName: string;
    mobileNumber: string;
    email?: string;
    numberOfGuests?: number;
    specialNotes?: string;
  };
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    GSTPercentage: number;
    total: number;
  }>;
  subtotal: number;
  GSTAmount: number;
  discount: number;
  grandTotal: number;
};

type TableDetails = {
  id: string;
  tableName: string;
  status: 'available' | 'occupied' | 'billed' | 'reserved';
  capacity?: number;
};

interface RestaurantBillingWorkspaceProps {
  table: TableDetails;
  initialDraft: DraftInvoice | null;
  products: ProductRow[];
  customers: CustomerRow[];
}

type CartItem = {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  gst: number;
  total: number;
};

type CustomerForm = {
  customerName: string;
  mobileNumber: string;
  email: string;
  numberOfGuests: string;
  specialNotes: string;
};

export function RestaurantBillingWorkspace({
  table,
  initialDraft,
  products,
  customers,
}: RestaurantBillingWorkspaceProps) {
  const router = useRouter();
  const didMountRef = useRef(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>(
    initialDraft?.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      price: item.price,
      gst: item.GSTPercentage,
      total: item.total,
    })) ?? [],
  );
  const [discount, setDiscount] = useState(initialDraft?.discount ?? 0);
  const [notes, setNotes] = useState(initialDraft?.customerSnapshot?.specialNotes ?? '');
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [finalizing, setFinalizing] = useState(false);
  const [draftMeta, setDraftMeta] = useState({
    id: initialDraft?._id ?? '',
    invoiceDraftId: initialDraft?.invoiceDraftId ?? '',
    sessionId: initialDraft?.sessionId ?? '',
    invoiceStatus: initialDraft?.invoiceStatus ?? 'draft',
  });
  const [customerForm, setCustomerForm] = useState<CustomerForm>({
    customerName: initialDraft?.customerSnapshot?.customerName ?? '',
    mobileNumber: initialDraft?.customerSnapshot?.mobileNumber ?? '',
    email: initialDraft?.customerSnapshot?.email ?? '',
    numberOfGuests: initialDraft?.customerSnapshot?.numberOfGuests?.toString() ?? '',
    specialNotes: initialDraft?.customerSnapshot?.specialNotes ?? '',
  });

  const isReadonly = initialDraft?.invoiceStatus === 'paid';
  const liveSearch = useDeferredValue(searchTerm);
  const categories = ['All', ...Array.from(new Set(products.map((product) => product.category)))];

  const filteredProducts = products.filter((product) => {
    const normalized = liveSearch.toLowerCase();
    const matchesSearch =
      product.productName.toLowerCase().includes(normalized) ||
      product.category.toLowerCase().includes(normalized);
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const GSTAmount = cart.reduce((sum, item) => sum + (item.total * item.gst) / 100, 0);
  const grandTotal = Math.max(subtotal + GSTAmount - discount, 0);

  const setCustomerField = <K extends keyof CustomerForm>(field: K, value: CustomerForm[K]) => {
    setCustomerForm((current) => ({ ...current, [field]: value }));
  };

  const addToCart = (product: ProductRow) => {
    if (!product.isAvailable || product.stockQuantity <= 0) {
      toast.error('This item is unavailable.');
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) {
          toast.error('No more stock is available for this item.');
          return current;
        }

        return current.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.price,
              }
            : item,
        );
      }

      return [
        ...current,
        {
          productId: product.id,
          productName: product.productName,
          quantity: 1,
          price: product.sellingPrice,
          gst: product.GSTPercentage,
          total: product.sellingPrice,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, nextQuantity: number) => {
    if (nextQuantity <= 0) {
      setCart((current) => current.filter((item) => item.productId !== productId));
      return;
    }

    const product = products.find((item) => item.id === productId);
    if (!product || nextQuantity > product.stockQuantity) {
      toast.error('Insufficient stock for this item.');
      return;
    }

    setCart((current) =>
      current.map((item) =>
        item.productId === productId
          ? { ...item, quantity: nextQuantity, total: nextQuantity * item.price }
          : item,
      ),
    );
  };

  const fillExistingCustomer = (customer: CustomerRow) => {
    setCustomerForm({
      customerName: customer.name,
      mobileNumber: customer.mobile,
      email: customer.email ?? '',
      numberOfGuests: customer.numberOfGuests?.toString() ?? '',
      specialNotes: customer.specialNotes ?? '',
    });
  };

  const persistDraft = useCallback(async () => {
    if (isReadonly) {
      return null;
    }

    setSaving('saving');

    try {
      const response = await fetch(`/api/tables/${table.id}/draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: table.id,
          tableName: table.tableName,
          invoiceDraftId: draftMeta.invoiceDraftId || undefined,
          sessionId: draftMeta.sessionId || undefined,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          discount,
          notes,
          customer:
            customerForm.customerName.trim() || customerForm.mobileNumber.trim()
              ? {
                  customerName: customerForm.customerName,
                  mobileNumber: customerForm.mobileNumber,
                  email: customerForm.email || undefined,
                  numberOfGuests: customerForm.numberOfGuests
                    ? Number(customerForm.numberOfGuests)
                    : undefined,
                  specialNotes: customerForm.specialNotes || undefined,
                }
              : undefined,
        }),
      });

      const payload = (await response.json()) as { error?: string; draft?: DraftInvoice | null };
      if (!response.ok || !payload.draft) {
        throw new Error(payload.error ?? 'Unable to save draft');
      }

      setDraftMeta({
        id: payload.draft._id,
        invoiceDraftId: payload.draft.invoiceDraftId,
        sessionId: payload.draft.sessionId,
        invoiceStatus: payload.draft.invoiceStatus,
      });
      setSaving('saved');
      return payload.draft;
    } catch (error) {
      console.error(error);
      setSaving('idle');
      toast.error(error instanceof Error ? error.message : 'Unable to save draft');
      return null;
    }
  }, [
    cart,
    customerForm,
    discount,
    draftMeta.invoiceDraftId,
    draftMeta.sessionId,
    isReadonly,
    notes,
    table.id,
    table.tableName,
  ]);

  useEffect(() => {
    if (isReadonly) {
      return;
    }

    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      void persistDraft();
    }, 650);

    return () => {
      window.clearTimeout(timer);
    };
  }, [cart, customerForm, discount, isReadonly, notes, persistDraft]);

  const finalizeInvoice = async (paymentMode: 'cash' | 'upi' | 'card') => {
    const parsedCustomer = customerEntrySchema.safeParse({
      customerName: customerForm.customerName,
      mobileNumber: customerForm.mobileNumber,
      email: customerForm.email || undefined,
      numberOfGuests: customerForm.numberOfGuests ? Number(customerForm.numberOfGuests) : undefined,
      specialNotes: customerForm.specialNotes || undefined,
    });

    if (!parsedCustomer.success) {
      toast.error(parsedCustomer.error.issues[0]?.message ?? 'Customer details are required.');
      return;
    }

    if (!cart.length) {
      toast.error('Add at least one menu item before billing.');
      return;
    }

    setFinalizing(true);

    try {
      const savedDraft = await persistDraft();
      const draftId =
        savedDraft?.invoiceDraftId || draftMeta.invoiceDraftId || initialDraft?.invoiceDraftId;

      if (!draftId) {
        throw new Error('Draft bill was not created yet. Please save the order once and try again.');
      }

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId,
          paymentMode,
          paymentAmount: grandTotal,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        invoice?: { _id: string };
      };

      if (!response.ok || !payload.invoice) {
        throw new Error(payload.error ?? 'Unable to finalize invoice');
      }

      toast.success('Invoice finalized successfully.');
      router.push(`/dashboard/invoices/${payload.invoice._id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Unable to finalize invoice');
    } finally {
      setFinalizing(false);
    }
  };

  if (isReadonly && initialDraft) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{table.tableName} is already billed</CardTitle>
          <CardDescription>This table has a paid invoice waiting for print or closure.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[24px] border border-border bg-white/68 px-4 py-4">
            <p className="font-semibold text-foreground">Draft ID</p>
            <p className="text-sm text-muted-foreground">{initialDraft.invoiceDraftId}</p>
            <p className="mt-3 font-semibold text-foreground">Customer</p>
            <p className="text-sm text-muted-foreground">
              {initialDraft.customerSnapshot?.customerName || 'Walk-in customer'}
            </p>
            <p className="mt-3 font-semibold text-foreground">Final amount</p>
            <p className="text-sm text-muted-foreground">{formatCurrency(initialDraft.grandTotal)}</p>
          </div>
          <Button asChild>
            <Link href={`/dashboard/invoices/${initialDraft._id}`}>Open exact invoice</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{table.tableName} menu selection</CardTitle>
            <CardDescription>
              Select items for this table. Drafts auto-save and reopen on the same table.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-11"
                  placeholder="Search menu items..."
                />
              </div>
              <div className="rounded-2xl border border-border bg-white/68 px-4 py-3 text-sm text-muted-foreground">
                Draft status:{' '}
                <span className="font-semibold text-foreground">
                  {saving === 'saving' ? 'saving' : saving === 'saved' ? 'saved' : 'ready'}
                </span>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((category) => (
                <Button
                  key={category}
                  size="sm"
                  variant={selectedCategory === category ? 'default' : 'outline'}
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
                  className="rounded-[24px] border border-border bg-white/72 p-4 text-left shadow-sm transition hover:border-primary/25 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{product.productName}</p>
                        <Badge variant={product.foodType === 'veg' ? 'outline' : 'secondary'}>
                          {product.foodType}
                        </Badge>
                        {!product.isAvailable ? <Badge variant="destructive">Unavailable</Badge> : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{product.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        {formatCurrency(product.sellingPrice)}
                      </p>
                      <p className="text-xs text-muted-foreground">Stock {product.stockQuantity}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Live draft bill</CardTitle>
            <CardDescription>Every line here belongs only to {table.tableName}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {cart.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-border bg-white/50 px-4 py-10 text-center text-sm text-muted-foreground">
                  No items selected for this table yet.
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.productId}
                    className="rounded-[24px] border border-border bg-white/72 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-foreground">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(item.price)} each - GST {item.gst}%
                        </p>
                      </div>
                      <p className="font-semibold text-foreground">{formatCurrency(item.total)}</p>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="min-w-12 rounded-2xl border border-border bg-white/90 px-4 py-2 text-center font-semibold text-foreground">
                        {item.quantity}
                      </div>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="discount">Discount</Label>
                <Input
                  id="discount"
                  type="number"
                  min={0}
                  value={discount}
                  onChange={(event) => setDiscount(Number(event.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Order notes</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Any kitchen note?"
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-border bg-white/68 px-4 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sub total</span>
                <span className="font-semibold text-foreground">{formatCurrency(subtotal)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">GST</span>
                <span className="font-semibold text-foreground">{formatCurrency(GSTAmount)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-semibold text-foreground">{formatCurrency(discount)}</span>
              </div>
              <div className="mt-3 border-t border-dashed border-border pt-3">
                <div className="flex items-center justify-between text-lg font-semibold text-foreground">
                  <span>Grand total</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add new customer</CardTitle>
            <CardDescription>
              This is the primary billing flow. Existing customer selection remains optional.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {customers.slice(0, 3).map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => fillExistingCustomer(customer)}
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
                  <Badge variant="outline">Use</Badge>
                </button>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer name</Label>
                <Input
                  id="customerName"
                  value={customerForm.customerName}
                  onChange={(event) => setCustomerField('customerName', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobileNumber">Mobile number</Label>
                <Input
                  id="mobileNumber"
                  value={customerForm.mobileNumber}
                  onChange={(event) => setCustomerField('mobileNumber', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerForm.email}
                  onChange={(event) => setCustomerField('email', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numberOfGuests">Guests</Label>
                <Input
                  id="numberOfGuests"
                  type="number"
                  min={1}
                  value={customerForm.numberOfGuests}
                  onChange={(event) => setCustomerField('numberOfGuests', event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialNotes">Special notes</Label>
              <Textarea
                id="specialNotes"
                value={customerForm.specialNotes}
                onChange={(event) => setCustomerField('specialNotes', event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Finalize payment</CardTitle>
            <CardDescription>
              Draft ID {draftMeta.invoiceDraftId || 'pending'} - Session{' '}
              {draftMeta.sessionId || 'pending'}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button onClick={() => void persistDraft()} variant="outline" disabled={saving === 'saving'}>
              {saving === 'saving' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save draft now
            </Button>
            <Button onClick={() => void finalizeInvoice('cash')} disabled={finalizing}>
              {finalizing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="mr-2 h-4 w-4" />
              )}
              Cash payment
            </Button>
            <Button onClick={() => void finalizeInvoice('upi')} variant="outline" disabled={finalizing}>
              <Smartphone className="mr-2 h-4 w-4" />
              UPI payment
            </Button>
            <Button onClick={() => void finalizeInvoice('card')} variant="outline" disabled={finalizing}>
              <CreditCard className="mr-2 h-4 w-4" />
              Card payment
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
