import React, { useState, useEffect } from "react";
import "./personal.css";
import { Pencil, Copy } from "lucide-react";
import EditContactModal from "./EditContactModal";
import EditContactPhone from "./EditContactPhone";
import Cookies from "js-cookie";
import { decryptData } from "../../decode";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import withAuthCheck from "../../hoc/withAuthCheck";
import { sendDataToMixpanel } from "../../lib/utils";

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
  const navigate = useNavigate();

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
      let accessToken = Cookies.get("access_token");
      const refreshToken = Cookies.get("refresh_token");

      console.log("Access Token:", accessToken);
      console.log("Refresh Token:", refreshToken);

      const fetchData = async (token) => {
        console.log("Calling get_module_data API with token:", token);

        const response = await fetch(
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

        if (!response.ok) {
          throw { status: response.status, data: await response.text() };
        }
        return response.json();
      };

      try {
        const response = await fetchData(accessToken);
        console.log("API Raw Response:", response);

        if (!response?.data) {
          console.error("No 'data' field found in response");
          return;
        }

        try {
          const decrypted = decryptData(response.data);
          console.log("Decrypted data:", decrypted);
          console.log("Decrypted data:", JSON.parse(decrypted));
          setUserModuleData(JSON.parse(decrypted));
        } catch (decryptErr) {
          console.error("Decryption failed:", decryptErr);
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
              console.log("New access token received:", newAccessToken);
              Cookies.set("access_token", newAccessToken);
              accessToken = newAccessToken;

              const retryResponse = await fetchData(accessToken);
              console.log("Retry Raw Response:", retryResponse);

              try {
                const decrypted = decryptData(retryResponse.data);
                console.log("Decrypted data after refresh:", decrypted);
                setUserModuleData(decrypted);
              } catch (decryptErr) {
                console.error("Decryption failed after refresh:", decryptErr);
              }
            } else {
              console.error("Refresh succeeded, but no access_token returned.");
            }
          } catch (refreshError) {
            console.error("Refresh token request failed:", refreshError);
          }
        } else {
          console.error("Fetch failed and not due to token expiration:", error);
        }
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

  const contact = {
    email:
      userModuleData["1"]?.contact_detail_data?.[1]?.email ||
      userModuleData["1"]?.contact_detail_data?.[0]?.email ||
      null,
    mobile:
      userModuleData["1"]?.contact_detail_data?.[0]?.mobile ||
      userModuleData["1"]?.contact_detail_data?.[1]?.mobile ||
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
