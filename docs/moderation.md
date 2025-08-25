# Moderation System Notes

- Auto-approve of secondary flags runs in-process via a worker loop. If the bot is offline, pending items will not be processed until it restarts. External monitoring is recommended for long outages.
- The bot requires the following permissions in all moderated channels: **Manage Webhooks**, **Manage Messages**, **Read Message History**, and **Send Messages**.
