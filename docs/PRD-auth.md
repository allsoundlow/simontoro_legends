# Authentication & Authorization

## Requirement 11: Multi-Tenant Administration

**User Story:** As a potential administrator, I want to register my account via the Telegram bot and create group configurations, so that I can manage my gaming community's bot independently from other administrators.

### Acceptance Criteria

1. THE System SHALL allow any person to register as an administrator by starting a private chat with the bot and using the `/register` command
2. WHEN an administrator registers, THE System SHALL create an isolated account linked to their Telegram user ID with no access to other administrators' data
3. WHEN an administrator creates a group configuration, THE System SHALL associate it exclusively with that administrator's account
4. THE System SHALL ensure that Administrator A cannot view, modify, or access any data belonging to Administrator B
5. WHEN an administrator interacts with the bot, THE System SHALL identify them by their Telegram user ID
6. THE System SHALL support multiple groups per administrator account
7. WHEN an administrator deletes their account via `/deleteaccount`, THE System SHALL remove all associated group configurations and data after confirmation
8. THE System SHALL provide audit logging of all administrative actions per administrator

---

## Requirement 12: Administrator Authentication (Telegram-Based)

**User Story:** As an administrator, I want to authenticate using my Telegram account, so that I don't need separate credentials and can manage everything through the chat interface.

### Acceptance Criteria

1. THE System SHALL authenticate administrators using their Telegram user ID — no separate login required
2. WHEN a user sends a command to the bot, THE System SHALL identify them by their Telegram user ID
3. THE System SHALL store administrator accounts linked to Telegram user IDs
4. WHEN an administrator sends admin commands in a group, THE System SHALL verify they are both a registered administrator AND have Telegram admin/moderator privileges in that group
5. THE System SHALL support session-less authentication — each command is authenticated independently via Telegram user ID
6. WHEN an administrator's Telegram account is deleted or deactivated, THE System SHALL retain their data but mark the account as inactive
7. THE System SHALL NOT store any passwords or credentials — Telegram handles all authentication

---

## Requirement 13: Telegram Account Connection

**User Story:** As an administrator, I want to connect my Telegram account to the system by registering with the bot, so that I can manage groups where I have admin privileges.

### Acceptance Criteria

1. THE Bot SHALL provide a `/register` command in private chat to register as an administrator
2. WHEN a user sends `/register`, THE System SHALL create an administrator account linked to their Telegram user ID
3. WHEN an administrator adds the bot to a group where they have admin privileges, THE System SHALL allow them to configure that group
4. THE System SHALL verify Telegram admin status in the group before allowing configuration changes
5. WHEN an administrator is demoted in a Telegram group, THE System SHALL revoke their configuration privileges for that group
6. THE System SHALL support one administrator account per Telegram user
7. WHEN an administrator uses `/unregister`, THE System SHALL disconnect their account and stop managing their groups after confirmation

---

## Requirement 14: Gaming Account Linking (Steam)

**User Story:** As a group member, I want to link my Steam account to the bot, so that my gaming statistics can be looked up by other group members.

### Acceptance Criteria

1. THE Bot SHALL be registered with Steam Web API and possess a valid API key for reading user data
2. WHEN a group member initiates Steam account linking via `/linksteam`, THE Bot SHALL guide them through the OAuth/authentication process
3. WHEN a Steam account is successfully linked, THE System SHALL store the Steam ID and access permissions for that user
4. THE Bot SHALL only access Steam data for users who have explicitly linked their accounts
5. WHEN a user unlinks their Steam account via `/unlinksteam`, THE System SHALL immediately revoke access and delete stored credentials
6. THE System SHALL display which gaming accounts are linked for each user (without exposing sensitive credentials)
7. WHEN requesting statistics, THE Bot SHALL verify the target user has linked their account before making API calls
8. THE System SHALL support linking multiple gaming platform accounts per user (Steam initially, PSN/Xbox in future)
9. WHEN a linked account's permissions are revoked externally, THE System SHALL detect this and notify the user to re-link
10. THE Bot SHALL respect Steam's privacy settings — if a user's profile is private, THE Bot SHALL inform the requester accordingly

---

## Authentication Architecture

### Overview

