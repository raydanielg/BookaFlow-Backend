const { ZodError } = require("zod")

function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: err.errors.map((e) => ({ field: e.path.join("."), message: e.message })),
        })
      }
      next(err)
    }
  }
}

function notFound(req, res) {
  res.status(404).json({ error: "Not found" })
}

function errorHandler(err, req, res, next) {
  console.error("[ERROR]", err.message)
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  })
}

module.exports = { validateBody, notFound, errorHandler }
