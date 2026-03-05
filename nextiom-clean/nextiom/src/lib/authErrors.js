export const AUTH_ERRORS = {
  INVALID_LOGIN: "Invalid email or password. Please check your credentials and try again.",
  USER_NOT_FOUND: "No account found with this email address.",
  WRONG_PASSWORD: "The password you entered is incorrect.",
  EMAIL_IN_USE: "This email address is already registered. Please sign in instead.",
  WEAK_PASSWORD: "Password must be at least 8 characters and include uppercase, number, and special character.",
  PASSWORD_MISMATCH: "Passwords do not match.",
  SESSION_EXPIRED: "Your session has expired. Please log in again.",
  NETWORK_ERROR: "Network error. Please check your internet connection.",
  UNAUTHORIZED: "You do not have permission to access this area.",
  GENERIC_ERROR: "An unexpected error occurred. Please try again later."
};

export const getFriendlyErrorMessage = (error) => {
  if (!error) return AUTH_ERRORS.GENERIC_ERROR;
  
  const message = error.message || error.toString();
  
  // Map Supabase specific errors to friendly messages
  if (message.includes("Invalid login credentials")) return AUTH_ERRORS.INVALID_LOGIN;
  if (message.includes("User not found")) return AUTH_ERRORS.USER_NOT_FOUND;
  if (message.includes("already registered")) return AUTH_ERRORS.EMAIL_IN_USE;
  if (message.includes("Failed to fetch")) return AUTH_ERRORS.NETWORK_ERROR;
  if (message.includes("network")) return AUTH_ERRORS.NETWORK_ERROR;
  
  return message;
};