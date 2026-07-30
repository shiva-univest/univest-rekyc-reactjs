import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/api";
import { decryptData } from "../../decode";
import Cookies from "js-cookie";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { sendDataToMixpanel } from "../../lib/utils";
import VerificationLoader from "../../Components/VerificationLoader/VerificationLoader";
import "./Nominee.css";

const EMPTY_NOMINEE = {
  fullName: "",
  firstname: "",
  lastname: "",
  dob: "",
  gender: "",
  relation: "",
  percentage: "",
  address_line1: "",
  address_line2: "",
  address_line3: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
  mobile: "",
  email: "",
  document_type: "",
  poi_number: "",
  pan: "",
  isMinor: false,
  isAutoFilled: false,
  sameAsApplicant: false,
  guardian_name: "",
  guardian_dob: "",
  guardian_address1: "",
  guardian_address2: "",
  guardian_address3: "",
  guardian_city: "",
  guardian_state: "",
  guardian_country: "",
  guardian_pincode: "",
  guardian_mobile: "",
  guardian_email: "",
  optionalDetailsExpanded: true,
  sameAddressLoading: false,
};

const REGEX = {
  name: /^[A-Za-z\s.'-]+$/,
  mobile: /^\d{10}$/,
  pincode: /^\d{6}$/,
  state: /^[A-Za-z\s.'-]+$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

const sanitizeName = (value = "") =>
  value.replace(/[^A-Za-z\s.'-]/g, "").replace(/\s{2,}/g, " ");

const sanitizeDigits = (value = "", maxLength) =>
  value.replace(/\D/g, "").slice(0, maxLength);
const sanitizeAlphaNumeric = (value = "", maxLength) =>
  value.replace(/[^A-Za-z0-9]/g, "").slice(0, maxLength);
const sanitizePan = (value = "") =>
  sanitizeAlphaNumeric(value, 10).toUpperCase();

const sanitizeState = (value = "") =>
  value.replace(/[^A-Za-z\s.'-]/g, "").replace(/\s{2,}/g, " ");

const sanitizeEmail = (value = "") => value.replace(/\s/g, "");
const sanitizeAddress = (value = "") =>
  value.replace(/[^A-Za-z0-9\s,./'-]/g, "").replace(/\s{2,}/g, " ").trim();
const getMaskedProofNumber = (documentType, value = "") => {
  if (!value) return "";

  if (documentType !== "AADHAAR") {
    return value;
  }

  if (value.includes("*")) {
    return value.replace(/\*/g, "X");
  }

  if (value.length <= 4) {
    return value;
  }

  return `${"X".repeat(value.length - 4)}${value.slice(-4)}`;
};

const isMaskedProofNumber = (documentType, value) => {
  const normalizedValue = typeof value === "string" ? value.trim() : value;

  if (!normalizedValue) return false;

  if (documentType === "AADHAAR") {
    return /^[X*]{8}\d{4}$/.test(normalizedValue);
  }

  return false;
};

const isValidProofNumber = (documentType, value) => {
  const normalizedValue = typeof value === "string" ? value.trim() : value;

  if (!normalizedValue) return false;

  if (isMaskedProofNumber(documentType, normalizedValue)) {
    return true;
  }

  if (documentType === "AADHAAR") {
    return /^\d{12}$/.test(normalizedValue);
  }

  if (documentType === "PAN") {
    return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(normalizedValue);
  }

  return true;
};

const splitFullName = (fullName = "") => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstname = parts.shift() || "";
  const lastname = parts.join(" ");

  return {
    firstname,
    middlename: "",
    lastname,
  };
};

const isValidFieldValue = (field, value, required = false) => {
  const normalizedValue = typeof value === "string" ? value.trim() : value;

  if (!normalizedValue) {
    return !required;
  }

  switch (field) {
    case "firstname":
    case "guardian_name":
      return REGEX.name.test(normalizedValue);
    case "mobile":
    case "guardian_mobile":
      return REGEX.mobile.test(normalizedValue);
    case "pincode":
    case "guardian_pincode":
      return REGEX.pincode.test(normalizedValue);
    case "state":
    case "guardian_state":
      return REGEX.state.test(normalizedValue);
    case "email":
    case "guardian_email":
      return REGEX.email.test(normalizedValue);
    default:
      return true;
  }
};

const normalizeFieldValue = (field, value) => {
  switch (field) {
    case "firstname":
    case "guardian_name":
      return sanitizeName(value);
    case "mobile":
    case "guardian_mobile":
      return sanitizeDigits(value, 10);
    case "pincode":
    case "guardian_pincode":
      return sanitizeDigits(value, 6);
    case "state":
    case "guardian_state":
      return sanitizeState(value);
    case "email":
    case "guardian_email":
      return sanitizeEmail(value).toLowerCase();
    case "pan":
      return sanitizePan(value);
    default:
      return value;
  }
};

const getFieldError = (field, value) => {
  const normalizedValue = typeof value === "string" ? value.trim() : value;

  if (!normalizedValue) return "";

  switch (field) {
    case "firstname":
    case "guardian_name":
      return isValidFieldValue(field, normalizedValue)
        ? ""
        : "Only letters, spaces, apostrophes, dots, and hyphens are allowed.";
    case "mobile":
    case "guardian_mobile":
      return isValidFieldValue(field, normalizedValue)
        ? ""
        : "Mobile number must be 10 digits.";
    case "pincode":
    case "guardian_pincode":
      return isValidFieldValue(field, normalizedValue)
        ? ""
        : "Pincode must be 6 digits.";
    case "state":
    case "guardian_state":
      return isValidFieldValue(field, normalizedValue)
        ? ""
        : "State can contain only letters and spaces.";
    case "email":
    case "guardian_email":
      return isValidFieldValue(field, normalizedValue)
        ? ""
        : "Enter a valid email address.";
    default:
      return "";
  }
};

const getProofNumberError = (documentType, value) => {
  const normalizedValue = typeof value === "string" ? value.trim() : value;

  if (!normalizedValue) return "";

  if (documentType === "AADHAAR" && !isValidProofNumber(documentType, value)) {
    return "Aadhaar number must be exactly 12 digits.";
  }

  if (documentType === "PAN" && !isValidProofNumber(documentType, value)) {
    return "PAN must be 10 characters in format ABCDE1234F.";
  }

  return "";
};

const FloatingInput = ({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
  className = "",
  error = "",
  ...props
}) => (
  <div
    className={`field-group floating-field ${value ? "has-value" : ""} ${
      disabled ? "is-disabled" : ""
    } ${error ? "has-error" : ""} ${className}`.trim()}
  >
    <input
      type={type}
      value={value || ""}
      onChange={onChange}
      disabled={disabled}
      placeholder=" "
      {...props}
    />
    <label>{label}</label>
    {error ? <span className="field-error">{error}</span> : null}
  </div>
);

const FloatingSelect = ({
  label,
  value,
  onChange,
  disabled = false,
  children,
  className = "",
  error = "",
  ...props
}) => (
  <div
    className={`field-group floating-field floating-select ${
      value ? "has-value" : ""
    } ${disabled ? "is-disabled" : ""} ${error ? "has-error" : ""} ${className}`.trim()}
  >
    <select value={value || ""} onChange={onChange} disabled={disabled} {...props}>
      {children}
    </select>
    <label>{label}</label>
    {error ? <span className="field-error">{error}</span> : null}
  </div>
);

const Nominee = () => {
  const [nominees, setNominees] = useState([]);
  const [sharedData, setSharedData] = useState({});
  const [isChanged, setIsChanged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiLoading, setApiLoading] = useState(false);
  const [statementPreference, setStatementPreference] =
    useState("nominee_status");
  const [activeProofInput, setActiveProofInput] = useState(null);
  const navigate = useNavigate();

  const checkMinor = (dob) => {
    if (!dob) return false;

    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age -= 1;
    }

    return age < 18;
  };

  const getAddressFromApiData = (address = {}) => ({
    address_line1: sanitizeAddress(address.address_line1 || ""),
    address_line2: sanitizeAddress(address.address_line2 || ""),
    address_line3: sanitizeAddress(address.address_line3 || ""),
    city: address.city || "",
    state: address.state || "",
    country: address.country || "",
    pincode: address.pincode || "",
  });

  const buildNominee = (nominee = {}, index = 0, shared = {}) => {
    let documentType = nominee.document_type || "";
    let proofNumber = nominee.poi_number || nominee.pan || "";

    if (!documentType) {
      if (nominee.pan) {
        documentType = "PAN";
        proofNumber = nominee.pan;
      } else if (nominee.aadhaar_number) {
        documentType = "AADHAAR";
        proofNumber = nominee.aadhaar_number;
      }
    }

    return {
      ...EMPTY_NOMINEE,
      ...nominee,
      fullName: [nominee.firstname, nominee.middlename, nominee.lastname]
        .filter(Boolean)
        .join(" "),
      id: nominee.id || index + 1,
      document_type: documentType,
      poi_number: proofNumber,
      pan: nominee.pan || shared?.pan || "",
      address_line1: "",
      address_line2: "",
      address_line3: "",
      city: "",
      state: "",
      country: "",
      pincode: "",
      percentage:
        nominee.percentage?.toString() || (index === 0 ? "100" : ""),
      isMinor: checkMinor(nominee.dob),
      sameAsApplicant: false,
      optionalDetailsExpanded:
        nominee.optionalDetailsExpanded === false ? false : true,
      sameAddressLoading: false,
    };
  };

  const validateNominee = (nominee, totalNominees) => {
    const hasCoreFields =
      nominee.firstname &&
      nominee.document_type &&
      nominee.poi_number &&
      nominee.relation &&
      nominee.dob &&
      nominee.address_line1 &&
      nominee.city &&
      nominee.state &&
      nominee.country &&
      nominee.pincode &&
      nominee.mobile &&
      nominee.percentage;

    if (!hasCoreFields) return false;

    const baseFieldChecks = [
      isValidFieldValue("firstname", nominee.firstname, true),
      isValidFieldValue("mobile", nominee.mobile, true),
      isValidFieldValue("pincode", nominee.pincode, true),
      isValidFieldValue("state", nominee.state, true),
      isValidFieldValue("email", nominee.email, true),
      isValidProofNumber(nominee.document_type, nominee.poi_number),
    ];

    if (baseFieldChecks.some((isValid) => !isValid)) return false;

    if (!nominee.isMinor) return true;

    return (
      nominee.guardian_name &&
      nominee.guardian_dob &&
      nominee.guardian_address1 &&
      nominee.guardian_city &&
      nominee.guardian_state &&
      nominee.guardian_country &&
      nominee.guardian_pincode &&
      nominee.guardian_mobile &&
      isValidFieldValue("guardian_name", nominee.guardian_name, true) &&
      isValidFieldValue("guardian_mobile", nominee.guardian_mobile, true) &&
      isValidFieldValue("guardian_pincode", nominee.guardian_pincode, true) &&
      isValidFieldValue("guardian_state", nominee.guardian_state, true) &&
      isValidFieldValue("guardian_email", nominee.guardian_email, true)
    );
  };

  const isSubmitEnabled = useMemo(() => {
    if (!nominees.length) return false;

    const allFilled = nominees.every((nominee) =>
      validateNominee(nominee, nominees.length)
    );

    const totalPercentage = nominees.reduce(
      (sum, nominee) => sum + parseInt(nominee.percentage || 0, 10),
      0
    );

    return allFilled && totalPercentage === 100;
  }, [nominees]);

  const updateNominees = (updater) => {
    setNominees((currentNominees) => {
      const nextNominees =
        typeof updater === "function" ? updater(currentNominees) : updater;

      if (nextNominees.length === 1) {
        nextNominees[0].percentage = "100";
      }

      return nextNominees;
    });
    setIsChanged(true);
  };

  const handleChange = (index, field, value) => {
    updateNominees((currentNominees) => {
      const updated = [...currentNominees];
      const currentNominee = updated[index];
      let normalizedValue = normalizeFieldValue(field, value);

      if (
        field === "poi_number" &&
        currentNominee?.document_type === "AADHAAR" &&
        !normalizedValue.includes("*")
      ) {
        normalizedValue = sanitizeDigits(normalizedValue, 12);
      }

      if (
        field === "poi_number" &&
        currentNominee?.document_type === "PAN" &&
        !normalizedValue.includes("*")
      ) {
        normalizedValue = sanitizePan(normalizedValue);
      }

      const nominee = {
        ...currentNominee,
        [field]: normalizedValue,
      };

      if (field === "dob") {
        nominee.isMinor = checkMinor(value);

        if (!nominee.isMinor) {
          nominee.guardian_name = "";
          nominee.guardian_dob = "";
          nominee.guardian_address1 = "";
          nominee.guardian_address2 = "";
          nominee.guardian_address3 = "";
          nominee.guardian_city = "";
          nominee.guardian_state = "";
          nominee.guardian_country = "";
          nominee.guardian_pincode = "";
          nominee.guardian_mobile = "";
          nominee.guardian_email = "";
        }
      }

      if (field === "document_type" && nominee.isAutoFilled) {
        nominee.isAutoFilled = false;
      }

      if (field === "document_type" && value === "AADHAAR") {
        nominee.poi_number = nominee.poi_number.includes("*")
          ? nominee.poi_number
          : sanitizeDigits(nominee.poi_number, 12);
      }

      if (field === "document_type" && value === "PAN") {
        nominee.poi_number = nominee.poi_number.includes("*")
          ? nominee.poi_number
          : sanitizePan(nominee.poi_number);
      }

      updated[index] = nominee;
      return updated;
    });
  };

  const handleNomineeNameChange = (index, value) => {
    const fullName = sanitizeName(value);
    const parsedName = splitFullName(fullName);

    updateNominees((currentNominees) => {
      const updated = [...currentNominees];
      updated[index] = {
        ...updated[index],
        fullName,
        firstname: parsedName.firstname,
        lastname: parsedName.lastname,
      };
      return updated;
    });
  };

  const handlePercentageChange = (index, value) => {
    updateNominees((currentNominees) => {
      const updated = [...currentNominees];
      updated[index] = { ...updated[index], percentage: value };

      const total = updated.reduce(
        (sum, nominee) => sum + (parseFloat(nominee.percentage) || 0),
        0
      );

      if (updated.length > 1 && total > 100) {
        toast.error("Total percentage cannot exceed 100%");
        return currentNominees;
      }

      return updated;
    });
  };

  const handleOptionalDetailsToggle = (index) => {
    updateNominees((currentNominees) => {
      const updated = [...currentNominees];
      updated[index] = {
        ...updated[index],
        optionalDetailsExpanded: !updated[index].optionalDetailsExpanded,
      };
      return updated;
    });
  };

  const handleSameAddressToggle = async (index, checked) => {
    if (!checked) {
      updateNominees((currentNominees) => {
        const updated = [...currentNominees];
        updated[index] = {
          ...updated[index],
          sameAsApplicant: false,
          sameAddressLoading: false,
          address_line1: "",
          address_line2: "",
          address_line3: "",
          city: "",
          state: "",
          country: "",
          pincode: "",
        };
        return updated;
      });
      return;
    }

    setApiLoading(true);
    updateNominees((currentNominees) => {
      const updated = [...currentNominees];
      updated[index] = {
        ...updated[index],
        sameAsApplicant: true,
        sameAddressLoading: true,
      };
      return updated;
    });

    try {
      const response = await api.get("/user/client_address_fetch");
      const addressData = response?.data?.data?.[0];

      updateNominees((currentNominees) => {
        const updated = [...currentNominees];

        updated[index] = {
          ...updated[index],
          sameAsApplicant: true,
          sameAddressLoading: false,
          ...(addressData
            ? getAddressFromApiData(addressData)
            : {
                address_line1: "",
                address_line2: "",
                address_line3: "",
                city: "",
                state: "",
                country: "",
                pincode: "",
              }),
        };

        return updated;
      });

      if (!addressData) {
        toast.error("Applicant address data is not available.");
      }
    } catch (error) {
      console.error("Error fetching applicant address:", error);

      updateNominees((currentNominees) => {
        const updated = [...currentNominees];
        updated[index] = {
          ...updated[index],
          sameAsApplicant: false,
          sameAddressLoading: false,
        };
        return updated;
      });

      toast.error("Unable to fetch applicant address right now.");
    } finally {
      setApiLoading(false);
    }
  };

  const addNominee = () => {
    if (nominees.length >= 3) return;

    updateNominees((currentNominees) => [
      ...currentNominees,
      {
        ...EMPTY_NOMINEE,
        id: currentNominees.length + 1,
        pan: sharedData?.pan || "",
        percentage: currentNominees.length === 0 ? "100" : "",
      },
    ]);
  };

  const handleBackClick3 = () => setShowConfirmModal(true);
  const handleCancel = () => setShowConfirmModal(false);
  const handleLeaveAnyway = () => window.history.back();

  const handleStatementPreferenceChange = async (preference) => {
    const payload =
      preference === "name_of_nominee"
        ? { nominee_amc_option: "NAME_OF_NOMINEE" }
        : { nominee_amc_option: "NOMINEE_YES_NO" };

    setApiLoading(true);

    try {
      const response = await api.post(
        "https://rekyc.meon.co.in/v1/user/nominee_amc_option",
        payload
      );

      if (
        response?.data?.success === true ||
        response?.data?.status === "success" ||
        response?.data?.code === 200
      ) {
        setStatementPreference(preference);
      } else {
        toast.error(
          response?.data?.msg ||
            response?.data?.message ||
            "Failed to update option."
        );
      }
    } catch (error) {
      console.error("Error updating nominee AMC option:", error);
      toast.error("Failed to update option.");
    } finally {
      setApiLoading(false);
    }
  };

  useEffect(() => {
    handleStatementPreferenceChange("nominee_status");
  }, []);

  const handleProceed = async () => {
    setApiLoading(true);
    sendDataToMixpanel("cta_clicked", {
      page: "rekyc_fno_doc_option_bf",
      cta_text: "proceed",
    });

    let accessToken = Cookies.get("access_token");
    const refreshToken = Cookies.get("refresh_token");

    if (!accessToken) {
      console.warn("No token available.");
      toast.error("Session expired. Please login again.");
      setApiLoading(false);
      return;
    }

    const fetchWithAuthRetry = async (url, body) => {
      const fetchData = async (token) => {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw { status: response.status, data: await response.text() };
        }

        return response.json();
      };

      try {
        return await fetchData(accessToken);
      } catch (error) {
        if (error.status === 401 && refreshToken) {
          try {
            const refreshResponse = await fetch(
              "https://rekyc.meon.co.in/v1/user/token/refresh",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${refreshToken}`,
                },
                body: JSON.stringify({}),
              }
            );

            if (!refreshResponse.ok) {
              throw {
                status: refreshResponse.status,
                data: await refreshResponse.text(),
              };
            }

            const refreshData = await refreshResponse.json();
            const newAccessToken = refreshData?.data?.access_token;

            if (!newAccessToken) {
              throw new Error("Refresh succeeded but no access_token returned.");
            }

            Cookies.set("access_token", newAccessToken);
            accessToken = newAccessToken;

            return await fetchData(accessToken);
          } catch (refreshError) {
            console.error("Refresh token request failed:", refreshError);
            throw refreshError;
          }
        }

        console.error("Fetch failed:", error);
        throw error;
      }
    };

    try {
      setLoading(true);
      const formResponse = await fetchWithAuthRetry(
        "https://rekyc.meon.co.in/v1/user/user_form_generation",
        { re_esign: false }
      );

      if (formResponse?.status === true) {
        const moduleResponse = await fetchWithAuthRetry(
          "https://rekyc.meon.co.in/v1/user/get_module_data",
          { page_id: "6" }
        );

        if (moduleResponse?.data) {
          const decrypted = decryptData(moduleResponse.data);
          const parsed =
            typeof decrypted === "string" ? JSON.parse(decrypted) : decrypted;
          console.log("Decrypted module data:", parsed);

          const esignLink = parsed?.["12"]?.links?.[0];

          if (esignLink?.is_esigned === true) {
            sendDataToMixpanel("rekyc_fno_activated", {
              page: "rekyc_fno_doc_option_bf",
            });
            navigate("/congratulations");
            return;
          }

          if (esignLink?.url) {
            sendDataToMixpanel("page_viewed", {
              page: "rekyc_fno_success",
            });
            window.location.href = `https://rekyc.meon.co.in${esignLink.url}`;
            return;
          }

          toast.error("Missing esign URL.");
          sendDataToMixpanel("rekyc_fno_failed", {
            error: "Missing esign URL.",
          });
          return;
        }

        toast.error("Failed to get module data.");
        sendDataToMixpanel("rekyc_fno_failed", {
          error: "Failed to get module data.",
        });
        return;
      }

      toast.error("Something went wrong. Please try again.");
      sendDataToMixpanel("rekyc_fno_failed", {
        error: "Form generation failed.",
      });
    } catch (error) {
      console.error("Error during full proceed flow:", error);
      toast.error("Request failed. Please try again.");
      sendDataToMixpanel("rekyc_fno_failed", {
        error: error?.message || JSON.stringify(error),
      });
    } finally {
      setApiLoading(false);
    }
  };

  useEffect(() => {
    const fetchModuleData = async () => {
      setLoading(true);

      try {
        const nomineeRes = await api.post("/user/get_module_data", {
          page_id: "4",
        });

        const nomineeParsed = JSON.parse(decryptData(nomineeRes.data.data));
        console.log("Decrypted nominee data:", nomineeParsed);

        const shared = nomineeParsed?.shared_data || {};
        setSharedData(shared);

        if (nomineeParsed?.["10"]?.client_nominee_guardian_data?.length) {
          setNominees(
            nomineeParsed["10"].client_nominee_guardian_data.map((item, index) =>
              buildNominee(item, index, shared)
            )
          );
        } else {
          setNominees([]);
        }
      } catch (err) {
        console.error("Error fetching nominee data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchModuleData();
  }, []);

  const renderGuardianFields = (index, nominee) => (
    <div className="guardian-block" key={`guardian-${index}`}>
      <FloatingInput
        label="Guardian's full name"
        value={nominee.guardian_name}
        onChange={(e) => handleChange(index, "guardian_name", e.target.value)}
        maxLength={60}
        error={getFieldError("guardian_name", nominee.guardian_name)}
      />

      <FloatingInput
        label="Guardian's DOB"
        type="date"
        value={nominee.guardian_dob}
        onChange={(e) => handleChange(index, "guardian_dob", e.target.value)}
      />

      <FloatingInput
        label="Guardian address line 1"
        value={nominee.guardian_address1}
        onChange={(e) => handleChange(index, "guardian_address1", e.target.value)}
      />

      <FloatingInput
        label="Guardian address line 2"
        value={nominee.guardian_address2}
        onChange={(e) => handleChange(index, "guardian_address2", e.target.value)}
      />

      <FloatingInput
        label="Guardian address line 3"
        value={nominee.guardian_address3}
        onChange={(e) => handleChange(index, "guardian_address3", e.target.value)}
      />

      <div className="inline-fields">
        <FloatingInput
          label="City"
          value={nominee.guardian_city}
          onChange={(e) => handleChange(index, "guardian_city", e.target.value)}
        />

        <FloatingInput
          label="Pincode"
          value={nominee.guardian_pincode}
          onChange={(e) =>
            handleChange(index, "guardian_pincode", e.target.value)
          }
          inputMode="numeric"
          maxLength={6}
          error={getFieldError("guardian_pincode", nominee.guardian_pincode)}
        />
      </div>

      <div className="inline-fields">
        <FloatingInput
          label="State"
          value={nominee.guardian_state}
          onChange={(e) => handleChange(index, "guardian_state", e.target.value)}
          maxLength={40}
          error={getFieldError("guardian_state", nominee.guardian_state)}
        />

        <FloatingInput
          label="Country"
          value={nominee.guardian_country}
          onChange={(e) =>
            handleChange(index, "guardian_country", e.target.value)
          }
        />
      </div>

      <FloatingInput
        label="Guardian's mobile no."
        value={nominee.guardian_mobile}
        onChange={(e) => handleChange(index, "guardian_mobile", e.target.value)}
        inputMode="numeric"
        maxLength={10}
        error={getFieldError("guardian_mobile", nominee.guardian_mobile)}
      />

      <FloatingInput
        label="Guardian's email id"
        type="email"
        value={nominee.guardian_email}
        onChange={(e) => handleChange(index, "guardian_email", e.target.value)}
        inputMode="email"
        error={getFieldError("guardian_email", nominee.guardian_email)}
      />
    </div>
  );

  const renderNomineeFields = (index, nominee) => (
    <div key={nominee.id || index} className="nominee-card">
      <div className="nominee-card-header">
        <div>
          <h3>Nominee {index + 1}</h3>
        </div>
      </div>

      <div className="nominee-details">
        <FloatingInput
          label="Nominee's full name"
          value={nominee.fullName ?? ""}
          onChange={(e) => handleNomineeNameChange(index, e.target.value)}
          maxLength={60}
          error={getFieldError(
            "firstname",
            `${nominee.firstname || ""} ${nominee.lastname || ""}`.trim()
          )}
        />

        <FloatingInput
          label="Nominee's DOB"
          type="date"
          value={nominee.dob}
          onChange={(e) => handleChange(index, "dob", e.target.value)}
        />

        <FloatingSelect
          label="Gender"
          value={nominee.gender}
          onChange={(e) => handleChange(index, "gender", e.target.value)}
        >
          <option value="">Select gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </FloatingSelect>

        {nominee.isMinor && renderGuardianFields(index, nominee)}

        <FloatingSelect
          label="Relationship with applicant"
          value={nominee.relation}
          onChange={(e) => handleChange(index, "relation", e.target.value)}
        >
            <option value="">Select relation</option>
            <option value="Father">Father</option>
            <option value="Mother">Mother</option>
            <option value="Spouse">Spouse</option>
            <option value="Child">Child</option>
            <option value="Son">Son</option>
            <option value="Daughter">Daughter</option>
            <option value="Sibling">Sibling</option>
            <option value="Other">Other</option>
        </FloatingSelect>

        <div className="field-group">
          <FloatingInput
            label="Percentage allocation"
            type="number"
            className="percentage-input"
            value={nominee.percentage}
            onChange={(e) => handlePercentageChange(index, e.target.value)}
          />
          <span className="helper-text">
            Allocation can’t be more / less than 100% including all nominee’s
          </span>
        </div>

        <div className="nominee-subsection">
          <div className="nominee-subsection-header">
            <div>
              <h4>Nominee's details (Optional)</h4>
            </div>
          </div>

          <label className="switch-row">
            <input
              type="checkbox"
              checked={!!nominee.sameAsApplicant}
              onChange={(e) =>
                handleSameAddressToggle(index, e.target.checked)
              }
            />
            <span className="switch-slider" />
            <span>
              Address is same as applicant
              {nominee.sameAddressLoading ? " Loading..." : ""}
            </span>
          </label>

          {nominee.optionalDetailsExpanded && (
            <div className="optional-fields-wrap">
              <FloatingInput
                label="Address line 1"
                value={nominee.address_line1}
                onChange={(e) =>
                  handleChange(index, "address_line1", e.target.value)
                }
              />

              <FloatingInput
                label="Address line 2"
                value={nominee.address_line2}
                onChange={(e) =>
                  handleChange(index, "address_line2", e.target.value)
                }
              />

              <FloatingInput
                label="Address line 3"
                value={nominee.address_line3}
                onChange={(e) =>
                  handleChange(index, "address_line3", e.target.value)
                }
              />

              <div className="inline-fields">
                <FloatingInput
                  label="City / Place"
                  value={nominee.city}
                  onChange={(e) => handleChange(index, "city", e.target.value)}
                />

                <FloatingInput
                  label="Pincode"
                  value={nominee.pincode}
                  onChange={(e) => handleChange(index, "pincode", e.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  error={getFieldError("pincode", nominee.pincode)}
                />
              </div>

              <div className="inline-fields">
                <FloatingInput
                  label="State"
                  value={nominee.state}
                  onChange={(e) => handleChange(index, "state", e.target.value)}
                  maxLength={40}
                  error={getFieldError("state", nominee.state)}
                />

                <FloatingInput
                  label="Country"
                  value={nominee.country}
                  onChange={(e) => handleChange(index, "country", e.target.value)}
                />
              </div>

              <FloatingInput
                label="Nominee's mobile no."
                value={nominee.mobile}
                onChange={(e) => handleChange(index, "mobile", e.target.value)}
                inputMode="numeric"
                maxLength={10}
                error={getFieldError("mobile", nominee.mobile)}
              />

              <FloatingInput
                label="Nominee's email id"
                type="email"
                value={nominee.email}
                onChange={(e) => handleChange(index, "email", e.target.value)}
                inputMode="email"
                error={getFieldError("email", nominee.email)}
              />

              <FloatingSelect
                label="Identity proof"
                value={nominee.document_type}
                onChange={(e) =>
                  handleChange(index, "document_type", e.target.value)
                }
              >
                <option value="">Select identity proof</option>
                <option value="PAN">PAN</option>
                <option value="AADHAAR">Aadhaar</option>
                <option value="PASSPORT">Passport</option>
              </FloatingSelect>

              <FloatingInput
                label="Enter proof no."
                value={
                  activeProofInput === index
                    ? nominee.poi_number.includes("*")
                      ? getMaskedProofNumber(
                          nominee.document_type,
                          nominee.poi_number
                        )
                      : nominee.poi_number
                    : getMaskedProofNumber(
                        nominee.document_type,
                        nominee.poi_number
                      )
                }
                onChange={(e) => handleChange(index, "poi_number", e.target.value)}
                onFocus={() => setActiveProofInput(index)}
                onBlur={() => setActiveProofInput(null)}
                inputMode={
                  nominee.document_type === "AADHAAR" ? "numeric" : undefined
                }
                maxLength={
                  nominee.document_type === "AADHAAR"
                    ? 12
                    : nominee.document_type === "PAN"
                      ? 10
                      : undefined
                }
                error={getProofNumberError(
                  nominee.document_type,
                  nominee.poi_number
                )}
              />

              <button
                type="button"
                className="view-toggle-btn"
                onClick={() => handleOptionalDetailsToggle(index)}
              >
                <span>
                  {nominee.optionalDetailsExpanded
                    ? "View less (optional)"
                    : "View more (optional)"}
                </span>
                <span
                  className={`view-toggle-arrow ${
                    nominee.optionalDetailsExpanded ? "expanded" : ""
                  }`}
                />
              </button>
            </div>
          )}

          {!nominee.optionalDetailsExpanded && (
            <button
              type="button"
              className="view-toggle-btn"
              onClick={() => handleOptionalDetailsToggle(index)}
            >
              <span>View more (optional)</span>
              <span className="view-toggle-arrow" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const handleSubmit = async () => {
    if (!isSubmitEnabled) return;

    setSubmitting(true);
    setApiLoading(true);
    const token = Cookies.get("access_token");

    const nomineedata = nominees.flatMap((nominee, index) => {
      const nomineeName = splitFullName(
        nominee.fullName ||
          `${nominee.firstname || ""} ${nominee.lastname || ""}`.trim()
      );

      const nomineePayload = {
        sequance_number: String(index + 1),
        is_nominee: true,
        firstname: nomineeName.firstname,
        middlename: nomineeName.middlename,
        lastname: nomineeName.lastname,
        email: nominee.email || "",
        mobile: nominee.mobile || "",
        dob: nominee.dob || "",
        relation: nominee.relation || "",
        other_relation: "",
        gender: nominee.gender || "",
        address_line1: nominee.address_line1 || "",
        address_line2: nominee.address_line2 || "",
        address_line3: nominee.address_line3 || "",
        country: nominee.country || "",
        state: nominee.state || "",
        city: nominee.city || "",
        pincode: nominee.pincode || "",
        percentage: nominee.percentage || "",
        document_type: nominee.document_type || "",
        poi_number: nominee.poi_number || "",
      };

      if (!nominee.isMinor) {
        return [nomineePayload];
      }

      const guardianName = splitFullName(nominee.guardian_name || "");

      const guardianPayload = {
        sequance_number: String(index + 1),
        is_nominee: false,
        firstname: guardianName.firstname,
        middlename: guardianName.middlename,
        lastname: guardianName.lastname,
        email: nominee.guardian_email || "",
        mobile: nominee.guardian_mobile || "",
        dob: nominee.guardian_dob || "",
        relation: "",
        other_relation: "",
        gender: "",
        address_line1: nominee.guardian_address1 || "",
        address_line2: nominee.guardian_address2 || "",
        address_line3: nominee.guardian_address3 || "",
        country: nominee.guardian_country || "",
        state: nominee.guardian_state || "",
        city: nominee.guardian_city || "",
        pincode: nominee.guardian_pincode || "",
        percentage: "",
        document_type: "",
        poi_number: "",
      };

      return [nomineePayload, guardianPayload];
    });

    const payload = {
      nominee_flag: nomineedata.length ? "YES" : "NO",
      nomineedata,
    };

    try {
      const response = await api.post(
        "https://rekyc.meon.co.in/v1/user/nomineedata",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response?.data?.status === true) {
        toast.success(response?.data?.message || "Nominee saved successfully!");
        await handleProceed();
      } else {
        toast.error(response?.data?.message || "Error saving nominee");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving nominee");
    } finally {
      setSubmitting(false);
      setApiLoading(false);
    }
  };

  return (
    <div>
      {(loading || apiLoading) && (
        <VerificationLoader isVisible={loading || apiLoading} />
      )}
      <header>
        <div className="header_div_per_nominee">
          <p className="trading_pre_per">Nominee details</p>
          <button className="back_btn_head_per" onClick={handleBackClick3}>
            <img className="back_btn1_per" src="./Icon_apparrow.svg" alt="" />
          </button>
        </div>
      </header>

      <div className="container3">
        {loading ? (
          <p>Loading nominee data...</p>
        ) : nominees.length === 0 ? (
          <div className="empty-card">
            <img className="nominee_img1" src="./Frame 1171276645.svg" alt="" />
            <div className="fixed-footer">
              <div className="note">Note: You can add up to 3 nominees</div>
              <button className="add-btn" onClick={addNominee}>
                Add nominee
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="nominee-top-strip">
              <p>Print nominee details in periodic statements</p>
              <div className="statement-toggle-group">
                <button
                  type="button"
                  className={`statement-toggle-btn ${
                    statementPreference === "name_of_nominee" ? "selected" : ""
                  }`}
                  onClick={() =>
                    handleStatementPreferenceChange("name_of_nominee")
                  }
                >
                  <span className="statement-radio" />
                  Name of nominee
                </button>

                <button
                  type="button"
                  className={`statement-toggle-btn ${
                    statementPreference === "nominee_status" ? "selected" : ""
                  }`}
                  onClick={() =>
                    handleStatementPreferenceChange("nominee_status")
                  }
                >
                  <span className="statement-radio" />
                  Nominee status
                </button>
              </div>
            </div>

            {nominees.map((nominee, index) => renderNomineeFields(index, nominee))}

            {nominees.length < 3 && (
              <button className="add-more-btn" onClick={addNominee}>
                + Add nominee {nominees.length + 1} <span>(optional)</span>
              </button>
            )}

            <div className="nominee_submit_btn">
              <button
                className={`btn-submit ${isSubmitEnabled ? "active" : "disabled"}`}
                disabled={!isSubmitEnabled || submitting}
                onClick={handleSubmit}
              >
                {submitting ? "Saving..." : "Submit"}
              </button>
            </div>
          </>
        )}
      </div>

      {showConfirmModal && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal">
            <p>
              Unsaved changes will be lost. Are you sure you want to go back?
            </p>
            <div className="modal-buttons">
              <button className="cancel-btn" onClick={handleCancel}>
                Cancel
              </button>
              <button className="leave-btn" onClick={handleLeaveAnyway}>
                Leave anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Nominee;
