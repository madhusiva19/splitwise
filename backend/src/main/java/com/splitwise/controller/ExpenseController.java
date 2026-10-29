package com.splitwise.controller;

import com.splitwise.dto.ExpenseDtos.*;
import com.splitwise.security.AppUserDetails;
import com.splitwise.service.ExpenseReceiptService;
import com.splitwise.service.ExpenseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/groups/{groupId}")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService expenseService;
    private final ExpenseReceiptService expenseReceiptService;

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

    @PutMapping("/expenses/{expenseId}")
    public ResponseEntity<ExpenseResponse> updateExpense(@AuthenticationPrincipal AppUserDetails currentUser,
                                                           @PathVariable String groupId,
                                                           @PathVariable String expenseId,
                                                           @Valid @RequestBody UpdateExpenseRequest request) {
        return ResponseEntity.ok(expenseService.updateExpense(groupId, expenseId, currentUser.getUserId(), request));
    }

    @DeleteMapping("/expenses/{expenseId}")
    public ResponseEntity<Void> deleteExpense(@AuthenticationPrincipal AppUserDetails currentUser,
                                               @PathVariable String groupId,
                                               @PathVariable String expenseId) {
        expenseService.deleteExpense(groupId, expenseId, currentUser.getUserId());
        return ResponseEntity.noContent().build();
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

    @PostMapping("/settlements")
    public ResponseEntity<SettlementResponse> recordSettlement(@AuthenticationPrincipal AppUserDetails currentUser,
                                                                 @PathVariable String groupId,
                                                                 @Valid @RequestBody RecordSettlementRequest request) {
        return ResponseEntity.ok(expenseService.recordSettlement(groupId, currentUser.getUserId(), request));
    }

    @GetMapping("/settlements")
    public ResponseEntity<List<SettlementResponse>> listSettlements(@AuthenticationPrincipal AppUserDetails currentUser,
                                                                      @PathVariable String groupId) {
        return ResponseEntity.ok(expenseService.listSettlements(groupId, currentUser.getUserId()));
    }

    @PostMapping("/settlements/remind")
    public ResponseEntity<Void> remindSettlement(@AuthenticationPrincipal AppUserDetails currentUser,
                                                   @PathVariable String groupId,
                                                   @Valid @RequestBody RemindSettlementRequest request) {
        expenseService.sendSettlementReminder(groupId, currentUser.getUserId(), request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/categories/breakdown")
    public ResponseEntity<List<CategoryBreakdown>> getCategoryBreakdown(@AuthenticationPrincipal AppUserDetails currentUser,
                                                                          @PathVariable String groupId) {
        return ResponseEntity.ok(expenseService.getCategoryBreakdown(groupId, currentUser.getUserId()));
    }

    @GetMapping("/spending-trend")
    public ResponseEntity<SpendingTrendResponse> getSpendingTrend(@AuthenticationPrincipal AppUserDetails currentUser,
                                                                     @PathVariable String groupId) {
        return ResponseEntity.ok(expenseService.getSpendingTrend(groupId, currentUser.getUserId()));
    }

    @PostMapping(value = "/expenses/{expenseId}/receipt", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> uploadReceipt(@AuthenticationPrincipal AppUserDetails currentUser,
                                               @PathVariable String groupId,
                                               @PathVariable String expenseId,
                                               @RequestParam("file") MultipartFile file) {
        expenseReceiptService.uploadReceipt(groupId, expenseId, currentUser.getUserId(), file);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/expenses/{expenseId}/receipt")
    public ResponseEntity<byte[]> getReceipt(@AuthenticationPrincipal AppUserDetails currentUser,
                                              @PathVariable String groupId,
                                              @PathVariable String expenseId) {
        ExpenseReceiptService.ReceiptData receipt = expenseReceiptService.getReceipt(groupId, expenseId, currentUser.getUserId());
        org.springframework.http.ContentDisposition contentDisposition = org.springframework.http.ContentDisposition.builder("inline")
                .filename(receipt.fileName())
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(receipt.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition.toString())
                .body(receipt.data());
    }

    @DeleteMapping("/expenses/{expenseId}/receipt")
    public ResponseEntity<Void> deleteReceipt(@AuthenticationPrincipal AppUserDetails currentUser,
                                               @PathVariable String groupId,
                                               @PathVariable String expenseId) {
        expenseReceiptService.deleteReceipt(groupId, expenseId, currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }
}
