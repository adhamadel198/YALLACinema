-- Resale purchase outcomes added after 005_resale.sql (data/resale.ts). No constraint lists the values, so
-- this file only documents them and adds an index; like every schema file it runs again on each start.
--
-- resale_sales.status also takes:
--   'transferring'         paid, and the cinema is asked to transfer the tickets. If the purchase stops here,
--                          the cinema may have moved them, so they are blocked rather than put back on sale.
--   'refund-failed'        the cinema transferred nothing, but refunding the buyer failed: refund payment_ref by hand.
--   'needs-reconciliation' the cinema transferred the tickets, or may have, but the sale wasn't completed;
--                          `failure` says why and whether the buyer's refund went through.
-- tickets.status and resale_listing_tickets.state also take 'under-review': the seller's ticket from a
-- 'needs-reconciliation' sale, unusable and off sale until support settles it with the cinema.

-- releaseStale looks for purchases stuck while transferring on every swept request (005 indexes 'reserved').
CREATE INDEX IF NOT EXISTS resale_sales_transferring ON resale_sales (updated_at) WHERE status = 'transferring';
