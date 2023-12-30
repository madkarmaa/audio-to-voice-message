// ==UserScript==
// @name            Send audio files as voice messages
// @icon            https://raw.githubusercontent.com/madkarmaa/audio-to-voice-message/main/images/icon.png
// @namespace       VXdVQ29yZA==
// @source          https://github.com/madkarmaa/audio-to-voice-message
// @supportURL      https://github.com/madkarmaa/audio-to-voice-message
// @updateURL       https://raw.githubusercontent.com/madkarmaa/audio-to-voice-message/main/script.user.js
// @downloadURL     https://raw.githubusercontent.com/madkarmaa/audio-to-voice-message/main/script.user.js
// @version         1.3.1
// @description     Send audio files as voice messages on Discord without any client modification
// @author          mk_
// @match           *://discord.com/*
// @grant           GM_addStyle
// @run-at          document-end
// ==/UserScript==

(async () => {
    // Join Discord Previews: https://discord.com/invite/discord-603970300668805120

    /**
     * findByProps on Discord Previews
     * https://discord.com/channels/603970300668805120/1085682686607249478/1085682686607249478
     */
    let _mods;
    webpackChunkdiscord_app.push([[Symbol()], {}, (r) => (_mods = r.c)]);
    webpackChunkdiscord_app.pop();

    let findByProps = (...props) => {
        for (let m of Object.values(_mods)) {
            try {
                if (!m.exports || m.exports === window) continue;
                if (props.every((x) => m.exports?.[x])) return m.exports;

                for (let ex in m.exports) {
                    if (props.every((x) => m.exports?.[ex]?.[x])) return m.exports[ex];
                }
            } catch {}
        }
    };

    // open an audio file input dialog
    function openFile() {
        return new Promise((resolve) => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'audio/*';
            fileInput.style.display = 'none';

            document.body.appendChild(fileInput);
            fileInput.click();
            fileInput.addEventListener('change', () => {
                resolve(fileInput.files[0]);
                fileInput.remove();
            });
            fileInput.addEventListener('cancel', () => {
                resolve(null);
                fileInput.remove();
            });
        });
    }

    // get the duration of an audio file in seconds
    function getAudioDuration(audioFile) {
        return new Promise((resolve, reject) => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)(),
                fileReader = new FileReader();

            fileReader.onload = (event) => {
                const readAudioFile = event.target.result;
                audioContext.decodeAudioData(
                    readAudioFile,
                    (audio) => {
                        resolve(audio.duration);
                    },
                    reject
                );
            };
            fileReader.onerror = (event) => {
                reject(event.error);
            };
            fileReader.readAsArrayBuffer(audioFile);
        });
    }

    // upload an audio file to the Discord's servers via url
    function uploadFile(uploadURL, file) {
        return new Promise((resolve) => {
            const fileReader = new FileReader();

            fileReader.onload = function (event) {
                const audioFile = event.target.result;

                fetch(uploadURL, {
                    method: 'PUT',
                    body: audioFile,
                    referrer: 'https://discord.com/',
                    referrerPolicy: 'strict-origin-when-cross-origin',
                    method: 'PUT',
                    mode: 'cors',
                    credentials: 'omit',
                })
                    .then((response) => resolve(response.ok))
                    .catch((r) => resolve(false));
            };
            fileReader.readAsArrayBuffer(file);
        });
    }

    async function start() {
        let channelID = findByProps('getCurrentlySelectedChannelId').getCurrentlySelectedChannelId(),
            audioFile = await openFile();

        if (!audioFile) return;

        let response = await findByProps('getAPIBaseURL')
            .post({
                url: `/channels/${channelID}/attachments`,
                body: {
                    files: [
                        {
                            filename: 'voice-message.ogg',
                            file_size: audioFile.size,
                            id: `${Math.floor(1000 * Math.random())}`,
                            is_clip: false,
                        },
                    ],
                },
            })
            .catch((err) => err);

        if (!response.ok) return console.error(`%c[Error] %c${response.text}`, 'color: red', '');
        response = JSON.parse(response.text);

        let uploadedAttachmentFile = response.attachments[0],
            uploadedAudioFile = await uploadFile(uploadedAttachmentFile.upload_url, audioFile);
        if (!uploadedAudioFile) return console.error('%c[Error] %cUpload failed', 'color: red', '');

        let audioDuration = (await getAudioDuration(audioFile)) || 1,
            audioMessageResponse = await findByProps('getAPIBaseURL')
                .post({
                    url: `/channels/${channelID}/messages`,
                    body: {
                        flags: 8192,
                        attachments: [
                            {
                                id: '0',
                                filename: 'voice-message.ogg',
                                uploaded_filename: uploadedAttachmentFile.upload_filename,
                                waveform: '69696969', // can be whatever
                                duration_secs: Math.floor(audioDuration),
                            },
                        ],
                    },
                })
                .catch((err) => err);

        if (!audioMessageResponse.ok)
            return console.error(`%c[Error] %c${audioMessageResponse.text}`, 'color: red', '');
        console.log('%cSuccess', 'color: green');
        return true;
    }

    /**
     * All the above functions can be found at Discord Previews's Discord server, specifically here:
     * https://discord.com/channels/603970300668805120/1148135971418804315/1148136792579645506
     * I just de-obfuscated them the best I could :D
     */

    GM_addStyle(`
form div[class*="channelTextArea"] div[class*="attachWrapper"] button[class*="attachButton"] * {
    transition: all .3s ease-in-out;
}

form div[class*="channelTextArea"] div[class*="attachWrapper"] button[class*="attachButton"] > div {
    border: 2px solid transparent;
    border-radius: 50%;
}

form div[class*="channelTextArea"] div[class*="attachWrapper"] button[class*="attachButton"]:hover > div {
    border-color: #5865F2;
}

form div[class*="channelTextArea"] div[class*="attachWrapper"] button[class*="attachButton"].error > div {
    border-color: #ED4245;
}

form div[class*="channelTextArea"] div[class*="attachWrapper"] button[class*="attachButton"].loading > div {
    border-color: #FEE75C;
}

form div[class*="channelTextArea"] div[class*="attachWrapper"] button[class*="attachButton"].success > div {
    border-color: #57F287;
}
`);

    // https://stackoverflow.com/a/61511955
    function waitForElement(selector) {
        return new Promise((resolve) => {
            if (document.querySelector(selector)) return resolve(document.querySelector(selector));

            const observer = new MutationObserver(() => {
                if (document.querySelector(selector)) {
                    observer.disconnect();
                    resolve(document.querySelector(selector));
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });
        });
    }

    const uploadButton = await waitForElement(
        'form div[class*="channelTextArea"] div[class*="attachWrapper"] button[class*="attachButton"]'
    );
    uploadButton.title = 'Right click to upload an audio file as voice message!';
    uploadButton.addEventListener('contextmenu', async (e) => {
        e.preventDefault();
        uploadButton.classList.add('loading');

        if (await start()) uploadButton.classList.add('success');
        else uploadButton.classList.add('error');

        uploadButton.classList.remove('loading');
        setTimeout(() => {
            uploadButton.classList.remove('success');
            uploadButton.classList.remove('error');
        }, 1000);

        return false;
    });
})();
