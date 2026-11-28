package com.jobocate.application.api;

import com.jobocate.application.application.ActivityService;
import com.jobocate.application.application.ActivityService.ActivityEvent;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** The activity log for the Activity screen. Read-only; recruiter roles only, see SecurityConfig. */
@RestController
@RequestMapping("/api/v1/activity")
public class ActivityController {

    private final ActivityService service;

    public ActivityController(ActivityService service) {
        this.service = service;
    }

    @GetMapping
    public List<ActivityEvent> recent(@RequestParam(name = "limit", defaultValue = "200") int limit) {
        return service.recent(limit);
    }
}
