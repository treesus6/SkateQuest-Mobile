const QRCode = require('qrcode');

// Change these for the spot you are tagging
const spotData = {
  spotId: "PASTE_SPOT_UUID_HERE",
  type: "skate-quest",
  secret: "skate-quest-v1"
};

const generateQR = async (data) => {
  try {
    const stringData = JSON.stringify(data);
    await QRCode.toFile(`./quest_${data.spotId}.png`, stringData);
    console.log("✅ QR Code generated! Print this and stick it at the spot.");
  } catch (err) {
    console.error(err);
  }
};

generateQR(spotData);
