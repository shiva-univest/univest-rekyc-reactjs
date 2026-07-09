import React, { useEffect, useRef, useState } from "react";
import Cookies from "js-cookie";
import OtpInput from "react-otp-input";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Pencil, ArrowLeft, Info } from "lucide-react";
import VerificationLoader from "../../Components/VerificationLoader/VerificationLoader";
import { triggerWebhook } from "../../helper/usewebhook";
import { decryptData } from "../../decode";
import "./updateemail.css";

const RELATION_OPTIONS = ["Self", "Father", "Mother", "Spouse"];

const maskEmail = (email) => {
  const [username = "", domain = "gmail.com"] = email.split("@");
  if (username.length <= 2) {
    return `${username}${"*".repeat(6)}@${domain}`;
  }
  return `${username.slice(0, 2)}${"*".repeat(6)}@${domain}`;
};

const getEmailVerificationStatus = (contact = {}) => {
  if (
    contact?.is_verified === true ||
    contact?.verified === true ||
    contact?.is_email_verified === true ||
    contact?.email_verified === true ||
    String(contact?.verification_status || "").toLowerCase() === "verified" ||
    String(contact?.status || "").toLowerCase() === "verified"
  ) {
    return "verified";
  }

  return "not_verified";
};

const ExistingDetailsCard = ({
  showEditButton,
  showNewEmail,
  relation,
  existingEmail,
  newEmail,
  newEmailStatus,
  onEdit,
}) => (
  <div className="update-email-card-wrap">
    <div className="update-email-section-head">
      <h2>Email address details</h2>
      {showEditButton && (
        <button className="update-email-edit-btn" onClick={onEdit} type="button">
          <Pencil size={14} />
          Edit
        </button>
      )}
    </div>

    <div className="update-email-details-card">
      <div className="update-email-detail-block">
        <p className="update-email-label">Existing Email Address</p>
        <p className="update-email-value">{existingEmail}</p>
      </div>

      {showNewEmail && (
        <>
          <div className="update-email-divider" />
          <div className="update-email-detail-block">
            <div className="update-email-inline-row">
              <p className="update-email-label">New Email address</p>
              <span
                className={`update-email-badge ${
                  newEmailStatus === "verified"
                    ? "update-email-badge-verified"
                    : "update-email-badge-unverified"
                }`}
              >
                {newEmailStatus === "verified" ? "Verified" : "Not verified"}
              </span>
            </div>
            <p className="update-email-value">{newEmail}</p>
          </div>
        </>
      )}

      <div className="update-email-divider" />
      <div className="update-email-detail-block">
        <p className="update-email-label">New Email Relation</p>
        <p className="update-email-value">{relation}</p>
      </div>
    </div>
  </div>
);

const OtpModal = ({
  email,
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
  <div className="update-email-otp-overlay" onClick={onClose}>
    <div className="update-email-otp-sheet" onClick={(e) => e.stopPropagation()}>
      <h2>Verify it&apos;s you</h2>
      <p className="update-email-otp-subtitle">
        An OTP has been sent to email {maskEmail(email)}
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
            className={`update-email-otp-input ${otpError ? "otp-error" : ""}`}
          />
        )}
        containerStyle="update-email-otp-row"
      />

      <p className="update-email-otp-hint">
        <Info size={12} />
        This is required to safeguard your investments.
      </p>

      {otpError && <p className="update-email-otp-error">{otpError}</p>}

      <div className="update-email-otp-actions">
        {timer > 0 ? (
          <p className="update-email-resend-text">
            Resend OTP <span>({timer}s)</span>
          </p>
        ) : (
          <button className="update-email-resend-btn" type="button" onClick={onResend}>
            Resend OTP
          </button>
        )}
        <button
          className={`update-email-verify-btn ${otp.length === 6 ? "enabled" : ""}`}
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