The system uses Telegram-based authentication — administrators register and authenticate directly through the bot using their Telegram account. No separate web authentication is required.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Authentication Layers                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Layer 1: Administrator Authentication (Telegram)                    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  • Registration via /register command in private chat        │    │
│  │  • Telegram user ID used as unique identifier                │    │
│  │  • NO passwords stored — Telegram handles authentication     │    │
│  │  • Each command authenticated via Telegram user ID           │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  Layer 2: Group Admin Verification                                  │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  • Bot checks Telegram admin status in group                 │    │
│  │  • Only group admins can configure bot for that group        │    │
│  │  • Admin status verified on each configuration command       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  Layer 3: Gaming Account Linking (Per User)                         │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  • Steam OpenID authentication                               │    │
│  │  • User grants permission for stats access                   │    │
│  │  • Steam ID stored, linked to Telegram user                  │    │
│  │  • Bot uses system API key to fetch allowed users' data      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Telegram-Based Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Administrator Registration Flow                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. User starts private chat with bot                               │
│                    │                                                 │
│                    ▼                                                 │
│  2. User sends /register command                                    │
│                    │                                                 │
│                    ▼                                                 │
│  3. Bot creates administrator account linked to Telegram user ID    │
│                    │                                                 │
│                    ▼                                                 │
│  4. Bot confirms registration and explains next steps               │
│                    │                                                 │
│                    ▼                                                 │
│  5. User adds bot to their Telegram group                           │
│                    │                                                 │
│                    ▼                                                 │
│  6. Bot verifies user has admin privileges in the group             │
│                    │                                                 │
│                    ▼                                                 │
│  7. User can now configure bot for that group via commands          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Multi-Tenant Data Isolation

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Multi-Tenant Architecture                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Administrator A                    Administrator B                  │
│  ┌─────────────────────┐           ┌─────────────────────┐          │
│  │ Telegram Account    │           │ Telegram Account    │          │
│  │ (user_id: 12345)    │           │ (user_id: 67890)    │          │
│  └─────────┬───────────┘           └─────────┬───────────┘          │
│            │                                  │                      │
│            ▼                                  ▼                      │
│  ┌─────────────────────┐           ┌─────────────────────┐          │
│  │ Groups              │           │ Groups              │          │
│  │ • Gaming Squad      │           │ • Pro Gamers        │          │
│  │ • Casual Crew       │           │ • Weekend Warriors  │          │
│  │                     │           │                     │          │
│  │ Keywords, Commands  │           │ Keywords, Commands  │          │
│  │ (isolated)          │           │ (isolated)          │          │
│  └─────────────────────┘           └─────────────────────┘          │
│                                                                      │
│  ════════════════════════════════════════════════════════════════   │
│                    COMPLETE DATA ISOLATION                           │
│         Admin A cannot see or access Admin B's data                  │
│  ════════════════════════════════════════════════════════════════   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Steam Account Linking Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Steam Account Linking Flow                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. User in Telegram group sends: /linksteam                        │
│                    │                                                 │
│                    ▼                                                 │
│  2. Bot responds with unique link: https://bot.example/steam/link   │
│                    │                                                 │
│                    ▼                                                 │
│  3. User clicks link → Redirected to Steam OpenID login             │
│                    │                                                 │
│                    ▼                                                 │
│  4. User authenticates with Steam                                   │
│                    │                                                 │
│                    ▼                                                 │
│  5. Steam returns Steam ID to bot callback                          │
│                    │                                                 │
│                    ▼                                                 │
│  6. Bot stores: Telegram User ID ↔ Steam ID mapping                 │
│                    │                                                 │
│                    ▼                                                 │
│  7. Bot confirms in Telegram: "Steam account linked! ✓"             │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Stats Lookup (after linking):                                      │
│                                                                      │
│  User A: /stats @UserB cs2                                          │
│                    │                                                 │
│                    ▼                                                 │
│  Bot checks: Is UserB's Steam linked? → Yes                         │
│                    │                                                 │
│                    ▼                                                 │
│  Bot uses SYSTEM API KEY to fetch UserB's CS2 stats from Steam      │
│                    │                                                 │
│                    ▼                                                 │
│  Bot displays stats in group chat                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```
