const MAX_TTS_CHARACTERS = 500;

const lastSpeakerIds = new Map();

function formatMessage(message) {
    const parts = [];

    const guildId = message.guild.id;

    const speakerId = message.author.id;
    const speakerName =
        message.member?.displayName || message.author.username;

    const lastSpeakerId = lastSpeakerIds.get(guildId);
    const isNewSpeaker = speakerId !== lastSpeakerId;

    if (isNewSpeaker) {
        lastSpeakerIds.set(guildId, speakerId);
    }

    // --------------------------------------------------
    // 1. Normal text
    // --------------------------------------------------

    if (message.content && message.content.trim()) {
        let text = message.content.trim();

        text = text.replace(/<@!?(\d+)>/g, (match, userId) => {
            const member = message.guild?.members.cache.get(userId);

            if (member) {
                return member.displayName;
            }

            return "someone";
        });

        text = text.replace(
            /<a?:([a-zA-Z0-9_]+):\d+>/g,
            "$1"
        );

        const urlRegex = /https?:\/\/[^\s]+/gi;
        const links = text.match(urlRegex);

        if (links) {
            text = text.replace(urlRegex, "").trim();

            if (text) {
                if (isNewSpeaker) {
                    parts.push(
                        `${speakerName} said ${text}.`
                    );
                } else {
                    parts.push(`${text}.`);
                }
            }

            parts.push(
                `${speakerName} sent a link.`
            );
        } else {
            if (isNewSpeaker) {
                parts.push(
                    `${speakerName} said ${text}.`
                );
            } else {
                parts.push(`${text}.`);
            }
        }
    }

    // --------------------------------------------------
    // 2. Attachments
    // --------------------------------------------------

    const attachments = [...message.attachments.values()];

    if (attachments.length === 1) {
        const attachment = attachments[0];

        const contentType = attachment.contentType || "";

        if (contentType.startsWith("audio/")) {
            parts.push(
                `${speakerName} sent an audio message.`
            );
        } else if (contentType.startsWith("image/")) {
            parts.push(
                `${speakerName} sent an image.`
            );
        } else {
            parts.push(
                `${speakerName} sent a file.`
            );
        }
    } else if (attachments.length > 1) {
        parts.push(
            `${speakerName} sent multiple files.`
        );
    }

    // --------------------------------------------------
    // 3. Stickers
    // --------------------------------------------------

    if (message.stickers.size > 0) {
        parts.push(
            `${speakerName} sent a sticker.`
        );
    }

    const finalText = parts.join(" ");

    if (finalText.length > MAX_TTS_CHARACTERS) {
        console.log(
            `TTS message ignored: ${finalText.length} characters exceeds the ${MAX_TTS_CHARACTERS} character limit.`
        );

        return [];
    }

    return parts;
}

function resetSpeaker(guildId) {
    if (guildId) {
        lastSpeakerIds.delete(guildId);
        return;
    }

    lastSpeakerIds.clear();
}

module.exports = {
    formatMessage,
    resetSpeaker
};