import React, { useEffect, useMemo, useRef, useState } from "react";
import Cookies from "js-cookie";
import OtpInput from "react-otp-input";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Pencil, ArrowLeft, Info } from "lucide-react";
import VerificationLoader from "../../Components/VerificationLoader/VerificationLoader";
import { decryptData } from "../../decode";
import { triggerWebhook } from "../../helper/usewebhook";
import "./updatemobile.css";

const RELATION_OPTIONS = ["Self", "Father", "Mother", "Spouse"];

const formatMobile = (value = "") =>
  value.replace(/^\+91/, "").replace(/(\d{5})(\d{5})/, "$1 $2").trim();

const plainMobile = (value = "") => value.replace(/^\+91/, "").replace(/\D/g, "");

const maskMobile = (value) => {
  if (value.length !== 10) return "9********3";
  return `${value[0]}${"*".repeat(8)}${value[9]}`;
};

const ExistingDetailsCard = ({
  showEditButton,
  showNewMobile,
  relation,
  existingMobile,
  newMobile,
  onEdit,
}) => (
  <div className="update-mobile-card-wrap">
    <div className="update-mobile-section-head">
      <h2>Mobile number details</h2>
      {showEditButton && (
        <button className="update-mobile-edit-btn" onClick={onEdit} type="button">
          <Pencil size={14} />
          Edit
        </button>
      )}
    </div>

    <div className="update-mobile-details-card">
      <div className="update-mobile-detail-block">
        <p className="update-mobile-label">Existing Mobile No.</p>
        <p className="update-mobile-value">+91 {formatMobile(existingMobile)}</p>
      </div>

      {showNewMobile && (
        <>
          <div className="update-mobile-divider" />
          <div className="update-mobile-detail-block">
            <div className="update-mobile-inline-row">
              <p className="update-mobile-label">New Mobile No.</p>
              <span className="update-mobile-badge">Not verified</span>
            </div>
            <p className="update-mobile-value">+91 {formatMobile(newMobile)}</p>
          </div>
        </>
      )}

      <div className="update-mobile-divider" />
      <div className="update-mobile-detail-block">
        <p className="update-mobile-label">New Mobile Relation</p>
        <p className="update-mobile-value">{relation}</p>
      </div>
    </div>
  </div>
);

const OtpModal = ({
  mobile,
  otp,
  setOtp,
  timer,
  otpError,
  setOtpError,
  onClose,
  onVerify,
  onResend,
  verifyingOtp,
}) => (
  <div className="update-mobile-otp-overlay" onClick={onClose}>
    <div className="update-mobile-otp-sheet" onClick={(e) => e.stopPropagation()}>
      <h2>Verify it&apos;s you</h2>
      <p className="update-mobile-otp-subtitle">
        An OTP has been sent to {maskMobile(mobile)}
      </p>

      <OtpInput
        value={otp}
        onChange={(value) => {
          if (/^\d*$/.test(value)) {
            setOtp(value);
            setOtpError("");
          }
        }}
        numInputs={6}
        renderSeparator={null}
        renderInput={(props) => (
          <input
            {...props}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            className={`update-mobile-otp-input ${otpError ? "otp-error" : ""}`}
          />
        )}
        containerStyle="update-mobile-otp-row"
      />

      <p className="update-mobile-otp-hint">
        <Info size={12} />
        This is required to safeguard your investments.
      </p>

      {otpError && <p className="update-mobile-otp-error">{otpError}</p>}

      <div className="update-mobile-otp-actions">
        {timer > 0 ? (
          <p className="update-mobile-resend-text">
            Resend OTP <span>({timer}s)</span>
          </p>
        ) : (
          <button
            className="update-mobile-resend-btn"
            type="button"
            onClick={onResend}
          >
            Resend OTP
          </button>
        )}
        <button
          className={`update-mobile-verify-btn ${otp.length === 6 ? "enabled" : ""}`}
          type="button"
          onClick={onVerify}
          disabled={otp.length !== 6 || verifyingOtp}
        >
          {verifyingOtp ? "Verifying..." : "Verify OTP"}
        </button>
      </div>
    </div>
  </div>
);

