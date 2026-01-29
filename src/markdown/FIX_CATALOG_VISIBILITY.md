# Fix: Catalog Not Visible to Customers

## The Problem

You're testing from a different number (6281432326), but the shopping bag icon still isn't showing. This means the catalog isn't properly connected to your WhatsApp Business Account's **commerce settings**.

## Root Cause

Having a catalog in Meta Commerce Manager is **not enough**. You must also:
1. ✅ Have catalog in Commerce Manager (you have this - ID: 912218714672209)
2. ❌ Connect it to your WhatsApp Business Account's Commerce Settings (likely missing)
3. ❌ Enable commerce settings on your phone number (likely missing)

## Step-by-Step Fix

### Step 1: Verify Catalog Connection in Meta Business Manager

1. Go to **https://business.facebook.com/settings/**
2. In the left sidebar, click **WhatsApp Accounts**
3. Select your WhatsApp Business Account (ID: 746900131401929)
4. Click **Settings** > **WhatsApp Manager**
5. Look for **"Catalogue"** or **"Commerce"** in the left menu
6. Check if your catalog (912218714672209) is connected

**If NOT connected:**
- Click "Choose a Catalogue"
- Search for "Saree Collection" (your catalog)
- Click **Connect**

### Step 2: Enable Commerce Settings on Your Phone Number

1. In Meta Business Manager, go to **WhatsApp Manager**
2. Find your phone number: **911449322059451**
3. Click on **Phone Number** > **Settings**
4. Look for **"Commerce"** or **"Shopping"** settings
5. **Enable commerce** if it's disabled
6. Select your catalog (912218714672209)

### Step 3: Verify Using WhatsApp Business API Settings

Since you're using WhatsApp Cloud API, you need to check via API:

```bash
# Check if commerce is enabled on your phone number
curl -X GET "https://graph.facebook.com/v18.0/911449322059451?fields=id,verified_name,code_verification_status,display_phone_number,quality_rating,account_mode,is_official_business_account,shopping_cart_enabled,connected_commerce_catalog&access_token=YOUR_ACCESS_TOKEN"
```

Look for:
- `shopping_cart_enabled`: should be `true`
- `connected_commerce_catalog`: should show your catalog ID

### Step 4: Enable Commerce via API (If Not Enabled)

Run this command to enable commerce and connect your catalog:

```bash
curl -X POST "https://graph.facebook.com/v18.0/911449322059451/whatsapp_commerce_settings" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "is_cart_enabled": true,
    "is_catalog_visible": true
  }'
```

### Step 5: Set Catalog ID on Phone Number

```bash
curl -X POST "https://graph.facebook.com/v18.0/911449322059451" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shopping_cart_enabled": true,
    "catalog_id": "912218714672209"
  }'
```

## Quick Fix Script

I'll create a script to check and enable commerce settings:
