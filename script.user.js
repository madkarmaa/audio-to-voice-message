// ==UserScript==
// @name            Send audio files as voice messages
// @icon            https://raw.githubusercontent.com/madkarmaa/youtube-downloader/main/images/icon.png
// @namespace       banana
// @source
// @supportURL
// @updateURL
// @downloadURL
// @version         1.0.0
// @description     Send audio files as voice messages on Discord without any client modification
// @author          mk_
// @match           *://discord.com/*
// @connect         raw.githubusercontent.com
// @grant           GM_addStyle
// @grant           GM.xmlHttpRequest
// @grant           GM.xmlhttpRequest
// @run-at          document-end
// ==/UserScript==

(async () => {
    /**
     * findByProps on Discord Previews
     * https://discord.com/channels/603970300668805120/1085682686607249478/1085682686607249478
     */
    let _modules = webpackChunkdiscord_app.push([[Symbol()], {}, ({ c: module }) => Object.values(module)]);
    webpackChunkdiscord_app.pop();

    function findByProps(...props) {
        for (let module of _modules) {
            try {
                if (!module.exports || module.exports === window) continue;
                if (props.every((prop) => module.exports?.[prop])) return module.exports;

                for (let _export in module.exports) {
                    if (props.every((prop) => module.exports?.[_export]?.[prop])) return module.exports[_export];
                }
            } catch {}
        }
    }

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
            audioFile = await openFile(),
            response = await findByProps('getAPIBaseURL')
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
    }

    /**
     * All the functions above can be found at Discord Previews's Discord server, specifically here:
     * https://discord.com/channels/603970300668805120/1148135971418804315/1148136792579645506
     * I just de-obfuscated them the best I could :D
     */

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
    uploadButton.addEventListener('contextmenu', async (event) => {
        event.preventDefault();
        await start();
        return false;
    });
})();
