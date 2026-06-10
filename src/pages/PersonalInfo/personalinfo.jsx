import React, { useState, useEffect } from "react";
import "./personal.css";
import { Pencil } from "lucide-react";
import EditContactModal from "./EditContactModal";
import EditContactPhone from "./EditContactPhone";
import Cookies from "js-cookie";
import { decryptData } from "../../decode";
import { useNavigate } from "react-router-dom";
import withAuthCheck from "../../hoc/withAuthCheck";
import { sendDataToMixpanel } from "../../lib/utils";

const API_BASE_URL = "https://rekycuat.meon.co.in/v1/user";

const Section = ({ title, onEdit = null, children }) => (
  <div className="section-wrapper">
    <div className="section-header">
      <h3>{title}</h3>
      {/* {onEdit && (
        <button className="edit-btn edit_new" onClick={onEdit}>
          <Pencil size={14} />
          Edit
        </button>
      )} */}
    </div>
    <div className="section-box">{children}</div>
  </div>
);

const UserInfoCard = () => {
  const [userModuleData, setUserModuleData] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showModalPhone, setShowModalPhone] = useState(false);
  const [showDigilockerModal, setShowDigilockerModal] = useState(false);
  const [digilockerLoading, setDigilockerLoading] = useState(false);
  const navigate = useNavigate();

  const refreshAccessToken = async () => {
    const refreshToken = Cookies.get("refresh_token");

    if (!refreshToken) {
      throw new Error("Refresh token not found");
    }

    const refreshResponse = await fetch(`${API_BASE_URL}/token/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshToken}`,
      },
      body: JSON.stringify({}),
    });

    if (!refreshResponse.ok) {
      throw new Error("Failed to refresh access token");
    }

    const refreshData = await refreshResponse.json();
    const newAccessToken = refreshData?.data?.access_token;

    if (!newAccessToken) {
      throw new Error("Refresh succeeded, but no access token returned");
    }

    Cookies.set("access_token", newAccessToken);
    return newAccessToken;
  };

  const fetchWithAuth = async (url, options = {}, retry = true) => {
    let token = Cookies.get("access_token");
    let response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401 && retry) {
      token = await refreshAccessToken();
      response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      });
    }

    return response;
  };

  const connectDigilocker = async () => {
    try {
      setDigilockerLoading(true);
      const response = await fetchWithAuth(`${API_BASE_URL}/get_digilocker_url`, {
        method: "POST",
        body: JSON.stringify({
          redirect_url: `${window.location.origin}${window.location.pathname}`,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.msg || "Unable to connect to Digilocker");
      }

      const digiData = result?.data
        ? JSON.parse(decryptData(result.data))
        : null;

      if (!digiData?.url) {
        throw new Error("Digilocker URL missing in response");
      }

      if (digiData?.state) {
        sessionStorage.setItem("state", digiData.state);
      }

      if (digiData?.client_token) {
        sessionStorage.setItem("client_token", digiData.client_token);
      }

      window.location.href = digiData.url;
    } catch (error) {
      console.error("Digilocker connect failed:", error);
    } finally {
      setDigilockerLoading(false);
    }
  };

  const handleEditPersonal = () => {
    console.log("Editing personal information");
    if (userModuleData) {
      navigate("/personaledit", { state: { userData: userModuleData } });
    }
  };

  const handleEditContact = () => {
    console.log("Editing contact information");
    setShowModal(true);

    sendDataToMixpanel("rekyc _email_updated", {
    rekyc_email_updated: "email update",
  });
  };

  const handleEditPhone = () => {
    console.log("Editing contact information");
    setShowModalPhone(true);

    sendDataToMixpanel("rekyc_phone_updated", {
    rekyc_phone_updated: "phone update",
  });
  };

  useEffect(() => {
    const fetchModuleData = async () => {
      try {
        const response = await fetchWithAuth(`${API_BASE_URL}/get_module_data`, {
          method: "POST",
          body: JSON.stringify({ page_id: "1" }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch module data");
        }

        const result = await response.json();
        console.log("API Raw Response:", result);

        if (!result?.data) {
          console.error("No 'data' field found in response");
          return;
        }

        try {
          const decrypted = decryptData(result.data);
          const parsedModuleData = JSON.parse(decrypted);
          console.log("Decrypted data:", decrypted);
          console.log("Decrypted data:", parsedModuleData);
          setUserModuleData(parsedModuleData);

          const digilockerResponse = await fetchWithAuth(
            `${API_BASE_URL}/check_digilocker_required`,
            {
              method: "GET",
            }
          );

          if (!digilockerResponse.ok) {
            throw new Error("Failed to check Digilocker requirement");
          }

          const digilockerResult = await digilockerResponse.json();
          const digilockerRequired =
            digilockerResult?.data?.digilocker_required === true;
          const isDigilockerLinked =
            parsedModuleData?.["5"]?.is_digilocker === true;

          if (digilockerRequired && !isDigilockerLinked) {
            setShowDigilockerModal(true);
          }
        } catch (decryptErr) {
          console.error("Decryption failed:", decryptErr);
        }
      } catch (error) {
        console.error("Failed to load personal info data:", error);
      }
    };

    fetchModuleData();
  }, []);

  const closeModal = () => setShowModal(false);
  const closeModalPhone = () => setShowModalPhone(false);

  const handleBackClick = () => {
    setShowConfirmModal(true);
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
  };

  const handleLeaveAnyway = () => {
    // Your navigation logic here (e.g., useNavigate or window.history.back())
    window.history.back();
  };

  if (!userModuleData) {
    return <p>Loading...</p>;
  }
  console.log("userModuleData", userModuleData);
  console.log("userModuleData", typeof userModuleData);

  const shared = userModuleData.shared_data || {};

  // const contact = {
  //   email:
  //     userModuleData["1"]?.contact_detail_data?.[1]?.email ||
  //     userModuleData["1"]?.contact_detail_data?.[0]?.email ||
  //     null,
  //   mobile:
  //     userModuleData["1"]?.contact_detail_data?.[1]?.mobile ||
  //     userModuleData["1"]?.contact_detail_data?.[0]?.mobile ||
  //     null,
  // };

  const contact = {
  email:
    userModuleData["1"]?.contact_detail_data?.find(c => c.is_new === false)?.email ||
    userModuleData["1"]?.contact_detail_data?.[1]?.email ||
    userModuleData["1"]?.contact_detail_data?.[0]?.email ||
    null,

  mobile:
    userModuleData["1"]?.contact_detail_data?.find(c => c.is_new === false)?.mobile ||
    userModuleData["1"]?.contact_detail_data?.[1]?.mobile ||
    userModuleData["1"]?.contact_detail_data?.[0]?.mobile ||
    null,
};


  // const address = userModuleData["5"]?.contact_detail_data?.[0] || {};
  const address = userModuleData["5"]?.contact_detail_data?.[0] || {};
  const nameData = userModuleData["38"]?.name_data?.[0] || {};
  const fatherName = userModuleData["30"]?.father_name_data?.[0]?.fathername;
  const dob = userModuleData["32"]?.dob_data;
  const gender = userModuleData["33"]?.gender_data?.[0]?.gender;
  const maritalStatus =
    userModuleData["34"]?.marital_status_data?.[0]?.marital_status;

  const fullAddress = [
  address.address_line1,
  address.address_line2,
  address.address_line3,
]
  .filter(Boolean)
  .map(line => line.replace(/[^a-zA-Z0-9\s,.-]/g, "")) 
  .join(", ");

  return (
    <div>
      <header>
        <div className="header_div_per">
          <p className="trading_pre_per">Personal information</p>
          <button className="back_btn_head_per" onClick={handleBackClick}>
            <img className="back_btn1_per" src="./Icon_apparrow.svg" alt="" />
          </button>
        </div>
      </header>
      <div className="main-container">
        <Section title="Personal information" onEdit={handleEditPersonal}>
          <Field
            label="Name"
            value={`${nameData.firstname || shared.firstname || ""} ${
              nameData.middlename || shared.middle_name || ""
            } ${nameData.lastname || shared.lastname || ""}`}
          />
          <Field
            label="Father’s name"
            value={fatherName || shared.fathername_old}
          />
          <Field
            label="Date of birth"
            value={dob || shared.dob || "Not Available"}
          />
          <Field
            label="Gender"
            value={gender || shared.gender_old || "Not Available"}
          />
          <Field
            label="Marital status"
            value={maritalStatus || shared.marital_status_old}
            className="single"
          />
        </Section>

        <Section title="Contact information">
          <FieldWithCopy
            label="Email address"
            value={contact.email || "N/A"}
            onEdit={() => handleEditContact("email")}
          />
          <FieldWithCopy
            label="Phone number"
            value={contact.mobile || "N/A"}
            onEdit={() => handleEditPhone("phone")}
            className="phone"
          />
        </Section>

        {showModal && (
          <EditContactModal onClose={closeModal} contact={contact} />
        )}
        {showModalPhone && (
          <EditContactPhone onClose={closeModalPhone} contact={contact} />
        )}

        <Section title="Address information">
          <Field label="Address" value={fullAddress} />
          <div className="two-column">
            <Field label="City" value={address.city || "N/A"} />
            <Field label="State" value={address.state || "N/A"} />
          </div>
          <div className="two-column">
            <Field label="Country" value={address.country || "N/A"} />
            <Field
              label="Pincode"
              value={address.pincode || "N/A"}
              className="pincode"
            />
          </div>
        </Section>
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

      {showDigilockerModal && (
        <div
          id="aadhar_inactive"
          className="digilocker-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="aadhar_inactive_title"
          onClick={() => setShowDigilockerModal(false)}
        >
          <div
            id="edit"
            className="digilocker-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="container p-0">
              <div className="row">
                <div className="col-sm-12 col-md-12 form-right signup_emaildiv">
                  <h2 className="blue" id="aadhar_inactive_title">
                    Share Aadhaar details from Digilocker
                  </h2>
                  <div className="divider_blue" />
                  <p>
                    Do not worry if you have never registered with Digilocker.
                    Click on the button "Connect To Digilocker". Digilocker
                    will open as a pop-up on your screen where provide your
                    Aadhaar number and authenticate with OTP. You will then be
                    required to set your PIN and give your consent to provide
                    your Aadhaar document to us for KYC. Your 12 digit Aadhaar
                    number is never fetched, stored, revealed or collected. The
                    Aadhaar and the PAN <span id="pan_no"></span> should belong
                    to you.
                  </p>
                  <div className="text-center">
                    <button
                      id="inactivedigilocker"
                      className="btn btn-primary digilocker-connect-btn"
                      onClick={connectDigilocker}
                      disabled={digilockerLoading}
                    >
                      {digilockerLoading
                        ? "Connecting..."
                        : "Connect to Digilocker"}
                    </button>
                  </div>
                  <p
                    className="digi_text"
                    data-content='I/We hereby submit voluntarily at my/our own discretion, the physical copy of Aadhaar card/physical e- Aadhaar / masked Aadhaar / offline electronic Aadhaar xml as issued by UIDAI (Aadhaar) to Meon Technologies Pvt. Ltd. for the purpose of establishing my/our identity / address proof and voluntarily give my/our consent to open account / process instructions for the said purpose in my/our name/s individual capacity/ies using my/our Aadhaar or as an authorized signatory in non-individual accounts. The consent and purpose of collecting Aadhaar has been explained to me/us in local language. Meon Technologies Pvt. Ltd. has informed me/us that my/our Aadhaar submitted here with shall not be used for any purpose other than mentioned above, or as per requirements of law. Meon Technologies Pvt. Ltd. has informed me/us that this consent and my/our Aadhaar will be stored along with my/our account details within the firm. I/We hereby declare that all the information voluntarily furnished by me/us is true, correct and complete. I/We will not hold Meon Technologies Pvt. Ltd. or any of its officials responsible in case of any incorrect information provided by me/us.'
                  >
                    By clicking the above button, I agree that I have read the
                    Aadhaar user consent document and voluntarily consent to
                    share my Aadhaar information with{" "}
                    <span className="CompanyName">
                      Meon Technologies Pvt. Ltd.
                    </span>{" "}
                    for conducting KYC for opening a trading and Demat account
                    adhering to KRA regulations (2011) and PMLA guidelines
                    (2002).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, value, className = "", children }) => (
  <div className={`field ${className}`}>
    <label>{label}</label>
    {children ? (
      children
    ) : (
      <p>
        <strong>{value}</strong>
      </p>
    )}
  </div>
);

const FieldWithCopy = ({ label, value, onEdit, className = "" }) => (
  <div className={`field copy-field ${className}`}>
    <label>{label}</label>
    <div className="copy-row">
      <p>
        <strong>{value}</strong>
      </p>

      {/* per-field edit button */}
      {onEdit && (
        <button className="edit-btn" onClick={onEdit}>
          <Pencil size={14} className="mr-1" />
          Edit
        </button>
      )}
    </div>
  </div>
);

export default withAuthCheck(UserInfoCard);
