package com.splitwise.dto;

public class UserDtos {

    public record UserSearchResult(
            String id,
            String name,
            String email
    ) {}
}
