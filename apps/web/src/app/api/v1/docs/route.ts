export const dynamic = "force-static";

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Discount Hub External API · Docs</title>
    <link
      rel="stylesheet"
      href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css"
      crossorigin="anonymous"
    />
    <style>body{margin:0;background:#fff;}</style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script
      src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"
      crossorigin="anonymous"
    ></script>
    <script>
      window.addEventListener('load', function () {
        window.SwaggerUIBundle({
          url: '/api/v1/openapi.json',
          dom_id: '#swagger-ui',
          deepLinking: true,
          docExpansion: 'list',
          tryItOutEnabled: true,
          persistAuthorization: true,
          layout: 'BaseLayout',
        });
      });
    </script>
  </body>
</html>
`;

export async function GET() {
  return new Response(HTML, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
      "x-frame-options": "DENY",
    },
  });
}
