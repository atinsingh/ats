package com.jobocate.application.api;

import com.jobocate.application.application.DeskMetricsService;
import com.jobocate.application.application.DeskMetricsService.DeskMetrics;
import com.jobocate.application.application.DeskReportService;
import com.jobocate.application.application.DeskReportService.DeskReport;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** The desk report for the Reports screen. Read-only; recruiter roles only, see SecurityConfig. */
@RestController
@RequestMapping("/api/v1/reports")
public class DeskReportController {

    private final DeskReportService service;
    private final DeskMetricsService desks;

    public DeskReportController(DeskReportService service, DeskMetricsService desks) {
        this.service = service;
        this.desks = desks;
    }

    /** Per-desk counts and cross-desk duplicate submittals, for the Agency view. */
    @GetMapping("/desks")
    public DeskMetrics desks(@RequestParam(name = "days", defaultValue = "7") int days) {
        return desks.metrics(days);
    }

    @GetMapping("/desk")
    public DeskReport desk(@RequestParam(name = "days", defaultValue = "90") int days) {
        return service.report(days);
    }
}
