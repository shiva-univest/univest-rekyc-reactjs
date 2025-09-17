
import React from "react";
import "./overlaycss.css";

const DepositOverlay = () => {
  return (
    <div className="deposit-overlay">
      <div className="overlay-content">
          <img src="./9447-money-sent 1.svg" alt="" />
        <p className="deposit-message">We’re depositing ₹1 in your bank</p>
        <p className="deposit-note">Please do not press back or close the app</p>
      </div>
    </div>
  );
};

export default DepositOverlay;
