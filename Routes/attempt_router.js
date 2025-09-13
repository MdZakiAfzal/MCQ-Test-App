const express = require('express');
const attemptController = require(`${__dirname}/../Controllers/attempt_controller`);
const authController = require(`${__dirname}/../Controllers/auth_controller`);
const { validateBody } = require(`${__dirname}/../utils/validate`);
const { submitAttemptSchema } = require(`${__dirname}/../validation/schemas`);

const router = express.Router();

router.use(authController.protect);
router.use(authController.restrictTo('student')); // only students can attempt

// Start test
router.post('/:testId/start', attemptController.startAttempt);

// Submit test (with validation)
router.post('/:testId/submit', validateBody(submitAttemptSchema), attemptController.submitAttempt);

// Past attempts
router.get('/past', attemptController.getPastAttempts);

module.exports = router;
