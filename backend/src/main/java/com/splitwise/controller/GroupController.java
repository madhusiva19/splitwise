package com.splitwise.controller;

import com.splitwise.dto.GroupDtos.*;
import com.splitwise.security.AppUserDetails;
import com.splitwise.service.GroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

    @PostMapping
    public ResponseEntity<GroupResponse> createGroup(@AuthenticationPrincipal AppUserDetails currentUser,
                                                       @Valid @RequestBody CreateGroupRequest request) {
        return ResponseEntity.ok(groupService.createGroup(currentUser.getUserId(), request));
    }

    @GetMapping
    public ResponseEntity<List<GroupSummaryResponse>> listMyGroups(@AuthenticationPrincipal AppUserDetails currentUser) {
        return ResponseEntity.ok(groupService.listMyGroups(currentUser.getUserId()));
    }

    @GetMapping("/{groupId}")
    public ResponseEntity<GroupResponse> getGroup(@AuthenticationPrincipal AppUserDetails currentUser,
                                                    @PathVariable String groupId) {
        return ResponseEntity.ok(groupService.getGroup(groupId, currentUser.getUserId()));
    }

    @PostMapping("/{groupId}/members")
    public ResponseEntity<GroupResponse> addMember(@AuthenticationPrincipal AppUserDetails currentUser,
                                                     @PathVariable String groupId,
                                                     @Valid @RequestBody AddMemberRequest request) {
        return ResponseEntity.ok(groupService.addMember(groupId, currentUser.getUserId(), request));
    }
}
