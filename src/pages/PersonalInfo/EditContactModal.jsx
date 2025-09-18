import React, { useState, useEffect, useRef } from "react";
import Cookies from "js-cookie";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import OtpInput from "react-otp-input";
import { toast } from "react-toastify";

import "./personal.css";

const EditContactModal = ({ onClose, contact }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState("email"); // email | otp
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [otp, setOtp] = useState("");

  const [timer, setTimer] = useState(15);
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
      const token = await getValidToken();
      const response = await callUpdateEmailAPI(token);
      const data = await response.json();

      if (response.ok && data?.status) {
        setStep("otp");
        console.log("otp value:", otp);
        setTimer(15);
      } else {
        setError(data?.message || "Failed to send OTP. Try again.");
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
    const otpValue = otp; // string already
    console.log("Submitting OTP value:", otpValue);

    try {
      const token = await getValidToken();
      const response = await callVerifyOtpAPI(otpValue, token);
      const data = await response.json();

      if (data?.status === true) {
        setOtpError("");

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
          console.log("user_form_generation response:", formData);
        } catch (formErr) {
          console.error("user_form_generation API failed:", formErr);
        }

        toast.success(data.message || "Phone verified successfully!");
        navigate("/esign");
      } else {
        setOtpError(data?.message || "Enter correct OTP");
      }
    } catch (err) {
      setOtpError("Network error");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
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
                <img src="./App Icon.svg"/>
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
                        setTimer(15);
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

export default EditContactModal;
