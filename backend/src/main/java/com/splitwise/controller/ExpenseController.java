package com.splitwise.controller;

import com.splitwise.dto.ExpenseDtos.*;
import com.splitwise.security.AppUserDetails;
import com.splitwise.service.ExpenseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups/{groupId}")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService expenseService;

    @PostMapping("/expenses")
    public ResponseEntity<ExpenseResponse> createExpense(@AuthenticationPrincipal AppUserDetails currentUser,
                                                           @PathVariable String groupId,
                                                           @Valid @RequestBody CreateExpenseRequest request) {
        return ResponseEntity.ok(expenseService.createExpense(groupId, currentUser.getUserId(), request));
    }

    @GetMapping("/expenses")
    public ResponseEntity<List<ExpenseResponse>> listGroupExpenses(@AuthenticationPrincipal AppUserDetails currentUser,
                                                                     @PathVariable String groupId) {
        return ResponseEntity.ok(expenseService.listGroupExpenses(groupId, currentUser.getUserId()));
    }

    @GetMapping("/balances")
    public ResponseEntity<List<BalanceResponse>> getGroupBalances(@AuthenticationPrincipal AppUserDetails currentUser,
                                                                    @PathVariable String groupId) {
        return ResponseEntity.ok(expenseService.getGroupBalances(groupId, currentUser.getUserId()));
    }

    @GetMapping("/settlements/suggestions")
    public ResponseEntity<List<SettlementSuggestion>> suggestSettlements(@AuthenticationPrincipal AppUserDetails currentUser,
                                                                          @PathVariable String groupId) {
        return ResponseEntity.ok(expenseService.suggestSettlements(groupId, currentUser.getUserId()));
    }
}
