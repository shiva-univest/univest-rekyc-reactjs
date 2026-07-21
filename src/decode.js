import CryptoJS from "crypto-js";

const key = CryptoJS.enc.Utf8.parse("M!N!ON$@MEON!ON$");

export const decryptData = (encryptedText) => {
  try {
    let cleaned = encryptedText.slice(7);
    cleaned = cleaned.slice(0, -9) + cleaned.slice(-2);

    const decrypted = CryptoJS.AES.decrypt(cleaned, key, {
      mode: CryptoJS.mode.ECB,
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("Decryption failed:", error);
    return null;
  }
};

export const encryptData = (plainText) => {
  try {
    return CryptoJS.AES.encrypt(plainText, key, {
      mode: CryptoJS.mode.ECB,
    }).toString();
  } catch (error) {
    console.error("Encryption failed:", error);
    return null;
  }
};
