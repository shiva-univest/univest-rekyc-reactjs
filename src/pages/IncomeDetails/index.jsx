import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, X } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker?worker";
import { toast } from "react-toastify";
import api from "../../api/api";
import { decryptData } from "../../decode";
import VerificationLoader from "../../Components/VerificationLoader/VerificationLoader";
import { sendDataToMixpanel } from "../../lib/utils";
import "./style.css";

pdfjsLib.GlobalWorkerOptions.workerPort = new pdfjsWorker();

const PAGE_ID = "5";
const DETAILS_PAGE_ID = "9";
const NEXT_PAGE_ID = "6";
const INCOME_OPTIONS = [
  "Below 1 Lac",
  "1-5 Lac",
  "5-10 Lac",
  "10-25 Lac",
  ">25 Lac",
];

const INCOME_KEY_CANDIDATES = [
  "annual_income",
  "annualIncome",
  "income_range",
  "incomeRange",
  "income",
  "annual_income_yearly",
  "annualIncomeYearly",
];

const extractDocumentName = (documentUrl = "") => {
  if (!documentUrl) return "";
  return documentUrl.split("?")[0].split("/").pop() || "";
};

const formatIncomeValue = (value) => {
  if (typeof value !== "string" || !value.trim()) return "--";

  const normalized = value.trim().toLowerCase();
  const mappedValues = {
    below_1_lac: "Below 1 Lac",
    below_1_lakh: "Below 1 Lac",
    "1_5_lac": "1-5 Lac",
    "5_10_lac": "5-10 Lac",
    "10_25_lac": "10-25 Lac",
    above_25_lac: ">25 Lac",
    greater_than_25_lac: ">25 Lac",
    ">25_lac": ">25 Lac",
  };

  if (mappedValues[normalized]) {
    return mappedValues[normalized];
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b(\d+)\s+(\d+)\b/g, "$1-$2")
    .replace(/\blac\b/gi, "Lac")
    .replace(/\blakh\b/gi, "Lac")
    .replace(/\s+/g, " ")
    .trim();
};

const toAnnualIncomePayloadValue = (value) => {
  const normalized = formatIncomeValue(value).toLowerCase();
  const payloadMap = {
    "below 1 lac": "below_1_lac",
    "1-5 lac": "1_5_lac",
    "5-10 lac": "5_10_lac",
    "10-25 lac": "10_25_lac",
    ">25 lac": "above_25_lac",
  };

  return payloadMap[normalized] || value;
};

const findValueByKeys = (input, keys) => {
  if (!input || typeof input !== "object") return "";

  for (const [key, value] of Object.entries(input)) {
    if (keys.includes(key) && value) {
      return Array.isArray(value) ? value[0] : value;
    }

    if (value && typeof value === "object") {
      const nestedValue = findValueByKeys(value, keys);
      if (nestedValue) return nestedValue;
    }
  }

  return "";
};

const buildExistingIncome = (moduleData) => {
  const incomeValue = findValueByKeys(moduleData, INCOME_KEY_CANDIDATES);

  if (typeof incomeValue === "string" && incomeValue.trim()) {
    return formatIncomeValue(incomeValue);
  }

  if (typeof incomeValue === "number") {
    return String(incomeValue);
  }

  return "--";
};

const getIncomeValuesFromPageNine = (moduleData) => {
  const personalDetails = moduleData?.["8"]?.personal_detail_data || [];
  const existingRecord =
    personalDetails.find((item) => item?.is_new === false) || null;
  const updatedRecord =
    personalDetails.find((item) => item?.is_new === true) || null;

  return {
    existingIncome: buildExistingIncome(existingRecord),
    updatedIncome: buildExistingIncome(updatedRecord),
  };
};

