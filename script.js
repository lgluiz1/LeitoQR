document.addEventListener('DOMContentLoaded', (event) => {

    const resultDiv = document.getElementById('qr-result');
    const ENDPOINT_URL = 'https://sua-api.com/endpoint/receber-qr';

    // --- Flag de controle para o cooldown ---
    let isScanning = true;
    const COOLDOWN_MS = 2500; // 2.5 segundos de espera

    // --- Contexto de Áudio (igual) ---
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    function playSound(type = 'success') {
        // ... (código da função playSound igual ao anterior) ...
        try {
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
            if (type === 'success') {
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(900, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1);
            } else if (type === 'error') {
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
            }
        } catch (e) {
            console.error("Erro ao tocar áudio:", e);
        }
    }


    /**
     * Função chamada quando o QR Code é lido com sucesso.
     */
    async function onScanSuccess(decodedText, decodedResult) {
        
        // Se não estivermos em cooldown, processa a leitura
        if (isScanning) {
            
            // 1. Trava o scanner (inicia o cooldown)
            isScanning = false;
            
            // 2. Toca o som e mostra o resultado
            playSound('success');
            resultDiv.innerHTML = `Detectado: ${decodedText}`;
            resultDiv.style.display = 'block';

            // 3. NÃO PARAMOS O SCANNER (removemos o .clear())
            // Isso mantém a câmera ativa.
            
            // 4. Envia os dados
            await sendDataToEndpoint(decodedText);

            // 5. Após o cooldown, reativa o scanner e esconde a msg
            setTimeout(() => {
                isScanning = true;
                resultDiv.style.display = 'none';
            }, COOLDOWN_MS);
        }
        // Se 'isScanning' for false, a leitura é ignorada
    }

    /**
     * Função que envia os dados para o seu servidor (endpoint).
     */
    async function sendDataToEndpoint(data) {
        try {
            // Não vamos mais mostrar "enviando...",
            // o "Detectado:" já está na tela.
            
            const response = await fetch(ENDPOINT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qrData: data })
            });

            if (response.ok) {
                // Atualiza o toast para "Enviado!"
                resultDiv.innerHTML = "Enviado com sucesso!";
                console.log('Dados enviados com sucesso:', await response.json());
            } else {
                playSound('error');
                resultDiv.innerHTML = `Erro ${response.status} ao enviar.`;
                console.error('Falha no envio:', response.statusText);
            }

        } catch (error) {
            playSound('error');
            resultDiv.innerHTML = 'Erro de rede. Verifique a conexão.';
            console.error('Erro na requisição fetch:', error);
        }
    }

    function onScanFailure(error) {
        // Ignora (é chamado o tempo todo quando não acha um código)
    }

    // Lista dos formatos (igual)
    const formatosSuportados = [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.UPC_A
    ];

    // --- Configuração Final do Scanner ---
    let html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        {
            fps: 10,
            
            // Esta é a "marca" (a caixa de leitura)
            qrbox: { width: 280, height: 280 },
            
            // PEDE A CÂMERA TRASEIRA
            facingMode: "environment",
            
            formatsToSupport: formatosSuportados,
            
            // Opcional: Desativa os botões "Mudar Câmera"
            // (pode ser útil se você SÓ quer a traseira)
            // showDefaultUI: false 
        },
        /* verbose= */ false
    );

    // Inicia o scanner
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
});