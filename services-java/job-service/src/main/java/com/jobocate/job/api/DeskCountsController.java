package com.jobocate.job.api;

import com.jobocate.job.application.DeskCountsService;
import com.jobocate.job.application.DeskCountsService.DeskCountsReport;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Open roles and new clients by desk for the Agency view. Recruiter roles only. */
@RestController
@RequestMapping("/api/v1/reports/desk-roles")
public class DeskCountsController {

    private final DeskCountsService desks;

    public DeskCountsController(DeskCountsService desks) {
        this.desks = desks;
    }

    @GetMapping
    public DeskCountsReport desks(@RequestParam(name = "days", defaultValue = "7") int days) {
        return desks.counts(days);
    }
}
