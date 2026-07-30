/** Anything the router didn't match. */
export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

/** Turns Mongoose/driver errors into clean JSON the frontend can display. */
// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity
export function errorHandler(err, req, res, next) {
  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? "value";
    return res.status(409).json({
      message: `Duplicate ${field}: "${err.keyValue?.[field]}" already exists.`,
    });
  }

  if (err?.name === "ValidationError") {
    return res.status(400).json({
      message: Object.values(err.errors)
        .map((e) => e.message)
        .join(", "),
    });
  }

  if (err?.name === "CastError") {
    return res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` });
  }

  console.error(err);
  res.status(err?.status ?? 500).json({
    message: err?.message ?? "Internal server error",
  });
}
