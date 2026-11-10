-- Adds demo salary ranges for search facet / filter demos (idempotent updates).
UPDATE jobs
SET
    salary_min_cents = 18000000,
    salary_max_cents = 22000000,
    currency_code = 'USD'
WHERE id = '22222222-2222-2222-2222-222222222201';

UPDATE jobs
SET
    salary_min_cents = 9000000,
    salary_max_cents = 12000000,
    currency_code = 'USD'
WHERE id = '22222222-2222-2222-2222-222222222202';
