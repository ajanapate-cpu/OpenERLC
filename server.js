const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = 5500;
const host = "127.0.0.1";
const counterFile = path.join(root, "visits.json");

function readVisits() {
  try {
    const data = JSON.parse(fs.readFileSync(counterFile, "utf8"));
    return Number.isFinite(data.visits) ? data.visits : 0;
  } catch (_) {
    return 0;
  }
}

function saveVisits(visits) {
  fs.writeFileSync(counterFile, JSON.stringify({ visits }));
}

const server = http.createServer((req, res) => {
  const pathname = req.url.split("?")[0];
  if (pathname === "/api/visits" && req.method === "POST") {
    const visits = readVisits() + 1;
    saveVisits(visits);
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ visits }));
    return;
  }
  if (pathname === "/api/visits" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ visits: readVisits() }));
    return;
  }

  let requestPath = decodeURIComponent(pathname);
  if (requestPath === "/") requestPath = "/index.html";
  const filePath = path.normalize(path.join(root, requestPath));
  if (!filePath.startsWith(root + path.sep)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
    res.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(port, host, () => {
  console.log("Server running at http://" + host + ":" + port);
});
