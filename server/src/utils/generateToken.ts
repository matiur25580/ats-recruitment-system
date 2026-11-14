/*
 * LEARNING NOTE: JWT helper: signs the account ID so protected requests can identify the user without exposing a password.
 * Interview tip: describe the input, validation, side effects, and failure path.
 */
import jwt from 'jsonwebtoken';

// Sign only the user ID into a time-limited token; clients send it as a Bearer credential.
const generateToken = (userId: string) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET as string, {
    expiresIn: '30d',
  });
};

export default generateToken;
