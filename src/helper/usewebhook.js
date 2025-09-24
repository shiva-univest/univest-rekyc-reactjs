import axios from "axios";

export const triggerWebhook = async (eventData) => {
  console.log(eventData)
  try {
    const payload = {
      ReKYC: {
        step: eventData.step,
        eSignCompleted: eventData.eSignCompleted || "no",
        finalUpdateExecuted: eventData.finalUpdateExecuted || "no",
        userId: eventData.userId || "<user-id>",
        timeStamp: new Date().toLocaleString("en-GB", { hour12: false })
      }
    };
    console.log(eventData)
    const response = await axios.post(
      "https://api.univest.in/brokering/web-hook/meon",
      payload,
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    console.log("Webhook sent:", response.data);
    return response.data;
  } catch (error) {
    console.error("Webhook error:", error.message);
    throw error;
  }
};