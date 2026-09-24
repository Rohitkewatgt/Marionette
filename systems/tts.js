const fs = require("node:fs");
const path = require("node:path");

const AUDIO_DIRECTORY = path.join(
    __dirname,
    "..",
    "audio"
);

if (!fs.existsSync(AUDIO_DIRECTORY)) {
    fs.mkdirSync(AUDIO_DIRECTORY, {
        recursive: true
    });
}

const {
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus
} = require("@discordjs/voice");

const { synthesize } = require("./ttsEngine");

const guildStates = new Map();

function deleteAudioFile(filePath) {
    if (!filePath) return;

    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted TTS audio: ${filePath}`);
        }
    } catch (error) {
        console.error(
            `Failed to delete TTS audio: ${filePath}`,
            error
        );
    }
}

function getGuildState(guildId) {
    if (!guildStates.has(guildId)) {
        const audioPlayer = createAudioPlayer();

        const state = {
            audioPlayer,
            ttsQueue: [],
            audioQueue: [],
            isProcessing: false,
            isSynthesizing: false,
            currentMessage: null,
            stopReason: null,
            synthesisGeneration: 0
        };

        audioPlayer.on(AudioPlayerStatus.Idle, () => {
            handleAudioPlayerIdle(guildId);
        });

        guildStates.set(guildId, state);
    }

    return guildStates.get(guildId);
}

function handleAudioPlayerIdle(guildId) {
    const state = guildStates.get(guildId);

    if (!state) return;

    console.log(
        `TTS playback finished in guild ${guildId}.`
    );

    state.isProcessing = false;

    if (state.currentMessage) {
        deleteAudioFile(
            state.currentMessage.filePath
        );
    }

    state.currentMessage = null;

    // Check why the player stopped.
    if (state.stopReason === "clear") {
        state.stopReason = null;
        return;
    }

    if (state.stopReason === "reset") {
        state.stopReason = null;
        return;
    }

    if (state.stopReason === "skip") {
        state.stopReason = null;

        playNextAudio(guildId);
        processSynthesisQueue(guildId);

        return;
    }

    // Normal playback completion.
    playNextAudio(guildId);
    processSynthesisQueue(guildId);
}

function addToQueue(voiceConnection, guildId, text) {
    const state = getGuildState(guildId);

    state.ttsQueue.push({
        voiceConnection,
        text
    });

    console.log(
        `TTS queue for guild ${guildId}: ` +
        `${state.ttsQueue.length} message(s) waiting.`
    );

    processSynthesisQueue(guildId);
}

async function processSynthesisQueue(guildId) {
    const state = getGuildState(guildId);

    if (state.isSynthesizing) return;
    if (state.ttsQueue.length === 0) return;

    // Only prepare one message ahead.
    if (state.audioQueue.length >= 1) return;

    state.isSynthesizing = true;

    const item = state.ttsQueue.shift();
    const generation = state.synthesisGeneration;

    console.log(
        `Preparing TTS for guild ${guildId}: ${item.text}`
    );

    let filePath = null;

    try {
        const result = await synthesize(
            guildId,
            item.text
        );

        if (generation !== state.synthesisGeneration) {
            console.log(
                "Discarding TTS audio from an old generation."
            );

            state.isSynthesizing = false;
            return;
        }

        filePath = path.join(
            AUDIO_DIRECTORY,
            `tts-${Date.now()}-${guildId}.${result.format}`
        );

        fs.writeFileSync(
            filePath,
            result.audio
        );

        console.log(
            `TTS audio generated: ${filePath}`
        );

        state.audioQueue.push({
            voiceConnection: item.voiceConnection,
            text: item.text,
            filePath
        });

        state.isSynthesizing = false;

        // If nothing is currently playing, start this audio.
        playNextAudio(guildId);

        // Try to prepare another message if one is waiting.
        processSynthesisQueue(guildId);

    } catch (error) {
        console.error(
            "TTS synthesis error:",
            error
        );

        state.isSynthesizing = false;

        deleteAudioFile(filePath);

        processSynthesisQueue(guildId);
    }
}

function playNextAudio(guildId) {
    const state = getGuildState(guildId);

    if (state.isProcessing) return;
    if (state.audioQueue.length === 0) return;

    const item = state.audioQueue.shift();

    state.currentMessage = item;
    state.isProcessing = true;

    const resource = createAudioResource(
        fs.createReadStream(item.filePath)
    );

    item.voiceConnection.subscribe(
        state.audioPlayer
    );

    state.audioPlayer.play(resource);

    console.log(
        `Speaking in guild ${guildId}: ${item.text}`
    );
}

function clearTTS(guildId) {
    const state = getGuildState(guildId);

    console.log(
        `Clearing TTS queue for guild ${guildId}...`
    );

    state.stopReason = "clear";
    state.synthesisGeneration++;

    // Stop whatever is currently playing.
    state.audioPlayer.stop();

    // Delete already-synthesized audio waiting in the queue.
    for (const item of state.audioQueue) {
        deleteAudioFile(item.filePath);
    }

    // Delete the audio currently being played.
    if (state.currentMessage) {
        deleteAudioFile(
            state.currentMessage.filePath
        );
    }

    // Clear both queues.
    state.ttsQueue = [];
    state.audioQueue = [];

    // Reset TTS state.
    state.isProcessing = false;
    state.isSynthesizing = false;
    state.currentMessage = null;

    console.log(
        `TTS queue cleared for guild ${guildId}.`
    );
}

function skipCurrent(guildId) {
    const state = getGuildState(guildId);

    if (
        !state.isProcessing ||
        !state.currentMessage
    ) {
        return false;
    }

    console.log(
        `Skipping current TTS message in guild ${guildId}.`
    );

    state.stopReason = "skip";

    state.audioPlayer.stop();

    return true;
}

function getTTSStatus(guildId) {
    const state = getGuildState(guildId);

    let status = "Idle";

    if (state.isProcessing) {
        status = "Speaking";
    } else if (state.isSynthesizing) {
        status = "Preparing";
    }

    return {
        status,
        currentMessage: state.currentMessage,
        waitingMessages: state.ttsQueue.length,
        preparedMessages: state.audioQueue.length
    };
}

function resetTTS(guildId) {
    const state = getGuildState(guildId);

    console.log(
        `Resetting TTS system for guild ${guildId}...`
    );

    state.stopReason = "reset";
    state.synthesisGeneration++;

    // Stop current audio.
    state.audioPlayer.stop();

    // Delete prepared audio files.
    for (const item of state.audioQueue) {
        deleteAudioFile(item.filePath);
    }

    // Delete the audio currently being played.
    if (state.currentMessage) {
        deleteAudioFile(
            state.currentMessage.filePath
        );
    }

    // Clear all queues.
    state.ttsQueue = [];
    state.audioQueue = [];

    // Reset state.
    state.isProcessing = false;
    state.isSynthesizing = false;
    state.currentMessage = null;

    console.log(
        `TTS system reset for guild ${guildId}.`
    );
}

module.exports = {
    addToQueue,
    skipCurrent,
    clearTTS,
    getTTSStatus,
    resetTTS
};