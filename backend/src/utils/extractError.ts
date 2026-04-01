export const extractCatchMsg = (error: unknown) => {
  if (error instanceof Error) {
    return `Error: ${error.message}${error.cause ? `, Cause: ${error.cause}` : ""}`;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return error === undefined || error === null
    ? "An unknown error occurred. Please try again."
    : String(error);
};

