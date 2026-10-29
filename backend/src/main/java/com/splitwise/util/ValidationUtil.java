package com.splitwise.util;

import com.splitwise.entity.GroupMember;
import com.splitwise.exception.ForbiddenException;

import java.util.List;

public class ValidationUtil {

    private ValidationUtil() {} // Utility class

    public static void requireMembership(List<GroupMember> members, String userId) {
        boolean isMember = members.stream().anyMatch(m -> m.getUser().getId().equals(userId));
        if (!isMember) {
            throw new ForbiddenException("You're not a member of this group");
        }
    }
}
