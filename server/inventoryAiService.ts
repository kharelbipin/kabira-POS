import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';
import { getAuthUser } from './authSession.js';
import { Product, InventoryAdjustment, AiShelfCountSession, AiDetectedBottle } from '../src/types.js';

export const inventoryAiRouter = Router();

// Store past AI shelf count sessions in memory with persistence on server
export const aiShelfCountSessions: AiShelfCountSession[] = [];

// Production safety: never fabricate shelf counts when the vision service is
// unavailable or cannot confidently return structured results.

// POST /api/inventory/ai-shelf-count - Analyze shelf image and count bottles
inventoryAiRouter.post('/inventory/ai-shelf-count', async (req: Request, res: Response) => {
  try {
    getAuthUser(req);

    const { imageDataUrl, shelfLocation = 'Front Retail Shelf' } = req.body;
    const products = db.products;

    if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:')) {
      return res.status(400).json({
        error: 'A valid shelf image is required for AI inventory counting.',
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'AI shelf counting is unavailable because the vision service is not configured.',
      });
    }

    const matches = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);

    if (!matches) {
      return res.status(400).json({
        error: 'Shelf image must be a valid base64 data URL.',
      });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const catalogSummary = products.slice(0, 30).map(p => ({
      id: p.id,
      name: p.name,
      size: p.size,
      brand: p.brandName,
      currentStock: p.stockQuantity,
    }));

    const prompt = `You are a high-precision computer vision model for liquor store inventory management at 377 Spirits.
Analyze this shelf or display image carefully.
Count only physical bottles or cans that are actually visible in the image.
Do not estimate hidden products and do not invent quantities.
Identify the brand/product name and visible quantity.

Store catalog for reference:
${JSON.stringify(catalogSummary, null, 2)}

Return a JSON object strictly adhering to this schema:
{
  "detectedItems": [
    {
      "productId": "string (matching one from catalog if possible)",
      "productName": "string",
      "matchedCatalogName": "string",
      "size": "string (e.g. 750ml, 1L, 6-Pack)",
      "detectedCount": number,
      "brand": "string",
      "shelfSection": "string (e.g. Row 1, Top Shelf, Front Left)",
      "confidence": number (0 to 100)
    }
  ],
  "totalBottlesCounted": number,
  "confidenceScore": number
}`;

    let response: any;

    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            { text: prompt },
          ],
        },
        config: {
          responseMimeType: 'application/json',
        },
      });
    } catch (geminiError: any) {
      console.error('Gemini vision bottle counter error:', geminiError?.message || geminiError);

      return res.status(502).json({
        error: 'The AI vision service could not analyze this shelf image. Inventory was not changed.',
      });
    }

    if (!response?.text) {
      return res.status(422).json({
        error: 'The AI vision service returned no usable shelf-count result. Inventory was not changed.',
      });
    }

    let parsed: any;

    try {
      parsed = JSON.parse(response.text);
    } catch {
      return res.status(422).json({
        error: 'The AI vision response was not valid structured data. Inventory was not changed.',
      });
    }

    if (!Array.isArray(parsed.detectedItems)) {
      return res.status(422).json({
        error: 'The AI vision response did not contain a valid detected-items list. Inventory was not changed.',
      });
    }

    const detectedBottles: AiDetectedBottle[] = parsed.detectedItems
      .map((item: any) => {
        const requestedName = String(item?.productName || '').trim();

        const matched = products.find(
          p =>
            p.id === item?.productId ||
            (requestedName.length > 0 &&
              p.name.toLowerCase().includes(requestedName.toLowerCase()))
        );

        const detectedCount = Number(item?.detectedCount);
        const confidence = Number(item?.confidence);

        if (!Number.isFinite(detectedCount) || detectedCount < 0) {
          return null;
        }

        const normalizedCount = Math.floor(detectedCount);
        const currentStock = matched ? matched.stockQuantity : 0;

        return {
          productId: matched ? matched.id : String(item?.productId || ''),
          productName: requestedName || (matched ? matched.name : 'Unmatched Product'),
          matchedCatalogName: matched
            ? `${matched.name} (${matched.size})`
            : String(item?.matchedCatalogName || ''),
          size: String(item?.size || (matched ? matched.size : '')),
          detectedCount: normalizedCount,
          currentPosStock: currentStock,
          variance: normalizedCount - currentStock,
          confidence: Number.isFinite(confidence)
            ? Math.max(0, Math.min(100, confidence))
            : 0,
          brand: String(item?.brand || (matched ? matched.brandName || '' : '')),
          shelfSection: String(item?.shelfSection || ''),
        } as AiDetectedBottle;
      })
      .filter((item: AiDetectedBottle | null): item is AiDetectedBottle => item !== null);

    if (detectedBottles.length === 0) {
      return res.status(422).json({
        error: 'No reliable visible inventory counts were returned. Inventory was not changed.',
      });
    }

    const detectedTotal = detectedBottles.reduce(
      (sum, bottle) => sum + bottle.detectedCount,
      0
    );

    const rawConfidence = Number(parsed.confidenceScore);

    const confidenceScore = Number.isFinite(rawConfidence)
      ? Math.max(0, Math.min(100, rawConfidence))
      : Math.round(
          detectedBottles.reduce((sum, bottle) => sum + bottle.confidence, 0) /
            detectedBottles.length
        );

    res.json({
      success: true,
      shelfLocation,
      totalBottlesDetected: detectedTotal,
      confidenceScore,
      items: detectedBottles,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error in /inventory/ai-shelf-count:', err);

    const status = Number(err?.status) || 500;

    res.status(status).json({
      error: err?.message || 'Failed to analyze shelf image',
    });
  }
});

