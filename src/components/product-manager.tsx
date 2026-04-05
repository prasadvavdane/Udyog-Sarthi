'use client';

import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ProductImporter } from '@/components/product-importer';
import { buildProductCodePreview } from '@/lib/product-code-utils';
import { productSchema, type ProductInput } from '@/lib/validations';
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
  buyingPrice: number;
  stockQuantity: number;
  GSTPercentage: number;
  description?: string;
  imageUrl?: string;
  foodType: 'veg' | 'non-veg';
  activeStatus: boolean;
  isAvailable: boolean;
  reorderLevel: number;
  SKU: string;
  barcode?: string;
  HSN_SAC: string;
};

const emptyForm: ProductInput = {
  productName: '',
  category: '',
  price: 0,
  costPrice: 0,
  stock: 0,
  GST: 5,
  description: '',
  imageUrl: '',
  activeStatus: true,
  isAvailable: true,
  foodType: 'veg',
  reorderLevel: 5,
  SKU: '',
  barcode: '',
  HSN_SAC: '996331',
};

interface ProductManagerProps {
  initialProducts: ProductRow[];
}

export function ProductManager({ initialProducts }: ProductManagerProps) {
  const [products, setProducts] = useState(initialProducts);
  const [form, setForm] = useState<ProductInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [identifierSeed, setIdentifierSeed] = useState(() => Date.now());
  const [skuTouched, setSkuTouched] = useState(false);
  const [barcodeTouched, setBarcodeTouched] = useState(false);

  const categories = Array.from(new Set(products.map((product) => product.category))).sort();

  const setField = <K extends keyof ProductInput>(field: K, value: ProductInput[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setIdentifierSeed(Date.now());
    setSkuTouched(false);
    setBarcodeTouched(false);
  };

  const hydrateForm = (product: ProductRow) => {
    setEditingId(product.id);
    setSkuTouched(true);
    setBarcodeTouched(true);
    setForm({
      productName: product.productName,
      category: product.category,
      price: product.sellingPrice,
      costPrice: product.buyingPrice,
      stock: product.stockQuantity,
      GST: product.GSTPercentage,
      description: product.description || '',
      imageUrl: product.imageUrl || '',
      activeStatus: product.activeStatus,
      isAvailable: product.isAvailable,
      foodType: product.foodType,
      reorderLevel: product.reorderLevel,
      SKU: product.SKU,
      barcode: product.barcode || '',
      HSN_SAC: product.HSN_SAC,
    });
  };

  useEffect(() => {
    if (editingId) {
      return;
    }

    const generated = buildProductCodePreview(form.productName, form.category, identifierSeed);

    if (!skuTouched && generated.SKU) {
      setForm((current) => ({ ...current, SKU: generated.SKU }));
    }

    if (!barcodeTouched && generated.barcode) {
      setForm((current) => ({ ...current, barcode: generated.barcode }));
    }

    if (!form.productName.trim() && !form.category.trim()) {
      setForm((current) => ({ ...current, SKU: '', barcode: '' }));
    }
  }, [
    barcodeTouched,
    editingId,
    form.category,
    form.productName,
    identifierSeed,
    skuTouched,
  ]);

  const saveProduct = async () => {
    const generated = buildProductCodePreview(form.productName, form.category, identifierSeed);
    const payload = {
      ...form,
      SKU: (form.SKU || '').trim() || generated.SKU,
      barcode: (form.barcode || '').trim() || generated.barcode,
    };

    const parsed = productSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Please correct the product form.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(editingId ? `/api/products/${editingId}` : '/api/products', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      const payload = (await response.json()) as { error?: string; product?: ProductRow };
      if (!response.ok || !payload.product) {
        throw new Error(payload.error ?? 'Unable to save product');
      }

      if (editingId) {
        setProducts((current) =>
          current.map((item) => (item.id === editingId ? payload.product! : item)),
        );
        toast.success('Menu item updated.');
      } else {
        setProducts((current) => [payload.product!, ...current]);
        toast.success('Menu item created.');
      }

      resetForm();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Unable to save product');
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to delete product');
      }

      setProducts((current) => current.filter((item) => item.id !== productId));
      if (editingId === productId) {
        resetForm();
      }
      toast.success('Menu item deleted.');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Unable to delete product');
    }
  };

  return (
    <div className="min-w-0 space-y-4">
      <ProductImporter
        onImported={(importedProducts) =>
          setProducts((current) => [...importedProducts, ...current])
        }
      />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit menu item' : 'Add menu item'}</CardTitle>
            <CardDescription></CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="productName">Product name</Label>
                <Input
                  id="productName"
                  value={form.productName}
                  onChange={(event) => setField('productName', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  list="product-categories"
                  value={form.category}
                  onChange={(event) => setField('category', event.target.value)}
                />
                <datalist id="product-categories">
                  {categories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(event) => setField('price', Number(event.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="costPrice">Cost price</Label>
                <Input
                  id="costPrice"
                  type="number"
                  min={0}
                  value={form.costPrice}
                  onChange={(event) => setField('costPrice', Number(event.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={(event) => setField('stock', Number(event.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="GST">GST %</Label>
                <Input
                  id="GST"
                  type="number"
                  min={0}
                  max={28}
                  value={form.GST}
                  onChange={(event) => setField('GST', Number(event.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="SKU">SKU</Label>
                <Input
                  id="SKU"
                  value={form.SKU}
                  onChange={(event) => {
                    setSkuTouched(true);
                    setField('SKU', event.target.value);
                  }}
                />
                <p className="text-xs text-muted-foreground">Auto-generated for new items, but still editable.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="HSN_SAC">HSN/SAC</Label>
                <Input
                  id="HSN_SAC"
                  value={form.HSN_SAC}
                  onChange={(event) => setField('HSN_SAC', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={form.barcode || ''}
                  onChange={(event) => {
                    setBarcodeTouched(true);
                    setField('barcode', event.target.value);
                  }}
                />
                <p className="text-xs text-muted-foreground">Auto-generated unique barcode for new products.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorderLevel">Low stock threshold</Label>
                <Input
                  id="reorderLevel"
                  type="number"
                  min={0}
                  value={form.reorderLevel}
                  onChange={(event) => setField('reorderLevel', Number(event.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="foodType">Veg / Non-veg</Label>
                <select
                  id="foodType"
                  value={form.foodType}
                  onChange={(event) =>
                    setField('foodType', event.target.value as ProductInput['foodType'])
                  }
                  className="flex h-11 w-full rounded-2xl border border-input bg-white/80 px-4 text-sm text-foreground shadow-sm focus-visible:border-primary/40 focus-visible:outline-none"
                >
                  <option value="veg">Veg</option>
                  <option value="non-veg">Non-veg</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  value={form.imageUrl || ''}
                  onChange={(event) => setField('imageUrl', event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description || ''}
                onChange={(event) => setField('description', event.target.value)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center justify-between rounded-2xl border border-border bg-white/68 px-4 py-3 text-sm text-foreground">
                Active menu item
                <input
                  type="checkbox"
                  checked={form.activeStatus}
                  onChange={(event) => setField('activeStatus', event.target.checked)}
                />
              </label>
              <label className="flex items-center justify-between rounded-2xl border border-border bg-white/68 px-4 py-3 text-sm text-foreground">
                Available for billing
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(event) => setField('isAvailable', event.target.checked)}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={() => void saveProduct()} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : editingId ? (
                  <Save className="mr-2 h-4 w-4" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {editingId ? 'Update item' : 'Create item'}
              </Button>
              {editingId ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Saved menu items</CardTitle>
            <CardDescription>
              
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {products.map((product) => (
              <div key={product.id} className="rounded-[24px] border border-border bg-white/68 px-4 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{product.productName}</p>
                      <Badge variant={product.foodType === 'veg' ? 'outline' : 'secondary'}>
                        {product.foodType}
                      </Badge>
                      <Badge variant={product.isAvailable ? 'default' : 'destructive'}>
                        {product.isAvailable ? 'available' : 'unavailable'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {product.category} - SKU {product.SKU} - GST {product.GSTPercentage}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Stock {product.stockQuantity} - Price Rs {product.sellingPrice}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => hydrateForm(product)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void deleteProduct(product.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
