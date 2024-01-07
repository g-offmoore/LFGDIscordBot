const{Schema, model} = require('mongoose');

const itemSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  costMoonstone:{
    type: 'number',
    required: true,
  },
  costGold:{
    type: 'number',
    required: true,
  },
  requiredTier:{
    type: 'number',
    required: true,
  },
  description:{
    type: String,
    required: true,
    default: "Item description not found please search D&D sources",
  },
  qty:{
    type: 'number',
    required: true,
    default: 0,
  },
  attunement:{
    type: String,
    required: true,
  },  
});

module.exports = model('item', itemSchema);
