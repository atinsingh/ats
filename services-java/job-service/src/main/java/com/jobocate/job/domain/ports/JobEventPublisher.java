package com.jobocate.job.domain.ports;

import com.jobocate.job.domain.model.Job;

/**
 * Domain port for emitting job lifecycle events. Production implementation
 * writes to the {@code job_event_outbox} table inside the same DB
 * transaction; an out-of-process publisher drains the table to Kafka.
 */
public interface JobEventPublisher {

    void publishJobUpserted(Job job);

    void publishJobPublished(Job job);

    void publishJobUnpublished(Job job);

    void publishJobClosed(Job job);
}
