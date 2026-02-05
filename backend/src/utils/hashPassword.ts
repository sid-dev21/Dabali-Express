import bcrypt from 'bcryptjs';

// Function to hash a password

 
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10); // Generate a "salt" with 10 rounds
  return bcrypt.hash(password, salt); // Hash the password with the generated salt
};

// Function to compare a password with a hashed password

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};