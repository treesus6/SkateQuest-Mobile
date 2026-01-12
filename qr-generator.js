// Skateboard QR Code Generator for SkateQuest Charity
// Generates QR codes that look like skateboards! 🛹

// Import QRCode library (add this to index.html)
// <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>

export function generateSkateboardQR(code, trickChallenge, customMessage, xpReward) {
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 900;
  const ctx = canvas.getContext('2d');

  // Draw skateboard deck shape
  drawSkateboardDeck(ctx, canvas.width, canvas.height);

  // Generate QR code as data URL
  const qrDataURL = generateQRCodeDataURL(code);

  // Load and draw QR code
  const qrImg = new Image();
  qrImg.onload = () => {
    // Draw QR code in center of board
    const qrSize = 300;
    const qrX = (canvas.width - qrSize) / 2;
    const qrY = (canvas.height - qrSize) / 2;

    // White background for QR
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

    // Draw QR code
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    // Add decorative elements
    addBoardGraphics(
      ctx,
      canvas.width,
      canvas.height,
      code,
      trickChallenge,
      customMessage,
      xpReward
    );
  };
  qrImg.src = qrDataURL;

  return canvas;
}

function drawSkateboardDeck(ctx, width, height) {
  // Skateboard deck outline
  ctx.beginPath();

  // Draw classic popsicle deck shape
  const noseHeight = 150;
  const tailHeight = 120;
  const deckWidth = width * 0.8;
  const centerX = width / 2;

  ctx.moveTo(centerX - deckWidth / 2, noseHeight);
  ctx.lineTo(centerX - deckWidth / 2, height - tailHeight);

  // Tail curve
  ctx.quadraticCurveTo(centerX - deckWidth / 3, height + 20, centerX, height);
  ctx.quadraticCurveTo(
    centerX + deckWidth / 3,
    height + 20,
    centerX + deckWidth / 2,
    height - tailHeight
  );

  ctx.lineTo(centerX + deckWidth / 2, noseHeight);

  // Nose curve
  ctx.quadraticCurveTo(centerX + deckWidth / 3, noseHeight - 100, centerX, noseHeight - 120);
  ctx.quadraticCurveTo(
    centerX - deckWidth / 3,
    noseHeight - 100,
    centerX - deckWidth / 2,
    noseHeight
  );

  ctx.closePath();

  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#FF6B6B');
  gradient.addColorStop(0.5, '#4ECDC4');
  gradient.addColorStop(1, '#667eea');

  ctx.fillStyle = gradient;
  ctx.fill();

  // Board outline
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 8;
  ctx.stroke();

  // Add grip tape texture on nose
  ctx.fillStyle = '#222222';
  ctx.fillRect(centerX - deckWidth / 2 + 20, noseHeight - 80, deckWidth - 40, 60);

  // Draw wood grain lines
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const y = height * 0.3 + i * 80;
    ctx.beginPath();
    ctx.moveTo(centerX - deckWidth / 2 + 40, y);
    ctx.lineTo(centerX + deckWidth / 2 - 40, y + (Math.random() * 20 - 10));
    ctx.stroke();
  }
}

function addBoardGraphics(ctx, width, height, code, trickChallenge, customMessage, xpReward) {
  // SkateQuest branding at top
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 10;
  ctx.fillText('SKATEQUEST', width / 2, 100);

  // Charity text
  ctx.font = 'bold 24px Arial';
  ctx.fillText('🛹 Charity Hunt 🛹', width / 2, 140);

  // Code at bottom of board
  ctx.font = 'bold 32px "Courier New"';
  ctx.fillStyle = '#000000';
  ctx.shadowBlur = 0;
  ctx.fillText(code, width / 2, height - 180);

  // Trick challenge (if any)
  if (trickChallenge) {
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 28px Arial';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 8;
    ctx.fillText(`🎯 ${trickChallenge}`, width / 2, height - 240);
  }

  // XP Reward
  ctx.fillStyle = '#00FF00';
  ctx.font = 'bold 36px Arial';
  ctx.fillText(`+${xpReward} XP`, width / 2, height - 140);

  // Custom message box
  if (customMessage) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(50, height - 100, width - 100, 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';

    // Word wrap message
    const maxWidth = width - 120;
    wrapText(ctx, customMessage, width / 2, height - 70, maxWidth, 22);
  }

  // Bottom instructions
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 20px Arial';
  ctx.fillText('Scan to claim!', width / 2, height - 40);

  // SkateQuest logo/icon
  ctx.font = '80px Arial';
  ctx.fillText('🛹', width / 2, 60);
}

function generateQRCodeDataURL(text) {
  // Create a temporary container for QR code
  const tempDiv = document.createElement('div');
  tempDiv.style.display = 'none';
  document.body.appendChild(tempDiv);

  // Generate QR code (using qrcode.js library)
  const qr = new QRCode(tempDiv, {
    text: `https://sk8quest.com/scan?code=${text}`,
    width: 512,
    height: 512,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H,
  });

  // Get the generated image
  const img = tempDiv.querySelector('img');
  const dataURL = img.src;

  // Cleanup
  document.body.removeChild(tempDiv);

  return dataURL;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let lines = [];

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && n > 0) {
      lines.push(line);
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  // Draw centered lines
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, x, startY + i * lineHeight);
  });
}

// Download skateboard QR as image
export function downloadSkateboardQR(canvas, code) {
  const link = document.createElement('a');
  link.download = `SkateQuest-Charity-${code}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// Print skateboard QR
export function printSkateboardQR(canvas) {
  const printWindow = window.open('', '', 'width=600,height=900');
  printWindow.document.write(`
        <html>
        <head>
            <title>Print SkateQuest Charity QR</title>
            <style>
                body {
                    margin: 0;
                    padding: 20px;
                    text-align: center;
                    font-family: Arial, sans-serif;
                }
                img {
                    max-width: 100%;
                    height: auto;
                }
                .instructions {
                    margin-top: 20px;
                    padding: 15px;
                    background: #FFF3CD;
                    border: 2px solid #FFC107;
                    border-radius: 8px;
                }
            </style>
        </head>
        <body>
            <h1>🛹 SkateQuest Charity QR Code</h1>
            <img src="${canvas.toDataURL()}" />
            <div class="instructions">
                <h3>How to Hide Your QR Code:</h3>
                <ol style="text-align: left; max-width: 400px; margin: 0 auto;">
                    <li>Cut out the skateboard shape (optional)</li>
                    <li>Laminate or seal in plastic to weatherproof</li>
                    <li>Hide at a skate spot, park, or cool location</li>
                    <li>Share hints on social media!</li>
                </ol>
                <p><strong>Every scan helps a kid get a skateboard! ❤️</strong></p>
            </div>
        </body>
        </html>
    `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

export default {
  generateSkateboardQR,
  downloadSkateboardQR,
  printSkateboardQR,
};
