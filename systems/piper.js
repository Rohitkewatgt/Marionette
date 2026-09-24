const path = require("node:path");
const http = require("node:http");
const { spawn } = require("child_process");

const PYTHON_COMMAND =
    process.platform === "win32"
        ? "python"
        : path.join(__dirname, "..", ".venv", "bin", "python");

const PIPER_MODEL = path.join(
    __dirname,
    "..",
    "models",
    "en_GB-cori-medium.onnx"
);

let piperProcess = null;
let piperReady = false;

function startPiper() {
    if (piperProcess) {
        console.log("Piper is already running.");
        return;
    }

    console.log("Starting Piper...");

    piperReady = false;

    piperProcess = spawn(
        PYTHON_COMMAND,
        [
            "-m",
            "piper.http_server",
            "-m",
            PIPER_MODEL,
            "--host",
            "127.0.0.1",
            "--port",
            "5000"
        ]
    );

    piperProcess.on("error", error => {
        console.error("Failed to start Piper:", error);

        piperProcess = null;
        piperReady = false;
    });

    piperProcess.stdout.on("data", data => {
        console.log(`[Piper] ${data}`);
    });

    piperProcess.stderr.on("data", data => {
        console.error(`[Piper] ${data}`);
    });

    piperProcess.on("close", code => {
        console.log(`Piper stopped with code ${code}`);

        piperProcess = null;
        piperReady = false;
    });

    waitForPiper();
}

function waitForPiper() {
    const request = http.get(
        "http://localhost:5000",
        response => {
            piperReady = true;

            console.log("Piper HTTP server is ready.");
        }
    );

    request.on("error", () => {
        if (!piperProcess) return;

        setTimeout(waitForPiper, 250);
    });

    request.setTimeout(1000, () => {
        request.destroy();
    });
}

function stopPiper() {
    if (!piperProcess) return;

    console.log("Stopping Piper...");

    piperProcess.kill();
    piperProcess = null;
}

async function synthesize(text) {
    if (!piperReady) {
        throw new Error("Piper is not ready yet.");
    }

    const response = await fetch(
        "http://localhost:5000/synthesize",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text
            })
        }
    );

    if (!response.ok) {
        throw new Error(
            `Piper returned HTTP ${response.status}`
        );
    }

    return {
        audio: Buffer.from(await response.arrayBuffer()),
        format: "wav"
    };
}

module.exports = {
    startPiper,
    stopPiper,
    synthesize
};