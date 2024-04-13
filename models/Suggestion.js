const { Schema, model } = require('mongoose');
const { randomUUID } = require('crypto');

const suggestionSchema = new Schema({
	suggestionId: {
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
	developerNotes: {
		type: String, default: '',
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


module.exports = model('Suggestion', suggestionSchema);