// POST /api/inventory/ai-shelf-count/apply - Apply AI counts to POS inventory
inventoryAiRouter.post('/inventory/ai-shelf-count/apply', (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);

  const {
    shelfLocation,
    photoUrl,
    items = [],
    notes,
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: 'No items provided to update',
    });
  }

  // Validate every item before changing inventory.
  // This prevents a partially-applied shelf recount.
  const validatedItems = items.map((item: any) => {
    const product = db.products.find(
      p => p.id === item.productId
    );

    if (!product) {
      return {
        error: `Product ${String(item?.productId || 'unknown')} was not found. Inventory was not changed.`,
      };
    }

    const detectedCount = Number(item.detectedCount);

    if (!Number.isFinite(detectedCount) || detectedCount < 0) {
      return {
        error: `Invalid detected count for ${product.name}. Inventory was not changed.`,
      };
    }

    return {
      product,
      detectedCount: Math.floor(detectedCount),
      confidence: Number.isFinite(Number(item.confidence))
        ? Math.max(0, Math.min(100, Number(item.confidence)))
        : 0,
      original: item,
    };
  });

  const validationFailure = validatedItems.find(
    (item: any) => 'error' in item
  );

  if (validationFailure && 'error' in validationFailure) {
    return res.status(400).json({
      error: validationFailure.error,
    });
  }

  const updatedAdjustments: InventoryAdjustment[] = [];

  for (const validated of validatedItems as any[]) {
    const {
      product,
      detectedCount: newQty,
      confidence,
    } = validated;

    const oldQty = product.stockQuantity;
    const delta = newQty - oldQty;

    product.stockQuantity = newQty;
    product.updatedAt = new Date().toISOString();

    const adjustment: InventoryAdjustment = {
      id: `adj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      oldQuantity: oldQty,
      newQuantity: newQty,
      changeAmount: delta,
      type: 'ai_shelf_count',
      reason: `AI Visual Shelf Recount (${shelfLocation || 'Store Shelf'})`,
      userId: currentUser.id,
      userName: currentUser.name,
      createdAt: new Date().toISOString(),
      notes: notes || `AI Vision verified with ${confidence}% confidence`,
      confidence,
      shelfLocation,
    };

    db.inventoryAdjustments.unshift(adjustment);
    updatedAdjustments.push(adjustment);

    db.addAudit(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'INVENTORY_ADJUST',
      'inventory',
      product.id,
      `AI Shelf Recount for "${product.name}": ${oldQty} -> ${newQty} (delta: ${delta > 0 ? `+${delta}` : delta})`
    );
  }

  const sessionItems = (validatedItems as any[]).map(
    validated => ({
      ...validated.original,
      detectedCount: validated.detectedCount,
      confidence: validated.confidence,
    })
  );

  const session: AiShelfCountSession = {
    id: `ais-${Date.now()}`,
    shelfLocation: shelfLocation || 'General Spirits Shelf',
    photoUrl: typeof photoUrl === 'string' ? photoUrl : '',
    totalBottlesDetected: sessionItems.reduce(
      (sum: number, item: any) => sum + item.detectedCount,
      0
    ),
    items: sessionItems,
    appliedToPos: true,
    appliedAt: new Date().toISOString(),
    operatorId: currentUser.id,
    operatorName: currentUser.name,
    notes: notes || `Applied AI count update to ${sessionItems.length} products`,
    createdAt: new Date().toISOString(),
  };

  aiShelfCountSessions.unshift(session);

  res.json({
    success: true,
    message: `Successfully applied AI stock count for ${updatedAdjustments.length} products`,
    session,
    adjustments: updatedAdjustments,
  });
});

// GET /api/inventory/ai-shelf-count/sessions
inventoryAiRouter.get(
  '/inventory/ai-shelf-count/sessions',
  (req: Request, res: Response) => {
    getAuthUser(req);

    res.json({
      sessions: aiShelfCountSessions,
    });
  }
);

// Live mobile shelf photo staging store
const liveShelfUploads: Record<
  string,
  {
    id: string;
    url: string;
    label: string;
    timestamp: number;
  }[]
> = {};

// POST /api/inventory/ai-shelf-count/sessions/:sessionId/photos
inventoryAiRouter.post(
  '/inventory/ai-shelf-count/sessions/:sessionId/photos',
  (req: Request, res: Response) => {
    getAuthUser(req);

    const { sessionId } = req.params;
    const { photos, photoUrl, label } = req.body;

    if (!liveShelfUploads[sessionId]) {
      liveShelfUploads[sessionId] = [];
    }

    if (Array.isArray(photos)) {
      photos.forEach((p: any, idx: number) => {
        liveShelfUploads[sessionId].push({
          id: p.id || `photo-${Date.now()}-${idx}`,
          url: p.url || p,
          label:
            p.label ||
            `Shot ${liveShelfUploads[sessionId].length + 1}`,
          timestamp: Date.now(),
        });
      });
    } else if (photoUrl) {
      liveShelfUploads[sessionId].push({
        id: `photo-${Date.now()}`,
        url: photoUrl,
        label:
          label ||
          `Shot ${liveShelfUploads[sessionId].length + 1}`,
        timestamp: Date.now(),
      });
    }

    res.json({
      success: true,
      count: liveShelfUploads[sessionId].length,
      photos: liveShelfUploads[sessionId],
    });
  }
);

// GET /api/inventory/ai-shelf-count/sessions/:sessionId/photos
inventoryAiRouter.get(
  '/inventory/ai-shelf-count/sessions/:sessionId/photos',
  (req: Request, res: Response) => {
    getAuthUser(req);

    const { sessionId } = req.params;
    const photos =
      liveShelfUploads[sessionId] || [];

    res.json({
      success: true,
      photos,
    });
  }
);
