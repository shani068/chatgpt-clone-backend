// import prisma from "../../config/database.config";
// import { ApiError } from "../../utils/ApiError";
// import { env } from "../../config/env.config";

// interface RegisterInput { name: string; email: string; password: string; }
// interface LoginInput    { email: string; password: string; }

// export const register = async ({ name, email, password }: RegisterInput) => {
//   const existing = await prisma.user.findUnique({ where: { email } });
//   if (existing) throw new ApiError(409, "Email already in use");

//   const hashed = await bcrypt.hash(password, 10);

//   return prisma.user.create({
//     data:   { name, email, password: hashed },
//     select: { id: true, name: true, email: true, createdAt: true },
//   });
// };

// export const login = async ({ email, password }: LoginInput) => {
//   const user = await prisma.user.findUnique({ where: { email } });
//   if (!user) throw new ApiError(401, "Invalid credentials");

//   const isMatch = await bcrypt.compare(password, user.password);
//   if (!isMatch) throw new ApiError(401, "Invalid credentials");

//   const token = jwt.sign(
//     { id: user.id, email: user.email },
//     env.JWT_SECRET,
//     { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] }
//   );

//   return { token, user: { id: user.id, name: user.name, email: user.email } };
// };
