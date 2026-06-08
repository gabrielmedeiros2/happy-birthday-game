const meterFill = document.getElementById("meter-fill");
const percentageText = document.getElementById("percentage");
const lastPhrase = document.getElementById("lastPhrase");
const startBtn = document.getElementById("startBtn");

let meterValue = 0;
let currentVolume = 0;

// =========================
// Meter
// =========================

function updateMeter(amount) {

    meterValue += amount;

    if (meterValue > 100) {
        meterValue = 100;
    }

    meterFill.style.height = meterValue + "%";
    percentageText.innerText = meterValue.toFixed(0) + "%";
}

// =========================
// Volume → Score Conversion
// =========================

function calculateGain(basePoints) {

    // Ignore background noise
    const noiseFloor = 0.03;

    let volume = Math.max(
        0,
        currentVolume - noiseFloor
    );

    /*
     * Exponential growth:
     * whisper ≈ 1x
     * normal ≈ 3-5x
     * loud ≈ 10-20x
     * shouting ≈ 25-50x
     */
    let multiplier =
        1 + Math.pow(volume * 10, 2);

    return basePoints * multiplier;
}

// =========================
// Microphone Volume Detection
// =========================

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

            const normalized =
                (dataArray[i] - 128) / 128;

            sumSquares +=
                normalized * normalized;
        }

        const rms =
            Math.sqrt(
                sumSquares / dataArray.length
            );

        currentVolume = rms;

        // Debug volume
        console.log(
            "Volume:",
            currentVolume.toFixed(3)
        );

        requestAnimationFrame(
            monitorVolume
        );
    }

    monitorVolume();
}

// =========================
// Speech Recognition
// =========================

function startSpeechRecognition() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

        alert(
            "Speech Recognition is not supported in this browser. Use Chrome or Edge."
        );

        return;
    }

    const recognition =
        new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 5;

    recognition.onresult = (event) => {

        const result =
            event.results[
                event.results.length - 1
            ];

        const transcript =
            result[0].transcript
                .toLowerCase()
                .trim();

        const confidence =
            result[0].confidence || 0;

        lastPhrase.innerText =
            `"${transcript}" (${(
                confidence * 100
            ).toFixed(0)}%)`;

        console.log(
            "Phrase:",
            transcript,
            "Confidence:",
            confidence
        );

        // Ignore uncertain recognition
        if (confidence < 0.5) {
            return;
        }

        // HAPPY BIRTHDAY
        if (
            transcript.includes(
                "happy birthday"
            )
        ) {

            const gain =
                calculateGain(1);

            console.log(
                "Happy Birthday detected",
                gain
            );

            updateMeter(gain);

            return;
        }

        // I LOVE YOU
        if (
            transcript.includes(
                "i love you"
            )
        ) {

            const gain =
                calculateGain(2);

            console.log(
                "I Love You detected",
                gain
            );

            updateMeter(gain);

            return;
        }
    };

    recognition.onerror = (event) => {

        console.error(
            "Speech recognition error:",
            event.error
        );
    };

    recognition.onend = () => {

        console.log(
            "Recognition restarted"
        );

        try {
            recognition.start();
        }
        catch (e) {
            console.error(e);
        }
    };

    recognition.start();
}

// =========================
// Start Button
// =========================

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
                "Could not access microphone."
            );

            startBtn.disabled = false;
            startBtn.innerText =
                "🎤 Start Listening";
        }
    }
);