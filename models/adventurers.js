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
      },
    tier: {
        type: 'number',
        required: true,
    },
    items: [
        {
          name: String,
          quantity: { type: Number, default: 0 },
        },
      ],
      transactions: [{}],
});
    // transactions: [
    //     {
    //         type: String,
    //         item: {
    //             name: String,
    //             costGold: Number,
    //             costMoonstone: Number,
    //         },
    //         quantity: Number,
    //         timestamp: { type: Date, default: Date.now },
    //     },
    // ],

module.exports = model('adventurer', adventurer);