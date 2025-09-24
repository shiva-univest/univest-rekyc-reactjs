import React, { useEffect, useState } from "react";
import api from "../../api/api";
import { decryptData } from "../../decode";
import Cookies from "js-cookie";
import "./Nominee.css";

const Nominee = () => {
  const [nominees, setNominees] = useState([]);
  const [sharedData, setSharedData] = useState({});
  const [isChanged, setIsChanged] = useState(false);
  const [isSubmitEnabled, setIsSubmitEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkMinor = (dob) => {
    if (!dob) return false;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age < 18;
  };

  const handleChange = (index, field, value) => {
    const updated = [...nominees];
    updated[index][field] = value;

    if (field === "dob") {
      updated[index].isMinor = checkMinor(value);
    }

    // Percentage for single nominee is always 100
    if (updated.length === 1) {
      updated[0].percentage = "100";
    }

    setNominees(updated);
    setIsChanged(true);

    // Check if all required fields are filled
    const allFilled = updated.every(
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

    const totalPercentage = updated.reduce(
      (sum, n) => sum + parseInt(n.percentage || 0, 10),
      0
    );

    setIsSubmitEnabled(allFilled && totalPercentage === 100);
  };

  const handlePercentageChange = (index, value) => {
    const updatedNominees = [...nominees];
    updatedNominees[index].percentage = value;

    const total = updatedNominees.reduce(
      (sum, n) => sum + (parseFloat(n.percentage) || 0),
      0
    );

    if (updatedNominees.length === 1) updatedNominees[0].percentage = "100";
    else if (total > 100) {
      alert("Total percentage cannot exceed 100%");
      return;
    }

    setNominees(updatedNominees);
    setIsChanged(true);
  };

  const addNominee = () => {
    if (nominees.length < 3) {
      const newNominee = {
        id: nominees.length + 1,
        firstname: "",
        lastname: "",
        dob: "",
        relation: "",
        percentage: nominees.length === 0 ? "100" : "",
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
        isAutoFilled: false,
      };
      setNominees([...nominees, newNominee]);
      setIsChanged(true);
      setExpandedIndex(nominees.length);
    }
  };

  const handleBackClick3 = () => setShowConfirmModal(true);
  const handleCancel = () => setShowConfirmModal(false);
  const handleLeaveAnyway = () => window.history.back();

  useEffect(() => {
    const fetchModuleData = async () => {
      setLoading(true);
      try {
        const res = await api.post("/user/get_module_data", { page_id: "4" });
        const decrypted = decryptData(res.data.data);
        console.log("Decrypted nominee data:", JSON.parse(decrypted));
        let parsed = {};
        try {
          parsed = JSON.parse(decrypted);
        } catch (err) {
          console.error("JSON parse error", err);
        }

        const shared = parsed?.shared_data || {};
        setSharedData(shared);

        if (parsed?.["10"]?.client_nominee_guardian_data?.length) {
          // const nomineeData = parsed["10"].client_nominee_guardian_data.map(
          //   (item) => ({
          //     ...item,
          //     isMinor: checkMinor(item.dob),
          //     pan: shared.pan || "",
          //     poi_number: shared.pan || "",
          //     isAutoFilled: true,
          //   })
          // );
          const nomineeData = parsed["10"].client_nominee_guardian_data.map(
            (item) => {
              let document_type = item.document_type || null;
              let poi_number = item.poi_number || null;

              // Auto-select based on data
              if (!document_type) {
                if (item.pan) {
                  document_type = "PAN";
                  poi_number = item.pan;
                } else if (item.aadhaar_number) {
                  document_type = "AADHAAR";
                  poi_number = item.aadhaar_number;
                }
              }

              return {
                ...item,
                document_type,
                poi_number,
                isMinor: checkMinor(item.dob),
              };
            }
          );

          setNominees(nomineeData);
        } else setNominees([]);
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
      <input
        type="date"
        placeholder="Guardian's DOB"
        onChange={(e) => handleChange(index, "guardian_dob", e.target.value)}
      />
      <input
        type="text"
        placeholder="Guardian's full name"
        onChange={(e) => handleChange(index, "guardian_name", e.target.value)}
      />
      <input
        type="text"
        placeholder="Guardian's Address line 1"
        onChange={(e) =>
          handleChange(index, "guardian_address1", e.target.value)
        }
      />
      <input
        type="text"
        placeholder="Guardian's Address line 2"
        onChange={(e) =>
          handleChange(index, "guardian_address2", e.target.value)
        }
      />
      <input
        type="text"
        placeholder="Guardian's Address line 3"
        onChange={(e) =>
          handleChange(index, "guardian_address3", e.target.value)
        }
      />
      <input
        type="text"
        placeholder="City"
        onChange={(e) => handleChange(index, "guardian_city", e.target.value)}
      />
      <input
        type="text"
        placeholder="State"
        onChange={(e) => handleChange(index, "guardian_state", e.target.value)}
      />
      <input
        type="text"
        placeholder="Country"
        onChange={(e) =>
          handleChange(index, "guardian_country", e.target.value)
        }
      />
      <input
        type="text"
        placeholder="Pincode"
        onChange={(e) =>
          handleChange(index, "guardian_pincode", e.target.value)
        }
      />
      <input
        type="text"
        placeholder="Guardian's mobile no."
        onChange={(e) => handleChange(index, "guardian_mobile", e.target.value)}
      />
      <input
        type="email"
        placeholder="Guardian's email id"
        onChange={(e) => handleChange(index, "guardian_email", e.target.value)}
      />
    </div>
  );

  const renderNomineeFields = (index, nominee) => (
    <div key={index} className="nominee-card">
      <div
        className="nominee-summary"
        onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
      >
        <h3>Nominee {index + 1}</h3>

        {/* Hide summary when expanded */}
        {expandedIndex !== index && nominee.firstname ? (
          <div className="nominee-details_summary">
            <div className="nominee-field">
              <label className="summary_label">Nominee’s full name</label>
              <p>
                <strong className="summary_data">
                  {nominee.firstname} {nominee.lastname || ""}
                </strong>
              </p>
            </div>
            <div className="nominee-field">
              <label className="summary_label">Nominee’s DOB</label>
              <p>
                <strong className="summary_data">
                  {nominee.dob || "Not provided"}
                </strong>
              </p>
            </div>
            <div className="nominee-field">
              <label className="summary_label">Nominee’s Percentage</label>
              <p>
                <strong className="summary_data">
                  {nominee.percentage || "Not provided"}
                </strong>
              </p>
            </div>
          </div>
        ) : (
          expandedIndex !== index && <p>Click to add details</p>
        )}
      </div>

      {expandedIndex === index && (
        <div className="nominee-details">
          <input
            type="text"
            placeholder="Nominee's full name"
            value={`${nominee.firstname || ""} ${
              nominee.lastname || ""
            }`.trim()}
            disabled={nominee.isAutoFilled}
            onChange={(e) => {
              const [first = "", last = ""] = e.target.value.split(" ");
              handleChange(index, "firstname", first);
              handleChange(index, "lastname", last);
            }}
          />
          {/* <select
            value={nominee.document_type || ""}
            disabled={nominee.isAutoFilled}
            onChange={(e) =>
              handleChange(index, "document_type", e.target.value)
            }
          >
            <option value="">Select Identity proof</option>
            <option value="PAN">PAN</option>
            <option value="AADHAAR">Aadhaar</option>
            <option value="PASSPORT">Passport</option>
          </select> */}
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
            value={nominee.pan || ""}
            disabled={nominee.isAutoFilled}
            onChange={(e) => handleChange(index, "poi_number", e.target.value)}
          />
          <div className="upload-proof">
            <label htmlFor={`proofFile-${index}`} className="upload-label">
              <span className="upload-icon">
                <img src="./upload 1.svg" />
                Upload Proof (Optional)
              </span>
              <p className="please_uplo">
                Please upload the files only in jpeg / png format
              </p>
            </label>
            <input
              type="file"
              id={`proofFile-${index}`}
              accept="image/jpeg,image/png"
              style={{ display: "none" }}
              disabled={nominee.isAutoFilled}
              onChange={(e) =>
                handleChange(index, "proofFile", e.target.files[0])
              }
            />
          </div>
          <select
            value={nominee.relation || ""}
            disabled={nominee.isAutoFilled}
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
            // disabled={nominee.isAutoFilled}
            onChange={(e) => handleChange(index, "dob", e.target.value)}
          />
          <input
            type="text"
            placeholder="Address line 1"
            value={nominee.address_line1 || ""}
            // disabled={nominee.isAutoFilled}
            onChange={(e) =>
              handleChange(index, "address_line1", e.target.value)
            }
          />
          <input
            type="text"
            placeholder="Address line 2"
            value={nominee.address_line2 || ""}
            disabled={nominee.isAutoFilled}
            onChange={(e) =>
              handleChange(index, "address_line2", e.target.value)
            }
          />
          <input
            type="text"
            placeholder="Address line 3"
            value={nominee.address_line3 || ""}
            disabled={nominee.isAutoFilled}
            onChange={(e) =>
              handleChange(index, "address_line3", e.target.value)
            }
          />
          <div className="inline-fields">
            <input
              type="text"
              placeholder="City"
              value={nominee.city || ""}
              // disabled={nominee.isAutoFilled}
              onChange={(e) => handleChange(index, "city", e.target.value)}
            />
            <input
              type="text"
              placeholder="Pincode"
              value={nominee.pincode || ""}
              // disabled={nominee.isAutoFilled}
              onChange={(e) => handleChange(index, "pincode", e.target.value)}
            />
          </div>
          <div className="inline-fields">
            <input
              type="text"
              placeholder="State"
              value={nominee.state || ""}
              // disabled={nominee.isAutoFilled}
              onChange={(e) => handleChange(index, "state", e.target.value)}
            />
            <input
              type="text"
              placeholder="Country"
              value={nominee.country || ""}
              // disabled={nominee.isAutoFilled}
              onChange={(e) => handleChange(index, "country", e.target.value)}
            />
          </div>
          <input
            type="text"
            placeholder="Nominee's mobile no."
            value={nominee.mobile || ""}
            // disabled={nominee.isAutoFilled}
            onChange={(e) => handleChange(index, "mobile", e.target.value)}
          />
          <input
            type="email"
            placeholder="Nominee's email id"
            value={nominee.email || ""}
            disabled={nominee.isAutoFilled}
            onChange={(e) => handleChange(index, "email", e.target.value)}
          />
          {/* Percentage → always editable */}
          <input
            type="number"
            className="percentage-input"
            placeholder="Enter %"
            value={nominee.percentage || ""}
            onChange={(e) => handlePercentageChange(index, e.target.value)}
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
      await api.post(
        "https://rekyc.meon.co.in/v1/user/nomineedata",
        { nominees, changes: isChanged ? "Yes" : "No" },
        { headers: { Authorization: `Bearer ${token}` } }
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
            <img className="nominee_img1" src="./Frame 1171276645.svg" alt="" />
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
            )}
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
