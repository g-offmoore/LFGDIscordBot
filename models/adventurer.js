const{Schema, model} = require('mongoose');

const adventurer = new Schema({
    moonstones: {
        type: 'number',
        default: 10,

    },
    gold: {
        type: 'number',
        default: 5000,
    },
    userid: {
        type: String,
        required: true,
      }
});

module.exports = model('adventurer', adventurer);