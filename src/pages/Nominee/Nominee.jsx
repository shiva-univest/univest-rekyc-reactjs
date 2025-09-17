import React, { useEffect, useState } from "react";
import api from "../../api/api";
import { decryptData } from "../../decode";
import Cookies from "js-cookie";
import axios from "axios";
import "./Nominee.css";

const Nominee = () => {
  const [nominees, setNominees] = useState([]);
  const [sharedData, setSharedData] = useState({});
  const [isChanged, setIsChanged] = useState(false);
  const [isSubmitEnabled, setIsSubmitEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(null);

  // const [showForm, setShowForm] = useState(false);
  const [numNominees, setNumNominees] = useState(1);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  // const [moduleData, setModuleData] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleNomineeChange = (e) => {
    setNumNominees(parseInt(e.target.value));
  };

  const handleBackClick3 = () => {
    setShowConfirmModal(true);
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
  };

  const handleLeaveAnyway = () => {
    window.history.back();
  };

  const addNominee = () => {
    if (nominees.length < 3) {
      setNominees([
        ...nominees,
        {
          id: nominees.length + 1,
          firstname: "",
          lastname: "",
          dob: "",
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
          pan: sharedData?.pan || "",
          isMinor: false,
        },
      ]);
      setIsChanged(true);
      setExpandedIndex(nominees.length);
    }
  };

  const checkMinor = (dob) => {
    if (!dob) return false;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age < 18;
  };

  const handleChange = (index, field, value) => {
    const updated = [...nominees];
    updated[index][field] = value;
    if (field === "dob") {
      updated[index].isMinor = checkMinor(value);
    }
    setNominees(updated);

    setIsChanged(true);

    const filled = updated.every(
      (n) =>
        n.firstname &&
        n.document_type &&
        n.poi_number &&
        n.relation &&
        n.dob &&
        n.address_line1 &&
        n.city &&
        n.state &&
        n.country &&
        n.pincode &&
        n.mobile &&
        n.email &&
        n.percentage
    );
    setIsSubmitEnabled(filled);
  };

  useEffect(() => {
    const fetchModuleData = async () => {
      setLoading(true);
      try {
        const res = await api.post("/user/get_module_data", { page_id: "4" });
        const decrypted = decryptData(res.data.data);
        console.log("decrypteddddddddddd", decrypted);
        let parsed = {};
        try {
          parsed = JSON.parse(decrypted);
          console.log("parsed", parsed);
        } catch (err) {
          console.error("JSON parse error", err);
        }

        const shared = parsed?.shared_data || {};
        setSharedData(shared);

        if (parsed?.["10"]?.client_nominee_guardian_data?.length) {
          const nomineeData = parsed["10"].client_nominee_guardian_data.map(
            (item) => ({
              ...item,
              isMinor: checkMinor(item.dob),
              pan: shared.pan || "",
              poi_number: shared.pan || "",
            })
          );
          setNominees(nomineeData);
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

  const renderGuardianFields = (index) => (
    <div className="guardian-block" key={`guardian-${index}`}>
      <h4>Guardian {index + 1} Details</h4>
      <input type="date" placeholder="Guardian's DOB" />
      <input type="text" placeholder="Guardian's full name" />
      <input type="text" placeholder="Guardian's Address line 1" />
      <input type="text" placeholder="Guardian's Address line 2" />
      <input type="text" placeholder="Guardian's Address line 3" />
      <input type="text" placeholder="City" />
      <input type="text" placeholder="State" />
      <input type="text" placeholder="Country" />
      <input type="text" placeholder="Pincode" />
      <input type="text" placeholder="Guardian's mobile no." />
      <input type="email" placeholder="Guardian's email id" />
    </div>
  );

  const renderNomineeFields = (index, nominee) => (
    <div key={index} className="nominee-card">
      <div
        className="nominee-summary"
        onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
      >
        <h3>Nominee {index + 1}</h3>

        {nominee.firstname ? (
          <div className="nominee-details_summary">
            <div className="nominee-field">
              <label>Nominee’s full name</label>
              <p>
                <strong>
                  {nominee.firstname} {nominee.lastname || ""}
                </strong>
              </p>
            </div>
            <div className="nominee-field">
              <label>Nominee’s DOB</label>
              <p>
                <strong>{nominee.dob || "Not provided"}</strong>
              </p>
            </div>
          </div>
        ) : (
          <p>Click to add details</p>
        )}
      </div>

      {expandedIndex === index && (
        <div className="nominee-details">
          <input
            type="text"
            placeholder="Nominee's full name"
            value={nominee.firstname || ""}
            onChange={(e) => handleChange(index, "firstname", e.target.value)}
          />

          <select
            value={nominee.document_type || ""}
            onChange={(e) =>
              handleChange(index, "document_type", e.target.value)
            }
          >
            <option value="">Select Identity proof</option>
            <option value="PAN">PAN</option>
            <option value="AADHAAR">Aadhaar</option>
            <option value="PASSPORT">Passport</option>
          </select>

          <input
            type="text"
            placeholder="Enter Proof No."
            value={nominee.poi_number || ""}
            onChange={(e) => handleChange(index, "poi_number", e.target.value)}
          />

          <div className="upload-proof">
            <label htmlFor={`proofFile-${index}`} className="upload-label">
              <span className="upload-icon">
                {" "}
                <img src="./upload 1.svg" />
                Upload Proof (Optional){" "}
              </span>{" "}
              <br />{" "}
              <p className="please_uplo">
                {" "}
                Please upload the files only in jpeg / png format
              </p>
            </label>
            <input
              type="file"
              id={`proofFile-${index}`}
              accept="image/jpeg,image/png"
              style={{ display: "none" }}
              onChange={(e) =>
                handleChange(index, "proofFile", e.target.files[0])
              }
            />
          </div>

          <select
            value={nominee.relation || ""}
            onChange={(e) => handleChange(index, "relation", e.target.value)}
          >
            <option value="">Select relation</option>
            <option value="Father">Father</option>
            <option value="Mother">Mother</option>
            <option value="Spouse">Spouse</option>
            <option value="Child">Child</option>
            <option value="Other">Other</option>
          </select>

          <input
            type="date"
            value={nominee.dob || ""}
            onChange={(e) => handleChange(index, "dob", e.target.value)}
          />

          <input
            type="text"
            placeholder="Address line 1"
            value={nominee.address_line1 || ""}
            onChange={(e) =>
              handleChange(index, "address_line1", e.target.value)
            }
          />
          <input
            type="text"
            placeholder="Address line 2"
            value={nominee.address_line2 || ""}
            onChange={(e) =>
              handleChange(index, "address_line2", e.target.value)
            }
          />
          <input
            type="text"
            placeholder="Address line 3"
            value={nominee.address_line3 || ""}
            onChange={(e) =>
              handleChange(index, "address_line3", e.target.value)
            }
          />

          <div className="inline-fields">
            <input
              type="text"
              placeholder="City"
              value={nominee.city || ""}
              onChange={(e) => handleChange(index, "city", e.target.value)}
            />
            <input
              type="text"
              placeholder="Pincode"
              value={nominee.pincode || ""}
              onChange={(e) => handleChange(index, "pincode", e.target.value)}
            />
          </div>

          <div className="inline-fields">
            <input
              type="text"
              placeholder="State"
              value={nominee.state || ""}
              onChange={(e) => handleChange(index, "state", e.target.value)}
            />
            <input
              type="text"
              placeholder="Country"
              value={nominee.country || ""}
              onChange={(e) => handleChange(index, "country", e.target.value)}
            />
          </div>

          <input
            type="text"
            placeholder="Nominee's mobile no."
            value={nominee.mobile || ""}
            onChange={(e) => handleChange(index, "mobile", e.target.value)}
          />
          <input
            type="email"
            placeholder="Nominee's email id"
            value={nominee.email || ""}
            onChange={(e) => handleChange(index, "email", e.target.value)}
          />
          <input
            type="text"
            placeholder="Percentage allocation"
            value={nominee.percentage || ""}
            onChange={(e) => handleChange(index, "percentage", e.target.value)}
          />

          {nominee.isMinor && renderGuardianFields(index)}
        </div>
      )}
    </div>
  );

  const handleSubmit = async () => {
    if (!isSubmitEnabled) return;

    setSubmitting(true);
    const token = Cookies.get("token");

    try {
      await axios.post(
        "https://rekyc.meon.co.in/v1/nomineedata",
        {
          nominees,
          changes: isChanged ? "Yes" : "No",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      alert("Nominee saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Error saving nominee");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
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
            <img className="nominee_img1" src="./Frame 1171276645.svg" />

            <div className="fixed-footer">
              <div className="note">Note: You can add upto 3 nominees</div>
              <button className="add-btn" onClick={addNominee}>
                Add nominee
              </button>
            </div>
          </div>
        ) : (
          <>
            {nominees.map((nominee, index) =>
              renderNomineeFields(index, nominee)
            )}
            {nominees.length < 3 && (
              <button className="add-more-btn" onClick={addNominee}>
                + Add Nominee
              </button>
            )}{" "}
            <br />
            <div className="nominee_submit_btn">
              <button
                className={`btn-submit ${
                  isSubmitEnabled ? "active" : "disabled"
                }`}
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
