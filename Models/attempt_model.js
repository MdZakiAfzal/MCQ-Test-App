const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
    student: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    test: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Test', 
        required: true 
    },
    answers: [
        {
            questionId: {  // index in test.questions[]
                type: Number, 
                required: true 
            }, 
            selectedOption: {
                type: Number, 
                required: true 
            }
        }
    ],
    score: { 
        type: Number
    },
    startedAt: {              
        type: Date,
        default: Date.now
    },
    attemptedAt: { 
        type: Date, 
        default: Date.now 
    },
    completed: { 
        type: Boolean, 
        default: false 
    }
});

module.exports = mongoose.model('Attempt', attemptSchema);
