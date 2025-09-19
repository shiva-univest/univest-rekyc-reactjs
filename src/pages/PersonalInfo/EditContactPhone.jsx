import React, { useState, useEffect, useRef } from "react";
import Cookies from "js-cookie";
import "./personal.css";
import OtpInput from "react-otp-input";
import { toast } from "react-toastify";
import { decryptData } from "../../decode";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

const EditContactPhone = ({ onClose, contact }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState("phone");
  const [newPhone, setNewPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(60);
  const [otpError, setOtpError] = useState("");
  const ranOnce = useRef(false);
  const inputRefs = useRef([]);
  const firstInputRef = useRef(null);
  const phoneInputRef = useRef(null);

  useEffect(() => {
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, []);

  const phoneRegex = /^[0-9]{10}$/;

  useEffect(() => {
    if (step === "otp" && timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [step, timer]);

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
        const { decryptData } = await import("../../decode");
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
        window.open(`https://rekyc.meon.co.in${firstLink.url}`, "_blank");

        // Optionally, you can also navigate to congratulations or stay on current page
        // navigate("/congratulations");
      }
    } catch (err) {
      console.error("Error fetching eSign data:", err);
      alert("Failed to get eSign link. Please try again.");
    }
  };

  // Function to call user form generation API
  const callUserFormGeneration = async () => {
    try {
      const token = await getValidToken();

      if (!token) {
        toast.error("Authorization failed.");
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

        // navigate("/esign");
      } else {
        toast.error(
          formData?.message || "Failed to generate user form. Please try again."
        );
      }
    } catch (error) {
      console.error("User form generation error:", error);
      toast.error("Failed to generate user form. Please try again.");
    }
  };

  const checkMobileInModuleData = async (enteredMobile, token) => {
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
      const contactDetailData = decryptedData["1"]?.contact_detail_data || [];
      console.log("Contact detail data:", contactDetailData);

      // Find entries where is_new is true
      const newContacts = contactDetailData.filter(
        (contact) => contact.is_new === true
      );
      console.log("New contacts (is_new: true):", newContacts);

      // Check if entered mobile number matches any new contact
      const enteredMobileWithCountryCode = `+91${enteredMobile}`;
      const matchingContact = newContacts.find(
        (contact) =>
          contact.mobile === enteredMobileWithCountryCode ||
          contact.mobile === enteredMobile
      );

      console.log("Entered mobile:", enteredMobileWithCountryCode);
      console.log("Matching contact:", matchingContact);

      if (matchingContact) {
        return {
          success: true,
          isValidMobile: true,
          shouldRedirectToEsign: true,
        };
      } else {
        return {
          success: true,
          isValidMobile: false,
          error: "This mobile number is updated for another account",
        };
      }
    } catch (moduleErr) {
      console.error("Failed to fetch or process module data:", moduleErr);
      return {
        success: false,
        error: "Failed to verify mobile number details",
      };
    }
  };

  const callUpdatePhoneAPI = async (token) => {
    const response = await fetch(
      "https://rekyc.meon.co.in/v1/user/updatemobile",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mobile: newPhone }),
      }
    );
    return response;
  };

  const callVerifyOtpAPI = async (otpValue, token) => {
    const response = await fetch(
      "https://rekyc.meon.co.in/v1/user/verifymobile",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({ otp: otpValue, mobile: newPhone }),
      }
    );
    return response;
  };

  // const handleVerifyPhone = async () => {
  //   if (!phoneRegex.test(newPhone)) {
  //     setError("Enter a valid 10-digit phone number");
  //     return;
  //   }
  //   setError("");
  //   setLoading(true);

  //   try {
  //     const token = await getValidToken();
  //     const response = await callUpdatePhoneAPI(token);
  //     const data = await response.json();

  //     if (response.ok && data?.status) {
  //       setStep("otp");
  //       setTimer(15);
  //     } else {
  //       setError(data?.message || "Failed to send OTP. Try again.");
  //     }
  //   } catch (err) {
  //     setError("Network error");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleVerifyPhone = async () => {
    if (!phoneRegex.test(newPhone)) {
      setError("Enter a valid 10-digit phone number");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const token = await getValidToken();
      const response = await callUpdatePhoneAPI(token);
      const data = await response.json();

      if (response.ok && data?.status) {
        // If updatemobile is successful, proceed to OTP step directly
        setStep("otp");
        setTimer(60);
      } else {
        // If updatemobile returns false, call get_module_data API
        const moduleResult = await checkMobileInModuleData(newPhone, token);

        if (!moduleResult.success) {
          setError(moduleResult.error);
          return;
        }

        if (moduleResult.isValidMobile) {
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
      setError("Network error", err);
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
      return;
    }

    try {
      const token = await getValidToken();
      const response = await callVerifyOtpAPI(otp, token); // otp is already string
      const data = await response.json();

      if (data?.status === true) {
        setOtpError("");
        toast.success(data.message || "Phone verified successfully!");

        try {
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

          if (formData?.status === true) {
            // await callUserFormGeneration();
            await fetchAndRedirectToEsignLink(token);
            // navigate("/esign");
          } else {
            setOtpError(formData?.message || "Failed to generate form");
          }
        } catch (formErr) {
          console.error("Failed to call user_form_generation:", formErr);
          setOtpError("Something went wrong while generating form");
        }
      } else {
        setOtpError(data?.message || "Enter correct OTP");
      }
    } catch (err) {
      setOtpError("Network error");
    }
  };
  // setTimeout(() => {
  //     const firstInput = document.querySelector(
  //       "input[autocomplete='one-time-code']"
  //     );
  //     if (firstInput) {
  //       firstInput.focus();
  //       firstInput.click();
  //     }
  //   }, 300);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content3" onClick={(e) => e.stopPropagation()}>
        {step === "phone" ? (
          <>
            <h2>Your details are safe & secure</h2>
            <div className="existing-email">
              <span className="label mobile_label_exist">Existing mobile no</span>
              <div className="email_val_container">
                <span className="value email_value">
                  {contact?.mobile || "Not Available"}
                </span>
                <img src="./App Icon.svg" />
              </div>
            </div>

            <div className="input-group2">
              <div className="input-group">
                <input
                  ref={phoneInputRef}
                  type="tel"
                  value={newPhone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    if (val.length <= 10) {
                      setNewPhone(val);
                    }
                    // Always clear error on change
                    setError("");
                  }}
                  maxLength={10}
                  placeholder=" "
                  className={`custom-input ${error ? "input-error" : ""}`}
                  required
                />

                <label className="floating-label">Enter new mobile no</label>
              </div>
            </div>

            {error && newPhone && <p className="error-text_phone">{error}</p>}

            <button
              className="verify-button2"
              onClick={handleVerifyPhone}
              disabled={loading}
            >
              {loading ? "Processing..." : "Verify OTP"}
            </button>
          </>
        ) : (
          <>
            <h2 className="verify_emai">Verify Phone</h2>
            <p className="a_verification">
              A verification code has been sent on your phone
            </p>
            <p className="email-display">
              {newPhone}{" "}
              {/* <span
                className="edit-btn"
                onClick={() => {
                  setStep("phone");
                  setOtp(Array(6).fill(""));
                }}
              >
                ✏ Edit
              </span> */}
              <span
                className="edit-btn"
                onClick={() => {
                  setStep("phone");
                  setOtp(""); // reset OTP inputs
                  setNewPhone(""); // reset phone input
                  setError(""); // optional: clear error
                  setTimeout(() => phoneInputRef.current?.focus(), 100);
                }}
              >
                ✏ Edit
              </span>
            </p>

            <OtpInput
              value={otp}
              onChange={(val) => {
                // Allow only digits
                if (/^\d*$/.test(val)) {
                  setOtp(val);
                }
              }}
              numInputs={6}
              autoFocus
              renderSeparator={null}
              renderInput={(props) => (
                <input
                  {...props}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className={otpError ? "input-error" : ""}
                />
              )}
              inputStyle={{
                width: "44px",
                height: "44px",
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
                      const response = await callUpdatePhoneAPI(token);
                      if (response.ok) {
                        setTimer(60);
                        setOtp(""); // reset string instead of array
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

              {/* <button
                className="verify-button"
                disabled={otp.join("").length !== 6}
                onClick={handleVerifyOtpSubmit}
                style={{
                  backgroundColor:
                    otp.join("").length === 6
                      ? "rgba(51, 163, 77, 1)"
                      : "rgba(157, 157, 157, 1)",
                }}
              >
                Verify
              </button> */}
              <button
                className="verify-button"
                disabled={otp.length !== 6}
                onClick={handleVerifyOtpSubmit}
                style={{
                  backgroundColor:
                    otp.length === 6
                      ? "rgba(51, 163, 77, 1)"
                      : "rgba(157, 157, 157, 1)",
                }}
              >
                Verify
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EditContactPhone;
