import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
const app = new Application();
const port = 8000;

app.use(
  oakCors({
    origin: "http://192.168.1.232:8080",
    ptionsSuccessStatus: 200,
  })
);

const router = new Router();
const encoder = new TextEncoder();
const decoder = new TextDecoder();
let p;

var serverStatus = { status: false };

router
  .get("/server/status", (ctx) => {
    ctx.response.body = serverStatus;
  })
  .get("/server/start", (ctx) => {
    initialServer();
    ctx.response.body = serverStatus;
  })
  .get("/server/stop", (ctx) => {
    initialServer();
    ctx.response.body = serverStatus;
  });
//   .post("/server/command", async (ctx) => {
//     if (p !== null) {
//       const values = await ctx.request.body().value;
//       console.log(values.command);
//       if (values.command.charAt(0) !== "/") {
//         values.command = "/" + values.command;
//       }
//       await p.stdin.write(encoder.encode(values.command));
//       //   await p.stdin.close();
//       await p.stdin.next();
//     }
//   });

async function initialServer() {
  if (!serverStatus.status) {
    p = Deno.run({
      cmd: ["java", "-Xmx1024M", "-Xms1024M", "-jar", "server.jar", "nogui"],
      stdout: "piped",
      stdin: "piped",
      stderr: "piped",
    });
    // console.log(decoder.decode(p.output()));
    serverStatus.status = true;
  } else {
    if (p !== null) {
      await p.stdin.write(encoder.encode("/stop"));

      await p.stdin.close();
      serverStatus.status = false;
    }
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
