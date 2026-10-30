# Recipe-backed label preparation — 30 October 2026

## Audit finding and delivered behaviour

The previous kitchen-label route used five illustrative products, invented shelf-life offsets and a browser print action. The last safety fix marked that catalogue as samples. This phase replaces it with the signed-in organisation's actual recipe register in both editions.

- Page through recipes in groups of 100; no inaccessible records are fetched through a privileged key.
- Enter preparation and proposed use-by dates explicitly. Real calendar validation rejects impossible dates and use-by dates before preparation. No shelf life is inferred.
- Review the source recipe and recorded allergens. Flagged, malformed or foreign-organisation recipes cannot produce a draft. An empty allergen list is not an allergen-free claim.
- Changing a selection or date resets review. Permission checks and an immediate pending guard prevent unauthorised and duplicate print attempts.
- Before opening the print dialog, fetch the current recipe through the authenticated client. Deleted, changed, flagged or inaccessible records require renewed review. Account/workspace changes invalidate pending work.
- Print in a separate minimal document with recipe reference, proposed dates and the persistent DRAFT — NOT FOR FOOD USE notice. All recipe content uses DOM textContent, preventing stored markup from becoming executable print content.
- Read failures have a retry path and never masquerade as an empty register. Popup/verification failures have explicit feedback.
- German edition provides German/English interface copy; UK retains English-only active copy.

## Working boundary

This is a recipe-backed preparation and review workflow, not approval for an operational food label. It creates no label_prints record and does not claim that a physical printer succeeded. Existing historical database records are unchanged. The previous sample-history panel is replaced by this preparation flow.

## Still not built or not verified

1. Server-owned approved shelf-life rules and versioned label approvals.
2. Transactional approved-recipe/ingredient snapshots and complete PPDS/retail label content.
3. Physical printer acknowledgment, reprint audit, withdrawal and invalidation of labels after ingredient changes.
4. Physical printer/device and authenticated staging acceptance.
5. Hosted release reconciliation: the preceding audit found UK public health on a different release from main. This phase does not deploy the website.

## Verification

Behavioural tests execute the route component and helper code with an isolated data client: failed reads, exact source reread, changed/deleted/flagged recipes, account switching during lookup, duplicate clicks, permissions, invalid dates and inert markup in printed content. Full quality and fresh hosted browser/database/security workflows remain the release gates. Native source and dependencies are unchanged from the previous validated phase.
