-- Aligns with ats-core-service seed tenant id
INSERT INTO jobs (id, tenant_id, title, description, status, location, employment_type, remote_policy)
VALUES
    (
        '22222222-2222-2222-2222-222222222201',
        '11111111-1111-1111-1111-111111111111',
        'Staff Backend Engineer',
        'Design event-driven search projections and ATS workflows across Java, Go, and OpenSearch.',
        'OPEN',
        'Remote (US)',
        'FULL_TIME',
        'REMOTE_FIRST'
    ),
    (
        '22222222-2222-2222-2222-222222222202',
        '11111111-1111-1111-1111-111111111111',
        'Product Designer',
        'Own recruiter experiences with mobile-first patterns and accessible UI systems.',
        'OPEN',
        'New York, NY',
        'FULL_TIME',
        'HYBRID'
    );
