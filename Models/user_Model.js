const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const validator = require('validator');

const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'User must have a name'] 
    },
    email: { 
        type: String, 
        unique: true, 
        required: [true, 'User must have an email'],
        lowercase: true,
        validate: [validator.isEmail, 'Please enter a valid email address'] 
    },
    password:{
        type: String,
        required: [true, 'User must have a password'],
        minlength: 8,
        select: false
    },
    confirmPassword:{
        type: String,
        required: [true, 'User must confirm password'],
        //this only works for "create or save" and not for update
        validate:{
            validator: function(val){
                return val === this.password;
            },
            message: 'Passwords do not match'
        }
    },
    role: { 
        type: String, 
        enum: ['student', 'teacher', 'admin'], 
        default: 'student' 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    passwordChangedAt: Date,
});

// Encrypt password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    this.password = await bcrypt.hash(this.password, 12);
    this.confirmPassword = undefined;
    next();
});

// Compare entered password with hashed one
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

module.exports = mongoose.model('User', userSchema);