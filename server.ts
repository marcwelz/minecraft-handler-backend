import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
const app = new Application();
const port = 8000;

const availableSettings = [10, 19, 36, 26, 49];

app.use(
  oakCors({
    origin: "*",
  })
);

const router = new Router();
const encoder = new TextEncoder();
const decoder = new TextDecoder();

let p: any;

var serverStatus = { status: false };

router
  .get("/server/status", (ctx) => {
    ctx.response.body = { serverStatus, ip: "192.168.1.232:25565" };
  })
  .get("/server/start", (ctx) => {
    initialServer();
    ctx.response.body = serverStatus;
  })
  .get("/server/stop", (ctx) => {
    initialServer();
    ctx.response.body = serverStatus;
  })
  .post("/server/command", async (ctx) => {
    if (p !== null) {
      const values = await ctx.request.body().value;
      if (values.command.charAt(0) !== "/") {
        values.command = "/" + values.command;
      }
      console.log(values.command);
      await p.stdin.write(encoder.encode(values.command + "\n"));
    }
  })
  .post("/server/settings", async (ctx) => {
    const postvalue = await ctx.request.body().value;
    settings(postvalue.settings);
  })
  .get("/server/settings/get", async (ctx) => {
    ctx.response.body = await getSettings();
  });

async function settings(value: any) {
  const text = await Deno.readTextFile("server.properties");
  let textSplit = text.split("\n");
  for (let i = 0; i < availableSettings.length; i++) {
    let row = textSplit[availableSettings[i]].split("=");

    row[1] = value[i];
    textSplit.splice(availableSettings[i], 1, row[0] + "=" + row[1]);
  }

  let writetext = "";
  for (let i = 0; i + 1 < textSplit.length; i++) {
    writetext = writetext + textSplit[i] + "\n";
  }

  await Deno.remove("server.properties");
  await Deno.create("server.properties");

  const write = Deno.writeTextFile("server.properties", writetext);
  write.then(() => console.log("changes has been made"));
}

async function getSettings() {
  const text = await Deno.readTextFile("server.properties");

  let textSplit = text.split("\n");

  let row = [];
  for (let i = 0; i < availableSettings.length; i++) {
    row[i] = textSplit[availableSettings[i]].split("=");
  }

  return {
    gamemode: row[0][1],
    pvp: row[1][1],
    worldname: row[2][1],
    maxplayers: row[3][1],
    motd: row[4][1],
  };
}

async function initialServer() {
  if (!serverStatus.status) {
    serverStatus.status = true;
    p = Deno.run({
      cmd: ["java", "-Xmx1024M", "-Xms1024M", "-jar", "server.jar", "nogui"],
      stdout: "piped",
      stdin: "piped",
      stderr: "piped",
    });

    Deno.copy(p.stdout, Deno.stdout);
    Deno.copy(p.stdout, Deno.stdout);
  } else {
    if (p !== null) {
      serverStatus.status = false;
      try {
        await p.stdin.write(encoder.encode("/stop"));
      } catch {
        console.log("closing the server failed");
      }

      await p.stdin.close();
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
