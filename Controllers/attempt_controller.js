const Attempt = require(`${__dirname}/../Models/attempt_model`);
const Test = require(`${__dirname}/../Models/test_model`);
const AppError = require(`${__dirname}/../utils/appErrors`);
const catchAsync = require(`${__dirname}/../utils/catchAsync`);
const { getEndOfISTDay, formatToIST } = require(`${__dirname}/../utils/timeUtils`);

// Start Attempt
exports.startAttempt = catchAsync(async (req, res, next) => {
    const { testId } = req.params;
    const test = await Test.findById(testId);
    if (!test) return next(new AppError('Test not found', 404));

    const now = new Date();

    // Must be within test window
    if (now < test.startTime || now > test.endTime) {
        return next(new AppError('Test is not available right now', 400));
    }

    // Prevent duplicate attempts
    const existing = await Attempt.findOne({ student: req.user._id, test: testId });
    if (existing) {
        return next(new AppError('You have already started this test', 400));
    }

    const attempt = await Attempt.create({
        student: req.user._id,
        test: testId,
        answers: [],
        score: 0,
        startedAt: now
    });

    res.status(201).json({
        status: 'success',
        data: { 
            attemptId: attempt._id, 
            startedAt: attempt.startedAt,
            startedAtIST: formatToIST(attempt.startedAt)
        }
    });
});

// Submit Attempt
exports.submitAttempt = catchAsync(async (req, res, next) => {
    const { testId } = req.params;
    const { answers } = req.body;

    const attempt = await Attempt.findOne({ student: req.user._id, test: testId });
    if (!attempt) return next(new AppError('Start the test before submitting', 404));

    if (attempt.completed) {
        return next(new AppError('You have already submitted this test', 400));
    }

    const test = await Test.findById(testId);
    if (!test) return next(new AppError('Test not found', 404));

    // Enforce exam duration
    const expiresAt = new Date(attempt.startedAt.getTime() + test.examDuration * 60 * 1000);
    if (Date.now() > expiresAt) {
        return next(new AppError('Time is up! Cannot submit.', 400));
    }

    // ✅ Validate answers
    if (!Array.isArray(answers)) {
        return next(new AppError('Answers must be an array', 400));
    }

    const seen = new Set();
    for (const ans of answers) {
        if (typeof ans.questionId !== 'number' || ans.questionId < 0 || ans.questionId >= test.questions.length) {
            return next(new AppError(`Invalid questionId: ${ans.questionId}`, 400));
        }

        if (seen.has(ans.questionId)) {
            return next(new AppError(`Duplicate answer for question ${ans.questionId}`, 400));
        }
        seen.add(ans.questionId);

        if (ans.selectedOption !== null && ans.selectedOption !== undefined) {
            if (
                typeof ans.selectedOption !== 'number' ||
                ans.selectedOption < 0 ||
                ans.selectedOption >= test.questions[ans.questionId].options.length
            ) {
                return next(new AppError(`Invalid option for question ${ans.questionId}`, 400));
            }
        }
    }

    // Score calculation
    let score = 0;
    answers.forEach(ans => {
        const question = test.questions[ans.questionId];
        if (question && ans.selectedOption !== undefined && ans.selectedOption !== null) {
            if (question.correctAnswer === ans.selectedOption) {
                score++;
            }
        }
    });

    attempt.answers = answers;
    attempt.score = score;
    attempt.attemptedAt = new Date();
    attempt.completed = true;
    await attempt.save();

    // ✅ Use Map for O(1) lookups
    const answerMap = new Map(answers.map(a => [a.questionId, a.selectedOption]));
    const questionsWithAnswers = test.questions.map((q, idx) => ({
        questionId: idx,
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        studentAnswer: answerMap.get(idx) ?? null
    }));

    res.status(200).json({
        status: 'success',
        data: { 
            score, 
            questions: questionsWithAnswers,
            submittedAt: attempt.attemptedAt,
            submittedAtIST: formatToIST(attempt.attemptedAt)
        }
    });
});

// Past Attempts
exports.getPastAttempts = catchAsync(async (req, res, next) => {
  const attempts = await Attempt.find({ student: req.user._id, completed: true })
    .populate('test', 'title description questions examDuration startTime endTime');

  const pastTests = attempts.map(a => {
    if (!a.test) {
      return null; // skip if test was deleted
    }

    // ✅ Use Map for efficiency
    const answerMap = new Map(a.answers.map(ans => [ans.questionId, ans.selectedOption]));

    const questionsWithAnswers = a.test.questions.map((q, idx) => ({
      questionId: idx,
      questionText: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer,
      studentAnswer: answerMap.get(idx) ?? null
    }));

    return {
      test: {
        _id: a.test._id,
        title: a.test.title,
        description: a.test.description,
        questions: questionsWithAnswers,
        examDuration: a.test.examDuration,
        startTime: a.test.startTime,
        startTimeIST: formatToIST(a.test.startTime),
        endTime: a.test.endTime,
        endTimeIST: formatToIST(a.test.endTime)
      },
      score: a.score,
      attemptedAt: a.attemptedAt,
      attemptedAtIST: formatToIST(a.attemptedAt)
    };
  }).filter(Boolean); // remove nulls if test was deleted

  res.status(200).json({
    status: 'success',
    results: pastTests.length,
    data: { pastTests }
  });
});
