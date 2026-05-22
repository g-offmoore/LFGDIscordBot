# Moderation System Notes

- Auto-approve of secondary flags runs in-process via a worker loop. If the bot is offline, pending items will not be processed until it restarts. External monitoring is recommended for long outages.
- The bot requires the following permissions in all moderated channels: **Manage Webhooks**, **Manage Messages**, **Read Message History**, and **Send Messages**.
- Rules with `action: auto_ban` delete the matched message, ban the author when Discord permissions allow it, update the Redis flag record, and write an audit embed to the moderation log channel without creating a review button prompt.
