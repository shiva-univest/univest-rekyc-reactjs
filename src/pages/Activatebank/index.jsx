import React, { useState, useEffect } from "react";
import withAuthCheck from "../../hoc/withAuthCheck";
import { decryptData } from "../../decode";
import { useNavigate, useLocation } from "react-router-dom";
import Cookies from "js-cookie";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker?worker";
pdfjsLib.GlobalWorkerOptions.workerPort = new pdfjsWorker();
import Loader from "../Loader/Loader";
import { toast } from "react-toastify";
import VerificationLoader from "../../Components/VerificationLoader/VerificationLoader";
import { sendDataToMixpanel } from "../../lib/utils";

import "./style1.css";

const refreshAccessToken = async () => {
  const refreshToken = Cookies.get("refresh_token");

  if (!refreshToken) {
    throw new Error("Refresh token not found");
  }

  const response = await fetch(
    "https://rekyc.meon.co.in/v1/user/refresh_token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }
  );

  const data = await response.json();

  if (data?.access_token) {
    Cookies.set("access_token", data.access_token);
    return data.access_token;
  } else {
    throw new Error("Failed to refresh access token");
  }
};



const fetchWithAuth = async (url, options, retry = true) => {
  let token = Cookies.get("access_token");
  options.headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  let response = await fetch(url, options);

  if (response.status === 401 && retry) {
    try {
      token = await refreshAccessToken();
      options.headers.Authorization = `Bearer ${token}`;
      response = await fetch(url, options);
    } catch (refreshErr) {
      console.error("❌ Token refresh failed", refreshErr);
      throw refreshErr;
    }
  }

  return response;
};

