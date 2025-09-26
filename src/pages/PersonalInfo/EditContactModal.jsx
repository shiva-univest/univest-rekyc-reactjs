import React, { useState, useEffect, useRef } from "react";
import Cookies from "js-cookie";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import OtpInput from "react-otp-input";
import { toast } from "react-toastify";
import VerificationLoader from "../../Components/VerificationLoader/VerificationLoader";
import { triggerWebhook } from "../../helper/usewebhook";

import "./personal.css";
import { decryptData } from "../../decode";

const EditContactModal = ({ onClose, contact }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState("email"); // email | otp
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false); // Add this new state

  const [otp, setOtp] = useState("");
  const [moduleSharedData, setModuleSharedData] = useState(null);

  const [timer, setTimer] = useState(60);
  const [otpError, setOtpError] = useState("");
  const inputRefs = useRef([]);
  const otpRef = useRef(null);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  useEffect(() => {
    if (step === "otp" && timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [step, timer]);

  //  setTimeout(() => {
  //     const firstInput = document.querySelector(
  //       "input[autocomplete='one-time-code']"
  //     );
  //     if (firstInput) {
  //       firstInput.focus();
  //       firstInput.click();
  //     }
  //   }, 300);

  useEffect(() => {
    const fetchModuleData = async () => {
      try {
        const moduleDataResponse = await fetch(
          "https://rekyc.meon.co.in/v1/user/get_module_data",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Cookies.get("access_token")}`,
            },
            body: JSON.stringify({ page_id: "1" }),
          }
        );

        if (!moduleDataResponse.ok) {
          throw new Error("Failed to fetch module data");
        }

        const moduleData = await moduleDataResponse.json();
        console.log("Module Data Response:", moduleData);

        if (!moduleData?.data) {
          return { success: false, error: "No module data received" };
        }

        const { decryptData } = await import("../../decode");
        const decryptedData = JSON.parse(decryptData(moduleData.data));
        setModuleSharedData(decryptedData?.shared_data || null);
      } catch (moduleErr) {
        console.error("Failed to fetch or process module data:", moduleErr);
        return {
          success: false,
          error: "Failed to verify mobile number details",
        };
      }
    };

    fetchModuleData();
  }, [Cookies.get("access_token")]);

  const getValidToken = async () => {
    let token = Cookies.get("access_token");
    const refreshToken = Cookies.get("refresh_token");

    if (!token && refreshToken) {
      const resp = await fetch("https://rekyc.meon.co.in/v1/user/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const data = await resp.json();
      if (resp.ok && data?.access_token) {
        Cookies.set("access_token", data.access_token);
        token = data.access_token;
      }
    }
    return token;
  };

  // New function to fetch module data and redirect to eSign link
  const fetchAndRedirectToEsignLink = async (token) => {
    try {
      setLoading(true);
      const moduleRes = await fetch(
        "https://rekyc.meon.co.in/v1/user/get_module_data",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ page_id: "6" }),
        }
      );

      const moduleData = await moduleRes.json();
      console.log("get_module_data (raw) ->", moduleData);

      let parsed;
      try {
        // You'll need to import the decryptData function
        parsed = JSON.parse(decryptData(moduleData.data));
      } catch (err) {
        console.error("Failed to parse decrypted data:", err);
        parsed = {};
      }

      // Get links
      let links = parsed?.["12"]?.links || [];

      // Filter out signed ones
      links = links.filter((link) => !link.is_esigned);

      console.log("Filtered Links ->", links);

      if (!links || links.length === 0) {
        // No links available, redirect to congratulations
        navigate("/congratulations");
      } else {
        // Open the first available eSign link
        const firstLink = links[0];
        window.open(`https://rekyc.meon.co.in${firstLink.url}`);

        // Optionally, you can also navigate to congratulations or stay on current page
        // navigate("/congratulations");
      }
    } catch (err) {
      console.error("Error fetching eSign data:", err);
      alert("Failed to get eSign link. Please try again.");
    }
    finally {
      setLoading(false);
    }
  };

  // Function to call user form generation API
  const callUserFormGeneration = async () => {
    try {
      setLoading(true);
      const token = Cookies.get("access_token");

      if (!token) {
        alert("Authorization failed.");
        return;
      }

      const response = await fetch(
        "https://rekyc.meon.co.in/v1/user/user_form_generation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ re_esign: false }),
        }
      );

      const formData = await response.json();
      console.log("User form generation response:", formData);

      if (formData?.status === true) {
        console.log("Form generation successful, navigating to esign");

        await fetchAndRedirectToEsignLink(token);
      } else {
        alert(
          formData?.message || "Failed to generate user form. Please try again."
        );
      }
    } catch (error) {
      console.error("User form generation error:", error);
      alert("Failed to generate user form. Please try again.");
    } finally {
      setLoading(false); // ⬅️ always hide loader
    }
  };

  const checkEmailInModuleData = async (enteredEmail, token) => {
  try {
    const moduleDataResponse = await fetch(
      "https://rekyc.meon.co.in/v1/user/get_module_data",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ page_id: "1" }),
      }
    );

    if (!moduleDataResponse.ok) {
      throw new Error("Failed to fetch module data");
    }

    const moduleData = await moduleDataResponse.json();
    console.log("Module Data Response:", moduleData);

    if (!moduleData?.data) {
      return { success: false, error: "No module data received" };
    }

    // Decrypt the module data
    const { decryptData } = await import("../../decode");
    const decryptedData = JSON.parse(decryptData(moduleData.data));

    console.log("Decrypted module data:", decryptedData);

    // Check contact_detail_data for is_new: true entries
    const contactDetailData = decryptedData["3"]?.contact_detail_data || [];
    console.log("Contact detail data:", contactDetailData);

    // Find entries where is_new is true
    const newContacts = contactDetailData.filter(
      (contact) => contact.is_new === true
    );
    console.log("New contacts (is_new: true):", newContacts);

    // Check if entered email matches any new contact
    const matchingContact = newContacts.find(
      (contact) =>
        contact.email?.toLowerCase() === enteredEmail.toLowerCase()
    );

    console.log("Entered email:", enteredEmail);
    console.log("Matching contact:", matchingContact);

    if (matchingContact) {
      return {
        success: true,
        isValidEmail: true,
        shouldRedirectToEsign: true,
      };
    } else {
      return {
        success: true,
        isValidEmail: false,
        error: "This email is already updated for another account",
      };
    }
  } catch (moduleErr) {
    console.error("Failed to fetch or process module data:", moduleErr);
    return {
      success: false,
      error: "Failed to verify email details",
    };
  }
};


  const callUpdateEmailAPI = async (token) => {
    return fetch("https://rekyc.meon.co.in/v1/user/updateemail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email: newEmail }),
    });
  };

  const callVerifyOtpAPI = async (otpValue, token) => {
    return fetch("https://rekyc.meon.co.in/v1/user/verifyemail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ otp: otpValue, email: newEmail }),
    });
  };

  const handleVerifyOTP = async () => {
    if (!emailRegex.test(newEmail)) {
      setError("Enter a valid Email ID");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const token = Cookies.get("access_token");
      const response = await callUpdateEmailAPI(token);
      const data = await response.json();

      if (response.ok && data?.status) {
        setStep("otp");
        console.log("otp value:", otp);
        setTimer(60);
      } else {
        // If updatemobile returns false, call get_module_data API
        const moduleResult = await checkEmailInModuleData(newPhone, token);

        if (!moduleResult.success) {
          setError(moduleResult.error);
          return;
        }

        if (moduleResult.isValidEmail) {
          // Mobile number matches existing contact with is_new: false
          // Proceed to OTP step
          // setStep("otp");
          // setTimer(15);
          await callUserFormGeneration();
          // navigate("/esign");
        } else {
          // Mobile number doesn't match any existing contact
          setError(moduleResult.error);
        }
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeOtp = (val, index) => {
    if (!/^[0-9]?$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);
    setOtpError("");

    if (val && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleVerifyOtpSubmit = async () => {
    if (otp.length !== 6) {
      setOtpError("Enter 6 digit OTP");
      console.log("otp value:", otp);
      return;
    }
    setVerifyingOtp(true); // Start loading
    setOtpError(""); // Clear any previous errors

    const otpValue = otp; // string already
    console.log("Submitting OTP value:", otpValue);

    try {
      const token = await getValidToken();
      const response = await callVerifyOtpAPI(otpValue, token);
      const data = await response.json();
      if (data?.status === true) {
        triggerWebhook({
          step: "email",
          eSignCompleted: "no",
          finalUpdateExecuted: "no",
          userId: moduleSharedData?.clientcode || "<user-id>",
        });
        setOtpError("");

        try {
          setLoading(true);

          const formRes = await fetch(
            "https://rekyc.meon.co.in/v1/user/user_form_generation",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ re_esign: false }),
            }
          );

          const formData = await formRes.json();
          console.log("user_form_generation response:", formData);
        } catch (formErr) {
          console.error("user_form_generation API failed:", formErr);
        }
        finally {
          setLoading(false);
        }

        toast.success(data.message || "Email verified successfully!");

        await callUserFormGeneration(token);
        // navigate("/esign");
      } else {
        setOtpError(data?.message || "Enter correct OTP");
      }
    } catch (err) {
      setOtpError("Network error");
    } finally {
      setVerifyingOtp(false); // Stop loading
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
       {loading && <VerificationLoader isVisible={loading} />}
      <div className="modal-content3" onClick={(e) => e.stopPropagation()}>
        {step === "email" ? (
          <>
            <h2>Your details are safe & secure</h2>
            <div className="existing-email">
              <span className="label">Existing email ID</span>
              <div className="email_val_container">
                <span className="value email_value">
                  {contact?.email || "Not Available"}
                </span>
                <img src="./App Icon.svg" />
              </div>
            </div>

            <div className="input-group">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email"
                required
              />
              <label>Enter new email ID</label>
            </div>

            {error && <p className="error-text_phone"> {error}</p>}

            <button
              className="verify-button"
              onClick={handleVerifyOTP}
              disabled={loading}
            >
              {loading ? "Processing..." : "Verify OTP"}
            </button>
          </>
        ) : (
          <>
            <h2 className="verify_emai">Verify Email</h2>
            <p className="a_verification">
              A verification code has been sent on your email
            </p>
            <p className="email-display">
              {newEmail}{" "}
              {/* <span
                className="edit-button"
                onClick={() => {
                  setStep("email");
                  setOtp(Array(6).fill(""));
                }}
              >
                ✏ Edit
              </span> */}
              <span
                className="edit-button"
                onClick={() => {
                  setStep("email");
                  setOtp(""); // clear OTP fields
                  setNewEmail(""); // clear the email input
                  setError("");
                }}
              >
                ✏ Edit
              </span>
            </p>

            <OtpInput
              value={otp}
              onChange={(val) => {
                if (/^\d*$/.test(val)) {
                  setOtp(val);
                  setOtpError("");
                }
              }}
              numInputs={6}
              autoFocus // works on desktop
              renderSeparator={null}
              renderInput={(props, index) => (
                <input
                  {...props}
                  autoComplete="one-time-code" // 🔑 allows SMS OTP autofill
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  onInput={(e) => {
                    e.target.value = e.target.value.replace(/\D/g, "");
                  }}
                  // extra fallback: if autoFocus fails on mobile, tap label focuses first input
                  onClick={(e) => {
                    if (index === 0 && !otp) {
                      e.target.focus();
                    }
                  }}
                  className={otpError ? "input-error" : ""}
                />
              )}
              inputStyle={{
                width: "50px",
                height: "50px",
                textAlign: "center",
                fontSize: "18px",
                border: "1px solid #ccc",
                borderRadius: "8px",
              }}
              containerStyle={{
                display: "flex",
                justifyContent: "space-between",
                gap: "5px",
                marginBottom: "15px",
              }}
            />

            {otpError && otp && (
              <p className="error-text_phone">❗ {otpError}</p>
            )}

            <div className="bottom_verfiy">
              {timer > 0 ? (
                <p style={{ fontWeight: "bold" }}>
                  Resend OTP in <span style={{ color: "green" }}>{timer}s</span>
                </p>
              ) : (
                <p
                  style={{
                    fontWeight: "bold",
                    color: "green",
                    cursor: "pointer",
                  }}
                  onClick={async () => {
                    try {
                      const token = await getValidToken();
                      const response = await callUpdateEmailAPI(token);
                      if (response.ok) {
                        setTimer(60);
                        setOtp("");
                      } else {
                        setOtpError("Failed to resend OTP");
                      }
                    } catch (err) {
                      setOtpError("Network error");
                    }
                  }}
                >
                  Resend OTP
                </p>
              )}
              <button
                className="verify-button"
                disabled={otp.length !== 6 || verifyingOtp} // Disable when loading or invalid OTP
                onClick={handleVerifyOtpSubmit}
                style={{
                  backgroundColor:
                    otp.length === 6 && !verifyingOtp
                      ? "rgba(51, 163, 77, 1)"
                      : "rgba(157, 157, 157, 1)",
                }}
              >
                {verifyingOtp ? "Verifying OTP..." : "Verify"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EditContactModal;
