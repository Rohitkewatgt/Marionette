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

let readinessPromise = null;
let resolveReadiness = null;
let rejectReadiness = null;

function startPiper() {
    if (piperProcess) {
        console.log("Piper is already running.");

        return readinessPromise;
    }

    console.log("Starting Piper...");

    piperReady = false;

    readinessPromise = new Promise((resolve, reject) => {
        resolveReadiness = resolve;
        rejectReadiness = reject;
    });

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

        if (rejectReadiness) {
            rejectReadiness(error);
        }

        readinessPromise = null;
        resolveReadiness = null;
        rejectReadiness = null;
    });

    piperProcess.stdout.on("data", data => {
        console.log(`[Piper] ${data}`);
    });

    piperProcess.stderr.on("data", data => {
        console.error(`[Piper] ${data}`);
    });

    piperProcess.on("close", code => {
        console.log(`Piper stopped with code ${code}`);

        const wasReady = piperReady;

        piperProcess = null;
        piperReady = false;

        if (!wasReady && rejectReadiness) {
            rejectReadiness(
                new Error("Piper stopped before becoming ready.")
            );
        }

        readinessPromise = null;
        resolveReadiness = null;
        rejectReadiness = null;
    });

    waitForPiper();

    return readinessPromise;
}

function waitForPiper() {
    if (!piperProcess) return;

    const request = http.get(
        "http://localhost:5000",
        response => {
            response.resume();

            if (piperReady) return;

            piperReady = true;

            console.log("Piper HTTP server is ready.");

            if (resolveReadiness) {
                resolveReadiness();
            }

            resolveReadiness = null;
            rejectReadiness = null;
        }
    );

    request.on("error", () => {
        if (!piperProcess || piperReady) return;

        setTimeout(waitForPiper, 250);
    });

    request.setTimeout(1000, () => {
        request.destroy();
    });
}

async function waitUntilReady() {
    if (piperReady) {
        return;
    }

    if (!piperProcess) {
        startPiper();
    }

    await readinessPromise;
}

function stopPiper() {
    if (!piperProcess) return;

    console.log("Stopping Piper...");

    piperReady = false;

    piperProcess.kill();
}

async function synthesize(text) {
    await waitUntilReady();

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
    waitUntilReady,
    synthesize
};