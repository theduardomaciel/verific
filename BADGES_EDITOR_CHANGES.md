# Badges Editor Changes - Commit dc0f405

**Date:** 2026-10-24
**Previous commit:** 231448b (lint(globals): fix globals.css formatting)

## Summary of Changes

This commit implements three improvements to the badges editor:

### 1. Fix: Second line not appearing in PDF

**Problem:** The PDF generation used the saved layout's field IDs to fetch participant data, but the editor uses a draft layout which might have different/unsaved field bindings.

**Solution:**

- Added `getBoundFieldIds()` function in `editor.tsx` to extract field IDs from the current draft layout
- Modified `runPrint()` to pass `fieldIds` and `sort` to the print API
- Updated `getBadgeBatch` router in `packages/api/routers/badges.ts` to accept optional `fieldIds` parameter (uses draft field IDs if provided, falls back to saved layout)
- Now the PDF correctly prints secondary lines for fields that are bound in the draft but not yet saved

### 2. Feature: PDF page ordering selector

**Added** in the Print section of the editor:

- Sort dropdown with 4 options:
    - **Nome (A-Z)** → `name_asc`
    - **Nome (Z-A)** → `name_desc`
    - **Inscritos (mais antigos primeiro)** → `joined_asc`
    - **Inscritos (mais recentes primeiro)** → `joined_desc`
- Updated `getBadgeBatch` router to accept `sort` parameter and apply proper ordering via SQL joins with the `user` table

### 3. Fix: QR code always square with proper resize anchoring

**Problem:** Default QR rect was rectangular (0.3 × 0.46), and resize behavior was incorrect when hitting bounds.

**Solution:**

- **`packages/badges/schema.ts`**: Changed default QR rect to square: `{ x: 0.35, y: 0.48, w: 0.3, h: 0.3 }`
- **`apps/web/app/dashboard/badges/canvas.tsx`**:
    - Render QR items as square in both the selection box and handles
    - Rewrote `resizeRect()` to properly maintain square aspect ratio even when hitting free area boundaries
    - **Anchoring behavior**: The QR now anchors on the opposite handle:
        - Dragging NE (top-right) handle → anchors SW (bottom-left) fixed
        - Dragging NW (top-left) handle → anchors SE (bottom-right) fixed
        - Dragging SE (bottom-right) handle → anchors NW (top-left) fixed
        - Dragging SW (bottom-left) handle → anchors NE (top-right) fixed
    - Maintains square aspect ratio even at bounds (previously it would become rectangular)

## Files Modified

1. `packages/badges/schema.ts` - Default QR square (line 185)
2. `apps/web/app/dashboard/badges/canvas.tsx` - QR square rendering + anchored resize logic
3. `apps/web/app/dashboard/badges/editor.tsx` - Sort selector + fieldIds passing
4. `packages/api/routers/badges.ts` - API accepts fieldIds + sort parameter
5. `packages/badges/pdf-writer.test.ts` - Updated test expectation for new square QR size

## Tests

All tests pass:

- `@verific/badges`: 53 tests passed
- `@verific/api`: 536 tests passed

## TypeScript

TypeScript compilation successful with no errors.
