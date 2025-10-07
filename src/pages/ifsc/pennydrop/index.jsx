import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "./style.css";
import Overlay from "../../Overlay/Overlay";
import { CgLaptop } from "react-icons/cg";
import Header from "../../../Components/Header.jsx";
import { toast } from "react-toastify";
import api from "../../../api/api.js";
import VerificationLoader from "../../../Components/VerificationLoader/VerificationLoader.jsx";
import { sendDataToMixpanel } from "../../../lib/utils.js";

const Pennycompo = () => {
  const [ifscCode, setIfscCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [showDepositOverlay, setShowDepositOverlay] = useState(false);
  const [showTimeoutPopup, setShowTimeoutPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [showConfirmAccount, setShowConfirmAccount] = useState(false);
  const [loading, setLoading] = useState(false);

  // validation error messages added karunga bhai
  const [accountError, setAccountError] = useState("");
  const [confirmAccountError, setConfirmAccountError] = useState("");
  const [ifscCodeError, setIfscCodeError] = useState("");

  useEffect(() => {
    sendDataToMixpanel("page_viewed", {
      page: "rekyc_link_bank_ifsc",
    });
  }, []);

  

  const validateAccountNumber = (accountNum) => {
    // Remove any spaces or special characters
    const cleanedNumber = accountNum.replace(/[^0-9]/g, "");

    // Check if it's a valid account number (9-18 digits) acha kya
    if (cleanedNumber.length === 0) {
      return { isValid: false, message: "Account number is required" };
    }

    if (cleanedNumber.length < 9) {
      return {
        isValid: false,
        message: "Account number must be at least 9 digits",
      };
    }

    if (cleanedNumber.length > 18) {
      return {
        isValid: false,
        message: "Account number cannot exceed 18 digits",
      };
    }

    if (!/^\d+$/.test(cleanedNumber)) {
      return {
        isValid: false,
        message: "Account number must contain only digits",
      };
    }

    return { isValid: true, message: "" };
  };

  const handleAccountNumberChange = (value) => {
    const cleanedValue = value.replace(/[^0-9]/g, "");

    setAccountNumber(cleanedValue);

    const validation = validateAccountNumber(cleanedValue);
    setAccountError(validation.message);

    if (confirmAccountNumber && cleanedValue === confirmAccountNumber) {
      setConfirmAccountError("");
    } else if (confirmAccountNumber && cleanedValue !== confirmAccountNumber) {
      setConfirmAccountError("Account numbers do not match");
    }
  };

  // Enhanced confirm account number change handler
  const handleConfirmAccountNumberChange = (value) => {
    // Allow only numbers and remove any non-numeric characters
    const cleanedValue = value.replace(/[^0-9]/g, "");

    setConfirmAccountNumber(cleanedValue);

    const validation = validateAccountNumber(cleanedValue);
    if (!validation.isValid) {
      setConfirmAccountError(validation.message);
    } else if (accountNumber && cleanedValue !== accountNumber) {
      setConfirmAccountError("Account numbers do not match");
    } else {
      setConfirmAccountError("");
    }
  };

  const navigate = useNavigate();

  // ✅ IFSC validation API
  const searchIFSC = async () => {
    if (!ifscCode) {
      setIfscCodeError("Please enter IFSC code");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        "https://rekyc.meon.co.in/v1/user/razorpay_IFSC_validation",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ifsc: ifscCode }),
        }
      );

      const data = await response.json();

      if (data?.data === "You have entered Invalid IFSC Code.") {
        setIfscCodeError(data.data);
        setIfscCode("");
        setBankName("");
      } else if (data?.message?.BANK) {
        setBankName(data.message.BANK);
      }
    } catch (error) {
      console.error("Error validating IFSC:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Token helpers
  const getAccessToken = () => Cookies.get("access_token");
  const getRefreshToken = () => Cookies.get("refresh_token");

  const refreshAccessToken = async () => {
    try {
      const response = await axios.post(
        "https://rekyc.meon.co.in/v1/user/refresh_token",
        { refresh_token: getRefreshToken() }
      );
      const newToken = response.data.access_token;
      Cookies.set("access_token", newToken);
      return newToken;
    } catch (error) {
      toast.error("Session expired. Please login again.");
      return null;
    }
  };

  // ✅ Penny Drop API
  const callPennyDropAPI = async (token) => {
    return api.post(
      "https://rekyc.meon.co.in/v1/user/check_pennydrop",
      {
        account_number: accountNumber,
        ifsc: ifscCode,
        account_type: "Saving",
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  };

  const handlePennyDrop = async () => {
    const accountValidation = validateAccountNumber(accountNumber);
    const confirmAccountValidation =
      validateAccountNumber(confirmAccountNumber);

    let errorMessage = "";
    if (!accountValidation.isValid) errorMessage = accountValidation.message;
    else if (!confirmAccountValidation.isValid)
      errorMessage = confirmAccountValidation.message;
    else if (accountNumber !== confirmAccountNumber)
      errorMessage = "Account numbers do not match";

    sendDataToMixpanel("cta_clicked", {
      page: "rekyc_add_bank",
      cta_text: "Proceed",
      error: errorMessage || null,
    });

    // if (!accountValidation.isValid) {
    //   setAccountError(accountValidation.message);
    //   return;
    // }

    // if (!confirmAccountValidation.isValid) {
    //   setConfirmAccountError(confirmAccountValidation.message);
    //   return;
    // }

    // if (accountNumber !== confirmAccountNumber) {
    //   setConfirmAccountError("Account numbers do not match");
    //   return;
    // }

    if (errorMessage) {
      if (!accountValidation.isValid)
        setAccountError(accountValidation.message);
      if (!confirmAccountValidation.isValid)
        setConfirmAccountError(confirmAccountValidation.message);
      if (accountNumber !== confirmAccountNumber)
        setConfirmAccountError("Account numbers do not match");
      return;
    }

    setAccountError("");
    setConfirmAccountError("");

    let token = getAccessToken();
    console.log("shrihari", token);
    try {
      // setLoading(true);
      const response = await callPennyDropAPI(token);
      console.log("shrihariReposene", response);
      console.log("pennydrop_flag value:", response.data?.data?.pennydrop_flag);
      console.log(
        "pennydrop_flag type:",
        typeof response.data?.data?.pennydrop_flag
      );

      if (response.data?.data?.pennydrop_flag === true) {
        sendDataToMixpanel("bank_pd_success", {
          page: "rekyc_add_bank",
        });
        navigate("/bankaccountcomplete", {
          state: {
            bankData: {
              accountHolderName: response.data.data.response.name,
              accountNumber: response.data.data.response.account_number,
              ifscCode: response.data.data.response.ifsc,
              bankName: response.data.data.response.bank_name,
              branchName: response.data.data.response.branch_name,
              accountType: response.data.data.response.account_type,

              utr: response.data.data.response.utr,
              nameMatch: response.data.data.name_match,
              verificationStatus: response.data.data.response.verification,
              verificationReason: response.data.data.response.reason,
              verifiedAt:
                response.data.data.response.active_status.data.verifiedAt,

              bankTempId: response.data.data.bank_temp_id,
            },
          },
        });
      } else if (response.data?.data?.pennydrop_flag === false) {
        sendDataToMixpanel("bank_pd_failed", {
          page: "rekyc_add_bank",
          reason: response.data?.message || "Bank verification failed",
        });
        setPopupMessage(response.data?.message || "Bank verification failed");
        setShowTimeoutPopup(true);
      } else {
        console.log(
          "Unexpected pennydrop_flag value:",
          response.data?.data?.pennydrop_flag
        );
        setPopupMessage(
          "Unexpected response || Bank already exists. Please try again."
        );
        setShowTimeoutPopup(true);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          try {
            const retryResponse = await callPennyDropAPI(newToken);

            if (retryResponse.data?.data?.pennydrop_flag === true) {
              // Also pass data for retry scenario
              navigate("/bankaccountcomplete", {
                state: {
                  bankData: {
                    accountHolderName: retryResponse.data.data.response.name,
                    accountNumber:
                      retryResponse.data.data.response.account_number,
                    ifscCode: retryResponse.data.data.response.ifsc,
                    bankName: retryResponse.data.data.response.bank_name,
                    branchName: retryResponse.data.data.response.branch_name,
                    accountType: retryResponse.data.data.response.account_type,
                    utr: retryResponse.data.data.response.utr,
                    nameMatch: retryResponse.data.data.name_match,
                    verificationStatus:
                      retryResponse.data.data.response.verification,
                    verificationReason: retryResponse.data.data.response.reason,
                    verifiedAt:
                      retryResponse.data.data.response.active_status.data
                        .verifiedAt,
                    bankTempId: retryResponse.data.data.bank_temp_id,
                  },
                },
              });
            } else if (retryResponse.data?.data?.pennydrop_flag === false) {
              setPopupMessage(
                retryResponse.data?.message || "Bank verification failed"
              );
              setShowTimeoutPopup(true);
            } else {
              console.log(
                "Unexpected pennydrop_flag value on retry:",
                retryResponse.data?.data?.pennydrop_flag
              );
              setPopupMessage("Unexpected response. Please try again.");
              setShowTimeoutPopup(true);
            }
          } catch {
            setPopupMessage("Bank verification failed. Please try again.");
            setShowTimeoutPopup(true);
          }
        }
      } else {
        setPopupMessage(
          err.response?.data?.message || "Bank verification failed"
        );
        setShowTimeoutPopup(true);
      }
    }
  };

  return (
    <div className="Peny-container">
      {loading && <VerificationLoader isVisible={loading} />}
      <Header />
      {showDepositOverlay && <Overlay />}

      {showTimeoutPopup && (
        <div className="bottom-sheet-overlay">
          <div className="bottom-sheet">
            <div className="popup-icon">
              <img src="./exclamation_icon.svg" alt="bank icon" />
            </div>
            <h2>Your bank details couldn’t be verified</h2>
            <p>
              {popupMessage}
              <br />
              Please use the bank account with the same name as on your PAN.
            </p>
            <button
              className="bottom-sheet-button"
              onClick={() => {
                setShowTimeoutPopup(false);
                navigate("/bankaccount");
              }}
            >
              Continue with another account
            </button>
          </div>
        </div>
      )}

      {/* UI */}
      <div className="penny-container">
        <div className="penny-content1">
          <h4>Link bank account with IFSC</h4>
          <p>
            Deposit and withdrawal can happen only from the linked bank account
          </p>
        </div>

        <div className="penny-content2">
          <div className="univest-input-group">
            <input
              placeholder="Enter IFSC or Branch name"
              id="ifscInput"
              value={ifscCode}
              onChange={(e) => {
                setIfscCode(e.target.value.toUpperCase());
                setIfscCodeError(null);
              }}
              className={ifscCodeError ? "error" : ""}
              onBlur={searchIFSC}
              required
            />
            <label htmlFor="ifscInput" className="floating-label">
              Enter IFSC or Branch name
            </label>
            {ifscCodeError && (
              <span className="univest-error-message">{ifscCodeError}</span>
            )}
          </div>

          <div className="univest-input-group">
            <input
              placeholder="Enter your bank name"
              id="bankdetails"
              value={bankName}
              readOnly
            />
            <label htmlFor="bankdetails" className="floating-label">
              Enter your bank name
            </label>
          </div>
          <div className="univest-input-group">
            <input
              id="enter-account-number"
              placeholder="Enter account number"
              value={accountNumber}
              onChange={(e) => handleAccountNumberChange(e.target.value)}
              onPaste={(e) => e.preventDefault()}
              type="text"
              inputMode="numeric"
              maxLength="18"
              className={accountError ? "error" : ""}
              style={{ width: "100%" }}
              autoComplete="new-password"
            />
            <label htmlFor="enter-account-number" className="floating-label">
              Enter account number
            </label>
            {accountError && (
              <span className="univest-error-message">{accountError}</span>
            )}
          </div>

          <div className="univest-input-group" style={{ position: "relative" }}>
            <input
              placeholder="Re-confirm your account number"
              value={confirmAccountNumber}
              onChange={(e) => handleConfirmAccountNumberChange(e.target.value)}
              onPaste={(e) => e.preventDefault()}
              type={showConfirmAccount ? "text" : "password"}
              inputMode="numeric"
              maxLength="18"
              className={confirmAccountError ? "error" : ""}
              style={{ width: "100%", paddingRight: "40px" }}
              autoComplete="new-password"
            />
            <label htmlFor="enter-account-number" className="floating-label">
              Re-confirm your account number
            </label>

            <span
              onClick={() => setShowConfirmAccount(!showConfirmAccount)}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                cursor: "pointer",
                color: "#555",
              }}
            >
              {showConfirmAccount ? <FaEyeSlash /> : <FaEye />}
            </span>

            {confirmAccountError && (
              <span className="univest-error-message">
                {confirmAccountError}
              </span>
            )}
          </div>
        </div>

        <div className="penny-content3">
          <button className="univest-actions-btn" onClick={handlePennyDrop}>
            Proceed
          </button>
          <p className="bottom_portfolios">
            <img src="./Frame 150007.svg" alt="portfolio" />
            Portfolios worth 3,500Cr+ connected
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pennycompo;
