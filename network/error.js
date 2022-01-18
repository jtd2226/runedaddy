export default class ErrorResponse {
  constructor(message, code) {
    this.error = new Error(message, code);
  }
}

export class ClientError {
  constructor({ code, message }) {
    this.message = message;
    this.code = code;
  }
}

class Error {
  constructor(message, code) {
    this.message = message;
    this.code = code;
  }
}
