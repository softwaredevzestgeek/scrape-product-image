// firebaseErrorUtils.ts

/**
 * Converts Firebase auth error codes to user-friendly error messages
 * @param error - The Firebase error object
 * @param isSignUp - Whether the error occurred during sign up (for contextual messages)
 * @returns A human-readable error message
 */
export const getFirebaseErrorMessage = (
  error: any,
  isSignUp: boolean = false
): string => {
  // Extract error code from Firebase error
  const errorCode = error.code || ""

  // Map Firebase error codes to human-readable messages
  switch (errorCode) {
    case "auth/weak-password":
      return "Password is too weak. Please use at least 6 characters."
    case "auth/email-already-in-use":
      return "This email is already registered. Please use a different email or sign in."
    case "auth/invalid-email":
      return "Invalid email address. Please enter a valid email."
    case "auth/user-not-found":
      return "No account found with this email. Please check your email or create an account."
    case "auth/wrong-password":
      return "Incorrect password. Please check your password or use the reset password option."
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later or reset your password."
    case "auth/invalid-credential":
      return "Invalid login credentials. Please check your email and password."
    case "auth/operation-not-allowed":
      return "This login method is not enabled. Please contact support."
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support."
    case "auth/missing-password":
      return "Please enter a password."
    default:
      return isSignUp
        ? "Sign up failed. Please try again."
        : "Login failed. Please try again."
  }
}
