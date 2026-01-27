# Core Features

## Requirement 1: Keyword Notification System

**User Story:** As a group member, I want the bot to notify the group when specific keywords are mentioned, so that important topics like game names, events, or raid calls get highlighted and don't get lost in chat.

### Acceptance Criteria

1. WHEN a message containing a configured keyword is posted in the group chat, THE Keyword_Watcher SHALL detect the match within 2 seconds
2. WHEN a keyword match is detected, THE Notification_Service SHALL post a highlighted notification **in the same channel where the keyword was mentioned**
3. WHEN a group admin adds a new keyword to the group watch list, THE Bot SHALL confirm the addition and begin monitoring immediately
4. WHEN a group admin removes a keyword from the watch list, THE Bot SHALL confirm the removal and stop monitoring for that keyword
5. WHEN a user lists watched keywords, THE Bot SHALL display all currently configured keywords for the group
6. THE Keyword_Watcher SHALL support case-insensitive matching by default
7. WHERE a group admin configures case-sensitive matching for a keyword, THE Keyword_Watcher SHALL respect the case sensitivity setting
8. WHEN multiple keywords match a single message, THE Notification_Service SHALL send only one consolidated notification
9. IF the message author is the one who configured the keyword, THEN THE Notification_Service SHALL still notify the group (keywords are group-wide, not personal)
10. THE Bot SHALL support keyword patterns including exact words, phrases, and simple wildcards (e.g., "raid*" matches "raid", "raiding", "raids")
11. WHEN a keyword notification is triggered, THE Bot SHALL include the original message context, author, and matched keyword(s)
12. THE Bot SHALL support configuring a cooldown period per keyword to prevent notification spam

---

## Requirement 2: Game Statistics Lookup

**User Story:** As a group member, I want to look up game statistics for players who have linked their gaming accounts, so that we can discuss performance, celebrate achievements, and fuel friendly competition.

### Acceptance Criteria

1. WHEN a user requests stats for a game and player name, THE Platform_Connector SHALL retrieve and display relevant statistics to the group (only for users who have linked their accounts)
2. WHEN a user requests a stats comparison between two players, THE Bot SHALL display a side-by-side comparison in the group chat
3. THE Bot SHALL cache statistics data to reduce API calls and improve response time
4. WHEN cached data is older than the configured TTL (default: 15 minutes), THE Platform_Connector SHALL refresh the data on next request
5. IF statistics are unavailable for a game or player, THEN THE Bot SHALL inform the group which games and regions are supported
6. THE Bot SHALL format statistics in a readable, visually appealing manner suitable for the chat platform
7. WHEN displaying stats, THE Bot SHALL include the data freshness timestamp
8. THE Bot SHALL support statistics lookup for Steam platform (primary), with PlayStation Network and Xbox Live as future additions
9. WHEN a platform API is rate-limited, THE Bot SHALL inform the group and suggest trying again later
10. THE Bot SHALL only access statistics for users who have explicitly linked their gaming accounts and granted permission

---

## Requirement 3: Custom Group Commands

**User Story:** As a group admin, I want to create custom commands with predefined responses, so that our group can have shortcuts for frequently shared information like server IPs, voice channel links, or group rules.

### Acceptance Criteria

1. WHEN a group admin creates a custom command, THE Bot SHALL store the command trigger and response for that group
2. WHEN a user invokes a custom command, THE Bot SHALL respond with the configured message in the group chat
3. WHEN a group admin updates a custom command, THE Bot SHALL use the new response immediately
4. WHEN a group admin deletes a custom command, THE Bot SHALL stop responding to that trigger
5. WHEN a user lists custom commands, THE Bot SHALL display all available group commands with descriptions
6. THE Bot SHALL support variable substitution in command responses (e.g., {user} for invoking user, {date}, {time}, {group})
7. IF a custom command conflicts with a built-in command, THEN THE Bot SHALL reject the creation and suggest an alternative trigger
8. THE Bot SHALL support multi-line responses for custom commands
9. WHEN creating a command, THE Bot SHALL allow setting an optional description for the help listing
