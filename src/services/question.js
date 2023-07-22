import { attachSubmissionAttributesToQuestion } from '@/helpers';
import {
  deleteAQuestion,
  findAllQuestions,
  findAndUpdateQuestion,
  findQuestion,
  getQuestionById,
  insertQuestion
} from '@/repository/question';
import { getOneSubmission, getSubmissions } from '@/repository/submission';

export const retrieveAllQuestions = async (user, query) => {
  const questions = await findAllQuestions(user, query);
  await Promise.all(
    (query.page ? questions.docs : questions).map((question) => {
      return attachSubmissionAttributesToQuestion(question);
    })
  );
  return questions;
};

export const createQuestion = (data, user) => {
  return insertQuestion({ ...data, creator: user._id });
};

export const retrieveQuestion = async (question_id, user) => {
  const result = await getQuestionById(question_id, user._id);
  if (result.length === 0)
    return {
      status: 400,
      message: "Question doesn't exist or you do not have permission to view this question"
    };
  return attachSubmissionAttributesToQuestion(result[0]);
};

export const updateQuestionById = async (question_id, data, user) => {
  const question = await findQuestion({ _id: question_id });
  if (!question) return { status: 400, message: "Question doesn't exist to update" };
  if (data.name) {
    const check = await findQuestion({ name: data.name });
    if (check && check._id?.toString() !== question_id?.toString())
      return { status: 400, message: 'Question name already taken' };
  }
  if (question.creator_lock && question.creator.toString() !== user._id.toString())
    return { status: 403, message: 'You are not authorized to update this question' };
  if (data.max_score) {
    const r = await getSubmissions({ filter: { question: question_id } }).then((res) => {
      return res;
    });
    if (r.totalDocs > 0) return { status: 400, message: 'Cannot update question with submissions' };
  }

  return findAndUpdateQuestion({ _id: question_id }, data);
};

export const deleteQuestion = async (question_id, user) => {
  const question = await findQuestion({ _id: question_id });
  const checkSubmission = await getOneSubmission({ question: question_id });

  if (question.enabled) {
    return { status: 400, message: 'Failed to delete question/ Question is active' };
  }

  if (checkSubmission) {
    return { status: 400, message: 'Failed to delete question/ Question already has a submission' };
  }

  if (!question) return { status: 400, message: "Question doesn't exist to remove" };
  if (question.creator_lock && question.creator.toString() !== user._id.toString())
    return { status: 403, message: 'You are not authorized to delete this question' };
  return deleteAQuestion({ _id: question_id });
};
