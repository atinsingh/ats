package com.jobocate.application.api;

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

    public DeskReportController(DeskReportService service) {
        this.service = service;
    }

    @GetMapping("/desk")
    public DeskReport desk(@RequestParam(name = "days", defaultValue = "90") int days) {
        return service.report(days);
    }
}
