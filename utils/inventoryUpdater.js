/* eslint-disable no-inline-comments */
const cron = require('node-cron');
// const mongoose = require('mongoose');
const itemSchema = require('../models/item.js'); // Assuming this is your Mongoose model


// Scheduled task that runs at 2 AM EST on the first day of every month
// Note: The time needs to be adjusted to UTC based on EST and daylight saving time if applicable
cron.schedule('0 2 1 * *', async () => {
	try {
		const itemsToUpdate = await itemSchema.find({ qty: 0 });
		if (itemsToUpdate.length > 0) {
			// Define ranges for randomness
			const minItemsToAdd = 1; // Minimum number of items to add
			const maxItemsToAdd = 10; // Maximum number of items to add

			itemsToUpdate.forEach(async (item) => {
				// Generate a pseudo-random number of items to add within the specified range
				const qtyToAdd = Math.floor(Math.random() * (maxItemsToAdd - minItemsToAdd + 1)) + minItemsToAdd;
				item.qty += qtyToAdd; // Update the quantity
				await item.save(); // Save the updated item back to the database
			});

			console.log(`Inventory updated for ${itemsToUpdate.length} items.`);
		}
		else {
			console.log('No items with 0 inventory found.');
		}
	}
	catch (error) {
		console.error('Error updating inventory:', error);
	}
}, {
	scheduled: true,
	timezone: 'America/New_York', // This ensures the time is based on EST
});

// Reminder: Adjust the cron pattern if daylight saving time affects the desired execution time
