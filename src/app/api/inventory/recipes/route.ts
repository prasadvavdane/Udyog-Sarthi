import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api-auth';
import {
  deleteInventoryRecipe,
  getInventoryRecipes,
  upsertInventoryRecipe,
} from '@/lib/inventory-service';
import { hasInventoryPermission } from '@/lib/inventory-permissions';
import { inventoryRecipeSchema } from '@/lib/inventory-validations';
import { flattenZodError } from '@/lib/validations';

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  if (!hasInventoryPermission(auth.user.role, 'inventory.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const recipes = await getInventoryRecipes(auth.user);
    return NextResponse.json({ recipes });
  } catch (error) {
    console.error('Inventory recipes fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load recipes' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  if (!hasInventoryPermission(auth.user.role, 'inventory.recipe.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = inventoryRecipeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
    }

    const recipe = await upsertInventoryRecipe(auth.user, parsed.data);
    return NextResponse.json({ recipe });
  } catch (error) {
    console.error('Inventory recipe upsert error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save recipe' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  if (!hasInventoryPermission(auth.user.role, 'inventory.recipe.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    if (!productId) {
      return NextResponse.json({ error: 'Product id is required' }, { status: 400 });
    }

    const deleted = await deleteInventoryRecipe(auth.user, productId);
    return NextResponse.json(deleted);
  } catch (error) {
    console.error('Inventory recipe delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete recipe' },
      { status: 500 },
    );
  }
}
