package com.splitwise.repository;

import com.splitwise.entity.GroupMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GroupMemberRepository extends JpaRepository<GroupMember, String> {
    List<GroupMember> findByGroupId(String groupId);
    List<GroupMember> findByUserId(String userId);
    boolean existsByGroupIdAndUserId(String groupId, String userId);
}
