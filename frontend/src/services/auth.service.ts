import type {
  LoginInput,
  LoginResponse,
} from "../../../shared/auth";

export async function login(
  input: LoginInput
): Promise<LoginResponse> {
  const email = input.email.trim();
  const password = input.password;

  if (!email) {
    return {
      success: false,
      error: "Email is required.",
    };
  }

  if (!password) {
    return {
      success: false,
      error: "Password is required.",
    };
  }

  try {
    return await window.desktopAPI.auth.login({
      email,
      password,
    });
  } catch (error) {
    console.error(
      "Login request failed:",
      error
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to login.",
    };
  }
}