const UpdateEmailSkeleton = () => (
  <div className="update-email-skeleton">
    <div className="update-email-skeleton-head">
      <div className="update-email-skeleton-line title" />
      <div className="update-email-skeleton-chip" />
    </div>
    <div className="update-email-skeleton-card">
      <div className="update-email-skeleton-block">
        <div className="update-email-skeleton-line label" />
        <div className="update-email-skeleton-line value" />
      </div>
      <div className="update-email-skeleton-divider" />
      <div className="update-email-skeleton-block">
        <div className="update-email-skeleton-line label" />
        <div className="update-email-skeleton-line value short" />
      </div>
    </div>
  </div>
);

const UpdateEmailAddress = () => {
  const navigate = useNavigate();
  const emailInputRef = useRef(null);

  const [screen, setScreen] = useState("summary");
  const [relation, setRelation] = useState("Self");
  const [showRelationOptions, setShowRelationOptions] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(60);
  const [newEmail, setNewEmail] = useState("");
  const [existingEmail, setExistingEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingEmailStatus, setPendingEmailStatus] = useState("not_verified");
  const [moduleSharedData, setModuleSharedData] = useState(null);
  const [error, setError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
        if (!moduleData?.data) return;

        const decryptedData = JSON.parse(decryptData(moduleData.data));
        console.log("Decrypted module data:", decryptedData);
        setModuleSharedData(decryptedData?.shared_data || null);

        const currentEmail =
          decryptedData?.["3"]?.contact_detail_data?.find((contact) => contact.is_new === false)
            ?.email ||
          decryptedData?.["3"]?.contact_detail_data?.[0]?.email ||
          "";
        const updatedEmailContact =
          decryptedData?.["3"]?.contact_detail_data?.find((contact) => contact.is_new === true) ||
          null;
        const updatedEmail = updatedEmailContact?.email || "";
        const emailRelation =
          updatedEmailContact?.email_dependency || "Self";
        const updatedEmailStatus = getEmailVerificationStatus(updatedEmailContact || {});
        console.log("Current Email:", currentEmail);
        console.log("Pending Email:", updatedEmail);
        console.log("Email Relation:", emailRelation);
        console.log("Pending Email Status:", updatedEmailStatus);

        setExistingEmail(currentEmail);
        setPendingEmail(updatedEmail);
        setPendingEmailStatus(updatedEmailStatus);
        setRelation(emailRelation || "Self");
      } catch (moduleErr) {
        console.error("Failed to fetch or process module data:", moduleErr);
      } finally {
        setPageLoading(false);
      }
    };

    fetchModuleData();
  }, []);

  useEffect(() => {
    if (!showOtpModal || timer <= 0) return;
    const interval = setInterval(() => setTimer((current) => current - 1), 1000);
    return () => clearInterval(interval);
  }, [showOtpModal, timer]);

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
      let parsed = {};

      try {
        parsed = JSON.parse(decryptData(moduleData.data));
        console.log("Decrypted eSign module data:", parsed);
      } catch (err) {
        console.error("Failed to parse decrypted data:", err);
      }

      let links = parsed?.["12"]?.links || [];
      links = links.filter((link) => !link.is_esigned);
      console.log("Filtered Links ->", links);

      if (!links.length) {
        navigate("/congratulations");
      } else {
        window.open(`https://rekyc.meon.co.in${links[0].url}`, "_self");
      }
    } catch (err) {
      console.error("Error fetching eSign data:", err);
      toast.error("Failed to get eSign link. Please try again.");
    } finally {
      // setLoading(false);
    }
  };

  const callCheckUserExistAPI = async (email) => {
    const params = new URLSearchParams({
      key: "Univest123",
      email,
    });

    const response = await fetch(
      `https://api.univest.in/api/kra/check-if-user-exist?${params.toString()}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    const data = await response.json();
    console.log("check-if-user-exist response:", data);
    return { response, data };
  };

  const callUserFormGeneration = async () => {
    try {
      setLoading(true);
      const token = Cookies.get("access_token");

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

  const checkEmailInModuleData = async (enteredEmail, token) => {
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
      console.log("Module Data Response:", moduleData);
      if (!moduleData?.data) {
        return { success: false, error: "No module data received" };
      }

      const decryptedData = JSON.parse(decryptData(moduleData.data));
      console.log("Decrypted module data:", decryptedData);
      const contactDetailData = decryptedData["3"]?.contact_detail_data || [];
      console.log("Contact detail data:", contactDetailData);
      const newContacts = contactDetailData.filter((contact) => contact.is_new === true);
      console.log("New contacts (is_new: true):", newContacts);
      const matchingContact = newContacts.find(
        (contact) => contact.email?.toLowerCase() === enteredEmail.toLowerCase()
      );
      console.log("Entered email:", enteredEmail);
      console.log("Matching contact:", matchingContact);

      if (matchingContact) {
        return { success: true, isValidEmail: true, shouldRedirectToEsign: true };
      }

      return {
        success: true,
        isValidEmail: false,
        error: "This email is already updated for another account",
      };
    } catch (moduleErr) {
      console.error("Failed to fetch or process module data:", moduleErr);
      return {
        success: false,
        error: "Failed to verify email details",
      };
    } finally {
      // setLoading(false);
    }
  };

  const callUpdateEmailAPI = async (token) =>
    fetch("https://rekyc.meon.co.in/v1/user/updateemail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email: newEmail,email_dependency: relation }),
    });

  const callVerifyOtpAPI = async (otpValue, token) =>
    fetch("https://rekyc.meon.co.in/v1/user/verifyemail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ otp: otpValue, email: newEmail, email_dependency: relation }),
    });

  const handleInputChange = (event) => {
    const value = event.target.value;
    setNewEmail(value);

    if (!value.trim()) {
      setError("");
      return;
    }

    if (value.toLowerCase() === existingEmail.toLowerCase()) {
      setError("New email address should be different from existing email address");
      return;
    }

    if (!emailRegex.test(value)) {
      setError("Enter a valid Email ID");
      return;
    }

    setError("");
  };

  const handleVerifyEmail = async () => {
    if (!emailRegex.test(newEmail)) {
      setError("Enter a valid Email ID");
      return;
    }

    if (newEmail.toLowerCase() === existingEmail.toLowerCase()) {
      setError("New email address should be different from existing email address");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const checkUserResult = await callCheckUserExistAPI(newEmail);

      if (!checkUserResult.response.ok) {
        setError("Failed to verify email address. Please try again.");
        return;
      }

      if (!checkUserResult.data.success) {
        setError(
          checkUserResult.data.message || "Email address verification failed."
        );
        return;
      }

      if (checkUserResult.data.data === false) {
        const token = await getValidToken();
        const response = await callUpdateEmailAPI(token);
        const data = await response.json();
        console.log("updateemail response:", data);

        if (response.ok && data?.status) {
          setOtp("");
          setOtpError("");
          setTimer(60);
          setShowOtpModal(true);
          setScreen("submitted");
        } else {
          const moduleResult = await checkEmailInModuleData(newEmail, token);

          if (!moduleResult.success) {
            setError(moduleResult.error);
            return;
          }

          if (moduleResult.isValidEmail) {
            await callUserFormGeneration();
          } else {
            setError(moduleResult.error);
          }
        }
      } else {
        setError("This email address is already registered with another account.");
      }
    } catch (err) {
      console.error("Error in handleVerifyEmail:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpSubmit = async () => {
    if (otp.length !== 6) {
      setOtpError("Enter 6 digit OTP");
      console.log("otp value:", otp);
      return;
    }

    setVerifyingOtp(true);
    setOtpError("");
    console.log("Submitting OTP value:", otp);

    try {
      const token = await getValidToken();
      const response = await callVerifyOtpAPI(otp, token);
      const data = await response.json();
      console.log("verifyemail response:", data);

      if (data?.status === true) {
        triggerWebhook({
          step: "email",
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
          console.log("user_form_generation response:", formData);
        } catch (formErr) {
          console.error("user_form_generation API failed:", formErr);
        } finally {
          setLoading(false);
        }

        toast.success(data.message || "Email verified successfully!");
        await callUserFormGeneration(token);
      } else {
        setOtpError(data?.message || "Enter correct OTP");
      }
    } catch (err) {
      console.error("Error verifying OTP:", err);
      setOtpError("Network error");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      const token = await getValidToken();
      const response = await callUpdateEmailAPI(token);
      if (response.ok) {
        setTimer(60);
        setOtp("");
        setOtpError("");
      } else {
        setOtpError("Failed to resend OTP");
      }
    } catch (err) {
      console.error("Error resending OTP:", err);
      setOtpError("Network error");
    }
  };

  const isEmailValid = emailRegex.test(newEmail) && !error;

  return (
    <div className="update-email-page">
      {loading && <VerificationLoader isVisible={loading} />}

      <header className="update-email-header">
        <button
          className="update-email-back-btn"
          type="button"
          onClick={() => window.history.back()}
        >
          <ArrowLeft size={24} strokeWidth={1.8} />
        </button>
        <h1>Email address</h1>
        <div className="update-email-header-spacer" />
      </header>

      <main className="update-email-content">
        {pageLoading ? (
          <UpdateEmailSkeleton />
        ) : screen === "summary" && (
          <ExistingDetailsCard
            showEditButton
            showNewEmail={Boolean(pendingEmail)}
            relation={relation}
            existingEmail={existingEmail}
            newEmail={pendingEmail || newEmail}
            newEmailStatus={pendingEmailStatus}
            onEdit={() => setScreen("edit")}
          />
        )}

        {!pageLoading && screen === "edit" && (
          <>
            <ExistingDetailsCard
              showEditButton={false}
              showNewEmail={false}
              relation={relation}
              existingEmail={existingEmail}
              newEmail={pendingEmail || newEmail}
              newEmailStatus={pendingEmailStatus}
            />

            <div className="update-email-form-section">
              <h2>Update Email address</h2>

              <div
                className={`update-email-input-wrap ${
                  newEmail ? "active" : ""
                } ${error ? "error" : ""}`}
              >
                {newEmail && (
                  <label className="update-email-floating-label">
                    Enter new email address
                  </label>
                )}
                <input
                  ref={emailInputRef}
                  className="update-email-input"
                  type="email"
                  placeholder="Enter new email address"
                  value={newEmail}
                  onChange={handleInputChange}
                />
              </div>

              {error && <p className="update-email-field-error">{error}</p>}

              <div className="update-email-select-wrap">
                <button
                  className="update-email-select"
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
                  <div className="update-email-select-menu">
                    {RELATION_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`update-email-select-option ${
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
                className={`update-email-primary-btn ${isEmailValid ? "enabled" : ""}`}
                type="button"
                disabled={loading}
                onClick={handleVerifyEmail}
              >
                {loading ? "Processing..." : "Get OTP"}
              </button>
            </div>
          </>
        )}

        {!pageLoading && screen === "submitted" && (
          <ExistingDetailsCard
            showEditButton
            showNewEmail
            relation={relation}
            existingEmail={existingEmail}
            newEmail={pendingEmail || newEmail}
            newEmailStatus={pendingEmailStatus}
            onEdit={() => {
              setShowOtpModal(false);
              setScreen("edit");
              setOtp("");
              setOtpError("");
              setTimeout(() => emailInputRef.current?.focus(), 100);
            }}
          />
        )}
      </main>

      {showOtpModal && (
        <OtpModal
          email={newEmail}
          otp={otp}
          setOtp={setOtp}
          timer={timer}
          otpError={otpError}
          setOtpError={setOtpError}
          onClose={() => setShowOtpModal(false)}
          onVerify={handleVerifyOtpSubmit}
          onResend={handleResendOtp}
          verifyingOtp={verifyingOtp}
        />
      )}
    </div>
  );
};

export default UpdateEmailAddress;
