-- Replace illustrative baseline ratings with aggregates backed by actual review records.
UPDATE stayora.properties p
SET rating = COALESCE((SELECT round(avg(r.rating),2) FROM stayora.reviews r WHERE r.property_id=p.id),0),
    review_count = (SELECT count(*) FROM stayora.reviews r WHERE r.property_id=p.id);
