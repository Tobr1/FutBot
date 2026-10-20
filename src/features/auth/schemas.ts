import { z } from "zod";

export const emailSchema = z
  .string({ error: "Ingresá tu email." })
  .trim()
  .toLowerCase()
  .max(254, "El email es demasiado largo.")
  .pipe(z.email("Ingresá un email válido."));

/** Debe coincidir con supabase/config.toml: mínimo 8, letras y números. */
export const passwordSchema = z
  .string({ error: "Ingresá una contraseña." })
  .min(8, "Usá al menos 8 caracteres.")
  .max(72, "Usá como máximo 72 caracteres.")
  .regex(/[a-zA-Z]/, "Incluí al menos una letra.")
  .regex(/\d/, "Incluí al menos un número.");

export const displayNameSchema = z
  .string({ error: "Ingresá tu nombre." })
  .trim()
  .min(2, "Usá al menos 2 caracteres.")
  .max(40, "Usá como máximo 40 caracteres.");

const nextSchema = z.string().trim().max(500).optional();

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string({ error: "Ingresá tu contraseña." }).min(1, "Ingresá tu contraseña."),
  next: nextSchema,
});

export const signUpSchema = z.object({
  displayName: displayNameSchema,
  email: emailSchema,
  password: passwordSchema,
  next: nextSchema,
});

export const resendConfirmationSchema = z.object({
  email: emailSchema,
  next: nextSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden.",
  });
