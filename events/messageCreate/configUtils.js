// configUtils.js
const getBotConnections = (discordThreadId) => {
    const mappings = {
        [process.env.MAIN_CHANNEL]: { assistantName: "AssistantID_Main", personality: "Personality_Main" },
        // Add other channel mappings here
    };
    return mappings[discordThreadId] || {}; // Default to an empty object if no match
};

const generateWebhookURL = (discordThreadId) => {
    const webhookMappings = {
        [process.env.MAIN_CHANNEL]: { webhookId: process.env.MAIN_WEBHOOK_ID, webhookToken: process.env.MAIN_WEBHOOK_TOKEN },
        // Add other webhook mappings here
    };
    return webhookMappings[discordThreadId] || {}; // Default to an empty object if no match
};

module.exports = { getBotConnections, generateWebhookURL };
