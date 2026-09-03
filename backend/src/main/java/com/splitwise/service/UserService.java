package com.splitwise.service;

import com.splitwise.dto.UserDtos.UserSearchResult;
import com.splitwise.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final int MIN_QUERY_LENGTH = 2;

    private final UserRepository userRepository;

    // Requires a minimum query length so a near-empty query doesn't dump the whole user table
    // to whoever's typing in the "add member" search box.
    @Transactional(readOnly = true)
    public List<UserSearchResult> searchUsers(String query, String requesterUserId) {
        String q = query == null ? "" : query.trim();
        if (q.length() < MIN_QUERY_LENGTH) {
            return List.of();
        }

        return userRepository.findTop10ByNameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrderByNameAsc(q, q).stream()
                .filter(u -> !u.getId().equals(requesterUserId))
                .map(u -> new UserSearchResult(u.getId(), u.getName(), u.getEmail()))
                .toList();
    }
}
