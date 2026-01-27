# Authentication & Authorization

## Requirement 11: Multi-Tenant Administration

**User Story:** As a potential administrator, I want to register my own account and create group configurations, so that I can manage my gaming community's bot independently from other administrators.

### Acceptance Criteria

1. THE System SHALL allow any person to register as an administrator through the Admin_Dashboard
2. WHEN an administrator registers, THE System SHALL create an isolated account with no access to other administrators' data
3. WHEN an administrator creates a group configuration, THE System SHALL associate it exclusively with that administrator's account
4. THE System SHALL ensure that Administrator A cannot view, modify, or access any data belonging to Administrator B
5. WHEN an administrator logs into the Admin_Dashboard, THE System SHALL display only their own groups and configurations
6. THE System SHALL support multiple groups per administrator account
7. WHEN an administrator deletes their account, THE System SHALL remove all associated group configurations and data
8. THE System SHALL provide audit logging of all administrative actions per administrator

---

## Requirement 12: Administrator Authentication (Auth0)

**User Story:** As an administrator, I want to securely log into the admin dashboard using Auth0, so that I don't need to manage separate credentials and can use my existing social accounts.

### Acceptance Criteria

1. THE Admin_Dashboard SHALL integrate with [Auth0](https://auth0.com/) for administrator authentication
2. THE System SHALL delegate all authentication and password management to Auth0 — no passwords stored in the system
3. WHEN an administrator accesses the dashboard, THE System SHALL redirect to Auth0's Universal Login page
4. Auth0 SHALL support multiple identity providers (Google, GitHub, email/password) as configured in the Auth0 tenant
5. WHEN an administrator successfully authenticates via Auth0, THE System SHALL create or retrieve their administrator account using the Auth0 user ID
6. THE System SHALL validate Auth0 JWT tokens on each API request
7. WHEN an Auth0 session expires, THE Admin_Dashboard SHALL redirect the administrator to re-authenticate
8. THE System SHALL support session management with configurable timeout (aligned with Auth0 token expiration)
9. WHEN an administrator logs out, THE System SHALL invalidate the session and redirect to Auth0 logout endpoint
10. THE System SHALL store only the Auth0 user ID and profile information (name, email) — never credentials

---

## Requirement 13: Telegram Group Connection

**User Story:** As an administrator, I want to connect my Telegram account to the system, so that the bot can access and monitor my group chats.

### Acceptance Criteria

1. THE Admin_Dashboard SHALL provide a mechanism to connect to Telegram via QR code scan or phone number verification
2. WHEN an administrator initiates Telegram connection, THE System SHALL display a QR code for the Telegram app to scan
3. WHEN the QR code is scanned successfully, THE System SHALL establish a Telegram_Session for that administrator
4. THE System SHALL securely store the Telegram_Session credentials for persistent access
5. WHEN a Telegram_Session is established, THE Admin_Dashboard SHALL display the administrator's available Telegram groups
6. THE Administrator SHALL be able to select which Telegram groups to enable bot functionality for
7. WHEN a Telegram_Session expires or is revoked, THE System SHALL notify the administrator and request re-authentication
8. THE System SHALL support multiple Telegram accounts per administrator (for managing different communities)
9. WHEN an administrator disconnects a Telegram account, THE System SHALL stop monitoring associated groups and remove the session

---

## Requirement 14: Gaming Account Linking (Steam)

**User Story:** As a group member, I want to link my Steam account to the bot, so that my gaming statistics can be looked up by other group members.

### Acceptance Criteria

1. THE Bot SHALL be registered with Steam Web API and possess a valid API key for reading user data
2. WHEN a group member initiates Steam account linking, THE Bot SHALL guide them through the OAuth/authentication process
3. WHEN a Steam account is successfully linked, THE System SHALL store the Steam ID and access permissions for that user
4. THE Bot SHALL only access Steam data for users who have explicitly linked their accounts
5. WHEN a user unlinks their Steam account, THE System SHALL immediately revoke access and delete stored credentials
6. THE System SHALL display which gaming accounts are linked for each user (without exposing sensitive credentials)
7. WHEN requesting statistics, THE Bot SHALL verify the target user has linked their account before making API calls
8. THE System SHALL support linking multiple gaming platform accounts per user (Steam initially, PSN/Xbox in future)
9. WHEN a linked account's permissions are revoked externally, THE System SHALL detect this and notify the user to re-link
10. THE Bot SHALL respect Steam's privacy settings — if a user's profile is private, THE Bot SHALL inform the requester accordingly

---

## Authentication Architecture

### Overview

The system uses a layered authentication approach with Auth0 handling all credential management:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Authentication Layers                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Layer 1: Admin Dashboard Authentication (Auth0)                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  • Auth0 Universal Login (https://auth0.com/)                │    │
│  │  • Supports Google, GitHub, email/password via Auth0         │    │
│  │  • JWT tokens validated on each request                      │    │
│  │  • NO passwords stored in our system                         │    │
│  │  • Only Auth0 user ID and profile info stored                │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  Layer 2: Telegram Connection (QR/Phone)                            │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  • QR code scan via Telegram app                             │    │
│  │  • Phone number + verification code fallback                 │    │
│  │  • Telegram session stored securely (encrypted)              │    │
│  │  • Access to admin's Telegram groups                         │    │
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

### Auth0 Integration Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Auth0 Authentication Flow                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Admin visits Admin Dashboard                                    │
│                    │                                                 │
│                    ▼                                                 │
│  2. Dashboard redirects to Auth0 Universal Login                    │
│     (https://YOUR_DOMAIN.auth0.com/authorize)                       │
│                    │                                                 │
│                    ▼                                                 │
│  3. Admin chooses login method (Google, GitHub, email/password)     │
│     All handled by Auth0 — our system never sees credentials        │
│                    │                                                 │
│                    ▼                                                 │
│  4. Auth0 authenticates and returns JWT tokens                      │
│     (access_token, id_token, refresh_token)                         │
│                    │                                                 │
│                    ▼                                                 │
│  5. Dashboard stores tokens, redirects to app                       │
│                    │                                                 │
│                    ▼                                                 │
│  6. API validates JWT on each request using Auth0 public keys       │
│                    │                                                 │
│                    ▼                                                 │
│  7. System creates/retrieves admin account using Auth0 user ID      │
│     (sub claim from JWT)                                            │
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
│  │ OAuth Account       │           │ OAuth Account       │          │
│  │ (Google: a@mail)    │           │ (GitHub: user_b)    │          │
│  └─────────┬───────────┘           └─────────┬───────────┘          │
│            │                                  │                      │
│            ▼                                  ▼                      │
│  ┌─────────────────────┐           ┌─────────────────────┐          │
│  │ Telegram Sessions   │           │ Telegram Sessions   │          │
│  │ • +1234567890       │           │ • +0987654321       │          │
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
