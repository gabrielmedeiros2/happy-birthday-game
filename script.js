const meterFill = document.getElementById("meter-fill");
const percentageText = document.getElementById("percentage");
const lastPhrase = document.getElementById("lastPhrase");
const startBtn = document.getElementById("startBtn");

let meterValue = 0;
let currentVolume = 0;
let recognitionRunning = false;

// =====================================
// Meter
// =====================================

function updateMeter(amount) {

    meterValue += amount;

    if (meterValue > 100) {
        meterValue = 100;
    }

    meterFill.style.height = meterValue + "%";
    percentageText.innerText = Math.round(meterValue) + "%";
}

// =====================================
// Convert volume into points
// =====================================

function calculateGain(basePoints) {

    const noiseFloor = 0.02;

    let volume = Math.max(
        0,
        currentVolume - noiseFloor
    );

    /*
     * Typical values:
     * Quiet = 0.02 - 0.05
     * Normal = 0.05 - 0.10
     * Loud = 0.10 - 0.20
     * Shouting = 0.20+
     */

    let multiplier =
        1 + Math.pow(volume * 12, 2);

    return basePoints * multiplier;
}

// =====================================
// Microphone Volume Detection
// =====================================

async function setupMicrophoneLevelDetection() {

    const stream =
        await navigator.mediaDevices.getUserMedia({
            audio: {
                noiseSuppression: true,
                echoCancellation: true,
                autoGainControl: false
            }
        });

    const audioContext =
        new (window.AudioContext ||
            window.webkitAudioContext)();

    const source =
        audioContext.createMediaStreamSource(stream);

    const analyser =
        audioContext.createAnalyser();

    analyser.fftSize = 2048;

    source.connect(analyser);

    const dataArray =
        new Uint8Array(analyser.fftSize);

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
                sumSquares / dataArray.length
            );

        const volumeDebug =
            document.getElementById(
                "volumeDebug"
            );

        if (volumeDebug) {

            volumeDebug.innerText =
                "Volume: " +
                currentVolume.toFixed(3);
        }

        requestAnimationFrame(
            monitorVolume
        );
    }

    monitorVolume();
}

// =====================================
// Speech Recognition
// =====================================

function startSpeechRecognition() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

        alert(
            "Speech Recognition is not supported on this browser."
        );

        return;
    }

    const recognition =
        new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 5;

    recognition.onstart = () => {

        recognitionRunning = true;

        console.log(
            "Speech recognition started"
        );

        lastPhrase.innerText =
            "Listening...";
    };

    recognition.onresult = (event) => {

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

        const normalized =
            transcript
                .replace(/[^\w\s]/g, "")
                .replace(/\s+/g, " ")
                .trim();

        lastPhrase.innerText =
            `"${transcript}"`;

        console.log(
            "Recognized:",
            normalized
        );

        // HAPPY BIRTHDAY

        if (
            normalized.includes(
                "happy birthday"
            )
        ) {

            const gain =
                calculateGain(1);

            console.log(
                "Happy Birthday",
                gain
            );

            updateMeter(gain);
        }

        // I LOVE YOU

        if (
            normalized.includes(
                "i love you"
            )
        ) {

            const gain =
                calculateGain(2);

            console.log(
                "I Love You",
                gain
            );

            updateMeter(gain);
        }
    };

    recognition.onerror = (event) => {

        console.log(
            "Recognition error:",
            event.error
        );

        lastPhrase.innerText =
            "Error: " +
            event.error;
    };

    recognition.onend = () => {

        recognitionRunning = false;

        console.log(
            "Recognition ended"
        );

        setTimeout(() => {

            try {

                if (!recognitionRunning) {

                    recognition.start();
                }

            }
            catch (err) {

                console.log(err);
            }

        }, 500);
    };

    recognition.start();
}

// =====================================
// Start Button
// =====================================

startBtn.addEventListener(
    "click",
    async () => {

        try {

            startBtn.disabled = true;
            startBtn.innerText =
                "🎤 Listening...";

            await setupMicrophoneLevelDetection();

            startSpeechRecognition();

        }
        catch (err) {

            console.error(err);

            alert(
                "Unable to access microphone."
            );

            startBtn.disabled = false;

            startBtn.innerText =
                "🎤 Start Listening";
        }
    }
);