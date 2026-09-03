package com.splitwise.controller;

import com.splitwise.dto.ActivityDtos.ActivityItem;
import com.splitwise.security.AppUserDetails;
import com.splitwise.service.ActivityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups/{groupId}")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activityService;

    @GetMapping("/activity")
    public ResponseEntity<List<ActivityItem>> getGroupActivity(@AuthenticationPrincipal AppUserDetails currentUser,
                                                                  @PathVariable String groupId) {
        return ResponseEntity.ok(activityService.getGroupActivity(groupId, currentUser.getUserId()));
    }
}
