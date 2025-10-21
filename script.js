// Aguarda o documento HTML carregar antes de executar o script
document.addEventListener('DOMContentLoaded', (event) => {

    const resultDiv = document.getElementById('qr-result');
    const ENDPOINT_URL = 'https://sua-api.com/endpoint/receber-qr';

    // --- NOVO: Inicializa o Contexto de Áudio ---
    // Fazemos isso uma vez. 
    // O '|| webkitAudioContext' é para compatibilidade com navegadores mais antigos (Safari).
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    /**
     * --- NOVO: Função para tocar sons ---
     * Gera um som de "beep" ou "erro"
     * @param {'success' | 'error'} type 
     */
    function playSound(type = 'success') {
        try {
            // Garante que o áudio possa tocar (necessário em alguns navegadores
            // que bloqueiam o áudio antes da primeira interação do usuário)
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            gainNode.gain.setValueAtTime(0.5, audioContext.currentTime); // Volume

            if (type === 'success') {
                // Beep agudo e curto para sucesso
                oscillator.type = 'sine'; // Tom limpo
                oscillator.frequency.setValueAtTime(900, audioContext.currentTime); // Frequência (agudo)
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1); // Duração de 0.1s
            } else if (type === 'error') {
                // Beep grave e mais longo para erro
                oscillator.type = 'square'; // Tom mais "digital/áspero"
                oscillator.frequency.setValueAtTime(300, audioContext.currentTime); // Frequência (grave)
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3); // Duração de 0.3s
            }
        } catch (e) {
            console.error("Erro ao tocar áudio:", e);
        }
    }


    /**
     * Função chamada quando o QR Code é lido com sucesso.
     */
    async function onScanSuccess(decodedText, decodedResult) {
        // --- ADICIONADO ---
        playSound('success'); // Toca o som de sucesso!

        resultDiv.textContent = `Código detectado: ${decodedText}`;

        html5QrcodeScanner.clear().catch(error => {
            console.error("Falha ao parar o scanner.", error);
        });

        await sendDataToEndpoint(decodedText);
    }

    /**
     * Função que envia os dados para o seu servidor (endpoint).
     */
    async function sendDataToEndpoint(data) {
        try {
            resultDiv.textContent = `Enviando dados: ${data}...`;

            const response = await fetch(ENDPOINT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qrData: data })
            });

            if (response.ok) {
                resultDiv.textContent = `Sucesso! Dados enviados: ${data}`;
                console.log('Dados enviados com sucesso:', await response.json());
            } else {
                // --- ADICIONADO ---
                playSound('error'); // Toca o som de erro!
                resultDiv.textContent = `Erro ${response.status} ao enviar os dados.`;
                console.error('Falha no envio:', response.statusText);
            }

        } catch (error) {
            // --- ADICIONADO ---
            playSound('error'); // Toca o som de erro!
            resultDiv.textContent = 'Erro de rede ao tentar enviar.';
            console.error('Erro na requisição fetch:', error);
        }
    }

    /**
     * Função chamada em caso de falha (opcional, útil para depuração).
     */
    function onScanFailure(error) {
        // Você poderia adicionar um som de "não encontrado" aqui,
        // mas seria muito barulhento, pois é chamado constantemente.
        // playSound('error'); // <-- NÃO RECOMENDADO AQUI
    }

    // Lista dos formatos que queremos suportar
    const formatosSuportados = [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.CODE_128,
        // ... outros formatos ...
    ];

    // Cria a instância do scanner
    let html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            formatsToSupport: formatosSuportados
        },
        /* verbose= */ false
    );

    // Inicia o scanner
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
});