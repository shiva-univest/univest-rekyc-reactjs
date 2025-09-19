import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { decryptData } from "../../decode";
import { useNavigate, useLocation } from "react-router-dom";
import "./style.css";
import axios from "axios";
import Header from "../../Components/Header";
import { toast } from "react-toastify";
import { BANKLIST } from "../../lib/utils";

const BankaccAccountComplete = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bankTempId, setBankTempId] = useState("");
  const [showTimeoutPopup, setShowTimeoutPopup] = useState(false);
  const navigate = useNavigate();
  const location = useLocation(); // Add this

  // Get data passed from pennydrop
  const passedBankData = location.state?.bankData;

  const [bankDetails, setBankDetails] = useState({
    name: passedBankData?.accountHolderName || "",
    account_number: passedBankData?.accountNumber || "",
    branch_name: passedBankData?.branchName || "",
    ifsc: passedBankData?.ifscCode || "",
    bank_temp_id: passedBankData?.bankTempId || "",
    bank_name: passedBankData?.bankName || "",
  });

  const getRedirectUrl = () => {
    const token = Cookies.get("access_token");
    return `${window.location.href}?token=${token}`;
  };

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);

    const transId = sessionStorage.getItem("transid");
    const tempIdFromURL = queryParams.get("bank_temp_id");
    const isSuccess = queryParams.get("success") === "true";
    const isTimedOut = queryParams.get("timedOut") === "true";

    // If we have data from pennydrop, use it and set bankTempId
    if (passedBankData?.bankTempId) {
      setBankTempId(passedBankData.bankTempId);
      console.log("Using data from pennydrop:", passedBankData);
      return; // Don't run the other API logic
    }

    // Fall back to existing logic if no passed data
    if (tempIdFromURL) {
      setBankTempId(tempIdFromURL);
    }

    if (isSuccess && transId) {
      callReverseResponseAPI(transId);
    }

    if (!isSuccess && isTimedOut) {
      setShowTimeoutPopup(true);
    }

    // const cleanUrl = `${window.location.origin}${window.location.pathname}`;
    // window.history.replaceState(null, "", cleanUrl);
  }, [passedBankData]); // Add dependency

  const getrefreshtoken = async () => {
    try {
      const refreshToken = Cookies.get("refresh_token");
      if (!refreshToken) {
        setError("No refresh token available");
        return null;
      }

      const response = await fetch(
        "https://rekyc.meon.co.in/v1/user/token/refresh",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh: refreshToken }),
        }
      );

      if (!response.ok) {
        throw new Error(`Refresh token failed with status ${response.status}`);
      }

      const data = await response.json();
      Cookies.set("access_token", data.access);
      Cookies.set("refresh_token", data.refresh);
      return data.access;
    } catch (err) {
      console.error("Refresh error:", err);
      setError(err.message);
      return null;
    }
  };

  const callReversePennydropAPISuccess = async (retryCount = 0) => {
    const redirecturl = getRedirectUrl();
    console.log("redirecturl:", redirecturl);

    try {
      setLoading(true);
      let accessToken = Cookies.get("access_token");

      if (!accessToken) {
        throw new Error("No access token found");
      }

      const response = await fetch(
        "https://rekyc.meon.co.in/v1/user/reverse_pennydrop_api_setu_response",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ redirect_url: redirecturl }),
        }
      );

      if (response.status === 401 && retryCount < 1) {
        const newToken = await getrefreshtoken();
        if (newToken) {
          return callReversePennydropAPISuccess(retryCount + 1);
        }
        throw new Error("Failed to refresh token");
      }

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      const reciveddata = await response.json();
      const decrypted = decryptData(reciveddata.data);
      const data = JSON.parse(decrypted);
      sessionStorage.setItem("transid", data?.id);

      if (data?.shortUrl) {
        window.location.href = data.shortUrl;
      } else {
        console.error("No shortUrl in response");
      }
    } catch (err) {
      console.error("Error in callReversePennydropAPISuccess:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const callReverseResponseAPI = async (transId, retryCount = 0) => {
    console.log("Calling Setu response API...");

    try {
      let token = Cookies.get("access_token");

      const response = await fetch(
        "https://rekyc.meon.co.in/v1/user/reverse_pennydrop_api_setu_response",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ entity_id: transId }),
        }
      );

      if (response.status === 401 && retryCount < 1) {
        console.warn("Token expired, trying to refresh...");
        const newToken = await getrefreshtoken();

        if (newToken) {
          Cookies.set("access_token", newToken);
          return callReverseResponseAPI(transId, retryCount + 1);
        } else {
          throw new Error("Token refresh failed");
        }
      }

      if (!response.ok) {
        throw new Error(`API failed: ${response.status}`);
      }

      const result = await response.json();
      let decrypted = decryptData(result.data);
      decrypted = JSON.parse(decrypted);

      console.log("Decrypted response:11111111111", decrypted);

      if (decrypted && decrypted?.pennydrop_flag === true) {
        // ✅ Success case - set bank details
        const details = {
          name: decrypted?.response?.name || decrypted?.name || "",
          account_number: decrypted?.response?.account_number || "",
          branch_name: decrypted?.response?.branch_name || "",
          ifsc: decrypted?.response?.ifsc || "",
          bank_temp_id: decrypted?.bank_temp_id || "",
          bank_name: decrypted?.response?.bank_name || "",
        };

        console.log("details", details);
        setBankDetails(details);
      } else {
        // ❌ Failure case - show popup
        console.warn("Pennydrop verification failed, showing popup..ffdffdf.");
        setShowTimeoutPopup(true);
      }
    } catch (err) {
      console.error("Error in callReverseResponseAPI:", err);
    }
  };

  // Function to call user form generation API
  // const callUserFormGeneration = async () => {
  //   try {
  //     const token = Cookies.get("access_token");

  //     const response = await axios.post(
  //       "https://rekyc.meon.co.in/v1/user/user_form_generation",
  //       { re_esign: false },
  //       {
  //         headers: { Authorization: `Bearer ${token}` },
  //       }
  //     );

  //     if (response.data?.status === true) {
  //       console.log("navigateion to esign page");
  //       navigate("/esign");
  //     } else {
  //       alert(
  //         response.data?.message ||
  //         "Failed to generate user form. Please try again."
  //       );
  //     }
  //   } catch (error) {
  //     console.error("User form generation error:", error);
  //     alert(
  //       error.response?.data?.message ||
  //       "Failed to generate user form. Please try again."
  //     );
  //   }
  // };

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
        // Fetch module data to get eSign links
        await fetchAndRedirectToEsignLink(token);
      } else {
        alert(
          formData?.message || "Failed to generate user form. Please try again."
        );
      }
    } catch (error) {
      console.error("User form generation error:", error);
      alert("Failed to generate user form. Please try again.");
    }
  };

  const verifyBankDetails = async () => {
    console.log("button press");
    try {
      const token = Cookies.get("access_token");

      const response = await fetch(
        `https://rekyc.meon.co.in/v1/user/verify_bank_details/${bankDetails?.bank_temp_id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401 && retryCount < 1) {
        console.warn("Access token expired. Refreshing...");
        const newToken = await getrefreshtoken();
        if (newToken) {
          Cookies.set("access_token", newToken);
          return verifyBankDetails(bankTempId, retryCount + 1);
        } else {
          throw new Error("Token refresh failed");
        }
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      if (result.status === true) {
        // call the api user_form_generation api here and based on the status of that api we will navigate to teh esign
        console.log("calling the user from generation ap1111111111i");
        await callUserFormGeneration();
        console.log("user form generation success");
        return;
      }
      // else {
      //   setPopupMessage(result?.message || "Bank verification failed");
      //   setShowTimeoutPopup(true);
      // }
      console.log("Bank verification result:", result);
    } catch (err) {
      console.error("Error in verifyBankDetails:", err);
    }
  };

  return (
    <div className="bankacc-container">
      <Header />

      <div className="completed-bankacc-body">
        <div className="first-half">
          <div className="above_the_view">
            <img className="tick_mark_img" src="./91001-success 1.svg"></img>
            <p className="bank_account_cls">Bank account</p>
            <p className="bank_account_cls">verified successfully</p>
            <p className="rs_one_refund">₹1 will be refunded in 24 hours</p>
            <section className="Completed-sections-maincontainer">
              <div className="bank-card">
                <div className="bank-icon">
                  <img alt={bankDetails.bank_name} className="bank_icon_cls" src={BANKLIST?.filter(f => bankDetails.bank_name?.toLowerCase()?.includes(f.name?.toLowerCase()))?.[0]?.url ?? "./bank5.png"}></img>
                </div>
                <div className="bank-details">
                  <h6 className="account-name">{bankDetails.bank_name}</h6>
                  <p className="account-type">Savings</p>
                </div>
              </div>

              <div className="Completed-sections">
                <div className="completed-section1">
                  <label>Name as on Bank account</label>
                  <input value={bankDetails.name} readOnly />
                </div>

                <div className="completed-section2">
                  <label>Bank account number</label>
                  <input value={bankDetails.account_number} readOnly />
                </div>

                <div className="completed-section3">
                  <label>Branch name</label>
                  <input value={bankDetails.branch_name} readOnly />
                </div>

                <div className="completed-section4">
                  <label>IFSC</label>
                  <input value={bankDetails.ifsc} readOnly />
                </div>
              </div>
            </section>

            {showTimeoutPopup && (
              <div className="bottom-sheet-overlay">
                <div className="bottom-sheet">
                  <div className="popup-icon">
                    <img src="./exclamation_icon.svg" id="" alt="bank icon" />
                  </div>
                  <h2>Your bank details couldn’t be verified</h2>
                  <p>
                    The name on your bank account does not match the name on
                    your PAN.
                    <br />
                    Please use the bank account with the same name as on your
                    PAN.
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
          </div>
          {/* <div className="below_the_view">
            <button className="continue_ba_ac">Continue</button>
          </div> */}
          <div className="below_the_view">
            <button
              className="continue_ba_ac"
              onClick={() => verifyBankDetails(bankTempId)}
            // disabled={!bankTempId}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankaccAccountComplete;
