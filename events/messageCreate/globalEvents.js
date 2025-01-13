const axios = require('axios');
const logger = require('../../utils/logger.js');

module.exports = async (message) => {
    // Ignore bot messages or empty content
    if (message.author.bot || message.content.trim() === '') return;

    // Define the global updates channel
    const globalUpdatesChannelId = process.env.GlobalUpdatesChannel; // Must be set in .env

    // Check if the message is in the global updates channel
    if (message.channel.id === globalUpdatesChannelId) {
        try {
            console.log('Running global events forwarding logic...');
            
            // Prepare the event data
            const eventMessage = {
                content: message.content,
                author: message.author.username,
                timestamp: new Date().toISOString(),
            };

            // Consider using your domain or localhost if it's the same machine
            const backendUrl = `http://172.105.157.110:${process.env.PORT || 3000}/globalEvents`;

            // Send the message to the Express backend
            await axios.post(backendUrl, eventMessage);

            console.log(`Successfully sent global event: ${eventMessage.content}`);
        } catch (error) {
            logger.error(`Failed to send global event: ${error.message}`);
            console.error(`Error sending global event:`, error);
        }
    }
};
