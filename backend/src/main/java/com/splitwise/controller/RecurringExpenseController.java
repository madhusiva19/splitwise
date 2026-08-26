package com.splitwise.controller;

import com.splitwise.dto.RecurringExpenseDtos.CreateRecurringExpenseRequest;
import com.splitwise.dto.RecurringExpenseDtos.RecurringExpenseResponse;
import com.splitwise.security.AppUserDetails;
import com.splitwise.service.RecurringExpenseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups/{groupId}/recurring-expenses")
@RequiredArgsConstructor
public class RecurringExpenseController {

    private final RecurringExpenseService recurringExpenseService;

    @PostMapping
    public ResponseEntity<RecurringExpenseResponse> createRecurringExpense(@AuthenticationPrincipal AppUserDetails currentUser,
                                                                             @PathVariable String groupId,
                                                                             @Valid @RequestBody CreateRecurringExpenseRequest request) {
        return ResponseEntity.ok(recurringExpenseService.createTemplate(groupId, currentUser.getUserId(), request));
    }

    @GetMapping
    public ResponseEntity<List<RecurringExpenseResponse>> listRecurringExpenses(@AuthenticationPrincipal AppUserDetails currentUser,
                                                                                  @PathVariable String groupId) {
        return ResponseEntity.ok(recurringExpenseService.listTemplates(groupId, currentUser.getUserId()));
    }

    @DeleteMapping("/{templateId}")
    public ResponseEntity<Void> deactivateRecurringExpense(@AuthenticationPrincipal AppUserDetails currentUser,
                                                             @PathVariable String groupId,
                                                             @PathVariable String templateId) {
        recurringExpenseService.deactivateTemplate(templateId, currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }
}
