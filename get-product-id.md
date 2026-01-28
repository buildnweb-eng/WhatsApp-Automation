# Get Your Product ID - 3 Ways

## The Issue
You need a product ID to send clickable catalog messages, but you can't see it easily.

---

## Method 1: Via Commerce Manager (Easiest)

1. **Open this link:**
   ```
   https://business.facebook.com/commerce/catalogs/912218714672209/products
   ```

2. **You'll see a list of your products**

3. **Click on any product**

4. **Look for one of these fields:**
   - **"Retailer ID"** (most common)
   - **"Content ID"**  
   - **"SKU"**
   - **"Product ID"**

5. **Copy that value** (example: `SAREE001`, `12345`, etc.)

---

## Method 2: Check Product URL

When you click a product in Commerce Manager, look at the URL:

```
https://business.facebook.com/commerce/catalogs/912218714672209/products/1234567890
                                                                           ^^^^^^^^^^
                                                                           This is the product ID!
```

The number at the end is the product ID you can use!

---

## Method 3: Add a Test Product (If Catalog is Empty)

If your catalog has no products:

1. Go to: https://business.facebook.com/commerce/catalogs/912218714672209
2. Click **"Add Products"** or **"Add Items"**
3. Fill in:
   - **Name:** Blue Silk Saree
   - **Price:** 2500
   - **Retailer ID:** SAREE001 (you choose this!)
   - **Image:** Upload a saree image
   - **Status:** Published
4. Click **"Save"**
5. Use **"SAREE001"** as your product ID in the code!

---

## Once You Have the ID

Update this line in `src/handlers/message.handler.ts` (line ~232):

```typescript
await whatsappService.sendCatalogMessage(
  from,
  'Browse our beautiful saree collection! 🛍️',
  'YOUR_PRODUCT_ID_HERE'  // ← Paste your ID here!
);
```

**Example with real ID:**
```typescript
await whatsappService.sendCatalogMessage(
  from,
  'Browse our beautiful saree collection! 🛍️',
  'SAREE001'  // ← Your actual product retailer ID
);
```

---

## Quick Test

After adding the product ID:

1. Save the file
2. Message your bot: +91 94939 04976
3. Type: "catalog"
4. You should get a **clickable catalog card**!

---

## Don't Have Any Products?

No problem! For now, keep the current code (without product ID):

```typescript
await whatsappService.sendCatalogMessage(from);
```

This sends instructions to use the shopping bag icon, which will appear within 24 hours.

**OR** add at least one test product to your catalog and use its ID!

---

## Need Help?

If you can't find a product ID:
1. Take a screenshot of your Commerce Manager → Catalog → Items page
2. I'll help you identify where the product ID is
3. Or we can add a test product together
