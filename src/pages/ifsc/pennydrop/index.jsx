// import React, { useState } from "react";
// import Cookies from "js-cookie";
// import axios from "axios";
// import "./style.css";
// import Overlay from "../../Overlay/Overlay";

// const Pennycompo = () => {
//   const [ifscCode, setIfscCode] = useState("");
//   const [accountNumber, setAccountNumber] = useState("");
//   const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
//   const [bankName, setBankName] = useState("");
//   const [showDepositOverlay, setShowDepositOverlay] = useState(false);

//   const searchIFSC = async () => {
//     if (!ifscCode) {
//       alert("Please enter IFSC code");
//       return;
//     }

//     try {
//       const response = await fetch(
//         "https://rekyc.meon.co.in/v1/user/razorpay_IFSC_validation",
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ ifsc: ifscCode }),
//         }
//       );

//       const data = await response.json();

//       if (data?.data === "You have entered Invalid IFSC Code.") {
//         alert(data.data);
//         setIfscCode("");
//         setBankName("");
//       } else if (data?.message?.BANK) {
//         setBankName(data.message.BANK);
//       }
//     } catch (error) {
//       console.error("Error validating IFSC:", error);
//     }
//   };

//   const getAccessToken = () => Cookies.get("access_token");
//   const getRefreshToken = () => Cookies.get("refresh_token");

//   const refreshAccessToken = async () => {
//     try {
//       const response = await axios.post(
//         "https://rekyc.meon.co.in/v1/user/refresh_token",
//         {
//           refresh_token: getRefreshToken(),
//         }
//       );
//       const newToken = response.data.access_token;
//       Cookies.set("access_token", newToken);
//       return newToken;
//     } catch (error) {
//       alert("Session expired. Please login again.");
//       return null;
//     }
//   };

//   const callPennyDropAPI = async (token) => {
//     return axios.post(
//       "https://rekyc.meon.co.in/v1/user/check_pennydrop",
//       {
//         account_number: accountNumber,
//         ifsc: ifscCode,
//         account_type: "Saving",
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       }
//     );
//   };

//   const handlePennyDrop = async () => {
//     if (!accountNumber || !confirmAccountNumber) {
//       alert("Please fill in both account number fields.");
//       return;
//     }

//     if (accountNumber !== confirmAccountNumber) {
//       alert("Account numbers do not match.");
//       return;
//     }

//     let token = getAccessToken();
//     try {
//       await callPennyDropAPI(token);
//       alert("Account verified successfully!");
//     } catch (err) {
//       if (err.response?.status === 401) {
//         const newToken = await refreshAccessToken();
//         if (newToken) {
//           try {
//             await callPennyDropAPI(newToken);
//             alert("Account verified successfully after refreshing token!");
//           } catch (err2) {
//             alert("Verification failed after retry.");
//           }
//         }
//       } else {
//         alert("Something went wrong during penny drop.");
//       }
//     }
//   };

//   return (
//     <div className="Peny-container">
//       {showDepositOverlay && <Overlay />}
//       <div className="penny-header">
//         <div className="penny-header-container">
//           <img src="./Icon_app.svg" />
//           <img src="/Frame 1171276551.svg" />
//         </div>
//       </div>

//       <div className="penny-container">
//         <div className="penny-content1">
//           <h4>Link bank account with IFSC</h4>
//           <p>
//             Deposit and withdrawal can happen only from the linked bank account
//           </p>
//         </div>

//         <div className="penny-content2">
//           <input
//             placeholder="Enter IFSC or Branch name"
//             value={ifscCode}
//             onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
//             onBlur={searchIFSC}
//             style={{ textTransform: "uppercase" }}
//           />

//           <input
//             className="penny-bank-button"
//             placeholder="ENTER YOUR BANK NAME"
//             value={bankName}
//             readOnly
//           />

//           <input
//             placeholder="ENTER ACCOUNT NUMBER"
//             value={accountNumber}
//             onChange={(e) => setAccountNumber(e.target.value)}
//           />
//           <input
//             placeholder="RE-CONFIRM ACCOUNT NUMBER"
//             value={confirmAccountNumber}
//             onChange={(e) => setConfirmAccountNumber(e.target.value)}
//           />
//         </div>

//         <div className="penny-content3">
//           <button className="penny-button" onClick={handlePennyDrop}>
//             Proceed
//           </button>
//           <p className="bottom_portfolios">
//             <img src="./Frame 150007.svg" />
//             Portfolios worth 3,500Cr+ connected
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Pennycompo;

import React, { useState } from "react";
import Cookies from "js-cookie";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./style.css";
import Overlay from "../../Overlay/Overlay";
import { CgLaptop } from "react-icons/cg";

