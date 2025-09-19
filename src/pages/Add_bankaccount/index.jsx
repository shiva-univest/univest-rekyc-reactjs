import React, { useState, useEffect, useRef } from "react";
import "./style.css";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import { decryptData } from "../../decode";
import Loader from "../Loader/Loader";
import axios from "axios";
import { openLink, waitFor } from "../../lib/utils";
import { toast } from "react-toastify";
import VerificationLoader from "../../Components/VerificationLoader/VerificationLoader";

const BankaccAccount = () => {
  const ref = useRef()
  const count = useRef()
  const [isOpen, setIsOpen] = useState(false);
  const [showTimeoutPopup, setShowTimeoutPopup] = useState(false);
  const [popupShownOnce, setPopupShownOnce] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);

  const navigate = useNavigate();

  const [popupMessage, setPopupMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(false);

  const fileInputRef = useRef(null);
  const [showOCRPopup, setShowOCRPopup] = useState(false);
  const [dataFromOCR, setDataFromOCR] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    name: null,
    account: null,
    branch: null,
    ifsc: null,
    bank_name: null,
  });

  const [showStepsPopup, setShowStepsPopup] = useState(false);
  const popupRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setShowStepsPopup(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // useEffect(() => {
  //   if (dataFromOCR) {
  //     const { account, branch, ifsc } = bankDetails;

  //     if (!account?.trim() || !branch?.trim() || !ifsc?.trim()) {
  //       toggleBottomSheet();
  //     }

  //     setDataFromOCR(false);
  //   }
  // }, [dataFromOCR, bankDetails]);

  useEffect(() => {
    if (dataFromOCR) {
      const { account, branch, ifsc } = bankDetails;

      if (
        !account ||
        account === "-" ||
        !branch ||
        branch === "-" ||
        !ifsc ||
        ifsc === "-"
      ) {
        toggleBottomSheet();
      }

      setDataFromOCR(false);
    }
  }, [dataFromOCR, bankDetails]);

  const toggleBottomSheet = () => {
    setIsOpen(!isOpen);
  };

  const getRedirectUrl = () => {
    const token = Cookies.get("access_token");
    return `${window.location.href}?token=${token}`;
  };

  const getrefershtoken = async () => {
    try {
      const refreshToken = Cookies.get("refresh_token");

      if (!refreshToken) {
        setError("No refresh token available");
        return null;
      }

      const refreshResponse = await fetch(
        "https://rekyc.meon.co.in/v1/user/token/refresh",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh: refreshToken }),
        }
      );

      if (!refreshResponse.ok) {
        throw new Error(`HTTP error! status: ${refreshResponse.status}`);
      }

      const tokenData = await refreshResponse.json();
      Cookies.set("access_token", tokenData.access);
      Cookies.set("refresh_token", tokenData.refresh);

      return tokenData.access;
    } catch (error) {
      console.error("Error in getrefreshtoken:", error);
      setError(error.message);
      return null;
    }
  };

  const callReverseResponseAPI = async (transId, retryCount = 0) => {
    toast.success(transId)

    setLoading(true);
    console.log("Calling Setu response API...");

    try {
      let accessToken = Cookies.get("access_token");

      const response = await fetch(
        "https://rekyc.meon.co.in/v1/user/reverse_pennydrop_api_setu_response",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ entity_id: transId }),
        }
      );

      const result = await response.json();
      let decrypted = decryptData(result.data);
      decrypted = JSON.parse(decrypted);

      const status = decrypted?.status
      toast.success(status)
      if (status.includes("SUCCESS")) {
        window.location.href = `/bankaccountcomplete?success=true`
        setLoading(false);
        clearInterval(ref.current)
        return
      } else if (status.includes("FAILED") || retryCount > 15) {
        window.location.href = `/bankaccountcomplete?success=false`
        setLoading(false);
        clearInterval(ref.current)
        return
      }
    } catch (err) {
      console.error("Error in callReverseResponseAPI:", err);
    }
  };

  const callReversePennydropAPI = async (retryCount = 0) => {
    console.log("aaaaaaaaaaaaaaaaaaa");

    try {
      setLoading(true);
      let accessToken = Cookies.get("access_token");

      if (!accessToken) {
        throw new Error("No access token found");
      }

      const response = await fetch(
        "https://rekyc.meon.co.in/v1/user/reverse_pennydrop_api_setu",

        {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            redirect_url: "http://uat-rekyc.univest.in/bankaccountcomplete",
          }),
        }
      );

      if (response.status === 401 && retryCount < 1) {
        const newToken = await getrefershtoken();
        if (newToken) {
          Cookies.set("access_token", newToken);
          return callReversePennydropAPI(retryCount + 1);
        }
        throw new Error("Failed to refresh token");
      }

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      const receivedData = await response.json();
      const decrypted = decryptData(receivedData.data);
      const data = JSON.parse(decrypted);
      console.log("data", data);

      const transId = data?.id;
      sessionStorage.setItem("transid", transId);

      if (data?.upiLink) {
        count.current = 1
        ref.current = setInterval(() => {
          callReverseResponseAPI(transId, count.current)
          count.current = count.current + 1
        }, 5000)
        await waitFor(1000)
        toast.success("opening")
        openLink(data.upiLink);
      } else {
        console.error("No upiLink found in response");
      }
    } catch (error) {
      setLoading(false);
      console.error("Error in callReversePennydropAPI:", error);
      setError(error.message);
    }
  };

  const handleButtonClick = async () => {
    try {
      await callReversePennydropAPI();
    } catch (error) {
      console.error("API call failed:", error);
    }
  };


  const handleBankDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      setShowOCRPopup(true); // 👈 show popup immediately (loader can appear inside)

      const tokenRes = await fetch("https://ocr.meon.co.in/get_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: "66031",
          email: "univest@gmail.com",
          password: "univest@12345",
        }),
      });

      const tokenData = await tokenRes.json();
      const token = tokenData?.token;

      if (!token) {
        toast.error("Failed to fetch OCR token.");
        setShowOCRPopup(false);
        return;
      }

      const formData = new FormData();
      formData.append("bankprooffile", file);
      formData.append("name", "uni");
      formData.append("sources", "kyc");
      formData.append("ifsc", "");
      formData.append("account_number", "1566332244");
      formData.append("req_id", "uni2q");
      formData.append("company", "univest");

      const ocrRes = await fetch(
        "https://ocr.meon.co.in/extract_bank_details",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      const ocrData = await ocrRes.json();
      const extracted = ocrData?.extracted_data || {};

      const name = extracted.ocr_Account_Holder_Name?.trim() || "";
      const ifsc = extracted.ocr_IFSC?.trim().toUpperCase() || "";
      const account = extracted.ocr_account_number?.trim() || "";

      let branch = "";
      let bank_name = "";

      if (ifsc) {
        const ifscRes = await fetch(`https://ifsc.razorpay.com/${ifsc}`);
        if (ifscRes.ok) {
          const ifscData = await ifscRes.json();
          branch = ifscData.BRANCH || "";
          bank_name = ifscData.BANK || "";
        }
      }

      if (name || ifsc || account) {
        setBankDetails({
          name: name || "-",
          ifsc: ifsc || "-",
          account: account || "-",
          branch: branch || "-",
          bank_name: bank_name || "-",
        });
        setIsOpen(false);
        setShowOCRPopup(true); // 👈 always reopen popup with new data
      } else {
        setIsOpen(true);
        setShowOCRPopup(false);
      }
    } catch (err) {
      console.error("OCR Upload Error:", err);
      toast.error("Failed to extract data from bank document.");
      setShowOCRPopup(false);
    } finally {
      setLoading(false);
      e.target.value = ""; // 👈 reset so same file can be uploaded again
    }
  };

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
  // const callUserFormGeneration = async () => {
  //   try {
  //     const token = await getrefershtoken();

  //     if (!token) {
  //       alert("Authorization failed.");
  //       return;
  //     }

  //     const response = await fetch(
  //       "https://rekyc.meon.co.in/v1/user/user_form_generation",
  //       {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //           Authorization: `Bearer ${token}`,
  //         },
  //         body: JSON.stringify({ re_esign: false }),
  //       }
  //     );

  //     const formData = await response.json();
  //     console.log("User form generation response:", formData);

  //     if (formData?.status === true) {
  //       console.log("Form generation successful, navigating to esign");
  //       // Fetch module data to get eSign links
  //       await fetchAndRedirectToEsignLink(token);
  //     } else {
  //       alert(
  //         formData?.message || "Failed to generate user form. Please try again."
  //       );
  //     }
  //   } catch (error) {
  //     console.error("User form generation error:", error);
  //     alert("Failed to generate user form. Please try again.");
  //   }
  // };

  // Function to call user form generation API
  const callUserFormGeneration = async () => {
    try {
      const token = await getrefershtoken();

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

  // Separate API function for verifying bank details
  const verifyBankDetailsAPI = async (tempId) => {
    try {
      const token = await getrefershtoken();

      if (!token) {
        toast.error("Authorization failed.");
        return;
      }

      const verifyRes = await fetch(
        `https://rekyc.meon.co.in/v1/user/verify_bank_details/${tempId}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const verifyData = await verifyRes.json();
      console.log("Bank verification response:", verifyData);

      if (verifyData.status === true) {
        console.log(
          "Bank verification successful, calling user form generation"
        );
        await callUserFormGeneration();
      } else {
        setPopupMessage(verifyData?.message || "Bank verification failed");
        setShowTimeoutPopup(true);
      }
    } catch (error) {
      console.error("Bank verification error:", error);
      setPopupMessage("Bank verification failed. Please try again.");
      setShowTimeoutPopup(true);
    }
  };

  const checkAndVerifyBankDetails = async () => {
    const token = await getrefershtoken();
    setLoading(true);

    if (!token) {
      toast.error("Authorization failed.");
      return;
    }

    const { account, ifsc } = bankDetails;
    console.log("bankDetails", bankDetails);

    if (!account || !ifsc) {
      toast.error("Missing account or IFSC details.");
      return;
    }

    const json_data = {
      account_number: account,
      ifsc: ifsc,
      account_type: "Saving",
    };

    try {
      const checkRes = await fetch(
        "https://rekyc.meon.co.in/v1/user/check_pennydrop",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(json_data),
        }
      );

      const checkData = await checkRes.json();
      console.log("Pennydrop check response:", checkData);

      // If pennydrop_flag is false, show error popup
      if (checkData?.data?.pennydrop_flag === false) {
        setPopupMessage(checkData?.data?.message || "Bank verification failed");
        setShowTimeoutPopup(true);
        return;
      }

      // If pennydrop_flag is true, proceed with verification flow
      if (checkData?.data?.pennydrop_flag === true) {
        console.log("Pennydrop successful, proceeding to verify bank details");

        if (checkData.tempId || checkData?.data?.bank_temp_id) {
          const tempId = checkData.tempId || checkData?.data?.bank_temp_id;
          console.log("tempId", tempId);
          await verifyBankDetailsAPI(tempId);
        } else {
          await callUserFormGeneration();
        }
        return;
      }

      if (checkRes.ok && checkData.success && checkData.tempId) {
        const tempId = checkData.tempId;
        console.log("tempId", tempId);
        await verifyBankDetailsAPI(tempId);
      } else {
        // ❌ Penny drop failed
        setPopupMessage(
          checkData?.message || "Your bank details couldn't be verified"
        );
        setShowTimeoutPopup(true);
      }
    } catch (error) {
      console.error("Error in checkAndVerifyBankDetails:", error);
      setPopupMessage("Error in bank verification");
      setShowTimeoutPopup(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bankacc-container">
      {loading && <VerificationLoader isVisible={loading} />}
      <header className="header_part">
        <div className="bankacc-header">
          <div className="bankaccacc-back-container">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9.23077 24L8 22.7692L14.7692 16L8 9.23077L9.23077 8L16 14.7692L22.7692 8L24 9.23077L17.2308 16L24 22.7692L22.7692 24L16 17.2308L9.23077 24Z"
                fill="#202020"
              />
            </svg>

            <svg
              width="56"
              height="24"
              viewBox="0 0 56 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clipPath="url(#clip0_434_3498)">
                <path
                  d="M1.44567 17V6.81818H3.29013V11.1286H8.00817V6.81818H9.8576V17H8.00817V12.6747H3.29013V17H1.44567ZM15.1648 17.1491C14.3991 17.1491 13.7379 16.9901 13.1811 16.6719C12.6276 16.3504 12.2017 15.8963 11.9034 15.3097C11.6051 14.7197 11.456 14.0253 11.456 13.2266C11.456 12.4411 11.6051 11.7517 11.9034 11.1584C12.205 10.5618 12.6259 10.0978 13.1662 9.76633C13.7064 9.43158 14.3411 9.2642 15.0703 9.2642C15.541 9.2642 15.9851 9.34044 16.4027 9.4929C16.8236 9.64205 17.1948 9.87405 17.5163 10.1889C17.8411 10.5038 18.0964 10.9048 18.282 11.392C18.4676 11.8759 18.5604 12.4527 18.5604 13.1222V13.674H12.3011V12.4609H16.8352C16.8319 12.1162 16.7573 11.8097 16.6115 11.5412C16.4657 11.2694 16.2618 11.0556 16 10.8999C15.7415 10.7441 15.4399 10.6662 15.0952 10.6662C14.7273 10.6662 14.4041 10.7557 14.1257 10.9347C13.8473 11.1103 13.6302 11.3423 13.4744 11.6307C13.322 11.9157 13.2441 12.2289 13.2408 12.5703V13.6293C13.2408 14.0734 13.322 14.4545 13.4844 14.7727C13.6468 15.0876 13.8738 15.3295 14.1655 15.4986C14.4571 15.6643 14.7985 15.7472 15.1896 15.7472C15.4515 15.7472 15.6884 15.7107 15.9006 15.6378C16.1127 15.5616 16.2966 15.4505 16.4524 15.3047C16.6082 15.1589 16.7259 14.9782 16.8054 14.7628L18.4858 14.9517C18.3797 15.3958 18.1776 15.7836 17.8793 16.1151C17.5843 16.4432 17.2064 16.6984 16.7457 16.8807C16.285 17.0597 15.758 17.1491 15.1648 17.1491ZM21.8826 6.81818V17H20.0829V6.81818H21.8826ZM23.7333 19.8636V9.36364H25.5032V10.6264H25.6076C25.7004 10.4408 25.8313 10.2436 26.0004 10.0348C26.1694 9.82268 26.3981 9.64205 26.6864 9.4929C26.9748 9.34044 27.3427 9.2642 27.7901 9.2642C28.3801 9.2642 28.9121 9.41501 29.386 9.71662C29.8633 10.0149 30.2411 10.4574 30.5195 11.044C30.8013 11.6274 30.9421 12.3433 30.9421 13.1918C30.9421 14.0303 30.8046 14.7429 30.5295 15.3295C30.2544 15.9162 29.8799 16.3636 29.4059 16.6719C28.9319 16.9801 28.395 17.1342 27.7951 17.1342C27.3576 17.1342 26.9947 17.0613 26.7063 16.9155C26.418 16.7696 26.186 16.594 26.0103 16.3885C25.8379 16.1797 25.7037 15.9825 25.6076 15.7969H25.533V19.8636H23.7333ZM25.4982 13.1818C25.4982 13.6757 25.5678 14.1082 25.707 14.4794C25.8496 14.8506 26.0534 15.1406 26.3185 15.3494C26.587 15.5549 26.9118 15.6577 27.293 15.6577C27.6907 15.6577 28.0238 15.5516 28.2923 15.3395C28.5607 15.1241 28.7629 14.8307 28.8988 14.4595C29.038 14.085 29.1076 13.6591 29.1076 13.1818C29.1076 12.7079 29.0397 12.2869 28.9038 11.919C28.7679 11.5511 28.5657 11.2628 28.2972 11.054C28.0288 10.8452 27.694 10.7408 27.293 10.7408C26.9085 10.7408 26.582 10.8419 26.3136 11.044C26.0451 11.2462 25.8413 11.5296 25.7021 11.8942C25.5662 12.2588 25.4982 12.688 25.4982 13.1818Z"
                  fill="#0862BC"
                />
                <g clipPath="url(#clip1_434_3498)">
                  <mask
                    id="mask0_434_3498"
                    maskUnits="userSpaceOnUse"
                    x="36"
                    y="2"
                    width="20"
                    height="20"
                  >
                    <path d="M36 2H56V22H36V2Z" fill="white" />
                  </mask>
                  <g mask="url(#mask0_434_3498)">
                    <path
                      d="M43.7695 16.6858C44.3045 19.3817 46.6825 21.4141 49.5355 21.4141C50.7152 21.4141 51.8135 21.0664 52.7341 20.4682L55.1318 21.1314L54.4686 18.7337C55.0668 17.8131 55.4145 16.7148 55.4145 15.5352C55.4145 12.6821 53.3821 10.3041 50.6862 9.76914"
                      stroke="#0862BC"
                      strokeWidth="1.17187"
                      strokeMiterlimit="10"
                    />
                    <path
                      d="M43.6367 2.58594C39.7427 2.58594 36.5859 5.7427 36.5859 9.63672C36.5859 11.0327 36.9918 12.3339 37.6917 13.4289L36.8686 16.4049L39.8445 15.5818C40.9395 16.2817 42.2407 16.6875 43.6367 16.6875C47.5307 16.6875 50.6875 13.5307 50.6875 9.63672C50.6875 5.7427 47.5307 2.58594 43.6367 2.58594Z"
                      stroke="#0862BC"
                      strokeWidth="1.17187"
                      strokeMiterlimit="10"
                    />
                    <path
                      d="M44.2227 13.7578H43.0508V12.5859H44.2227V13.7578Z"
                      fill="#0862BC"
                    />
                    <path
                      d="M41.8789 7.85938C41.8789 6.88856 42.6659 6.10156 43.6367 6.10156C44.6075 6.10156 45.3945 6.88856 45.3945 7.85938C45.3945 8.37305 45.1741 8.8352 44.8228 9.15656L43.6367 10.2422V11.4141"
                      stroke="#0862BC"
                      strokeWidth="1.17187"
                      strokeMiterlimit="10"
                    />
                  </g>
                </g>
              </g>
              <defs>
                <clipPath id="clip0_434_3498">
                  <rect width="56" height="24" rx="4" fill="white" />
                </clipPath>
                <clipPath id="clip1_434_3498">
                  <rect
                    width="20"
                    height="20"
                    fill="white"
                    transform="translate(36 2)"
                  />
                </clipPath>
              </defs>
            </svg>
          </div>
        </div>
      </header>

      <div className="bankacc-body">
        <div className="bankacc-body-b1">
          <h4>Add bank account</h4>
          <h6>
            Deposit and withdrawal can happen only from the linked bank account
          </h6>
        </div>

        <div className="bankacc-body-b2">
          <div className="bankacc-body-b2-1">
            <h4>
              Select any UPI app to proceed{" "}
              <img src="./two.png" id="bb" alt="bank icon" />
            </h4>
            <a
              href=""
              target="_blank"
              id="steps"
              rel=""
              onClick={(e) => {
                e.preventDefault();
                setShowStepsPopup(true);
              }}
            >
              Steps to link
            </a>
          </div>
        </div>

        <div className="bankacc-body-b3">
          <button
            className="bankacc-button bankacc-button1"
            onClick={handleButtonClick}
          >
            <img src="./phonepay.png" alt="bank icon" />
            <div className="bank-details bank-details1">
              <p>PhonePe</p>
            </div>

            <svg
              width="8"
              height="12"
              viewBox="0 0 8 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1.63556 12L0.5 10.9295L5.72887 6L0.5 1.07054L1.63556 0L8 6L1.63556 12Z"
                fill="#202020"
              />
            </svg>
          </button>
          <svg
            viewBox="0 0 328 1"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line
              y1="0.5"
              x2="328"
              y2="0.5"
              stroke="#BCBCBC"
              strokeDasharray="4 4"
            />
          </svg>

          <button
            className="bankacc-button bankacc-button2"
            onClick={handleButtonClick}
          >
            <img src="./gpay.png" alt="bank icon" />
            <div className="bank-details bank-details1">
              <p>GooglePay</p>
            </div>

            <svg
              width="8"
              height="12"
              viewBox="0 0 8 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1.63556 12L0.5 10.9295L5.72887 6L0.5 1.07054L1.63556 0L8 6L1.63556 12Z"
                fill="#202020"
              />
            </svg>
          </button>
          <svg
            viewBox="0 0 328 1"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line
              y1="0.5"
              x2="328"
              y2="0.5"
              stroke="#BCBCBC"
              strokeDasharray="4 4"
            />
          </svg>

          <button
            className="bankacc-button bankacc-button3"
            onClick={handleButtonClick}
          >
            <img src="./otherpay.png" alt="bank icon" />
            <div className="bank-details bank-details1">
              <p>Other apps</p>
            </div>

            <svg
              width="8"
              height="12"
              viewBox="0 0 8 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1.63556 12L0.5 10.9295L5.72887 6L0.5 1.07054L1.63556 0L8 6L1.63556 12Z"
                fill="#202020"
              />
            </svg>
          </button>

          <span className="link-your-bankacc">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6.75223 15.9161L12.9237 5.28974C13.0635 5.04915 12.8653 4.75309 12.5896 4.79059L8.48448 5.34856L9.46533 0.199117C9.49839 0.025523 9.27458 -0.0739458 9.16789 0.066898L3.09995 8.07659C2.9232 8.30987 3.11036 8.64159 3.40142 8.61096L7.92729 8.13455L6.44358 15.8004C6.40779 15.9853 6.65764 16.079 6.75223 15.9161Z"
                fill="#FFDC64"
              />
              <path
                d="M4.99751 7.50941C4.88417 7.51847 4.80889 7.39457 4.86914 7.29816L9.40598 0.039224C9.33848 -0.0141822 9.23223 -0.0176197 9.16789 0.0673178L3.09995 8.07701C2.9232 8.31032 3.11036 8.642 3.40142 8.61138L7.92729 8.13497L6.44358 15.8008C6.42358 15.9043 6.49333 15.977 6.57486 15.9944L9.11733 7.94919C9.23651 7.5721 8.93583 7.19432 8.54161 7.22588L4.99751 7.50941Z"
                fill="#FFC850"
              />
            </svg>
            Link your bank account with UPI payment of ₹1
          </span>
        </div>

        <div className="bankacc-body-b4">
          <span>₹1 debited will be refunded within 3 working days</span>

          <svg
            className="or-svg"
            viewBox="0 0 328 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              width="138"
              height="1"
              transform="translate(12 9.5)"
              fill="#BCBCBC"
            />
            <path
              d="M161.614 14.1321C161 14.1321 160.464 13.9915 160.007 13.7102C159.55 13.429 159.195 13.0355 158.942 12.5298C158.689 12.0241 158.562 11.4332 158.562 10.7571C158.562 10.0781 158.689 9.48437 158.942 8.97585C159.195 8.46733 159.55 8.07244 160.007 7.79119C160.464 7.50994 161 7.36932 161.614 7.36932C162.227 7.36932 162.763 7.50994 163.22 7.79119C163.678 8.07244 164.033 8.46733 164.286 8.97585C164.538 9.48437 164.665 10.0781 164.665 10.7571C164.665 11.4332 164.538 12.0241 164.286 12.5298C164.033 13.0355 163.678 13.429 163.22 13.7102C162.763 13.9915 162.227 14.1321 161.614 14.1321ZM161.618 13.0625C162.016 13.0625 162.345 12.9574 162.607 12.7472C162.868 12.5369 163.061 12.2571 163.186 11.9077C163.314 11.5582 163.378 11.1733 163.378 10.7528C163.378 10.3352 163.314 9.9517 163.186 9.60227C163.061 9.25 162.868 8.96733 162.607 8.75426C162.345 8.54119 162.016 8.43466 161.618 8.43466C161.217 8.43466 160.885 8.54119 160.621 8.75426C160.359 8.96733 160.165 9.25 160.037 9.60227C159.912 9.9517 159.849 10.3352 159.849 10.7528C159.849 11.1733 159.912 11.5582 160.037 11.9077C160.165 12.2571 160.359 12.5369 160.621 12.7472C160.885 12.9574 161.217 13.0625 161.618 13.0625ZM166.087 14V7.45455H167.319V8.49432H167.387C167.506 8.14205 167.716 7.86506 168.017 7.66335C168.321 7.45881 168.665 7.35653 169.049 7.35653C169.128 7.35653 169.222 7.35937 169.33 7.36506C169.441 7.37074 169.527 7.37784 169.59 7.38636V8.60511C169.539 8.59091 169.448 8.57528 169.317 8.55824C169.186 8.53835 169.056 8.52841 168.925 8.52841C168.624 8.52841 168.355 8.59233 168.12 8.72017C167.887 8.84517 167.702 9.01989 167.566 9.24432C167.429 9.46591 167.361 9.71875 167.361 10.0028V14H166.087Z"
              fill="#606060"
            />
            <rect
              width="138"
              height="1"
              transform="translate(178 9.5)"
              fill="#BCBCBC"
            />
          </svg>

          <button
            className="final-btns ifsc-btn"
            onClick={() => navigate("/pennydrop")}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clipPath="url(#clip0_219_17666)">
                <path
                  d="M2.10481 21.7482C2.21411 21.9055 2.39376 22 2.58602 22H21.414C21.6062 22 21.7859 21.9055 21.8952 21.7482C22.005 21.5903 22.0302 21.3889 21.9627 21.2086C21.7344 20.5981 21.3075 20.0625 21.1341 19.8611C21.0231 19.7312 20.8606 19.6562 20.6895 19.6562H3.31043C3.13934 19.6562 2.97684 19.7312 2.86583 19.8611C2.69247 20.0625 2.26559 20.5981 2.03727 21.2086C1.96977 21.3889 1.99493 21.5903 2.10481 21.7482Z"
                  fill="#0862BC"
                />
                <path
                  d="M4.34375 11.4141H7.89844V18.4844H4.34375V11.4141Z"
                  fill="#0862BC"
                />
                <path
                  d="M10.2422 11.4141H13.7578V18.4844H10.2422V11.4141Z"
                  fill="#0862BC"
                />
                <path
                  d="M16.1016 11.4141H19.6562V18.4844H16.1016V11.4141Z"
                  fill="#0862BC"
                />
                <path
                  d="M3.26824 10.0696C3.37824 10.1801 3.53133 10.2422 3.68273 10.2422C3.68281 10.2422 3.68293 10.2421 3.683 10.2421C3.68308 10.2421 3.6832 10.2422 3.68328 10.2418H20.3167C20.3168 10.2422 20.3169 10.2421 20.317 10.2421C20.317 10.2421 20.3172 10.2422 20.3172 10.2422C20.4686 10.2422 20.6217 10.1801 20.7317 10.0696C20.8509 9.95043 21.742 9.0225 21.9999 7.89844H2C2.25801 9.0225 3.14898 9.95043 3.26824 10.0696Z"
                  fill="#0862BC"
                />
                <path
                  d="M21.6272 6.72655L12.2622 2.06179C12.0974 1.9794 11.9029 1.9794 11.738 2.06179L2.37305 6.72655H21.6272Z"
                  fill="#0862BC"
                />
              </g>
              <defs>
                <clipPath id="clip0_219_17666">
                  <rect
                    width="20"
                    height="20"
                    fill="white"
                    transform="translate(2 2)"
                  />
                </clipPath>
              </defs>
            </svg>
            Link with IFSC & Bank Account no.
          </button>

          <svg
            className="or-svg"
            viewBox="0 0 328 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              width="138"
              height="1"
              transform="translate(12 9.5)"
              fill="#BCBCBC"
            />
            <path
              d="M161.614 14.1321C161 14.1321 160.464 13.9915 160.007 13.7102C159.55 13.429 159.195 13.0355 158.942 12.5298C158.689 12.0241 158.562 11.4332 158.562 10.7571C158.562 10.0781 158.689 9.48437 158.942 8.97585C159.195 8.46733 159.55 8.07244 160.007 7.79119C160.464 7.50994 161 7.36932 161.614 7.36932C162.227 7.36932 162.763 7.50994 163.22 7.79119C163.678 8.07244 164.033 8.46733 164.286 8.97585C164.538 9.48437 164.665 10.0781 164.665 10.7571C164.665 11.4332 164.538 12.0241 164.286 12.5298C164.033 13.0355 163.678 13.429 163.22 13.7102C162.763 13.9915 162.227 14.1321 161.614 14.1321ZM161.618 13.0625C162.016 13.0625 162.345 12.9574 162.607 12.7472C162.868 12.5369 163.061 12.2571 163.186 11.9077C163.314 11.5582 163.378 11.1733 163.378 10.7528C163.378 10.3352 163.314 9.9517 163.186 9.60227C163.061 9.25 162.868 8.96733 162.607 8.75426C162.345 8.54119 162.016 8.43466 161.618 8.43466C161.217 8.43466 160.885 8.54119 160.621 8.75426C160.359 8.96733 160.165 9.25 160.037 9.60227C159.912 9.9517 159.849 10.3352 159.849 10.7528C159.849 11.1733 159.912 11.5582 160.037 11.9077C160.165 12.2571 160.359 12.5369 160.621 12.7472C160.885 12.9574 161.217 13.0625 161.618 13.0625ZM166.087 14V7.45455H167.319V8.49432H167.387C167.506 8.14205 167.716 7.86506 168.017 7.66335C168.321 7.45881 168.665 7.35653 169.049 7.35653C169.128 7.35653 169.222 7.35937 169.33 7.36506C169.441 7.37074 169.527 7.37784 169.59 7.38636V8.60511C169.539 8.59091 169.448 8.57528 169.317 8.55824C169.186 8.53835 169.056 8.52841 168.925 8.52841C168.624 8.52841 168.355 8.59233 168.12 8.72017C167.887 8.84517 167.702 9.01989 167.566 9.24432C167.429 9.46591 167.361 9.71875 167.361 10.0028V14H166.087Z"
              fill="#606060"
            />
            <rect
              width="138"
              height="1"
              transform="translate(178 9.5)"
              fill="#BCBCBC"
            />
          </svg>

          <label className="final-btns cancel-cheque-btn">
            <input
              onClick={() => fileInputRef.current.click()}
              type="file"
              accept="image/*,.pdf"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleBankDocUpload}
            />
            <svg
              width="25"
              height="24"
              viewBox="0 0 25 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.5 13C22.2348 13 21.9804 13.1054 21.7929 13.2929C21.6054 13.4804 21.5 13.7348 21.5 14V18.213C21.4992 18.9519 21.2053 19.6603 20.6828 20.1828C20.1603 20.7053 19.4519 20.9992 18.713 21H6.287C5.54809 20.9992 4.83966 20.7053 4.31717 20.1828C3.79468 19.6603 3.50079 18.9519 3.5 18.213V14C3.5 13.7348 3.39464 13.4804 3.20711 13.2929C3.01957 13.1054 2.76522 13 2.5 13C2.23478 13 1.98043 13.1054 1.79289 13.2929C1.60536 13.4804 1.5 13.7348 1.5 14V18.213C1.50132 19.4822 2.00609 20.699 2.90354 21.5965C3.80099 22.4939 5.01782 22.9987 6.287 23H18.713C19.9822 22.9987 21.199 22.4939 22.0965 21.5965C22.9939 20.699 23.4987 19.4822 23.5 18.213V14C23.5 13.7348 23.3946 13.4804 23.2071 13.2929C23.0196 13.1054 22.7652 13 22.5 13Z"
                fill="#0862BC"
              />
              <path
                d="M7.20643 8.70679L11.4994 4.41379V16.9998C11.4994 17.265 11.6048 17.5194 11.7923 17.7069C11.9799 17.8944 12.2342 17.9998 12.4994 17.9998C12.7646 17.9998 13.019 17.8944 13.2065 17.7069C13.3941 17.5194 13.4994 17.265 13.4994 16.9998V4.41379L17.7924 8.70679C17.981 8.88894 18.2336 8.98974 18.4958 8.98746C18.758 8.98518 19.0088 8.88001 19.1942 8.6946C19.3797 8.5092 19.4848 8.25838 19.4871 7.99619C19.4894 7.73399 19.3886 7.48139 19.2064 7.29279L13.2064 1.29279C13.0189 1.10532 12.7646 1 12.4994 1C12.2343 1 11.98 1.10532 11.7924 1.29279L5.79243 7.29279C5.61027 7.48139 5.50948 7.73399 5.51176 7.99619C5.51403 8.25838 5.6192 8.5092 5.80461 8.6946C5.99002 8.88001 6.24083 8.98518 6.50303 8.98746C6.76523 8.98974 7.01783 8.88894 7.20643 8.70679Z"
                fill="#0862BC"
              />
            </svg>
            Upload cancelled cheque
          </label>
          <p className="support_form">Supported format: JPG, PNG (Max. 2MB)</p>
        </div>

        <div>
          {isOpen && (
            <div className="bottom-sheet">
              <div className="bottom-sheet-content">
                <div className="error-icon">
                  <img src="./exclamation_icon.svg"></img>
                </div>
                <h3>Your bank details couldn’t be read</h3>
                <p className="error-text">
                  Document uploaded might not be clear or the text is not
                  readable enough for details fetching
                </p>

                <button
                  className="btn-primary"
                  onClick={() =>
                    fileInputRef.current && fileInputRef.current.click()
                  }
                >
                  Re-upload Document
                </button>
              </div>
            </div>
          )}

          {showOCRPopup && bankDetails && (
            <>
              <div
                className="bank-popup-overlay"
                onClick={() => setShowOCRPopup(false)}
              />

              <div className="bank-popup-wrapper">
                <div className="bank-popup">
                  <h3 className="bank-title">Confirm bank details</h3>
                  <p className="bank-subtitle">
                    You can choose to proceed with the below Bank or link
                    another one using IFSC
                  </p>
                  <div className="bank-card-final">
                    <div className="bank-card-header">
                      <img
                        src="./bank5.png"
                        alt="Bank Logo"
                        className="bank-logo-final"
                      />
                      <div>
                        <div className="bank-code-final">
                          {bankDetails.bank_name}
                        </div>
                        <div className="bank-type-final">Savings</div>
                      </div>
                    </div>

                    <div className="bank-field">
                      <label>Bank account number</label>
                      <input
                        type="text"
                        placeholder="Enter account number"
                        className="bank-input"
                        value={bankDetails.account || ""}
                        onChange={(e) =>
                          setBankDetails((prev) => ({
                            ...prev,
                            account: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="bank-field">
                      <label>Branch name</label>
                      <input
                        type="text"
                        placeholder="Enter branch name"
                        className="bank-input"
                        value={bankDetails.branch || ""}
                        onChange={(e) =>
                          setBankDetails((prev) => ({
                            ...prev,
                            branch: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="bank-field">
                      <label>IFSC</label>
                      <input
                        type="text"
                        placeholder="Enter IFSC"
                        className="bank-input"
                        value={bankDetails.ifsc || ""}
                        onChange={(e) =>
                          setBankDetails((prev) => ({
                            ...prev,
                            ifsc: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <button
                    className="proceed-btn"
                    onClick={() => {
                      setShowOCRPopup(false);
                      checkAndVerifyBankDetails();
                    }}
                  >
                    Proceed
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <div
        className="bankacc-dropdown"
        id="bankacc-dropdown"
        style={{ display: "none" }}
      >
        <ul>
          <li>Federal bankacc</li>
          <li>IndusInd bankacc</li>
          <li>HDFC bankacc</li>
          <li>ICICI bankacc</li>
          <li>SBI bankacc</li>
        </ul>
      </div>

      {showStepsPopup && (
        <div className="popup-overlay">
          <div className="steps-popup" ref={popupRef}>
            <h3>Steps to Link Bank Account</h3>

            <div className="steps-content">
              <div className="s1 ssc">
                <span>
                  1
                  <svg
                    width="1"
                    height="56"
                    viewBox="0 0 1 56"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <line
                      x1="0.5"
                      x2="0.5"
                      y2="56"
                      stroke="#0862BC"
                      stroke-dasharray="8 8"
                    />
                  </svg>
                </span>
                <div className="steps-content-subdiv1 steps-content-subdiv">
                  <h5>Open UPI app of your choice</h5>
                  <p>
                    Choose a UPI which already has a bank account you want to
                    verify
                  </p>
                </div>
              </div>

              <div className="s2 ssc">
                <span>
                  2
                  <svg
                    width="1"
                    height="56"
                    viewBox="0 0 1 56"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <line
                      x1="0.5"
                      x2="0.5"
                      y2="56"
                      stroke="#0862BC"
                      stroke-dasharray="8 8"
                    />
                  </svg>
                </span>
                <div className="steps-content-subdiv2 steps-content-subdiv">
                  <h5>Select the bank account to link</h5>
                  <p>Pay ₹1 on your UPI app</p>
                </div>
              </div>

              <div className="s3 ssc">
                <span>3</span>
                <div className="steps-content-subdiv3 steps-content-subdiv">
                  <h5>Confirm your bank account</h5>
                  <p>
                    ₹1 debited will be refunded once the verification is
                    complete
                  </p>
                </div>
              </div>
            </div>

            <button
              className="popup-close-btn"
              onClick={() => setShowStepsPopup(false)}
            >
              Alright
            </button>
          </div>
        </div>
      )}

      {/* {showTimeoutPopup && (
        <div className="bottom-sheet-overlay">
          <div className="bottom-sheet">
            <div className="popup-icon">
              <img src="./exclamation_icon.svg" alt="bank icon" />
            </div>
            <h2>Your bank details couldn’t be read</h2>
            <p>
              Document uploaded might not be clear or the text
              <br />
              is not readable enough for details fetching..
            </p>
            <button
              className="bottom-sheet-button"
              onClick={() => {
                setShowTimeoutPopup(false);
                // navigate("/bankaccount"); // ✅ redirect
              }}
            >
              Continue with another account
            </button>
          </div>
        </div>
      )} */}

      {showTimeoutPopup && (
        <div className="bottom-sheet-overlay">
          <div className="bottom-sheet">
            <div className="popup-icon">
              <img src="./exclamation_icon.svg" alt="bank icon" />
            </div>
            <h2>Your bank details couldn’t be read</h2>
            <p>{popupMessage}</p>
            <p>
              Document uploaded might not be clear or the text
              <br />
              is not readable enough for details fetching..
            </p>

            <button
              className="bottom-sheet-button"
              onClick={() => {
                setShowTimeoutPopup(false);
                // navigate("/bankaccount");
              }}
            >
              Continue with another account
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankaccAccount;