const UpdateMobileSkeleton = () => (
  <div className="update-mobile-skeleton">
    <div className="update-mobile-skeleton-head">
      <div className="update-mobile-skeleton-line title" />
      <div className="update-mobile-skeleton-chip" />
    </div>
    <div className="update-mobile-skeleton-card">
      <div className="update-mobile-skeleton-block">
        <div className="update-mobile-skeleton-line label" />
        <div className="update-mobile-skeleton-line value" />
      </div>
      <div className="update-mobile-skeleton-divider" />
      <div className="update-mobile-skeleton-block">
        <div className="update-mobile-skeleton-line label" />
        <div className="update-mobile-skeleton-line value short" />
      </div>
    </div>
  </div>
);

const UpdateMobileNumber = () => {
  const navigate = useNavigate();
  const phoneInputRef = useRef(null);

  const [screen, setScreen] = useState("summary");
  const [relation, setRelation] = useState("Self");
  const [showRelationOptions, setShowRelationOptions] = useState(false);
  const [mobileError, setMobileError] = useState("");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [newMobile, setNewMobile] = useState("");
  const [existingMobile, setExistingMobile] = useState("");
  const [moduleSharedData, setModuleSharedData] = useState(null);

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
        if (!moduleData?.data) return;

        const decryptedData = JSON.parse(decryptData(moduleData.data));
        const sharedData = decryptedData?.shared_data || null;
        const currentMobile =
          decryptedData?.["1"]?.contact_detail_data?.find((contact) => contact.is_new === false)
            ?.mobile ||
          decryptedData?.["1"]?.contact_detail_data?.[0]?.mobile ||
          "";

        setModuleSharedData(sharedData);
        setExistingMobile(currentMobile);
      } catch (error) {
        console.error("Failed to fetch mobile module data:", error);
      } finally {
        setPageLoading(false);
      }
    };

    fetchModuleData();
  }, []);

  useEffect(() => {
    if (!showOtpModal || timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((current) => current - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [showOtpModal, timer]);

  const existingMobilePlain = useMemo(
    () => plainMobile(existingMobile),
    [existingMobile]
  );

  const isMobileValid = /^[6-9]\d{9}$/.test(newMobile);

  const getValidToken = async () => {
    let token = Cookies.get("access_token");
    const refreshToken = Cookies.get("refresh_token");

    if (!token && refreshToken) {
      const response = await fetch("https://rekyc.meon.co.in/v1/user/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const data = await response.json();
      if (response.ok && data?.access_token) {
        Cookies.set("access_token", data.access_token);
        token = data.access_token;
      }
    }

    return token;
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
      let parsed = {};

      try {
        parsed = JSON.parse(decryptData(moduleData.data));
      } catch (error) {
        console.error("Failed to parse decrypted data:", error);
      }

      const links = (parsed?.["12"]?.links || []).filter((link) => !link.is_esigned);

      if (!links.length) {
        navigate("/congratulations");
      } else {
        window.open(`https://rekyc.meon.co.in${links[0].url}`, "_self");
      }
    } catch (error) {
      console.error("Error fetching eSign data:", error);
      toast.error("Failed to get eSign link. Please try again.");
    }
  };

  const callUserFormGeneration = async () => {
    try {
      setLoading(true);
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

      if (formData?.status === true) {
        await fetchAndRedirectToEsignLink(token);
      } else {
        toast.error(formData?.message || "Failed to generate user form. Please try again.");
      }
    } catch (error) {
      console.error("User form generation error:", error);
      toast.error("Failed to generate user form. Please try again.");
    } finally {
      // setLoading(false);
    }
  };

  const checkMobileInModuleData = async (enteredMobile, token) => {
    try {
      setLoading(true);
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
      if (!moduleData?.data) {
        return { success: false, error: "No module data received" };
      }

      const decryptedData = JSON.parse(decryptData(moduleData.data));
      const contactDetailData = decryptedData["1"]?.contact_detail_data || [];
      const newContacts = contactDetailData.filter((contact) => contact.is_new === true);
      const enteredMobileWithCountryCode = `+91${enteredMobile}`;
      const matchingContact = newContacts.find(
        (contact) =>
          contact.mobile === enteredMobileWithCountryCode || contact.mobile === enteredMobile
      );

      if (matchingContact) {
        return { success: true, isValidMobile: true, shouldRedirectToEsign: true };
      }

      return {
        success: true,
        isValidMobile: false,
        error: "This mobile number is updated for another account",
      };
    } catch (error) {
      console.error("Failed to fetch or process module data:", error);
      return { success: false, error: "Failed to verify mobile number details" };
    } finally {
      setLoading(false);
    }
  };

  const callCheckUserExistAPI = async (phone) => {
    const params = new URLSearchParams({
      key: "Univest123",
      phone,
    });

    const response = await fetch(
      `https://api.univest.in/api/kra/check-if-user-exist?${params.toString()}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    const data = await response.json();
    return { response, data };
  };

  const callUpdatePhoneAPI = async (token) =>
    fetch("https://rekyc.meon.co.in/v1/user/updatemobile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ mobile: newMobile, mobile_dependency: relation }),
    });

  const callVerifyOtpAPI = async (otpValue, token) =>
    fetch("https://rekyc.meon.co.in/v1/user/verifymobile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ otp: otpValue, mobile: newMobile ,mobile_dependency: relation }),
    });

  const handleInputChange = (event) => {
    const value = event.target.value.replace(/\D/g, "").slice(0, 10);
    setNewMobile(value);

    if (!value) {
      setMobileError("");
      return;
    }

    if (value === existingMobilePlain) {
      setMobileError("New mobile number should be different from existing mobile number");
      return;
    }

    if (value.length < 10) {
      setMobileError("Enter a valid 10-digit mobile number");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(value)) {
      setMobileError("Mobile number should start with 6, 7, 8, or 9");
      return;
    }

    setMobileError("");
  };

  const handleVerifyPhone = async () => {
    if (!isMobileValid) {
      setMobileError("Enter a valid 10-digit mobile number");
      return;
    }

    if (newMobile === existingMobilePlain) {
      setMobileError("New mobile number should be different from existing mobile number");
      return;
    }

    setMobileError("");
    setLoading(true);

    try {
      const checkUserResult = await callCheckUserExistAPI(newMobile);

      if (!checkUserResult.response.ok) {
        setMobileError("Failed to verify phone number. Please try again.");
        return;
      }

      if (!checkUserResult.data.success) {
        setMobileError(
          checkUserResult.data.message || "Phone number verification failed."
        );
        return;
      }

      if (checkUserResult.data.data === false) {
        const token = await getValidToken();
        const response = await callUpdatePhoneAPI(token);
        const data = await response.json();

        if (response.ok && data?.status) {
          setOtp("");
          setOtpError("");
          setTimer(60);
          setShowOtpModal(true);
          setScreen("submitted");
        } else {
          const moduleResult = await checkMobileInModuleData(newMobile, token);

          if (!moduleResult.success) {
            setMobileError(moduleResult.error);
            return;
          }

          if (moduleResult.isValidMobile) {
            await callUserFormGeneration();
          } else {
            setMobileError(moduleResult.error);
          }
        }
      } else {
        setMobileError("This phone number is already registered with another account.");
      }
    } catch (error) {
      console.error("Error in handleVerifyPhone:", error);
      setMobileError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    if (otp.length !== 6) {
      setOtpError("Enter 6 digit OTP");
      return;
    }

    setVerifyingOtp(true);
    setOtpError("");

    try {
      const token = await getValidToken();
      const response = await callVerifyOtpAPI(otp, token);
      const data = await response.json();

      if (data?.status === true) {
        toast.success(data.message || "Phone verified successfully!");

        triggerWebhook({
          step: "mobile",
          eSignCompleted: "no",
          finalUpdateExecuted: "no",
          userId: moduleSharedData?.clientcode || "<user-id>",
        });

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

          if (formData?.status === true) {
            await fetchAndRedirectToEsignLink(token);
          } else {
            setOtpError(formData?.message || "Failed to generate form");
          }
        } catch (error) {
          console.error("Failed to call user_form_generation:", error);
          setOtpError("Something went wrong while generating form");
        }
      } else {
        setOtpError(data?.message || "Enter correct OTP");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setOtpError("Network error");
    } finally {
      setVerifyingOtp(false);
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      const token = await getValidToken();
      const response = await callUpdatePhoneAPI(token);

      if (response.ok) {
        setTimer(60);
        setOtp("");
        setOtpError("");
      } else {
        setOtpError("Failed to resend OTP");
      }
    } catch (error) {
      console.error("Error resending OTP:", error);
      setOtpError("Network error");
    }
  };

  const renderForm = () => (
    <div className="update-mobile-form-section">
      <h2>Update mobile number</h2>

      <div
        className={`update-mobile-input-wrap ${
          newMobile ? "active" : ""
        } ${mobileError ? "error" : ""}`}
      >
        {newMobile && (
          <label className="update-mobile-floating-label">
            Enter new mobile number
          </label>
        )}
        <input
          ref={phoneInputRef}
          className="update-mobile-input"
          type="tel"
          placeholder="Enter new mobile number"
          value={newMobile}
          onChange={handleInputChange}
        />
      </div>

      {mobileError && <p className="update-mobile-field-error">{mobileError}</p>}

      <div className="update-mobile-select-wrap">
        <button
          className="update-mobile-select"
          type="button"
          onClick={() => setShowRelationOptions((prev) => !prev)}
        >
          <span>{relation}</span>
          <ChevronDown
            size={20}
            className={showRelationOptions ? "rotate" : ""}
          />
        </button>

        {showRelationOptions && (
          <div className="update-mobile-select-menu">
            {RELATION_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`update-mobile-select-option ${
                  relation === option ? "selected" : ""
                }`}
                onClick={() => {
                  setRelation(option);
                  setShowRelationOptions(false);
                }}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        className={`update-mobile-primary-btn ${
          isMobileValid && !mobileError ? "enabled" : ""
        }`}
        type="button"
        onClick={handleVerifyPhone}
        disabled={loading}
      >
        {loading ? "Processing..." : "Get OTP"}
      </button>
    </div>
  );

  return (
    <div className="update-mobile-page">
      {loading && <VerificationLoader isVisible={loading} />}

      <header className="update-mobile-header">
        <button className="update-mobile-back-btn" type="button" onClick={() => window.history.back()}>
          <ArrowLeft size={24} strokeWidth={1.8} />
        </button>
        <h1>Mobile</h1>
        <div className="update-mobile-header-spacer" />
      </header>

      <main className="update-mobile-content">
        {pageLoading ? (
          <UpdateMobileSkeleton />
        ) : screen === "summary" && (
          <ExistingDetailsCard
            showEditButton
            showNewMobile={false}
            relation={relation}
            existingMobile={existingMobile}
            newMobile={newMobile || existingMobilePlain}
            onEdit={() => setScreen("edit")}
          />
        )}

        {!pageLoading && screen === "edit" && (
          <>
            <ExistingDetailsCard
              showEditButton={false}
              showNewMobile={false}
              relation={relation}
              existingMobile={existingMobile}
              newMobile={newMobile || existingMobilePlain}
            />
            {renderForm()}
          </>
        )}

        {!pageLoading && screen === "submitted" && (
          <>
            <ExistingDetailsCard
              showEditButton
              showNewMobile
              relation={relation}
              existingMobile={existingMobile}
              newMobile={newMobile}
              onEdit={() => {
                setShowOtpModal(false);
                setScreen("edit");
                setOtp("");
                setOtpError("");
                setTimeout(() => phoneInputRef.current?.focus(), 100);
              }}
            />
          </>
        )}
      </main>

      {showOtpModal && (
        <OtpModal
          mobile={newMobile}
          otp={otp}
          setOtp={setOtp}
          timer={timer}
          otpError={otpError}
          setOtpError={setOtpError}
          onClose={() => setShowOtpModal(false)}
          onVerify={handleOtpVerify}
          onResend={handleResendOtp}
          verifyingOtp={verifyingOtp}
        />
      )}
    </div>
  );
};

export default UpdateMobileNumber;
