require("dotenv").config();

const FISH_API_KEY = process.env.FISH_API_KEY;

const SANDRONE_MODEL_ID = "d02033472e664e92ac8397da9e7399d3";
const FISH_MODEL = "s2.1-pro-free";

async function synthesize(text) {
    if (!FISH_API_KEY) {
        throw new Error("FISH_API_KEY is not configured.");
    }

    const response = await fetch("https://api.fish.audio/v1/tts", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${FISH_API_KEY}`,
            "Content-Type": "application/json",
            "model": FISH_MODEL
        },
        body: JSON.stringify({
            text,
            reference_id: SANDRONE_MODEL_ID,
            format: "mp3"
        })
    });

    if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
            `Fish Audio returned HTTP ${response.status}: ${errorText}`
        );
    }

    return {
        audio: Buffer.from(await response.arrayBuffer()),
        format: "mp3"
    };
}

module.exports = {
    synthesize
};