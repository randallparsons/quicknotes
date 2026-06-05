ALTER TABLE hyper_items
ADD COLUMN sort_order INT DEFAULT 0;
UPDATE hyper_items h
    JOIN (
        SELECT id,
            ROW_NUMBER() OVER (
                PARTITION BY user_id,
                parent_id
                ORDER BY created_at ASC,
                    id ASC
            ) AS new_order
        FROM hyper_items
    ) ordered_items ON h.id = ordered_items.id
SET h.sort_order = ordered_items.new_order;