const Activatebank = ({ encryptedData }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState("");
  const [userModuleData, setUserModuleData] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [pdfPassword, setPdfPassword] = useState("");
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [allowedTypes, setAllowedTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userFormloading, setUserFormLoading] = useState(false);
  const location = useLocation();

  const segmentData = location.state?.segmentData;

  useEffect(() => {
    const fetchPageModuleMapping = async () => {
      let accessToken = Cookies.get("access_token");
      const refreshToken = Cookies.get("refresh_token");

      const fetchData = async (token) => {
        const response = await fetch(
          "https://rekyc.meon.co.in/v1/user/page_module_mapping",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ page_id: "5" }),
          }
        );
        console.log("response_", response);

        if (!response.ok) {
          throw { status: response.status, data: await response.text() };
        }
        return response.json();
      };

      try {
        setLoading(true);
        console.log("Fetching with token:", accessToken);
        const result = await fetchData(accessToken);

        if (result?.data) {
          const decrypted = decryptData(result.data);
          console.log("decrypted_ddaaatttaa", JSON.parse(decrypted));
          const parsed =
            typeof decrypted === "string" ? JSON.parse(decrypted) : decrypted;
          console.log("✅ Decrypted data:", parsed);
        } else {
          console.warn("⚠️ No `data` in API response.");
        }
      } catch (error) {
        console.warn("API failed. Checking for 401 error...", error);

        if (error.status === 401 && refreshToken) {
          console.warn("Access token expired. Trying to refresh...");

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

            if (newAccessToken) {
              console.log("🔑 New access token received:", newAccessToken);
              Cookies.set("access_token", newAccessToken);
              accessToken = newAccessToken;

              // Retry the failed API call
              const retryResult = await fetchData(accessToken);

              if (retryResult?.data) {
                const decrypted = decryptData(retryResult.data);
                const parsed =
                  typeof decrypted === "string"
                    ? JSON.parse(decrypted)
                    : decrypted;
                console.log("✅ Decrypted after refresh:", parsed);
              } else {
                console.warn("⚠️ No `data` in retry API response.");
              }
            } else {
              console.error("Refresh succeeded, but no access_token returned.");
            }
          } catch (refreshError) {
            console.error("❌ Refresh token request failed:", refreshError);
          }
        } else {
          console.error(
            "❌ Fetch failed and not due to token expiration:",
            error
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPageModuleMapping();
  }, []);

  useEffect(() => {
    if (showPopup) {
      sendDataToMixpanel("page_viewed ", {
        page: "rekyc_fno_doc_option_bf",
      });
    }
  }, [showPopup]);

  useEffect(() => {
    if (encryptedData) {
      try {
        const decrypted = decryptData(encryptedData);
        const parsedData =
          typeof decrypted === "string" ? JSON.parse(decrypted) : decrypted;

        setUserModuleData(parsedData);
        console.log("Decrypted module data:", parsedData);

        const docDetail = parsedData?.["11"]?.document_detail_data?.[0];
        const documentName = docDetail?.document_name;
        const documentId = docDetail?.id;

        if (documentName && documentName.trim() !== "") {
          let accessToken = Cookies.get("access_token");
          const refreshToken = Cookies.get("refresh_token");

          const uploadDocument = async (token) => {
            const response = await fetch(
              `https://rekyc.meon.co.in/v1/user/upload_user_documents/${documentId}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({}),
              }
            );

            if (!response.ok) {
              throw { status: response.status, data: await response.text() };
            }

            return response.json();
          };

          const handleUpload = async () => {
            try {
              // First try with current access token
              const data = await uploadDocument(accessToken);
              console.log("✅ Uploaded document via API:", data);
            } catch (error) {
              console.warn("Upload API failed. Checking 401...", error);

              if (error.status === 401 && refreshToken) {
                console.warn("Access token expired. Refreshing...");

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

                  if (newAccessToken) {
                    console.log(
                      "🔑 New access token received:",
                      newAccessToken
                    );
                    Cookies.set("access_token", newAccessToken);
                    accessToken = newAccessToken;

                    // Retry upload
                    const retryData = await uploadDocument(accessToken);
                    console.log("✅ Retry upload after refresh:", retryData);
                  } else {
                    console.error(
                      "Refresh succeeded, but no access_token returned."
                    );
                  }
                } catch (refreshError) {
                  console.error(
                    "❌ Refresh token request failed:",
                    refreshError
                  );
                }
              } else {
                console.error(
                  "❌ Upload failed and not due to token expiration:",
                  error
                );
              }
            }
          };

          handleUpload();
        }
      } catch (error) {
        console.error("❌ Failed to decrypt or parse encrypted data:", error);
      }
    }
  }, [encryptedData]);

  useEffect(() => {
    if (userModuleData) {
      const fileTypes =
        userModuleData?.["11"]?.document_detail_data?.[0]?.document_file_type
          ?.allowed_type || [];
      setAllowedTypes(fileTypes.map((t) => t.toLowerCase()));
    }
  }, [userModuleData]);

  const urlParams = new URLSearchParams(window.location.search);
  const message = urlParams.get("success");
  const docReqId = urlParams.get("id");
  const documentId = localStorage.getItem("setuDocID");
  useEffect(() => {
    if (docReqId && documentId) {
      setLoading(true);
      getSetuDoc(documentId, docReqId);
    }
  }, [docReqId]);

  const handleProceed = async () => {
    sendDataToMixpanel("cta_clicked", {
      page: "rekyc_fno_doc_option_bf",
      cta_text: "proceed",
    });
    setLoading(true);
    let accessToken = Cookies.get("access_token");
    const refreshToken = Cookies.get("refresh_token");

    if (!accessToken) {
      console.warn("No token available.");
      setLoading(false);
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
          console.warn("Access token expired. Refreshing...");

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

            if (newAccessToken) {
              Cookies.set("access_token", newAccessToken);
              accessToken = newAccessToken;
              console.log("🔑 New token received:", newAccessToken);

              return await fetchData(accessToken); // retry with new token
            } else {
              throw new Error(
                "Refresh succeeded but no access_token returned."
              );
            }
          } catch (refreshError) {
            console.error("❌ Refresh token request failed:", refreshError);
            throw refreshError;
          }
        } else {
          console.error("❌ Fetch failed (not token related):", error);
          throw error;
        }
      }
    };

    try {
      setUserFormLoading(true);
      const formResponse = await fetchWithAuthRetry(
        "https://rekyc.meon.co.in/v1/user/user_form_generation",
        { re_esign: false }
      );

      console.log("Form generation response:", formResponse);

      if (formResponse?.status === true) {
        const moduleResponse = await fetchWithAuthRetry(
          "https://rekyc.meon.co.in/v1/user/get_module_data",
          { page_id: "6" }
        );

        if (moduleResponse?.data) {
          const decrypted = decryptData(moduleResponse.data);
          const parsed =
            typeof decrypted === "string" ? JSON.parse(decrypted) : decrypted;

          console.log("Decrypted Page 6 Data:", parsed);

          const esignLink = parsed?.["12"]?.links?.[0];

          if (esignLink?.is_esigned === true) {
          sendDataToMixpanel("rekyc_fno_activated", {
            page: "rekyc_fno_doc_option_bf",
          });
            navigate("/congratulations");
          } else if (esignLink?.url) {
              sendDataToMixpanel("page_viewed", {
            page: "rekyc_fno_success",
          });
            window.location.href = `https://rekyc.meon.co.in${esignLink.url}`;
          } else {
            toast.error("Missing esign URL.");
            sendDataToMixpanel("rekyc_fno_failed", {
            error: "Missing esign URL.",
          });
          }
        } else {
          toast.error("Failed to get module data.");
           sendDataToMixpanel("rekyc_fno_failed", {
          error: "Failed to get module data.",
        });
        }
      } else {
        toast.error("Something went wrong. Please try again.");
        sendDataToMixpanel("rekyc_fno_failed", {
        error: "Form generation failed.",
      });
      }
    } catch (error) {
      console.error("❌ Error during full proceed flow:", error);
      toast.error("Request failed. Please try again.");
       sendDataToMixpanel("rekyc_fno_failed", {
      error: error?.message || JSON.stringify(error),
    });
      setLoading(false);
    } finally {
      setUserFormLoading(false);
    }
  };

  // const handleFileUpload = async (e) => {
  //   const file = e.target.files[0];
  //   if (!file) return;

  //   if (!selectedDoc) {
  //     toast.error("Please select a document type before uploading.");
  //     return;
  //   }

  //   const extension = file.name.split(".").pop().toLowerCase();
  //   if (!allowedTypes.includes(extension)) {
  //     toast.error(
  //       `Only ${allowedTypes.join(", ").toUpperCase()} files allowed.`
  //     );
  //     return;
  //   }

  //   setUploadedFile(file);

  //   if (extension === "pdf") {
  //     const arrayBuffer = await file.arrayBuffer();

  //     try {
  //       await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  //       uploadDocument(file);
  //     } catch (err) {
  //       if (err?.name === "PasswordException") {
  //         setIsPasswordRequired(true);
  //       } else {
  //         toast.error("Invalid PDF file.");
  //         setUploadedFile(null);
  //       }
  //     }
  //   } else {
  //     uploadDocument(file);
  //   }
  // };
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (!selectedDoc) {
      toast.error("Please select a document type before uploading.");
      return;
    }

    for (const file of files) {
      setUploadedFile(file); // optional, keeps track of last uploaded file

      const extension = file.name.split(".").pop().toLowerCase();

      if (extension === "pdf") {
        // Optional PDF validation
        const arrayBuffer = await file.arrayBuffer();
        try {
          await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          await uploadDocument(file);
        } catch (err) {
          if (err?.name === "PasswordException") {
            setIsPasswordRequired(true);
          } else {
            toast.error("Invalid PDF file.");
            setUploadedFile(null);
          }
        }
      } else {
        // Upload all other file types directly
        await uploadDocument(file);
      }
    }
  };

  const uploadDocument = async (file, password = "") => {
    setLoading(true);
    let accessToken = Cookies.get("access_token");
    const refreshToken = Cookies.get("refresh_token");
    const documentId = userModuleData?.["11"]?.document_detail_data?.[0]?.id;

    if (!accessToken || !documentId || !selectedDoc) {
      toast.error("Missing required data.");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("file_suggestion", selectedDoc);
    if (password) formData.append("password", password);

    const upload = async (token) => {
      const res = await fetch(
        `https://rekyc.meon.co.in/v1/user/upload_user_documents/${documentId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!res.ok) {
        throw { status: res.status, data: await res.text() };
      }
      return res.json();
    };

    try {
      // 🔹 First attempt
      const result = await upload(accessToken);
      console.log("✅ Upload result:", result);

      if (result.status) {
        toast.success("File uploaded successfully.");
        setIsPasswordRequired(false);
        setPdfPassword("");
      } else {
        toast.error("Upload failed.");
      }
    } catch (error) {
      console.warn("Upload failed. Checking for 401...", error);

      if (error.status === 401 && refreshToken) {
        console.warn("Access token expired. Refreshing...");

        try {
          const refreshResponse = await fetch(
            "https://rekyc.meon.co.in/v1/user/token/refresh_token",
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

          if (newAccessToken) {
            Cookies.set("access_token", newAccessToken);
            accessToken = newAccessToken;
            console.log("🔑 Token refreshed. Retrying upload...");

            const retryResult = await upload(accessToken);
            console.log("✅ Retry upload result:", retryResult);

            if (retryResult.status) {
              toast.success("File uploaded successfully.");
              setIsPasswordRequired(false);
              setPdfPassword("");
            } else {
              toast.error("Upload failed.");
            }
          } else {
            console.error("Refresh succeeded but no access_token returned.");
            toast.error("Session expired. Please log in again.");
          }
        } catch (refreshError) {
          console.error("❌ Refresh token request failed:", refreshError);
          toast.error("Session expired. Please log in again.");
        }
      } else {
        console.error("❌ Upload failed (not token related):", error);
        toast.error("Upload failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  // const handleDocSelect = (docType) => setSelectedDoc(docType);
  const handleDocSelect = (docType) => {
    setSelectedDoc(docType);

    // ✅ Send event when user selects doc
    sendDataToMixpanel("page_viewed", {
      page: "rekyc_activate_fno_home",
      cta_clicked: "doc_uploaded",
      doc_uploaded: docType || "false",
    });
  };
  const handleConfirm = () => setShowPopup(false);
  const navigate = useNavigate();

  const handleOtpVerification = async () => {
    sendDataToMixpanel("cta_clicked ", {
      page: "rekyc_activate_fno_home",
      cta_text: "verify_otp",
    });
    setLoading(true);
    let accessToken = Cookies.get("access_token");
    const refreshToken = Cookies.get("refresh_token");
    const documentId = userModuleData?.["11"]?.document_detail_data?.[0]?.id;
    console.log("Access token:", accessToken, userModuleData);

    if (!accessToken || !documentId) {
      toast.error("Missing token or document ID");
      setLoading(false);
      return;
    }

    const fetchInit = async (token) => {
      const response = await fetch(
        `https://rekyc.meon.co.in/v1/user/account_aggregator_setu_init/${documentId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ redirect_url: window.location.href }),
        }
      );

      const data = await response.json();

      // ✅ Handle case: 200 OK but success=false
      if (!response.ok || data.success === false) {
        throw { status: response.status, data };
      }

      return data;
    };

    try {
      const result = await fetchInit(accessToken);

      const pathSegments = new URL(result.url).pathname.split("/");
      const docReqId = pathSegments[pathSegments.length - 1];

      localStorage.setItem("setuDocID", documentId);
      localStorage.setItem("setuDocReqID", docReqId);

      window.open(result.url, "_self");
    } catch (error) {
      console.warn("Init request failed:", error);

      // ✅ Special handling for success=false with msg
      if (error?.data?.success === false && error?.data?.msg) {
        toast.error(error.data.msg);
        setLoading(false);
        return;
      }

      if (error.status === 401 && refreshToken) {
        console.warn("Access token expired. Refreshing...");
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

          if (newAccessToken) {
            Cookies.set("access_token", newAccessToken);
            accessToken = newAccessToken;
            console.log("🔑 Token refreshed. Retrying OTP init...");

            const retryResult = await fetchInit(accessToken);

            const pathSegments = new URL(retryResult.url).pathname.split("/");
            const docReqId = pathSegments[pathSegments.length - 1];

            localStorage.setItem("setuDocID", documentId);
            localStorage.setItem("setuDocReqID", docReqId);

            window.open(retryResult.url, "_self");
          } else {
            console.error("Refresh succeeded but no access_token returned.");
            toast.error("Session expired. Please log in again.");
            setLoading(false);
          }
        } catch (refreshError) {
          console.error("❌ Refresh token request failed:", refreshError);
          toast.error("Session expired. Please log in again.");
          setLoading(false);
        }
      } else {
        console.error("❌ OTP init failed:", error);
        toast.error("Something went wrong.");
        setLoading(false);
      }
    }
  };

  const getSetuDoc = async (documentId, docReqId) => {
    setLoading(true);
    let accessToken = Cookies.get("access_token");
    const refreshToken = Cookies.get("refresh_token");

    // const fetchSetuDoc = async (token) => {
    //   const response = await fetch(
    //     `https://rekyc.meon.co.in/v1/user/get_setu_doc/${documentId}/${docReqId}`,
    //     {
    //       method: "GET",
    //       headers: {
    //         Authorization: `Bearer ${token}`,
    //       },
    //     }
    //   );

    //   if (!response.ok) {
    //     console.log("fdsfinnosff");
    //     alert(
    //       "Something went wrong after returning from Setu. Please try again."
    //     );
    //     throw { status: response.status, data: await response.text() };
    //   }

    //   return response.json();
    // };

    const fetchSetuDoc = async (token, retry = false) => {
      setUserFormLoading(true);
      const response = await fetch(
        `https://rekyc.meon.co.in/v1/user/get_setu_doc/${documentId}/${docReqId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw { status: response.status, data: await response.text() };
      }

      try {
        return await response.json();
      } catch (err) {
        console.error("JSON parse error:", err);

        if (!retry) {
          toast.error("Temporary issue fetching Setu document. Retrying...");

          return await fetchSetuDoc(token, true);
        } else {
          throw {
            status: 400,
            message: "Invalid response from server, please try again later.",
          };
        }
      }
    };

    try {
      const data = await fetchSetuDoc(accessToken);
      console.log("✅ Setu doc retrieved:", data);

      if (data?.success) {
        handleProceed();
      }
    } catch (error) {
      console.warn("get_setu_doc failed. Checking 401...", error);

      if (error.status === 401 && refreshToken) {
        console.warn("Access token expired. Refreshing...");

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

          if (newAccessToken) {
            Cookies.set("access_token", newAccessToken);
            accessToken = newAccessToken;
            console.log("🔑 Token refreshed. Retrying get_setu_doc...");

            const retryData = await fetchSetuDoc(accessToken);
            console.log("✅ Retry Setu doc retrieved:", retryData);

            if (retryData?.success) {
              handleProceed();
            }
          } else {
            console.error("Refresh succeeded but no access_token returned.");
            toast.error("Session expired. Please log in again.");
          }
        } catch (refreshError) {
          console.error("❌ Refresh token request failed:", refreshError);
          toast.error("Session expired. Please log in again.");
        }
      } else {
        console.error("❌ get_setu_doc failed:", error);
        toast.error(
          error.message || "Something went wrong after returning from Setu."
        );
      }
    } finally {
      setUserFormLoading(false);
    }
  };

  const updateUserSegments = async (segmentData) => {
    let token = Cookies.get("access_token");

    const filteredData = (segmentData || []).filter(
      (seg) => seg.segment !== "FNO"
    );

    const payload = { segment_data: filteredData };

    const callApi = async (accessToken) => {
      return fetch("https://rekyc.meon.co.in/v1/user/update_user_segments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
    };

    // First try
    let res = await callApi(token);

    if (res.status === 401) {
      // Token expired → refresh
      token = await refreshAccessToken();
      res = await callApi(token);
    }

    if (!res.ok) {
      throw new Error("Failed to update user segments");
    }

    return res.json();
  };

  // const handleSkip = async () => {
  //   try {
  //     // Assuming you already have segmentData from props/context
  //     await updateUserSegments(segmentData);
  //   } catch (err) {
  //     console.error("❌ Error updating segments on skip:", err);
  //   } finally {
  //     navigate("/segment");
  //   }
  // };
  const handleSkip = async () => {
    sendDataToMixpanel("cta_clicked", {
      page: "rekyc_fno_doc_option_bf",
      cta_text: "skip_for_now",
    });
    try {
      if (segmentData) {
        await updateUserSegments(segmentData); // remove FNO + call API
      } else {
        console.warn("No segmentData passed to this page");
      }
    } catch (err) {
      console.error("❌ Error updating segments on skip:", err);
    } finally {
      navigate("/segment");
    }
  };

  return (
    <div>
      {(loading || userFormloading) && (
        <VerificationLoader isVisible={loading || userFormloading} />
      )}
      <header>
        <div className="a_header_main">
          <button className="a_btn_header" onClick={() => navigate(-1)}>
            <img src="./Icon_app.svg" alt="" />
          </button>
          <button className="a_btn_header">
            <img src="./Frame 1171276551.svg" alt="" />
          </button>
        </div>
      </header>

      <div className="body1">
        <p className="activate_left activate_font">Activate F&O Segment</p>
        <p className="please_prov activate_left">
          Please provide your income proof for F&O segment activation
        </p>

        <div className="container">
          <div className="card_seg">
            <div className="verify_border">
              <div className="icon-container-main">
                <div className="icon-container">
                  <img src="./bank-report 1.svg" alt="Bank Icon" />
                </div>
              </div>
              <h2>Verify Bank Statement via OTP</h2>
              <p className="subtext">
                From <strong>RBI</strong> licensed account aggregator
              </p>
              <button className="otp-button" onClick={handleOtpVerification}>
                Verify OTP <img src="./Icon_app1.svg" alt="" />
              </button>
            </div>

            <p className="info-text">
              <img src="./Vector (1).svg" alt="" /> Faster mode to activate F&O,
              takes only a min
            </p>

            <div className="divider">
              <hr />
              <span>or</span>
              <hr />
            </div>

            {/* {userModuleData?.["11"]?.document_detail_data?.[0]
              ?.document_name && ( */}
            <div className="upload-section">
              <label htmlFor="document">Upload Income Proof</label>

              <div
                className="custom-select-trigger"
                onClick={() => {
                  setShowPopup(true);
                  sendDataToMixpanel("cta_clicked", {
                    page: "rekyc_activate_fno_home",
                    selected_doc: selectedDoc || "select_document",
                  });
                }}
              >
                {selectedDoc
                  ? selectedDoc === "bank"
                    ? "Bank statement (last 6 months)"
                    : selectedDoc === "salary"
                    ? "Salary slip (last month)"
                    : "ITR acknowledgement (last FY)"
                  : "Select document"}
                <span className="dropdown-icon">
                  <img src="./Arrow---Left-2.svg" alt="" />
                </span>
              </div>

              <div className="upload-box">
                <label className="upload_doc_logo_wrapper">
                  <input
                    type="file"
                    hidden
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files);
                      if (!files.length) return;

                      const token = Cookies.get("access_token");
                      const documentId =
                        userModuleData?.["11"]?.document_detail_data?.[0]?.id;
                      if (!token || !documentId || !selectedDoc) return;

                      for (const file of files) {
                        setUploadedFile(file); // optional, keeps track of last uploaded file
                        e.target
                          .closest("label")
                          .classList.add("file-selected");

                        const formData = new FormData();
                        formData.append("file", file);
                        formData.append("file_suggestion", selectedDoc);

                        try {
                          const res = await fetch(
                            `https://rekyc.meon.co.in/v1/user/upload_user_documents/${documentId}`,
                            {
                              method: "POST",
                              headers: { Authorization: `Bearer ${token}` },
                              body: formData,
                            }
                          );
                          const result = await res.json();
                          console.log("✅ Upload result:", result);
                        } catch (err) {
                          console.error("❌ Upload error:", err);
                        }
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* )} */}

            <div className="upload-box">
              <label className="upload_doc_logo_wrapper">
                <input type="file" hidden onChange={handleFileUpload} />
                <p className="upload_doc_logo">
                  {uploadedFile ? (
                    <>
                      <img src="./file-icon.svg" alt="" /> {uploadedFile.name}
                    </>
                  ) : userModuleData?.["11"]?.document_detail_data?.[0]
                      ?.document ? (
                    <>
                      <img src="./file-icon.svg" alt="" />
                      {userModuleData["11"].document_detail_data[0].document
                        .split("?")[0]
                        .split("/")
                        .pop()}
                    </>
                  ) : (
                    <>
                      <img src="./upload 1.svg" alt="" /> Upload document
                    </>
                  )}
                </p>
              </label>

              {isPasswordRequired && (
                <div style={{ marginTop: "10px" }}>
                  <input
                    className="input_verify"
                    type="password"
                    placeholder="Enter PDF password"
                    value={pdfPassword}
                    onChange={(e) => setPdfPassword(e.target.value)}
                    style={{ padding: "8px", marginRight: "10px" }}
                  />
                  <button
                    className="input_verify_button"
                    onClick={() => uploadDocument(uploadedFile, pdfPassword)}
                  >
                    Submit Password
                  </button>
                </div>
              )}

              <p className="format-text">
                Supported Format: {allowedTypes.join(", ").toUpperCase()} (Max.
                2MB)
              </p>
            </div>

            <div className="skip_proceed_main">
              <div className="skip_proceed">
                
                {/* <button className="skip-btn" onClick={handleSkip}>
                  Skip for now
                </button> */}

                <button className="proceed-btn1" onClick={handleProceed}>
                  Proceed
                </button>
              </div>
              <div className="safe-text">
                <img src="./public/Flat Color.svg" alt="" /> 100% Safe & Secure
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPopup && (
        <div className="popup-overlay1" onClick={() => setShowPopup(false)}>
          <div className="popup1" onClick={(e) => e.stopPropagation()}>
            <div className="select_to_mid">
              <h4 className="select_doc">Select Document</h4>
              <p className="as_per_reg">
                As per regulatory requirements, please provide your income proof
                for F&O segment activation
              </p>
            </div>
            <ul>
              <li
                onClick={() => handleDocSelect("bank")}
                className={selectedDoc === "bank" ? "selected" : ""}
              >
                <span className="radio-icon">
                  <span className="radio-outer">
                    {selectedDoc === "bank" && (
                      <span className="radio-inner"></span>
                    )}
                  </span>
                </span>
                Bank statement (last 6 months)
              </li>
              <li
                onClick={() => handleDocSelect("salary")}
                className={selectedDoc === "salary" ? "selected" : ""}
              >
                <span className="radio-icon">
                  <span className="radio-outer">
                    {selectedDoc === "salary" && (
                      <span className="radio-inner"></span>
                    )}
                  </span>
                </span>
                Salary slip (last month)
              </li>
              <li
                onClick={() => handleDocSelect("itr")}
                className={selectedDoc === "itr" ? "selected" : ""}
              >
                <span className="radio-icon">
                  <span className="radio-outer">
                    {selectedDoc === "itr" && (
                      <span className="radio-inner"></span>
                    )}
                  </span>
                </span>
                ITR acknowledgement (last FY)
              </li>
            </ul>
            <button className="confirm-btn" onClick={() => {
         
          sendDataToMixpanel("cta_clicked", {
            page: "rekyc_fno_doc_option_bf",
            cta_text: "confirm",
            selected_doc: selectedDoc || null, 
          });

          
          handleConfirm();
        }}>
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default withAuthCheck(Activatebank);
