import CryptoJS from "crypto-js";

export const decryptData = (encryptedText) => {
  try {
    let cleaned = encryptedText.slice(7);
    cleaned = cleaned.slice(0, -9) + cleaned.slice(-2);

    const key = CryptoJS.enc.Utf8.parse("M!N!ON$@MEON!ON$");

    const decrypted = CryptoJS.AES.decrypt(cleaned, key, {
      mode: CryptoJS.mode.ECB,
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("Decryption failed:", error);
    return null;
  }
};
