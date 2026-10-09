"use strict";
const http = require("node:http");

function probeProxyHealth(port, pid, timeoutMs) {
  return new Promise((resolve) => {
    let finished = false;
    let deadline;
    const finish = (ok) => {
      if (finished) return;
      finished = true;
      clearTimeout(deadline);
      resolve(ok);
    };
    const req = http.get({ hostname: "127.0.0.1", port, path: "/healthz" }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
        if (body.length > 8192) { finish(false); req.destroy(); }
      });
      res.on("error", () => finish(false));
      res.on("end", () => {
        try {
          const data = JSON.parse(body);
          finish(res.statusCode === 200 && data.service === "lingxi-ai-proxy/v1"
            && Number(data.pid) === pid);
        } catch (e) { finish(false); }
      });
    });
    req.on("error", () => finish(false));
    deadline = setTimeout(() => { finish(false); req.destroy(); }, timeoutMs);
    deadline.unref?.();
  });
}

// Run in the separate static-server process so a blocked proxy event loop cannot
// block detection. Only signal the exact ChildProcess we spawned, never a port owner.
function startProxyHealthMonitor(child, options) {
  const intervalMs = options.intervalMs ?? 15000;
  const graceMs = options.graceMs ?? 20000;
  const timeoutMs = options.timeoutMs ?? 2000;
  const failureLimit = options.failureLimit ?? 3;
  const killGraceMs = options.killGraceMs ?? 2000;
  const startedAt = Date.now();
  let failures = 0;
  let checking = false;
  let stopped = false;
  let escalation = null;
  const alive = () => child.exitCode === null && child.signalCode === null;
  const stop = () => {
    stopped = true;
    clearInterval(timer);
    if (escalation) clearTimeout(escalation);
    child.removeListener("exit", stop);
  };
  const check = async () => {
    if (stopped || checking || !alive() || Date.now() - startedAt < graceMs) return;
    checking = true;
    try {
      const ok = await probeProxyHealth(options.getPort(), child.pid, timeoutMs);
      if (stopped || !alive()) return;
      if (ok) { failures = 0; return; }
      failures += 1;
      options.log?.(`healthz failed (${failures}/${failureLimit}) pid=${child.pid}`);
      if (failures < failureLimit) return;
      stopped = true;
      clearInterval(timer);
      options.log?.(`proxy unresponsive; restarting owned child pid=${child.pid}`);
      child.kill("SIGTERM");
      escalation = setTimeout(() => {
        if (alive()) {
          options.log?.(`proxy did not exit; SIGKILL owned child pid=${child.pid}`);
          child.kill("SIGKILL");
        }
      }, killGraceMs);
      escalation.unref?.();
      // Existing static-server exit handler performs the bounded respawn.
    } finally { checking = false; }
  };
  const timer = setInterval(() => { check().catch((e) => options.log?.(`health monitor error: ${e.message}`)); }, intervalMs);
  timer.unref?.();
  child.once("exit", stop);
  return stop;
}

module.exports = { probeProxyHealth, startProxyHealthMonitor };
