

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { decryptData } from "../../decode";
import "./Esign.css";

const Esign = () => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [moduleLinks, setModuleLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleBackClick = () => setShowConfirmModal(true);
  const handleCancel = () => setShowConfirmModal(false);
  const handleLeaveAnyway = () => window.history.back();


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const moduleRes = await api.post("/user/get_module_data", {
          page_id: "6",
        });
        console.log("get_module_data (raw) ->", moduleRes.data);

        let parsed;
        try {
          parsed = JSON.parse(decryptData(moduleRes.data.data));
        } catch (err) {
          console.error("Failed to parse decrypted data:", err);
          parsed = {};
        }

        // 🔹 Get links
        let links = parsed?.["12"]?.links || [];

        // 🔹 Filter out signed ones
        links = links.filter((link) => !link.is_esigned);

        console.log("Filtered Links ->", links);

        if (!links || links.length === 0) {
          navigate("/congratulations");
        } else {
          setModuleLinks(links);
        }
      } catch (err) {
        console.error("Error fetching eSign data:", err);
        navigate("/congratulations");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const formatButtonName = (name) => {
    // if (name === "rekyc") return "re-kyc";
      if (name === "rekyc") return "Proceed to E-sign";
    // if (name === "rekyc_kra") return "re-kyc_esign";
    if (name === "rekyc_kra") return "Proceed to E-sign";
    return `Proceed to ${name}`;
  };

  return (
    <div>
      <header>
        <div className="header_div_change">
          <p className="trading_pre_per">eSign</p>
          <button className="back_btn_head_per" onClick={handleBackClick}>
            <img className="back_btn1_per" src="./Icon_apparrow.svg" alt="" />
          </button>
        </div>
      </header>

      <div className="container2">
        <div className="header">
          <h2>Verify request</h2>
          <p className="enter_aadhar">
            Enter the Aadhaar number and OTP received on Aadhaar linked mobile
            number
          </p>
        </div>

        <div className="aadhaar-card">
          <img className="aadhar_img_cls" src="./aadhaar_esign.svg" alt="" />
        </div>

        <div className="esign-box">
          <h3>Proceed to eSign</h3>
          <p>
            You’ll be redirected to NSDL to complete the eSign process.{" "}
            <a href="#">Download modification form</a>
          </p>

          <div className="dynamic-buttons">
            {loading ? (
              <p>Loading...</p>
            ) : moduleLinks.length > 0 ? (
              moduleLinks.map((link, idx) => (
                <button
                  key={idx}
                  className="url-btn"
                  onClick={() =>
                    window.open(`https://rekyc.meon.co.in${link.url}`)
                  }
                >
                  {formatButtonName(link.descriptive_name)}
                </button>
              ))
            ) : (
              <p>No links available</p>
            )}
          </div>
        </div>

        <div className="footer">
          <span className="footer_esign">
            <img src="./public/Flat Color.svg" alt="" /> 100% Safe & Secure
          </span>
        </div>
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

export default Esign;
