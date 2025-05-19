const axios = require('axios');
const { WebhookClient } = require('discord.js');

module.exports = async (client) => {
    memberID = client.user.id
    // console.log(JSON.stringify(client.user, null, 2)); 
    // console.log(`\n hit in new member action for ${client.user.id} \n`);
    
    const webhookClient = new WebhookClient({ id: process.env.webhookId_7, token: process.env.webhookToken_7 });

    
    const messagesPayload = [
        {
            role: 'user',
            content: "Welcome a new member! Remember to keep your message short but informative and invite them to introduce themselves."}
    ];

    const data = {
        model: process.env.testwelcomeModel,
        messages: messagesPayload,
        stream: false,
    };

    try {
        // Make the POST request
        const response = await axios.post('http://localhost:11434/api/chat', data, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

    
        const greeting = response?.data?.message?.content;

        console.log(`Response from Lucky!: ${greeting}\n\n`);

        // Send a welcome message mentioning the new member
        await webhookClient.send({ content: `Welcome <@${memberID}>! ${greeting}`});
    } catch (error) {
        console.error('Error sending welcome message:', error);
        await webhookClient.send({ content: `Hey <@${memberID}>!, welcome to Luck Factory Games! Please introduce yourself and tell us about your favorite games!`});
    }
};
