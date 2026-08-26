package com.splitwise.service;

import com.splitwise.dto.GroupDtos.*;
import com.splitwise.entity.Group;
import com.splitwise.entity.GroupMember;
import com.splitwise.entity.User;
import com.splitwise.exception.BadRequestException;
import com.splitwise.exception.ForbiddenException;
import com.splitwise.exception.ResourceNotFoundException;
import com.splitwise.repository.GroupMemberRepository;
import com.splitwise.repository.GroupRepository;
import com.splitwise.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;

    @Transactional
    public GroupResponse createGroup(String creatorUserId, CreateGroupRequest req) {
        User creator = userRepository.findById(creatorUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Group group = Group.builder()
                .name(req.name())
                .createdBy(creator)
                .build();
        group = groupRepository.save(group);

        GroupMember membership = GroupMember.builder()
                .group(group)
                .user(creator)
                .build();
        membership = groupMemberRepository.save(membership);

        return toGroupResponse(group, List.of(membership));
    }

    @Transactional(readOnly = true)
    public List<GroupSummaryResponse> listMyGroups(String userId) {
        return groupMemberRepository.findByUserId(userId).stream()
                .map(GroupMember::getGroup)
                .map(group -> new GroupSummaryResponse(
                        group.getId(),
                        group.getName(),
                        groupMemberRepository.findByGroupId(group.getId()).size(),
                        group.getCreatedAt()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public GroupResponse getGroup(String groupId, String requesterUserId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
        List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);

        requireMembership(members, requesterUserId);

        return toGroupResponse(group, members);
    }

    @Transactional
    public GroupResponse addMember(String groupId, String requesterUserId, AddMemberRequest req) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
        List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);

        requireMembership(members, requesterUserId);

        User invitee = userRepository.findByEmail(req.email())
                .orElseThrow(() -> new BadRequestException("No account found with this email — they need to sign up first"));

        boolean alreadyMember = members.stream().anyMatch(m -> m.getUser().getId().equals(invitee.getId()));
        if (alreadyMember) {
            throw new BadRequestException("This person is already a member of the group");
        }

        GroupMember membership = GroupMember.builder()
                .group(group)
                .user(invitee)
                .build();
        groupMemberRepository.save(membership);

        List<GroupMember> updatedMembers = groupMemberRepository.findByGroupId(groupId);
        return toGroupResponse(group, updatedMembers);
    }

    // Membership is the gate for all group access — a non-member can't view or modify a group they don't belong to.
    private void requireMembership(List<GroupMember> members, String userId) {
        boolean isMember = members.stream().anyMatch(m -> m.getUser().getId().equals(userId));
        if (!isMember) {
            throw new ForbiddenException("You're not a member of this group");
        }
    }

    private GroupResponse toGroupResponse(Group group, List<GroupMember> members) {
        List<MemberResponse> memberResponses = members.stream()
                .map(m -> new MemberResponse(m.getUser().getId(), m.getUser().getName(), m.getUser().getEmail()))
                .toList();

        return new GroupResponse(
                group.getId(),
                group.getName(),
                group.getCreatedBy().getId(),
                group.getCreatedBy().getName(),
                group.getCreatedAt(),
                memberResponses
        );
    }
}
