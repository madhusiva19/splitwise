package com.splitwise.controller;

import com.splitwise.dto.NotificationDtos.*;
import com.splitwise.security.AppUserDetails;
import com.splitwise.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

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

    // Native EventSource can't send an Authorization header, so the frontend connects with
    // fetch + a manual stream reader instead — same Bearer-token auth as every other endpoint,
    // no token-in-URL needed.
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@AuthenticationPrincipal AppUserDetails currentUser) {
        return notificationService.subscribe(currentUser.getUserId());
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
