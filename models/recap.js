const { Schema, model } = require('mongoose');
const { randomUUID } = require('crypto');

const recapSchema = new Schema({
	recapId: {
		type: String,
		default: randomUUID,
	},
	authorId: {
		type: String,
		required: true,
	},
	guildId: {
		type: String,
		required: true,
	},
	messageId: {
		type: String,
		required: true,
	},
	content: {
		type: String,
		required: true,
	},
	status: {
		type: String,
		default: 'pending',
	},
	upvotes: {
		type: [String],
		default: [],
	},
	downvotes: {
		type: [String],
		default: [],
	},
}, { timestamps: true });


module.exports = model('recap', recapSchema);