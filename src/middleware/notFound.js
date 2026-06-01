const notFound = (_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    error: {
      code: 'NOT_FOUND'
    }
  });
};

module.exports = {
  notFound
};
