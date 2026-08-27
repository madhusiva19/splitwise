package com.splitwise.controller;

import com.splitwise.dto.NotificationDtos.*;
import com.splitwise.security.AppUserDetails;
import com.splitwise.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> listMine(@AuthenticationPrincipal AppUserDetails currentUser) {
        return ResponseEntity.ok(notificationService.listForUser(currentUser.getUserId()));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<UnreadCountResponse> getUnreadCount(@AuthenticationPrincipal AppUserDetails currentUser) {
        return ResponseEntity.ok(notificationService.getUnreadCount(currentUser.getUserId()));
    }

    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<Void> markAsRead(@AuthenticationPrincipal AppUserDetails currentUser,
                                            @PathVariable String notificationId) {
        notificationService.markAsRead(notificationId, currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(@AuthenticationPrincipal AppUserDetails currentUser) {
        notificationService.markAllAsRead(currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }
}
