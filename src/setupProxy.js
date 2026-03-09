// Прокси: запросы /api/* с фронтенда уходят на бэкенд
// React dev-сервер (порт 3000) → FastAPI (порт 8001)
// /api/services → http://localhost:8001/services

const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: "http://localhost:8001",
      changeOrigin: true,
      pathRewrite: { "^/api": "" }, // убираем /api из пути
    })
  );
};
