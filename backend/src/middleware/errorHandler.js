function errorHandler(err, req, res, next) {
  console.error(`[Error] ${err.name || 'Error'}: ${err.message}`);

  const statusCode = err.statusCode || (err.name === 'ValidationError' ? 400 : err.name === 'ConcurrencyError' ? 409 : err.name === 'ImmutabilityError' ? 403 : 500);

  const response = {
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred on the server.',
  };

  if (err.expectedVersion !== undefined) {
    response.expectedVersion = err.expectedVersion;
    response.currentVersion = err.currentVersion;
  }

  if (err.brokenAtVersion !== undefined) {
    response.brokenAtVersion = err.brokenAtVersion;
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
