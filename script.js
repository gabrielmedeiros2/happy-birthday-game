const meterFill = document.getElementById("meter-fill");
const percentageText = document.getElementById("percentage");
const lastPhrase = document.getElementById("lastPhrase");
const startBtn = document.getElementById("startBtn");

let meterValue = 0;
let currentVolume = 0;
let recognizedCount = 0;

function log(message) {

    console.log(message);

    const panel =
        document.getElementById("logPanel");

    const line =
        document.createElement("div");

    line.innerText =
        new Date().toLocaleTimeString() +
        " - " +
        message;

    panel.prepend(line);
}

function setDebug(id, value) {

    document.getElementById(id).innerText =
        value;
}

function updateMeter(amount) {

    meterValue += amount;

    if (meterValue > 100) {
        meterValue = 100;
    }

    meterFill.style.height =
        meterValue + "%";

    percentageText.innerText =
        Math.round(meterValue) + "%";
}

function calculateGain(basePoints) {

    const noiseFloor = 0.02;

    const volume =
        Math.max(
            0,
            currentVolume - noiseFloor
        );

    const multiplier =
        1 + Math.pow(volume * 12, 2);

    return basePoints * multiplier;
}

function initializeDiagnostics() {

    setDebug(
        "browserInfo",
        navigator.userAgent
    );

    setDebug(
        "protocolInfo",
        location.protocol
    );

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    setDebug(
        "speechSupport",
        SpeechRecognition
            ? "SUPPORTED"
            : "NOT SUPPORTED"
    );

    log(
        "Page initialized"
    );

    log(
        "Protocol: " +
        location.protocol
    );

    log(
        "SpeechRecognition: " +
        !!SpeechRecognition
    );
}

async function setupMicrophone() {

    try {

        log(
            "Requesting microphone access..."
        );

        const stream =
            await navigator.mediaDevices.getUserMedia({
                audio: {
                    noiseSuppression: true,
                    echoCancellation: true,
                    autoGainControl: false
                }
            });

        setDebug(
            "micStatus",
            "GRANTED"
        );

        log(
            "Microphone access granted"
        );

        const audioContext =
            new (
                window.AudioContext ||
                window.webkitAudioContext
            )();

        const source =
            audioContext.createMediaStreamSource(
                stream
            );

        const analyser =
            audioContext.createAnalyser();

        analyser.fftSize = 2048;

        source.connect(analyser);

        const dataArray =
            new Uint8Array(
                analyser.fftSize
            );

        function monitorVolume() {

            analyser.getByteTimeDomainData(
                dataArray
            );

            let sumSquares = 0;

            for (
                let i = 0;
                i < dataArray.length;
                i++
            ) {

                const sample =
                    (dataArray[i] - 128) / 128;

                sumSquares +=
                    sample * sample;
            }

            currentVolume =
                Math.sqrt(
                    sumSquares /
                    dataArray.length
                );

            setDebug(
                "volumeValue",
                currentVolume.toFixed(4)
            );

            requestAnimationFrame(
                monitorVolume
            );
        }

        monitorVolume();

    } catch (err) {

        setDebug(
            "micStatus",
            "DENIED"
        );

        log(
            "Microphone failed: " +
            err.message
        );

        throw err;
    }
}

function startRecognition() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

        log(
            "SpeechRecognition unavailable"
        );

        return;
    }

    const recognition =
        new SpeechRecognition();

    recognition.lang = "en-US";

    recognition.continuous = false;

    recognition.interimResults = true;

    recognition.maxAlternatives = 5;

    recognition.onstart = () => {

        setDebug(
            "recognitionStatus",
            "STARTED"
        );

        log(
            "Recognition started"
        );
    };

    recognition.onaudiostart = () => {

        log(
            "Audio detected"
        );
    };

    recognition.onspeechstart = () => {

        log(
            "Speech detected"
        );
    };

    recognition.onspeechend = () => {

        log(
            "Speech ended"
        );
    };

    recognition.onaudioend = () => {

        log(
            "Audio ended"
        );
    };

    recognition.onresult = (event) => {

        recognizedCount++;

        setDebug(
            "recognizedCount",
            recognizedCount
        );

        let transcript = "";

        for (
            let i = event.resultIndex;
            i < event.results.length;
            i++
        ) {

            transcript +=
                event.results[i][0].transcript +
                " ";
        }

        transcript =
            transcript
                .toLowerCase()
                .trim();

        lastPhrase.innerText =
            transcript;

        log(
            "Transcript: " +
            transcript
        );

        const normalized =
            transcript
                .replace(/[^\w\s]/g, "")
                .trim();

        if (
            normalized.includes(
                "happy birthday"
            )
        ) {

            const gain =
                calculateGain(1);

            log(
                "Happy Birthday -> +" +
                gain.toFixed(2)
            );

            updateMeter(gain);
        }

        if (
            normalized.includes(
                "i love you"
            )
        ) {

            const gain =
                calculateGain(2);

            log(
                "I Love You -> +" +
                gain.toFixed(2)
            );

            updateMeter(gain);
        }
    };

    recognition.onerror = (event) => {

        setDebug(
            "errorStatus",
            event.error
        );

        log(
            "ERROR: " +
            event.error
        );
    };

    recognition.onend = () => {

        setDebug(
            "recognitionStatus",
            "RESTARTING"
        );

        log(
            "Recognition ended"
        );

        setTimeout(() => {

            try {

                recognition.start();

            } catch (e) {

                log(
                    "Restart failed: " +
                    e.message
                );
            }

        }, 500);
    };

    recognition.start();
}

startBtn.addEventListener(
    "click",
    async () => {

        try {

            await setupMicrophone();

            startRecognition();

            startBtn.disabled = true;

        } catch (err) {

            alert(
                "Microphone access failed."
            );
        }
    }
);

initializeDiagnostics();