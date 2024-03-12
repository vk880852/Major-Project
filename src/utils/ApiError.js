class ApiError extends Error {
    constructor(statuscode, message = "Something went wrong", errors = [], stack = "") {
        super(message); // Call super before using this
        this.statuscode = statuscode;
        this.errors = errors;
        this.message = message;
        this.success = false;
        this.data = null; // Removed the extra comma
        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export { ApiError };
