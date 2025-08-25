// moderation/autoApproveWorker.js
const redis = require('../utils/redis');
const getOrCreateWebhook = require('../utils/webhooks');

const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID || '983865514751320124';

module.exports = function startAutoApproveWorker(client) {
  setInterval(async () => {
    try {
      const now = Date.now();
      const ids = await redis.zRangeByScore('autoApproveQueue', 0, now);
      for (const id of ids) {
        const raw = await redis.get(`flag:${id}`);
        if (!raw) {
          await redis.zRem('autoApproveQueue', id);
          continue;
        }
        const flag = JSON.parse(raw);
        if (flag.status === 'pending' && flag.autoApproveAt && flag.autoApproveAt <= now) {
          flag.status = 'approved';
          await redis.set(`flag:${id}`, JSON.stringify(flag));
          await redis.zRem('autoApproveQueue', id);
          const channel = await client.channels.fetch(flag.channelId).catch(() => null);
          const hook = channel ? await getOrCreateWebhook(channel) : null;
          if (hook) await hook.send({ content: '✅ Auto-approved after 24h.', username: 'ModBotRelay' });
          const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
          const logHook = logChannel ? await getOrCreateWebhook(logChannel) : null;
          if (logHook) await logHook.send({ content: `Auto-approved message ${id}`, username: 'ModBot' });
        }
      }
    } catch (err) {
      console.error('Auto-approve worker error:', err);
    }
  }, 60 * 1000);
};
