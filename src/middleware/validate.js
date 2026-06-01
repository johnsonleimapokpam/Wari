const ApiError = require('../utils/ApiError');

const validate = (schema) => {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query
    });

    if (!result.success) {
      return next(
        new ApiError(400, 'Validation failed', {
          code: 'VALIDATION_ERROR',
          details: result.error.errors
        })
      );
    }

    req.body = result.data.body;
    req.params = result.data.params;
    req.query = result.data.query;

    return next();
  };
};

module.exports = {
  validate
};
