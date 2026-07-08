

import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import "./personaledit.css";

const PersonalInfoForm = () => {
  const location = useLocation();
  const { userData } = location.state || {};
  const navigate = useNavigate();

  const initialData = {
    fullName: `${userData?.shared_data?.firstname || ""} ${
      userData?.shared_data?.middle_name || ""
    } ${userData?.shared_data?.lastname || ""}`.trim(),
    father:
      userData?.shared_data?.fathername_new ||
      userData?.shared_data?.fathername_old ||
      "",
    dobDate: userData?.shared_data?.dob || "",
    gender:
      userData?.shared_data?.gender_new ||
      userData?.shared_data?.gender_old ||
      "",
    maritalStatus:
      userData?.shared_data?.marital_status_new ||
      userData?.shared_data?.marital_status_old ||
      "",
  };

  const [fullName, setFullName] = useState(initialData.fullName);
  const [father, setFather] = useState(initialData.father);
  const [dobDate, setDobDate] = useState(initialData.dobDate);
  const [gender, setGender] = useState(initialData.gender);
  const [maritalStatus, setMaritalStatus] = useState(initialData.maritalStatus);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const handleBackClick = () => setShowConfirmModal(true);
  const handleCancel = () => setShowConfirmModal(false);
  const handleLeaveAnyway = () => window.history.back();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isFormValid =
    fullName.trim() !== "" &&
    father.trim() !== "" &&
    dobDate.trim() !== "" &&
    gender.trim() !== "" &&
    maritalStatus.trim() !== "";

  const isChanged =
    fullName !== initialData.fullName ||
    father !== initialData.father ||
    dobDate !== initialData.dobDate ||
    gender !== initialData.gender ||
    maritalStatus !== initialData.maritalStatus;

  const callApi = async (url, method = "PATCH", body = {}) => {
    try {
      const token = Cookies.get("access_token");
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("API failed");
      return await response.json();
    } catch (err) {
      console.error("❌ API error:", err);
      throw err;
    }
  };

  const handleSave = async () => {
    if (!isFormValid || !isChanged) return;
    setErrorMsg("");
    setLoading(true);

    try {
      if (father !== initialData.father) {
        await callApi(
          "https://rekyc.meon.co.in/v1/user/update_father_name",
          "PATCH",
          { fathername: father }
        );
      }

      if (dobDate !== initialData.dobDate) {
        await callApi("https://rekyc.meon.co.in/v1/user/update_dob", "PATCH", {
          dob: dobDate,
        });
      }

      if (gender !== initialData.gender) {
        await callApi(
          "https://rekyc.meon.co.in/v1/user/update_gender",
          "PATCH",
          { gender }
        );
      }

      if (maritalStatus !== initialData.maritalStatus) {
        await callApi(
          "https://rekyc.meon.co.in/v1/user/update_maritalStatus",
          "PATCH",
          { maritalStatus }
        );
      }

      if (fullName !== initialData.fullName) {
        const panRes = await callApi(
          "https://rekyc.meon.co.in/v1/user/pan_api",
          "POST",
          { name: fullName }
        );

        if (panRes?.status === "success") {
          await callApi(
            "https://rekyc.meon.co.in/v1/user/name_update",
            "POST",
            {
              name: fullName,
            }
          );
        } else {
          setErrorMsg(" Name does not match with PAN record");
          return;
        }
      }

      console.log("✅ All updates done!");

      // ✅ Redirect with custom state
      navigate("/congratulations", {
        state: { from: "personalInfo" },
      });
    } catch (err) {
      setErrorMsg("Something went wrong while saving.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="margin_bott">
      <header>
        <div className="header_div_edit">
          <p className="trading_pre_edit">Personal information</p>
          <button className="back_btn_head_edit" onClick={handleBackClick}>
            <img
              className="back_btn1_edit"
              src="./Icon_apparrow.svg"
              alt="back"
            />
          </button>
        </div>
      </header>
      <div className="form-container">
        <h3 className="for_gap">Personal information</h3>

        <div className="input-group">
          <label>Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        {errorMsg && <p className="error-text_name">{errorMsg}</p>}

        <div className="input-group">
          <label>Father’s name</label>
          <input
            type="text"
            value={father}
            onChange={(e) => setFather(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label>Date of birth</label>
          <input
            type="date"
            value={dobDate}
            onChange={(e) => setDobDate(e.target.value)}
          />
        </div>

        <div className="toggle-group">
          <label>Gender</label>
          <div className="toggle-buttons">
            {["male", "female", "transgender"].map((opt) => (
              <button
                type="button"
                key={opt}
                className={gender === opt ? "active" : ""}
                onClick={() => setGender(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="toggle-group">
          <label>Marital Status</label>
          <div className="toggle-buttons">
            {["single", "married", "others"].map((opt) => (
              <button
                type="button"
                key={opt}
                className={maritalStatus === opt ? "active" : ""}
                onClick={() => setMaritalStatus(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {showConfirmModal && (
          <div className="confirm-modal-overlay2">
            <div className="confirm-modal2">
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

        <div className="bottom_conatainer_edit">
          <button
            onClick={handleSave}
            className={`save-btn ${isFormValid && isChanged ? "active" : ""}`}
            disabled={!(isFormValid && isChanged) || loading}
          >
            {loading ? "Saving..." : "Save & proceed"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoForm;
