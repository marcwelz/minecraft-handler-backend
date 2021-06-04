import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import { exec } from "https://deno.land/x/exec/mod.ts";

const app = new Application();
const port = 8000;

app.use(
  oakCors({
    origin: "http://192.168.1.232:8080",
    ptionsSuccessStatus: 200,
  })
);

const router = new Router();

var serverStatus = { status: false };

router
  .get("/server/status", (ctx) => {
    ctx.response.body = serverStatus;
  })
  .get("/server/start", (ctx) => {
    serverStatus.status = true;
    initialServer();
    ctx.response.body = serverStatus;
  })
  .get("/server/stop", (ctx) => {
    serverStatus.status = false;
    initialServer();
    ctx.response.body = serverStatus;
  });

async function initialServer() {
  if (serverStatus.status) {
    Deno.run({
      cmd: ["java", "-Xmx1024M", "-Xms1024M", "-jar", "server.jar", "nogui"],
    });
    // exec("java -Xmx1024M -Xms1024M -jar server.jar nogui");
  } else {
    console.log("test");
    // exec("/time set day");
  }
}

app.use(async (ctx, next) => {
  await next();
  console.log(`${ctx.request.method} ${ctx.request.url}`);
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port });
console.log(`localhost:${port}`);