const IncomeDetails = ({ encryptedData }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const [moduleData, setModuleData] = useState(null);
  const [selectedIncomeRange, setSelectedIncomeRange] = useState("");
  const [showIncomeSheet, setShowIncomeSheet] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedServerFileName, setUploadedServerFileName] = useState("");
  const [uploadedServerDocumentUrl, setUploadedServerDocumentUrl] = useState("");
  const [pdfPassword, setPdfPassword] = useState("");
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [pendingPasswordFile, setPendingPasswordFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const segmentData = location.state?.segmentData;
  const documentDetail = moduleData?.["11"]?.document_detail_data?.[0] || null;
  const hasDocumentUpload =
    (moduleData?.["11"]?.document_detail_data || []).length > 0;
  const { existingIncome, updatedIncome } = getIncomeValuesFromPageNine(moduleData);
  const allowedTypes =
    documentDetail?.document_file_type?.allowed_type?.map((type) =>
      String(type).toLowerCase()
    ) || [];
  const showUploadedPreview = Boolean(previewUrl || uploadedServerFileName);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const syncModuleState = (pageNineData = {}, pageFiveData = {}) => {
    const mergedModuleData = {
      ...pageNineData,
      ...pageFiveData,
      shared_data: pageFiveData?.shared_data || pageNineData?.shared_data || {},
    };

    setModuleData(mergedModuleData);

    const incomeValues = getIncomeValuesFromPageNine(mergedModuleData);
    if (!selectedIncomeRange && incomeValues.updatedIncome !== "--") {
      setSelectedIncomeRange(incomeValues.updatedIncome);
    } else if (!selectedIncomeRange && incomeValues.existingIncome !== "--") {
      setSelectedIncomeRange(incomeValues.existingIncome);
    }

    const savedDocumentUrl =
      mergedModuleData?.["11"]?.document_detail_data?.[0]?.document || "";
    const savedDocumentName = extractDocumentName(savedDocumentUrl);

    if (savedDocumentName) {
      setUploadedServerFileName(savedDocumentName);
      setUploadedServerDocumentUrl(savedDocumentUrl);
    }
  };

  const fetchAndDecryptModuleData = async (pageId) => {
    console.log(`Fetching module (fetchAndDecryptModuleData) data for page ${pageId}...`);
    const response = await api.post("/user/get_module_data", {
      page_id: pageId,
    });

    console.log(`API Raw Response (page ${pageId}):`, response.data);

    if (!response?.data?.data) {
      throw new Error(`Module data not found for page ${pageId}`);
    }

    const decrypted = decryptData(response.data.data);
    const parsed =
      typeof decrypted === "string" ? JSON.parse(decrypted) : decrypted;

    console.log(`Decrypted data (page ${pageId}):`, decrypted);
    console.log(`Decrypted data (page ${pageId}):`, parsed);

    return parsed;
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setLoading(true);

        if (encryptedData) {
          console.log(`API Raw Response (page ${PAGE_ID}):`, { data: encryptedData });
          const decryptedPageFive = decryptData(encryptedData);
          const pageFiveData =
            typeof decryptedPageFive === "string"
              ? JSON.parse(decryptedPageFive)
              : decryptedPageFive;
          console.log(`Decrypted data (page ${PAGE_ID}):`, decryptedPageFive);
          console.log(`Decrypted data (page ${PAGE_ID}):`, pageFiveData);

          const pageNineData = await fetchAndDecryptModuleData(DETAILS_PAGE_ID);

          syncModuleState(pageNineData, pageFiveData);
        } else {
          const [pageNineData, pageFiveData] = await Promise.all([
            fetchAndDecryptModuleData(DETAILS_PAGE_ID),
            fetchAndDecryptModuleData(PAGE_ID),
          ]);

          syncModuleState(pageNineData, pageFiveData);
        }
      } catch (error) {
        console.error("Failed to load income details:", error);
        toast.error("Failed to load income details.");
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [encryptedData]);

  const refreshPageFiveData = async () => {
    const pageFiveData = await fetchAndDecryptModuleData(PAGE_ID);
    const pageNineData = await fetchAndDecryptModuleData(DETAILS_PAGE_ID);
    syncModuleState(pageNineData, pageFiveData);
    return { pageNineData, pageFiveData };
  };

  const createPreviewFromFile = async (file) => {
    if (!file) return "";

    if (file.type.startsWith("image/")) {
      return URL.createObjectURL(file);
    }

    if (file.type === "application/pdf") {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.2 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;

      return canvas.toDataURL("image/png");
    }

    return "";
  };

  const createPreviewFromUrl = async (documentUrl) => {
    if (!documentUrl) return "";

    const cleanUrl = documentUrl.split("?")[0].toLowerCase();

    if (
      cleanUrl.endsWith(".png") ||
      cleanUrl.endsWith(".jpg") ||
      cleanUrl.endsWith(".jpeg") ||
      cleanUrl.endsWith(".webp")
    ) {
      return documentUrl;
    }

    if (cleanUrl.endsWith(".pdf")) {
      const pdf = await pdfjsLib.getDocument(documentUrl).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.2 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;

      return canvas.toDataURL("image/png");
    }

    return "";
  };

  useEffect(() => {
    const hydrateSavedPreview = async () => {
      if (previewUrl || !uploadedServerDocumentUrl || uploadedFile) {
        return;
      }

      try {
        const savedPreview = await createPreviewFromUrl(uploadedServerDocumentUrl);
        if (savedPreview) {
          setPreviewUrl(savedPreview);
        }
      } catch (error) {
        console.error("Failed to rebuild saved document preview:", error);
      }
    };

    hydrateSavedPreview();
  }, [previewUrl, uploadedServerDocumentUrl, uploadedFile]);

  const clearUploadedDocument = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl("");
    setUploadedFile(null);
    setUploadedServerFileName("");
    setUploadedServerDocumentUrl("");
    setPendingPasswordFile(null);
    setIsPasswordRequired(false);
    setPdfPassword("");
  };

  const uploadDocument = async (file, password = "") => {
    if (!documentDetail?.id) {
      toast.error("Document details are missing.");
      return;
    }

    if (!selectedIncomeRange) {
      toast.error("Please select income range.");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("file_suggestion", selectedIncomeRange);

      if (password) {
        formData.append("password", password);
      }

      const response = await api.post(
        `/user/upload_user_documents/${documentDetail.id}`,
        formData
      );

      const result = response?.data || {};

      if (result?.status === false || result?.success === false) {
        throw new Error(result?.msg || result?.message || "Upload failed.");
      }

      setUploadedFile(file);
      setUploadedServerFileName(file.name);
      setIsPasswordRequired(false);
      setPendingPasswordFile(null);
      setPdfPassword("");
      toast.success("File uploaded successfully.");

      await refreshPageFiveData();
    } catch (error) {
      console.error("Income document upload failed:", error);
      toast.error(
        error?.response?.data?.msg ||
          error?.response?.data?.message ||
          error?.message ||
          "Upload failed."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelection = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase() || "";

    if (allowedTypes.length && !allowedTypes.includes(extension)) {
      toast.error(`Only ${allowedTypes.join(", ").toUpperCase()} files allowed.`);
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Please upload a file smaller than 2MB.");
      return;
    }

    if (extension === "pdf") {
      try {
        const preview = await createPreviewFromFile(file);
        if (previewUrl && previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(preview);
        await uploadDocument(file);
      } catch (error) {
        if (error?.name === "PasswordException") {
          setUploadedFile(file);
          setPendingPasswordFile(file);
          setPreviewUrl("");
          setIsPasswordRequired(true);
          toast.info("This PDF is password protected. Please enter the password.");
          return;
        }

        console.error("Invalid PDF:", error);
        toast.error("Invalid PDF file.");
      }

      return;
    }

    const preview = await createPreviewFromFile(file);
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(preview);
    await uploadDocument(file);
  };

  const handlePasswordSubmit = async () => {
    if (!pendingPasswordFile || !pdfPassword.trim()) {
      toast.error("Please enter PDF password.");
      return;
    }

    await uploadDocument(pendingPasswordFile, pdfPassword.trim());
  };

  const handleSubmit = async () => {
    if (!selectedIncomeRange) {
      toast.error("Please select your income range.");
      return;
    }

    if (hasDocumentUpload && !uploadedFile && !uploadedServerFileName) {
      toast.error("Please upload your bank statement.");
      return;
    }

    try {
      setLoading(true);

      await api.post("/user/other_details", {
        annual_income: toAnnualIncomePayloadValue(selectedIncomeRange),
      });

      const formResponse = await api.post("/user/user_form_generation", {
        re_esign: false,
      });

      console.log("Form generation response:", formResponse.data);

      if (formResponse?.data?.status !== true) {
        toast.error("Something went wrong. Please try again.");
        sendDataToMixpanel("rekyc_fno_failed", {
          error: "Form generation failed.",
        });
        setLoading(false);
        return;
      }

      const nextPageData = await fetchAndDecryptModuleData(NEXT_PAGE_ID);
      console.log(`Decrypted Page ${NEXT_PAGE_ID} Data:`, nextPageData);

      const esignLink = nextPageData?.["12"]?.links?.[0];

      if (esignLink?.is_esigned === true) {
        sendDataToMixpanel("rekyc_fno_activated", {
          page: "rekyc_fno_doc_option_bf",
        });
        navigate("/congratulations", {
          state: { from: "incomeDetails", segmentData },
        });
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
      setLoading(false);
    } catch (error) {
      console.error("Failed to submit income details:", error);
      const isModuleDataMissing =
        !error?.response && error?.message?.includes("Module data not found");

      if (isModuleDataMissing) {
        sendDataToMixpanel("rekyc_fno_failed", {
          error: "Failed to get module data.",
        });
        toast.error("Failed to get module data.");
        setLoading(false);
        return;
      }

      toast.error(
        error?.response?.data?.msg ||
          error?.response?.data?.message ||
          "Failed to submit income details."
      );
      setLoading(false);
    }
  };

  return (
    <div className="income-page">
      {(loading || uploading) && (
        <VerificationLoader isVisible={loading || uploading} />
      )}

      <header className="income-header">
        <button className="income-icon-button" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1>Income details</h1>
        <span className="income-header-spacer" />
      </header>

      <main className="income-content">
        <section className="income-section">
          <h2>Existing income details</h2>
          <div className="income-summary-card">
            <p className="income-summary-title">Annual Income</p>
            <p className="income-summary-text">{existingIncome}</p>
          </div>
        </section>

        <section className="income-section">
          <h2>Update income details</h2>

          <div className="income-field-block">
            <label className="income-field-label">Income range</label>
            <button
              className="income-select"
              type="button"
              onClick={() => setShowIncomeSheet(true)}
            >
              <span>{selectedIncomeRange || "Select income range"}</span>
              <img
                src="/Arrow---Left-2.svg"
                alt="Open income range options"
                className="income-select-icon"
              />
            </button>
          </div>

          {hasDocumentUpload && (
            <div
              className="income-upload-card"
              role="button"
              tabIndex={0}
              onClick={() => {
                if (!showUploadedPreview) {
                  fileInputRef.current?.click();
                }
              }}
              onKeyDown={(event) => {
                if (
                  !showUploadedPreview &&
                  (event.key === "Enter" || event.key === " ")
                ) {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept={allowedTypes.length ? allowedTypes.map((type) => `.${type}`).join(",") : undefined}
                onChange={handleFileSelection}
              />
              {showUploadedPreview ? (
                <div className="income-upload-preview-wrapper">
                  <button
                    type="button"
                    className="income-upload-preview-close"
                    onClick={(event) => {
                      event.stopPropagation();
                      clearUploadedDocument();
                    }}
                  >
                    <X size={18} />
                  </button>
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={
                        uploadedFile?.name ||
                        uploadedServerFileName ||
                        "Uploaded document"
                      }
                      className="income-upload-preview-image"
                    />
                  ) : (
                    <div className="income-upload-preview-fallback">
                      <p className="income-file-name">
                        {uploadedFile?.name ||
                          uploadedServerFileName ||
                          "Uploaded document"}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="income-upload-card-inner">
                  <Upload size={26} className="income-upload-icon" />
                  <p className="income-upload-title">Upload Bank Statement (Last 6 months)</p>
                  <p className="income-upload-subtitle">
                    PDF {allowedTypes.length ? `(${allowedTypes.join(", ").toUpperCase()})` : ""} (Max. 2MB)
                  </p>
                </div>
              )}
            </div>
          )}

          {hasDocumentUpload && isPasswordRequired && (
            <div className="income-password-box">
              <input
                type="password"
                className="income-password-input"
                placeholder="Enter PDF password"
                value={pdfPassword}
                onChange={(event) => setPdfPassword(event.target.value)}
              />
              <button
                type="button"
                className="income-password-button"
                onClick={handlePasswordSubmit}
              >
                Upload file
              </button>
            </div>
          )}
        </section>
      </main>

      <footer className="income-footer">
        <button
          type="button"
          className="income-submit-button"
          onClick={handleSubmit}
          disabled={!selectedIncomeRange || loading || uploading}
        >
          Submit
        </button>
      </footer>

      {showIncomeSheet && (
        <div
          className="income-sheet-overlay"
          onClick={() => setShowIncomeSheet(false)}
        >
          <div
            className="income-sheet"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Select Document</h3>

            <div className="income-sheet-options">
              {INCOME_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`income-sheet-option${
                    selectedIncomeRange === option ? " active" : ""
                  }`}
                  onClick={() => setSelectedIncomeRange(option)}
                >
                  <span className="income-radio">
                    <span className="income-radio-dot" />
                  </span>
                  <span>{option}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="income-confirm-button"
              onClick={() => setShowIncomeSheet(false)}
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomeDetails;