const Pennycompo = () => {
  const [ifscCode, setIfscCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [showDepositOverlay, setShowDepositOverlay] = useState(false);
  const [showTimeoutPopup, setShowTimeoutPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState(""); // ✅ store API error message

  // validation error messages added karunga bhai
  const [accountError, setAccountError] = useState("");

  const [confirmAccountError, setConfirmAccountError] = useState("");

  // Add validation function
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

    // Check if it contains only numbers
    // kon mere comments padh raha hai
    if (!/^\d+$/.test(cleanedNumber)) {
      return {
        isValid: false,
        message: "Account number must contain only digits",
      };
    }

    return { isValid: true, message: "" };
  };

  // Enhanced account number change handler
  const handleAccountNumberChange = (value) => {
    // Allow only numbers and remove any non-numeric characters
    const cleanedValue = value.replace(/[^0-9]/g, "");

    setAccountNumber(cleanedValue);

    // Validate account number
    const validation = validateAccountNumber(cleanedValue);
    setAccountError(validation.message);

    // Clear confirm account error if numbers now match
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

    // Validate confirm account number
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
      alert("Please enter IFSC code");
      return;
    }

    try {
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
        alert(data.data);
        setIfscCode("");
        setBankName("");
      } else if (data?.message?.BANK) {
        setBankName(data.message.BANK);
      }
    } catch (error) {
      console.error("Error validating IFSC:", error);
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
      alert("Session expired. Please login again.");
      return null;
    }
  };

  // ✅ Penny Drop API
  const callPennyDropAPI = async (token) => {
    return axios.post(
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

  // ✅ Main handler
  const handlePennyDrop = async () => {
    // if (!accountNumber || !confirmAccountNumber) {
    //   alert("Please fill in both account number fields.");
    //   return;
    // }

    // if (accountNumber !== confirmAccountNumber) {
    //   alert("Account numbers do not match.");
    //   return;
    // }

    // Validate account numbers
    const accountValidation = validateAccountNumber(accountNumber);
    const confirmAccountValidation =
      validateAccountNumber(confirmAccountNumber);

    if (!accountValidation.isValid) {
      setAccountError(accountValidation.message);
      return;
    }

    if (!confirmAccountValidation.isValid) {
      setConfirmAccountError(confirmAccountValidation.message);
      return;
    }

    if (accountNumber !== confirmAccountNumber) {
      setConfirmAccountError("Account numbers do not match");
      return;
    }

    // Clear any existing errors
    setAccountError("");
    setConfirmAccountError("");

    let token = getAccessToken();
    console.log("shrihari", token);
    try {
      const response = await callPennyDropAPI(token);
      console.log("shrihariReposene", response);
      console.log("pennydrop_flag value:", response.data?.data?.pennydrop_flag);
      console.log(
        "pennydrop_flag type:",
        typeof response.data?.data?.pennydrop_flag
      );

      // ✅ More specific check - only show popup when pennydrop_flag is explicitly false
      if (response.data?.data?.pennydrop_flag === true) {
        // ✅ Success → navigate with data
        navigate("/bankaccountcomplete", {
          state: {
            bankData: {
              // Account details
              accountHolderName: response.data.data.response.name,
              accountNumber: response.data.data.response.account_number,
              ifscCode: response.data.data.response.ifsc,
              bankName: response.data.data.response.bank_name,
              branchName: response.data.data.response.branch_name,
              accountType: response.data.data.response.account_type,

              // Verification details
              utr: response.data.data.response.utr,
              nameMatch: response.data.data.name_match,
              verificationStatus: response.data.data.response.verification,
              verificationReason: response.data.data.response.reason,
              verifiedAt:
                response.data.data.response.active_status.data.verifiedAt,

              // Bank temp ID for future reference
              bankTempId: response.data.data.bank_temp_id,
            },
          },
        });
      } else if (response.data?.data?.pennydrop_flag === false) {
        // ❌ Only show popup when pennydrop_flag is explicitly false
        setPopupMessage(response.data?.message || "Bank verification failed");
        setShowTimeoutPopup(true);
      } else {
        // Handle unexpected cases (pennydrop_flag is undefined, null, etc.)
        console.log(
          "Unexpected pennydrop_flag value:",
          response.data?.data?.pennydrop_flag
        );
        setPopupMessage("Unexpected response. Please try again.");
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
      {showDepositOverlay && <Overlay />}

      {/* ❌ Failure popup */}
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
          <input
            placeholder="Enter IFSC or Branch name"
            value={ifscCode}
            onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
            onBlur={searchIFSC}
            style={{ textTransform: "uppercase" }}
          />

          <input
            className="penny-bank-button"
            placeholder="ENTER YOUR BANK NAME"
            value={bankName}
            readOnly
          />

          {/* Account Number Input with Validation */}
          <div className="input-container">
            <input
              placeholder="ENTER ACCOUNT NUMBER"
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
            {accountError && (
              <span className="error-message">{accountError}</span>
            )}
          </div>

          {/* Confirm Account Number Input with Validation */}
          <div className="input-container">
            <input
              placeholder="RE-CONFIRM ACCOUNT NUMBER"
              value={confirmAccountNumber}
              onChange={(e) => handleConfirmAccountNumberChange(e.target.value)}
              onPaste={(e) => e.preventDefault()}
              type="text"
              inputMode="numeric"
              maxLength="18"
              className={confirmAccountError ? "error" : ""}
              style={{ width: "100%" }}
              autoComplete="new-password"
            />
            {confirmAccountError && (
              <span className="error-message">{confirmAccountError}</span>
            )}
          </div>
        </div>

        <div className="penny-content3">
          <button className="penny-button" onClick={handlePennyDrop}>
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