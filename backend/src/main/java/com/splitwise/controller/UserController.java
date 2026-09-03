package com.splitwise.controller;

import com.splitwise.dto.UserDtos.UserSearchResult;
import com.splitwise.security.AppUserDetails;
import com.splitwise.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/search")
    public ResponseEntity<List<UserSearchResult>> searchUsers(@AuthenticationPrincipal AppUserDetails currentUser,
                                                                 @RequestParam String q) {
        return ResponseEntity.ok(userService.searchUsers(q, currentUser.getUserId()));
    }
}
