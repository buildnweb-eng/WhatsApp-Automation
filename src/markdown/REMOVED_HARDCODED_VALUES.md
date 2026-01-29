# ✅ Removed Hardcoded Product IDs

## What Was Changed

### Problem
The codebase had hardcoded product ID `k30xdslu41` in multiple places:
- `src/handlers/message.handler.ts` (lines 190, 247)

This is bad practice because:
- ❌ Not configurable per environment
- ❌ Requires code changes to update
- ❌ Not flexible for different deployments
- ❌ Makes code less maintainable

### Solution
Moved the product ID to environment variables with proper fallback behavior.

---

## Changes Made

### 1. Updated Environment Configuration

**File:** `src/config/env.ts`

Added optional environment variable:
```typescript
WHATSAPP_CATALOG_THUMBNAIL_PRODUCT_ID: z.string().optional()
```

Added to config export:
```typescript
whatsapp: {
  // ... existing fields
  catalogThumbnailProductId: env.WHATSAPP_CATALOG_THUMBNAIL_PRODUCT_ID,
}
```

### 2. Updated Message Handler

**File:** `src/handlers/message.handler.ts`

**Before (Hardcoded):**
```typescript
// Line 187-190
await whatsappService.sendCatalogMessage(
  from,
  'Browse our beautiful saree collection! 🛍️ Tap below to explore all items.',
  'k30xdslu41'  // ❌ Hardcoded!
);
```

**After (Configurable):**
```typescript
// Now uses environment variable
await whatsappService.sendCatalogMessage(
  from,
  undefined,
  config.whatsapp.catalogThumbnailProductId  // ✅ From config
);
```

### 3. Updated Environment Files

**File:** `.env`
```bash
# Added optional configuration with clear documentation
# Optional: Product ID to use as thumbnail for catalog messages
# Get from Commerce Manager > Catalog > Items > Click product > Copy "Retailer ID"
# If not set, bot will send instructions to use the shopping bag icon
# WHATSAPP_CATALOG_THUMBNAIL_PRODUCT_ID=your-product-id-here
```

**File:** `env.example`
```bash
# Added same documentation and example
# WHATSAPP_CATALOG_THUMBNAIL_PRODUCT_ID=your-product-id-here
```

---

## How It Works Now

### Default Behavior (No Product ID Set)
When `WHATSAPP_CATALOG_THUMBNAIL_PRODUCT_ID` is **not set** in `.env`:

1. Bot sends **text instructions** to customers
2. Instructions tell them to use the shopping bag icon 🛍️
3. This is the safest default (always works)

```
🛍️ Browse Our Collection

To view our full catalog:
1. Tap the shopping bag icon (🛍️) at the top of this chat
2. Browse through our beautiful collection
3. Add items to your cart
4. Tap "Send" to share your cart with me

I'll help you complete your order! ✨
```

### With Product ID Set
When `WHATSAPP_CATALOG_THUMBNAIL_PRODUCT_ID` **is set** in `.env`:

1. Bot tries to send **interactive catalog message**
2. Shows clickable catalog card with product thumbnail
3. Falls back to instructions if API call fails

To enable this:
```bash
# In .env file
WHATSAPP_CATALOG_THUMBNAIL_PRODUCT_ID=k30xdslu41
```

---

## Benefits of This Approach

### ✅ Configurable
- Different product IDs per environment (dev/staging/prod)
- No code changes needed to switch products

### ✅ Safe Defaults
- Works without configuration
- Graceful fallback if product ID is invalid

### ✅ Maintainable
- All configuration in one place
- Clear documentation in env files

### ✅ Flexible
- Easy to enable/disable interactive messages
- Can be different for different deployments

---

## How to Use

### Option 1: Keep Default (Recommended for Now)
Do nothing! The bot will send instructions to use the shopping bag icon.

**When to use:**
- When catalog is still syncing
- When you don't have a product ID yet
- For maximum compatibility

### Option 2: Add Product ID (For Better UX)
Get a product ID and add it to `.env`:

**Steps:**
1. Go to: https://business.facebook.com/commerce/
2. Select your catalog: "Saree Collection"
3. Go to: Catalog → Items
4. Click any product
5. Copy the "Retailer ID" (e.g., `k30xdslu41`)
6. Add to `.env`:
   ```bash
   WHATSAPP_CATALOG_THUMBNAIL_PRODUCT_ID=k30xdslu41
   ```
7. Restart your server

**When to use:**
- When catalog is fully synced with API
- When you want clickable catalog messages
- For better user experience

---

## Testing

### Test Without Product ID
1. Make sure `.env` doesn't have `WHATSAPP_CATALOG_THUMBNAIL_PRODUCT_ID`
2. Message bot: "catalog"
3. Should receive text instructions

### Test With Product ID
1. Add `WHATSAPP_CATALOG_THUMBNAIL_PRODUCT_ID=k30xdslu41` to `.env`
2. Restart server: `bun run dev`
3. Message bot: "catalog"
4. Should receive clickable catalog message (or fallback to instructions if API fails)

---

## Code Quality Improvements

### Before
```typescript
// ❌ Multiple hardcoded values
'k30xdslu41'  // Line 190
'k30xdslu41'  // Line 247
```

**Issues:**
- Need to change in multiple places
- Easy to miss during updates
- No flexibility
- Not documented

### After
```typescript
// ✅ Single source of truth
config.whatsapp.catalogThumbnailProductId
```

**Benefits:**
- Change once in .env
- Type-safe (TypeScript)
- Self-documenting
- Flexible per environment

---

## Environment Variable Reference

### New Variable

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `WHATSAPP_CATALOG_THUMBNAIL_PRODUCT_ID` | string | No | undefined | Product retailer ID to use as thumbnail for catalog messages. Get from Commerce Manager. |

### Example Values
```bash
# Example product IDs (get yours from Commerce Manager)
WHATSAPP_CATALOG_THUMBNAIL_PRODUCT_ID=k30xdslu41
WHATSAPP_CATALOG_THUMBNAIL_PRODUCT_ID=6kul5s8jy6
WHATSAPP_CATALOG_THUMBNAIL_PRODUCT_ID=SAREE001
```

---

## Migration Guide

If you were using the old hardcoded version:

### Step 1: Check Current Behavior
Your bot currently sends instructions (product ID was failing anyway due to API sync).

### Step 2: No Action Required
The bot will continue working exactly as before - sending instructions.

### Step 3: Optional - Add Product ID Later
Once your catalog is fully synced (1-24 hours), you can:
1. Get a product ID from Commerce Manager
2. Add it to `.env`
3. Restart server
4. Bot will start sending clickable messages

---

## Summary

**What was removed:**
- ❌ Hardcoded product ID `k30xdslu41` from 2 locations

**What was added:**
- ✅ Optional environment variable `WHATSAPP_CATALOG_THUMBNAIL_PRODUCT_ID`
- ✅ Configuration in `src/config/env.ts`
- ✅ Documentation in `.env` and `env.example`

**Result:**
- ✅ No hardcoded values in codebase
- ✅ Fully configurable via environment
- ✅ Safe defaults that always work
- ✅ Better code quality and maintainability

**Current behavior:**
- Bot sends text instructions (same as before)
- No functional changes for users
- Ready to add product ID when needed
